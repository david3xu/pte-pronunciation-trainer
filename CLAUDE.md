# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PTE Pronunciation Trainer** - A modern web-based pronunciation training application for PTE exam preparation with AI-powered features.

**Architecture**: React 19 + TypeScript 5.9 + Zustand state management + Radix UI + Tailwind CSS + Vite

**Current Version**: 3.0.1 (AI-Powered - November 2025)

**Key Features**:
- 📚 **17 Vocabulary Books** (13,800+ terms with IPA)
- 🎯 **3 Practice Modes** (RS/ASQ/WFD - 2,507 items)
- 🎤 **2 Shadowing Datasets** (DI Images 1-20)
- 🤖 **AI Features** (Google Gemini chat, scoring, recommendations - FREE)
- 🔊 **Premium TTS** (AWS Polly neural voices - 18 options)
- ☁️ **Cloud Sync** (Supabase auth + progress tracking)

### Directory Structure (November 2025 Refactor)

**Recent Changes:**
- ✅ **NEW:** DI Shadowing Practice mode with continuous, fluent speech (20 answers)
- ✅ **NEW:** Smart defaults for all study types (auto-selects appropriate content)
- ✅ **FIXED:** Playback speed slider now works (0.5x - 2.0x adjustable TTS)
- ✅ **IMPROVED:** All-caps words pronounced naturally (TOP → "Top" not "T-O-P")
- ✅ **Archived** `src/js/` → `archive/vanilla-js-legacy/` (legacy vanilla JavaScript code, no longer active)
- ✅ **React App** uses `src/ts/` for core logic + `src/components/` for UI components
- ✅ **Components** grouped by feature: `ai/`, `audio/`, `practice/`, `settings/`, `shared/`
- ✅ **Docs** organized into folders: `setup/`, `api/`, `architecture/`, `guides/`, `archive/`
- ✅ **API** renamed `src/api/` → `src/services/` for clarity
- ✅ **Documentation cleanup:** Removed 8 temporary markdown files (AUDIT-*.md, etc.)

