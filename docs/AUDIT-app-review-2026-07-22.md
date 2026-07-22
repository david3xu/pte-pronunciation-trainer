# App Review Audit — pte-vocabulary-trainer (ccl-pronunciation-trainer)

**Date:** 2026-07-22
**Version audited:** 3.0.2 (`package.json`)
**Repo:** `ccl-pronunciation-trainer`
**Scope:** Whole app EXCEPT AI tutor / recommendation / pronunciation-scoring-AI logic. Included where that logic's UI/audio integration affects shared app behaviour (progress, accuracy, playback).

> Method: read the source directly and drove the automated gates on the machine. All findings below carry file:line references. Manual on-device audio behaviour (autoplay, lock screen, PWA install) is called out separately because it cannot be verified from code.

---

## Ground truth (commands run)

Working tree was dirty during the audit: audio hooks, `TTSEngine.ts`, `backgroundAudioService.ts`, `SettingsPanel.tsx`, `AppConfig.ts`, store slices.

| Command | Result |
|---|---|
| `pnpm install` | clean |
| `pnpm run data:pte` | clean (~45 datasets generated) |
| `pnpm run build:ts` | clean, 0 TS errors (app + api) |
| `pnpm test` | 139/139 pass across 10 files (but see note) |
| `pnpm run validate:all` | passes, 0 errors, 4,779 warnings (duplicate terms) |

- `App.test.tsx` emits `ECONNRESET` / socket hang-ups: the app's real dataset `fetch` fires against the network in the test env and fails, but no assertion catches it. Test hygiene issue (TEST-1).
- The 4,779 duplicate-term warnings are neutralised at runtime by `withStableIds` (deterministic per-item ids), so they do not cause completion-key collisions. Still worth de-duping the generator.

All automated gates are green, so every finding below is behaviour the current tests do not exercise.

---

## HIGH

### H1 — Supabase progress/session/settings sync is effectively dead
**Files:** `src/services/supabase/autoSyncManager.ts`, `src/services/supabase/syncService.ts`
`autoSyncManager.initialize()` has zero call sites (grep-confirmed); `auth.initialize` only calls `syncService.initialize()`. So its store subscriptions never register. Even if they did, the manager is built against pre-React vanilla-JS globals:
- `getDatasetId()` (~L289) reads `window.storage.getItem('currentLearningMode')`.
- `getDatasetType()` reads `config.get('data.practiceModes')` (no such config key).
- `forceSyncNow()` (~L226-236) reads `window.progressTracker` / `window.pteVocabularyManager`.

None exist in the Zustand/React app (they are the archived `src/js/...` globals still listed in `AppConfig.build.jsFiles`). Separately, `syncService.syncSetting`, `loadSettings`, `loadProgress`, `loadProgressFromCloud` have no call sites anywhere in the app.

**Impact:** `user_progress`, `user_settings`, `study_sessions` tables exist (migrations) but the app never writes them. Cloud progress is never restored on login; settings never sync. Auth login itself works.
**Repro:** Sign in, complete items on device A, sign in on device B, nothing restores. Inspect tables, no rows written from normal use.
**Fix:** Rewrite `autoSyncManager` against the store (`useAppStore.getState().vocabulary.mode` / `.progress`), call `autoSyncManager.initialize()` from `auth.initialize` after `syncService.initialize()`, wire `syncSetting` into `settings.updateSetting`, and call `loadProgress`/`loadSettings` on login to hydrate. See H2 for the data-model half.

### H2 — Cloud progress model loses which items were completed
**Files:** `syncService.syncProgress(...)`, `autoSyncManager.syncProgress` (~L179)
Both pass `completedItems` as `currentIndex + 1` (a count), and `user_progress.completed_items` is a number. Local state tracks a set of item ids (`completedItemsByDataset`). Even once H1 is fixed, cross-device restore cannot rebuild the per-item completion indicators.
**Fix:** Persist the completed-id array (jsonb column) or a per-item completion table; stop deriving "completed" from the index.

