/**
 * Typing task configuration, for Monkeytype-style exact-text typing
 * practice. This is a different paradigm from src/config/writingTasks.ts:
 * that config is for PTE-form-validated writing (word/sentence bounds,
 * no single target text). This one is for practicing typing a single exact
 * target string accurately and quickly, the way SWT is used here: not as
 * a real PTE test, but as typing practice using a real SWT model answer as
 * the source text.
 */

export type TypingMode = 'swt';

export interface TypingTaskConfig {
  id: TypingMode;
  /** User facing name, deliberately not "Summarize Written Text" so the
   * Settings label and page do not imply this is real PTE exam scoring. */
  title: string;
  /** Short form used in compact UI, e.g. "SWT". */
  shortName: string;
  /** Minimum accuracy percent (0 to 100) for a completed attempt to count as correct. */
  accuracyThresholdPercent: number;
}

export const TYPING_TASKS: Record<TypingMode, TypingTaskConfig> = {
  swt: {
    id: 'swt',
    title: 'SWT Answer Typing',
    shortName: 'SWT',
    accuracyThresholdPercent: 95,
  },
};
