/**
 * AudioControls Component
 *
 * Controls for audio playback (play, pause, next, previous, auto-play).
 * Integrates with Zustand audio store.
 */

import React from 'react';
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

const AudioControls: React.FC = () => {
  const audio = useAppStore((state) => state.audio);
  const currentItem = useAppStore((state) => state.vocabulary.currentItem);
  const vocabulary = useAppStore((state) => state.vocabulary);

  // Handle play button click
  const handlePlay = async () => {
    if (!currentItem) {
      console.warn('[AudioControls] No current item to play');
      return;
    }

    audio.startAutoPlay();

    // Get the word/text to speak
    const textToSpeak = (currentItem as any).word || (currentItem as any).english ||
                        (currentItem as any).sentence || (currentItem as any).question;

    if (textToSpeak) {
      console.log('[AudioControls] Playing:', textToSpeak);
      try {
        await ttsEngine.pronounceText(textToSpeak, 'en-US', null);
      } catch (error) {
        console.error('[AudioControls] TTS error:', error);
      }
    }
  };

  // Handle next button
  const handleNext = () => {
    const dataset = vocabulary.currentDataset;
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
    const dataset = vocabulary.currentDataset;
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
                  audio.pauseAutoPlay();
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
