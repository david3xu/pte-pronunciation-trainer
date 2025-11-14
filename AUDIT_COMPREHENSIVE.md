# PTE Pronunciation Trainer - Comprehensive Audit Report

## Executive Summary
The application has a partially integrated architecture with:
- ✅ **Consistent API Design**: All endpoints use Gemini SDK with proper error handling
- ⚠️ **Incomplete Feature Parity**: Practice components lack AI/session integration
- ❌ **Fragmented Service Integration**: Not all services are being used consistently
- ✅ **Strong Foundation**: Core services (SessionManager, AI Tutor) are well-architected
- ⚠️ **Critical Gap**: Practice modes (RS/ASQ/WFD) don't track sessions or provide AI scoring

---

## 1. API ENDPOINTS CONSISTENCY

### ✅ What's Working Well

All 7 API endpoints follow consistent patterns:

**Endpoints:**
1. `/api/ai-recommendations` - Gemini-powered recommendations
2. `/api/ai/chat` - AI Tutor with persona-based responses
3. `/api/pronunciation-score` - AI pronunciation analysis
4. `/api/audio/generate` - AWS Polly audio synthesis
5. `/api/premium-tts` - Premium TTS endpoint
6. `/api/voices` - Voice list endpoint
7. `/api/config` - Configuration (local only)

**Consistency Strengths:**
- ✅ **Unified SDK**: All AI endpoints use `@google/genai` (Gemini)
- ✅ **Centralized Config**: Uses `api/config.ts` for constants
- ✅ **Error Handling Pattern**: Try-catch blocks with fallback responses
- ✅ **Request Validation**: All endpoints validate input before processing
- ✅ **Environment Variable Access**: Consistent use of getters (getGeminiApiKey, getAWSCredentials, getSupabaseConfig)
- ✅ **Response Structure**: Standard format with `{ success, data, error, warning }`
- ✅ **Method Validation**: All POST endpoints validate HTTP method
- ✅ **Mock Fallbacks**: All endpoints provide sensible mock responses when APIs unavailable

### ⚠️ Issues Found

1. **Inconsistent API Key Environment Variable Names**
   - `pronunciation-score.ts`: Uses `getGeminiApiKey()` 
   - `ai/chat.ts`: Uses `process.env.GEMINI_API || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY`
   - **Impact**: Different code paths can cause configuration confusion
   - **Severity**: Medium
   - **Fix**: Standardize through config.ts getter function

2. **Missing Error Context in Some Endpoints**
   - `/api/voices` has minimal error details compared to other endpoints
   - **Impact**: Harder to debug voice list failures
   - **Severity**: Low

3. **AWS Polly Configuration Duplication**
   - Voice list hardcoded in 3 places: `premium-tts.ts`, `voices.ts`, `audio/generate.ts`
   - **Impact**: Maintenance burden, inconsistency risks
   - **Severity**: Medium
   - **Fix**: Move to config.ts

### 📝 Missing Endpoints

- **Missing**: `/api/ai-tutor` (config declares it but no actual endpoint file)
- **Expected**: Session persistence endpoint for Phase 2
- **Expected**: Weak area analysis endpoint
- **Expected**: Intervention recommendation endpoint

---

## 2. PRACTICE COMPONENTS FEATURE PARITY

### Component Matrix

| Feature | RSInterface | ASQInterface | WFDInterface | WordCard |
|---------|------------|-------------|------------|----------|
| Audio Playback | ✅ | ✅ | ✅ | ✅ |
| User Input/Recording | ✅ (recording) | ✅ (text) | ✅ (text) | ❌ |
| AI Pronunciation Scoring | ❌ Mock | ❌ | ❌ | ❌ |
| Session Tracking | ❌ | ❌ | ❌ | ✅ |
| Progress Tracking | ❌ | ❌ | ❌ | ✅ |
| Navigation Controls | ✅ | ✅ | ✅ | ✅ |
| Feedback Display | ✅ (mock) | ✅ (basic) | ✅ (word compare) | ✅ |
| Recording Functionality | ✅ (RS only) | ❌ | ❌ | ❌ |
| AI Tips/Guidance | ❌ | ❌ | ❌ | ❌ |

### ❌ Critical Gaps

#### 1. **RSInterface, ASQInterface, WFDInterface Don't Use SessionManager**
**Location**: `/src/components/practice/` - RS/ASQ/WFD files
**Issue**: None of these components import or use sessionManager despite App.tsx providing it
**Impact**: 
- No session tracking for these practice modes
- No database persistence of attempts
- Lost data on browser refresh
- **Severity**: CRITICAL

