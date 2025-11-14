# Quick Reference - PTE Pronunciation Trainer Audit

## Production Readiness: ❌ NOT READY (5/10)

### 🔴 CRITICAL ISSUES (Must Fix Before Production)

1. **RS/ASQ/WFD Interfaces Missing SessionManager Integration**
   - Files: `/src/components/practice/{RS|ASQ|WFD}Interface.tsx`
   - Impact: Practice attempts not saved to database
   - Fix Time: ~2-3 hours
   - Status: HIGH PRIORITY

2. **RSInterface Has RANDOM Feedback, Not AI Scoring**
   - File: `/src/components/practice/RSInterface.tsx` line 151-157
   - Problem: `score: 70 + Math.floor(Math.random() * 20)` 
   - Impact: Users misled into thinking they're getting real AI scoring
   - Fix Time: ~1 hour
   - Status: CRITICAL - Trust Issue

3. **AITutorChat Never Uses Phase 2 Enhanced Context**
   - File: `/src/components/ai/AITutorChat.tsx` line 141
   - Missing: taskType, userId, sessionId, useEnhancedContext
   - Impact: Rich context infrastructure not being used
   - Fix Time: ~30 mins
   - Status: HIGH - Lost Feature

### ⚠️ HIGH PRIORITY (Affects User Experience)

4. **Response Rating Service Not Integrated**
   - Built: `/src/services/ai/ratingService.ts`
   - Used: Nowhere ❌
   - Impact: No user feedback loop for AI improvement
   - Fix Time: ~1 hour
   - Status: HIGH

5. **Weak Area Detection Not Used During Practice**
   - Built: `/src/services/ai/weakAreaDetector.ts`
   - Used: WeakAreasDashboard only ❌
   - Impact: Adaptive learning not possible
   - Fix Time: ~1 hour
   - Status: MEDIUM

6. **Voice Configuration Duplicated in 3 Files**
   - Files: `api/premium-tts.ts`, `api/voices.ts`, `api/audio/generate.ts`
   - Impact: Maintenance burden, inconsistency risk
   - Fix Time: ~30 mins
   - Status: MEDIUM

7. **Gemini API Key Initialization Inconsistent**
   - `/api/ai/chat.ts` checks 3 env var names
   - Other APIs use centralized getter
   - Fix Time: ~15 mins
   - Status: MEDIUM

### 📋 MEDIUM PRIORITY (Code Quality)

8. **TTS Cache Infrastructure Unused**
   - Built: `/src/services/tts.ts` TTSCache class
   - Used: Nowhere ❌
   - Fix Time: ~30 mins
   - Status: LOWER

9. **getPronunciationTips() Stubbed Out**
   - `/src/services/ai.ts` line 142-150
   - Returns error: "not yet implemented"
   - Fix Time: ~1 hour
   - Status: LOWER

10. **App.tsx Doesn't Pass sessionManager to Practice Components**
    - Line 436-452: RS/ASQ/WFD rendered without prop
    - Line 462: Only WordCard gets it
    - Fix Time: ~5 mins
    - Status: QUICK FIX

---

## File-by-File Status

### ✅ GOOD (No Changes Needed)
- `api/pronunciation-score.ts` - Consistent, good patterns
- `api/ai-recommendations.ts` - Well structured
- `src/services/session/sessionManager.ts` - Excellent implementation
- `src/components/practice/WordCard.tsx` - Correct session integration pattern
- `src/components/ai/PronunciationScoring.tsx` - Good pattern
- `src/components/ai/WeakAreasDashboard.tsx` - Good integrations

### ⚠️ NEEDS FIXES (Medium/Low Priority)
- `api/config.ts` - Add voice list, centralize config
- `api/audio/generate.ts` - Remove duplicate voice list
- `api/premium-tts.ts` - Import voices from config
- `api/voices.ts` - Import voices from config
- `api/ai/chat.ts` - Standardize API key initialization
- `src/services/ai.ts` - Implement getPronunciationTips
- `src/services/tts.ts` - Integrate caching
- `src/components/ai/AITutorChat.tsx` - Enable Phase 2 context
- `src/App.tsx` - Pass sessionManager to practice components

