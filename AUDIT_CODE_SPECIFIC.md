# Code-Specific Audit Details

## File-by-File Analysis

### API ENDPOINTS

#### `/api/config.ts` ✅ Good
- Centralized configuration
- Exports AI_CONFIG, API_ENDPOINTS, DELAYS, LIMITS, VOICE_CONFIG
- **Recommendation**: Add AWS voice list and environment variable getters for consistency

#### `/api/pronunciation-score.ts` ✅ Good with Issues
- **Line 61**: Uses `getGeminiApiKey()` from config
- **Line 71**: Initializes `GoogleGenAI({ apiKey })`
- **Line 106-115**: Proper config usage
- **Line 144-159**: Good error handling with fallback
- **Issue**: Inconsistent with ai/chat.ts which checks multiple env var names
- **Fix**: Use same getGeminiApiKey() pattern

#### `/api/ai-recommendations.ts` ✅ Good with Issues
- **Line 16-24**: Good Gemini client factory pattern
- **Line 64**: Checks for null client and returns mocks
- **Line 101-104**: Uses config from api/config.ts
- **Issue**: Line 112 hardcodes recommendations limit instead of using LIMITS.recommendations
- **Fix**: Change line 138 to: `data: recommendations.slice(0, LIMITS.recommendations)`

#### `/api/ai/chat.ts` ⚠️ Mixed Issues
- **Line 592-593**: Multiple env var name checks (PROBLEMATIC)
  ```typescript
  // ❌ Should standardize:
  const apiKey = process.env.GEMINI_API || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  // ✅ Should be:
  const apiKey = getGeminiApiKey();  // From config.ts
  ```
- **Line 255-448**: Excellent persona definitions! Well-structured.
- **Line 610-636**: Phase 2 enhanced context - good implementation
- **Issue**: Lines 672-673 hardcode model name
  ```typescript
  // ❌ Hardcoded:
  model: 'gemini-2.5-flash',
  
  // ✅ Should use:
  model: AI_CONFIG.gemini.defaultModel,
  ```

#### `/api/audio/generate.ts` ⚠️ Voice List Duplicated
- **Lines 95-112**: Voice language mapping hardcoded
- **Lines 60-64**: CORS headers hardcoded
- **Issue**: Same voice list in `premium-tts.ts` and `voices.ts`
- **Fix**: Move PREMIUM_VOICES to config.ts and import here

#### `/api/premium-tts.ts` ⚠️ Voice List Duplicated
- **Lines 44-61**: PREMIUM_VOICES duplicated from audio/generate.ts
- **Lines 24-34**: Polly client initialization (good pattern)
- **Fix**: Import from config.ts instead

#### `/api/voices.ts` ⚠️ Voice List Duplicated
- **Lines 12-29**: PREMIUM_VOICES duplicated again
- **Fix**: Import from config.ts

---

### PRACTICE COMPONENTS

#### `/src/components/practice/RSInterface.tsx` ❌ CRITICAL ISSUES
- **Line 25**: Imports ttsEngine (good)
- **Lines 42-47**: Props interface defined
- **Lines 87-141**: Recording implementation (good UI)
- **LINE 143-173**: 🔴 CRITICAL - Mock feedback generation
  ```typescript
  // ❌ PROBLEM (lines 151-157):
  const mockFeedback: FeedbackData = {
    score: 70 + Math.floor(Math.random() * 20),  // RANDOM!
    correct: simulatedCorrect,
    missed: simulatedMissed,
    tips: ['Focus on linking words...']
  };
  
  // Comment at line 145 says "In production, this would:"
  // But never implements it!
  ```
- **Missing**: No sessionManager import or usage
- **Missing**: No getPronunciationScore call
- **Fix**: Replace lines 143-173 with:
  ```typescript
  const processRecording = async () => {
    // 1. Transcribe audio (via Web Speech API)
    const transcribedText = await transcribeAudio(audioChunksRef.current);
    
    // 2. Get real AI scoring
    const scoring = await getPronunciationScore(sentence, transcribedText, difficulty);
    
    // 3. Save to session
    if (sessionManager) {
      await sessionManager.recordItem({
        item_id: `rs-${item.id || Date.now()}`,
        item_type: 'sentence',
        item_text: sentence,
        user_response: transcribedText,
        score: scoring.score,
        is_correct: scoring.score >= 70,
        time_spent_sec: recordingTime,
        attempts: 1,
        feedback: scoring.feedback,
        pronunciation_errors: scoring.improvements
      });
    }
    
    setFeedback({
      score: scoring.score,
      correct: extractCorrectWords(sentence, transcribedText),
      missed: extractMissedWords(sentence, transcribedText),
      tips: scoring.improvements
    });
  };
  ```

