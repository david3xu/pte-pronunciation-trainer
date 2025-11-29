/**
 * TTS API Client
 *
 * Client-side wrapper for Text-to-Speech features (browser and premium).
 * Now with persistent LocalStorage caching to reduce API calls.
 */











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