### ❌ BROKEN (Critical - Must Fix)
- `src/components/practice/RSInterface.tsx` - Remove mock, add real AI
- `src/components/practice/ASQInterface.tsx` - Add session tracking
- `src/components/practice/WFDInterface.tsx` - Add session tracking

---

## Integration Matrix

### What SHOULD Work But Doesn't

| Feature | Built | UI | API | Services | DB Save | Status |
|---------|-------|----|----|----------|---------|--------|
| RS Recording + AI Scoring | ✅ | ✅ (mock) | ✅ | ❌ | ❌ | ❌ BROKEN |
| ASQ Answer + Tracking | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ BROKEN |
| WFD Transcription + Tracking | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ BROKEN |
| AI Tutor + Context | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Phase 1 Only |
| Response Ratings | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ NO UI |
| Weak Area Detection | ✅ | ✅ (dashboard) | ✅ | ✅ | ✅ | ⚠️ Dashboard Only |
| Recommendations | ✅ | ✅ (dashboard) | ✅ | ✅ | ✅ | ⚠️ Dashboard Only |

---

## Required PRs

### PR #1: Critical Session Integration (MUST MERGE FIRST)
Files to change:
- `src/App.tsx` - Add sessionManager props
- `src/components/practice/RSInterface.tsx` - Import, call recordItem
- `src/components/practice/ASQInterface.tsx` - Import, call recordItem
- `src/components/practice/WFDInterface.tsx` - Import, call recordItem

### PR #2: AI Scoring in RS
Files to change:
- `src/components/practice/RSInterface.tsx` - Use getPronunciationScore
- Add speech-to-text transcription integration

### PR #3: API Consistency
Files to change:
- `api/config.ts` - Add voice list, API key getters
- `api/ai/chat.ts` - Use config.getGeminiApiKey()
- `api/audio/generate.ts` - Import voices from config
- `api/premium-tts.ts` - Import voices from config
- `api/voices.ts` - Import voices from config

### PR #4: Phase 2 Enhanced Context
Files to change:
- `src/components/ai/AITutorChat.tsx` - Pass enhanced context params

### PR #5: Response Ratings UI
Files to change:
- `src/components/ai/AITutorChat.tsx` - Add rating buttons
- `src/services/ai.ts` - Import ratingService

### PR #6: Weak Area Integration
Files to change:
- `src/App.tsx` - Call detectWeakAreas after session
- `src/services/session/sessionManager.ts` - Call on complete

---

## Testing Checklist

### Manual Tests Required Before Production

**Session Persistence**
- [ ] RS: Record, complete session, check Supabase
- [ ] ASQ: Submit answer, check Supabase
- [ ] WFD: Submit transcript, check Supabase
- [ ] Offline: Do session offline, verify sync when online

**AI Scoring**
- [ ] RS: Recording score is NOT random (check 5+ recordings)
- [ ] RS: Score matches actual pronunciation quality
- [ ] Pronunciation Score API returns real data

**AI Tutor**
- [ ] Tutor uses task-specific persona (compare RS vs ASQ vs WFD)
- [ ] Context includes learner profile info
- [ ] Response quality differs with useEnhancedContext=true

**Weak Areas**
- [ ] After session, weak areas detected
- [ ] Weak area page shows detected patterns
- [ ] Recommendations based on weak areas

**Rating System**
- [ ] Rate button appears in tutor chat
- [ ] Rating saved to database
- [ ] Stats tracked correctly

---

## Environment Variables to Check

```bash
# Must be set for AI features
GEMINI_API_KEY or VITE_GEMINI_API_KEY or GEMINI_API

# Must be set for TTS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION (optional, defaults to us-east-1)

# Must be set for database
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_ANON_KEY
```

---

## Code Examples - Quick Fixes

