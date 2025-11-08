/**
 * WordCard Component
 *
 * Displays vocabulary word/sentence with pronunciation information.
 * Replaces the vanilla JS word card UI.
 */

import React from 'react';
import { Card, Text, Badge, Button, Flex } from '@radix-ui/themes';
import { SpeakerLoudIcon, PlayIcon } from '@radix-ui/react-icons';
import { useAppStore } from '../ts/stores';
import type { VocabularyTerm, PracticeItem } from '../types/dataset.types';

interface WordCardProps {
  item: VocabularyTerm | PracticeItem;
}

const WordCard: React.FC<WordCardProps> = ({ item }) => {
  const { tts } = useAppStore();

  // Determine if this is a vocabulary term or practice item
  const isVocabularyTerm = 'word' in item;
  const isPracticeSentence = 'sentence' in item;
  const isPracticeQuestion = 'question' in item;

  // Extract relevant fields
  const displayText = isVocabularyTerm
    ? (item as VocabularyTerm).word
    : isPracticeSentence
    ? 'sentence' in item ? item.sentence : ''
    : 'question' in item ? item.question : '';

  const difficulty = 'difficulty' in item
    ? item.difficulty
    : ('metadata' in item && item.metadata?.difficulty) || 'normal';

  const ipa = isVocabularyTerm ? (item as VocabularyTerm).ipa : null;

  // Handle TTS playback
  const handleSpeak = (mode: 'word' | 'sentence' | 'question' = 'word') => {
    if (isVocabularyTerm && ipa) {
      // Speak word with British pronunciation
      tts.startSpeaking(displayText, ipa.british || displayText, mode);
    } else {
      // Speak sentence/question
      tts.startSpeaking(displayText, undefined, isPracticeSentence ? 'sentence' : 'question');
    }
  };

  // Difficulty color mapping
  const difficultyColor = {
    easy: 'green',
    normal: 'blue',
    hard: 'red',
  }[difficulty as string] || 'gray';

  return (
    <Card size="4" className="word-card animate-in">
      {/* Header with difficulty badge */}
      <Flex justify="between" align="center" mb="4">
        <Badge color={difficultyColor as any} size="2">
          {difficulty}
        </Badge>
        {isVocabularyTerm && (item as VocabularyTerm).category && (
          <Badge color="gray" size="2" variant="soft">
            {(item as VocabularyTerm).category}
          </Badge>
        )}
      </Flex>

      {/* Main content - Word/Sentence/Question */}
      <Flex direction="column" gap="4">
        <Text size="8" weight="bold" className="text-primary">
          {displayText}
        </Text>

        {/* Pronunciation (for vocabulary terms) */}
        {isVocabularyTerm && ipa && (
          <Flex direction="column" gap="3">
            {/* British pronunciation */}
            {ipa.british && (
              <Flex direction="column" gap="1">
                <Text size="2" color="gray" weight="medium">
                  🇬🇧 British
                </Text>
                <Flex align="center" gap="2">
                  <Text size="4" className="font-mono text-accent">
                    {ipa.british}
                  </Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => handleSpeak('word')}
                    disabled={tts.isSpeaking}
                  >
                    <SpeakerLoudIcon />
                  </Button>
                </Flex>
                {(item as VocabularyTerm).phonetic?.british && (
                  <Text size="3" color="gray" className="italic">
                    Sounds like: <strong>{(item as VocabularyTerm).phonetic?.british}</strong>
                  </Text>
                )}
              </Flex>
            )}

            {/* American pronunciation */}
            {ipa.american && (
              <Flex direction="column" gap="1" mt="2">
                <Text size="2" color="gray" weight="medium">
                  🇺🇸 American
                </Text>
                <Flex align="center" gap="2">
                  <Text size="4" className="font-mono text-accent">
                    {ipa.american}
                  </Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => handleSpeak('word')}
                    disabled={tts.isSpeaking}
                  >
                    <SpeakerLoudIcon />
                  </Button>
                </Flex>
                {(item as VocabularyTerm).phonetic?.american && (
                  <Text size="3" color="gray" className="italic">
                    Sounds like: <strong>{(item as VocabularyTerm).phonetic?.american}</strong>
                  </Text>
                )}
              </Flex>
            )}
          </Flex>
        )}

        {/* Play button for practice items */}
        {(isPracticeSentence || isPracticeQuestion) && (
          <Button
            size="3"
            variant="solid"
            onClick={() => handleSpeak(isPracticeSentence ? 'sentence' : 'question')}
            disabled={tts.isSpeaking}
          >
            <PlayIcon width="16" height="16" />
            {tts.isSpeaking ? 'Speaking...' : 'Play Audio'}
          </Button>
        )}

        {/* Additional metadata */}
        {isVocabularyTerm && (item as VocabularyTerm).definition && (
          <Flex direction="column" gap="2" mt="2">
            <Text size="2" color="gray" weight="medium">
              Definition
            </Text>
            <Text size="3" color="gray">
              {(item as VocabularyTerm).definition}
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default WordCard;
