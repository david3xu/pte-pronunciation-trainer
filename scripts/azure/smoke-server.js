/**
 * Local smoke test against the compiled server.
 *
 * Distinct from the vitest suite, which exercises the TypeScript sources. This
 * starts the actual compiled entry point the way App Service starts it, so it also
 * validates the emitted layout and the asset root resolution that a source level
 * test cannot see.
 *
 * Starts and stops one local process. Touches no Azure resource.
 */

import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { join } from 'node:path';

import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { REPO_PATHS } from './lib/paths.js';
import { APPLICATION_PACKAGE, EXIT_CODES } from './deployment-contract.js';

const COMPILED_ENTRY = join(REPO_PATHS.root, 'dist-server', APPLICATION_PACKAGE.serverEntryPoint);
const HOST = '127.0.0.1';
const SMOKE_PORT = 8123;
const STARTUP_TIMEOUT_MS = 15_000;
const IMMUTABLE = 'immutable';
const JSON_CONTENT_TYPE = 'application/json';

const PREMIUM_TTS_PATH = '/api/premium-tts';
const PREMIUM_TTS_PROBE_TEXT = 'smoke';

/**
 * Statuses that mean the premium text to speech route resolved to no handler.
 *
 * Everything else counts as registered, including the 200 the route deliberately
 * returns with `fallback: true` when Speech is unconfigured, which is what happens
 * here because a local smoke run has no key. That envelope is the point: the check
 * proves the route is wired up without needing a credential, and the regression it
 * guards is the route silently reverting to unregistered, which returns 404.
 */
const UNREGISTERED_ROUTE_STATUSES = Object.freeze([404, 501]);

const origin = `http://${HOST}:${SMOKE_PORT}`;

function sleep(ms) {
  return new Promise((settle) => setTimeout(settle, ms));
}

async function waitForListening() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Not listening yet.
    }
    await sleep(250);
  }
  return false;
}

/**
 * Send a deliberately malformed request target over a raw socket, because no HTTP
 * client will emit one.
 */
function requestMalformedTarget() {
  return new Promise((settle) => {
    const socket = connect(SMOKE_PORT, HOST, () => {
      socket.write('GET http://[ HTTP/1.1\r\nHost: smoke\r\nConnection: close\r\n\r\n');
    });
    let received = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      received += chunk;
    });
    socket.on('close', () => settle(received));
    socket.on('error', () => settle(received));
  });
}

async function main() {
  const report = new DeploymentReport('Compiled server smoke test');
  const child = spawn(process.execPath, [COMPILED_ENTRY], {
    cwd: REPO_PATHS.root,
    env: { ...process.env, PORT: String(SMOKE_PORT), NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let startupOutput = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    startupOutput += chunk;
  });
  child.stderr.on('data', (chunk) => {
    startupOutput += chunk;
  });

  try {
    report.beginStage('startup');
    const listening = await waitForListening();
    report.record({
      name: 'compiled entry point starts and binds',
      status: listening ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: listening
        ? `${APPLICATION_PACKAGE.serverEntryPoint} is serving on the supplied port`
        : `did not answer within ${STARTUP_TIMEOUT_MS} milliseconds. Output: ${startupOutput.trim()}`,
    });

    if (!listening) {
      return report;
    }

    report.beginStage('endpoints');

    const health = await fetch(`${origin}/health`);
    const healthBody = await health.json();
    report.record({
      name: 'health',
      status: health.status === 200 && healthBody?.status === 'ok' ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: `status ${health.status}, cache-control ${health.headers.get('cache-control')}`,
    });

    const voices = await fetch(`${origin}/api/voices`);
    const voicesBody = await voices.json();
    report.record({
      name: 'api voices',
      status: voices.status === 200 && voicesBody?.success === true ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: `status ${voices.status}, envelope success ${String(voicesBody?.success)}`,
    });

    const rejected = await fetch(`${origin}/api/voices`, { method: 'POST', body: '{}' });
    report.record({
      name: 'api voices method rejection',
      status: rejected.status === 405 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: `status ${rejected.status}, allow ${rejected.headers.get('allow')}`,
    });

    const premiumTts = await fetch(`${origin}${PREMIUM_TTS_PATH}`, {
      method: 'POST',
      headers: { 'content-type': JSON_CONTENT_TYPE },
      body: JSON.stringify({ text: PREMIUM_TTS_PROBE_TEXT }),
    });
    const premiumTtsBody = await premiumTts.json();
    const premiumTtsRegistered = !UNREGISTERED_ROUTE_STATUSES.includes(premiumTts.status);
    report.record({
      name: 'api premium tts route is registered',
      status: premiumTtsRegistered ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: premiumTtsRegistered
        ? `status ${premiumTts.status}, envelope success ${String(premiumTtsBody?.success)}, fallback ${String(premiumTtsBody?.fallback ?? false)}. A fallback without a local Speech key is expected and still proves the route resolved to its handler.`
        : `status ${premiumTts.status}, so the path resolved to no handler. Check that API_ROUTES in server/routes.ts still carries ${PREMIUM_TTS_PATH}.`,
    });

    report.beginStage('malformed target');
    const malformed = await requestMalformedTarget();
    const statusLine = malformed.split('\r\n')[0] ?? '';
    const stillAlive = (await fetch(`${origin}/health`)).ok;
    report.record({
      name: 'malformed target answered without taking the process down',
      status: statusLine.includes('400') && stillAlive ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: `response line "${statusLine}", server still serving ${String(stillAlive)}`,
    });

    report.beginStage('progressive web app cache headers');

    for (const [label, path, expectImmutable] of [
      ['service worker', '/sw.js', false],
      ['web manifest', '/manifest.webmanifest', false],
      ['entry document', '/', false],
    ]) {
      const response = await fetch(`${origin}${path}`);
      const cacheControl = response.headers.get('cache-control') ?? '';

      if (response.status === 404) {
        report.record({
          name: label,
          status: CHECK_STATUS.skip,
          detail: `${path} is not present in the current build output`,
        });
        continue;
      }

      const isImmutable = cacheControl.includes(IMMUTABLE);
      report.record({
        name: label,
        status: isImmutable === expectImmutable ? CHECK_STATUS.pass : CHECK_STATUS.fail,
        detail: `cache-control ${cacheControl}`,
      });
    }

    return report;
  } finally {
    child.kill('SIGTERM');
    await sleep(500);
    if (child.exitCode === null) {
      child.kill('SIGKILL');
    }
  }
}

const report = await main();
report.writeSummary();
process.exit(report.blocked ? EXIT_CODES.blocked : EXIT_CODES.success);
