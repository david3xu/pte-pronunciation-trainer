# Copilot Instructions - PTE Pronunciation Trainer

**Project**: AI-powered pronunciation training app for PTE exam prep  
**Stack**: React 19 + TypeScript 5.9 + Zustand + Supabase + Vite  
**Version**: 3.0.2 (Nov 2025)

## Architecture Overview

**Hybrid Data Strategy**: Local JSON (vocabulary/practice data) + Supabase (user progress/settings)
- Vocabulary loads from `data/processed/*.json` (13K+ words, 10-20ms)
- User data syncs via Supabase (auth, progress, settings)
- AI services: Google Gemini (FREE chat/recommendations), AWS Polly (premium TTS)

**Component Structure** (`src/components/`): Feature-grouped architecture
- `ai/` - Gemini chat, AI recommendations, pronunciation scoring
- `audio/` - TTS controls, voice selectors (browser + AWS Polly)
- `practice/` - WordCard, RS/ASQ/WFD interfaces, progress tracking
- `settings/`, `shared/`, `migration/`, `profile/`

**State Management**: Zustand store (`src/stores/index.ts`) with 7 slices
```typescript
// Usage in React components
const currentItem = useAppStore((state) => state.vocabulary.currentItem);
const { startAutoPlay } = useAppStore((state) => state.audio);

// Subscribe to changes
useAppStore.subscribe(
  (state) => state.audio.isPlaying,
  (isPlaying) => console.log('Playing:', isPlaying)
);
```

## Critical Workflows

**Development**:
```bash
npm run data:pte       # Process markdown → JSON (REQUIRED before first run)
npm run dev            # Start Vite dev server (port 3001)
npm run build          # TypeScript compile + Vite build
npm run deploy         # Full pipeline: data:pte + build + validate
```

**Data Pipeline** (`scripts/pte-data-pipeline.js`):
1. Reads markdown from `data/source/pte/` (vocabs, practices, essays)
2. Uses 5 extractors: `PTETermsExtractor` (dual IPA), `SingleIPATermsExtractor`, `PTESentenceExtractor`, `PTEQuestionExtractor`, `DIAnswerExtractor`
3. Outputs JSON to `data/processed/` (auto-copied to `dist/data/` on build)
4. **Must run** before dev server starts (included in `npm run start`)

**Adding New Vocabulary Book**:
1. Create markdown in `data/source/pte/vocabs/` (format: `word | /IPA/ — sounds like **PHONETIC**`)
2. Register in `scripts/pte-data-pipeline.js` → `PIPELINE_CONFIG.registry[]`
3. Add path mapping in `src/config/AppConfig.ts` → `data.paths.byMode`
4. Update UI selector in `src/components/settings/SettingsPanel.tsx`
5. Run `npm run data:pte` to generate JSON

## Project-Specific Conventions

**IPA Pronunciation Formats**:
- **Dual IPA** (PTETermsExtractor): `word | /brɪtɪʃ/ — **BRIT-ish** | /əˈmerɪkən/ — **uh-MER-uh-kin**`
- **Single IPA** (SingleIPATermsExtractor): `word | /aɪˈpiːeɪ/ — sounds like **eye-PEE-ay**`

**Data Schema Differences** (critical for type safety):
- **Vocabulary items**: Direct properties (`word`, `difficulty`, `category`)
- **Practice items** (RS/ASQ/WFD): Nested in `metadata` field (`sentence`, `metadata.difficulty`, `metadata.category`)

**TTS Architecture**:
- Browser TTS (free): `src/services/audio/TTSEngine.ts` (Web Speech API)
- Premium TTS (paid): `src/services/audio/pollyService.ts` (AWS Polly 18 neural voices)
- Unified controls in `src/components/audio/AudioControls.tsx`
- Speed control applies universally (0.5x - 2.0x)
- **Critical**: Always call `ttsEngine.stopSpeaking()` before navigation/mode switches
- **Voice loading**: Voices preload on startup via `voiceschanged` event (Chrome pattern)

**Caching Strategy** (5 layers):
- Service Worker cache (30-day data files via PWA)
- Voice cache (TTS engine - reuses selected voices)
- Profile cache (localStorage - learner profiles)
- Audio cache config (100 items, 1-hour TTL)
- AWS Polly cache (Supabase Storage - 80-90% cost reduction)

