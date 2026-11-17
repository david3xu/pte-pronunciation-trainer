# App Review Audit — pte-vocabulary-trainer (ccl-pronunciation-trainer)

**Date:** 2026-11-12
**Version audited:** 3.0.11 (`package.json`, commit `56b99de`)
**Repo:** `ccl-pronunciation-trainer`
**Scope:** Full repository (`src/`, `api/`, `server/`, `scripts/`, `supabase/migrations/`, build and lint configuration).
**Fix Status:** **0 fixed — all findings below are UNFIXED** (`HEAD` at `56b99de` is unmodified).

---

## 1. Automated Gate Baseline

| Gate Command | Result | Details |
| --- | --- | --- |
| `pnpm run validate:all` | **PASS** (with warnings) | 25/25 doc checks pass, 55/55 structure checks pass, 40/40 datasets pass (0 errors, 332 duplicate-term warnings). |
| `pnpm run build:ts` | **PASS** | App (`tsconfig.json`) and API (`tsconfig.api.json`) type-check with 0 errors. |
| `pnpm run build:server` | **PASS** | Production server (`tsconfig.server.json`) compiles cleanly. |
| `pnpm run azure:validate` | **PASS** | Preflight and package contract checks pass. |
| `pnpm run lint:css` | **FAIL (103 errors)** | `stylelint` key in `package.json:148-156` overrides `.stylelintrc.cjs:1-34` and uses Stylelint v15 rules (`indentation`, `string-quotes`) removed in Stylelint v16. |
| `pnpm test` | **510 / 529 PASS** | 32/33 suites pass in-process (`server/createApp.test.ts` requires loopback socket connect); `src/App.test.tsx:10-46` emits `ECONNRESET` from unmocked dataset `fetch` calls. |

---

## 2. Summary of All Audit Findings (All UNFIXED)

