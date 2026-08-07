/**
 * Stage three of the pre provision hook: validate quota and regional capacity.
 *
 * This is the last gate before paid provisioning, so it is deliberately
 * conservative. A probe that cannot establish capacity is recorded as
 * inconclusive rather than as a pass, and an Azure surface that reports no
 * numeric limit is not read as unlimited capacity.
 *
 * Providers are processed one at a time. Several of these reads are slow and
 * issuing them together produced throttled responses that were indistinguishable
 * from a genuine capacity refusal.
 *
 * The SKU and tier values probed here are read from infra/azure/main.bicepparam,
 * so the automation cannot check one tier while the deployment requests another.
 */

import { AZ_EXTENSIONS, azJson, ensureAzureCliExtension } from './lib/az.js';
import { loadBicepParameters } from './lib/bicep-params.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import {
  AZD_ENV_KEYS,
  CAPACITY_STRATEGY,
  EXIT_CODES,
  RESOURCE_PLAN,
  TIMEOUTS_MS,
} from './deployment-contract.js';

const STAGE_LABELS = Object.freeze({
  extensions: 'azure cli extensions',
  runtime: 'app service linux runtime',
  existingSpeech: 'existing speech account',
});

const FLAGS = Object.freeze({
  sku: '--sku',
  linuxWorkersEnabled: '--linux-workers-enabled',
  location: '--location',
  namespace: '--namespace',
  name: '--name',
  resourceGroup: '--resource-group',
  os: '--os',
  scope: '--scope',
  graphQuery: '--graph-query',
  resourceType: '--resource-type',
});

const LINUX_OS_NAME = 'linux';
const SPEECH_ACCOUNT_KIND = 'SpeechServices';

/** Value az vm list-skus expects for the virtual machine surface. */
const VIRTUAL_MACHINES_RESOURCE_TYPE = 'virtualMachines';

/**
 * Restriction scopes reported by az vm list-skus.
 *
 * A location scoped restriction refuses the region outright. A zone scoped one
 * refuses named zones while leaving a regional deployment that pins no zone
 * available, so the two must not be collapsed into one verdict.
 */
const SKU_RESTRICTION_TYPE = Object.freeze({
  location: 'Location',
  zone: 'Zone',
});

/**
 * Compare Azure region identifiers. Azure returns display names such as the
 * spaced form from some surfaces and short names from others.
 *
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
export function sameRegion(left, right) {
  const normalise = (value) => value.replaceAll(' ', '').toLowerCase();
  return normalise(left) === normalise(right);
}

/**
 * Normalise the runtime list returned by az webapp list-runtimes.
 *
 * The command has returned several shapes across CLI versions: a flat array of
 * runtime strings, and an array of objects. The object form carries the value that
 * matters in `config`, alongside a friendly `runtime` label, for example
 * `{"runtime":"Node","config":"NODE|22-lts"}`. An earlier fix guessed at property
 * names from fixtures and missed `config`, so the real payload still read as an
 * empty list. `config` is checked first because it is the field App Service actually
 * consumes as linuxFxVersion.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normaliseRuntimeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const runtimes = [];

  for (const entry of value) {
    if (typeof entry === 'string') {
      runtimes.push(entry);
      continue;
    }
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = /** @type {Record<string, unknown>} */ (entry);
    for (const property of ['config', 'linuxFxVersion', 'name', 'runtimeVersion', 'displayName']) {
      const candidate = record[property];
      if (typeof candidate === 'string' && candidate !== '') {
        runtimes.push(candidate);
        break;
      }
    }
  }

  return runtimes;
}

/**
 * Find the supported locations for a resource type, matching the type name without
 * regard to case.
 *
 * Azure reports resource type names with provider chosen casing, for example `Redis`
 * under `Microsoft.Cache` while the ARM type is written `Microsoft.Cache/redis`. A
 * case sensitive match therefore finds nothing and looks like an unreadable response.
 *
 * @param {unknown[]} resourceTypes
 * @param {string} shortType Type name without the provider namespace.
 * @returns {string[] | undefined} Locations, or undefined when the type is absent.
 */
