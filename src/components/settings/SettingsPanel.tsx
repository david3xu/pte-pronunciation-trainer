/**
 * SettingsPanel Component
 *
 * Settings panel for configuring app behavior, practice modes, and preferences.
 * Replaces the vanilla JS SettingsPanel.
 */

import {
    Cross2Icon,
    GearIcon
} from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Select, Slider, Switch, Tabs, Text } from '@radix-ui/themes';
import React, { useMemo } from 'react';
import { appConfig } from '../../config/AppConfig';
import { useAppStore } from '../../stores';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  // Get settings data using selectors
  const practiceType = useAppStore((state) => state.settings.practiceType);
  const practiceMode = useAppStore((state) => state.settings.practiceMode);
  const vocabularyBook = useAppStore((state) => state.settings.vocabularyBook);
  const difficultyFilter = useAppStore((state) => state.settings.difficultyFilter);
  const autoPlay = useAppStore((state) => state.settings.autoPlay);
  const autoSwitchBooks = useAppStore((state) => state.settings.autoSwitchBooks);
  const showPhonetic = useAppStore((state) => state.settings.showPhonetic);
  const ttsRate = useAppStore((state) => state.settings.ttsRate);
  const ttsVoice = useAppStore((state) => state.settings.ttsVoice);
  const audioVolume = useAppStore((state) => state.audio.volume);

  // Get methods using selectors
  const updateSetting = useAppStore((state) => state.settings.updateSetting);
  const resetSettings = useAppStore((state) => state.settings.resetSettings);
  const setVolume = useAppStore((state) => state.audio.setVolume);
  const setLoading = useAppStore((state) => state.vocabulary.setLoading);
  const setDataset = useAppStore((state) => state.vocabulary.setDataset);
  const filterByDifficulty = useAppStore((state) => state.vocabulary.filterByDifficulty);

  // Get vocabulary books from config dynamically
  const vocabularyBooks = useMemo(() => {
    const learningModes = appConfig.get('data.learningModes') || [];
    return learningModes.filter((mode: any) => mode.category === 'vocabulary');
  }, []);

  // Handle vocabulary book change
  const handleVocabularyBookChange = async (bookId: string) => {
    console.log('[SettingsPanel] Changing vocabulary book to:', bookId);
    console.log('[SettingsPanel] updateSetting function:', typeof updateSetting);

    if (typeof updateSetting !== 'function') {
      console.error('[SettingsPanel] updateSetting is not a function!', updateSetting);
      return;
    }

    updateSetting('vocabularyBook', bookId);

    // Reload vocabulary data
    setLoading(true);

    try {
      const dataPaths = appConfig.get('data.paths.byMode');
      const dataPath = dataPaths[bookId] || `/data/processed/${bookId}-vocabulary.json`;
      console.log('[SettingsPanel] Loading vocabulary book:', bookId, 'from:', dataPath);

      const response = await fetch(dataPath);
      if (!response.ok) {
        throw new Error(`Failed to load vocabulary: ${response.statusText}`);
      }

      const data = await response.json();
      // Shadowing modes use 'answers' instead of 'vocabulary'
      let items = data.vocabulary || data.answers || [];

      // Transform shadowing items to be compatible with vocabulary UI
      if (data.answers) {
        items = items.map((answer: any) => ({
          english: answer.title || answer.fullText?.substring(0, 50),
          pronunciation: {
            british: { ipa: '', phonetic: 'DI Answer' },
            american: { ipa: '', phonetic: 'DI Answer' }
          },
          difficulty: 'normal',
          category: bookId,
          source: bookId,
          // Keep original shadowing data
          ...answer
        }));
      }

      console.log(`[SettingsPanel] Loaded ${items.length} items (${data.vocabulary ? 'vocabulary' : 'shadowing'})`);
      setDataset(items, bookId); // Now atomically sets currentItem and resets index

      // Reapply difficulty filter to new book
      if (difficultyFilter !== 'all') {
        filterByDifficulty(difficultyFilter);
        console.log(`[SettingsPanel] Applied ${difficultyFilter} filter to ${bookId}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('[SettingsPanel] Error loading vocabulary:', error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load vocabulary book.\n\nError: ${errorMessage}`);
    }
  };

  // Handle practice mode change (RS/ASQ/WFD)
  const handlePracticeModeChange = async (mode: 'practice-repeat-sentence' | 'practice-answer-short-question' | 'practice-write-from-dictation' | null) => {
    console.log('[SettingsPanel] Changing practice mode to:', mode);

    if (typeof updateSetting !== 'function') {
      console.error('[SettingsPanel] updateSetting is not a function!', updateSetting);
      return;
    }

    updateSetting('practiceMode', mode);

    if (!mode) return;

    // Reload practice dataset
    setLoading(true);

    try {
      const practiceDataPathMap: Record<string, string> = {
        'practice-repeat-sentence': '/data/processed/pte-repeat-sentence-dataset.json',
        'practice-answer-short-question': '/data/processed/pte-answer-short-question-dataset.json',
        'practice-write-from-dictation': '/data/processed/pte-write-from-dictation-dataset.json',
      };

      const dataPath = practiceDataPathMap[mode];
      if (!dataPath) {
        throw new Error(`Unknown practice mode: ${mode}`);
      }

      console.log('[SettingsPanel] Loading practice dataset:', mode, 'from:', dataPath);

      const response = await fetch(dataPath);
      if (!response.ok) {
        throw new Error(`Failed to load practice dataset: ${response.statusText}`);
      }

      const data = await response.json();
      // Practice datasets have different structures - try both 'items' and 'sentences'
      const items = data.items || data.sentences || data.questions || [];

      console.log(`[SettingsPanel] Loaded ${items.length} practice items`);
      console.log('[SettingsPanel] First item:', items[0]);
      setDataset(items, mode); // Now atomically sets currentItem and resets index

      // Reapply difficulty filter to practice dataset
      if (difficultyFilter !== 'all') {
        filterByDifficulty(difficultyFilter);
        console.log(`[SettingsPanel] Applied ${difficultyFilter} filter to ${mode}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('[SettingsPanel] Error loading practice dataset:', error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load practice dataset.\n\nError: ${errorMessage}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in p-4">
      <Card size="4" className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="2">
            <GearIcon width="24" height="24" />
            <Text size="6" weight="bold">Settings</Text>
          </Flex>
          <Button variant="ghost" onClick={onClose}>
            <Cross2Icon width="20" height="20" />
          </Button>
        </Flex>

        {/* Tabs */}
        <Tabs.Root defaultValue="practice">
          <Tabs.List>
            <Tabs.Trigger value="practice">Mode</Tabs.Trigger>
            <Tabs.Trigger value="audio">Audio</Tabs.Trigger>
            <Tabs.Trigger value="display">Display</Tabs.Trigger>
            <Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
          </Tabs.List>

          {/* Practice Tab */}
          <Tabs.Content value="practice">
            <Flex direction="column" gap="4" mt="4">
              {/* Study Type */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Study Type</Text>
                <Text size="2" color="gray" mb="1">
                  Choose between word learning or task practice
                </Text>
                <Select.Root
                  value={practiceType}
                  onValueChange={(value: 'vocabulary' | 'practice' | 'shadowing') => {
                    updateSetting('practiceType', value);

                    // Set default mode when switching to practice
                    if (value === 'practice' && !practiceMode) {
                      handlePracticeModeChange('practice-repeat-sentence');
                    }

                    // Set default mode when switching to shadowing
                    if (value === 'shadowing' && !vocabularyBook.startsWith('di-shadowing')) {
                      handleVocabularyBookChange('di-shadowing-1-10');
                    }

                    // Set default vocabulary book when switching to vocabulary
                    if (value === 'vocabulary' && (vocabularyBook.startsWith('di-shadowing') || vocabularyBook.startsWith('practice-'))) {
                      handleVocabularyBookChange('pte-fib-listening');
                    }
                  }}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="vocabulary">📚 Vocabulary Learning</Select.Item>
                    <Select.Item value="practice">🎯 Task Practice (RS/ASQ/WFD)</Select.Item>
                    <Select.Item value="shadowing">🎤 Shadowing Practice (DI)</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Task Type (if practice type selected) */}
              {practiceType === 'practice' && (
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium">Task Type</Text>
                  <Text size="2" color="gray" mb="1">
                    Choose a PTE speaking/listening task
                  </Text>
                  <Select.Root
                    value={practiceMode || ''}
                    onValueChange={(value) =>
                      handlePracticeModeChange(value as 'practice-repeat-sentence' | 'practice-answer-short-question' | 'practice-write-from-dictation' | null)
                    }
                  >
                    <Select.Trigger placeholder="Select a task type..." />
                    <Select.Content>
                      <Select.Item value="practice-repeat-sentence">
                        🎤 Repeat Sentence (RS) - 620 sentences
                      </Select.Item>
                      <Select.Item value="practice-answer-short-question">
                        ❓ Answer Short Question (ASQ) - 692 questions
                      </Select.Item>
                      <Select.Item value="practice-write-from-dictation">
                        ✍️ Write From Dictation (WFD) - 1,195 sentences
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}

              {/* Vocabulary Book (if vocabulary type selected) */}
              {practiceType === 'vocabulary' && (
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium">Vocabulary Book</Text>
                  <Select.Root
                    value={vocabularyBook}
                    onValueChange={(value) => handleVocabularyBookChange(value)}
                  >
                    <Select.Trigger placeholder="Select a vocabulary book..." />
                    <Select.Content>
                      <Select.Group>
                        <Select.Label>PTE Vocabulary Books</Select.Label>
                        {vocabularyBooks.map((book: any) => (
                          <Select.Item key={book.id} value={book.id}>
                            {book.name}
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}

              {/* Shadowing Mode (if shadowing type selected) */}
              {practiceType === 'shadowing' && (
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium">Shadowing Mode</Text>
                  <Text size="2" color="gray" mb="1">
                    Practice DI answers with continuous speech
                  </Text>
                  <Select.Root
                    value={vocabularyBook}
                    onValueChange={(value) => handleVocabularyBookChange(value)}
                  >
                    <Select.Trigger placeholder="Select a shadowing mode..." />
                    <Select.Content>
                      <Select.Item value="di-shadowing-1-10">🖼️ DI Shadowing (Images 1-10) - 10 answers</Select.Item>
                      <Select.Item value="di-shadowing-11-20">🖼️ DI Shadowing (Images 11-20) - 10 answers</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}

              {/* Difficulty Filter */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Difficulty Filter</Text>
                <Select.Root
                  value={difficultyFilter}
                  onValueChange={(value) => {
                    const difficulty = value as 'easy' | 'normal' | 'hard' | 'all';
                    updateSetting('difficultyFilter', difficulty);
                    // Apply the filter to current vocabulary
                    filterByDifficulty(difficulty);
                  }}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="all">All Difficulties</Select.Item>
                    <Select.Item value="easy">Easy</Select.Item>
                    <Select.Item value="normal">Normal</Select.Item>
                    <Select.Item value="hard">Hard</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Auto-play */}
              <Flex justify="between" align="center">
                <Text size="3">Auto-play on load</Text>
                <Switch
                  checked={autoPlay}
                  onCheckedChange={(checked) =>
                    updateSetting('autoPlay', checked)
                  }
                />
              </Flex>

              {/* Auto-switch books (only for vocabulary mode) */}
              {practiceType === 'vocabulary' && (
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Flex direction="column" gap="1">
                      <Text size="3">Auto-switch to next book</Text>
                      <Text size="1" color="gray">
                        Automatically load next vocabulary book when current finishes
                      </Text>
                    </Flex>
                    <Switch
                      checked={autoSwitchBooks}
                      onCheckedChange={(checked) =>
                        updateSetting('autoSwitchBooks', checked)
                      }
                    />
                  </Flex>
                  {autoSwitchBooks && (
                    <Text size="1" color="blue">
                      ℹ️ Will cycle through all 14 vocabulary books in order. Use Repeat Mode to control looping.
                    </Text>
                  )}
                </Flex>
              )}
            </Flex>
          </Tabs.Content>

          {/* Audio Tab */}
          <Tabs.Content value="audio">
            <Flex direction="column" gap="4" mt="4">
              {/* TTS Rate */}
              <Flex direction="column" gap="2">
                <Flex justify="between">
                  <Text size="3" weight="medium">Speech Rate</Text>
                  <Badge>{ttsRate.toFixed(1)}x</Badge>
                </Flex>
                <Slider
                  value={[ttsRate]}
                  onValueChange={([rate]) => updateSetting('ttsRate', rate ?? 1.0)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                />
              </Flex>

              {/* Volume */}
              <Flex direction="column" gap="2">
                <Flex justify="between">
                  <Text size="3" weight="medium">Volume</Text>
                  <Badge>{Math.round(audioVolume * 100)}%</Badge>
                </Flex>
                <Slider
                  value={[audioVolume]}
                  onValueChange={([vol]) => setVolume(vol || 1.0)}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Flex>

              {/* TTS Voice Selection */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">TTS Voice</Text>
                <Select.Root
                  value={ttsVoice || 'default'}
                  onValueChange={(value) =>
                    updateSetting('ttsVoice', value === 'default' ? null : value)
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="default">Browser Default</Select.Item>
                    <Select.Item value="premium">Premium Voice (AWS Polly)</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Text size="1" color="gray">
                  💡 Premium voices require AWS Polly credentials (Region, Access Key, Secret Key). Add them in the Advanced tab.
                </Text>
              </Flex>
            </Flex>
          </Tabs.Content>

          {/* Display Tab */}
          <Tabs.Content value="display">
            <Flex direction="column" gap="4" mt="4">
              {/* Show Phonetic */}
              <Flex justify="between" align="center">
                <Flex direction="column" gap="1">
                  <Text size="3">Show Phonetic Spelling</Text>
                  <Text size="1" color="gray">
                    Display "sounds like" pronunciation hints
                  </Text>
                </Flex>
                <Switch
                  checked={showPhonetic}
                  onCheckedChange={(checked) =>
                    updateSetting('showPhonetic', checked)
                  }
                />
              </Flex>

              {/* Theme (placeholder for future) */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Theme</Text>
                <Select.Root defaultValue="light">
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="light">Light</Select.Item>
                    <Select.Item value="dark">Dark</Select.Item>
                    <Select.Item value="auto">Auto (System)</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>
          </Tabs.Content>

          {/* Advanced Tab */}
          <Tabs.Content value="advanced">
            <Flex direction="column" gap="4" mt="4">
              <Text size="3" weight="bold">Advanced Settings</Text>

              {/* Reset Settings */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Reset to Defaults</Text>
                <Button
                  variant="soft"
                  color="red"
                  onClick={() => {
                    resetSettings();
                    alert('Settings reset to defaults');
                  }}
                >
                  Reset All Settings
                </Button>
              </Flex>

              {/* App Version */}
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">App Version</Text>
                <Text size="3" weight="medium">v3.0.0</Text>
              </Flex>

              {/* Cache Info */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Clear Cache</Text>
                <Button
                  variant="soft"
                  onClick={() => {
                    localStorage.clear();
                    alert('Cache cleared. Please refresh the page.');
                  }}
                >
                  Clear All Data
                </Button>
              </Flex>
            </Flex>
          </Tabs.Content>
        </Tabs.Root>

        {/* Footer */}
        <Flex justify="end" gap="2" mt="4" pt="4" style={{ borderTop: '1px solid var(--gray-5)' }}>
          <Button variant="soft" onClick={onClose}>
            Close
          </Button>
        </Flex>
      </Card>
    </div>
  );
};

export default SettingsPanel;
