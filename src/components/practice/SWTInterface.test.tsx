import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SWTInterface from './SWTInterface';

// Pure typing metrics logic is task-neutral and tested on its own in
// src/utils/typingPracticeMetrics.test.ts. These tests cover the component:
// rendering the target text, live progress while typing, and completion.

// Deliberately avoids the words "sentence" and "words" in the target text
// itself, so a test asserting those PTE-validation words are absent cannot
// collide with the target content being displayed.
const sampleItem = {
  id: 'swt-1',
  title: 'Sample Passage',
  passage: 'This is the original reference passage that should never be the typing target.',
  answer: 'Type this exact model answer for practice.',
  wordCount: 4,
  sourceSet: 'swt-answer-typing',
  metadata: {
    difficulty: 'easy' as const,
    category: 'pte-swt' as const,
    source: 'pte-swt',
    tags: ['swt', 'answer-typing', 'monkeytype'],
  },
};

const getTypingInput = () => screen.getByLabelText(/type the target text/i);

describe('SWTInterface', () => {
  it('uses item.answer as the typing target, not item.passage', () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);
    // The target is rendered one character per span, so it cannot be found
    // as a single text node; check the concatenated text of its container.
    expect(
      screen.getByText((_, element) => element?.tagName === 'DIV' && element.textContent === sampleItem.answer)
    ).toBeInTheDocument();
  });

  it('keeps the passage collapsed and not visible as the central target by default', () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);
    expect(screen.queryByText(sampleItem.passage)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show reference passage/i })).toBeInTheDocument();
  });

  it('does not show a reference passage control for answer-only source data', () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={{ ...sampleItem, passage: '' } as any} />);
    expect(screen.queryByRole('button', { name: /show reference passage/i })).not.toBeInTheDocument();
  });

  it('reveals the passage only as a small reference when explicitly toggled', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);
    await user.click(screen.getByRole('button', { name: /show reference passage/i }));
    expect(screen.getByText(sampleItem.passage)).toBeInTheDocument();
  });

  it('typing correct characters advances progress and does not increase the error count', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);

    await user.type(getTypingInput(), 'Type this');

    expect(screen.getByTestId('typing-error-count')).toHaveTextContent('0');
    // "Type this" is 9 of 44 characters in the target.
    expect(screen.getByTestId('typing-progress-percent')).toHaveTextContent(
      `${Math.round((9 / sampleItem.answer.length) * 100)}%`
    );
  });

  it('wrong characters count as errors without ending the attempt', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);

    await user.type(getTypingInput(), 'Xype');

    expect(screen.getByTestId('typing-error-count')).toHaveTextContent('1');
    expect(getTypingInput()).toBeInTheDocument(); // still in the typing view, not finished
  });

  it('uses distinct Monkeytype-style colors for wrong, correct, current, and untyped characters', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);

    await user.type(getTypingInput(), 'Xy');

    const chars = Array.from(screen.getByTestId('typing-target').querySelectorAll('span'));
    expect(screen.getByTestId('typing-target')).toHaveStyle({
      backgroundColor: '#1e293b',
      borderColor: '#334155',
    });
    expect(chars[0]).toHaveStyle({ color: '#f87171' }); // wrong
    expect(chars[1]).toHaveStyle({ color: '#e2e8f0' }); // correct
    expect(chars[2]).toHaveStyle({ color: '#94a3b8', borderLeft: '2px solid #f59e0b' }); // current
    expect(chars[3]).toHaveStyle({ color: '#94a3b8' }); // untyped
  });

  it('shows no PTE validity language anywhere: no words/sentences bounds, no Valid/Invalid', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);
    await user.type(getTypingInput(), sampleItem.answer);

    expect(screen.queryByText(/valid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sentence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bwords\b/i)).not.toBeInTheDocument();
  });

  it('renders WPM, accuracy, errors, time, and Completed status in results once the target is fully typed', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);

    await user.type(getTypingInput(), sampleItem.answer);

    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText(/wpm/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); // fully correct, 100% accuracy
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/time/i)).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('reaches a real Incomplete results state via Finish early, not just a silent recording', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);

    await user.type(getTypingInput(), 'Type this');
    await user.click(screen.getByRole('button', { name: /finish early/i }));

    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText('Incomplete')).toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('records the completed session item with the answer as item_text, the typed input as user_response, accuracy as score, and typing stats in feedback', async () => {
    const recordItem = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} sessionManager={{ recordItem } as any} />);

    await user.type(getTypingInput(), sampleItem.answer);

    expect(recordItem).toHaveBeenCalledWith(
      expect.objectContaining({
        item_text: sampleItem.answer,
        user_response: sampleItem.answer,
        score: 100,
        is_correct: true,
        item_type: 'passage',
        feedback: expect.stringMatching(/wpm.*100% accuracy.*0 errors/i),
      })
    );
  });

  it('records an incomplete attempt with is_correct false when navigating away mid-typing', async () => {
    const recordItem = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(
      <SWTInterface
        item={sampleItem as any}
        sessionManager={{ recordItem } as any}
        onNext={() => {}}
      />
    );

    await user.type(getTypingInput(), 'Type this');
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    expect(recordItem).toHaveBeenCalledWith(
      expect.objectContaining({
        user_response: 'Type this',
        is_correct: false,
        feedback: expect.stringContaining('incomplete'),
      })
    );
  });
});
