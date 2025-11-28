/**
 * Tests for Zod Validation Schemas
 *
 * Validates that our Zod schemas correctly validate and reject data
 */

import { describe, expect, it } from 'vitest';
import {
    aiTutorRequestSchema,
    alternativeVocabularyTermSchema,
    answerShortQuestionSchema,
    premiumTTSRequestSchema,
    repeatSentenceSchema,
    safeValidate,
    validateVocabularyTerm,
    vocabularyTermSchema,
    writeFromDictationSchema,
} from '../schemas';

describe('Zod Validation Schemas', () => {
  describe('vocabularyTermSchema', () => {
    it('should validate a correct vocabulary term', () => {
      const validTerm = {
        word: 'ubiquitous',
        ipa: { british: '/juːˈbɪkwɪtəs/', american: '/juˈbɪkwɪtəs/' },
        phonetic: { british: 'yoo-BIK-wi-tuhs', american: 'yoo-BIK-wi-tuhs' },
        difficulty: 'hard',
        category: 'pte-advanced',
        definition: 'Present everywhere',
      };

      const result = vocabularyTermSchema.safeParse(validTerm);
      expect(result.success).toBe(true);
    });

    it('should validate with single IPA notation', () => {
      const validTerm = {
        word: 'test',
        ipa: { single: '/test/' },
        phonetic: { single: 'test' },
        difficulty: 'easy',
        category: 'pte-beginner',
      };

      const result = vocabularyTermSchema.safeParse(validTerm);
      expect(result.success).toBe(true);
    });

    it('should reject term without word', () => {
      const invalidTerm = {
        ipa: { british: '/test/' },
        phonetic: { british: 'test' },
        difficulty: 'easy',
        category: 'pte-beginner',
      };

      const result = vocabularyTermSchema.safeParse(invalidTerm);
      expect(result.success).toBe(false);
    });

    it('should reject term with invalid difficulty', () => {
      const invalidTerm = {
        word: 'test',
        ipa: { british: '/test/' },
        phonetic: { british: 'test' },
        difficulty: 'impossible', // Invalid
        category: 'pte-beginner',
      };

      const result = vocabularyTermSchema.safeParse(invalidTerm);
      expect(result.success).toBe(false);
    });

    it('should reject term without any IPA notation', () => {
      const invalidTerm = {
        word: 'test',
        ipa: {}, // Empty IPA
        phonetic: { british: 'test' },
        difficulty: 'easy',
        category: 'pte-beginner',
      };

      const result = vocabularyTermSchema.safeParse(invalidTerm);
      expect(result.success).toBe(false);
    });
  });

  describe('alternativeVocabularyTermSchema', () => {
    it('should validate alternative format with english field', () => {
      const validTerm = {
        english: 'ubiquitous',
        pronunciation: {
          british: { ipa: '/juːˈbɪkwɪtəs/', phonetic: 'yoo-BIK-wi-tuhs' },
          american: { ipa: '/juˈbɪkwɪtəs/', phonetic: 'yoo-BIK-wi-tuhs' },
        },
        difficulty: 'hard',
        category: 'pte-advanced',
      };

      const result = alternativeVocabularyTermSchema.safeParse(validTerm);
      expect(result.success).toBe(true);
    });
  });

  describe('repeatSentenceSchema', () => {
    it('should validate a correct RS item', () => {
      const validItem = {
        sentence: 'The quick brown fox jumps over the lazy dog.',
        metadata: {
          difficulty: 'normal',
          category: 'pte-rs',
        },
        wordCount: 9,
      };

      const result = repeatSentenceSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject RS item without sentence', () => {
      const invalidItem = {
        metadata: {
          difficulty: 'normal',
          category: 'pte-rs',
        },
      };

      const result = repeatSentenceSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject empty sentence', () => {
      const invalidItem = {
        sentence: '',
        metadata: {
          difficulty: 'normal',
          category: 'pte-rs',
        },
      };

      const result = repeatSentenceSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('answerShortQuestionSchema', () => {
    it('should validate a correct ASQ item', () => {
      const validItem = {
        question: 'What is the capital of France?',
        answer: 'Paris',
        metadata: {
          difficulty: 'easy',
          category: 'pte-asq',
        },
        alternativeAnswers: ['paris', 'PARIS'],
      };

      const result = answerShortQuestionSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject ASQ item without answer', () => {
      const invalidItem = {
        question: 'What is the capital of France?',
        metadata: {
          difficulty: 'easy',
          category: 'pte-asq',
        },
      };

      const result = answerShortQuestionSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('writeFromDictationSchema', () => {
    it('should validate a correct WFD item', () => {
      const validItem = {
        sentence: 'The conference will be held next week.',
        metadata: {
          difficulty: 'normal',
          category: 'pte-wfd',
        },
        wordCount: 7,
        keyWords: ['conference', 'held', 'week'],
      };

      const result = writeFromDictationSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });
  });

  describe('premiumTTSRequestSchema', () => {
    it('should validate a correct TTS request', () => {
      const validRequest = {
        text: 'Hello, world!',
        voiceId: 'Joanna',
        engine: 'neural',
      };

      const result = premiumTTSRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should apply default engine value', () => {
      const request = {
        text: 'Hello, world!',
        voiceId: 'Joanna',
      };

      const result = premiumTTSRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.engine).toBe('neural');
      }
    });

    it('should reject text longer than 3000 characters', () => {
      const longText = 'a'.repeat(3001);
      const invalidRequest = {
        text: longText,
        voiceId: 'Joanna',
      };

      const result = premiumTTSRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject empty text', () => {
      const invalidRequest = {
        text: '',
        voiceId: 'Joanna',
      };

      const result = premiumTTSRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('aiTutorRequestSchema', () => {
    it('should validate a correct AI tutor request', () => {
      const validRequest = {
        message: 'How do I pronounce ubiquitous?',
        context: {
          currentWord: 'ubiquitous',
          difficulty: 'hard',
        },
      };

      const result = aiTutorRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject message longer than 2000 characters', () => {
      const longMessage = 'a'.repeat(2001);
      const invalidRequest = {
        message: longMessage,
      };

      const result = aiTutorRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('validateVocabularyTerm', () => {
    it('should validate and return parsed data', () => {
      const validTerm = {
        word: 'test',
        ipa: { british: '/test/' },
        phonetic: { british: 'test' },
        difficulty: 'easy',
        category: 'pte-beginner',
      };

      const result = validateVocabularyTerm(validTerm);
      expect(result).toEqual(validTerm);
    });

    it('should throw error for invalid data', () => {
      const invalidTerm = {
        word: 'test',
        // Missing ipa
      };

      expect(() => validateVocabularyTerm(invalidTerm)).toThrow();
    });
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const validTerm = {
        word: 'test',
        ipa: { british: '/test/' },
        phonetic: { british: 'test' },
        difficulty: 'easy',
        category: 'pte-beginner',
      };

      const result = safeValidate(vocabularyTermSchema, validTerm);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTerm);
      }
    });

    it('should return error for invalid data', () => {
      const invalidTerm = {
        word: 'test',
        // Missing required fields
      };

      const result = safeValidate(vocabularyTermSchema, invalidTerm);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
