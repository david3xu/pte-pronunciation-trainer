// VocabularyManager - Handles conversation vocabulary loading, filtering, and navigation
class VocabularyManager {
    constructor() {
        this.currentCategory = 'all-categories';
        this.currentDifficulty = 'all';
        this.currentWords = [];
        this.allWords = []; // Store unfiltered words
        this.categoryCounts = {}; // Store counts per category per difficulty
        this.currentIndex = 0;
        this.dataLoader = null;
        this.isInitialized = false;

        // Category labels for conversation vocabulary (corrected based on raw.md)
        this.categoryLabels = {
            'all-categories': '🌟 All Categories',
            'housing': '🏠 Housing',
            'social-welfare': '🤝 Social Welfare',
            'legal': '⚖️ Legal',
            'immigration': '🛂 Immigration',
            'business': '💼 Business',
            'medical': '🏥 Medical',
            'education': '🎓 Education',
            'tourism': '✈️ Tourism',
            'social': '👥 Social'
        };
    }

    calculateCategoryCounts() {
        const vocabularyData = this.getVocabularyFromDataLoader();
        if (!vocabularyData || vocabularyData.length === 0) return;

        // Initialize categories with zero counts
        this.categoryCounts = {
            'all-categories': { all: 0, easy: 0, normal: 0, hard: 0 }
        };

        // Count items by category and difficulty
        vocabularyData.forEach(item => {
            const category = item.category || 'uncategorized';
            if (!this.categoryCounts[category]) {
                this.categoryCounts[category] = { all: 0, easy: 0, normal: 0, hard: 0 };
            }
            this.categoryCounts[category].all++;
            this.categoryCounts[category][item.difficulty || 'normal']++;
            this.categoryCounts['all-categories'].all++;
            this.categoryCounts['all-categories'][item.difficulty || 'normal']++;
        });

        console.log('Category counts calculated from complete dataset:', this.categoryCounts);
    }

    getVocabularyFromDataLoader() {
        // Use extracted vocabulary if available (new direct loading method)
        if (this.extractedVocabulary) {
            return this.extractedVocabulary;
        }

        // Fallback to old DialogueDataLoader method (if available)
        if (!this.dataLoader || !this.dataLoader.isLoaded) {
            console.warn('No vocabulary data available yet');
            return [];
        }

        const data = this.dataLoader.data;
        if (!data || !data.dialogues) {
            console.error('No dialogue data available');
            return [];
        }

        // Extract all vocabulary terms from all dialogues
        const allVocabulary = [];
        data.dialogues.forEach(dialogue => {
            if (dialogue.sentences) {
                dialogue.sentences.forEach(sentence => {
                    if (sentence.vocabulary) {
                        sentence.vocabulary.forEach(vocabItem => {
                            // Convert complete dataset structure to vocabulary manager format
                            allVocabulary.push({
                                english: vocabItem.term,
                                chinese: sentence.chinese || '', // Use sentence Chinese as context
                                difficulty: vocabItem.difficulty || 'normal',
                                example: vocabItem.context || sentence.english,
                                exampleChinese: sentence.chinese || '',
                                category: dialogue.category,
                                conversationId: dialogue.id,
                                conversationTitle: dialogue.title,
                                sentenceNumber: sentence.id,
                                phonetic: vocabItem.phonetic || ''
                            });
                        });
                    }
                });
            }
        });

        console.log(`Extracted ${allVocabulary.length} vocabulary terms from complete dataset`);
        return allVocabulary;
    }

    getVocabularyData() {
        // For backward compatibility, return a structure similar to conversationVocabularyData
        const vocabulary = this.getVocabularyFromDataLoader();
        
        if (!this.extractedVocabulary) {
            console.error('Complete dataset not loaded yet!');
            return null;
        }

        console.log('Complete dataset vocabulary loaded:', vocabulary.length, 'terms');
        
        return {
            vocabulary: vocabulary,
            totalTerms: vocabulary.length,
            generatedAt: new Date().toISOString(),
            sourceFile: 'complete-dataset.json'
        };
    }

