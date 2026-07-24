import { beforeEach, describe, expect, it, vi } from 'vitest';

type ListenerCallback = (data?: { message?: string }) => void;

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

vi.mock('./backgroundAudioPlugin', () => ({
  default: pluginMock,
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
    // Fresh module instance per test: listenersBound and all local state
    // (currentText, isPaused, handlers) must not leak between tests.
    vi.resetModules();
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
