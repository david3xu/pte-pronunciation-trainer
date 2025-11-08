/**
 * PTESentenceExtractor - Extracts sentence data from RS/WFD markdown files
 *
 * Type-safe extractor for Repeat Sentence (RS) and Write From Dictation (WFD) practice sentences
 *
 * Source Format: 1. The archeologist's new discoveries...
 * Output Format: Structured sentence objects with metadata
 */
/**
 * File system interface (Node.js compatibility)
 */
interface FileSystem {
    readFileSync(path: string, encoding: string): string;
}
/**
 * Path module interface (Node.js compatibility)
 */
interface PathModule {
    basename(path: string): string;
}
/**
 * Extraction options
 */
export interface SentenceExtractionOptions {
    type: 'rs' | 'wfd';
    encoding?: string;
}
/**
 * Sentence content structure
 */
export interface SentenceContent {
    sentence: string;
    ipa: null;
}
/**
 * Sentence metadata
 */
export interface SentenceMetadata {
    category: string;
    difficulty: string;
    wordCount: number;
    tags: string[];
}
/**
 * Sentence item structure
 */
export interface SentenceItem {
    id: number;
    type: 'rs' | 'wfd';
    content: SentenceContent;
    metadata: SentenceMetadata;
}
/**
 * Dataset metadata
 */
export interface DatasetMeta {
    type: string;
    version: string;
    count: number;
    updated: string;
    source: string;
    description: string;
}
/**
 * Extracted sentence dataset
 */
export interface SentenceDataset {
    meta: DatasetMeta;
    items: SentenceItem[];
}
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
}
/**
 * PTESentenceExtractor - Parses practice sentences from markdown
 *
 * Extracts RS (Repeat Sentence) and WFD (Write From Dictation) sentences
 * Infers difficulty based on word count
 * Categorizes sentences by content keywords
 */
export declare class PTESentenceExtractor {
    /**
     * Extract sentences from markdown file
     *
     * @param filePath - Path to source markdown file
     * @param fs - File system module (Node.js only)
     * @param path - Path module (Node.js only)
     * @param options - Extraction options (type: 'rs' or 'wfd', encoding)
     * @returns Extracted dataset with metadata
     */
    static extract(filePath: string, fs: FileSystem, path: PathModule, options: SentenceExtractionOptions): Promise<SentenceDataset>;
    /**
     * Parse sentences from markdown content
     *
     * @param content - Markdown file content
     * @param type - Dataset type ('rs' or 'wfd')
     * @returns Parsed sentence items
     */
    static parseSentences(content: string, type: 'rs' | 'wfd'): SentenceItem[];
    /**
     * Count words in a sentence
     *
     * @param sentence - Sentence text
     * @returns Word count
     */
    static countWords(sentence: string): number;
    /**
     * Infer difficulty based on word count
     *
     * Uses Config-driven thresholds when available through DataSchema
     * Thresholds: ≤8 easy, ≤12 normal, 13+ hard
     *
     * @param wordCount - Number of words
     * @returns Difficulty level ('easy', 'normal', 'hard')
     */
    static inferDifficulty(wordCount: number): string;
    /**
     * Infer category from sentence content (basic heuristic)
     *
     * @param sentence - Sentence text
     * @returns Category
     */
    static inferCategory(sentence: string): string;
    /**
     * Extract tags from sentence (for future filtering)
     *
     * @param sentence - Sentence text
     * @returns Tags
     */
    static extractTags(sentence: string): string[];
    /**
     * Validate extracted dataset using DataSchema when available
     *
     * @param dataset - Dataset to validate
     * @returns Validation result
     */
    static validate(dataset: SentenceDataset): ValidationResult;
}
export default PTESentenceExtractor;
//# sourceMappingURL=PTESentenceExtractor.d.ts.map