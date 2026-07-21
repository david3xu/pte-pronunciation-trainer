# Copilot Instructions - PTE Pronunciation Trainer

This is a React 19 + TypeScript 5 PTE pronunciation trainer. The app is mostly client-side: generated local JSON powers vocabulary and practice content, while Supabase handles auth/progress/settings, Google Gemini powers AI tutor/recommendations, browser speech and AWS Polly provide TTS, and PostHog records analytics.

## Commands

```bash
pnpm install           # Install dependencies; packageManager is pnpm@10.32.1
pnpm run start         # Generate PTE data, then start Vite on port 3001
pnpm run dev           # Start Vite only; requires existing data/processed files
pnpm run dev:proxy     # Start the dev proxy script
pnpm run preview       # Preview the production build on port 3002
pnpm run data:pte      # Convert data/source/pte markdown into generated JSON
pnpm run build         # compile:ts + API typecheck + vite build
pnpm run build:ts      # Type-check app and API configs without emitting
pnpm run typecheck:api # Type-check Vercel/serverless API config only
pnpm run lint          # Alias for TypeScript type-checking
pnpm run lint:css      # Stylelint src/css/**/*.css
pnpm run validate      # Validate generated datasets
pnpm run validate:all  # Validate docs, structure, and datasets
```

Tests use Vitest with `happy-dom` and `src/test/setup.ts`.

```bash
pnpm test                                            # Full Vitest suite
npx vitest run src/config/AppConfig.test.ts         # Single test file
npx vitest run src/components/practice/WordCard.test.tsx
npx vitest run -t "renders vocabulary word"         # Single test by name
pnpm run test:watch                                 # Watch mode
pnpm run test:coverage                              # Coverage report
pnpm run test:e2e                                   # Playwright E2E suite
npx playwright test tests/e2e/tts.spec.ts           # Single E2E spec
npx playwright test -g "tts"                        # Single E2E test by title
```

## Architecture

- `src/App.tsx` is intentionally thin: it imports global Tailwind CSS, wraps the app in `ToastProvider`, and delegates behavior to `src/components/AppContent.tsx`.
- `AppContent` is the runtime coordinator. It loads the selected dataset from `appConfig`, normalizes vocabulary/shadowing/segment shapes through `src/services/dataset/datasetLoader.ts`, restores progress, starts session tracking, requests wake lock, mounts global modals/panels, and lazy-loads RS/ASQ/WFD/typing practice interfaces.
- Practice routing has two related mode layers: `settings.practiceType` selects the broad UI family (`vocabulary`, `vocab-typing`, `practice`, `shadowing`), while `vocabulary.mode` selects the specific interface in `AppContent`.
- UI is feature-grouped under `src/components/`: `practice/`, `audio/`, `ai/`, `settings/`, `shared/`, `migration/`, and `profile`. Put new UI in the closest existing feature folder.
- Global state lives in `src/stores/index.ts` as one Zustand store with slices for `audio`, `tts`, `settings`, `vocabulary`, `progress`, `ui`, and `auth`. Use exported selector hooks such as `useSettings`, `useAudioState`, `useVocabulary`, `useProgress`, and `useAuth` instead of reaching into unrelated component state.
- Configuration is centralized in `src/config/AppConfig.ts`. Runtime data paths, learning modes, API endpoints, Gemini defaults, TTS defaults, delays, and limits should come from this config rather than being duplicated in components.
- PTE content is build-time generated. `scripts/pte-data-pipeline.js` reads markdown under `data/source/pte/` and writes JSON under `data/processed/`; Vite/PWA then serves and caches those files.
- Services under `src/services/` own external and cross-cutting behavior: `audio/` for browser TTS/AWS Polly/background audio, `ai/` for recommendations/interventions/personas, `supabase/` for auth/sync, `session/` for practice session tracking, `device/` for wake lock, and `tts/` for persistent TTS cache.
- Vite configures React, PWA caching for `data/processed/*.json`, manual chunks for vendor/Radix/Supabase/analytics, and dev middleware for `/api/ai/chat`. Production output is static under `dist/`, while Vercel-style server routes live under `api/`.

## Project conventions

- Prefer the current React + Zustand architecture. `.clauderules` reflects an older EventBus / `src/js` model and should not override the current `src/components`, `src/stores`, `src/services`, and `src/config` patterns.
- Prefer Zustand actions/selectors for app state rather than introducing ad hoc state wiring across distant components.
- Stop active speech before navigation, dataset changes, and mode switches with the existing TTS engine/service patterns; several components depend on this to avoid overlapping utterances.
- Long-lived components that fetch data should use `AbortController` and cancel on unmount, following `AppContent`.
- Dataset shapes differ by source. Vocabulary commonly uses `vocabulary`; DI/shadowing uses `answers`; practice and segment datasets may use `items`, `sentences`, or `questions`. Normalize before storing with `loadDataset(...)` rather than duplicating component-level fetch logic.
- Stable completion tracking depends on item ids. `datasetLoader` assigns deterministic ids when source items do not provide one.
- Runtime practice-mode ids (`practice-repeat-sentence`, `practice-answer-short-question`, `practice-write-from-dictation`) are bridged to dataset registry keys (`rs`, `asq`, `wfd`) inside `src/services/dataset/datasetLoader.ts`.
- Vocabulary-like items may use generated runtime fields (`english`, `pronunciation`) or typed fields (`word`, `ipa`, `phonetic`). Use existing guards/normalization patterns before assuming a single shape.
- Practice task fields vary: RS/WFD use `sentence`; ASQ uses `question` and `answer`; difficulty/category often live under `metadata`.
- Add or rename datasets in every relevant surface: source markdown under `data/source/pte/`, `PIPELINE_CONFIG.registry` in `scripts/pte-data-pipeline.js`, `data.paths.byMode` and `data.learningModes` in `src/config/AppConfig.ts`, and selector/UI logic in `src/components/settings/SettingsPanel.tsx`.
- Use Radix UI primitives with Tailwind utilities for new UI. Legacy shared styles remain in `src/css/` for compatibility.
- Browser voices load asynchronously. Do not assume `speechSynthesis.getVoices()` is populated synchronously; follow the `voiceschanged` preload pattern in `src/services/audio/TTSEngine.ts`.
- Client-exposed environment variables must use the `VITE_` prefix. Keep server-only secrets out of client code; `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and AWS credentials remain server-side.
- The TypeScript config is strict (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noUnusedLocals`, etc.). Avoid broad casts and keep changes type-safe.
- `docs/CONTRIBUTING.md` asks for conventional commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`) when creating commits.
- Vitest uses `happy-dom` with `src/test/setup.ts`; Playwright E2E starts `pnpm run data:pte && pnpm run dev -- --host 127.0.0.1` on port 3001.

## MCP servers

- Playwright MCP is configured in `.vscode/mcp.json` using `npx -y @playwright/mcp@latest --browser chromium`. Use it for browser-driven UI exploration and debugging alongside the existing Playwright E2E tests.

## Important references

- `CLAUDE.md` is the main Claude Code guide for this repository.
- `README.md` is the user-facing overview.
- `docs/ARCHITECTURE.md`, `docs/MODULES.md`, and `docs/CODE_INTERACTIONS.md` contain deeper design context.
- `docs/TESTING.md`, `docs/DEPLOYMENT.md`, and `docs/SETUP.md` cover workflow, deployment, and setup details.
