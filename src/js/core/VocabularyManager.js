// VocabularyManager - Handles conversation vocabulary loading, filtering, and navigation
// Updated: Sep 2025 - Dialogue-based categories and Unfamiliar Words mode implemented
class VocabularyManager {
    constructor() {
        this.currentCategory = 'all-categories';
        this.currentDifficulty = 'all';
        this.currentLearningMode = 'vocabulary-clean'; // vocabulary, dialogue, unfamiliar, chinese-english, vocabulary-clean
        this.currentWords = [];
        this.allWords = []; // Store unfiltered words
        this.categoryCounts = {}; // Store counts per category per difficulty
        this.currentIndex = 0;
        this.dataLoader = null;
        this.isInitialized = false;

        // Store different datasets
        this.completeDataset = null;
        this.unfamiliarWordsDataset = null;
        this.wordsDataset = null; // Dataset for words.md mode
        this.chineseEnglishDataset = null; // Dataset for Chinese-English mode
        this.vocabularyCleanDataset = null; // Dataset for vocabulary-clean mode

        // Dialogue-based category labels (groups by decade endings 0-9) - Sept 3, 2025
        this.categoryLabels = {
            'all-categories': '🌟 All Categories (6928 words)',
            'group-240s': '📚 70240s: 70248-70240 (Latest)',
            'group-230s': '📚 70230s: 70239-70230',
            'group-220s': '📚 70220s: 70229-70220',
            'group-210s': '📚 70210s: 70219-70210',
            'group-200s': '📚 70200s: 70209-70200',
            'group-190s': '📚 70190s: 70199-70190',
            'group-180s': '📚 70180s: 70189-70180',
            'group-170s': '📚 70170s: 70179-70170',
            'group-160s': '📚 70160s: 70169-70160',
            'group-150s': '📚 70150s: 70159-70150 (Earliest)'
        };

        // Dialogue range mapping for each group (decade-based for easier updates)
        this.dialogueGroups = {
            'group-240s': [70248, 70247, 70246, 70245, 70244, 70243, 70242, 70241, 70240],
            'group-230s': [70239, 70238, 70237, 70236, 70235, 70234, 70233, 70232, 70231, 70230],
            'group-220s': [70229, 70228, 70227, 70226, 70225, 70224, 70223, 70222, 70221, 70220],
            'group-210s': [70219, 70218, 70217, 70216, 70215, 70214, 70213, 70212, 70211, 70210],
            'group-200s': [70209, 70208, 70207, 70206, 70205, 70204, 70203, 70202, 70201, 70200],
            'group-190s': [70199, 70198, 70197, 70196, 70195, 70194, 70193, 70192, 70191, 70190],
            'group-180s': [70189, 70188, 70187, 70186, 70185, 70184, 70183, 70182, 70181, 70180],
            'group-170s': [70179, 70178, 70177, 70176, 70175, 70174, 70173, 70172, 70171, 70170],
            'group-160s': [70169, 70168, 70167, 70166, 70165, 70164, 70163, 70162, 70161, 70160],
            'group-150s': [70159, 70158] // Note: only 2 dialogues in this group so far
        };
    }

    calculateCategoryCounts() {
        const vocabularyData = this.getVocabularyFromDataLoader();
        if (!vocabularyData || vocabularyData.length === 0) return;

        // Initialize categories with zero counts
        this.categoryCounts = {
            'all-categories': { all: 0, easy: 0, normal: 0, hard: 0 }
        };

        // Count items by dialogue group and difficulty
        vocabularyData.forEach(item => {
            const conversationId = parseInt(item.conversationId);

            // Find which group this dialogue belongs to
            let dialogueGroup = null;
            for (const [groupKey, dialogueIds] of Object.entries(this.dialogueGroups)) {
                if (dialogueIds.includes(conversationId)) {
                    dialogueGroup = groupKey;
                    break;
                }
            }

            // Count in the appropriate group
            if (dialogueGroup) {
                if (!this.categoryCounts[dialogueGroup]) {
                    this.categoryCounts[dialogueGroup] = { all: 0, easy: 0, normal: 0, hard: 0 };
                }
                this.categoryCounts[dialogueGroup].all++;
                this.categoryCounts[dialogueGroup][item.difficulty || 'normal']++;
            }

            // Always count in all-categories
            this.categoryCounts['all-categories'].all++;
            this.categoryCounts['all-categories'][item.difficulty || 'normal']++;
        });

        console.log('Category counts calculated from complete dataset:', this.categoryCounts);
    }

