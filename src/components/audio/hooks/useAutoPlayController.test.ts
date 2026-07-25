import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// KNOWN ISSUE, ACCEPTED (audio-review-checkpoint, 2026-07-24): every test in
// this file logs "An update to TestComponent inside a test was not wrapped
// in act(...)" even for interactions that are already wrapped in act(), and
// even for a bare render with zero interaction. Investigated across two
// prior rounds: a setTimeout based flush matching this codebase's own
// pre-adapter pattern, wrapping the render itself in act(), an explicit
// act-wrapped cleanup() in afterEach, and adding the IS_REACT_ACT_ENVIRONMENT
// global React 19 checks for (src/test/setup.ts) all left it unchanged. The
// full suite is otherwise completely clean, including other files that use
// full component renders (App.test.tsx), which rules out a project-wide
// environment problem; it is isolated specifically to renderHook against
// this hook under this React 19/RTL/Vitest combination. It does not affect
// correctness: every assertion in this file is genuinely exercising real
// logic, not being masked by the warning. Treated as test-harness noise
// rather than a blocker; do not spend further time rediscovering this unless
// a dependency upgrade changes the underlying behavior.

// The hook still calls backgroundAudioService.stop() directly on unmount and
// in its onPlaybackFailed listener, so that surface is mocked here. Every
// other playback call now goes through AudioQueueEngine (mocked below), not
// this service directly.
vi.mock('../../../services/audio/backgroundAudioService', () => ({
  backgroundAudioService: {
    stop: vi.fn(),
  },
}));

const engineMock = vi.hoisted(() => {
  const mock = {
    load: vi.fn(),
    start: vi.fn(() => Promise.resolve(undefined)),
    startAutomatic: vi.fn(() => Promise.resolve(undefined)),
    resume: vi.fn(() => Promise.resolve(undefined)),
    pause: vi.fn(),
    next: vi.fn(() => Promise.resolve(undefined)),
    previous: vi.fn(() => Promise.resolve(undefined)),
    stop: vi.fn(),
    setListeners: vi.fn(),
    setRate: vi.fn(),
    setVolume: vi.fn(),
    setRepeatMode: vi.fn(),
    setDefaultRepeatCount: vi.fn(),
    getPlaybackState: vi.fn(() => 'idle'),
    getCurrentItem: vi.fn(() => null as unknown),
    getCurrentIndex: vi.fn(() => 0),
    getItems: vi.fn(() => [] as unknown[]),
    getPersistedPosition: vi.fn(() => null as unknown),
    checkForRecovery: vi.fn(),
  };
  // A real engine's getItems() reflects whatever load() last stored. Mirroring
  // that here means the hook's own sync effect (which compares getItems()
  // against the freshly built queue on every render) sees a match after the
  // first load and does not call load() again on every subsequent render.
  mock.load.mockImplementation((items: unknown[]) => {
    mock.getItems.mockReturnValue(items);
  });
  return mock;
});

vi.mock('../../../services/audio/audioQueueEngine', () => ({
  // Arrow functions cannot be invoked with `new`; the mock constructor needs a
  // real function that returns the shared mock object as the instance.
  AudioQueueEngine: vi.fn(function AudioQueueEngine() {
    return engineMock;
  }),
}));

vi.mock('../../../services/dataset/datasetLoader', () => ({
  loadDataset: vi.fn(),
}));

import { appConfig } from '../../../config/AppConfig';
import { backgroundAudioService } from '../../../services/audio/backgroundAudioService';
import { loadDataset } from '../../../services/dataset/datasetLoader';
import { useAppStore } from '../../../stores';
import { useAutoPlayController } from './useAutoPlayController';

type SetListenersArg = Parameters<typeof engineMock.setListeners>[0];

const seedCurrentItem = (overrides: Record<string, unknown> = {}) => {
  const store = useAppStore.getState();
  store.vocabulary.setCurrentItem(
    { english: 'hello', id: 'test-1', ...overrides } as unknown as Parameters<
      typeof store.vocabulary.setCurrentItem
    >[0]
  );
};

const setRepeatMode = (enabled: boolean) => {
  if (useAppStore.getState().audio.repeatMode !== enabled) {
    useAppStore.getState().audio.toggleRepeat();
  }
};

