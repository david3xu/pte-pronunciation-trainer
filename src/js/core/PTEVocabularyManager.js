// PTEVocabularyManager - Specialized version for PTE vocabulary
class PTEVocabularyManager {
  constructor() {
    // NOTE: "category" in PTE context is a FILTER FIELD on each word (e.g., word.category = 'pte-beginner')
    // It's NOT for navigation between sections (that was the CCL app's concept)
    // We filter words BY category, we don't navigate TO categories
    this.currentCategory = 'all-categories'; // Filter: show all categories or filter by specific one
    this.currentDifficulty = 'all'; // Filter: show all difficulties or filter by easy/normal/hard
    this.currentLearningMode = 'pte-fib-listening'; // Current vocabulary book (dataset)
    this.currentWords = []; // Filtered words
    this.allWords = []; // Store unfiltered words

    // Store all datasets in a map for dynamic loading
    this.datasets = new Map();

    // Initialize config reference
    this.config = window.appConfig || new AppConfig();

    this.isInitialized = false;

    // Listen to settings changes
    this._attachEventListeners();

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Attach event listeners for settings changes
   * @private
   */
  _attachEventListeners() {
    // Listen to standardized settings:changed event from Config.js
    const settingsChangedEvent = window.appConfig?.get('events.settings.changed') || 'settings:changed';
    window.eventBus.on(settingsChangedEvent, this._handleSettingChange.bind(this));
  }

  /**
   * Handle setting changes from SettingsModule
   * @private
   */
  async _handleSettingChange({ key, value }) {
    if (key === 'difficulty') {
      this.setDifficulty(value);
      console.log(`[PTEVocabularyManager] Difficulty changed to ${value}`);
      // Emit event to update UI
      const vocabUpdatedEvent = this.config.get('events.vocabulary.updated') || 'vocabulary:updated';
      window.eventBus.emit(vocabUpdatedEvent, {
        totalWords: this.getTotalWords(),
        difficulty: value
      });
    } else if (key === 'learningMode') {
      await this.setLearningMode(value);
      console.log(`[PTEVocabularyManager] Learning mode changed to ${value}`);
      // Emit event to update UI
      const vocabUpdatedEvent = this.config.get('events.vocabulary.updated') || 'vocabulary:updated';
      window.eventBus.emit(vocabUpdatedEvent, {
        totalWords: this.getTotalWords(),
        learningMode: value
      });
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize with default learning mode from Config.js
      const defaultLearningMode = this.config.get('data.defaults.learningMode') || this.config.get('fallbacks.learningMode');
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
    this.allWords = (dataset && dataset.vocabulary) || [];

    // Apply current filters
    this.applyFilters();
  }

  /**
   * Dynamically load a dataset by mode with retry logic
   */
  async loadDataset(mode) {
    try {
      const byMode = this.config.get('data.paths.byMode') || {};

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
                vocabulary: dataset.map(item => ({
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
              console.log(`[PTEVocabularyManager] ✅ Loaded ${mode}: ${dataset.vocabulary?.length || 0} words${attempt > 0 ? ` (retry ${attempt})` : ''}`);
            }
            return; // Success - exit function
          } catch (fetchError) {
            lastError = fetchError;

            // Don't retry if it's the last attempt
            if (attempt < maxRetries) {
              const delay = retryDelays[attempt];
              console.warn(`[PTEVocabularyManager] ⚠️ Attempt ${attempt + 1}/${maxRetries + 1} failed: ${fetchError.message}. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        // All retries failed
        throw new Error(`Failed to fetch ${mode} dataset after ${maxRetries + 1} attempts: ${lastError.message}`);

      } else {
        const errorMsg = `No path configured for mode: ${mode}`;
        console.warn(`[PTEVocabularyManager] ⚠️ ${errorMsg}`);

        // Emit error event for UI notification
        if (window.eventBus) {
          const loadErrorEvent = this.config.get('events.vocabulary.loadError') || 'vocabulary:load-error';
          window.eventBus.emit(loadErrorEvent, {
            mode,
            error: errorMsg,
            severity: 'warning'
          });
        }

        this.datasets.set(mode, { vocabulary: [] });
      }
    } catch (error) {
      const errorMsg = `Error loading ${mode} dataset: ${error.message}`;
      console.error(`[PTEVocabularyManager] ❌ ${errorMsg}`, error);

      // Emit error event for centralized error handling
      if (window.eventBus) {
        const loadErrorEvent = this.config.get('events.vocabulary.loadError') || 'vocabulary:load-error';
        window.eventBus.emit(loadErrorEvent, {
          mode,
          error: errorMsg,
          originalError: error,
          severity: 'error'
        });
      }

      // Set empty fallback but make it obvious something failed
      this.datasets.set(mode, {
        vocabulary: [],
        _loadError: errorMsg,
        _timestamp: new Date().toISOString()
      });

      // Don't throw - allow app to continue with empty dataset
      // But user will be notified via event system
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
      'pte-rs'
    ];

    const currentIndex = learningModeSequence.indexOf(this.currentLearningMode);
    const nextIndex = (currentIndex + 1) % learningModeSequence.length;
    return learningModeSequence[nextIndex];
  }

  /**
   * Apply current category and difficulty filters
   */
  applyFilters() {
    let filteredWords = [...this.allWords];

    // Filter by category
    if (this.currentCategory !== 'all-categories') {
      filteredWords = filteredWords.filter(word =>
        word.category === this.currentCategory
      );
    }

    // Filter by difficulty
    const defaultDifficulty = this.config.get('data.defaults.difficulty') || this.config.get('fallbacks.difficulty');
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
   * Get current words
   */
  getCurrentWords() {
    return this.currentWords;
  }

  /**
   * Get current word by index
   */
  getCurrentWord(index) {
    return this.currentWords[index] || null;
  }

  /**
   * Get all words (unfiltered)
   */
  getAllWords() {
    return this.allWords;
  }

  /**
   * Get total number of words
   */
  getTotalWords() {
    return this.currentWords.length;
  }

  /**
   * Get word by index
   */
  getWord(index) {
    if (index >= 0 && index < this.currentWords.length) {
      return this.currentWords[index];
    }
    return null;
  }

  /**
   * Get total word count
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
   * Get available categories
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
   * Get available difficulties
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
   * Search words by text
   */
  searchWords(query) {
    if (!query || query.trim() === '') {
      return this.currentWords;
    }

    const searchTerm = query.toLowerCase();
    return this.currentWords.filter(word =>
      word.english.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get random word
   */
  getRandomWord() {
    if (this.currentWords.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.currentWords.length);
    return this.currentWords[randomIndex];
  }

  /**
   * Get statistics
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

// Create global instance
const pteVocabularyManager = new PTEVocabularyManager();

// Expose as global reference for PTE app
window.pteVocabularyManager = pteVocabularyManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PTEVocabularyManager;
}
