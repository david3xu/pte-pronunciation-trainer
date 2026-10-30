/**
 * Typing task configuration, for Monkeytype-style exact-text typing
 * practice. This is a different paradigm from src/config/writingTasks.ts:
 * that config is for PTE-form-validated writing (word/sentence bounds,
 * no single target text). This one is for practicing typing a single exact
 * target string accurately and quickly: not as a real PTE test, but as
 * typing practice using the target text as the source.
 */

import type { TaskType } from '../types/database';

export type TypingMode = 'essay-b1-terms';

export interface TypingTaskConfig {
  id: TypingMode;
  /** User facing name, phrased so the Settings label and page do not imply
   * this is real PTE exam scoring. */
  title: string;
  /** Short form used in compact UI, e.g. "B1 Terms". */
  shortName: string;
  /** Minimum accuracy percent (0 to 100) for a completed attempt to count as correct. */
  accuracyThresholdPercent: number;
  /** The PTE task whose source text this drill types, used for session and
   * analytics attribution. A typing drill is not itself a PTE task, so this
   * maps onto the existing task taxonomy instead of extending it. */
  taskType: TaskType;
}

export const TYPING_TASKS: Record<TypingMode, TypingTaskConfig> = {
  'essay-b1-terms': {
    id: 'essay-b1-terms',
    title: 'Essay B1 Terms Typing',
    shortName: 'B1 Terms',
    accuracyThresholdPercent: 95,
    taskType: 'vocabulary',
  },
};
