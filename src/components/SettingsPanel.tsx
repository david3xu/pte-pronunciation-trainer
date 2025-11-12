/**
 * SettingsPanel Component
 *
 * Settings panel for configuring app behavior, practice modes, and preferences.
 * Replaces the vanilla JS SettingsPanel.
 */

import React from 'react';
import { Card, Flex, Text, Select, Switch, Slider, Button, Tabs, Badge } from '@radix-ui/themes';
import { GearIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useAppStore } from '../ts/stores';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, audio } = useAppStore();

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
            <Tabs.Trigger value="practice">Practice</Tabs.Trigger>
            <Tabs.Trigger value="audio">Audio</Tabs.Trigger>
            <Tabs.Trigger value="display">Display</Tabs.Trigger>
            <Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
          </Tabs.List>

          {/* Practice Tab */}
          <Tabs.Content value="practice">
            <Flex direction="column" gap="4" mt="4">
              {/* Practice Type */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Practice Type</Text>
                <Select.Root
                  value={settings.practiceType}
                  onValueChange={(value: 'vocabulary' | 'practice') =>
                    settings.updateSetting('practiceType', value)
                  }
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="vocabulary">Vocabulary</Select.Item>
                    <Select.Item value="practice">Practice</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              {/* Practice Mode (if practice type selected) */}
              {settings.practiceType === 'practice' && (
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium">Practice Mode</Text>
                  <Select.Root
                    value={settings.practiceMode || ''}
                    onValueChange={(value) =>
                      settings.updateSetting('practiceMode', value as 'rs' | 'asq' | 'wfd' | null)
                    }
                  >
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value="rs">
                        Repeat Sentence (RS)
                      </Select.Item>
                      <Select.Item value="asq">
                        Answer Short Question (ASQ)
                      </Select.Item>
                      <Select.Item value="wfd">
                        Write From Dictation (WFD)
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}

              {/* Vocabulary Book (if vocabulary type selected) */}
              {settings.practiceType === 'vocabulary' && (
                <Flex direction="column" gap="2">
                  <Text size="3" weight="medium">Vocabulary Book</Text>
                  <Select.Root
                    value={settings.vocabularyBook}
                    onValueChange={(value) =>
                      settings.updateSetting('vocabularyBook', value)
                    }
                  >
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Group>
                        <Select.Label>PTE Vocabulary Books</Select.Label>
                        <Select.Item value="pte-fib-listening">PTE FIB Listening</Select.Item>
                        <Select.Item value="pte-beginner">PTE Beginner</Select.Item>
                        <Select.Item value="pte-intermediate">PTE Intermediate</Select.Item>
                        <Select.Item value="pte-advanced">PTE Advanced</Select.Item>
                        <Select.Item value="pte-ra">PTE Read Aloud</Select.Item>
                        <Select.Item value="pte-rs-vocab">PTE RS Vocabulary</Select.Item>
                        <Select.Item value="pte-must-know">PTE Must-Know</Select.Item>
                        <Select.Item value="pte-wfd-vocab">PTE WFD Vocabulary</Select.Item>
                        <Select.Item value="pte-rs-wfd-vocab">PTE RS-WFD Vocabulary</Select.Item>
                        <Select.Item value="pte-reading-fib">PTE Reading FIB</Select.Item>
                        <Select.Item value="pte-reading-fib-drag">PTE Reading FIB Drag</Select.Item>
                        <Select.Item value="pte-asq-answers">PTE ASQ Answers</Select.Item>
                        <Select.Item value="pte-high-frequency">PTE High-Frequency</Select.Item>
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}

              {/* Difficulty Filter */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">Difficulty Filter</Text>
                <Select.Root
                  value={settings.difficultyFilter}
                  onValueChange={(value) =>
                    settings.updateSetting('difficultyFilter', value as 'easy' | 'normal' | 'hard' | 'all')
                  }
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
                  checked={settings.autoPlay}
                  onCheckedChange={(checked) =>
                    settings.updateSetting('autoPlay', checked)
                  }
                />
              </Flex>
            </Flex>
          </Tabs.Content>

          {/* Audio Tab */}
          <Tabs.Content value="audio">
            <Flex direction="column" gap="4" mt="4">
              {/* TTS Rate */}
              <Flex direction="column" gap="2">
                <Flex justify="between">
                  <Text size="3" weight="medium">Speech Rate</Text>
                  <Badge>{settings.ttsRate.toFixed(1)}x</Badge>
                </Flex>
                <Slider
                  value={[settings.ttsRate]}
                  onValueChange={([rate]) => settings.updateSetting('ttsRate', rate ?? 1.0)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                />
              </Flex>

              {/* Volume */}
              <Flex direction="column" gap="2">
                <Flex justify="between">
                  <Text size="3" weight="medium">Volume</Text>
                  <Badge>{Math.round(audio.volume * 100)}%</Badge>
                </Flex>
                <Slider
                  value={[audio.volume]}
                  onValueChange={([vol]) => audio.setVolume(vol || 1.0)}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </Flex>

              {/* TTS Voice Selection */}
              <Flex direction="column" gap="2">
                <Text size="3" weight="medium">TTS Voice</Text>
                <Select.Root
                  value={settings.ttsVoice || 'default'}
                  onValueChange={(value) =>
                    settings.updateSetting('ttsVoice', value === 'default' ? null : value)
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
                  checked={settings.showPhonetic}
                  onCheckedChange={(checked) =>
                    settings.updateSetting('showPhonetic', checked)
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
                    settings.resetSettings();
                    alert('Settings reset to defaults');
                  }}
                >
                  Reset All Settings
                </Button>
              </Flex>

              {/* App Version */}
              <Flex direction="column" gap="1">
                <Text size="2" color="gray">App Version</Text>
                <Text size="3" weight="medium">v2.5.4</Text>
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
