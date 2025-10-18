/**
 * SingleIPATermsExtractor - Extracts PTE terms with single IPA pronunciation from markdown files
 *
 * Parses format with single IPA pronunciation (no British/American split):
 * number. term | /IPA/ — sounds like **PHONETIC**
 */
class SingleIPATermsExtractor {
  /**
   * Extract vocabulary terms from a markdown file with single IPA format.
   * Parses lines in format: "1. pos. word | /ipa/ — sounds like **PHONETIC**"
   * @param {string} filePath - Path to the source markdown file
   * @param {Object} fs - File system module (for compatibility)
   * @param {Object} options - Extraction options
   * @param {string} options.category - The category/book name (e.g., 'pte-rs-wfd-vocab')
   * @param {string} options.source - The source file identifier (e.g., 'pte-rs-wfd-vocabulary-with-ipa')
   * @returns {Array<Object>} Array of term objects with IPA pronunciations
   */
  static async extract(filePath, fs, options = {}) {
    // Handle both Node.js and browser environments
    let content;
    if (fs && fs.existsSync) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Terms file not found: ${filePath}`);
      }
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      // Browser environment - would need fetch implementation
      throw new Error('Browser environment not yet supported for file extraction');
    }

    const lines = content.split('\n');
    const terms = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines, headers, and metadata
      if (!trimmedLine ||
        trimmedLine.startsWith('#') ||
        trimmedLine.startsWith('**') ||
        trimmedLine.includes('Mastered:') ||
        trimmedLine.includes('默认排序') ||
        trimmedLine.includes('全部') ||
        trimmedLine.includes('This vocabulary') ||
        trimmedLine.includes('Essential vocabulary')) {
        continue;
      }

      // Extract term with IPA pronunciation data
      const termData = this.parseSingleIPATermLine(trimmedLine, options);
      if (termData) {
        terms.push(termData);
      }
    }

    return terms;
  }

  /**
   * Parse a single term line with single IPA pronunciation
   * Format: "1. [wordType] term | /IPA/ — sounds like **PHONETIC**"
   * Example: "1. academic | /ˌækəˈdemɪk/ — sounds like **AK-uh-DEM-ik**"
   * @param {string} line - The line to parse
   * @param {Object} options - Parsing options
   * @param {string} options.category - The category/book name
   * @param {string} options.source - The source file identifier
   * @returns {Object|null} Term object or null if line is invalid
   */
  static parseSingleIPATermLine(line, options = {}) {
    // Match the format: number. term | /IPA/ — sounds like **PHONETIC**
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+)$/);

    if (!match) {
      return null;
    }

    let [, termPart, ipaData] = match;

    // Extract word type (n., v., adj., adv., num., abbr., etc.) if present
    let wordType = null;
    let term = termPart.trim();

    // Match word type patterns: "adj. word", "v. word", "n. word", etc.
    const wordTypeMatch = term.match(/^(n\.|v\.|adj\.|adv\.|num\.|abbr\.|prep\.|conj\.|pron\.|interj\.)\s+(.+)$/i);
    if (wordTypeMatch) {
      wordType = wordTypeMatch[1].toLowerCase();
      term = wordTypeMatch[2].trim();
    }

    // Parse IPA pronunciation data
    const ipaMatch = ipaData.match(/^\/(.+?)\/\s*—\s*sounds\s+like\s+\*\*(.+?)\*\*$/);

    if (!ipaMatch) {
      return null;
    }

    const [, ipa, phonetic] = ipaMatch;

    // Create result object with extracted data
    const extractedData = {
      english: term,
      pronunciation: {
        ipa: ipa.trim(),
        phonetic: phonetic.trim()
      },
      difficulty: this.inferDifficulty(term),
      category: options.category || 'pte-vocabulary',
      source: options.source || 'pte-vocabulary-with-ipa'
    };

    // Add wordType only if present
    if (wordType) {
      extractedData.wordType = wordType;
    }

    // Use DataSchema for standardization if available (single source of truth)
    if (typeof window !== 'undefined' && window.dataSchema) {
      try {
        return window.dataSchema.standardizeVocabulary(extractedData, extractedData.source);
      } catch (error) {
        console.warn(`⚠️ SingleIPATermsExtractor: Could not standardize term "${term}" with DataSchema: ${error.message}`);
        return extractedData;
      }
    }

    return extractedData;
  }

  /**
   * Determine difficulty using DataSchema when available
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
  module.exports = SingleIPATermsExtractor;
}
