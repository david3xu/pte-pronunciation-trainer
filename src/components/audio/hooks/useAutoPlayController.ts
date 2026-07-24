import { useEffect } from 'react';
import { appConfig } from '../../../config/AppConfig';
import { AudioQueueEngine, type QueueItem } from '../../../services/audio/audioQueueEngine';
import { audioServiceForPlatform } from '../../../services/audio/audioServiceForPlatform';
import { loadDataset } from '../../../services/dataset/datasetLoader';
import { useAppStore, useAudioState, useSettings, useVocabulary } from '../../../stores';
import type { Difficulty, PracticeItem, VocabularyItem } from '../../../types/dataset.types';
import { cleanText } from '../../../utils/textUtils';

type LearningItem = (VocabularyItem | PracticeItem) & Partial<{
  english: string;
  fullText: string;
  pronunciation: {
    british?: { phonetic?: string };
    phonetic?: string;
    single?: { phonetic?: string };
  };
}>;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

const getItemText = (item: LearningItem): string | undefined => {
  if (item.fullText) return item.fullText.replace(/\|/g, ' ');
  if ('word' in item) return item.word;
  if (item.english) return item.english;
  if ('sentence' in item) return item.sentence;
  if ('question' in item) return item.question;
  return undefined;
};

const getBritishSoundsLike = (item: LearningItem): string | undefined => {
  if ('phonetic' in item) {
    return item.phonetic.british || item.phonetic.single;
  }
  return item.pronunciation?.british?.phonetic
    || item.pronunciation?.phonetic
    || item.pronunciation?.single?.phonetic;
};

const getLockScreenMetadata = (
  text: string,
  item: LearningItem
): { mediaTitle: string; mediaArtist: string } => {
  const soundsLike = getBritishSoundsLike(item);
  return soundsLike
    ? { mediaTitle: soundsLike, mediaArtist: text }
    : { mediaTitle: text, mediaArtist: '' };
};

const getItemId = (item: LearningItem, index: number, datasetId: string): string => {
  if ('id' in item && typeof item.id === 'string' && item.id.length > 0) return item.id;
  const text = getItemText(item) || '';
  return `${datasetId}-${index}-${text}`;
};

const getDelay = (path: string, fallback: number): number => {
  const configuredDelay = appConfig.get(path);
  return typeof configuredDelay === 'number' ? configuredDelay : fallback;
};

/** Vocabulary items carry difficulty/category flat; practice items nest them
 * under metadata. Narrowing on the metadata field (present on every practice
 * item variant, absent on vocabulary items) avoids needing an `as any` cast. */
const getItemDifficultyAndCategory = (
  item: LearningItem
): { difficulty?: Difficulty; category?: string } => {
  if ('metadata' in item) {
    return { difficulty: item.metadata.difficulty, category: item.metadata.category };
  }
  return { difficulty: item.difficulty, category: item.category };
};

const getDefaultRepeatCountForDifficulty = (difficulty?: Difficulty): 1 | 3 | 5 => {
  const repeatDefaults = appConfig.get<Record<Difficulty, 1 | 3 | 5>>(
    'settings.defaults.wordRepeatCount',
    { easy: 1, normal: 3, hard: 5 }
  );
  return difficulty ? repeatDefaults[difficulty] : repeatDefaults.normal;
};

const toQueueItem = (
  item: LearningItem,
  index: number,
  datasetId: string,
  itemType: 'vocabulary' | 'practice'
): QueueItem => {
  const textToSpeak = getItemText(item) || '';
  const cleanedText = cleanText(textToSpeak);
  const metadata = getLockScreenMetadata(cleanedText, item);
  const soundsLike = getBritishSoundsLike(item);
  const { difficulty, category } = getItemDifficultyAndCategory(item);

  return {
    id: getItemId(item, index, datasetId),
    datasetId,
    index,
    text: cleanedText,
    mediaTitle: metadata.mediaTitle,
    mediaArtist: metadata.mediaArtist,
    itemType,
    soundsLike,
    difficulty,
    category,
    repeatCount: getDefaultRepeatCountForDifficulty(difficulty),
  };
};
/**
 * Long-lived queue engine instance, created once and reused across renders.
 */
export const queueEngine = new AudioQueueEngine(audioServiceForPlatform);

