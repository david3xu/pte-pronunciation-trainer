/**
 * Typing task configuration, for Monkeytype-style exact-text typing
 * practice. This is a different paradigm from src/config/writingTasks.ts:
 * that config is for PTE-form-validated writing (word/sentence bounds,
 * no single target text). This one is for practicing typing a single exact
 * target string accurately and quickly, the way SWT is used here: not as
 * a real PTE test, but as typing practice using a real SWT model answer as
 * the source text.
 */

import type { TaskType } from '../types/database';

export type TypingMode = 'swt' | 'essay-b1-terms' | 'di-answers';

export interface TypingTaskConfig {
  id: TypingMode;
  /** User facing name, deliberately not "Summarize Written Text" so the
   * Settings label and page do not imply this is real PTE exam scoring. */
  title: string;
  /** Short form used in compact UI, e.g. "SWT". */
  shortName: string;
  /** Minimum accuracy percent (0 to 100) for a completed attempt to count as correct. */
  accuracyThresholdPercent: number;
  /** The PTE task whose source text this drill types, used for session and
   * analytics attribution. A typing drill is not itself a PTE task, so this
   * maps onto the existing task taxonomy instead of extending it. */
  taskType: TaskType;
}

export const TYPING_TASKS: Record<TypingMode, TypingTaskConfig> = {
  swt: {
    id: 'swt',
    title: 'SWT Answer Typing',
    shortName: 'SWT',
    accuracyThresholdPercent: 95,
    taskType: 'swt',
  },
  'essay-b1-terms': {
    id: 'essay-b1-terms',
    title: 'Essay B1 Terms Typing',
    shortName: 'B1 Terms',
    accuracyThresholdPercent: 95,
    taskType: 'vocabulary',
  },
  'di-answers': {
    id: 'di-answers',
    title: 'DI Answer Typing',
    shortName: 'DI',
    accuracyThresholdPercent: 95,
    taskType: 'di',
  },
};
