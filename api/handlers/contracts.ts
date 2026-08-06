/**
 * Framework neutral HTTP contracts for the api handler cores.
 *
 * A handler core receives a plain request description and returns a plain
 * response description. It never touches a platform request or response object,
 * so the same implementation serves the node server on App Service and the Vercel
 * functions that remain the rollback path. Platform specifics live in adapters:
 * one in server/http for node, one per Vercel entry point.
 *
 * Nothing here imports from @vercel/node. That is the point.
 */

/** HTTP methods the handlers support. */
export const HTTP_METHOD = {
  get: 'GET',
  post: 'POST',
  options: 'OPTIONS',
  head: 'HEAD',
} as const;

export type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];

/** Status codes used by the handler cores and the adapters. */
export const HTTP_STATUS = {
  ok: 200,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  notFound: 404,
  methodNotAllowed: 405,
  payloadTooLarge: 413,
  tooManyRequests: 429,
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;

/** Header names the handlers and adapters set or read. */
export const HEADER = {
  contentType: 'content-type',
  contentLength: 'content-length',
  cacheControl: 'cache-control',
  allow: 'allow',
  correlationId: 'x-correlation-id',
} as const;

/** Content types produced by the handlers. */
export const CONTENT_TYPE = {
  json: 'application/json; charset=utf-8',
  text: 'text/plain; charset=utf-8',
} as const;

/**
 * A request as a handler core sees it.
 *
 * Header names are lowercased by the adapters so a core never has to guess at
 * casing. The body is already parsed; adapters own transport concerns including
 * size limits.
 */
export interface ApiRequest {
  readonly method: string;
  /** Path only, with no query string. */
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  /** Propagated to responses and telemetry so one request can be followed. */
  readonly correlationId: string;
}

/** A response as a handler core returns it. */
export interface ApiResponse {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  /** Serialised as JSON unless `raw` is set. */
  readonly body?: unknown;
  /** Pre encoded payload for binary responses such as generated audio. */
  readonly raw?: Buffer;
}

/** A handler core. */
export type ApiHandler = (request: ApiRequest) => Promise<ApiResponse> | ApiResponse;

/**
 * The response envelope the existing routes already return. Preserved exactly,
 * because the browser and the native client both read `success` and `data`, and
 * changing the shape during a host migration would turn one change into two.
 */
export interface SuccessEnvelope<TData> {
  readonly success: true;
  readonly data: TData;
}

export interface ErrorEnvelope {
  readonly success: false;
  readonly error: string;
}

/**
 * Build a success response in the existing envelope shape.
 */
export function ok<TData>(data: TData, headers?: Record<string, string>): ApiResponse {
  const response: ApiResponse = {
    status: HTTP_STATUS.ok,
    body: { success: true, data } satisfies SuccessEnvelope<TData>,
  };
  return headers === undefined ? response : { ...response, headers };
}

/**
 * Build an error response in the existing envelope shape.
 */
export function fail(status: number, error: string): ApiResponse {
  return {
    status,
    body: { success: false, error } satisfies ErrorEnvelope,
  };
}

/**
 * Reject a method the route does not implement, advertising what it does accept.
 * The Allow header is required by the method not allowed status and the previous
 * Vercel handlers omitted it.
 */
export function methodNotAllowed(allowed: readonly string[]): ApiResponse {
  return {
    status: HTTP_STATUS.methodNotAllowed,
    headers: { [HEADER.allow]: allowed.join(', ') },
    body: { success: false, error: 'Method not allowed' } satisfies ErrorEnvelope,
  };
}

/**
 * Restrict a handler to a set of methods.
 *
 * Wrapping rather than repeating the check in every core keeps the rejection
 * response identical across routes, which is what the compatibility tests assert.
 */
export function withMethods(allowed: readonly string[], handler: ApiHandler): ApiHandler {
  return async (request) =>
    allowed.includes(request.method) ? handler(request) : methodNotAllowed(allowed);
}

/**
 * Convert a thrown value into an error response without leaking internals.
 *
 * A thrown error message can carry a connection string, a file path or a key, so
 * the message is logged for the operator and the client receives a fixed string.
 * The correlation identifier is what ties the two together.
 */
export function normaliseError(
  error: unknown,
  correlationId: string,
  log: (message: string) => void = console.error,
): ApiResponse {
  const detail = error instanceof Error ? error.message : String(error);
  log(`request ${correlationId} failed: ${detail}`);
  return fail(HTTP_STATUS.internalServerError, 'Internal server error');
}