#### `/src/components/practice/ASQInterface.tsx` ❌ CRITICAL ISSUES
- **Line 26**: Imports ttsEngine
- **Lines 120-137**: Answer checking (basic string comparison)
- **Missing**: No sessionManager integration
- **Missing**: No question difficulty-based difficulty adjustment
- **Lines 121-137**: Logic is fine for immediate feedback but doesn't track
- **Fix needed**: Add sessionManager.recordItem after feedback

#### `/src/components/practice/WFDInterface.tsx` ❌ CRITICAL ISSUES
- **Line 26**: Imports ttsEngine
- **Lines 85-117**: Word comparison logic (good)
- **Missing**: No sessionManager integration
- **Missing**: No pronunciation feedback (should be text-based)
- **Fix needed**: Add sessionManager.recordItem and track accuracy

#### `/src/components/practice/WordCard.tsx` ✅ Good Pattern
- **Line 16**: Correctly imports SessionManager type
- **Lines 99-120**: Good sessionManager.recordItem pattern
  ```typescript
  if (sessionManager) {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const itemType: ItemType = isVocabularyTerm ? 'word' : ...;
    
    await sessionManager.recordItem({
      item_id: (item as any).id || `${displayText}-${Date.now()}`,
      item_type: itemType,
      item_text: displayText,
      attempts: newPlayCount,
      time_spent_sec: timeSpent,
    });
  }
  ```
- **NOTE**: This is the CORRECT pattern - RS/ASQ/WFD should follow this

---

### AI COMPONENTS

#### `/src/components/ai/PronunciationScoring.tsx` ✅ Good Pattern
- **Line 19**: Correctly imports getPronunciationScore
- **Lines 155-165**: Uses API correctly
  ```typescript
  const scoringResult = await getPronunciationScore(
    targetText,
    transcription,
    difficulty
  );
  ```
- **Issue**: Standalone component, not integrated into practice modes
- **Fix**: Call this from RS recording completion

#### `/src/components/ai/AITutorChat.tsx` ⚠️ Phase 1 Only
- **Line 18**: Imports askAITutor
- **Line 141**: Calls askAITutor
  ```typescript
  const result = await askAITutor(input.trim(), {
    context: {
      word: currentItem?.word || '',
      difficulty: currentItem?.difficulty,
      ipa: currentItem?.ipa
    }
  });
  ```
- **Issue**: Never passes useEnhancedContext, taskType, userId, sessionId
- **Fix**: Should be:
  ```typescript
  const result = await askAITutor(input.trim(), {
    // Phase 1 context (for backward compat)
    context: { word, difficulty, ipa },
    // Phase 2 enhanced context
    userId: user?.id,
    taskType: getCurrentTaskType(),  // Need to determine from context
    sessionId: currentSessionId,
    useEnhancedContext: true
  });
  ```

#### `/src/components/ai/WeakAreasDashboard.tsx` ✅ Good Integration
- **Line 13-14**: Correctly imports services
  ```typescript
  import { getWeakAreas, detectWeakAreas } from '../../services/ai/weakAreaDetector';
  import { generateRecommendations, ... } from '../../services/ai/recommendationEngine';
  ```
- **Issue**: These services ONLY used here, not during practice
- **Recommendation**: Call detectWeakAreas after each session completes

---

### SERVICES

#### `/src/services/ai.ts` ✅ Good Structure with Gaps
- **Lines 31-56**: getAIRecommendations - good
- **Lines 86-136**: askAITutor - good, but Phase 1 only
- **Lines 142-150**: getPronunciationTips - STUBBED OUT ❌
  ```typescript
  export async function getPronunciationTips(_word: string, _userAttempt?: string) {
    // TODO: Implement pronunciation tips endpoint
    return { success: false, error: 'Pronunciation tips not yet implemented' };
  }
  ```
- **Lines 171-215**: getPronunciationScore - good
- **Missing**: Response rating integration

