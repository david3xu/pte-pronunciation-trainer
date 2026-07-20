import { useEffect, useRef } from 'react';
import { appConfig } from '../../../config/AppConfig';
import { ttsEngine } from '../../../services/audio/TTSEngine';
import { backgroundAudioService } from '../../../services/audio/backgroundAudioService';
import { loadDataset } from '../../../services/dataset/datasetLoader';
import { useAppStore, useAudioState, useSettings, useVocabulary } from '../../../stores';
import type { PracticeItem, VocabularyItem } from '../../../types/dataset.types';
import { cleanText } from '../../../utils/textUtils';

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

const getVocabularyBookIds = (): string[] => {
  const learningModes = appConfig.get('data.learningModes') || [];
  return learningModes
    .filter((mode: any) => mode.category === 'vocabulary')
    .map((mode: any) => mode.id);
};

const speakWithTimeout = async (text: string, rate: number): Promise<void> => {
  const ttsTimeoutMs = Math.min(15000, Math.max(8000, (text.length / 8) * 1000 + 5000));
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
  const nextEffectIdRef = useRef(0);

  // Media-session handlers are registered once but must always dispatch to the
  // latest callbacks, so they are routed through refs updated on each render.
  const bgPlayRef = useRef<() => void>(() => {});
  const bgPauseRef = useRef<() => void>(() => {});
  const bgNextRef = useRef<() => void>(() => {});
  const bgPrevRef = useRef<() => void>(() => {});

  // Stop background audio (and abort any pending fetch / revoke Blob URLs) when
  // the controller unmounts, e.g. on navigation.
  useEffect(() => {
    return () => {
      backgroundAudioService.stop();
    };
  }, []);

  /**
   * Play the current text as real audio and resolve when the audio element's
   * `ended` event fires, so autoplay progression is driven by playback ending
   * rather than a timer. Rejects if the audio cannot be fetched or played so
   * the caller can surface a clear error instead of silently pretending.
   */
  const playBackgroundAndWaitForEnd = (text: string, rate: number): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      backgroundAudioService.setHandlers({
        onEnded: () => resolve(),
        onError: (error) => reject(error),
        onPlay: () => bgPlayRef.current(),
        onPause: () => bgPauseRef.current(),
        onStop: () => bgPauseRef.current(),
        onNext: () => bgNextRef.current(),
        onPrevious: () => bgPrevRef.current(),
      });
      // Resume the current clip mid-playback when the same item is still loaded
      // and paused; otherwise fetch and play the item from the start. Only
      // playText refetches, so pause/resume of the same item does not restart it.
      // The configured playback rate is applied to both paths.
      if (backgroundAudioService.canResume() && backgroundAudioService.getLoadedText() === text) {
        backgroundAudioService.resume(rate).catch((error) => reject(error));
      } else {
        backgroundAudioService.playText(text, { rate }).catch((error) => reject(error));
      }
    });
  };

  const getActiveDataset = () => (
    difficultyFilter !== 'all'
      ? vocabulary.filteredDataset
      : vocabulary.currentDataset
  );

  const loadNextBook = async (bookId: string) => {
    console.log('[useAutoPlayController] Loading next book:', bookId);
    backgroundAudioService.stop(); // stop/abort current background audio before switching books
    vocabulary.setLoading(true);

    try {
      const { items } = await loadDataset(bookId);

      settings.updateSetting('vocabularyBook', bookId);
      vocabulary.setDataset(items, bookId);
      if (settings.difficultyFilter !== 'all') {
        vocabulary.filterByDifficulty(settings.difficultyFilter);
      }

      const filteredDataset = useAppStore.getState().vocabulary.filteredDataset;

      if (filteredDataset.length > 0) {
        vocabulary.goToItem(0);
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
    const effectId = ++nextEffectIdRef.current;
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
            if (useAppStore.getState().settings.backgroundAudioMode) {
              // Background Audio Mode: play real audio (Polly) and advance on the
              // element's `ended` event. Do not silently fall back to browser TTS.
              try {
                await playBackgroundAndWaitForEnd(cleanedText, settings.ttsRate);
              } catch (bgError) {
                console.error('[useAutoPlayController] Background audio failed:', bgError);
                backgroundAudioService.stop();
                useAppStore.getState().ui.showNotification(
                  'Background Audio Mode cannot play right now. Premium audio (AWS Polly) may be unavailable. Turn off Background Audio Mode in Settings to use standard playback.',
                  'error'
                );
                audio.stopAutoPlay();
                return;
              }
            } else {
              await speakWithTimeout(cleanedText, settings.ttsRate);
            }
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
            vocabulary.goToItem(nextIndex);
          } else {
            console.log(`[useAutoPlayController #${effectId}] ⏹️ Auto-play stopped or superseded, not navigating`);
          }
          return;
        }

        const shouldAutoSwitch = settings.practiceType === 'vocabulary' && settings.autoSwitchBooks;
        if (shouldAutoSwitch) {
          const vocabularyBooks = getVocabularyBookIds();
          const currentBookId = settings.vocabularyBook;
          const currentBookIndex = vocabularyBooks.indexOf(currentBookId);

          if (currentBookIndex === -1) {
            console.error('[useAutoPlayController] Current book not found in book list:', currentBookId);
            audio.stopAutoPlay();
            return;
          }

          const nextBookIndex = currentBookIndex + 1;
          if (nextBookIndex < vocabularyBooks.length) {
            const nextBookId = vocabularyBooks[nextBookIndex];
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
            const firstBookId = vocabularyBooks[0];
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
              vocabulary.goToItem(0);
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

    // Prime the audio element synchronously within this user gesture so
    // background playback is allowed after the async premium-TTS fetch
    // (mobile autoplay policy requires the play to originate from a gesture).
    if (useAppStore.getState().settings.backgroundAudioMode) {
      backgroundAudioService.primeForUserGesture();
    }

    audio.startAutoPlay();
  };

  const handlePause = () => {
    console.log('[useAutoPlayController] ⏸️ handlePause() called');
    audio.pauseAutoPlay();
    void ttsEngine.stopSpeaking();
    backgroundAudioService.pause();
  };

  const handleNext = async () => {
    const timestamp = Date.now();
    console.log(`[useAutoPlayController @${timestamp}] ⏩ handleNext() called`);
    backgroundAudioService.stop();
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
          vocabulary.goToItem(nextIndex);
          console.log(`[useAutoPlayController @${timestamp}] ✅ State updated, useEffect should trigger now`);
        }
      }
    }
  };

  const handlePrev = async () => {
    const timestamp = Date.now();
    console.log(`[useAutoPlayController @${timestamp}] ⏪ handlePrev() called`);
    backgroundAudioService.stop();
    console.log(`[useAutoPlayController @${timestamp}] 📊 Current state: index=${audio.currentIndex}, isAutoPlaying=${audio.isAutoPlaying}`);

    console.log(`[useAutoPlayController @${timestamp}] 🛑 Calling stopSpeaking()...`);
    await ttsEngine.stopSpeaking();
    console.log(`[useAutoPlayController @${timestamp}] ✅ stopSpeaking() complete`);

    const dataset = getActiveDataset();
    if (dataset && dataset.length > 0 && audio.currentIndex > 0) {
      const prevIndex = audio.currentIndex - 1;
      const prevItem = dataset[prevIndex];
      if (prevItem) {
        vocabulary.goToItem(prevIndex);
      }
    }
  };

  // Point the background-audio media-session handlers at the current callbacks.
  bgPlayRef.current = handlePlay;
  bgPauseRef.current = handlePause;
  bgNextRef.current = () => { void handleNext(); };
  bgPrevRef.current = () => { void handlePrev(); };

  return {
    handlePlay,
    handlePause,
    handleNext,
    handlePrev,
  };
};