export function findResourceTypeLocations(resourceTypes, shortType) {
  const wanted = shortType.toLowerCase();

  for (const entry of resourceTypes) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = /** @type {Record<string, unknown>} */ (entry);
    if (typeof record.resourceType !== 'string') {
      continue;
    }
    if (record.resourceType.toLowerCase() !== wanted) {
      continue;
    }
    return Array.isArray(record.locations)
      ? record.locations.filter((location) => typeof location === 'string')
      : [];
  }

  return undefined;
}

/**
 * Assess whether a virtual machine size is deployable in a region.
 *
 * The distinction this function exists to make: `az vm list-skus --location` lists
 * a size for the region whether or not it can currently be deployed there. The
 * refusal lives in the restrictions collection, so reading only the name and the
 * locations reports available capacity that was never established, which is how a
 * size that failed three times looked fine every time it was checked by hand.
 *
 * A zone scoped restriction is reported separately rather than as a refusal,
 * because a deployment that pins no zone is unaffected by it.
 *
 * @param {unknown[]} skus Parsed az vm list-skus output.
 * @param {string} skuName Requested size, matched without regard to case.
 * @param {string} location Target region.
 * @returns {{ listed: boolean, blockedReasons: string[], zoneOnlyReasons: string[] }}
 */
export function assessVirtualMachineSkuRestrictions(skus, skuName, location) {
  const wanted = skuName.toLowerCase();
  let listed = false;
  const blockedReasons = [];
  const zoneOnlyReasons = [];

  for (const entry of skus) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = /** @type {Record<string, unknown>} */ (entry);
    if (typeof record.name !== 'string' || record.name.toLowerCase() !== wanted) {
      continue;
    }
    if (typeof record.resourceType === 'string' && record.resourceType !== VIRTUAL_MACHINES_RESOURCE_TYPE) {
      continue;
    }

    // An entry naming locations must name this one. An entry that names none is
    // taken at face value, because the query was already scoped to the region.
    const locations = Array.isArray(record.locations)
      ? record.locations.filter((value) => typeof value === 'string')
      : [];
    if (locations.length > 0 && !locations.some((value) => sameRegion(String(value), location))) {
      continue;
    }

    listed = true;

    const restrictions = Array.isArray(record.restrictions) ? record.restrictions : [];
    for (const restriction of restrictions) {
      if (typeof restriction !== 'object' || restriction === null) {
        continue;
      }
      const detail = /** @type {Record<string, unknown>} */ (restriction);
      const reason =
        typeof detail.reasonCode === 'string' ? detail.reasonCode : 'restriction reported without a reason code';

      if (detail.type === SKU_RESTRICTION_TYPE.zone) {
        zoneOnlyReasons.push(reason);
        continue;
      }

      // Anything not explicitly zone scoped is treated as blocking. An unrecognised
      // scope must not be read as permission.
      blockedReasons.push(reason);
    }
  }

  return { listed, blockedReasons, zoneOnlyReasons };
}

/**
 * Resolve the region a planned resource must be checked in.
 *
 * Most resources use AZURE_LOCATION. A resource can instead name a committed
 * Bicep parameter when the approved architecture deliberately places it in a
 * different region, as Managed Redis does.
 *
 * @param {import('./deployment-contract.js').PlannedResource} resource
 * @param {import('./lib/bicep-params.js').BicepParameterFile} parameters
 * @param {string} defaultLocation
 * @returns {string | undefined}
 */
export function resolveResourceLocation(resource, parameters, defaultLocation) {
  if (resource.locationParameterName === undefined) {
    return defaultLocation;
  }

  const configured = parameters.values[resource.locationParameterName];
  return typeof configured === 'string' && configured.trim() !== ''
    ? configured.trim()
    : undefined;
}

/**
 * Run the capacity validation stage.
 *
 * @param {{
 *   report?: DeploymentReport,
 *   resolved?: Record<string, string>,
 *   dryRun?: boolean,
 * }} [options]
 * @returns {Promise<{ report: DeploymentReport }>}
 */