**Active Codebase:**
```
src/
├── App.tsx                    ← Root React component (main coordinator)
├── main.tsx                   ← React entry point (Vite)
│
├── components/                ← React UI Components (feature-grouped)
│   ├── ai/                    ← AI features (6 components)
│   │   ├── AITutorChat.tsx           → Gemini chat interface
│   │   ├── PronunciationScoring.tsx  → AI pronunciation scoring
│   │   ├── WeakAreasDashboard.tsx    → Analytics insights
│   │   ├── InterventionModal.tsx     → Proactive suggestions
│   │   ├── AISidebar.tsx             → Always-visible AI panel
│   │   └── AIRecommendations.tsx     → Personalized learning paths
│   ├── audio/                 ← Audio controls (3 components)
│   │   ├── AudioControls.tsx         → Playback controls
│   │   ├── VoiceSelector.tsx         → Browser TTS selector
│   │   └── PremiumVoiceSelector.tsx  → AWS Polly selector
│   ├── practice/              ← Practice interfaces (9 components)
│   │   ├── WordCard.tsx              → Main vocabulary display
│   │   ├── RSInterface.tsx           → Repeat Sentence UI
│   │   ├── ASQInterface.tsx          → Answer Short Question UI
│   │   ├── WFDInterface.tsx          → Write From Dictation UI
│   │   ├── VocabularyList.tsx        → Word list sidebar
│   │   ├── ProgressTracker.tsx       → Progress display
│   │   ├── ProgressDashboard.tsx     → Full dashboard
│   │   ├── PracticeModeSelector.tsx  → Mode switcher
│   │   └── DifficultyFilter.tsx      → Filter controls
│   ├── settings/              ← Settings UI
│   │   └── SettingsPanel.tsx         → Settings modal
│   ├── migration/             ← Data migration
│   │   └── DataMigrationModal.tsx    → Local to cloud sync
│   ├── profile/               ← User profile
│   │   └── LearnerProfileModal.tsx   → Onboarding wizard
│   └── shared/                ← Shared components
│       ├── OnboardingModal.tsx       → First-time guide
│       └── Skeleton.tsx              → Loading states
│
├── config/                    ← Configuration
│   └── AppConfig.ts              → Type-safe configuration
│
├── stores/                    ← State Management
│   ├── index.ts                  → Main store (7 slices)
│   └── types.ts                  → Store type definitions
│
├── services/                  ← Business Logic & API Clients
│   ├── ai/                    ← AI Services
│   │   ├── recommendationService.ts  → AI recommendations
│   │   ├── interventionEngine.ts     → Proactive interventions
│   │   ├── recommendationEngine.ts   → Learning path AI
│   │   ├── weakAreaDetector.ts       → Pattern detection
│   │   ├── ratingService.ts          → User feedback
│   │   └── taskPersonas.ts           → Task-specific prompts
│   ├── audio/                 ← Audio Services
│   │   ├── TTSEngine.ts              → Web Speech API wrapper
│   │   └── pollyService.ts           → AWS Polly integration
│   ├── analytics/             ← Analytics
│   │   └── analyticsService.ts       → PostHog tracking
│   ├── supabase/              ← Supabase Integration
│   │   ├── supabaseClient.ts         → Client setup
│   │   ├── authService.ts            → Authentication
│   │   ├── syncService.ts            → Data sync
│   │   └── autoSyncManager.ts        → Auto-sync
│   ├── session/               ← Session Management
│   │   └── sessionManager.ts         → Practice tracking
│   ├── profile/               ← Profile Management
│   │   └── learnerProfileService.ts  → User profiles
│   └── migration/             ← Migration
│       └── migrationService.ts       → Data migration
│
├── data/                      ← Data Management
│   ├── DatasetManager.ts         → Dataset loader
│   ├── DataSchema.ts             → Data schemas
│   └── extractors/               → Data extractors (5 files)
│
├── utils/                     ← Utilities
│   ├── textUtils.ts              → Text processing
│   ├── templateParser.ts         → Template parsing
│   └── validation/               → Validation schemas
│
├── types/                     ← TypeScript Type Definitions
│   ├── config.types.ts        → Configuration types
│   ├── dataset.types.ts       → Dataset types
│   ├── database.ts            → Supabase database types
│   └── index.ts               → Type exports
│
└── css/                       ← Styles
    ├── tailwind.css           → Tailwind entry point
    ├── variables.css          → Design tokens (222 vars)
    ├── animations.css         → Keyframe animations
    ├── components.css         → BEM components
    ├── style.css              → Main layout
    ├── responsive.css         → Media queries
    └── tailwind.css           → Tailwind directives

data/
├── source/pte/                ← Source Markdown Files
│   ├── vocabs/                → 17 vocabulary books
│   └── practices/             → Practice sentences
└── processed/                 ← Generated JSON (17 datasets)

scripts/
├── pte-data-pipeline.js       ← Markdown → JSON processor
└── validate*.js               ← Validation scripts

archive/vanilla-js-legacy/     ← Legacy Code (Data Pipeline Only)
├── shared/Config.js           → Pipeline configuration
└── data/extractors/           → 5 data extractors
```

## Essential Commands

### Development
```bash
# Start development (processes data + starts server on port 3001)
npm run start

# Start dev server only (port 3001)
npm run dev

# Process PTE vocabulary data (required before first run)
npm run data:pte

# Run tests
npm test

# Lint code
npm run lint
```

### Build & Deploy
```bash
# Production build (minifies JS/CSS)
npm run build

# Full deploy pipeline (data + build + validate)
npm run deploy

# Clean build artifacts
npm run clean

# Validate datasets
npm run validate
```

## Core Architecture Principles

### 1. **React + TypeScript + Zustand State Management**

**Modern React App** (v3.0.1):
- **React 19** with TypeScript 5.9 (strict mode)
- **Zustand** for global state (replaces EventBus pattern)
- **Component-based** architecture (feature-grouped)
- **Type-safe** with full TypeScript coverage

