/**
 * Stage one of the pre provision hook: validate the selected AZD environment.
 *
 * Nothing here creates or modifies an Azure resource. The stage exists to refuse
 * early, because every later stage either registers something on the
 * subscription or provisions a paid resource.
 *
 * Checks performed:
 *   1. The subscription and region are present and correctly shaped.
 *   2. What azd exported into the process matches what azd has stored.
 *   3. Every provision gated deployment value is present and valid.
 *   4. The Azure CLI is authenticated and can see the target subscription.
 *   5. The committed parameter file has no blank required value and no retired
 *      parameter that is now derived during deployment.
 *
 * Values are reported by presence and validity. Their contents are not echoed,
 * so a hook log can be pasted into the deployment plan without redaction.
 */

import { readAccount, isAzureCliAvailable } from './lib/az.js';
import { findEnvironmentMismatches, readAzdEnvironment } from './lib/azd-env.js';
import { findBlankRequiredParameters, loadBicepParameters } from './lib/bicep-params.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { toRepoRelative, REPO_PATHS } from './lib/paths.js';
import { validateShape } from './lib/value-shapes.js';
import {
  AZD_ENV_KEYS,
  EXIT_CODES,
  REQUIRED_BICEP_PARAMETERS,
  REQUIRED_ENVIRONMENT_VALUES,
  REQUIREMENT_GATE,
  RETIRED_BICEP_PARAMETERS,
  TIMEOUTS_MS,
  VALUE_SHAPE,
} from './deployment-contract.js';

const STAGE_LABELS = Object.freeze({
  identity: 'environment identity',
  consistency: 'environment consistency',
  values: 'required deployment values',
  cli: 'azure cli authentication',
  parameters: 'committed bicep parameters',
});

/**
 * @typedef {object} EnvironmentValidationResult
 * @property {DeploymentReport} report
 * @property {Record<string, string>} resolved Values every later stage may rely on.
 */

/**
 * Run the environment validation stage.
 *
 * @param {{ report?: DeploymentReport, processEnvironment?: Record<string, string | undefined> }} [options]
 * @returns {Promise<EnvironmentValidationResult>}
 */
