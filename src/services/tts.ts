/**
 * TTS API Client
 *
 * Client-side wrapper for Text-to-Speech features (browser and premium).
 * Now with persistent LocalStorage caching to reduce API calls.
 */

import { persistentTTSCache } from './tts/persistentCache';

interface PremiumTTSRequest {
  text: string;
  voiceId?: string;
  engine?: 'standard' | 'neural';
  languageCode?: string;
  outputFormat?: 'mp3' | 'ogg_vorbis' | 'pcm';
}

interface PremiumTTSResponse {
  audioBase64: string;
  contentType: string;
  voiceId: string;
  engine: string;
  languageCode: string;
  requestCharacters: number;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
}

/**
 * Synthesize speech using premium TTS (AWS Polly) with caching
 */
export async function synthesizePremiumSpeech(
  text: string,
  voiceId: string = 'Joanna',
  languageCode: string = 'en-US'
): Promise<APIResponse<PremiumTTSResponse>> {
  // Check persistent cache first
  const cached = await persistentTTSCache.get(text, voiceId, languageCode);
  if (cached) {
    return {
      success: true,
      data: {
        audioBase64: cached.audioBase64,
        contentType: cached.contentType,
        voiceId,
        engine: 'neural',
        languageCode,
        requestCharacters: text.length,
      },
    };
  }

  // Cache miss - call API
  try {
    const request: PremiumTTSRequest = {
      text,
      voiceId,
      engine: 'neural',
      languageCode,
      outputFormat: 'mp3',
    };

    const response = await fetch('/api/premium-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();

    // Cache the result
    if (result.success && result.data?.audioBase64) {
      await persistentTTSCache.set(
        text,
        voiceId,
        languageCode,
        result.data.audioBase64,
        result.data.contentType || 'audio/mpeg'
      );
    }

    return result;
  } catch (error: any) {
    console.error('Premium TTS API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to synthesize speech',
      fallback: true,
    };
  }
}

/**
 * Play audio from base64 data
 */
export function playAudioFromBase64(
  audioBase64: string,
  contentType: string = 'audio/mpeg'
): HTMLAudioElement {
  const audio = new Audio(`data:${contentType};base64,${audioBase64}`);
  audio.play();
  return audio;
}

/**
 * Get available premium voices
 */
export async function getAvailableVoices(): Promise<APIResponse<any>> {
  try {
    const response = await fetch('/api/voices');

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Voices API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch voices',
    };
  }
}

/**
 * Cache premium TTS audio
 */
export class TTSCache {
  private cache: Map<string, { audioBase64: string; contentType: string; timestamp: number }>;
  private maxAge: number; // milliseconds
  private maxSize: number; // max cache entries

  constructor(maxAge: number = 3600000, maxSize: number = 100) {
    this.cache = new Map();
    this.maxAge = maxAge; // 1 hour default
    this.maxSize = maxSize;
  }

  /**
   * Get cached audio
   */
  get(text: string, voiceId: string, languageCode: string): { audioBase64: string; contentType: string } | null {
    const key = this.getCacheKey(text, voiceId, languageCode);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return {
      audioBase64: cached.audioBase64,
      contentType: cached.contentType,
    };
  }

  /**
   * Set cached audio
   */
  set(text: string, voiceId: string, languageCode: string, audioBase64: string, contentType: string): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      // Delete oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const key = this.getCacheKey(text, voiceId, languageCode);
    this.cache.set(key, {
      audioBase64,
      contentType,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache key
   */
  private getCacheKey(text: string, voiceId: string, languageCode: string): string {
    return `${languageCode}:${voiceId}:${text}`;
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; maxSize: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      maxAge: this.maxAge,
    };
  }
}

// Global TTS cache instance
export const ttsCache = new TTSCache();
