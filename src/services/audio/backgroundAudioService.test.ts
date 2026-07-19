import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundAudioService } from './backgroundAudioService';

/**
 * These tests focus on mode-selection, failure behavior, and pause/resume vs
 * restart. The service must (a) reject on failure rather than pretending to
 * play, and (b) resume a paused clip in place instead of refetching/restarting.
 * True lock-screen playback is verified on-device, not here.
 */

const playSpy = vi.fn();
const pauseSpy = vi.fn();

// Minimal controllable stand-in for HTMLAudioElement.
class FakeAudio {
  src = '';
  preload = '';
  paused = true;
  ended = false;
  play() { playSpy(); this.paused = false; return Promise.resolve(); }
  pause() { pauseSpy(); this.paused = true; }
  load() { /* noop */ }
  setAttribute() { /* noop */ }
  removeAttribute() { this.src = ''; }
  addEventListener() { /* noop */ }
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
    // The controller only resumes when the loaded text matches the current item.
    expect(service.getLoadedText()).not.toBe('second item');
  });
});
