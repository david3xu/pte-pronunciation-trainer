/**
 * Tests for the monitor script embedded in monitor-vm.bicep.
 *
 * The script runs on a machine that exists partly so it can be debugged after the
 * fact, which is a poor substitute for checking it before it ships. Nothing else
 * executed this content, so a syntax error or a malformed telemetry payload would
 * have been found by reading journalctl over a Bastion session.
 *
 * The script is read out of the Bicep source rather than a copy, so these tests
 * cannot pass against a stale duplicate. It lives in a triple quoted Bicep string,
 * which performs no interpolation and no escape processing, so the bytes between the
 * delimiters are exactly the bytes that reach the machine.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { REPO_PATHS } from './lib/paths.js';

const MONITOR_VM_MODULE = join(REPO_PATHS.infraDirectory, 'monitor-vm.bicep');

/** Paths the monitor is required to poll. */
const EXPECTED_CHECK_PATHS = Object.freeze(['/health', '/api/voices', '/api/premium-tts']);

/** Environment the systemd unit supplies. */
const SCRIPT_ENVIRONMENT = Object.freeze({
  MONITOR_TARGET_URL: 'https://example-endpoint.z01.azurefd.net',
  MONITOR_CONNECTION_STRING:
    'InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://australiaeast-1.in.applicationinsights.azure.com/;LiveEndpoint=https://australiaeast.livediagnostics.monitor.azure.com/;ApplicationId=11111111-1111-1111-1111-111111111111',
  MONITOR_INTERVAL_SECONDS: '300',
});

const BASH = 'bash';
const SCRIPT_FILE_NAME = 'check.sh';

/**
 * Pull the script out of the `monitorScript` triple quoted Bicep string.
 *
 * @param {string} bicepSource
 * @returns {string}
 */
function extractMonitorScript(bicepSource) {
  const match = bicepSource.match(/var monitorScript = '''([\s\S]*?)'''/);
  if (match?.[1] === undefined) {
    throw new Error('monitorScript was not found in monitor-vm.bicep, so these tests are checking nothing');
  }
  return match[1];
}

/** @type {string} */
let script;
/** @type {string} */
let scriptPath;

beforeAll(async () => {
  script = extractMonitorScript(await readFile(MONITOR_VM_MODULE, 'utf8'));
  scriptPath = join(mkdtempSync(join(tmpdir(), 'monitor-script-')), SCRIPT_FILE_NAME);
  writeFileSync(scriptPath, script, 'utf8');
});

describe('monitor script syntax', () => {
  it('is valid bash', () => {
    // The check nobody had run. A syntax error here produces a unit that fails on
    // every restart, reporting nothing, while the deployment reports success.
    expect(() => execFileSync(BASH, ['-n', scriptPath], { encoding: 'utf8' })).not.toThrow();
  });

  it('declares the interpreter it is written for', () => {
    // cloud-init writes this to a file and systemd execs it directly, so the shebang
    // is what selects the interpreter. The script uses `local`, which is not POSIX.
    expect(script.startsWith('#!/bin/bash')).toBe(true);
  });

  it('fails on an unset variable and on a failed pipe stage', () => {
    expect(script).toMatch(/^set -euo pipefail$/m);
  });
});

