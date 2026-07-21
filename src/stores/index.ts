/**
 * Main Zustand Store
 *
 * Combines all store slices into a single app store.
 * Replaces the EventBus pattern with reactive state management.
 *
 * Usage:
 * import { useAppStore } from './stores';
 *
 * // In vanilla JS components:
 * const audio = useAppStore.getState().audio;
 * audio.startAutoPlay();
 *
 * // Subscribe to changes:
 * useAppStore.subscribe(
 *   (state) => state.audio.isAutoPlaying,
 *   (isAutoPlaying) => console.log('Auto-play:', isAutoPlaying)
 * );
 *
 * // In React components (future):
 * const isAutoPlaying = useAppStore((state) => state.audio.isAutoPlaying);
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';

import { authService } from '../services/supabase/authService';
import { syncService } from '../services/supabase/syncService';

import { type PracticeItem, type VocabularyTerm } from '../types/dataset.types';
import type {
    AudioState,
    AuthState,
    ProgressState,
    SettingsState,
    TTSState,
    UIState,
    VocabularyState,
} from './types';

/**
 * Stable identity for a dataset item, used for completion tracking.
 * Uses the item's content key (word, sentence, or question). Returns null when
 * no stable key is available so callers avoid falling back to list indexes.
 */
export const getDatasetItemId = (
  item: VocabularyTerm | PracticeItem | null | undefined
): string | null => {
  if (!item) return null;
  if ('word' in item && item.word) return item.word;
  if ('sentence' in item && item.sentence) return item.sentence;
  if ('question' in item && item.question) return item.question;
  return null;
};

const trackVocabularyPractice = (
  item: VocabularyTerm | PracticeItem,
  mode: string
) => {
  if (!(window as any).analyticsService) return;

  const word = (item as any).word || (item as any).sentence || (item as any).question || 'unknown';
  const difficulty = (item as any).difficulty || (item as any).metadata?.difficulty || 'normal';
  const category = (item as any).category || (item as any).metadata?.category || mode;

  (window as any).analyticsService.trackWordPractice(word, {
    difficulty,
    category,
    mode,
  });
};

// Combined store type
export interface AppState {
  audio: AudioState;
  tts: TTSState;
  settings: SettingsState;
  vocabulary: VocabularyState;
  progress: ProgressState;
  ui: UIState;
  auth: AuthState;
}

/**
 * Main application store
 *
 * Middleware stack:
 * - subscribeWithSelector: Enables granular subscriptions
 * - devtools: Redux DevTools integration (development only)
 * - persist: LocalStorage persistence for settings and progress
 */
