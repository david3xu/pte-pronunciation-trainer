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
import React, { useEffect, useMemo } from 'react';
import { appConfig } from '../../config/AppConfig';
import { useAudioState, useSettings, useVocabulary } from '../../stores';
import { backgroundAudioService } from '../../services/audio/backgroundAudioService';
import { ttsEngine } from '../../services/audio/TTSEngine';
import { loadDataset } from '../../services/dataset/datasetLoader';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const repeatDefaults = appConfig.get<Record<'easy' | 'normal' | 'hard', 1 | 3 | 5>>(
    'settings.defaults.wordRepeatCount',
    { easy: 1, normal: 3, hard: 5 }
  );
  const fallbackRepeatCount = appConfig.get<1 | 3 | 5>('settings.defaults.vocabRepeatCount', repeatDefaults.normal);

  // Get settings data using selectors
  const settings = useSettings();
  const {
    practiceType,
    practiceMode,
    writingMode,
    vocabularyBook,
    difficultyFilter,
    autoPlay,
    autoSwitchBooks,
    showPhonetic,
    ttsRate,
    ttsVoice,
    updateSetting,
    resetSettings
  } = settings;

  const audio = useAudioState();
  const { volume: audioVolume, setVolume } = audio;

  const vocabulary = useVocabulary();
  const { setLoading, setDataset } = vocabulary;

  useEffect(() => {
    if (ttsVoice === 'premium') {
      updateSetting('ttsVoice', null);
    }
  }, [ttsVoice, updateSetting]);

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

    // Stop all in-flight audio first (stopSpeaking cancels speech synthesis and
    // also stops background audio synchronously), THEN prime the reusable element
    // last so nothing cancels the priming. Priming stays synchronous inside this
    // user gesture (no await before it) so the later auto-start play() is allowed
    // by mobile autoplay policy.
    ttsEngine.stopSpeaking();
    backgroundAudioService.primeForUserGesture();

    updateSetting('vocabularyBook', bookId);

    // Reload vocabulary data
    setLoading(true);

    try {
      const { items } = await loadDataset(bookId);
      console.log(`[SettingsPanel] Loaded ${items.length} items`);
      setDataset(items, bookId); // Applies settings.difficultyFilter atomically

      // Auto-start playback if autoPlay setting is enabled. SWT is a pure
      // reading/writing task with no audio at all, so never auto-start
      // playback for it even if the setting is on for other modes.
      if (autoPlay && items.length > 0 && bookId !== 'swt') {
        console.log('[SettingsPanel] Auto-starting playback');
        audio.startAutoPlay();
      }

      setLoading(false);
    } catch (error) {
      console.error('[SettingsPanel] Error loading vocabulary:', error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load vocabulary book.\n\nError: ${errorMessage}`);
    }
  };

  // Handle practice mode change (RS/ASQ/WFD, nested under the practice study type)
  const handlePracticeModeChange = async (mode: 'practice-repeat-sentence' | 'practice-answer-short-question' | 'practice-write-from-dictation' | null) => {
    console.log('[SettingsPanel] Changing practice mode to:', mode);

    if (typeof updateSetting !== 'function') {
      console.error('[SettingsPanel] updateSetting is not a function!', updateSetting);
      return;
    }

    // Stop any in-flight audio before switching modes (stopSpeaking cancels
    // speech synthesis and stops background audio synchronously).
    ttsEngine.stopSpeaking();

    updateSetting('practiceMode', mode);

    if (!mode) return;

    // Reload practice dataset
    setLoading(true);

    try {
      const { items } = await loadDataset(mode);
      console.log(`[SettingsPanel] Loaded ${items.length} practice items`);
      setDataset(items, mode); // Applies settings.difficultyFilter atomically

      setLoading(false);
    } catch (error) {
      console.error('[SettingsPanel] Error loading practice dataset:', error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load practice dataset.\n\nError: ${errorMessage}`);
    }
  };

  // Handle writing task change, nested under the reusable writing study type
  // the same way handlePracticeModeChange nests RS/ASQ/WFD under practice.
  // Only 'swt' exists today; a second writing task is meant to be a new
  // union member here, not another top level practiceType or handler.
  const handleWritingModeChange = async (mode: 'swt' | null) => {
    console.log('[SettingsPanel] Changing writing task to:', mode);

    if (typeof updateSetting !== 'function') {
      console.error('[SettingsPanel] updateSetting is not a function!', updateSetting);
      return;
    }

    // Stop any in-flight audio before switching modes (stopSpeaking cancels
    // speech synthesis and stops background audio synchronously). Writing
    // tasks have no audio of their own, but a previous mode might still be playing.
    ttsEngine.stopSpeaking();

    updateSetting('writingMode', mode);

    if (!mode) return;

    // Reload the writing task dataset
    setLoading(true);

    try {
      const { items } = await loadDataset(mode);
      console.log(`[SettingsPanel] Loaded ${items.length} writing task items`);
      setDataset(items, mode); // Applies settings.difficultyFilter atomically

      setLoading(false);
    } catch (error) {
      console.error('[SettingsPanel] Error loading writing task dataset:', error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load writing task dataset.\n\nError: ${errorMessage}`);
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
                  onValueChange={(value: 'vocabulary' | 'vocab-typing' | 'practice' | 'writing' | 'shadowing') => {
                    updateSetting('practiceType', value);

                    // Every transition explicitly (re)loads its target dataset
                    // rather than guarding on whether vocabularyBook/practiceMode/
                    // writingMode already looks right. Those fields go stale on
                    // paths like WFD -> Writing/SWT -> Practice (practiceMode
                    // still says WFD, but the active dataset is still SWT) or
                    // Practice -> Writing/SWT -> Practice -> Writing/SWT
                    // (writingMode still says swt from the first visit, so a
                    // guard would wrongly skip the reload the second time),
                    // leaving the wrong dataset active either way.
                    if (value === 'practice') {
                      // Preserve the last RS/ASQ/WFD choice if there is one, but
                      // always reload it explicitly rather than trusting it is
                      // still the active dataset.
                      handlePracticeModeChange(practiceMode ?? 'practice-repeat-sentence');
                    } else if (value === 'writing') {
                      // Preserve the last writing task choice if there is one
                      // (only 'swt' exists today, but this mirrors 'practice'
                      // so a second writing task needs no new logic here),
                      // always reloading it explicitly.
                      handleWritingModeChange(writingMode ?? 'swt');
                    } else if (value === 'shadowing') {
                      handleVocabularyBookChange('di-shadowing');
                    } else if (value === 'vocabulary' || value === 'vocab-typing') {
                      const isNotAVocabularyBookId =
                        vocabularyBook.startsWith('di-shadowing') ||
                        vocabularyBook.startsWith('practice-') ||
                        // Defensive: builds before Writing Practice existed
                        // briefly stored the writing task id here directly.
                        vocabularyBook === 'swt';
                      handleVocabularyBookChange(
                        isNotAVocabularyBookId ? appConfig.getDefaultVocabularyBookId() : vocabularyBook
                      );
                    }
                  }}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="vocabulary">📚 Vocabulary Learning</Select.Item>
                    <Select.Item value="vocab-typing">✍️ Vocabulary Typing Practice</Select.Item>
                    <Select.Item value="practice">🎯 Speaking/Listening Task Practice (RS/ASQ/WFD)</Select.Item>
                    <Select.Item value="writing">📝 Writing Practice</Select.Item>
                    <Select.Item value="shadowing">🎤 Shadowing Practice (DI)</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Writing Task (if Writing Practice is selected). Only one
                  option exists today; more (e.g. SST) can be added here
                  later without another routing/settings refactor. */}
              {practiceType === 'writing' && (
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium">Writing Task</Text>
                  <Text size="2" color="gray" mb="1">
                    Practice typing a PTE writing task's model answer
                  </Text>
                  <Select.Root
                    value={writingMode || ''}
                    onValueChange={(value) => handleWritingModeChange(value as 'swt' | null)}
                  >
                    <Select.Trigger placeholder="Select a writing task..." />
                    <Select.Content>
                      <Select.Item value="swt">
                        📝 SWT Answer Typing - 58 answers
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}


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

              {/* SWT has exactly one dataset, so unlike Task Type or Vocabulary
                  Book it needs no further sub-selector here. */}

              {/* Vocabulary Book (if vocabulary or vocab-typing type selected) */}
              {(practiceType === 'vocabulary' || practiceType === 'vocab-typing') && (
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
                      <Select.Item value="di-shadowing">🖼️ DI Natural Shadowing - 43 natural answers</Select.Item>
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
                  <Text size="3" weight="medium">Playback speed</Text>
                  <Badge>{ttsRate.toFixed(1)}x</Badge>
                </Flex>
                <Slider
                  value={[ttsRate]}
                  onValueChange={([rate]) => {
                    const nextRate = rate ?? 0.7;
                    updateSetting('ttsRate', nextRate);
                    backgroundAudioService.setRate(nextRate);
                  }}
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

              {/* Word Repeat Count */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Word Repeat Count</Text>
                <Text size="2" color="gray" mb="1">
                  Default auto-play repeats: easy words {repeatDefaults.easy} time, normal words {repeatDefaults.normal} times, hard words {repeatDefaults.hard} times
                </Text>
                <Select.Root
                  value={String(settings.vocabRepeatCount || fallbackRepeatCount)}
                  onValueChange={(value) =>
                    updateSetting('vocabRepeatCount', Number(value) as 1 | 3 | 5)
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="1">1 time fallback</Select.Item>
                    <Select.Item value="3">3 times fallback (normal default)</Select.Item>
                    <Select.Item value="5">5 times fallback</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* TTS Voice Selection */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">TTS Voice</Text>
                <Select.Root
                  value="default"
                  onValueChange={(value) =>
                    updateSetting('ttsVoice', value === 'default' ? null : value)
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="default">Default Premium Voice</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Text size="1" color="gray">
                  Real audio is used for all playback.
                </Text>
              </Flex>

              {/* Real Audio Playback */}
              <Flex direction="column" gap="2">
                <Text size="3">Real Audio Playback</Text>
                <Text size="1" color="gray">
                  All practice modes use premium generated audio instead of browser speech synthesis. Tap Play once to allow playback.
                </Text>
                <Text size="1" color="blue">
                  ℹ️ If premium audio is unavailable, you will see a clear error instead of silent playback.
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

              {/* Theme */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Theme</Text>
                <Select.Root
                  value={settings.theme || 'auto'}
                  onValueChange={(value) =>
                    updateSetting('theme', value as 'light' | 'dark' | 'auto')
                  }
                >
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
                <Text size="3" weight="medium">v{appConfig.get('app.version')}</Text>
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