    async recalculateCountsForMode(mode) {
        console.log('🔄 Recalculating counts for mode:', mode);

        // Get vocabulary data for the specified mode
        const previousMode = this.currentLearningMode;
        this.currentLearningMode = mode; // Temporarily set mode for data retrieval

        const data = await this.getVocabularyData();

        this.currentLearningMode = previousMode; // Restore original mode

        if (!data || !data.vocabulary) {
            console.error('❌ No vocabulary data available for mode:', mode);
            return;
        }

        const vocabularyData = data.vocabulary;

        // Initialize categories with zero counts
        this.categoryCounts = {
            'all-categories': { all: 0, easy: 0, normal: 0, hard: 0 }
        };

        // For Chinese-English mode, use simplified categories
        if (mode === 'chinese-english') {
            this.categoryCounts['all-categories'] = { all: 0, easy: 0, normal: 0, hard: 0 };

            // Count all items as 'normal' difficulty for Chinese-English pairs
            vocabularyData.forEach(item => {
                this.categoryCounts['all-categories'].all++;
                this.categoryCounts['all-categories'].normal++;
            });

            // Update category labels for Chinese-English mode
            this.categoryLabels = {
                'all-categories': `🈯 All Chinese-English Pairs (${vocabularyData.length} pairs)`
            };
        } else {
            // Initialize all dialogue groups for other modes
            Object.keys(this.dialogueGroups).forEach(groupKey => {
                this.categoryCounts[groupKey] = { all: 0, easy: 0, normal: 0, hard: 0 };
            });

            // Count items by dialogue group and difficulty
            vocabularyData.forEach(item => {
                const conversationId = parseInt(item.conversationId);

                // Find which group this dialogue belongs to
                let dialogueGroup = null;
                for (const [groupKey, dialogueIds] of Object.entries(this.dialogueGroups)) {
                    if (dialogueIds.includes(conversationId)) {
                        dialogueGroup = groupKey;
                        break;
                    }
                }

                // Count in the appropriate group
                if (dialogueGroup) {
                    this.categoryCounts[dialogueGroup].all++;
                    this.categoryCounts[dialogueGroup][item.difficulty || 'normal']++;
                }

                // Always count in all-categories
                this.categoryCounts['all-categories'].all++;
                this.categoryCounts['all-categories'][item.difficulty || 'normal']++;
            });
        }

        console.log(`✅ Category counts recalculated for mode ${mode}:`, this.categoryCounts);
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

    async getVocabularyData() {
        // Return data based on current learning mode
        if (this.currentLearningMode === 'unfamiliar') {
            return await this.getUnfamiliarWordsData();
        } else if (this.currentLearningMode === 'dialogue') {
            return this.getDialogueData();
        } else if (this.currentLearningMode === 'words') {
            return await this.getWordsData();
        } else if (this.currentLearningMode === 'chinese-english') {
            return await this.getChineseEnglishData();
        } else if (this.currentLearningMode === 'vocabulary-clean') {
            return await this.getVocabularyCleanData();
        } else {
            // Default: vocabulary mode
            return this.getStandardVocabularyData();
        }
    }

    getStandardVocabularyData() {
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

    async getUnfamiliarWordsData() {
        const dataset = await this.loadUnfamiliarWordsDataset();
        if (!dataset) {
            console.error('Unfamiliar words dataset not available!');
            return null;
        }

        // Convert unfamiliar words format to vocabulary format
        const vocabulary = dataset.words.map(word => ({
            english: word.term,
            chinese: '',
            difficulty: word.difficulty,
            example: word.example || '',
            exampleChinese: word.exampleChinese || '',
            category: word.category,
            conversationId: word.dialogueId,
            conversationTitle: word.dialogueTitle,
            sentenceNumber: word.sentenceId,
            phonetic: word.phonetic || '',
            source: 'unfamiliar-words'
        }));

        console.log('Unfamiliar words vocabulary loaded:', vocabulary.length, 'terms');

        return {
            vocabulary: vocabulary,
            totalTerms: vocabulary.length,
            generatedAt: new Date().toISOString(),
            sourceFile: 'unfamiliar-words-dataset.json'
        };
    }

    getDialogueData() {
        // TODO: Implement dialogue practice mode
        // This would return full sentences instead of individual vocabulary
        console.log('Dialogue practice mode not yet implemented');
        return this.getStandardVocabularyData();
    }

    async loadWordsDataset() {
        if (this.wordsDataset) return this.wordsDataset;
        try {
            console.log('📥 Loading words dataset (from words.md)...');
            const response = await fetch('/data/processed/words-dataset.json');
            if (!response.ok) {
                throw new Error(`Failed to load words dataset: ${response.status} ${response.statusText}`);
            }
            this.wordsDataset = await response.json();
            console.log('✅ Words dataset loaded:', this.wordsDataset.words?.length || 0, 'terms');
            return this.wordsDataset;
        } catch (error) {
            console.error('❌ Failed to load words dataset:', error);
            return null;
        }
    }

    async loadChineseEnglishDataset() {
        if (this.chineseEnglishDataset) return this.chineseEnglishDataset;
        try {
            console.log('📥 Loading Chinese-English dataset...');
            const response = await fetch('/data/processed/chinese-english-dataset.json');
            if (!response.ok) {
                throw new Error(`Failed to load Chinese-English dataset: ${response.status} ${response.statusText}`);
            }
            this.chineseEnglishDataset = await response.json();
            console.log('✅ Chinese-English dataset loaded:', this.chineseEnglishDataset.wordPairs?.length || 0, 'pairs');
            return this.chineseEnglishDataset;
        } catch (error) {
            console.error('❌ Failed to load Chinese-English dataset:', error);
            return null;
        }
    }

    async loadVocabularyCleanDataset() {
        if (this.vocabularyCleanDataset) return this.vocabularyCleanDataset;
        try {
            console.log('📥 Loading Vocabulary-Clean dataset...');
            const response = await fetch('/data/processed/vocabulary-data.json');
            if (!response.ok) {
                throw new Error(`Failed to load Vocabulary-Clean dataset: ${response.status} ${response.statusText}`);
            }
            this.vocabularyCleanDataset = await response.json();
            console.log('✅ Vocabulary-Clean dataset loaded:', this.vocabularyCleanDataset.entries?.length || 0, 'entries');
            return this.vocabularyCleanDataset;
        } catch (error) {
            console.error('❌ Failed to load Vocabulary-Clean dataset:', error);
            return null;
        }
    }

    async getWordsData() {
        const dataset = await this.loadWordsDataset();
        if (!dataset || !Array.isArray(dataset.words)) {
            console.error('Words dataset not available or invalid');
            return { vocabulary: [], totalTerms: 0, generatedAt: new Date().toISOString(), sourceFile: 'words-dataset.json' };
        }

        // Map to standard vocabulary shape, preserving original order
        const vocabulary = dataset.words.map((w) => ({
            english: w.term,
            chinese: '',
            difficulty: w.difficulty || 'normal',
            example: '',
            exampleChinese: '',
            category: w.category || 'unknown',
            conversationId: String(w.dialogueId || w.conversationId || w.groupId || ''),
            conversationTitle: w.dialogueTitle || '',
            sentenceNumber: w.sentenceId || 0,
            phonetic: w.phonetic || '',
            source: 'words-md'
        }));

        return {
            vocabulary,
            totalTerms: vocabulary.length,
            generatedAt: new Date().toISOString(),
            sourceFile: 'words-dataset.json'
        };
    }

    async getChineseEnglishData() {
        const dataset = await this.loadChineseEnglishDataset();
        if (!dataset || !Array.isArray(dataset.wordPairs)) {
            console.error('Chinese-English dataset not available or invalid');
            return { vocabulary: [], totalTerms: 0, generatedAt: new Date().toISOString(), sourceFile: 'chinese-english-dataset.json' };
        }

        // Map to standard vocabulary shape, preserving original order and pronunciation data
        const vocabulary = dataset.wordPairs.map((pair) => ({
            english: pair.english,
            chinese: pair.chinese,
            difficulty: 'normal', // Default difficulty for Chinese-English pairs
            example: '',
            exampleChinese: '',
            category: 'general', // Default category for Chinese-English pairs
            conversationId: String(pair.dialogueId || ''),
            conversationTitle: '',
            sentenceNumber: 0,
            phonetic: '',
            source: 'chinese-english',
            // Include pronunciation data if available
            pronunciations: pair.pronunciations || null,
            // Legacy fields for compatibility
            term: pair.english,
            translation: pair.chinese
        }));

        return {
            vocabulary,
            totalTerms: vocabulary.length,
            generatedAt: new Date().toISOString(),
            sourceFile: 'chinese-english-dataset.json'
        };
    }

    async getVocabularyCleanData() {
        const dataset = await this.loadVocabularyCleanDataset();
        if (!dataset || !Array.isArray(dataset.entries)) {
            console.error('Vocabulary-Clean dataset not available or invalid');
            return { vocabulary: [], totalTerms: 0, generatedAt: new Date().toISOString(), sourceFile: 'vocabulary-data.json' };
        }

        // Map to standard vocabulary shape, preserving original order and pronunciation data
        const vocabulary = dataset.entries.map((entry) => {
            // Parse the entry format: English | Chinese | UK Pronunciation | US Pronunciation
            const parts = entry.content.split('|').map(part => part.trim());

            // Extract the number from the entry
            const numberMatch = entry.number.toString().match(/\d+/);
            const entryNumber = numberMatch ? numberMatch[0] : '0';

            // Clean up the English term - if it contains slashes (like "Behave/act"),
            // we need to handle it specially
            const englishTerm = parts[0] || '';

            return {
                english: englishTerm,
                chinese: parts[1] || '',
                difficulty: 'normal', // Default difficulty
                example: '',
                exampleChinese: '',
                category: 'vocabulary', // Default category for vocabulary entries
                conversationId: entryNumber,
                conversationTitle: 'Vocabulary',
                sentenceNumber: parseInt(entryNumber),
                // UK pronunciation data
                ukPronunciation: parts[2] || '',
                // US pronunciation data
                usPronunciation: parts[3] || '',
                source: 'vocabulary-clean',
                // Legacy fields for compatibility
                term: englishTerm,
                translation: parts[1] || ''
            };
        });

        // Update category labels for vocabulary-clean mode
        this.categoryLabels = {
            'all-categories': `🎓 All Vocabulary Entries (${vocabulary.length} entries)`
        };
        
        // For vocabulary-clean mode, we don't use dialogue groups
        // So we need to ensure we're not trying to filter by dialogue groups
        this.dialogueGroups = {
            'all-categories': [] // Only use all-categories for vocabulary-clean mode
        };

        return {
            vocabulary,
            totalTerms: vocabulary.length,
            generatedAt: new Date().toISOString(),
            sourceFile: 'vocabulary-data.json'
        };
    }

    updateCategoryOptions() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect) return;

        // Clear existing options
        categorySelect.innerHTML = '';

        // Add options based on available categories with word counts
        Object.entries(this.categoryLabels).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;

            // Add word count to label if available
            const count = this.categoryCounts && this.categoryCounts[value]
                ? this.categoryCounts[value].all
                : 0;

            // Update label with count for non-all categories
            if (value === 'all-categories') {
                option.textContent = `🌟 All Categories (${count} words)`;
            } else {
                const baseLabel = label.replace(' words)', '').replace(/\(\d+ words\)/, '');
                option.textContent = `${baseLabel} (${count} words)`;
            }
            if (value === this.currentCategory) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
    }

