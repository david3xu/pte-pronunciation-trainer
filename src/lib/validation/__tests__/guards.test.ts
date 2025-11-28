/**
 * Tests for TypeScript Type Guards
 *
 * Validates that type guards correctly identify data types
 */

import { describe, expect, it } from 'vitest';
import {
    isAlternativeVocabularyTerm,
    isAnswerShortQuestionItem,
    isAnyVocabularyTerm,
    isArray,
    isObject,
    isPracticeItem,
    isRepeatSentenceItem,
    isStringArray,
    isVocabularyTerm,
    isWriteFromDictationItem,
} from '../guards';

describe('TypeScript Type Guards', () => {
  describe('isVocabularyTerm', () => {
    it('should return true for valid vocabulary term', () => {
      const validTerm = {
        word: 'ubiquitous',
        ipa: { british: '/juːˈbɪkwɪtəs/' },
        difficulty: 'hard',
        category: 'pte-advanced',
      };

      expect(isVocabularyTerm(validTerm)).toBe(true);
    });

    it('should return false for term without word', () => {
      const invalidTerm = {
        ipa: { british: '/test/' },
        difficulty: 'easy',
      };

      expect(isVocabularyTerm(invalidTerm)).toBe(false);
    });

    it('should return false for term without ipa', () => {
      const invalidTerm = {
        word: 'test',
        difficulty: 'easy',
      };

      expect(isVocabularyTerm(invalidTerm)).toBe(false);
    });

    it('should return false for invalid difficulty', () => {
      const invalidTerm = {
        word: 'test',
        ipa: { british: '/test/' },
        difficulty: 'impossible',
      };

      expect(isVocabularyTerm(invalidTerm)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isVocabularyTerm(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isVocabularyTerm(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isVocabularyTerm('string')).toBe(false);
      expect(isVocabularyTerm(123)).toBe(false);
      expect(isVocabularyTerm(true)).toBe(false);
    });
  });

  describe('isAlternativeVocabularyTerm', () => {
    it('should return true for alternative format', () => {
      const validTerm = {
        english: 'ubiquitous',
        pronunciation: {
          british: { ipa: '/juːˈbɪkwɪtəs/', phonetic: 'yoo-BIK-wi-tuhs' },
        },
      };

      expect(isAlternativeVocabularyTerm(validTerm)).toBe(true);
    });

    it('should return false for term without english field', () => {
      const invalidTerm = {
        word: 'test',
        pronunciation: { british: { ipa: '/test/' } },
      };

      expect(isAlternativeVocabularyTerm(invalidTerm)).toBe(false);
    });

    it('should return false for term without pronunciation', () => {
      const invalidTerm = {
        english: 'test',
      };

      expect(isAlternativeVocabularyTerm(invalidTerm)).toBe(false);
    });
  });

  describe('isAnyVocabularyTerm', () => {
    it('should return true for standard vocabulary term', () => {
      const term = {
        word: 'test',
        ipa: { british: '/test/' },
        difficulty: 'easy',
      };

      expect(isAnyVocabularyTerm(term)).toBe(true);
    });

    it('should return true for alternative vocabulary term', () => {
      const term = {
        english: 'test',
        pronunciation: { british: { ipa: '/test/' } },
      };

      expect(isAnyVocabularyTerm(term)).toBe(true);
    });

    it('should return false for invalid term', () => {
      const term = {
        invalid: 'data',
      };

      expect(isAnyVocabularyTerm(term)).toBe(false);
    });
  });

  describe('isRepeatSentenceItem', () => {
    it('should return true for valid RS item', () => {
      const validItem = {
        sentence: 'The quick brown fox jumps over the lazy dog.',
        metadata: {
          difficulty: 'normal',
          category: 'pte-rs',
        },
      };

      expect(isRepeatSentenceItem(validItem)).toBe(true);
    });

    it('should return false for item without sentence', () => {
      const invalidItem = {
        metadata: {
          difficulty: 'normal',
          category: 'pte-rs',
        },
      };

      expect(isRepeatSentenceItem(invalidItem)).toBe(false);
    });

    it('should return false for item without metadata', () => {
      const invalidItem = {
        sentence: 'Test sentence.',
      };

      expect(isRepeatSentenceItem(invalidItem)).toBe(false);
    });
  });

  describe('isAnswerShortQuestionItem', () => {
    it('should return true for valid ASQ item', () => {
      const validItem = {
        question: 'What is the capital of France?',
        answer: 'Paris',
        metadata: {
          difficulty: 'easy',
          category: 'pte-asq',
        },
      };

      expect(isAnswerShortQuestionItem(validItem)).toBe(true);
    });

    it('should return false for item without question', () => {
      const invalidItem = {
        answer: 'Paris',
        metadata: { difficulty: 'easy', category: 'pte-asq' },
      };

      expect(isAnswerShortQuestionItem(invalidItem)).toBe(false);
    });

    it('should return false for item without answer', () => {
      const invalidItem = {
        question: 'What is the capital?',
        metadata: { difficulty: 'easy', category: 'pte-asq' },
      };

      expect(isAnswerShortQuestionItem(invalidItem)).toBe(false);
    });
  });

  describe('isWriteFromDictationItem', () => {
    it('should return true for valid WFD item', () => {
      const validItem = {
        sentence: 'The conference will be held next week.',
        metadata: {
          difficulty: 'normal',
          category: 'pte-wfd',
        },
      };

      expect(isWriteFromDictationItem(validItem)).toBe(true);
    });

    it('should return false for item with question field (distinguishes from ASQ)', () => {
      const invalidItem = {
        sentence: 'Test',
        question: 'Test?',
        metadata: { difficulty: 'easy', category: 'pte-wfd' },
      };

      expect(isWriteFromDictationItem(invalidItem)).toBe(false);
    });
  });

  describe('isPracticeItem', () => {
    it('should return true for RS item', () => {
      const rsItem = {
        sentence: 'Test sentence.',
        metadata: { difficulty: 'normal', category: 'pte-rs' },
      };

      expect(isPracticeItem(rsItem)).toBe(true);
    });

    it('should return true for ASQ item', () => {
      const asqItem = {
        question: 'Test?',
        answer: 'Answer',
        metadata: { difficulty: 'easy', category: 'pte-asq' },
      };

      expect(isPracticeItem(asqItem)).toBe(true);
    });

    it('should return true for WFD item', () => {
      const wfdItem = {
        sentence: 'Test sentence.',
        metadata: { difficulty: 'normal', category: 'pte-wfd' },
      };

      expect(isPracticeItem(wfdItem)).toBe(true);
    });

    it('should return false for invalid item', () => {
      const invalidItem = {
        invalid: 'data',
      };

      expect(isPracticeItem(invalidItem)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(null)).toBe(false);
    });

    it('should validate array items with item guard', () => {
      const isNumber = (val: unknown): val is number => typeof val === 'number';

      expect(isArray([1, 2, 3], isNumber)).toBe(true);
      expect(isArray([1, '2', 3], isNumber)).toBe(false);
    });
  });

  describe('isStringArray', () => {
    it('should return true for string arrays', () => {
      expect(isStringArray(['a', 'b', 'c'])).toBe(true);
      expect(isStringArray([])).toBe(true);
    });

    it('should return false for mixed arrays', () => {
      expect(isStringArray(['a', 1, 'c'])).toBe(false);
    });

    it('should return false for non-string arrays', () => {
      expect(isStringArray([1, 2, 3])).toBe(false);
    });

    it('should return false for non-arrays', () => {
      expect(isStringArray('string')).toBe(false);
      expect(isStringArray({})).toBe(false);
    });
  });

  describe('Type narrowing behavior', () => {
    it('should properly narrow types for vocabulary terms', () => {
      const data: unknown = {
        word: 'test',
        ipa: { british: '/test/' },
        difficulty: 'easy',
        category: 'beginner',
      };

      if (isVocabularyTerm(data)) {
        // TypeScript should know this is VocabularyTerm
        expect(data.word).toBe('test');
        expect(data.ipa).toBeDefined();
      } else {
        throw new Error('Type guard failed');
      }
    });

    it('should properly narrow types for practice items', () => {
      const data: unknown = {
        sentence: 'Test sentence.',
        metadata: { difficulty: 'normal', category: 'pte-rs' },
      };

      if (isRepeatSentenceItem(data)) {
        // TypeScript should know this is RepeatSentenceItem
        expect(data.sentence).toBe('Test sentence.');
        expect(data.metadata).toBeDefined();
      } else {
        throw new Error('Type guard failed');
      }
    });
  });
});
