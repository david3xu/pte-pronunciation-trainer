import { describe, expect, it } from 'vitest';
import { WRITING_TASKS } from '../config/writingTasks';
import { countSentences, countWords, formatTimer, getFormStatus } from './writingTaskValidation';

const task = WRITING_TASKS.swt;

describe('countWords', () => {
  it('returns 0 for empty or whitespace only text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('counts whitespace separated words', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('  leading and trailing  ')).toBe(3);
  });
});

describe('countSentences', () => {
  it('returns 0 for empty text', () => {
    expect(countSentences('')).toBe(0);
  });

  it('counts an unterminated clause as one sentence in progress', () => {
    expect(countSentences('the quick brown fox')).toBe(1);
  });

  it('counts one sentence when terminated once', () => {
    expect(countSentences('This is one sentence.')).toBe(1);
  });

  it('counts multiple sentences when terminated more than once', () => {
    expect(countSentences('First sentence. Second sentence.')).toBe(2);
  });

  it('does not count a decimal point inside a number as a sentence end', () => {
    // Regression: a real generated answer ends in "...nearly 1.5bn
    // schoolchildren." and was previously miscounted as 2 sentences.
    expect(
      countSentences('Timetables remain the norm for nearly 1.5bn schoolchildren.')
    ).toBe(1);
  });

  it('does not count periods inside an acronym mid sentence, e.g. U.S. Army', () => {
    // Regression: a real generated answer contains "...the U.S. Army Signal
    // Corps requested..." mid sentence and was previously miscounted as 3.
    expect(
      countSentences('In 1907 the U.S. Army Signal Corps requested an aircraft.')
    ).toBe(1);
  });

  it('treats a sentence ending in an acronym as one terminated sentence', () => {
    expect(countSentences('They finally moved to the U.S.')).toBe(1);
  });

  it('counts a real second sentence that starts right after an acronym', () => {
    // Regression: acronym masking accepted whitespace alone as evidence the
    // period was still mid abbreviation, so a genuine second sentence
    // starting right after "U.S." was undercounted as one sentence.
    expect(
      countSentences('They moved to the U.S. It changed policy.')
    ).toBe(2);
  });

  it('does not count a period after a title as a sentence end', () => {
    expect(countSentences('Dr. Shiels led the study of Greenland sharks.')).toBe(1);
  });

  it('counts a real second sentence that starts right after a trailing abbreviation', () => {
    // Regression: abbreviation masking was unconditional, so a genuine two
    // sentence answer where the first sentence ends in "Inc." was wrongly
    // accepted as one sentence.
    expect(
      countSentences('The company is Acme Inc. It operates globally.')
    ).toBe(2);
  });

  it('counts a real second sentence that starts right after "etc."', () => {
    expect(
      countSentences('We used common methods etc. Results improved.')
    ).toBe(2);
  });

  it('treats question and exclamation marks as terminators too', () => {
    expect(countSentences('Is this valid? Yes! It is.')).toBe(3);
  });
});

describe('getFormStatus', () => {
  it('flags empty answers', () => {
    const status = getFormStatus('', 0, 0, task);
    expect(status.valid).toBe(false);
    expect(status.reason).toBe('empty');
  });

  it('flags more sentences than the task allows, independent of word count', () => {
    const answer = 'First sentence here. Second sentence here.';
    const status = getFormStatus(answer, countWords(answer), countSentences(answer), task);
    expect(status.valid).toBe(false);
    expect(status.reason).toBe('too_many_sentences');
  });

  it('requires exactly the configured sentence count, not just at most that count', () => {
    const answer = 'one two three four five six seven';
    const status = getFormStatus(answer, countWords(answer), 0, task);
    expect(status.valid).toBe(false);
    expect(status.reason).toBe('too_few_sentences');
  });

  it('flags answers under the minimum word count', () => {
    const answer = 'Too few words here.';
    const status = getFormStatus(answer, countWords(answer), countSentences(answer), task);
    expect(status.valid).toBe(false);
    expect(status.reason).toBe('too_short');
  });

  it('flags answers over the maximum word count', () => {
    const longAnswer = `${'word '.repeat(task.maxWords + 5).trim()}.`;
    const status = getFormStatus(longAnswer, countWords(longAnswer), countSentences(longAnswer), task);
    expect(status.valid).toBe(false);
    expect(status.reason).toBe('too_long');
  });

  it('accepts a single sentence within the word count range', () => {
    const words = Array.from({ length: task.minWords }, (_, i) => `word${i}`).join(' ');
    const answer = `${words}.`;
    const status = getFormStatus(answer, countWords(answer), countSentences(answer), task);
    expect(status.valid).toBe(true);
    expect(status.reason).toBeNull();
  });

  it('never inspects a model answer: validity depends only on the typed text and the task config', () => {
    // Regression guard for the core writing task rule that red must never
    // mean "different from the model answer". The function has no
    // model-answer parameter at all, so this is enforced structurally.
    expect(getFormStatus.length).toBe(4);
  });

  it('is task-neutral: a task with different bounds gets a different result for the same text', () => {
    // Not SWT specific, this is the whole point of taking task as a
    // parameter instead of reading module level SWT constants.
    const answer = 'One two three.';
    const lenientTask = { ...task, minWords: 1 };
    expect(getFormStatus(answer, countWords(answer), countSentences(answer), task).valid).toBe(false);
    expect(getFormStatus(answer, countWords(answer), countSentences(answer), lenientTask).valid).toBe(true);
  });
});

describe('formatTimer', () => {
  it('formats whole minutes', () => {
    expect(formatTimer(600)).toBe('10:00');
  });

  it('pads single digit seconds', () => {
    expect(formatTimer(65)).toBe('1:05');
  });

  it('clamps negative values to zero', () => {
    expect(formatTimer(-5)).toBe('0:00');
  });
});
