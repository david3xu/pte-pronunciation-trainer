/**
 * Access to the selected Azure Developer CLI environment.
 *
 * The hooks receive the environment twice: azd exports it into the process
 * environment before invoking a hook, and it is also readable from azd itself.
 * Both are read, because a mismatch between them is exactly the condition the
 * environment validation is required to refuse.
 */

import { formatCommand, runCommand, succeeded } from './exec.js';

const AZD_PROGRAM = process.platform === 'win32' ? 'azd.exe' : 'azd';
const AZD_OUTPUT_JSON = ['--output', 'json'];
const AZD_GET_VALUES = ['env', 'get-values'];
const AZD_SET_VALUE = ['env', 'set'];

/**
 * @typedef {object} AzdEnvironmentRead
 * @property {boolean} ok
 * @property {Record<string, string>} values
 * @property {string} commandLine
 * @property {string} stderr
 * @property {boolean} cliMissing
 */

/**
 * Parse the dotenv style output azd emits when JSON is unavailable.
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseDotEnvValues(text) {
  /** @type {Record<string, string>} */
  const values = {};

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

/**
 * Read every value stored in the selected azd environment.
 *
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<AzdEnvironmentRead>}
 */
export async function readAzdEnvironment(options = {}) {
  const jsonArgs = [...AZD_GET_VALUES, ...AZD_OUTPUT_JSON];
  const jsonResult = await runCommand(AZD_PROGRAM, jsonArgs, { timeoutMs: options.timeoutMs });

  if (succeeded(jsonResult) && jsonResult.stdout !== '') {
    try {
      const parsed = JSON.parse(jsonResult.stdout);
      if (typeof parsed === 'object' && parsed !== null) {
        /** @type {Record<string, string>} */
        const values = {};
        for (const [key, value] of Object.entries(parsed)) {
          values[key] = value === null || value === undefined ? '' : String(value);
        }
        return {
          ok: true,
          values,
          commandLine: formatCommand(AZD_PROGRAM, jsonArgs),
          stderr: '',
          cliMissing: false,
        };
      }
    } catch {
      // Fall through to the dotenv reader below.
    }
  }

  const plainResult = await runCommand(AZD_PROGRAM, AZD_GET_VALUES, { timeoutMs: options.timeoutMs });

  if (!succeeded(plainResult)) {
    return {
      ok: false,
      values: {},
      commandLine: formatCommand(AZD_PROGRAM, AZD_GET_VALUES),
      stderr: plainResult.stderr,
      cliMissing: plainResult.launchFailed,
    };
  }

  return {
    ok: true,
    values: parseDotEnvValues(plainResult.stdout),
    commandLine: formatCommand(AZD_PROGRAM, AZD_GET_VALUES),
    stderr: '',
    cliMissing: false,
  };
}

/**
 * Persist a value into the selected azd environment so later stages and later
 * runs observe it. Used by the post provision hook to publish derived endpoints.
 *
 * @param {string} key
 * @param {string} value
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ ok: boolean, commandLine: string, stderr: string }>}
 */
export async function setAzdEnvironmentValue(key, value, options = {}) {
  const args = [...AZD_SET_VALUE, key, value];
  const result = await runCommand(AZD_PROGRAM, args, { timeoutMs: options.timeoutMs });
  return {
    ok: succeeded(result),
    commandLine: formatCommand(AZD_PROGRAM, [...AZD_SET_VALUE, key, '<value>']),
    stderr: result.stderr,
  };
}

/**
 * Compare the process environment azd exported against what azd has stored.
 * Any key present in both with a different value is a mismatch, which the
 * environment validator treats as a refusal condition rather than a warning.
 *
 * @param {Record<string, string | undefined>} processEnvironment
 * @param {Record<string, string>} storedValues
 * @param {readonly string[]} keys
 * @returns {Array<{ key: string, processValue: string, storedValue: string }>}
 */
export function findEnvironmentMismatches(processEnvironment, storedValues, keys) {
  const mismatches = [];

  for (const key of keys) {
    const processValue = processEnvironment[key];
    const storedValue = storedValues[key];
    if (processValue === undefined || storedValue === undefined) {
      continue;
    }
    if (processValue.trim() !== storedValue.trim()) {
      mismatches.push({ key, processValue: processValue.trim(), storedValue: storedValue.trim() });
    }
  }

  return mismatches;
}

export { AZD_PROGRAM };
