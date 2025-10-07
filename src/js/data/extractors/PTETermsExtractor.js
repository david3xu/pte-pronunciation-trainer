/**
 * PTETermsExtractor - Extracts PTE terms with IPA pronunciation guides from markdown files
 *
 * Parses pte-fib-listening-with-ipa.md format:
 * term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
 */
class PTETermsExtractor {
  /**
   * Extract PTE terms with pronunciation guides from markdown file
   * @param {string} filePath - Path to markdown file
   * @param {Object} fs - File system module (for Node.js)
   * @returns {Array} - Array of PTE terms with pronunciation data
   */
  static async extract(filePath, fs = null) {

    // Handle both Node.js and browser environments
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
      const termData = this.parsePTETermLine(trimmedLine);
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
   */
  static parsePTETermLine(line) {
    // Match the format: number. term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);

    if (!match) {
      return null;
    }

    let [, termPart, britishData, americanData] = match;
    
    // Extract word type (n., v., adj., adv., etc.) if present
    let wordType = null;
    let term = termPart.trim();
    
    // Match word type patterns: "adj. word", "v. word", "n. word", "adv. word", etc.
    const wordTypeMatch = term.match(/^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.)\s+(.+)$/i);
    if (wordTypeMatch) {
      wordType = wordTypeMatch[1].toLowerCase(); // Store as lowercase for consistency
      term = wordTypeMatch[2].trim(); // Extract the actual word without prefix
    }

    // Parse British pronunciation data
    const britishMatch = britishData.match(/^\/(.+?)\/\s*—\s*sounds\s+like\s+\*\*(.+?)\*\*$/);
    const americanMatch = americanData.match(/^\/(.+?)\/\s*—\s+sounds\s+like\s+\*\*(.+?)\*\*$/);

    if (!britishMatch || !americanMatch) {
      return null;
    }

    const [, britishIPA, britishPhonetic] = britishMatch;
    const [, americanIPA, americanPhonetic] = americanMatch;

    const result = {
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
      category: 'pte-fib-listening',
      source: 'pte-fib-listening-with-ipa'
    };
    
    // Add wordType only if present (keeps data clean for entries without word types)
    if (wordType) {
      result.wordType = wordType;
    }
    
    return result;
  }

  /**
   * Infer difficulty level based on word characteristics
   */
  static inferDifficulty(word) {
    const length = word.length;
    const syllables = this.countSyllables(word);

    if (length <= 4 && syllables <= 2) {
      return 'easy';
    } else if (length <= 8 && syllables <= 3) {
      return 'normal';
    } else {
      return 'hard';
    }
  }

  /**
   * Count syllables in a word (approximate)
   */
  static countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PTETermsExtractor;
}
