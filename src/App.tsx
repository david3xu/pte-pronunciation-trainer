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
import DataMigrationModal from './components/migration/DataMigrationModal';
import LearnerProfileModal from './components/profile/LearnerProfileModal';
import { hasDataToMigrate } from './services/migration/migrationService';
import { hasCompletedOnboarding, getLearnerProfile } from './services/profile/learnerProfileService';
import { getSessionManager } from './services/session/sessionManager';
import type { TaskType } from './types/database';
import './css/tailwind.css';

const App: React.FC = () => {
  // Access Zustand store using selector pattern for proper re-renders
  const vocabulary = useAppStore((state) => state.vocabulary);
  const currentItem = useAppStore((state) => state.vocabulary.currentItem);
  const isLoadingVocabulary = useAppStore((state) => state.vocabulary.isLoading);

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showPronunciationScoring, setShowPronunciationScoring] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [showProfileOnboarding, setShowProfileOnboarding] = useState(false);

  // Session tracking
  const [sessionManager] = useState(() => getSessionManager());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize app on mount
  useEffect(() => {
    console.log('React App mounted');

    // Check for data migration on startup
    const checkMigration = () => {
      const user = useAppStore.getState().auth.user;
      if (user && hasDataToMigrate()) {
        console.log('Migration data detected for signed-in user');
        setShowMigration(true);
      }
    };

    // Check for learner profile onboarding
    const checkOnboarding = async () => {
      const user = useAppStore.getState().auth.user;
      if (user && !hasCompletedOnboarding()) {
        console.log('[App] User needs onboarding');
        // Check if profile exists in database
        const profile = await getLearnerProfile(user.id);
        if (!profile || !profile.onboarding_completed) {
          console.log('[App] Showing profile onboarding');
          setShowProfileOnboarding(true);
        }
      }
    };

    checkMigration();
    checkOnboarding();

    // Load vocabulary data on startup
    const loadInitialVocabulary = async () => {
      const { vocabularyBook } = useAppStore.getState().settings;
      console.log('Loading vocabulary book:', vocabularyBook);

      vocabulary.setLoading(true);

      try {
        // Map vocabulary book IDs to their file paths
        // This is a fallback in case window.appConfig is not available
        const dataPathMap: Record<string, string> = {
          'pte-fib-listening': '/data/processed/pte-fib-listening-dataset.json',
          'pte-beginner': '/data/processed/pte-beginner-vocabulary.json',
          'pte-intermediate': '/data/processed/pte-intermediate-vocabulary.json',
          'pte-advanced': '/data/processed/pte-advanced-vocabulary.json',
          'pte-ra': '/data/processed/pte-ra-vocabulary.json',
          'pte-rs-vocab': '/data/processed/pte-rs-vocabulary.json',
          'pte-must-know': '/data/processed/pte-must-know-vocabulary.json',
          'pte-wfd-vocab': '/data/processed/pte-wfd-vocabulary.json',
          'pte-rs-wfd-vocab': '/data/processed/pte-rs-wfd-vocabulary.json',
          'pte-reading-fib': '/data/processed/pte-reading-fib-vocabulary.json',
          'pte-reading-fib-drag': '/data/processed/pte-reading-fib-drag-vocabulary.json',
          'pte-asq-answers': '/data/processed/pte-asq-answers-vocabulary.json',
          'pte-high-frequency': '/data/processed/pte-high-frequency-vocabulary.json',
          'pte-rs-core': '/data/processed/pte-rs-core-vocabulary.json',
        };

        const dataPath = dataPathMap[vocabularyBook] || `/data/processed/${vocabularyBook}-vocabulary.json`;
        console.log('Fetching from:', dataPath);

        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`Failed to load vocabulary: ${response.statusText}`);
        }

        const data = await response.json();
        const items = data.vocabulary || [];

        console.log(`Loaded ${items.length} vocabulary items`);
        console.log('First item:', items[0]);
        vocabulary.setDataset(items, vocabularyBook);

        // Set first item as current
        if (items.length > 0) {
          console.log('Setting current item to:', items[0]);
          vocabulary.setCurrentItem(items[0]);
          console.log('Current item after set:', useAppStore.getState().vocabulary.currentItem);
        }

        // Start practice session for tracking
        try {
          const taskType: TaskType = 'vocabulary'; // Default to vocabulary
          const sessionId = await sessionManager.startSession(
            taskType,
            vocabularyBook,
            'practice',
            {
              autoPlay: useAppStore.getState().settings.autoPlay,
              repeatMode: useAppStore.getState().audio.repeatMode,
            }
          );
          setCurrentSessionId(sessionId);
          console.log('[App] Started practice session:', sessionId);
        } catch (error) {
          console.error('[App] Failed to start session:', error);
          // Non-blocking: app continues to work even if session tracking fails
        }
      } catch (error) {
        console.error('Error loading vocabulary:', error);
        vocabulary.setLoading(false);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to load vocabulary. Please refresh the page.\n\nError: ${errorMessage}`);
      }
    };

    loadInitialVocabulary();

    // Cleanup: complete session when app unmounts
    return () => {
      if (currentSessionId) {
        console.log('[App] Completing session on unmount:', currentSessionId);
        sessionManager.completeSession().catch((err) => {
          console.error('[App] Failed to complete session:', err);
        });
      }
    };
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
          <DataMigrationModal
            isOpen={showMigration}
            onClose={() => setShowMigration(false)}
            onComplete={() => {
              setShowMigration(false);
              console.log('Migration completed successfully');
            }}
          />
          <LearnerProfileModal
            isOpen={showProfileOnboarding}
            userId={useAppStore.getState().auth.user?.id || ''}
            onComplete={() => {
              setShowProfileOnboarding(false);
              console.log('[App] Profile onboarding completed');
            }}
            onSkip={() => {
              setShowProfileOnboarding(false);
              console.log('[App] Profile onboarding skipped');
            }}
          />
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
                <WordCard item={currentItem} sessionManager={sessionManager} />
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
