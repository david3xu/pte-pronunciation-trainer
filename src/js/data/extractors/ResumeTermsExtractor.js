/**
 * ResumeTermsExtractor - Extracts resume terms with pronunciation guides from markdown files
 *
 * Parses resume-terms.md format:
 * term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
 */
class ResumeTermsExtractor {
    /**
     * Extract resume terms with pronunciation guides from markdown file
     * @param {string} filePath - Path to markdown file
     * @param {Object} fs - File system module (for Node.js)
     * @returns {Array} - Array of resume terms with pronunciation data
     */
    static async extract(filePath, fs = null) {
        console.log('    💼 Processing resume terms with pronunciation guides...');

        // Handle both Node.js and browser environments
        let content;
        if (fs && fs.existsSync) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Resume terms file not found: ${filePath}`);
            }
            content = fs.readFileSync(filePath, 'utf-8');
        } else {
            // Browser environment - would need fetch implementation
            throw new Error('Browser environment not yet supported for file extraction');
        }

        const lines = content.split('\n');
        const terms = [];
        let currentSection = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Section headers (## Section Name)
            if (trimmed.startsWith('## ')) {
                currentSection = trimmed.replace('## ', '').trim().toLowerCase().replace(/\s+/g, '-');
                continue;
            }

            // Skip main title
            if (trimmed.startsWith('# ')) continue;

            // Process terms with pronunciation guides
            // Format: term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
            const termMatch = trimmed.match(/^([^|]+)\s*\|\s*(.+)$/);
            if (termMatch) {
                const term = termMatch[1].trim();
                const pronunciationData = termMatch[2].trim();

                // Parse pronunciation data
                const pronunciationParts = pronunciationData.split('|');
                let britishIPA = '';
                let britishPhonetic = '';
                let americanIPA = '';
                let americanPhonetic = '';

                // Parse British pronunciation (first part)
                if (pronunciationParts[0]) {
                    const britishMatch = pronunciationParts[0].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
                    if (britishMatch) {
                        britishIPA = britishMatch[1];
                        britishPhonetic = britishMatch[2];
                    }
                }

                // Parse American pronunciation (second part)
                if (pronunciationParts[1]) {
                    const americanMatch = pronunciationParts[1].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
                    if (americanMatch) {
                        americanIPA = americanMatch[1];
                        americanPhonetic = americanMatch[2];
                    }
                }

                const termData = {
                    english: term,
                    chinese: '', // Resume terms don't have Chinese translations
                    difficulty: this.inferDifficulty(term),
                    phonetic: britishPhonetic || americanPhonetic,
                    ipa: britishIPA || americanIPA,
                    pronunciationGuide: {
                        british: { ipa: britishIPA, phonetic: britishPhonetic },
                        american: { ipa: americanIPA, phonetic: americanPhonetic }
                    },
                    source: 'resume-terms'
                };

                // Only add category if sections were found in the source
                if (currentSection !== null) {
                    termData.category = currentSection;
                }

                terms.push(termData);
            }
        }

        console.log(`    📊 Extracted ${terms.length} resume terms with pronunciation guides`);
        return terms;
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
    window.CCLApp.registerModule('resumeTermsExtractor', ResumeTermsExtractor);
}

// Also make available globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.ResumeTermsExtractor = ResumeTermsExtractor;
}

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResumeTermsExtractor;
}