| ID | Severity | Summary | Status |
| --- | --- | --- | --- |
| **H1** | HIGH | Broken Supabase session & table contracts across `SessionManager`, `SyncService`, `MigrationService`, AI engines, and `ProgressDashboard` | **UNFIXED** |
| **H2** | HIGH | `autoSyncManager` is never initialized and still reads dead `window.*` vanilla-JS globals | **UNFIXED** |
| **H3** | HIGH | Cloud progress model stores integer `currentIndex + 1` instead of completed item IDs | **UNFIXED** |
| **H4** | HIGH | `SessionManager.syncQueuedSessions()` uses an async callback inside synchronous `Array.prototype.filter` | **UNFIXED** |
| **H5** | HIGH | `api/premium-tts.ts` diverges from `api/_handlers/premiumTts.ts` and leaks internal config error messages | **UNFIXED** |
| **H6** | HIGH | `pnpm run lint:css` fails with 103 Stylelint errors | **UNFIXED** |
| **M1** | MEDIUM | Volume slider cannot mute (`vol \|\| 1.0` jumps `0` to `100%`) & `SettingsPanel` volume ignores `audioServiceForPlatform` when `AudioControls` is unmounted | **UNFIXED** |
| **M2** | MEDIUM | `VocabTypingInterface` global keydown listener hijacks `,`, `.`, `<`, `>` while typing in the input box | **UNFIXED** |
| **M3** | MEDIUM | `AITutorChat` "Quick Questions" buttons never send due to stale closure over `input` | **UNFIXED** |
| **M4** | MEDIUM | Progress bars render as empty tracks across 4 components (`PronunciationScoring`, `ProgressDashboard`, `WeakAreasDashboard`, `ProgressTracker`) | **UNFIXED** |
| **M5** | MEDIUM | Scrollable modal sections lack `overflowY: 'auto'` (`WeakAreasDashboard`, `ProgressDashboard`, `PronunciationScoring`) | **UNFIXED** |
| **M6** | MEDIUM | `PronunciationScoring` renders `"[object Object]"` for `currentItem.phonetic` and omits `'english' in currentItem` | **UNFIXED** |
| **M7** | MEDIUM | `WordCard` ignores `settings.showPhonetic` toggle | **UNFIXED** |
| **M8** | MEDIUM | Switching vocabulary books or modes in `SettingsPanel` does not rotate the active session in `sessionManager` | **UNFIXED** |
| **M9** | MEDIUM | `scripts/dev-proxy.js` resolves API directory to `scripts/api/` instead of `api/` | **UNFIXED** |
| **M10** | MEDIUM | Dead `audio.autoPlayEnabled` / `setAutoPlay` state remains in Zustand store alongside `settings.autoPlay` | **UNFIXED** |
| **M11** | MEDIUM | `vercel-build:pte` in `package.json` duplicates the `copy-mobile-data` Vite plugin step | **UNFIXED** |
| **M12** | MEDIUM | Blocking `alert()` calls used instead of `<ToastProvider>` in `AppContent` and `SettingsPanel` | **UNFIXED** |
| **M13** | MEDIUM | "Clear All Data" (`appDataReset.ts`) wipes auth token via `localStorage.clear()` without signing out store and misses `localForage` offline sessions | **UNFIXED** |
| **M14** | MEDIUM | `.single()` used instead of `.maybeSingle()` on optional rows, causing HTTP 406 (`PGRST116`) | **UNFIXED** |
| **M15** | MEDIUM | `SettingsPanel` TTS Voice `<Select>` is inert (`value="default"` with a single hardcoded option) | **UNFIXED** |
| **L1** | LOW | Manual `Next` button at end of queue does not wrap when `repeatMode` is enabled and is not disabled on the last item | **UNFIXED** |
| **L2** | LOW | `TTSEngine` creates a duplicate `<audio>` element via `IOSBackgroundAudio` and reads non-existent `tts.delays.voiceReady` | **UNFIXED** |
| **L3** | LOW | Stale path aliases (`@ts`, `@js`, etc.) in `vite.config.ts` | **UNFIXED** |
| **L4** | LOW | Hardcoded vocabulary book counts (`14` / `13`) in `SettingsPanel` and `AppConfig` vs. 17 actual books | **UNFIXED** |
| **L5** | LOW | Dead DI Shadowing code, 6 unreferenced components, legacy `Storage.ts`, stale RS/ASQ/WFD strings, and outdated Gemini API key message | **UNFIXED** |
| **L6** | LOW | Repository metadata mismatches (`README.md` says Node 16+, `package.json` has placeholder GitHub URLs) | **UNFIXED** |
| **TEST-1** | TEST | `src/App.test.tsx` fires unmocked network `fetch` calls (`ECONNRESET`) | **UNFIXED** |

---

## 3. Detailed Findings

### HIGH Severity

#### H1 — Broken Database Table & Column Contracts Across Session, Sync, Migration, AI, and Dashboard Modules
- **Status:** **UNFIXED**
- **Files:**
  - Schema migrations: `supabase/migrations/20250108000000_initial_schema.sql:177-202` (`study_sessions`), `supabase/migrations/20250113000000_ai_powered_features.sql:38-86` (`practice_sessions`, `session_items`)
  - Writers: `src/services/session/sessionManager.ts:115-225`, `src/services/supabase/syncService.ts:238-250`, `src/services/migration/migrationService.ts:226-237`
  - Readers: `src/components/practice/ProgressDashboard.tsx:88-101`, `src/services/ai/interventionEngine.ts:280-285`, `src/services/ai/weakAreaDetector.ts:50-56`, `src/services/ai/recommendationEngine.ts:68-74`, `api/ai/chat.ts:171-185`