const latestListeners = (): SetListenersArg =>
  engineMock.setListeners.mock.calls.at(-1)?.[0] as SetListenersArg;

/** Flushes pending microtasks and at least one macrotask tick inside act(),
 * matching the flush pattern the pre-adapter test file already used, so a
 * mocked engine promise settling a beat later never lands unwrapped during a
 * later test. */
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};


describe('useAutoPlayController - queue engine delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engineMock.getPlaybackState.mockReturnValue('idle');
    engineMock.getCurrentItem.mockReturnValue(null);
    engineMock.getCurrentIndex.mockReturnValue(0);
    engineMock.start.mockReturnValue(Promise.resolve(undefined));
    engineMock.startAutomatic.mockReturnValue(Promise.resolve(undefined));
    engineMock.resume.mockReturnValue(Promise.resolve(undefined));
    engineMock.next.mockReturnValue(Promise.resolve(undefined));
    engineMock.previous.mockReturnValue(Promise.resolve(undefined));
    useAppStore.getState().audio.stopAutoPlay();
    seedCurrentItem();
  });

  afterEach(() => {
    useAppStore.getState().audio.stopAutoPlay();
  });

  it('loads the queue and starts it directly inside the Play gesture', async () => {
    const { result } = renderHook(() => useAutoPlayController());

    act(() => {
      result.current.handlePlay();
    });
    await flush();

    expect(engineMock.load).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ text: 'hello' })]),
      expect.any(Number)
    );
    // The real call happens synchronously inside the gesture handler, before
    // any await, so it is already recorded before the flush above.
    expect(engineMock.start).toHaveBeenCalledTimes(1);
    expect(engineMock.resume).not.toHaveBeenCalled();
  });

  it('sets difficulty-based default repeat counts on queued words', async () => {
    const store = useAppStore.getState();
    const dataset = [
      { id: 'easy-word', english: 'easy word', difficulty: 'easy', category: 'test' },
      { id: 'normal-word', english: 'normal word', difficulty: 'normal', category: 'test' },
      { id: 'hard-word', english: 'hard word', difficulty: 'hard', category: 'test' },
    ] as unknown as Parameters<typeof store.vocabulary.setDataset>[0];
    store.vocabulary.setDataset(dataset, 'test');

    const { result } = renderHook(() => useAutoPlayController());

    act(() => {
      result.current.handlePlay();
    });
    await flush();

    expect(engineMock.load).toHaveBeenCalledWith(
      [
        expect.objectContaining({ id: 'easy-word', repeatCount: 1 }),
        expect.objectContaining({ id: 'normal-word', repeatCount: 3 }),
        expect.objectContaining({ id: 'hard-word', repeatCount: 5 }),
      ],
      expect.any(Number)
    );
  });

  it('resumes instead of reloading the queue when the engine is already paused', async () => {
    engineMock.getPlaybackState.mockReturnValue('paused');
    const { result } = renderHook(() => useAutoPlayController());
    await flush();
    engineMock.load.mockClear();

    act(() => {
      result.current.handlePlay();
    });
    await flush();

    expect(engineMock.resume).toHaveBeenCalled();
    expect(engineMock.load).not.toHaveBeenCalled();
    expect(engineMock.start).not.toHaveBeenCalled();
  });

  it('continues autoplay through startAutomatic when auto-playing resumes without a gesture', async () => {
    renderHook(() => useAutoPlayController());

    await act(async () => {
      useAppStore.getState().audio.startAutoPlay();
      await Promise.resolve();
    });
    await flush();

    expect(engineMock.startAutomatic).toHaveBeenCalledTimes(1);
    expect(engineMock.start).not.toHaveBeenCalled();
  });

  it('resumes through the engine when autoplay continuation finds a paused engine', async () => {
    engineMock.getPlaybackState.mockReturnValue('paused');
    renderHook(() => useAutoPlayController());

    await act(async () => {
      useAppStore.getState().audio.startAutoPlay();
      await Promise.resolve();
    });
    await flush();

    expect(engineMock.resume).toHaveBeenCalledTimes(1);
    expect(engineMock.startAutomatic).not.toHaveBeenCalled();
  });

  it('delegates pause to the queue engine', async () => {
    const { result } = renderHook(() => useAutoPlayController());

    act(() => {
      result.current.handlePause();
    });
    await flush();

    expect(engineMock.pause).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().audio.isPaused).toBe(true);
  });

  it('does not mirror transient queue playback states back into user playback intent', async () => {
    renderHook(() => useAutoPlayController());
    await flush();
    const listeners = latestListeners();

    act(() => {
      useAppStore.getState().audio.startAutoPlay();
      useAppStore.getState().audio.pauseAutoPlay();
      useAppStore.getState().audio.setNeedsResume(true, 'suspended');
    });

    act(() => {
      listeners.onStateChanged?.({ state: 'buffering', previousState: 'idle', itemId: 'x', at: Date.now() });
    });

    expect(useAppStore.getState().audio.isAutoPlaying).toBe(true);
    expect(useAppStore.getState().audio.isPlaying).toBe(false);
    expect(useAppStore.getState().audio.isPaused).toBe(true);
    expect(useAppStore.getState().audio.needsResume).toBe(false);

    act(() => {
      listeners.onStateChanged?.({ state: 'paused', previousState: 'playing', itemId: 'x', at: Date.now() });
    });

    expect(useAppStore.getState().audio.isAutoPlaying).toBe(true);
    expect(useAppStore.getState().audio.isPlaying).toBe(false);
    expect(useAppStore.getState().audio.isPaused).toBe(true);

    act(() => {
      listeners.onStateChanged?.({ state: 'playing', previousState: 'paused', itemId: 'x', at: Date.now() });
    });

    expect(useAppStore.getState().audio.isAutoPlaying).toBe(true);
    expect(useAppStore.getState().audio.isPlaying).toBe(false);
    expect(useAppStore.getState().audio.isPaused).toBe(true);
  });

  it('mirrors native/media pause state into the autoplay store', async () => {
    renderHook(() => useAutoPlayController());
    await flush();

    act(() => {
      useAppStore.getState().audio.startAutoPlay();
    });

    act(() => {
      latestListeners().onStateChanged?.({ state: 'paused', previousState: 'playing', itemId: 'x', at: Date.now() });
    });

    expect(useAppStore.getState().audio.isAutoPlaying).toBe(true);
    expect(useAppStore.getState().audio.isPaused).toBe(true);
  });

  it('mirrors needs-user-resume into the autoplay store so the main button does not stay falsely active', async () => {
    renderHook(() => useAutoPlayController());
    await flush();

    act(() => {
      useAppStore.getState().audio.startAutoPlay();
    });
    expect(useAppStore.getState().audio.isPaused).toBe(false);

    act(() => {
      latestListeners().onStateChanged?.({
        state: 'needs-user-resume',
        previousState: 'suspended',
        itemId: 'x',
        at: Date.now(),
      });
    });

    expect(useAppStore.getState().audio.isAutoPlaying).toBe(true);
    expect(useAppStore.getState().audio.isPaused).toBe(true);
  });

  it('clears autoplay intent when the final non-repeating clip ends', async () => {
    setRepeatMode(false);
    renderHook(() => useAutoPlayController());
    await flush();
    engineMock.getItems.mockReturnValue([{ id: 'last' }]);

    act(() => {
      useAppStore.getState().audio.startAutoPlay();
      latestListeners().onClipEnded?.({ index: 0, repeatIndex: 1, repeatCount: 1 });
    });

    expect(useAppStore.getState().audio.isAutoPlaying).toBe(false);
    expect(useAppStore.getState().audio.isPaused).toBe(false);
  });

  it('delegates next and previous to the queue engine', async () => {
    const { result } = renderHook(() => useAutoPlayController());

    await act(async () => {
      await result.current.handleNext();
    });
    await flush();
    expect(engineMock.next).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.handlePrev();
    });
    await flush();
    expect(engineMock.previous).toHaveBeenCalledTimes(1);
  });

  it('syncs rate, volume, and repeat count into the engine on mount and on change', async () => {
    renderHook(() => useAutoPlayController());
    await flush();
    const store = useAppStore.getState();

    expect(engineMock.setRate).toHaveBeenCalledWith(store.settings.ttsRate);
    expect(engineMock.setVolume).toHaveBeenCalledWith(store.audio.volume);
    expect(engineMock.setDefaultRepeatCount).toHaveBeenCalledWith(
      store.settings.vocabRepeatCount || appConfig.get('settings.defaults.vocabRepeatCount', 3)
    );

    act(() => {
      useAppStore.getState().settings.updateSetting('ttsRate', 0.9);
    });
    await flush();
    expect(engineMock.setRate).toHaveBeenLastCalledWith(0.9);

    act(() => {
      useAppStore.getState().settings.updateSetting('vocabRepeatCount', 3);
    });
    await flush();
    expect(engineMock.setDefaultRepeatCount).toHaveBeenLastCalledWith(3);
  });

  it('mirrors plain repeat mode into the engine when autoSwitchBooks is off', async () => {
    useAppStore.getState().settings.updateSetting('autoSwitchBooks', false);
    setRepeatMode(false);
    renderHook(() => useAutoPlayController());
    await flush();

    expect(engineMock.setRepeatMode).toHaveBeenLastCalledWith(false);

    act(() => {
      setRepeatMode(true);
    });
    await flush();
    expect(engineMock.setRepeatMode).toHaveBeenLastCalledWith(true);
  });

  it('shows a notification and stops autoplay when the engine reports a playback failure', async () => {
    renderHook(() => useAutoPlayController());
    await flush();
    const notifySpy = vi
      .spyOn(useAppStore.getState().ui, 'showNotification')
      .mockImplementation(() => {});

    act(() => {
      useAppStore.getState().audio.startAutoPlay();
    });
    await flush();

    act(() => {
      latestListeners().onPlaybackFailed?.({
        item: { id: 'x', datasetId: 'd', index: 0, text: 'x', mediaTitle: 'x', mediaArtist: '', itemType: 'vocabulary' },
        index: 0,
        error: new Error('boom'),
        recoverable: false,
      });
    });
    await flush();

    expect(backgroundAudioService.stop).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith('Audio playback cannot start: boom', 'error');
    expect(useAppStore.getState().audio.isAutoPlaying).toBe(false);

    notifySpy.mockRestore();
  });

  it('handleResumeTap calls the gesture-safe queue resume path', async () => {
    const { result } = renderHook(() => useAutoPlayController());
    await flush();

    act(() => {
      result.current.handleResumeTap();
    });
    await flush();

    expect(engineMock.resume).toHaveBeenCalledTimes(1);
  });

  it('handleResumeTap clears isPaused explicitly, since needs-user-resume recovery has no other store write to undo its own pause mirror', async () => {
    const { result } = renderHook(() => useAutoPlayController());
    await flush();

    act(() => {
      useAppStore.getState().audio.startAutoPlay();
      latestListeners().onStateChanged?.({
        state: 'needs-user-resume',
        previousState: 'suspended',
        itemId: 'x',
        at: Date.now(),
      });
    });
    expect(useAppStore.getState().audio.isPaused).toBe(true);

    act(() => {
      result.current.handleResumeTap();
    });
    await flush();

    expect(useAppStore.getState().audio.isPaused).toBe(false);
  });

  it('shows resume-required state in the store when the engine reports it, and clears it once resumed', async () => {
    renderHook(() => useAutoPlayController());
    await flush();

    const listeners = latestListeners();
    act(() => {
      listeners.onResumeRequired?.({
        item: { id: 'x', datasetId: 'd', index: 0, text: 'x', mediaTitle: 'x', mediaArtist: '', itemType: 'vocabulary' },
        index: 0,
        reason: 'suspended',
      });
    });

    expect(useAppStore.getState().audio.needsResume).toBe(true);
    expect(useAppStore.getState().audio.resumeReason).toBe('suspended');

    act(() => {
      listeners.onStateChanged?.({ state: 'playing', previousState: 'needs-user-resume', itemId: 'x', at: Date.now() });
    });

    expect(useAppStore.getState().audio.needsResume).toBe(false);
    expect(useAppStore.getState().audio.resumeReason).toBe(null);
  });

  it('wires visibility and pageshow lifecycle events to checkForRecovery, and removes the listeners on unmount', async () => {
    const { unmount } = renderHook(() => useAutoPlayController());
    await flush();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
    });

    expect(engineMock.checkForRecovery).toHaveBeenCalledTimes(2);

    unmount();

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
    });

    // The effect's cleanup already removed these listeners on unmount, so
    // the call count stays the same rather than growing; a stray listener
    // left behind would double-count here.
    expect(engineMock.checkForRecovery).toHaveBeenCalledTimes(2);
  });
});
describe('useAutoPlayController - autoSwitchBooks and repeatMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    engineMock.getPlaybackState.mockReturnValue('idle');
    engineMock.getCurrentItem.mockReturnValue(null);
    engineMock.getCurrentIndex.mockReturnValue(0);
    useAppStore.getState().audio.stopAutoPlay();
    seedCurrentItem();
    useAppStore.getState().settings.updateSetting('practiceType', 'vocabulary');
    useAppStore.getState().settings.updateSetting('autoSwitchBooks', true);
    (loadDataset as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [{ english: 'next book word', id: 'next-book-1' }],
    });
  });

  afterEach(() => {
    useAppStore.getState().audio.stopAutoPlay();
    useAppStore.getState().settings.updateSetting('autoSwitchBooks', false);
    vi.useRealTimers();
  });

  it('switches to the next enabled book before looping, even with repeat mode on', async () => {
    vi.spyOn(appConfig, 'getVocabularyBookIds').mockReturnValue(['book-a', 'book-b']);
    useAppStore.getState().settings.updateSetting('vocabularyBook', 'book-a');
    setRepeatMode(true);
    useAppStore.getState().audio.startAutoPlay();

    renderHook(() => useAutoPlayController());
    engineMock.getItems.mockReturnValue([{ id: 'a1' }, { id: 'a2' }]);

    await act(async () => {
      latestListeners().onClipEnded?.({ index: 1, repeatIndex: 1, repeatCount: 1 });
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadDataset).toHaveBeenCalledWith('book-b');
    expect(useAppStore.getState().settings.vocabularyBook).toBe('book-b');
  });

  it('loops back to the first enabled book only after the final book, with repeat mode on', async () => {
    vi.spyOn(appConfig, 'getVocabularyBookIds').mockReturnValue(['book-a', 'book-b']);
    useAppStore.getState().settings.updateSetting('vocabularyBook', 'book-b');
    setRepeatMode(true);
    useAppStore.getState().audio.startAutoPlay();

    renderHook(() => useAutoPlayController());
    engineMock.getItems.mockReturnValue([{ id: 'b1' }]);

    await act(async () => {
      latestListeners().onClipEnded?.({ index: 0, repeatIndex: 1, repeatCount: 1 });
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadDataset).toHaveBeenCalledWith('book-a');
  });

  it('stops at the final enabled book when repeat mode is off, without switching', async () => {
    vi.spyOn(appConfig, 'getVocabularyBookIds').mockReturnValue(['book-a', 'book-b']);
    useAppStore.getState().settings.updateSetting('vocabularyBook', 'book-b');
    setRepeatMode(false);
    useAppStore.getState().audio.startAutoPlay();

    renderHook(() => useAutoPlayController());
    engineMock.getItems.mockReturnValue([{ id: 'b1' }]);

    await act(async () => {
      latestListeners().onClipEnded?.({ index: 0, repeatIndex: 1, repeatCount: 1 });
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadDataset).not.toHaveBeenCalled();
    expect(useAppStore.getState().audio.isAutoPlaying).toBe(false);
  });

  it('tells the engine not to loop the same queue itself while autoSwitchBooks is on', async () => {
    setRepeatMode(true);
    renderHook(() => useAutoPlayController());
    await act(async () => {
      await Promise.resolve();
    });

    // Book-level looping is handleAutoSwitchBooks's job; the engine looping
    // its own loaded queue at the same time would race with a book switch.
    expect(engineMock.setRepeatMode).toHaveBeenLastCalledWith(false);
  });
});
