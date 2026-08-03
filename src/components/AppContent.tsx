import {
  BarChartIcon,
  ChatBubbleIcon,
  GearIcon,
  LightningBoltIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button, Flex, Theme } from '@radix-ui/themes';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { appConfig } from '../config/AppConfig';
import { TYPING_TASKS } from '../config/typingTasks';
import { loadDataset } from '../services/dataset/datasetLoader';
import { useMigration } from '../hooks/useMigration';
import { useOnboarding } from '../hooks/useOnboarding';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { logIntervention, monitorSession, type Intervention } from '../services/ai/interventionEngine';
import { wakeLockService } from '../services/device/WakeLockService';
import { getSessionManager } from '../services/session/sessionManager';
import { useAudioState, useAuth, useProgress, useSettings, useVocabulary } from '../stores';
import type { TaskType } from '../types/database';
import AISidebar from './ai/AISidebar';
import AITutorChat from './ai/AITutorChat';
import InterventionModal from './ai/InterventionModal';
import PronunciationScoring from './ai/PronunciationScoring';
import WeakAreasDashboard from './ai/WeakAreasDashboard';
import AudioControls from './audio/AudioControls';
import DataMigrationModal from './migration/DataMigrationModal';
import {
  ProgressDashboard,
  WordCard,
} from './practice';
import LearnerProfileModal from './profile/LearnerProfileModal';
import SettingsPanel from './settings/SettingsPanel';
import { ComponentSkeleton } from './shared/ComponentSkeleton';
import { WordCardSkeleton } from './shared/Skeleton';

// Lazy load heavy practice interfaces for code splitting
const RSInterface = lazy(() => import('./practice/RSInterface'));
const ASQInterface = lazy(() => import('./practice/ASQInterface'));
const WFDInterface = lazy(() => import('./practice/WFDInterface'));
const SWTInterface = lazy(() => import('./practice/SWTInterface'));
const VocabTypingInterface = lazy(() => import('./practice/VocabTypingInterface'));