export const useAutoPlayController = () => {
  const audio = useAudioState();
  const vocabulary = useVocabulary();
  const settings = useSettings();
  const { currentItem } = vocabulary;
  const { difficultyFilter } = settings;

  const getActiveDataset = () => (
    difficultyFilter !== 'all'
      ? vocabulary.filteredDataset
      : vocabulary.currentDataset
  );

  const getQueueItems = (): QueueItem[] => {
    const dataset = getActiveDataset();
    const rawItems = (dataset && dataset.length > 0)
      ? dataset
      : (currentItem ? [currentItem] : []);

    const datasetId = settings.vocabularyBook || settings.datasetId || 'vocabulary';
    const itemType = settings.practiceType === 'practice' ? 'practice' : 'vocabulary';

    return rawItems
      .map((item, index) => toQueueItem(item as LearningItem, index, datasetId, itemType))
      .filter((item) => item.text.trim().length > 0);
  };

  const syncQueueEngine = (targetIndex = audio.currentIndex) => {
    const items = getQueueItems();
    if (items.length === 0) return;

    const currentEngineItems = queueEngine.getItems();
    const needsLoad =
      currentEngineItems.length !== items.length ||
      currentEngineItems.some((item, i) => item.id !== items[i]?.id) ||
      queueEngine.getCurrentIndex() !== targetIndex;

    if (needsLoad) {
      queueEngine.load(items, targetIndex);
    }
  };

  // Keep repeat settings in sync with engine
  useEffect(() => {
    const fallbackRepeatCount = appConfig.get<1 | 3 | 5>('settings.defaults.vocabRepeatCount', 3);
    queueEngine.setDefaultRepeatCount(settings.vocabRepeatCount || fallbackRepeatCount);
  }, [settings.vocabRepeatCount]);

  useEffect(() => {
    // When autoSwitchBooks is cycling through vocabulary books, looping back to
    // the first book is this adapter's job (handleAutoSwitchBooks below), not
    // the engine's own same-queue loop. If both were active at once, reaching
    // the end of a book could trigger the engine looping the current queue and
    // the adapter switching books at the same time. The engine only owns the
    // repeat loop when there is no book-switch cycle in play.
    const engineOwnsRepeat = !(settings.practiceType === 'vocabulary' && settings.autoSwitchBooks);
    queueEngine.setRepeatMode(engineOwnsRepeat && audio.repeatMode);
  }, [audio.repeatMode, settings.practiceType, settings.autoSwitchBooks]);

  // Keep volume & rate in sync with engine
  useEffect(() => {
    queueEngine.setVolume(audio.volume);
  }, [audio.volume]);

  useEffect(() => {
    queueEngine.setRate(settings.ttsRate);
  }, [settings.ttsRate]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioServiceForPlatform.stop();
    };
  }, []);

  // Retry recovery when the tab/page becomes visible again. checkForRecovery
  // is a no-op unless the engine is actually in the suspended state, so this
  // cannot duplicate playback by firing alongside the audio element's own
  // pause/waiting/stalled driven recovery path; both funnel into the same
  // single-in-flight guard inside the engine.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queueEngine.checkForRecovery();
      }
    };
    const handlePageShow = () => {
      queueEngine.checkForRecovery();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Configure engine listeners
  useEffect(() => {
    queueEngine.setListeners({
      onItemChanged: ({ index }) => {
        const storeIndex = useAppStore.getState().audio.currentIndex;
        if (storeIndex !== index) {
          vocabulary.goToItem(index);
        }
      },
      onPlaybackFailed: ({ error }) => {
        console.error('[useAutoPlayController] Playback failed:', error);
        audioServiceForPlatform.stop();
        useAppStore.getState().ui.showNotification(
          'Audio playback cannot start right now. Premium audio may be unavailable.',
          'error'
        );
        useAppStore.getState().audio.stopAutoPlay();
      },
      onResumeRequired: ({ reason }) => {
        useAppStore.getState().audio.setNeedsResume(true, reason);
      },
      onStateChanged: ({ state }) => {
        // needs-user-resume is cleared by whichever state comes after it
        // (playing on a successful tap, paused/idle if the user does
        // something else instead), not set here; this only clears it.
        if (state !== 'needs-user-resume') {
          useAppStore.getState().audio.setNeedsResume(false);
        }
      },
      onClipEnded: ({ index, repeatIndex, repeatCount }) => {
        const store = useAppStore.getState();
        const items = queueEngine.getItems();
        if (
          index === items.length - 1 &&
          repeatIndex === repeatCount &&
          store.settings.practiceType === 'vocabulary' &&
          store.settings.autoSwitchBooks
        ) {
          void handleAutoSwitchBooks();
        }
      },
    });
  }, [vocabulary]);

  // Sync queue dataset and position whenever dataset or index changes
  useEffect(() => {
    syncQueueEngine(audio.currentIndex);

    if (audio.isAutoPlaying && !audio.isPaused && currentItem) {
      const state = queueEngine.getPlaybackState();
      if (state === 'paused') {
        void queueEngine.resume({
          rate: settings.ttsRate,
          volume: useAppStore.getState().audio.volume,
        }).catch(() => {});
      } else if (state !== 'playing' && state !== 'buffering') {
        void queueEngine.startAutomatic({
          rate: settings.ttsRate,
          volume: useAppStore.getState().audio.volume,
        }).catch(() => {});
      }
    } else if (!audio.isAutoPlaying && (queueEngine.getPlaybackState() === 'playing' || queueEngine.getPlaybackState() === 'buffering')) {
      queueEngine.stop();
    }
  }, [audio.isAutoPlaying, audio.isPaused, currentItem, audio.currentIndex, vocabulary.currentDataset, vocabulary.filteredDataset, difficultyFilter]);

  const loadNextBook = async (bookId: string) => {
    console.log('[useAutoPlayController] Loading next book:', bookId);
    queueEngine.stop();
    vocabulary.setLoading(true);

    try {
      const { items } = await loadDataset(bookId);
      settings.updateSetting('vocabularyBook', bookId);
      vocabulary.setDataset(items, bookId);

      const filteredDataset = useAppStore.getState().vocabulary.filteredDataset;
      if (filteredDataset.length > 0) {
        vocabulary.goToItem(0);
        const newQueueItems = filteredDataset
          .map((item, index) => toQueueItem(item as LearningItem, index, bookId, 'vocabulary'))
          .filter((item) => item.text.trim().length > 0);

        queueEngine.load(newQueueItems, 0);

        if (useAppStore.getState().audio.isAutoPlaying && !useAppStore.getState().audio.isPaused) {
          void queueEngine.startAutomatic({
            rate: useAppStore.getState().settings.ttsRate,
            volume: useAppStore.getState().audio.volume,
          }).catch(() => {});
        }
      } else {
        console.warn(`[useAutoPlayController] No items in ${bookId} after filtering`);
        audio.stopAutoPlay();
      }
      vocabulary.setLoading(false);
    } catch (error) {
      console.error('[useAutoPlayController] Error loading next book:', error);
      vocabulary.setLoading(false);
      audio.stopAutoPlay();
    }
  };

  const handleAutoSwitchBooks = async () => {
    const vocabularyBooks = appConfig.getVocabularyBookIds();
    const currentBookId = settings.vocabularyBook;
    const currentBookIndex = vocabularyBooks.indexOf(currentBookId);

    const nextBookIndex = currentBookIndex + 1;
    if (nextBookIndex < vocabularyBooks.length) {
      const nextBookId = vocabularyBooks[nextBookIndex];
      if (nextBookId) {
        await sleep(getDelay('delays.autoPlayRestartPause', 1000));
        if (useAppStore.getState().audio.isAutoPlaying && !useAppStore.getState().audio.isPaused) {
          await loadNextBook(nextBookId);
        }
      }
    } else if (useAppStore.getState().audio.repeatMode) {
      const firstBookId = vocabularyBooks[0];
      if (firstBookId) {
        await sleep(getDelay('delays.autoPlayRestartPause', 1000));
        if (useAppStore.getState().audio.isAutoPlaying && !useAppStore.getState().audio.isPaused) {
          await loadNextBook(firstBookId);
        }
      }
    } else {
      audio.stopAutoPlay();
    }
  };

  const handlePlay = () => {
    if (!currentItem) {
      console.warn('[useAutoPlayController] No current item to play');
      return;
    }

    const items = getQueueItems();
    if (items.length === 0) return;

    const opts = {
      rate: settings.ttsRate,
      volume: useAppStore.getState().audio.volume,
    };

    if (queueEngine.getPlaybackState() === 'paused') {
      void queueEngine.resume(opts).catch((error) => {
        console.error('[useAutoPlayController] Play gesture resume failed:', error);
      });
    } else {
      queueEngine.load(items, audio.currentIndex);
      void queueEngine.start(opts).catch((error) => {
        console.error('[useAutoPlayController] Play gesture start failed:', error);
      });
    }

    audio.startAutoPlay();
  };

  const handlePause = () => {
    audio.pauseAutoPlay();
    queueEngine.pause();
  };

  /**
   * The gesture-safe path a "Tap to resume practice audio" UI calls when
   * needsResume is true. queueEngine.resume() already falls back to a fresh
   * start() internally if the loaded item no longer matches, so this one
   * call covers both the resume and start cases the tap needs to handle.
   */
  const handleResumeTap = () => {
    const opts = {
      rate: settings.ttsRate,
      volume: useAppStore.getState().audio.volume,
    };
    void queueEngine.resume(opts).catch((error) => {
      console.error('[useAutoPlayController] Resume tap failed:', error);
    });
  };

  const handleNext = async () => {
    await queueEngine.next();
  };

  const handlePrev = async () => {
    await queueEngine.previous();
  };

  return {
    handlePlay,
    handlePause,
    handleNext,
    handlePrev,
    handleResumeTap,
  };
};
