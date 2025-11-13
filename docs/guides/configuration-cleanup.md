# Configuration Cleanup Guide

**Status:** 🚨 CRITICAL - Must fix before Phase 1 (Database)
**Estimated Time:** 1-2 weeks
**Last Updated:** 2025-11-13

---

## Problem Statement

The codebase has **50+ hardcoded values** that violate the "Zero Hardcoded Values" architectural principle established in CLAUDE.md. This creates:

- ❌ **Inconsistent behavior**: Different Gemini model versions across API routes
- ❌ **Difficult maintenance**: Changing timeouts requires hunting through multiple files
- ❌ **Testing complexity**: Hard to test with different configurations
- ❌ **Architectural debt**: Violates established design principles

---

## Scope of Work

### Files Affected (20+ files)
- `api/ai/chat.ts`
- `api/ai-tutor.ts`
- `api/ai-recommendations.ts`
- `api/pronunciation-score.ts`
- `api/premium-tts.ts`
- `api/audio/generate.ts`
- `api/voices.ts`
- `src/services/ai.ts`
- `src/services/tts.ts`
- `src/components/audio/AudioControls.tsx`
- `src/components/audio/VoiceSelector.tsx`
- `src/components/ai/AITutorChat.tsx`
- `src/components/ai/PronunciationScoring.tsx`
- `src/components/ai/AIRecommendations.tsx`
- `src/components/practice/WordCard.tsx`
- `src/ts/shared/Config.ts` (to extend)
- `src/ts/ui/UIController.ts`
- `src/ts/ui/AuthUI.ts`
- `src/ts/core/SettingsModule.ts`
- `vite.config.ts`

---

## Phase 0 Tasks

### Task 1: Extend Config.ts (2-3 days)

**Goal:** Add all missing configuration sections to `src/ts/shared/Config.ts`

**Add the following sections:**

```typescript
// src/ts/shared/Config.ts

export const defaultConfig = {
  // ... existing config ...

  // ========================================
  // AI Configuration (NEW)
  // ========================================
  ai: {
    gemini: {
      // Model versions
      defaultModel: 'gemini-2.5-flash',  // Primary model for all API routes
      fallbackModel: 'gemini-1.5-flash', // Fallback if primary unavailable

      // Request limits
      conversationHistoryLimit: 10,      // Max messages to include in context
      requestsPerDay: 1500,              // Free tier daily limit

      // Generation parameters
      maxTokens: 2048,                   // Max tokens in response
      temperature: 0.7,                  // Response creativity (0-1)
    },
  },

  // ========================================
  // API Endpoints (NEW)
  // ========================================
  api: {
    baseUrl: process.env.VITE_API_BASE_URL || '',
    endpoints: {
      // AI endpoints
      aiRecommendations: '/api/ai-recommendations',
      aiChat: '/api/ai/chat',
      aiTutor: '/api/ai-tutor',
      pronunciationScore: '/api/pronunciation-score',

      // TTS endpoints
      premiumTts: '/api/premium-tts',
      voices: '/api/voices',
      audioGenerate: '/api/audio/generate',
    },
  },

  // ========================================
  // Delays & Timeouts (NEW)
  // ========================================
  delays: {
    // Audio playback
    autoPlayBetweenWords: 500,         // ms delay between words in auto-play
    autoPlayRestartPause: 1000,        // ms pause before repeat mode restarts

    // Recording
    recordingTimeout: 10000,           // ms max recording duration

    // UI animations
    animationDuration: 500,            // ms for general animations
    notificationTimeout: 5000,         // ms before notification auto-dismisses
    modalHideDelay: 1500,              // ms before hiding modal
    onboardingDelay: 500,              // ms before showing onboarding
    quickQuestionDelay: 100,           // ms delay for quick question send

    // Initialization
    moduleInitTimeout: 5000,           // ms max time for module initialization
    exponentialBackoffBase: 1000,      // ms base for exponential backoff
  },

  // ========================================
  // Request Limits (NEW)
  // ========================================
  limits: {
    // AI context
    conversationHistory: 10,           // Max messages to include in AI context
    recommendations: 5,                // Max recommendations to return

    // Caching
    ttsCacheSize: 100,                 // Max cached TTS responses
    ttsCacheMaxAge: 3600000,           // 1 hour in ms
  },

  // ========================================
  // Voice & Language Settings (NEW)
  // ========================================
  voice: {
    // Default voice settings
    defaultVoiceId: 'Joanna',
    defaultEngine: 'neural',
    defaultLanguage: 'en-US',

    // AWS settings
    awsRegion: process.env.AWS_REGION || 'us-east-1',
  },

  // ========================================
  // Build Configuration (NEW)
  // ========================================
  build: {
    // Development
    devServerPort: 3001,
    previewServerPort: 3002,

    // Production
    chunkSizeWarningLimit: 1000,       // KB warning limit for chunks

    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // ... existing config continues ...
};

// ========================================
// Type Definitions (NEW)
// ========================================

interface AIConfig {
  gemini: {
    defaultModel: string;
    fallbackModel: string;
    conversationHistoryLimit: number;
    requestsPerDay: number;
    maxTokens: number;
    temperature: number;
  };
}

interface APIConfig {
  baseUrl: string;
  endpoints: {
    aiRecommendations: string;
    aiChat: string;
    aiTutor: string;
    pronunciationScore: string;
    premiumTts: string;
    voices: string;
    audioGenerate: string;
  };
}

interface DelaysConfig {
  autoPlayBetweenWords: number;
  autoPlayRestartPause: number;
  recordingTimeout: number;
  animationDuration: number;
  notificationTimeout: number;
  modalHideDelay: number;
  onboardingDelay: number;
  quickQuestionDelay: number;
  moduleInitTimeout: number;
  exponentialBackoffBase: number;
}

interface LimitsConfig {
  conversationHistory: number;
  recommendations: number;
  ttsCacheSize: number;
  ttsCacheMaxAge: number;
}

interface VoiceConfig {
  defaultVoiceId: string;
  defaultEngine: string;
  defaultLanguage: string;
  awsRegion: string;
}

interface BuildConfig {
  devServerPort: number;
  previewServerPort: number;
  chunkSizeWarningLimit: number;
  nodeEnv: string;
}

// Extend existing AppConfig type
export interface AppConfig {
  ai: AIConfig;
  api: APIConfig;
  delays: DelaysConfig;
  limits: LimitsConfig;
  voice: VoiceConfig;
  build: BuildConfig;
  // ... existing types ...
}
```

