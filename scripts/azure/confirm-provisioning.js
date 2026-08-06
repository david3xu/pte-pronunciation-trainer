/**
 * Paid provisioning and Speech upgrade confirmation gate.
 *
 * The last preflight stage before ARM is asked to create anything. Everything
 * earlier is read only; this is the point where an operator is told what the next
 * step costs and has to agree to it.
 *
 * Two separate confirmations, because they are two separate decisions. Creating
 * staging infrastructure is not the same as changing the SKU of a Speech account
 * that is already serving production traffic, and an operator who agreed to the
 * first has not implicitly agreed to the second.
 *
 * The gate refuses by default. A missing confirmation blocks, so an unattended run
 * cannot spend money by omission.
 */

import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import {
  CONFIRMATION_KEYS,
  CONFIRMATION_VALUE,
  ESTIMATED_MONTHLY_USD,
  EXIT_CODES,
  RESOURCE_PLAN,
} from './deployment-contract.js';

const STAGE_LABEL = 'paid provisioning confirmation';
const SPEECH_RESOURCE_ID = 'speech';
const FREE_SPEECH_SKU = 'F0';
const PRODUCTION_STAGE = 'production';

/**
 * Total the fixed monthly estimates, and list the resources that are usage billed
 * and therefore cannot be included in a total.
 *
 * @returns {{ fixedTotalUsd: number, fixedResources: string[], usageBilled: string[] }}
 */
export function summariseEstimatedCost() {
  const fixedResources = [];
  const usageBilled = [];
  let fixedTotalUsd = 0;

  for (const resource of RESOURCE_PLAN) {
    const estimate = ESTIMATED_MONTHLY_USD[resource.id];

    if (estimate === null || estimate === undefined) {
      usageBilled.push(resource.displayName);
      continue;
    }
    if (estimate > 0) {
      fixedTotalUsd += estimate;
      fixedResources.push(`${resource.displayName} about ${estimate}`);
    }
  }

  return { fixedTotalUsd, fixedResources, usageBilled };
}

/**
 * True when a confirmation value is present and exactly the accepted value.
 *
 * Anything other than the accepted value counts as absent. A partial or
 * approximate answer such as a truthy string is not treated as agreement.
 *
 * @param {string | undefined} value
 * @returns {boolean}
 */
export function isConfirmed(value) {
  return value !== undefined && value.trim().toLowerCase() === CONFIRMATION_VALUE;
}

/**
 * Run the confirmation gate.
 *
 * @param {{
 *   report?: DeploymentReport,
 *   processEnvironment?: Record<string, string | undefined>,
 *   requestedSpeechSku?: unknown,
 *   currentSpeechSku?: string | undefined,
 *   dryRun?: boolean,
 * }} [options]
 * @returns {{ report: DeploymentReport }}
 */
export function confirmProvisioning(options = {}) {
  const report = options.report ?? new DeploymentReport('Provisioning confirmation');
  const environment = options.processEnvironment ?? process.env;
  const dryRun = options.dryRun ?? false;

  report.beginStage(STAGE_LABEL);

  const cost = summariseEstimatedCost();

  report.note(
    `the next step creates ${RESOURCE_PLAN.length} resource types with an estimated fixed cost near ${cost.fixedTotalUsd} US dollars per month`,
  );
  for (const line of cost.fixedResources) {
    report.note(`  ${line}`);
  }
  report.note(
    `usage billed and excluded from that total: ${cost.usageBilled.join(', ')}`,
  );
  report.note(
    'estimates only. Price each in the Azure calculator for the target region before agreeing.',
  );

  if (dryRun) {
    report.record({
      name: CONFIRMATION_KEYS.paidProvisioning,
      status: CHECK_STATUS.skip,
      detail: 'check mode does not gate, because check mode provisions nothing',
    });
    return { report };
  }

  const paidConfirmed = isConfirmed(environment[CONFIRMATION_KEYS.paidProvisioning]);

  report.record({
    name: CONFIRMATION_KEYS.paidProvisioning,
    status: paidConfirmed ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: paidConfirmed
      ? 'operator has agreed to create billable resources'
      : `not confirmed. Provisioning is refused. Set it with: azd env set ${CONFIRMATION_KEYS.paidProvisioning} ${CONFIRMATION_VALUE}`,
  });

  // Production stage gate. Separate from the cost gate, because declaring this
  // estate production is a product decision about where real traffic goes, not a
  // spending decision. Handler parity is incomplete, so the default is staging and
  // promoting requires saying so explicitly.
  const requestedStage = options.deploymentStage;

  if (requestedStage === PRODUCTION_STAGE) {
    const productionConfirmed = isConfirmed(environment[CONFIRMATION_KEYS.productionStage]);

    report.record({
      name: CONFIRMATION_KEYS.productionStage,
      status: productionConfirmed ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: productionConfirmed
        ? 'operator has agreed to deploy this estate as production'
        : `not confirmed. The deployment requests the production stage while handler parity is incomplete and only the voices route is exposed. Set it with: azd env set ${CONFIRMATION_KEYS.productionStage} ${CONFIRMATION_VALUE}`,
    });
  } else {
    report.record({
      name: CONFIRMATION_KEYS.productionStage,
      status: CHECK_STATUS.skip,
      detail: `stage is ${requestedStage ?? 'unset, treated as staging'}, so no production confirmation is required`,
    });
  }

  // The Speech gate only applies when the deployment would actually change the SKU.
  // Asking for confirmation on a no op change trains an operator to confirm without
  // reading, which is worse than not asking.
  const speechResource = RESOURCE_PLAN.find((entry) => entry.id === SPEECH_RESOURCE_ID);
  const requestedSku =
    typeof options.requestedSpeechSku === 'string' ? options.requestedSpeechSku : undefined;
  const currentSku = options.currentSpeechSku;
  const skuWouldChange =
    requestedSku !== undefined && currentSku !== undefined && requestedSku !== currentSku;

  if (speechResource === undefined || requestedSku === undefined) {
    report.record({
      name: CONFIRMATION_KEYS.speechSkuUpgrade,
      status: CHECK_STATUS.warn,
      detail:
        'the requested Speech sku could not be determined, so the upgrade gate cannot decide whether it applies',
    });
    return { report };
  }

  if (!skuWouldChange) {
    report.record({
      name: CONFIRMATION_KEYS.speechSkuUpgrade,
      status: CHECK_STATUS.skip,
      detail:
        currentSku === undefined
          ? `the current sku is unknown, so no change can be asserted. Requested ${requestedSku}.`
          : `already ${currentSku}, so the deployment does not change it`,
    });
    return { report };
  }

  const speechConfirmed = isConfirmed(environment[CONFIRMATION_KEYS.speechSkuUpgrade]);
  const leavingFreeTier = currentSku === FREE_SPEECH_SKU;

  report.record({
    name: CONFIRMATION_KEYS.speechSkuUpgrade,
    status: speechConfirmed ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: speechConfirmed
      ? `operator has agreed to move the existing account from ${currentSku} to ${requestedSku}`
      : `not confirmed. The deployment would change the existing account from ${currentSku} to ${requestedSku}${
          leavingFreeTier
            ? ', which starts billing for synthesis that is currently free and affects the account already serving production traffic'
            : ''
        }. Set it with: azd env set ${CONFIRMATION_KEYS.speechSkuUpgrade} ${CONFIRMATION_VALUE}`,
  });

  return { report };
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  const { report } = confirmProvisioning({ dryRun: process.argv.includes('--check') });
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