export async function validateEnvironment(options = {}) {
  const report = options.report ?? new DeploymentReport('Environment validation');
  const processEnvironment = options.processEnvironment ?? process.env;
  /** @type {Record<string, string>} */
  const resolved = {};

  // The stored environment is read first, and identity is validated against the two
  // sources merged.
  //
  // azd exports its values into the process only when azd itself invokes the hook.
  // Run directly, process.env carries none of them, so validating identity from
  // process.env alone failed on a correctly configured environment. Mismatch
  // detection still compares the two sources independently, so merging cannot hide
  // a disagreement.
  report.beginStage(STAGE_LABELS.consistency);

  const stored = await readAzdEnvironment({ timeoutMs: TIMEOUTS_MS.cliProbe });

  if (!stored.ok) {
    report.record({
      name: 'azd environment readable',
      status: CHECK_STATUS.fail,
      detail: stored.cliMissing
        ? 'the azure developer cli is not on the path, so the selected environment cannot be confirmed'
        : `azd could not report the selected environment: ${firstLine(stored.stderr)}`,
      evidence: [stored.commandLine],
    });
  } else {
    const comparedKeys = Object.values(AZD_ENV_KEYS);
    const mismatches = findEnvironmentMismatches(processEnvironment, stored.values, comparedKeys);

    report.record({
      name: 'azd environment readable',
      status: CHECK_STATUS.pass,
      detail: `azd reported ${Object.keys(stored.values).length} stored values`,
      evidence: [stored.commandLine],
    });

    report.record({
      name: 'exported values match stored values',
      status: mismatches.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail:
        mismatches.length === 0
          ? 'no divergence between the exported process values and the stored environment'
          : `divergence on ${mismatches.map((entry) => entry.key).join(', ')}. Refusing to proceed against an ambiguous target.`,
    });

    for (const [key, value] of Object.entries(stored.values)) {
      if (resolved[key] === undefined && value.trim() !== '') {
        resolved[key] = value.trim();
      }
    }
  }

  report.beginStage(STAGE_LABELS.identity);

  // Exported value wins where both are set, because a mismatch has already been
  // reported above and the exported value is what a real azd run would use.
  const subscriptionId =
    readTrimmed(processEnvironment, AZD_ENV_KEYS.subscriptionId) ??
    resolved[AZD_ENV_KEYS.subscriptionId];
  const location =
    readTrimmed(processEnvironment, AZD_ENV_KEYS.location) ?? resolved[AZD_ENV_KEYS.location];

  const subscriptionShape = validateShape(VALUE_SHAPE.guid, subscriptionId);
  report.record({
    name: AZD_ENV_KEYS.subscriptionId,
    status: subscriptionShape.valid ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: subscriptionShape.valid
      ? 'present and correctly shaped'
      : `unusable: ${subscriptionShape.reason}`,
  });

  const locationShape = validateShape(VALUE_SHAPE.azureRegion, location);
  report.record({
    name: AZD_ENV_KEYS.location,
    status: locationShape.valid ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: locationShape.valid ? `present, target region ${location}` : `unusable: ${locationShape.reason}`,
  });

  if (subscriptionShape.valid && subscriptionId !== undefined) {
    resolved[AZD_ENV_KEYS.subscriptionId] = subscriptionId;
  }
  if (locationShape.valid && location !== undefined) {
    resolved[AZD_ENV_KEYS.location] = location;
  }

  report.beginStage(STAGE_LABELS.values);

  for (const requirement of REQUIRED_ENVIRONMENT_VALUES) {
    const value = readTrimmed(processEnvironment, requirement.key) ?? resolved[requirement.key];
    const outcome = validateShape(requirement.shape, value);
    const gatesProvisioning = requirement.gate === REQUIREMENT_GATE.provision;

    if (outcome.valid && value !== undefined) {
      resolved[requirement.key] = value.trim();
      report.record({
        name: requirement.key,
        status: CHECK_STATUS.pass,
        detail: `present and valid, required at ${requirement.gate}`,
      });
      continue;
    }

    report.record({
      name: requirement.key,
      status: gatesProvisioning ? CHECK_STATUS.fail : CHECK_STATUS.warn,
      detail: `${outcome.valid ? 'missing' : outcome.reason}. ${requirement.purpose} Obtain with: ${requirement.howToObtain}`,
    });
  }

  report.beginStage(STAGE_LABELS.cli);

  const cliAvailable = await isAzureCliAvailable({ timeoutMs: TIMEOUTS_MS.cliProbe });
  if (!cliAvailable) {
    report.record({
      name: 'azure cli present',
      status: CHECK_STATUS.fail,
      detail:
        'the azure cli is not callable. Provider registration and capacity validation both depend on it, so the deployment stops here.',
    });
  } else {
    report.record({ name: 'azure cli present', status: CHECK_STATUS.pass, detail: 'callable' });

    const targetSubscription = resolved[AZD_ENV_KEYS.subscriptionId];
    const account = await readAccount({
      subscriptionId: targetSubscription,
      timeoutMs: TIMEOUTS_MS.cliProbe,
    });

    if (account === undefined) {
      report.record({
        name: 'azure cli authenticated for the target subscription',
        status: CHECK_STATUS.fail,
        detail:
          'the azure cli could not describe the target subscription. Sign in, then confirm the subscription is visible to this identity.',
      });
    } else if (targetSubscription === undefined) {
      report.record({
        name: 'azure cli authenticated for the target subscription',
        status: CHECK_STATUS.warn,
        detail:
          'a signed in identity was found, but the target subscription is unresolved so there is nothing to compare it against. This is not a confirmation that the correct subscription is selected.',
      });
    } else if (account.id !== targetSubscription) {
      report.record({
        name: 'azure cli authenticated for the target subscription',
        status: CHECK_STATUS.fail,
        detail:
          'the azure cli resolved a different subscription than the azd environment selected. The globally selected subscription is left unchanged by design, so correct the azd environment or the cli login rather than switching accounts here.',
      });
    } else {
      report.record({
        name: 'azure cli authenticated for the target subscription',
        status: CHECK_STATUS.pass,
        detail: 'the target subscription is visible to the signed in identity',
      });
      resolved[AZD_ENV_KEYS.tenantId] = resolved[AZD_ENV_KEYS.tenantId] ?? account.tenantId;
    }
  }

  report.beginStage(STAGE_LABELS.parameters);

  try {
    const parameters = await loadBicepParameters();
    const blank = findBlankRequiredParameters(parameters, REQUIRED_BICEP_PARAMETERS);

    report.record({
      name: 'no blank required parameter',
      status: blank.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail:
        blank.length === 0
          ? `${REQUIRED_BICEP_PARAMETERS.length} required parameters carry a committed value`
          : `blank in ${parameters.sourcePath}: ${blank.join(', ')}`,
    });

    const retiredPresent = RETIRED_BICEP_PARAMETERS.filter(
      (name) => parameters.values[name] !== undefined,
    );

    report.record({
      name: 'no retired parameter remains',
      status: retiredPresent.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail:
        retiredPresent.length === 0
          ? 'every retired parameter has been removed in favour of a derived value'
          : `still declared in ${parameters.sourcePath}: ${retiredPresent.join(', ')}`,
    });
  } catch (error) {
    report.record({
      name: 'parameter file readable',
      status: CHECK_STATUS.fail,
      detail: `could not read ${toRepoRelative(REPO_PATHS.bicepParameters)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }

  return { report, resolved };
}

/**
 * @param {Record<string, string | undefined>} environment
 * @param {string} key
 * @returns {string | undefined}
 */
function readTrimmed(environment, key) {
  const value = environment[key];
  return value === undefined ? undefined : value.trim();
}

/**
 * @param {string} text
 * @returns {string}
 */
function firstLine(text) {
  const [line] = text.split('\n');
  return line ?? '';
}

const isDirectInvocation = process.argv[1] !== undefined && import.meta.url.endsWith(basename(process.argv[1]));

/**
 * @param {string} filePath
 * @returns {string}
 */
function basename(filePath) {
  const normalised = filePath.replaceAll('\\', '/');
  const index = normalised.lastIndexOf('/');
  return index === -1 ? normalised : normalised.slice(index + 1);
}

if (isDirectInvocation) {
  const { report } = await validateEnvironment();
  report.writeSummary();
  process.exit(report.blocked ? EXIT_CODES.blocked : EXIT_CODES.success);
}
