/**
 * Dataset Type Definitions
 *
 * This file contains TypeScript types for all PTE datasets including:
 * - Vocabulary terms (13 books, 13,000+ terms)
 * - Practice items (RS/ASQ/WFD, 2,507 items)
 */

/* ============================================
   VOCABULARY TYPES
   ============================================ */

/**
 * IPA (International Phonetic Alphabet) notation
 * Supports both British and American pronunciations
 */
export interface IPA {
  /** British English IPA notation */
  british?: string;
  /** American English IPA notation */
  american?: string;
  /** Single IPA notation (when British/American distinction not needed) */
  single?: string;
}

/**
 * Phonetic spelling (how to pronounce the word in plain English)
 */
export interface Phonetic {
  /** British English phonetic spelling */
  british?: string;
  /** American English phonetic spelling */
  american?: string;
  /** Single phonetic spelling */
  single?: string;
}

/**
 * Difficulty levels for vocabulary and practice items
 */
export type Difficulty = 'easy' | 'normal' | 'hard';

/**
 * Vocabulary category (book name)
 */
export type VocabularyCategory =
  | 'pte-fib-listening'
  | 'pte-beginner'
  | 'pte-intermediate'
  | 'pte-advanced'
  | 'pte-ra'
  | 'pte-rs-vocab'
  | 'pte-must-know'
  | 'pte-wfd-vocab'
  | 'pte-rs-wfd-vocab'
  | 'pte-reading-fib'
  | 'pte-reading-fib-drag'
  | 'pte-asq-answers'
  | 'pte-high-frequency';

/**
 * Vocabulary term with IPA pronunciation
 */
export interface VocabularyTerm {
  /** The word itself */
  word: string;
  /** IPA pronunciation notation */
  ipa: IPA;
  /** Phonetic spelling (sounds like...) */
  phonetic: Phonetic;
  /** Difficulty level */
  difficulty: Difficulty;
  /** Category (book name) */
  category: VocabularyCategory;
  /** Optional definition */
  definition?: string;
  /** Optional example sentence */
  example?: string;
  /** Part of speech (noun, verb, adjective, etc.) */
  pos?: string;
}

/* ============================================
   PRACTICE TYPES
   ============================================ */

/**
 * Practice mode types
 */
export type PracticeMode = 'rs' | 'asq' | 'wfd';

/**
 * Practice category (mode identifier)
 */
export type PracticeCategory = 'pte-rs' | 'pte-asq' | 'pte-wfd';

/**
 * Metadata for practice items (nested structure)
 */
export interface PracticeMetadata {
  /** Difficulty level */
  difficulty: Difficulty;
  /** Category (practice mode) */
  category: PracticeCategory;
  /** Source (e.g., 'PTE Official', 'Community') */
  source?: string;
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Repeat Sentence (RS) item
 */
export interface RepeatSentenceItem {
  /** The sentence to repeat */
  sentence: string;
  /** Metadata */
  metadata: PracticeMetadata;
  /** Word count */
  wordCount?: number;
  /** Estimated difficulty score */
  difficultyScore?: number;
}

/**
 * Answer Short Question (ASQ) item
 */
export interface AnswerShortQuestionItem {
  /** The question */
  question: string;
  /** The correct answer */
  answer: string;
  /** Metadata */
  metadata: PracticeMetadata;
  /** Alternative acceptable answers */
  alternativeAnswers?: string[];
}

/**
 * Write From Dictation (WFD) item
 */
export interface WriteFromDictationItem {
  /** The sentence to write */
  sentence: string;
  /** Metadata */
  metadata: PracticeMetadata;
  /** Word count */
  wordCount?: number;
  /** Key words (must-have for partial credit) */
  keyWords?: string[];
}

/**
 * Union type for all practice items
 */
export type PracticeItem =
  | RepeatSentenceItem
  | AnswerShortQuestionItem
  | WriteFromDictationItem;

/* ============================================
   DATASET TYPES
   ============================================ */

/**
 * Dataset type identifier
 */
export type DatasetType = 'vocabulary' | 'practice';

/**
 * Dataset mode (vocabulary book or practice mode)
 */
export type DatasetMode = VocabularyCategory | PracticeMode;

/**
 * Generic dataset structure
 */
export interface Dataset<T = VocabularyTerm | PracticeItem> {
  /** Dataset items */
  items: T[];
  /** Metadata */
  metadata: {
    /** Dataset name */
    name: string;
    /** Dataset type */
    type: DatasetType;
    /** Mode identifier */
    mode: DatasetMode;
    /** Total item count */
    count: number;
    /** Version */
    version: string;
    /** Last updated timestamp */
    lastUpdated: string;
    /** Difficulty distribution */
    difficultyDistribution?: {
      easy: number;
      normal: number;
      hard: number;
    };
  };
}

/**
 * Vocabulary dataset (typed)
 */
export type VocabularyDataset = Dataset<VocabularyTerm>;

/**
 * Practice dataset (typed)
 */
export type PracticeDataset = Dataset<PracticeItem>;

/* ============================================
   UTILITY TYPES
   ============================================ */

/**
 * Dataset registry entry (from Config.js)
 */
export interface DatasetRegistryEntry {
  /** Dataset ID */
  id: string;
  /** Display name (optional) */
  name?: string;
  /** Input filename (not full path, just filename) */
  input: string;
  /** Fallback filename if primary fails */
  fallback?: string;
  /** Output filename */
  output: string;
  /** Category */
  category: VocabularyCategory | PracticeCategory;
  /** Description */
  description?: string;
  /** Source type identifier */
  sourceType?: string;
  /** Data type (vocabulary, rs, wfd, asq) */
  dataType?: string;
  /** Extractor type */
  extractorType: 'PTETermsExtractor' | 'SingleIPATermsExtractor' | 'PTESentenceExtractor' | 'PTEQuestionExtractor';
  /** Input subdirectory (e.g., 'vocabs', 'sentences') */
  inputSubdir?: string;
  /** Whether this is the default dataset */
  isDefault?: boolean;
  /** Difficulty (for display purposes) */
  difficulty?: Difficulty;
  /** Practice mode (for practice datasets) */
  mode?: PracticeMode;
}

/**
 * Data loading options
 */
export interface DataLoadOptions {
  /** Force reload even if cached */
  forceReload?: boolean;
  /** Retry options */
  retry?: {
    maxRetries: number;
    delays: number[];
  };
  /** Filter by difficulty */
  difficulty?: Difficulty;
  /** Filter by category */
  category?: VocabularyCategory | PracticeCategory;
}

/**
 * Data loading result
 */
export interface DataLoadResult<T = VocabularyTerm | PracticeItem> {
  /** Loaded dataset */
  dataset: Dataset<T>;
  /** Loading source ('cache' | 'network') */
  source: 'cache' | 'network';
  /** Load duration in ms */
  duration: number;
  /** Any errors encountered */
  errors?: Error[];
}
