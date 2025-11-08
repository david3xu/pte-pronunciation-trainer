/**
 * PTEVocabularyManager - Type-Safe Vocabulary Management
 *
 * Manages vocabulary loading, filtering, and state for PTE datasets.
 * Handles 13 vocabulary books with retry logic and event-driven updates.
 *
 * TypeScript version of src/js/core/PTEVocabularyManager.js
 */

import type {
  VocabularyTerm,
  VocabularyDataset,
  VocabularyCategory,
  Difficulty
} from '../../types';

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
 * Settings change event data
 */
interface SettingChangeEvent {
  key: string;
  value: any;
  timestamp?: number;
}

/**
 * Vocabulary load error event
 */
interface VocabularyLoadError {
  mode: string;
  error: string;
  originalError?: Error;
  severity: 'warning' | 'error';
}

/**
 * Type-safe PTE Vocabulary Manager
 * Handles all vocabulary dataset operations with retry logic and filtering
 */
export class PTEVocabularyManager {
  private currentCategory: string = 'all-categories';
  private currentDifficulty: string = 'all';
  private currentLearningMode: VocabularyCategory = 'pte-fib-listening';
  private currentWords: VocabularyTerm[] = [];
  private allWords: VocabularyTerm[] = [];
  private datasets: Map<string, VocabularyDataset | any> = new Map();
  private config: any = null;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize config reference
    this.config = (typeof window !== 'undefined' && (window as any).appConfig) || null;

    // Listen to settings changes
    this._attachEventListeners();

