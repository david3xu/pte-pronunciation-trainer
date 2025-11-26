/**
 * TypeScript Type Guards
 *
 * Runtime type checking functions that provide type narrowing.
 * These replace `as any` casts with safe type assertions.
 */

import type {
    AnswerShortQuestionItem,
    PracticeItem,
    RepeatSentenceItem,
    VocabularyTerm,
    WriteFromDictationItem,
} from '../../types/dataset.types';

/* ============================================
   VOCABULARY TYPE GUARDS
   ============================================ */

/**
 * Type guard for vocabulary term with 'word' field
 */
export function isVocabularyTerm(item: unknown): item is VocabularyTerm {
  if (typeof item !== 'object' || item === null) return false;

  const obj = item as Record<string, unknown>;

  return (
    typeof obj['word'] === 'string' &&
    typeof obj['ipa'] === 'object' &&
    obj['ipa'] !== null &&
    typeof obj['difficulty'] === 'string' &&
    ['easy', 'normal', 'hard'].includes(obj['difficulty'] as string)
  );
}

/**
 * Type guard for alternative vocabulary format (uses 'english' instead of 'word')
 */
export function isAlternativeVocabularyTerm(item: unknown): item is { english: string; pronunciation: any; difficulty: string } {
  if (typeof item !== 'object' || item === null) return false;

  const obj = item as Record<string, unknown>;

  return (
    typeof obj['english'] === 'string' &&
    typeof obj['pronunciation'] === 'object' &&
    obj['pronunciation'] !== null
  );
}

/**
 * Type guard for any vocabulary term format
 */
export function isAnyVocabularyTerm(item: unknown): boolean {
  return isVocabularyTerm(item) || isAlternativeVocabularyTerm(item);
}

/* ============================================
   PRACTICE TYPE GUARDS
   ============================================ */

/**
 * Type guard for Repeat Sentence item
 */
export function isRepeatSentenceItem(item: unknown): item is RepeatSentenceItem {
  if (typeof item !== 'object' || item === null) return false;

  const obj = item as Record<string, unknown>;

  return (
    typeof obj['sentence'] === 'string' &&
    typeof obj['metadata'] === 'object' &&
    obj['metadata'] !== null &&
    'category' in (obj['metadata'] as object)
  );
}

/**
 * Type guard for Answer Short Question item
 */
export function isAnswerShortQuestionItem(item: unknown): item is AnswerShortQuestionItem {
  if (typeof item !== 'object' || item === null) return false;

  const obj = item as Record<string, unknown>;

  return (
    typeof obj['question'] === 'string' &&
    typeof obj['answer'] === 'string' &&
    typeof obj['metadata'] === 'object' &&
    obj['metadata'] !== null
  );
}

/**
 * Type guard for Write From Dictation item
 */
export function isWriteFromDictationItem(item: unknown): item is WriteFromDictationItem {
  if (typeof item !== 'object' || item === null) return false;

  const obj = item as Record<string, unknown>;

  return (
    typeof obj['sentence'] === 'string' &&
    typeof obj['metadata'] === 'object' &&
    obj['metadata'] !== null &&
    !('question' in obj) // Distinguish from RS (both have 'sentence')
  );
}

/**
 * Type guard for any practice item
 */
export function isPracticeItem(item: unknown): item is PracticeItem {
  return (
    isRepeatSentenceItem(item) ||
    isAnswerShortQuestionItem(item) ||
    isWriteFromDictationItem(item)
  );
}

/* ============================================
   GENERIC TYPE GUARDS
   ============================================ */

/**
 * Type guard for non-null objects (excludes arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for arrays
 */
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!itemGuard) return true;
  return value.every(itemGuard);
}

/**
 * Type guard for string arrays
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/* ============================================
   USAGE EXAMPLES
   ============================================ */

/**
 * Example: Safe type narrowing for WordCard component
 *
 * BEFORE (unsafe):
 * const displayText = (item as any).word ?? (item as any).english;
 *
 * AFTER (safe):
 * const displayText = isVocabularyTerm(item)
 *   ? item.word
 *   : isAlternativeVocabularyTerm(item)
 *     ? item.english
 *     : isPracticeItem(item) && 'sentence' in item
 *       ? item.sentence
 *       : '';
 */

/**
 * Example: Filtering with type guards
 *
 * const vocabularyItems = items.filter(isVocabularyTerm);
 * // TypeScript now knows vocabularyItems is VocabularyTerm[]
 */