export async function checkCapacity(options = {}) {
  const report = options.report ?? new DeploymentReport('Capacity validation');
  const resolved = options.resolved ?? {};
  const dryRun = options.dryRun ?? false;

  const subscriptionId = resolved[AZD_ENV_KEYS.subscriptionId];
  const location = resolved[AZD_ENV_KEYS.location];
  const resourceGroup = resolved[AZD_ENV_KEYS.resourceGroup];
  const speechAccountName = resolved[AZD_ENV_KEYS.speechAccountName];

  if (subscriptionId === undefined || location === undefined) {
    report.beginStage(STAGE_LABELS.extensions);
    report.record({
      name: 'target subscription and region resolved',
      status: CHECK_STATUS.fail,
      detail: 'capacity validation requires both the subscription and the region resolved by the environment stage',
    });
    return { report };
  }

  const parameters = await loadBicepParameters();

  report.beginStage(STAGE_LABELS.extensions);
  await ensureExtensions(report, dryRun);

  report.beginStage(STAGE_LABELS.runtime);
  await checkLinuxRuntime(report, { subscriptionId, parameters });

  report.beginStage(STAGE_LABELS.existingSpeech);
  const observedSpeechSku = await checkExistingSpeechAccount(report, {
    subscriptionId,
    location,
    resourceGroup,
    speechAccountName,
  });

  for (const resource of RESOURCE_PLAN) {
    report.beginStage(`${resource.providerNamespace} ${resource.displayName}`);

    const resourceLocation = resolveResourceLocation(resource, parameters, location);
    if (resourceLocation === undefined) {
      report.record({
        name: `${resource.id} target region`,
        status: CHECK_STATUS.fail,
        detail: `parameter ${String(resource.locationParameterName)} does not resolve to a region, so capacity would be checked against the wrong location`,
      });
      continue;
    }

    const requestedSku = describeRequestedSku(resource, parameters);
    report.note(
      requestedSku === ''
        ? `quantity ${resource.quantity}, region ${resourceLocation}`
        : `quantity ${resource.quantity}, region ${resourceLocation}, requested ${requestedSku}`,
    );

    // Every strategy runs. Stopping at the first conclusive answer meant a
    // resource whose SKU probe passed never had its quota checked, so a SKU that
    // is offered but has no remaining quota read as available capacity.
    const statuses = [];

    for (const strategy of resource.capacityStrategies) {
      const outcome = await applyStrategy(strategy, {
        resource,
        parameters,
        subscriptionId,
        location: resourceLocation,
        resourceGroup,
        speechAccountName,
      });

      report.record({
        name: `${resource.id} via ${strategy}`,
        status: outcome.status,
        detail: outcome.detail,
        evidence: outcome.evidence,
      });

      statuses.push(outcome.status);
    }

    const anyFailed = statuses.includes(CHECK_STATUS.fail);
    const anyPassed = statuses.includes(CHECK_STATUS.pass);

    if (anyFailed) {
      report.record({
        name: `${resource.id} capacity conclusion`,
        status: CHECK_STATUS.fail,
        detail: 'at least one probe refused this resource, so provisioning is blocked',
      });
    } else if (!anyPassed) {
      report.record({
        name: `${resource.id} capacity conclusion`,
        status: CHECK_STATUS.inconclusive,
        detail: `no probe established capacity. Documented limit reference: ${resource.documentedLimitReference}. ${
          resource.documentedLimit === null
            ? 'No limit figure is asserted here, so the operator must confirm headroom before provisioning.'
            : `Documented limit: ${resource.documentedLimit}.`
        }`,
      });
    }

    if (resource.note !== undefined) {
      report.note(resource.note);
    }
  }

  return { report, observedSpeechSku };
}

/**
 * @param {DeploymentReport} report
 * @param {boolean} dryRun
 */
