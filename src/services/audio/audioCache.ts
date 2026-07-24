/**
 * AudioCache
 *
 * Persistent client side cache for generated premium TTS audio, sitting in
 * front of `/api/premium-tts`. This is a result cache for queue playback and
 * prefetch, separate from `persistentTTSCache`/`ttsCache` (base64 in
 * localStorage, no rate/engine/outputFormat dimension); it stores raw Blobs
 * in IndexedDB instead. Neither `backgroundAudioService.ts` nor
 * `api/premium-tts.ts` are touched by this module.
 */

import { appConfig } from '../../config/AppConfig';

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

const AUDIO_CACHE_KEY_VERSION = 'v1';

export interface AudioCacheKeyInput {
  text: string;
  voiceId?: string;
  languageCode?: string;
  rate?: number;
  engine?: 'standard' | 'neural';
  outputFormat?: string;
}

/**
 * Builds a versioned cache key from normalized text plus every playback
 * parameter, resolving the same defaults `backgroundAudioService` would apply
 * so two calls that both omit, say, voiceId still land on the same key. rate,
 * engine, and outputFormat are not varied by `/api/premium-tts` today, but
 * are included so a future change there does not need a key migration.
 */
export function buildAudioCacheKey(input: AudioCacheKeyInput): string {
  const normalizedText = input.text.trim().replace(/\s+/g, ' ').toLowerCase();
  const voiceId = input.voiceId ?? appConfig.get<string>('voice.defaultVoiceId');
  const languageCode = input.languageCode ?? appConfig.get<string>('voice.defaultLanguage');
  const engine = input.engine ?? appConfig.get<'standard' | 'neural'>('voice.defaultEngine');
  const outputFormat = input.outputFormat ?? appConfig.get<string>('backgroundAudio.outputFormat');
  const rate = typeof input.rate === 'number' ? input.rate : 1;

  return [
    AUDIO_CACHE_KEY_VERSION,
    languageCode,
    voiceId,
    engine,
    String(rate),
    outputFormat,
    normalizedText,
  ].join(':');
}

// ---------------------------------------------------------------------------
// Cached value shape
// ---------------------------------------------------------------------------

export interface CachedAudioMetadata {
  contentType: string;
  createdAt: number;
  lastAccessedAt: number;
  durationSeconds?: number;
  /** Debugging/inspection only, never part of key identity: the same audio
   * can legitimately serve multiple queue items sharing the same text, voice,
   * language, rate, engine, and output format. */
  itemId?: string;
  datasetId?: string;
}

export interface CachedAudioEntry {
  audioBlob: Blob;
  metadata: CachedAudioMetadata;
}

// ---------------------------------------------------------------------------
// Storage backend
// ---------------------------------------------------------------------------

export interface AudioCacheStorage {
  get(key: string): Promise<CachedAudioEntry | null>;
  set(key: string, entry: CachedAudioEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'pte-audio-cache';
const DB_VERSION = 1;
const STORE_NAME = 'clips';

/** IndexedDB backed storage. Structured clone supports Blob values directly,
 * so entries are stored as is rather than re-encoded to base64. */
export class IndexedDbAudioCacheStorage implements AudioCacheStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open the audio cache database'));
    });

    return this.dbPromise;
  }

  async get(key: string): Promise<CachedAudioEntry | null> {
    const db = await this.openDb();
    return new Promise<CachedAudioEntry | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result as CachedAudioEntry | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Failed to read from the audio cache'));
    });
  }

  async set(key: string, entry: CachedAudioEntry): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(entry, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to write to the audio cache'));
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to delete from the audio cache'));
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to clear the audio cache'));
    });
  }
}

// ---------------------------------------------------------------------------
// Cache orchestration
// ---------------------------------------------------------------------------

export interface FetchedAudio {
  blob: Blob;
  contentType: string;
}

export type AudioCacheSetMetadata = Omit<CachedAudioMetadata, 'createdAt' | 'lastAccessedAt'>;

/** contentType is always taken from the fetch result inside getOrFetch, not
 * from the caller, since the caller cannot know it before fetching. */
export type AudioCacheFetchMetadata = Omit<AudioCacheSetMetadata, 'contentType'>;

