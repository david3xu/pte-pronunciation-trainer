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
import { appConfig } from '../config/AppConfig';

import { type Difficulty, type PracticeItem, type VocabularyTerm } from '../types/dataset.types';
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
 * The default vocabulary book, derived once from AppConfig's enabled
 * learningModes so the store never hardcodes a book id (single source of truth).
 */
const DEFAULT_VOCABULARY_BOOK = appConfig.getDefaultVocabularyBookId();
const DEFAULT_TTS_RATE = 0.7;
const PREVIOUS_DEFAULT_TTS_RATES = new Set([1.0, 1.2]);

/**
 * Identity fields checked in priority order when deriving a completion id.
 * Normalized vocabulary items expose english (or an explicit id from schema
 * standardization); legacy vocabulary uses word; practice items use sentence
 * or question.
 */
const ITEM_ID_FIELDS = ['id', 'word', 'english', 'sentence', 'question'] as const;

/**
 * Stable identity for a dataset item, used for completion tracking.
 * Reads the first available identity field (see ITEM_ID_FIELDS) and returns
 * null when none is present, so callers never fall back to a list index.
 * Known limitation: these ids are content based, so a dataset that repeats the
 * same phrase shares one completion entry. Generating a stable per item id
 * upstream would remove that edge case if it becomes a problem.
 */
