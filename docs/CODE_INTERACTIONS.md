# Codebase Interaction & Usage Analysis

**Generated on:** 2025-11-29T21:37:30.169Z

## 📊 Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Exported Functions** | 97 |
| **Total Usages Detected** | 742 |
| **Average Usage per Function** | 7.6 |

### Distribution
- **🔥 Heavy Usage (>20)**: 9 (9.3%)
- **✅ Reasonable Usage (5-20)**: 32 (33.0%)
- **⚠️ Low Usage (1-4)**: 46 (47.4%)
- **👻 Unused (0)**: 10 (10.3%)

---

## 🔥 Top 20 Heavily Used Functions
These are the core building blocks of the application.

| Function | Usages | Defined In |
| :--- | :--- | :--- |
| `supabase` | **89** | `src/services/supabase/supabaseClient.ts` |
| `appConfig` | **63** | `src/config/AppConfig.ts` |
| `storage` | **47** | `src/utils/Storage.ts` |
| `useAppStore` | **34** | `src/stores/index.ts` |
| `Skeleton` | **31** | `src/components/shared/Skeleton.tsx` |
| `isVocabularyTerm` | **23** | `src/utils/validation/guards.ts` |
| `isAuthenticated` | **22** | `src/services/supabase/supabaseClient.ts` |
| `cleanText` | **22** | `src/utils/textUtils.ts` |
| `isArray` | **21** | `src/utils/validation/guards.ts` |

---

## 👻 Potential Unused / Dead Code
*Note: These might be used dynamically or by external tools, but no direct static references were found.*

<details>
<summary>Click to view 10 unused functions</summary>

| Function | Defined In |
| :--- | :--- |
| `persistentTTSCache` | `src/services/tts/persistentCache.ts` |
| `useIsAutoPlaying` | `src/stores/index.ts` |
| `useCurrentIndex` | `src/stores/index.ts` |
| `useIsSpeaking` | `src/stores/index.ts` |
| `usePracticeMode` | `src/stores/index.ts` |
| `useCurrentItem` | `src/stores/index.ts` |
| `useFilteredDataset` | `src/stores/index.ts` |
| `useAccuracy` | `src/stores/index.ts` |
| `useUI` | `src/stores/index.ts` |
| `useNotification` | `src/stores/index.ts` |

</details>

---

## 📂 Detailed Breakdown by Module

### 📁 `src/components`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `AppContent` | 3 | ⚠️ Low |

### 📁 `src/components/shared`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `Skeleton` | 31 | 🔥 Heavy |
| `useOnboarding` | 5 | ✅ Reasonable |
| `ToastProvider` | 5 | ✅ Reasonable |
| `ComponentSkeleton` | 4 | ⚠️ Low |
| `WordCardSkeleton` | 3 | ⚠️ Low |
| `VocabularyListSkeleton` | 3 | ⚠️ Low |
| `VocabularyListItemSkeleton` | 1 | ⚠️ Low |
| `useToast` | 1 | ⚠️ Low |

### 📁 `src/config`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `appConfig` | 63 | 🔥 Heavy |

### 📁 `src/data`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `datasetManager` | 4 | ⚠️ Low |

### 📁 `src/hooks`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `useOnboarding` | 5 | ✅ Reasonable |
| `useSwipeGesture` | 4 | ⚠️ Low |
| `useMigration` | 3 | ⚠️ Low |
| `useBreakpoint` | 1 | ⚠️ Low |

### 📁 `src/services`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `ttsCache` | 5 | ✅ Reasonable |
| `getPronunciationScore` | 3 | ⚠️ Low |
| `askAITutorStream` | 2 | ⚠️ Low |

### 📁 `src/services/ai`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `generateRecommendations` | 5 | ✅ Reasonable |
| `generateRecommendations` | 5 | ✅ Reasonable |
| `detectWeakAreas` | 4 | ⚠️ Low |
| `getWeakAreas` | 4 | ⚠️ Low |
| `logIntervention` | 3 | ⚠️ Low |
| `updateRecommendationStatus` | 3 | ⚠️ Low |
| `monitorSession` | 2 | ⚠️ Low |
| `rateAIResponse` | 2 | ⚠️ Low |
| `getRecommendations` | 2 | ⚠️ Low |
| `checkForInterventions` | 1 | ⚠️ Low |
| `calculateSessionMetrics` | 1 | ⚠️ Low |

### 📁 `src/services/analytics`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `analyticsService` | 18 | ✅ Reasonable |

