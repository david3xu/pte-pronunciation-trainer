import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ListenerCallback = (data?: { message?: string; shouldResume?: boolean }) => void;
const pluginMock = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  setRate: vi.fn().mockResolvedValue(undefined),
  setVolume: vi.fn().mockResolvedValue(undefined),
  getState: vi.fn().mockResolvedValue({ loadedText: null, canResume: false }),
  addListener: vi.fn(),
  removeAllListeners: vi.fn().mockResolvedValue(undefined),
};

const backgroundAudioServiceMock = {
  fetchAudioBase64: vi.fn().mockResolvedValue({
    audioBase64: 'YXVkaW8=',
    contentType: 'audio/mpeg',
  }),
  fetchAudioBlob: vi.fn().mockResolvedValue({
    blob: new Blob(['audio'], { type: 'audio/mpeg' }),
    contentType: 'audio/mpeg',
  }),
};

vi.mock('./backgroundAudioPlugin', () => ({
  default: pluginMock,
}));

vi.mock('./backgroundAudioService', () => ({
  backgroundAudioService: backgroundAudioServiceMock,
}));

/**
 * Captures every listener nativeAudioService registers via
 * BackgroundAudio.addListener(eventName, callback), keyed by event name, so
 * tests can fire them directly to simulate the native side without needing
 * an actual Capacitor bridge or device.
 */
const getRegisteredListener = (eventName: string): ListenerCallback => {
  const call = pluginMock.addListener.mock.calls.find(([name]) => name === eventName);
  if (!call) {
    throw new Error(`No listener was registered for "${eventName}"`);
  }
  return call[1] as ListenerCallback;
};

