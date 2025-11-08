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
  ipa: null;  // No IPA for sentences - use TTS at runtime
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
export class PTESentenceExtractor {
  /**
   * Extract sentences from markdown file
   *
   * @param filePath - Path to source markdown file
   * @param fs - File system module (Node.js only)
   * @param path - Path module (Node.js only)
   * @param options - Extraction options (type: 'rs' or 'wfd', encoding)
   * @returns Extracted dataset with metadata
   */
  static async extract(
    filePath: string,
    fs: FileSystem,
    path: PathModule,
    options: SentenceExtractionOptions
  ): Promise<SentenceDataset> {
    const { type, encoding = 'utf-8' } = options;

    if (!type || !['rs', 'wfd'].includes(type)) {
      throw new Error(`Invalid type: ${type}. Must be 'rs' or 'wfd'`);
    }

    try {
      console.log(`📖 Reading file: ${filePath}`);
      const content = fs.readFileSync(filePath, encoding);

      console.log(`🔍 Parsing ${type.toUpperCase()} sentences...`);
      const items = this.parseSentences(content, type);

      console.log(`✅ Extracted ${items.length} sentences`);

      return {
        meta: {
          type,
          version: '1.0',
          count: items.length,
          updated: new Date().toISOString().split('T')[0]!,
          source: path.basename(filePath),
          description: type === 'rs' ? 'PTE Repeat Sentence practice sentences' : 'PTE Write From Dictation sentences'
        },
        items
      };
    } catch (error) {
      console.error(`❌ Error extracting sentences:`, error);
      throw error;
    }
  }

  /**
   * Parse sentences from markdown content
   *
   * @param content - Markdown file content
   * @param type - Dataset type ('rs' or 'wfd')
   * @returns Parsed sentence items
   */
  static parseSentences(content: string, type: 'rs' | 'wfd'): SentenceItem[] {
    const items: SentenceItem[] = [];
    const lines = content.split('\n');

    // Regex to match numbered sentences: "1. Sentence text..."
    const sentenceRegex = /^(\d+)\.\s+(.+)$/;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines, headers, separators
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('**')) {
        continue;
      }

      const match = trimmed.match(sentenceRegex);
      if (match) {
        const [, numberStr, sentenceText] = match;
        const id = parseInt(numberStr!, 10);

        // Extract sentence
        const sentence = sentenceText!.trim();

        // Calculate word count
        const wordCount = this.countWords(sentence);

        // Infer difficulty from word count
        const difficulty = this.inferDifficulty(wordCount);

        // Infer category
        const category = this.inferCategory(sentence);

        items.push({
          id,
          type,
          content: {
            sentence,
            ipa: null
          },
          metadata: {
            category,
            difficulty,
            wordCount,
            tags: this.extractTags(sentence)
          }
        });
      }
    }

    return items;
  }

  /**
   * Count words in a sentence
   *
   * @param sentence - Sentence text
   * @returns Word count
   */
  static countWords(sentence: string): number {
    return sentence.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Infer difficulty based on word count
   *
   * Uses Config-driven thresholds when available through DataSchema
   * Thresholds: ≤8 easy, ≤12 normal, 13+ hard
   *
   * @param wordCount - Number of words
   * @returns Difficulty level ('easy', 'normal', 'hard')
   */
  static inferDifficulty(wordCount: number): string {
    // Use DataSchema and Config if available (single source of truth)
    if (typeof window !== 'undefined' && (window as any).dataSchema) {
      try {
        const dataSchema = (window as any).dataSchema;
        // Create a mock sentence of appropriate length for difficulty inference
        const mockSentence = "word ".repeat(wordCount).trim();
        return dataSchema.inferDifficulty(mockSentence);
      } catch (error) {
        // Silent fallback - use defaults below
      }
    }

    // Fallback thresholds if DataSchema not available
    if (wordCount <= 8) return 'easy';
    if (wordCount <= 12) return 'normal';
    return 'hard';
  }

  /**
   * Infer category from sentence content (basic heuristic)
   *
   * @param sentence - Sentence text
   * @returns Category
   */
  static inferCategory(sentence: string): string {
    const lowerSentence = sentence.toLowerCase();

    // Academic indicators
    if (lowerSentence.match(/\b(research|study|university|academic|theory|hypothesis|experiment|scholar)\b/)) {
      return 'academic';
    }

    // Science indicators
    if (lowerSentence.match(/\b(science|chemical|biology|physics|scientist|laboratory|molecule)\b/)) {
      return 'science';
    }

    // Business indicators
    if (lowerSentence.match(/\b(business|company|market|profit|customer|employee|management)\b/)) {
      return 'business';
    }

    // Technology indicators
    if (lowerSentence.match(/\b(technology|computer|software|digital|internet|data|system)\b/)) {
      return 'technology';
    }

    // History/Geography indicators
    if (lowerSentence.match(/\b(history|ancient|civilization|century|empire|country|continent|geography)\b/)) {
      return 'history-geography';
    }

    // Default category
    return 'general';
  }

  /**
   * Extract tags from sentence (for future filtering)
   *
   * @param sentence - Sentence text
   * @returns Tags
   */
  static extractTags(sentence: string): string[] {
    const tags: string[] = [];
    const lowerSentence = sentence.toLowerCase();

    // Add tags based on content
    if (lowerSentence.includes('?')) tags.push('question');
    if (lowerSentence.match(/\b(however|therefore|thus|consequently|moreover)\b/)) tags.push('complex');
    if (lowerSentence.match(/\b(first|second|third|finally)\b/)) tags.push('sequential');
    if (lowerSentence.match(/\b(important|essential|crucial|vital|significant)\b/)) tags.push('emphasis');

    return tags;
  }

  /**
   * Validate extracted dataset using DataSchema when available
   *
   * @param dataset - Dataset to validate
   * @returns Validation result
   */
  static validate(dataset: SentenceDataset): ValidationResult {
    // Use DataSchema for validation if available (single source of truth)
    if (typeof window !== 'undefined' && (window as any).dataSchema) {
      try {
        const dataSchema = (window as any).dataSchema;
        const schemaType = 'sentence';
        return dataSchema.validate(schemaType, dataset);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ PTESentenceExtractor: DataSchema validation error: ${errorMessage}`);
        // Fall through to minimal validation
      }
    }

    // Minimal fallback validation if DataSchema not available
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure check
    if (!dataset.meta) {
      errors.push('Missing meta object');
    } else if (!dataset.meta.type) {
      errors.push('Missing meta.type');
    }

    if (!Array.isArray(dataset.items)) {
      errors.push('Items is not an array');
    } else if (dataset.items.length === 0) {
      warnings.push('Items array is empty');
    } else {
      // Only check first item for critical structure
      const firstItem = dataset.items[0]!;
      if (!firstItem.content || !firstItem.content.sentence) {
        errors.push('First item missing content.sentence');
      }

      // Check meta count matches actual count
      if (dataset.meta && dataset.meta.count !== dataset.items.length) {
        warnings.push(`Meta count (${dataset.meta.count}) doesn't match items length (${dataset.items.length})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PTESentenceExtractor;
}

// Default export
export default PTESentenceExtractor;
