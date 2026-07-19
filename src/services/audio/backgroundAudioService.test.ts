import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundAudioService } from './backgroundAudioService';

/**
 * These tests focus on mode-selection and failure behavior: the service must
 * reject (so callers can surface an error) rather than silently pretending
 * background playback succeeded. Successful playback depends on a real audio
 * device and is verified on-device, not here.
 */
describe('BackgroundAudioService', () => {
  beforeEach(() => {
    // Ensure the environment reports background audio as supported so playText
    // reaches its input/response validation rather than the support guard.
    const g = globalThis as unknown as { Audio?: unknown };
    if (typeof g.Audio === 'undefined') {
      g.Audio = class {
        preload = '';
        src = '';
        play() { return Promise.resolve(); }
        pause() { /* noop */ }
        load() { /* noop */ }
        setAttribute() { /* noop */ }
        removeAttribute() { /* noop */ }
        addEventListener() { /* noop */ }
      };
    }
    if (typeof URL.createObjectURL !== 'function') {
      (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:mock';
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => { /* noop */ };
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects empty text instead of pretending to play', async () => {
    const service = new BackgroundAudioService();
    await expect(service.playText('   ')).rejects.toThrow(/empty text/i);
  });

  it('fails loudly when premium TTS returns a fallback response', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ success: false, fallback: true }),
      })) as unknown as typeof fetch
    );

    await expect(service.playText('hello world')).rejects.toThrow(/unavailable/i);
  });

  it('rejects when the premium TTS request is not ok', async () => {
    const service = new BackgroundAudioService();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })) as unknown as typeof fetch
    );

    await expect(service.playText('hello world')).rejects.toThrow(/500/);
  });
});
