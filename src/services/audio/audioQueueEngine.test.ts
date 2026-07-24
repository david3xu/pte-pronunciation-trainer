import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestAudioHandlers = {
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
};

const audioMocks = vi.hoisted(() => ({
  BackgroundAudioService: vi.fn(),
  backgroundAudioService: {
    canResume: vi.fn(() => false),
    getLoadedText: vi.fn<() => string | null>(() => null),
    pause: vi.fn(),
    playText: vi.fn(() => Promise.resolve()),
    playTextFromUserGesture: vi.fn(() => Promise.resolve()),
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

import { AudioQueueEngine, type QueueItem } from './audioQueueEngine';

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
  await Promise.resolve();
  await Promise.resolve();
};

const createDeferred = () => {
  let resolvePromise: () => void = () => {};
  let rejectPromise: (reason?: unknown) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
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
    audioMocks.backgroundAudioService.resume.mockResolvedValue(undefined);
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
    expect(audioMocks.backgroundAudioService.setHandlers).toHaveBeenCalledTimes(1);

    await start;
    expect(engine.getPlaybackState()).toBe('playing');
  });

  it('uses queued background playback for an automatic continuation', async () => {
    const engine = new AudioQueueEngine();
    engine.load(createItems());

    await engine.startAutomatic();

    expect(audioMocks.backgroundAudioService.playText).toHaveBeenCalledWith(
      'First clip',
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
    expect(audioMocks.backgroundAudioService.playText).toHaveBeenCalledWith(
      'First clip',
      expect.objectContaining({ mediaTitle: 'FIRST clip' })
    );

    getHandlers().onEnded?.();
    await flushQueueWork();

    expect(engine.getCurrentIndex()).toBe(1);
    expect(audioMocks.backgroundAudioService.playText).toHaveBeenLastCalledWith(
      'Second clip',
      expect.objectContaining({ mediaTitle: 'SECOND clip' })
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
    expect(audioMocks.backgroundAudioService.playText).toHaveBeenLastCalledWith(
      'First clip',
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
    const deferredPlayback = createDeferred();
    const abortError = Object.assign(new Error('request aborted'), { name: 'AbortError' });
    const onPlaybackFailed = vi.fn();
    const engine = new AudioQueueEngine();
    engine.setListeners({ onPlaybackFailed });
    engine.load(createItems());
    await engine.start();
    audioMocks.backgroundAudioService.playText.mockReturnValueOnce(deferredPlayback.promise);

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
});