/**
 * Zustand Store Type Definitions
 *
 * This replaces the EventBus pattern with Zustand's reactive state management.
 * Each store slice manages a specific domain of the application.
 */

import type { Difficulty, PracticeItem, VocabularyItem } from '../types/dataset.types';

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
  playbackSpeed: number;
  volume: number;

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
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setCurrentIndex: (index: number) => void;
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
  practiceType: 'vocabulary' | 'vocab-typing' | 'practice' | 'shadowing';
  practiceMode: 'practice-repeat-sentence' | 'practice-answer-short-question' | 'practice-write-from-dictation' | null;
  vocabularyBook: string;
  datasetId: string;

  // Audio settings
  autoPlay: boolean;
  autoSwitchBooks: boolean;
  showPhonetic: boolean;
  ttsRate: number;
  ttsVoice: string | null;

  // Difficulty filter
  difficultyFilter: Difficulty | 'all';

  // UI settings
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
  currentIndex: number;
  totalItems: number;
  accuracy: number;

  // Session stats
  sessionStartTime: number | null;
  sessionDuration: number;
  itemsCompleted: number;
  itemsCorrect: number;

  // Actions
  markItemCompleted: (itemId: string, isCorrect: boolean) => void;
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
