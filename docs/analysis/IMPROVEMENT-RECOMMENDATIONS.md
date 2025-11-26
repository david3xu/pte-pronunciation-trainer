# PTE Pronunciation Trainer - Improvement Recommendations

**Date**: November 2025
**Version**: v3.0.0
**Analysis**: Backend, Frontend, Mobile UX, and Code Migration

---

## Executive Summary

This document provides a comprehensive analysis of improvement opportunities across backend infrastructure, frontend architecture, mobile user experience, and code migration from the archive directory.

**Key Findings**:
- ✅ **Strong Foundation**: React 19 + TypeScript + Zustand architecture is solid
- ⚠️ **Backend**: Supabase integration exists but lacks optimization (no caching, RLS policies not verified)
- ⚠️ **Mobile**: Limited responsive design (only 5 files use Tailwind breakpoints)
- ⚠️ **Performance**: Large JSON files (1.2MB advanced vocabulary) loaded synchronously
- ⚠️ **Archive**: Data extractors are still needed for build pipeline (NOT candidates for migration)

---

## 1. Backend Improvements

### 1.1 Supabase Optimization

#### Current Issues:
1. **No Database Type Generation**
   - File: `src/ts/supabase/supabaseClient.ts:124`
   - Issue: `export type Database = any;` - Loses type safety
   - Impact: Runtime errors, no autocomplete for database operations

2. **Missing Row-Level Security (RLS) Verification**
   - No documentation on RLS policies
   - Potential security risk for user data
   - No test coverage for auth boundaries

3. **No Connection Pooling**
   - Each request creates new connection
   - Could hit Supabase connection limits under load

4. **Missing Error Recovery**
   - Auth failures silently fall back to guest mode
   - No retry logic for transient Supabase errors
   - No offline queue for sync operations

#### Recommendations:

**HIGH PRIORITY** (Week 1-2):
```bash
# Generate Supabase types
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/supabase.ts

# Update supabaseClient.ts
import { Database } from '../types/supabase';
export const supabase = createClient<Database>(url, key);
```

**MEDIUM PRIORITY** (Week 3-4):
- Implement connection pooling via Supabase edge functions
- Add retry logic with exponential backoff (3 retries: 1s, 2s, 4s)
- Create offline sync queue using IndexedDB
- Document RLS policies in `docs/api/SUPABASE-SCHEMA.md`

**LOW PRIORITY** (Month 2):
- Add Supabase health check endpoint
- Implement rate limiting per user (prevent abuse)
- Add telemetry for Supabase operation latency

---

### 1.2 API Architecture

#### Current Issues:
1. **Serverless Functions Scattered**
   - 7 API routes in `/api/` directory
   - No shared middleware (auth, validation, error handling)
   - Duplicate code across routes (e.g., AWS client setup)

2. **No Request Validation**
   - `api/premium-tts.ts:67` - Basic validation only
   - No Zod/Yup schema validation
   - Accepts any request body structure

3. **No Caching Layer**
   - AWS Polly TTS generates audio every time
   - Same text + voice = wasted API calls
   - Supabase Storage not being used for caching

4. **No Rate Limiting**
   - Unlimited API calls per user
   - Could be abused (AWS Polly costs money)
   - No protection against DDoS

#### Recommendations:

**HIGH PRIORITY** (Week 1-2):
```typescript
// Create shared middleware: api/middleware/validation.ts
import { z } from 'zod';

export const premiumTTSSchema = z.object({
  text: z.string().min(1).max(3000),
  voiceId: z.enum(['Joanna', 'Matthew', 'Amy', ...]),
  engine: z.enum(['standard', 'neural']).default('neural'),
});

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (req: VercelRequest): T => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error);
    }
    return result.data;
  };
}
```

