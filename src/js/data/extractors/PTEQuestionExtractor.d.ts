/**
 * PTEQuestionExtractor - Extracts question-answer data from ASQ markdown files
 *
 * Type-safe extractor for Answer Short Question (ASQ) practice questions
 *
 * Source Format (supports both):
 * Format A (with answers): 1. Question text? - Answer
 * Format B (without answers): 1. Question text?
 *
 * Output Format: Structured question objects with metadata
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
export interface QuestionExtractionOptions {
    encoding?: string;
}
/**
 * Question content structure
 */
export interface QuestionContent {
    question: string;
    answer: string;
    ipa: null;
}
/**
 * Question metadata
 */
export interface QuestionMetadata {
    category: string;
    difficulty: string;
    wordCount: number;
    tags: string[];
}
/**
 * Question item structure
 */
export interface QuestionItem {
    id: number;
    type: 'asq';
    content: QuestionContent;
    metadata: QuestionMetadata;
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
 * Extracted question dataset
 */
export interface QuestionDataset {
    meta: DatasetMeta;
    items: QuestionItem[];
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
 * PTEQuestionExtractor - Parses ASQ questions from markdown
 *
 * Extracts Answer Short Question items with optional answers
 * Infers difficulty based on word count
 * Categorizes questions by content keywords
 */
export declare class PTEQuestionExtractor {
    /**
     * Extract questions from markdown file
     *
     * @param filePath - Path to source markdown file
     * @param fs - File system module (Node.js only)
     * @param path - Path module (Node.js only)
     * @param options - Extraction options (encoding)
     * @returns Extracted dataset with metadata
     */
    static extract(filePath: string, fs: FileSystem, path: PathModule, options?: QuestionExtractionOptions): Promise<QuestionDataset>;
    /**
     * Parse questions from markdown content
     *
     * @param content - Markdown file content
     * @returns Parsed question items
     */
    static parseQuestions(content: string): QuestionItem[];
    /**
     * Count words in a question
     *
     * @param question - Question text
     * @returns Word count
     */
    static countWords(question: string): number;
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
     * Infer category from question content (basic heuristic)
     *
     * @param question - Question text
     * @returns Category
     */
    static inferCategory(question: string): string;
    /**
     * Extract tags from question (for future filtering)
     *
     * @param question - Question text
     * @returns Tags
     */
    static extractTags(question: string): string[];
    /**
     * Validate extracted dataset using DataSchema when available
     *
     * @param dataset - Dataset to validate
     * @returns Validation result
     */
    static validate(dataset: QuestionDataset): ValidationResult;
}
export default PTEQuestionExtractor;
//# sourceMappingURL=PTEQuestionExtractor.d.ts.map