- **Details:**
  1. **`session_items` Foreign Key & RLS Failure:** `session_items.session_id` references `practice_sessions(id)` and its RLS policy requires a matching row in `practice_sessions`. However, `SessionManager.startSession()` (`src/services/session/sessionManager.ts:115-147`) never inserts into `practice_sessions`, and `completeSession()` (`L200-217`) inserts into `study_sessions`. Consequently, every `flushItemQueue()` (`L290-294`) insert into `session_items` fails against Supabase FK/RLS constraints and re-queues indefinitely.
  2. **Non-existent table in `ProgressDashboard`:** `ProgressDashboard.fetchProgressData()` (`src/components/practice/ProgressDashboard.tsx:88-93`) queries `.from('sessions')` (which does not exist in any migration) and reads `items_completed`, `duration_minutes`, and `accuracy_percent` (none of which exist on `study_sessions` or `practice_sessions`).
  3. **Mismatched columns on `study_sessions`:**
     - `SyncService.saveStudySession()` (`src/services/supabase/syncService.ts:238-250`) writes `session_type`, `words_studied`, `accuracy_percentage`, `completed_at` to `study_sessions` (none exist in `20250108000000_initial_schema.sql`).
     - `MigrationService.transformData()` (`src/services/migration/migrationService.ts:226-237`) writes `task_type`, `start_time`, `end_time`, `items_attempted`, `accuracy`, `status` to `study_sessions` (these are `practice_sessions` columns, not `study_sessions`).
     - `interventionEngine.ts:280-285`, `weakAreaDetector.ts:50-56`, and `recommendationEngine.ts:68-74` query `study_sessions` for `task_type, accuracy, items_attempted, completed_at` (which only exist on `practice_sessions`).

#### H2 — Supabase Progress/Session/Settings Auto-Sync Is Dead
- **Status:** **UNFIXED**
- **Files:** `src/services/supabase/autoSyncManager.ts:43-54, 231-303`, `src/stores/index.ts:714`
- **Details:** `autoSyncManager.initialize()` has zero call sites (`src/stores/index.ts:714` only calls `syncService.initialize()`). In addition, `forceSyncNow()` (`L231-272`), `getDatasetId()` (`L277-284`), and `getDatasetType()` (`L289-303`) still read non-existent vanilla-JS globals (`window.progressTracker`, `window.pteVocabularyManager`, `window.storage`).

#### H3 — Cloud Progress Model Stores Integer Count Instead of Completed Item IDs
- **Status:** **UNFIXED**
- **Files:** `src/services/supabase/syncService.ts:56-62`, `src/services/supabase/autoSyncManager.ts:170-185`, `src/stores/index.ts:226-254`
- **Details:** Local state tracks completed items as `completedItemsByDataset: Record<string, string[]>`, but `syncService.syncProgress()` and `autoSyncManager.syncProgress()` pass `currentIndex + 1` (an integer count) to `user_progress.completed_items` instead of persisting completed item IDs.

#### H4 — `SessionManager.syncQueuedSessions()` Uses Async Callback Inside Synchronous `Array.prototype.filter`
- **Status:** **UNFIXED**
- **File:** `src/services/session/sessionManager.ts:448-451`
- **Details:**
  ```ts
  const remainingList = queuedList.filter((item: any) =>
    localForage.getItem(`offline-session-${item.id}`).then((s: unknown) => s !== null)
  );
  ```
  Because `Array.prototype.filter` is synchronous and evaluates the truthiness of the returned `Promise` object (always `true`), `remainingList` never removes synced sessions and `localStorage.getItem('offline-sessions')` grows indefinitely.

#### H5 — `api/premium-tts.ts` Diverges from `api/_handlers/premiumTts.ts` and Leaks Configuration Error Messages
- **Status:** **UNFIXED**
- **Files:** `api/premium-tts.ts:24-99`, `api/_handlers/premiumTts.ts:22-36`, `api/voices.ts:12-15`
- **Details:** While `api/voices.ts:12-15` delegates to `toVercelHandler(voicesHandler)`, `api/premium-tts.ts:93-97` still contains the legacy inline handler that echoes `error.message` directly to the client (`error: error instanceof Error ? error.message : 'Failed to synthesize speech'`). When Azure Speech env vars are missing, `getAzureSpeechConfig()` throws an error naming `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`, which leaks to the client on Vercel.

