/**
 * Zod Validation Schemas
 *
 * Runtime validation schemas for API requests, vocabulary terms, and practice items.
 * These complement the TypeScript types in src/types/dataset.types.ts with runtime validation.
 */

import { z } from 'zod';

/* ============================================
   VOCABULARY SCHEMAS
   ============================================ */

/**
 * Difficulty level schema
 */
export const difficultySchema = z.enum(['easy', 'normal', 'hard']);

/**
 * IPA pronunciation schema
 */
export const ipaSchema = z.object({
  british: z.string().optional(),
  american: z.string().optional(),
  single: z.string().optional(),
}).refine(
  (data) => data.british || data.american || data.single,
  { message: 'At least one IPA notation (british, american, or single) is required' }
);

/**
 * Phonetic spelling schema
 */
export const phoneticSchema = z.object({
  british: z.string().optional(),
  american: z.string().optional(),
  single: z.string().optional(),
});

/**
 * Vocabulary term schema
 */
export const vocabularyTermSchema = z.object({
  word: z.string().min(1, 'Word cannot be empty'),
  ipa: ipaSchema,
  phonetic: phoneticSchema,
  difficulty: difficultySchema,
  category: z.string(),
  definition: z.string().optional(),
  example: z.string().optional(),
  pos: z.string().optional(),
});

/**
 * Alternative vocabulary format (uses 'english' instead of 'word')
 */
export const alternativeVocabularyTermSchema = z.object({
  english: z.string().min(1),
  pronunciation: z.object({
    british: z.object({
      ipa: z.string(),
      phonetic: z.string(),
    }).optional(),
    american: z.object({
      ipa: z.string(),
      phonetic: z.string(),
    }).optional(),
    ipa: z.string().optional(),
    phonetic: z.string().optional(),
  }),
  difficulty: difficultySchema,
  category: z.string(),
  source: z.string().optional(),
});

/* ============================================
   PRACTICE SCHEMAS
   ============================================ */

/**
 * Practice metadata schema
 */
export const practiceMetadataSchema = z.object({
  difficulty: difficultySchema,
  category: z.enum(['pte-rs', 'pte-asq', 'pte-wfd']),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Repeat Sentence (RS) item schema
 */
export const repeatSentenceSchema = z.object({
  sentence: z.string().min(1, 'Sentence cannot be empty'),
  metadata: practiceMetadataSchema,
  wordCount: z.number().optional(),
  difficultyScore: z.number().optional(),
});

/**
 * Answer Short Question (ASQ) item schema
 */
export const answerShortQuestionSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  answer: z.string().min(1, 'Answer cannot be empty'),
  metadata: practiceMetadataSchema,
  alternativeAnswers: z.array(z.string()).optional(),
});

/**
 * Write From Dictation (WFD) item schema
 */
export const writeFromDictationSchema = z.object({
  sentence: z.string().min(1, 'Sentence cannot be empty'),
  metadata: practiceMetadataSchema,
  wordCount: z.number().optional(),
  keyWords: z.array(z.string()).optional(),
});

/**
 * Union schema for any practice item
 */
export const practiceItemSchema = z.union([
  repeatSentenceSchema,
  answerShortQuestionSchema,
  writeFromDictationSchema,
]);

/* ============================================
   API REQUEST SCHEMAS
   ============================================ */

/**
 * Premium TTS API request schema
 */
export const premiumTTSRequestSchema = z.object({
  text: z.string().min(1).max(3000, 'Text too long (max 3000 characters)'),
  voiceId: z.string().min(1, 'Voice ID is required'),
  engine: z.enum(['standard', 'neural']).default('neural'),
  languageCode: z.string().optional().default('en-US'),
});

/**
 * AI Tutor chat request schema
 */
export const aiTutorRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  context: z.object({
    currentWord: z.string().optional(),
    difficulty: difficultySchema.optional(),
    sessionHistory: z.array(z.any()).optional(),
  }).optional(),
});



/**
 * Safe validation with error handling
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/* ============================================
   VALIDATION HELPERS
   ============================================ */

/**
 * Validate vocabulary term at runtime
 */
export function validateVocabularyTerm(data: unknown) {
  return vocabularyTermSchema.parse(data);
}

/* ============================================
   TYPE EXPORTS
   ============================================ */

// Export inferred TypeScript types from Zod schemas
export type ValidatedVocabularyTerm = z.infer<typeof vocabularyTermSchema>;
export type ValidatedPracticeItem = z.infer<typeof practiceItemSchema>;
export type ValidatedPremiumTTSRequest = z.infer<typeof premiumTTSRequestSchema>;
export type ValidatedAITutorRequest = z.infer<typeof aiTutorRequestSchema>;
