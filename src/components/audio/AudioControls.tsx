/**
 * AudioControls Component
 *
 * Controls for audio playback (play, pause, next, previous, auto-play).
 * Integrates with Zustand audio store.
 */

import {
  LoopIcon,
  PauseIcon,
  PlayIcon,
  SpeakerLoudIcon,
  TrackNextIcon,
  TrackPreviousIcon,
} from '@radix-ui/react-icons';
import { Button, Card, Flex, Slider, Switch, Text } from '@radix-ui/themes';
import React from 'react';
import { useAudioState, useProgress, useSettings } from '../../stores';
import { audioServiceForPlatform } from '../../services/audio/audioServiceForPlatform';
import { useAutoPlayController } from './hooks/useAutoPlayController';

const AudioControls: React.FC = () => {
  const audio = useAudioState();
  const progress = useProgress();
  const settings = useSettings();
  const { handlePlay, handlePause, handleNext, handlePrev } = useAutoPlayController();
  const [playRequested, setPlayRequested] = React.useState(false);
  const showPause = playRequested || (audio.isAutoPlaying && !audio.isPaused);

  React.useEffect(() => {
    if (audio.needsResume) {
      setPlayRequested(false);
    }
  }, [audio.needsResume]);

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
            aria-label="Previous"
          >
            <TrackPreviousIcon width="20" height="20" />
          </Button>

          {/* Play/Pause */}
          <Button
            size="4"
            variant="solid"
            onClick={() => {
              if (showPause) {
                setPlayRequested(false);
                handlePause();
              } else {
                setPlayRequested(true);
                handlePlay();
              }
            }}
          >
            {showPause ? (
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
            aria-label="Next"
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
            Item {progress.currentIndex + 1}
            {progress.totalItems > 0 ? ` / ${progress.totalItems}` : ''}
          </Text>
          <Flex align="center" gap="2">
            <div className="w-full h-2 bg-app-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${progress.totalItems > 0 ? Math.min(100, ((progress.currentIndex + 1) / progress.totalItems) * 100) : 0}%`,
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
              checked={settings.autoPlay}
              onCheckedChange={(checked) => settings.updateSetting('autoPlay', checked)}
            />
          </Flex>

          {/* Speed control */}
          <Flex direction="column" gap="2">
            <Flex justify="between">
              <Text size="2">Playback speed</Text>
              <Text size="2" color="gray">
                {settings.ttsRate.toFixed(1)}x
              </Text>
            </Flex>
            <Slider
              value={[settings.ttsRate]}
              onValueChange={([speed]) => {
                const nextRate = speed ?? 0.7;
                settings.updateSetting('ttsRate', nextRate);
                audioServiceForPlatform.setRate(nextRate);
              }}
              min={0.5}
              max={2.0}
              step={0.1}
              data-testid="playback-speed-slider"
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
