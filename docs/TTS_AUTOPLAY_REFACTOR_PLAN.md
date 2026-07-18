# TTS and Autoplay Refactor Plan

## Goal

Stabilize browser speech playback and make the TTS/autoplay implementation easier to maintain by separating the current large, mixed-responsibility files into focused services, hooks, and Zustand slices.

## Current problems

- `src/services/audio/TTSEngine.ts` is too large and mixes browser Web Speech, AWS Polly, voice selection, iOS background audio, fallback UI, logging, retry behavior, and store side effects.
- `src/components/audio/AudioControls.tsx` mixes presentation with autoplay orchestration, repeat handling, dataset navigation, book switching, and TTS timeout logic.
- `src/stores/index.ts` contains all store slices inline, making audio/settings/TTS state harder to reason about independently.
- TTS and autoplay failures can create misleading UI states if promises hang or browser speech events do not fire reliably.

## Design principles

- Keep user-facing behavior unchanged unless explicitly fixing a playback bug.
- Refactor in small, testable steps instead of a big-bang rewrite.
- Keep browser speech calls close to user activation where possible.
- Every TTS request must settle: success, cancel, timeout, or explicit failure.
- UI controls should reflect controller state, not low-level Web Speech internals.

## Proposed target structure

```text
src/services/audio/
├── TTSEngine.ts                 # Thin facade for existing imports
├── browserSpeechService.ts      # Web Speech API lifecycle and timeouts
├── pollySpeechService.ts        # AWS Polly request/playback fallback
├── voiceSelector.ts             # Voice matching and preference logic
├── iosBackgroundAudio.ts        # iOS/background audio support
└── audioTypes.ts                # Shared audio service types

src/components/audio/
├── AudioControls.tsx            # UI only
└── useAutoPlayController.ts     # Autoplay loop/state machine

src/stores/slices/
├── audioSlice.ts
├── settingsSlice.ts
├── ttsSlice.ts
├── vocabularySlice.ts
├── progressSlice.ts
├── uiSlice.ts
└── authSlice.ts
```

## Phase 1: Safety harness

- Add focused tests for the autoplay controller behavior:
  - TTS success advances to the next item.
  - TTS timeout stops autoplay.
  - TTS error stops autoplay or resolves cleanly.
  - Pause cancels speech and prevents navigation.
- Add focused tests for voice selection:
  - Preferred voice exact match.
  - Language match fallback.
  - Empty voice list uses browser default without throwing.
- Keep current public imports intact.

## Phase 2: Extract voice selection

- Move `selectVoice()` and related matching helpers from `TTSEngine.ts` to `voiceSelector.ts`.
- Keep preferred voice lookup explicit and typed.
- Replace duplicated fallback selection in browser/iOS paths with the shared helper.

## Phase 3: Extract browser speech lifecycle

- Move `SpeechSynthesisUtterance` creation, event handling, timeout handling, cancellation, and active utterance retention to `browserSpeechService.ts`.
- Return a normalized result type such as `spoken`, `cancelled`, `timeout`, or `error`.
- Ensure every request settles exactly once.
- Keep `TTSEngine.speak()` as a compatibility facade.

## Phase 4: Extract Polly and iOS support

- Move AWS Polly request/playback to `pollySpeechService.ts`.
- Move background audio setup to `iosBackgroundAudio.ts`.
- Keep browser fallback explicit instead of hidden inside multiple nested paths.

## Phase 5: Extract autoplay controller

- Move the autoplay loop from `AudioControls.tsx` into `useAutoPlayController()`.
- Keep `AudioControls.tsx` responsible for rendering controls and dispatching user actions only.
- Centralize text extraction and cleaning for current practice items.
- Make controller transitions explicit: idle, playing, paused, stopping, failed.

## Phase 6: Split Zustand slices

- Extract each inline slice from `src/stores/index.ts` into `src/stores/slices/*`.
- Preserve persisted state shape and migration behavior.
- Avoid renaming store keys unless a migration is added.

## Validation plan

- Run `npm run build:ts` after each phase.
- Run focused tests for changed modules after each phase.
- Run full pre-commit validation before merging.
- Manual browser checks:
  - Play starts speech and advances.
  - Pause stops immediately and does not advance.
  - Next/Previous stop current speech before navigation.
  - Repeat mode loops without stuck `Pause`.
  - Browser voice unavailable/blocked shows warning and exits autoplay.

## Risks and mitigations

- **Persisted settings compatibility:** keep Zustand keys stable.
- **Browser Web Speech inconsistency:** normalize results and enforce timeouts.
- **Regression from import changes:** keep `TTSEngine.ts` facade during the refactor.
- **Large diff risk:** merge phase-by-phase with targeted validation.

## Definition of done

- `TTSEngine.ts`, `AudioControls.tsx`, and `stores/index.ts` are each significantly smaller and focused.
- TTS requests cannot leave autoplay permanently stuck.
- Existing app imports continue to work.
- TypeScript, lint, and tests pass.
