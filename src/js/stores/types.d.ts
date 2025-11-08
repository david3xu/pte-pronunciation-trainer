/**
 * Zustand Store Type Definitions
 *
 * This replaces the EventBus pattern with Zustand's reactive state management.
 * Each store slice manages a specific domain of the application.
 */
import type { VocabularyTerm, PracticeItem, Difficulty } from '../../types/dataset.types';
export type VocabularyItem = VocabularyTerm;
export interface AudioState {
    isAutoPlaying: boolean;
    isPaused: boolean;
    currentIndex: number;
    repeatMode: boolean;
    playbackSpeed: number;
    volume: number;
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
export interface TTSState {
    isSpeaking: boolean;
    currentWord: string | null;
    currentPhonetic: string | null;
    speakingMode: 'word' | 'sentence' | 'question' | null;
    selectedVoice: SpeechSynthesisVoice | null;
    availableVoices: SpeechSynthesisVoice[];
    error: string | null;
    startSpeaking: (word: string, phonetic?: string, mode?: 'word' | 'sentence' | 'question') => void;
    stopSpeaking: () => void;
    setVoice: (voice: SpeechSynthesisVoice) => void;
    setAvailableVoices: (voices: SpeechSynthesisVoice[]) => void;
    setError: (error: string | null) => void;
}
export interface SettingsState {
    practiceType: 'vocabulary' | 'practice';
    practiceMode: 'rs' | 'asq' | 'wfd' | null;
    vocabularyBook: string;
    datasetId: string;
    autoPlay: boolean;
    showPhonetic: boolean;
    ttsRate: number;
    ttsVoice: string | null;
    difficultyFilter: Difficulty | 'all';
    isPanelOpen: boolean;
    updateSetting: <K extends keyof Omit<SettingsState, 'updateSetting' | 'resetSettings' | 'togglePanel'>>(key: K, value: SettingsState[K]) => void;
    resetSettings: () => void;
    togglePanel: () => void;
}
export interface VocabularyState {
    currentDataset: (VocabularyItem | PracticeItem)[];
    filteredDataset: (VocabularyItem | PracticeItem)[];
    currentItem: VocabularyItem | PracticeItem | null;
    mode: string;
    totalCount: number;
    isLoading: boolean;
    error: string | null;
    setDataset: (dataset: (VocabularyItem | PracticeItem)[], mode: string) => void;
    setCurrentItem: (item: VocabularyItem | PracticeItem) => void;
    filterByDifficulty: (difficulty: Difficulty | 'all') => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    clearDataset: () => void;
}
export interface ProgressState {
    completedItems: Set<string>;
    currentIndex: number;
    totalItems: number;
    accuracy: number;
    sessionStartTime: number | null;
    sessionDuration: number;
    itemsCompleted: number;
    itemsCorrect: number;
    markItemCompleted: (itemId: string, isCorrect: boolean) => void;
    updateProgress: (currentIndex: number, totalItems: number) => void;
    startSession: () => void;
    endSession: () => void;
    resetProgress: () => void;
    calculateAccuracy: () => void;
}
export interface UIState {
    isContentVisible: boolean;
    currentView: 'vocabulary' | 'practice' | 'settings';
    notification: {
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
        isVisible: boolean;
    } | null;
    isInitializing: boolean;
    setContentVisible: (isVisible: boolean) => void;
    setCurrentView: (view: 'vocabulary' | 'practice' | 'settings') => void;
    showNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    hideNotification: () => void;
    setInitializing: (isInitializing: boolean) => void;
}
export interface AppStore {
    audio: AudioState;
    tts: TTSState;
    settings: SettingsState;
    vocabulary: VocabularyState;
    progress: ProgressState;
    ui: UIState;
}
//# sourceMappingURL=types.d.ts.map