/**
 * Typing Practice Interface Component
 *
 * Monkeytype-style exact-text typing practice, driven by whichever typing task
 * is selected (see src/config/typingTasks.ts). This is deliberately not a real
 * PTE test: there is no free-form writing and no PTE form validation (word
 * count bounds, sentence count) here. The user types the exact target text, the
 * same way Monkeytype has one exact target text, and is scored on typing
 * accuracy and speed instead. Any accompanying passage or context is kept only
 * as a small, collapsed reference, never the typing target.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TYPING_TASKS, type TypingMode } from '../../config/typingTasks';
import type { SessionManager } from '../../services/session/sessionManager';
import type { ItemType } from '../../types/database';
import type { PracticeItem } from '../../types/dataset.types';
import { getTypingProgress, getWordsPerMinute, type TypingProgress } from '../../utils/typingPracticeMetrics';
import { formatTimer } from '../../utils/writingTaskValidation';

interface SWTInterfaceProps {
  item: PracticeItem;
  typingMode: TypingMode;
  sessionManager?: SessionManager;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: (isCorrect?: boolean) => void;
}

const monkeytypeColors = {
  background: '#ffffff',
  border: '#e2e8f0',
  correct: '#172033',
  wrong: '#dc2626',
  current: '#4f46e5',
  untyped: '#475569',
};

const SWTInterface: React.FC<SWTInterfaceProps> = ({
  item,
  typingMode,
  sessionManager,
  onNext,
  onPrevious,
  onComplete,
}) => {
  const task = TYPING_TASKS[typingMode];
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
  const accuracyLabel = typed.length > 0 ? `${progress.accuracyPercent}%` : '—';

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

  const focusTypingInput = () => inputRef.current?.focus();

  const navButtonClass =
    'min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2';
  const primaryButtonClass =
    'min-h-12 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2';
  const metricCardClass =
    'rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-6xl flex-col rounded-3xl bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 sm:py-8 lg:px-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{task.title}</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Exact-answer typing practice</h2>
          <p className="mt-1 text-sm text-slate-500">Type the model answer accurately and at a natural pace.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
          {difficulty}
        </span>
      </div>

      {!finished && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5" aria-live="polite">
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{formatTimer(elapsedSeconds)}</p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Speed</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{wpm} <span className="text-sm font-medium text-slate-500">WPM</span></p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{accuracyLabel}</p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900" data-testid="typing-progress-percent">
                {progress.progressPercent}%
              </p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Errors</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900" data-testid="typing-error-count">
                {progress.errorChars}
              </p>
            </div>
          </div>

          <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-200"
              style={{ width: `${progress.progressPercent}%` }}
            />
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
            className="mb-8 min-h-[18rem] cursor-text select-none rounded-3xl border p-8 shadow-sm sm:p-10 lg:p-12"
            onClick={focusTypingInput}
            style={{ backgroundColor: monkeytypeColors.background, borderColor: monkeytypeColors.border }}
          >
            <div className="mx-auto max-w-4xl whitespace-pre-wrap break-words font-sans text-[clamp(1.35rem,2vw,1.75rem)] leading-[1.85] tracking-normal">
              {targetText.split('').map((char, index) => {
                const isTyped = index < typed.length;
                const isCurrent = index === typed.length;
                const isCorrectChar = isTyped && typed[index] === char;
                const isWrongChar = isTyped && typed[index] !== char;
                return (
                  <span
                    key={index}
                    className={isWrongChar ? 'decoration-2 underline underline-offset-4' : undefined}
                    style={{
                      color: isCorrectChar
                        ? monkeytypeColors.correct
                        : isWrongChar
                          ? monkeytypeColors.wrong
                          : monkeytypeColors.untyped,
                      backgroundColor: isCurrent ? '#eef2ff' : undefined,
                      boxShadow: isCurrent ? `inset 0 -3px 0 ${monkeytypeColors.current}` : undefined,
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:items-center">
            <button type="button" onClick={handleRestart} className={navButtonClass}>
              Restart
            </button>
            {hasReferencePassage && (
              <button type="button" onClick={() => setShowPassage((prev) => !prev)} className={navButtonClass}>
                {showPassage ? 'Hide reference passage' : 'Show reference passage'}
              </button>
            )}
            {typed.length > 0 && (
              <button type="button" onClick={handleFinishEarly} className={navButtonClass}>
                Finish early
              </button>
            )}
            <div className="flex flex-1 justify-center">
              <button type="button" onClick={focusTypingInput} className={primaryButtonClass}>
                {typed.length > 0 ? 'Continue typing' : 'Start typing'}
              </button>
            </div>
            <div className="flex gap-2 sm:ml-auto">
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
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reference passage</p>
              <p className="break-words text-sm leading-relaxed text-slate-600">{passage}</p>
            </div>
          )}
        </>
      )}

      {finished && (
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-indigo-600">Results</p>

          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5" aria-live="polite">
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Speed</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{wpm} <span className="text-sm font-medium text-slate-500">WPM</span></p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{progress.accuracyPercent}%</p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Errors</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{progress.errorChars}</p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{formatTimer(elapsedSeconds)}</p>
            </div>
            <div className={metricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <p className={progress.completed ? 'mt-1 text-2xl font-semibold text-green-600' : 'mt-1 text-2xl font-semibold text-amber-600'}>
                {progress.completed ? 'Completed' : 'Incomplete'}
              </p>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Target text</p>
          <p className="mb-8 break-words rounded-2xl border border-slate-200 bg-white p-6 text-xl leading-loose text-slate-700 shadow-sm">
            {targetText}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleRestart} className={navButtonClass}>
              Restart
            </button>
            <div className="flex gap-2 sm:ml-auto">
              <button type="button" onClick={handlePrevious} className={navButtonClass}>
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={primaryButtonClass}
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