### 📁 `src/services/audio`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `ttsEngine` | 19 | ✅ Reasonable |
| `getVoices` | 7 | ✅ Reasonable |
| `isPremiumTTSAvailable` | 4 | ⚠️ Low |

### 📁 `src/services/migration`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `hasDataToMigrate` | 3 | ⚠️ Low |
| `getMigrationSummary` | 2 | ⚠️ Low |
| `performMigration` | 2 | ⚠️ Low |
| `clearOldData` | 2 | ⚠️ Low |
| `rollbackMigration` | 2 | ⚠️ Low |

### 📁 `src/services/profile`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `hasCompletedOnboarding` | 4 | ⚠️ Low |
| `getLearnerProfile` | 2 | ⚠️ Low |
| `saveLearnerProfile` | 2 | ⚠️ Low |
| `markOnboardingCompleted` | 1 | ⚠️ Low |

### 📁 `src/services/session`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `getSessionManager` | 2 | ⚠️ Low |

### 📁 `src/services/supabase`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `supabase` | 89 | 🔥 Heavy |
| `isAuthenticated` | 22 | 🔥 Heavy |
| `syncService` | 19 | ✅ Reasonable |
| `authService` | 12 | ✅ Reasonable |
| `signOut` | 8 | ✅ Reasonable |
| `autoSyncManager` | 6 | ✅ Reasonable |
| `getCurrentUser` | 1 | ⚠️ Low |

### 📁 `src/services/tts`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `persistentTTSCache` | 0 | 👻 Unused |

### 📁 `src/stores`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `useAppStore` | 34 | 🔥 Heavy |
| `useAuth` | 18 | ✅ Reasonable |
| `useVocabulary` | 14 | ✅ Reasonable |
| `useSettings` | 10 | ✅ Reasonable |
| `useProgress` | 10 | ✅ Reasonable |
| `useAudioState` | 6 | ✅ Reasonable |
| `useTTSState` | 2 | ⚠️ Low |
| `useIsAutoPlaying` | 0 | 👻 Unused |
| `useCurrentIndex` | 0 | 👻 Unused |
| `useIsSpeaking` | 0 | 👻 Unused |
| `usePracticeMode` | 0 | 👻 Unused |
| `useCurrentItem` | 0 | 👻 Unused |
| `useFilteredDataset` | 0 | 👻 Unused |
| `useAccuracy` | 0 | 👻 Unused |
| `useUI` | 0 | 👻 Unused |
| `useNotification` | 0 | 👻 Unused |

### 📁 `src/utils`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `storage` | 47 | 🔥 Heavy |
| `cleanText` | 22 | 🔥 Heavy |
| `eventBus` | 9 | ✅ Reasonable |
| `cacheMigration` | 4 | ⚠️ Low |
| `parseAnswerForDisplay` | 2 | ⚠️ Low |
| `parseTemplateText` | 1 | ⚠️ Low |

### 📁 `src/utils/validation`

| Function | Usages | Status |
| :--- | :--- | :--- |
| `isVocabularyTerm` | 23 | 🔥 Heavy |
| `isArray` | 21 | 🔥 Heavy |
| `vocabularyTermSchema` | 11 | ✅ Reasonable |
| `isObject` | 10 | ✅ Reasonable |
| `isStringArray` | 8 | ✅ Reasonable |
| `isAlternativeVocabularyTerm` | 7 | ✅ Reasonable |
| `isRepeatSentenceItem` | 7 | ✅ Reasonable |
| `isPracticeItem` | 7 | ✅ Reasonable |
| `premiumTTSRequestSchema` | 7 | ✅ Reasonable |
| `isAnswerShortQuestionItem` | 6 | ✅ Reasonable |
| `repeatSentenceSchema` | 6 | ✅ Reasonable |
| `isAnyVocabularyTerm` | 5 | ✅ Reasonable |
| `isWriteFromDictationItem` | 5 | ✅ Reasonable |
| `answerShortQuestionSchema` | 5 | ✅ Reasonable |
| `aiTutorRequestSchema` | 5 | ✅ Reasonable |
| `difficultySchema` | 4 | ⚠️ Low |
| `writeFromDictationSchema` | 4 | ⚠️ Low |
| `safeValidate` | 4 | ⚠️ Low |
| `validateVocabularyTerm` | 4 | ⚠️ Low |
| `alternativeVocabularyTermSchema` | 3 | ⚠️ Low |
| `practiceMetadataSchema` | 3 | ⚠️ Low |
| `ipaSchema` | 1 | ⚠️ Low |
| `phoneticSchema` | 1 | ⚠️ Low |
| `practiceItemSchema` | 1 | ⚠️ Low |