**Validation:**
```typescript
// Add validation function
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  // Validate AI config
  if (!config.ai.gemini.defaultModel) {
    errors.push('ai.gemini.defaultModel is required');
  }

  // Validate API endpoints
  Object.entries(config.api.endpoints).forEach(([key, value]) => {
    if (!value.startsWith('/')) {
      errors.push(`api.endpoints.${key} must start with /`);
    }
  });

  // Validate delays (must be positive numbers)
  Object.entries(config.delays).forEach(([key, value]) => {
    if (typeof value !== 'number' || value < 0) {
      errors.push(`delays.${key} must be a positive number`);
    }
  });

  return errors;
}
```

---

### Task 2: Refactor API Routes (2-3 days)

**Goal:** Update all API routes to use Config instead of hardcoded values

#### api/ai/chat.ts
```typescript
// Before (❌):
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
});
const lastN = messages.slice(-10);

// After (✅):
import { appConfig } from '../src/ts/shared/Config';

const response = await ai.models.generateContent({
  model: appConfig.get('ai.gemini.defaultModel'),
  contents: prompt,
});
const lastN = messages.slice(-appConfig.get('limits.conversationHistory'));
```

#### api/ai-tutor.ts
```typescript
// Before (❌):
model: 'gemini-1.5-flash',  // ← WRONG VERSION!
const lastN = messages.slice(-10);

// After (✅):
import { appConfig } from '../src/ts/shared/Config';

model: appConfig.get('ai.gemini.defaultModel'),  // ← Consistent now
const lastN = messages.slice(-appConfig.get('limits.conversationHistory'));
```

#### api/ai-recommendations.ts
```typescript
// Before (❌):
model: 'gemini-1.5-flash',
.slice(0, 5)

// After (✅):
import { appConfig } from '../src/ts/shared/Config';

model: appConfig.get('ai.gemini.defaultModel'),
.slice(0, appConfig.get('limits.recommendations'))
```

#### api/pronunciation-score.ts
```typescript
// Already uses gemini-2.5-flash, just centralize:

// Before (❌):
model: 'gemini-2.5-flash',

// After (✅):
import { appConfig } from '../src/ts/shared/Config';

model: appConfig.get('ai.gemini.defaultModel'),
```

#### api/premium-tts.ts
```typescript
// Before (❌):
const voiceId = body.voiceId || 'Joanna';
const engine = body.engine || 'neural';
const languageCode = body.languageCode || 'en-US';

// After (✅):
import { appConfig } from '../src/ts/shared/Config';

const voiceId = body.voiceId || appConfig.get('voice.defaultVoiceId');
const engine = body.engine || appConfig.get('voice.defaultEngine');
const languageCode = body.languageCode || appConfig.get('voice.defaultLanguage');
```