    setLearningMode(mode) {
        console.log('🎯 Setting learning mode to:', mode);
        this.currentLearningMode = mode;

        // For vocabulary-clean mode, we need to set the category to all-categories
        // since it doesn't use dialogue groups
        if (mode === 'vocabulary-clean') {
            this.currentCategory = 'all-categories';
        }

        // Recalculate category counts for the new mode
        this.recalculateCountsForMode(mode);

        // Update category options with new counts
        this.updateCategoryOptions();

        // Emit learning mode change event
        window.eventBus.emit('vocabulary:learningModeChanged', {
            mode: this.currentLearningMode
        });

        // Reload current category with new mode
        this.loadCategory(this.currentCategory);
    }

    async loadUnfamiliarWordsDataset() {
        if (this.unfamiliarWordsDataset) {
            return this.unfamiliarWordsDataset;
        }

        try {
            console.log('📥 Loading unfamiliar words dataset...');
            const response = await fetch('/data/processed/unfamiliar-words-dataset.json');

            if (!response.ok) {
                throw new Error(`Failed to load unfamiliar words: ${response.status} ${response.statusText}`);
            }

            this.unfamiliarWordsDataset = await response.json();
            console.log('✅ Unfamiliar words dataset loaded:', this.unfamiliarWordsDataset.words.length, 'terms');
            return this.unfamiliarWordsDataset;
        } catch (error) {
            console.error('❌ Failed to load unfamiliar words dataset:', error);
            return null;
        }
    }

