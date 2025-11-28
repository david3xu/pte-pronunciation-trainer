/**
 * TTS Cache Service with LocalStorage Persistence
 *
 * Extends the existing in-memory TTSCache with persistent LocalStorage backing.
 * Reduces API calls by caching audio for commonly repeated words.
 */

import { ttsCache } from '../tts';

const STORAGE_KEY = 'pte-tts-cache';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for LocalStorage
const CACHE_VERSION = 'v1';

interface CachedAudioItem {
  audioBase64: string;
  contentType: string;
  timestamp: number;
  voiceId: string;
  languageCode: string;
  text: string;
  version: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  storageSize: number;
  itemCount: number;
}

/**
 * Persistent TTS Cache using LocalStorage
 */
class PersistentTTSCache {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    storageSize: 0,
    itemCount: 0,
  };

  constructor() {
    this.loadStatsFromStorage();
  }

  /**
   * Generate cache key
   */
  private getCacheKey(text: string, voiceId: string, languageCode: string): string {
    return `${CACHE_VERSION}:${languageCode}:${voiceId}:${text.toLowerCase().trim()}`;
  }

  /**
   * Get cached audio (checks both memory and LocalStorage)
   */
  async get(
    text: string,
    voiceId: string,
    languageCode: string
  ): Promise<{ audioBase64: string; contentType: string } | null> {
    // 1. Check in-memory cache first (fastest)
    const memCached = ttsCache.get(text, voiceId, languageCode);
    if (memCached) {
      this.stats.hits++;
      console.log('[TTS Cache] Hit (memory)');
      return memCached;
    }

    // 2. Check LocalStorage (persistent)
    try {
      const key = this.getCacheKey(text, voiceId, languageCode);
      const stored = localStorage.getItem(`${STORAGE_KEY}:${key}`);

      if (!stored) {
        this.stats.misses++;
        console.log('[TTS Cache] Miss');
        return null;
      }

      const item: CachedAudioItem = JSON.parse(stored);

      // Check version and expiry (30 days)
      const age = Date.now() - item.timestamp;
      const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (item.version !== CACHE_VERSION || age > MAX_AGE) {
        localStorage.removeItem(`${STORAGE_KEY}:${key}`);
        this.stats.misses++;
        console.log('[TTS Cache] Miss (expired)');
        return null;
      }

      // Update in-memory cache
      ttsCache.set(text, voiceId, languageCode, item.audioBase64, item.contentType);

      this.stats.hits++;
      console.log('[TTS Cache] Hit (storage)');
      return {
        audioBase64: item.audioBase64,
        contentType: item.contentType,
      };
    } catch (error) {
      console.error('[TTS Cache] Error reading from storage:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache audio to both memory and LocalStorage
   */
  async set(
    text: string,
    voiceId: string,
    languageCode: string,
    audioBase64: string,
    contentType: string = 'audio/mpeg'
  ): Promise<void> {
    // 1. Update in-memory cache
    ttsCache.set(text, voiceId, languageCode, audioBase64, contentType);

    // 2. Persist to LocalStorage
    try {
      const key = this.getCacheKey(text, voiceId, languageCode);
      const item: CachedAudioItem = {
        audioBase64,
        contentType,
        timestamp: Date.now(),
        voiceId,
        languageCode,
        text,
        version: CACHE_VERSION,
      };

      const itemStr = JSON.stringify(item);
      const itemSize = new Blob([itemStr]).size;

      // Check if we need to free space
      if (this.stats.storageSize + itemSize > MAX_STORAGE_SIZE) {
        await this.evictOldest();
      }

      localStorage.setItem(`${STORAGE_KEY}:${key}`, itemStr);
      this.stats.storageSize += itemSize;
      this.stats.itemCount++;
      this.saveStatsToStorage();

      console.log('[TTS Cache] Cached to storage:', {
        text: text.substring(0, 30),
        size: `${(itemSize / 1024).toFixed(1)}KB`,
      });
    } catch (error) {
      console.error('[TTS Cache] Error writing to storage:', error);
      // Don't throw - in-memory cache still works
    }
  }

  /**
   * Evict oldest cache entries to free space
   */
  private async evictOldest(): Promise<void> {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY)) {
        allKeys.push(key);
      }
    }

    // Sort by timestamp (oldest first)
    const items: Array<{ key: string; timestamp: number; size: number }> = [];
    for (const key of allKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const item: CachedAudioItem = JSON.parse(stored);
          items.push({
            key,
            timestamp: item.timestamp,
            size: new Blob([stored]).size,
          });
        }
      } catch (error) {
        // Invalid item, remove it
        localStorage.removeItem(key);
      }
    }

    items.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 25% of items
    const toRemove = Math.ceil(items.length * 0.25);
    let freedSpace = 0;

    for (let i = 0; i < toRemove && i < items.length; i++) {
      const item = items[i];
      if (item) {
        localStorage.removeItem(item.key);
        freedSpace += item.size;
      }
    }

    this.stats.storageSize -= freedSpace;
    this.stats.itemCount -= toRemove;

    console.log(`[TTS Cache] Evicted ${toRemove} items, freed ${(freedSpace / 1024).toFixed(1)}KB`);
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY)) {
        allKeys.push(key);
      }
    }

    allKeys.forEach(key => localStorage.removeItem(key));
    this.stats = { hits: 0, misses: 0, storageSize: 0, itemCount: 0 };
    this.saveStatsToStorage();
    ttsCache.clear();

    console.log('[TTS Cache] Cleared all cache data');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate?: number } {
    const totalRequests = (this.stats?.hits || 0) + (this.stats?.misses || 0);
    const hitRate = totalRequests > 0
      ? ((this.stats?.hits || 0) / totalRequests) * 100
      : 0;

    return {
      hits: this.stats?.hits || 0,
      misses: this.stats?.misses || 0,
      storageSize: this.stats?.storageSize || 0,
      itemCount: this.stats?.itemCount || 0,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Load stats from localStorage
   */
  private loadStatsFromStorage(): void {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}:stats`);
      if (stored) {
        this.stats = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[TTS Cache] Could not load stats');
    }
  }

  /**
   * Save stats to localStorage
   */
  private saveStatsToStorage(): void {
    try {
      localStorage.setItem(`${STORAGE_KEY}:stats`, JSON.stringify(this.stats));
    } catch (error) {
      console.warn('[TTS Cache] Could not save stats');
    }
  }
}

// Global persistent cache instance
export const persistentTTSCache = new PersistentTTSCache();