**MEDIUM PRIORITY** (Week 3-4):
```typescript
// Add TTS caching: api/middleware/ttsCache.ts
import { createHash } from 'crypto';

export async function getTTSFromCache(text: string, voiceId: string): Promise<string | null> {
  const cacheKey = createHash('sha256').update(`${text}-${voiceId}`).digest('hex');

  // Check Supabase Storage for cached audio
  const { data } = await supabase.storage
    .from('tts-cache')
    .download(`${cacheKey}.mp3`);

  if (data) {
    return data.arrayBuffer().then(buf => Buffer.from(buf).toString('base64'));
  }

  return null;
}

export async function cacheTTS(text: string, voiceId: string, audioBase64: string) {
  const cacheKey = createHash('sha256').update(`${text}-${voiceId}`).digest('hex');
  const buffer = Buffer.from(audioBase64, 'base64');

  await supabase.storage
    .from('tts-cache')
    .upload(`${cacheKey}.mp3`, buffer, {
      cacheControl: '31536000', // 1 year
      contentType: 'audio/mpeg',
    });
}
```

**LOW PRIORITY** (Month 2):
- Add rate limiting via Vercel Edge Config (100 req/min per user)
- Implement API key rotation for AWS credentials
- Add OpenTelemetry for distributed tracing

---

### 1.3 Performance Optimization

#### Current Issues:
1. **Large JSON Files Loaded Synchronously**
   - `pte-advanced-vocabulary.json` = 1.2MB (2,703 terms)
   - Blocks main thread during parsing
   - No lazy loading or pagination

2. **No CDN Caching Headers**
   - Vocabulary JSON fetched every page load
   - No `Cache-Control` headers set
   - Vercel CDN not being utilized

3. **No Service Worker for Offline**
   - Index.html references `manifest.json` but no SW
   - Could cache vocabulary for offline use
   - Would improve load times significantly

#### Recommendations:

**HIGH PRIORITY** (Week 1-2):
```typescript
// 1. Add pagination to vocabulary loading (App.tsx)
const ITEMS_PER_PAGE = 50;

async function loadVocabularyPaginated(bookId: string, page: number = 1) {
  const response = await fetch(`/data/processed/${bookId}.json`);
  const data = await response.json();

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  return {
    items: data.vocabulary.slice(startIndex, endIndex),
    totalPages: Math.ceil(data.vocabulary.length / ITEMS_PER_PAGE),
    currentPage: page,
  };
}

// 2. Add cache headers in vercel.json
{
  "headers": [
    {
      "source": "/data/processed/(.*).json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=604800, immutable"
        }
      ]
    }
  ]
}
```

**MEDIUM PRIORITY** (Week 3-4):
```javascript
// 3. Implement Service Worker for offline caching
// public/service-worker.js
const CACHE_NAME = 'pte-vocab-v3.0.0';
const CACHED_ASSETS = [
  '/',
  '/index.html',
  '/data/processed/pte-beginner-vocabulary.json',
  '/data/processed/pte-intermediate-vocabulary.json',
  // ... other critical vocabularies
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHED_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

## 2. Frontend Improvements

### 2.1 React Component Architecture

#### Current Issues:
1. **Props Drilling in WordCard**
   - `WordCard.tsx` receives 3 props but accesses 10+ store fields
   - Could use more granular selectors
   - Re-renders on unrelated state changes

2. **Duplicate Data Path Mappings**
   - `App.tsx:105-126` - dataPathMap object
   - `SettingsPanel.tsx:55-76` - Same dataPathMap duplicated
   - Should be in Config.ts or a shared constant

3. **No Error Boundaries**
   - Components can crash the entire app
   - No graceful fallback UI
   - User sees white screen on errors

4. **Large Components**
   - `App.tsx` = 527 lines (too large)
   - `SettingsPanel.tsx` = 600+ lines
   - Should be split into smaller components

#### Recommendations:

**HIGH PRIORITY** (Week 1-2):
```typescript
// 1. Create shared constants: src/ts/shared/dataPaths.ts
export const DATA_PATH_MAP: Record<string, string> = {
  'pte-fib-listening': '/data/processed/pte-fib-listening-dataset.json',
  'pte-beginner': '/data/processed/pte-beginner-vocabulary.json',
  // ... all 17 books
};

// 2. Extract loading logic: src/ts/data/vocabularyLoader.ts
export async function loadVocabularyBook(bookId: string) {
  const dataPath = DATA_PATH_MAP[bookId];
  if (!dataPath) throw new Error(`Unknown book: ${bookId}`);

  const response = await fetch(dataPath);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return data.vocabulary || data.answers || [];
}