export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          // Audio slice - inline implementation
          audio: {
            isPlaying: false,
            isAutoPlaying: false,
            autoPlayEnabled: true, // Default ON - auto-play toggle enabled in AudioControls
            isPaused: false,
            currentIndex: 0,
            repeatMode: true, // Default ON - loops back to start after reaching end
            playbackSpeed: 1.2,
            volume: 1.0,
            setPlaying: (isPlaying: boolean) => set((state) => ({ audio: { ...state.audio, isPlaying } })),
            setAutoPlay: (autoPlayEnabled: boolean) => set((state) => ({ audio: { ...state.audio, autoPlayEnabled } })),
            startAutoPlay: () => set((state) => ({ audio: { ...state.audio, isAutoPlaying: true, autoPlayEnabled: true, isPaused: false } })),
            pauseAutoPlay: () => set((state) => ({ audio: { ...state.audio, isPaused: true } })),
            resumeAutoPlay: () => set((state) => ({ audio: { ...state.audio, isPaused: false } })),
            stopAutoPlay: () => set((state) => ({ audio: { ...state.audio, isAutoPlaying: false, autoPlayEnabled: false, isPaused: false } })),
            navigateNext: () => set((state) => ({ audio: { ...state.audio, currentIndex: state.audio.currentIndex + 1 } })),
            navigatePrev: () => set((state) => ({ audio: { ...state.audio, currentIndex: Math.max(0, state.audio.currentIndex - 1) } })),
            toggleRepeat: () => set((state) => ({ audio: { ...state.audio, repeatMode: !state.audio.repeatMode } })),
            setSpeed: (speed) => set((state) => ({ audio: { ...state.audio, playbackSpeed: speed } })),
            setVolume: (volume) => set((state) => ({ audio: { ...state.audio, volume: Math.max(0, Math.min(1, volume)) } })),
            setCurrentIndex: (index) => set((state) => ({ audio: { ...state.audio, currentIndex: Math.max(0, index) } })),
          },

          // TTS slice - inline implementation
          tts: {
            isSpeaking: false,
            currentWord: null,
            currentPhonetic: null,
            speakingMode: null,
            selectedVoice: null,
            availableVoices: [],
            error: null,
            startSpeaking: (word, phonetic, mode = 'word') => {
              // Track TTS usage in analytics
              if ((window as any).analyticsService) {
                (window as any).analyticsService.trackTTSUsed({
                  word,
                  phonetic: phonetic || undefined,
                  mode,
                  voice: get().tts.selectedVoice || 'browser-default',
                  rate: get().settings.ttsRate,
                  tts_engine: 'browser',
                });
              }

              set((state) => ({
                tts: { ...state.tts, isSpeaking: true, currentWord: word, currentPhonetic: phonetic || null, speakingMode: mode, error: null }
              }));
            },
            stopSpeaking: () => set((state) => ({
              tts: { ...state.tts, isSpeaking: false, currentWord: null, currentPhonetic: null, speakingMode: null }
            })),
            setVoice: (voice) => {
              // Track voice change
              if ((window as any).analyticsService) {
                (window as any).analyticsService.track('tts_voice_changed', { voice });
              }

              set((state) => ({ tts: { ...state.tts, selectedVoice: voice } }));
            },
            setAvailableVoices: (voices) => set((state) => ({ tts: { ...state.tts, availableVoices: voices } })),
            setError: (error) => set((state) => ({ tts: { ...state.tts, error, isSpeaking: false } })),
          },

          // Settings slice - inline implementation
          settings: {
            practiceType: 'vocabulary',
            practiceMode: null,
            vocabularyBook: 'pte-fib-listening',
            datasetId: 'pte-fib-listening',
            autoPlay: true, // Default ON - automatically plays audio when vocabulary loads
            backgroundAudioMode: false, // Default OFF - opt-in real-audio playback for locked-screen / backgrounded practice
            autoSwitchBooks: false, // Default OFF - stays on current book
            showPhonetic: true,
            ttsRate: 1.2,
            ttsVoice: null, // Browser Default as default
            vocabRepeatCount: 1, // Default: speak each word once
            difficultyFilter: 'all',
            theme: 'auto', // Default: follow system preference
            isPanelOpen: false,
            updateSetting: (key, value) => {
              // Track setting changes
              if ((window as any).analyticsService) {
                (window as any).analyticsService.trackSettingChanged(key, value);
              }

              set((state) => ({ settings: { ...state.settings, [key]: value } }));
            },
            resetSettings: () => set((state) => ({
              settings: {
                ...state.settings,
                practiceType: 'vocabulary',
                practiceMode: null,
                vocabularyBook: 'pte-fib-listening',
                datasetId: 'pte-fib-listening',
                autoPlay: true, // Default ON
                backgroundAudioMode: false, // Default OFF
                autoSwitchBooks: false, // Default OFF
                showPhonetic: true,
                ttsRate: 1.2,
                ttsVoice: null, // Browser Default as default
                vocabRepeatCount: 1, // Default: speak each word once
                difficultyFilter: 'all',
                theme: 'auto', // Default: follow system preference
                isPanelOpen: false,
              }
            })),
            togglePanel: () => set((state) => ({ settings: { ...state.settings, isPanelOpen: !state.settings.isPanelOpen } })),
          },

          // Vocabulary slice - inline implementation with pagination
          vocabulary: {
            currentDataset: [],
            filteredDataset: [],
            displayedItems: [],
            currentItem: null,
            mode: '',
            totalCount: 0,
            isLoading: false,
            error: null,
            currentPage: 1,
            itemsPerPage: 50,
            hasMore: false,
            setDataset: (dataset, mode) => {
              const itemsPerPage = 50;
              const displayedItems = dataset.slice(0, itemsPerPage);

              // Restore this dataset's saved position, or start at the first item.
              const savedIndex = get().progress.indexByDataset[mode];
              const restoredIndex =
                typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < dataset.length
                  ? savedIndex
                  : 0;
              const restoredItem = (dataset[restoredIndex] ?? null) as VocabularyTerm | PracticeItem | null;

              set((state) => ({
                vocabulary: {
                  ...state.vocabulary,
                  currentDataset: dataset,
                  filteredDataset: dataset,
                  displayedItems,
                  currentItem: restoredItem,
                  mode,
                  totalCount: dataset.length,
                  currentPage: 1,
                  itemsPerPage,
                  hasMore: dataset.length > itemsPerPage,
                  isLoading: false,
                  error: null,
                },
                audio: {
                  ...state.audio,
                  currentIndex: restoredIndex,
                },
                progress: {
                  ...state.progress,
                  activeDatasetId: mode,
                  currentIndex: restoredIndex,
                  totalItems: dataset.length,
                  completedItems: new Set(state.progress.completedItemsByDataset[mode] ?? []),
                  indexByDataset: {
                    ...state.progress.indexByDataset,
                    [mode]: restoredIndex,
                  },
                },
              }));
            },
            setCurrentItem: (item) => {
              // Track vocabulary word practice
              trackVocabularyPractice(item, get().vocabulary.mode);

              set((state) => ({ vocabulary: { ...state.vocabulary, currentItem: item } }));
            },
            goToItem: (index) => {
              const targetIndex = Math.max(0, index);
              const { filteredDataset, mode } = get().vocabulary;
              const item = filteredDataset[targetIndex];

              if (!item) return false;

              trackVocabularyPractice(item, mode);

              set((state) => ({
                vocabulary: {
                  ...state.vocabulary,
                  currentItem: item,
                },
                audio: {
                  ...state.audio,
                  currentIndex: targetIndex,
                },
                progress: {
                  ...state.progress,
                  currentIndex: targetIndex,
                  totalItems: filteredDataset.length,
                  indexByDataset: {
                    ...state.progress.indexByDataset,
                    [mode]: targetIndex,
                  },
                },
              }));

              return true;
            },
            filterByDifficulty: (difficulty) => {
              const currentDataset = get().vocabulary.currentDataset;
              const itemsPerPage = get().vocabulary.itemsPerPage;
              const activeDatasetId = get().progress.activeDatasetId;

              const nextDataset =
                difficulty === 'all'
                  ? currentDataset
                  : currentDataset.filter((item) => {
                      if ('difficulty' in item && item.difficulty) return item.difficulty === difficulty;
                      if ('metadata' in item && item.metadata?.difficulty) return item.metadata.difficulty === difficulty;
                      return false;
                    });

              const displayedItems = nextDataset.slice(0, itemsPerPage);
              // Changing the visible set resets to its first item so the index,
              // current item, and visible total stay consistent.
              const firstItem = (nextDataset[0] ?? null) as VocabularyTerm | PracticeItem | null;

              set((state) => ({
                vocabulary: {
                  ...state.vocabulary,
                  filteredDataset: nextDataset,
                  displayedItems,
                  currentItem: firstItem,
                  totalCount: nextDataset.length,
                  currentPage: 1,
                  hasMore: nextDataset.length > itemsPerPage,
                },
                audio: {
                  ...state.audio,
                  currentIndex: 0,
                },
                progress: {
                  ...state.progress,
                  currentIndex: 0,
                  totalItems: nextDataset.length,
                  indexByDataset: activeDatasetId
                    ? { ...state.progress.indexByDataset, [activeDatasetId]: 0 }
                    : state.progress.indexByDataset,
                },
              }));
            },
            loadMore: () => {
              const { filteredDataset, currentPage, itemsPerPage, displayedItems } = get().vocabulary;
              const nextPage = currentPage + 1;
              const startIdx = currentPage * itemsPerPage;
              const endIdx = startIdx + itemsPerPage;
              const newItems = filteredDataset.slice(startIdx, endIdx);

              if (newItems.length > 0) {
                set((state) => ({
                  vocabulary: {
                    ...state.vocabulary,
                    displayedItems: [...displayedItems, ...newItems],
                    currentPage: nextPage,
                    hasMore: endIdx < filteredDataset.length,
                  }
                }));
              }
            },
            setLoading: (isLoading) => set((state) => ({ vocabulary: { ...state.vocabulary, isLoading } })),
            setError: (error) => set((state) => ({ vocabulary: { ...state.vocabulary, error, isLoading: false } })),
            clearDataset: () => set((state) => ({
              vocabulary: {
                ...state.vocabulary,
                currentDataset: [],
                filteredDataset: [],
                displayedItems: [],
                currentItem: null,
                mode: '',
                totalCount: 0,
                currentPage: 1,
                hasMore: false,
                error: null,
              }
            })),
          },

          // Progress slice - inline implementation
          progress: {
            completedItems: new Set<string>(),
            completedItemsByDataset: {},
            currentIndex: 0,
            totalItems: 0,
            accuracy: 0,
            activeDatasetId: null,
            indexByDataset: {},
            sessionStartTime: null,
            sessionDuration: 0,
            itemsCompleted: 0,
            itemsCorrect: 0,
            markItemCompleted: (itemId, isCorrect) => {
              const state = get().progress;
              const activeDatasetId = state.activeDatasetId;
              const newCompleted = new Set(state.completedItems);
              newCompleted.add(itemId);
              const newItemsCompleted = state.itemsCompleted + 1;
              const newItemsCorrect = isCorrect ? state.itemsCorrect + 1 : state.itemsCorrect;
              const accuracy = newItemsCompleted > 0 ? Math.round((newItemsCorrect / newItemsCompleted) * 10000) / 100 : 0;
              set((s) => ({
                progress: {
                  ...s.progress,
                  completedItems: newCompleted,
                  completedItemsByDataset: activeDatasetId
                    ? { ...s.progress.completedItemsByDataset, [activeDatasetId]: Array.from(newCompleted) }
                    : s.progress.completedItemsByDataset,
                  itemsCompleted: newItemsCompleted,
                  itemsCorrect: newItemsCorrect,
                  accuracy,
                }
              }));
            },
            markCurrentItemCompleted: (isCorrect) => {
              const itemId = getDatasetItemId(get().vocabulary.currentItem);
              if (itemId === null) return false;
              get().progress.markItemCompleted(itemId, isCorrect);
              return true;
            },
            updateProgress: (currentIndex, totalItems) => set((state) => ({
              progress: {
                ...state.progress,
                currentIndex,
                totalItems,
                // Keep the active dataset's saved position in sync with direct updates.
                indexByDataset: state.progress.activeDatasetId
                  ? { ...state.progress.indexByDataset, [state.progress.activeDatasetId]: currentIndex }
                  : state.progress.indexByDataset,
              }
            })),
            startSession: () => set((state) => ({
              progress: {
                ...state.progress,
                sessionStartTime: Date.now(),
                sessionDuration: 0,
                itemsCompleted: 0,
                itemsCorrect: 0,
              }
            })),
            endSession: () => {
              const startTime = get().progress.sessionStartTime;
              const durationMs = startTime ? Date.now() - startTime : 0;
              const durationSeconds = Math.floor(durationMs / 1000);
              const { itemsCompleted, itemsCorrect, accuracy } = get().progress;
              const mode = get().settings.practiceType;
              const practiceMode = get().settings.practiceMode;
              const datasetId = get().settings.datasetId;

              // Track practice session completion
              if ((window as any).analyticsService && itemsCompleted > 0) {
                (window as any).analyticsService.trackPracticeSessionCompleted({
                  mode: mode || 'vocabulary',
                  practice_type: practiceMode || undefined,
                  dataset_id: datasetId,
                  items_completed: itemsCompleted,
                  items_correct: itemsCorrect,
                  accuracy,
                  duration_seconds: durationSeconds,
                });
              }

              set((state) => ({
                progress: {
                  ...state.progress,
                  sessionDuration: durationMs,
                  sessionStartTime: null,
                }
              }));
            },
            resetProgress: () => set((state) => ({
              progress: {
                ...state.progress,
                completedItems: new Set(),
                completedItemsByDataset: {},
                currentIndex: 0,
                totalItems: 0,
                accuracy: 0,
                activeDatasetId: null,
                indexByDataset: {},
                sessionStartTime: null,
                sessionDuration: 0,
                itemsCompleted: 0,
                itemsCorrect: 0,
              }
            })),
            calculateAccuracy: () => {
              const { itemsCompleted, itemsCorrect } = get().progress;
              const accuracy = itemsCompleted > 0 ? Math.round((itemsCorrect / itemsCompleted) * 10000) / 100 : 0;
              set((state) => ({ progress: { ...state.progress, accuracy } }));
            },
          },

          // UI slice - inline implementation
          ui: {
            isContentVisible: true,
            currentView: 'vocabulary',
            notification: null,
            isInitializing: true,
            setContentVisible: (isVisible) => set((state) => ({ ui: { ...state.ui, isContentVisible: isVisible } })),
            setCurrentView: (view) => set((state) => ({ ui: { ...state.ui, currentView: view } })),
            showNotification: (message, type) => set((state) => ({
              ui: { ...state.ui, notification: { message, type, isVisible: true } }
            })),
            hideNotification: () => set((state) => ({ ui: { ...state.ui, notification: null } })),
            setInitializing: (isInitializing) => set((state) => ({ ui: { ...state.ui, isInitializing } })),
          },

          // Auth slice - Supabase authentication integration
          auth: {
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            setUser: (user) => set((state) => ({
              auth: { ...state.auth, user, isAuthenticated: !!user }
            })),

            setSession: (session) => set((state) => ({
              auth: { ...state.auth, session, isAuthenticated: !!session }
            })),

            setLoading: (isLoading) => set((state) => ({
              auth: { ...state.auth, isLoading }
            })),

            setError: (error) => set((state) => ({
              auth: { ...state.auth, error, isLoading: false }
            })),

            signOut: async () => {
              set((state) => ({ auth: { ...state.auth, isLoading: true, error: null } }));
              const result = await authService.signOut();
              if (result.success) {
                // Track sign out event
                if ((window as any).analyticsService) {
                  (window as any).analyticsService.trackAuth('signout');
                  (window as any).analyticsService.reset(); // Clear user identity
                }

                set((state) => ({
                  auth: {
                    ...state.auth,
                    user: null,
                    session: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                  }
                }));
              } else {
                set((state) => ({
                  auth: {
                    ...state.auth,
                    error: result.message || 'Sign out failed',
                    isLoading: false,
                  }
                }));
              }
            },

            initialize: async () => {
              set((state) => ({ auth: { ...state.auth, isLoading: true, error: null } }));
              try {
                const user = await authService.getUser();
                const session = await authService.getSession();

                if (user && session) {
                  set((state) => ({
                    auth: {
                      ...state.auth,
                      user: {
                        id: user.id,
                        email: user.email!,
                        full_name: user.user_metadata?.['full_name'],
                        avatar_url: user.user_metadata?.['avatar_url'],
                        created_at: user.created_at,
                      },
                      session,
                      isAuthenticated: true,
                      isLoading: false,
                      error: null,
                    }
                  }));

                  // Identify user in analytics
                  if ((window as any).analyticsService) {
                    (window as any).analyticsService.identify(user.id, {
                      email: user.email,
                      signup_date: user.created_at,
                      full_name: user.user_metadata?.['full_name'],
                    });
                    (window as any).analyticsService.trackAuth('signin');
                  }

                  // Initialize sync service for authenticated user
                  await syncService.initialize();
                } else {
                  set((state) => ({
                    auth: {
                      ...state.auth,
                      user: null,
                      session: null,
                      isAuthenticated: false,
                      isLoading: false,
                      error: null,
                    }
                  }));
                }
              } catch (error) {
                set((state) => ({
                  auth: {
                    ...state.auth,
                    user: null,
                    session: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: (error as Error).message,
                  }
                }));
              }
            },
          },
        }),
        {
          name: 'pte-app-storage', // LocalStorage key
          partialize: (state) => ({
            // Persist settings, audio preferences, and progress
            settings: state.settings,
            audio: {
              // Persist user preferences, not runtime state
              autoPlayEnabled: state.audio.autoPlayEnabled,
              repeatMode: state.audio.repeatMode,
              playbackSpeed: state.audio.playbackSpeed,
              volume: state.audio.volume,
            },
            progress: {
              accuracy: state.progress.accuracy,
              // Per dataset positions and completed item ids replace the old single
              // global values, so neither leaks across vocabulary books on reload.
              indexByDataset: state.progress.indexByDataset,
              completedItemsByDataset: state.progress.completedItemsByDataset,
            },
          }),
          // Properly merge persisted state with initial state (preserves methods)
          merge: (persistedState, currentState) => {
            const persisted = persistedState as Partial<AppState>;
            return {
              ...currentState,
              settings: {
                ...currentState.settings, // Keep all methods
                ...(persisted.settings || {}), // Override with persisted preferences
              },
              audio: {
                ...currentState.audio, // Keep all methods and runtime state
                ...(persisted.audio || {}), // Override with persisted preferences
              },
              progress: {
                ...currentState.progress,
                ...(persisted.progress || {}),
              },
            };
          },
          onRehydrateStorage: () => (state) => {
            if (!state) return;

            // completedItems is a derived view of the active dataset; the durable
            // source is completedItemsByDataset, rebuilt by setDataset on load.
            // Older builds persisted a single global (index based) completedItems
            // array, which is intentionally not migrated into the per dataset map.
            if (state.progress) {
              if (
                !state.progress.completedItemsByDataset ||
                typeof state.progress.completedItemsByDataset !== 'object'
              ) {
                state.progress.completedItemsByDataset = {};
              }
              state.progress.completedItems = new Set<string>();
            }

            // Migrate old DI shadowing datasets to new combined dataset
            if (state?.settings?.vocabularyBook) {
              const oldBook = state.settings.vocabularyBook;
              if (oldBook === 'di-shadowing-1-10' || oldBook === 'di-shadowing-11-20') {
                console.log(`[Migration] Converting old DI shadowing ID "${oldBook}" to "di-shadowing"`);
                state.settings.vocabularyBook = 'di-shadowing';
                state.settings.datasetId = 'di-shadowing';
              }
            }
          },
        }
      ),
      {
        name: 'PTE App Store',
        enabled: typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'development',
      }
    )
  )
);

