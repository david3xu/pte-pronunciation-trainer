/**
 * Request handling for the production server.
 *
 * Built on node:http rather than a web framework. The routing need is a health
 * endpoint, an exact match api table and static serving with SPA fallback, which
 * is small enough that a dependency would add supply chain surface without
 * removing meaningful work.
 *
 * Order is deliberate: health first so a probe never depends on anything else,
 * then the api prefix, then static. An api path that has no route returns not
 * found from the api branch rather than falling through to the SPA document,
 * because answering a missing endpoint with HTML makes a client report a parse
 * error instead of a missing route.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  CONTENT_TYPE,
  HEADER,
  HTTP_METHOD,
  HTTP_STATUS,
  normaliseError,
  type ApiRequest,
  type ApiResponse,
} from '../api/handlers/contracts.js';
import { API_PREFIX, HEALTH_PATH, resolveApiRoute } from './routes.js';
import { resolveStaticRequest, sendFile } from './staticFiles.js';
import type { ServerConfig } from './serverConfig.js';

/**
 * Largest request body accepted. Generous enough for a tutor conversation and
 * small enough that an unbounded upload cannot exhaust the instance. Enforced
 * while reading rather than after, so an oversized body is never buffered.
 */
export const MAX_REQUEST_BODY_BYTES = 1_048_576;

/** Value reported by the health endpoint when the server is serving. */
export const HEALTH_STATUS_OK = 'ok';

interface ReadBodyResult {
  readonly tooLarge: boolean;
  readonly value: unknown;
}

/**
 * Read and parse a JSON request body.
 *
 * A malformed body resolves to undefined rather than throwing, so a handler can
 * return its own validation error instead of every bad payload becoming a 500.
 */
export async function readJsonBody(request: IncomingMessage): Promise<ReadBodyResult> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.byteLength;
    if (total > MAX_REQUEST_BODY_BYTES) {
      return { tooLarge: true, value: undefined };
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return { tooLarge: false, value: undefined };
  }

  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return { tooLarge: false, value: JSON.parse(text) };
  } catch {
    return { tooLarge: false, value: undefined };
  }
}

/** Lowercase the incoming header names a handler core reads. */
function normaliseHeaders(request: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }
    headers[name.toLowerCase()] = Array.isArray(value) ? (value[0] ?? '') : value;
  }
  return headers;
}

/**
 * Write a handler response to the node response.
 */
function writeApiResponse(
  response: ServerResponse,
  result: ApiResponse,
  correlationId: string,
  bodyless: boolean,
): void {
  const headers: Record<string, string> = {
    ...(result.headers ?? {}),
    [HEADER.correlationId]: correlationId,
  };

  if (result.raw !== undefined) {
    headers[HEADER.contentLength] = String(result.raw.byteLength);
    response.writeHead(result.status, headers);
    response.end(bodyless ? undefined : result.raw);
    return;
  }

  const payload = Buffer.from(JSON.stringify(result.body ?? null), 'utf8');
  headers[HEADER.contentType] = CONTENT_TYPE.json;
  headers[HEADER.contentLength] = String(payload.byteLength);
  response.writeHead(result.status, headers);
  response.end(bodyless ? undefined : payload);
}

/**
 * Parse a request target, returning undefined rather than throwing.
 *
 * The origin is a placeholder: only the path and query are used. Node accepts some
 * targets the URL parser rejects, so this cannot be assumed to succeed.
 */
export function parseRequestTarget(requestUrl: string | undefined): URL | undefined {
  try {
    return new URL(requestUrl ?? '/', 'http://localhost');
  } catch {
    return undefined;
  }
}

/**
 * Build the request listener.
 */
export function createApp(
  config: ServerConfig,
  log: (message: string) => void = console.error,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async function requestListener(request, response) {
    const incoming = request.headers[HEADER.correlationId];
    const correlationId =
      typeof incoming === 'string' && incoming !== '' ? incoming : crypto.randomUUID();
    const method = (request.method ?? '').toUpperCase();
    const bodyless = method === HTTP_METHOD.head;

    // Parsed before the try block is entered, and never allowed to throw. A
    // malformed request target used to throw synchronously here, which rejected the
    // promise this listener returns, reached the unhandled rejection handler and
    // took the process down. One bad URL should be a 400, not an outage.
    const target = parseRequestTarget(request.url);

    if (target === undefined) {
      writeApiResponse(
        response,
        {
          status: HTTP_STATUS.badRequest,
          body: { success: false, error: 'Malformed request target' },
        },
        correlationId,
        bodyless,
      );
      return;
    }

    const url = target;
    const path = url.pathname;

    try {
      if (path === HEALTH_PATH) {
        writeApiResponse(
          response,
          {
            status: HTTP_STATUS.ok,
            headers: { [HEADER.cacheControl]: 'no-store' },
            // The stage is part of the health contract so a probe, a dashboard or a
            // person reading the endpoint can tell a parallel staging deployment
            // from production without consulting a document.
            body: { status: HEALTH_STATUS_OK, stage: config.deploymentStage },
          },
          correlationId,
          bodyless,
        );
        return;
      }

      if (path === API_PREFIX || path.startsWith(`${API_PREFIX}/`)) {
        const handler = resolveApiRoute(path);

        if (handler === undefined) {
          writeApiResponse(
            response,
            { status: HTTP_STATUS.notFound, body: { success: false, error: 'Not found' } },
            correlationId,
            bodyless,
          );
          return;
        }

        const body = await readJsonBody(request);
        if (body.tooLarge) {
          writeApiResponse(
            response,
            {
              status: HTTP_STATUS.payloadTooLarge,
              body: { success: false, error: 'Request body too large' },
            },
            correlationId,
            bodyless,
          );
          return;
        }

        const apiRequest: ApiRequest = {
          method,
          path,
          query: Object.fromEntries(url.searchParams.entries()),
          headers: normaliseHeaders(request),
          body: body.value,
          correlationId,
        };

        writeApiResponse(response, await handler(apiRequest), correlationId, bodyless);
        return;
      }

      const resolved = await resolveStaticRequest(path, config);

      if (resolved === undefined) {
        writeApiResponse(
          response,
          { status: HTTP_STATUS.notFound, body: { success: false, error: 'Not found' } },
          correlationId,
          bodyless,
        );
        return;
      }

      await sendFile(response, resolved.filePath, {
        isGeneratedContent: resolved.isGeneratedContent,
        bodyless,
      });
    } catch (error) {
      const failure = normaliseError(error, correlationId, log);
      if (!response.headersSent) {
        writeApiResponse(response, failure, correlationId, bodyless);
        return;
      }
      // Headers were already sent, so the status cannot be corrected. Ending the
      // response is the only honest option; the correlation identifier is in the
      // log line the error handler already wrote.
      response.end();
    }
  };
}
