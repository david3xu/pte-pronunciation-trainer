/**
 * Vercel compatibility adapter.
 *
 * Vercel remains the tested rollback target until Azure verification and rollback
 * approval, so its entry points stay in place. They no longer contain handler
 * logic: each one wraps the shared core through this adapter.
 *
 * This file is the only place in the api tree that mentions the Vercel runtime
 * types. Handler cores under api/handlers stay platform neutral.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
  CONTENT_TYPE,
  HEADER,
  normaliseError,
  type ApiHandler,
  type ApiRequest,
} from './contracts.js';

/**
 * Collapse Vercel's repeatable query and header values to the first entry.
 *
 * A handler core reads single values. Where a client sends a parameter twice, the
 * first is used, which matches the previous behaviour rather than changing it
 * during a host migration.
 */
function firstValues(
  source: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }
    const single = Array.isArray(value) ? value[0] : value;
    if (single !== undefined) {
      result[key.toLowerCase()] = single;
    }
  }
  return result;
}

/**
 * Query values keep their original casing; only header names are lowercased.
 */
function queryValues(
  source: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }
    const single = Array.isArray(value) ? value[0] : value;
    if (single !== undefined) {
      result[key] = single;
    }
  }
  return result;
}

/**
 * Build a platform neutral request from a Vercel request.
 */
export function toApiRequest(request: VercelRequest, correlationId: string): ApiRequest {
  const rawUrl = request.url ?? '/';
  const pathOnly = rawUrl.split('?')[0] ?? '/';

  return {
    method: (request.method ?? '').toUpperCase(),
    path: pathOnly,
    query: queryValues(request.query ?? {}),
    headers: firstValues(request.headers ?? {}),
    body: request.body,
    correlationId,
  };
}

/**
 * Wrap a handler core as a Vercel function.
 */
export function toVercelHandler(handler: ApiHandler) {
  return async function vercelEntryPoint(
    request: VercelRequest,
    response: VercelResponse,
  ): Promise<void> {
    const incoming = request.headers[HEADER.correlationId];
    const correlationId =
      typeof incoming === 'string' && incoming !== '' ? incoming : crypto.randomUUID();

    try {
      const result = await handler(toApiRequest(request, correlationId));

      for (const [name, value] of Object.entries(result.headers ?? {})) {
        response.setHeader(name, value);
      }
      response.setHeader(HEADER.correlationId, correlationId);

      if (result.raw !== undefined) {
        response.status(result.status).send(result.raw);
        return;
      }

      response.setHeader(HEADER.contentType, CONTENT_TYPE.json);
      response.status(result.status).json(result.body ?? null);
    } catch (error) {
      const failure = normaliseError(error, correlationId);
      response.setHeader(HEADER.contentType, CONTENT_TYPE.json);
      response.setHeader(HEADER.correlationId, correlationId);
      response.status(failure.status).json(failure.body ?? null);
    }
  };
}
