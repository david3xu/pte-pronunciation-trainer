# SWT Monkeytype-Style Practice Design

## Purpose

Build a focused PTE Summarize Written Text (SWT) practice page inspired by Monkeytype's minimal typing experience. Use the format and interaction discipline, but do not copy Monkeytype behavior exactly: SWT has no single exact target text, so the UI must validate PTE form rules instead of marking characters against a model answer.

Source content must come from `data/source/pte/swt/`.

## Product goal

The page should feel like a quiet writing trainer:

- The original passage is easy to read.
- The response area is the primary focus.
- Feedback is live, minimal, and related to SWT rules.
- The user can type, submit, compare with a model answer, restart, and move to the next passage without leaving the flow.

## Minimal page structure

Keep the first version to four parts only:

1. Header
2. Test options
3. Typing area
4. Results

Do not add accounts, themes, command menus, result history, charts, cookies, backend storage, AI scoring, or complex navigation in the first implementation.

## Visual direction

Use the same quiet visual language as a minimal typing test:

| Element | Direction |
| --- | --- |
| Background | Dark, low-distraction surface |
| Primary accent | Yellow for active controls, timer, caret, and valid status |
| Main text | White or near-white typed response |
| Muted text | Grey passage text, labels, inactive controls |
| Error text | Red only for SWT form problems |
| Layout | Centered, wide but readable, lots of empty space |
| Typography | Monospace or mono-like for typing area; readable sans/mono mix is acceptable |

Suggested visual tokens:

```css
--swt-background: #191919;
--swt-primary: #e2b714;
--swt-text: #d1d0c5;
--swt-muted: #646669;
--swt-error: #ca4754;
```

Adapt these values to the app's existing Tailwind/theme conventions rather than introducing a separate global theme.

## Target layout

```text
swt.
                         10:00     5-75 words     one sentence

Original passage
Muted readable passage text appears here. It can wrap across several lines,
but it should not look like a form field.

Type your one-sentence summary here...

Words 42     Sentences 1     WPM 28     Form valid

Submit     Restart     Next
```

After submission:

```text
Results

Words 42     Sentences 1     WPM 28     Form valid

Your summary
...

Model answer
...

Restart     Next
```

## SWT rules to validate live

Validate form only in the first version:

- The answer must not be empty.
- The answer should be 5-75 words.
- The answer should be one sentence.
- Timer should default to 10 minutes.

Important: red/incorrect status must not mean "different from the model answer." In SWT, many answers can be valid. Red means a PTE form issue, such as too few words, too many words, empty answer, or more than one sentence.

## Interaction model

### Starting

- The typing area should auto-focus when the SWT interface loads if possible.
- If auto-focus is blocked or lost, clicking the typing area focuses it.
- The timer starts on the first typed character, not on page load.

### Typing

- Use a real `<textarea>` for accessibility, mobile keyboard support, selection, paste, and backspace behavior.
- Style the textarea to feel like the Monkeytype typing surface.
- Show live metrics below or above the response:
  - words
  - sentences
  - WPM
  - timer
  - form status

### Submitting

- Submit is enabled once the answer is non-empty.
- Submission freezes the current attempt.
- Show results and model answer.
- Do not auto-score content in v1.

### Restarting

- Restart clears the answer, timer, metrics, submission state, and focuses the typing area again.

### Moving between passages

- Next and previous should use the app's existing item navigation pattern.
- Navigation should reset local SWT typing state.

## Data design

Parse the four source markdown files in `data/source/pte/swt/` into a generated JSON dataset.

Expected source files:

- `PTE_SWT_Practice_Examples.md`
- `PTE_SWT_Practice_Examples_Set2.md`
- `PTE_SWT_Practice_Examples_Set3.md`
- `PTE_SWT_Practice_Examples_Set4.md`

Expected generated item shape:

```ts
interface SummarizeWrittenTextItem {
  id: string;
  title: string;
  passage: string;
  answer: string;
  wordCount?: number;
  sourceSet?: string;
  metadata: {
    difficulty: 'easy' | 'normal' | 'hard';
    category: 'pte-swt';
    source: 'pte-swt';
    tags: string[];
  };
}
```

Generated dataset shape:

```json
{
  "metadata": {
    "source": "pte-swt",
    "description": "PTE Summarize Written Text practice passages",
    "totalTerms": 0
  },
  "items": []
}
```

`totalTerms` may be retained for compatibility, but the actual SWT content should be under `items`.

## Implementation handoff for a fresh developer

### Files to inspect first

- `data/source/pte/swt/`
- `scripts/pte-data-pipeline.js`
- `src/config/AppConfig.ts`
- `src/services/dataset/datasetLoader.ts`
- `src/components/AppContent.tsx`
- `src/components/settings/SettingsPanel.tsx`
- `src/components/practice/WFDInterface.tsx`
- `src/components/practice/VocabTypingInterface.tsx`
- `src/stores/types.ts`
- `src/types/dataset.types.ts`
- `src/types/database.ts`

### Implementation steps

1. Add SWT extraction to `scripts/pte-data-pipeline.js`.
   - Parse each `## Example ...` section.
   - Extract title, difficulty, original passage, SWT answer, answer word count, and source file.
   - Strip markdown formatting from runtime text.
   - Emit one combined `data/processed/pte-swt-dataset.json` with `items`.

2. Register the dataset.
   - Add `swt` to `AppConfig.data.paths.byMode`.
   - Add a `Summarize Written Text` learning mode under the `practice` category.
   - Add bridge mapping in `datasetLoader`: `practice-summarize-written-text` -> `swt`.

3. Extend types.
   - Add `swt` to practice/task unions where needed.
   - Add `SummarizeWrittenTextItem` to `src/types/dataset.types.ts`.
   - Add `practice-summarize-written-text` to `SettingsState.practiceMode`.

4. Add the UI component.
   - Create `src/components/practice/SWTInterface.tsx`.
   - Use a real textarea.
   - Use local state for `answer`, `startedAt`, `remainingSeconds`, `submitted`, and `showModelAnswer`.
   - Derive `wordCount`, `sentenceCount`, `wpm`, and `formStatus`.
   - Reset state on item id changes.

5. Wire routing.
   - Lazy-load `SWTInterface` in `AppContent`.
   - Extend `getPracticeInterfaceType()` to return `swt`.
   - Render `SWTInterface` for SWT items.
   - Update session tracking task type mapping to use `swt`.

6. Update Settings.
   - Add SWT to the Practice Task selector.
   - Change label from `Task Practice (RS/ASQ/WFD)` to include SWT.
   - Keep SWT under existing `practice` type; do not add a new top-level study type.

7. Validate.
   - Run `pnpm run data:pte`.
   - Run `pnpm run build:ts`.
   - Add targeted tests for SWT parsing and live form validation if practical.
   - Avoid committing unrelated generated churn from other datasets.

## Acceptance criteria

- SWT appears as a selectable practice task.
- Selecting SWT loads examples from `data/source/pte/swt/` through generated JSON.
- The SWT page uses the four-part minimal layout: header, options, typing area, results.
- Timer starts on first typed character.
- Live stats show words, sentences, WPM, and form status.
- One-sentence and 5-75 word validation works.
- Submit shows user's answer and model answer.
- Restart and next reset local typing state.
- No character-by-character correctness comparison against the model answer is implemented.

## Non-goals for v1

- AI content scoring.
- Grammar scoring.
- Similarity scoring against model answers.
- Long-term result history.
- User accounts or backend persistence.
- Theme customization.
- Graphs or analytics dashboards.
- Command palette or advanced keyboard menus.