**Evidence**:
```typescript
// RSInterface.tsx - Only imports:
import { ttsEngine } from '../../ts/audio/TTSEngine';
// NO: sessionManager, SessionManager, recordItem

// vs WordCard.tsx correctly imports:
import type { SessionManager } from '../../services/session/sessionManager';
```

**Example Fix Needed**:
```typescript
// Current RSInterface - feedback is NOT saved
const processRecording = () => {
  const mockFeedback: FeedbackData = { ... };
  setFeedback(mockFeedback);
  // ❌ Never calls sessionManager.recordItem()
};

// Should be:
if (sessionManager) {
  await sessionManager.recordItem({
    item_id: item.id,
    item_type: 'sentence',
    item_text: sentence,
    user_response: transcribedText,
    score: feedback.score,
    is_correct: feedback.score >= 70,
    time_spent_sec: recordingTime,
  });
}
```

#### 2. **RSInterface Has Mock AI Scoring, But Never Calls Actual API**
**Location**: `/src/components/practice/RSInterface.tsx` line 143-173
**Issue**:
```typescript
// Simulated feedback (line 151-165)
const mockFeedback: FeedbackData = {
  score: 70 + Math.floor(Math.random() * 20),  // Random score!
  correct: simulatedCorrect,
  missed: simulatedMissed,
  tips: ['Focus on linking words...']
};
setFeedback(mockFeedback);
```

**Impact**: 
- Users think they're getting AI feedback but it's random
- No pronunciation analysis actually happening
- Comments say "In production, this would:" but never implements it
- **Severity**: CRITICAL

#### 3. **No AI Tips/Guidance in Practice Components**
**Location**: All practice interfaces
**Issue**: Despite docstrings claiming "AI-powered scoring and tips", no actual AI integration:
```typescript
// RSInterface line 9-10
* - AI-powered scoring and tips  // ❌ Not actually implemented
* - Real-time feedback display    // ✅ Yes, but with mock data
```

**Impact**: Users get generic feedback instead of personalized guidance

#### 4. **Recording Data Never Leaves LocalMemory**
**Location**: RSInterface lines 100-135
**Issue**: Recording is processed locally but never:
- Transcribed (no speech-to-text API call)
- Scored (no getPronunciationScore call)
- Saved to database (no sessionManager.recordItem call)

### ⚠️ Minor Inconsistencies

1. **Different Text Extraction Patterns**
   ```typescript
   // RSInterface line 59-60
   const sentence = (item as any).content?.sentence || (item as any).sentence || '';
   
   // ASQInterface line 60-61
   const question = (item as any).content?.question || (item as any).question || '';
   
   // WFDInterface line 60
   const sentence = (item as any).content?.sentence || (item as any).sentence || '';
   ```
   Should use a shared utility function.

2. **Feedback Data Types Not Standardized**
   - RSInterface: `{ score, correct[], missed[], tips[] }`
   - ASQInterface: `{ isCorrect, userAnswer, correctAnswer, tips }`
   - WFDInterface: `{ accuracy, correctWords[], missedWords[], extraWords[] }`

3. **No Difficulty-Based Customization**
   All interfaces extract difficulty but never use it for:
   - Adjusting feedback tone
   - Recommending follow-up items
   - Triggering interventions

---

## 3. SERVICES LAYER CONSISTENCY

### Services Audit

| Service | Location | Used In | Integration Status |
|---------|----------|---------|-------------------|
| ai.ts | `/src/services/ai.ts` | AITutorChat, PronunciationScoring | ✅ Partial |
| sessionManager.ts | `/src/services/session/sessionManager.ts` | WordCard, App.tsx | ✅ Partial |
| tts.ts | `/src/services/tts.ts` | WordCard (unused API) | ⚠️ Incomplete |
| learnerProfileService.ts | `/src/services/profile/` | App.tsx | ✅ Basic |
| ratingService.ts | `/src/services/ai/ratingService.ts` | ❌ Nowhere | ❌ Unused |
| recommendationEngine.ts | `/src/services/ai/recommendationEngine.ts` | WeakAreasDashboard only | ⚠️ Partial |
| weakAreaDetector.ts | `/src/services/ai/weakAreaDetector.ts` | WeakAreasDashboard only | ⚠️ Partial |
| interventionEngine.ts | `/src/services/ai/interventionEngine.ts` | App.tsx | ⚠️ Basic |
| migrationService.ts | `/src/services/migration/` | App.tsx, DataMigrationModal | ✅ Basic |
| supabaseClient.ts | `/src/services/supabase/client.ts` | Most services | ✅ Good |