#### H6 — CSS Linting Gate (`pnpm run lint:css`) Fails with 103 Errors
- **Status:** **UNFIXED**
- **Files:** `package.json:148-156`, `.stylelintrc.cjs:28-32`, `src/css/style.css:380-382`, `src/css/responsive.css:373`, `src/css/shadowing.css:127, 232, 265`
- **Details:**
  1. `package.json` contains a `"stylelint"` config field that takes precedence over `.stylelintrc.cjs` and enables `indentation` and `string-quotes` (both removed in Stylelint v16).
  2. `.stylelintrc.cjs` also references `'indentation': null` and `'string-quotes': null`, and lacks `ignoreAtRules: ['tailwind', 'layer', ...]`.
  3. `src/css/style.css:380-382` has three identical `appearance: none;` declarations in the same rule block; `src/css/responsive.css:373` uses non-standard `min-device-pixel-ratio: 2`.

---

### MEDIUM Severity

#### M1 — Volume Slider Cannot Mute (`0 || 1.0` Evaluates to `1.0`) & Settings Volume Ignores Platform Service When `AudioControls` Is Unmounted
- **Status:** **UNFIXED**
- **Files:** `src/components/audio/AudioControls.tsx:188`, `src/components/settings/SettingsPanel.tsx:422`, `src/stores/index.ts:156`
- **Details:**
  1. Both sliders use `onValueChange={([vol]) => setVolume(vol || 1.0)}`. When the user drags the volume slider to `0` (0%), `0 || 1.0` evaluates to `1.0`, jumping volume back to 100%. Should be `vol ?? 1.0`.
  2. `audioServiceForPlatform.setVolume` is only synced inside `useAutoPlayController` (`src/components/audio/hooks/useAutoPlayController.ts:174-176`), which is only mounted when `interfaceType === 'vocabulary'`. In `vocab-typing` mode, changing volume in `SettingsPanel` updates `state.audio.volume` without calling `audioServiceForPlatform.setVolume`.

#### M2 — `VocabTypingInterface` Global Keydown Listener Hijacks `,`, `.`, `<`, `>` While Typing in the Input Field
- **Status:** **UNFIXED**
- **File:** `src/components/practice/VocabTypingInterface.tsx:272-290`
- **Details:** `handleGlobalKeyDown` listens on `window` and intercepts `,`, `.`, `<`, `>` without checking whether an `<input>` or `<textarea>` is focused. Typing a comma or period in the answer box triggers `e.preventDefault()` and navigates away from the current item, discarding the user's input. Additionally, `handleNext` and `handlePrevious` are recreated on every render and listed in the `useEffect` dependency array (`L290`), re-binding the window listener on every keystroke.

#### M3 — `AITutorChat` "Quick Questions" Buttons Never Send Due to Stale Closure Over `input`
- **Status:** **UNFIXED**
- **File:** `src/components/ai/AITutorChat.tsx:95-96, 352-355`
- **Details:**
  ```tsx
  onClick={() => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  }}
  ```
  `handleSend` closes over the render's `input` state (`''`). When the timeout fires 100ms later, the closure still sees `input === ''` and exits at `if (!input.trim() || isLoading) return;`.

#### M4 — Progress Bars Render as Empty Tracks Across 4 Components
- **Status:** **UNFIXED**
- **Files:**
  - `src/components/ai/PronunciationScoring.tsx:293-302`
  - `src/components/practice/ProgressDashboard.tsx:348-350, 481, 538`
  - `src/components/ai/WeakAreasDashboard.tsx:271-275`
  - `src/components/practice/ProgressTracker.tsx:49-57`
- **Details:** Radix `<Progress>` components were replaced with self-closing `<div className="w-full bg-app-border rounded-full h-2" color={...} />` elements without an inner fill bar or width percentage, causing all progress/score bars in these views to display as empty tracks.

#### M5 — Scrollable Modal Sections Lack `overflowY: 'auto'`
- **Status:** **UNFIXED**
- **Files:** `src/components/ai/WeakAreasDashboard.tsx:95, 132`, `src/components/practice/ProgressDashboard.tsx:420, 466, 522`, `src/components/ai/PronunciationScoring.tsx:378`
- **Details:** Plain `<div>` containers with `maxHeight` or `flex: 1, minHeight: 0` inside `overflow: 'hidden'` cards omit `overflowY: 'auto'`, clipping or overflowing list content.

