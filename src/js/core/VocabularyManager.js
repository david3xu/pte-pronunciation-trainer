// VocabularyManager - Handles vocabulary loading, filtering, and navigation
class VocabularyManager {
    constructor() {
        this.currentCategory = 'social-welfare';
        this.currentDifficulty = 'all';
        this.currentWords = [];
        this.allWords = []; // Store unfiltered words
        this.categoryCounts = {}; // Store counts per category per difficulty
        
        // Category labels mapping
        this.categoryLabels = {
            'all-categories': '🌟 All Categories',
            'social-welfare': 'Social Welfare',
            'education': 'Education', 
            'legal-government': 'Legal & Government',
            'business-finance': 'Business & Finance',
            'medical-healthcare': 'Medical & Healthcare',
            'travel-immigration': 'Travel & Immigration'
        };
    }

    calculateCategoryCounts() {
        if (typeof vocabularyData === 'undefined') return;
        
        this.categoryCounts = {};
        
        // Calculate individual category counts
        Object.keys(vocabularyData).forEach(category => {
            this.categoryCounts[category] = {
                all: vocabularyData[category].length,
                easy: vocabularyData[category].filter(word => word.difficulty === 'easy').length,
                normal: vocabularyData[category].filter(word => word.difficulty === 'normal').length,
                hard: vocabularyData[category].filter(word => word.difficulty === 'hard').length
            };
        });
        
        // Calculate total counts across all categories
        this.categoryCounts['all-categories'] = {
            all: 0,
            easy: 0,
            normal: 0,
            hard: 0
        };
        
        Object.keys(vocabularyData).forEach(category => {
            this.categoryCounts['all-categories'].all += this.categoryCounts[category].all;
            this.categoryCounts['all-categories'].easy += this.categoryCounts[category].easy;
            this.categoryCounts['all-categories'].normal += this.categoryCounts[category].normal;
            this.categoryCounts['all-categories'].hard += this.categoryCounts[category].hard;
        });
        
        console.log('Category counts calculated:', this.categoryCounts);
    }

    loadCategory(category) {
        if (!vocabularyData || !vocabularyData[category]) {
            console.error(`Category '${category}' not found`);
            return;
        }

        this.currentCategory = category;
        
        // Load all words for this category
        if (category === 'all-categories') {
            // Combine all categories
            this.allWords = [];
            Object.keys(vocabularyData).forEach(cat => {
                this.allWords.push(...vocabularyData[cat]);
            });
            // Shuffle for variety when combining all categories
            if (this.allWords.length > 0) {
                this.shuffleArray(this.allWords);
            }
        } else {
            // Load specific category
            this.allWords = [...vocabularyData[category]];
        }

        console.log(`Loaded category: ${category} (${this.allWords.length} words)`);
        
        // Apply current difficulty filter
        this.filterByDifficulty();
        
        // Emit event for other modules
        window.eventBus.emit('vocabulary:categoryLoaded', {
            category: this.currentCategory,
            totalWords: this.allWords.length,
            filteredWords: this.currentWords.length
        });
    }

    filterByDifficulty() {
        if (this.currentDifficulty === 'all') {
            this.currentWords = [...this.allWords];
        } else {
            this.currentWords = this.allWords.filter(word => word.difficulty === this.currentDifficulty);
        }
        
        console.log(`Filtered by difficulty '${this.currentDifficulty}': ${this.currentWords.length} words`);
        
        // Emit event for other modules
        window.eventBus.emit('vocabulary:difficultyFiltered', {
            difficulty: this.currentDifficulty,
            filteredWords: this.currentWords.length
        });
    }

    getNextCategory() {
        // Skip if already on "all-categories" - it contains all words mixed already
        if (this.currentCategory === 'all-categories') {
            return null;
        }

        // Category progression order - INFINITE CIRCLE 🔄
        const categoryOrder = [
            'social-welfare',
            'education', 
            'legal-government',
            'business-finance',
            'medical-healthcare',
            'travel-immigration'
        ];

        const currentIndex = categoryOrder.indexOf(this.currentCategory);
        if (currentIndex >= 0) {
            // If at last category, loop back to first category (INFINITE CIRCLE)
            if (currentIndex === categoryOrder.length - 1) {
                return categoryOrder[0]; // Travel & Immigration → Social Welfare
            } else {
                return categoryOrder[currentIndex + 1]; // Normal progression
            }
        }
        
        return null; // Unknown category
    }

    getPreviousCategory() {
        // Skip if already on "all-categories" - it contains all words mixed already
        if (this.currentCategory === 'all-categories') {
            return null;
        }

        // Category progression order - INFINITE CIRCLE 🔄 (reverse)
        const categoryOrder = [
            'social-welfare',
            'education', 
            'legal-government',
            'business-finance',
            'medical-healthcare',
            'travel-immigration'
        ];

        const currentIndex = categoryOrder.indexOf(this.currentCategory);
        if (currentIndex >= 0) {
            // If at first category, loop back to last category (INFINITE CIRCLE)
            if (currentIndex === 0) {
                return categoryOrder[categoryOrder.length - 1]; // Social Welfare → Travel & Immigration
            } else {
                return categoryOrder[currentIndex - 1]; // Normal reverse progression
            }
        }
        
        return null; // Unknown category
    }

    getCurrentWord(index) {
        if (index >= 0 && index < this.currentWords.length) {
            return this.currentWords[index];
        }
        return null;
    }

    getTotalWords() {
        return this.currentWords.length;
    }

    getCategoryLabel(category) {
        return this.categoryLabels[category] || category;
    }

    getCategoryCounts() {
        return this.categoryCounts;
    }

    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.filterByDifficulty();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Global vocabulary manager instance
window.vocabularyManager = new VocabularyManager();