async function ensureExtensions(report, dryRun) {
  for (const extensionName of [AZ_EXTENSIONS.quota, AZ_EXTENSIONS.resourceGraph]) {
    if (dryRun) {
      report.record({
        name: `extension ${extensionName}`,
        status: CHECK_STATUS.skip,
        detail: 'check mode does not install extensions',
      });
      continue;
    }

    const outcome = await ensureAzureCliExtension(extensionName, {
      timeoutMs: TIMEOUTS_MS.capacityProbe,
    });

    report.record({
      name: `extension ${extensionName}`,
      status: outcome.ok ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: outcome.ok
        ? outcome.alreadyPresent
          ? 'already installed'
          : 'installed for this run'
        : `could not be installed, so the probes that depend on it cannot run: ${firstLine(outcome.stderr)}`,
      evidence: [outcome.commandLine],
    });
  }
}

/**
 * Confirm the requested Linux runtime string appears in the advertised list. A
 * runtime that is merely plausible is rejected, because App Service accepts an
 * unknown value at deployment time and fails at container start.
 *
 * @param {DeploymentReport} report
 * @param {{ subscriptionId: string, parameters: import('./lib/bicep-params.js').BicepParameterFile }} context
 */
async function checkLinuxRuntime(report, context) {
  const requested = context.parameters.values.appServiceLinuxFxVersion;

  if (typeof requested !== 'string' || requested.trim() === '') {
    report.record({
      name: 'linux runtime declared',
      status: CHECK_STATUS.fail,
      detail: 'appServiceLinuxFxVersion is missing from the committed parameter file',
    });
    return;
  }

  const result = await azJson(['webapp', 'list-runtimes', FLAGS.os, LINUX_OS_NAME], {
    subscriptionId: context.subscriptionId,
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!result.ok || !Array.isArray(result.value)) {
    report.record({
      name: 'linux runtime advertised',
      status: CHECK_STATUS.inconclusive,
      detail: `the advertised runtime list could not be read, so ${requested} is unverified: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    });
    return;
  }

  const advertised = normaliseRuntimeList(result.value);

  if (advertised.length === 0) {
    report.record({
      name: 'linux runtime advertised',
      status: CHECK_STATUS.inconclusive,
      detail: `the runtime list was returned in an unrecognised shape, so ${requested} is unverified`,
      evidence: [result.commandLine],
    });
    return;
  }

  const matched = advertised.some((entry) => entry.toLowerCase() === requested.toLowerCase());

  report.record({
    name: 'linux runtime advertised',
    status: matched ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: matched
      ? `${requested} appears in the advertised linux runtime list`
      : `${requested} does not appear in the advertised linux runtime list. Record an approved substitution in the deployment plan rather than changing the runtime silently.`,
    evidence: [result.commandLine],
  });
}

/**
 * Confirm the Speech account named in the environment already exists. This is
 * the check that makes a repeated provision safe: the deployment updates that
 * account in place, and a missing or mistyped name is what would create a second
 * one.
 *
 * @param {DeploymentReport} report
 * @param {{ subscriptionId: string, location: string, resourceGroup: string | undefined, speechAccountName: string | undefined }} context
 */
async function checkExistingSpeechAccount(report, context) {
  if (context.resourceGroup === undefined || context.speechAccountName === undefined) {
    report.record({
      name: 'speech account identified',
      status: CHECK_STATUS.fail,
      detail: `both ${AZD_ENV_KEYS.resourceGroup} and ${AZD_ENV_KEYS.speechAccountName} are required, because an unidentified account is what leads to a duplicate being created`,
    });
    return;
  }

  const result = await azJson(
    [
      'cognitiveservices',
      'account',
      'show',
      FLAGS.name,
      context.speechAccountName,
      FLAGS.resourceGroup,
      context.resourceGroup,
    ],
    {
      subscriptionId: context.subscriptionId,
      query: '{kind:kind, sku:sku.name, location:location}',
      timeoutMs: TIMEOUTS_MS.capacityProbe,
    },
  );

  if (!result.ok || typeof result.value !== 'object' || result.value === null) {
    report.record({
      name: 'speech account identified',
      status: CHECK_STATUS.fail,
      detail: `the named speech account could not be read. Provisioning would create a second account rather than upgrading the existing one: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    });
    return;
  }

  const account = /** @type {Record<string, unknown>} */ (result.value);
  const mismatches = [];

  if (account.kind !== SPEECH_ACCOUNT_KIND) {
    mismatches.push(
      `kind is ${String(account.kind)} rather than ${SPEECH_ACCOUNT_KIND}, so this is not a speech account`,
    );
  }

  // A region mismatch is a blocker rather than a warning. The deployment declares
  // the account at the target region, so applying it against an account in another
  // region either fails or, worse, is accepted as an unintended move.
  if (typeof account.location === 'string' && !sameRegion(account.location, context.location)) {
    mismatches.push(
      `region is ${account.location} but the deployment targets ${context.location}, which the in place update cannot reconcile`,
    );
  }

  report.record({
    name: 'speech account identified',
    status: mismatches.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      mismatches.length === 0
        ? `exists in ${String(account.location)} with current sku ${String(account.sku)}, so the deployment updates it in place`
        : `the named account does not match the requested deployment: ${mismatches.join('; ')}`,
    evidence: [result.commandLine],
  });

  // Returned so the confirmation gate can tell whether the deployment would
  // actually change the sku, rather than asking for agreement to a no op.
  return typeof account.sku === 'string' ? account.sku : undefined;
}

/**
 * @typedef {{ status: string, detail: string, evidence: string[] }} StrategyOutcome
 */

/**
 * @param {string} strategy
 * @param {{
 *   resource: import('./deployment-contract.js').PlannedResource,
 *   parameters: import('./lib/bicep-params.js').BicepParameterFile,
 *   subscriptionId: string,
 *   location: string,
 *   resourceGroup: string | undefined,
 *   speechAccountName: string | undefined,
 * }} context
 * @returns {Promise<StrategyOutcome>}
 */
async function applyStrategy(strategy, context) {
  switch (strategy) {
    case CAPACITY_STRATEGY.appServiceSkuLocations:
      return probeAppServiceSku(context);
    case CAPACITY_STRATEGY.postgresSkuList:
      return probePostgresSku(context);
    case CAPACITY_STRATEGY.cognitiveServicesSkuList:
      return probeSpeechSku(context);
    case CAPACITY_STRATEGY.virtualMachineSkuList:
      return probeVirtualMachineSku(context);
    case CAPACITY_STRATEGY.providerLocationSupport:
      return probeProviderLocation(context);
    case CAPACITY_STRATEGY.quotaApi:
      return probeQuota(context);
    case CAPACITY_STRATEGY.resourceGraphCount:
      return probeResourceGraphCount(context);
    default:
      return {
        status: CHECK_STATUS.inconclusive,
        detail: `no probe is implemented for strategy ${strategy}`,
        evidence: [],
      };
  }
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeAppServiceSku(context) {
  const sku = context.parameters.values.appServicePlanSkuName;
  if (typeof sku !== 'string') {
    return { status: CHECK_STATUS.fail, detail: 'appServicePlanSkuName is not a string value', evidence: [] };
  }

  const result = await azJson(
    ['appservice', 'list-locations', FLAGS.sku, sku, FLAGS.linuxWorkersEnabled],
    { subscriptionId: context.subscriptionId, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the location list for sku ${sku} could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const offered = result.value
    .map((entry) => (typeof entry === 'object' && entry !== null ? /** @type {Record<string, unknown>} */ (entry).name : undefined))
    .filter((name) => typeof name === 'string');

  const available = offered.some((name) => sameRegion(String(name), context.location));

  return {
    status: available ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: available
      ? `sku ${sku} with linux workers is offered in ${context.location}`
      : `sku ${sku} with linux workers is not offered in ${context.location}. This is a blocker, not a reason to select a cheaper tier.`,
    evidence: [result.commandLine],
  };
}

/**
 * Probe a virtual machine size against the region's restrictions collection.
 *
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeVirtualMachineSku(context) {
  const [sizeParameterName] = context.resource.skuParameterNames;
  const requestedSize =
    sizeParameterName === undefined ? undefined : context.parameters.values[sizeParameterName];

  if (typeof requestedSize !== 'string' || requestedSize.trim() === '') {
    // Not inconclusive. The parameter file pinning no size is itself the finding:
    // the template default governs, unreviewed and unprobed, and this check cannot
    // establish capacity for a value it cannot read.
    return {
      status: CHECK_STATUS.warn,
      detail: `${String(sizeParameterName)} is not set in the committed parameter file, so the template default governs the size and no capacity check can be made against it. Pin the size to have it probed.`,
      evidence: [],
    };
  }

  const result = await azJson(
    ['vm', 'list-skus', FLAGS.resourceType, VIRTUAL_MACHINES_RESOURCE_TYPE, FLAGS.location, context.location],
    { subscriptionId: context.subscriptionId, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the size list for ${context.location} could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const assessment = assessVirtualMachineSkuRestrictions(result.value, requestedSize, context.location);

  if (!assessment.listed) {
    return {
      status: CHECK_STATUS.fail,
      detail: `size ${requestedSize} is not offered in ${context.location}`,
      evidence: [result.commandLine],
    };
  }

  if (assessment.blockedReasons.length > 0) {
    return {
      status: CHECK_STATUS.fail,
      detail: `size ${requestedSize} is listed in ${context.location} but restricted for this subscription (${assessment.blockedReasons.join(', ')}), so a deployment requesting it fails with SkuNotAvailable. Select an unrestricted family rather than retrying.`,
      evidence: [result.commandLine],
    };
  }

  if (assessment.zoneOnlyReasons.length > 0) {
    return {
      status: CHECK_STATUS.warn,
      detail: `size ${requestedSize} is deployable in ${context.location} with no zone pinned, but named zones are restricted (${assessment.zoneOnlyReasons.join(', ')})`,
      evidence: [result.commandLine],
    };
  }

  return {
    status: CHECK_STATUS.pass,
    detail: `size ${requestedSize} is offered in ${context.location} with an empty restrictions collection`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probePostgresSku(context) {
  const skuName = context.parameters.values.postgresSkuName;
  const skuTier = context.parameters.values.postgresSkuTier;
  const version = context.parameters.values.postgresVersion;

  const result = await azJson(
    ['postgres', 'flexible-server', 'list-skus', FLAGS.location, context.location],
    { subscriptionId: context.subscriptionId, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the flexible server sku list could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const serialised = JSON.stringify(result.value);
  const skuOffered = typeof skuName === 'string' && serialised.includes(skuName);
  const tierOffered = typeof skuTier === 'string' && serialised.includes(skuTier);
  const versionOffered = typeof version === 'string' && serialised.includes(`"${version}"`);

  const missing = [];
  if (!skuOffered) {
    missing.push(`compute sku ${String(skuName)}`);
  }
  if (!tierOffered) {
    missing.push(`tier ${String(skuTier)}`);
  }
  if (!versionOffered) {
    missing.push(`major version ${String(version)}`);
  }

  return {
    status: missing.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      missing.length === 0
        ? `${String(skuTier)} ${String(skuName)} on major version ${String(version)} is offered in ${context.location}`
        : `not offered in ${context.location}: ${missing.join(', ')}`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeSpeechSku(context) {
  if (context.resourceGroup === undefined || context.speechAccountName === undefined) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: 'the existing account name and resource group are required to list the skus it can move to',
      evidence: [],
    };
  }

  const requestedSku = context.parameters.values.speechSku;
  const result = await azJson(
    [
      'cognitiveservices',
      'account',
      'list-skus',
      FLAGS.name,
      context.speechAccountName,
      FLAGS.resourceGroup,
      context.resourceGroup,
    ],
    { subscriptionId: context.subscriptionId, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the sku list for the existing speech account could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const offered = JSON.stringify(result.value ?? []);
  const available = typeof requestedSku === 'string' && offered.includes(`"${requestedSku}"`);

  return {
    status: available ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: available
      ? `sku ${String(requestedSku)} is offered for the existing account, so the in place upgrade is valid`
      : `sku ${String(requestedSku)} is not offered for the existing account in ${context.location}`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeProviderLocation(context) {
  const shortType = context.resource.resourceType.split('/').slice(1).join('/');

  // The whole resourceTypes array is fetched and filtered here rather than in a
  // JMESPath expression, because JMESPath equality is case sensitive. Filtering with
  // == against a lowercase literal returned nothing whenever the provider reported a
  // different casing, which read as an unreadable location list rather than as a
  // mismatch, with an empty error to explain it.
  const result = await azJson(
    ['provider', 'show', FLAGS.namespace, context.resource.providerNamespace],
    {
      subscriptionId: context.subscriptionId,
      query: 'resourceTypes[].{resourceType: resourceType, locations: locations}',
      timeoutMs: TIMEOUTS_MS.capacityProbe,
    },
  );

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the resource type list for ${context.resource.providerNamespace} could not be read: ${firstLine(result.stderr) || 'no detail reported'}`,
      evidence: [result.commandLine],
    };
  }

  const locations = findResourceTypeLocations(result.value, shortType);

  if (locations === undefined) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `${context.resource.resourceType} was not present in the provider's resource type list, so its regional support is unknown`,
      evidence: [result.commandLine],
    };
  }

  const supported = locations.some((entry) => sameRegion(entry, context.location));

  if (!supported) {
    return {
      status: CHECK_STATUS.fail,
      detail: `${context.resource.resourceType} is not offered in ${context.location}`,
      evidence: [result.commandLine],
    };
  }

  return {
    status: CHECK_STATUS.inconclusive,
    detail: `${context.resource.resourceType} is offered in ${context.location}. Regional support is not a capacity statement, so this probe alone does not clear the resource.`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeQuota(context) {
  const scope = `/subscriptions/${context.subscriptionId}/providers/${context.resource.providerNamespace}/locations/${context.location}`;
  const result = await azJson(['quota', 'list', FLAGS.scope, scope], {
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the quota surface did not answer for ${context.resource.providerNamespace} in ${context.location}. Fall back to the documented limit: ${context.resource.documentedLimitReference}.`,
      evidence: [result.commandLine],
    };
  }

  const entries = result.value
    .filter((entry) => typeof entry === 'object' && entry !== null)
    .map((entry) => /** @type {Record<string, any>} */ (entry));

  if (entries.length === 0) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the quota surface returned no entries for ${context.resource.providerNamespace}. An empty response is not a statement of available capacity.`,
      evidence: [result.commandLine],
    };
  }

  const numeric = entries.filter((entry) => typeof entry?.properties?.limit?.value === 'number');

  if (numeric.length === 0) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `${entries.length} quota entries were returned but none carried a numeric limit. A missing or unlimited limit value is recorded as unverified rather than as available capacity.`,
      evidence: [result.commandLine],
    };
  }

  // A limit alone is not headroom. Current usage has to be subtracted, or a fully
  // consumed quota reads as available because its limit is larger than the one
  // resource being requested.
  const usageResult = await azJson(['quota', 'usage', 'list', FLAGS.scope, scope], {
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!usageResult.ok || !Array.isArray(usageResult.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `${numeric.length} quota limits were read but current usage could not be, so remaining headroom is unknown. A limit without usage is not a capacity statement.`,
      evidence: [result.commandLine, usageResult.commandLine],
    };
  }

  const assessed = assessQuotaHeadroom(numeric, usageResult.value, context.resource.quantity);

  if (assessed.unmatched.length > 0 && assessed.exhausted.length === 0) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `usage could not be matched to ${assessed.unmatched.length} quota entry or entries (${assessed.unmatched.join(', ')}), so remaining headroom is unconfirmed for those`,
      evidence: [result.commandLine, usageResult.commandLine],
    };
  }

  return {
    status: assessed.exhausted.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      assessed.exhausted.length === 0
        ? `${assessed.checked} quota entries have at least ${context.resource.quantity} remaining after current usage`
        : `insufficient remaining quota on ${assessed.exhausted.join(', ')}`,
    evidence: [result.commandLine, usageResult.commandLine],
  };
}

/**
 * Compare quota limits against current usage.
 *
 * Entries are matched on the quota name, which both surfaces report. An entry
 * whose usage cannot be found is reported as unmatched rather than assumed to be
 * unused.
 *
 * @param {Array<Record<string, any>>} limitEntries
 * @param {unknown[]} usageEntries
 * @param {number} requiredQuantity
 * @returns {{ checked: number, exhausted: string[], unmatched: string[] }}
 */
export function assessQuotaHeadroom(limitEntries, usageEntries, requiredQuantity) {
  /** @type {Map<string, number>} */
  const usageByName = new Map();

  for (const entry of usageEntries) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = /** @type {Record<string, any>} */ (entry);
    const name = quotaEntryName(record);
    const used = record?.properties?.usages?.value ?? record?.properties?.usages;
    if (name !== undefined && typeof used === 'number') {
      usageByName.set(name, used);
    }
  }

  const exhausted = [];
  const unmatched = [];
  let checked = 0;

  for (const entry of limitEntries) {
    const name = quotaEntryName(entry) ?? 'unnamed quota';
    const limit = entry.properties.limit.value;
    const used = usageByName.get(name);

    if (used === undefined) {
      unmatched.push(name);
      continue;
    }

    checked += 1;
    if (limit - used < requiredQuantity) {
      exhausted.push(`${name} (limit ${limit}, used ${used})`);
    }
  }

  return { checked, exhausted, unmatched };
}

/**
 * Quota name, which appears either at the top level or under the properties.
 *
 * @param {Record<string, any>} entry
 * @returns {string | undefined}
 */
function quotaEntryName(entry) {
  const candidates = [entry?.name?.value, entry?.name, entry?.properties?.name?.value];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate !== '') {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Count existing resources of the planned type. This does not establish a limit,
 * but it records the headroom evidence the deployment plan needs and it detects
 * the case where a resource the plan expects to create already exists.
 *
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeResourceGraphCount(context) {
  const query = `Resources | where type =~ '${context.resource.resourceType}' | summarize existing = count()`;
  const result = await azJson(['graph', 'query', FLAGS.graphQuery, query], {
    subscriptionId: context.subscriptionId,
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!result.ok) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `resource graph did not answer for ${context.resource.resourceType}: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const payload = /** @type {Record<string, any> | undefined} */ (result.value);
  const existing = payload?.data?.[0]?.existing;

  return {
    status: CHECK_STATUS.inconclusive,
    detail:
      typeof existing === 'number'
        ? `${existing} resource or resources of this type already exist in the subscription. Headroom against the documented limit (${context.resource.documentedLimit ?? 'figure not asserted here'}) is for the operator to confirm.`
        : 'resource graph answered without a countable result',
    evidence: [result.commandLine],
  };
}

/**
 * @param {import('./deployment-contract.js').PlannedResource} resource
 * @param {import('./lib/bicep-params.js').BicepParameterFile} parameters
 * @returns {string}
 */
function describeRequestedSku(resource, parameters) {
  return resource.skuParameterNames
    .map((name) => `${name}=${String(parameters.values[name] ?? 'unset')}`)
    .join(', ');
}

/**
 * @param {string} text
 * @returns {string}
 */
function firstLine(text) {
  const [line] = text.split('\n');
  return line ?? '';
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  /** @type {Record<string, string>} */
  const fromProcess = {};
  for (const key of Object.values(AZD_ENV_KEYS)) {
    const value = process.env[key];
    if (value !== undefined && value.trim() !== '') {
      fromProcess[key] = value.trim();
    }
  }

  const { report } = await checkCapacity({
    resolved: fromProcess,
    dryRun: process.argv.includes('--check'),
  });
  report.writeSummary();
  process.exit(report.blocked ? EXIT_CODES.blocked : EXIT_CODES.success);
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function baseName(filePath) {
  const normalised = filePath.replaceAll('\\', '/');
  const index = normalised.lastIndexOf('/');
  return index === -1 ? normalised : normalised.slice(index + 1);
}
