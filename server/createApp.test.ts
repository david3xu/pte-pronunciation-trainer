// @vitest-environment node

/**
 * Production server tests.
 *
 * The node environment is required. Under the default browser environment the
 * happy-dom fetch implementation applies the same origin policy and blocks every
 * request to the test listener, which fails the suite for a reason that has
 * nothing to do with the server.
 *
 * These run against a real node:http listener rather than a mocked request and
 * response pair, because the behaviours that break a deployment are transport
 * level: header casing, content length, cache directives and whether a missing
 * asset returns HTML.
 */

import { createServer, type Server } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PREMIUM_VOICES } from '../api/config.js';
import { HEADER, HTTP_STATUS } from '../api/handlers/contracts.js';
import { VOICES_CACHE_CONTROL } from '../api/handlers/voices.js';
import { createApp, HEALTH_STATUS_OK, MAX_REQUEST_BODY_BYTES, parseRequestTarget } from './createApp.js';
import { CACHE_CONTROL, INDEX_DOCUMENT, isFingerprinted } from './staticFiles.js';
import { loadServerConfig } from './serverConfig.js';
import {
  API_ROUTES,
  DECLARED_CLIENT_ENDPOINTS,
  HEALTH_PATH,
  UNREGISTERED_ENDPOINTS,
} from './routes.js';

const INDEX_MARKUP = '<!doctype html><title>trainer</title>';
const ASSET_BODY = 'console.log(0);';
const ASSET_PATH = '/assets/app-abcd1234.js';
const STABLE_ASSET_PATH = '/assets/legacy.js';
const SERVICE_WORKER_PATH = '/sw.js';
const MANIFEST_PATH = '/manifest.webmanifest';
const GENERATED_PATH = '/data/processed/sample.json';
const GENERATED_BODY = '{"vocabulary":[]}';

let server: Server;
let origin: string;
let workspace: string;

