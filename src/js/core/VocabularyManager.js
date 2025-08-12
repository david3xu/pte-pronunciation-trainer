// VocabularyManager - Handles vocabulary loading, filtering, and navigation
class VocabularyManager {
    constructor() {
        this.currentCategory = 'all-categories';
        this.currentDifficulty = 'all';
        this.currentVocabularySource = 'conversation'; // 'specialized' or 'conversation'
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
        
        // Category labels mapping for conversation vocabulary - consistent with specialized
        this.conversationCategoryLabels = {
            'all-categories': '🌟 All Categories',
            'social-welfare': '🤝 Social Welfare',
            'education': '🎓 Education', 
            'legal-government': '⚖️ Legal & Government',
            'business-finance': '💼 Business & Finance',
            'medical-healthcare': '🏥 Medical & Healthcare',
            'travel-immigration': '✈️ Travel & Immigration'
        };
        
        this.categoryLabels = this.specializedCategoryLabels; // Default to specialized
    }

    calculateCategoryCounts() {
        const currentData = this.getCurrentVocabularyData();
        if (!currentData) return;
        
        this.categoryCounts = {};
        
        if (this.currentVocabularySource === 'conversation') {
            // Handle conversation vocabulary structure (flat array)
            if (currentData.vocabulary && Array.isArray(currentData.vocabulary)) {
                // Initialize category counts
                const categories = {};
                
                // Count terms by category from the flat array
                currentData.vocabulary.forEach(item => {
                    const category = item.category;
                    if (!categories[category]) {
                        categories[category] = { all: 0, easy: 0, normal: 0, hard: 0 };
                    }
                    
                    categories[category].all++;
                    categories[category][item.difficulty]++;
                });
                
                this.categoryCounts = categories;
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
        console.log(`Getting ${this.currentVocabularySource} vocabulary data...`);
        if (this.currentVocabularySource === 'conversation') {
            const available = typeof conversationVocabularyData !== 'undefined';
            console.log('Conversation data available:', available);
            if (available) {
                console.log('Conversation data keys:', Object.keys(conversationVocabularyData));
                console.log('Conversation vocabulary categories:', Object.keys(conversationVocabularyData.vocabulary || {}));
            }
            return available ? conversationVocabularyData : null;
        } else {
            const available = typeof vocabularyData !== 'undefined';
            console.log('Specialized data available:', available);
            if (available) {
                console.log('Specialized data keys:', Object.keys(vocabularyData));
            }
            return available ? vocabularyData : null;
        }
    }

    switchVocabularySource(source) {
        this.currentVocabularySource = source;
        
        // Update category labels and set appropriate default category
        if (source === 'conversation') {
            this.categoryLabels = this.conversationCategoryLabels;
            // Default to 'all-categories' for conversation vocabulary to show chronological progression
            this.currentCategory = 'all-categories';
        } else {
            this.categoryLabels = this.specializedCategoryLabels;
            // Default to 'social-welfare' for specialized vocabulary
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
        
        console.log(`Switched to ${source} vocabulary source with ${this.getTotalWords()} terms`);
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
        
        if (this.currentVocabularySource === 'conversation') {
            if (!currentData || !currentData.vocabulary || !Array.isArray(currentData.vocabulary)) {
                console.error(`Conversation vocabulary data not found or not array`);
                return;
            }
            
            if (category === 'all-categories') {
                // Return all vocabulary items from flat array
                categoryWords = [...currentData.vocabulary];
            } else {
                // Filter vocabulary items by category from flat array
                categoryWords = currentData.vocabulary.filter(item => item.category === category);
                if (!categoryWords.length) {
                    console.error(`No conversation terms found for category '${category}'`);
                    return;
                }
            }
        } else {
            // Specialized vocabulary
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
        this.allWords = [...categoryWords];
        
        // Shuffle for variety when combining all categories (specialized vocabulary only)
        // For conversation vocabulary, maintain processing order (70241→70001)
        if (category === 'all-categories' && this.allWords.length > 0 && this.currentVocabularySource === 'specialized') {
            this.shuffleArray(this.allWords);
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