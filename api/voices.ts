/**
 * Voice List API Route (Vercel Serverless Function)
 *
 * Returns available premium voices for AWS Polly TTS.
 *
 * Endpoint: /api/voices
 * Method: GET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Available premium voices (neural engine)
const PREMIUM_VOICES = {
  'en-US': {
    'Joanna': 'Female, American English (Neural)',
    'Matthew': 'Male, American English (Neural)',
    'Ruth': 'Female, American English (Neural)',
    'Stephen': 'Male, American English (Neural)',
  },
  'en-GB': {
    'Amy': 'Female, British English (Neural)',
    'Emma': 'Female, British English (Neural)',
    'Brian': 'Male, British English (Neural)',
    'Arthur': 'Male, British English (Neural)',
  },
  'en-AU': {
    'Olivia': 'Female, Australian English (Neural)',
  },
};

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
