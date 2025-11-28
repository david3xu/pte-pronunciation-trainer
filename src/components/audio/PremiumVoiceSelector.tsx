/**
 * PremiumVoiceSelector Component
 *
 * Allows users to select premium AWS Polly neural voices for pronunciation.
 * Displays available voices grouped by accent (US, UK, AU, IN) and gender.
 */

import { LockClosedIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Select, Text } from '@radix-ui/themes';
import React, { useState } from 'react';
import { getVoices, isPremiumTTSAvailable, type PollyVoice } from '../../ts/audio/pollyService';

interface PremiumVoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceSelect: (voiceId: string) => void;
}

const PremiumVoiceSelector: React.FC<PremiumVoiceSelectorProps> = ({
  selectedVoiceId = 'Joanna',
  onVoiceSelect
}) => {
  const [selectedAccent, setSelectedAccent] = useState<'US' | 'UK' | 'AU' | 'IN' | 'All'>('All');
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female' | 'All'>('All');

  const isPremiumAvailable = isPremiumTTSAvailable();

  // Get all premium voices
  const allVoices = getVoices();

  // Filter voices by accent and gender
  const filteredVoices = allVoices.filter(voice => {
    if (selectedAccent !== 'All' && voice.accent !== selectedAccent) {
      return false;
    }
    if (selectedGender !== 'All' && voice.gender !== selectedGender) {
      return false;
    }
    return true;
  });

  // Group voices by accent
  const voicesByAccent = filteredVoices.reduce((acc, voice) => {
    if (!acc[voice.accent]) {
      acc[voice.accent] = [];
    }
    acc[voice.accent]!.push(voice);
    return acc;
  }, {} as Record<string, PollyVoice[]>);

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex direction="column" gap="1">
            <Text size="5" weight="bold">
              <SpeakerLoudIcon className="inline mr-2" />
              Premium Voices
            </Text>
            <Text size="2" color="gray">
              High-quality neural voices powered by AWS Polly
            </Text>
          </Flex>

          {!isPremiumAvailable && (
            <Badge color="orange" size="2">
              <LockClosedIcon className="inline mr-1" />
              Premium Feature
            </Badge>
          )}
        </Flex>

        {/* Status Message */}
        {!isPremiumAvailable && (
          <Card variant="surface" size="2">
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold" color="orange">
                Premium TTS Not Configured
              </Text>
              <Text size="1" color="gray">
                To enable premium neural voices, add AWS credentials to your environment variables.
                See documentation for setup instructions.
              </Text>
            </Flex>
          </Card>
        )}

        {/* Filters */}
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: '150px' }}>
            <Text size="2" weight="medium">Accent</Text>
            <Select.Root
              value={selectedAccent}
              onValueChange={(value) => setSelectedAccent(value as any)}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="All">All Accents</Select.Item>
                <Select.Item value="US">🇺🇸 US English</Select.Item>
                <Select.Item value="UK">🇬🇧 British English</Select.Item>
                <Select.Item value="AU">🇦🇺 Australian English</Select.Item>
                <Select.Item value="IN">🇮🇳 Indian English</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: '150px' }}>
            <Text size="2" weight="medium">Gender</Text>
            <Select.Root
              value={selectedGender}
              onValueChange={(value) => setSelectedGender(value as any)}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="All">All</Select.Item>
                <Select.Item value="Female">Female</Select.Item>
                <Select.Item value="Male">Male</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>

        {/* Voice List */}
        <Flex direction="column" gap="3">
          {Object.entries(voicesByAccent).map(([accent, voices]) => (
            <div key={accent}>
              <Text size="2" weight="bold" style={{ marginBottom: '8px', display: 'block' }}>
                {accent === 'US' && '🇺🇸 US English'}
                {accent === 'UK' && '🇬🇧 British English'}
                {accent === 'AU' && '🇦🇺 Australian English'}
                {accent === 'IN' && '🇮🇳 Indian English'}
              </Text>

              <Flex direction="column" gap="2">
                {voices.map(voice => (
                  <Card
                    key={voice.id}
                    variant={selectedVoiceId === voice.id ? 'classic' : 'surface'}
                    size="2"
                    style={{
                      cursor: isPremiumAvailable ? 'pointer' : 'not-allowed',
                      opacity: isPremiumAvailable ? 1 : 0.6
                    }}
                    onClick={() => {
                      if (isPremiumAvailable) {
                        onVoiceSelect(voice.id);
                      }
                    }}
                  >
                    <Flex justify="between" align="center">
                      <Flex direction="column" gap="1">
                        <Text size="3" weight="medium">
                          {voice.name}
                        </Text>
                        <Flex gap="2" align="center">
                          <Badge size="1" color="violet">
                            {voice.gender}
                          </Badge>
                          <Badge size="1" color="blue">
                            Neural
                          </Badge>
                          {selectedVoiceId === voice.id && (
                            <Badge size="1" color="green">
                              Selected
                            </Badge>
                          )}
                        </Flex>
                      </Flex>

                      {isPremiumAvailable && (
                        <Button
                          size="1"
                          variant="soft"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Play sample
                            onVoiceSelect(voice.id);
                          }}
                        >
                          <SpeakerLoudIcon />
                          Preview
                        </Button>
                      )}
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </div>
          ))}
        </Flex>

        {/* Footer */}
        <Card variant="surface" size="2">
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              About Premium Voices
            </Text>
            <Text size="1" color="gray">
              • 🎯 Neural technology for natural-sounding speech
              <br />
              • 🌍 Multiple accents: US, UK, Australian, Indian
              <br />
              • ⚡ SSML support for emphasis and prosody control
              <br />
              • 💾 Automatic caching for faster playback
              <br />
              • 💰 $16/million characters (~1M chars free/month)
            </Text>
          </Flex>
        </Card>
      </Flex>
    </Card>
  );
};

export default PremiumVoiceSelector;
