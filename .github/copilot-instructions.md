# Copilot Instructions - PTE Pronunciation Trainer

This is a React 19 + TypeScript 5.9 PTE pronunciation trainer. The app is mostly client-side: generated local JSON powers vocabulary and practice content, while Supabase handles auth/progress/settings, Google Gemini powers AI tutor/recommendations, browser speech and AWS Polly provide TTS, and PostHog records analytics.

## Commands

```bash
npm run start          # Generate PTE data, then start Vite on port 3001
npm run dev            # Start Vite only; requires existing data/processed files
npm run dev:proxy      # Start the dev proxy script
npm run preview        # Preview the production build on port 3002
npm run data:pte       # Convert data/source/pte markdown into generated JSON
npm run build          # tsc emit to dist/compiled, then vite build to dist/
npm run build:ts       # Type-check only with tsc --noEmit
npm run lint           # Alias for TypeScript type-checking
npm run lint:css       # Stylelint src/css/**/*.css
npm run validate       # Validate generated datasets
npm run validate:all   # Validate docs, structure, and datasets
npm run deploy         # data:pte + build + validate:all
```

Tests use Vitest with `happy-dom` and `src/test/setup.ts`. The `npm test` script ends with `|| exit 0`, so use direct `npx vitest run ...` commands when a failing exit code matters.

```bash
npm test                                             # Full Vitest suite via package script
npx vitest run src/config/AppConfig.test.ts         # Single test file
npx vitest run -t "renders vocabulary word"         # Single test by name
npm run test:watch                                  # Watch mode
npm run test:coverage                               # Coverage report
npm run test:e2e                                    # Playwright E2E suite
npx playwright test tests/e2e/tts.spec.ts           # Single E2E spec
```

## Architecture

- `src/App.tsx` is intentionally thin: it imports global Tailwind CSS, wraps the app in `ToastProvider`, and delegates behavior to `src/components/AppContent.tsx`.
- `AppContent` is the runtime coordinator. It loads the selected dataset from `appConfig`, normalizes vocabulary/shadowing/segment shapes, restores progress, starts session tracking, requests wake lock, mounts global modals/panels, and lazy-loads RS/ASQ/WFD/typing practice interfaces.
- UI is feature-grouped under `src/components/`: `practice/`, `audio/`, `ai/`, `settings/`, `shared/`, `migration/`, and `profile/`. Put new UI in the closest existing feature folder.
- Global state lives in `src/stores/index.ts` as one Zustand store with slices for `audio`, `tts`, `settings`, `vocabulary`, `progress`, `ui`, and `auth`. Use exported selector hooks such as `useSettings`, `useAudioState`, and `useVocabulary` instead of reaching into unrelated component state.
- Configuration is centralized in `src/config/AppConfig.ts`. Runtime data paths, learning modes, API endpoints, Gemini model settings, TTS defaults, delays, and limits should come from this config rather than being duplicated in components.
- PTE content is build-time generated. `scripts/pte-data-pipeline.js` reads markdown under `data/source/pte/` and writes JSON under `data/processed/`; Vite/PWA then serves and caches those files.
- Services under `src/services/` own external and cross-cutting behavior: `audio/` for browser TTS/AWS Polly, `ai/` for recommendations/interventions/personas, `supabase/` for auth/sync, `session/` for practice session tracking, `analytics/` for PostHog, and `device/` for wake lock.
- `vite.config.ts` configures React, PWA caching for `data/processed/*.json`, manual chunks for vendor/Radix/Supabase/analytics, and dev middleware from `scripts/ai-chat-middleware.ts` for `/api/ai/chat`. Production output is static under `dist/`.

## Project conventions

- Prefer Zustand actions/selectors for app state. EventBus-style patterns are legacy interop, not the default for new React code.
- Stop active speech before navigation, dataset changes, and mode switches with `ttsEngine.stopSpeaking()`; several components depend on this to avoid overlapping utterances.
- Long-lived components that fetch data should use `AbortController` and cancel on unmount, following `AppContent`.
- Dataset shapes differ by source. Vocabulary commonly uses `vocabulary`; DI/shadowing uses `answers`; practice and segment datasets may use `items`, `sentences`, or `questions`. Normalize before storing with `vocabulary.setDataset(...)`.
- Vocabulary-like items may use generated runtime fields (`english`, `pronunciation`) or typed fields (`word`, `ipa`, `phonetic`). Use existing guards/normalization patterns before assuming a single shape.
- Practice task fields vary: RS/WFD use `sentence`; ASQ uses `question` and `answer`; difficulty/category often live under `metadata`.
- Add or rename datasets in every relevant surface: source markdown under `data/source/pte/`, `PIPELINE_CONFIG.registry` in `scripts/pte-data-pipeline.js`, `data.paths.byMode` and `data.learningModes` in `src/config/AppConfig.ts`, and selector/UI logic in `src/components/settings/SettingsPanel.tsx`.
- IPA source formats are parser-sensitive. Dual-pronunciation lines use `term | /british/ - sounds like **BRIT-ish** | /american/ - sounds like **uh-MER-uh-kin**`; single-pronunciation lines use `term | /ipa/ - sounds like **PHONETIC**`.
- Keep service/API logic out of UI components when possible; put external integrations and reusable business logic in `src/services/`.
- Use Radix UI primitives with Tailwind utilities for new UI. Legacy shared styles remain in `src/css/` for compatibility.
- Browser voices load asynchronously. Do not assume `speechSynthesis.getVoices()` is populated synchronously; follow the `voiceschanged` preload pattern in `src/services/audio/TTSEngine.ts`.
- Environment variables exposed to client code must use the `VITE_` prefix, including `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`, `VITE_AWS_ACCESS_KEY_ID`, and `VITE_AWS_SECRET_ACCESS_KEY`.
- The TypeScript config is strict (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noUnusedLocals`, etc.). Avoid broad casts and keep changes type-safe.

## MCP servers

- Playwright MCP is configured in `.vscode/mcp.json` using `npx -y @playwright/mcp@latest --browser chromium`. Use it for browser-driven UI exploration and debugging alongside the existing Playwright E2E tests.

## Important references

- `CLAUDE.md` is the most detailed existing assistant guide, but some older paths may be stale; verify against the current `src/` layout.
- `README.md` is the user-facing feature overview.
- `docs/ARCHITECTURE.md`, `docs/MODULES.md`, and `docs/CODE_INTERACTIONS.md` contain deeper design context.
- `docs/TESTING.md`, `docs/CONTRIBUTING.md`, `docs/DEPLOYMENT.md`, and `docs/SETUP.md` cover workflow, validation, deployment, and setup.