### ❌ Critical Unused Services

#### 1. **ratingService.ts - NOT INTEGRATED ANYWHERE**
**Location**: `/src/services/ai/ratingService.ts`
**Exports**: `rateAIResponse()`, `getUserRatingStats()`
**Usage**: `grep -r "ratingService" /src/components/` → **No matches**
**Impact**: 
- Users can't rate AI tutor responses
- No feedback loop for model improvement
- **Severity**: HIGH

**Fix**: Add rating buttons to AITutorChat:
```typescript
// AITutorChat.tsx should have:
import { rateAITutor } from '../../services/ai/ratingService';

<Button onClick={() => rateAITutor(response, 'helpful', userId)}>
  👍 Helpful
</Button>
```

#### 2. **getPronunciationTips() - Stubbed Out**
**Location**: `/src/services/ai.ts` lines 142-150
**Status**: 
```typescript
export async function getPronunciationTips(_word: string, _userAttempt?: string) {
  // TODO: Implement pronunciation tips endpoint
  return { success: false, error: 'Pronunciation tips not yet implemented' };
}
```
**Impact**: Feature advertised but not available
**Fix**: Connect to `/api/pronunciation-score` or new tips endpoint

#### 3. **TTSCache - Initialized But Unused**
**Location**: `/src/services/tts.ts` lines 109-191
**Exports**: `ttsCache` singleton instance
**Usage**: Not referenced anywhere in codebase
**Issue**: Cache infrastructure exists but WordCard doesn't use it
**Fix**: WordCard should cache premium TTS responses

### ⚠️ Partially Integrated Services

#### 1. **SessionManager Integration Issues**
**Used In**:
- `WordCard` ✅ (correctly)
- `App.tsx` ✅ (creates instance, starts session)
- RS/ASQ/WFD ❌ (available but not used)

**Problem**: Session is created at app-level but practice components don't record items

#### 2. **Recommendation/Weak Area Engines Only in Dashboard**
**Location**: `/src/services/ai/recommendationEngine.ts`, `weakAreaDetector.ts`
**Used Only In**: `WeakAreasDashboard.tsx`
**Missing**: Integration into practice flow
**Impact**: 
- Recommendations only visible in dedicated modal
- Not incorporated during practice to guide learning
- No adaptive difficulty adjustment

#### 3. **Migration Service - Minimal**
**Location**: `/src/services/migration/migrationService.ts`
**Status**: Very basic, only checks for data
**Missing**: 
- Actual data migration logic
- Error recovery
- Progress tracking

---

## 4. DATABASE/PHASE 2 INTEGRATION

### ✅ Implemented

- ✅ SessionManager persists to Supabase
- ✅ Offline-first architecture with localStorage fallback
- ✅ Auto-save with batching (2-minute intervals, 10-item batches)
- ✅ LearnerProfile modal with onboarding
- ✅ Response ratings framework (ratingService.ts)

### ❌ Not Implemented

#### 1. **Session Tracking for Practice Modes**
- **Expected**: RS/ASQ/WFD attempts saved to practice_sessions table
- **Actual**: No recordItem calls, data lost
- **Severity**: CRITICAL

#### 2. **Response Ratings UI Not Connected**
- **Ratings saved to DB**: ✅ (ratingService.ts)
- **UI component to rate**: ❌ Missing from AITutorChat
- **Severity**: HIGH

#### 3. **Weak Areas Not Calculated During Practice**
- **Database schema exists**: ✅ (weak_areas table)
- **Detection logic exists**: ✅ (weakAreaDetector.ts)
- **Used during practice**: ❌ No integration
- **Severity**: MEDIUM

#### 4. **No Session Metrics Aggregation**
- **Practice session metric fields exist**: items_attempted, items_correct, accuracy, duration_sec ✅
- **Calculated when session completes**: ✅ (sessionManager.ts lines 206-214)
- **Never updated during practice**: ❌ (progress bars are local state only)
- **Severity**: MEDIUM

### Database Schema vs. Implementation Gap

**What's Defined in Database**:
- `practice_sessions` (sessions table)
- `session_items` (individual items)
- `learner_profiles` (user profiles)
- `ai_conversations` (chat history)
- `weak_areas` (problem detection)
- `recommendations` (learning guidance)

