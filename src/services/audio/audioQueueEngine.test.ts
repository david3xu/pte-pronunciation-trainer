import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestAudioHandlers = {
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSuspended?: () => void;
  onOwnershipLost?: () => void;
};

const audioMocks = vi.hoisted(() => ({
  BackgroundAudioService: vi.fn(),
  backgroundAudioService: {
    canResume: vi.fn(() => false),
    fetchAudioBlob: vi.fn(() => Promise.resolve({ blob: new Blob(['audio']), contentType: 'audio/mpeg' })),
    getLoadedText: vi.fn<() => string | null>(() => null),
    pause: vi.fn(),
    playBlob: vi.fn(() => Promise.resolve()),
    playText: vi.fn(() => Promise.resolve()),
    playTextFromUserGesture: vi.fn(() => Promise.resolve()),
    prefersDirectQueuePlayback: vi.fn(() => false),
    resume: vi.fn(() => Promise.resolve()),
    setHandlers: vi.fn(),
    setRate: vi.fn(),
    setVolume: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('./backgroundAudioService', () => ({
  BackgroundAudioService: audioMocks.BackgroundAudioService,
  backgroundAudioService: audioMocks.backgroundAudioService,
}));

// The engine's cache parameter defaults to the real audioCache singleton,
// which is backed by IndexedDB. Mocking it here keeps these engine tests
// focused on sequencing, not cache behavior (covered separately in
// audioCache.test.ts); getOrFetch is a transparent pass-through to whatever
// fetcher the engine provides, so it behaves like an always-miss cache.
const cacheMocks = vi.hoisted(() => ({
  audioCache: {
    getOrFetch: vi.fn(
      (
        _key: string,
        fetcher: () => Promise<{ blob: Blob; contentType: string }>
      ) => fetcher().then((result) => ({ ...result, fromCache: false }))
    ),
  },
  buildAudioCacheKey: vi.fn((input: { text: string }) => `key:${input.text}`),
}));

vi.mock('./audioCache', () => ({
  audioCache: cacheMocks.audioCache,
  buildAudioCacheKey: cacheMocks.buildAudioCacheKey,
}));

import { AudioQueueEngine, type QueueAudioCache, type QueueItem } from './audioQueueEngine';

const createItems = (): QueueItem[] => [
  {
    id: 'first',
    datasetId: 'queue-test',
    index: 0,
    text: 'First clip',
    mediaTitle: 'FIRST clip',
    mediaArtist: 'First clip',
    itemType: 'vocabulary',
  },
  {
    id: 'second',
    datasetId: 'queue-test',
    index: 1,
    text: 'Second clip',
    mediaTitle: 'SECOND clip',
    mediaArtist: 'Second clip',
    itemType: 'vocabulary',
  },
];

const getHandlers = (): TestAudioHandlers => {
  const handlers = audioMocks.backgroundAudioService.setHandlers.mock.calls[0]?.[0] as TestAudioHandlers | undefined;
  if (!handlers) throw new Error('Queue engine did not register audio handlers');
  return handlers;
};

const flushQueueWork = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const createDeferred = <T = void>() => {
  let resolvePromise: (value: T) => void = () => {};
  let rejectPromise: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return { promise, resolve: resolvePromise, reject: rejectPromise };
};

describe('AudioQueueEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    audioMocks.backgroundAudioService.canResume.mockReturnValue(false);
    audioMocks.backgroundAudioService.getLoadedText.mockReturnValue(null);
    audioMocks.backgroundAudioService.playText.mockResolvedValue(undefined);
    audioMocks.backgroundAudioService.playTextFromUserGesture.mockResolvedValue(undefined);
    audioMocks.backgroundAudioService.prefersDirectQueuePlayback.mockReturnValue(false);
    audioMocks.backgroundAudioService.resume.mockResolvedValue(undefined);
    audioMocks.backgroundAudioService.fetchAudioBlob.mockResolvedValue({
      blob: new Blob(['audio']),
      contentType: 'audio/mpeg',
    });
    audioMocks.backgroundAudioService.playBlob.mockResolvedValue(undefined);
  });

  it('loads and starts through the shared background audio service without creating another service', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());

    const start = engine.start({ rate: 1.2, volume: 0.6 });

    // The direct service call occurs before awaiting the command result, which
    // preserves the initiating browser gesture for mobile playback.
    expect(audioMocks.backgroundAudioService.playTextFromUserGesture).toHaveBeenCalledWith(
      'First clip',
      expect.objectContaining({
        mediaTitle: 'FIRST clip',
        mediaArtist: 'First clip',
      })
    );
    expect(audioMocks.backgroundAudioService.setRate).toHaveBeenCalledWith(1.2);
    expect(audioMocks.backgroundAudioService.setVolume).toHaveBeenCalledWith(0.6);
    expect(audioMocks.BackgroundAudioService).not.toHaveBeenCalled();
    // Once at construction, and once more as start()'s ownership reclaim
    // (see fix-tts-engine-handler-conflict): both calls pass this engine's
    // own stable handlers object, so backgroundAudioService's real
    // implementation would treat the second as a no-op rather than a
    // takeover; this mock just records that both calls happened.
    expect(audioMocks.backgroundAudioService.setHandlers).toHaveBeenCalledTimes(2);

    await start;
    expect(engine.getPlaybackState()).toBe('playing');
  });

  it('uses queued background playback for an automatic continuation', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());

    await engine.startAutomatic();

    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledWith(
      'First clip',
      expect.objectContaining({ mediaTitle: 'FIRST clip' })
    );
    expect(audioMocks.backgroundAudioService.playBlob).toHaveBeenCalledWith(
      'First clip',
      expect.anything(),
      expect.objectContaining({ mediaTitle: 'FIRST clip' })
    );
    expect(audioMocks.backgroundAudioService.playTextFromUserGesture).not.toHaveBeenCalled();
    expect(engine.getPlaybackState()).toBe('playing');
  });

  it('pauses and resumes the loaded item without refetching it', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());
    await engine.start();

    audioMocks.backgroundAudioService.canResume.mockReturnValue(true);
    audioMocks.backgroundAudioService.getLoadedText.mockReturnValue('First clip');

    engine.pause();
    expect(audioMocks.backgroundAudioService.pause).toHaveBeenCalledTimes(1);
    expect(engine.getPlaybackState()).toBe('paused');

    await engine.resume({ rate: 0.8, volume: 0.4 });
    expect(audioMocks.backgroundAudioService.resume).toHaveBeenCalledWith(0.8, 0.4);
    expect(audioMocks.backgroundAudioService.playTextFromUserGesture).toHaveBeenCalledTimes(1);
    expect(engine.getPlaybackState()).toBe('playing');
  });

  it('bounds next and previous navigation without wrapping or starting idle playback', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());

    await expect(engine.previous()).resolves.toMatchObject({ moved: false, index: 0 });
    await expect(engine.next()).resolves.toMatchObject({ moved: true, index: 1 });
    await expect(engine.next()).resolves.toMatchObject({ moved: false, index: 1 });
    await expect(engine.previous()).resolves.toMatchObject({ moved: true, index: 0 });

    expect(audioMocks.backgroundAudioService.playText).not.toHaveBeenCalled();
    expect(audioMocks.backgroundAudioService.playTextFromUserGesture).not.toHaveBeenCalled();
  });

  it('stops audio while retaining the current queue position', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems(), 1);
    await engine.start();

    audioMocks.backgroundAudioService.stop.mockClear();
    engine.stop();

    expect(audioMocks.backgroundAudioService.stop).toHaveBeenCalledTimes(1);
    expect(engine.getCurrentIndex()).toBe(1);
    expect(engine.getCurrentItem()?.id).toBe('second');
    expect(engine.getPlaybackState()).toBe('idle');
  });

  it('repeats an item before advancing after its natural end', async () => {
    const items = createItems();
    items[0] = { ...items[0]!, repeatCount: 2 };
    const onClipEnded = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onClipEnded });
    engine.load(items);
    await engine.start();

    getHandlers().onEnded?.();
    await flushQueueWork();

    expect(onClipEnded).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ id: 'first' }),
      repeatIndex: 1,
      repeatCount: 2,
    }));
    expect(engine.getCurrentIndex()).toBe(0);
    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledWith(
      'First clip',
      expect.objectContaining({ mediaTitle: 'FIRST clip' })
    );
    expect(audioMocks.backgroundAudioService.playBlob).toHaveBeenCalledWith(
      'First clip',
      expect.anything(),
      expect.objectContaining({ mediaTitle: 'FIRST clip' })
    );

    getHandlers().onEnded?.();
    await flushQueueWork();

    expect(engine.getCurrentIndex()).toBe(1);
    expect(audioMocks.backgroundAudioService.playBlob).toHaveBeenLastCalledWith(
      'Second clip',
      expect.anything(),
      expect.objectContaining({ mediaTitle: 'SECOND clip' })
    );
  });

  it('still advances when a false suspension signal arrives immediately before ended', async () => {
    const onClipEnded = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onClipEnded });
    engine.load(createItems());
    await engine.start();

    getHandlers().onSuspended?.();
    getHandlers().onEnded?.();
    await flushQueueWork();

    expect(onClipEnded).toHaveBeenCalledTimes(1);
    expect(engine.getCurrentIndex()).toBe(1);
    expect(audioMocks.backgroundAudioService.playBlob).toHaveBeenLastCalledWith(
      'Second clip',
      expect.anything(),
      expect.objectContaining({ mediaTitle: 'SECOND clip' })
    );
  });

  it('uses direct playText continuation when the platform service opts out of blob cache playback', async () => {
    audioMocks.backgroundAudioService.prefersDirectQueuePlayback.mockReturnValue(true);
    const engine = new AudioQueueEngine();
    engine.load(createItems());
    await engine.start();
    await flushQueueWork();
    cacheMocks.audioCache.getOrFetch.mockClear();
    audioMocks.backgroundAudioService.playText.mockClear();
    audioMocks.backgroundAudioService.playBlob.mockClear();

    getHandlers().onEnded?.();
    await flushQueueWork();

    expect(engine.getCurrentIndex()).toBe(1);
    expect(audioMocks.backgroundAudioService.playText).toHaveBeenLastCalledWith(
      'Second clip',
      expect.objectContaining({ mediaTitle: 'SECOND clip' })
    );
    expect(cacheMocks.audioCache.getOrFetch).not.toHaveBeenCalledWith(
      'key:Second clip',
      expect.any(Function),
      expect.anything()
    );
    expect(audioMocks.backgroundAudioService.playBlob).not.toHaveBeenCalledWith(
      'Second clip',
      expect.anything(),
      expect.anything()
    );
  });

  it('loops to the first item at a natural queue end when repeat mode is enabled', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());
    engine.setRepeatMode(true);
    await engine.next();
    await engine.start();

    getHandlers().onEnded?.();
    await flushQueueWork();

    expect(engine.getCurrentIndex()).toBe(0);
    expect(audioMocks.backgroundAudioService.playBlob).toHaveBeenLastCalledWith(
      'First clip',
      expect.anything(),
      expect.any(Object)
    );
  });

  it('keeps aborted or superseded playback silent', async () => {
    const deferredStart = createDeferred();
    const abortError = Object.assign(new Error('request aborted'), { name: 'AbortError' });
    const onPlaybackFailed = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onPlaybackFailed });
    engine.load(createItems());
    audioMocks.backgroundAudioService.playTextFromUserGesture.mockReturnValueOnce(deferredStart.promise);

    const firstStart = engine.start();
    const moved = engine.next();
    deferredStart.reject(abortError);

    await expect(firstStart).resolves.toMatchObject({ index: 1 });
    await expect(moved).resolves.toMatchObject({ moved: true, index: 1 });
    expect(onPlaybackFailed).not.toHaveBeenCalled();
    expect(engine.getPlaybackState()).toBe('playing');
  });

  it('cancels a buffering request when paused without emitting a failure', async () => {
    const deferredPlayback = createDeferred<{ blob: Blob; contentType: string }>();
    const abortError = Object.assign(new Error('request aborted'), { name: 'AbortError' });
    const onPlaybackFailed = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onPlaybackFailed });
    engine.load(createItems());
    await engine.start();
    audioMocks.backgroundAudioService.fetchAudioBlob.mockReturnValueOnce(deferredPlayback.promise);

    const moving = engine.next();
    expect(engine.getPlaybackState()).toBe('buffering');
    engine.pause();
    deferredPlayback.reject(abortError);

    await expect(moving).resolves.toMatchObject({ moved: true, state: 'paused' });
    expect(audioMocks.backgroundAudioService.stop).toHaveBeenCalled();
    expect(onPlaybackFailed).not.toHaveBeenCalled();
    expect(engine.getPlaybackState()).toBe('paused');
  });

  it('moves to error and emits onPlaybackFailed for a genuine playback failure', async () => {
    const playbackError = new Error('Premium TTS is unavailable');
    const onPlaybackFailed = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onPlaybackFailed });
    engine.load(createItems());
    audioMocks.backgroundAudioService.playTextFromUserGesture.mockRejectedValueOnce(playbackError);

    await expect(engine.start()).rejects.toThrow('Premium TTS is unavailable');

    expect(engine.getPlaybackState()).toBe('error');
    expect(onPlaybackFailed).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ id: 'first' }),
      error: playbackError,
      recoverable: false,
    }));
  });

  it('maps Media Session handlers to queue commands', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());
    const handlers = getHandlers();

    handlers.onPlay?.();
    await flushQueueWork();
    expect(audioMocks.backgroundAudioService.playTextFromUserGesture).toHaveBeenCalledWith(
      'First clip',
      expect.any(Object)
    );

    handlers.onPause?.();
    expect(engine.getPlaybackState()).toBe('paused');
    expect(audioMocks.backgroundAudioService.pause).toHaveBeenCalled();

    handlers.onNext?.();
    await flushQueueWork();
    expect(engine.getCurrentIndex()).toBe(1);

    handlers.onPrevious?.();
    await flushQueueWork();
    expect(engine.getCurrentIndex()).toBe(0);

    handlers.onStop?.();
    expect(engine.getPlaybackState()).toBe('idle');
  });

  it('never runs two prefetch fetches concurrently', async () => {
    const items: QueueItem[] = [
      { id: 'a', datasetId: 'concurrency-test', index: 0, text: 'A clip', mediaTitle: 'A', mediaArtist: '', itemType: 'vocabulary' },
      { id: 'b', datasetId: 'concurrency-test', index: 1, text: 'B clip', mediaTitle: 'B', mediaArtist: '', itemType: 'vocabulary' },
      { id: 'c', datasetId: 'concurrency-test', index: 2, text: 'C clip', mediaTitle: 'C', mediaArtist: '', itemType: 'vocabulary' },
    ];
    const deferredB = createDeferred<{ blob: Blob; contentType: string }>();
    audioMocks.backgroundAudioService.fetchAudioBlob.mockReturnValueOnce(deferredB.promise);

    const engine = new AudioQueueEngine();
    engine.load(items); // prefetch targets B, C; the fetch for B hangs
    await flushQueueWork();

    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledTimes(1);

    // Re-triggering prefetch repeatedly while the first attempt is still
    // stuck must never start a second, overlapping attempt.
    await engine.next();
    await engine.previous();
    await flushQueueWork();

    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledTimes(1);

    deferredB.resolve({ blob: new Blob(['b']), contentType: 'audio/mpeg' });
    await flushQueueWork();
  });

  it('cancels stale prefetch targets when the queue is replaced mid-flight', async () => {
    const originalItems: QueueItem[] = [
      { id: 'a', datasetId: 'book-a', index: 0, text: 'A clip', mediaTitle: 'A', mediaArtist: '', itemType: 'vocabulary' },
      { id: 'stale', datasetId: 'book-a', index: 1, text: 'Stale clip', mediaTitle: 'Stale', mediaArtist: '', itemType: 'vocabulary' },
    ];
    const replacementItems: QueueItem[] = [
      { id: 'x', datasetId: 'book-b', index: 0, text: 'X clip', mediaTitle: 'X', mediaArtist: '', itemType: 'vocabulary' },
      { id: 'fresh', datasetId: 'book-b', index: 1, text: 'Fresh clip', mediaTitle: 'Fresh', mediaArtist: '', itemType: 'vocabulary' },
    ];

    const deferredStale = createDeferred<{ blob: Blob; contentType: string }>();
    audioMocks.backgroundAudioService.fetchAudioBlob.mockReturnValueOnce(deferredStale.promise);

    const engine = new AudioQueueEngine();
    engine.load(originalItems); // prefetch target: 'Stale clip'; hangs
    await flushQueueWork();

    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledWith('Stale clip', expect.any(Object));

    // A book switch (or any queue replacement) while that fetch is still in
    // flight must not let it be retried, and the loop should move on to the
    // replacement queue's own targets once it clears.
    engine.load(replacementItems);
    deferredStale.resolve({ blob: new Blob(['stale']), contentType: 'audio/mpeg' });
    await flushQueueWork();

    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledWith('Fresh clip', expect.any(Object));
    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledTimes(2);
  });

  it('does not fetch the same audio twice when duplicate queued items share a cache key', async () => {
    const stored = new Map<string, { blob: Blob; contentType: string }>();
    const realisticCache: QueueAudioCache = {
      getOrFetch: vi.fn(
        async (key: string, fetcher: () => Promise<{ blob: Blob; contentType: string }>) => {
          const existing = stored.get(key);
          if (existing) return { ...existing, fromCache: true };
          const result = await fetcher();
          stored.set(key, result);
          return { ...result, fromCache: false };
        }
      ),
    };

    const items: QueueItem[] = [
      { id: 'anchor', datasetId: 'dup-test', index: 0, text: 'Anchor clip', mediaTitle: 'Anchor', mediaArtist: '', itemType: 'vocabulary' },
      { id: 'first-dup', datasetId: 'dup-test', index: 1, text: 'Repeated clip', mediaTitle: 'Repeated', mediaArtist: '', itemType: 'vocabulary' },
      { id: 'second-dup', datasetId: 'dup-test', index: 2, text: 'Repeated clip', mediaTitle: 'Repeated', mediaArtist: '', itemType: 'vocabulary' },
    ];

    const engine = new AudioQueueEngine(audioMocks.backgroundAudioService, realisticCache);
    engine.load(items); // prefetch targets: index 1 and 2, both 'Repeated clip'
    await flushQueueWork();

    expect(realisticCache.getOrFetch).toHaveBeenCalledTimes(2);
    expect(audioMocks.backgroundAudioService.fetchAudioBlob).toHaveBeenCalledTimes(1);
  });

  it('a user pause stays a plain pause, never needs-user-resume', async () => {
    const onResumeRequired = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onResumeRequired });
    engine.load(createItems());
    await engine.start();

    engine.pause();

    expect(engine.getPlaybackState()).toBe('paused');
    expect(onResumeRequired).not.toHaveBeenCalled();
  });

  it('a browser/OS suspension moves to the suspended state and recovers silently when resume succeeds', async () => {
    const onResumeRequired = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onResumeRequired });
    engine.load(createItems());
    await engine.start();

    getHandlers().onSuspended?.();
    await flushQueueWork();

    expect(audioMocks.backgroundAudioService.resume).toHaveBeenCalled();
    expect(engine.getPlaybackState()).toBe('playing');
    expect(onResumeRequired).not.toHaveBeenCalled();
  });

  it('escalates to needs-user-resume and emits onResumeRequired when the silent resume is rejected', async () => {
    const onResumeRequired = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onResumeRequired });
    engine.load(createItems());
    await engine.start();

    const blockedError = Object.assign(new Error('play() rejected'), { name: 'NotAllowedError' });
    audioMocks.backgroundAudioService.resume.mockRejectedValueOnce(blockedError);

    getHandlers().onSuspended?.();
    await flushQueueWork();

    expect(engine.getPlaybackState()).toBe('needs-user-resume');
    expect(onResumeRequired).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'suspended',
      item: expect.objectContaining({ id: 'first' }),
    }));
  });

  it('does not run two recovery attempts concurrently, including one triggered by a page lifecycle signal', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());
    await engine.start();

    const deferredResume = createDeferred<void>();
    audioMocks.backgroundAudioService.resume.mockReturnValueOnce(deferredResume.promise);

    getHandlers().onSuspended?.();
    await flushQueueWork();

    expect(engine.getPlaybackState()).toBe('suspended');
    expect(audioMocks.backgroundAudioService.resume).toHaveBeenCalledTimes(1);

    // A visibility/pageshow signal arriving while the first attempt is still
    // pending (checkForRecovery is what those listeners call) must not start
    // a second, overlapping resume() call.
    engine.checkForRecovery();
    engine.checkForRecovery();
    await flushQueueWork();

    expect(audioMocks.backgroundAudioService.resume).toHaveBeenCalledTimes(1);

    deferredResume.resolve();
    await flushQueueWork();

    expect(engine.getPlaybackState()).toBe('playing');
  });

  it('reclaims its handlers after a manual word tap displaces them, and clip-end events reach it again afterward (fix-tts-engine-handler-conflict)', async () => {
    const onClipEnded = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onClipEnded });
    engine.load(createItems());
    await engine.start();

    expect(engine.getPlaybackState()).toBe('playing');
    const queueHandlers = getHandlers();

    // A manual word tap through TTSEngine calls backgroundAudioService's
    // real setHandlers() with its own, different object. The real service
    // fires onOwnershipLost on whatever was previously registered before
    // replacing it; this mock records the call but does not implement that
    // notification itself, so invoke it directly here to exercise the
    // engine's own reaction, exactly as backgroundAudioService.ts does.
    const manualTapHandlers: TestAudioHandlers = { onEnded: vi.fn(), onError: vi.fn() };
    audioMocks.backgroundAudioService.setHandlers(manualTapHandlers);
    queueHandlers.onOwnershipLost?.();

    // The queue no longer controls the shared element, so it settles to
    // paused instead of staying stuck showing 'playing' for audio that is
    // no longer actually its own.
    expect(engine.getPlaybackState()).toBe('paused');

    // The manual tap's own clip finishing reaches its own handlers, not the
    // queue's, since the queue was displaced.
    manualTapHandlers.onEnded?.();
    await flushQueueWork();
    expect(onClipEnded).not.toHaveBeenCalled();

    // Resuming the queue must reclaim ownership rather than staying detached.
    await engine.resume();
    expect(audioMocks.backgroundAudioService.setHandlers).toHaveBeenLastCalledWith(queueHandlers);
    expect(engine.getPlaybackState()).toBe('playing');

    // With ownership reclaimed, a clip ending reaches the queue again,
    // proving the earlier takeover did not permanently detach it.
    queueHandlers.onEnded?.();
    await flushQueueWork();
    expect(onClipEnded).toHaveBeenCalledTimes(1);
  });

  it('Media Session button presses reach the queue again after a manual word tap and resume (fix-tts-engine-handler-conflict)', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());
    await engine.start();
    const queueHandlers = getHandlers();

    audioMocks.backgroundAudioService.setHandlers({ onEnded: vi.fn() });
    queueHandlers.onOwnershipLost?.();
    expect(engine.getPlaybackState()).toBe('paused');

    await engine.resume();
    expect(engine.getPlaybackState()).toBe('playing');

    // backgroundAudioService's real Media Session action handlers dispatch
    // dynamically to whichever handlers object is currently registered
    // (see bindMediaSession()), so a button press after reclaiming ownership
    // must reach the queue's onNext, not silently do nothing.
    queueHandlers.onNext?.();
    await flushQueueWork();
    expect(engine.getCurrentIndex()).toBe(1);
  });

  it('recovery (onSuspended) reaches the queue again after a manual word tap and reclaim (handler-conflict-audit-instructions)', async () => {
    const onResumeRequired = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onResumeRequired });
    engine.load(createItems());
    await engine.start();
    const queueHandlers = getHandlers();

    // Manual word tap displaces the queue; the queue is then resumed,
    // reclaiming ownership.
    audioMocks.backgroundAudioService.setHandlers({ onEnded: vi.fn() });
    queueHandlers.onOwnershipLost?.();
    expect(engine.getPlaybackState()).toBe('paused');

    await engine.resume();
    expect(engine.getPlaybackState()).toBe('playing');

    // A browser/OS suspension signal now must reach the reclaimed queue's
    // own recovery handling, not a handler set that silently drops it (the
    // manual tap's minimal {onEnded} set above does not even implement
    // onSuspended, which is exactly the failure mode this closes off: before
    // the fix, a suspension arriving while displaced, or arriving after a
    // botched reclaim, would vanish with no recoverable state at all).
    queueHandlers.onSuspended?.();
    await flushQueueWork();

    expect(audioMocks.backgroundAudioService.resume).toHaveBeenCalled();
    expect(engine.getPlaybackState()).toBe('playing');
    expect(onResumeRequired).not.toHaveBeenCalled(); // silent resume succeeded
  });
});