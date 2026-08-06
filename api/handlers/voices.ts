/**
 * Voice list handler core.
 *
 * The vertical slice route. It has no external dependency, which is why the
 * workload plan nominates it to prove packaging, startup, routing and gateway
 * proxying before the expensive routes move.
 *
 * Response shape is unchanged from the Vercel implementation: a success envelope
 * carrying the premium voice table. The only behavioural addition is an Allow
 * header on a method rejection, which the previous handler omitted.
 */

import { PREMIUM_VOICES } from '../config.js';
import { HTTP_METHOD, ok, withMethods, type ApiHandler } from './contracts.js';

/** Methods this route accepts. */
export const VOICES_ALLOWED_METHODS = [HTTP_METHOD.get] as const;

/**
 * The voice table is a compile time constant, so the response is cacheable. One
 * hour is short enough that adding a voice reaches clients the same day and long
 * enough that the gateway absorbs repeated calls during a practice session.
 */
export const VOICES_CACHE_CONTROL = 'public, max-age=3600';

const voicesCore: ApiHandler = () => ok(PREMIUM_VOICES, { 'cache-control': VOICES_CACHE_CONTROL });

export const voicesHandler: ApiHandler = withMethods(VOICES_ALLOWED_METHODS, voicesCore);
