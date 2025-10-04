/**
 * AIMLTermsExtractor - Extracts AI/ML terms with definitions and pronunciation from markdown files
 *
 * Parses terms in format:
 * Term | Definition | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
 */
class AIMLTermsExtractor {
    /**
     * Extract AI/ML terms with definitions and pronunciation from markdown file
     * @param {string} filePath - Path to markdown file
     * @param {Object} fs - File system module (for Node.js)
     * @returns {Array} - Array of AI/ML terms with definitions and pronunciation
     */
    static async extract(filePath, fs = null) {
        console.log('    🤖 Processing AI/ML terms with definitions and pronunciation...');

        // Handle both Node.js and browser environments
        let content;
        if (fs && fs.existsSync) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`AI/ML terms file not found: ${filePath}`);
            }
            content = fs.readFileSync(filePath, 'utf-8');
        } else {
            // Browser environment - would need fetch implementation
            throw new Error('Browser environment not yet supported for file extraction');
        }

        const lines = content.split('\n');
        const terms = [];
        let currentSection = null;
        let definitions = {};

        // First, collect definitions from temp.md
        try {
            const tempFilePath = filePath.replace('aiml-terms.md', '../temp.md');
            if (fs && fs.existsSync && fs.existsSync(tempFilePath)) {
                const tempContent = fs.readFileSync(tempFilePath, 'utf-8');
                const tempLines = tempContent.split('\n');
                let tempSection = null;

                for (const line of tempLines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    // Section headers
                    if (trimmed.match(/^##\s+(.+)$/)) {
                        tempSection = trimmed.replace(/^##\s+/, '').trim();
                        continue;
                    }

                    // Skip main title and other metadata
                    if (trimmed.startsWith('#') || trimmed.startsWith('*')) continue;

                    // Process terms with definitions
                    // Format: **Term**: Definition.
                    const termDefMatch = trimmed.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
                    if (termDefMatch) {
                        const term = termDefMatch[1].trim();
                        const definition = termDefMatch[2].trim();
                        definitions[term] = {
                            definition: definition,
                            category: tempSection || 'AI/ML Terms'
                        };
                    }
                }

                console.log(`    📖 Loaded ${Object.keys(definitions).length} definitions from temp.md`);
            } else {
                console.log('    ⚠️ temp.md not found, will not include definitions');
            }
        } catch (error) {
            console.error('    ⚠️ Error loading definitions:', error.message);
        }

        // Now process pronunciation data
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Section headers (## Section Name)
            if (trimmed.startsWith('## ')) {
                currentSection = trimmed.replace('## ', '').trim();
                continue;
            }

            // Skip main title or other headers
            if (trimmed.startsWith('# ')) continue;

            // Process terms with definition and pronunciation
            // Format: Term | Definition | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
            const termMatch = trimmed.match(/^([^|]+)\s*\|\s*(.+)$/);
            if (termMatch) {
                const term = termMatch[1].trim();
                const remainingData = termMatch[2].trim();

                // Parse the data parts (definition and pronunciations)
                const dataParts = remainingData.split('|');

                // Extract definition from the first part (if available in new format)
                let definition = '';
                let pronunciationParts = [];

                if (dataParts.length >= 3) {
                    // New format with definition included
                    definition = dataParts[0].trim();
                    // British and American pronunciations are in positions 1 and 2
                    pronunciationParts = [dataParts[1], dataParts[2]];
                } else if (dataParts.length === 2) {
                    // Old format without definition in the line
                    pronunciationParts = [dataParts[0], dataParts[1]];
                    // Use definition from temp.md if available
                    const definitionInfo = definitions[term] || {};
                    definition = definitionInfo.definition || '';
                } else if (dataParts.length === 1) {
                    // Single pronunciation part, assume British only
                    pronunciationParts = [dataParts[0]];
                    // Use definition from temp.md if available
                    const definitionInfo = definitions[term] || {};
                    definition = definitionInfo.definition || '';
                }

                let britishIPA = '';
                let britishPhonetic = '';
                let americanIPA = '';
                let americanPhonetic = '';

                // Parse British pronunciation
                if (pronunciationParts[0]) {
                    const britishMatch = pronunciationParts[0].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
                    if (britishMatch) {
                        britishIPA = britishMatch[1];
                        britishPhonetic = britishMatch[2];
                    }
                }

                // Parse American pronunciation
                if (pronunciationParts[1]) {
                    const americanMatch = pronunciationParts[1].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
                    if (americanMatch) {
                        americanIPA = americanMatch[1];
                        americanPhonetic = americanMatch[2];
                    }
                }

                const category = currentSection || 'AI/ML Terms';

                const termData = {
                    english: term,
                    definition: definition,
                    difficulty: this.inferDifficulty(term, definition),
                    category: category,
                    phonetic: britishPhonetic || americanPhonetic,
                    source: 'aiml-terms',
                    // Include pronunciation data
                    ipa: britishIPA || americanIPA,
                    pronunciationGuide: {
                        british: { ipa: britishIPA, phonetic: britishPhonetic },
                        american: { ipa: americanIPA, phonetic: americanPhonetic }
                    }
                };

                // Log definition to verify it's being extracted
                if (definition) {
                    console.log(`    📖 Extracted definition for "${term}": ${definition.substring(0, 50)}...`);
                }

                terms.push(termData);
            }
        }

        console.log(`    📊 Extracted ${terms.length} AI/ML terms with pronunciation`);
        return terms;
    }

    /**
     * Infer difficulty from English term and definition
     * @param {string} english - English term
     * @param {string} definition - Definition text
     * @returns {string} - Difficulty level
     */
    static inferDifficulty(english, definition) {
        if (!english) return 'normal';

        const words = english.trim().split(/\s+/).length;
        const length = english.length;
        const definitionLength = definition ? definition.length : 0;

        // Simple terms with short definitions
        if (words === 1 && length < 10 && definitionLength < 100) {
            return 'easy';
        }

        // Complex technical terms or long definitions
        if (words > 2 || length > 20 || definitionLength > 200 ||
            english.includes('Generation') ||
            english.includes('Architecture') ||
            english.includes('Learning') ||
            english.includes('Processing')) {
            return 'hard';
        }

        // Everything else
        return 'normal';
    }
}

// Register with CCL App namespace if available
if (typeof window !== 'undefined' && window.CCLApp) {
    window.CCLApp.registerModule('aimlTermsExtractor', AIMLTermsExtractor);
}

// Also make available globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.AIMLTermsExtractor = AIMLTermsExtractor;
}

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIMLTermsExtractor;
}