describe('monitor script checks', () => {
  it('polls each expected path exactly once per cycle', () => {
    for (const path of EXPECTED_CHECK_PATHS) {
      const occurrences = script.split(`"${path}"`).length - 1;
      expect(occurrences, `expected one check for ${path}`).toBe(1);
    }
  });

  it('polls no path beyond the expected three', () => {
    const invoked = [...script.matchAll(/^\s*check_one\s+"[^"]+"\s+"([^"]+)"/gm)].map((match) => match[1]);

    expect(invoked).toEqual([...EXPECTED_CHECK_PATHS]);
  });

  it('sends a body only on the post check, since the handler requires text', () => {
    const invocations = [...script.matchAll(/^\s*check_one\s+"[^"]+"\s+"([^"]+)"\s+"(GET|POST)"(.*)$/gm)];

    for (const [, path, method, remainder] of invocations) {
      if (method === 'POST') {
        expect(remainder.trim(), `${String(path)} posts with no body`).not.toBe('');
        expect(remainder).toContain('text');
      } else {
        expect(remainder.trim(), `${String(path)} is a get carrying a body`).toBe('');
      }
    }
  });
});

/**
 * Run a harness that reuses the script's own definitions.
 *
 * Everything above the `check_one` definition is setup: the environment reads, the
 * connection string parser and the endpoint derivation. Taking that prefix verbatim
 * and appending an assertion exercises the real code rather than a restatement of
 * it, so a change to the parsing is caught here instead of at boot.
 *
 * @param {string} trailer Shell appended after the script's setup section.
 * @param {Record<string, string>} [environment]
 * @returns {{ stdout: string, status: number }}
 */
function runScriptSetup(trailer, environment = SCRIPT_ENVIRONMENT) {
  const [setup] = script.split('check_one() {');
  const harnessPath = join(mkdtempSync(join(tmpdir(), 'monitor-harness-')), SCRIPT_FILE_NAME);
  writeFileSync(harnessPath, `${String(setup)}\n${trailer}\n`, 'utf8');

  try {
    const stdout = execFileSync(BASH, [harnessPath], {
      encoding: 'utf8',
      env: { ...process.env, ...environment },
    });
    return { stdout, status: 0 };
  } catch (error) {
    const failure = /** @type {{ stdout?: string, status?: number }} */ (error);
    return { stdout: failure.stdout ?? '', status: failure.status ?? 1 };
  }
}

describe('monitor script telemetry destination', () => {
  it('derives the ingestion endpoint from the connection string', () => {
    // The bug this replaces: only the first connection string segment was read, and
    // the destination was the global endpoint at dc.services.visualstudio.com, whose
    // support ended in March 2025. A regional endpoint is carried in the connection
    // string and was being discarded.
    const { stdout, status } = runScriptSetup('printf "%s" "$TRACK_URL"');

    expect(status).toBe(0);
    expect(stdout).toBe('https://australiaeast-1.in.applicationinsights.azure.com/v2/track');
  });

  it('hardcodes no ingestion host', () => {
    // Comments are stripped first. The comment above the guard names the retired
    // global endpoint deliberately, to explain why it is not used, and an assertion
    // that cannot tell documentation from code would forbid saying so.
    const executable = script
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .join('\n');

    expect(executable).not.toContain('dc.services.visualstudio.com');
    expect(executable).not.toMatch(/applicationinsights\.azure\.com/);

    // Positive half: the destination is the derived variable, not any literal.
    expect(executable).toContain('-X POST "$TRACK_URL"');
  });

  it('reads a field by name rather than by position', () => {
    // The key is not first here. Position based parsing returns the wrong value.
    const reordered = {
      ...SCRIPT_ENVIRONMENT,
      MONITOR_CONNECTION_STRING:
        'IngestionEndpoint=https://australiaeast-1.in.applicationinsights.azure.com/;InstrumentationKey=abc-123',
    };

    const { stdout, status } = runScriptSetup('printf "%s" "$IKEY"', reordered);

    expect(status).toBe(0);
    expect(stdout).toBe('abc-123');
  });

  it('refuses to start when the connection string carries no ingestion endpoint', () => {
    // Exiting is the point. Continuing would post to a guessed destination and report
    // a healthy monitor that lands no telemetry anywhere.
    const withoutEndpoint = {
      ...SCRIPT_ENVIRONMENT,
      MONITOR_CONNECTION_STRING: 'InstrumentationKey=00000000-0000-0000-0000-000000000000',
    };

    const { status } = runScriptSetup('printf "%s" "$TRACK_URL"', withoutEndpoint);

    expect(status).not.toBe(0);
  });
});

describe('monitor script telemetry payload', () => {
  it('builds valid json for the track endpoint', () => {
    // Built by the script's own quoting rather than reassembled here, because the
    // escaping is the part most likely to be wrong and least likely to be noticed.
    const payload = script.match(/-d "(\{\\"name\\":[^\n]*?)" \\/)?.[1];
    expect(payload, 'the track payload was not found in the script').toBeDefined();

    const { stdout, status } = runScriptSetup(
      [
        'now="2026-08-07T16:43:40.123Z"',
        'name="premium_tts"',
        'status="200"',
        'success="true"',
        'duration="412"',
        `printf '%s' "${String(payload)}"`,
      ].join('\n'),
    );

    expect(status).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  it('produces the envelope the track endpoint requires', () => {
    const payload = script.match(/-d "(\{\\"name\\":[^\n]*?)" \\/)?.[1];

    const { stdout } = runScriptSetup(
      [
        'now="2026-08-07T16:43:40.123Z"',
        'name="premium_tts"',
        'status="200"',
        'success="true"',
        'duration="412"',
        `printf '%s' "${String(payload)}"`,
      ].join('\n'),
    );

    const envelope = JSON.parse(stdout);

    expect(envelope.name).toBe('Microsoft.ApplicationInsights.Event');
    expect(envelope.time).toBe('2026-08-07T16:43:40.123Z');
    expect(envelope.iKey).toBe('00000000-0000-0000-0000-000000000000');
    expect(envelope.data.baseType).toBe('EventData');
    expect(envelope.data.baseData.ver).toBe(2);
    expect(envelope.data.baseData.properties).toEqual({
      check: 'premium_tts',
      status: '200',
      success: 'true',
      durationMs: '412',
    });
  });
});

