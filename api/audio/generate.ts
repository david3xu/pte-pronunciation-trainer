/**
 * Vercel Serverless Function: Audio Generation with Azure AI Speech
 *
 * This endpoint generates high-quality audio using Azure neural voices.
 * It handles SSML formatting, audio generation, and optional caching in Supabase Storage.
 *
 * POST /api/audio/generate
 *
 * Request body:
 * {
 *   text: string;           // Text to synthesize
 *   voiceId?: string;       // Voice ID (default: configured Azure voice)
 *   speed?: string;         // Speed (default: '100%')
 *   pitch?: string;         // Pitch (default: 'medium')
 *   emphasis?: string;      // Emphasis level (default: 'moderate')
 *   useCache?: boolean;     // Check cache before generating (default: true)
 * }
 *
 * Response:
 * - Success: Returns audio/mpeg stream
 * - Error: Returns JSON with error message
 *
 * Environment variables required:
 * - AZURE_SPEECH_KEY
 * - AZURE_SPEECH_REGION
 * - SUPABASE_URL (for caching)
 * - SUPABASE_SERVICE_ROLE_KEY (for caching)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { synthesizeSpeech } from '../azureSpeech';
import { resolveAzureVoiceName } from '../config';

// ============================================
// Types
// ============================================

interface AudioRequest {
  text: string;
  voiceId?: string;
  speed?: string;
  pitch?: string;
  emphasis?: 'strong' | 'moderate' | 'reduced' | 'none';
  useCache?: boolean;
}

// ============================================
// Helpers
// ============================================

/**
 * Generate cache key for audio
 */
function getCacheKey(text: string, voiceId: string, speed: string): string {
  // Normalize text: lowercase, remove extra spaces
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  // Create hash-like key
  const hash = Buffer.from(`${normalized}_${voiceId}_${speed}`).toString('base64')
    .replace(/[/+=]/g, '')
    .substring(0, 32);
  return `audio_${voiceId}_${hash}.mp3`;
}

/**
 * Check if audio exists in Supabase Storage cache
 */
async function checkCache(cacheKey: string): Promise<string | null> {
  try {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      return null; // No caching available
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if file exists
    const { data, error } = await supabase.storage
      .from('audio-cache')
      .download(cacheKey);

    if (error || !data) {
      return null; // Not in cache
    }

    // File exists, return public URL
    const { data: urlData } = supabase.storage
      .from('audio-cache')
      .getPublicUrl(cacheKey);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Cache check failed:', error);
    return null;
  }
}

/**
 * Save audio to Supabase Storage cache
 */
async function saveToCache(cacheKey: string, audioBuffer: Buffer): Promise<void> {
  try {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      return; // No caching available
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.storage
      .from('audio-cache')
      .upload(cacheKey, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000', // Cache for 1 year
        upsert: true
      });
  } catch (error) {
    console.error('Failed to save to cache:', error);
    // Don't throw - caching is optional
  }
}

// ============================================
// Main Handler
// ============================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }

  // Only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Parse request body
    const {
      text,
      voiceId,
      speed = '100%',
      pitch = 'medium',
      emphasis = 'moderate',
      useCache = true
    } = req.body as AudioRequest;

    // Validate required fields
    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    // Validate text length (max 3000 characters for safety)
    if (text.length > 3000) {
      res.status(400).json({ error: 'Text too long (max 3000 characters)' });
      return;
    }

    const resolvedVoiceId = resolveAzureVoiceName(voiceId);

    // Check cache if enabled
    if (useCache) {
      const cacheKey = getCacheKey(text, resolvedVoiceId, speed);
      const cachedUrl = await checkCache(cacheKey);

      if (cachedUrl) {
        // Redirect to cached audio
        res.setHeader('X-Cache-Status', 'HIT');
        res.redirect(cachedUrl);
        return;
      }
    }

    const result = await synthesizeSpeech({
      text,
      voiceId: resolvedVoiceId,
      speed,
      pitch,
      emphasis,
    });

    // Save to cache in background (don't wait)
    if (useCache) {
      const cacheKey = getCacheKey(text, result.voiceId, speed);
      saveToCache(cacheKey, result.audioBuffer).catch(err =>
        console.error('Background cache save failed:', err)
      );
    }

    // Return audio
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('X-Cache-Status', 'MISS');
    res.setHeader('X-Character-Count', text.length.toString());
    res.setHeader('X-Voice-Id', result.voiceId);
    res.status(200).send(result.audioBuffer);
  } catch (error) {
    console.error('Audio generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
