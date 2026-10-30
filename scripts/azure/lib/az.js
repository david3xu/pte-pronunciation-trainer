/**
 * Azure CLI access for the deployment hooks.
 *
 * Two rules are enforced here rather than left to each caller.
 *
 * 1. The subscription is always passed explicitly. The hooks never run
 *    az account set, so an operator who has another subscription selected
 *    globally is not silently switched, and nothing this automation does
 *    outlives the process.
 * 2. Command output is returned to the caller and never echoed wholesale.
 *    Several Azure reads can include key material, so callers project the
 *    specific fields they need.
 */

import { formatCommand, runCommand, succeeded } from './exec.js';

/** Executable name. Windows ships the CLI as a batch shim. */
const AZ_PROGRAM = process.platform === 'win32' ? 'az.cmd' : 'az';

/** Flag names used when composing Azure CLI invocations. */
const AZ_FLAGS = Object.freeze({
  subscription: '--subscription',
  output: '--output',
  query: '--query',
  name: '--name',
  onlyShowErrors: '--only-show-errors',
});

/** Output formats requested from the Azure CLI. */
const AZ_OUTPUT = Object.freeze({
  json: 'json',
  tsv: 'tsv',
  none: 'none',
});

/** Azure CLI extension names the hooks depend on. */
export const AZ_EXTENSIONS = Object.freeze({
  quota: 'quota',
  resourceGraph: 'resource-graph',
});

/**
 * @typedef {object} AzInvocation
 * @property {string} commandLine Reproducible command text for evidence output.
 * @property {number | null} exitCode
 * @property {boolean} timedOut
 * @property {boolean} cliMissing
 * @property {string} stderr
 */

/**
 * @typedef {AzInvocation & { ok: boolean, value: unknown }} AzJsonResult
 */

let cachedCliAvailability = null;

/**
 * Report whether the Azure CLI is callable at all. Cached because every probe
 * would otherwise pay the startup cost of the version check.
 *
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
export async function isAzureCliAvailable(options = {}) {
  if (cachedCliAvailability !== null) {
    return cachedCliAvailability;
  }
  const result = await runCommand(AZ_PROGRAM, ['version', AZ_FLAGS.output, AZ_OUTPUT.json], {
    timeoutMs: options.timeoutMs,
  });
  cachedCliAvailability = succeeded(result);
  return cachedCliAvailability;
}

/**
 * Run an Azure CLI command scoped to an explicit subscription and parse JSON.
 *
 * @param {string[]} args Command words without the subscription or output flags.
 * @param {{ subscriptionId?: string, timeoutMs?: number, query?: string }} [options]
 * @returns {Promise<AzJsonResult>}
 */
export async function azJson(args, options = {}) {
  const composed = [...args, AZ_FLAGS.onlyShowErrors];

  if (options.query !== undefined) {
    composed.push(AZ_FLAGS.query, options.query);
  }
  if (options.subscriptionId !== undefined) {
    composed.push(AZ_FLAGS.subscription, options.subscriptionId);
  }
  composed.push(AZ_FLAGS.output, AZ_OUTPUT.json);

  const result = await runCommand(AZ_PROGRAM, composed, { timeoutMs: options.timeoutMs });
  const invocation = describeInvocation(composed, result);

  if (!succeeded(result)) {
    return { ...invocation, ok: false, value: undefined };
  }

  if (result.stdout === '') {
    return { ...invocation, ok: true, value: undefined };
  }

  try {
    return { ...invocation, ok: true, value: JSON.parse(result.stdout) };
  } catch (error) {
    return {
      ...invocation,
      ok: false,
      value: undefined,
      stderr: `Azure CLI returned output that is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Run an Azure CLI command that produces no useful stdout, such as a provider
 * registration request.
 *
 * @param {string[]} args
 * @param {{ subscriptionId?: string, timeoutMs?: number }} [options]
 * @returns {Promise<AzInvocation & { ok: boolean }>}
 */
export async function azVoid(args, options = {}) {
  const composed = [...args, AZ_FLAGS.onlyShowErrors];
  if (options.subscriptionId !== undefined) {
    composed.push(AZ_FLAGS.subscription, options.subscriptionId);
  }
  composed.push(AZ_FLAGS.output, AZ_OUTPUT.none);

  const result = await runCommand(AZ_PROGRAM, composed, { timeoutMs: options.timeoutMs });
  return { ...describeInvocation(composed, result), ok: succeeded(result) };
}

/**
 * Ensure a named Azure CLI extension is installed, installing it when absent.
 * Extension installation is idempotent and safe to repeat, and it creates no
 * Azure resource, so it is permitted before the provisioning gate.
 *
 * @param {string} extensionName
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ ok: boolean, alreadyPresent: boolean, commandLine: string, stderr: string }>}
 */
export async function ensureAzureCliExtension(extensionName, options = {}) {
  const showArgs = ['extension', 'show', AZ_FLAGS.name, extensionName];
  const present = await azJson(showArgs, { timeoutMs: options.timeoutMs });

  if (present.ok) {
    return {
      ok: true,
      alreadyPresent: true,
      commandLine: present.commandLine,
      stderr: '',
    };
  }

  const addArgs = ['extension', 'add', AZ_FLAGS.name, extensionName];
  const added = await azVoid(addArgs, { timeoutMs: options.timeoutMs });

  return {
    ok: added.ok,
    alreadyPresent: false,
    commandLine: added.commandLine,
    stderr: added.stderr,
  };
}

/**
 * Read the signed in account without changing the globally selected
 * subscription. Returns undefined when the CLI is not authenticated.
 *
 * @param {{ subscriptionId?: string, timeoutMs?: number }} [options]
 * @returns {Promise<{ id: string, tenantId: string, name: string } | undefined>}
 */
export async function readAccount(options = {}) {
  const result = await azJson(['account', 'show'], options);
  if (!result.ok || typeof result.value !== 'object' || result.value === null) {
    return undefined;
  }
  const account = /** @type {Record<string, unknown>} */ (result.value);
  if (typeof account.id !== 'string' || typeof account.tenantId !== 'string') {
    return undefined;
  }
  return {
    id: account.id,
    tenantId: account.tenantId,
    name: typeof account.name === 'string' ? account.name : account.id,
  };
}

/**
 * @param {string[]} args
 * @param {import('./exec.js').CommandResult} result
 * @returns {AzInvocation}
 */
function describeInvocation(args, result) {
  return {
    commandLine: formatCommand(AZ_PROGRAM, args),
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    cliMissing: result.launchFailed,
    stderr: result.stderr,
  };
}

export { AZ_PROGRAM, AZ_FLAGS, AZ_OUTPUT };
