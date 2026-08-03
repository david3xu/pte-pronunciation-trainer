/**
 * PTE form validated writing task configuration.
 *
 * This describes the other writing paradigm: a task where the user composes a
 * bounded piece of text judged against word count and sentence count rules,
 * with no single exact target answer. SWT is the one such task defined, and
 * getFormStatus in src/utils/writingTaskValidation.ts is written against this
 * shape.
 *
 * It is deliberately NOT the registry behind Writing Practice in Settings. The
 * tasks selectable there are exact text typing drills and live in
 * src/config/typingTasks.ts as TYPING_TASKS. Nothing in the running app reads
 * WRITING_TASKS yet; it is kept because the form validation util and its tests
 * are built on it, so removing it would discard working, tested design rather
 * than dead weight. Do not add typing drills here: a drill has one exact
 * target, so word bounds and a placeholder describe nothing real about it.
 */

/** Tasks that genuinely carry PTE form rules. SWT is the only one today. */
export type FormWritingMode = 'swt';

export interface WritingTaskConfig {
  id: FormWritingMode;
  /** Full task name, e.g. for headings and Settings labels. */
  title: string;
  /** Short form used in compact UI, e.g. "SWT". */
  shortName: string;
  timeLimitSeconds: number;
  minWords: number;
  maxWords: number;
  /** Exact sentence count required by this task. SWT requires exactly one. */
  requiredSentences: number;
  placeholder: string;
}

export const WRITING_TASKS: Record<FormWritingMode, WritingTaskConfig> = {
  swt: {
    id: 'swt',
    title: 'Summarize Written Text',
    shortName: 'SWT',
    timeLimitSeconds: 10 * 60,
    minWords: 5,
    maxWords: 75,
    requiredSentences: 1,
    placeholder: 'Type your one sentence summary here...',
  },
};
