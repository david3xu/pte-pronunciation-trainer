# Copilot Instructions - PTE Pronunciation Trainer

This is a React 19 + TypeScript 5.9 pronunciation trainer for PTE exam prep. It combines local generated JSON datasets for vocabulary/practice content with Supabase for user auth, progress, settings, and analytics. AI features use Google Gemini, browser TTS, and AWS Polly.

## Commands

```bash
npm run start          # Run data pipeline, then start Vite dev server on port 3001
npm run dev            # Start Vite only; requires existing data/processed files
npm run data:pte       # Convert data/source/pte markdown into data/processed JSON
npm run build          # tsc emit to dist/compiled, then vite build to dist/
npm run build:ts       # Type-check only with tsc --noEmit
npm run lint           # Alias for TypeScript type-checking
npm run lint:css       # Stylelint src/css/**/*.css
npm run validate       # Validate generated datasets
npm run validate:all   # Validate docs, structure, and datasets
npm run deploy         # data:pte + build + validate:all
```

Tests use Vitest with `happy-dom` and `src/test/setup.ts`.

```bash
npm test                                      # Full suite via package script
npx vitest run src/config/AppConfig.test.ts  # Single test file
npx vitest run -t "renders vocabulary word"  # Single test by name
npm run test:watch                           # Watch mode
npm run test:coverage                        # Coverage report
```

Note: the `npm test` script currently ends with `|| exit 0`; use direct `npx vitest run ...` commands when a failing exit code matters.

## Architecture

- `src/App.tsx` only wraps providers and delegates application behavior to `src/components/AppContent.tsx`.
- `AppContent` coordinates startup data loading, session tracking, wake lock, global modals, AI panels, audio controls, and chooses the active practice interface.
- UI is feature-grouped under `src/components/`: `practice/`, `audio/`, `ai/`, `settings/`, `shared/`, `migration/`, and `profile/`.
- Global state lives in `src/stores/index.ts` as a single Zustand store with slices for `audio`, `tts`, `settings`, `vocabulary`, `progress`, `ui`, and `auth`; selector hooks are exported from the same store module.
- Configuration is centralized in `src/config/AppConfig.ts`. Runtime data paths, learning modes, API endpoints, AI settings, voice defaults, and UI defaults should come from this config instead of being duplicated in components.
- Data is build-time generated: `scripts/pte-data-pipeline.js` reads markdown from `data/source/pte/` and writes JSON under `data/processed/`. Vite/PWA then serves and caches those JSON files.
- Practice data has several shapes. Vocabulary datasets commonly expose `vocabulary`, DI/shadowing exposes `answers`, and segment/practice datasets may expose `items`, `sentences`, or `questions`; `AppContent` and `SettingsPanel` normalize these before storing them.
- Services under `src/services/` handle external concerns: `audio/TTSEngine.ts` for Web Speech API, `audio/pollyService.ts` for AWS Polly, `ai/` for recommendations/interventions/chat behavior, `supabase/` for auth/sync, and `session/` for practice session tracking.
- Vite includes custom dev middleware from `scripts/ai-chat-middleware.ts` for `/api/ai/chat`; production builds are otherwise static output in `dist/`.

## Project conventions

- Use Zustand actions/selectors rather than mutating state or introducing EventBus-style flows. EventBus utilities are legacy interop, not the default pattern for new React code.
- Stop speech before navigation, dataset changes, and mode switches with `ttsEngine.stopSpeaking()`; several components rely on this to prevent overlapping Web Speech utterances.
- Long-lived components that fetch data should use `AbortController` and cancel on unmount, following `AppContent`.
- Vocabulary-like items may use either the typed shape (`word`, `ipa`, `phonetic`) or the generated runtime shape (`english`, `pronunciation`). Use existing guards/normalization patterns before assuming fields.
- Practice items store task details differently: RS/WFD use `sentence`; ASQ uses `question` and `answer`; metadata such as difficulty/category is nested under `metadata`.
- Add or rename a vocabulary/practice dataset in all relevant places: source markdown under `data/source/pte/`, `PIPELINE_CONFIG.registry` in `scripts/pte-data-pipeline.js`, `data.paths.byMode` and `data.learningModes` in `src/config/AppConfig.ts`, and any selector/UI logic in `src/components/settings/SettingsPanel.tsx`.
- IPA source formats are parser-sensitive. Dual-pronunciation lines use `term | /british/ - sounds like **BRIT-ish** | /american/ - sounds like **uh-MER-uh-kin**`; single-pronunciation lines use `term | /ipa/ - sounds like **PHONETIC**`.
- Prefer existing feature directories for new components and keep service/API logic out of UI components.
- Use Radix UI primitives with Tailwind utilities for new UI. Legacy CSS remains in `src/css/` for shared layout and compatibility.
- Browser voices load asynchronously. Do not assume `speechSynthesis.getVoices()` is populated synchronously; follow the `voiceschanged` preload pattern in `TTSEngine`.
- Environment variables exposed to client code must use the `VITE_` prefix, e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`, `VITE_AWS_ACCESS_KEY_ID`, and `VITE_AWS_SECRET_ACCESS_KEY`.

## Important references

- `CLAUDE.md` is the most detailed existing assistant guide; keep this file aligned with it when architecture changes.
- `README.md` is the user-facing feature overview.
- `docs/architecture/ARCHITECTURE.md` and `docs/architecture/GUIDELINES.md` contain deeper design context.
- `docs/setup/` contains Supabase, Gemini, and AWS Polly setup details.
