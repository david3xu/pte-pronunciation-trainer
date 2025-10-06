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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🎧 Initializing PTE Vocabulary Manager...');

    try {
      await this.loadPTEData();
      this.isInitialized = true;
      console.log('✅ PTE Vocabulary Manager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing PTE Vocabulary Manager:', error);
    }
  }

  // Load PTE data from JSON files
  async loadPTEData() {
    console.log('📚 Loading PTE data...');

    try {
      // Load configuration from centralized config
      const config = window.appConfig || new AppConfig();
      const datasetPath = config.get('data.paths.dataset');

      // Load PTE FIB listening dataset with cache-busting
      const cacheBuster = `?v=${Date.now()}`;
      const pteFibResponse = await fetch(datasetPath + cacheBuster);
      this.pteFibListeningDataset = await pteFibResponse.json();
      console.log(`✅ Loaded ${this.pteFibListeningDataset.vocabulary.length} PTE FIB listening terms`);

      // Set initial learning mode and load words
      this.setLearningMode('pte-fib-listening');

    } catch (error) {
      console.error('❌ Error loading PTE data:', error);
      throw error;
    }
  }

  /**
   * Set the current learning mode
   */
  setLearningMode(mode) {
    console.log(`🎯 Setting learning mode to: ${mode}`);
    this.currentLearningMode = mode;
    this.loadWordsForMode(mode);
  }

  /**
   * Load words for the specified learning mode
   */
  loadWordsForMode(mode) {
    // Load the appropriate dataset
    switch (mode) {
      case 'pte-fib-listening':
        this.allWords = this.pteFibListeningDataset.vocabulary;
        break;
      default:
        console.warn(`Unknown learning mode: ${mode}`);
        this.allWords = [];
    }

    // Apply current filters
    this.applyFilters();
    console.log(`📝 Loaded ${this.allWords.length} words for mode: ${mode}`);
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
    console.log(`🔍 Applied filters: ${filteredWords.length} words remaining`);
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
window.pteVocabularyManager = new PTEVocabularyManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PTEVocabularyManager;
}
