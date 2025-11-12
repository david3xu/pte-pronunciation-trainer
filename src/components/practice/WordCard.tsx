/**
 * WordCard Component
 *
 * Displays vocabulary word/sentence with pronunciation information.
 * Replaces the vanilla JS word card UI.
 * Supports both free browser TTS and premium AWS Polly neural voices.
 */

import React, { useState } from 'react';
import { Card, Text, Badge, Button, Flex, Select } from '@radix-ui/themes';
import { SpeakerLoudIcon, PlayIcon, LockClosedIcon } from '@radix-ui/react-icons';
import { useAppStore } from '../../ts/stores';
import type { VocabularyTerm, PracticeItem } from '../../types/dataset.types';
import { isPremiumTTSAvailable } from '../../ts/audio/pollyService';

interface WordCardProps {
  item: VocabularyTerm | PracticeItem;
}

const WordCard: React.FC<WordCardProps> = ({ item }) => {
  const { tts } = useAppStore();
  const [usePremiumTTS, setUsePremiumTTS] = useState(false);
  const [premiumVoiceId, setPremiumVoiceId] = useState('Joanna');
  const [isPlayingPremium, setIsPlayingPremium] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const premiumAvailable = isPremiumTTSAvailable();

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
  const handleSpeak = async (mode: 'word' | 'sentence' | 'question' = 'word', accent?: 'british' | 'american') => {
    if (usePremiumTTS && premiumAvailable) {
      // Use premium AWS Polly
      await handlePremiumSpeak(accent);
    } else {
      // Use free browser TTS
      if (isVocabularyTerm && ipa) {
        const pronunciation = accent === 'american' ? ipa.american : ipa.british;
        tts.startSpeaking(displayText, pronunciation || displayText, mode);
      } else {
        tts.startSpeaking(displayText, undefined, isPracticeSentence ? 'sentence' : 'question');
      }
    }
  };

  // Handle premium TTS playback via API
  const handlePremiumSpeak = async (accent?: 'british' | 'american') => {
    setIsPlayingPremium(true);

    try {
      // Determine voice based on accent
      let voiceId = premiumVoiceId;
      if (accent === 'british' && !['Amy', 'Emma', 'Brian', 'Arthur'].includes(premiumVoiceId)) {
        voiceId = 'Amy'; // Default British voice
      } else if (accent === 'american' && !['Joanna', 'Matthew', 'Kendra', 'Joey'].includes(premiumVoiceId)) {
        voiceId = 'Joanna'; // Default US voice
      }

      // Call API endpoint
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: displayText,
          voiceId: voiceId,
          speed: '100%',
          emphasis: 'moderate',
          useCache: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate premium audio');
      }

      // Play audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.addEventListener('ended', () => {
        setIsPlayingPremium(false);
        URL.revokeObjectURL(audioUrl);
      });

      audio.addEventListener('error', () => {
        setIsPlayingPremium(false);
        URL.revokeObjectURL(audioUrl);
      });

      await audio.play();
    } catch (error) {
      console.error('Premium TTS playback failed:', error);
      setIsPlayingPremium(false);
      // Fallback to browser TTS
      tts.startSpeaking(displayText, undefined, 'word');
    }
  };

  // Difficulty color mapping
  const difficultyColor = {
    easy: 'green',
    normal: 'blue',
    hard: 'red',
  }[difficulty as string] || 'gray';

  const isSpeaking = usePremiumTTS ? isPlayingPremium : tts.isSpeaking;

  return (
    <Card size="4" className="word-card animate-in">
      {/* Header with difficulty badge */}
      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="2">
        <Flex gap="2" align="center">
          <Badge color={difficultyColor as any} size="2">
            {difficulty}
          </Badge>
          {isVocabularyTerm && (item as VocabularyTerm).category && (
            <Badge color="gray" size="2" variant="soft">
              {(item as VocabularyTerm).category}
            </Badge>
          )}
        </Flex>

        {/* Advanced Options Toggle - Only show if Premium TTS is available */}
        {premiumAvailable && (
          <Button
            variant="ghost"
            size="1"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            title="Show voice and TTS options"
          >
            {showAdvancedOptions ? '▲ Hide Options' : '▼ Voice Options'}
          </Button>
        )}
      </Flex>

      {/* Advanced TTS Options (Collapsible) */}
      {showAdvancedOptions && (
        <Flex
          direction="column"
          gap="3"
          p="3"
          mb="4"
          style={{
            backgroundColor: 'var(--gray-a2)',
            borderRadius: 'var(--radius-3)',
            border: '1px solid var(--gray-a5)',
          }}
        >
          <Text size="2" weight="medium">Voice Settings</Text>

          <Flex gap="2" align="center" wrap="wrap">
            <Select.Root
              value={usePremiumTTS ? 'premium' : 'free'}
              onValueChange={(value) => setUsePremiumTTS(value === 'premium')}
              disabled={!premiumAvailable}
            >
              <Select.Trigger variant="soft" />
              <Select.Content>
                <Select.Item value="free">
                  🔊 Browser TTS (Free)
                </Select.Item>
                <Select.Item value="premium">
                  <Flex align="center" gap="1">
                    {premiumAvailable ? '⭐ Premium Neural' : <><LockClosedIcon /> Premium (Locked)</>}
                  </Flex>
                </Select.Item>
              </Select.Content>
            </Select.Root>

            {usePremiumTTS && premiumAvailable && (
              <Select.Root
                value={premiumVoiceId}
                onValueChange={setPremiumVoiceId}
              >
                <Select.Trigger variant="soft" />
                <Select.Content>
                  <Select.Group>
                    <Select.Label>US English</Select.Label>
                    <Select.Item value="Joanna">Joanna (F)</Select.Item>
                    <Select.Item value="Matthew">Matthew (M)</Select.Item>
                    <Select.Item value="Kendra">Kendra (F)</Select.Item>
                    <Select.Item value="Joey">Joey (M)</Select.Item>
                  </Select.Group>
                  <Select.Group>
                    <Select.Label>British English</Select.Label>
                    <Select.Item value="Amy">Amy (F)</Select.Item>
                    <Select.Item value="Brian">Brian (M)</Select.Item>
                    <Select.Item value="Emma">Emma (F)</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            )}
          </Flex>

          {!premiumAvailable && (
            <Text size="1" color="gray">
              💡 Premium voices require AWS Polly API keys. Add them in Settings.
            </Text>
          )}
        </Flex>
      )}

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
                    onClick={() => handleSpeak('word', 'british')}
                    disabled={isSpeaking}
                  >
                    <SpeakerLoudIcon />
                    {usePremiumTTS && '⭐'}
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
                    onClick={() => handleSpeak('word', 'american')}
                    disabled={isSpeaking}
                  >
                    <SpeakerLoudIcon />
                    {usePremiumTTS && '⭐'}
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
            disabled={isSpeaking}
          >
            <PlayIcon width="16" height="16" />
            {isSpeaking ? 'Speaking...' : 'Play Audio'}
            {usePremiumTTS && premiumAvailable && ' ⭐'}
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