### H3 — Auto-switch from the default vocabulary book stops instead of switching
**Files:** `src/config/AppConfig.ts` ~L92 (`pte-fib-listening` commented out of `learningModes`) vs store default `vocabularyBook: 'pte-fib-listening'`; `useAutoPlayController.getVocabularyBookIds()`.
The controller builds its book list from `learningModes`, so `indexOf('pte-fib-listening')` is `-1`, giving "Current book not found in book list", then `stopAutoPlay()` (controller ~L250-254).
**Impact:** A fresh user on the default book with auto-switch enabled reaches end-of-book and autoplay dies.
**Repro:** Fresh profile, Settings, enable "Auto-switch to next book", Play, let it reach the last item.
**Fix:** Make the default book a member of `learningModes`, or derive the default from `learningModes[0]` (single source of truth).

### H4 — `AppConfig` reads `process.env` in the browser bundle
**Files:** `src/config/AppConfig.ts` L162-163, L241-242, L467-468; `src/stores/index.ts:710` (devtools `enabled`).
Vite does not define `process` in the client. The codebase already knows the correct pattern elsewhere: `pollyService.ts:80` and `supabaseClient.ts:17` use `import.meta.env`. Also violates the no-hardcoded-defaults rule (`|| 'us-east-1'`, `: ''`, `: 'development'`).
**Impact:** `VITE_API_BASE_URL` override is dead; any client gate on `build.nodeEnv === 'production'` never fires; devtools disabled even in dev.
**Fix:** Route all client env access through one `getEnvVar()` helper (the `supabaseClient` pattern), `import.meta.env` first, fail loudly if a required var is missing.

### H5 — Book switch with auto-play enabled fails on iOS (no priming inside the gesture)
**File:** `src/components/settings/SettingsPanel.tsx` `handleVocabularyBookChange`.
Calls `audio.startAutoPlay()` after `await loadDataset(...)` but never `backgroundAudioService.primeForUserGesture()`. The Play button path (`useAutoPlayController.handlePlay`) does prime. So the first post-fetch `play()` after a book switch has neither an active user gesture nor a primed element.
**Impact (mobile):** Switching book with auto-play on surfaces the "Premium audio (AWS Polly) may be unavailable" error and stops autoplay.
**Fix:** Call `primeForUserGesture()` synchronously inside the select handler before the await, or do not auto-start without priming.

### H6 — Practice mode (RS/ASQ/WFD) is silently lost on reload
**Files:** `src/components/AppContent.tsx` mount effect; `SettingsPanel.handlePracticeModeChange`; `getPracticeInterfaceType`.
Mount loads only `settings.vocabularyBook`; `handlePracticeModeChange` updates `practiceMode` but never `vocabularyBook`; `getPracticeInterfaceType` requires `vocabulary.mode` to start with `practice-`.
**Impact:** User selects Repeat Sentence, refreshes or relaunches the PWA, reverts to vocabulary with no indication.
**Repro:** Settings, Task Practice, Repeat Sentence, refresh.
**Fix:** On mount, reconcile `practiceType`/`practiceMode` and load the practice dataset when appropriate rather than always loading `vocabularyBook`.

### H7 — PWA cache-buster defeats the data cache and breaks offline datasets
**Files:** `src/services/data/datasetLoader.ts` `resolveDatasetPath` (`?t=${Date.now()}`); `vite.config.ts` workbox `data-cache` (`StaleWhileRevalidate`, keyed by full URL); `vercel.json` (`/data/processed/* max-age=60`).
Every request is a unique URL, so there is never a cache hit; offline loads fail; the 50-entry cache thrashes with duplicate payloads; the 60s HTTP cache is bypassed too (datasets re-download on every book switch).
**Fix:** Drop the `?t=` buster (content is already versioned per deploy), or set workbox `ignoreURLParametersMatching: [/^t$/]`.

### H8 — Volume control does nothing to actual playback (confirmed across every path)
**File:** `src/services/audio/backgroundAudioService.ts` (full read).
`playText`/`resume` set `src` and `playbackRate` but never `audio.volume`. The vocabulary autoplay path plays via `backgroundAudioService` directly (`playBackgroundAndWaitForEnd`), and the practice path routes `TTSEngine.speak` to `speakWithRealAudio` to `backgroundAudioService.playText` with only `languageCode` + `rate`. So no path applies volume. Both the AudioControls slider and the Settings slider bind to `audio.volume`.
**Repro:** Set volume to 10%, play anything, audio stays full volume.
**Fix:** Apply `this.audio.volume` in `playText`/`resume` from a value threaded through from the store, and subscribe to volume changes to update the live element.