// 3. Add Error Boundary: src/components/shared/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// 4. Split App.tsx into smaller components
// - src/components/practice/PracticeRouter.tsx (handles mode switching)
// - src/components/layout/Header.tsx (header buttons)
// - src/components/layout/Footer.tsx (footer)
```

**MEDIUM PRIORITY** (Week 3-4):
- Optimize Zustand selectors to prevent unnecessary re-renders
- Add React.memo() to expensive components (WordCard, AITutorChat)
- Implement virtual scrolling for long vocabulary lists (react-window)
- Add Suspense boundaries for async components

---

### 2.2 State Management (Zustand)

#### Current Issues:
1. **No State Persistence Strategy**
   - Some state persisted (settings, progress)
   - Some state lost on refresh (auth, vocabulary)
   - Inconsistent behavior

2. **No State Validation**
   - Old localStorage data can break app
   - No migration logic for store schema changes
   - No version checking

3. **Large Store Slices**
   - `vocabulary` slice has 10+ fields
   - Could be split into sub-slices
   - Harder to test and maintain

#### Recommendations:

**MEDIUM PRIORITY** (Week 3-4):
```typescript
// 1. Add store versioning: src/ts/stores/migrations.ts
const STORE_VERSION = 2;

const migrations = {
  1: (state: any) => {
    // Migrate from v1 to v2
    return {
      ...state,
      settings: {
        ...state.settings,
        newField: 'default',
      },
    };
  },
};

export function migrateStore(state: any): any {
  const version = state._version || 1;
  if (version === STORE_VERSION) return state;

  let migratedState = state;
  for (let v = version; v < STORE_VERSION; v++) {
    migratedState = migrations[v](migratedState);
  }

  return { ...migratedState, _version: STORE_VERSION };
}

// 2. Add validation middleware
const validateMiddleware = (config) => (set, get, api) => {
  const setState = (partial) => {
    // Validate state before setting
    const newState = typeof partial === 'function' ? partial(get()) : partial;
    if (!isValidState(newState)) {
      console.error('Invalid state update:', newState);
      return;
    }
    return set(partial);
  };

  return config(setState, get, api);
};
```

---

### 2.3 TypeScript Type Safety

#### Current Issues:
1. **Type Assertions (`as any`)**
   - `WordCard.tsx:64, 77` - Multiple `as any` casts
   - `supabaseClient.ts:52` - `as any` for dummy client
   - Defeats purpose of TypeScript

2. **Missing Type Guards**
   - No runtime validation of fetched JSON
   - Assumes API responses match types
   - Could cause runtime errors

3. **Incomplete Type Definitions**
   - `database.ts` has placeholder types
   - `dataset.types.ts` doesn't cover all formats
   - Single IPA vs Dual IPA types not well defined

#### Recommendations:

**HIGH PRIORITY** (Week 1-2):
```typescript
// 1. Add type guards: src/types/guards.ts
export function isVocabularyTerm(item: unknown): item is VocabularyTerm {
  const obj = item as any;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (typeof obj.word === 'string' || typeof obj.english === 'string') &&
    obj.pronunciation !== undefined
  );
}

export function isPracticeItem(item: unknown): item is PracticeItem {
  const obj = item as any;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj.sentence !== undefined || obj.question !== undefined)
  );
}

// 2. Add JSON validation: src/ts/data/validators.ts
import { z } from 'zod';

const vocabularyTermSchema = z.object({
  word: z.string().optional(),
  english: z.string().optional(),
  pronunciation: z.object({
    british: z.object({ ipa: z.string(), phonetic: z.string() }).optional(),
    american: z.object({ ipa: z.string(), phonetic: z.string() }).optional(),
    ipa: z.string().optional(),
    phonetic: z.string().optional(),
  }),
  difficulty: z.enum(['easy', 'normal', 'hard']),
  category: z.string(),
});

export function validateVocabularyData(data: unknown) {
  const schema = z.object({
    vocabulary: z.array(vocabularyTermSchema),
  });

  return schema.parse(data);
}

