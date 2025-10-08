// PTEVocabularyManager - Specialized version for PTE vocabulary
class PTEVocabularyManager {
  constructor() {
    this.currentCategory = 'all-categories';
    this.currentDifficulty = 'all';
    this.currentLearningMode = 'pte-fib-listening';
    this.currentWords = [];
    this.allWords = []; // Store unfiltered words
    this.isInitialized = false;

    // Store PTE datasets
    this.pteFibListeningDataset = null;
    this.pteBeginnerDataset = null;

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
    window.eventBus.on('setting:changed', this._handleSettingChange.bind(this));
  }

  /**
   * Handle setting changes from SettingsModule
   * @private
   */
  async _handleSettingChange({key, value}) {
    if (key === 'difficulty') {
      this.setDifficulty(value);
      console.log(`[PTEVocabularyManager] Difficulty changed to ${value}`);
      // Emit event to update UI
      window.eventBus.emit('vocabulary:updated', {
        totalWords: this.getTotalWords(),
        difficulty: value
      });
    } else if (key === 'learningMode') {
      await this.setLearningMode(value);
      console.log(`[PTEVocabularyManager] Learning mode changed to ${value}`);
      // Emit event to update UI
      window.eventBus.emit('vocabulary:updated', {
        totalWords: this.getTotalWords(),
        learningMode: value
      });
    }
  }

  async initialize() {
    if (this.isInitialized) return;


    try {
      await this.loadPTEData();

      // Also preload the intermediate dataset
      const config = window.appConfig || new AppConfig();
      const byMode = config.get('data.paths.byMode') || {};
      if (byMode['pte-intermediate']) {
        try {
          await this.loadIntermediateDataset();
        } catch (err) {
          console.warn('⚠️ Could not preload intermediate dataset:', err);
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing PTE Vocabulary Manager:', error);
    }
  }

  // Load PTE data from JSON files
  async loadPTEData() {

    try {
      // Load configuration from centralized config
      const config = window.appConfig || new AppConfig();
      const datasetPath = config.get('data.paths.dataset');
      const byMode = config.get('data.paths.byMode') || {};

      // Load PTE FIB listening dataset with cache-busting
      const cacheBuster = `?v=${Date.now()}`;
      const pteFibResponse = await fetch((byMode['pte-fib-listening'] || datasetPath) + cacheBuster);
      this.pteFibListeningDataset = await pteFibResponse.json();

      // Load PTE Beginner dataset if configured
      if (byMode['pte-beginner']) {
        const beginnerResponse = await fetch(byMode['pte-beginner'] + cacheBuster);
        this.pteBeginnerDataset = await beginnerResponse.json();
      }

      // Set initial learning mode and load words
      this.setLearningMode('pte-fib-listening');

    } catch (error) {
      console.error('❌ Error loading PTE data:', error);
      throw error;
    }
  }

  /**
   * Load the PTE Intermediate dataset
   */
  async loadIntermediateDataset() {
    try {
      const config = window.appConfig || new AppConfig();
      const byMode = config.get('data.paths.byMode') || {};

      if (byMode['pte-intermediate']) {
        const cacheBuster = `?v=${Date.now()}`;
        const url = byMode['pte-intermediate'] + cacheBuster;
        const intermediateResponse = await fetch(url);
        if (!intermediateResponse.ok) {
          throw new Error(`Failed to fetch intermediate dataset: ${intermediateResponse.status} ${intermediateResponse.statusText}`);
        }
        this.pteIntermediateDataset = await intermediateResponse.json();
      } else {
        console.error('❌ PTE Intermediate dataset path not configured');
        this.pteIntermediateDataset = { vocabulary: [] };
      }
    } catch (error) {
      console.error('❌ Error loading PTE Intermediate data:', error);
      this.pteIntermediateDataset = { vocabulary: [] };
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
    // Load the appropriate dataset
    switch (mode) {
      case 'pte-fib-listening':
        this.allWords = this.pteFibListeningDataset.vocabulary;
        break;
      case 'pte-beginner':
        this.allWords = (this.pteBeginnerDataset && this.pteBeginnerDataset.vocabulary) || [];
        break;
      case 'pte-intermediate':
        if (!this.pteIntermediateDataset) {
          // Load the intermediate dataset if it hasn't been loaded yet
          await this.loadIntermediateDataset();
          // After loading, the dataset should be available
          this.allWords = (this.pteIntermediateDataset && this.pteIntermediateDataset.vocabulary) || [];
        } else {
          this.allWords = (this.pteIntermediateDataset && this.pteIntermediateDataset.vocabulary) || [];
        }
        break;
      default:
        console.warn(`Unknown learning mode: ${mode}`);
        this.allWords = [];
    }

    // Apply current filters
    this.applyFilters();
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
    if (this.currentDifficulty !== 'all') {
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
