/**
 * Task-neutral typing accuracy/speed metrics for Monkeytype-style exact-text
 * typing practice. Nothing here knows about SWT specifically; it compares
 * whatever target and typed strings it is given.
 *
 * Accuracy and error count are derived from the current typed string against
 * the target, not from full keystroke history. Backspacing to fix a mistake
 * removes it from the count; this does not match stricter typing-test
 * conventions that keep a mistake counted even after it is corrected, but is
 * far simpler to reason about and test, and still gives a meaningful signal.
 */

export interface TypingProgress {
  /** Characters typed so far, capped at the target length. */
  typedLength: number;
  /** Typed characters that match the target at that position. */
  correctChars: number;
  /** Typed characters that do not match the target at that position. */
  errorChars: number;
  /** 0 to 100. 100 when nothing has been typed yet (nothing to be wrong about). */
  accuracyPercent: number;
  /** 0 to 100. How much of the target has been typed. */
  progressPercent: number;
  /** True once every character of the target has been typed. */
  completed: boolean;
}

/** Compares typed against target character by character, capped at target's length. */
export function getTypingProgress(target: string, typed: string): TypingProgress {
  const clampedTyped = typed.slice(0, target.length);
  let correctChars = 0;
  for (let i = 0; i < clampedTyped.length; i++) {
    if (clampedTyped[i] === target[i]) correctChars++;
  }
  const errorChars = clampedTyped.length - correctChars;
  const accuracyPercent =
    clampedTyped.length === 0 ? 100 : Math.round((correctChars / clampedTyped.length) * 100);
  const progressPercent = target.length === 0 ? 0 : Math.round((clampedTyped.length / target.length) * 100);
  const completed = target.length > 0 && clampedTyped.length >= target.length;

  return { typedLength: clampedTyped.length, correctChars, errorChars, accuracyPercent, progressPercent, completed };
}

/**
 * Words per minute using the standard typing-test convention of 5 characters
 * per word, which normalizes across texts instead of depending on how long
 * the actual words in the target happen to be.
 */
export function getWordsPerMinute(typedLength: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  const wordsTyped = typedLength / 5;
  return Math.round(wordsTyped / (elapsedSeconds / 60));
}
