# Copilot Instructions - PTE Pronunciation Trainer

This is a React 19 + TypeScript 5 PTE pronunciation trainer. The app is mostly client-side: generated local JSON powers vocabulary and practice content, while Supabase handles auth/progress/settings, Google Gemini powers AI tutor/recommendations, Azure AI Speech provides premium real-audio TTS, and PostHog records analytics.

## Commands

Use pnpm (`packageManager` is `pnpm@10.32.1`). `package.json` requires Node `>=22.0.0` and pnpm `>=10.0.0`.

```bash
pnpm install           # Install dependencies; packageManager is pnpm@10.32.1
pnpm run start         # Generate PTE data, then start Vite on port 3001
pnpm run dev           # Start Vite only; requires existing data/processed files
pnpm run dev:proxy     # Start the dev proxy script
pnpm run preview       # Preview the production build on port 3002
pnpm run data:pte      # Convert data/source/pte markdown into generated JSON
pnpm run build         # compile:ts + API typecheck + vite build
pnpm run build:ts      # Type-check app and API configs without emitting
pnpm run compile:ts    # Type-check app via tsc
pnpm run typecheck     # Type-check app only
pnpm run typecheck:api # Type-check Vercel/serverless API config only
pnpm run test:ts       # Type-check app/API, then run the Vitest suite
pnpm run lint          # Alias for TypeScript type-checking
pnpm run lint:css      # Stylelint src/css/**/*.css
pnpm run validate      # Validate generated datasets
pnpm run validate:docs # Validate documentation
pnpm run validate:structure # Validate expected project structure
pnpm run validate:all  # Validate docs, structure, and datasets
pnpm run deploy        # data:pte + build + validate:all
pnpm run vercel-build  # data:pte + vite build + copy processed data to dist/
```

Tests use Vitest with `happy-dom` and `src/test/setup.ts`.

```bash
pnpm test                                            # Full Vitest suite
pnpm exec vitest run src/config/AppConfig.test.ts   # Single test file
pnpm exec vitest run src/components/practice/WordCard.test.tsx
pnpm exec vitest run -t "renders vocabulary word"   # Single test by name
pnpm run test:watch                                 # Watch mode
pnpm run test:ui                                    # Vitest UI
pnpm run test:coverage                              # Coverage report
pnpm run test:e2e                                   # Playwright E2E suite
pnpm exec playwright test tests/e2e/tts.spec.ts     # Single E2E spec
pnpm exec playwright test -g "tts"                  # Single E2E test by title
pnpm exec playwright test --project=desktop-chromium # Single E2E project
```

Capacitor iOS builds are supported with `pnpm run cap:sync:ios`, `pnpm run cap:sync:ios:prod`, `pnpm run cap:open:ios`, and `pnpm run cap:run:ios`.

## Architecture

- `src/main.tsx` mounts the React app and owns PWA update handling. Browser builds register an auto-updating service worker; Capacitor builds unregister service workers and clear browser caches because native assets ship in the bundle.
- `src/App.tsx` is intentionally thin: it imports global Tailwind CSS, wraps the app in `ToastProvider`, and delegates behavior to `src/components/AppContent.tsx`.
- `AppContent` is the runtime coordinator. It loads the selected dataset from `appConfig`, normalizes vocabulary/shadowing/segment shapes through `src/services/dataset/datasetLoader.ts`, restores progress, starts session tracking, requests wake lock, mounts global modals/panels, and lazy-loads RS/ASQ/WFD/SWT/typing practice interfaces.
- Practice routing has layered mode state: `settings.practiceType` selects the broad UI family (`vocabulary`, `vocab-typing`, `practice`, `writing`, `shadowing`); `settings.practiceMode` and `settings.writingMode` select nested task datasets; `vocabulary.mode` still drives several interface decisions in `AppContent`.
- UI is feature-grouped under `src/components/`: `practice/`, `audio/`, `ai/`, `settings/`, `shared/`, `migration/`, and `profile`. Put new UI in the closest existing feature folder.
- Global state lives in `src/stores/index.ts` as one Zustand store with slices for `audio`, `tts`, `settings`, `vocabulary`, `progress`, `ui`, and `auth`. Settings, selected audio preferences, and per-dataset progress are persisted with rehydration migrations. Use exported selector hooks such as `useSettings`, `useAudioState`, `useVocabulary`, `useProgress`, and `useAuth`.
- `src/config/AppConfig.ts` owns browser/runtime configuration such as data paths, learning modes, API endpoints, TTS defaults, delays, and limits. Server-only Gemini model settings, request limits, and Azure voice tables live in `api/config.ts`; do not duplicate server configuration into the client bundle.
- PTE content is build-time generated. `scripts/pte-data-pipeline.js` reads markdown under `data/source/pte/` and writes JSON under `data/processed/`; Vite/PWA then serves and caches those files.
- Services under `src/services/` own external and cross-cutting behavior: `audio/` for browser TTS/Azure Speech/background audio, `ai/` for recommendations/interventions/personas, `supabase/` for auth/sync, `session/` for practice session tracking and offline queueing, and `device/` for wake lock.
- Vite configures React, PWA caching for `data/processed/*.json`, manual chunks for vendor/Radix/Supabase/analytics, dev middleware for `/api/ai/chat`, a dev proxy for `/api/premium-tts`, and a build plugin that copies `data/processed/*.json` into `dist/` for Capacitor/native bundles. Production output is static under `dist/`, while Vercel-style server routes live under `api/`.
- Path aliases such as `@`, `@components`, `@css`, and legacy `@ts`/`@js` are configured in both `vite.config.ts` and `vitest.config.ts`; keep those configs in sync if aliases change.

