/**
 * API route table for the production server.
 *
 * Paths are declared once here and must stay identical to
 * `data.api.endpoints` in src/config/AppConfig.ts, which is what the client calls.
 * The registry is exported so a test can assert that every configured client
 * endpoint has a server route, rather than that agreement being assumed.
 *
 * Only the vertical slice route is registered so far. The remaining handlers are
 * listed as declared but unregistered rather than omitted, so the gap is visible
 * in code and in the coverage test instead of being discovered at runtime.
 */

import { voicesHandler } from '../api/handlers/voices.js';
import type { ApiHandler } from '../api/handlers/contracts.js';

/** Path prefix owned by the api router. */
export const API_PREFIX = '/api';

/** Health endpoint path. Also the App Service and Front Door probe target. */
export const HEALTH_PATH = '/health';

/**
 * Client endpoints declared in AppConfig. Kept as data so the coverage test can
 * compare declared against registered.
 */
export const DECLARED_CLIENT_ENDPOINTS = [
  '/api/ai-recommendations',
  '/api/ai/chat',
  '/api/ai-tutor',
  '/api/pronunciation-score',
  '/api/premium-tts',
  '/api/voices',
  '/api/audio/generate',
] as const;

/**
 * Endpoints declared by the client that intentionally have no server route yet,
 * each with the reason. An entry here is a recorded decision, not an oversight.
 *
 * `/api/ai-tutor` is the odd one: it is configured but no Vercel handler has ever
 * existed for it, so there is nothing to port. It is resolved with the tutor work
 * rather than by inventing a route, and the coverage test asserts it stays listed
 * here until then.
 */
export const UNREGISTERED_ENDPOINTS: Readonly<Record<string, string>> = {
  '/api/ai-recommendations': 'ported with the remaining handler migration',
  '/api/ai/chat': 'ported with the remaining handler migration',
  '/api/ai-tutor': 'declared in AppConfig with no handler in any host; resolved with the tutor work',
  '/api/pronunciation-score': 'ported with the remaining handler migration',
  '/api/premium-tts': 'ported with the remaining handler migration',
  '/api/audio/generate': 'ported with the remaining handler migration',
};

/** Registered routes, path to handler core. */
export const API_ROUTES: Readonly<Record<string, ApiHandler>> = {
  '/api/voices': voicesHandler,
};

/**
 * Look up a handler for an exact path.
 */
export function resolveApiRoute(path: string): ApiHandler | undefined {
  return Object.prototype.hasOwnProperty.call(API_ROUTES, path)
    ? API_ROUTES[path]
    : undefined;
}
