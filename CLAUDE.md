# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project summary

PTE Pronunciation Trainer is a React 19 + TypeScript 5 app for pronunciation practice. The app is mostly client-side: generated local JSON powers vocabulary and practice content, while Supabase handles auth/progress/settings, Google Gemini powers AI tutor features, AWS Polly provides real-audio TTS, and PostHog records analytics.

## Common commands

```bash
pnpm install
pnpm run start            # Generate PTE data, then start Vite on port 3001
pnpm run dev              # Start Vite only; requires existing data/processed files
pnpm run dev:proxy        # Start the local dev proxy script
pnpm run preview          # Preview production build on port 3002

pnpm run data:pte         # Convert data/source/pte markdown into generated JSON
pnpm run validate         # Validate generated datasets
pnpm run validate:all     # Validate docs, structure, and datasets

pnpm run build            # compile:ts + API typecheck + vite build
pnpm run build:ts         # Type-check app and API configs without emitting
pnpm run lint             # Alias for TypeScript type-checking
pnpm run lint:css         # Stylelint src/css/**/*.css

pnpm test                 # Full Vitest suite
pnpm run test:watch       # Vitest watch mode
pnpm run test:coverage    # Coverage report
npx vitest run src/config/AppConfig.test.ts
npx vitest run -t "renders vocabulary word"

pnpm run test:e2e
npx playwright test tests/e2e/tts.spec.ts

pnpm run deploy           # data:pte + build + validate:all
pnpm run vercel-build     # data:pte + vite build + copy processed data to dist/
```

## Architecture

### App shell and runtime coordinator

- `src/App.tsx` is intentionally thin: it imports global Tailwind CSS, wraps the app in `ToastProvider`, and renders `src/components/AppContent.tsx`.
- `AppContent` is the runtime coordinator. It loads the selected dataset, restores progress, starts session tracking, requests wake lock, mounts global panels/modals, and routes to the active practice UI.
- Heavy practice interfaces are lazy-loaded from `src/components/practice/`.

### State model

- Global state lives in `src/stores/index.ts` as one Zustand store with slices for `audio`, `tts`, `settings`, `vocabulary`, `progress`, `ui`, and `auth`.
- Prefer the exported selector hooks such as `useSettings`, `useAudioState`, `useVocabulary`, `useProgress`, and `useAuth` instead of pulling unrelated state into components.
- Progress/completion depends on stable item ids. `src/services/dataset/datasetLoader.ts` assigns deterministic ids (`${datasetId}#${index}`) when source data does not provide one.

### Configuration and mode routing

- `src/config/AppConfig.ts` is the single source of truth for dataset paths, learning modes, API endpoints, Gemini defaults, TTS defaults, delays, and limits.
- There are two related mode systems:
  - `settings.practiceType` decides the broad UI family (`vocabulary`, `vocab-typing`, `practice`, `shadowing`).
  - `vocabulary.mode` drives interface routing in `AppContent`.
- Practice UIs use `practice-repeat-sentence`, `practice-answer-short-question`, and `practice-write-from-dictation` as runtime mode ids, but the underlying files are still registered in `AppConfig.data.paths.byMode` under `rs`, `asq`, and `wfd`. `src/services/dataset/datasetLoader.ts` contains the bridge.

### Data pipeline and dataset normalization

- Source content lives under `data/source/pte/`.
- `scripts/pte-data-pipeline.js` converts markdown into JSON under `data/processed/`.
- Runtime loading goes through `src/services/dataset/datasetLoader.ts`; do not duplicate fetch/normalization logic in components.
- Dataset shapes vary by source:
  - vocabulary datasets commonly expose `vocabulary`
  - DI/shadowing datasets expose `answers`
  - practice/segment datasets may expose `items`, `sentences`, or `questions`
- `datasetLoader` normalizes those shapes before data enters the store.

### Service boundaries

- `src/services/audio/` owns AWS Polly-backed real audio, media-session/background playback, voice settings, and autoplay behavior.
- `src/services/ai/` owns recommendation/intervention/tutor logic.
- `src/services/supabase/` owns auth, sync, and cloud persistence.
- `src/services/session/` owns practice session lifecycle and tracking.
- `src/services/device/` owns wake lock behavior.
- Keep external API calls and reusable business logic in services, not in UI components.

### Build, API, and deployment shape

- Vite config (`vite.config.ts`) sets up React, the PWA plugin, caching for `data/processed/*.json`, manual chunks, and dev middleware for `/api/ai/chat`.
- Production API routes live under `api/` and are intended for Vercel serverless deployment.
- `supabase/migrations/` contains the database schema history used by cloud sync and AI-context features.

## Repo-specific guidance

- Prefer the current React + Zustand architecture. `.clauderules` still describes the older EventBus / `src/js` architecture and should not override the current `src/components`, `src/stores`, `src/services`, and `src/config` patterns.
- New UI should usually go in the nearest existing feature folder under `src/components/` and use Radix UI primitives with Tailwind utilities.
- Long-lived components that fetch data should use `AbortController` and cancel on unmount, matching `AppContent`.
- Stop active speech before navigation, dataset changes, and mode switches by following the existing TTS/audio service patterns.
- Practice playback uses generated real audio through the shared audio service; keep server-only AWS credentials out of client code.
- Tests use Vitest with `happy-dom` and `src/test/setup.ts`. Playwright E2E uses `playwright.config.ts`, which starts a dev server and regenerates data before running.

## When adding or changing datasets

Update all relevant surfaces together:

1. source markdown under `data/source/pte/`
2. `PIPELINE_CONFIG.registry` in `scripts/pte-data-pipeline.js`
3. `data.paths.byMode` in `src/config/AppConfig.ts`
4. `data.learningModes` in `src/config/AppConfig.ts`
5. selector/UI logic in `src/components/settings/SettingsPanel.tsx`
6. routing/normalization only if the new dataset introduces a new runtime shape or interface type

## Environment variables

- Client-exposed variables must use the `VITE_` prefix.
- Server-only secrets must stay server-side. In particular:
  - `GEMINI_API_KEY` is server-only
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` are used by serverless TTS routes
  - `SUPABASE_SERVICE_ROLE_KEY` is server-only
- Client Supabase config uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Premium TTS UI is gated by `VITE_PREMIUM_TTS_ENABLED`.

## Useful references

- `README.md` - user-facing product overview
- `.github/copilot-instructions.md` - concise repo guidance aligned with the current architecture
- `docs/ARCHITECTURE.md` - system overview
- `docs/MODULES.md` - state/service interaction map
- `docs/CODE_INTERACTIONS.md` - usage hotspots and coupling map
- `docs/TESTING.md` and `docs/SETUP.md` - environment and test workflow details
