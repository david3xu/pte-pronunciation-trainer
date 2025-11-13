/**
 * WFD (Write From Dictation) Interface Component
 *
 * Task-specific UI for practicing Write From Dictation.
 * Features:
 * - Audio playback for sentence (listen multiple times)
 * - Text input for transcription
 * - Word-by-word comparison with highlighting
 * - Accuracy scoring
 * - Detailed feedback on missed/extra words
 *
 * Phase 5: UI Redesign
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, Flex, Text, Button, Badge, TextArea, Separator, Progress } from '@radix-ui/themes';
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

interface WFDInterfaceProps {
  item: PracticeItem;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
}

interface FeedbackData {
  accuracy: number;
  correctWords: string[];
  missedWords: string[];
  extraWords: string[];
  userSentence: string;
  correctSentence: string;
}

const WFDInterface: React.FC<WFDInterfaceProps> = ({
  item,
  onNext,
  onPrevious,
  onComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get sentence data
  const sentence = (item as any).content?.sentence || (item as any).sentence || '';
  const difficulty = (item as any).metadata?.difficulty || 'normal';
  const category = (item as any).metadata?.category || '';
  const wordCount = sentence.split(' ').filter((w: string) => w.trim()).length;

  // Maximum 3 plays allowed in real PTE
  const MAX_PLAYS = 3;

  // Handle audio playback
  const handlePlay = async () => {
    if (isPlaying || playCount >= MAX_PLAYS) return;

    setIsPlaying(true);
    setPlayCount((prev) => prev + 1);

    try {
      await ttsEngine.speak(sentence, null, 0.9); // (text, lang, rate)
    } catch (error) {
      console.error('[WFDInterface] Playback error:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Compare user input with correct sentence
  const compareWords = (userText: string, correctText: string): FeedbackData => {
    // Normalize: lowercase, remove extra spaces, punctuation
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

    const userNormalized = normalize(userText);
    const correctNormalized = normalize(correctText);

    const userWords = userNormalized.split(' ').filter((w) => w);
    const correctWords = correctNormalized.split(' ').filter((w) => w);

    // Find correct, missed, and extra words
    const correct: string[] = [];
    const missed: string[] = [];
    const extra: string[] = [];

    // Check each correct word
    const userWordsCopy = [...userWords];
    correctWords.forEach((word) => {
      const index = userWordsCopy.indexOf(word);
      if (index !== -1) {
        correct.push(word);
        userWordsCopy.splice(index, 1); // Remove matched word
      } else {
        missed.push(word);
      }
    });

    // Remaining user words are extras
    extra.push(...userWordsCopy);

    // Calculate accuracy (correct words / total correct words * 100)
    const accuracy = correctWords.length > 0
      ? Math.round((correct.length / correctWords.length) * 100)
      : 0;

    return {
      accuracy,
      correctWords: correct,
      missedWords: missed,
      extraWords: extra,
      userSentence: userText.trim(),
      correctSentence: correctText,
    };
  };

  // Handle submission
  const handleSubmit = () => {
    if (!userInput.trim() || hasSubmitted) return;

    const feedbackData = compareWords(userInput, sentence);
    setFeedback(feedbackData);
    setHasSubmitted(true);

    // Notify parent component
    if (onComplete) {
      onComplete();
    }
  };

  // Handle retry
  const handleRetry = () => {
    setUserInput('');
    setFeedback(null);
    setHasSubmitted(false);
    setPlayCount(0);
  };

  // Handle next/previous
  const handleNext = () => {
    // Reset state
    setUserInput('');
    setFeedback(null);
    setHasSubmitted(false);
    setPlayCount(0);

    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    // Reset state
    setUserInput('');
    setFeedback(null);
    setHasSubmitted(false);
    setPlayCount(0);

    if (onPrevious) {
      onPrevious();
    }
  };

  // Auto-focus input after first play
  useEffect(() => {
    if (playCount === 1 && !isPlaying && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [playCount, isPlaying]);

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      {/* Header */}
      <Card>
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Text size="5" weight="bold">
              ✍️ Write From Dictation
            </Text>
            <Badge color={difficulty === 'hard' ? 'red' : difficulty === 'easy' ? 'green' : 'yellow'}>
              {difficulty}
            </Badge>
            <Badge variant="soft">{wordCount} words</Badge>
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
            🎧 Listen to the Sentence
          </Text>
          <Text size="2" color="gray">
            Listen carefully and write exactly what you hear. You can play up to 3 times.
          </Text>
          <Flex gap="2" align="center">
            <Button
              size="3"
              onClick={handlePlay}
              disabled={isPlaying || playCount >= MAX_PLAYS || hasSubmitted}
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
                  Play Audio ({playCount}/{MAX_PLAYS})
                </>
              )}
            </Button>
            {playCount > 0 && playCount < MAX_PLAYS && !hasSubmitted && (
              <Badge color="blue" size="2">
                {MAX_PLAYS - playCount} plays left
              </Badge>
            )}
            {playCount >= MAX_PLAYS && !hasSubmitted && (
              <Badge color="orange" size="2">
                No plays remaining
              </Badge>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Input Section */}
      {!hasSubmitted && (
        <Card>
          <Flex direction="column" gap="3">
            <Text size="3" weight="bold">
              ✍️ Write What You Heard
            </Text>
            <Text size="2" color="gray">
              Type the complete sentence exactly as you heard it. Don't worry about punctuation.
            </Text>
            <TextArea
              ref={inputRef}
              size="3"
              placeholder="Type the sentence here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isPlaying}
              rows={3}
              style={{ resize: 'vertical' }}
            />
            <Flex gap="2" justify="between">
              <Text size="2" color="gray">
                {userInput.trim().split(/\s+/).filter((w) => w).length} words typed
              </Text>
              <Button
                size="3"
                color="green"
                onClick={handleSubmit}
                disabled={!userInput.trim() || isPlaying || playCount === 0}
              >
                Submit Answer
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Feedback Section */}
      {feedback && hasSubmitted && (
        <Card>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Text size="3" weight="bold">
                📊 Results
              </Text>
              <Badge
                color={feedback.accuracy >= 80 ? 'green' : feedback.accuracy >= 60 ? 'yellow' : 'red'}
                size="3"
              >
                {feedback.accuracy}% Accuracy
              </Badge>
            </Flex>

            <Progress value={feedback.accuracy} color={feedback.accuracy >= 80 ? 'green' : feedback.accuracy >= 60 ? 'yellow' : 'red'} />

            <Separator size="4" />

            {/* Your transcription */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Your Transcription:
              </Text>
              <Card variant="surface">
                <Text size="2" style={{ fontStyle: 'italic' }}>
                  {feedback.userSentence || '(empty)'}
                </Text>
              </Card>
            </Flex>

            {/* Correct sentence */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Correct Sentence:
              </Text>
              <Card variant="surface">
                <Text size="2" style={{ fontStyle: 'italic', color: 'var(--green-11)' }}>
                  {feedback.correctSentence}
                </Text>
              </Card>
            </Flex>

            <Separator size="4" />

            {/* Correct words */}
            {feedback.correctWords.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CheckCircledIcon color="green" width="20" height="20" />
                  <Text size="2" weight="bold">
                    Correct Words ({feedback.correctWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.correctWords.map((word, idx) => (
                    <Badge key={idx} color="green" variant="soft">
                      {word}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}

            {/* Missed words */}
            {feedback.missedWords.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CrossCircledIcon color="red" width="20" height="20" />
                  <Text size="2" weight="bold">
                    Missed Words ({feedback.missedWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.missedWords.map((word, idx) => (
                    <Badge key={idx} color="red" variant="soft">
                      {word}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}

            {/* Extra words */}
            {feedback.extraWords.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CrossCircledIcon color="orange" width="20" height="20" />
                  <Text size="2" weight="bold">
                    Extra Words ({feedback.extraWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.extraWords.map((word, idx) => (
                    <Badge key={idx} color="orange" variant="soft">
                      {word}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}

            <Separator size="4" />

            {/* Tips */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                💡 Tips:
              </Text>
              <ul style={{ marginLeft: '20px' }}>
                {feedback.accuracy >= 80 ? (
                  <li>
                    <Text size="2">Excellent work! Keep practicing to maintain accuracy.</Text>
                  </li>
                ) : feedback.accuracy >= 60 ? (
                  <>
                    <li>
                      <Text size="2">Good effort! Focus on capturing all words.</Text>
                    </li>
                    <li>
                      <Text size="2">Listen for word boundaries and linking sounds.</Text>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Text size="2">Listen to the audio multiple times before typing.</Text>
                    </li>
                    <li>
                      <Text size="2">Focus on content words (nouns, verbs, adjectives).</Text>
                    </li>
                    <li>
                      <Text size="2">Don't worry about small grammar mistakes.</Text>
                    </li>
                  </>
                )}
              </ul>
            </Flex>

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
          disabled={!onNext || !hasSubmitted}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </Flex>
    </Flex>
  );
};

export default WFDInterface;