describe('NativeAudioService', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    pluginMock.play.mockResolvedValue(undefined);
    pluginMock.getState.mockResolvedValue({ loadedText: null, canResume: false });
    backgroundAudioServiceMock.fetchAudioBase64.mockResolvedValue({
      audioBase64: 'YXVkaW8=',
      contentType: 'audio/mpeg',
    });
    backgroundAudioServiceMock.fetchAudioBlob.mockResolvedValue({
      blob: new Blob(['audio'], { type: 'audio/mpeg' }),
      contentType: 'audio/mpeg',
    });
    // Fresh module instance per test: listenersBound and all local state
    // (currentText, isPaused, handlers) must not leak between tests.
    vi.resetModules();
  });

  // Some tests below use vi.useFakeTimers() and do not restore real timers
  // at their own end, relying on the beforeEach above for the next test in
  // this file. That protects tests within this file but not whichever test
  // file Vitest happens to run next in the same worker; a leaked fake clock
  // there can hang anything awaiting a real setTimeout. This is the one
  // place that must run unconditionally, so nothing after this file's last
  // test is ever left with fake timers armed.
  afterEach(() => {
    vi.useRealTimers();
  });

  const loadService = async () => {
    const module = await import('./nativeAudioService');
    return module.nativeAudioService;
  };

  it('ended clears loaded text and paused state', async () => {
    const service = await loadService();
    const onEnded = vi.fn();
    service.setHandlers({ onEnded });

    // Simulate having something loaded and paused before the clip ends.
    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    service.pause();
    expect(service.canResume()).toBe(true);
    expect(service.getLoadedText()).toBe('hello');

    getRegisteredListener('ended')();

    expect(service.getLoadedText()).toBeNull();
    expect(service.canResume()).toBe(false);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('interrupted marks paused before notifying handlers', async () => {
    const service = await loadService();
    const callOrder: string[] = [];
    const onSuspended = vi.fn(() => {
      // Assert state is already updated by the time the handler runs, not
      // just eventually -- this is the exact ordering the fix depends on.
      callOrder.push(`onSuspended saw canResume=${service.canResume()}`);
    });
    service.setHandlers({ onSuspended });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    expect(service.canResume()).toBe(false); // still playing, not paused yet

    getRegisteredListener('interrupted')();

    expect(onSuspended).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['onSuspended saw canResume=true']);
    expect(service.getLoadedText()).toBe('hello'); // text stays; only paused state changes
  });

  it('a route change relays interruptionEnded(shouldResume: false) after the deferred interrupted signal', async () => {
    const service = await loadService();
    const onSuspended = vi.fn();
    const onInterruptionEnded = vi.fn();
    service.setHandlers({ onSuspended, onInterruptionEnded });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));

    // A route change has no real "ended" signal, so handleRouteChange
    // follows interrupted with a synthetic interruptionEnded(false).
    getRegisteredListener('interrupted')();
    getRegisteredListener('interruptionEnded')({ shouldResume: false });

    expect(onSuspended).toHaveBeenCalledWith({ deferRecovery: true });
    expect(onInterruptionEnded).toHaveBeenCalledWith(false);
  });

  it('prefetches native base64 and consumes it on playText without refetching', async () => {
    backgroundAudioServiceMock.fetchAudioBase64.mockResolvedValueOnce({
      audioBase64: 'cHJlZmV0Y2hlZA==',
      contentType: 'audio/mpeg',
    });
    const service = await loadService();

    await service.prefetchText('hello', { rate: 1.1, voiceId: 'voice-a' });
    await service.playText('hello', { rate: 1.1, voiceId: 'voice-a' });

    expect(backgroundAudioServiceMock.fetchAudioBase64).toHaveBeenCalledTimes(1);
    expect(pluginMock.play).toHaveBeenCalledWith(expect.objectContaining({
      base64Audio: 'cHJlZmV0Y2hlZA==',
      text: 'hello',
    }));
  });

  it('falls back to direct base64 fetch when native prefetch is missing', async () => {
    const service = await loadService();

    await service.playText('hello');

    expect(backgroundAudioServiceMock.fetchAudioBase64).toHaveBeenCalledTimes(1);
    expect(pluginMock.play).toHaveBeenCalledWith(expect.objectContaining({
      base64Audio: 'YXVkaW8=',
      text: 'hello',
    }));
  });

  it('remotePause updates state and calls handler', async () => {
    const service = await loadService();
    const onPause = vi.fn();
    service.setHandlers({ onPause });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    expect(service.canResume()).toBe(false);

    getRegisteredListener('remotePause')();

    expect(service.canResume()).toBe(true);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('remotePlay updates state and calls handler', async () => {
    const service = await loadService();
    const onPlay = vi.fn();
    service.setHandlers({ onPlay });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    service.pause();
    expect(service.canResume()).toBe(true);

    getRegisteredListener('remotePlay')();

    expect(service.canResume()).toBe(false);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('remoteStop clears loaded text', async () => {
    const service = await loadService();
    const onStop = vi.fn();
    service.setHandlers({ onStop });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    expect(service.getLoadedText()).toBe('hello');

    getRegisteredListener('remoteStop')();

    expect(service.getLoadedText()).toBeNull();
    expect(service.canResume()).toBe(false);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('setHandlers fires onOwnershipLost on the previous handlers when replaced by a different object', async () => {
    const service = await loadService();
    const onOwnershipLost = vi.fn();
    const firstHandlers = { onOwnershipLost };
    const secondHandlers = { onEnded: vi.fn() };

    service.setHandlers(firstHandlers);
    service.setHandlers(secondHandlers);

    expect(onOwnershipLost).toHaveBeenCalledTimes(1);
  });

  it('setHandlers does not fire onOwnershipLost when the same object re-registers', async () => {
    const service = await loadService();
    const onOwnershipLost = vi.fn();
    const handlers = { onOwnershipLost };

    service.setHandlers(handlers);
    service.setHandlers(handlers);

    expect(onOwnershipLost).not.toHaveBeenCalled();
  });

  it('fires ended from the native duration fallback if the bridge event is missed', async () => {
    vi.useFakeTimers();
    pluginMock.play.mockResolvedValueOnce({ duration: 1 });
    const service = await loadService();
    const onEnded = vi.fn();
    service.setHandlers({ onEnded });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    expect(onEnded).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2999);
    expect(onEnded).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(service.getLoadedText()).toBeNull();
    expect(service.canResume()).toBe(false);
  });

  it('cancels the duration fallback when the native ended event arrives first', async () => {
    vi.useFakeTimers();
    pluginMock.play.mockResolvedValueOnce({ duration: 1 });
    const service = await loadService();
    const onEnded = vi.fn();
    service.setHandlers({ onEnded });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    getRegisteredListener('ended')();
    await vi.advanceTimersByTimeAsync(3000);

    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('ignores stale ended events after fallback already advanced', async () => {
    vi.useFakeTimers();
    pluginMock.play.mockResolvedValueOnce({ duration: 1 });
    const service = await loadService();
    const onEnded = vi.fn();
    service.setHandlers({ onEnded });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    await vi.advanceTimersByTimeAsync(3000);
    getRegisteredListener('ended')();

    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('cancels the duration fallback on pause and stop', async () => {
    vi.useFakeTimers();
    pluginMock.play.mockResolvedValueOnce({ duration: 1 });
    const service = await loadService();
    const onEnded = vi.fn();
    service.setHandlers({ onEnded });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    service.pause();
    await vi.advanceTimersByTimeAsync(3000);
    expect(onEnded).not.toHaveBeenCalled();

    pluginMock.play.mockResolvedValueOnce({ duration: 1 });
    await service.playBlob('again', new Blob(['audio'], { type: 'audio/mpeg' }));
    service.stop();
    await vi.advanceTimersByTimeAsync(3000);

    expect(onEnded).not.toHaveBeenCalled();
  });

  it('rearms the duration fallback after pause then resume, not only on the original play', async () => {
    vi.useFakeTimers();
    pluginMock.play.mockResolvedValueOnce({ duration: 1 });
    const service = await loadService();
    const onEnded = vi.fn();
    service.setHandlers({ onEnded });

    await service.playBlob('hello', new Blob(['audio'], { type: 'audio/mpeg' }));
    service.pause();
    await vi.advanceTimersByTimeAsync(3000);
    expect(onEnded).not.toHaveBeenCalled(); // paused: no fallback should fire

    await service.resume();
    await vi.advanceTimersByTimeAsync(2999);
    expect(onEnded).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale duration fallback after a new clip starts', async () => {
    vi.useFakeTimers();
    pluginMock.play
      .mockResolvedValueOnce({ duration: 1 })
      .mockResolvedValueOnce({ duration: 2 });
    const service = await loadService();
    const onEnded = vi.fn();
    service.setHandlers({ onEnded });

    await service.playBlob('first', new Blob(['audio'], { type: 'audio/mpeg' }));
    await service.playBlob('second', new Blob(['audio'], { type: 'audio/mpeg' }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(onEnded).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3000);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

});