#### api/audio/generate.ts
```typescript
// Before (❌):
const region = process.env.AWS_REGION || 'us-east-1';

// After (✅):
import { appConfig } from '../src/ts/shared/Config';

const region = appConfig.get('voice.awsRegion');
```

---

### Task 3: Refactor Services Layer (2-3 days)

**Goal:** Update services to use Config for API endpoints

#### src/services/ai.ts
```typescript
// Before (❌):
const response = await fetch('/api/ai-recommendations', { ... });
const response = await fetch('/api/ai/chat', { ... });
const response = await fetch('/api/pronunciation-score', { ... });

// After (✅):
import { appConfig } from '../ts/shared/Config';

const response = await fetch(appConfig.get('api.endpoints.aiRecommendations'), { ... });
const response = await fetch(appConfig.get('api.endpoints.aiChat'), { ... });
const response = await fetch(appConfig.get('api.endpoints.pronunciationScore'), { ... });
```

#### src/services/tts.ts
```typescript
// Before (❌):
url: '/api/premium-tts',
voiceId: 'Joanna',
languageCode: 'en-US',
maxAge: 3600000,
maxSize: 100,

// After (✅):
import { appConfig } from '../ts/shared/Config';

url: appConfig.get('api.endpoints.premiumTts'),
voiceId: appConfig.get('voice.defaultVoiceId'),
languageCode: appConfig.get('voice.defaultLanguage'),
maxAge: appConfig.get('limits.ttsCacheMaxAge'),
maxSize: appConfig.get('limits.ttsCacheSize'),
```

---

### Task 4: Refactor Components (3-4 days)

**Goal:** Replace all magic numbers with named constants from Config

#### src/components/audio/AudioControls.tsx
```typescript
// Before (❌):
await new Promise(resolve => setTimeout(resolve, 500));
await new Promise(resolve => setTimeout(resolve, 1000));

// After (✅):
import { appConfig } from '../../ts/shared/Config';

await new Promise(resolve =>
  setTimeout(resolve, appConfig.get('delays.autoPlayBetweenWords'))
);
await new Promise(resolve =>
  setTimeout(resolve, appConfig.get('delays.autoPlayRestartPause'))
);
```

#### src/components/ai/PronunciationScoring.tsx
```typescript
// Before (❌):
continuous: false,
lang: 'en-US',
maxAlternatives: 1,
timeout: 10000,

// After (✅):
import { appConfig } from '../../ts/shared/Config';

continuous: false,
lang: appConfig.get('voice.defaultLanguage'),
maxAlternatives: 1,
timeout: appConfig.get('delays.recordingTimeout'),
```

#### src/components/ai/AITutorChat.tsx
```typescript
// Before (❌):
setTimeout(() => handleQuickQuestion(q.text), 100);
"You've hit the 1,500 requests/day limit"

// After (✅):
import { appConfig } from '../../ts/shared/Config';

setTimeout(() => handleQuickQuestion(q.text), appConfig.get('delays.quickQuestionDelay'));
`You've hit the ${appConfig.get('ai.gemini.requestsPerDay')} requests/day limit`
```

#### src/components/audio/VoiceSelector.tsx
```typescript
// Before (❌):
fetch('/api/voices')
fetch('/api/premium-tts')

// After (✅):
import { appConfig } from '../../ts/shared/Config';

fetch(appConfig.get('api.endpoints.voices'))
fetch(appConfig.get('api.endpoints.premiumTts'))
```

#### src/components/practice/WordCard.tsx
```typescript
// Before (❌):
fetch('/api/audio/generate')

// After (✅):
import { appConfig } from '../../ts/shared/Config';

fetch(appConfig.get('api.endpoints.audioGenerate'))
```

---

### Task 5: Refactor Build Configuration (1 day)

#### vite.config.ts
```typescript
// Before (❌):
chunkSizeWarningLimit: 1000,
port: 3001,
port: 3002,

// After (✅):
import { appConfig } from './src/ts/shared/Config';

chunkSizeWarningLimit: appConfig.get('build.chunkSizeWarningLimit'),
port: appConfig.get('build.devServerPort'),
port: appConfig.get('build.previewServerPort'),
```

---

### Task 6: Add Tests (2 days)

**Goal:** Ensure Config is valid and used correctly

```typescript
// tests/config.test.ts
import { appConfig, validateConfig } from '../src/ts/shared/Config';

