/**
 * Stage two of the pre provision hook: register missing resource providers.
 *
 * Registration state is read first and only namespaces that are not already
 * registered are submitted. Registration is a subscription level write, so
 * issuing it unconditionally would be a needless change against a subscription
 * that is shared with another product.
 *
 * The subscription is passed explicitly on every call. The globally selected
 * Azure CLI subscription is never changed.
 */

import { azJson, azVoid } from './lib/az.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import {
  AZD_ENV_KEYS,
  EXIT_CODES,
  PROVIDER_STATE,
  REQUIRED_RESOURCE_PROVIDERS,
  TIMEOUTS_MS,
} from './deployment-contract.js';

const STAGE_LABEL = 'resource provider registration';
const NAMESPACE_FLAG = '--namespace';
const REGISTRATION_STATE_QUERY = 'registrationState';

/**
 * Read the registration state of one provider namespace.
 *
 * @param {string} namespace
 * @param {string} subscriptionId
 * @returns {Promise<{ ok: boolean, state: string | undefined, commandLine: string, stderr: string }>}
 */
async function readRegistrationState(namespace, subscriptionId) {
  const result = await azJson(['provider', 'show', NAMESPACE_FLAG, namespace], {
    subscriptionId,
    query: REGISTRATION_STATE_QUERY,
    timeoutMs: TIMEOUTS_MS.providerRead,
  });

  return {
    ok: result.ok,
    state: typeof result.value === 'string' ? result.value : undefined,
    commandLine: result.commandLine,
    stderr: result.stderr,
  };
}

/**
 * Poll until the namespace reports Registered or the allowance expires.
 *
 * @param {string} namespace
 * @param {string} subscriptionId
 * @param {{ timeoutMs?: number, pollIntervalMs?: number, sleep?: (ms: number) => Promise<void> }} [options]
 * @returns {Promise<{ registered: boolean, lastState: string | undefined, waitedMs: number }>}
 */
export async function waitForRegistration(namespace, subscriptionId, options = {}) {
  const timeoutMs = options.timeoutMs ?? TIMEOUTS_MS.providerRegistration;
  const pollIntervalMs = options.pollIntervalMs ?? TIMEOUTS_MS.providerRegistrationPollInterval;
  const sleep = options.sleep ?? defaultSleep;
  const startedAt = Date.now();
  let lastState;

  while (Date.now() - startedAt < timeoutMs) {
    const current = await readRegistrationState(namespace, subscriptionId);
    lastState = current.state;

    if (current.state === PROVIDER_STATE.registered) {
      return { registered: true, lastState: current.state, waitedMs: Date.now() - startedAt };
    }
    if (current.state === PROVIDER_STATE.notRegistered || current.state === PROVIDER_STATE.unregistering) {
      return { registered: false, lastState: current.state, waitedMs: Date.now() - startedAt };
    }

    await sleep(pollIntervalMs);
  }

  return { registered: false, lastState, waitedMs: Date.now() - startedAt };
}

/**
 * Register every required provider that is not already registered.
 *
 * @param {{ report?: DeploymentReport, subscriptionId?: string, dryRun?: boolean }} [options]
 * @returns {Promise<{ report: DeploymentReport }>}
 */
export async function registerProviders(options = {}) {
  const report = options.report ?? new DeploymentReport('Provider registration');
  const subscriptionId = options.subscriptionId;
  const dryRun = options.dryRun ?? false;

  report.beginStage(STAGE_LABEL);

  if (subscriptionId === undefined) {
    report.record({
      name: 'target subscription resolved',
      status: CHECK_STATUS.fail,
      detail: `${AZD_ENV_KEYS.subscriptionId} was not resolved by the environment stage, so registration cannot be scoped to a subscription`,
    });
    return { report };
  }

  for (const namespace of REQUIRED_RESOURCE_PROVIDERS) {
    const current = await readRegistrationState(namespace, subscriptionId);

    if (!current.ok || current.state === undefined) {
      report.record({
        name: namespace,
        status: CHECK_STATUS.fail,
        detail: `registration state could not be read: ${current.stderr === '' ? 'no detail reported' : firstLine(current.stderr)}`,
        evidence: [current.commandLine],
      });
      continue;
    }

    if (current.state === PROVIDER_STATE.registered) {
      report.record({
        name: namespace,
        status: CHECK_STATUS.pass,
        detail: 'already registered, no write issued',
        evidence: [current.commandLine],
      });
      continue;
    }

    if (dryRun) {
      report.record({
        name: namespace,
        status: CHECK_STATUS.warn,
        detail: `state is ${current.state}. A live run would submit registration and wait for completion.`,
        evidence: [current.commandLine],
      });
      continue;
    }

    if (current.state === PROVIDER_STATE.notRegistered) {
      const submitted = await azVoid(['provider', 'register', NAMESPACE_FLAG, namespace], {
        subscriptionId,
        timeoutMs: TIMEOUTS_MS.providerRead,
      });

      if (!submitted.ok) {
        report.record({
          name: namespace,
          status: CHECK_STATUS.fail,
          detail: `registration request was rejected: ${submitted.stderr === '' ? 'no detail reported' : firstLine(submitted.stderr)}`,
          evidence: [submitted.commandLine],
        });
        continue;
      }
    }

    const settled = await waitForRegistration(namespace, subscriptionId);

    report.record({
      name: namespace,
      status: settled.registered ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: settled.registered
        ? `registered after ${Math.round(settled.waitedMs / 1000)} seconds`
        : `registration did not complete. Last observed state was ${settled.lastState ?? 'unavailable'} after ${Math.round(settled.waitedMs / 1000)} seconds. Resolve this before provisioning, because a dependent resource will fail with a less specific error.`,
    });
  }

  return { report };
}

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function defaultSleep(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
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
  const { report } = await registerProviders({
    subscriptionId: process.env[AZD_ENV_KEYS.subscriptionId]?.trim(),
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
