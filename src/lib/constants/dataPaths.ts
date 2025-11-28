/**
 * Data Path Constants
 *
 * Centralized mapping of vocabulary book IDs to their JSON file paths.
 * This eliminates duplicate definitions in App.tsx and SettingsPanel.tsx.
 */

/**
 * Vocabulary book identifiers
 */
export type VocabularyBookId =
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
  | 'pte-high-frequency'
  | 'pte-rs-core'
  | 'pte-di-rl-templates'
  | 'pte-sst-complete'
  | 'pte-essay-topic-vocabulary'
  | 'pte-di-difficult-words'
  | 'pte-di-easy-phrases'
  // Shadowing modes
  | 'di-shadowing-1-10'
  | 'di-shadowing-11-20';

/**
 * Mapping of vocabulary book IDs to their JSON file paths
 *
 * Single source of truth for data loading.
 * Referenced by:
 * - src/App.tsx (vocabulary loading)
 * - src/components/settings/SettingsPanel.tsx (book selection)
 */
export const DATA_PATH_MAP: Record<VocabularyBookId, string> = {
  // Vocabulary books
  'pte-fib-listening': '/data/processed/pte-fib-listening-dataset.json',
  'pte-beginner': '/data/processed/pte-beginner-vocabulary.json',
  'pte-intermediate': '/data/processed/pte-intermediate-vocabulary.json',
  'pte-advanced': '/data/processed/pte-advanced-vocabulary.json',
  'pte-ra': '/data/processed/pte-ra-vocabulary.json',
  'pte-rs-vocab': '/data/processed/pte-rs-vocabulary.json',
  'pte-must-know': '/data/processed/pte-must-know-vocabulary.json',
  'pte-wfd-vocab': '/data/processed/pte-wfd-vocabulary.json',
  'pte-rs-wfd-vocab': '/data/processed/pte-rs-wfd-vocabulary.json',
  'pte-reading-fib': '/data/processed/pte-reading-fib-vocabulary.json',
  'pte-reading-fib-drag': '/data/processed/pte-reading-fib-drag-vocabulary.json',
  'pte-asq-answers': '/data/processed/pte-asq-answers-vocabulary.json',
  'pte-high-frequency': '/data/processed/pte-high-frequency-vocabulary.json',
  'pte-rs-core': '/data/processed/pte-rs-core-vocabulary.json',
  'pte-di-rl-templates': '/data/processed/pte-di-rl-templates-vocabulary.json',
  'pte-sst-complete': '/data/processed/pte-sst-complete-vocabulary.json',
  'pte-essay-topic-vocabulary': '/data/processed/pte-essay-topic-vocabulary.json',
  'pte-di-difficult-words': '/data/processed/pte-di-difficult-words-vocabulary.json',
  'pte-di-easy-phrases': '/data/processed/pte-di-easy-phrases-vocabulary.json',

  // Shadowing modes (use 'answers' field instead of 'vocabulary')
  'di-shadowing-1-10': '/data/processed/di-shadowing-images-1-10.json',
  'di-shadowing-11-20': '/data/processed/di-shadowing-images-11-20.json',
};

/**
 * Get data path for a vocabulary book
 */
export function getDataPath(bookId: string): string {
  return DATA_PATH_MAP[bookId as VocabularyBookId] || `/data/processed/${bookId}-vocabulary.json`;
}

/**
 * Check if book ID is valid
 */
export function isValidBookId(bookId: string): bookId is VocabularyBookId {
  return bookId in DATA_PATH_MAP;
}

/**
 * Get all vocabulary book IDs
 */
export function getAllBookIds(): VocabularyBookId[] {
  return Object.keys(DATA_PATH_MAP) as VocabularyBookId[];
}

/**
 * Get all vocabulary book paths
 */
export function getAllBookPaths(): string[] {
  return Object.values(DATA_PATH_MAP);
}