// 3. Remove `as any` from WordCard.tsx
// Replace with proper type narrowing
const displayText = isVocabularyTerm(item)
  ? (item.word ?? item.english)
  : isPracticeSentence(item)
    ? item.sentence
    : item.question;
```

---

## 3. Mobile UX Improvements

### 3.1 Responsive Design Issues

#### Current Issues:
1. **Limited Tailwind Breakpoint Usage**
   - Only 5 components use responsive classes (sm:, md:, lg:)
   - Most components have fixed widths
   - Legacy CSS has mobile styles, but React components don't use them

2. **Modal Overflow on Small Screens**
   - `AITutorChat.tsx:280` - Fixed height `h-[85vh]` cuts off content
   - `SettingsPanel.tsx:398` - `max-h-[95vh]` causes scrolling issues
   - Virtual keyboard pushes content off screen

3. **Touch Target Sizes**
   - Legacy CSS has `min-height: 48px` for buttons
   - React components don't enforce this
   - WCAG requires 44x44px minimum

4. **Horizontal Scrolling**
   - `WordCard` with long words can overflow
   - No `overflow-wrap: break-word` on text elements
   - IPA pronunciation text not wrapped

#### Recommendations:

**HIGH PRIORITY** (Week 1-2):
```typescript
// 1. Update App.tsx with responsive classes
<div className="react-app min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2 sm:p-4 md:p-8">
  <div className="max-w-7xl mx-auto">
    {/* Header with responsive button sizes */}
    <header className="mb-2 sm:mb-4">
      <Flex justify="between" align="center" direction={{ initial: 'column', sm: 'row' }} gap="2">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          🎯 PTE Pronunciation
        </h1>
        <Flex gap="2" wrap="wrap" justify={{ initial: 'center', sm: 'end' }}>
          {/* Buttons with responsive sizes */}
          <Button
            variant="soft"
            size={{ initial: '2', md: '2' }}
            className="min-h-[44px] min-w-[44px]"
          >
            <BarChartIcon width="16" height="16" />
            <span className="hidden sm:inline ml-1">Progress</span>
          </Button>
          {/* ... other buttons */}
        </Flex>
      </Flex>
    </header>
  </div>
</div>

// 2. Fix modal heights with safe-area-inset
<Card
  size="4"
  className="w-full max-w-3xl h-[calc(100vh-env(safe-area-inset-bottom)-2rem)] sm:h-[80vh]"
  style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
>
  {/* Modal content */}
</Card>

// 3. Add text wrapping utility: src/css/mobile.css
.break-word {
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}

// 4. Update index.html with safe-area viewport
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

**MEDIUM PRIORITY** (Week 3-4):
```typescript
// 5. Create responsive hook: src/hooks/useBreakpoint.ts
import { useState, useEffect } from 'react';

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('sm');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= breakpoints.xl) setBreakpoint('xl');
      else if (width >= breakpoints.lg) setBreakpoint('lg');
      else if (width >= breakpoints.md) setBreakpoint('md');
      else if (width >= breakpoints.sm) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

// 6. Adaptive UI components
export const AdaptiveWordCard = () => {
  const breakpoint = useBreakpoint();
  const isMobile = ['xs', 'sm'].includes(breakpoint);

  return (
    <Card className={isMobile ? 'p-3' : 'p-6'}>
      {/* Render compact view on mobile */}
      {isMobile ? <CompactView /> : <FullView />}
    </Card>
  );
};
```

---

### 3.2 Touch Interaction

#### Current Issues:
1. **No Touch Gestures**
   - No swipe to navigate between words
   - Could swipe left/right for prev/next
   - Standard on mobile vocab apps

2. **Long Press Not Utilized**
   - Could long-press word for definition
   - Could long-press to copy IPA
   - Missed opportunity for mobile UX

3. **Tap Feedback Lacking**
   - No ripple effect on buttons
   - No visual feedback for touch
   - Feels unresponsive

#### Recommendations:

