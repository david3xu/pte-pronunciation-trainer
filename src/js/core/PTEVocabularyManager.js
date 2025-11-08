/**
 * PTEVocabularyManager - Type-Safe Vocabulary Management
 *
 * ARCHITECTURE: Zustand state management
 * - Replaces EventBus with Zustand store subscriptions and updates
 * - Subscribes to settings.difficultyFilter and settings.vocabularyBook changes
 * - Updates vocabulary store directly instead of emitting events
 * - Error notifications via UI store
 *
 * Manages vocabulary loading, filtering, and state for PTE datasets.
 * Handles 13 vocabulary books with retry logic and reactive updates.
 *
 * TypeScript version of src/js/core/PTEVocabularyManager.js
 */
import { useAppStore } from '../stores.js';
/**
 * Type-safe PTE Vocabulary Manager
 * Handles all vocabulary dataset operations with retry logic and filtering
 */
export class PTEVocabularyManager {
    currentCategory = 'all-categories';
    currentDifficulty = 'all';
    currentLearningMode = 'pte-fib-listening';
    currentWords = [];
    allWords = [];
    datasets = new Map();
    config = null;
    isInitialized = false;
    unsubscribers = [];
    constructor() {
        // Initialize config reference
        this.config = (typeof window !== 'undefined' && window.appConfig) || null;
        // Subscribe to settings changes via Zustand (replaces EventBus listener)
        this._setupStoreSubscriptions();
        // Initialize when DOM is ready
        if (typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
            }
            else {
                this.initialize();
            }
        }
    }
    /**
     * Cleanup subscriptions
     */
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
    /**
     * Setup Zustand store subscriptions (replaces EventBus listeners)
     * @private
     */
    _setupStoreSubscriptions() {
        if (typeof window === 'undefined')
            return;
        // Subscribe to difficulty filter changes
        const unsubDifficulty = useAppStore.subscribe((state) => state.settings.difficultyFilter, (difficultyFilter, prevDifficultyFilter) => {
            if (difficultyFilter !== prevDifficultyFilter) {
                this.setDifficulty(difficultyFilter);
                console.log(`[PTEVocabularyManager] Difficulty changed to ${difficultyFilter}`);
                // Update vocabulary store (replaces EventBus emission)
                useAppStore.getState().vocabulary.filterByDifficulty(difficultyFilter);
            }
        });
        this.unsubscribers.push(unsubDifficulty);
        // Subscribe to vocabulary book (learning mode) changes
        const unsubLearningMode = useAppStore.subscribe((state) => state.settings.vocabularyBook, async (vocabularyBook, prevVocabularyBook) => {
            if (vocabularyBook && vocabularyBook !== prevVocabularyBook) {
                await this.setLearningMode(vocabularyBook);
                console.log(`[PTEVocabularyManager] Learning mode changed to ${vocabularyBook}`);
                // Vocabulary store is updated in setLearningMode via loadWordsForMode
            }
        });
        this.unsubscribers.push(unsubLearningMode);
    }
    /**
     * Initialize the vocabulary manager
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Initialize with default learning mode from Config.js
            const defaultLearningMode = (this.config?.get('data.defaults.learningMode') ||
                this.config?.get('fallbacks.learningMode') ||
                'pte-fib-listening');
            await this.loadDataset(defaultLearningMode);
            await this.setLearningMode(defaultLearningMode);
            this.isInitialized = true;
            console.log('[PTEVocabularyManager] ✅ Initialized successfully');
        }
        catch (error) {
            console.error('❌ Error initializing PTE Vocabulary Manager:', error);
        }
    }
    /**
     * Set the current learning mode
     */
    async setLearningMode(mode) {
        this.currentLearningMode = mode;
        await this.loadWordsForMode(mode);
    }
    /**
     * Load words for the specified learning mode
     */
    async loadWordsForMode(mode) {
        // Check if dataset is already loaded
        if (!this.datasets.has(mode)) {
            await this.loadDataset(mode);
        }
        // Get vocabulary from dataset
        const dataset = this.datasets.get(mode);
        this.allWords = (dataset?.vocabulary || []);
        // Apply current filters
        this.applyFilters();
    }
    /**
     * Dynamically load a dataset by mode with retry logic
     * Implements exponential backoff: 1s, 2s, 4s
     */
    async loadDataset(mode) {
        try {
            const byMode = this.config?.get('data.paths.byMode') || {};
            if (byMode[mode]) {
                const cacheBuster = `?v=${Date.now()}`;
                const url = byMode[mode] + cacheBuster;
                console.log(`[PTEVocabularyManager] Loading dataset for mode: ${mode} from ${url}`);
                // Retry logic with exponential backoff for network failures
                const maxRetries = 3;
                const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
                let lastError = null;
                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                        const response = await fetch(url);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        const dataset = await response.json();
                        // Transform RS segments to vocabulary format if needed
                        if (mode === 'pte-rs-segments' && Array.isArray(dataset) && !dataset.vocabulary) {
                            const transformedDataset = {
                                vocabulary: dataset.map((item) => ({
                                    english: item.content?.sentence || item.sentence || '',
                                    category: item.metadata?.category || 'pte-rs-segments',
                                    difficulty: item.metadata?.difficulty || 'normal',
                                    wordType: null,
                                    ipa: {
                                        uk: null,
                                        us: null
                                    },
                                    pronunciation: {
                                        uk: null,
                                        us: null
                                    },
                                    id: item.id,
                                    type: item.type || 'rs'
                                }))
                            };
                            this.datasets.set(mode, transformedDataset);
                            console.log(`[PTEVocabularyManager] ✅ Loaded ${mode}: ${transformedDataset.vocabulary.length} segments (transformed)${attempt > 0 ? ` (retry ${attempt})` : ''}`);
                        }
                        else {
                            this.datasets.set(mode, dataset);
                            const vocabLength = dataset.vocabulary?.length || 0;
                            console.log(`[PTEVocabularyManager] ✅ Loaded ${mode}: ${vocabLength} words${attempt > 0 ? ` (retry ${attempt})` : ''}`);
                        }
                        return; // Success - exit function
                    }
                    catch (fetchError) {
                        lastError = fetchError;
                        // Don't retry if it's the last attempt
                        if (attempt < maxRetries) {
                            const delay = retryDelays[attempt];
                            console.warn(`[PTEVocabularyManager] ⚠️ Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                // All retries failed
                throw new Error(`Failed to fetch ${mode} dataset after ${maxRetries + 1} attempts: ${lastError?.message}`);
            }
            else {
                const errorMsg = `No path configured for mode: ${mode}`;
                console.warn(`[PTEVocabularyManager] ⚠️ ${errorMsg}`);
                // Show warning via UI store (replaces EventBus emission)
                useAppStore.getState().ui.showNotification(errorMsg, 'error');
                this.datasets.set(mode, { vocabulary: [] });
            }
        }
        catch (error) {
            const errorMsg = `Error loading ${mode} dataset: ${error.message}`;
            console.error(`[PTEVocabularyManager] ❌ ${errorMsg}`, error);
            // Show error via UI store (replaces EventBus emission)
            useAppStore.getState().ui.showNotification(errorMsg, 'error');
            // Set empty fallback but make it obvious something failed
            this.datasets.set(mode, {
                vocabulary: [],
                _loadError: errorMsg,
                _timestamp: new Date().toISOString()
            });
            // Don't throw - allow app to continue with empty dataset
            // User will be notified via UI store
        }
    }
    /**
     * Get next learning mode for auto-loop (circular)
     * FIB → Beginner → Intermediate → Advanced → RA → RS → FIB (loop)
     */
    getNextLearningMode() {
        const learningModeSequence = [
            'pte-fib-listening',
            'pte-beginner',
            'pte-intermediate',
            'pte-advanced',
            'pte-ra',
            'pte-rs-vocab'
        ];
        const currentIndex = learningModeSequence.indexOf(this.currentLearningMode);
        const nextIndex = (currentIndex + 1) % learningModeSequence.length;
        return learningModeSequence[nextIndex];
    }
    /**
     * Apply current category and difficulty filters
     * Updates both internal state and Zustand store
     */
    applyFilters() {
        let filteredWords = [...this.allWords];
        // Filter by category
        if (this.currentCategory !== 'all-categories') {
            filteredWords = filteredWords.filter(word => word.category === this.currentCategory);
        }
        // Filter by difficulty
        const defaultDifficulty = this.config?.get('data.defaults.difficulty') || this.config?.get('fallbacks.difficulty') || 'all';
        if (this.currentDifficulty !== defaultDifficulty) {
            filteredWords = filteredWords.filter(word => word.difficulty === this.currentDifficulty);
        }
        this.currentWords = filteredWords;
        // Update Zustand store (replaces EventBus vocabulary:updated emission)
        useAppStore.getState().vocabulary.setDataset(this.allWords, this.currentLearningMode);
        if (this.currentDifficulty !== defaultDifficulty) {
            useAppStore.getState().vocabulary.filterByDifficulty(this.currentDifficulty);
        }
    }
    /**
     * Set current category filter
     */
    setCategory(category) {
        this.currentCategory = category;
        this.applyFilters();
    }
    /**
     * Set current difficulty filter
     */
    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.applyFilters();
    }
    /**
     * Get current words (filtered)
     */
    getCurrentWords() {
        return this.currentWords;
    }
    /**
     * Get current word by index
     */
    getCurrentWord(index) {
        return this.currentWords[index] ?? null;
    }
    /**
     * Get all words (unfiltered)
     */
    getAllWords() {
        return this.allWords;
    }
    /**
     * Get total number of words (filtered)
     */
    getTotalWords() {
        return this.currentWords.length;
    }
    /**
     * Get word by index
     */
    getWord(index) {
        if (index >= 0 && index < this.currentWords.length) {
            return this.currentWords[index] ?? null;
        }
        return null;
    }
    /**
     * Get total word count (alias for getTotalWords)
     */
    getTotalWordCount() {
        return this.currentWords.length;
    }
    /**
     * Get current learning mode
     */
    getCurrentLearningMode() {
        return this.currentLearningMode;
    }
    /**
     * Get current category
     */
    getCurrentCategory() {
        return this.currentCategory;
    }
    /**
     * Get current difficulty
     */
    getCurrentDifficulty() {
        return this.currentDifficulty;
    }
    /**
     * Get available categories from current words
     */
    getAvailableCategories() {
        const categories = new Set();
        this.allWords.forEach(word => {
            if (word.category) {
                categories.add(word.category);
            }
        });
        return Array.from(categories);
    }
    /**
     * Get available difficulties from current words
     */
    getAvailableDifficulties() {
        const difficulties = new Set();
        this.allWords.forEach(word => {
            if (word.difficulty) {
                difficulties.add(word.difficulty);
            }
        });
        return Array.from(difficulties);
    }
    /**
     * Search words by text query
     */
    searchWords(query) {
        if (!query || query.trim() === '') {
            return this.currentWords;
        }
        const searchTerm = query.toLowerCase();
        return this.currentWords.filter(word => word.english?.toLowerCase().includes(searchTerm) ||
            word.word?.toLowerCase().includes(searchTerm));
    }
    /**
     * Get random word from current filtered words
     */
    getRandomWord() {
        if (this.currentWords.length === 0)
            return null;
        const randomIndex = Math.floor(Math.random() * this.currentWords.length);
        return this.currentWords[randomIndex] ?? null;
    }
    /**
     * Get vocabulary statistics
     */
    getStats() {
        const totalWords = this.allWords.length;
        const filteredWords = this.currentWords.length;
        const categories = this.getAvailableCategories().length;
        const difficulties = this.getAvailableDifficulties().length;
        return {
            totalWords,
            filteredWords,
            categories,
            difficulties,
            currentMode: this.currentLearningMode,
            currentCategory: this.currentCategory,
            currentDifficulty: this.currentDifficulty
        };
    }
}
// Export singleton instance
export const pteVocabularyManager = new PTEVocabularyManager();
// Default export
export default pteVocabularyManager;
// Expose as global reference for PTE app (browser compatibility)
if (typeof window !== 'undefined') {
    window.PTEVocabularyManager = PTEVocabularyManager;
    window.pteVocabularyManager = pteVocabularyManager;
}
//# sourceMappingURL=PTEVocabularyManager.js.map