# SWT Answer Typing Design

## Purpose

SWT Answer Typing is Monkeytype-style exact-text typing practice. It uses real
SWT model answers as typing targets, but it is deliberately not a real PTE SWT
test: there is no free-form summary writing, no 5-75 word validation, no
one-sentence validation, and no content similarity scoring.

## Source data

The app-facing source is one clean answer-only markdown file:

- `data/source/pte/swt/swt-answer-typing.md`

Each numbered line is one exact target answer:

```md
1. First exact model answer target.
2. Second exact model answer target.
```

The generated runtime dataset is:

- `data/processed/pte-swt-dataset.json`

The original full SWT markdown files may remain in the same folder as raw
reference/source material. They are intentionally not parsed by the app
pipeline for this Monkeytype mode; only `swt-answer-typing.md` is used to
generate the runtime dataset.

The generated items keep compatibility fields, but the app only needs `answer`
as the typing target:

```ts
interface SWTAnswerTypingItem {
  id: string;
  title: string;
  passage: string; // empty for the clean answer-only source
  answer: string;
  wordCount: number;
  sourceSet: 'swt-answer-typing';
  metadata: {
    difficulty: 'normal';
    category: 'pte-swt';
    source: 'pte-swt';
    tags: ['swt', 'answer-typing', 'monkeytype'];
  };
}
```

## UI behavior

- `item.answer` is rendered as the exact target text.
- The target is split character-by-character.
- Correct characters use light text.
- Wrong characters use red text with underline.
- The current cursor uses a yellow caret.
- Untyped characters use muted gray.
- The timer is elapsed time, not a countdown.
- Results show WPM, accuracy, errors, time, and Completed/Incomplete.
- `Finish early` shows a real incomplete results state.
- Reference passage controls are hidden when `passage` is empty.

## Session recording

Record both complete and incomplete attempts:

- `item_text`: target answer
- `user_response`: typed text
- `score`: accuracy percentage
- `is_correct`: `completed && accuracy >= threshold`
- `feedback`: WPM, accuracy, errors, and incomplete marker when applicable

## Validation

Run these after changing source, parser, or UI:

```bash
pnpm run data:pte
pnpm run build:ts
pnpm test
pnpm exec playwright test tests/e2e/swt.spec.ts --project=desktop-chromium --project=mobile-chromium
```

`pnpm run data:pte` may touch unrelated generated datasets; avoid committing
that churn unless the source files for those datasets were intentionally changed.
