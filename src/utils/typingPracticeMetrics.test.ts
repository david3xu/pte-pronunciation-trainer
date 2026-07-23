import { describe, expect, it } from 'vitest';
import { getTypingProgress, getWordsPerMinute } from './typingPracticeMetrics';

describe('getTypingProgress', () => {
  it('reports zero progress and full accuracy before anything is typed', () => {
    const progress = getTypingProgress('hello world', '');
    expect(progress.typedLength).toBe(0);
    expect(progress.correctChars).toBe(0);
    expect(progress.errorChars).toBe(0);
    expect(progress.accuracyPercent).toBe(100);
    expect(progress.progressPercent).toBe(0);
    expect(progress.completed).toBe(false);
  });

  it('reports full progress and accuracy when typed matches the target exactly', () => {
    const progress = getTypingProgress('hello', 'hello');
    expect(progress.typedLength).toBe(5);
    expect(progress.correctChars).toBe(5);
    expect(progress.errorChars).toBe(0);
    expect(progress.accuracyPercent).toBe(100);
    expect(progress.progressPercent).toBe(100);
    expect(progress.completed).toBe(true);
  });

  it('counts mismatched characters as errors and lowers accuracy accordingly', () => {
    // "hxllo" vs "hello": one mismatch (index 1) out of 5 typed characters.
    const progress = getTypingProgress('hello', 'hxllo');
    expect(progress.correctChars).toBe(4);
    expect(progress.errorChars).toBe(1);
    expect(progress.accuracyPercent).toBe(80);
    expect(progress.completed).toBe(true); // still typed the full length
  });

  it('clamps typed length to the target length instead of overflowing', () => {
    const progress = getTypingProgress('hi', 'hi there, this is much longer than the target');
    expect(progress.typedLength).toBe(2);
    expect(progress.progressPercent).toBe(100);
    expect(progress.completed).toBe(true);
  });

  it('is not completed while typed is shorter than the target', () => {
    const progress = getTypingProgress('hello world', 'hello');
    expect(progress.completed).toBe(false);
    expect(progress.progressPercent).toBe(Math.round((5 / 11) * 100));
  });

  it('does not divide by zero for an empty target', () => {
    const progress = getTypingProgress('', '');
    expect(progress.progressPercent).toBe(0);
    expect(progress.completed).toBe(false);
  });
});

describe('getWordsPerMinute', () => {
  it('returns 0 when no time has elapsed, avoiding a divide by zero', () => {
    expect(getWordsPerMinute(50, 0)).toBe(0);
  });

  it('uses the standard 5 characters per word convention', () => {
    // 50 characters = 10 "words", in 60 seconds = 1 minute, so 10 wpm.
    expect(getWordsPerMinute(50, 60)).toBe(10);
  });

  it('scales correctly for shorter durations', () => {
    // 25 characters = 5 "words", in 30 seconds = 0.5 minute, so 10 wpm.
    expect(getWordsPerMinute(25, 30)).toBe(10);
  });
});
