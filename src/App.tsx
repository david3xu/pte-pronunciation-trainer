/**
 * Main React Application Component
 *
 * This is the root React component that will gradually replace the vanilla JS UI.
 * It integrates with the existing Zustand store for state management.
 */

import React, { useEffect, useState } from 'react';
import { Theme, Tabs, Box, Flex, Button } from '@radix-ui/themes';
import {
  ChatBubbleIcon,
  SpeakerLoudIcon,
  GearIcon,
  BarChartIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';
import { useAppStore } from './ts/stores';
import WordCard from './components/WordCard';
import AIRecommendations from './components/AIRecommendations';
import AudioControls from './components/AudioControls';
import SettingsPanel from './components/SettingsPanel';
import PracticeModeSelector from './components/PracticeModeSelector';
import DifficultyFilter from './components/DifficultyFilter';
import ProgressTracker from './components/ProgressTracker';
import VocabularyList from './components/VocabularyList';
import AITutorChat from './components/AITutorChat';
import PronunciationScoring from './components/PronunciationScoring';
import './css/tailwind.css';

const App: React.FC = () => {
  // Access Zustand store
  const { vocabulary, auth } = useAppStore();
  const currentItem = vocabulary.currentItem;
  const isAuthenticated = auth.isAuthenticated;

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showPronunciationScoring, setShowPronunciationScoring] = useState(false);

  // Initialize app on mount
  useEffect(() => {
    console.log('React App mounted');
    // Integration with existing vanilla JS code
    // The vanilla JS PTEApp will continue to manage data loading
  }, []);

  return (
    <Theme
      appearance="dark"
      accentColor="violet"
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
      <div className="react-app min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-6 sm:mb-8">
            <Flex justify="between" align="center" className="mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  PTE Pronunciation Trainer
                </h1>
                <p className="text-slate-300 text-sm sm:text-base">
                  {isAuthenticated ? `Welcome, ${auth.user?.email}` : 'AI-Powered Pronunciation Practice'}
                </p>
              </div>
              <Flex gap="2" wrap="wrap">
                <Button
                  variant="soft"
                  size="3"
                  onClick={() => setShowAITutor(!showAITutor)}
                >
                  <ChatBubbleIcon width="18" height="18" />
                  AI Tutor
                </Button>
                <Button
                  variant="soft"
                  size="3"
                  onClick={() => setShowPronunciationScoring(!showPronunciationScoring)}
                >
                  <SpeakerLoudIcon width="18" height="18" />
                  Practice
                </Button>
                <Button
                  variant="soft"
                  size="3"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <GearIcon width="18" height="18" />
                  Settings
                </Button>
              </Flex>
            </Flex>

            {/* Practice Mode Selector & Difficulty Filter */}
            <Flex direction="column" gap="3">
              <PracticeModeSelector />
              <DifficultyFilter />
            </Flex>
          </header>

          {/* Modals/Panels */}
          {showSettings && (
            <div className="mb-6">
              <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
            </div>
          )}

          {showAITutor && (
            <div className="mb-6">
              <AITutorChat isOpen={showAITutor} onClose={() => setShowAITutor(false)} />
            </div>
          )}

          {showPronunciationScoring && (
            <div className="mb-6">
              <PronunciationScoring
                isOpen={showPronunciationScoring}
                onClose={() => setShowPronunciationScoring(false)}
              />
            </div>
          )}

          {/* Main Content */}
          <Tabs.Root defaultValue="practice">
            <Tabs.List>
              <Tabs.Trigger value="practice">
                <ReaderIcon className="inline mr-2" />
                Practice
              </Tabs.Trigger>
              <Tabs.Trigger value="progress">
                <BarChartIcon className="inline mr-2" />
                Progress
              </Tabs.Trigger>
            </Tabs.List>

            <Box pt="4">
              {/* Practice Tab */}
              <Tabs.Content value="practice">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Left Sidebar: Vocabulary List & AI Recommendations */}
                  <div className="lg:col-span-1 space-y-6">
                    <VocabularyList />
                    {isAuthenticated && <AIRecommendations />}
                  </div>

                  {/* Main Content: Word Card & Audio */}
                  <div className="lg:col-span-3 space-y-6">
                    {currentItem && <WordCard item={currentItem} />}
                    <AudioControls />
                  </div>
                </div>
              </Tabs.Content>

              {/* Progress Tab */}
              <Tabs.Content value="progress">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ProgressTracker />
                  <VocabularyList />
                </div>
              </Tabs.Content>
            </Box>
          </Tabs.Root>

          {/* Footer */}
          <footer className="mt-12 text-center text-slate-400 text-sm">
            <p>
              PTE Pronunciation Trainer v{import.meta.env['VITE_APP_VERSION'] || '2.5.4'}
            </p>
            <p className="mt-2">
              Powered by OpenAI GPT-4 • Built with React + TypeScript + Zustand
            </p>
          </footer>
        </div>
      </div>
    </Theme>
  );
};

export default App;