**MEDIUM PRIORITY** (Week 3-4):
```typescript
// 1. Add swipe gestures: src/hooks/useSwipe.ts
import { useEffect, useState } from 'react';

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) onSwipeLeft();
    if (isRightSwipe) onSwipeRight();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// 2. Use in WordCard
const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(
  () => handleNext(), // Swipe left = next
  () => handlePrevious() // Swipe right = previous
);

return (
  <div
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
  >
    {/* WordCard content */}
  </div>
);
```

**LOW PRIORITY** (Month 2):
- Add haptic feedback (Vibration API) on touch
- Implement long-press context menu
- Add pull-to-refresh for vocabulary reload

---

### 3.3 Mobile Performance

#### Current Issues:
1. **No Lazy Loading of Images**
   - No images in app currently
   - Future DI images would benefit from lazy loading

2. **Heavy JavaScript Bundle**
   - No bundle size analysis
   - Could be too large for 3G networks
   - No code splitting by route

3. **No Mobile-Specific Optimizations**
   - Same bundle for desktop and mobile
   - Could ship lighter bundle for mobile
   - No adaptive loading based on network

#### Recommendations:

**MEDIUM PRIORITY** (Week 3-4):
```bash
# 1. Analyze bundle size
npm install -D @next/bundle-analyzer
npm run build -- --profile

# 2. Add code splitting in vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mobile': ['src/hooks/useBreakpoint.ts', 'src/hooks/useSwipe.ts'],
          'desktop': ['src/components/ai/WeakAreasDashboard.tsx'],
        },
      },
    },
  },
});

# 3. Use dynamic imports for heavy components
const WeakAreasDashboard = React.lazy(() =>
  import('./components/ai/WeakAreasDashboard')
);

// In App.tsx
<React.Suspense fallback={<Spinner />}>
  {showWeakAreas && <WeakAreasDashboard />}
</React.Suspense>
```

---

## 4. Archive Directory Review

### 4.1 Current Archive Structure

```
archive/vanilla-js-legacy/
├── data/extractors/          ← 5 data extractors (JS)
│   ├── PTETermsExtractor.js
│   ├── SingleIPATermsExtractor.js
│   ├── PTESentenceExtractor.js
│   ├── PTEQuestionExtractor.js
│   └── DIAnswerExtractor.js
└── shared/
    └── Config.js              ← Legacy configuration (JS)
```

### 4.2 Migration Assessment

#### Files in Archive:
1. **Data Extractors** (5 files)
   - **Purpose**: Convert Markdown vocabulary files to JSON during build
   - **Usage**: Called by `scripts/pte-data-pipeline.js`
   - **Migration**: ❌ **DO NOT MIGRATE**
   - **Reason**: Build-time only, no runtime dependency, working perfectly

2. **Config.js** (1 file)
   - **Purpose**: Legacy configuration for data pipeline
   - **Usage**: Imported by `pte-data-pipeline.js:11`
   - **Migration**: ⚠️ **PARTIALLY MIGRATED**
   - **Status**: React app uses `src/ts/shared/Config.ts` (TypeScript version)
   - **Reason**: Pipeline still needs JS version for Node.js compatibility

#### Recommendation: **No Migration Needed**

**Why**:
1. Archive files are **build-time dependencies** only
2. They run in Node.js context (not browser)
3. Converting to TypeScript would require:
   - Adding ts-node to build pipeline
   - Configuring separate tsconfig for scripts
   - Complicating build process
4. Current setup works perfectly - "don't fix what isn't broken"

**If Future Migration Needed**:
- Priority: LOW (Month 6+)
- Approach: Convert `pte-data-pipeline.js` to TypeScript first
- Then migrate extractors one-by-one
- Ensure backward compatibility with existing JSON format

---

## 5. Priority Matrix

### Immediate (Week 1-2):
| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Generate Supabase types | High | Low | 🔴 P0 |
| Add request validation (Zod) | High | Low | 🔴 P0 |
| Implement Error Boundaries | High | Low | 🔴 P0 |
| Fix duplicate dataPathMap | Medium | Low | 🟠 P1 |
| Add responsive breakpoints | High | Medium | 🔴 P0 |
| Fix modal overflow on mobile | High | Low | 🔴 P0 |

