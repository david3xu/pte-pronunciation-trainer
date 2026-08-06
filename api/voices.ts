/**
 * Voice List API Route, Vercel entry point.
 *
 * Endpoint: /api/voices
 * Method: GET
 *
 * The implementation lives in api/handlers/voices.ts and is shared with the App
 * Service production server. This file is only the platform binding, so the two
 * hosts cannot drift apart while Vercel remains the rollback target.
 */

import { voicesHandler } from './handlers/voices.js';
import { toVercelHandler } from './handlers/vercelAdapter.js';

export default toVercelHandler(voicesHandler);
