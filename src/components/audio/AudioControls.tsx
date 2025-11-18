/**
 * AudioControls Component
 *
 * Controls for audio playback (play, pause, next, previous, auto-play).
 * Integrates with Zustand audio store.
 */

import React, { useEffect, useRef } from 'react';
import { Card, Flex, Button, Text, Switch, Slider } from '@radix-ui/themes';
import {
  PlayIcon,
  PauseIcon,
  TrackNextIcon,
  TrackPreviousIcon,
  LoopIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { useAppStore } from '../../ts/stores';
import { ttsEngine } from '../../ts/audio/TTSEngine';
import { appConfig } from '../../ts/shared/Config';

// Vocabulary books in order for auto-switch feature
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
];

const AudioControls: React.FC = () => {
  const audio = useAppStore((state) => state.audio);
  const currentItem = useAppStore((state) => state.vocabulary.currentItem);
  const vocabulary = useAppStore((state) => state.vocabulary);
  const settings = useAppStore((state) => state.settings);
  const difficultyFilter = useAppStore((state) => state.settings.difficultyFilter);
  const autoPlayRef = useRef<boolean>(false);

  // Helper function to load next vocabulary book
  const loadNextBook = async (bookId: string) => {
    console.log('[AudioControls] Loading next book:', bookId);
    vocabulary.setLoading(true);

    try {
      const dataPathMap: Record<string, string> = {
        'pte-fib-listening': '/data/processed/pte-fib-listening-dataset.json',
        'pte-beginner': '/data/processed/pte-beginner-vocabulary.json',
        'pte-intermediate': '/data/processed/pte-intermediate-vocabulary.json',
        'pte-advanced': '/data/processed/pte-advanced-vocabulary.json',
        'pte-ra': '/data/processed/pte-ra-vocabulary.json',
        'pte-rs-vocab': '/data/processed/pte-rs-vocabulary.json',
        'pte-must-know': '/data/processed/pte-must-know-vocabulary.json',
        'pte-wfd-vocab': '/data/processed/pte-wfd-vocabulary.json',
        'pte-rs-wfd-vocab': '/data/processed/pte-rs-wfd-vocabulary.json',
        'pte-reading-fib': '/data/processed/pte-reading-fib-vocabulary.json',
        'pte-reading-fib-drag': '/data/processed/pte-reading-fib-drag-vocabulary.json',
        'pte-asq-answers': '/data/processed/pte-asq-answers-vocabulary.json',
        'pte-high-frequency': '/data/processed/pte-high-frequency-vocabulary.json',
        'pte-rs-core': '/data/processed/pte-rs-core-vocabulary.json',
      };

      const dataPath = dataPathMap[bookId] || `/data/processed/${bookId}-vocabulary.json`;
      const response = await fetch(dataPath);

      if (!response.ok) {
        throw new Error(`Failed to load vocabulary: ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.vocabulary || [];

      // Update settings with new book
      settings.updateSetting('vocabularyBook', bookId);

      // Set dataset and apply current difficulty filter
      vocabulary.setDataset(items, bookId);
      if (settings.difficultyFilter !== 'all') {
        vocabulary.filterByDifficulty(settings.difficultyFilter);
      }

      // Get the filtered dataset
      const filteredDataset = settings.difficultyFilter === 'all'
        ? items
        : vocabulary.filteredDataset;

      // Set first item and reset index
      if (filteredDataset.length > 0) {
        audio.setCurrentIndex(0);
        vocabulary.setCurrentItem(filteredDataset[0]);
        console.log(`[AudioControls] Loaded ${filteredDataset.length} items from ${bookId}`);
      } else {
        console.warn(`[AudioControls] No items in ${bookId} after filtering`);
        audio.stopAutoPlay();
      }

      vocabulary.setLoading(false);
    } catch (error) {
      console.error('[AudioControls] Error loading next book:', error);
      vocabulary.setLoading(false);
      audio.stopAutoPlay();
    }
  };

  // Auto-play loop effect
  useEffect(() => {
    const runAutoPlay = async () => {
      if (!audio.isAutoPlaying || audio.isPaused || !currentItem) {
        console.log('[AudioControls] Skipping auto-play:', {
          isAutoPlaying: audio.isAutoPlaying,
          isPaused: audio.isPaused,
          hasCurrentItem: !!currentItem
        });
        return;
      }

      autoPlayRef.current = true;

      // Get the word/text to speak
      // For shadowing items, use fullText for natural continuous speech
      const isShadowingItem = !!(currentItem as any).fullText;
      const textToSpeak = isShadowingItem 
        ? (currentItem as any).fullText.replace(/\|/g, ' ')  // Remove | separators for natural speech
        : ((currentItem as any).word || (currentItem as any).english ||
           (currentItem as any).sentence || (currentItem as any).question);

      if (textToSpeak) {
        // Use filtered dataset if filter is active, otherwise use current dataset
        const dataset = difficultyFilter !== 'all'
          ? vocabulary.filteredDataset
          : vocabulary.currentDataset;
        console.log('[AudioControls] Auto-playing:', textToSpeak, `(${audio.currentIndex + 1}/${dataset?.length || 0})`);

        try {
          await ttsEngine.pronounceText(textToSpeak, 'en-US', null);

          // After speaking, move to next if auto-play is still active
          if (audio.isAutoPlaying && !audio.isPaused && autoPlayRef.current) {
            const nextIndex = audio.currentIndex + 1;

            if (dataset && nextIndex < dataset.length) {
              const nextItem = dataset[nextIndex];
              if (nextItem) {
                // Small delay between words (from config)
                await new Promise(resolve => setTimeout(resolve, appConfig.get('delays.autoPlayBetweenWords')));

                if (audio.isAutoPlaying && !audio.isPaused && autoPlayRef.current) {
                  console.log('[AudioControls] Moving to next item:', nextIndex + 1);
                  audio.navigateNext();
                  vocabulary.setCurrentItem(nextItem);
                }
              } else {
                console.warn('[AudioControls] Next item is null at index:', nextIndex);
                audio.stopAutoPlay();
              }
            } else {
              // Reached end of dataset
              // Check if auto-switch books is enabled (vocabulary mode only)
              const shouldAutoSwitch = settings.practiceType === 'vocabulary' && settings.autoSwitchBooks;

              if (shouldAutoSwitch) {
                // Auto-switch to next vocabulary book
                const currentBookId = settings.vocabularyBook;
                const currentIndex = VOCABULARY_BOOKS.indexOf(currentBookId);

                if (currentIndex !== -1) {
                  const nextIndex = currentIndex + 1;

                  if (nextIndex < VOCABULARY_BOOKS.length) {
                    // Load next book in sequence
                    const nextBookId = VOCABULARY_BOOKS[nextIndex];
                    if (nextBookId) {
                      console.log(`[AudioControls] Auto-switching from ${currentBookId} to ${nextBookId}`);

                      // Pause before switching
                      await new Promise(resolve => setTimeout(resolve, appConfig.get('delays.autoPlayRestartPause')));

                      if (audio.isAutoPlaying && !audio.isPaused && autoPlayRef.current) {
                        // Load next book using the same logic as Settings panel
                        await loadNextBook(nextBookId);
                      }
                    }
                  } else {
                    // Reached last book
                    if (audio.repeatMode) {
                      // Loop back to first book
                      console.log('[AudioControls] Reached last book - looping back to first book');
                      const firstBookId = VOCABULARY_BOOKS[0];

                      if (firstBookId) {
                        await new Promise(resolve => setTimeout(resolve, appConfig.get('delays.autoPlayRestartPause')));

                        if (audio.isAutoPlaying && !audio.isPaused && autoPlayRef.current) {
                          await loadNextBook(firstBookId);
                        }
                      }
                    } else {
                      // Stop at end of last book
                      console.log('[AudioControls] Auto-switch finished - reached end of all books');
                      audio.stopAutoPlay();
                    }
                  }
                } else {
                  console.error('[AudioControls] Current book not found in book list:', currentBookId);
                  audio.stopAutoPlay();
                }
              } else if (audio.repeatMode) {
                // Standard repeat mode: loop back to start of current book
                console.log('[AudioControls] Repeat mode ON - looping back to start of current book');
                const firstItem = dataset?.[0];
                if (firstItem && dataset) {
                  // Pause before restarting (from config)
                  await new Promise(resolve => setTimeout(resolve, appConfig.get('delays.autoPlayRestartPause')));
                  if (audio.isAutoPlaying && !audio.isPaused && autoPlayRef.current) {
                    audio.setCurrentIndex(0);
                    vocabulary.setCurrentItem(firstItem);
                    console.log('[AudioControls] Restarted from beginning (item 1/' + dataset.length + ')');
                  }
                } else {
                  console.error('[AudioControls] Cannot restart - no first item');
                  audio.stopAutoPlay();
                }
              } else {
                // Repeat mode disabled: stop at end of current book
                console.log('[AudioControls] Auto-play finished - reached end of dataset');
                audio.stopAutoPlay();
              }
            }
          } else {
            console.log('[AudioControls] Auto-play stopped by user or paused');
          }
        } catch (error) {
          console.error('[AudioControls] Auto-play error:', error);
          audio.stopAutoPlay();
        }
      } else {
        // Silently skip if no item - happens during initial load
        console.debug('[AudioControls] Waiting for current item to load...');
      }
    };

    if (audio.isAutoPlaying && !audio.isPaused) {
      runAutoPlay();
    }

    return () => {
      autoPlayRef.current = false;
    };
  }, [audio.isAutoPlaying, audio.isPaused, currentItem, audio.currentIndex]);

  // Handle play button click
  const handlePlay = () => {
    if (!currentItem) {
      console.warn('[AudioControls] No current item to play');
      return;
    }

    audio.startAutoPlay();
  };

  // Handle pause button click
  const handlePause = () => {
    audio.pauseAutoPlay();
    // Stop any currently playing TTS
    ttsEngine.stopSpeaking();
  };

  // Handle next button
  const handleNext = () => {
    // Use filtered dataset if filter is active
    const dataset = difficultyFilter !== 'all'
      ? vocabulary.filteredDataset
      : vocabulary.currentDataset;
    if (dataset && dataset.length > 0) {
      const nextIndex = audio.currentIndex + 1;
      if (nextIndex < dataset.length) {
        const nextItem = dataset[nextIndex];
        if (nextItem) {
          audio.navigateNext();
          vocabulary.setCurrentItem(nextItem);
        }
      }
    }
  };

  // Handle previous button
  const handlePrev = () => {
    // Use filtered dataset if filter is active
    const dataset = difficultyFilter !== 'all'
      ? vocabulary.filteredDataset
      : vocabulary.currentDataset;
    if (dataset && dataset.length > 0 && audio.currentIndex > 0) {
      const prevIndex = audio.currentIndex - 1;
      const prevItem = dataset[prevIndex];
      if (prevItem) {
        audio.navigatePrev();
        vocabulary.setCurrentItem(prevItem);
      }
    }
  };

  return (
    <Card size="3" className="audio-controls">
      <Flex direction="column" gap="4">
        {/* Title */}
        <Text size="4" weight="bold">
          Audio Controls
        </Text>

        {/* Playback controls */}
        <Flex gap="2" justify="center" align="center">
          {/* Previous */}
          <Button
            size="3"
            variant="soft"
            onClick={handlePrev}
            disabled={audio.currentIndex === 0}
          >
            <TrackPreviousIcon width="20" height="20" />
          </Button>

          {/* Play/Pause */}
          <Button
            size="4"
            variant="solid"
            onClick={() => {
              if (audio.isAutoPlaying) {
                if (audio.isPaused) {
                  audio.resumeAutoPlay();
                } else {
                  handlePause();
                }
              } else {
                handlePlay();
              }
            }}
          >
            {audio.isAutoPlaying && !audio.isPaused ? (
              <>
                <PauseIcon width="20" height="20" />
                Pause
              </>
            ) : (
              <>
                <PlayIcon width="20" height="20" />
                Play
              </>
            )}
          </Button>

          {/* Next */}
          <Button
            size="3"
            variant="soft"
            onClick={handleNext}
          >
            <TrackNextIcon width="20" height="20" />
          </Button>

          {/* Repeat */}
          <Button
            size="3"
            variant={audio.repeatMode ? 'solid' : 'soft'}
            onClick={() => audio.toggleRepeat()}
          >
            <LoopIcon width="20" height="20" />
          </Button>
        </Flex>

        {/* Progress indicator */}
        <Flex direction="column" gap="2">
          <Text size="2" color="gray">
            Item {audio.currentIndex + 1}
          </Text>
          <Flex align="center" gap="2">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${audio.currentIndex > 0 ? (audio.currentIndex / 10) * 100 : 0}%`,
                }}
              />
            </div>
          </Flex>
        </Flex>

        {/* Settings */}
        <Flex direction="column" gap="3">
          {/* Auto-play toggle */}
          <Flex justify="between" align="center">
            <Text size="2">Auto-play</Text>
            <Switch
              checked={audio.autoPlayEnabled}
              onCheckedChange={(checked) => audio.setAutoPlay(checked)}
            />
          </Flex>

          {/* Speed control */}
          <Flex direction="column" gap="2">
            <Flex justify="between">
              <Text size="2">Playback speed</Text>
              <Text size="2" color="gray">
                {audio.playbackSpeed.toFixed(1)}x
              </Text>
            </Flex>
            <Slider
              value={[audio.playbackSpeed]}
              onValueChange={([speed]) => audio.setSpeed(speed || 1.0)}
              min={0.5}
              max={2.0}
              step={0.1}
            />
          </Flex>

          {/* Volume control */}
          <Flex direction="column" gap="2">
            <Flex justify="between">
              <Flex align="center" gap="1">
                <SpeakerLoudIcon width="14" height="14" />
                <Text size="2">Volume</Text>
              </Flex>
              <Text size="2" color="gray">
                {Math.round(audio.volume * 100)}%
              </Text>
            </Flex>
            <Slider
              value={[audio.volume]}
              onValueChange={([vol]) => audio.setVolume(vol || 1.0)}
              min={0}
              max={1}
              step={0.01}
            />
          </Flex>

          {/* Repeat mode */}
          <Flex justify="between" align="center">
            <Text size="2">Repeat mode</Text>
            <Switch
              checked={audio.repeatMode}
              onCheckedChange={() => audio.toggleRepeat()}
            />
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

export default AudioControls;
