// VocabularyManager - Handles vocabulary loading, filtering, and navigation
class VocabularyManager {
    constructor() {
        this.currentCategory = 'social-welfare';
        this.currentDifficulty = 'all';
        this.currentVocabularySource = 'specialized'; // 'specialized' or 'conversation'
        this.currentWords = [];
        this.allWords = []; // Store unfiltered words
        this.categoryCounts = {}; // Store counts per category per difficulty
        
        // Category labels mapping for specialized vocabulary
        this.specializedCategoryLabels = {
            'all-categories': '🌟 All Categories',
            'social-welfare': 'Social Welfare',
            'education': 'Education', 
            'legal-government': 'Legal & Government',
            'business-finance': 'Business & Finance',
            'medical-healthcare': 'Medical & Healthcare',
            'travel-immigration': 'Travel & Immigration'
        };
        
        
        this.categoryLabels = this.specializedCategoryLabels; // Default to specialized
    }

    calculateCategoryCounts() {
        const currentData = this.getCurrentVocabularyData();
        if (!currentData) return;
        
        this.categoryCounts = {};
        
        if (this.currentVocabularySource === 'sequential') {
            // Handle sequential vocabulary structure (flat array by domain)
            if (currentData.vocabulary && Array.isArray(currentData.vocabulary)) {
                // Group by domain and count
                const domainGroups = {};
                currentData.vocabulary.forEach(item => {
                    const domain = item.domain;
                    if (!domainGroups[domain]) {
                        domainGroups[domain] = [];
                    }
                    domainGroups[domain].push(item);
                });
                
                // Calculate counts for each domain
                Object.keys(domainGroups).forEach(domain => {
                    const items = domainGroups[domain];
                    this.categoryCounts[domain] = {
                        all: items.length,
                        easy: items.filter(item => item.difficulty === 'easy').length,
                        normal: items.filter(item => item.difficulty === 'normal').length,
                        hard: items.filter(item => item.difficulty === 'hard').length
                    };
                });
            }
        } else {
            // Handle specialized vocabulary structure
            Object.keys(currentData).forEach(category => {
                // Skip metadata and other non-array properties
                if (!Array.isArray(currentData[category])) return;
                
                this.categoryCounts[category] = {
                    all: currentData[category].length,
                    easy: currentData[category].filter(word => word.difficulty === 'easy').length,
                    normal: currentData[category].filter(word => word.difficulty === 'normal').length,
                    hard: currentData[category].filter(word => word.difficulty === 'hard').length
                };
            });
        }
        
        // Calculate total counts across all categories
        this.categoryCounts['all-categories'] = {
            all: 0,
            easy: 0,
            normal: 0,
            hard: 0
        };
        
        Object.keys(this.categoryCounts).forEach(category => {
            if (category !== 'all-categories') {
                this.categoryCounts['all-categories'].all += this.categoryCounts[category].all;
                this.categoryCounts['all-categories'].easy += this.categoryCounts[category].easy;
                this.categoryCounts['all-categories'].normal += this.categoryCounts[category].normal;
                this.categoryCounts['all-categories'].hard += this.categoryCounts[category].hard;
            }
        });
        
        console.log('Category counts calculated for', this.currentVocabularySource, ':', this.categoryCounts);
    }

    getCurrentVocabularyData() {
        if (this.currentVocabularySource === 'sequential') {
            return typeof cleanSequentialVocabularyData !== 'undefined' ? cleanSequentialVocabularyData : null;
        } else {
            return typeof vocabularyData !== 'undefined' ? vocabularyData : null;
        }
    }

    switchVocabularySource(source) {
        this.currentVocabularySource = source;
        
        // Update category labels
        if (source === 'sequential') {
            this.categoryLabels = this.specializedCategoryLabels; // Use same labels as specialized
            // Reset to a valid category for sequential data
            this.currentCategory = 'business-finance'; // Sequential data uses business-finance format
        } else {
            this.categoryLabels = this.specializedCategoryLabels;
            // Reset to a valid category for specialized data
            this.currentCategory = 'social-welfare';
        }
        
        this.calculateCategoryCounts();
        this.updateCategoryOptions();
        this.loadCategory(this.currentCategory);
        
        // Emit event for other components to react
        window.eventBus.emit('vocabulary:sourceChanged', {
            source: source,
            category: this.currentCategory,
            availableCategories: Object.keys(this.categoryLabels)
        });
    }

    updateCategoryOptions() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect) return;
        
        // Clear existing options
        categorySelect.innerHTML = '';
        
        // Add new options based on current vocabulary source
        Object.entries(this.categoryLabels).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            if (value === this.currentCategory) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
    }

    loadCategory(category) {
        const currentData = this.getCurrentVocabularyData();
        let categoryWords = null;
        
        if (this.currentVocabularySource === 'sequential') {
            if (!currentData || !currentData.vocabulary || !Array.isArray(currentData.vocabulary)) {
                console.error(`Sequential vocabulary data not found or not an array`);
                return;
            }
            // Filter vocabulary array by domain
            categoryWords = currentData.vocabulary.filter(item => item.domain === category);
        } else {
            if (!currentData || !currentData[category]) {
                console.error(`Specialized category '${category}' not found`);
                return;
            }
            categoryWords = currentData[category];
        }
        
        if (!categoryWords) {
            console.error(`No words found for category '${category}'`);
            return;
        }

        this.currentCategory = category;
        
        // Load all words for this category
        if (category === 'all-categories') {
            // Combine all categories
            this.allWords = [];
            const currentData = this.getCurrentVocabularyData();
            if (this.currentVocabularySource === 'sequential') {
                // For flat array structure, just use all vocabulary
                this.allWords = [...currentData.vocabulary];
            } else if (this.currentVocabularySource === 'conversation') {
                Object.keys(currentData.vocabulary).forEach(cat => {
                    this.allWords.push(...currentData.vocabulary[cat]);
                });
            } else {
                Object.keys(currentData).forEach(cat => {
                    if (Array.isArray(currentData[cat])) {
                        this.allWords.push(...currentData[cat]);
                    }
                });
            }
            // Shuffle for variety when combining all categories
            if (this.allWords.length > 0) {
                this.shuffleArray(this.allWords);
            }
        } else {
            // Load specific category
            this.allWords = [...categoryWords];
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