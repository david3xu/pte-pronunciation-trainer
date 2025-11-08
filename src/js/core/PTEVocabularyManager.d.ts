/**
 * PTEVocabularyManager - Type-Safe Vocabulary Management
 *
 * Manages vocabulary loading, filtering, and state for PTE datasets.
 * Handles 13 vocabulary books with retry logic and event-driven updates.
 *
 * TypeScript version of src/js/core/PTEVocabularyManager.js
 */
import type { VocabularyTerm, VocabularyCategory, Difficulty } from '../../types';
/**
 * Vocabulary manager statistics
 */
interface VocabularyStats {
    totalWords: number;
    filteredWords: number;
    categories: number;
    difficulties: number;
    currentMode: VocabularyCategory;
    currentCategory: string;
    currentDifficulty: string;
}
/**
 * Type-safe PTE Vocabulary Manager
 * Handles all vocabulary dataset operations with retry logic and filtering
 */
export declare class PTEVocabularyManager {
    private currentCategory;
    private currentDifficulty;
    private currentLearningMode;
    private currentWords;
    private allWords;
    private datasets;
    private config;
    private isInitialized;
    constructor();
    /**
     * Attach event listeners for settings changes
     * @private
     */
    private _attachEventListeners;
    /**
     * Handle setting changes from SettingsModule
     * @private
     */
    private _handleSettingChange;
    /**
     * Initialize the vocabulary manager
     */
    initialize(): Promise<void>;
    /**
     * Set the current learning mode
     */
    setLearningMode(mode: VocabularyCategory): Promise<void>;
    /**
     * Load words for the specified learning mode
     */
    loadWordsForMode(mode: VocabularyCategory): Promise<void>;
    /**
     * Dynamically load a dataset by mode with retry logic
     * Implements exponential backoff: 1s, 2s, 4s
     */
    loadDataset(mode: VocabularyCategory): Promise<void>;
    /**
     * Get next learning mode for auto-loop (circular)
     * FIB → Beginner → Intermediate → Advanced → RA → RS → FIB (loop)
     */
    getNextLearningMode(): VocabularyCategory;
    /**
     * Apply current category and difficulty filters
     */
    applyFilters(): void;
    /**
     * Set current category filter
     */
    setCategory(category: string): void;
    /**
     * Set current difficulty filter
     */
    setDifficulty(difficulty: string): void;
    /**
     * Get current words (filtered)
     */
    getCurrentWords(): VocabularyTerm[];
    /**
     * Get current word by index
     */
    getCurrentWord(index: number): VocabularyTerm | null;
    /**
     * Get all words (unfiltered)
     */
    getAllWords(): VocabularyTerm[];
    /**
     * Get total number of words (filtered)
     */
    getTotalWords(): number;
    /**
     * Get word by index
     */
    getWord(index: number): VocabularyTerm | null;
    /**
     * Get total word count (alias for getTotalWords)
     */
    getTotalWordCount(): number;
    /**
     * Get current learning mode
     */
    getCurrentLearningMode(): VocabularyCategory;
    /**
     * Get current category
     */
    getCurrentCategory(): string;
    /**
     * Get current difficulty
     */
    getCurrentDifficulty(): string;
    /**
     * Get available categories from current words
     */
    getAvailableCategories(): string[];
    /**
     * Get available difficulties from current words
     */
    getAvailableDifficulties(): Difficulty[];
    /**
     * Search words by text query
     */
    searchWords(query: string): VocabularyTerm[];
    /**
     * Get random word from current filtered words
     */
    getRandomWord(): VocabularyTerm | null;
    /**
     * Get vocabulary statistics
     */
    getStats(): VocabularyStats;
}
export declare const pteVocabularyManager: PTEVocabularyManager;
export default pteVocabularyManager;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        PTEVocabularyManager: typeof PTEVocabularyManager;
        pteVocabularyManager?: PTEVocabularyManager;
    }
}
//# sourceMappingURL=PTEVocabularyManager.d.ts.map