**What's Actually Being Saved**:
- `practice_sessions` ✅ (App.tsx starts session, sessionManager saves)
- `session_items` ✅ (WordCard.recordItem calls it)
- `learner_profiles` ⚠️ (Created during onboarding, not updated)
- `ai_conversations` ✅ (AI Chat saves conversations)
- `weak_areas` ❌ (Calculated but not used)
- `recommendations` ❌ (Generated but shown only in dashboard)

---

## 5. STATE MANAGEMENT CONSISTENCY

### ✅ Store Integration

**App.tsx** uses Zustand correctly:
```typescript
const { vocabulary, settings, audio, auth, tts } = useAppStore();
// Proper selector pattern for re-renders
const currentItem = useAppStore((state) => state.vocabulary.currentItem);
```

**Components** mostly follow pattern:
- `WordCard.tsx` ✅ uses `useAppStore()`
- `PronunciationScoring.tsx` ✅ uses `useAppStore()` for current item

### ⚠️ Legacy Event Bus Still Present

**Location**: `/src/ts/shared/Config.ts` (from legacy code)
**Status**: Configuration file references but:
- ❌ EventBus no longer used in React components
- ✅ Zustand store replaced it
- ⚠️ Config still has event definitions (may be dead code)

### 📝 State Management Notes

1. **No Global Session State**
   - SessionManager is a class instance (singleton)
   - Not exposed through Zustand
   - **Impact**: Components can't easily access session metrics for UI updates

2. **Progress State is Local Only**
   - Recording progress in RS/ASQ/WFD is component state
   - Not synced to global store
   - Not persisted to database

3. **No Real-Time Sync**
   - SessionManager saves on interval (2 mins)
   - No pub/sub for immediate updates
   - UI doesn't update when background saves occur

---

## 6. AI FEATURES CONSISTENCY

### ✅ Consistent Patterns

**API Request/Response**:
```typescript
// All AI endpoints follow this pattern:
try {
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',  // Consistent model choice
    contents: prompt,
    config: { maxOutputTokens, temperature, topP, topK }
  });
  return { success: true, data: parsedResponse };
} catch (error) {
  return { success: true, data: mockResponse };  // Graceful fallback
}
```

**Client-Side AI Calls**:
- All use `/src/services/ai.ts` wrapper functions
- Consistent error handling
- Mock fallbacks when API unavailable

### ⚠️ Persona Inconsistencies

**In API Endpoint** (`api/ai/chat.ts` lines 255-448):
- 8 task-specific personas (rs, asq, wfd, ra, vocabulary, di, rl, fib_r, fib_l)
- Detailed personality, expertise, focus areas, pro tips
- Rich structured guidance

**In Components**:
- AITutorChat doesn't pass taskType
- No persona selection in UI
- Users get generic responses (Phase 1 system prompt)

**Fix**: AITutorChat should:
```typescript
// Should include task type:
await askAITutor(question, {
  taskType: 'rs',  // Task context
  userId,
  sessionId,
  useEnhancedContext: true,  // Enable Phase 2 enhanced persona
});
```

### ❌ Context Issues

**Phase 2 Enhanced Context** (api/chat.ts lines 155-249):
- Fetches learner profile ✅
- Fetches current session ✅
- Fetches recent errors ✅
- Builds rich context string ✅

**But Only If** (`line 610`):
```typescript
if (useEnhancedContext && taskType && userId) {
  // Fetch and use enhanced context
} else {
  // Fall back to Phase 1 (generic)
}
```

**Problem**: 
- AITutorChat never passes `useEnhancedContext: true`
- Users always get Phase 1 generic responses
- Rich context infrastructure not used

---

## 7. CONSISTENCY FINDINGS SUMMARY

### API Level
| Item | Status | Notes |
|------|--------|-------|
| SDK Consistency | ✅ Good | All use @google/genai |
| Error Handling | ⚠️ Mostly Good | Some env var name variations |
| Response Format | ✅ Consistent | { success, data, error } everywhere |
| Mock Fallbacks | ✅ Good | All endpoints have sensible defaults |
| Config Centralization | ⚠️ Partial | API config good, but AWS voice list duplicated |

### Component Level
| Item | Status | Notes |
|------|--------|-------|
| Practice Mode Parity | ❌ Poor | RS/ASQ/WFD missing SessionManager & AI scoring |
| Feedback Display | ⚠️ Mixed | WordCard good, others use mock data |
| Session Tracking | ⚠️ Partial | Only WordCard + vocabulary mode tracked |
| Navigation | ✅ Good | All have consistent next/prev |
| Input Handling | ⚠️ Inconsistent | Different patterns for recording vs text |

