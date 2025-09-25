/**
 * ChineseEnglishExtractor - Extracts Chinese-English word pairs from markdown files
 *
 * Parses english-chinese-word-pairs.md format:
 * english | chinese | uk_pronunciation | us_pronunciation
 */
class ChineseEnglishExtractor {
    /**
     * Extract Chinese-English word pairs from markdown file
     * @param {string} filePath - Path to markdown file
     * @param {Object} fs - File system module (for Node.js)
     * @returns {Array} - Array of Chinese-English pairs
     */
    static async extract(filePath, fs = null) {
        console.log('    🈯 Processing Chinese-English word pairs...');

        // Handle both Node.js and browser environments
        let content;
        if (fs && fs.existsSync) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Chinese-English file not found: ${filePath}`);
            }
            content = fs.readFileSync(filePath, 'utf-8');
        } else {
            // Browser environment - would need fetch implementation
            throw new Error('Browser environment not yet supported for file extraction');
        }

        const lines = content.split('\n');
        const pairs = [];
        let currentCategory = 'general';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Category headers
            if (trimmed.match(/^#+ .+/)) {
                const categoryMatch = trimmed.match(/^#+\s*(.+?)(?:\s+词汇表|\s+Vocabulary)?/i);
                if (categoryMatch) {
                    currentCategory = this.normalizeCategory(categoryMatch[1]);
                }
                continue;
            }

            // Skip table headers and separators
            if (trimmed.includes('English') && trimmed.includes('Chinese')) continue;
            if (trimmed.match(/^[\|\-\s]+$/)) continue;

            // Skip dialogue IDs (numbers only)
            if (trimmed.match(/^\d+$/)) continue;

            // Parse pipe-delimited format: english | chinese | uk_pronunciation | us_pronunciation
            if (trimmed.includes(' | ')) {
                const parts = trimmed.split(' | ');
                if (parts.length >= 2) {
                    const english = parts[0].trim();
                    const chinese = parts[1].trim();
                    const ukPronunciation = parts[2] ? parts[2].trim() : '';
                    const usPronunciation = parts[3] ? parts[3].trim() : '';

                    if (english && chinese && english !== 'English' && chinese !== 'Chinese') {
                        pairs.push({
                            english,
                            chinese,
                            ukPronunciation,
                            usPronunciation,
                            difficulty: this.inferDifficulty(english),
                            category: currentCategory,
                            source: 'chinese-english-pairs'
                        });
                    }
                }
            }

            // Also support table format for backward compatibility: | English | Chinese |
            const tableMatch = trimmed.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
            if (tableMatch) {
                const english = tableMatch[1].trim();
                const chinese = tableMatch[2].trim();

                if (english && chinese && english !== 'English' && chinese !== 'Chinese') {
                    pairs.push({
                        english,
                        chinese,
                        difficulty: this.inferDifficulty(english),
                        category: currentCategory,
                        source: 'chinese-english-pairs'
                    });
                }
            }
        }

        console.log(`    📊 Extracted ${pairs.length} Chinese-English pairs`);
        return pairs;
    }

    /**
     * Normalize category name for consistency
     * @param {string} category - Raw category name
     * @returns {string} - Normalized category
     */
    static normalizeCategory(category) {
        if (!category) return 'general';

        return category
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 30) || 'general';
    }

    /**
     * Infer difficulty from English text
     * @param {string} english - English text
     * @returns {string} - Difficulty level
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
}

// Register with CCL App namespace if available
if (typeof window !== 'undefined' && window.CCLApp) {
    window.CCLApp.registerModule('chineseEnglishExtractor', ChineseEnglishExtractor);
}

// Also make available globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.ChineseEnglishExtractor = ChineseEnglishExtractor;
}

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChineseEnglishExtractor;
}