#### `/src/services/ai/ratingService.ts` ✅ Built But Unused ❌
- **Lines 24-91**: rateAIResponse - well implemented
- **Lines 96-129**: getUserRatingStats - good
- **ISSUE**: `grep -r "ratingService" /src/components/ → NO MATCHES`
- **Never imported or used anywhere!**

#### `/src/services/session/sessionManager.ts` ✅ Good But Incomplete
- **Lines 114-172**: startSession - good
- **Lines 177-193**: recordItem - good
- **Lines 198-250**: completeSession - good
- **ISSUE**: Only called by WordCard, not by RS/ASQ/WFD

#### `/src/services/ai/weakAreaDetector.ts` ✅ Built But Not Used in Practice
- **Lines 39-76**: detectWeakAreas - good implementation
- **ISSUE**: Only used by WeakAreasDashboard.tsx
- **Missing**: Call after each session to detect patterns

#### `/src/services/ai/recommendationEngine.ts` ✅ Built But Not Integrated
- **Lines 48-50**: generateRecommendations - good
- **ISSUE**: Only used by WeakAreasDashboard
- **Missing**: Adaptive recommendations during practice

#### `/src/services/tts.ts` ✅ Infrastructure Built But Cache Not Used
- **Lines 109-188**: TTSCache class - well implemented
- **Line 191**: Export ttsCache singleton
- **ISSUE**: `grep -r "ttsCache" /src/ → NO MATCHES`
- **Never actually used for caching!**

---

### APP INTEGRATION

#### `/src/App.tsx` - Session & Component Integration
- **Line 33**: Imports getSessionManager ✅
- **Line 54**: Creates sessionManager instance ✅
  ```typescript
  const [sessionManager] = useState(() => getSessionManager());
  ```
- **Line 143**: Starts session on load ✅
  ```typescript
  const sessionId = await sessionManager.startSession(
    taskType, vocabularyBook, 'practice', settings
  );
  ```
- **Line 172**: Completes session on unmount ✅
- **Lines 436-452**: Renders practice components ⚠️
  ```typescript
  {vocabMode === 'rs-practice' && (
    <RSInterface item={currentItem} onNext={...} />
    // ❌ sessionManager prop NOT passed!
  )}
  ```
- **Line 462**: Only WordCard gets sessionManager
  ```typescript
  <WordCard sessionManager={sessionManager} ... />
  ```

**FIX**: Pass sessionManager to all practice components:
```typescript
<RSInterface 
  item={currentItem} 
  sessionManager={sessionManager}  // ADD THIS
  onNext={handleNext}
/>
<ASQInterface 
  item={currentItem}
  sessionManager={sessionManager}  // ADD THIS
  onNext={handleNext}
/>
<WFDInterface 
  item={currentItem}
  sessionManager={sessionManager}  // ADD THIS
  onNext={handleNext}
/>
```

---

## Summary of Required Changes

### MUST DO (Blocking)
1. Pass sessionManager to RS/ASQ/WFD components in App.tsx
2. Import sessionManager prop in RS/ASQ/WFD interfaces
3. Call sessionManager.recordItem() after user completes item
4. Replace mock feedback in RSInterface with getPronunciationScore

### SHOULD DO (High Priority)
5. Standardize Gemini API key access across all endpoints
6. Centralize voice configuration in config.ts
7. Enable Phase 2 enhanced context in AITutorChat
8. Add rating UI to AITutorChat

### NICE TO DO (Lower Priority)
9. Use ttsCache in WordCard
10. Implement getPronunciationTips
11. Integrate weakAreaDetector into practice sessions
12. Add real-time progress tracking

---

## Testing Checklist by Component

### RSInterface
- [ ] Recording works and saves to sessionManager
- [ ] getPronunciationScore called with recorded audio
- [ ] Session data visible in Supabase after completion
- [ ] Score is not random (verify real AI scoring)
- [ ] Feedback includes real tips from API

### ASQInterface
- [ ] Answer submission tracked in sessionManager
- [ ] Accuracy calculated and saved
- [ ] Session metrics updated

### WFDInterface
- [ ] Transcription tracked in sessionManager
- [ ] Word accuracy calculated
- [ ] Session metrics updated

### App.tsx
- [ ] SessionManager passed to all practice components
- [ ] Sessions visible in database
- [ ] Weak areas detected after session completion
