/**
 * Cross platform child process execution for the Azure deployment hooks.
 *
 * Commands never run through a shell, so operator supplied values such as a
 * publisher name or an origin list cannot be interpreted as shell syntax. The
 * hooks are expected to run on macOS, Linux and Windows, so nothing here relies
 * on POSIX only behaviour.
 */

import { spawn } from 'node:child_process';

/** Default wall clock allowance for a single external command. */
export const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;

/** Exit code reported when a command was terminated by the timeout. */
export const TIMED_OUT_EXIT_CODE = null;

/**
 * @typedef {object} CommandResult
 * @property {string} program
 * @property {string[]} args
 * @property {number | null} exitCode
 * @property {string} stdout
 * @property {string} stderr
 * @property {boolean} timedOut
 * @property {boolean} launchFailed True when the executable itself is absent.
 * @property {number} durationMs
 */

/**
 * Run a command and resolve with its result rather than throwing on a non zero
 * exit. Callers decide whether a failure is fatal, because several capacity
 * probes treat an unsupported command as inconclusive rather than as an error.
 *
 * @param {string} program
 * @param {string[]} args
 * @param {{ timeoutMs?: number, cwd?: string, env?: Record<string, string | undefined> }} [options]
 * @returns {Promise<CommandResult>}
 */
export function runCommand(program, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const startedAt = Date.now();

  return new Promise((resolvePromise) => {
    const child = spawn(program, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    /** @type {string[]} */
    const stdoutChunks = [];
    /** @type {string[]} */
    const stderrChunks = [];
    let timedOut = false;
    let launchFailed = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

    child.on('error', (error) => {
      launchFailed = true;
      stderrChunks.push(error.message);
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolvePromise({
        program,
        args,
        exitCode: timedOut ? TIMED_OUT_EXIT_CODE : exitCode,
        stdout: stdoutChunks.join('').trim(),
        stderr: stderrChunks.join('').trim(),
        timedOut,
        launchFailed,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

/**
 * Render a command for human readable output. Used in evidence blocks so the
 * operator can reproduce a probe by hand.
 *
 * @param {string} program
 * @param {string[]} args
 * @returns {string}
 */
export function formatCommand(program, args) {
  const quoted = args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg));
  return [program, ...quoted].join(' ');
}

/**
 * True when the command completed with a zero exit code.
 *
 * @param {CommandResult} result
 * @returns {boolean}
 */
export function succeeded(result) {
  return result.exitCode === 0 && !result.timedOut && !result.launchFailed;
}
