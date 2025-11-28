/**
 * PracticeModeSelector Component
 *
 * Allows users to switch between vocabulary and practice modes (RS/ASQ/WFD).
 */

import { BookmarkIcon, ChatBubbleIcon, Pencil1Icon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Text } from '@radix-ui/themes';
import React from 'react';
import { useAppStore } from '../../stores';

const PracticeModeSelector: React.FC = () => {
  const { settings } = useAppStore();

  const modes = [
    {
      type: 'vocabulary' as const,
      title: 'Vocabulary',
      description: '13 books, 13,000+ terms',
      icon: <BookmarkIcon width="24" height="24" />,
      color: 'blue',
    },
    {
      type: 'practice' as const,
      mode: 'practice-repeat-sentence' as const,
      title: 'Repeat Sentence',
      description: '620 sentences',
      icon: <ChatBubbleIcon width="24" height="24" />,
      color: 'green',
    },
    {
      type: 'practice' as const,
      mode: 'practice-answer-short-question' as const,
      title: 'Answer Short Question',
      description: '692 questions',
      icon: <ChatBubbleIcon width="24" height="24" />,
      color: 'orange',
    },
    {
      type: 'practice' as const,
      mode: 'practice-write-from-dictation' as const,
      title: 'Write From Dictation',
      description: '1,195 sentences',
      icon: <Pencil1Icon width="24" height="24" />,
      color: 'purple',
    },
  ];

  const handleModeSelect = (type: 'vocabulary' | 'practice', mode?: 'practice-repeat-sentence' | 'practice-answer-short-question' | 'practice-write-from-dictation') => {
    settings.updateSetting('practiceType', type);
    if (mode) {
      settings.updateSetting('practiceMode', mode);
    }
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Text size="4" weight="bold">Study Mode</Text>

        <Flex direction="column" gap="3">
          {modes.map((mode, index) => {
            const isActive =
              settings.practiceType === mode.type &&
              (mode.type === 'vocabulary' || settings.practiceMode === mode.mode);

            return (
              <Button
                key={index}
                variant={isActive ? 'solid' : 'soft'}
                size="3"
                onClick={() => handleModeSelect(mode.type, mode.mode)}
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                }}
              >
                <Flex align="center" gap="3" style={{ width: '100%' }}>
                  {mode.icon}
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    <Text size="3" weight="bold">{mode.title}</Text>
                    <Text size="1" color="gray">{mode.description}</Text>
                  </Flex>
                  {isActive && (
                    <Badge color={mode.color as any}>Active</Badge>
                  )}
                </Flex>
              </Button>
            );
          })}
        </Flex>
      </Flex>
    </Card>
  );
};

export default PracticeModeSelector;
