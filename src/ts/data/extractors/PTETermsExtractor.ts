/**
 * PTETermsExtractor - Extracts PTE terms with IPA pronunciation guides
 *
 * Type-safe markdown parser for PTE vocabulary with dual IPA format
 * Parses format: term | /British IPA/ — sounds like **PHONETIC** | /American IPA/ — sounds like **PHONETIC**
 */

/**
 * File system interface (Node.js compatibility)
 */
interface FileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: string): string;
}

/**
 * Extraction options
 */
export interface ExtractionOptions {
  category?: string;
  source?: string;
}

/**
 * Pronunciation data (British and American)
 */
export interface PronunciationData {
  british: {
    ipa: string;
    phonetic: string;
  };
  american: {
    ipa: string;
    phonetic: string;
  };
}

/**
 * Extracted PTE term structure
 */
export interface PTETerm {
  english: string;
  pronunciation: PronunciationData;
  difficulty: string;
  category: string;
  source: string;
  wordType?: string;
}

/**
 * PTETermsExtractor - Parses PTE vocabulary markdown files
 *
 * Extracts terms with dual IPA pronunciation (British + American)
 * Supports word type prefixes (n., v., adj., etc.)
 */
export class PTETermsExtractor {
  /**
   * Extract vocabulary terms from a PTE markdown file with IPA
   *
   * Parses lines in format: "1. pos. word | /ipa/ — sounds like PHONETIC | /ipa/ — sounds like PHONETIC"
   *
   * @param filePath - Path to the source markdown file
   * @param fs - File system module (Node.js only)
   * @param options - Extraction options (category, source)
   * @returns Array of term objects with IPA pronunciations
   */
  static async extract(
    filePath: string,
    fs?: FileSystem,
    options: ExtractionOptions = {}
  ): Promise<PTETerm[]> {
    // Handle both Node.js and browser environments
    let content: string;

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
    const terms: PTETerm[] = [];

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
   *
   * Format: "1. [wordType] term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**"
   * Example: "1. adj. structural | /ˈstrʌktʃərəl/ — sounds like **STRUHK-chuh-rul** | ..."
   *
   * @param line - The line to parse
   * @param options - Parsing options (category, source)
   * @returns Term object or null if line is invalid
   */
  static parsePTETermLine(line: string, options: ExtractionOptions = {}): PTETerm | null {
    // Match the format: number. term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);

    if (!match) {
      return null;
    }

    let [, termPart, britishData, americanData] = match;

    // Extract word type (n., v., adj., adv., num., abbr., etc.) if present
    let wordType: string | null = null;
    let term = termPart!.trim();

    // Match word type patterns
    const wordTypeMatch = term.match(/^(n\.|v\.|adj\.|adv\.|num\.|abbr\.|prep\.|conj\.|pron\.|interj\.)\s+(.+)$/i);
    if (wordTypeMatch) {
      wordType = wordTypeMatch[1]!.toLowerCase();
      term = wordTypeMatch[2]!.trim();
    }

    // Parse British pronunciation data
    const britishMatch = britishData!.match(/^\/(.+?)\/\s*—\s*sounds\s+like\s+\*\*(.+?)\*\*$/);
    const americanMatch = americanData!.match(/^\/(.+?)\/\s*—\s+sounds\s+like\s+\*\*(.+?)\*\*$/);

    if (!britishMatch || !americanMatch) {
      return null;
    }

    const [, britishIPA, britishPhonetic] = britishMatch;
    const [, americanIPA, americanPhonetic] = americanMatch;

    // Create initial result object with extracted data
    const extractedData: any = {
      english: term,
      pronunciation: {
        british: {
          ipa: britishIPA!.trim(),
          phonetic: britishPhonetic!.trim()
        },
        american: {
          ipa: americanIPA!.trim(),
          phonetic: americanPhonetic!.trim()
        }
      },
      difficulty: this.inferDifficulty(term),
      category: options.category || 'pte-vocabulary',
      source: options.source || 'pte-vocabulary-with-ipa'
    };

    // Add wordType only if present
    if (wordType) {
      extractedData.wordType = wordType;
    }

    // Use DataSchema for standardization if available
    if (typeof window !== 'undefined' && (window as any).dataSchema) {
      try {
        const dataSchema = (window as any).dataSchema;
        return dataSchema.standardizeVocabulary(extractedData, extractedData.source);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ PTETermsExtractor: Could not standardize term "${term}" with DataSchema: ${errorMessage}`);
        return extractedData as PTETerm;
      }
    }

    // Return raw result if DataSchema not available
    return extractedData as PTETerm;
  }

  /**
   * Determine difficulty using DataSchema when available
   *
   * Delegates to central implementation for consistency
   *
   * @param word - The word to analyze
   * @returns Difficulty level ('easy', 'normal', or 'hard')
   */
  static inferDifficulty(word: string): string {
    // Use DataSchema if available (single source of truth)
    if (typeof window !== 'undefined' && (window as any).dataSchema) {
      const dataSchema = (window as any).dataSchema;
      return dataSchema.inferDifficulty(word);
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

// Default export
export default PTETermsExtractor;
