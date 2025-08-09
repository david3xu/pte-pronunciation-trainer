/**
 * Vocabulary Data Management for CCL Pronunciation Trainer
 * Handles loading, filtering, and accessing vocabulary data
 */

class VocabularyManager {
    constructor() {
        this.data = {};
        this.currentCategory = 'social-welfare';
        this.currentIndex = 0;
        this.isLoaded = false;
        
        this.init();
    }

    async init() {
        await this.loadVocabularyData();
        console.log('Vocabulary manager initialized');
    }

    /**
     * Load vocabulary data from global vocabularyData
     */
    async loadVocabularyData() {
        try {
            // Wait for vocabularyData to be available
            let attempts = 0;
            while (typeof vocabularyData === 'undefined' && attempts < 50) {
                await this.sleep(100);
                attempts++;
            }

            if (typeof vocabularyData === 'undefined') {
                throw new Error('Vocabulary data not loaded');
            }

            this.data = vocabularyData;
            this.isLoaded = true;
            
            console.log(`Loaded vocabulary data:`, this.getStats());
            
        } catch (error) {
            console.error('Failed to load vocabulary data:', error);
            throw error;
        }
    }

    /**
     * Get vocabulary statistics
     * @returns {Object} Statistics about loaded vocabulary
     */
    getStats() {
        const stats = {
            totalCategories: Object.keys(this.data).length,
            totalTerms: 0,
            categories: {}
        };

        for (const [category, terms] of Object.entries(this.data)) {
            stats.categories[category] = terms.length;
            stats.totalTerms += terms.length;
        }

        return stats;
    }

    /**
     * Get terms for a specific category
     * @param {string} category - Category name
     * @returns {Array} Array of vocabulary terms
     */
    getTermsByCategory(category) {
        if (!this.isLoaded) {
            console.warn('Vocabulary data not loaded yet');
            return [];
        }

        return this.data[category] || [];
    }

    /**
     * Get all available categories
     * @returns {Array} Array of category names
     */
    getCategories() {
        return Object.keys(this.data);
    }

    /**
     * Search terms across all categories
     * @param {string} query - Search query
     * @returns {Array} Matching terms with category info
     */
    searchTerms(query) {
        if (!this.isLoaded || !query) return [];

        const results = [];
        const searchLower = query.toLowerCase();

        for (const [category, terms] of Object.entries(this.data)) {
            terms.forEach((term, index) => {
                if (term.english.toLowerCase().includes(searchLower) ||
                    term.chinese.includes(query)) {
                    results.push({
                        ...term,
                        category,
                        index,
                        id: `${category}-${index}`
                    });
                }
            });
        }

        return results;
    }

    /**
     * Get a specific term by category and index
     * @param {string} category - Category name
     * @param {number} index - Term index
     * @returns {Object|null} Term object or null
     */
    getTerm(category, index) {
        const terms = this.getTermsByCategory(category);
        return terms[index] || null;
    }

    /**
     * Get current term based on current category and index
     * @returns {Object|null} Current term or null
     */
    getCurrentTerm() {
        return this.getTerm(this.currentCategory, this.currentIndex);
    }

    /**
     * Set current category
     * @param {string} category - Category name
     */
    setCurrentCategory(category) {
        if (this.data[category]) {
            this.currentCategory = category;
            this.currentIndex = 0;
            return true;
        }
        return false;
    }

    /**
     * Move to next term in current category
     * @param {boolean} loop - Whether to loop back to start
     * @returns {boolean} True if moved successfully
     */
    nextTerm(loop = true) {
        const terms = this.getTermsByCategory(this.currentCategory);
        if (terms.length === 0) return false;

        this.currentIndex++;
        if (this.currentIndex >= terms.length) {
            if (loop) {
                this.currentIndex = 0;
            } else {
                this.currentIndex = terms.length - 1;
                return false;
            }
        }
        return true;
    }

    /**
     * Move to previous term in current category
     * @param {boolean} loop - Whether to loop to end
     * @returns {boolean} True if moved successfully
     */
    previousTerm(loop = true) {
        const terms = this.getTermsByCategory(this.currentCategory);
        if (terms.length === 0) return false;

        this.currentIndex--;
        if (this.currentIndex < 0) {
            if (loop) {
                this.currentIndex = terms.length - 1;
            } else {
                this.currentIndex = 0;
                return false;
            }
        }
        return true;
    }

    /**
     * Set current term index
     * @param {number} index - Term index
     * @returns {boolean} True if valid index
     */
    setCurrentIndex(index) {
        const terms = this.getTermsByCategory(this.currentCategory);
        if (index >= 0 && index < terms.length) {
            this.currentIndex = index;
            return true;
        }
        return false;
    }

    /**
     * Get progress information
     * @returns {Object} Progress data
     */
    getProgress() {
        const terms = this.getTermsByCategory(this.currentCategory);
        const total = terms.length;
        const current = this.currentIndex + 1;
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;

        return {
            current,
            total,
            percent,
            category: this.currentCategory
        };
    }

    /**
     * Shuffle terms in current category
     */
    shuffleCurrentCategory() {
        if (!this.data[this.currentCategory]) return;

        const terms = [...this.data[this.currentCategory]];
        for (let i = terms.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [terms[i], terms[j]] = [terms[j], terms[i]];
        }
        
        this.data[this.currentCategory] = terms;
        this.currentIndex = 0;
    }

    /**
     * Utility sleep function
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export as global for browser use
window.VocabularyManager = VocabularyManager;