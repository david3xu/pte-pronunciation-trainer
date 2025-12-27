/**
 * Premium TTS API Route (Vercel Serverless Function)
 *
 * Provides high-quality text-to-speech using AWS Polly.
 * Supports multiple voices, languages, and neural engine.
 *
 * Endpoint: /api/premium-tts
 * Method: POST
 */

import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PREMIUM_VOICES } from './config';

// Initialize AWS Polly client
let pollyClient: PollyClient | null = null;

function getPollyClient(): PollyClient {
  if (!pollyClient) {
    // Check if AWS credentials are configured
    if (!process.env['AWS_ACCESS_KEY_ID'] || !process.env['AWS_SECRET_ACCESS_KEY']) {
      throw new Error('AWS credentials not configured');
    }

    pollyClient = new PollyClient({
      region: process.env['AWS_REGION'] || 'us-east-1',
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
      },
    });
  }

  return pollyClient;
}

interface RequestBody {
  text: string;
  voiceId?: string;
  engine?: 'standard' | 'neural';
  languageCode?: string;
  outputFormat?: 'mp3' | 'ogg_vorbis' | 'pcm';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Diagnostic logging for debugging
  console.log('[Polly API] Handler invoked');
  console.log('[Polly API] AWS_REGION:', process.env['AWS_REGION']);
  console.log('[Polly API] AWS_ACCESS_KEY_ID exists:', !!process.env['AWS_ACCESS_KEY_ID']);
  console.log('[Polly API] AWS_SECRET_ACCESS_KEY exists:', !!process.env['AWS_SECRET_ACCESS_KEY']);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const {
      text,
      voiceId = 'Joanna',
      engine = 'neural',
      languageCode = 'en-US',
      outputFormat = 'mp3',
    }: RequestBody = req.body || {};

    // Validate request
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

    // Check if AWS credentials are configured
    if (!process.env['AWS_ACCESS_KEY_ID'] || !process.env['AWS_SECRET_ACCESS_KEY']) {
      console.warn('AWS credentials not configured - returning fallback');
      return res.status(200).json({
        success: false,
        error: 'Premium TTS not configured',
        fallback: true,
      });
    }

    // Get Polly client with error handling
    let client: PollyClient;
    try {
      client = getPollyClient();
    } catch (clientError: any) {
      console.error('Failed to create Polly client:', clientError);
      return res.status(200).json({
        success: false,
        error: 'Failed to initialize Polly client',
        fallback: true,
      });
    }

    // Synthesize speech using AWS Polly
    console.log(`[Polly] Synthesizing: voice=${voiceId}, lang=${languageCode}, engine=${engine}`);

    const command = new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: voiceId as any,
      Engine: engine as any,
      LanguageCode: languageCode as any,
      OutputFormat: outputFormat as any,
      TextType: 'text',
    });

    const response = await client.send(command);

    // Convert audio stream to base64
    if (!response.AudioStream) {
      throw new Error('No audio stream returned from Polly');
    }

    const audioBuffer = await streamToBuffer(response.AudioStream);
    const audioBase64 = audioBuffer.toString('base64');

    console.log(`[Polly] Success: ${text.substring(0, 30)}...`);

    // Return audio data
    return res.status(200).json({
      success: true,
      data: {
        audioBase64,
        contentType: response.ContentType || 'audio/mpeg',
        voiceId,
        engine,
        languageCode,
        requestCharacters: text.length,
      },
    });
  } catch (error: any) {
    console.error('Premium TTS error:', error?.message || error);
    console.error('Error stack:', error?.stack);

    // Return error with fallback suggestion
    return res.status(200).json({
      success: false,
      error: error?.message || 'Failed to synthesize speech',
      fallback: true,
    });
  }
}

/**
 * Convert readable stream to buffer
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
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
