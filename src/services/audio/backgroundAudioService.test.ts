import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundAudioService } from './backgroundAudioService';

/**
 * These tests focus on mode-selection, failure behavior, pause/resume vs
 * restart, and playback rate. The service must (a) reject on failure rather
 * than pretending to play, (b) resume a paused clip in place instead of
 * refetching/restarting, and (c) apply the configured playback rate. True
 * lock-screen playback is verified on-device, not here.
 */

const playSpy = vi.fn();
const pauseSpy = vi.fn();
let lastFakeAudio: FakeAudio | null = null;

// Minimal controllable stand-in for HTMLAudioElement.
class FakeAudio {
  private _src = '';
  private listeners = new Map<string, Array<() => void>>();
  preload = '';
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 1;
  loop = false;
  muted = false;
  playbackRate = 1;
  volume = 1;
  constructor() { lastFakeAudio = this; }
  get src() { return this._src; }
  set src(value: string) {
    if (this._src === value) return;
    const wasPlaying = !this.paused;
    this._src = value;
    if (wasPlaying) {
      this.paused = true;
      this.emit('pause');
    }
  }
  play() { playSpy(); this.paused = false; return Promise.resolve(); }
  pause() { pauseSpy(); this.paused = true; }
  load() { /* noop */ }
  setAttribute() { /* noop */ }
  removeAttribute() { this.src = ''; }
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

const successFetch = () =>
  vi.fn(async () => ({
    ok: true,
    json: async () => ({
      success: true,
      data: { audioBase64: btoa('audio-bytes'), contentType: 'audio/mpeg' },
    }),
  })) as unknown as typeof fetch;

let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;

describe('BackgroundAudioService', () => {
  beforeEach(() => {
    playSpy.mockClear();
    pauseSpy.mockClear();
    lastFakeAudio = null;
    vi.stubGlobal('Audio', FakeAudio);
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:mock';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => { /* noop */ };
  });

  afterEach(() => {
    (URL as unknown as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL = originalCreateObjectURL;
    (URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ---- failure behavior (no silent pretending) ----

  it('rejects empty text instead of pretending to play', async () => {
    const service = new BackgroundAudioService();
    await expect(service.playText('   ')).rejects.toThrow(/empty text/i);
  });

  it('fails loudly when premium TTS returns a fallback response', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ success: false, fallback: true }) })) as unknown as typeof fetch
    );
    await expect(service.playText('hello world')).rejects.toThrow(/unavailable/i);
  });

  it('rejects when the premium TTS request is not ok', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch
    );
    await expect(service.playText('hello world')).rejects.toThrow(/500/);
  });

  // ---- pause / resume / stop ----

  it('resumes the loaded clip on resume without refetching or restarting', async () => {
    const service = new BackgroundAudioService();
    const fetchMock = successFetch();
    vi.stubGlobal('fetch', fetchMock);

    await service.playText('hello world');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.getLoadedText()).toBe('hello world');
    expect(service.canResume()).toBe(false); // currently playing, not paused

    service.pause();
    expect(service.canResume()).toBe(true); // paused clip is resumable

    await service.resume();
    expect(fetchMock).toHaveBeenCalledTimes(1); // resume did not refetch
    expect(service.canResume()).toBe(false); // playing again
  });

  it('resumes a direct-url clip without requiring a Blob URL', async () => {
    const service = new BackgroundAudioService();

    await service.playTextFromUserGesture('hello world');
    expect(service.getLoadedText()).toBe('hello world');
    expect(service.isPlayingLoadedText('hello world')).toBe(true);

    service.pause();
    expect(service.canResume()).toBe(true);

    await service.resume();
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('does not report suspension when swapping the reusable element to the next clip', async () => {
    const service = new BackgroundAudioService();
    const onSuspended = vi.fn();
    service.setHandlers({ onSuspended });

    await service.playTextFromUserGesture('first clip');
    expect(lastFakeAudio?.paused).toBe(false);

    await service.playBlob('second clip', new Blob(['audio']), {});

    expect(onSuspended).not.toHaveBeenCalled();

    lastFakeAudio?.emit('pause');
    expect(onSuspended).toHaveBeenCalledTimes(1);
  });

  it('does not report suspension for the normal pause event at clip end', async () => {
    const service = new BackgroundAudioService();
    const onEnded = vi.fn();
    const onSuspended = vi.fn();
    service.setHandlers({ onEnded, onSuspended });

    await service.playTextFromUserGesture('short word');

    if (lastFakeAudio) {
      lastFakeAudio.ended = true;
      lastFakeAudio.paused = true;
      lastFakeAudio.emit('pause');
      lastFakeAudio.emit('ended');
    }

    expect(onSuspended).not.toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('does not report suspension when the browser pauses just before firing ended', async () => {
    const service = new BackgroundAudioService();
    const onEnded = vi.fn();
    const onSuspended = vi.fn();
    service.setHandlers({ onEnded, onSuspended });

    await service.playTextFromUserGesture('short word');

    if (lastFakeAudio) {
      lastFakeAudio.currentTime = 0.95;
      lastFakeAudio.duration = 1;
      lastFakeAudio.paused = true;
      lastFakeAudio.emit('pause');
      lastFakeAudio.ended = true;
      lastFakeAudio.emit('ended');
    }

    expect(onSuspended).not.toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('does not report suspension for normal waiting events while a new clip is loading', async () => {
    const service = new BackgroundAudioService();
    const onSuspended = vi.fn();
    service.setHandlers({ onSuspended });
    const secondPlay = new Promise<void>((resolve) => {
      vi.spyOn(FakeAudio.prototype, 'play').mockImplementationOnce(function play(this: FakeAudio) {
        this.paused = false;
        return Promise.resolve();
      }).mockImplementationOnce(function play(this: FakeAudio) {
        this.paused = false;
        return new Promise((innerResolve) => {
          resolve();
          innerResolve();
        });
      });
    });

    await service.playTextFromUserGesture('first clip');
    const loadingSecondClip = service.playBlob('second clip', new Blob(['audio']), {});

    lastFakeAudio?.emit('waiting');
    expect(onSuspended).not.toHaveBeenCalled();

    await secondPlay;
    await loadingSecondClip;

    lastFakeAudio?.emit('waiting');
    expect(onSuspended).toHaveBeenCalledTimes(1);
  });

  it('fully clears resumable state on stop', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('hello world');
    service.pause();
    expect(service.canResume()).toBe(true);

    service.stop();
    expect(service.canResume()).toBe(false);
    expect(service.getLoadedText()).toBeNull();
  });

  it('exposes the loaded text so a changed item is played fresh, not resumed', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('first item');
    service.pause();
    expect(service.canResume()).toBe(true);
    expect(service.getLoadedText()).toBe('first item');
    expect(service.getLoadedText()).not.toBe('second item');
  });

  // ---- playback rate ----

  it('applies the requested playback rate in playText', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('hello world', { rate: 1.5 });
    expect(lastFakeAudio?.playbackRate).toBe(1.5);
  });

  it('applies the current rate on resume', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('hello world', { rate: 1.25 });
    expect(lastFakeAudio?.playbackRate).toBe(1.25);

    service.pause();
    await service.resume(1.75);
    expect(lastFakeAudio?.playbackRate).toBe(1.75);
  });

  it('setRate updates the live element and is remembered for the next clip', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('hello world', { rate: 1.2 });
    expect(lastFakeAudio?.playbackRate).toBe(1.2);

    service.setRate(0.8);
    expect(lastFakeAudio?.playbackRate).toBe(0.8);

    await service.playText('next item');
    expect(lastFakeAudio?.playbackRate).toBe(0.8);
  });

  it('starts direct audio from the premium TTS URL for mobile user gestures', async () => {
    const service = new BackgroundAudioService();

    await service.playTextFromUserGesture('mobile play', { rate: 1.2, volume: 0.7 });

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(lastFakeAudio?.src).toContain('/api/premium-tts?');
    expect(lastFakeAudio?.src).toContain('format=audio');
    expect(lastFakeAudio?.src).toContain('text=mobile+play');
    expect(lastFakeAudio?.playbackRate).toBe(1.2);
    expect(lastFakeAudio?.volume).toBe(0.7);
  });

  it('sets compact media metadata with no artwork', async () => {
    const service = new BackgroundAudioService();
    let capturedMetadata: MediaMetadataInit | null = null;
    const originalMediaSession = Object.getOwnPropertyDescriptor(navigator, 'mediaSession');

    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        playbackState: 'none',
        setActionHandler: vi.fn(),
      },
    });
    vi.stubGlobal('MediaMetadata', class {
      constructor(metadata: MediaMetadataInit) {
        capturedMetadata = metadata;
      }
    });

    try {
      await service.playTextFromUserGesture('consoles', {
        mediaTitle: 'consoles',
        mediaArtist: 'KON-solz',
      });

      expect(capturedMetadata).toEqual({
        title: 'consoles',
        artist: 'KON-solz',
        artwork: [],
      });

      await service.playTextFromUserGesture('unknown word', {
        mediaTitle: 'unknown word',
        mediaArtist: '',
      });

      expect(capturedMetadata).toEqual({
        title: 'unknown word',
        artist: '',
        artwork: [],
      });
    } finally {
      if (originalMediaSession) {
        Object.defineProperty(navigator, 'mediaSession', originalMediaSession);
      } else {
        delete (navigator as { mediaSession?: MediaSession }).mediaSession;
      }
    }
  });

  // ---- volume ----

  it('applies the requested volume in playText', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('hello world', { volume: 0.5 });
    expect(lastFakeAudio?.volume).toBe(0.5);
  });

  it('applies the current volume on resume', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('hello world', { rate: 1, volume: 0.6 });
    expect(lastFakeAudio?.volume).toBe(0.6);

    service.pause();
    await service.resume(1, 0.2);
    expect(lastFakeAudio?.volume).toBe(0.2);
  });

  it('setVolume updates the live element and is remembered for the next clip', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('hello world', { volume: 0.8 });
    expect(lastFakeAudio?.volume).toBe(0.8);

    // Live change (e.g. the store volume slider moved mid-playback).
    service.setVolume(0.3);
    expect(lastFakeAudio?.volume).toBe(0.3);

    // A later clip without an explicit volume keeps the last known volume.
    await service.playText('next item');
    expect(lastFakeAudio?.volume).toBe(0.3);
  });

  it('setVolume before any clip is loaded applies on the next play', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    service.setVolume(0.4); // no audio element exists yet
    await service.playText('hello world');
    expect(lastFakeAudio?.volume).toBe(0.4);
  });

  // ---- priming safety ----

  it('clears previous real-clip state when priming for a user gesture', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    await service.playText('real clip');
    service.pause();
    expect(service.canResume()).toBe(true);
    expect(service.getLoadedText()).toBe('real clip');

    service.primeForUserGesture();
    // The silent priming clip must not look like a resumable real clip.
    expect(service.canResume()).toBe(false);
    expect(service.getLoadedText()).toBeNull();
  });

  it('keeps the priming audio playing muted so mobile can swap in real audio after fetch', () => {
    const service = new BackgroundAudioService();

    service.primeForUserGesture();

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(lastFakeAudio?.paused).toBe(false);
    expect(lastFakeAudio?.loop).toBe(true);
    expect(lastFakeAudio?.muted).toBe(true);
    expect(service.canResume()).toBe(false);
    expect(service.getLoadedText()).toBeNull();
  });

  it('does not pause a later real clip when a priming promise resolves late', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal('fetch', successFetch());

    // Force the priming play() to resolve on demand, so it can resolve AFTER the
    // real clip has started (the dangerous race).
    let resolvePrime: () => void = () => { /* noop */ };
    const primePromise = new Promise<void>((res) => { resolvePrime = res; });
    const playSpyOnce = vi.spyOn(FakeAudio.prototype, 'play').mockImplementationOnce(() => {
      if (lastFakeAudio) lastFakeAudio.paused = false;
      return primePromise;
    });

    service.primeForUserGesture();        // priming play() -> controlled primePromise
    await service.playText('real clip');  // real clip swaps in a Blob URL and plays
    expect(lastFakeAudio?.paused).toBe(false);

    resolvePrime();                        // priming resolves LATE
    await primePromise;
    await Promise.resolve();

    // The late priming resolution must not have paused the real clip.
    expect(lastFakeAudio?.paused).toBe(false);
    playSpyOnce.mockRestore();
  });

  // ---- handler ownership (fix-tts-engine-handler-conflict) ----

  it('notifies the previous handlers of onOwnershipLost when a different caller takes over', () => {
    const service = new BackgroundAudioService();
    const onOwnershipLost = vi.fn();
    const queueHandlers = { onEnded: vi.fn(), onOwnershipLost };
    const manualTapHandlers = { onEnded: vi.fn() };

    service.setHandlers(queueHandlers);
    expect(onOwnershipLost).not.toHaveBeenCalled();

    service.setHandlers(manualTapHandlers);
    expect(onOwnershipLost).toHaveBeenCalledTimes(1);
  });

  it('does not fire onOwnershipLost when a caller re-registers its own handlers object', () => {
    const service = new BackgroundAudioService();
    const onOwnershipLost = vi.fn();
    const handlers = { onEnded: vi.fn(), onOwnershipLost };

    service.setHandlers(handlers);
    service.setHandlers(handlers); // same reference: reasserting its own ownership
    service.setHandlers(handlers);

    expect(onOwnershipLost).not.toHaveBeenCalled();
  });
});
