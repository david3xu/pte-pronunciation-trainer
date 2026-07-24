import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AudioCache,
  buildAudioCacheKey,
  type AudioCacheStorage,
  type CachedAudioEntry,
} from './audioCache';

class FakeAudioCacheStorage implements AudioCacheStorage {
  private readonly entries = new Map<string, CachedAudioEntry>();

  async get(key: string): Promise<CachedAudioEntry | null> {
    return this.entries.get(key) ?? null;
  }

  async set(key: string, entry: CachedAudioEntry): Promise<void> {
    this.entries.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }
}

const makeBlob = (content = 'audio-bytes'): Blob => new Blob([content], { type: 'audio/mpeg' });

describe('buildAudioCacheKey', () => {
  it('produces a stable, versioned key for the same input', () => {
    const input = {
      text: 'Hello world',
      voiceId: 'Russell',
      languageCode: 'en-AU',
      rate: 1,
      engine: 'neural' as const,
      outputFormat: 'audio/mpeg',
    };

    const first = buildAudioCacheKey(input);
    const second = buildAudioCacheKey({ ...input });

    expect(first).toBe(second);
    expect(first.startsWith('v1:')).toBe(true);
  });

  it('normalizes text so incidental whitespace and case do not change the key', () => {
    const base = buildAudioCacheKey({ text: 'hello world', voiceId: 'Russell', languageCode: 'en-AU' });
    const spaced = buildAudioCacheKey({ text: '  Hello   World  ', voiceId: 'Russell', languageCode: 'en-AU' });

    expect(spaced).toBe(base);
  });

  it('changes the key when any playback dimension changes', () => {
    const base = buildAudioCacheKey({ text: 'hello', voiceId: 'Russell', languageCode: 'en-AU', rate: 1 });
    const differentVoice = buildAudioCacheKey({ text: 'hello', voiceId: 'Olivia', languageCode: 'en-AU', rate: 1 });
    const differentRate = buildAudioCacheKey({ text: 'hello', voiceId: 'Russell', languageCode: 'en-AU', rate: 1.5 });

    expect(differentVoice).not.toBe(base);
    expect(differentRate).not.toBe(base);
  });
});

describe('AudioCache', () => {
  let storage: FakeAudioCacheStorage;
  let cache: AudioCache;

  beforeEach(() => {
    storage = new FakeAudioCacheStorage();
    cache = new AudioCache(storage);
  });

  it('a cache hit never calls the fetcher', async () => {
    await cache.set('key-1', makeBlob(), { contentType: 'audio/mpeg' });
    const fetcher = vi.fn(() => Promise.resolve({ blob: makeBlob('should-not-be-used'), contentType: 'audio/mpeg' }));

    const result = await cache.getOrFetch('key-1', fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.fromCache).toBe(true);
  });

  it('a cache miss calls the fetcher once and stores the result', async () => {
    const blob = makeBlob('fetched-audio');
    const fetcher = vi.fn(() => Promise.resolve({ blob, contentType: 'audio/mpeg' }));

    const result = await cache.getOrFetch('key-2', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.fromCache).toBe(false);
    expect(storage.has('key-2')).toBe(true);

    // A second call now hits the stored entry instead of fetching again.
    const second = await cache.getOrFetch('key-2', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.fromCache).toBe(true);
  });

  it('de-duplicates concurrent fetches for the same key', async () => {
    let resolveFetch: (value: { blob: Blob; contentType: string }) => void = () => {};
    const fetcher = vi.fn(
      () => new Promise<{ blob: Blob; contentType: string }>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const first = cache.getOrFetch('key-3', fetcher);
    const second = cache.getOrFetch('key-3', fetcher);

    // getOrFetch checks the cache (an async hop) before ever calling fetcher,
    // so the real resolver is not assigned until that clears.
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    resolveFetch({ blob: makeBlob(), contentType: 'audio/mpeg' });
    await Promise.all([first, second]);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('treats a corrupt stored entry as a miss and evicts it', async () => {
    await storage.set('key-4', {
      audioBlob: new Blob([], { type: 'audio/mpeg' }), // zero bytes: corrupt
      metadata: { contentType: 'audio/mpeg', createdAt: 0, lastAccessedAt: 0 },
    });

    const entry = await cache.get('key-4');

    expect(entry).toBeNull();
    expect(storage.has('key-4')).toBe(false);
  });

  it('falls back to a miss rather than throwing when storage itself fails', async () => {
    const failingStorage: AudioCacheStorage = {
      get: vi.fn(() => Promise.reject(new Error('IndexedDB unavailable'))),
      set: vi.fn(() => Promise.reject(new Error('IndexedDB unavailable'))),
      delete: vi.fn(() => Promise.resolve()),
    };
    const brokenCache = new AudioCache(failingStorage);

    const entry = await brokenCache.get('key-5');
    expect(entry).toBeNull();

    // A write failure must not surface as a rejection; it only means the
    // clip will be re-fetched next time instead of served from cache.
    await expect(
      brokenCache.set('key-5', makeBlob(), { contentType: 'audio/mpeg' })
    ).resolves.toBeUndefined();
  });
});