    updateCategoryOptions() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect) return;

        // Clear existing options
        categorySelect.innerHTML = '';

        // Add options based on available categories
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
        console.log('🔄 loadCategory called with:', category);
        console.log('🔍 extractedVocabulary available:', !!this.extractedVocabulary);
        console.log('🔍 extractedVocabulary length:', this.extractedVocabulary?.length || 0);
        
        const data = this.getVocabularyData();
        if (!data || !data.vocabulary) {
            console.error('❌ No vocabulary data available in loadCategory');
            console.log('Debug - data:', data);
            console.log('Debug - extractedVocabulary:', this.extractedVocabulary?.length || 'none');
            return;
        }

        console.log('✅ Vocabulary data available:', data.vocabulary.length, 'terms');
        this.currentCategory = category;

        // Filter vocabulary by category
        if (category === 'all-categories') {
            this.allWords = [...data.vocabulary];
        } else {
            this.allWords = data.vocabulary.filter(item => item.category === category);
        }

        console.log(`📊 Filtered ${this.allWords.length} words for category: ${category}`);

        // Apply difficulty filter
        this.applyDifficultyFilter();

        console.log(`🎯 After difficulty filter: ${this.currentWords.length} words available`);

        // Emit event
        window.eventBus.emit('vocabulary:categoryLoaded', {
            category: category,
            count: this.currentWords.length,
            totalCount: this.allWords.length
        });

        console.log(`Loaded category: ${category} with ${this.currentWords.length} words`);
    }

    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.applyDifficultyFilter();

        // Emit event
        window.eventBus.emit('vocabulary:difficultyFiltered', {
            difficulty: difficulty,
            count: this.currentWords.length
        });

        console.log(`Applied difficulty filter: ${difficulty} (${this.currentWords.length} words)`);
    }

    applyDifficultyFilter() {
        if (this.currentDifficulty === 'all') {
            this.currentWords = [...this.allWords];
        } else {
            this.currentWords = this.allWords.filter(word => word.difficulty === this.currentDifficulty);
        }

        // Preserve original order from raw conversation data
        // No shuffling - maintain sequence as extracted
    }

    shuffleWords() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.currentWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentWords[i], this.currentWords[j]] = [this.currentWords[j], this.currentWords[i]];
        }
    }

    getCurrentWord(index = null) {
        if (index !== null) {
            this.currentIndex = index;
        }

        if (this.currentWords.length === 0) {
            return null;
        }

        // Ensure index is within bounds
        this.currentIndex = Math.max(0, Math.min(this.currentIndex, this.currentWords.length - 1));

        return this.currentWords[this.currentIndex];
    }

    getNextWord() {
        this.currentIndex = (this.currentIndex + 1) % this.currentWords.length;
        return this.getCurrentWord();
    }

    getPreviousWord() {
        this.currentIndex = (this.currentIndex - 1 + this.currentWords.length) % this.currentWords.length;
        return this.getCurrentWord();
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

    getAllCategories() {
        return Object.keys(this.categoryLabels);
    }

    resetToFirstWord() {
        this.currentIndex = 0;
    }

    // Initialize vocabulary on load
    async initialize() {
        console.log('🔄 Initializing VocabularyManager with complete dataset...');
        
        // Load complete dataset directly via fetch instead of DialogueDataLoader
        try {
            console.log('📥 Loading complete dataset...');
            const response = await fetch('/data/processed/complete-dataset.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }
            
            const completeData = await response.json();
            console.log('✅ Complete dataset loaded successfully');
            console.log(`📊 Loaded ${completeData.dialogues?.length} dialogues with vocabulary`);
            
            this.completeDataset = completeData;
            this.isInitialized = true;
            
            // Extract vocabulary for compatibility with existing methods
            this.extractVocabularyFromDataset();
            // Extract vocabulary for compatibility with existing methods
            this.extractVocabularyFromDataset();
            
            console.log('✅ Complete dataset loaded successfully');

            // Now calculate counts and initialize
            this.calculateCategoryCounts();
            this.updateCategoryOptions();
            this.loadCategory(this.currentCategory);
            this.isInitialized = true;

            // Emit initialization complete
            window.eventBus.emit('vocabulary:initialized', {
                totalTerms: this.categoryCounts['all-categories']?.all || 0,
                categories: Object.keys(this.categoryLabels),
                dataSource: 'complete-dataset'
            });

            console.log('🎉 VocabularyManager initialized with complete dataset');
        } catch (error) {
            console.error('❌ Failed to initialize VocabularyManager:', error);
            // Could fall back to old method here if needed
        }
    }

    /**
     * Extract vocabulary from complete dataset for compatibility
     */
    extractVocabularyFromDataset() {
        if (!this.completeDataset || !this.completeDataset.dialogues) {
            console.warn('No complete dataset available for vocabulary extraction');
            return;
        }

        const vocabulary = [];
        
        this.completeDataset.dialogues.forEach(dialogue => {
            dialogue.sentences.forEach(sentence => {
                sentence.vocabulary.forEach(vocabItem => {
                    vocabulary.push({
                        english: vocabItem.term,
                        chinese: '',
                        difficulty: vocabItem.difficulty || 'normal',
                        example: vocabItem.context || sentence.english,
                        exampleChinese: sentence.chinese || '',
                        category: dialogue.category,
                        conversationId: dialogue.id,
                        conversationTitle: dialogue.title,
                        sentenceNumber: sentence.id
                    });
                });
            });
        });

        // Store extracted vocabulary for backward compatibility
        this.extractedVocabulary = vocabulary;
        console.log(`📚 Extracted ${vocabulary.length} vocabulary terms from complete dataset`);
    }
}

// Create and expose global instance
window.vocabularyManager = new VocabularyManager();