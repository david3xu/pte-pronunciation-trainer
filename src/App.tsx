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
  LightningBoltIcon,
} from '@radix-ui/react-icons';
import { useAppStore } from './ts/stores';
import {
  WordCard,
  ProgressDashboard,
  RSInterface,
  ASQInterface,
  WFDInterface
} from './components/practice';
import { AudioControls } from './components/audio';
import { SettingsPanel } from './components/settings';
import { AITutorChat, PronunciationScoring, WeakAreasDashboard, InterventionModal, AISidebar } from './components/ai';
import { WordCardSkeleton } from './components/shared';
import DataMigrationModal from './components/migration/DataMigrationModal';
import LearnerProfileModal from './components/profile/LearnerProfileModal';
import { hasDataToMigrate } from './services/migration/migrationService';
import { hasCompletedOnboarding, getLearnerProfile } from './services/profile/learnerProfileService';
import { getSessionManager } from './services/session/sessionManager';
import { monitorSession, logIntervention, type Intervention } from './services/ai/interventionEngine';
import type { TaskType } from './types/database';
import './css/tailwind.css';

const App: React.FC = () => {
  // Access Zustand store using selector pattern for proper re-renders
  const vocabulary = useAppStore((state) => state.vocabulary);
  const currentItem = useAppStore((state) => state.vocabulary.currentItem);
  const isLoadingVocabulary = useAppStore((state) => state.vocabulary.isLoading);
  const auth = useAppStore((state) => state.auth);
  const settings = useAppStore((state) => state.settings);
  const audio = useAppStore((state) => state.audio);
  const progress = useAppStore((state) => state.progress);

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showPronunciationScoring, setShowPronunciationScoring] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [showProfileOnboarding, setShowProfileOnboarding] = useState(false);
  const [showWeakAreas, setShowWeakAreas] = useState(false);

  // Session tracking
  const [sessionManager] = useState(() => getSessionManager());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Intervention system (Phase 4)
  const [currentIntervention, setCurrentIntervention] = useState<Intervention | null>(null);
  const [itemsCompletedInSession, setItemsCompletedInSession] = useState(0);

  // Initialize app on mount
  useEffect(() => {
    console.log('React App mounted');

    // Check for data migration on startup
    const checkMigration = () => {
      const user = auth.user;
      if (user && hasDataToMigrate()) {
        console.log('Migration data detected for signed-in user');
        setShowMigration(true);
      }
    };

    // Check for learner profile onboarding
    const checkOnboarding = async () => {
      const user = auth.user;
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
      const { vocabularyBook } = settings;
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
          console.log('Current item after set:', vocabulary.currentItem);
        }

        // Start practice session for tracking
        try {
          const taskType: TaskType = 'vocabulary'; // Default to vocabulary
          const sessionId = await sessionManager.startSession(
            taskType,
            vocabularyBook,
            'practice',
            {
              autoPlay: settings.autoPlay,
              repeatMode: audio.repeatMode,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies intentionally omitted - only run on mount

  // Phase 4: Monitor session for proactive interventions
  useEffect(() => {
    if (!currentSessionId || !auth.user?.id) return;

    // Check for interventions every 5 items completed
    if (itemsCompletedInSession > 0 && itemsCompletedInSession % 5 === 0) {
      const checkIntervention = async () => {
        const intervention = await monitorSession(
          auth.user!.id,
          currentSessionId
        );
        if (intervention) {
          setCurrentIntervention(intervention);
        }
      };
      checkIntervention();
    }
  }, [itemsCompletedInSession, currentSessionId, auth.user]);

  // Intervention handlers
  const handleInterventionAccept = async () => {
    if (!currentIntervention || !currentSessionId || !auth.user?.id) return;

    // Log acceptance
    await logIntervention(
      auth.user!.id,
      currentSessionId,
      currentIntervention,
      'accepted'
    );

    // Handle specific intervention types
    if (currentIntervention.type === 'difficulty_increase' || currentIntervention.type === 'difficulty_decrease') {
      // User would need to manually change difficulty in settings
      // Could auto-apply here if we had difficulty in global state
      console.log('[App] User accepted difficulty change:', currentIntervention.metadata?.suggestedDifficulty);
    } else if (currentIntervention.type === 'break_reminder' || currentIntervention.type === 'fatigue_warning') {
      // Pause practice (could pause TTS autoplay)
      console.log('[App] User accepted break');
    } else if (currentIntervention.type === 'help_offer') {
      // Open AI Tutor
      setShowAITutor(true);
    }

    setCurrentIntervention(null);
  };

  const handleInterventionDecline = async () => {
    if (!currentIntervention || !currentSessionId || !auth.user?.id) return;

    // Log decline
    await logIntervention(
      auth.user!.id,
      currentSessionId,
      currentIntervention,
      'declined'
    );

    setCurrentIntervention(null);
  };

  const handleInterventionDismiss = () => {
    setCurrentIntervention(null);
  };

  // Track item completion for intervention monitoring
  const handleItemComplete = () => {
    setItemsCompletedInSession((prev) => prev + 1);
  };

  // Determine which interface to render based on vocabulary mode
  const getPracticeInterfaceType = (): 'vocabulary' | 'rs' | 'asq' | 'wfd' => {
    const mode = vocabulary.mode.toLowerCase();

    if (mode.includes('repeat-sentence') || mode.includes('pte-rs-segments')) {
      return 'rs';
    } else if (mode.includes('answer-short-question')) {
      return 'asq';
    } else if (mode.includes('write-from-dictation')) {
      return 'wfd';
    }

    return 'vocabulary';
  };

  const interfaceType = getPracticeInterfaceType();

  // Navigation handlers for task-specific interfaces
  const handleNext = () => {
    const { navigateNext } = audio;
    navigateNext();

    // Update current item based on new index
    const nextIndex = progress.currentIndex + 1;
    const { filteredDataset, setCurrentItem } = vocabulary;
    const nextItem = filteredDataset[nextIndex];
    if (nextItem) {
      setCurrentItem(nextItem);
    }
  };

  const handlePrevious = () => {
    const { navigatePrev } = audio;
    navigatePrev();

    // Update current item based on new index
    const prevIndex = Math.max(0, progress.currentIndex - 1);
    const { filteredDataset, setCurrentItem } = vocabulary;
    const prevItem = filteredDataset[prevIndex];
    if (prevItem) {
      setCurrentItem(prevItem);
    }
  };

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
                  onClick={() => setShowWeakAreas(!showWeakAreas)}
                  title="View AI insights and personalized recommendations"
                >
                  <LightningBoltIcon width="16" height="16" />
                  <span className="ml-1">Insights</span>
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
            userId={auth.user?.id || ''}
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
          <AITutorChat
            isOpen={showAITutor}
            onClose={() => setShowAITutor(false)}
            taskType={interfaceType as TaskType}
            sessionId={currentSessionId || undefined}
            useEnhancedContext={auth.isAuthenticated}
          />
          <WeakAreasDashboard isOpen={showWeakAreas} onClose={() => setShowWeakAreas(false)} />
          <PronunciationScoring
            isOpen={showPronunciationScoring}
            onClose={() => setShowPronunciationScoring(false)}
          />
          <InterventionModal
            intervention={currentIntervention}
            onAccept={handleInterventionAccept}
            onDecline={handleInterventionDecline}
            onDismiss={handleInterventionDismiss}
          />
          {showProgress && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in p-4">
              <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-slate-800 rounded-lg p-6">
                <Flex justify="between" align="center" mb="4">
                  <h2 className="text-2xl font-bold text-white">Progress Dashboard</h2>
                  <Button variant="ghost" onClick={() => setShowProgress(false)}>
                    ✕
                  </Button>
                </Flex>
                <ProgressDashboard />
              </div>
            </div>
          )}

          {/* AI Sidebar - Always visible */}
          <AISidebar
            onOpenChat={() => setShowAITutor(true)}
            onOpenScoring={() => setShowPronunciationScoring(true)}
            onOpenInsights={() => setShowWeakAreas(true)}
            sessionStats={{
              itemsCompleted: progress.itemsCompleted,
              accuracy: progress.accuracy,
              currentStreak: 0, // TODO: Add currentStreak to progress store
            }}
          />

          {/* Main Content - Single Page, No Tabs */}
          {/* 80/20 Layout: 80% learning area, 20% controls */}
          <div className="space-y-4">
            {/* Learning Area - 80% of focus */}
            <div className="min-h-[60vh]">
              {isLoadingVocabulary ? (
                <WordCardSkeleton />
              ) : currentItem ? (
                <>
                  {/* Render appropriate interface based on practice mode */}
                  {interfaceType === 'rs' && (
                    <RSInterface
                      item={currentItem as any}
                      sessionManager={sessionManager}
                      onNext={handleNext}
                      onPrevious={handlePrevious}
                      onComplete={handleItemComplete}
                    />
                  )}
                  {interfaceType === 'asq' && (
                    <ASQInterface
                      item={currentItem as any}
                      sessionManager={sessionManager}
                      onNext={handleNext}
                      onPrevious={handlePrevious}
                      onComplete={handleItemComplete}
                    />
                  )}
                  {interfaceType === 'wfd' && (
                    <WFDInterface
                      item={currentItem as any}
                      sessionManager={sessionManager}
                      onNext={handleNext}
                      onPrevious={handlePrevious}
                      onComplete={handleItemComplete}
                    />
                  )}
                  {interfaceType === 'vocabulary' && (
                    <WordCard
                      item={currentItem}
                      sessionManager={sessionManager}
                      onItemComplete={handleItemComplete}
                    />
                  )}
                </>
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

            {/* Audio Controls - 20% essential controls (only for vocabulary mode) */}
            {interfaceType === 'vocabulary' && <AudioControls />}
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
