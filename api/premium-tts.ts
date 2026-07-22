/**
 * Premium TTS API Route (Vercel Serverless Function)
 *
 * Provides high-quality text-to-speech using Azure AI Speech.
 *
 * Endpoint: /api/premium-tts
 * Method: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PREMIUM_VOICES } from './config.js';
import { synthesizeSpeech } from './azureSpeech.js';

interface RequestBody {
  text: string;
  voiceId?: string;
  languageCode?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const {
      text,
      voiceId,
      languageCode,
    }: RequestBody = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    if (text.length > 3000) {
      return res.status(400).json({
        success: false,
        error: 'Text too long (max 3000 characters)',
      });
    }

    const result = await synthesizeSpeech({ text, voiceId, languageCode });

    return res.status(200).json({
      success: true,
      data: {
        audioBase64: result.audioBuffer.toString('base64'),
        contentType: result.contentType,
        voiceId: result.voiceId,
        engine: 'neural',
        languageCode: result.languageCode,
        requestCharacters: text.length,
      },
    });
  } catch (error) {
    console.error('Premium TTS error:', error);

    return res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to synthesize speech',
      fallback: true,
    });
  }
}

/**
 * Get list of available premium voices (helper endpoint)
 */
export async function getAvailableVoices(
  _req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    success: true,
    data: PREMIUM_VOICES,
  });
}
