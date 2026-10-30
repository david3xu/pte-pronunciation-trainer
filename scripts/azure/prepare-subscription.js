/**
 * Authorised subscription preparation.
 *
 * Deliberately separate from the preflight. Provider registration is a subscription
 * level write, and the preflight gates every write behind the paid provisioning
 * confirmation, which also authorises about 241 US dollars per month of resources.
 * Those are different decisions: an operator can reasonably authorise registering a
 * namespace without authorising the spend that would follow.
 *
 * This script performs exactly two kinds of action and nothing else.
 *
 *   Installs the local Azure CLI quota and resource-graph extensions, which are
 *   machine local and create no Azure resource.
 *
 *   Registers required resource provider namespaces that report NotRegistered, and
 *   waits for each to settle. Namespaces already registered receive no write.
 *
 * It creates no resource, changes no SKU, sets no confirmation, runs no what if and
 * deploys nothing. It refuses without an explicit flag so it cannot run by accident
 * or as part of another script.
 */

import { AZ_EXTENSIONS, ensureAzureCliExtension } from './lib/az.js';
import { readAzdEnvironment } from './lib/azd-env.js';
import { registerProviders } from './register-providers.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { AZD_ENV_KEYS, EXIT_CODES, TIMEOUTS_MS } from './deployment-contract.js';

/** Required to proceed. Without it the script reports what it would do and exits. */
export const CONFIRM_FLAG = '--confirm-registration';

const REPORT_TITLE = 'Authorised subscription preparation';

/**
 * @param {{ confirmed?: boolean, report?: DeploymentReport }} [options]
 * @returns {Promise<{ report: DeploymentReport }>}
 */
export async function prepareSubscription(options = {}) {
  const report = options.report ?? new DeploymentReport(REPORT_TITLE);
  const confirmed = options.confirmed ?? false;

  report.beginStage('scope');
  report.note('this script registers provider namespaces and installs cli extensions');
  report.note('it creates no resource, changes no sku, sets no confirmation and deploys nothing');

  if (!confirmed) {
    report.record({
      name: 'registration authorised',
      status: CHECK_STATUS.fail,
      detail: `not confirmed. Provider registration writes to the subscription, so it requires ${CONFIRM_FLAG} on the command line.`,
    });
    return { report };
  }

  report.record({
    name: 'registration authorised',
    status: CHECK_STATUS.pass,
    detail: 'explicit flag supplied',
  });

  report.beginStage('target subscription');

  const stored = await readAzdEnvironment({ timeoutMs: TIMEOUTS_MS.cliProbe });
  const subscriptionId = stored.ok
    ? (process.env[AZD_ENV_KEYS.subscriptionId]?.trim() ??
      stored.values[AZD_ENV_KEYS.subscriptionId]?.trim())
    : process.env[AZD_ENV_KEYS.subscriptionId]?.trim();

  report.record({
    name: 'subscription resolved',
    status: subscriptionId === undefined || subscriptionId === '' ? CHECK_STATUS.fail : CHECK_STATUS.pass,
    detail:
      subscriptionId === undefined || subscriptionId === ''
        ? 'no subscription could be resolved from the process or the selected azd environment'
        : 'resolved from the selected azd environment',
  });

  if (subscriptionId === undefined || subscriptionId === '') {
    return { report };
  }

  report.beginStage('azure cli extensions');

  for (const extensionName of [AZ_EXTENSIONS.quota, AZ_EXTENSIONS.resourceGraph]) {
    const outcome = await ensureAzureCliExtension(extensionName, {
      timeoutMs: TIMEOUTS_MS.capacityProbe,
    });

    report.record({
      name: `extension ${extensionName}`,
      status: outcome.ok ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: outcome.ok
        ? outcome.alreadyPresent
          ? 'already installed'
          : 'installed'
        : `could not be installed: ${outcome.stderr.split('\n')[0] ?? 'no detail'}`,
      evidence: [outcome.commandLine],
    });
  }

  // Registers only namespaces reporting NotRegistered. Already registered namespaces
  // receive no write, which is why this is safe to repeat.
  await registerProviders({ report, subscriptionId, dryRun: false });

  return { report };
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  const { report } = await prepareSubscription({
    confirmed: process.argv.includes(CONFIRM_FLAG),
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
