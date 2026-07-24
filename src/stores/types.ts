/**
 * Zustand Store Type Definitions
 *
 * This replaces the EventBus pattern with Zustand's reactive state management.
 * Each store slice manages a specific domain of the application.
 */

import type { Difficulty, PracticeItem, VocabularyItem } from '../types/dataset.types';
import type { WritingMode } from '../config/writingTasks';

// Type alias for backward compatibility
// VocabularyItem is now imported directly from dataset.types

// ============================================
// AUDIO STORE TYPES
// ============================================

export interface AudioState {
  // Playing state
  isPlaying: boolean;

  // Autoplay state
  isAutoPlaying: boolean;
  autoPlayEnabled: boolean;
  isPaused: boolean;

  // Navigation
  currentIndex: number;

  // Audio settings
  repeatMode: boolean;
  volume: number;

  // Recovery state: true when playback was interrupted by the browser/OS or
  // blocked by autoplay policy and needs an explicit tap to resume. A UI can
  // show a "Tap to resume practice audio" prompt while this is true.
  needsResume: boolean;
  resumeReason: 'autoplay-blocked' | 'suspended' | null;

  // Actions
  setPlaying: (isPlaying: boolean) => void;
  setAutoPlay: (autoPlayEnabled: boolean) => void;
  startAutoPlay: () => void;
  pauseAutoPlay: () => void;
  resumeAutoPlay: () => void;
  stopAutoPlay: () => void;
  navigateNext: () => void;
  navigatePrev: () => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void;
  setCurrentIndex: (index: number) => void;
  setNeedsResume: (needsResume: boolean, reason?: 'autoplay-blocked' | 'suspended' | null) => void;
}

// ============================================
// TTS STORE TYPES
// ============================================

export interface TTSState {
  // Speaking state
  isSpeaking: boolean;
  currentWord: string | null;
  currentPhonetic: string | null;
  speakingMode: 'word' | 'sentence' | 'question' | null;

  // Voice selection
  selectedVoice: SpeechSynthesisVoice | null;
  availableVoices: SpeechSynthesisVoice[];

  // Error state
  error: string | null;

  // Actions
  startSpeaking: (word: string, phonetic?: string, mode?: 'word' | 'sentence' | 'question') => void;
  stopSpeaking: () => void;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setAvailableVoices: (voices: SpeechSynthesisVoice[]) => void;
  setError: (error: string | null) => void;
}

// ============================================
// SETTINGS STORE TYPES
// ============================================

export interface SettingsState {
  // Practice settings
  practiceType: 'vocabulary' | 'vocab-typing' | 'practice' | 'writing' | 'shadowing';
  practiceMode: 'practice-repeat-sentence' | 'practice-answer-short-question' | 'practice-write-from-dictation' | null;
  // Writing task, nested under practiceType 'writing' the same way practiceMode
  // is nested under 'practice'. Only 'swt' exists today; a second writing task
  // (e.g. SST) is meant to be added as another union member here, not another
  // top level practiceType.
  writingMode: WritingMode | null;
  vocabularyBook: string;
  datasetId: string;

  // Audio settings
  autoPlay: boolean;
  backgroundAudioMode: boolean; // Legacy persisted flag; real audio is now used for all practice playback
  autoSwitchBooks: boolean;
  showPhonetic: boolean;
  ttsRate: number;
  ttsVoice: string | null;
  vocabRepeatCount: 1 | 3 | 5; // Number of times to repeat each word during practice

  // Difficulty filter
  difficultyFilter: Difficulty | 'all';

  // UI settings
  theme: 'light' | 'dark' | 'auto';
  isPanelOpen: boolean;

  // Actions
  updateSetting: <K extends keyof Omit<SettingsState, 'updateSetting' | 'resetSettings' | 'togglePanel'>>(
    key: K,
    value: SettingsState[K]
  ) => void;
  resetSettings: () => void;
  togglePanel: () => void;
}

// ============================================
// VOCABULARY STORE TYPES
// ============================================

export interface VocabularyState {
  // Data
  currentDataset: (VocabularyItem | PracticeItem)[]; // All items
  filteredDataset: (VocabularyItem | PracticeItem)[]; // After difficulty filter
  displayedItems: (VocabularyItem | PracticeItem)[]; // Currently displayed (paginated)
  currentItem: VocabularyItem | PracticeItem | null;

  // Metadata
  mode: string;
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  hasMore: boolean;

  // Actions
  setDataset: (dataset: (VocabularyItem | PracticeItem)[], mode: string) => void;
  setCurrentItem: (item: VocabularyItem | PracticeItem) => void;
  goToItem: (index: number) => boolean;
  filterByDifficulty: (difficulty: Difficulty | 'all') => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearDataset: () => void;
  loadMore: () => void; // Load next page
}

// ============================================
// PROGRESS STORE TYPES
// ============================================

export interface ProgressState {
  // Progress tracking
  completedItems: Set<string>;
  // Completed item ids kept per dataset so completion state does not leak
  // between books. completedItems mirrors the active dataset's entry.
  completedItemsByDataset: Record<string, string[]>;
  currentIndex: number;
  totalItems: number;
  accuracy: number;

  // Per dataset navigation position: id of the active dataset, plus the last
  // index visited for each dataset so switching books restores the right place.
  activeDatasetId: string | null;
  indexByDataset: Record<string, number>;

  // Session stats
  sessionStartTime: number | null;
  sessionDuration: number;
  itemsCompleted: number;
  itemsCorrect: number;

  // Actions
  markItemCompleted: (itemId: string, isCorrect: boolean) => void;
  markCurrentItemCompleted: (isCorrect: boolean) => boolean;
  updateProgress: (currentIndex: number, totalItems: number) => void;
  startSession: () => void;
  endSession: () => void;
  resetProgress: () => void;
  calculateAccuracy: () => void;
}

// ============================================
// UI STORE TYPES
// ============================================

export interface UIState {
  // Display state
  isContentVisible: boolean;
  currentView: 'vocabulary' | 'practice' | 'settings';

  // Notification/toast state
  notification: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isVisible: boolean;
  } | null;

  // Loading states
  isInitializing: boolean;

  // Actions
  setContentVisible: (isVisible: boolean) => void;
  setCurrentView: (view: 'vocabulary' | 'practice' | 'settings') => void;
  showNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  hideNotification: () => void;
  setInitializing: (isInitializing: boolean) => void;
}

// ============================================
// AUTH STORE TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthState {
  // Authentication state
  user: User | null;
  session: any | null; // Supabase Session type
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => void;
  initialize: () => Promise<void>;
}

// ============================================
// COMBINED STORE TYPE
// ============================================

export interface AppStore {
  audio: AudioState;
  tts: TTSState;
  settings: SettingsState;
  vocabulary: VocabularyState;
  progress: ProgressState;
  ui: UIState;
  auth: AuthState;
}