/**
 * Expose store globally for vanilla JS compatibility
 * (Browser environment only)
 */
if (typeof window !== 'undefined') {
  (window as any).appStore = useAppStore;
}

/**
 * Helper hooks for common store selections
 */

// Audio selectors
export const useAudioState = () => useAppStore((state) => state.audio);
export const useIsAutoPlaying = () => useAppStore((state) => state.audio.isAutoPlaying);
export const useCurrentIndex = () => useAppStore((state) => state.audio.currentIndex);

// TTS selectors
export const useTTSState = () => useAppStore((state) => state.tts);
export const useIsSpeaking = () => useAppStore((state) => state.tts.isSpeaking);

// Settings selectors
export const useSettings = () => useAppStore((state) => state.settings);
export const usePracticeMode = () => useAppStore((state) => state.settings.practiceMode);

// Vocabulary selectors
export const useVocabulary = () => useAppStore((state) => state.vocabulary);
export const useCurrentItem = () => useAppStore((state) => state.vocabulary.currentItem);
export const useFilteredDataset = () => useAppStore((state) => state.vocabulary.filteredDataset);

// Progress selectors
export const useProgress = () => useAppStore((state) => state.progress);
export const useAccuracy = () => useAppStore((state) => state.progress.accuracy);

// UI selectors
export const useUI = () => useAppStore((state) => state.ui);
export const useNotification = () => useAppStore((state) => state.ui.notification);

// Auth selectors
export const useAuth = () => useAppStore((state) => state.auth);

/**
 * Export all store types
 */
export * from './types';
