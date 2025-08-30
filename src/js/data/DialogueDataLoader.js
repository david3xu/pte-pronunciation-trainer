/**
 * DialogueDataLoader - Loads and validates structured dialogue data
 * Part of Phase 2: Frontend Preparation
 */

console.log('🔄 Loading DialogueDataLoader.js...');

class DialogueDataLoader {
    constructor() {
        this.data = null;
        this.isLoaded = false;
        this.loadingPromise = null;
    }

    /**
     * Load the complete dialogue dataset
     * @returns {Promise<Object>} The loaded and validated data
     */
    async loadData() {
        // Prevent multiple simultaneous loads
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this._performLoad();
        return this.loadingPromise;
    }

    /**
     * Perform the actual data loading
     * @private
     */
    async _performLoad() {
        try {
            console.log('🔄 Loading dialogue data...');
            
            // Load the complete dataset
            const response = await fetch('/data/processed/complete-dataset.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }
            
            const rawData = await response.json();
            console.log('📥 Raw data loaded, size:', this._formatBytes(JSON.stringify(rawData).length));
            
            // Validate and transform the data
            const validatedData = this.validateAndTransform(rawData);
            
            // Store the data
            this.data = validatedData;
            this.isLoaded = true;
            
            console.log('✅ Dialogue data loaded successfully');
            console.log(`   • Dialogues: ${validatedData.dialogues.length}`);
            console.log(`   • Vocabulary: ${validatedData.vocabulary.length}`);
            console.log(`   • Categories: ${Object.keys(validatedData.categories).length}`);
            
            return validatedData;
            
        } catch (error) {
            console.error('❌ Failed to load dialogue data:', error);
            this.isLoaded = false;
            throw error;
        } finally {
            this.loadingPromise = null;
        }
    }

    /**
     * Validate and transform the raw data
     * @param {Object} rawData - Raw data from JSON file
     * @returns {Object} Validated and transformed data
     */
    validateAndTransform(rawData) {
        console.log('🔍 Validating and transforming data...');
        
        // Basic structure validation
        if (!rawData.dialogues || !rawData.vocabulary || !rawData.categories) {
            throw new Error('Invalid data structure: missing required sections');
        }

        // Validate dialogues
        const validatedDialogues = this._validateDialogues(rawData.dialogues);
        
        // Validate vocabulary
        const validatedVocabulary = this._validateVocabulary(rawData.vocabulary);
        
        // Validate categories
        const validatedCategories = this._validateCategories(rawData.categories);
        
        // Build lookup indexes for performance
        const indexes = this._buildIndexes(validatedDialogues, validatedVocabulary);
        
        return {
            dialogues: validatedDialogues,
            vocabulary: validatedVocabulary,
            categories: validatedCategories,
            indexes: indexes,
            metadata: rawData.metadata || {},
            _loadedAt: new Date().toISOString()
        };
    }

    /**
     * Validate dialogue data
     * @private
     */
    _validateDialogues(dialogues) {
        const validated = [];
        
        for (const dialogue of dialogues) {
            // Check required fields
            if (!dialogue.id || !dialogue.title || !dialogue.category) {
                console.warn(`⚠️  Skipping dialogue with missing fields:`, dialogue);
                continue;
            }
            
            // Validate category
            if (!this._isValidCategory(dialogue.category)) {
                console.warn(`⚠️  Dialogue ${dialogue.id} has invalid category: ${dialogue.category}`);
                continue;
            }
            
            // Validate sentences
            if (!Array.isArray(dialogue.sentences) || dialogue.sentences.length === 0) {
                console.warn(`⚠️  Dialogue ${dialogue.id} has no sentences`);
                continue;
            }
            
            validated.push(dialogue);
        }
        
        console.log(`   • Validated ${validated.length} dialogues`);
        return validated;
    }

    /**
     * Validate vocabulary data
     * @private
     */
    _validateVocabulary(vocabulary) {
        const validated = [];
        
        for (const vocab of vocabulary) {
            // Check required fields
            if (!vocab.term || !vocab.conversation_id || !vocab.category) {
                console.warn(`⚠️  Skipping vocabulary with missing fields:`, vocab);
                continue;
            }
            
            // Validate difficulty
            if (!['easy', 'normal', 'hard'].includes(vocab.difficulty)) {
                console.warn(`⚠️  Vocabulary "${vocab.term}" has invalid difficulty: ${vocab.difficulty}`);
                vocab.difficulty = 'normal'; // Default to normal
            }
            
            // Validate category
            if (!this._isValidCategory(vocab.category)) {
                console.warn(`⚠️  Vocabulary "${vocab.term}" has invalid category: ${vocab.category}`);
                continue;
            }
            
            validated.push(vocab);
        }
        
        console.log(`   • Validated ${validated.length} vocabulary terms`);
        return validated;
    }

    /**
     * Validate category data
     * @private
     */
    _validateCategories(categories) {
        const validated = {};
        const requiredFields = ['id', 'name', 'emoji', 'description', 'color', 'priority'];
        
        for (const [key, category] of Object.entries(categories)) {
            // Check required fields
            const missingFields = requiredFields.filter(field => !category[field]);
            if (missingFields.length > 0) {
                console.warn(`⚠️  Category ${key} missing fields:`, missingFields);
                continue;
            }
            
            validated[key] = category;
        }
        
        console.log(`   • Validated ${Object.keys(validated).length} categories`);
        return validated;
    }

    /**
     * Check if a category is valid
     * @private
     */
    _isValidCategory(category) {
        const validCategories = [
            'business', 'legal', 'medical', 'education', 'housing', 
            'social', 'social-welfare', 'immigration', 'tourism'
        ];
        return validCategories.includes(category);
    }

    /**
     * Build performance indexes
     * @private
     */
    _buildIndexes(dialogues, vocabulary) {
        console.log('🔧 Building performance indexes...');
        
        const indexes = {
            // Dialogue lookup by ID
            dialogueById: new Map(),
            
            // Vocabulary lookup by dialogue ID
            vocabularyByDialogue: new Map(),
            
            // Vocabulary lookup by category
            vocabularyByCategory: new Map(),
            
            // Vocabulary lookup by difficulty
            vocabularyByDifficulty: new Map(),
            
            // Category statistics
            categoryStats: new Map()
        };
        
        // Build dialogue index
        for (const dialogue of dialogues) {
            indexes.dialogueById.set(dialogue.id, dialogue);
        }
        
        // Build vocabulary indexes
        for (const vocab of vocabulary) {
            // By dialogue
            if (!indexes.vocabularyByDialogue.has(vocab.conversation_id)) {
                indexes.vocabularyByDialogue.set(vocab.conversation_id, []);
            }
            indexes.vocabularyByDialogue.get(vocab.conversation_id).push(vocab);
            
            // By category
            if (!indexes.vocabularyByCategory.has(vocab.category)) {
                indexes.vocabularyByCategory.set(vocab.category, []);
            }
            indexes.vocabularyByCategory.get(vocab.category).push(vocab);
            
            // By difficulty
            if (!indexes.vocabularyByDifficulty.has(vocab.difficulty)) {
                indexes.vocabularyByDifficulty.set(vocab.difficulty, []);
            }
            indexes.vocabularyByDifficulty.get(vocab.difficulty).push(vocab);
        }
        
        // Build category statistics
        for (const [category, vocabList] of indexes.vocabularyByCategory) {
            const stats = {
                totalTerms: vocabList.length,
                byDifficulty: {
                    easy: vocabList.filter(v => v.difficulty === 'easy').length,
                    normal: vocabList.filter(v => v.difficulty === 'normal').length,
                    hard: vocabList.filter(v => v.difficulty === 'hard').length
                }
            };
            indexes.categoryStats.set(category, stats);
        }
        
        console.log('   • Indexes built successfully');
        return indexes;
    }

    /**
     * Get loaded data
     * @returns {Object|null} The loaded data or null if not loaded
     */
    getData() {
        return this.data;
    }

    /**
     * Check if data is loaded
     * @returns {boolean} True if data is loaded
     */
    isDataLoaded() {
        return this.isLoaded && this.data !== null;
    }

    /**
     * Get dialogue by ID
     * @param {string} id - Dialogue ID
     * @returns {Object|null} Dialogue object or null if not found
     */
    getDialogueById(id) {
        if (!this.isDataLoaded()) {
            console.warn('Data not loaded yet');
            return null;
        }
        return this.data.indexes.dialogueById.get(id) || null;
    }

    /**
     * Get vocabulary by dialogue ID
     * @param {string} dialogueId - Dialogue ID
     * @returns {Array} Array of vocabulary terms
     */
    getVocabularyByDialogue(dialogueId) {
        if (!this.isDataLoaded()) {
            console.warn('Data not loaded yet');
            return [];
        }
        return this.data.indexes.vocabularyByDialogue.get(dialogueId) || [];
    }

    /**
     * Get vocabulary by category
     * @param {string} category - Category name
     * @returns {Array} Array of vocabulary terms
     */
    getVocabularyByCategory(category) {
        if (!this.isDataLoaded()) {
            console.warn('Data not loaded yet');
            return [];
        }
        return this.data.indexes.vocabularyByCategory.get(category) || [];
    }

    /**
     * Get vocabulary by difficulty
     * @param {string} difficulty - Difficulty level
     * @returns {Array} Array of vocabulary terms
     */
    getVocabularyByDifficulty(difficulty) {
        if (!this.isDataLoaded()) {
            console.warn('Data not loaded yet');
            return [];
        }
        return this.data.indexes.vocabularyByDifficulty.get(difficulty) || [];
    }

    /**
     * Get category statistics
     * @param {string} category - Category name
     * @returns {Object|null} Category statistics or null if not found
     */
    getCategoryStats(category) {
        if (!this.isDataLoaded()) {
            console.warn('Data not loaded yet');
            return null;
        }
        return this.data.indexes.categoryStats.get(category) || null;
    }

    /**
     * Get all categories
     * @returns {Array} Array of category objects
     */
    getAllCategories() {
        if (!this.isDataLoaded()) {
            return [];
        }
        return Object.values(this.data.categories);
    }

    /**
     * Get total vocabulary count
     * @returns {number} Total vocabulary terms
     */
    getTotalVocabularyCount() {
        if (!this.isDataLoaded()) {
            return 0;
        }
        return this.data.vocabulary.length;
    }

    /**
     * Get total dialogue count
     * @returns {number} Total dialogues
     */
    getTotalDialogueCount() {
        if (!this.isDataLoaded()) {
            return 0;
        }
        return this.data.dialogues.length;
    }

    /**
     * Format bytes for display
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Clear loaded data (useful for testing)
     */
    clearData() {
        this.data = null;
        this.isLoaded = false;
        this.loadingPromise = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DialogueDataLoader;
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.DialogueDataLoader = DialogueDataLoader;
    console.log('✅ DialogueDataLoader loaded and available globally');
} else {
    console.warn('⚠️  Window object not available - DialogueDataLoader not exposed globally');
}
