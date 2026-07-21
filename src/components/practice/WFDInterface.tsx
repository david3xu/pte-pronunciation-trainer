/**
 * WFD (Write From Dictation) Interface Component
 *
 * Task-specific UI for practicing Write From Dictation.
 * Features:
 * - Audio playback with 3 play limit
 * - Text input for dictation response
 * - Word-by-word validation
 * - Real-time feedback
 *
 * Phase 5: UI Redesign
 */

import {
    CheckCircledIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CounterClockwiseClockIcon,
    CrossCircledIcon,
    PlayIcon,
    ReloadIcon,
} from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Separator, Text } from '@radix-ui/themes';
import React, { useEffect, useRef, useState } from 'react';
import { ttsEngine } from '../../services/audio/TTSEngine';
import type { SessionManager } from '../../services/session/sessionManager';
import { useSettings } from '../../stores';
import type { ItemType } from '../../types/database';
import type { PracticeItem } from '../../types/dataset.types';

interface WFDInterfaceProps {
  item: PracticeItem;
  sessionManager?: SessionManager;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: (isCorrect?: boolean) => void;
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
  sessionManager,
  onNext,
  onPrevious,
  onComplete,
}) => {
  const settings = useSettings();
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

    // Add timeout to prevent infinite "Playing..." state
    const timeoutId = setTimeout(() => {
      console.warn('[WFDInterface] TTS timeout - audio may have failed to play');
      setIsPlaying(false);
    }, 10000); // 10 second timeout

    try {
      await ttsEngine.speak(sentence, null, settings.ttsRate); // (text, lang, rate)
    } catch (error) {
      console.error('[WFDInterface] Playback error:', error);
    } finally {
      clearTimeout(timeoutId); // Clear timeout if TTS completes normally
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
  const handleSubmit = async () => {
    if (!userInput.trim() || hasSubmitted) return;

    const feedbackData = compareWords(userInput, sentence);
    setFeedback(feedbackData);
    setHasSubmitted(true);

    const isCorrect = feedbackData.accuracy >= 70;

    // Record session data to database (Phase 2)
    if (sessionManager) {
      try {
        const itemId = (item as any).id || `wfd-${Date.now()}`;
        await sessionManager.recordItem({
          item_id: itemId,
          item_type: 'sentence' as ItemType,
          item_text: sentence,
          user_response: userInput.trim(),
          score: feedbackData.accuracy,
          is_correct: isCorrect,
          attempts: 1,
          time_spent_sec: playCount * 3, // Rough estimate based on play count
        });
        console.log('[WFDInterface] Session recorded:', itemId);
      } catch (error) {
        console.error('[WFDInterface] Failed to record session:', error);
        // Don't block user flow on session recording failure
      }
    }

    // Notify parent component
    if (onComplete) {
      onComplete(isCorrect);
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
          <Flex align="center" gap="2" wrap="wrap">
            <Text  weight="bold">
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
          <Text  weight="bold">
            🎧 Listen to the Sentence
          </Text>
          <Text >
            Listen carefully and write exactly what you hear. You can play up to 3 times.
          </Text>
          <Flex gap="2" align="center">
            <Button

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
              <Badge >
                {MAX_PLAYS - playCount} plays left
              </Badge>
            )}
            {playCount >= MAX_PLAYS && !hasSubmitted && (
              <Badge >
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
            <Text  weight="bold">
              ✍️ Write What You Heard
            </Text>
            <Text >
              Type the complete sentence exactly as you heard it. Don't worry about punctuation.
            </Text>
            <textarea className="border border-gray-300 rounded px-3 py-2"
              ref={inputRef}

              placeholder="Type the sentence here..."

              onChange={(e: any) => setUserInput(e.target.value)}
              disabled={isPlaying}
              rows={3}
              style={{ resize: 'vertical' }}
            />
            <Flex gap="2" justify="between">
              <Text >
                {userInput.trim().split(/\s+/).filter((w) => w).length} words typed
              </Text>
              <Button


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
              <Text  weight="bold">
                📊 Results
              </Text>
              <Badge
                color={feedback.accuracy >= 80 ? 'green' : feedback.accuracy >= 60 ? 'yellow' : 'red'}

              >
                {feedback.accuracy}% Accuracy
              </Badge>
            </Flex>

            <div className="w-full bg-app-border rounded-full h-2" color={feedback.accuracy >= 80 ? 'green' : feedback.accuracy >= 60 ? 'yellow' : 'red'} />

            <Separator />

            {/* Your transcription */}
            <Flex direction="column" gap="2">
              <Text  weight="bold">
                Your Transcription:
              </Text>
              <Card variant="surface">
                <Text  style={{ fontStyle: 'italic' }}>
                  {feedback.userSentence || '(empty)'}
                </Text>
              </Card>
            </Flex>

            {/* Correct sentence */}
            <Flex direction="column" gap="2">
              <Text  weight="bold">
                Correct Sentence:
              </Text>
              <Card variant="surface">
                <Text  style={{ fontStyle: 'italic', color: 'var(--green-11)' }}>
                  {feedback.correctSentence}
                </Text>
              </Card>
            </Flex>

            <Separator />

            {/* Correct words */}
            {feedback.correctWords.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CheckCircledIcon width="20" height="20" />
                  <Text  weight="bold">
                    Correct Words ({feedback.correctWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.correctWords.map((word, idx) => (
                    <Badge key={idx} variant="soft">
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
                  <CrossCircledIcon width="20" height="20" />
                  <Text  weight="bold">
                    Missed Words ({feedback.missedWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.missedWords.map((word, idx) => (
                    <Badge key={idx} variant="soft">
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
                  <CrossCircledIcon width="20" height="20" />
                  <Text  weight="bold">
                    Extra Words ({feedback.extraWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.extraWords.map((word, idx) => (
                    <Badge key={idx} variant="soft">
                      {word}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}

            <Separator />

            {/* Tips */}
            <Flex direction="column" gap="2">
              <Text  weight="bold">
                💡 Tips:
              </Text>
              <ul style={{ marginLeft: '20px' }}>
                {feedback.accuracy >= 80 ? (
                  <li>
                    <Text >Excellent work! Keep practicing to maintain accuracy.</Text>
                  </li>
                ) : feedback.accuracy >= 60 ? (
                  <>
                    <li>
                      <Text >Good effort! Focus on capturing all words.</Text>
                    </li>
                    <li>
                      <Text >Listen for word boundaries and linking sounds.</Text>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Text >Listen to the audio multiple times before typing.</Text>
                    </li>
                    <li>
                      <Text >Focus on content words (nouns, verbs, adjectives).</Text>
                    </li>
                    <li>
                      <Text >Don't worry about small grammar mistakes.</Text>
                    </li>
                  </>
                )}
              </ul>
            </Flex>

            {/* Retry button */}
            <Button

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