/**
 * Result cache with in flight fetch de-duplication. `getOrFetch` is the main
 * entry point: a hit skips `fetcher` entirely; a miss calls it once even if
 * multiple callers ask for the same key concurrently (queue playback and
 * prefetch, or two prefetch targets that happen to share text/voice/etc).
 */
export class AudioCache {
  private readonly storage: AudioCacheStorage;
  private readonly inFlight = new Map<string, Promise<FetchedAudio>>();

  constructor(storage: AudioCacheStorage = new IndexedDbAudioCacheStorage()) {
    this.storage = storage;
  }

  /** Returns a ready to play entry, or null on a plain miss. A stored entry
   * that fails an integrity check is deleted and treated as a miss rather
   * than surfaced as an error. A storage failure (e.g. IndexedDB unavailable)
   * also falls through to a miss, never to a thrown error, so a cache problem
   * never blocks the caller from fetching normally. */
  async get(key: string): Promise<CachedAudioEntry | null> {
    let entry: CachedAudioEntry | null;
    try {
      entry = await this.storage.get(key);
    } catch {
      return null;
    }
    if (!entry) return null;

    if (!this.isValidEntry(entry)) {
      await this.storage.delete(key).catch(() => {
        // Best effort eviction; the corrupt entry is still treated as a miss.
      });
      return null;
    }

    const touched: CachedAudioEntry = {
      audioBlob: entry.audioBlob,
      metadata: { ...entry.metadata, lastAccessedAt: Date.now() },
    };
    await this.storage.set(key, touched).catch(() => {
      // A failed lastAccessedAt refresh must not block returning the hit.
    });
    return touched;
  }

  /** Persists a successful synthesis result. Never throws: a write failure
   * is logged to the caller via rejection of this promise's inner storage
   * call only being swallowed here, matching the contract that a cache
   * failure must not affect playback that already succeeded. */
  async set(key: string, audioBlob: Blob, metadata: AudioCacheSetMetadata): Promise<void> {
    const now = Date.now();
    const entry: CachedAudioEntry = {
      audioBlob,
      metadata: { ...metadata, createdAt: now, lastAccessedAt: now },
    };
    await this.storage.set(key, entry).catch(() => {
      // Cache write problems must not invalidate audio that already played.
    });
  }

  /** Clears all cached audio entries. Never throws: reset flows must still
   * complete even if IndexedDB is unavailable or temporarily blocked. */
  async clear(): Promise<void> {
    await this.storage.clear().catch(() => {
      // Cache clear problems must not block app data reset.
    });
  }

  /**
   * Checks the cache, and on a miss calls `fetcher` at most once per key even
   * under concurrent callers, storing the result before returning it. The
   * in-flight registration happens synchronously, before any await, so two
   * calls made back to back with no await between them still see each other.
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<FetchedAudio>,
    metadata: AudioCacheFetchMetadata = {}
  ): Promise<FetchedAudio & { fromCache: boolean }> {
    const existing = this.inFlight.get(key);
    if (existing) {
      const result = await existing;
      return { ...result, fromCache: false };
    }

    const work = this.resolveOrFetch(key, fetcher, metadata);
    this.inFlight.set(key, work);
    try {
      return await work;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async resolveOrFetch(
    key: string,
    fetcher: () => Promise<FetchedAudio>,
    metadata: AudioCacheFetchMetadata
  ): Promise<FetchedAudio & { fromCache: boolean }> {
    const cached = await this.get(key);
    if (cached) {
      return { blob: cached.audioBlob, contentType: cached.metadata.contentType, fromCache: true };
    }

    const result = await fetcher();
    await this.set(key, result.blob, { ...metadata, contentType: result.contentType });
    return { ...result, fromCache: false };
  }

  private isValidEntry(entry: CachedAudioEntry): boolean {
    return (
      !!entry.audioBlob &&
      typeof entry.audioBlob.size === 'number' &&
      entry.audioBlob.size > 0 &&
      !!entry.metadata &&
      typeof entry.metadata.contentType === 'string' &&
      entry.metadata.contentType.length > 0
    );
  }
}

/** Shared singleton, mirroring backgroundAudioService's own export pattern. */
export const audioCache = new AudioCache();
