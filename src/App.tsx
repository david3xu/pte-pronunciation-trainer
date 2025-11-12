/**
 * Main React Application Component
 *
 * This is the root React component that will gradually replace the vanilla JS UI.
 * It integrates with the existing Zustand store for state management.
 */

import React, { useEffect, useState } from 'react';
import { Theme, Tabs, Box, Flex, Button, Spinner } from '@radix-ui/themes';
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
import OnboardingModal, { useOnboarding } from './components/OnboardingModal';
import { WordCardSkeleton } from './components/Skeleton';
import './css/tailwind.css';

const App: React.FC = () => {
  // Access Zustand store
  const { vocabulary, auth } = useAppStore();
  const currentItem = vocabulary.currentItem;
  const isAuthenticated = auth.isAuthenticated;
  const isLoadingVocabulary = vocabulary.isLoading;

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showPronunciationScoring, setShowPronunciationScoring] = useState(false);

  // Onboarding state
  const { showOnboarding, closeOnboarding } = useOnboarding();

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
                  title="Chat with AI for pronunciation help (Free with Gemini)"
                >
                  <ChatBubbleIcon width="18" height="18" />
                  AI Tutor
                </Button>
                <Button
                  variant="soft"
                  size="3"
                  onClick={() => setShowPronunciationScoring(!showPronunciationScoring)}
                  title="Record and get AI feedback on your pronunciation"
                >
                  <SpeakerLoudIcon width="18" height="18" />
                  Practice
                </Button>
                <Button
                  variant="soft"
                  size="3"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Customize voice, speed, and other settings"
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

          {/* Modals/Panels - Render as overlays, not inline */}
          {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}
          <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
          <AITutorChat isOpen={showAITutor} onClose={() => setShowAITutor(false)} />
          <PronunciationScoring
            isOpen={showPronunciationScoring}
            onClose={() => setShowPronunciationScoring(false)}
          />

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
                    {isLoadingVocabulary ? (
                      <WordCardSkeleton />
                    ) : currentItem ? (
                      <WordCard item={currentItem} />
                    ) : (
                      <Flex
                        align="center"
                        justify="center"
                        direction="column"
                        gap="3"
                        p="8"
                        style={{
                          backgroundColor: 'var(--gray-a2)',
                          borderRadius: 'var(--radius-4)',
                          minHeight: '400px',
                        }}
                      >
                        <Spinner size="3" />
                        <p className="text-slate-300">Loading vocabulary...</p>
                      </Flex>
                    )}
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
              PTE Pronunciation Trainer v{import.meta.env['VITE_APP_VERSION'] || '3.0.0'}
            </p>
            <p className="mt-2">
              🎉 Powered by Google Gemini (100% FREE) • AWS Polly Premium TTS
            </p>
            <p className="mt-1 text-xs">
              Built with React + TypeScript + Zustand + Supabase
            </p>
          </footer>
        </div>
      </div>
    </Theme>
  );
};

export default App;
