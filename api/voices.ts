/**
 * Voice List API Route (Vercel Serverless Function)
 *
 * Returns available premium voices for AWS Polly TTS.
 *
 * Endpoint: /api/voices
 * Method: GET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PREMIUM_VOICES } from './config';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    return res.status(200).json({
      success: true,
      data: PREMIUM_VOICES,
    });
  } catch (error: any) {
    console.error('Voice list error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch voice list',
    });
  }
}
