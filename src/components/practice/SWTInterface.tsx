/**
 * SWT Answer Typing Interface Component
 *
 * Monkeytype-style exact-text typing practice using a real PTE Summarize
 * Written Text model answer as the target text. This is deliberately not a
 * real PTE SWT test: there is no free-form summary writing and no PTE form
 * validation (word count bounds, sentence count) here. The user types the
 * exact target answer, the same way Monkeytype has one exact target text,
 * and is scored on typing accuracy and speed instead. The original passage
 * is kept only as a small, collapsed reference, never the typing target.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TYPING_TASKS } from '../../config/typingTasks';
import type { SessionManager } from '../../services/session/sessionManager';
import type { ItemType } from '../../types/database';
import type { PracticeItem } from '../../types/dataset.types';
import { getTypingProgress, getWordsPerMinute, type TypingProgress } from '../../utils/typingPracticeMetrics';
import { formatTimer } from '../../utils/writingTaskValidation';

interface SWTInterfaceProps {
  item: PracticeItem;
  sessionManager?: SessionManager;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: (isCorrect?: boolean) => void;
}

const task = TYPING_TASKS.swt;

const monkeytypeColors = {
  background: '#1e293b',
  border: '#334155',
  correct: '#e2e8f0',
  wrong: '#f87171',
  current: '#f59e0b',
  untyped: '#94a3b8',
};

const SWTInterface: React.FC<SWTInterfaceProps> = ({
  item,
  sessionManager,
  onNext,
  onPrevious,
  onComplete,
}) => {
  /* eslint-disable @typescript-eslint/no-explicit-any -- raw dataset item is a union; fields are read defensively */
  const swtItem = item as any;
  const passage: string = swtItem?.passage || '';
  const targetText: string = swtItem?.answer || '';
  const difficulty: string = swtItem?.metadata?.difficulty || 'normal';
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const hasReferencePassage = passage.trim().length > 0;

  const [typed, setTyped] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const hasRecordedRef = useRef(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const progress = getTypingProgress(targetText, typed);
  const wpm = getWordsPerMinute(progress.typedLength, elapsedSeconds);

  // Resets local practice state. Called on Restart, on Next/Previous, and on
  // any item change regardless of which navigation path triggered it.
  const resetLocalState = () => {
    setTyped('');
    setStartedAt(null);
    setElapsedSeconds(0);
    setFinished(false);
    setShowPassage(false);
    hasRecordedRef.current = false;
  };

  useEffect(() => {
    resetLocalState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // Auto-focus the typing capture input on load and whenever a new item arrives.
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(focusTimer);
  }, [item]);

  // Elapsed stopwatch, not a countdown: this is typing practice, not a timed
  // exam, so it ticks up from zero and stops once typing is finished. Ticks
  // are computed fresh from Date.now() rather than incremented, so WPM stays
  // accurate regardless of setInterval drift.
  useEffect(() => {
    if (startedAt === null || finished) return undefined;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, finished]);

  /**
   * Records one attempt to the session, complete or not, so abandoned
   * attempts show up in analytics too. onComplete (which feeds the app's
   * broader progress tracking) is a separate concern, only fired for a
   * genuine completion, not from here.
   */
  const recordSessionAttempt = (
    finalTyped: string,
    finalElapsedSeconds: number,
    finalProgress: TypingProgress,
    completed: boolean
  ) => {
    if (hasRecordedRef.current || !sessionManager || finalTyped.length === 0) return;
    hasRecordedRef.current = true;

    const finalWpm = getWordsPerMinute(finalProgress.typedLength, finalElapsedSeconds);
    const isCorrect = completed && finalProgress.accuracyPercent >= task.accuracyThresholdPercent;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const itemId = (item as any)?.id || `${task.id}-${Date.now()}`;

    sessionManager
      .recordItem({
        item_id: itemId,
        item_type: 'passage' as ItemType,
        item_text: targetText,
        user_response: finalTyped,
        score: finalProgress.accuracyPercent,
        is_correct: isCorrect,
        attempts: 1,
        time_spent_sec: finalElapsedSeconds,
        feedback: `${finalWpm} WPM, ${finalProgress.accuracyPercent}% accuracy, ${finalProgress.errorChars} error${finalProgress.errorChars === 1 ? '' : 's'}${completed ? '' : ', incomplete'}`,
      })
      .catch((error) => {
        console.error('[SWTInterface] Failed to record session:', error);
        // Non-blocking: results still render even if session tracking fails.
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (finished) return;
    const nextTyped = e.target.value.slice(0, targetText.length);
    const now = Date.now();
    const effectiveStartedAt = startedAt ?? now;
    if (startedAt === null) {
      setStartedAt(now);
    }
    setTyped(nextTyped);

    if (targetText.length > 0 && nextTyped.length >= targetText.length) {
      const finalElapsedSeconds = Math.floor((now - effectiveStartedAt) / 1000);
      const finalProgress = getTypingProgress(targetText, nextTyped);
      setElapsedSeconds(finalElapsedSeconds);
      setFinished(true);
      recordSessionAttempt(nextTyped, finalElapsedSeconds, finalProgress, true);
      if (onComplete) {
        onComplete(finalProgress.accuracyPercent >= task.accuracyThresholdPercent);
      }
    }
  };

  const handleRestart = () => {
    resetLocalState();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  /**
   * Ends the attempt early without navigating away, so an incomplete
   * attempt has a real, visible Results state (matching "completed" the
   * same view can show), not just a silent background recording.
   */
  const handleFinishEarly = () => {
    if (finished || typed.length === 0) return;
    const preciseElapsed = startedAt !== null ? Math.floor((Date.now() - startedAt) / 1000) : elapsedSeconds;
    const finalProgress = getTypingProgress(targetText, typed);
    setElapsedSeconds(preciseElapsed);
    setFinished(true);
    recordSessionAttempt(typed, preciseElapsed, finalProgress, finalProgress.completed);
  };

  const handleNext = () => {
    if (!finished && typed.length > 0) {
      const preciseElapsed = startedAt !== null ? Math.floor((Date.now() - startedAt) / 1000) : elapsedSeconds;
      recordSessionAttempt(typed, preciseElapsed, getTypingProgress(targetText, typed), false);
    }
    resetLocalState();
    if (onNext) onNext();
  };

  const handlePrevious = () => {
    if (!finished && typed.length > 0) {
      const preciseElapsed = startedAt !== null ? Math.floor((Date.now() - startedAt) / 1000) : elapsedSeconds;
      recordSessionAttempt(typed, preciseElapsed, getTypingProgress(targetText, typed), false);
    }
    resetLocalState();
    if (onPrevious) onPrevious();
  };

  const navButtonClass =
    'rounded border border-app-border px-4 py-2.5 text-app-text-secondary transition-colors hover:border-app-border-light hover:text-app-text-primary';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-7xl flex-col rounded-lg bg-app-bg-primary px-4 py-6 text-app-text-primary sm:px-8 sm:py-8 lg:px-10">
      <div className="mb-8 flex items-center justify-between">
        <span className="text-lg font-semibold lowercase text-yellow-400">{task.shortName.toLowerCase()}.</span>
        <span className="rounded bg-app-bg-card px-2 py-1 text-xs uppercase tracking-wide text-app-text-secondary">
          {difficulty}
        </span>
      </div>

      {!finished && (
        <>
          {/* Compact metrics bar: timer, WPM, accuracy, progress, errors. No
              PTE validity status here; this is typing accuracy/speed practice.
              Only shown while typing: Results below has its own complete set. */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-base" aria-live="polite">
            <span className="font-mono text-xl text-yellow-400">{formatTimer(elapsedSeconds)}</span>
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary">{wpm}</span> wpm
            </span>
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary">{progress.accuracyPercent}%</span> accuracy
            </span>
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary" data-testid="typing-progress-percent">
                {progress.progressPercent}%
              </span>{' '}
              done
            </span>
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary" data-testid="typing-error-count">
                {progress.errorChars}
              </span>{' '}
              error{progress.errorChars === 1 ? '' : 's'}
            </span>
          </div>

          <label htmlFor="swt-typing-input" className="sr-only">
            Type the target text
          </label>
          <textarea
            id="swt-typing-input"
            ref={inputRef}
            value={typed}
            onChange={handleChange}
            className="sr-only"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {/* The target text with per-character highlighting is the main
              visual UI; the textarea above only captures keystrokes. */}
          <div
            data-testid="typing-target"
            className="mb-8 min-h-[22rem] cursor-text select-none whitespace-pre-wrap break-words rounded-lg border p-5 font-mono text-2xl leading-loose tracking-wide sm:p-6 md:text-3xl md:leading-loose xl:min-h-[28rem]"
            onClick={() => inputRef.current?.focus()}
            style={{ backgroundColor: monkeytypeColors.background, borderColor: monkeytypeColors.border }}
          >
            {targetText.split('').map((char, index) => {
              const isTyped = index < typed.length;
              const isCurrent = index === typed.length;
              const isCorrectChar = isTyped && typed[index] === char;
              const isWrongChar = isTyped && typed[index] !== char;
              return (
                <span
                  key={index}
                  className={isWrongChar ? 'underline' : undefined}
                  style={{
                    color: isCorrectChar
                      ? monkeytypeColors.correct
                      : isWrongChar
                        ? monkeytypeColors.wrong
                        : monkeytypeColors.untyped,
                    borderLeft: isCurrent ? `2px solid ${monkeytypeColors.current}` : undefined,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={handleRestart} className={navButtonClass}>
              Restart
            </button>
            {hasReferencePassage && (
              <button type="button" onClick={() => setShowPassage((prev) => !prev)} className={navButtonClass}>
                {showPassage ? 'Hide reference passage' : 'Show reference passage'}
              </button>
            )}
            <button
              type="button"
              onClick={handleFinishEarly}
              disabled={typed.length === 0}
              className={`${navButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Finish early
            </button>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={handlePrevious} className={navButtonClass}>
                Previous
              </button>
              <button type="button" onClick={handleNext} className={navButtonClass}>
                Next
              </button>
            </div>
          </div>

          {/* Kept small and collapsed by default: the passage is reference
              material, never the typing target. */}
          {hasReferencePassage && showPassage && (
            <div className="mt-6">
              <p className="mb-1 text-xs uppercase tracking-wide text-app-text-muted">Reference passage</p>
              <p className="break-words text-sm leading-relaxed text-app-text-secondary">{passage}</p>
            </div>
          )}
        </>
      )}

      {finished && (
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-yellow-400">Results</p>

          <div className="mb-8 flex flex-wrap items-center gap-5 text-base" aria-live="polite">
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary">{wpm}</span> wpm
            </span>
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary">{progress.accuracyPercent}%</span> accuracy
            </span>
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary">{progress.errorChars}</span> error{progress.errorChars === 1 ? '' : 's'}
            </span>
            <span className="text-app-text-secondary">
              <span className="text-app-text-primary">{formatTimer(elapsedSeconds)}</span> time
            </span>
            <span className={progress.completed ? 'text-yellow-400' : 'text-app-text-muted'}>
              {progress.completed ? 'Completed' : 'Incomplete'}
            </span>
          </div>

          <p className="mb-1 text-xs uppercase tracking-wide text-app-text-muted">Target text</p>
          <p className="mb-8 break-words rounded-lg border border-app-border bg-app-bg-secondary p-5 text-xl leading-loose text-app-text-secondary sm:p-6">
            {targetText}
          </p>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleRestart} className={navButtonClass}>
              Restart
            </button>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={handlePrevious} className={navButtonClass}>
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded bg-yellow-400 px-4 py-2.5 font-semibold text-app-text-inverse"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SWTInterface;