**Key Components**:
- `App.tsx` (src/App.tsx:1) - Root coordinator, renders based on practice mode
- `useAppStore` (src/ts/stores/index.ts:61) - Main Zustand store (7 slices)
- Feature components in `src/components/` - Organized by domain (ai/, audio/, practice/, etc.)

**State Management Pattern**:
```typescript
// ✅ CORRECT: Zustand store access
import { useAppStore } from './ts/stores';

// In React components
const currentItem = useAppStore((state) => state.vocabulary.currentItem);
const setPlaying = useAppStore((state) => state.audio.setPlaying);

// In vanilla JS (legacy interop)
const store = useAppStore.getState();
store.audio.startAutoPlay();
```

### 2. **Type-Safe Configuration** (`src/ts/shared/Config.ts`)
- All configuration in centralized `Config.ts` class
- Type-safe access via `AppConfig` interface
- Vocabulary books, practice modes, TTS settings, event names
- **17 vocabulary books** defined in `learningModes` array

**Usage**:
```typescript
const config = new AppConfig();
const dataPath = config.get('data.paths.byMode.pte-fib-listening');
const modes = config.get('data.learningModes');
```

### 3. **Zustand Store Architecture** (7 Slices)

The main store (`src/ts/stores/index.ts`) combines 7 state slices:

1. **audio** - Playback controls (isPlaying, speed, repeatMode, navigation)
2. **tts** - Text-to-speech state (isSpeaking, currentWord, selectedVoice)
3. **settings** - User preferences (vocabularyBook, autoPlay, theme)
4. **vocabulary** - Current dataset (items, currentItem, filteredDataset)
5. **progress** - Learning progress (currentIndex, itemsCompleted, accuracy)
6. **ui** - UI state (showSettings, showAITutor, etc.)
7. **auth** - Authentication (user, isAuthenticated, Supabase session)

**Middleware Stack**:
- `subscribeWithSelector` - Granular subscriptions
- `devtools` - Redux DevTools integration
- `persist` - LocalStorage persistence

### 4. **Data Pipeline** (Markdown → JSON)

**Build-time processing** (not runtime):
- `scripts/pte-data-pipeline.js` - Main processor
- Uses legacy extractors from `archive/vanilla-js-legacy/data/extractors/`
- 5 extractor types:
  - `PTETermsExtractor.js` - Dual IPA format (British + American)
  - `SingleIPATermsExtractor.js` - Single IPA format
  - `PTESentenceExtractor.js` - RS/WFD sentences
  - `PTEQuestionExtractor.js` - ASQ questions
  - `DIAnswerExtractor.js` - DI shadowing answers

**Flow**:
```
data/source/pte/*.md
  ↓ npm run data:pte
data/processed/*.json
  ↓ fetch() at runtime
React app (Zustand store)
```

### 5. **Component Organization**

**Feature-grouped architecture**:
- `ai/` - AI-powered features (Gemini chat, scoring, interventions)
- `audio/` - Audio playback controls (TTS, voice selection)
- `practice/` - Learning interfaces (WordCard, RS/ASQ/WFD modes)
- `settings/` - Settings panel
- `shared/` - Reusable components (Skeleton, modals)
- `migration/` - Data migration utilities
- `profile/` - User profile management

**Interface Pattern** (App.tsx:270-287):
- App determines interface type based on `vocabulary.mode`
- Renders `WordCard` (vocabulary), `RSInterface`, `ASQInterface`, or `WFDInterface`
- Each interface handles its own TTS and navigation

## Critical Files

### React Application Core
- **`src/App.tsx`** (527 lines) - Root component
  - Main coordinator for entire React app
  - Handles vocabulary loading, session tracking, AI interventions
  - Determines which interface to render (vocabulary/RS/ASQ/WFD)
  - Data path mapping for 17 vocabulary books + shadowing (lines 105-126)

- **`src/main.tsx`** - React entry point (Vite)
  - Mounts React app to DOM
  - Imports global CSS (Tailwind + custom)

### State Management
- **`src/ts/stores/index.ts`** (~500 lines) - Main Zustand store
  - Combines 7 state slices (audio, tts, settings, vocabulary, progress, ui, auth)
  - Middleware: subscribeWithSelector, devtools, persist
  - Replaces legacy EventBus pattern