### H9 — Stale-closure session leak in `AppContent`
**File:** `src/components/AppContent.tsx` (mount effect, deps `[]`, `exhaustive-deps` disabled ~L157).
The cleanup closes over `currentSessionId` (null at mount), so `sessionManager.completeSession()` on unmount is guarded by a value that is always null and never runs.
**Fix:** Hold the session id in a ref, or split effects so cleanup sees the current value.

---

## MEDIUM

### M1 — Aborted/superseded fetch surfaces a false "Premium audio unavailable" error and kills autoplay
**Files:** `src/components/audio/hooks/useAutoPlayController.ts` L195-206; `src/components/practice/VocabularyList.tsx` `handleItemClick` (~L37).
The catch after `await playBackgroundAndWaitForEnd(...)` unconditionally logs, calls `backgroundAudioService.stop()`, shows the error toast, and calls `audio.stopAutoPlay()`, with no `AbortError` check and no re-check of `isPlaybackActive()` / `effectId`. `handleItemClick` calls `goToItem(index)` with no `stop()`, which re-fires the effect and aborts the in-flight fetch. Clicking a list item mid-fetch during autoplay very likely surfaces the spurious error and stops playback.
**Residual unknown:** whether `backgroundAudioService`'s supersession-abort rejects (false error) or resolves (silently safe). `stop()`-driven aborts resolve cleanly (onStop wins the race); the list-click supersession path was not fully traced. The fix is identical either way.
**Fix:** In the catch, ignore `AbortError` and bail silently when `!isPlaybackActive()` or `currentEffectIdRef.current !== effectId`. Have `handleItemClick` stop audio (or set the superseded flag) before `goToItem`.

### M2 — Difficulty filter with zero matches strands the UI on a fake "Loading vocabulary…" spinner
**Files:** `src/stores/index.ts` `filterByDifficulty`; `AppContent` render branch.
`filterByDifficulty` sets `currentItem = nextDataset[0] ?? null` and never touches `isLoading`; `AppContent` renders the loading spinner when `currentItem` is null. Practice datasets without a `difficulty` field also fall through to empty.
**Fix:** Render an explicit "No items match this difficulty" empty state; do not strand (optionally fall back to `all`).

### M3 — Two auto-play toggles, one inert
**Files:** `AudioControls.tsx:119` ("Auto-play", `audio.autoPlayEnabled` / `setAutoPlay`); `SettingsPanel` ("Auto-play on load", `settings.autoPlay`).
`audio.autoPlayEnabled` is only written/persisted, never read to gate playback (grep-confirmed: `stores/index.ts` L114/121/122/125/647, `types.ts` L23/36). Toggling it does nothing.
**Fix:** Delete `autoPlayEnabled` (and its persistence) or make the controller honour it; unify with `settings.autoPlay`.

### M4 — Practice-mode completion pollutes the real accuracy stat with a placeholder score
**File:** `src/components/practice/RSInterface.tsx` `processRecording`.
Computes a heuristic score from recording duration and calls `onComplete(score >= 70)`, which reaches `progress.markCurrentItemCompleted` and drives `progress.accuracy`. The scoring is explicitly a placeholder ("mockFeedback", "will be replaced with AI analysis"). Scoring AI is out of scope, but it feeds a shared in-scope metric.
**Fix:** Do not mark correct/incorrect (or do not touch accuracy) until real scoring exists.

### M5 — RS reveals the sentence before the user plays or records
**File:** `RSInterface.tsx`.
The sentence card renders whenever `!isRecording`; the "after first play" gating is not implemented (no `hasPlayed` state). Defeats listen-and-repeat.
**Fix:** Gate the sentence display on a `hasPlayed` flag.

### M6 — Two build outputs diverge on data
**File:** `package.json` scripts.
Only `vercel-build:pte` copies `data/processed` into `dist`; plain `build` (used by `deploy:pte` and `vite preview`) does not, so that dist 404s on datasets. `globPatterns: ['**/*.json']` also precaches all ~45 data files when present (heavy).
**Fix:** Make `build` copy data too (or import datasets as modules), and precache only app JSON.

