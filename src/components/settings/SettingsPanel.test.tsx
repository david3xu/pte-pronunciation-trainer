import { act, render, screen, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { appConfig } from '../../config/AppConfig';
import { useAppStore } from '../../stores';
import type { VocabularyTerm } from '../../types/dataset.types';
import SettingsPanel from './SettingsPanel';

const audioServiceMock = vi.hoisted(() => ({
  stop: vi.fn(() => Promise.resolve()),
  setRate: vi.fn(),
  setVolume: vi.fn(),
}));

const ttsEngineMock = vi.hoisted(() => ({
  stopSpeaking: vi.fn(),
}));

const clearLocalAppDataMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

const loadDatasetMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/audio/audioServiceForPlatform', () => ({
  audioServiceForPlatform: audioServiceMock,
}));

vi.mock('../../services/audio/TTSEngine', () => ({
  ttsEngine: ttsEngineMock,
}));

vi.mock('../../services/appDataReset', () => ({
  clearLocalAppData: clearLocalAppDataMock,
}));

vi.mock('../../services/dataset/datasetLoader', () => ({
  loadDataset: loadDatasetMock,
}));

vi.mock('../../services/audio/backgroundAudioService', () => ({
  backgroundAudioService: {
    primeForUserGesture: vi.fn(),
  },
}));

const defaultDataset: VocabularyTerm[] = [
  {
    word: 'default',
    ipa: { single: '/default/' },
    phonetic: { single: 'default' },
    difficulty: 'easy',
    category: 'pte-fib-listening',
  },
];

const openAdvancedTab = async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <SettingsPanel isOpen onClose={vi.fn()} />
    </Theme>
  );
  await user.click(screen.getByRole('tab', { name: /Advanced/ }));
  return user;
};

describe('SettingsPanel reset actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'alert', {
      configurable: true,
      value: vi.fn(),
    });
    loadDatasetMock.mockResolvedValue({ items: defaultDataset });

    act(() => {
      const store = useAppStore.getState();
      store.settings.resetSettings();
      store.progress.resetProgress();
      store.vocabulary.clearDataset();
      store.settings.updateSetting('practiceType', 'practice');
      store.settings.updateSetting('practiceMode', 'practice-write-from-dictation');
      store.settings.updateSetting('ttsRate', 1.5);
      store.audio.setAutoPlay(false);
      store.audio.toggleRepeat();
      store.audio.setVolume(0.4);
      store.audio.startAutoPlay();
      store.audio.pauseAutoPlay();
      store.progress.markItemCompleted('old-item', true);
    });
  });

  it('resets settings and reloads the default vocabulary dataset', async () => {
    const user = await openAdvancedTab();

    await user.click(screen.getByRole('button', { name: 'Reset All Settings' }));

    await waitFor(() => {
      expect(loadDatasetMock).toHaveBeenCalledWith(appConfig.getDefaultVocabularyBookId());
    });

    const state = useAppStore.getState();
    expect(ttsEngineMock.stopSpeaking).toHaveBeenCalledTimes(1);
    expect(audioServiceMock.stop).toHaveBeenCalledTimes(1);
    expect(audioServiceMock.setRate).toHaveBeenCalledWith(appConfig.get<number>('settings.defaults.ttsRate', 0.7));
    expect(audioServiceMock.setVolume).toHaveBeenCalledWith(1);
    expect(state.settings.practiceType).toBe('vocabulary');
    expect(state.settings.practiceMode).toBeNull();
    expect(state.settings.ttsRate).toBe(appConfig.get<number>('settings.defaults.ttsRate', 0.7));
    expect(state.audio.autoPlayEnabled).toBe(true);
    expect(state.audio.repeatMode).toBe(true);
    expect(state.audio.volume).toBe(1);
    expect(state.vocabulary.mode).toBe(appConfig.getDefaultVocabularyBookId());
    expect(state.vocabulary.currentItem).toBe(defaultDataset[0]);
    expect(clearLocalAppDataMock).not.toHaveBeenCalled();
  });

  it('clears local data, resets progress, and reloads the default dataset', async () => {
    const user = await openAdvancedTab();

    await user.click(screen.getByRole('button', { name: 'Clear Local Data' }));

    await waitFor(() => {
      expect(clearLocalAppDataMock).toHaveBeenCalledTimes(1);
      expect(loadDatasetMock).toHaveBeenCalledWith(appConfig.getDefaultVocabularyBookId());
    });

    const state = useAppStore.getState();
    expect(ttsEngineMock.stopSpeaking).toHaveBeenCalledTimes(1);
    expect(audioServiceMock.stop).toHaveBeenCalledTimes(1);
    expect(state.settings.practiceType).toBe('vocabulary');
    expect(state.progress.completedItems.size).toBe(0);
    expect(state.progress.completedItemsByDataset).toEqual({});
    expect(state.progress.activeDatasetId).toBe(appConfig.getDefaultVocabularyBookId());
    expect(state.vocabulary.mode).toBe(appConfig.getDefaultVocabularyBookId());
  });
});