- **`src/ts/stores/types.ts`** - Store type definitions
  - TypeScript interfaces for all store slices

### Configuration
- **`src/ts/shared/Config.ts`** (~300 lines) - Type-safe configuration
  - ALL app configuration (data paths, learning modes, TTS, events)
  - 17 vocabulary books defined in `learningModes` (lines 70-98)
  - Data path mappings in `data.paths.byMode` (lines 40-67)
  - Practice mode configurations

### Key React Components
- **`src/components/practice/WordCard.tsx`** - Main vocabulary display
  - Most important component for vocabulary learning
  - Handles TTS playback, IPA display, session tracking

- **`src/components/practice/RSInterface.tsx`** - Repeat Sentence UI
- **`src/components/practice/ASQInterface.tsx`** - Answer Short Question UI
- **`src/components/practice/WFDInterface.tsx`** - Write From Dictation UI
- **`src/components/settings/SettingsPanel.tsx`** - Settings modal
  - Vocabulary book selector, practice mode switcher
  - Uses Zustand store for state management

### AI Services
- **`src/services/ai/interventionEngine.ts`** - Proactive AI suggestions
- **`src/services/ai/recommendationEngine.ts`** - Personalized learning paths
- **`src/services/ai/weakAreaDetector.ts`** - Pattern detection in errors
- **`src/services/session/sessionManager.ts`** - Practice session tracking

### Data Pipeline (Build-time)
- **`scripts/pte-data-pipeline.js`** - Markdown → JSON processor
  - Processes 17 vocabulary books + 3 practice modes + 2 shadowing datasets
  - Uses extractors from `archive/vanilla-js-legacy/data/extractors/`

- **`archive/vanilla-js-legacy/data/extractors/`** (5 extractors):
  - `PTETermsExtractor.js` - Dual IPA (British + American)
  - `SingleIPATermsExtractor.js` - Single IPA format
  - `PTESentenceExtractor.js` - RS/WFD sentences
  - `PTEQuestionExtractor.js` - ASQ questions
  - `DIAnswerExtractor.js` - DI shadowing

### Audio System
- **`src/ts/audio/TTSEngine.ts`** - Web Speech API wrapper
- **`src/ts/audio/pollyService.ts`** - AWS Polly integration (18 neural voices)
- **`src/components/audio/AudioControls.tsx`** - Playback UI controls

### Supabase Integration
- **`src/ts/supabase/supabaseClient.ts`** - Client setup
- **`src/ts/supabase/authService.ts`** - Authentication (sign up/in/out)
- **`src/ts/supabase/syncService.ts`** - Progress sync across devices
- **`src/ts/supabase/autoSyncManager.ts`** - Automatic background sync

## Data Architecture

### Dataset Types
1. **Vocabulary** (17 books, 13,800+ terms) - Words with IPA pronunciation
   - PTE FIB Listening (990), Beginner (383), Intermediate (2,408), Advanced (2,703)
   - Read Aloud (788), RS Vocab (887), Must-Know (1,397), WFD Vocab (1,318)
   - Reading FIB (313), Reading FIB Drag (767), ASQ Answers (627)
   - RS-WFD Combined, High-Frequency, RS Core (222), DI/RL Templates (106)
   - SST Complete (368), Essay Topics (NEW)

2. **Practice** (3 modes, 2,507 items) - Sentences/questions for practice
   - Repeat Sentence (620), Answer Short Question (692), Write From Dictation (1,195)

3. **Shadowing** (2 datasets, 20 answers) - DI answers for continuous speech practice
   - DI Images 1-10 (10 answers), DI Images 11-20 (10 answers)

### Data Flow
```
Markdown Source (data/source/pte/)
  ↓ pte-data-pipeline.js
JSON Dataset (data/processed/)
  ↓ DatasetManager/PTEVocabularyManager
Application
```

### Schema Differences
**Vocabulary**: Direct properties
```json
{ "word": "ubiquitous", "difficulty": "hard", "category": "pte-advanced" }
```