describe('Config Validation', () => {
  it('has valid AI configuration', () => {
    expect(appConfig.get('ai.gemini.defaultModel')).toBe('gemini-2.5-flash');
    expect(appConfig.get('ai.gemini.conversationHistoryLimit')).toBeGreaterThan(0);
  });

  it('has valid API endpoints', () => {
    const endpoints = appConfig.get('api.endpoints');
    Object.values(endpoints).forEach(endpoint => {
      expect(endpoint).toMatch(/^\/api\//);
    });
  });

  it('has valid delays (positive numbers)', () => {
    const delays = appConfig.get('delays');
    Object.values(delays).forEach(delay => {
      expect(typeof delay).toBe('number');
      expect(delay).toBeGreaterThan(0);
    });
  });

  it('passes validation', () => {
    const errors = validateConfig(appConfig);
    expect(errors).toHaveLength(0);
  });
});

// tests/api-consistency.test.ts
describe('API Route Consistency', () => {
  it('all API routes use same Gemini model', async () => {
    // Mock tests to ensure consistent model usage
    const expectedModel = appConfig.get('ai.gemini.defaultModel');

    // Test each API route imports and uses Config correctly
    // (Implementation depends on your test setup)
  });
});
```

---

### Task 7: Update Documentation (1 day)

**Goal:** Document new Config sections in CLAUDE.md

```markdown
## Configuration (CLAUDE.md update)

### AI Configuration (src/ts/shared/Config.ts)
```typescript
ai: {
  gemini: {
    defaultModel: 'gemini-2.5-flash',  // Model version for all API routes
    conversationHistoryLimit: 10,      // Max messages in context
    requestsPerDay: 1500,              // Free tier limit
  }
}
```

**Usage:**
```typescript
import { appConfig } from './ts/shared/Config';

const model = appConfig.get('ai.gemini.defaultModel');
const limit = appConfig.get('limits.conversationHistory');
```

**Benefits:**
- ✅ Single source of truth for AI configuration
- ✅ Easy to upgrade Gemini versions (change one value)
- ✅ Testable with different configurations
- ✅ No magic numbers or hardcoded strings
```

---

## Validation Checklist

Before considering Phase 0 complete:

- [ ] Config.ts extended with all new sections (ai, api, delays, limits, voice, build)
- [ ] All 4 API routes use appConfig.get('ai.gemini.defaultModel')
- [ ] All API routes use same model version (no inconsistency)
- [ ] All services use appConfig.get('api.endpoints.*')
- [ ] All components use appConfig.get('delays.*') instead of magic numbers
- [ ] vite.config.ts uses appConfig for ports and limits
- [ ] validateConfig() function added and tested
- [ ] All tests pass
- [ ] CLAUDE.md updated with new Config sections
- [ ] No hardcoded values remain in critical paths
- [ ] Pre-commit hooks pass

---

## Success Metrics

**Before Phase 0:**
- 50+ hardcoded values
- 2 different Gemini model versions
- Magic numbers everywhere
- Hard to test/change configuration

**After Phase 0:**
- 0 hardcoded critical values
- 1 consistent Gemini model version
- All magic numbers replaced with named constants
- Easy to test with different configs
- Single source of truth (Config.ts)

---

## Timeline

| Task | Days | Dependencies |
|------|------|--------------|
| Extend Config.ts | 2-3 | None |
| Refactor API routes | 2-3 | Task 1 complete |
| Refactor services | 2-3 | Task 1 complete |
| Refactor components | 3-4 | Task 1 complete |
| Refactor build config | 1 | Task 1 complete |
| Add tests | 2 | Tasks 1-5 complete |
| Update docs | 1 | All tasks complete |
| **Total** | **13-17 days** | **(2-3 weeks)** |

---

## Migration Notes

### Breaking Changes
- None - this is purely internal refactoring
- User-facing functionality unchanged
- API contracts unchanged

### Rollback Plan
If issues arise:
1. Git revert to previous commit
2. All changes in feature branch (safe)
3. No database migrations involved yet

### Testing Strategy
1. **Unit tests**: Config validation
2. **Integration tests**: API routes use correct config
3. **E2E tests**: End-to-end flows still work
4. **Manual testing**: Test all major features

---

## References

- CLAUDE.md: "Zero Hardcoded Values" principle (line 10-14)
- src/ts/shared/Config.ts: Existing config pattern
- docs/architecture/AI-POWERED-PTE-SYSTEM.md: Section 9 (Configuration Centralization)

---

**Once Phase 0 is complete, you'll have a clean foundation for Phase 1 (Database implementation).** 🚀
