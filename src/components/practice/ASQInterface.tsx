/**
 * ASQ (Answer Short Question) Interface Component
 *
 * Task-specific UI for practicing Answer Short Question.
 * Features:
 * - Audio playback for question
 * - 3-second thinking timer
 * - Quick text input for answer (1-2 words)
 * - Immediate feedback with correct answer
 * - Fast-paced, simple UI
 *
 * Phase 5: UI Redesign
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, Flex, Text, Button, Badge, TextField, Separator } from '@radix-ui/themes';
import {
  PlayIcon,
  ReloadIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  CounterClockwiseClockIcon,
} from '@radix-ui/react-icons';
import { ttsEngine } from '../../ts/audio/TTSEngine';
import type { PracticeItem } from '../../types/dataset.types';

interface ASQInterfaceProps {
  item: PracticeItem;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
}

interface FeedbackData {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  tips?: string;
}

const ASQInterface: React.FC<ASQInterfaceProps> = ({
  item,
  onNext,
  onPrevious,
  onComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  // Get question and answer data
  const question = (item as any).content?.question || (item as any).question || '';
  const correctAnswer = (item as any).content?.answer || (item as any).answer || '';
  const difficulty = (item as any).metadata?.difficulty || 'normal';
  const category = (item as any).metadata?.category || '';

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
      }
    };
  }, []);

  // Handle audio playback
  const handlePlay = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setIsThinking(false);
    setThinkingTime(0);

    try {
      await ttsEngine.speak(question, null, 0.9); // (text, lang, rate)

      // Start 3-second thinking timer after playback
      setIsThinking(true);
      setThinkingTime(3);

      thinkingTimerRef.current = setInterval(() => {
        setThinkingTime((prev) => {
          if (prev <= 1) {
            if (thinkingTimerRef.current) {
              clearInterval(thinkingTimerRef.current);
              thinkingTimerRef.current = null;
            }
            setIsThinking(false);
            // Focus on input field
            setTimeout(() => {
              answerInputRef.current?.focus();
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('[ASQInterface] Playback error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!userAnswer.trim() || hasAnswered) return;

    // Normalize answers for comparison (lowercase, trim whitespace)
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

    // Check if answer is correct (exact match or contained in correct answer)
    const isCorrect =
      normalizedUserAnswer === normalizedCorrectAnswer ||
      normalizedCorrectAnswer.includes(normalizedUserAnswer);

    const feedbackData: FeedbackData = {
      isCorrect,
      userAnswer: userAnswer.trim(),
      correctAnswer: correctAnswer,
      tips: isCorrect
        ? 'Great job! Keep it up!'
        : 'Try to listen carefully for key words in the question.',
    };

    setFeedback(feedbackData);
    setHasAnswered(true);

    // Notify parent component
    if (onComplete) {
      onComplete();
    }
  };

  // Handle Enter key in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmitAnswer();
    }
  };

  // Handle retry (replay question)
  const handleRetry = () => {
    setUserAnswer('');
    setFeedback(null);
    setHasAnswered(false);
    setThinkingTime(0);
    setIsThinking(false);
    if (thinkingTimerRef.current) {
      clearInterval(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  };

  // Handle next/previous
  const handleNext = () => {
    // Reset state
    setUserAnswer('');
    setFeedback(null);
    setHasAnswered(false);
    setThinkingTime(0);
    setIsThinking(false);

    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    // Reset state
    setUserAnswer('');
    setFeedback(null);
    setHasAnswered(false);
    setThinkingTime(0);
    setIsThinking(false);

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
              ❓ Answer Short Question
            </Text>
            <Badge color={difficulty === 'hard' ? 'red' : difficulty === 'easy' ? 'green' : 'yellow'}>
              {difficulty}
            </Badge>
            {category && (
              <Badge variant="soft">{category.replace('pte-', '').toUpperCase()}</Badge>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Listen Section */}
      <Card>
        <Flex direction="column" gap="3">
          <Text size="3" weight="bold">
            🎧 Listen to the Question
          </Text>
          <Text size="2" color="gray">
            Play the audio and listen carefully. You'll have 3 seconds to think after it plays.
          </Text>
          <Flex gap="2">
            <Button
              size="3"
              onClick={handlePlay}
              disabled={isPlaying || isThinking || hasAnswered}
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
                  Play Question
                </>
              )}
            </Button>
            {!hasAnswered && (
              <Button
                size="3"
                variant="soft"
                onClick={handleRetry}
                disabled={isPlaying || isThinking}
              >
                <CounterClockwiseClockIcon />
                Replay
              </Button>
            )}
          </Flex>

          {/* Thinking Timer */}
          {isThinking && (
            <Flex direction="column" gap="2" mt="2">
              <Badge color="blue" size="2">
                🤔 Thinking time: {thinkingTime}s
              </Badge>
            </Flex>
          )}

          {/* Show question text after first play (for practice mode) */}
          {!isPlaying && !hasAnswered && (
            <Card variant="surface" style={{ marginTop: '8px' }}>
              <Text size="3" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                "{question}"
              </Text>
            </Card>
          )}
        </Flex>
      </Card>

      {/* Answer Section */}
      {!hasAnswered && (
        <Card>
          <Flex direction="column" gap="3">
            <Text size="3" weight="bold">
              ✍️ Your Answer
            </Text>
            <Text size="2" color="gray">
              Type your answer (usually 1-2 words) and press Enter or click Submit.
            </Text>
            <Flex gap="2" align="end">
              <div style={{ flex: 1 }}>
                <TextField.Root
                  ref={answerInputRef}
                  size="3"
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isPlaying || isThinking}
                />
              </div>
              <Button
                size="3"
                color="green"
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || isPlaying || isThinking}
              >
                Submit Answer
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Feedback Section */}
      {feedback && hasAnswered && (
        <Card>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Text size="3" weight="bold">
                📊 Result
              </Text>
              <Badge color={feedback.isCorrect ? 'green' : 'red'} size="3">
                {feedback.isCorrect ? '✓ Correct' : '✗ Incorrect'}
              </Badge>
            </Flex>

            <Separator size="4" />

            {/* User's answer */}
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                {feedback.isCorrect ? (
                  <CheckCircledIcon color="green" width="20" height="20" />
                ) : (
                  <CrossCircledIcon color="red" width="20" height="20" />
                )}
                <Text size="2" weight="bold">
                  Your Answer:
                </Text>
              </Flex>
              <Text size="3" style={{ color: feedback.isCorrect ? 'var(--green-11)' : 'var(--red-11)' }}>
                {feedback.userAnswer}
              </Text>
            </Flex>

            {/* Correct answer (if wrong) */}
            {!feedback.isCorrect && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CheckCircledIcon color="green" width="20" height="20" />
                  <Text size="2" weight="bold">
                    Correct Answer:
                  </Text>
                </Flex>
                <Text size="3" style={{ color: 'var(--green-11)' }}>
                  {feedback.correctAnswer}
                </Text>
              </Flex>
            )}

            <Separator size="4" />

            {/* Tips */}
            {feedback.tips && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  💡 Tip:
                </Text>
                <Text size="2">{feedback.tips}</Text>
              </Flex>
            )}

            {/* Retry button */}
            <Button
              size="2"
              variant="soft"
              onClick={handleRetry}
            >
              <CounterClockwiseClockIcon />
              Try Again
            </Button>
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
          disabled={!onNext || !hasAnswered}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </Flex>
    </Flex>
  );
};

export default ASQInterface;
