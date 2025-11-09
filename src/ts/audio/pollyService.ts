/**
 * AWS Polly Text-to-Speech Service
 *
 * Provides premium neural voice synthesis with SSML support.
 * This service wraps AWS Polly API calls and handles audio generation,
 * caching, and voice management.
 *
 * Pricing: $16.00 per 1 million characters (Neural voices)
 * Free Tier: 1 million characters/month (first 12 months)
 */

import {
  PollyClient,
  SynthesizeSpeechCommand,
  SynthesizeSpeechCommandInput,
  Engine,
  OutputFormat,
  VoiceId,
  LanguageCode
} from '@aws-sdk/client-polly';

// ============================================
// Types & Interfaces
// ============================================

export interface PollyVoice {
  id: VoiceId;
  name: string;
  language: string;
  gender: 'Male' | 'Female';
  accent: 'US' | 'UK' | 'AU' | 'IN';
  isPremium: true;
}

export interface SynthesisOptions {
  text: string;
  voiceId?: VoiceId;
  speed?: string; // e.g., "100%", "90%", "110%"
  pitch?: string; // e.g., "medium", "high", "low"
  emphasis?: 'strong' | 'moderate' | 'reduced' | 'none';
  useSSML?: boolean;
}

export interface SynthesisResult {
  audioUrl?: string; // If cached
  audioStream?: Uint8Array; // If not cached
  voiceId: VoiceId;
  characterCount: number;
  cached: boolean;
  error?: string;
}

// ============================================
// Available Premium Voices
// ============================================

export const PREMIUM_VOICES: Record<string, PollyVoice> = {
  // US English - Female
  'Joanna': {
    id: 'Joanna' as VoiceId,
    name: 'Joanna',
    language: 'English (US)',
    gender: 'Female',
    accent: 'US',
    isPremium: true
  },
  'Kendra': {
    id: 'Kendra' as VoiceId,
    name: 'Kendra',
    language: 'English (US)',
    gender: 'Female',
    accent: 'US',
    isPremium: true
  },
  'Ivy': {
    id: 'Ivy' as VoiceId,
    name: 'Ivy',
    language: 'English (US)',
    gender: 'Female',
    accent: 'US',
    isPremium: true
  },
  'Kimberly': {
    id: 'Kimberly' as VoiceId,
    name: 'Kimberly',
    language: 'English (US)',
    gender: 'Female',
    accent: 'US',
    isPremium: true
  },
  'Salli': {
    id: 'Salli' as VoiceId,
    name: 'Salli',
    language: 'English (US)',
    gender: 'Female',
    accent: 'US',
    isPremium: true
  },

  // US English - Male
  'Matthew': {
    id: 'Matthew' as VoiceId,
    name: 'Matthew',
    language: 'English (US)',
    gender: 'Male',
    accent: 'US',
    isPremium: true
  },
  'Joey': {
    id: 'Joey' as VoiceId,
    name: 'Joey',
    language: 'English (US)',
    gender: 'Male',
    accent: 'US',
    isPremium: true
  },
  'Justin': {
    id: 'Justin' as VoiceId,
    name: 'Justin',
    language: 'English (US)',
    gender: 'Male',
    accent: 'US',
    isPremium: true
  },
  'Kevin': {
    id: 'Kevin' as VoiceId,
    name: 'Kevin',
    language: 'English (US)',
    gender: 'Male',
    accent: 'US',
    isPremium: true
  },

  // British English - Female
  'Amy': {
    id: 'Amy' as VoiceId,
    name: 'Amy',
    language: 'English (UK)',
    gender: 'Female',
    accent: 'UK',
    isPremium: true
  },
  'Emma': {
    id: 'Emma' as VoiceId,
    name: 'Emma',
    language: 'English (UK)',
    gender: 'Female',
    accent: 'UK',
    isPremium: true
  },

  // British English - Male
  'Brian': {
    id: 'Brian' as VoiceId,
    name: 'Brian',
    language: 'English (UK)',
    gender: 'Male',
    accent: 'UK',
    isPremium: true
  },
  'Arthur': {
    id: 'Arthur' as VoiceId,
    name: 'Arthur',
    language: 'English (UK)',
    gender: 'Male',
    accent: 'UK',
    isPremium: true
  },

  // Australian English
  'Nicole': {
    id: 'Nicole' as VoiceId,
    name: 'Nicole',
    language: 'English (AU)',
    gender: 'Female',
    accent: 'AU',
    isPremium: true
  },
  'Russell': {
    id: 'Russell' as VoiceId,
    name: 'Russell',
    language: 'English (AU)',
    gender: 'Male',
    accent: 'AU',
    isPremium: true
  },

  // Indian English
  'Aditi': {
    id: 'Aditi' as VoiceId,
    name: 'Aditi',
    language: 'English (IN)',
    gender: 'Female',
    accent: 'IN',
    isPremium: true
  },
  'Raveena': {
    id: 'Raveena' as VoiceId,
    name: 'Raveena',
    language: 'English (IN)',
    gender: 'Female',
    accent: 'IN',
    isPremium: true
  }
};

// ============================================
// Polly Client Initialization
// ============================================

/**
 * Initialize AWS Polly client with credentials from environment
 *
 * IMPORTANT: This function should only be used SERVER-SIDE (API routes).
 * AWS credentials should NEVER be exposed to the client.
 *
 * Required environment variables (server-side):
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (optional, defaults to 'us-east-1')
 *
 * Note: This function is kept for potential server-side usage,
 * but the main audio generation happens through /api/audio/generate endpoint.
 */