### M7 — `alert()` used for load/reset/clear flows
**Files:** `AppContent.tsx` (~L124); `SettingsPanel` (book/practice load failures, reset, clear cache).
Blocking and inconsistent with the existing `ui.showNotification` toast system.
**Fix:** Route through the toast/notification path.

### M8 — "Clear All Data" nukes auth and misses the real cache
**File:** `SettingsPanel` clear handler.
Calls `localStorage.clear()`, which also clears the Supabase auth token (signs the user out) but does not clear the localforage/IndexedDB TTS cache.
**Fix:** Clear the persist key and the TTS cache explicitly; leave auth or warn.

### M9 — Reset settings does not reload the dataset
**File:** `stores/index.ts` `resetSettings`.
Sets `vocabularyBook` back to default but nothing reloads; the displayed dataset stays until a manual reload.
**Fix:** Trigger a reload after reset.

### M10 — `.single()` on possibly-absent rows
**File:** `syncService.loadProgress`.
`.single()` errors on 0 rows and logs on every new dataset.
**Fix:** Use `.maybeSingle()`.

### M11 — SettingsPanel TTS Voice select is inert
**File:** `SettingsPanel`.
`value="default"` is hardcoded with a single option; the control cannot reflect or change anything.
**Fix:** Remove it or wire a real voice list. (See also the TTSEngine LOW item: it force-nulls a `premium` `ttsVoice` while using premium audio, so the whole voice setting is currently meaningless.)

---

## LOW (correctness / hygiene / engineering-rule violations)

- **TTSEngine stale comments + vestigial browser-synthesis path.** `src/services/audio/TTSEngine.ts` L353 comment ("uses Web Speech API") and ~L365 ("Premium TTS is currently unavailable; always use browser TTS") both contradict the code, which routes everything through `backgroundAudioService` (Polly). `this.synth` is only ever used for `cancel()` in the "already speaking" guard; `synth.speak()` is never called. Also, when `ttsVoice === 'premium'` the code resets it to `null` (~L366) then uses premium audio anyway, an actively misleading setting. Hardcoded `100`ms settle delay (~L390) violates the no-magic-numbers rule. Remove the dead synth path, fix the comments, and either honour or remove the `ttsVoice` setting.
- **Committed AI-agent scratch comment in source.** `AppContent.tsx` ~L135-142 contains an editing note referencing `replace_file_content` / `multi_replace` / line numbers. Remove.
- **Version drift / multiple sources of truth.** `AppConfig.app.version = '3.0.1'` vs `package.json` `3.0.2`; footer shows the stale AppConfig value; `__APP_VERSION__` (defined from `npm_package_version`) is unused. Pick one source.
- **Dead state actions.** `audio.navigateNext` / `navigatePrev` (`stores/index.ts` L126-127, `types.ts` L41-42) and `setCurrentIndex` update only `audio.currentIndex` and have no call sites; `navigateNext` also has no upper bound. Remove (they would desync `progress`/`currentItem` if wired).
- **Dead component.** `PracticeModeSelector` is exported (`practice/index.ts:5`) but never rendered; it only sets settings without loading data (broken if used). Remove or fix.
- **Duplicated hardcoded region.** `'us-east-1'` default in `api/config.ts:59`, `api/premium-tts.ts:26`, `api/audio/generate.ts:217`. Centralise; fail loudly if `AWS_REGION` is unset.
- **Verbose production logging.** `useAutoPlayController` logs on every effect run and playback step (no `import.meta.env.DEV` guard); `AppConfig`, `TTSEngine`, `SettingsPanel`, `backgroundAudioService` log heavily. `no-console` is only a warning. Gate on DEV.
- **`playbackRate` set before media load** in `backgroundAudioService.playText` (some mobile browsers reset it on new media). Consider setting on `loadedmetadata`.
- **Stale/broken Vite aliases** `@ts`, `@stores`, `@utils`, etc. point to `src/ts/...`, which does not exist.
- **Redundant repeat control** (button + switch) in AudioControls; Next button never disables at end of list and `handleNext` does not loop, so it is a dead button on the last item.
- **Stale labels/counts.** `asq` "692" (actual 676), `di-shadowing` "43" (actual 85), "13 books", "14 vocabulary books" are hardcoded copy that drifts from data.
- **Relative vs absolute dataset paths.** `byMode` entries are relative (`data/processed/...`) while the fallback is absolute (`/...`); relative resolution breaks if served under a subpath.

