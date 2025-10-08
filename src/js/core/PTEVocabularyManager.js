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
      // Load initial dataset (FIB Listening)
      await this.loadDataset('pte-fib-listening');
      await this.setLearningMode('pte-fib-listening');

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
   * Dynamically load a dataset by mode
   */
  async loadDataset(mode) {
    try {
      const config = window.appConfig || new AppConfig();
      const byMode = config.get('data.paths.byMode') || {};
      
      if (byMode[mode]) {
        const cacheBuster = `?v=${Date.now()}`;
        const url = byMode[mode] + cacheBuster;
        console.log(`[PTEVocabularyManager] Loading dataset for mode: ${mode} from ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${mode} dataset: ${response.status} ${response.statusText}`);
        }
        
        const dataset = await response.json();
        this.datasets.set(mode, dataset);
        console.log(`[PTEVocabularyManager] ✅ Loaded ${mode}: ${dataset.vocabulary?.length || 0} words`);
      } else {
        console.warn(`[PTEVocabularyManager] ⚠️ No path configured for mode: ${mode}`);
        this.datasets.set(mode, { vocabulary: [] });
      }
    } catch (error) {
      console.error(`[PTEVocabularyManager] ❌ Error loading ${mode} dataset:`, error);
      this.datasets.set(mode, { vocabulary: [] });
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
