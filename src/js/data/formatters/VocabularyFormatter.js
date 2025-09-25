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
        if (!conversationId) return 'general';

        const id = String(conversationId);

        // Group by dialogue ID ranges (common CCL pattern)
        if (id.startsWith('702')) {
            if (id >= '70240' && id <= '70249') return 'group-240s';
            if (id >= '70230' && id <= '70239') return 'group-230s';
            if (id >= '70220' && id <= '70229') return 'group-220s';
            if (id >= '70210' && id <= '70219') return 'group-210s';
            if (id >= '70200' && id <= '70209') return 'group-200s';
            if (id >= '70250' && id <= '70259') return 'group-250s';
        }

        if (id.startsWith('701')) {
            if (id >= '70190' && id <= '70199') return 'group-190s';
            if (id >= '70180' && id <= '70189') return 'group-180s';
            if (id >= '70170' && id <= '70179') return 'group-170s';
            if (id >= '70160' && id <= '70169') return 'group-160s';
            if (id >= '70150' && id <= '70159') return 'group-150s';
        }

        if (id.startsWith('700')) {
            if (id >= '70090' && id <= '70099') return 'group-090s';
            if (id >= '70080' && id <= '70089') return 'group-080s';
            if (id >= '70070' && id <= '70079') return 'group-070s';
            if (id >= '70060' && id <= '70069') return 'group-060s';
            if (id >= '70050' && id <= '70059') return 'group-050s';
            if (id >= '70040' && id <= '70049') return 'group-040s';
            if (id >= '70030' && id <= '70039') return 'group-030s';
            if (id >= '70020' && id <= '70029') return 'group-020s';
            if (id >= '70010' && id <= '70019') return 'group-010s';
            if (id >= '70000' && id <= '70009') return 'group-000s';
        }

        return 'general';
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