## Project conventions

- Prefer the current React + Zustand architecture. `.clauderules` reflects an older EventBus / `src/js` model and should not override the current `src/components`, `src/stores`, `src/services`, and `src/config` patterns.
- Prefer Zustand actions/selectors for app state rather than introducing ad hoc state wiring across distant components.
- Preserve the store's rehydration migrations when changing persisted settings or mode shapes; progress positions and completions are intentionally stored per dataset.
- Stop active speech before navigation, dataset changes, and mode switches with the existing TTS engine/service patterns; several components depend on this to avoid overlapping utterances.
- Study-type transitions must explicitly reload their target dataset even when the remembered nested mode has not changed; `practiceMode`, `writingMode`, and `vocabularyBook` can describe a previous selection while another dataset is active.
- Long-lived components that fetch data should use `AbortController` and cancel on unmount, following `AppContent`.
- Treat `data/processed/` as generated output. Edit source markdown or the pipeline, then run `pnpm run data:pte`; do not hand-maintain generated JSON.
- Dataset shapes differ by source. Vocabulary commonly uses `vocabulary`; DI/shadowing uses `answers`; practice and segment datasets may use `items`, `sentences`, or `questions`. Normalize before storing with `loadDataset(...)` rather than duplicating component-level fetch logic.
- Stable completion tracking depends on item ids. `datasetLoader` assigns deterministic ids when source items do not provide one.
- Keep dataset request URLs stable: Workbox caches `data/processed/*.json`, so do not add timestamp or random cache-busting query parameters in `datasetLoader`.
- Runtime practice-mode ids (`practice-repeat-sentence`, `practice-answer-short-question`, `practice-write-from-dictation`) are bridged to dataset registry keys (`rs`, `asq`, `wfd`) inside `src/services/dataset/datasetLoader.ts`; `swt` is a writing-mode key that uses the same raw practice-item normalization.
- Writing Practice is exact-text typing configured by `TypingMode`/`TYPING_TASKS` in `src/config/typingTasks.ts`. `WRITING_TASKS` in `src/config/writingTasks.ts` describes form-validation rules and is not the Settings/runtime registry.
- Vocabulary-like items may use generated runtime fields (`english`, `pronunciation`) or typed fields (`word`, `ipa`, `phonetic`). Use existing guards/normalization patterns before assuming a single shape.
- Practice task fields vary: RS/WFD use `sentence`; ASQ uses `question` and `answer`; SWT uses passage/task-shaped items; difficulty/category often live under `metadata`.
- Add or rename datasets in every relevant surface: source markdown under `data/source/pte/`, `PIPELINE_CONFIG.registry` in `scripts/pte-data-pipeline.js`, and `data.paths.byMode` plus `data.learningModes` in `src/config/AppConfig.ts`. Update `datasetLoader` mappings/normalization and Settings routing only for a new id family, data shape, or interface; exact-text writing tasks also need a `TypingMode`/`TYPING_TASKS` entry.
- Use Radix UI primitives with Tailwind utilities for new UI. Legacy shared styles remain in `src/css/` for compatibility.
- Practice playback uses generated real audio through the shared audio service; keep server-only Azure Speech credentials out of client code.
- Client-exposed environment variables must use the `VITE_` prefix. Keep server-only secrets out of client code; `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AZURE_SPEECH_KEY`, and `AZURE_SPEECH_REGION` remain server-side. Browser deployments use same-origin API paths; native/Capacitor builds must set an absolute `VITE_API_BASE_URL` or startup fails.
- The TypeScript config is strict (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noUnusedLocals`, etc.). Avoid broad casts and keep changes type-safe.
- `docs/CONTRIBUTING.md` asks for conventional commit prefixes (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`) when creating commits.
- Vitest uses `happy-dom` with `src/test/setup.ts`; `vitest.config.ts` forces `NODE_ENV=test` when needed so Testing Library gets React's development `act`.
- Playwright E2E starts `npm run data:pte && npm run dev -- --host 127.0.0.1` on port 3001 and runs desktop/mobile Chromium projects.

## MCP servers

- Playwright MCP is configured in `.vscode/mcp.json` using `npx -y @playwright/mcp@latest --browser chromium`. Use it for browser-driven UI exploration and debugging alongside the existing Playwright E2E tests.

## Important references

- `CLAUDE.md` is the main Claude Code guide for this repository.
- `README.md` is the user-facing overview.
- `docs/ARCHITECTURE.md`, `docs/MODULES.md`, and `docs/CODE_INTERACTIONS.md` contain deeper design context.
- `docs/TESTING.md`, `docs/DEPLOYMENT.md`, and `docs/SETUP.md` cover workflow, deployment, and setup details.
