/**
 * VoiceSelector Component
 *
 * Allows users to select premium TTS voices (AWS Polly).
 * Displays available voices grouped by accent/language.
 */

import { SpeakerLoudIcon, UpdateIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Select, Switch, Text } from '@radix-ui/themes';
import React, { useEffect, useState } from 'react';



interface VoiceSelectorProps {
  onVoiceChange?: (voiceId: string, languageCode: string) => void;
}

interface VoiceData {
  [language: string]: {
    [voiceId: string]: string;
  };
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ onVoiceChange }) => {

  const [voices, setVoices] = useState<VoiceData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-GB');
  const [selectedVoice, setSelectedVoice] = useState('Brian');
  const [usePremiumTTS, setUsePremiumTTS] = useState(false);

  // Fetch available voices on mount
  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/voices');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch voices');
      }

      setVoices(result.data);
    } catch (err: any) {
      console.error('Error fetching voices:', err);
      setError('⚠️ Failed to load voice list. Check: 1) AWS Polly credentials in Settings > Advanced, 2) Internet connection. Using fallback voices.');
      // Set default voices on error - MALE VOICES ONLY (UK and AU)
      setVoices({
        'en-GB': {
          'Brian': 'Male, British English (Neural)',
          'Daniel': 'Male, British English',
        },
        'en-AU': {
          'Russell': 'Male, Australian English (Neural)',
          'Gordon': 'Male, Australian English',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle language change
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);

    // Select first voice in new language
    const voicesInLanguage = voices[language];
    if (voicesInLanguage) {
      const firstVoice = Object.keys(voicesInLanguage)[0];
      firstVoice && setSelectedVoice(firstVoice);

      if (onVoiceChange) {
        firstVoice && onVoiceChange && onVoiceChange(firstVoice, language);
      }
    }
  };

  // Handle voice change
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);

    if (onVoiceChange) {
      onVoiceChange(voiceId, selectedLanguage);
    }
  };

  // Get voice description
  const getVoiceDescription = (voiceId: string): string => {
    return voices[selectedLanguage]?.[voiceId] || '';
  };

  // Test voice
  const handleTestVoice = () => {
    if (!usePremiumTTS) {
      // Use Web Speech API for testing
      const utterance = new SpeechSynthesisUtterance('Hello, this is a test of the selected voice.');
      window.speechSynthesis.speak(utterance);
    } else {
      // Use premium TTS API
      testPremiumVoice();
    }
  };

  const testPremiumVoice = async () => {
    try {
      const response = await fetch('/api/premium-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Hello, this is a test of the premium voice.',
          voiceId: selectedVoice,
          languageCode: selectedLanguage,
          engine: 'neural',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate audio');
      }

      // Play audio from base64
      const audio = new Audio(`data:${result.data.contentType};base64,${result.data.audioBase64}`);
      audio.play();
    } catch (err: any) {
      console.error('Error testing premium voice:', err);
      alert(`❌ Voice test failed!\n\nPossible causes:\n• AWS Polly credentials not configured\n• Invalid Region/Access Key/Secret Key\n• Internet connection issue\n\nAction: Go to Settings > Advanced > Add AWS Polly credentials`);
    }
  };

  if (loading) {
    return (
      <Card size="3">
        <Flex align="center" justify="center" p="4">
          <UpdateIcon className="animate-spin" width="24" height="24" />
          <Text size="2" className="ml-2">Loading voices...</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Text size="4" weight="bold">Voice Settings</Text>
          <Badge color="purple">Premium</Badge>
        </Flex>

        {/* Error Message */}
        {error && (
          <Flex
            p="3"
            style={{
              backgroundColor: 'var(--orange-3)',
              borderRadius: 'var(--radius-3)',
              border: '1px solid var(--orange-6)',
            }}
          >
            <Text size="2" color="orange">{error}</Text>
          </Flex>
        )}

        {/* Premium TTS Toggle */}
        <Flex justify="between" align="center">
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Use Premium TTS</Text>
            <Text size="1" color="gray">
              High-quality voices powered by AWS Polly
            </Text>
          </Flex>
          <Switch checked={usePremiumTTS} onCheckedChange={setUsePremiumTTS} />
        </Flex>

        {usePremiumTTS && (
          <>
            {/* Language/Accent Selection */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">Accent</Text>
              <Select.Root value={selectedLanguage} onValueChange={handleLanguageChange}>
                <Select.Trigger placeholder="Select accent" />
                <Select.Content>
                  {Object.keys(voices).map((language) => (
                    <Select.Item key={language} value={language}>
                      {language === 'en-US' ? 'American English' :
                       language === 'en-GB' ? 'British English' :
                       language === 'en-AU' ? 'Australian English' :
                       language}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Voice Selection */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">Voice</Text>
              <Select.Root value={selectedVoice} onValueChange={handleVoiceChange}>
                <Select.Trigger placeholder="Select voice" />
                <Select.Content>
                  {voices[selectedLanguage] && Object.keys(voices[selectedLanguage]).map((voiceId) => (
                    <Select.Item key={voiceId} value={voiceId}>
                      {voiceId} - {voices[selectedLanguage]?.[voiceId] || ''}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Text size="1" color="gray">
                {getVoiceDescription(selectedVoice)}
              </Text>
            </Flex>

            {/* Test Voice Button */}
            <Button
              onClick={handleTestVoice}
              variant="soft"
              size="3"
            >
              <SpeakerLoudIcon width="16" height="16" />
              Test Voice
            </Button>
          </>
        )}

        {/* Info */}
        <Flex
          p="3"
          style={{
            backgroundColor: 'var(--blue-3)',
            borderRadius: 'var(--radius-3)',
            border: '1px solid var(--blue-6)',
          }}
        >
          <Text size="1" color="blue">
            {usePremiumTTS
              ? 'Premium TTS provides high-quality, natural-sounding voices. Requires AWS configuration.'
              : 'Currently using browser TTS. Enable Premium TTS for higher quality voices.'}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default VoiceSelector;