async function get(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${origin}${path}`, init);
}

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'trainer-server-'));
  const distDirectory = join(workspace, 'dist');
  const processedDataDirectory = join(workspace, 'processed');

  await mkdir(join(distDirectory, 'assets'), { recursive: true });
  await mkdir(processedDataDirectory, { recursive: true });
  await writeFile(join(distDirectory, INDEX_DOCUMENT), INDEX_MARKUP, 'utf8');
  await writeFile(join(distDirectory, 'assets', 'app-abcd1234.js'), ASSET_BODY, 'utf8');
  await writeFile(join(distDirectory, 'assets', 'legacy.js'), ASSET_BODY, 'utf8');
  await writeFile(join(distDirectory, 'sw.js'), ASSET_BODY, 'utf8');
  await writeFile(join(distDirectory, 'manifest.webmanifest'), '{}', 'utf8');
  await writeFile(join(processedDataDirectory, 'sample.json'), GENERATED_BODY, 'utf8');

  server = createServer(
    createApp(
      { port: 0, isProduction: true, distDirectory, processedDataDirectory },
      () => undefined,
    ),
  );

  await new Promise<void>((settle) => server.listen(0, '127.0.0.1', () => settle()));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('server did not report a numeric address');
  }
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((settle) => server.close(() => settle()));
  await rm(workspace, { recursive: true, force: true });
});

describe('health endpoint', () => {
  it('reports ok and is never cached', async () => {
    const response = await get(HEALTH_PATH);

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get(HEADER.cacheControl)).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ status: HEALTH_STATUS_OK });
  });

  it('answers a bodyless probe without a body', async () => {
    const response = await get(HEALTH_PATH, { method: 'HEAD' });

    expect(response.status).toBe(HTTP_STATUS.ok);
    await expect(response.text()).resolves.toBe('');
  });
});

describe('static assets and spa fallback', () => {
  it('serves the entry document at the root without caching it', async () => {
    const response = await get('/');

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get(HEADER.cacheControl)).toBe(CACHE_CONTROL.entryDocument);
    await expect(response.text()).resolves.toBe(INDEX_MARKUP);
  });

  it('serves a content hashed asset as immutable', async () => {
    const response = await get(ASSET_PATH);

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get(HEADER.cacheControl)).toBe(CACHE_CONTROL.immutableAsset);
    await expect(response.text()).resolves.toBe(ASSET_BODY);
  });

  it('revalidates the service worker rather than caching it immutably', async () => {
    const response = await get(SERVICE_WORKER_PATH);

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get(HEADER.cacheControl)).toBe(CACHE_CONTROL.revalidate);
    expect(response.headers.get(HEADER.cacheControl)).not.toContain('immutable');
  });

  it('revalidates the web manifest', async () => {
    const response = await get(MANIFEST_PATH);

    expect(response.headers.get(HEADER.cacheControl)).toBe(CACHE_CONTROL.revalidate);
  });

  it('revalidates an asset served under a stable name', async () => {
    const response = await get(STABLE_ASSET_PATH);

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get(HEADER.cacheControl)).toBe(CACHE_CONTROL.revalidate);
  });

  it('falls back to the entry document for a client route deep link', async () => {
    const response = await get('/practice/repeat-sentence');

    expect(response.status).toBe(HTTP_STATUS.ok);
    await expect(response.text()).resolves.toBe(INDEX_MARKUP);
  });

  it('returns not found for a missing asset rather than the entry document', async () => {
    const response = await get('/assets/missing-deadbeef.js');

    expect(response.status).toBe(HTTP_STATUS.notFound);
    await expect(response.text()).resolves.not.toBe(INDEX_MARKUP);
  });

  it('serves generated practice content', async () => {
    const response = await get(GENERATED_PATH);

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get(HEADER.cacheControl)).toBe(CACHE_CONTROL.generatedContent);
    await expect(response.text()).resolves.toBe(GENERATED_BODY);
  });

  it('refuses a traversal attempt that escapes the served root', async () => {
    const response = await get('/data/processed/..%2f..%2f..%2fpackage.json');

    expect(response.status).toBe(HTTP_STATUS.notFound);
  });
});

describe('voices route', () => {
  it('returns the existing success envelope shape', async () => {
    const response = await get('/api/voices');

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(response.headers.get(HEADER.cacheControl)).toBe(VOICES_CACHE_CONTROL);
    await expect(response.json()).resolves.toEqual({ success: true, data: PREMIUM_VOICES });
  });

  it('rejects a disallowed method and advertises what it accepts', async () => {
    const response = await get('/api/voices', { method: 'POST', body: '{}' });

    expect(response.status).toBe(HTTP_STATUS.methodNotAllowed);
    expect(response.headers.get(HEADER.allow)).toBe('GET');
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Method not allowed',
    });
  });

  it('echoes a supplied correlation identifier', async () => {
    const supplied = 'test-correlation-value';
    const response = await get('/api/voices', {
      headers: { [HEADER.correlationId]: supplied },
    });

    expect(response.headers.get(HEADER.correlationId)).toBe(supplied);
  });

  it('issues a correlation identifier when none is supplied', async () => {
    const response = await get('/api/voices');

    expect(response.headers.get(HEADER.correlationId)).toMatch(/[0-9a-f-]{36}/);
  });
});

describe('api routing', () => {
  it('returns json not found for an unregistered api path', async () => {
    const response = await get('/api/does-not-exist');

    expect(response.status).toBe(HTTP_STATUS.notFound);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'Not found' });
  });

  it('rejects a body above the accepted size without buffering it', async () => {
    const response = await get('/api/voices', {
      method: 'POST',
      body: 'x'.repeat(MAX_REQUEST_BODY_BYTES + 1),
    });

    expect(response.status).toBe(HTTP_STATUS.payloadTooLarge);
  });
});

describe('client endpoint coverage', () => {
  it('accounts for every endpoint declared in AppConfig', () => {
    const unaccounted = DECLARED_CLIENT_ENDPOINTS.filter(
      (endpoint) =>
        !Object.prototype.hasOwnProperty.call(API_ROUTES, endpoint) &&
        !Object.prototype.hasOwnProperty.call(UNREGISTERED_ENDPOINTS, endpoint),
    );

    expect(unaccounted).toEqual([]);
  });

  it('no longer declares the tutor endpoint in either inventory', () => {
    // Removed as dead configuration: no handler existed in any host and no call
    // site read it. Asserted here so it cannot be reintroduced without a decision.
    expect(UNREGISTERED_ENDPOINTS['/api/ai-tutor']).toBeUndefined();
    expect(API_ROUTES['/api/ai-tutor']).toBeUndefined();
    expect(DECLARED_CLIENT_ENDPOINTS).not.toContain('/api/ai-tutor');
  });
});

describe('malformed request targets', () => {
  it('parses a valid target and refuses an unparseable one without throwing', () => {
    expect(parseRequestTarget('/api/voices?a=1')?.pathname).toBe('/api/voices');
    expect(parseRequestTarget(undefined)?.pathname).toBe('/');
    expect(parseRequestTarget('http://[')).toBeUndefined();
  });

  it('answers a malformed target with bad request and no rejection', async () => {
    const rejections: unknown[] = [];
    const capture = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', capture);

    const listener = createApp(
      { port: 0, isProduction: true, distDirectory: workspace, processedDataDirectory: workspace },
      () => undefined,
    );

    const state = { status: 0, body: '', headersSent: false };
    const response = {
      get headersSent() {
        return state.headersSent;
      },
      writeHead(status: number) {
        state.status = status;
        state.headersSent = true;
      },
      end(payload?: Buffer) {
        state.body = payload === undefined ? '' : payload.toString('utf8');
      },
    };

    await expect(
      listener(
        { method: 'GET', url: 'http://[', headers: {} } as never,
        response as never,
      ),
    ).resolves.toBeUndefined();

    await new Promise((settle) => setImmediate(settle));
    process.off('unhandledRejection', capture);

    expect(state.status).toBe(HTTP_STATUS.badRequest);
    expect(JSON.parse(state.body)).toEqual({
      success: false,
      error: 'Malformed request target',
    });
    expect(rejections).toEqual([]);
  });
});

describe('asset root resolution', () => {
  it('uses the deployed layout when the package contains the assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'trainer-deployed-'));
    await mkdir(join(root, 'dist'), { recursive: true });

    const config = loadServerConfig({}, root);

    expect(config.distDirectory).toBe(join(root, 'dist'));
    await rm(root, { recursive: true, force: true });
  });

  it('falls back to the parent when the compiled output is run in place', async () => {
    const repo = await mkdtemp(join(tmpdir(), 'trainer-local-'));
    await mkdir(join(repo, 'dist'), { recursive: true });
    await mkdir(join(repo, 'data', 'processed'), { recursive: true });
    const compiledRoot = join(repo, 'dist-server');
    await mkdir(compiledRoot, { recursive: true });

    const config = loadServerConfig({}, compiledRoot);

    expect(config.distDirectory).toBe(join(repo, 'dist'));
    expect(config.processedDataDirectory).toBe(join(repo, 'data', 'processed'));
    await rm(repo, { recursive: true, force: true });
  });

  it('lets an explicit override win over both layouts', () => {
    const config = loadServerConfig({ DIST_DIRECTORY: '/explicit/assets' }, workspace);

    expect(config.distDirectory).toBe('/explicit/assets');
  });
});

describe('fingerprint detection', () => {
  it('treats a hashed filename as fingerprinted', () => {
    expect(isFingerprinted('app-abcd1234.js')).toBe(true);
    expect(isFingerprinted('index-C0ffee99.css')).toBe(true);
  });

  it('does not treat a stable or short suffixed name as fingerprinted', () => {
    expect(isFingerprinted('sw.js')).toBe(false);
    expect(isFingerprinted('legacy.js')).toBe(false);
    expect(isFingerprinted('my-app.js')).toBe(false);
    expect(isFingerprinted('vendor-v2.js')).toBe(false);
  });
});

describe('server secret exposure', () => {
  it('does not expose server configuration through any response', async () => {
    const response = await get(HEALTH_PATH);
    const body = await response.text();

    expect(body).not.toContain(workspace);
    expect(body).not.toMatch(/POSTGRES|REDIS|SPEECH|CONNECTION_STRING/i);
  });
});
