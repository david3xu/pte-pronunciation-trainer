/**
 * DifficultyFilter Component
 *
 * Filter vocabulary/practice items by difficulty level.
 */

import React from 'react';
import { Card, Flex, Text, Button, Badge } from '@radix-ui/themes';
import { useAppStore } from '../../ts/stores';

type Difficulty = 'all' | 'easy' | 'normal' | 'hard';

const DifficultyFilter: React.FC = () => {
  const { settings, vocabulary } = useAppStore();

  const difficulties: Array<{ value: Difficulty; label: string; color: string; emoji: string }> = [
    { value: 'all', label: 'All', color: 'gray', emoji: '🌟' },
    { value: 'easy', label: 'Easy', color: 'green', emoji: '🟢' },
    { value: 'normal', label: 'Normal', color: 'blue', emoji: '🔵' },
    { value: 'hard', label: 'Hard', color: 'red', emoji: '🔴' },
  ];

  const handleDifficultyChange = (difficulty: Difficulty) => {
    settings.updateSetting('difficultyFilter', difficulty);
    // Also filter the vocabulary
    vocabulary.filterByDifficulty(difficulty);
  };

  // Count items for each difficulty
  const counts = {
    all: vocabulary.currentDataset.length,
    easy: vocabulary.currentDataset.filter((item: any) =>
      (item.difficulty || item.metadata?.difficulty) === 'easy'
    ).length,
    normal: vocabulary.currentDataset.filter((item: any) =>
      (item.difficulty || item.metadata?.difficulty) === 'normal'
    ).length,
    hard: vocabulary.currentDataset.filter((item: any) =>
      (item.difficulty || item.metadata?.difficulty) === 'hard'
    ).length,
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Text size="4" weight="bold">Difficulty</Text>

        <Flex gap="2" wrap="wrap">
          {difficulties.map((diff) => {
            const isActive = settings.difficultyFilter === diff.value;
            const count = counts[diff.value];

            return (
              <Button
                key={diff.value}
                variant={isActive ? 'solid' : 'soft'}
                color={diff.color as any}
                size="2"
                onClick={() => handleDifficultyChange(diff.value)}
              >
                <Flex align="center" gap="2">
                  <span>{diff.emoji}</span>
                  <Text>{diff.label}</Text>
                  <Badge color={diff.color as any} variant="soft">
                    {count}
                  </Badge>
                </Flex>
              </Button>
            );
          })}
        </Flex>

        {/* Current filter info */}
        {settings.difficultyFilter !== 'all' && (
          <Flex align="center" gap="2">
            <Text size="2" color="gray">
              Showing {vocabulary.filteredDataset.length} of {vocabulary.currentDataset.length} items
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default DifficultyFilter;