**Component Patterns**:
- **Feature-first**: Group by domain (`ai/`, `audio/`) not type (`buttons/`, `modals/`)
- **Radix UI + Tailwind**: Use Radix primitives with Tailwind utility classes
- **Type-safe props**: All components use TypeScript interfaces

## Integration Points

**Supabase** (`src/services/supabase/`):
- `supabaseClient.ts` - Client initialization (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- `authService.ts` - Sign up/in/out
- `syncService.ts` - Progress/settings sync
- Tables: `learner_profiles`, `practice_progress`, `user_settings`, `study_analytics`

**Google Gemini AI** (`src/services/ai/`):
- **FREE** 1,500 req/day (API key: `VITE_GEMINI_API_KEY`)
- `geminiService.ts` - Chat interface
- `recommendationEngine.ts` - Personalized learning paths
- `interventionEngine.ts` - Proactive study suggestions

**AWS Polly** (`src/services/audio/pollyService.ts`):
- 18 neural voices (US/UK/AU/IN English)
- SSML control (speed, pitch, pauses)
- Audio caching via Supabase Storage (80-90% cost reduction)

## Common Pitfalls

❌ **Don't** hardcode data paths in components  
✅ **Do** use `AppConfig.ts` and update 4 locations (Config.ts, pipeline, AppContent.tsx, SettingsPanel.tsx)

❌ **Don't** mutate Zustand state directly  
✅ **Do** use store action functions (`setPlaying()`, `startAutoPlay()`)

❌ **Don't** import from `archive/vanilla-js-legacy/`  
✅ **Do** use `src/services/`, `src/components/`, `src/stores/`

❌ **Don't** skip `npm run data:pte` before first run  
✅ **Do** run data pipeline (auto-included in `npm run start`)

❌ **Don't** navigate or switch modes without stopping TTS  
✅ **Do** call `ttsEngine.stopSpeaking()` before navigation (Next/Prev) and mode switches

❌ **Don't** call `synth.getVoices()` synchronously without checking if voices loaded  
✅ **Do** use `voiceschanged` event listener or check `cachedVoice` before speaking

❌ **Don't** forget to cleanup timers, intervals, and event listeners  
✅ **Do** return cleanup functions from useEffect and call `destroy()` on services

❌ **Don't** make fetch() calls without AbortController for long-lived components  
✅ **Do** use AbortController and cancel on unmount to prevent memory leaks

## Key Files

- **`CLAUDE.md`** - Comprehensive AI assistant guide (2,200+ lines, **read first**)
- **`src/App.tsx`** - Root React component (vocabulary loading, interface routing)
- **`src/stores/index.ts`** - Main Zustand store (7 slices: audio, tts, settings, vocabulary, progress, ui, auth)
- **`src/config/AppConfig.ts`** - Type-safe configuration (17 vocab books, practice modes, data paths)
- **`scripts/pte-data-pipeline.js`** - Markdown → JSON processor (build-time data generation)
- **`src/components/practice/WordCard.tsx`** - Primary vocabulary display component

## Documentation

- **Start**: `CLAUDE.md` (AI guide), `README.md` (user guide)
- **Architecture**: `docs/architecture/ARCHITECTURE.md` (2,230 lines), `docs/architecture/GUIDELINES.md`
- **Setup**: `docs/setup/SUPABASE-SETUP-GUIDE.md`, `docs/setup/GEMINI-SETUP.md`, `docs/setup/AWS-POLLY-SETUP.md`
- **API**: `docs/api/API-REFERENCE.md`

## Quick Reference

**Essential Commands**:
- `npm run start` → Process data + start dev server (port 3001)
- `npm run build` → TypeScript compile + Vite production build
- `npm test` → Run Vitest tests
- `npm run validate:all` → Validate docs, structure, datasets

**Path Aliases** (vite.config.ts):
```typescript
import { useAppStore } from '@stores';           // src/stores/
import { AudioControls } from '@components/audio'; // src/components/audio/
import type { VocabularyTerm } from '@types';    // src/types/
```

**Environment Variables** (.env):
```bash
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anonymous key
VITE_GEMINI_API_KEY=         # Google Gemini API (FREE)
VITE_AWS_ACCESS_KEY_ID=      # AWS Polly credentials
VITE_AWS_SECRET_ACCESS_KEY=  # AWS Polly credentials
```
