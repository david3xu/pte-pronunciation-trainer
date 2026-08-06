/**
 * Pre provision hook entry point.
 *
 * Runs the three preflight stages in the order the deployment contract requires
 * and refuses to continue as soon as a stage produces a blocking finding. The
 * hook is idempotent: repeated runs read the same state, and the only write it
 * ever performs is a resource provider registration for a namespace that is not
 * already registered.
 *
 * Invoke with --check to run every read only probe and skip both the provider
 * registration write and the Azure CLI extension installation. Check mode is
 * what makes the hook safe to run during repository validation.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { checkCapacity } from './check-capacity.js';
import { confirmProvisioning } from './confirm-provisioning.js';
import { registerProviders } from './register-providers.js';
import { validateEnvironment } from './validate-environment.js';
import { loadBicepParameters } from './lib/bicep-params.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { REPO_PATHS, toRepoRelative } from './lib/paths.js';
import {
  AZD_ENV_KEYS,
  DEPLOYMENT_STAGES,
  EXIT_CODES,
  HOOK_NAMES,
  PROVISIONING_EXPECTATIONS,
} from './deployment-contract.js';

const CHECK_FLAG = '--check';
const EVIDENCE_FILE_NAME = 'preprovision-evidence.md';
const REPORT_TITLE = 'Azure pre provision preflight';

/** Stage identifiers this hook owns, taken from the deployment contract. */
const OWNED_STAGES = DEPLOYMENT_STAGES.filter((stage) => stage.owner === HOOK_NAMES.preprovision);

/**
 * Run the pre provision preflight.
 *
 * @param {{ dryRun?: boolean, writeEvidence?: boolean }} [options]
 * @returns {Promise<{ report: DeploymentReport, evidencePath: string | undefined }>}
 */
export async function runPreprovision(options = {}) {
  const dryRun = options.dryRun ?? false;
  const writeEvidence = options.writeEvidence ?? true;
  const report = new DeploymentReport(REPORT_TITLE);

  report.note(
    dryRun
      ? 'check mode. Every probe is read only and no provider registration is submitted.'
      : 'live mode. Missing provider registrations will be submitted and awaited.',
  );
  report.note(
    `stages owned by this hook: ${OWNED_STAGES.map((stage) => `${stage.order} ${stage.description}`).join(' then ')}`,
  );
  report.note(
    `api management provisioning commonly takes ${PROVISIONING_EXPECTATIONS.apiManagementMinutesTypicalLow} to ${PROVISIONING_EXPECTATIONS.apiManagementMinutesTypicalHigh} minutes. Slow provisioning is expected and is not a failure.`,
  );

  const environment = await validateEnvironment({ report });

  if (report.blocked) {
    report.beginStage('preflight halted');
    report.record({
      name: 'continue to provider registration',
      status: CHECK_STATUS.skip,
      detail: 'the environment stage produced a blocking finding, so no subscription write is attempted',
    });
    return finish(report, writeEvidence);
  }

  await registerProviders({
    report,
    subscriptionId: environment.resolved[AZD_ENV_KEYS.subscriptionId],
    dryRun,
  });

  if (report.blocked) {
    report.beginStage('preflight halted');
    report.record({
      name: 'continue to capacity validation',
      status: CHECK_STATUS.skip,
      detail: 'a required provider is not registered, so capacity probes would report misleading results',
    });
    return finish(report, writeEvidence);
  }

  const capacity = await checkCapacity({ report, resolved: environment.resolved, dryRun });

  if (report.blocked) {
    report.beginStage('preflight halted');
    report.record({
      name: 'continue to provisioning confirmation',
      status: CHECK_STATUS.skip,
      detail: 'capacity validation refused, so there is nothing to confirm',
    });
    return finish(report, writeEvidence);
  }

  // Last gate before anything bills. Runs only once every read only check has
  // passed, so the operator is agreeing to a deployment that is known to be
  // viable rather than to a hopeful one.
  const parameters = await loadBicepParameters();
  confirmProvisioning({
    report,
    requestedSpeechSku: parameters.values.speechSku,
    currentSpeechSku: capacity.observedSpeechSku,
    dryRun,
  });

  return finish(report, writeEvidence);
}

/**
 * @param {DeploymentReport} report
 * @param {boolean} writeEvidence
 * @returns {Promise<{ report: DeploymentReport, evidencePath: string | undefined }>}
 */
async function finish(report, writeEvidence) {
  report.beginStage('preflight conclusion');

  const inconclusive = report.findings.filter(
    (finding) => finding.status === CHECK_STATUS.inconclusive,
  );

  const blockingNames = [...new Set(report.blockingFindings.map((finding) => finding.name))];

  report.record({
    name: 'blocking findings',
    status: report.blocked ? CHECK_STATUS.fail : CHECK_STATUS.pass,
    detail: report.blocked
      ? `${blockingNames.length} distinct blocking finding or findings. Provisioning is refused: ${blockingNames.join(', ')}`
      : 'no blocking finding. Provisioning may proceed.',
  });

  if (inconclusive.length > 0) {
    report.record({
      name: 'unverified capacity',
      status: CHECK_STATUS.warn,
      detail: `${inconclusive.length} probe or probes could not establish capacity. Confirm these against the documented limits before accepting the paid provisioning step: ${inconclusive
        .map((finding) => finding.name)
        .join(', ')}`,
    });
  }

  let evidencePath;
  if (writeEvidence) {
    evidencePath = join(REPO_PATHS.evidenceDirectory, EVIDENCE_FILE_NAME);
    await mkdir(REPO_PATHS.evidenceDirectory, { recursive: true });
    await writeFile(evidencePath, report.toMarkdown(), 'utf8');
    report.note(`evidence written to ${toRepoRelative(evidencePath)} for the deployment plan`);
  }

  return { report, evidencePath };
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  const { report } = await runPreprovision({ dryRun: process.argv.includes(CHECK_FLAG) });
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