---

## Risky architecture / state coupling

1. **`currentIndex` is duplicated in `audio` and `progress` slices**, and `datasetId` / `vocabularyBook` / `vocabulary.mode` / `progress.activeDatasetId` all encode "which dataset." They stay coherent only because `setDataset` / `goToItem` / `filterByDifficulty` write every copy in one `set`. Any new path that writes one (e.g. the dead `navigateNext`) desyncs the app. There are already two next/prev implementations reading different index copies: `AppContent.handleNext` (uses `progress.currentIndex`, for practice + swipe) and `useAutoPlayController.handleNext` (uses `audio.currentIndex`, for controls + media session). Consolidate to one index and one navigation function.
2. **Autoplay orchestration is a hand-rolled effect-id + shared-boolean cancellation machine** (`autoPlayRef`, `currentEffectIdRef`) mixing closure-captured `vocabulary` with live `useAppStore.getState()` reads. It mostly works but is fragile under rapid state changes, StrictMode, and background transitions. Consider modelling playback as an explicit state machine.
3. **Two audio orchestrators** (`TTSEngine` and `useAutoPlayController`) both drive the single `backgroundAudioService` and both call `setHandlers`. They do not run concurrently today (practice bypasses the controller), but handler ownership is implicit and easy to break.
4. **The Supabase layer was never migrated off the vanilla-JS globals** (H1), the largest structural rot.

---

## Audio reliability — needs real-device testing (cannot verify from code)

- **iOS lock-screen continuous autoplay across items.** Architecture is per-item `fetch`, `src` swap, `play()` after the gesture, primed once with a zero-sample silent WAV (`SILENT_AUDIO_DATA_URI`, data-chunk length 0, which may not actually bless the element on iOS). No `setPositionState`, no artwork. Highest-risk "works on desktop, dies on lock screen" area. Test on a real iPhone; if it fails, switch to a known-good short silent clip and keep the element continuously active.
- **Media Session next/previous on the lock screen** when not actively autoplaying.
- **PWA update behaviour** with `registerType: 'autoUpdate'` + large precache (mid-session reloads).

`WakeLockService` is fine: it re-acquires on `visibilitychange`, the handler is a stable reference (no listener leak). It keeps the screen on while foregrounded; it is complementary to (not a substitute for) the media-session background-audio path when the phone is manually locked.

---

## Test coverage recommendations

Existing tests: `App`, `WordCard`, `AppConfig`, `backgroundAudioService`, `datasetLoader`, `useAutoPlayController`, `stores/index`, plus `utils/validation` and `components/shared` `__tests__`.

Gaps and additions:
- No tests for `SettingsPanel`, `AudioControls`, `AppContent`, `RSInterface` / `ASQInterface` / `WFDInterface` / `VocabTypingInterface`, `TTSEngine`, `syncService`, `autoSyncManager`, `WakeLockService`, `sessionManager`.
- TEST-1: Fix `App.test.tsx`, mock `fetch` / `loadDataset` so the socket-hang-up noise disappears and the loaded-data path is actually asserted.
- Add unit tests for: practice-mode restore-on-reload (H6), auto-switch from the default book (H3), empty-difficulty empty state (M2), volume application (H8), the abort-vs-error catch (M1).
- Add tests proving `syncSetting` / `syncProgress` / `loadProgress` are actually invoked from the app (would have caught H1).
- e2e (Playwright, `tests/e2e`): add flows for book switching, difficulty filtering to empty, practice-mode selection, reload persistence, and media-session controls.

---

## Suggested fix ordering

1. H1 + H2 (sync is a headline feature that silently does nothing).
2. H3, H5, H6 (user-visible breakage on common paths).
3. H8 (volume), M1 (false error), M2 (stuck spinner), high annoyance, low effort.
4. H4, H7 (config/PWA correctness).
5. H9 + the LOW hygiene batch (dead code, stale comments, logging, version drift).

All fixes should honour the project rules: no hardcoded defaults, no magic strings/numbers, single source of truth per concept, explicit operator config, fail loudly.
