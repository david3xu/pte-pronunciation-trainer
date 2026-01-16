/**
 * VocabTypingInterface Component
 *
 * Practice interface for vocabulary typing - similar to WFD but for vocabulary items.
 * Features:
 * - Audio playback with TTS
 * - Text input for typing the word/phrase
 * - Word-by-word validation
 * - Real-time feedback with accuracy scoring
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
import type { VocabularyTerm } from '../../types/dataset.types';

interface VocabTypingInterfaceProps {
  item: VocabularyTerm;
  sessionManager?: SessionManager;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  currentIndex?: number;
  totalItems?: number;
}

interface FeedbackData {
  accuracy: number;
  correctWords: string[];
  missedWords: string[];
  extraWords: string[];
  userInput: string;
  correctText: string;
  isExactMatch: boolean;
}

const VocabTypingInterface: React.FC<VocabTypingInterfaceProps> = ({
  item,
  sessionManager,
  onNext,
  onPrevious,
  onComplete,
  currentIndex,
  totalItems,
}) => {
  const settings = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Get vocabulary data - handle markdown bold markers, supporting both data formats
  const rawItem = item as any;
  const rawEnglish = rawItem.word || rawItem.english || '';
  const english = rawEnglish.replace(/\*\*/g, '').trim(); // Remove ** markers
  const difficulty = item?.difficulty || 'normal';
  const category = item?.category || '';

  // Handle both flat IPA structure and nested pronunciation object
  const ipaText = rawItem.ipa?.british ||
                 rawItem.ipa?.american ||
                 rawItem.ipa?.single ||
                 rawItem.pronunciation?.british?.ipa ||
                 rawItem.pronunciation?.american?.ipa ||
                 '';

  // Maximum plays allowed
  const MAX_PLAYS = 5;

  // Handle audio playback
  const handlePlay = async () => {
    if (isPlaying || playCount >= MAX_PLAYS) return;

    setIsPlaying(true);
    setPlayCount((prev) => prev + 1);

    // Add timeout to prevent infinite "Playing..." state
    const timeoutId = setTimeout(() => {
      console.warn('[VocabTypingInterface] TTS timeout - audio may have failed to play');
      setIsPlaying(false);
    }, 10000); // 10 second timeout

    try {
      await ttsEngine.speak(english, null, settings.ttsRate);
    } catch (error) {
      console.error('[VocabTypingInterface] Playback error:', error);
    } finally {
      clearTimeout(timeoutId); // Clear timeout if TTS completes normally
      setIsPlaying(false);
    }
  };

  // Compare user input with correct text
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

    // Check for exact match
    const isExactMatch = userNormalized === correctNormalized;

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
        userWordsCopy.splice(index, 1);
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
      userInput: userText.trim(),
      correctText,
      isExactMatch,
    };
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!userInput.trim() || hasSubmitted) return;

    const feedbackData = compareWords(userInput, english);
    setFeedback(feedbackData);
    setHasSubmitted(true);

    // Record session data
    if (sessionManager) {
      try {
        const itemId = `vocab-${english.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
        await sessionManager.recordItem({
          item_id: itemId,
          item_type: 'word' as ItemType,
          item_text: english,
          user_response: userInput.trim(),
          score: feedbackData.accuracy,
          is_correct: feedbackData.isExactMatch,
          attempts: 1,
          time_spent_sec: playCount * 2,
        });
        console.log('[VocabTypingInterface] Session recorded:', itemId);
      } catch (error) {
        console.error('[VocabTypingInterface] Failed to record session:', error);
      }
    }

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

    // Auto-play on retry
    // Trigger playback after a short delay to allow state reset
    setTimeout(() => {
      if (!isPlaying) {
        setIsPlaying(true);
        setPlayCount(1);
        ttsEngine.speak(english, null, settings.ttsRate)
          .catch(err => console.error('[VocabTyping] Retry playback error:', err))
          .finally(() => setIsPlaying(false));
      }
    }, 300);
  };

  // Handle next/previous
  const handleNext = () => {
    setUserInput('');
    setFeedback(null);
    setHasSubmitted(false);
    setPlayCount(0);
    if (onNext) onNext();
  };

  const handlePrevious = () => {
    setUserInput('');
    setFeedback(null);
    setHasSubmitted(false);
    setPlayCount(0);
    if (onPrevious) onPrevious();
  };

  // Handle Enter key submission (Input specific)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userInput.trim() && !hasSubmitted && playCount > 0) {
      handleSubmit();
    }
  };

  // Global keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Previous: ArrowLeft or < or ,
      if (e.key === 'ArrowLeft' || e.key === '<' || e.key === ',') {
        e.preventDefault(); // Prevent default behavior
        handlePrevious();
      }

      // Next: ArrowRight or > or .
      // IMPORTANT: Allow skipping even with empty input - always enabled!
      if (e.key === 'ArrowRight' || e.key === '>' || e.key === '.') {
        e.preventDefault(); // Prevent default behavior
        handleNext();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleNext, handlePrevious]);

  // Auto-focus input after first play
  useEffect(() => {
    if (playCount === 1 && !isPlaying && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [playCount, isPlaying]);

  // Reset state and auto-play when item changes
  useEffect(() => {
    setUserInput('');
    setFeedback(null);
    setHasSubmitted(false);
    setPlayCount(0);

    // Auto-play with a small delay to allow state reset and natural transition
    if (settings.autoPlay) {
      const timer = setTimeout(() => {
        if (!isPlaying) {
          setIsPlaying(true);
          setPlayCount(1); // Set to 1 as this is the first play
          // Use the computed English text
          ttsEngine.speak(english, null, settings.ttsRate)
            .catch(err => console.error('[VocabTyping] Auto-play error:', err))
            .finally(() => setIsPlaying(false));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [item, settings.autoPlay]);

  return (
    <Flex direction="column" gap="4" style={{ width: '100%' }}>
      {/* Header */}
      <Card>
        <Flex justify="between" align="center">
          <Flex align="center" gap="2" wrap="wrap">
            <Text weight="bold">
              ✍️ Vocabulary Typing Practice
            </Text>
            {currentIndex !== undefined && totalItems !== undefined && (
              <Badge color="blue" variant="solid">
                {currentIndex + 1}/{totalItems}
              </Badge>
            )}
            <Badge color={difficulty === 'hard' ? 'red' : difficulty === 'easy' ? 'green' : 'yellow'}>
              {difficulty}
            </Badge>
            {category && (
              <Badge variant="soft">{category.replace('pte-', '').replace(/-/g, ' ')}</Badge>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Listen Section */}
      <Card>
        <Flex direction="column" gap="3">
          <Text weight="bold">
            🎧 Listen to the Word/Phrase
          </Text>
          <Text>
            Listen carefully and type exactly what you hear. You can play up to {MAX_PLAYS} times.
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
              <Badge>
                {MAX_PLAYS - playCount} plays left
              </Badge>
            )}
            {playCount >= MAX_PLAYS && !hasSubmitted && (
              <Badge>
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
            <Text weight="bold">
              ✍️ Type What You Heard
            </Text>
            <Text>
              Type the word or phrase exactly as you heard it.
            </Text>
            <input
              ref={inputRef}
              type="text"
              className="border border-gray-300 rounded px-3 py-2 bg-slate-800 text-white"
              placeholder="Type the word/phrase here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPlaying || playCount === 0}
              autoComplete="off"
              spellCheck={false}
            />
            <Flex gap="2" justify="between">
              <Text>
                {userInput.trim().length} characters typed
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
              <Text weight="bold">
                📊 Results
              </Text>
              <Badge
                color={feedback.isExactMatch ? 'green' : feedback.accuracy >= 60 ? 'yellow' : 'red'}
              >
                {feedback.isExactMatch ? '✓ Perfect!' : `${feedback.accuracy}% Accuracy`}
              </Badge>
            </Flex>

            <Separator />

            {/* Your answer */}
            <Flex direction="column" gap="2">
              <Text weight="bold">
                Your Answer:
              </Text>
              <Card variant="surface">
                <Text style={{ fontStyle: 'italic' }}>
                  {feedback.userInput || '(empty)'}
                </Text>
              </Card>
            </Flex>

            {/* Correct answer */}
            <Flex direction="column" gap="2">
              <Text weight="bold">
                Correct Answer:
              </Text>
              <Card variant="surface">
                <Text style={{ fontStyle: 'italic', color: 'var(--green-11)' }}>
                  {feedback.correctText}
                </Text>
                {ipaText && (
                  <Text size="2" style={{ color: 'var(--gray-11)', marginTop: '4px' }}>
                    /{ipaText}/
                  </Text>
                )}
              </Card>
            </Flex>

            <Separator />

            {/* Word breakdown */}
            {feedback.correctWords.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CheckCircledIcon width="20" height="20" />
                  <Text weight="bold">
                    Correct Words ({feedback.correctWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.correctWords.map((word, idx) => (
                    <Badge key={idx} variant="soft" color="green">
                      {word}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}

            {feedback.missedWords.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CrossCircledIcon width="20" height="20" />
                  <Text weight="bold">
                    Missed Words ({feedback.missedWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.missedWords.map((word, idx) => (
                    <Badge key={idx} variant="soft" color="red">
                      {word}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}

            {feedback.extraWords.length > 0 && (
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <CrossCircledIcon width="20" height="20" />
                  <Text weight="bold">
                    Extra Words ({feedback.extraWords.length}):
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap="1">
                  {feedback.extraWords.map((word, idx) => (
                    <Badge key={idx} variant="soft" color="orange">
                      {word}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}

            <Separator />

            {/* Tips */}
            <Flex direction="column" gap="2">
              <Text weight="bold">
                💡 Tips:
              </Text>
              <ul style={{ marginLeft: '20px' }}>
                {feedback.isExactMatch ? (
                  <li>
                    <Text>Excellent! Perfect spelling. Keep it up! 🎉</Text>
                  </li>
                ) : feedback.accuracy >= 80 ? (
                  <>
                    <li>
                      <Text>Good effort! Pay attention to spelling details.</Text>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Text>Listen to the audio more times before typing.</Text>
                    </li>
                    <li>
                      <Text>Focus on each word carefully.</Text>
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
          disabled={!onNext}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </Flex>
    </Flex>
  );
};

export default VocabTypingInterface;