### Short-term (Week 3-4):
| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| TTS caching with Supabase Storage | High | Medium | 🟠 P1 |
| Add pagination to vocabulary | Medium | Medium | 🟠 P1 |
| Implement Service Worker | High | High | 🟠 P1 |
| Split large components | Medium | Medium | 🟡 P2 |
| Add swipe gestures | Medium | Low | 🟡 P2 |

### Medium-term (Month 2):
| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Add rate limiting | Medium | Medium | 🟡 P2 |
| State version migrations | Medium | Medium | 🟡 P2 |
| Virtual scrolling | Low | High | 🟢 P3 |
| Bundle size optimization | Medium | High | 🟡 P2 |

### Long-term (Month 3+):
| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Migrate data extractors to TS | Low | High | 🟢 P3 |
| OpenTelemetry tracing | Low | High | 🟢 P3 |
| Adaptive loading by network | Low | Medium | 🟢 P3 |

---

## 6. Code Examples

### 6.1 Complete Backend Refactor Example

**File**: `api/premium-tts-v2.ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { getTTSFromCache, cacheTTS } from './middleware/ttsCache';
import { validateRequest } from './middleware/validation';
import { withRateLimit } from './middleware/rateLimit';

// Request schema with Zod
const premiumTTSSchema = z.object({
  text: z.string().min(1).max(3000),
  voiceId: z.enum(['Joanna', 'Matthew', 'Amy', 'Emma', 'Brian', 'Ivy', 'Kendra', 'Kimberly', 'Salli', 'Joey', 'Justin', 'Kevin', 'Nicole', 'Russell', 'Aditi', 'Raveena', 'Arthur', 'Aria']),
  engine: z.enum(['standard', 'neural']).default('neural'),
  languageCode: z.string().default('en-US'),
  outputFormat: z.enum(['mp3', 'ogg_vorbis', 'pcm']).default('mp3'),
});

type PremiumTTSRequest = z.infer<typeof premiumTTSSchema>;

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 1. Validate request
    const validated = validateRequest(premiumTTSSchema)(req);

    // 2. Check cache first
    const cached = await getTTSFromCache(validated.text, validated.voiceId);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: { audioBase64: cached, cached: true },
      });
    }

    // 3. Check AWS credentials
    if (!process.env['AWS_ACCESS_KEY_ID'] || !process.env['AWS_SECRET_ACCESS_KEY']) {
      return res.status(503).json({
        success: false,
        error: 'Premium TTS not configured',
        fallback: true,
      });
    }

    // 4. Generate audio with AWS Polly
    const polly = new PollyClient({
      region: process.env['AWS_REGION'] || 'us-east-1',
      credentials: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
      },
    });

    const command = new SynthesizeSpeechCommand({
      Text: validated.text,
      VoiceId: validated.voiceId,
      Engine: validated.engine,
      LanguageCode: validated.languageCode,
      OutputFormat: validated.outputFormat,
      TextType: 'text',
    });

    const response = await polly.send(command);

    if (!response.AudioStream) {
      throw new Error('No audio stream returned');
    }

    const audioBuffer = await streamToBuffer(response.AudioStream);
    const audioBase64 = audioBuffer.toString('base64');

    // 5. Cache result
    await cacheTTS(validated.text, validated.voiceId, audioBase64);

    // 6. Return response
    return res.status(200).json({
      success: true,
      data: {
        audioBase64,
        contentType: response.ContentType,
        voiceId: validated.voiceId,
        cached: false,
        requestCharacters: validated.text.length,
      },
    });
  } catch (error) {
    console.error('Premium TTS error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true,
    });
  }
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Export with rate limiting middleware
export default withRateLimit(handler, { limit: 100, window: '1m' });
```

---

## 7. Testing Strategy

### 7.1 Backend Tests

```typescript
// api/__tests__/premium-tts.test.ts
import { describe, it, expect, vi } from 'vitest';
import handler from '../premium-tts-v2';

describe('Premium TTS API', () => {
  it('should validate request body', async () => {
    const req = {
      method: 'POST',
      body: { text: '', voiceId: 'Joanna' },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should return cached audio if available', async () => {
    // Test caching logic
  });

  it('should generate new audio if not cached', async () => {
    // Test Polly integration
  });
});
```