**Practice (RS/ASQ/WFD)**: Nested in `metadata`
```json
{ "sentence": "...", "metadata": { "difficulty": "normal", "category": "pte-rs" } }
```

**Schema Note**: Vocabulary items have direct properties, practice items nest in `metadata`. The React app handles both via conditional checks in components.

## Important Terminology

### Study Types vs. Vocabulary Books

**Study Types** (4 categories):
1. **Vocabulary Learning** - Study individual words (17 books available)
2. **Task Practice** - Full sentences/questions (RS/ASQ/WFD)
3. **DI Shadowing** - Continuous speech practice (DI Images)
4. **AI Features** - Scoring, chat, recommendations (always available)

**Vocabulary Books** (17 total):
- Selected via `SettingsPanel` → `vocabularyBook` selector
- Stored in Zustand: `settings.vocabularyBook`
- Maps to file path via `Config.ts` → `data.paths.byMode`

**Practice Modes**:
- `'pte-fib-listening'` → vocabulary mode
- `'rs'` → Repeat Sentence (practice mode)
- `'asq'` → Answer Short Question (practice mode)
- `'wfd'` → Write From Dictation (practice mode)
- `'di-shadowing-1-10'` → DI Shadowing (shadowing mode)

### Legacy EventBus vs. Zustand

**Legacy (vanilla JS)** - EventBus pattern:
```javascript
// OLD: Event-driven communication (still in archive/)
window.eventBus.emit('audio:autoplay:start');
window.eventBus.on('audio:autoplay:start', handler);
```

**Current (React)** - Zustand reactive state:
```typescript
// NEW: Direct state updates
const { startAutoPlay } = useAppStore((state) => state.audio);
startAutoPlay();

// Subscribe to changes
useAppStore.subscribe(
  (state) => state.audio.isAutoPlaying,
  (isAutoPlaying) => console.log('Auto-play:', isAutoPlaying)
);
```

**Note**: EventBus still exists in `src/ts/utils/EventBus.ts` for legacy interop but is NOT the primary communication method.

## CSS Architecture

### Tailwind CSS + Custom CSS Hybrid

**Primary**: Tailwind CSS 4.x (utility-first)
- Main entry: `src/css/tailwind.css`
- Component styling: Tailwind classes in TSX files
- Configured via `tailwind.config.js` and `postcss.config.js`

**Custom CSS** (legacy modular structure):
```
src/css/
├── tailwind.css           - Tailwind entry (@tailwind directives)
├── variables.css          - Design tokens (222 CSS vars)
├── animations.css         - Keyframe animations
├── components.css         - BEM components (legacy)
├── style.css              - Main layout (legacy)
└── responsive.css         - Media queries (legacy)
```

**Current Approach**:
- New components: Use Tailwind utility classes
- Legacy styles: Keep existing custom CSS for backwards compatibility
- Radix UI: Provides accessible component primitives with built-in styles
- Design tokens: CSS variables still available for customization

**Load Order** (Vite handles automatically):
1. `tailwind.css` - Imported in `main.tsx`
2. Custom CSS files - Imported as needed in components

## Error Handling

### React Error Boundaries
- Top-level error boundary in `App.tsx` (coming soon)
- Component-level try-catch for data loading
- User-friendly error messages via alerts/toasts

### Vocabulary Loading (App.tsx:96-183)
- **Try-catch around fetch** - Shows alert if vocabulary fails to load
- **Fallback data paths** - Maps vocabulary book IDs to JSON files
- **Loading states** - Shows `WordCardSkeleton` while loading

### Session Tracking (Non-blocking)
- Session start failures are caught but don't block app (App.tsx:173-177)
- Logs error to console, app continues without tracking

### AI Services (Graceful Degradation)
- AI features (chat, scoring, recommendations) fail gracefully
- If Gemini API fails → shows error message, app continues
- If AWS Polly fails → falls back to browser TTS

### Supabase Integration
- Auth errors → user stays anonymous, local-only mode
- Sync errors → logged but don't crash app
- Migration errors → shows modal with retry option

