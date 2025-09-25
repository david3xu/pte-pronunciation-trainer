/**
 * VocabularyFormatter - Standardizes vocabulary data formats across all sources
 *
 * Converts various vocabulary data formats into a consistent structure
 */
class VocabularyFormatter {
    /**
     * Standardize vocabulary format across all sources
     * @param {string} source - Data source identifier
     * @param {Array|Object} data - Raw vocabulary data
     * @returns {Array} - Standardized vocabulary array
     */
    static standardizeVocabularyFormat(source, data) {
        // Handle different data structures
        let vocabularyArray = [];

        if (Array.isArray(data)) {
            vocabularyArray = data;
        } else if (data.vocabulary) {
            vocabularyArray = data.vocabulary;
        } else if (data.conversations) {
            vocabularyArray = data.vocabulary || [];
        }

        const standardize = (item) => {
            const standardized = {
                english: item.english || item.term || item.word || '',
                chinese: item.chinese || item.translation || '',
                difficulty: item.difficulty || this.inferDifficulty(item.english || item.term),
                category: item.category || this.inferCategoryFromDialogueId(item.conversationId) || 'general',
                example: item.example || item.sentence || '',
                exampleChinese: item.exampleChinese || item.sentenceChinese || '',
                conversationId: item.conversationId || item.dialogue_id || '',
                sentenceId: item.sentenceId || '',
                phonetic: item.phonetic || '',
                ipa: item.ipa || '',
                pronunciationGuide: item.pronunciationGuide || null,
                source: source,
                id: this.generateId(item.english || item.term || item.word)
            };

            // Process pronunciation data if available (Node.js environment)
            if (item.ukPronunciation || item.usPronunciation) {
                const PronunciationParser = require('./PronunciationParser');
                const pronData = PronunciationParser.extractPronunciationData(item);
                standardized.ipa = pronData.ipa || standardized.ipa;
                standardized.phonetic = pronData.phonetic || standardized.phonetic;
                standardized.pronunciationGuide = pronData.pronunciationGuide || standardized.pronunciationGuide;
            }

            return standardized;
        };

        return vocabularyArray.map(standardize);
    }

    /**
     * Generate unique ID from English text
     * @param {string} english - English text
     * @returns {string} - Unique identifier
     */
    static generateId(english) {
        if (!english) return 'unknown-' + Date.now();
        return english
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);
    }

    /**
     * Infer difficulty from English text
     * @param {string} english - English text
     * @returns {string} - Difficulty level (easy/normal/hard)
     */
    static inferDifficulty(english) {
        if (!english) return 'normal';

        const words = english.trim().split(/\s+/).length;
        const length = english.length;

        // Single word, short
        if (words === 1 && length < 8) return 'easy';

        // Long phrases or technical terms
        if (words > 4 || length > 40 || english.includes('application') || english.includes('assessment')) {
            return 'hard';
        }

        // Everything else
        return 'normal';
    }

    /**
     * Infer category from dialogue ID
     * @param {string} conversationId - Conversation/dialogue ID
     * @returns {string} - Category identifier
     */
    static inferCategoryFromDialogueId(conversationId) {
        return Constants.getCategoryFromDialogueId(conversationId);
    }
}

// Register with CCL App namespace if available
if (typeof window !== 'undefined' && window.CCLApp) {
    window.CCLApp.registerModule('vocabularyFormatter', VocabularyFormatter);
}

// Also make available globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.VocabularyFormatter = VocabularyFormatter;
}

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VocabularyFormatter;
}