export const getDatasetItemId = (
  item: VocabularyTerm | PracticeItem | null | undefined
): string | null => {
  if (!item) return null;
  const record = item as unknown as Record<string, unknown>;
  for (const field of ITEM_ID_FIELDS) {
    const value = record[field];
    if (typeof value === 'string' && value.length > 0) return value;
  }
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

const getItemDifficulty = (item: VocabularyTerm | PracticeItem): Difficulty | undefined => {
  if ('difficulty' in item && item.difficulty) return item.difficulty;
  if ('metadata' in item && item.metadata?.difficulty) return item.metadata.difficulty;
  return undefined;
};

const filterDatasetByDifficulty = (
  dataset: (VocabularyTerm | PracticeItem)[],
  difficulty: Difficulty | 'all'
): (VocabularyTerm | PracticeItem)[] => (
  difficulty === 'all'
    ? dataset
    : dataset.filter((item) => getItemDifficulty(item) === difficulty)
);

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
            volume: 1.0,
            needsResume: false,
            resumeReason: null,
            setPlaying: (isPlaying: boolean) => set((state) => ({ audio: { ...state.audio, isPlaying } })),
            setAutoPlay: (autoPlayEnabled: boolean) => set((state) => ({ audio: { ...state.audio, autoPlayEnabled } })),
            startAutoPlay: () => set((state) => ({ audio: { ...state.audio, isAutoPlaying: true, autoPlayEnabled: true, isPaused: false } })),
            pauseAutoPlay: () => set((state) => ({ audio: { ...state.audio, isPaused: true } })),
            resumeAutoPlay: () => set((state) => ({ audio: { ...state.audio, isPaused: false } })),
            stopAutoPlay: () => set((state) => ({ audio: { ...state.audio, isAutoPlaying: false, autoPlayEnabled: false, isPaused: false, needsResume: false, resumeReason: null } })),
            navigateNext: () => set((state) => ({ audio: { ...state.audio, currentIndex: state.audio.currentIndex + 1 } })),
            navigatePrev: () => set((state) => ({ audio: { ...state.audio, currentIndex: Math.max(0, state.audio.currentIndex - 1) } })),
            toggleRepeat: () => set((state) => ({ audio: { ...state.audio, repeatMode: !state.audio.repeatMode } })),
            setVolume: (volume) => set((state) => ({ audio: { ...state.audio, volume: Math.max(0, Math.min(1, volume)) } })),
            setCurrentIndex: (index) => set((state) => ({ audio: { ...state.audio, currentIndex: Math.max(0, index) } })),
            setNeedsResume: (needsResume, reason = null) => set((state) => ({
              audio: { ...state.audio, needsResume, resumeReason: needsResume ? reason : null },
            })),
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
            writingMode: null,
            vocabularyBook: DEFAULT_VOCABULARY_BOOK,
            datasetId: DEFAULT_VOCABULARY_BOOK,
            autoPlay: true, // Default ON - automatically plays audio when vocabulary loads
            backgroundAudioMode: true, // Real-audio playback is the default for all practice modes
            autoSwitchBooks: false, // Default OFF - stays on current book
            showPhonetic: true,
            ttsRate: DEFAULT_TTS_RATE,
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

              set((state) => {
                const nextSettings = { ...state.settings, [key]: value };

                if (key !== 'difficultyFilter') {
                  return { settings: nextSettings };
                }

                const difficulty = value as Difficulty | 'all';
                const itemsPerPage = state.vocabulary.itemsPerPage;
                const filteredDataset = filterDatasetByDifficulty(
                  state.vocabulary.currentDataset,
                  difficulty
                );
                const displayedItems = filteredDataset.slice(0, itemsPerPage);
                const currentItem = (filteredDataset[0] ?? null) as VocabularyTerm | PracticeItem | null;
                const activeDatasetId = state.progress.activeDatasetId;

                return {
                  settings: nextSettings,
                  vocabulary: {
                    ...state.vocabulary,
                    filteredDataset,
                    displayedItems,
                    currentItem,
                    totalCount: filteredDataset.length,
                    currentPage: 1,
                    hasMore: filteredDataset.length > itemsPerPage,
                  },
                  audio: {
                    ...state.audio,
                    currentIndex: 0,
                  },
                  progress: {
                    ...state.progress,
                    currentIndex: 0,
                    totalItems: filteredDataset.length,
                    indexByDataset: activeDatasetId
                      ? { ...state.progress.indexByDataset, [activeDatasetId]: 0 }
                      : state.progress.indexByDataset,
                  },
                };
              });
            },
            resetSettings: () => set((state) => {
              const itemsPerPage = state.vocabulary.itemsPerPage;
              const displayedItems = state.vocabulary.currentDataset.slice(0, itemsPerPage);
              const currentItem = (state.vocabulary.currentDataset[0] ?? null) as VocabularyTerm | PracticeItem | null;
              const activeDatasetId = state.progress.activeDatasetId;

              return {
                settings: {
                  ...state.settings,
                  practiceType: 'vocabulary',
                  practiceMode: null,
                  writingMode: null,
                  vocabularyBook: DEFAULT_VOCABULARY_BOOK,
                  datasetId: DEFAULT_VOCABULARY_BOOK,
                  autoPlay: true, // Default ON
                  backgroundAudioMode: true, // Real-audio playback is the default
                  autoSwitchBooks: false, // Default OFF
                  showPhonetic: true,
                  ttsRate: DEFAULT_TTS_RATE,
                  ttsVoice: null, // Browser Default as default
                  vocabRepeatCount: 1, // Default: speak each word once
                  difficultyFilter: 'all',
                  theme: 'auto', // Default: follow system preference
                  isPanelOpen: false,
                },
                vocabulary: {
                  ...state.vocabulary,
                  filteredDataset: state.vocabulary.currentDataset,
                  displayedItems,
                  currentItem,
                  totalCount: state.vocabulary.currentDataset.length,
                  currentPage: 1,
                  hasMore: state.vocabulary.currentDataset.length > itemsPerPage,
                },
                audio: {
                  ...state.audio,
                  currentIndex: 0,
                },
                progress: {
                  ...state.progress,
                  currentIndex: 0,
                  totalItems: state.vocabulary.currentDataset.length,
                  indexByDataset: activeDatasetId
                    ? { ...state.progress.indexByDataset, [activeDatasetId]: 0 }
                    : state.progress.indexByDataset,
                },
              };
            }),
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
              const filteredDataset = filterDatasetByDifficulty(dataset, get().settings.difficultyFilter);
              const displayedItems = filteredDataset.slice(0, itemsPerPage);

              // Restore this dataset's saved position, or start at the first item.
              const savedIndex = get().progress.indexByDataset[mode];
              const restoredIndex =
                typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < filteredDataset.length
                  ? savedIndex
                  : 0;
              const restoredItem = (filteredDataset[restoredIndex] ?? null) as VocabularyTerm | PracticeItem | null;

              set((state) => ({
                vocabulary: {
                  ...state.vocabulary,
                  currentDataset: dataset,
                  filteredDataset,
                  displayedItems,
                  currentItem: restoredItem,
                  mode,
                  totalCount: filteredDataset.length,
                  currentPage: 1,
                  itemsPerPage,
                  hasMore: filteredDataset.length > itemsPerPage,
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
                  totalItems: filteredDataset.length,
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

              const nextDataset = filterDatasetByDifficulty(currentDataset, difficulty);

              const displayedItems = nextDataset.slice(0, itemsPerPage);
              // Changing the visible set resets to its first item so the index,
              // current item, and visible total stay consistent.
              const firstItem = (nextDataset[0] ?? null) as VocabularyTerm | PracticeItem | null;

              set((state) => ({
                settings: {
                  ...state.settings,
                  difficultyFilter: difficulty,
                },
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
            const persistedAudio = persisted.audio;
            const persistedSettings = persisted.settings;
            const migratedSettings = {
              ...currentState.settings,
              ...(persistedSettings || {}),
              ttsRate: persistedSettings?.ttsRate !== undefined && PREVIOUS_DEFAULT_TTS_RATES.has(persistedSettings.ttsRate)
                ? DEFAULT_TTS_RATE
                : persistedSettings?.ttsRate ?? currentState.settings.ttsRate,
            };
            return {
              ...currentState,
              settings: migratedSettings,
              audio: {
                ...currentState.audio, // Keep all methods and runtime state
                autoPlayEnabled: persistedAudio?.autoPlayEnabled ?? currentState.audio.autoPlayEnabled,
                repeatMode: persistedAudio?.repeatMode ?? currentState.audio.repeatMode,
                volume: persistedAudio?.volume ?? currentState.audio.volume,
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

            // Migrate SWT from a practice-* sub-mode straight to the reusable
            // Writing Practice study type. This is the oldest shape, from
            // before SWT was even its own practiceType at all: nested under
            // 'practice' the same way as RS/ASQ/WFD.
            if (
              state?.settings?.practiceType === 'practice' &&
              (state.settings.practiceMode as string) === 'practice-summarize-written-text'
            ) {
              console.log('[Migration] Converting SWT from a practice-* sub-mode to Writing Practice');
              state.settings.practiceType = 'writing';
              state.settings.practiceMode = null;
              state.settings.writingMode = 'swt';
              state.settings.datasetId = 'swt';
            }

            // Migrate SWT from a flat, one-off top level practiceType to the
            // reusable Writing Practice study type + writingMode. This is the
            // intermediate shape (SWT briefly was practiceType 'swt' directly)
            // before Writing Practice existed as a reusable page a second
            // writing task could be added under later.
            if ((state?.settings?.practiceType as string) === 'swt') {
              console.log('[Migration] Converting SWT from a flat practiceType to Writing Practice');
              state.settings.practiceType = 'writing';
              state.settings.writingMode = 'swt';
              if (state.settings.vocabularyBook === 'swt') {
                state.settings.vocabularyBook = appConfig.getDefaultVocabularyBookId();
              }
              state.settings.datasetId = 'swt';
            }
          },
        }
      ),
      {
        name: 'PTE App Store',
        enabled: import.meta.env.DEV,
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
