/**
 * Vercel Serverless Function: Audio Generation with AWS Polly
 *
 * This endpoint generates high-quality audio using AWS Polly neural voices.
 * It handles SSML formatting, audio generation, and optional caching in Supabase Storage.
 *
 * POST /api/audio/generate
 *
 * Request body:
 * {
 *   text: string;           // Text to synthesize
 *   voiceId?: string;       // Voice ID (default: 'Joanna')
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
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (optional, default: 'us-east-1')
 * - SUPABASE_URL (for caching)
 * - SUPABASE_SERVICE_ROLE_KEY (for caching)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  SynthesizeSpeechCommandInput,
  Engine,
  OutputFormat,
  VoiceId,
  LanguageCode
} from '@aws-sdk/client-polly';
import { createClient } from '@supabase/supabase-js';
import { getVoiceLanguageCode } from './config';

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
// CORS Headers
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// ============================================
// Helpers
// ============================================

/**
 * Build SSML markup for text synthesis
 */
function buildSSML(
  text: string,
  speed: string = '100%',
  pitch: string = 'medium',
  emphasis: string = 'moderate'
): string {
  const emphasizedText = emphasis !== 'none'
    ? `<emphasis level="${emphasis}">${text}</emphasis>`
    : text;

  return `
    <speak>
      <prosody rate="${speed}" pitch="${pitch}">
        ${emphasizedText}
      </prosody>
    </speak>
  `.trim();
}

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
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
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
      voiceId = 'Joanna',
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

    // Check AWS credentials
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      res.status(500).json({
        error: 'AWS credentials not configured',
        message: 'Premium TTS is not available. Please contact support.'
      });
      return;
    }

    // Check cache if enabled
    if (useCache) {
      const cacheKey = getCacheKey(text, voiceId, speed);
      const cachedUrl = await checkCache(cacheKey);

      if (cachedUrl) {
        // Redirect to cached audio
        res.setHeader('X-Cache-Status', 'HIT');
        res.redirect(cachedUrl);
        return;
      }
    }

    // Initialize Polly client
    const polly = new PollyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    // Build SSML
    const ssml = buildSSML(text, speed, pitch, emphasis);

    // Prepare synthesis parameters
    const params: SynthesizeSpeechCommandInput = {
      Text: ssml,
      TextType: 'ssml',
      OutputFormat: 'mp3' as OutputFormat,
      VoiceId: voiceId as VoiceId,
      Engine: 'neural' as Engine,
      LanguageCode: getVoiceLanguageCode(voiceId) as LanguageCode
    };

    // Generate audio
    const command = new SynthesizeSpeechCommand(params);
    const response = await polly.send(command);

    if (!response.AudioStream) {
      res.status(500).json({ error: 'Failed to generate audio' });
      return;
    }

    // Convert stream to buffer
    const audioBuffer = await streamToBuffer(response.AudioStream);

    // Save to cache in background (don't wait)
    if (useCache) {
      const cacheKey = getCacheKey(text, voiceId, speed);
      saveToCache(cacheKey, audioBuffer).catch(err =>
        console.error('Background cache save failed:', err)
      );
    }

    // Return audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Cache-Status', 'MISS');
    res.setHeader('X-Character-Count', text.length.toString());
    res.setHeader('X-Voice-Id', voiceId);
    res.status(200).send(audioBuffer);
  } catch (error) {
    console.error('Audio generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