export const AppContent: React.FC = () => {
  // Access Zustand store using selector pattern for proper re-renders
  const vocabulary = useVocabulary();
  const { currentItem, isLoading: isLoadingVocabulary } = vocabulary;
  const auth = useAuth();
  const settings = useSettings();
  const audio = useAudioState();
  const progress = useProgress();

  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showPronunciationScoring, setShowPronunciationScoring] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showWeakAreas, setShowWeakAreas] = useState(false);

  // Custom hooks for migration and onboarding
  const { showMigration, setShowMigration } = useMigration();
  const { showProfileOnboarding, setShowProfileOnboarding } = useOnboarding();

  // Session tracking
  const [sessionManager] = useState(() => getSessionManager());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // Mirror the session id into a ref so the mount effect's cleanup (which has an
  // empty dependency array) completes the real session instead of the stale null
  // captured at mount time.
  const currentSessionIdRef = useRef<string | null>(null);

  // Intervention system (Phase 4)
  const [currentIntervention, setCurrentIntervention] = useState<Intervention | null>(null);
  const [itemsCompletedInSession, setItemsCompletedInSession] = useState(0);

  // Initialize app on mount
  useEffect(() => {
    console.log('React App mounted');

    // AbortController for fetch cancellation on unmount
    const abortController = new AbortController();

    // Load vocabulary data on startup
    const loadInitialVocabulary = async () => {
      const { practiceType, practiceMode, writingMode, vocabularyBook } = settings;
      // Restore the dataset the user was actually on. Writing Practice loads
      // its selected writing task (currently only SWT, more can be added
      // later); practice modes load their practice dataset so the RS/ASQ/WFD
      // interface is restored on reload; vocabulary, vocab-typing and
      // shadowing load the selected book.
      const datasetToLoad =
        practiceType === 'writing' && writingMode
          ? writingMode
          : practiceType === 'practice' && practiceMode
            ? practiceMode
            : vocabularyBook;
      console.log('Loading dataset on startup:', datasetToLoad);

      vocabulary.setLoading(true);

      try {
        // Single centralized load + normalize path (services/dataset/datasetLoader).
        const { items } = await loadDataset(datasetToLoad, { signal: abortController.signal });

        console.log(`Loaded ${items.length} items`);
        // setDataset restores this dataset's saved index (or starts at the first
        // item), so progress no longer leaks across datasets.
        vocabulary.setDataset(items, datasetToLoad);

        // Start practice session for tracking
        try {
          // Track the session under the task the user is actually practicing so
          // RS/ASQ/WFD/SWT analytics are attributed correctly, not always vocabulary.
          let taskType: TaskType = 'vocabulary';
          if (practiceType === 'practice' && practiceMode) {
            taskType =
              practiceMode === 'practice-repeat-sentence'
                ? 'rs'
                : practiceMode === 'practice-answer-short-question'
                  ? 'asq'
                  : 'wfd';
          } else if (practiceType === 'writing' && writingMode) {
            // A typing drill is not itself a PTE task, so attribute the session
            // to the task its source text comes from, declared in TYPING_TASKS.
            taskType = TYPING_TASKS[writingMode].taskType;
          }
          const sessionId = await sessionManager.startSession(
            taskType,
            datasetToLoad,
            'practice',
            {
              autoPlay: settings.autoPlay,
              repeatMode: audio.repeatMode,
            }
          );
          setCurrentSessionId(sessionId);
          currentSessionIdRef.current = sessionId;
          console.log('[App] Started practice session:', sessionId);

          // Don't auto-start on initial load - browser blocks audio without user interaction
          // User must click Play button first to enable audio
          // Future navigations will auto-play if settings.autoPlay is enabled
        } catch (error) {
          console.error('[App] Failed to start session:', error);
          // Non-blocking: app continues to work even if session tracking fails
        }
      } catch (error) {
        // Don't show error if aborted (component unmounted)
        if ((error as Error).name === 'AbortError') {
          console.log('[App] Vocabulary loading cancelled');
          return;
        }

        console.error('Error loading vocabulary:', error);
        vocabulary.setLoading(false);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to load vocabulary. Please refresh the page.\n\nError: ${errorMessage}`);
      }
    };

    loadInitialVocabulary();

    // Enable wake lock to keep screen on during practice (mobile)
    wakeLockService.request().then((acquired) => {
      if (acquired) {
        console.log('[App] Screen will stay on during practice');
      }
    });

    // Cleanup: complete session, release wake lock, abort fetch
    return () => {
      // Abort any pending fetch requests
      abortController.abort();
      
      const sessionId = currentSessionIdRef.current;
      if (sessionId) {
        console.log('[App] Completing session on unmount:', sessionId);
        sessionManager.completeSession().catch((err: any) => {
          console.error('[App] Failed to complete session:', err);
        });
      }
      // Release wake lock
      wakeLockService.release();
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

  // Track item completion: mark the active dataset item completed in the store
  // (so VocabularyList indicators, counts, and percentages reflect real usage),
  // then keep the existing session counter for intervention monitoring.
  const handleItemComplete = (isCorrect?: boolean) => {
    progress.markCurrentItemCompleted(isCorrect ?? true);
    setItemsCompletedInSession((prev) => prev + 1);
  };

  // The task the user is currently practicing, mapped onto the PTE task
  // taxonomy. Interface ids are not task ids (vocab-typing and typing are
  // interfaces, not PTE tasks), so this is resolved from settings rather than
  // cast from the interface type.
  const getCurrentTaskType = (): TaskType => {
    if (settings.practiceType === 'writing' && settings.writingMode) {
      return TYPING_TASKS[settings.writingMode].taskType;
    }
    if (settings.practiceType === 'practice' && settings.practiceMode) {
      if (settings.practiceMode === 'practice-repeat-sentence') return 'rs';
      if (settings.practiceMode === 'practice-answer-short-question') return 'asq';
      return 'wfd';
    }
    return 'vocabulary';
  };

  // Determine which interface to render. vocab-typing and writing tasks are
  // checked directly against settings, not vocabulary.mode, since they are
  // not practice-* mode strings nested under 'practice'. Every writing task is
  // an exact text typing drill served by one interface, so a new writing task
  // needs no branch here, only a TYPING_TASKS entry and a learningModes entry.
  const getPracticeInterfaceType = (): 'vocabulary' | 'vocab-typing' | 'rs' | 'asq' | 'wfd' | 'typing' => {
    if (settings.practiceType === 'vocab-typing') {
      return 'vocab-typing';
    }
    if (settings.practiceType === 'writing' && settings.writingMode) {
      return 'typing';
    }

    const mode = vocabulary.mode.toLowerCase();

    // Check for practice modes using exact prefix match
    if (mode.startsWith('practice-repeat-sentence')) {
      return 'rs';
    } else if (mode.startsWith('practice-answer-short-question')) {
      return 'asq';
    } else if (mode.startsWith('practice-write-from-dictation')) {
      return 'wfd';
    }

    // Everything else is vocabulary
    return 'vocabulary';
  };

  const interfaceType = getPracticeInterfaceType();

  // Navigation handlers for task-specific interfaces
  const handleNext = () => {
    // Determine next index based on current progress
    const nextIndex = progress.currentIndex + 1;
    const { filteredDataset } = vocabulary;

    // Check bounds
    if (nextIndex < filteredDataset.length) {
      vocabulary.goToItem(nextIndex);
    } else {
      // Potentially handle end of list (loop or stop)
      if (audio.repeatMode && filteredDataset.length > 0) {
        vocabulary.goToItem(0);
      }
    }
  };

  const handlePrevious = () => {
    const prevIndex = progress.currentIndex - 1;

    if (prevIndex >= 0) {
      vocabulary.goToItem(prevIndex);
    }
  };

  // Mobile swipe gestures
  const { handlers } = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    threshold: 50,
  });

  // Compute the appearance based on theme setting
  const computedAppearance = settings.theme === 'auto' ? undefined : settings.theme;

  return (
    <Theme
      appearance={computedAppearance}
      accentColor="indigo"
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
      <div className={`react-app min-h-screen p-4 sm:p-8 ${settings.theme === 'light' ? 'bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100' : 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'}`} {...handlers}>
        <div className="max-w-7xl mx-auto">
      {/* Modals - Render first for proper z-index layering */}
          {/* Header - Minimal like PTE branch */}
          <header className="mb-4">
            <Flex justify="between" align="center" wrap="wrap" gap="3">
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
                  <span className="ml-1 hidden md:inline">Progress</span>
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowAITutor(!showAITutor)}
                  title="Chat with AI for pronunciation help (Free with Gemini)"
                >
                  <ChatBubbleIcon width="16" height="16" />
                  <span className="ml-1 hidden md:inline">AI Tutor</span>
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowWeakAreas(!showWeakAreas)}
                  title="View AI insights and personalized recommendations"
                >
                  <LightningBoltIcon width="16" height="16" />
                  <span className="ml-1 hidden md:inline">Insights</span>
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowPronunciationScoring(!showPronunciationScoring)}
                  title="Record and get AI feedback on your pronunciation"
                >
                  <SpeakerLoudIcon width="16" height="16" />
                  <span className="ml-1 hidden md:inline">Score</span>
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Change mode, difficulty, and voice settings"
                >
                  <GearIcon width="16" height="16" />
                  <span className="ml-1 hidden md:inline">Settings</span>
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
            taskType={getCurrentTaskType()}
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
                  <h2 className="2xl font-bold text-white">Progress Dashboard</h2>
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
                  <Suspense fallback={<ComponentSkeleton />}>
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
                    {interfaceType === 'typing' && settings.writingMode && (
                      <SWTInterface
                        item={currentItem as any}
                        typingMode={settings.writingMode}
                        sessionManager={sessionManager}
                        onNext={handleNext}
                        onPrevious={handlePrevious}
                        onComplete={handleItemComplete}
                      />
                    )}
                    {interfaceType === 'vocab-typing' && (
                      <VocabTypingInterface
                        item={currentItem as any}
                        sessionManager={sessionManager}
                        onNext={handleNext}
                        onPrevious={handlePrevious}
                        onComplete={handleItemComplete}
                        currentIndex={progress.currentIndex}
                        totalItems={vocabulary.filteredDataset.length}
                      />
                    )}
                  </Suspense>
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
                  <p className="text-slate-200 text-lg font-semibold">
                    {settings.difficultyFilter !== 'all'
                      ? 'No items match this difficulty'
                      : 'No items to show'}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {settings.difficultyFilter !== 'all'
                      ? 'Try another difficulty in Settings, or switch back to All.'
                      : 'Pick a different book or mode in Settings.'}
                  </p>
                </Flex>
              )}
            </div>

            {/* Audio Controls - 20% essential controls (only for vocabulary mode) */}
            {interfaceType === 'vocabulary' && <AudioControls />}
          </div>

          {/* Footer - Minimal */}
          <footer className="mt-8 text-center text-slate-500 text-xs">
            <p>v{appConfig.get('app.version')} • Press Space to play • ← → to navigate</p>
          </footer>


        </div>
      </div>
    </Theme>
  );
};
