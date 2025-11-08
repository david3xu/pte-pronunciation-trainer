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
export declare class SingleIPATermsExtractor {
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
    static extract(filePath: string, fs?: FileSystem, options?: ExtractionOptions): Promise<SingleIPATerm[]>;
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
    static parseSingleIPATermLine(line: string, options?: ExtractionOptions): SingleIPATerm | null;
    /**
     * Determine difficulty using DataSchema when available
     *
     * @param word - The word to analyze
     * @returns Difficulty level ('easy', 'normal', or 'hard')
     */
    static inferDifficulty(word: string): string;
}
export default SingleIPATermsExtractor;
//# sourceMappingURL=SingleIPATermsExtractor.d.ts.map