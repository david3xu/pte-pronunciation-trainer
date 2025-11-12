/**
 * Main React Application Component
 *
 * This is the root React component that will gradually replace the vanilla JS UI.
 * It integrates with the existing Zustand store for state management.
 */

import React, { useEffect, useState } from 'react';
import { Theme, Flex, Button, Spinner } from '@radix-ui/themes';
import {
  ChatBubbleIcon,
  SpeakerLoudIcon,
  GearIcon,
  BarChartIcon,
} from '@radix-ui/react-icons';
import { useAppStore } from './ts/stores';
import { WordCard, ProgressTracker } from './components/practice';
import { AudioControls } from './components/audio';
import { SettingsPanel } from './components/settings';
import { AITutorChat, PronunciationScoring } from './components/ai';
import { WordCardSkeleton } from './components/shared';
import './css/tailwind.css';

const App: React.FC = () => {
  // Access Zustand store
  const { vocabulary } = useAppStore();
  const currentItem = vocabulary.currentItem;
  const isLoadingVocabulary = vocabulary.isLoading;

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showPronunciationScoring, setShowPronunciationScoring] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

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
          {/* Header - Minimal like PTE branch */}
          <header className="mb-4">
            <Flex justify="between" align="center">
              <h1 className="text-2xl font-bold text-white">
                🎯 PTE Pronunciation
              </h1>
              <Flex gap="2">
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowProgress(!showProgress)}
                  title="View your progress and statistics"
                >
                  <BarChartIcon width="16" height="16" />
                  <span className="ml-1">Progress</span>
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowAITutor(!showAITutor)}
                  title="Chat with AI for pronunciation help (Free with Gemini)"
                >
                  <ChatBubbleIcon width="16" height="16" />
                  <span className="ml-1">AI Tutor</span>
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowPronunciationScoring(!showPronunciationScoring)}
                  title="Record and get AI feedback on your pronunciation"
                >
                  <SpeakerLoudIcon width="16" height="16" />
                  <span className="ml-1">Score</span>
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Change mode, difficulty, and voice settings"
                >
                  <GearIcon width="16" height="16" />
                  <span className="ml-1">Settings</span>
                </Button>
              </Flex>
            </Flex>
          </header>

          {/* Modals/Panels - Render as overlays, not inline */}
          <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
          <AITutorChat isOpen={showAITutor} onClose={() => setShowAITutor(false)} />
          <PronunciationScoring
            isOpen={showPronunciationScoring}
            onClose={() => setShowPronunciationScoring(false)}
          />
          {showProgress && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in p-4">
              <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-slate-800 rounded-lg p-6">
                <Flex justify="between" align="center" mb="4">
                  <h2 className="text-2xl font-bold text-white">Your Progress</h2>
                  <Button variant="ghost" onClick={() => setShowProgress(false)}>
                    ✕
                  </Button>
                </Flex>
                <ProgressTracker />
              </div>
            </div>
          )}

          {/* Main Content - Single Page, No Tabs */}
          {/* 80/20 Layout: 80% learning area, 20% controls */}
          <div className="space-y-4">
            {/* Learning Area - 80% of focus */}
            <div className="min-h-[60vh]">
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
            </div>

            {/* Audio Controls - 20% essential controls */}
            <AudioControls />
          </div>

          {/* Footer - Minimal */}
          <footer className="mt-8 text-center text-slate-500 text-xs">
            <p>v3.0.0 • Press Space to play • ← → to navigate</p>
          </footer>
        </div>
      </div>
    </Theme>
  );
};

export default App;