#### M6 — `PronunciationScoring` Renders `"[object Object]"` for Phonetics & Misses `'english'` Field
- **Status:** **UNFIXED**
- **File:** `src/components/ai/PronunciationScoring.tsx:52-54, 212-216`
- **Details:**
  1. `targetText` checks `'word' in currentItem`, `'sentence' in currentItem`, and `'question' in currentItem`, omitting `'english' in currentItem`.
  2. `{String(currentItem.phonetic)}` (`L214`) coerces the `phonetic` object (`{ british, american, single }`) to the literal string `"[object Object]"`.

#### M7 — `WordCard` Ignores `settings.showPhonetic` Toggle
- **Status:** **UNFIXED**
- **Files:** `src/components/practice/WordCard.tsx:179-237`, `src/components/settings/SettingsPanel.tsx:486-499`
- **Details:** `SettingsPanel` exposes a "Show Phonetic Spelling" toggle (`settings.showPhonetic`), but `WordCard` never reads `settings.showPhonetic` and always displays `"Sounds like: ..."`.

#### M8 — Session Cross-Contamination When Switching Books or Modes in `SettingsPanel`
- **Status:** **UNFIXED**
- **Files:** `src/components/AppContent.tsx:111-122`, `src/components/settings/SettingsPanel.tsx:79-161`
- **Details:** `sessionManager.startSession()` is only called once in `AppContent`'s mount effect. Switching vocabulary books or study types in `SettingsPanel` does not complete the previous session or start a new session for the new dataset/task type.

#### M9 — `scripts/dev-proxy.js` Resolves API Directory Relative to `scripts/`
- **Status:** **UNFIXED**
- **File:** `scripts/dev-proxy.js:70`
- **Details:** `join(__dirname, 'api', `${endpoint}.ts`)` resolves to `scripts/api/<endpoint>.ts` instead of `api/<endpoint>.ts`, causing every `/api/*` request through `pnpm run dev:proxy` to return `404 API endpoint not found`.

#### M10 — Duplicate Auto-Play State in Zustand Store (`audio.autoPlayEnabled` vs. `settings.autoPlay`)
- **Status:** **UNFIXED**
- **File:** `src/stores/index.ts:140-148, 306, 749, 778`
- **Details:** Dead `audio.autoPlayEnabled` and `audio.setAutoPlay` remain in the store and persistence config alongside `settings.autoPlay`.

#### M11 — Redundant Dataset Copy Step in `vercel-build:pte`
- **Status:** **UNFIXED**
- **Files:** `package.json:59`, `vite.config.ts:101-113`
- **Details:** `copy-mobile-data` in `vite.config.ts` already copies `data/processed` into `dist/data/processed` on every `vite build`, but `vercel-build:pte` in `package.json:59` still runs an extra `mkdir -p dist/data && cp -r data/processed dist/data/` step afterward.

#### M12 — Blocking `alert()` Calls Used Instead of `<ToastProvider>`
- **Status:** **UNFIXED**
- **Files:** `src/components/AppContent.tsx:141`, `src/components/settings/SettingsPanel.tsx:122, 159, 193, 196, 208, 211`
- **Details:** Error and reset notifications still call blocking `window.alert(...)` instead of using `<ToastProvider>`.

#### M13 — "Clear All Data" Wipes Auth Token Without Signing Out Store & Misses `localForage` Offline Sessions
- **Status:** **UNFIXED**
- **File:** `src/services/appDataReset.ts:10-23`
- **Details:** `clearAllApplicationData()` calls `localStorage.clear()`, which wipes the Supabase session token while leaving `state.auth` signed in in memory, and does not clear `localForage` (`offline-session-*` entries).

#### M14 — `.single()` Used Instead of `.maybeSingle()` on Optional Rows (`PGRST116` HTTP 406)
- **Status:** **UNFIXED**
- **Files:** `src/services/supabase/syncService.ts:124, 288`, `src/services/ai/recommendationEngine.ts:64`, `src/services/ai/interventionEngine.ts:284`, `api/ai/chat.ts:169, 176, 615`
- **Details:** Queries for optional `user_Settings`, `user_progress`, and `learner_profiles` rows use `.single()`, which throws `PGRST116` (HTTP 406) for new users with 0 rows.