## Common Tasks

### Adding a New Vocabulary Book
1. **Create Markdown source** in `data/source/pte/vocabs/`
   ```markdown
   # PTE New Book

   word | /IPA/ — sounds like **phonetic**
   another | /əˈnʌðə/ — sounds like **uh-NUTH-er**
   ```

2. **Update Config.ts** (`src/ts/shared/Config.ts`):
   - Add to `data.learningModes` array (lines 70-98)
   - Add to `data.paths.byMode` object (lines 40-67)

3. **Update App.tsx** (`src/App.tsx`):
   - Add to `dataPathMap` object (lines 105-126)

4. **Update legacy Config.js** (`archive/vanilla-js-legacy/shared/Config.js`):
   - Add to `pipeline.registry[]` array
   - Choose extractor: `'PTETermsExtractor'` (dual IPA) or `'SingleIPATermsExtractor'` (single IPA)

5. **Process data**: Run `npm run data:pte`

6. **Update SettingsPanel** (`src/components/settings/SettingsPanel.tsx`):
   - Add to vocabulary dropdown options

**IPA Format Options**:
- **Dual IPA** (PTETermsExtractor): `word | /British/ — **PHON** | /American/ — **PHON**`
- **Single IPA** (SingleIPATermsExtractor): `word | /IPA/ — sounds like **PHONETIC**`

### Adding a New React Component
1. **Create component file** in appropriate `src/components/` subdirectory
2. **Use TypeScript** - `.tsx` extension for JSX, `.ts` for utilities
3. **Import Zustand store** - `import { useAppStore } from '@stores';`
4. **Use Radix UI + Tailwind** - For consistent styling
5. **Export from parent directory** - Add to `index.ts` if creating a barrel export

**Example**:
```typescript
import React from 'react';
import { useAppStore } from '../../ts/stores';
import { Button } from '@radix-ui/themes';

export const MyComponent: React.FC = () => {
  const currentItem = useAppStore((state) => state.vocabulary.currentItem);

  return (
    <div className="p-4 bg-slate-800 rounded-lg">
      <h2 className="text-xl font-bold text-white">{currentItem?.english}</h2>
      <Button onClick={() => console.log('Clicked')}>Action</Button>
    </div>
  );
};
```

### Modifying Zustand Store
1. **Edit store slice** in `src/ts/stores/index.ts`
2. **Update types** in `src/ts/stores/types.ts` if adding new state
3. **Use immer** for nested updates (already configured)
4. **Test in React DevTools** - Zustand devtools middleware enabled

**Example**:
```typescript
// Add new state to a slice
audio: {
  // ... existing state
  newFeature: false,
  toggleNewFeature: () => set((state) => ({
    audio: { ...state.audio, newFeature: !state.audio.newFeature }
  })),
}
```

### Running Different Study Modes
**Vocabulary Learning**:
- Default mode, loads `pte-fib-listening` by default
- Change via Settings → Vocabulary Book dropdown

**Task Practice**:
- Settings → Study Type → "Task Practice"
- Choose RS/ASQ/WFD from dropdown
- App.tsx automatically renders appropriate interface (RSInterface/ASQInterface/WFDInterface)

**DI Shadowing**:
- Settings → Study Type → "DI Shadowing Practice"
- Choose DI Images 1-10 or 11-20
- Continuous speech with real-time highlighting

## Testing

- **Unit tests**: `npm test` (Jest + jsdom)
- **Manual testing**: Required for TTS (browser-specific)
- **Validation**: `npm run validate` (checks datasets)

## Common Pitfalls

❌ **Don't**: Hardcode data paths in components
✅ **Do**: Use `Config.ts` and update `dataPathMap` in `App.tsx`

❌ **Don't**: Mutate Zustand state directly
✅ **Do**: Use store action functions (e.g., `setPlaying()`, `startAutoPlay()`)

❌ **Don't**: Use EventBus in new React components
✅ **Do**: Use Zustand store for state management

