/**
 * SWT (Summarize Written Text) Interface Component
 *
 * A minimal, Monkeytype inspired practice page for PTE Summarize Written
 * Text. Unlike WFD, SWT has no single exact target text, so red never means
 * "different from the model answer" here. Red only ever means a PTE form
 * problem: empty, too short, too long, or more than the allowed sentences.
 *
 * Kept to four parts: Header, compact status bar (folds in what the design
 * doc called Test options plus live stats), Typing area, Results. The task
 * rules (word/sentence bounds, time limit, placeholder) all come from
 * WRITING_TASKS.swt, and the counting/validation logic is task-neutral, so
 * a future writing task like SST can reuse this same pattern.
 */

import React, { useEffect, useRef, useState } from 'react';
import { WRITING_TASKS } from '../../config/writingTasks';
import type { SessionManager } from '../../services/session/sessionManager';
import type { ItemType } from '../../types/database';
import type { PracticeItem } from '../../types/dataset.types';
import { countSentences, countWords, formatTimer, getFormStatus } from '../../utils/writingTaskValidation';

interface SWTInterfaceProps {
  item: PracticeItem;
  sessionManager?: SessionManager;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: (isCorrect?: boolean) => void;
}

const task = WRITING_TASKS.swt;

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
  const modelAnswer: string = swtItem?.answer || '';
  const difficulty: string = swtItem?.metadata?.difficulty || 'normal';
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [answer, setAnswer] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(task.timeLimitSeconds);
  const [submitted, setSubmitted] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = countWords(answer);
  const sentenceCount = countSentences(answer);
  const formStatus = getFormStatus(answer, wordCount, sentenceCount, task);
  const elapsedSeconds = task.timeLimitSeconds - remainingSeconds;

  // Resets local practice state. Called on Restart, on Next/Previous, and on
  // any item change regardless of which navigation path triggered it.
  const resetLocalState = () => {
    setAnswer('');
    setStartedAt(null);
    setRemainingSeconds(task.timeLimitSeconds);
    setSubmitted(false);
    setShowModelAnswer(false);
  };

  useEffect(() => {
    resetLocalState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // Auto-focus the typing area on load and whenever a new item arrives.
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(focusTimer);
  }, [item]);

  // Countdown ticks once started, and stops at zero or once submitted. One
  // interval per start, self clearing at zero rather than recreated each tick.
  useEffect(() => {
    if (startedAt === null || submitted) return undefined;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, submitted]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (submitted) return;
    if (startedAt === null) {
      setStartedAt(Date.now());
    }
    setAnswer(e.target.value);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitted) return;

    setSubmitted(true);
    setShowModelAnswer(true);

    if (sessionManager) {
      try {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const itemId = (item as any)?.id || `${task.id}-${Date.now()}`;
        await sessionManager.recordItem({
          item_id: itemId,
          item_type: 'passage' as ItemType,
          item_text: passage,
          user_response: answer.trim(),
          is_correct: formStatus.valid,
          attempts: 1,
          time_spent_sec: elapsedSeconds,
          // session_items has no dedicated word/sentence count columns, so
          // this is the one field built for a short human-readable note.
          // task_type itself is recorded once at the session level, not
          // per item (see AppContent's startSession call).
          feedback: `${wordCount} word${wordCount === 1 ? '' : 's'}, ${sentenceCount} sentence${sentenceCount === 1 ? '' : 's'}, ${formStatus.label}`,
        });
      } catch (error) {
        console.error('[SWTInterface] Failed to record session:', error);
        // Non-blocking: results still render even if session tracking fails.
      }
    }

    if (onComplete) {
      onComplete(formStatus.valid);
    }
  };

  const handleRestart = () => {
    resetLocalState();
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleNext = () => {
    resetLocalState();
    if (onNext) onNext();
  };

  const handlePrevious = () => {
    resetLocalState();
    if (onPrevious) onPrevious();
  };

  const statusColorClass = formStatus.valid ? 'text-yellow-400' : 'text-red-400';
  const liveStatusLabel = startedAt === null ? 'Start typing' : formStatus.label;
  const liveStatusClass = startedAt === null ? 'text-app-text-muted' : statusColorClass;
  const navButtonClass =
    'rounded border border-app-border px-4 py-2.5 text-app-text-secondary transition-colors hover:border-app-border-light hover:text-app-text-primary';

  // Shared by the live typing view and the frozen results view, so the
  // timer/word/sentence/status line only has one implementation.
  const renderStatusBar = (label: string, labelColorClass: string, timerColorClass: string) => (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm" aria-live="polite">
      <span className={`font-mono text-xl ${timerColorClass}`}>{formatTimer(remainingSeconds)}</span>
      <span className="text-app-text-secondary">
        <span className="text-app-text-primary">{wordCount}</span>/{task.maxWords} words
      </span>
      <span className="text-app-text-secondary">
        <span className="text-app-text-primary">{sentenceCount}</span> sentence{sentenceCount === 1 ? '' : 's'}
      </span>
      <span className={labelColorClass}>{label}</span>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg bg-app-bg-primary p-4 pb-10 text-app-text-primary sm:p-8 sm:pb-10">
      {/* Header: minimal, matches the Monkeytype-style wordmark, nothing else competes for attention here. */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-lg font-semibold lowercase text-yellow-400">{task.shortName.toLowerCase()}.</span>
        <span className="rounded bg-app-bg-card px-2 py-1 text-xs uppercase tracking-wide text-app-text-secondary">
          {difficulty}
        </span>
      </div>

      {/* Passage and typing area are the center of the page; everything else is compact. */}
      <p className="mb-2 text-xs uppercase tracking-wide text-app-text-muted">Original passage</p>
      <p className="mb-6 break-words leading-relaxed text-app-text-secondary">{passage}</p>

      {!submitted && (
        <>
          {renderStatusBar(liveStatusLabel, liveStatusClass, 'text-yellow-400')}

          <label htmlFor="swt-answer" className="sr-only">
            Your one sentence summary
          </label>
          <textarea
            id="swt-answer"
            ref={textareaRef}
            value={answer}
            onChange={handleChange}
            placeholder={task.placeholder}
            rows={5}
            className="w-full min-h-[9rem] resize-y break-words rounded-md border border-app-border bg-app-bg-secondary p-4 text-xl leading-relaxed text-app-text-primary placeholder-app-text-muted focus:border-yellow-400 focus:outline-none"
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="rounded bg-yellow-400 px-4 py-2.5 font-semibold text-app-text-inverse transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit
            </button>
            <button type="button" onClick={handleRestart} className={navButtonClass}>
              Restart
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
        </>
      )}


      {submitted && (
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-yellow-400">Results</p>

          {renderStatusBar(formStatus.label, statusColorClass, 'text-app-text-muted')}

          <p className="mb-1 text-xs uppercase tracking-wide text-app-text-muted">Your summary</p>
          <p className="mb-6 break-words rounded-md border border-app-border bg-app-bg-secondary p-4 text-app-text-primary">
            {answer.trim() || '(empty)'}
          </p>

          {showModelAnswer && (
            <>
              <p className="mb-1 text-xs uppercase tracking-wide text-app-text-muted">Model answer</p>
              <p className="mb-6 break-words rounded-md border border-app-border bg-app-bg-secondary p-4 text-app-text-secondary">
                {modelAnswer}
              </p>
            </>
          )}

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
