/**
 * PTETermsExtractor - Extracts PTE terms with IPA pronunciation guides from markdown files
 *
 * Parses pte-fib-listening-with-ipa.md format:
 * term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
 */
class PTETermsExtractor {
  /**
   * Extract vocabulary terms from a PTE markdown file with IPA.
   * Parses lines in format: "1. pos. word | /ipa/ — sounds like PHONETIC | /ipa/ — sounds like PHONETIC"
   * @param {string} filePath - Path to the source markdown file
   * @param {Object} fs - File system module (for compatibility)
   * @param {Object} options - Extraction options
   * @param {string} options.category - The category/book name (e.g., 'pte-beginner')
   * @param {string} options.source - The source file identifier (e.g., 'pte-beginner-vocabulary-with-ipa')
   * @returns {Array<Object>} Array of term objects with IPA pronunciations
   */
  static async extract(filePath, fs, options = {}) {    // Handle both Node.js and browser environments
    let content;
    if (fs && fs.existsSync) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`PTE terms file not found: ${filePath}`);
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
      const trimmedLine = line.trim();

      // Skip empty lines, headers, and metadata
      if (!trimmedLine ||
        trimmedLine.startsWith('#') ||
        trimmedLine.startsWith('**') ||
        trimmedLine.includes('Mastered:') ||
        trimmedLine.includes('默认排序') ||
        trimmedLine.includes('全部') ||
        trimmedLine.includes('This vocabulary booklet') ||
        trimmedLine.includes('Essential vocabulary') ||
        trimmedLine.includes('Co-words')) {
        continue;
      }

      // Extract term with IPA pronunciation data
      const termData = this.parsePTETermLine(trimmedLine, options);
      if (termData) {
        terms.push(termData);
      }
    }

    return terms;
  }

  /**
   * Parse a single PTE term line with IPA pronunciation data
   * Format: "1. [wordType] term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**"
   * Example: "1. adj. structural | /ˈstrʌktʃərəl/ — sounds like **STRUHK-chuh-rul** | ..."
   * @param {string} line - The line to parse
   * @param {Object} options - Parsing options
   * @param {string} options.category - The category/book name
   * @param {string} options.source - The source file identifier
   * @returns {Object|null} Term object or null if line is invalid
   */
  static parsePTETermLine(line, options = {}) {
    // Match the format: number. term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);

    if (!match) {
      return null;
    }

    let [, termPart, britishData, americanData] = match;
    
    // Extract word type (n., v., adj., adv., num., abbr., etc.) if present
    let wordType = null;
    let term = termPart.trim();
    
    // Match word type patterns: "adj. word", "v. word", "n. word", "adv. word", "num. word", "abbr. word", etc.
    const wordTypeMatch = term.match(/^(n\.|v\.|adj\.|adv\.|num\.|abbr\.|prep\.|conj\.|pron\.|interj\.)\s+(.+)$/i);
    if (wordTypeMatch) {
      wordType = wordTypeMatch[1].toLowerCase(); // Store as lowercase for consistency
      term = wordTypeMatch[2].trim(); // Extract the actual word without prefix (removes "num. ", "abbr. ", etc.)
    }

    // Parse British pronunciation data
    const britishMatch = britishData.match(/^\/(.+?)\/\s*—\s*sounds\s+like\s+\*\*(.+?)\*\*$/);
    const americanMatch = americanData.match(/^\/(.+?)\/\s*—\s+sounds\s+like\s+\*\*(.+?)\*\*$/);

    if (!britishMatch || !americanMatch) {
      return null;
    }

    const [, britishIPA, britishPhonetic] = britishMatch;
    const [, americanIPA, americanPhonetic] = americanMatch;

    // Create initial result object with extracted data
    const extractedData = {
      english: term, // Clean word without word type prefix
      pronunciation: {
        british: {
          ipa: britishIPA.trim(),
          phonetic: britishPhonetic.trim()
        },
        american: {
          ipa: americanIPA.trim(),
          phonetic: americanPhonetic.trim()
        }
      },
      difficulty: this.inferDifficulty(term),
      category: options.category || 'pte-vocabulary',
      source: options.source || 'pte-vocabulary-with-ipa'
    };

    // Add wordType only if present (keeps data clean for entries without word types)
    if (wordType) {
      extractedData.wordType = wordType;
    }

    // Use DataSchema for standardization if available (single source of truth)
    if (typeof window !== 'undefined' && window.dataSchema) {
      try {
        // Standardize through DataSchema to ensure consistent structure
        return window.dataSchema.standardizeVocabulary(extractedData, extractedData.source);
      } catch (error) {
        console.warn(`⚠️ PTETermsExtractor: Could not standardize term "${term}" with DataSchema: ${error.message}`);
        // Fall back to raw data if standardization fails
        return extractedData;
      }
    }

    // Return raw result if DataSchema not available
    return extractedData;
  }

  /**
   * Determine difficulty using DataSchema when available
   * This delegates to the central implementation to ensure consistency
   *
   * @param {string} word - The word to analyze
   * @returns {string} Difficulty level ('easy', 'normal', or 'hard')
   */
  static inferDifficulty(word) {
    // Use DataSchema if available (single source of truth)
    if (typeof window !== 'undefined' && window.dataSchema) {
      return window.dataSchema.inferDifficulty(word);
    }

    // Minimal fallback for environments where DataSchema isn't available
    if (!word) return 'normal';
    if (word.length <= 5) return 'easy';
    if (word.length <= 9) return 'normal';
    return 'hard';
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PTETermsExtractor;
}
