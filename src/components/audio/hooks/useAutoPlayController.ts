import { useEffect, useRef } from 'react';
import { appConfig } from '../../../config/AppConfig';
import { ttsEngine } from '../../../services/audio/TTSEngine';
import { useAppStore, useAudioState, useSettings, useVocabulary } from '../../../stores';
import type { PracticeItem, VocabularyItem } from '../../../types/dataset.types';
import { cleanText } from '../../../utils/textUtils';

const VOCABULARY_BOOKS = [
  'pte-fib-listening',
  'pte-beginner',
  'pte-intermediate',
  'pte-advanced',
  'pte-ra',
  'pte-rs-vocab',
  'pte-must-know',
  'pte-wfd-vocab',
  'pte-rs-wfd-vocab',
  'pte-reading-fib',
  'pte-reading-fib-drag',
  'pte-asq-answers',
  'pte-high-frequency',
  'pte-rs-core',
  'pte-essay-90plus-filled-terms',
];

type LearningItem = (VocabularyItem | PracticeItem) & Partial<{
  english: string;
  fullText: string;
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

const getItemLabel = (item: LearningItem): string => getItemText(item)?.substring(0, 30) || 'unknown';

const getDelay = (path: string, fallback: number): number => {
  const configuredDelay = appConfig.get(path);
  return typeof configuredDelay === 'number' ? configuredDelay : fallback;
};

const speakWithTimeout = async (text: string, rate: number): Promise<void> => {
  const ttsTimeoutMs = Math.min(12000, Math.max(3000, (text.length / 8) * 1000 + 2000));
  let timeoutId: number | null = null;

  await Promise.race([
    ttsEngine.speak(text, null, rate),
    new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        void ttsEngine.stopSpeaking();
        reject(new Error(`TTS timed out after ${ttsTimeoutMs}ms`));
      }, ttsTimeoutMs);
    }),
  ]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  });
};