### 7.2 Mobile Tests

```typescript
// src/hooks/__tests__/useSwipe.test.ts
import { renderHook, act } from '@testing-library/react';
import { useSwipe } from '../useSwipe';

describe('useSwipe hook', () => {
  it('should detect left swipe', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipe(onSwipeLeft, onSwipeRight));

    act(() => {
      result.current.onTouchStart({ targetTouches: [{ clientX: 200 }] } as any);
      result.current.onTouchMove({ targetTouches: [{ clientX: 100 }] } as any);
      result.current.onTouchEnd();
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
```

---

## 8. Metrics & Monitoring

### 8.1 Key Performance Indicators

**Backend**:
- API response time: Target <500ms (p95)
- TTS cache hit rate: Target >80%
- Supabase query time: Target <200ms (p95)
- Error rate: Target <1%

**Frontend**:
- First Contentful Paint (FCP): Target <1.5s
- Time to Interactive (TTI): Target <3.5s
- Cumulative Layout Shift (CLS): Target <0.1
- Bundle size: Target <500KB (gzipped)

**Mobile**:
- Touch response time: Target <100ms
- Modal open time: Target <200ms
- Vocabulary load time: Target <1s

### 8.2 Monitoring Setup

```typescript
// src/utils/metrics.ts
import { useEffect } from 'react';

export function usePerformanceMetrics() {
  useEffect(() => {
    if ('web-vital' in window) {
      const { onCLS, onFID, onFCP, onLCP, onTTFB } = require('web-vitals');

      onCLS(console.log);
      onFID(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
    }
  }, []);
}

// Track API performance
export function trackAPICall(endpoint: string, duration: number, success: boolean) {
  // Send to PostHog/analytics
  console.log(`[API] ${endpoint}: ${duration}ms, success: ${success}`);
}
```

---

## 9. Migration Checklist

### Phase 1: Critical Fixes (Week 1-2)
- [ ] Generate Supabase TypeScript types
- [ ] Add Zod validation to API routes
- [ ] Create Error Boundary components
- [ ] Consolidate dataPathMap into shared constant
- [ ] Add responsive breakpoints to all modals
- [ ] Fix modal heights with safe-area-inset
- [ ] Add min-height: 44px to all touch targets

### Phase 2: Performance (Week 3-4)
- [ ] Implement TTS caching with Supabase Storage
- [ ] Add vocabulary pagination (50 items per page)
- [ ] Create Service Worker for offline support
- [ ] Add Cache-Control headers in vercel.json
- [ ] Split App.tsx into smaller components
- [ ] Optimize Zustand selectors
- [ ] Add React.memo to expensive components

### Phase 3: Mobile UX (Month 2)
- [ ] Implement swipe gestures for navigation
- [ ] Add useBreakpoint hook
- [ ] Create adaptive WordCard component
- [ ] Add haptic feedback on touch
- [ ] Implement long-press context menu
- [ ] Add pull-to-refresh

### Phase 4: Advanced Features (Month 3+)
- [ ] Add rate limiting (100 req/min per user)
- [ ] Implement state migration system
- [ ] Add virtual scrolling for long lists
- [ ] Bundle size optimization
- [ ] Add OpenTelemetry tracing
- [ ] Network-adaptive loading

---

## 10. Conclusion

**Summary**:
- ✅ **Backend**: Solid foundation, needs caching + validation
- ✅ **Frontend**: Good React architecture, needs mobile optimization
- ⚠️ **Mobile**: Limited responsive design, needs swipe gestures
- ✅ **Archive**: No migration needed (build-time only)

**Next Steps**:
1. Start with **P0 tasks** (Week 1-2)
2. Measure performance improvements
3. Iterate on mobile UX based on user feedback
4. Consider archive migration only if necessary (low priority)

**Estimated Timeline**:
- Phase 1 (Critical): 2 weeks
- Phase 2 (Performance): 2 weeks
- Phase 3 (Mobile): 4 weeks
- Phase 4 (Advanced): 8+ weeks

Total: **4-6 months** for full implementation

---

**Document Version**: 1.0
**Last Updated**: November 2025
**Author**: System Analysis
**Review**: Pending