❌ **Don't**: Forget to add new vocabulary books to all 4 locations
✅ **Do**: Update Config.ts, App.tsx, legacy Config.js, and SettingsPanel.tsx

❌ **Don't**: Import from `src/js/` (legacy code)
✅ **Do**: Import from `src/ts/` or `src/components/`

❌ **Don't**: Use vanilla DOM manipulation in React components
✅ **Do**: Use React state and refs

❌ **Don't**: Add types to `any` or skip TypeScript strict checks
✅ **Do**: Define proper types in `src/types/` and use them

## Performance Notes

- **Vite HMR**: Fast Hot Module Replacement during development
- **Code Splitting**: Automatic chunking by Vite (vendor, radix-ui, supabase, analytics)
- **Lazy Loading**: Datasets loaded on-demand via fetch()
- **Zustand Selectors**: Fine-grained re-renders (only subscribe to needed state)
- **React 19**: Concurrent rendering, automatic batching
- **Minification**: Vite/esbuild minifies JS/CSS in production
- **Source Maps**: Generated for production debugging
- **Tree Shaking**: Dead code elimination via ES modules

## Documentation

- **`docs/GUIDELINES.md`** - Design principles and development rules (START HERE)
- **`docs/ENFORCING-GUIDELINES.md`** - 5 methods to enforce guidelines with AI
- **`docs/ARCHITECTURE.md`** - Detailed system architecture (2,230 lines!)
- **`docs/API-REFERENCE.md`** - Complete API documentation
- **`docs/DEPLOYMENT.md`** - Deployment guide
- **`docs/TROUBLESHOOTING.md`** - Common issues
- **`README.md`** - User-facing overview

## Deployment

### Vercel (Recommended)
```bash
npm run vercel-build  # Runs: data:pte + vite build + copy processed data to dist/
# Vercel automatically detects Vite and serves dist/ folder
```

### Manual Build
```bash
npm run deploy  # Runs: data:pte + build + validate:all
# Upload dist/ folder to any static host (Netlify, AWS S3, etc.)
```

### Build Output
- `dist/` - Production build output
  - `dist/assets/js/` - Bundled JavaScript (chunked)
  - `dist/assets/css/` - Bundled CSS
  - `dist/data/processed/` - JSON datasets (copied from data/processed/)
  - `index.html` - Entry point

## Version History

- **v3.0.1** (Nov 2025) - **AI-Powered React Release**
  - Complete React 19 + TypeScript migration (100%)
  - Zustand state management (replaces EventBus)
  - AI features: Gemini chat, scoring, interventions, recommendations
  - Supabase integration: Auth, cloud sync, analytics
  - AWS Polly premium TTS (18 neural voices)
  - 17 vocabulary books (13,800+ terms)
  - 3 practice modes (RS/ASQ/WFD)
  - 2 DI shadowing datasets
  - Session tracking and proactive interventions

- **v2.5.4** (Oct 2025) - Legacy vanilla JS (archived)
  - Production-ready, comprehensive documentation
  - Event-driven architecture with EventBus

- **v2.5.2** - Zero console errors, optimized performance
- **Phase 2** - Practice modes (RS/ASQ/WFD), CSS refactoring

---

## Tech Stack

**Frontend**:
- React 19.2.0 - UI framework
- TypeScript 5.9.3 - Type safety (strict mode)
- Zustand 5.0 - State management
- Radix UI 3.2 - Accessible component primitives
- Tailwind CSS 4.1 - Utility-first styling
- Vite 7.2 - Build tool & dev server

**Backend & Cloud**:
- Supabase - PostgreSQL + Auth + Storage
- AWS Polly - Premium neural TTS (18 voices)
- Google Gemini - FREE AI chat & recommendations (1,500 req/day)
- Vercel - Serverless deployment + edge CDN

**Development**:
- Vitest - Unit testing
- ESLint - Code linting
- PostHog - Analytics
- Husky - Git hooks (pre-commit validation)

---

**Key Insight**: This is now a **modern React + TypeScript app** with Zustand state management. The legacy EventBus pattern is archived. New features should use Zustand store for state, React components for UI, and TypeScript for type safety.