    async loadCategory(category) {
        console.log('🔄 loadCategory called with:', category, 'mode:', this.currentLearningMode);
        console.log('🔍 extractedVocabulary available:', !!this.extractedVocabulary);
        console.log('🔍 extractedVocabulary length:', this.extractedVocabulary?.length || 0);

        const data = await this.getVocabularyData();
        if (!data || !data.vocabulary) {
            console.error('❌ No vocabulary data available in loadCategory');
            console.log('Debug - data:', data);
            console.log('Debug - extractedVocabulary:', this.extractedVocabulary?.length || 'none');
            return;
        }

        console.log('✅ Vocabulary data available:', data.vocabulary.length, 'terms');
        this.currentCategory = category;

        // Filter vocabulary based on learning mode and category
        if (this.currentLearningMode === 'vocabulary-clean') {
            // For vocabulary-clean mode, we don't filter by dialogue groups
            // We use all vocabulary entries
            this.allWords = [...data.vocabulary];
            console.log('Using vocabulary-clean mode - all entries loaded:', this.allWords.length);
        } else if (this.currentLearningMode === 'unfamiliar') {
            // For unfamiliar words, filter by dialogue group
            if (category === 'all-categories') {
                this.allWords = [...data.vocabulary];
            } else {
                const dialogueIds = this.dialogueGroups[category];
                if (dialogueIds) {
                    this.allWords = data.vocabulary.filter(item => {
                        const conversationId = parseInt(item.conversationId);
                        return dialogueIds.includes(conversationId);
                    });
                } else {
                    console.warn(`Unknown dialogue group: ${category}`);
                    this.allWords = [];
                }
            }
        } else {
            // Standard vocabulary mode filtering
            if (category === 'all-categories') {
                this.allWords = [...data.vocabulary];
            } else {
                // Get dialogue IDs for this group
                const dialogueIds = this.dialogueGroups[category];
                if (dialogueIds) {
                    this.allWords = data.vocabulary.filter(item => {
                        const conversationId = parseInt(item.conversationId);
                        return dialogueIds.includes(conversationId);
                    });
                } else {
                    console.warn(`Unknown dialogue group: ${category}`);
                    this.allWords = [];
                }
            }
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

    getNextCategory() {
        const categories = this.getAllCategories();
        const currentIndex = categories.indexOf(this.currentCategory);

        // If we're at the last category, don't advance (or could loop back to first)
        if (currentIndex >= categories.length - 1) {
            return null; // No next category
        }

        return categories[currentIndex + 1];
    }

    getPreviousCategory() {
        const categories = this.getAllCategories();
        const currentIndex = categories.indexOf(this.currentCategory);

        // If we're at the first category, don't go back (or could loop to last)
        if (currentIndex <= 0) {
            return null; // No previous category
        }

        return categories[currentIndex - 1];
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