### Fix #1: Pass sessionManager to RSInterface (5 mins)
```typescript
// src/App.tsx around line 436
<RSInterface 
  item={currentItem}
  sessionManager={sessionManager}  // ADD THIS
  onNext={handleNext}
/>
```

### Fix #2: Import and use sessionManager (10 mins)
```typescript
// src/components/practice/RSInterface.tsx
interface RSInterfaceProps {
  item: PracticeItem;
  sessionManager?: SessionManager;  // ADD THIS
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
}

// In processRecording function:
if (sessionManager) {
  await sessionManager.recordItem({
    item_id: `rs-${item.id}`,
    item_type: 'sentence',
    item_text: sentence,
    user_response: transcribedText,
    score: feedback.score,
    is_correct: feedback.score >= 70,
    time_spent_sec: recordingTime,
  });
}
```

### Fix #3: Use real AI scoring (20 mins)
```typescript
// src/components/practice/RSInterface.tsx
import { getPronunciationScore } from '../../services/ai';

// Replace mock feedback:
const scoring = await getPronunciationScore(
  sentence, 
  transcribedText, 
  difficulty
);

const mockFeedback: FeedbackData = {
  score: scoring.score,
  correct: extractWords(sentence, transcribedText),
  missed: getMissedWords(sentence, transcribedText),
  tips: scoring.improvements
};
```

### Fix #4: Centralize voice list (30 mins)
```typescript
// api/config.ts - ADD:
export const PREMIUM_VOICES = {
  'en-US': { 'Joanna': '...', 'Matthew': '...', ... },
  'en-GB': { 'Amy': '...', 'Emma': '...', ... },
  'en-AU': { 'Olivia': '...', ... },
} as const;

// api/audio/generate.ts - CHANGE:
// ❌ Remove lines 95-112
// ✅ Add: import { PREMIUM_VOICES } from './config';

// api/premium-tts.ts - CHANGE:
// ❌ Remove lines 44-61
// ✅ Add: import { PREMIUM_VOICES } from '../config';
```

### Fix #5: Enable Phase 2 Context (15 mins)
```typescript
// src/components/ai/AITutorChat.tsx
const result = await askAITutor(input.trim(), {
  context: { word, difficulty, ipa },
  // ADD THESE:
  userId: user?.id,
  taskType: 'vocabulary',  // or detect from context
  sessionId: currentSessionId,
  useEnhancedContext: true,
});
```

---

## Estimated Fix Timeline

| Priority | Items | Est. Time | Impact |
|----------|-------|-----------|--------|
| CRITICAL | RS/ASQ/WFD SessionManager | 4-5 hours | BLOCKS PRODUCTION |
| CRITICAL | RS Real AI Scoring | 2-3 hours | BLOCKS PRODUCTION |
| HIGH | API Consistency | 2-3 hours | Quality |
| HIGH | Phase 2 Context | 1 hour | UX |
| HIGH | Response Ratings | 1 hour | Feature |
| MEDIUM | Weak Areas Integration | 1-2 hours | Feature |
| MEDIUM | Voice Config | 1 hour | Maintenance |
| LOW | TTS Cache | 1 hour | Performance |

**TOTAL: 13-17 hours to production-ready**

---

## How to Use This Audit

1. **Start with CRITICAL items** - Must fix before launch
2. **Read AUDIT_COMPREHENSIVE.md** - Full context and analysis
3. **Check AUDIT_CODE_SPECIFIC.md** - Line-by-line guidance
4. **Follow PR order** - Session first, then AI scoring, then API consistency
5. **Use code examples** - Copy-paste starting points provided

---

## Contact Points

- Session Integration: SessionManager class
- AI Services: /src/services/ai.ts and /src/services/ai/*.ts
- API Endpoints: /api/*.ts files
- Components: /src/components/practice/*.tsx and /src/components/ai/*.tsx
- Database: Supabase tables (practice_sessions, session_items, etc.)

Generated: 2025-11-14
