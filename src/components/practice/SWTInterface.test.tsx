import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SWTInterface from './SWTInterface';

// Pure word/sentence counting and form validation logic is task-neutral and
// tested on its own in src/utils/writingTaskValidation.test.ts. These tests
// cover the component itself: rendering, submitting, and session recording.

const sampleItem = {
  id: 'swt-1',
  title: 'Sample Passage',
  passage: 'This is the original passage text.',
  answer: 'This is the model answer sentence.',
  wordCount: 6,
  sourceSet: 'PTE_SWT_Practice_Examples',
  metadata: {
    difficulty: 'easy' as const,
    category: 'pte-swt' as const,
    source: 'pte-swt',
    tags: ['swt', 'summarize-written-text'],
  },
};

describe('SWTInterface', () => {
  it('renders the passage and a textarea, with no model answer visible before submitting', () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);
    expect(screen.getByText(sampleItem.passage)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type your one sentence summary/i)).toBeInTheDocument();
    expect(screen.queryByText(sampleItem.answer)).not.toBeInTheDocument();
  });

  it('shows the model answer only after submitting a valid answer', async () => {
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} />);

    const textarea = screen.getByPlaceholderText(/type your one sentence summary/i);
    await user.type(textarea, 'one two three four five six seven.');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(sampleItem.answer)).toBeInTheDocument();
  });

  it('records the session item with is_correct set from the form status, not left unset', async () => {
    // Regression: recordItem was previously called without is_correct at
    // all, so valid SWT attempts were saved but never counted as correct
    // in session accuracy (sessionManager filters on is_correct === true).
    const recordItem = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} sessionManager={{ recordItem } as any} />);

    const textarea = screen.getByPlaceholderText(/type your one sentence summary/i);
    await user.type(textarea, 'one two three four five six seven.');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(recordItem).toHaveBeenCalledWith(
      expect.objectContaining({ is_correct: true, item_type: 'passage' })
    );
  });

  it('records a human-readable feedback note with the word and sentence count', async () => {
    // session_items has no dedicated word/sentence count columns; feedback
    // is the field built for a short note, so this is where that lives.
    const recordItem = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    render(<SWTInterface item={sampleItem as any} sessionManager={{ recordItem } as any} />);

    const textarea = screen.getByPlaceholderText(/type your one sentence summary/i);
    await user.type(textarea, 'one two three four five six seven.');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(recordItem).toHaveBeenCalledWith(
      expect.objectContaining({ feedback: expect.stringContaining('7 words') })
    );
  });
});
