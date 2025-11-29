/**
 * VocabularyList Component
 *
 * Displays a scrollable list of vocabulary items with quick navigation.
 */

import { Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, ScrollArea, Text, TextField } from '@radix-ui/themes';
import React, { useState } from 'react';
import { useAppStore } from '../../stores';
import type { PracticeItem, VocabularyTerm } from '../../types/dataset.types';
import { cleanText } from '../../utils/textUtils';
import { VocabularyListSkeleton } from '../shared/Skeleton';

const VocabularyList: React.FC = () => {
  const { vocabulary, progress } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const isLoading = vocabulary.isLoading;

  // Filter items by search query
  const filteredItems = vocabulary.filteredDataset.filter((item: any) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    const word = item.word || item.sentence || item.question || '';
    return word.toLowerCase().includes(searchLower);
  });

  // Check if item is completed
  const isCompleted = (index: number) => {
    return progress.completedItems.has(index.toString());
  };

  // Handle item click
  const handleItemClick = (item: VocabularyTerm | PracticeItem) => {
    vocabulary.setCurrentItem(item);
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        {/* Header with search */}
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Text size="4" weight="bold">Vocabulary</Text>
            <Badge size="2" color="gray">
              {filteredItems.length} items
            </Badge>
          </Flex>

          {/* Search */}
          <TextField.Root>
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
            <input
              className="rt-reset rt-TextFieldInput"
              style={{ width: '100%', height: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'inherit' }}
              placeholder="Search vocabulary..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <TextField.Slot>
                <Button
                  size="1"
                  variant="ghost"
                  onClick={() => setSearchQuery('')}
                  style={{ padding: 0, height: 'auto' }}
                >
                  <Cross2Icon height="14" width="14" />
                </Button>
              </TextField.Slot>
            )}
          </TextField.Root>
        </Flex>

        {/* List */}
        <ScrollArea type="auto" scrollbars="vertical" style={{ height: '400px' }}>
          {isLoading ? (
            <VocabularyListSkeleton />
          ) : (
            <Flex direction="column" gap="2">
              {filteredItems.length === 0 ? (
                <Flex align="center" justify="center" py="6">
                  <Text size="2" color="gray">
                    {searchQuery ? 'No items found' : 'No items available'}
                  </Text>
                </Flex>
              ) : (
              filteredItems.map((item: any, index: number) => {
                const displayText = item.word || item.sentence || item.question;
                const difficulty = item.difficulty || item.metadata?.difficulty || 'normal';
                const isCurrentItem = vocabulary.currentItem === item;
                const completed = isCompleted(index);

                return (
                  <Button
                    key={index}
                    variant={isCurrentItem ? 'solid' : 'soft'}
                    size="2"
                    onClick={() => handleItemClick(item)}
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      position: 'relative',
                    }}
                  >
                    <Flex align="center" gap="2" style={{ width: '100%' }}>
                      {/* Completed indicator */}
                      {completed && (
                        <span className="text-green-500">✓</span>
                      )}

                      {/* Word/Sentence */}
                      <Text
                        size="2"
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cleanText(displayText)}
                      </Text>

                      {/* Difficulty badge */}
                      <Badge
                        size="1"
                        color={
                          difficulty === 'hard' ? 'red' :
                          difficulty === 'normal' ? 'blue' :
                          'green'
                        }
                      >
                        {difficulty}
                      </Badge>
                    </Flex>
                  </Button>
                );
              })
              )}
            </Flex>
          )}
        </ScrollArea>

        {/* Footer stats */}
        <Flex justify="between" align="center" pt="2" style={{ borderTop: '1px solid var(--gray-5)' }}>
          <Text size="1" color="gray">
            {progress.completedItems.size} completed
          </Text>
          <Text size="1" color="gray">
            {Math.round((progress.completedItems.size / vocabulary.currentDataset.length) * 100)}% done
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default VocabularyList;
