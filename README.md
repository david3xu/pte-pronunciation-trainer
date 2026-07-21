# PTE Pronunciation Trainer

A web-based pronunciation training app for PTE preparation.

The app is built around generated local datasets for vocabulary and practice content, with optional cloud and AI features layered on top:

- local JSON datasets for fast vocabulary and practice loading
- React 19 + TypeScript 5 UI with Zustand state management
- browser speech plus optional AWS Polly premium TTS
- Supabase auth, sync, and progress tracking
- Google Gemini-backed AI tutor and recommendation features
- Vite + PWA setup for local development and static deployment

## Quick start

### Requirements

- Node.js 16+
- npm 8+

### Install and run

```bash
npm install
npm run start
```

`npm run start` regenerates PTE data and then starts the Vite dev server on port 3001.

If you already have current generated data, you can run the dev server directly:

```bash
npm run dev
```

Open `http://localhost:3001`.

## Environment setup

Copy the template and fill in the values you need:

```bash
cp .env.example .env
```

Common variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_POSTHOG_API_KEY`
- `VITE_POSTHOG_HOST`
- `GEMINI_API_KEY` for server-side AI routes
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` for server-side Polly routes
- `VITE_PREMIUM_TTS_ENABLED` to expose premium TTS UI locally

Important distinction:

- `VITE_*` values are exposed to client code
- Gemini, AWS, and Supabase service-role secrets must stay server-side

## Common scripts

```bash
npm run start             # Generate PTE data, then start Vite on port 3001
npm run dev               # Start Vite only
npm run dev:proxy         # Start local dev proxy script
npm run preview           # Preview production build on port 3002

npm run data:pte          # Convert markdown in data/source/pte to JSON in data/processed
npm run validate          # Validate generated datasets
npm run validate:all      # Validate docs, structure, and datasets

npm run build             # compile:ts + API typecheck + vite build
npm run build:ts          # Type-check app and API configs without emitting
npm run lint              # Alias for TypeScript type-checking
npm run lint:css          # Stylelint src/css/**/*.css

npm test                  # Run Vitest
npm run test:watch        # Vitest watch mode
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E suite

npm run deploy            # data:pte + build + validate:all
npm run vercel-build      # data:pte + vite build + copy processed data to dist/
```

Examples for focused test runs:

```bash
npx vitest run src/config/AppConfig.test.ts
npx vitest run -t "renders vocabulary word"
npx playwright test tests/e2e/tts.spec.ts
```

## Architecture overview

### Runtime app structure

- `src/App.tsx` is the app shell.
- `src/components/AppContent.tsx` is the runtime coordinator: it loads the active dataset, restores progress, starts session tracking, requests wake lock, mounts global modals/panels, and routes to the current practice interface.
- Practice interfaces live under `src/components/practice/` and heavier ones are lazy-loaded.

### State and data flow

- Global app state lives in `src/stores/index.ts` as a Zustand store with slices for `audio`, `tts`, `settings`, `vocabulary`, `progress`, `ui`, and `auth`.
- Dataset loading goes through `src/services/dataset/datasetLoader.ts`, which resolves dataset paths from `src/config/AppConfig.ts`, fetches the JSON, normalizes different dataset shapes, and assigns stable item ids when source items do not provide one.
- Session tracking, sync, AI, audio, and device integration are handled in `src/services/` rather than directly in UI components.

### Content pipeline

- Source content lives in `data/source/pte/`.
- `scripts/pte-data-pipeline.js` converts source markdown into generated JSON under `data/processed/`.
- The app reads those generated files at runtime; if source content changes, rerun `npm run data:pte`.

### Integrations

- `src/services/supabase/` handles auth and sync.
- `src/services/audio/` handles browser speech, Polly, background audio, and voice selection.
- `src/services/ai/` handles tutor, recommendations, and intervention logic.
- `api/` contains Vercel-style serverless routes for AI and TTS features.
- `supabase/migrations/` contains database schema history.

## Working with datasets

When adding or renaming a dataset, update all relevant surfaces together:

1. source markdown under `data/source/pte/`
2. `scripts/pte-data-pipeline.js`
3. `src/config/AppConfig.ts`
4. `src/components/settings/SettingsPanel.tsx`
5. any runtime normalization or routing only if the new dataset introduces a new shape or interface type

## Testing

- Unit and integration tests use Vitest with `happy-dom` and setup from `src/test/setup.ts`.
- E2E tests use Playwright via `playwright.config.ts`, which starts a local server and regenerates data before running.
- Audio, browser speech, PWA behavior, and cloud-backed flows still benefit from manual verification in a browser.

## Deployment

For a production-style local build:

```bash
npm run build
npm run preview
```

For the Vercel build pipeline:

```bash
npm run vercel-build
```

The production build outputs to `dist/`, including generated datasets copied under `dist/data/processed/` for static serving.

## Documentation

- `CLAUDE.md` - repository guidance for Claude Code
- `.github/copilot-instructions.md` - concise AI coding guidance
- `docs/ARCHITECTURE.md` - system overview
- `docs/MODULES.md` - module and data-flow map
- `docs/CODE_INTERACTIONS.md` - usage/coupling analysis
- `docs/SETUP.md` - environment setup details
- `docs/TESTING.md` - testing notes
- `docs/DEPLOYMENT.md` - deployment notes
