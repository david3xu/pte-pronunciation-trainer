/**
 * UIController - Type-safe DOM manipulation and display updates
 * Handles all UI interactions, content display, and event orchestration
 *
 * This is the TypeScript version of src/js/ui/UIController.js
 * Provides type-safe DOM manipulation for both vocabulary and practice modes
 */
import type { VocabularyTerm, PracticeMode, PracticeItem } from '../../types';
/**
 * Log level type
 */
type LogLevel = 'error' | 'warn' | 'info';
/**
 * Type-safe UI Controller
 * Manages DOM updates, content display, and user interactions
 */
export declare class UIController {
    private config;
    private pronunciationPreference;
    private currentWordPronunciations;
    private state;
    private currentWord;
    private currentIndex;
    constructor(config?: any);
    /**
     * Get module instance with error handling
     */
    getModule<T = any>(moduleName: string, required?: boolean, defaultValue?: T | null): T | null;
    /**
     * Centralized error handling
     */
    handleError(message: string, error?: Error | string, showToUser?: boolean, level?: LogLevel): void;
    /**
     * Get current practice mode from state, SettingsModule, or config fallback
     */
    getPracticeMode(): PracticeMode;
    /**
     * Setup event listeners for UI updates
     */
    setupEventListeners(): void;
    /**
     * Bind event listeners to DOM elements
     */
    bindEventListeners(): void;
    /**
     * Unified display orchestrator
     */
    displayCurrent(data?: any, mode?: PracticeMode | null): void;
    /**
     * Bind all setting controls using generic event-driven pattern
     */
    bindSettingControls(): void;
    /**
     * Initialize dropdowns based on current configuration
     */
    initializeDropdowns(): void;
    /**
     * Populate all dropdowns using SettingsModule
     */
    populateAllDropdownsFromSettingsModule(): void;
    /**
     * Generic dropdown population method
     */
    populateDropdown(elementId: string, settingKey: string, defaultValue: string, filterType?: string | null): void;
    /**
     * Update book display with current mode and word count
     */
    updateBookDisplay(): void;
    /**
     * Display a vocabulary word
     */
    displayWord(word: VocabularyTerm | null, index: number): void;
    /**
     * Display first word when vocabulary source changes
     */
    displayFirstWord(): void;
    /**
     * Clean example sentence by removing speaker prefixes and metadata
     */
    cleanExampleSentence(rawSentence: string): string;
    /**
     * Update UI with current vocabulary
     */
    updateUI(): void;
    /**
     * Sync repeat mode from HTML (kept for backward compatibility)
     */
    syncRepeatModeFromHTML(): void;
    /**
     * Update button states
     */
    updateButtons(): void;
    /**
     * Show loading state
     */
    showLoadingState(): void;
    /**
     * Hide loading state
     */
    hideLoadingState(): void;
    /**
     * Get pronunciation preference
     */
    getPronunciationPreference(): string;
    /**
     * Set pronunciation preference
     */
    setPronunciationPreference(preference: string): void;
    /**
     * Toggle between British and American pronunciation
     */
    togglePronunciation(): string;
    /**
     * Handle settings changes
     */
    handleSettingsChange(key: string, _value: any): void;
    /**
     * Handle practice mode changes
     */
    handlePracticeModeChange(mode: PracticeMode): Promise<boolean>;
    /**
     * Handle practice dataset change
     */
    handlePracticeDatasetChange(): Promise<void>;
    /**
     * Load dataset for practice mode
     */
    loadPracticeDataset(mode: PracticeMode): Promise<boolean>;
    /**
     * Unified display method for all modes
     */
    displayContent(item: PracticeItem | null, mode: PracticeMode): void;
    /**
     * Get emoji for difficulty level
     */
    getDifficultyEmoji(difficulty: string): string;
}
export declare const uiController: UIController;
export default uiController;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        uiController: UIController;
    }
}
//# sourceMappingURL=UIController.d.ts.map