#### M15 — `SettingsPanel` TTS Voice `<Select>` Is Inert
- **Status:** **UNFIXED**
- **File:** `src/components/settings/SettingsPanel.tsx:450-467`
- **Details:** The TTS Voice selector hardcodes `value="default"` with a single `<Select.Item value="default">Default System Voice</Select.Item>` and has no `onValueChange` handler.

---

### LOW Severity & Test Hygiene

- **L1 (UNFIXED) — Manual `Next` button at end of queue:** `AudioQueueEngine.next()` (`src/services/audio/audioQueueEngine.ts:306-308`) calls `moveToIndex(this.currentIndex + 1)`, which returns early at `index >= this.items.length` without wrapping to `0` when `repeatMode` is enabled; and the Next button in `src/components/audio/AudioControls.tsx:77-84` is never disabled on the last item when `repeatMode` is off.
- **L2 (UNFIXED) — Duplicate `<audio>` element in `IOSBackgroundAudio`:** `TTSEngine.speak()` (`src/services/audio/TTSEngine.ts:403-406`) calls `this.iosBackgroundAudio.enable()`, which appends a second `<audio>` element to `document.body` (`src/services/audio/iosBackgroundAudio.ts:91-103`), conflicting with the single-audio-element architecture in `backgroundAudioService`. Also `src/services/audio/TTSEngine.ts:326` reads non-existent `tts.delays.voiceReady` from `AppConfig`.
- **L3 (UNFIXED) — Stale path aliases in `vite.config.ts`:** `vite.config.ts:212-222` defines `@ts`, `@js`, `@stores`, `@utils`, `@data`, `@audio`, `@ui`, `@supabase-client`, `@analytics` pointing to non-existent `src/ts/...` and `src/js/...` directories.
- **L4 (UNFIXED) — Hardcoded book count in `SettingsPanel` and `AppConfig`:** `src/components/settings/SettingsPanel.tsx:384` says `"all 14 vocabulary books"` and `src/config/AppConfig.ts:113` says `13 total`, while `learningModes` actually defines **17** vocabulary books.
- **L5 (UNFIXED) — Post-`469a2b5` dead code & unused components:**
  - Dead DI Shadowing rendering block in `src/components/practice/WordCard.tsx:268-375`, plus `src/utils/templateParser.ts` and `src/css/shadowing.css`.
  - Six unreferenced components: `src/components/shared/OnboardingModal.tsx` (plus unused `src/hooks/useOnboarding.ts` or name collision), `src/components/audio/VoiceSelector.tsx`, `src/components/practice/VocabularyList.tsx`, `src/components/practice/ProgressTracker.tsx`, `src/components/practice/DifficultyFilter.tsx`, and `src/components/ai/AIRecommendations.tsx`.
  - Legacy `src/utils/Storage.ts` wrapper (only referenced by dead `window.storage` in `autoSyncManager.ts`).
  - Stale RS/ASQ/WFD recommendations in `src/services/ai/recommendationService.ts:154-163`, `src/services/ai/recommendationEngine.ts:124-125`, and `api/ai-recommendations.ts:209-304`.
  - Outdated Gemini API key error message in `src/components/ai/PronunciationScoring.tsx:173` instructing users to set a Gemini API key in Settings.
- **L6 (UNFIXED) — Repository metadata mismatches:**
  - `README.md:18` lists `Node.js 16+` while `package.json:118` and `AGENTS.md:9` require `Node 22+`.
  - `package.json:111-116` still contains placeholder `https://github.com/your-username/ccl-pronunciation-trainer` URLs.
- **TEST-1 (UNFIXED) — `src/App.test.tsx` fires unmocked network `fetch`:** `src/App.test.tsx:10-46` does not mock `loadDataset` or `fetch`, causing `ECONNRESET` errors during test runs.
