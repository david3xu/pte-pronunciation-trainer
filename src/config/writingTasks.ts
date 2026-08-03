/**
 * Writing task configuration.
 *
 * A writing task (SWT today, a future task like SST later) is a PTE task
 * where the user types a bounded piece of text against a word count and
 * sentence count rule, with no single exact target answer. This is the one
 * place those rules live, so a new writing task is a new entry here plus a
 * routing branch, not new hardcoded numbers scattered through a component.
 */

export type WritingMode = 'swt' | 'essay-b1-terms' | 'di-answers';

export interface WritingTaskConfig {
  id: WritingMode;
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

export const WRITING_TASKS: Record<WritingMode, WritingTaskConfig> = {
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
  'essay-b1-terms': {
    id: 'essay-b1-terms',
    title: 'Essay B1 Terms',
    shortName: 'B1 Terms',
    timeLimitSeconds: 10 * 60,
    minWords: 1,
    maxWords: 30,
    requiredSentences: 1,
    placeholder: 'Type the term exactly as shown...',
  },
  'di-answers': {
    id: 'di-answers',
    title: 'DI Answer Typing',
    shortName: 'DI',
    timeLimitSeconds: 10 * 60,
    minWords: 1,
    maxWords: 200,
    requiredSentences: 1,
    placeholder: 'Type the answer exactly as shown...',
  },
};

export const WRITING_TASK_LIST: WritingTaskConfig[] = Object.values(WRITING_TASKS);
