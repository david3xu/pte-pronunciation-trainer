import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the audio services so the Play gesture can be tested without real audio
// or network. Only the priming call is asserted here.
vi.mock('../../../services/audio/backgroundAudioService', () => ({
  backgroundAudioService: {
    primeForUserGesture: vi.fn(),
    playText: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    stop: vi.fn(),
    setHandlers: vi.fn(),
    canResume: vi.fn(() => false),
    getLoadedText: vi.fn(() => null),
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

describe('useAutoPlayController — Play gesture priming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().audio.stopAutoPlay();
    seedCurrentItem();
  });

  afterEach(() => {
    useAppStore.getState().audio.stopAutoPlay();
  });

  it('primes the audio element on Play when Background Audio Mode is on', () => {
    useAppStore.getState().settings.updateSetting('backgroundAudioMode', true);

    const { result } = renderHook(() => useAutoPlayController());
    act(() => {
      result.current.handlePlay();
    });

    expect(backgroundAudioService.primeForUserGesture).toHaveBeenCalledTimes(1);
  });

  it('does not prime on Play when Background Audio Mode is off', () => {
    useAppStore.getState().settings.updateSetting('backgroundAudioMode', false);

    const { result } = renderHook(() => useAutoPlayController());
    act(() => {
      result.current.handlePlay();
    });

    expect(backgroundAudioService.primeForUserGesture).not.toHaveBeenCalled();
  });
});