export function getPollyClient(): PollyClient | null {
  // This should only be called server-side
  console.warn('⚠️ getPollyClient() called. This should only be used server-side.');
  return null;
}

// ============================================
// SSML Builder
// ============================================

/**
 * Build SSML markup for text synthesis with prosody control
 */
export function buildSSML(text: string, options: SynthesisOptions): string {
  const {
    speed = '100%',
    pitch = 'medium',
    emphasis = 'moderate'
  } = options;

  // If emphasis is 'none', don't wrap in emphasis tag
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

// ============================================
// Audio Generation
// ============================================

/**
 * Generate audio using AWS Polly neural voices
 *
 * @param options - Synthesis options (text, voice, speed, etc.)
 * @returns SynthesisResult with audio data or error
 */
export async function generateAudio(options: SynthesisOptions): Promise<SynthesisResult> {
  const client = getPollyClient();

  if (!client) {
    return {
      voiceId: options.voiceId || 'Joanna' as VoiceId,
      characterCount: options.text.length,
      cached: false,
      error: 'AWS Polly not configured. Please set AWS credentials.'
    };
  }

  try {
    const {
      text,
      voiceId = 'Joanna' as VoiceId,
      useSSML = true
    } = options;

    // Build SSML or use plain text
    const synthesisText = useSSML ? buildSSML(text, options) : text;

    // Prepare synthesis parameters
    const params: SynthesizeSpeechCommandInput = {
      Text: synthesisText,
      TextType: useSSML ? 'ssml' : 'text',
      OutputFormat: 'mp3' as OutputFormat,
      VoiceId: voiceId,
      Engine: 'neural' as Engine,
      LanguageCode: getLanguageCodeForVoice(voiceId)
    };

    // Call AWS Polly
    const command = new SynthesizeSpeechCommand(params);
    const response = await client.send(command);

    // Convert AudioStream to Uint8Array
    if (response.AudioStream) {
      const audioStream = await streamToUint8Array(response.AudioStream);

      return {
        audioStream,
        voiceId,
        characterCount: text.length,
        cached: false
      };
    } else {
      return {
        voiceId,
        characterCount: text.length,
        cached: false,
        error: 'No audio stream returned from Polly'
      };
    }
  } catch (error) {
    console.error('❌ AWS Polly synthesis failed:', error);
    return {
      voiceId: options.voiceId || 'Joanna' as VoiceId,
      characterCount: options.text.length,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get language code for a voice ID
 */
function getLanguageCodeForVoice(voiceId: VoiceId): LanguageCode {
  const voice = PREMIUM_VOICES[voiceId];
  if (!voice) return 'en-US' as LanguageCode;

  switch (voice.accent) {
    case 'US': return 'en-US' as LanguageCode;
    case 'UK': return 'en-GB' as LanguageCode;
    case 'AU': return 'en-AU' as LanguageCode;
    case 'IN': return 'en-IN' as LanguageCode;
    default: return 'en-US' as LanguageCode;
  }
}

/**
 * Convert ReadableStream to Uint8Array
 */
async function streamToUint8Array(stream: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Create audio blob from Uint8Array
 */
export function createAudioBlob(audioData: Uint8Array): Blob {
  return new Blob([audioData as BlobPart], { type: 'audio/mpeg' });
}

/**
 * Create object URL from audio blob
 */
export function createAudioURL(audioBlob: Blob): string {
  return URL.createObjectURL(audioBlob);
}

/**
 * Check if premium TTS is available
 *
 * This checks a client-side flag to determine if premium TTS should be shown.
 * The actual availability is verified server-side when making API calls.
 *
 * Set VITE_PREMIUM_TTS_ENABLED=true in .env to enable premium TTS UI
 */
export function isPremiumTTSAvailable(): boolean {
  const enabled = import.meta.env['VITE_PREMIUM_TTS_ENABLED'];
  return enabled === 'true' || enabled === true;
}

/**
 * Get voice by ID
 */
export function getVoiceById(voiceId: string): PollyVoice | undefined {
  return PREMIUM_VOICES[voiceId];
}

/**
 * Get all voices filtered by criteria
 */
export function getVoices(filter?: {
  accent?: 'US' | 'UK' | 'AU' | 'IN';
  gender?: 'Male' | 'Female';
}): PollyVoice[] {
  let voices = Object.values(PREMIUM_VOICES);

  if (filter?.accent) {
    voices = voices.filter(v => v.accent === filter.accent);
  }

  if (filter?.gender) {
    voices = voices.filter(v => v.gender === filter.gender);
  }

  return voices;
}

// ============================================
// Usage Tracking (optional)
// ============================================

let characterCount = 0;

/**
 * Track character usage for cost estimation
 */
export function trackUsage(characters: number): void {
  characterCount += characters;
}

/**
 * Get total character usage
 */
export function getUsage(): { characters: number; estimatedCost: number } {
  // $16.00 per 1 million characters
  const costPerCharacter = 16.00 / 1_000_000;
  const estimatedCost = characterCount * costPerCharacter;

  return {
    characters: characterCount,
    estimatedCost: Math.round(estimatedCost * 100) / 100 // Round to 2 decimals
  };
}

/**
 * Reset usage counter
 */
export function resetUsage(): void {
  characterCount = 0;
}
