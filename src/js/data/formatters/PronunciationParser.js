/**
 * PronunciationParser - Handles pronunciation data parsing and formatting
 *
 * Parses various pronunciation formats:
 * - /IPA/ — sounds like **PHONETIC** (from english-chinese-word-pairs.md)
 * - Direct IPA and phonetic fields
 * - Legacy pronunciation formats
 */
class PronunciationParser {
    /**
     * Parse pronunciation string format: /IPA/ — sounds like **PHONETIC**
     * @param {string} pronunciationStr - Raw pronunciation string
     * @returns {Object|null} - { ipa, phonetic } or null if no data
     */
    static parsePronunciationString(pronunciationStr) {
        if (!pronunciationStr || pronunciationStr.trim() === '') {
            return null;
        }

        const str = pronunciationStr.trim();

        // Extract IPA notation (between forward slashes)
        const ipaMatch = str.match(/\/([^\/]+)\//);
        const ipa = ipaMatch ? ipaMatch[1] : '';

        // Extract phonetic spelling (between ** **)
        const phoneticMatch = str.match(/\*\*([^*]+)\*\*/);
        const phonetic = phoneticMatch ? phoneticMatch[1] : '';

        // Return null if no useful data found
        if (!ipa && !phonetic) {
            return null;
        }

        return {
            ipa: ipa,
            phonetic: phonetic
        };
    }

    /**
     * Create standardized pronunciation guide from UK/US pronunciation data
     * @param {string} ukPronunciation - UK pronunciation string
     * @param {string} usPronunciation - US pronunciation string
     * @returns {Object|null} - Standardized pronunciation guide
     */
    static createPronunciationGuide(ukPronunciation, usPronunciation) {
        const ukData = this.parsePronunciationString(ukPronunciation);
        const usData = this.parsePronunciationString(usPronunciation);

        if (!ukData && !usData) {
            return null;
        }

        return {
            british: ukData,
            american: usData
        };
    }

    /**
     * Extract primary pronunciation data (IPA and phonetic) from various sources
     * @param {Object} word - Word object with pronunciation data
     * @returns {Object} - { ipa, phonetic, pronunciationGuide }
     */
    static extractPronunciationData(word) {
        let ipa = '';
        let phonetic = '';
        let pronunciationGuide = null;

        // Handle Chinese-English pronunciation data
        if (word.ukPronunciation || word.usPronunciation) {
            pronunciationGuide = this.createPronunciationGuide(
                word.ukPronunciation,
                word.usPronunciation
            );

            // Set primary from UK pronunciation
            if (pronunciationGuide && pronunciationGuide.british) {
                ipa = pronunciationGuide.british.ipa || '';
                phonetic = pronunciationGuide.british.phonetic || '';
            }
        }

        // Handle direct pronunciation fields
        if (word.ipa || word.phonetic) {
            ipa = word.ipa || ipa;
            phonetic = word.phonetic || phonetic;
        }

        // Handle existing pronunciationGuide
        if (word.pronunciationGuide) {
            pronunciationGuide = word.pronunciationGuide;
        }

        return {
            ipa,
            phonetic,
            pronunciationGuide
        };
    }
}

// Register with CCL App namespace if available
if (typeof window !== 'undefined' && window.CCLApp) {
    window.CCLApp.registerModule('pronunciationParser', PronunciationParser);
}

// Also make available globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.PronunciationParser = PronunciationParser;
}

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PronunciationParser;
}