### Service Level
| Item | Status | Notes |
|------|--------|-------|
| AI Services | ⚠️ Partial | Good structure, poor integration |
| Session Manager | ⚠️ Partial | Implemented well but not used everywhere |
| TTS Services | ⚠️ Incomplete | APIs exist but cache not used |
| Rating Service | ❌ Unused | Built but no UI integration |
| Weak Area Detection | ⚠️ Unused | Only in dashboard, not during practice |

### Database Level
| Item | Status | Notes |
|------|--------|-------|
| Schema | ✅ Comprehensive | Good design for Phase 2 |
| Persistence | ⚠️ Partial | Only vocabulary & chat saved |
| Offline Support | ✅ Good | LocalStorage + IndexedDB queue |
| Real-Time Sync | ❌ No | No pub/sub for immediate updates |

---

## CRITICAL RECOMMENDATIONS

### Priority 1 (MUST FIX - Blocking Production)

1. **Connect RS/ASQ/WFD to SessionManager**
   ```typescript
   // In each interface:
   - Import sessionManager as prop from App.tsx
   - Call sessionManager.recordItem() after user completes item
   - Save score, transcript, time spent
   - Estimated effort: 2-3 hours per component
   ```

2. **Remove Mock Data from RS**
   ```typescript
   // RSInterface.tsx line 151-157
   // ❌ Replace random mock feedback with:
   // ✅ Call getPronunciationScore API
   // ✅ Call sessionManager.recordItem with real score
   ```

3. **Enable Phase 2 Enhanced Context in AITutorChat**
   ```typescript
   // AITutorChat.tsx
   const result = await askAITutor(input, {
     taskType: getCurrentTaskType(),      // Add this
     userId: user?.id,                     // Add this
     sessionId: currentSessionId,          // Add this
     useEnhancedContext: true,             // Add this
   });
   ```

### Priority 2 (HIGH - Affects User Experience)

4. **Integrate Response Rating UI**
   - Add thumbs up/down buttons to AITutorChat
   - Call ratingService.rateAIResponse()

5. **Use Real Weak Area Detection During Practice**
   - Pass errors to detectWeakAreas after sessions
   - Show weak area alerts in practice interface

6. **Centralize Voice Configuration**
   - Move PREMIUM_VOICES from 3 files to config.ts
   - Reference single source of truth

### Priority 3 (MEDIUM - Nice to Have)

7. **Implement getPronunciationTips()**
   - Connect to Gemini for word-specific tips
   - Call after pronunciation scoring

8. **Use TTSCache in WordCard**
   - Avoid duplicate API calls for same word

9. **Add Weak Area Indicators to Word Card**
   - Show if word is in user's weak areas
   - Adjust difficulty recommendations accordingly

10. **Real-Time Session Metrics**
    - Update progress bars as items complete
    - Expose session stats through Zustand

---

## TESTING RECOMMENDATIONS

### Unit Tests Needed
- [ ] SessionManager.recordItem with various item types
- [ ] Error handling in each API endpoint
- [ ] Voice list consistency across files
- [ ] Weak area detection algorithm

### Integration Tests Needed
- [ ] RS interface → SessionManager → Supabase flow
- [ ] ASQ interface → AI scoring flow
- [ ] WFD interface → session tracking flow
- [ ] Offline → Online sync flow

### Manual Testing Checklist
- [ ] Complete RS session and verify data saved to DB
- [ ] Verify pronunciation score is real (not mocked)
- [ ] Verify weak areas detected and shown
- [ ] Verify recommendations generated from weak areas
- [ ] Verify AI tutor uses task-specific persona
- [ ] Verify offline mode works and data syncs when online
- [ ] Verify profile onboarding saves to DB

---

## PRODUCTION READINESS SCORE

**Current Score: 5/10**

| Category | Score | Status |
|----------|-------|--------|
| API Consistency | 8/10 | ✅ Good, minor issues |
| Component Parity | 3/10 | ❌ Critical gaps |
| Service Integration | 4/10 | ❌ Many unused services |
| Database Integration | 5/10 | ⚠️ Partial implementation |
| Error Handling | 7/10 | ⚠️ Good in APIs, gaps in components |
| User Experience | 4/10 | ❌ Mock data misleading |
| Offline Support | 7/10 | ✅ Good architecture |
| Code Consistency | 6/10 | ⚠️ Mixed patterns |

**Verdict**: NOT PRODUCTION READY without Priority 1 fixes.

The app has excellent foundational architecture but critical gaps in practice mode integration. The discrepancy between "AI-powered" claims and actual mock data is a trust issue.
