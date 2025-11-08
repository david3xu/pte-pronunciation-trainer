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
export declare class PTETermsExtractor {
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
    static extract(filePath: string, fs?: FileSystem, options?: ExtractionOptions): Promise<PTETerm[]>;
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
    static parsePTETermLine(line: string, options?: ExtractionOptions): PTETerm | null;
    /**
     * Determine difficulty using DataSchema when available
     *
     * Delegates to central implementation for consistency
     *
     * @param word - The word to analyze
     * @returns Difficulty level ('easy', 'normal', or 'hard')
     */
    static inferDifficulty(word: string): string;
}
export default PTETermsExtractor;
//# sourceMappingURL=PTETermsExtractor.d.ts.map