import { describe, expect, it } from 'vitest';
import { SWTAnswerTypingMarkdownExtractor, SWTMarkdownExtractor } from '../../../scripts/pte-data-pipeline.js';
import type { ParsedSWTItem } from '../../../scripts/pte-data-pipeline.js';

// Deliberately includes a wrong "Word count" annotation, a Key Changes /
// Linking words teaching section, and a trailing Practice Tips section, so
// the tests can prove the extractor ignores all of that rather than trusting
// the file's own labels.
const FIXTURE = `# PTE SWT Practice Examples - Fixture

## 📑 Table of Contents

1. [Example 1: Sample Topic (Easy)](#example-1-sample-topic-easy)

---

## Example 1: Sample Topic (Easy)

### Original Passage

**This is the first sentence of the passage.** This is a second sentence with more detail.

A second paragraph continues the passage here.

### SWT Answer

**This is the model one sentence summary answer for the fixture passage.**

**Word count:** 999 words ✓

### Key Changes Made

- "first sentence" → **"opening line"** (paraphrase note that must not leak into the dataset)

**Linking words used:** as, while ✓

---

## Example 2: Second Topic (Medium - Complex)

### Original Passage

Another passage body goes here for the second example.

### SWT Answer

**Second example model answer sentence right here.**

**Word count:** 6 words ✓

---

## Practice Tips

This section must never be parsed as an example.

---
`;

function fakeFs(content: string) {
  return {
    existsSync: () => true,
    readFileSync: () => content,
  };
}

/** Runs the extractor against FIXTURE. */
function extractFixtureItems(): ParsedSWTItem[] {
  return SWTMarkdownExtractor.extract('/fake/path.md', fakeFs(FIXTURE), 'FixtureSet');
}

/**
 * Same as extractFixtureItems, but asserts and narrows the first item so
 * callers get ParsedSWTItem rather than the noUncheckedIndexedAccess-widened
 * ParsedSWTItem | undefined.
 */
function extractFixtureFirst(): ParsedSWTItem {
  const [first] = extractFixtureItems();
  if (!first) {
    throw new Error('Expected at least one parsed item');
  }
  return first;
}

/** Same idea as extractFixtureFirst, narrowing the first two items. */
function extractFixtureFirstTwo(): [ParsedSWTItem, ParsedSWTItem] {
  const [first, second] = extractFixtureItems();
  if (!first || !second) {
    throw new Error('Expected at least two parsed items');
  }
  return [first, second];
}

describe('SWTMarkdownExtractor', () => {
  it('parses each Example section into one item', () => {
    expect(extractFixtureItems()).toHaveLength(2);
  });

  describe('SWTAnswerTypingMarkdownExtractor', () => {
    it('parses clean answer-only markdown into typing targets', () => {
      const fixture = `# SWT Answer Typing Source

  <!-- comment ignored -->

  1. First exact model answer target.
  2. **Second exact model answer target with markdown.**
  `;

      const items = SWTAnswerTypingMarkdownExtractor.extract('/fake/answers.md', fakeFs(fixture), 'swt-answer-typing');

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        title: 'Answer 1',
        passage: '',
        answer: 'First exact model answer target.',
        wordCount: 5,
        sourceSet: 'swt-answer-typing',
        difficulty: 'normal',
      });
      expect(items[1]?.answer).toBe('Second exact model answer target with markdown.');
    });
  });

  it('extracts title and difficulty from the header line', () => {
    const [first, second] = extractFixtureFirstTwo();
    expect(first.title).toBe('Sample Topic');
    expect(first.difficulty).toBe('easy');
    expect(second.title).toBe('Second Topic');
    // "Medium - Complex" maps to hard, distinct from a plain "Medium".
    expect(second.difficulty).toBe('hard');
  });

  it('strips markdown bold and joins passage paragraphs, but keeps only the answer sentence', () => {
    const first = extractFixtureFirst();
    expect(first.passage).toBe(
      'This is the first sentence of the passage. This is a second sentence with more detail.\n\nA second paragraph continues the passage here.'
    );
    expect(first.answer).toBe('This is the model one sentence summary answer for the fixture passage.');
  });

  it('computes word count from the cleaned answer text, not the markdown-stated count', () => {
    const first = extractFixtureFirst();
    expect(first.wordCount).toBe(12);
    // The fixture's own "999 words" annotation is deliberately wrong; the
    // extractor must compute the real count rather than trust that label.
    expect(first.wordCount).not.toBe(999);
  });

  it('excludes Key Changes Made and Linking words commentary from the dataset fields', () => {
    const first = extractFixtureFirst();
    expect(first.passage).not.toContain('Key Changes');
    expect(first.answer).not.toContain('opening line');
    expect(first.answer).not.toContain('Linking words');
  });

  it('does not parse the trailing Practice Tips section as an example', () => {
    expect(extractFixtureItems().every((item) => item.title !== 'Practice Tips')).toBe(true);
  });

  it('stamps every item with the provided source set', () => {
    expect(extractFixtureItems().every((item) => item.sourceSet === 'FixtureSet')).toBe(true);
  });
});
