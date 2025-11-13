/**
 * RS (Repeat Sentence) Interface Component
 *
 * Task-specific UI for practicing Repeat Sentence.
 * Features:
 * - Audio playback controls (Play, Replay, Pause)
 * - Recording functionality with timer (40 seconds max)
 * - Real-time feedback display
 * - AI-powered scoring and tips
 *
 * Phase 5: UI Redesign
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, Flex, Text, Button, Badge, Progress, Separator } from '@radix-ui/themes';
import {
  PlayIcon,
  ReloadIcon,
  StopIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from '@radix-ui/react-icons';
import { ttsEngine } from '../../ts/audio/TTSEngine';
import type { PracticeItem } from '../../types/dataset.types';

interface RSInterfaceProps {
  item: PracticeItem;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
}

interface FeedbackData {
  score: number;
  correct: string[];
  missed: string[];
  tips: string[];
}

const RSInterface: React.FC<RSInterfaceProps> = ({
  item,
  onNext,
  onPrevious,
  onComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Get sentence text
  const sentence = (item as any).content?.sentence || (item as any).sentence || '';
  const difficulty = (item as any).metadata?.difficulty || 'normal';
  const wordCount = (item as any).metadata?.wordCount || sentence.split(' ').length;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Handle audio playback
  const handlePlay = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      await ttsEngine.speak(sentence, null, 0.9); // (text, lang, rate)
    } catch (error) {
      console.error('[RSInterface] Playback error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Handle recording start
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Process recording (in real app, would send to speech recognition API)
        processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setHasRecorded(false);

      // Start timer (max 40 seconds)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 40) {
            handleStopRecording();
            return 40;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('[RSInterface] Recording error:', error);
      alert('Microphone access denied. Please allow microphone access to record.');
    }
  };

  // Handle recording stop
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setHasRecorded(true);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Process recording (simulate AI feedback)
  const processRecording = () => {
    // In production, this would:
    // 1. Send audio to speech recognition API
    // 2. Get transcription
    // 3. Compare with target sentence
    // 4. Generate feedback

    // For now, simulate feedback
    const words = sentence.split(' ');
    const simulatedCorrect = words.slice(0, Math.floor(words.length * 0.7));
    const simulatedMissed = words.slice(Math.floor(words.length * 0.7));

    const mockFeedback: FeedbackData = {
      score: 70 + Math.floor(Math.random() * 20),
      correct: simulatedCorrect,
      missed: simulatedMissed,
      tips: [
        'Focus on linking words naturally',
        'Practice the rhythm and intonation',
        'Try chunking the sentence into smaller phrases',
      ],
    };

    setFeedback(mockFeedback);

    // Notify parent component
    if (onComplete) {
      onComplete();
    }
  };

  // Handle next/previous
  const handleNext = () => {
    // Reset state
    setFeedback(null);
    setHasRecorded(false);
    setRecordingTime(0);

    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    // Reset state
    setFeedback(null);
    setHasRecorded(false);
    setRecordingTime(0);

    if (onPrevious) {
      onPrevious();
    }
  };

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      {/* Header */}
      <Card>
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Text size="5" weight="bold">
              🎧 Repeat Sentence
            </Text>
            <Badge color={difficulty === 'hard' ? 'red' : difficulty === 'easy' ? 'green' : 'yellow'}>
              {difficulty}
            </Badge>
            <Badge variant="soft">{wordCount} words</Badge>
          </Flex>
        </Flex>
      </Card>

      {/* Listen Section */}
      <Card>
        <Flex direction="column" gap="3">
          <Text size="3" weight="bold">
            🎧 Listen Carefully
          </Text>
          <Text size="2" color="gray">
            Play the audio and listen to the sentence. You can replay it as many times as needed.
          </Text>
          <Flex gap="2">
            <Button
              size="3"
              onClick={handlePlay}
              disabled={isPlaying || isRecording}
              variant={isPlaying ? 'soft' : 'solid'}
            >
              {isPlaying ? (
                <>
                  <ReloadIcon className="animate-spin" />
                  Playing...
                </>
              ) : (
                <>
                  <PlayIcon />
                  Play Audio
                </>
              )}
            </Button>
            {isPlaying && (
              <Badge color="blue" size="2">
                🔊 Listening...
              </Badge>
            )}
          </Flex>
          {/* Show sentence text after first play (in practice mode) */}
          {!isRecording && (
            <Card variant="surface" style={{ marginTop: '8px' }}>
              <Text size="3" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                "{sentence}"
              </Text>
            </Card>
          )}
        </Flex>
      </Card>

      {/* Record Section */}
      <Card>
        <Flex direction="column" gap="3">
          <Text size="3" weight="bold">
            🎤 Record Your Response
          </Text>
          <Text size="2" color="gray">
            Click "Start Recording" and repeat the sentence. You have up to 40 seconds.
          </Text>

          {!isRecording && !hasRecorded && (
            <Button
              size="3"
              color="red"
              onClick={handleStartRecording}
              disabled={isPlaying}
            >
              <PlayIcon />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Button
                  size="3"
                  color="gray"
                  onClick={handleStopRecording}
                >
                  <StopIcon />
                  Stop Recording
                </Button>
                <Badge color="red" size="2">
                  🔴 Recording...
                </Badge>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">
                  Time: {recordingTime}s / 40s
                </Text>
                <Progress value={(recordingTime / 40) * 100} color="red" />
              </Flex>
            </Flex>
          )}

          {hasRecorded && !feedback && (
            <Flex direction="column" gap="2">
              <Badge color="green" size="2">
                ✓ Recording complete! Processing...
              </Badge>
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Feedback Section */}
      {feedback && (
        <Card>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Text size="3" weight="bold">
                📊 AI Feedback
              </Text>
              <Badge color={feedback.score >= 80 ? 'green' : feedback.score >= 60 ? 'yellow' : 'red'} size="3">
                Score: {feedback.score}/100
              </Badge>
            </Flex>

            <Separator size="4" />

            {/* Correct words */}
            {feedback.correct.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CheckCircledIcon color="green" width="20" height="20" />
                  <Text size="2" weight="bold">
                    Correct:
                  </Text>
                </Flex>
                <Text size="2" style={{ color: 'var(--green-11)' }}>
                  {feedback.correct.join(' ')}
                </Text>
              </Flex>
            )}

            {/* Missed words */}
            {feedback.missed.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CrossCircledIcon color="red" width="20" height="20" />
                  <Text size="2" weight="bold">
                    Missed/Incorrect:
                  </Text>
                </Flex>
                <Text size="2" style={{ color: 'var(--red-11)' }}>
                  {feedback.missed.join(' ')}
                </Text>
              </Flex>
            )}

            <Separator size="4" />

            {/* Tips */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                💡 Tips to Improve:
              </Text>
              <ul style={{ marginLeft: '20px' }}>
                {feedback.tips.map((tip, idx) => (
                  <li key={idx}>
                    <Text size="2">{tip}</Text>
                  </li>
                ))}
              </ul>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Navigation */}
      <Flex gap="2" justify="between">
        <Button
          variant="soft"
          onClick={handlePrevious}
          disabled={!onPrevious}
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        <Button
          variant="solid"
          onClick={handleNext}
          disabled={!onNext || (!hasRecorded && !feedback)}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </Flex>
    </Flex>
  );
};

export default RSInterface;
