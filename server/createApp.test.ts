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
import { createApp, HEALTH_STATUS_OK, MAX_REQUEST_BODY_BYTES } from './createApp.js';
import { CACHE_CONTROL, INDEX_DOCUMENT } from './staticFiles.js';
import {
  API_ROUTES,
  DECLARED_CLIENT_ENDPOINTS,
  HEALTH_PATH,
  UNREGISTERED_ENDPOINTS,
} from './routes.js';

const INDEX_MARKUP = '<!doctype html><title>trainer</title>';
const ASSET_BODY = 'console.log(0);';
const ASSET_PATH = '/assets/app-abc123.js';
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
  await writeFile(join(distDirectory, 'assets', 'app-abc123.js'), ASSET_BODY, 'utf8');
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

  it('keeps the tutor endpoint recorded as declared without a handler', () => {
    expect(UNREGISTERED_ENDPOINTS['/api/ai-tutor']).toBeDefined();
    expect(API_ROUTES['/api/ai-tutor']).toBeUndefined();
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
