/**
 * Task-neutral text validation for writing tasks (SWT today, a future task
 * like SST later). Nothing in this file knows about any specific task; the
 * word/sentence bounds it is asked to check come from a WritingTaskConfig
 * (see src/config/writingTasks.ts), not from constants here.
 */

import type { WritingTaskConfig } from '../config/writingTasks';

export type WritingFormReason = 'empty' | 'too_short' | 'too_long' | 'too_few_sentences' | 'too_many_sentences';

export interface WritingFormStatus {
  valid: boolean;
  reason: WritingFormReason | null;
  label: string;
}

/** Count words by splitting on whitespace and dropping empty tokens. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
}

// A small closed class of words that are essentially only ever used to
// start a new sentence, never to continue a noun phrase after an acronym.
// Used below to tell "U.S. Army" (one sentence, "Army" just continues the
// noun phrase) apart from "U.S. It changed policy." (two sentences, "It"
// only ever starts a new clause).
const SENTENCE_STARTER_WORDS = [
  'It', 'This', 'That', 'These', 'Those',
  'He', 'She', 'They', 'We', 'I', 'You',
  'There', 'Here', 'The', 'A', 'An',
];
const SINGLE_LETTER_INITIAL_RE = new RegExp(
  `\\b([A-Z])\\.(?=[A-Z]\\.|\\s(?!(?:${SENTENCE_STARTER_WORDS.join('|')})\\b))`,
  'g'
);

// Titles are never a complete sentence by themselves: they are always
// followed by a name, and that name being capitalized never signals a new
// sentence ("Dr. Shiels led the study" is one sentence, not two).
const ALWAYS_NON_TERMINAL_ABBREVIATIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Jr', 'Sr'];
const ALWAYS_NON_TERMINAL_RE = new RegExp(`\\b(${ALWAYS_NON_TERMINAL_ABBREVIATIONS.join('|')})\\.`, 'g');

// These usually sit mid sentence, but unlike titles they can genuinely end
// one: "Inc." can close a company name, "etc." can trail off a list. Mask
// them (treat as non-terminal) only when not followed by whitespace and a
// capital letter, since that pattern is what a genuine following sentence
// looks like.
const BOUNDARY_AWARE_ABBREVIATIONS = ['vs', 'etc', 'approx', 'Inc', 'Ltd'];
const BOUNDARY_AWARE_RE = new RegExp(`\\b(${BOUNDARY_AWARE_ABBREVIATIONS.join('|')})\\.(?!\\s+[A-Z])`, 'g');

/**
 * Count sentences by counting terminal punctuation runs, after masking out
 * periods that are not real sentence boundaries: decimal numbers ("1.5bn"),
 * single letter initials in acronyms ("U.S.", "U.K."), unless followed by
 * a real sentence starter word ("U.S. It changed policy." is two sentences,
 * "U.S. Army" is not), titles that are never sentence final ("Dr.", "Mr."),
 * and a short list of abbreviations that are usually mid sentence but can
 * genuinely end one ("Inc.", "etc."), which are only masked when not
 * followed by whitespace and a capital letter. Masking only ever feeds the
 * ender scan below, it never changes what the function returns as text. A
 * trailing clause with no terminal punctuation yet still counts as one in
 * progress sentence, so the live count stays accurate while typing.
 */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const masked = trimmed
    // Decimal numbers: 1.5, 75.5
    .replace(/(\d)\.(\d)/g, '$1\u2022$2')
    // Single capital letter initials, e.g. U.S. or U.K.A. Masks a
    // letter+period pair when another letter+period follows (continuing
    // the acronym), or when whitespace follows that is not itself followed
    // by a real sentence starter word, so a genuine new sentence right
    // after an initial is left with a real terminator.
    .replace(SINGLE_LETTER_INITIAL_RE, '$1\u2022')
    .replace(ALWAYS_NON_TERMINAL_RE, '$1\u2022')
    .replace(BOUNDARY_AWARE_RE, '$1\u2022');

  const enders = masked.match(/[.!?]+/g) || [];
  const endsWithTerminator = /[.!?]\s*$/.test(masked);
  return endsWithTerminator ? enders.length : enders.length + 1;
}

/**
 * Writing task form validation, bounded by the given task's config rather
 * than any hardcoded numbers. Red must only ever mean a form problem, never
 * a mismatch with a model answer, so this never takes or looks at one.
 */
export function getFormStatus(
  answer: string,
  wordCount: number,
  sentenceCount: number,
  task: WritingTaskConfig
): WritingFormStatus {
  const trimmed = answer.trim();
  if (!trimmed) {
    return { valid: false, reason: 'empty', label: 'Empty' };
  }
  if (sentenceCount < task.requiredSentences) {
    const label = task.requiredSentences === 1 ? 'Needs one sentence' : `Needs ${task.requiredSentences} sentences`;
    return { valid: false, reason: 'too_few_sentences', label };
  }
  if (sentenceCount > task.requiredSentences) {
    const label = task.requiredSentences === 1 ? 'More than one sentence' : `More than ${task.requiredSentences} sentences`;
    return { valid: false, reason: 'too_many_sentences', label };
  }
  if (wordCount < task.minWords) {
    return { valid: false, reason: 'too_short', label: `Too short, min ${task.minWords}` };
  }
  if (wordCount > task.maxWords) {
    return { valid: false, reason: 'too_long', label: `Too long, max ${task.maxWords}` };
  }
  return { valid: true, reason: null, label: 'Valid' };
}

export function formatTimer(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
