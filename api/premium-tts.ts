/**
 * Premium TTS API Route (Vercel Serverless Function)
 *
 * Provides high-quality text-to-speech using AWS Polly.
 * Supports multiple voices, languages, and neural engine.
 *
 * Endpoint: /api/premium-tts
 * Method: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { PREMIUM_VOICES } from './config';

// Initialize AWS Polly client
let pollyClient: PollyClient | null = null;

function getPollyClient(): PollyClient {
  if (!pollyClient) {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured');
    }

    pollyClient = new PollyClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
    }: RequestBody = req.body;

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
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('AWS credentials not configured - returning mock response');
      return res.status(200).json({
        success: false,
        error: 'Premium TTS not configured',
        fallback: true,
      });
    }

    // Get Polly client
    const client = getPollyClient();

    // Synthesize speech using AWS Polly
    const command = new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: voiceId,
      Engine: engine,
      LanguageCode: languageCode,
      OutputFormat: outputFormat,
      TextType: 'text', // Can be 'text' or 'ssml'
    });

    const response = await client.send(command);

    // Convert audio stream to base64
    if (!response.AudioStream) {
      throw new Error('No audio stream returned from Polly');
    }

    const audioBuffer = await streamToBuffer(response.AudioStream);
    const audioBase64 = audioBuffer.toString('base64');

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
    console.error('Premium TTS error:', error);

    // Return error with fallback suggestion
    return res.status(200).json({
      success: false,
      error: error.message || 'Failed to synthesize speech',
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
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    success: true,
    data: PREMIUM_VOICES,
  });
}
