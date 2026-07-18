/**
 * VoiceSelector Component
 *
 * Allows users to test browser text-to-speech voices.
 */

import { SpeakerLoudIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Select, Text } from '@radix-ui/themes';
import React, { useEffect, useState } from 'react';
import { ttsEngine } from '../../services/audio/TTSEngine';

interface VoiceSelectorProps {
  onVoiceChange?: (voiceId: string, languageCode: string) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ onVoiceChange }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-GB');
  const [selectedVoice, setSelectedVoice] = useState('');

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis?.getVoices?.() ?? [];
      const englishVoices = availableVoices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
      setVoices(englishVoices);

      const firstVoice = englishVoices.find((voice) => voice.lang === selectedLanguage) ?? englishVoices[0];
      if (firstVoice && !selectedVoice) {
        setSelectedLanguage(firstVoice.lang);
        setSelectedVoice(firstVoice.name);
        onVoiceChange?.(firstVoice.name, firstVoice.lang);
      }
    };

    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, []);

  const languages = Array.from(new Set(voices.map((voice) => voice.lang))).sort();
  const voicesForLanguage = voices.filter((voice) => voice.lang === selectedLanguage);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);

    const firstVoice = voices.find((voice) => voice.lang === language);
    if (firstVoice) {
      setSelectedVoice(firstVoice.name);
      onVoiceChange?.(firstVoice.name, language);
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    onVoiceChange?.(voiceId, selectedLanguage);
  };

  const getVoiceDescription = (voiceId: string): string => {
    const voice = voices.find((candidate) => candidate.name === voiceId);
    return voice ? `${voice.lang}${voice.localService ? ' - Local voice' : ''}` : '';
  };

  const handleTestVoice = () => {
    void ttsEngine.speak('Hello, this is a test of the selected voice.', selectedLanguage, null);
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Text size="4" weight="bold">Voice Settings</Text>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">Accent</Text>
          <Select.Root value={selectedLanguage} onValueChange={handleLanguageChange}>
            <Select.Trigger placeholder="Select accent" />
            <Select.Content>
              {languages.map((language) => (
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

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">Voice</Text>
          <Select.Root value={selectedVoice} onValueChange={handleVoiceChange}>
            <Select.Trigger placeholder="Select voice" />
            <Select.Content>
              {voicesForLanguage.map((voice) => (
                <Select.Item key={voice.name} value={voice.name}>
                  {voice.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Text size="1" color="gray">
            {getVoiceDescription(selectedVoice) || 'Browser default voice'}
          </Text>
        </Flex>

        <Button
          onClick={handleTestVoice}
          variant="soft"
          size="3"
        >
          <SpeakerLoudIcon width="16" height="16" />
          Test Voice
        </Button>

        <Flex
          p="3"
          style={{
            backgroundColor: 'var(--blue-3)',
            borderRadius: 'var(--radius-3)',
            border: '1px solid var(--blue-6)',
          }}
        >
          <Text size="1" color="blue">
            Currently using browser text-to-speech. Available voices depend on your browser and operating system.
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default VoiceSelector;