export const useAutoPlayController = () => {
  const audio = useAudioState();
  const vocabulary = useVocabulary();
  const settings = useSettings();
  const { currentItem } = vocabulary;
  const { difficultyFilter } = settings;
  const autoPlayRef = useRef(false);
  const currentEffectIdRef = useRef(0);

  const getActiveDataset = () => (
    difficultyFilter !== 'all'
      ? vocabulary.filteredDataset
      : vocabulary.currentDataset
  );

  const loadNextBook = async (bookId: string) => {
    console.log('[useAutoPlayController] Loading next book:', bookId);
    vocabulary.setLoading(true);

    try {
      const dataPaths = appConfig.get('data.paths.byMode') as Record<string, string>;
      const dataPath = dataPaths[bookId] || `/data/processed/${bookId}-vocabulary.json`;
      const response = await fetch(dataPath);

      if (!response.ok) {
        throw new Error(`Failed to load vocabulary: ${response.statusText}`);
      }

      const data = await response.json() as { vocabulary?: (VocabularyItem | PracticeItem)[] };
      const items = data.vocabulary || [];

      settings.updateSetting('vocabularyBook', bookId);
      vocabulary.setDataset(items, bookId);
      if (settings.difficultyFilter !== 'all') {
        vocabulary.filterByDifficulty(settings.difficultyFilter);
      }

      const filteredDataset = settings.difficultyFilter === 'all'
        ? items
        : vocabulary.filteredDataset;

      const firstItem = filteredDataset[0];
      if (firstItem) {
        audio.setCurrentIndex(0);
        vocabulary.setCurrentItem(firstItem);
        console.log(`[useAutoPlayController] Loaded ${filteredDataset.length} items from ${bookId}`);
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

  useEffect(() => {
    const effectId = Date.now();
    currentEffectIdRef.current = effectId;

    console.log(`[useAutoPlayController #${effectId}] 🔄 useEffect TRIGGERED`);
    console.log(`[useAutoPlayController #${effectId}] 📊 Dependencies:`, {
      isAutoPlaying: audio.isAutoPlaying,
      isPaused: audio.isPaused,
      currentItem: currentItem ? getItemLabel(currentItem as LearningItem) : null,
      currentIndex: audio.currentIndex,
    });

    const runAutoPlay = async () => {
      if (!audio.isAutoPlaying || audio.isPaused || !currentItem) {
        console.log(`[useAutoPlayController #${effectId}] ⏭️ Skipping auto-play:`, {
          isAutoPlaying: audio.isAutoPlaying,
          isPaused: audio.isPaused,
          hasCurrentItem: !!currentItem,
        });
        return;
      }

      autoPlayRef.current = true;
      const isPlaybackActive = () => {
        const latestAudio = useAppStore.getState().audio;
        return latestAudio.isAutoPlaying &&
          !latestAudio.isPaused &&
          autoPlayRef.current &&
          currentEffectIdRef.current === effectId;
      };

      const isSpeaking = typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking;
      if (isSpeaking) {
        console.log(`[useAutoPlayController #${effectId}] ⏳ Waiting 200ms for previous speech to stop...`);
        await sleep(200);
      } else {
        console.log(`[useAutoPlayController #${effectId}] ⚡ No active speech, proceeding instantly...`);
      }

      if (currentEffectIdRef.current !== effectId) {
        console.log(`[useAutoPlayController #${effectId}] ❌ CANCELLED - newer effect #${currentEffectIdRef.current} has taken over`);
        return;
      }

      const textToSpeak = getItemText(currentItem as LearningItem);
      if (!textToSpeak) {
        console.debug('[useAutoPlayController] Waiting for current item to load...');
        return;
      }

      const dataset = getActiveDataset();
      const cleanedText = cleanText(textToSpeak);
      console.log(`[useAutoPlayController #${effectId}] 🎤 Preparing to speak:`, cleanedText.substring(0, 30), `(${audio.currentIndex + 1}/${dataset?.length || 0})`);

      try {
        if (appConfig.get('tts.autoSpeak')) {
          const repeatCount = settings.vocabRepeatCount || 1;
          for (let i = 0; i < repeatCount; i++) {
            if (!isPlaybackActive()) {
              console.log(`[useAutoPlayController #${effectId}] ⏹️ Stopped during repeat ${i + 1}/${repeatCount}`);
              break;
            }

            if (currentEffectIdRef.current !== effectId) {
              console.log(`[useAutoPlayController #${effectId}] ❌ CANCELLED during repeat ${i + 1}/${repeatCount} - superseded by effect #${currentEffectIdRef.current}`);
              break;
            }

            console.log(`[useAutoPlayController #${effectId}] 🔊 Speaking repeat ${i + 1}/${repeatCount}...`);
            await speakWithTimeout(cleanedText, settings.ttsRate);
            console.log(`[useAutoPlayController #${effectId}] ✅ Speak complete for repeat ${i + 1}/${repeatCount}`);

            if (i < repeatCount - 1) {
              await sleep(getDelay('delays.autoPlayBetweenWords', 600));
            }
          }
        }

        if (!isPlaybackActive()) {
          console.log('[useAutoPlayController] Auto-play stopped by user or paused');
          return;
        }

        const latestAudio = useAppStore.getState().audio;
        const nextIndex = latestAudio.currentIndex + 1;
        console.log(`[useAutoPlayController #${effectId}] 🔄 Checking if should move to next (current: ${latestAudio.currentIndex}, next: ${nextIndex})`);

        if (dataset && nextIndex < dataset.length) {
          const nextItem = dataset[nextIndex];
          if (!nextItem) {
            console.warn(`[useAutoPlayController #${effectId}] ❌ Next item is null at index:`, nextIndex);
            audio.stopAutoPlay();
            return;
          }

          await sleep(getDelay('delays.autoPlayBetweenWords', 600));
          if (isPlaybackActive()) {
            console.log(`[useAutoPlayController #${effectId}] ⏩ AUTO-NAVIGATING to next item:`, nextIndex + 1);
            audio.navigateNext();
            vocabulary.setCurrentItem(nextItem);
          } else {
            console.log(`[useAutoPlayController #${effectId}] ⏹️ Auto-play stopped or superseded, not navigating`);
          }
          return;
        }

        const shouldAutoSwitch = settings.practiceType === 'vocabulary' && settings.autoSwitchBooks;
        if (shouldAutoSwitch) {
          const currentBookId = settings.vocabularyBook;
          const currentBookIndex = VOCABULARY_BOOKS.indexOf(currentBookId);

          if (currentBookIndex === -1) {
            console.error('[useAutoPlayController] Current book not found in book list:', currentBookId);
            audio.stopAutoPlay();
            return;
          }

          const nextBookIndex = currentBookIndex + 1;
          if (nextBookIndex < VOCABULARY_BOOKS.length) {
            const nextBookId = VOCABULARY_BOOKS[nextBookIndex];
            if (nextBookId) {
              console.log(`[useAutoPlayController] Auto-switching from ${currentBookId} to ${nextBookId}`);
              await sleep(getDelay('delays.autoPlayRestartPause', 1000));
              if (isPlaybackActive()) {
                await loadNextBook(nextBookId);
              }
            }
            return;
          }

          if (audio.repeatMode) {
            const firstBookId = VOCABULARY_BOOKS[0];
            if (firstBookId) {
              console.log('[useAutoPlayController] Reached last book - looping back to first book');
              await sleep(getDelay('delays.autoPlayRestartPause', 1000));
              if (isPlaybackActive()) {
                await loadNextBook(firstBookId);
              }
            }
          } else {
            console.log('[useAutoPlayController] Auto-switch finished - reached end of all books');
            audio.stopAutoPlay();
          }
          return;
        }

        if (audio.repeatMode) {
          console.log('[useAutoPlayController] Repeat mode ON - looping back to start of current book');
          const firstItem = dataset?.[0];
          if (firstItem && dataset) {
            await sleep(getDelay('delays.autoPlayRestartPause', 1000));
            if (isPlaybackActive()) {
              audio.setCurrentIndex(0);
              vocabulary.setCurrentItem(firstItem);
              console.log('[useAutoPlayController] Restarted from beginning (item 1/' + dataset.length + ')');
            }
          } else {
            console.error('[useAutoPlayController] Cannot restart - no first item');
            audio.stopAutoPlay();
          }
        } else {
          console.log('[useAutoPlayController] Auto-play finished - reached end of dataset');
          audio.stopAutoPlay();
        }
      } catch (error) {
        console.error('[useAutoPlayController] Auto-play error:', error);
        audio.stopAutoPlay();
      }
    };

    if (audio.isAutoPlaying && !audio.isPaused) {
      void runAutoPlay();
    }

    return () => {
      autoPlayRef.current = false;
    };
  }, [audio.isAutoPlaying, audio.isPaused, currentItem, audio.currentIndex]);

  const handlePlay = () => {
    if (!currentItem) {
      console.warn('[useAutoPlayController] No current item to play');
      return;
    }

    audio.startAutoPlay();
  };

  const handlePause = () => {
    console.log('[useAutoPlayController] ⏸️ handlePause() called');
    audio.pauseAutoPlay();
    void ttsEngine.stopSpeaking();
  };

  const handleNext = async () => {
    const timestamp = Date.now();
    console.log(`[useAutoPlayController @${timestamp}] ⏩ handleNext() called`);
    console.log(`[useAutoPlayController @${timestamp}] 📊 Current state: index=${audio.currentIndex}, isAutoPlaying=${audio.isAutoPlaying}`);

    console.log(`[useAutoPlayController @${timestamp}] 🛑 Calling stopSpeaking()...`);
    await ttsEngine.stopSpeaking();
    console.log(`[useAutoPlayController @${timestamp}] ✅ stopSpeaking() complete`);

    const dataset = getActiveDataset();
    if (dataset && dataset.length > 0) {
      const nextIndex = audio.currentIndex + 1;
      if (nextIndex < dataset.length) {
        const nextItem = dataset[nextIndex];
        if (nextItem) {
          console.log(`[useAutoPlayController @${timestamp}] 📝 Updating to index ${nextIndex}: "${getItemLabel(nextItem as LearningItem)}"`);
          audio.navigateNext();
          vocabulary.setCurrentItem(nextItem);
          console.log(`[useAutoPlayController @${timestamp}] ✅ State updated, useEffect should trigger now`);
        }
      }
    }
  };

  const handlePrev = async () => {
    const timestamp = Date.now();
    console.log(`[useAutoPlayController @${timestamp}] ⏪ handlePrev() called`);
    console.log(`[useAutoPlayController @${timestamp}] 📊 Current state: index=${audio.currentIndex}, isAutoPlaying=${audio.isAutoPlaying}`);

    console.log(`[useAutoPlayController @${timestamp}] 🛑 Calling stopSpeaking()...`);
    await ttsEngine.stopSpeaking();
    console.log(`[useAutoPlayController @${timestamp}] ✅ stopSpeaking() complete`);

    const dataset = getActiveDataset();
    if (dataset && dataset.length > 0 && audio.currentIndex > 0) {
      const prevIndex = audio.currentIndex - 1;
      const prevItem = dataset[prevIndex];
      if (prevItem) {
        audio.navigatePrev();
        vocabulary.setCurrentItem(prevItem);
      }
    }
  };

  return {
    handlePlay,
    handlePause,
    handleNext,
    handlePrev,
  };
};
