/**
 * SingleIPATermsExtractor - Extracts PTE terms with single IPA pronunciation
 *
 * Type-safe markdown parser for PTE vocabulary with single IPA format
 * Parses format: number. term | /IPA/ — sounds like **PHONETIC**
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
 * Single IPA pronunciation data
 */
export interface SingleIPAPronunciation {
  ipa: string;
  phonetic: string;
}

/**
 * Extracted term structure with single IPA
 */
export interface SingleIPATerm {
  english: string;
  pronunciation: SingleIPAPronunciation;
  difficulty: string;
  category: string;
  source: string;
  wordType?: string;
}

/**
 * SingleIPATermsExtractor - Parses vocabulary with single IPA format
 *
 * Extracts terms with single IPA pronunciation (no British/American split)
 * Supports word type prefixes (n., v., adj., etc.)
 */
export class SingleIPATermsExtractor {
  /**
   * Extract vocabulary terms from markdown file with single IPA format
   *
   * Parses lines in format: "1. pos. word | /ipa/ — sounds like **PHONETIC**"
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
  ): Promise<SingleIPATerm[]> {
    // Handle both Node.js and browser environments
    let content: string;

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
    const terms: SingleIPATerm[] = [];

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
   *
   * Format: "1. [wordType] term | /IPA/ — sounds like **PHONETIC**"
   * Example: "1. academic | /ˌækəˈdemɪk/ — sounds like **AK-uh-DEM-ik**"
   *
   * @param line - The line to parse
   * @param options - Parsing options (category, source)
   * @returns Term object or null if line is invalid
   */
  static parseSingleIPATermLine(line: string, options: ExtractionOptions = {}): SingleIPATerm | null {
    // Match the format: number. term | /IPA/ — sounds like **PHONETIC**
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+)$/);

    if (!match) {
      return null;
    }

    let [, termPart, ipaData] = match;

    // Extract word type (n., v., adj., adv., num., abbr., etc.) if present
    let wordType: string | null = null;
    let term = termPart!.trim();

    // Match word type patterns
    const wordTypeMatch = term.match(/^(n\.|v\.|adj\.|adv\.|num\.|abbr\.|prep\.|conj\.|pron\.|interj\.)\s+(.+)$/i);
    if (wordTypeMatch) {
      wordType = wordTypeMatch[1]!.toLowerCase();
      term = wordTypeMatch[2]!.trim();
    }

    // Parse IPA pronunciation data
    const ipaMatch = ipaData!.match(/^\/(.+?)\/\s*—\s*sounds\s+like\s+\*\*(.+?)\*\*$/);

    if (!ipaMatch) {
      return null;
    }

    const [, ipa, phonetic] = ipaMatch;

    // Create result object with extracted data
    const extractedData: any = {
      english: term,
      pronunciation: {
        ipa: ipa!.trim(),
        phonetic: phonetic!.trim()
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
        console.warn(`⚠️ SingleIPATermsExtractor: Could not standardize term "${term}" with DataSchema: ${errorMessage}`);
        return extractedData as SingleIPATerm;
      }
    }

    return extractedData as SingleIPATerm;
  }

  /**
   * Determine difficulty using DataSchema when available
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
  module.exports = SingleIPATermsExtractor;
}

// Default export
export default SingleIPATermsExtractor;