    // Initialize when DOM is ready
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
      } else {
        this.initialize();
      }
    }
  }

  /**
   * Attach event listeners for settings changes
   * @private
   */
  private _attachEventListeners(): void {
    if (typeof window === 'undefined' || !(window as any).eventBus) return;

    const settingsChangedEvent = this.config?.get('events.settings.changed') || 'settings:changed';
    (window as any).eventBus.on(settingsChangedEvent, this._handleSettingChange.bind(this));
  }

  /**
   * Handle setting changes from SettingsModule
   * @private
   */
  private async _handleSettingChange({ key, value }: SettingChangeEvent): Promise<void> {
    if (key === 'difficulty') {
      this.setDifficulty(value);
      console.log(`[PTEVocabularyManager] Difficulty changed to ${value}`);

      // Emit event to update UI
      const vocabUpdatedEvent = this.config?.get('events.vocabulary.updated') || 'vocabulary:updated';
      if (typeof window !== 'undefined' && (window as any).eventBus) {
        (window as any).eventBus.emit(vocabUpdatedEvent, {
          totalWords: this.getTotalWords(),
          difficulty: value
        });
      }
    } else if (key === 'learningMode') {
      await this.setLearningMode(value as VocabularyCategory);
      console.log(`[PTEVocabularyManager] Learning mode changed to ${value}`);

      // Emit event to update UI
      const vocabUpdatedEvent = this.config?.get('events.vocabulary.updated') || 'vocabulary:updated';
      if (typeof window !== 'undefined' && (window as any).eventBus) {
        (window as any).eventBus.emit(vocabUpdatedEvent, {
          totalWords: this.getTotalWords(),
          learningMode: value
        });
      }
    }
  }

  /**
   * Initialize the vocabulary manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize with default learning mode from Config.js
      const defaultLearningMode = (this.config?.get('data.defaults.learningMode') ||
        this.config?.get('fallbacks.learningMode') ||
        'pte-fib-listening') as VocabularyCategory;

      await this.loadDataset(defaultLearningMode);
      await this.setLearningMode(defaultLearningMode);

      this.isInitialized = true;
      console.log('[PTEVocabularyManager] ✅ Initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing PTE Vocabulary Manager:', error);
    }
  }

  /**
   * Set the current learning mode
   */
  async setLearningMode(mode: VocabularyCategory): Promise<void> {
    this.currentLearningMode = mode;
    await this.loadWordsForMode(mode);
  }

  /**
   * Load words for the specified learning mode
   */
  async loadWordsForMode(mode: VocabularyCategory): Promise<void> {
    // Check if dataset is already loaded
    if (!this.datasets.has(mode)) {
      await this.loadDataset(mode);
    }

    // Get vocabulary from dataset
    const dataset = this.datasets.get(mode);
    this.allWords = (dataset?.vocabulary || []) as VocabularyTerm[];

    // Apply current filters
    this.applyFilters();
  }

  /**
   * Dynamically load a dataset by mode with retry logic
   * Implements exponential backoff: 1s, 2s, 4s
   */
  async loadDataset(mode: VocabularyCategory): Promise<void> {
    try {
      const byMode = this.config?.get('data.paths.byMode') || {};

      if (byMode[mode]) {
        const cacheBuster = `?v=${Date.now()}`;
        const url = byMode[mode] + cacheBuster;
        console.log(`[PTEVocabularyManager] Loading dataset for mode: ${mode} from ${url}`);

        // Retry logic with exponential backoff for network failures
        const maxRetries = 3;
        const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const dataset = await response.json();

            // Transform RS segments to vocabulary format if needed
            if (mode === 'pte-rs-segments' as any && Array.isArray(dataset) && !(dataset as any).vocabulary) {
              const transformedDataset = {
                vocabulary: dataset.map((item: any) => ({
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
            } else {
              this.datasets.set(mode, dataset);
              const vocabLength = (dataset as any).vocabulary?.length || 0;
              console.log(`[PTEVocabularyManager] ✅ Loaded ${mode}: ${vocabLength} words${attempt > 0 ? ` (retry ${attempt})` : ''}`);
            }
            return; // Success - exit function
          } catch (fetchError) {
            lastError = fetchError as Error;

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

      } else {
        const errorMsg = `No path configured for mode: ${mode}`;
        console.warn(`[PTEVocabularyManager] ⚠️ ${errorMsg}`);

        // Emit error event for UI notification
        if (typeof window !== 'undefined' && (window as any).eventBus) {
          const loadErrorEvent = this.config?.get('events.vocabulary.loadError') || 'vocabulary:load-error';
          (window as any).eventBus.emit(loadErrorEvent, {
            mode,
            error: errorMsg,
            severity: 'warning'
          } as VocabularyLoadError);
        }

        this.datasets.set(mode, { vocabulary: [] });
      }
    } catch (error) {
      const errorMsg = `Error loading ${mode} dataset: ${(error as Error).message}`;
      console.error(`[PTEVocabularyManager] ❌ ${errorMsg}`, error);

      // Emit error event for centralized error handling
      if (typeof window !== 'undefined' && (window as any).eventBus) {
        const loadErrorEvent = this.config?.get('events.vocabulary.loadError') || 'vocabulary:load-error';
        (window as any).eventBus.emit(loadErrorEvent, {
          mode,
          error: errorMsg,
          originalError: error as Error,
          severity: 'error'
        } as VocabularyLoadError);
      }

      // Set empty fallback but make it obvious something failed
      this.datasets.set(mode, {
        vocabulary: [],
        _loadError: errorMsg,
        _timestamp: new Date().toISOString()
      });

      // Don't throw - allow app to continue with empty dataset
      // User will be notified via event system
    }
  }

  /**
   * Get next learning mode for auto-loop (circular)
   * FIB → Beginner → Intermediate → Advanced → RA → RS → FIB (loop)
   */
  getNextLearningMode(): VocabularyCategory {
    const learningModeSequence: VocabularyCategory[] = [
      'pte-fib-listening',
      'pte-beginner',
      'pte-intermediate',
      'pte-advanced',
      'pte-ra',
      'pte-rs-vocab'
    ];

    const currentIndex = learningModeSequence.indexOf(this.currentLearningMode);
    const nextIndex = (currentIndex + 1) % learningModeSequence.length;
    return learningModeSequence[nextIndex] as VocabularyCategory;
  }

  /**
   * Apply current category and difficulty filters
   */
  applyFilters(): void {
    let filteredWords = [...this.allWords];

    // Filter by category
    if (this.currentCategory !== 'all-categories') {
      filteredWords = filteredWords.filter(word =>
        word.category === this.currentCategory
      );
    }

    // Filter by difficulty
    const defaultDifficulty = this.config?.get('data.defaults.difficulty') || this.config?.get('fallbacks.difficulty') || 'all';
    if (this.currentDifficulty !== defaultDifficulty) {
      filteredWords = filteredWords.filter(word =>
        word.difficulty === this.currentDifficulty
      );
    }

    this.currentWords = filteredWords;
  }

  /**
   * Set current category filter
   */
  setCategory(category: string): void {
    this.currentCategory = category;
    this.applyFilters();
  }

  /**
   * Set current difficulty filter
   */
  setDifficulty(difficulty: string): void {
    this.currentDifficulty = difficulty;
    this.applyFilters();
  }

  /**
   * Get current words (filtered)
   */
  getCurrentWords(): VocabularyTerm[] {
    return this.currentWords;
  }

  /**
   * Get current word by index
   */
  getCurrentWord(index: number): VocabularyTerm | null {
    return this.currentWords[index] ?? null;
  }

  /**
   * Get all words (unfiltered)
   */
  getAllWords(): VocabularyTerm[] {
    return this.allWords;
  }

  /**
   * Get total number of words (filtered)
   */
  getTotalWords(): number {
    return this.currentWords.length;
  }

  /**
   * Get word by index
   */
  getWord(index: number): VocabularyTerm | null {
    if (index >= 0 && index < this.currentWords.length) {
      return this.currentWords[index] ?? null;
    }
    return null;
  }

  /**
   * Get total word count (alias for getTotalWords)
   */
  getTotalWordCount(): number {
    return this.currentWords.length;
  }

  /**
   * Get current learning mode
   */
  getCurrentLearningMode(): VocabularyCategory {
    return this.currentLearningMode;
  }

  /**
   * Get current category
   */
  getCurrentCategory(): string {
    return this.currentCategory;
  }

  /**
   * Get current difficulty
   */
  getCurrentDifficulty(): string {
    return this.currentDifficulty;
  }

  /**
   * Get available categories from current words
   */
  getAvailableCategories(): string[] {
    const categories = new Set<string>();
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
  getAvailableDifficulties(): Difficulty[] {
    const difficulties = new Set<Difficulty>();
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
  searchWords(query: string): VocabularyTerm[] {
    if (!query || query.trim() === '') {
      return this.currentWords;
    }

    const searchTerm = query.toLowerCase();
    return this.currentWords.filter(word =>
      (word as any).english?.toLowerCase().includes(searchTerm) ||
      word.word?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get random word from current filtered words
   */
  getRandomWord(): VocabularyTerm | null {
    if (this.currentWords.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.currentWords.length);
    return this.currentWords[randomIndex] ?? null;
  }

  /**
   * Get vocabulary statistics
   */
  getStats(): VocabularyStats {
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

/**
 * Global type declarations
 */
declare global {
  interface Window {
    PTEVocabularyManager: typeof PTEVocabularyManager;
    pteVocabularyManager?: PTEVocabularyManager;
  }
}

// Expose as global reference for PTE app (browser compatibility)
if (typeof window !== 'undefined') {
  window.PTEVocabularyManager = PTEVocabularyManager;
  window.pteVocabularyManager = pteVocabularyManager;
}
