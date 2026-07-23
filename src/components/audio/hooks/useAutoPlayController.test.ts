import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the audio services so the Play gesture can be tested without real audio
// or network. The direct real-audio start must happen inside the Play gesture
// for mobile/PWA browser policy.
vi.mock('../../../services/audio/backgroundAudioService', () => ({
  backgroundAudioService: {
    primeForUserGesture: vi.fn(),
    playTextFromUserGesture: vi.fn().mockResolvedValue(undefined),
    playText: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    stop: vi.fn(),
    setHandlers: vi.fn(),
    setRate: vi.fn(),
    setVolume: vi.fn(),
    canResume: vi.fn(() => false),
    getLoadedText: vi.fn(() => null),
    isPlayingLoadedText: vi.fn(() => false),
  },
}));

vi.mock('../../../services/audio/TTSEngine', () => ({
  ttsEngine: {
    speak: vi.fn().mockResolvedValue(undefined),
    stopSpeaking: vi.fn().mockResolvedValue(undefined),
  },
}));

import { backgroundAudioService } from '../../../services/audio/backgroundAudioService';
import { useAppStore } from '../../../stores';
import { useAutoPlayController } from './useAutoPlayController';

const seedCurrentItem = () => {
  const store = useAppStore.getState();
  store.vocabulary.setCurrentItem(
    { english: 'hello', id: 'test-1' } as unknown as Parameters<typeof store.vocabulary.setCurrentItem>[0]
  );
};

describe('useAutoPlayController - Play gesture audio start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().audio.stopAutoPlay();
    seedCurrentItem();
  });

  afterEach(() => {
    useAppStore.getState().audio.stopAutoPlay();
  });

  it('starts the current real-audio clip directly inside the Play gesture', () => {
    useAppStore.getState().settings.updateSetting('backgroundAudioMode', true);

    const { result } = renderHook(() => useAutoPlayController());
    act(() => {
      result.current.handlePlay();
    });

    expect(backgroundAudioService.playTextFromUserGesture).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({ rate: expect.any(Number), volume: expect.any(Number) })
    );
    expect(backgroundAudioService.primeForUserGesture).not.toHaveBeenCalled();
  });

  it('passes British sounds-like text as the second media-session row', () => {
    const store = useAppStore.getState();
    store.vocabulary.setCurrentItem(
      {
        english: 'consoles',
        id: 'metadata-test',
        phonetic: { british: 'KON-solz' },
      } as unknown as Parameters<typeof store.vocabulary.setCurrentItem>[0]
    );

    const { result } = renderHook(() => useAutoPlayController());
    act(() => {
      result.current.handlePlay();
    });

    expect(backgroundAudioService.playTextFromUserGesture).toHaveBeenCalledWith(
      'consoles',
      expect.objectContaining({
        mediaTitle: 'consoles',
        mediaArtist: 'KON-solz',
      })
    );
  });

  it('still starts real audio directly when the legacy Background Audio Mode setting is off', () => {
    useAppStore.getState().settings.updateSetting('backgroundAudioMode', false);

    const { result } = renderHook(() => useAutoPlayController());
    act(() => {
      result.current.handlePlay();
    });

    expect(backgroundAudioService.playTextFromUserGesture).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({ rate: expect.any(Number), volume: expect.any(Number) })
    );
  });

  it('surfaces an error when direct mobile audio start is rejected', async () => {
    const playError = new Error('mobile playback rejected');
    (backgroundAudioService.playTextFromUserGesture as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(playError);

    const notifySpy = vi
      .spyOn(useAppStore.getState().ui, 'showNotification')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAutoPlayController());
    await act(async () => {
      result.current.handlePlay();
      await Promise.resolve();
    });

    expect(backgroundAudioService.stop).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('Premium audio'), 'error');
    expect(useAppStore.getState().audio.isAutoPlaying).toBe(false);

    notifySpy.mockRestore();
  });
});

describe('useAutoPlayController - playback error handling', () => {
  const flushAutoPlay = async () => {
    await act(async () => {
      useAppStore.getState().audio.startAutoPlay();
      // Let the effect and its async playback chain settle.
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().audio.stopAutoPlay();
    const store = useAppStore.getState();
    store.vocabulary.setCurrentItem(
      { english: 'hello', id: 'abort-test' } as unknown as Parameters<typeof store.vocabulary.setCurrentItem>[0]
    );
  });

  afterEach(() => {
    useAppStore.getState().audio.stopAutoPlay();
  });

  it('does not surface an error or stop autoplay when playback is aborted or superseded', async () => {
    // An intentional supersession (e.g. a list-item click during autoplay)
    // aborts the in-flight fetch; playText rejects with an AbortError.
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    (backgroundAudioService.playText as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

    const notifySpy = vi
      .spyOn(useAppStore.getState().ui, 'showNotification')
      .mockImplementation(() => {});

    renderHook(() => useAutoPlayController());
    await flushAutoPlay();

    expect(backgroundAudioService.playText).toHaveBeenCalled();
    // No false "premium audio unavailable" message, and autoplay is left running.
    expect(notifySpy).not.toHaveBeenCalled();
    expect(useAppStore.getState().audio.isAutoPlaying).toBe(true);

    notifySpy.mockRestore();
  });

  it('surfaces an error and stops autoplay when the TTS request genuinely fails', async () => {
    const realFailure = new Error('Premium TTS is unavailable for background audio');
    (backgroundAudioService.playText as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(realFailure);

    const notifySpy = vi
      .spyOn(useAppStore.getState().ui, 'showNotification')
      .mockImplementation(() => {});

    renderHook(() => useAutoPlayController());
    await flushAutoPlay();

    expect(backgroundAudioService.playText).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('Premium audio'), 'error');
    expect(useAppStore.getState().audio.isAutoPlaying).toBe(false);

    notifySpy.mockRestore();
  });
});
