# Background Audio Long Term Plan

## Problem

Background practice is not fully stable because the app currently behaves like many separate short audio plays:

- fetch one generated clip
- play it
- wait for the clip to end
- delay or advance to the next item
- fetch the next clip

This is fragile in browsers and PWAs, especially in Low Power Mode. The OS can throttle JavaScript timers, pause network requests, revoke wake locks, or suspend the page during gaps between clips.

Native audio apps are more reliable because they run a continuous background audio session or playlist with OS-level background privileges. A web app cannot fully guarantee that behavior, but the design can be made much more robust.

## Long term direction

Build practice playback like a podcast or music playlist, not repeated one-off audio buttons.

## Phase 1: Queue state machine on top of the existing audio service

Evolve `src/services/audio/backgroundAudioService.ts` instead of replacing it from scratch. It already owns one reusable `HTMLAudioElement`, direct user-gesture playback for mobile autoplay policy, Media Session handlers, pause/resume, stop, rate/volume updates, and explicit failure behavior.

Add a queue/state-machine layer that owns practice playback end to end.

Responsibilities:

- maintain the current item, next item, and buffered upcoming clips
- keep using one reusable audio element through the existing service
- expose simple commands: start, pause, resume, next, previous, stop
- own retry and error handling
- own Media Session API metadata and handlers
- report state back to the UI
- preserve the current queue item and item index in app state/storage
- centralize item-to-text and lock-screen metadata resolution so autoplay, manual controls, and background mode use the same path

Recommended states:

- `idle`
- `primed`
- `buffering`
- `playing`
- `paused`
- `suspended`
- `needs-user-resume`
- `error`

The UI should not directly fetch or play individual clips. It should request a practice session queue and let the queue engine handle playback. `useAutoPlayController` should become a thin adapter around this engine rather than the place where playback sequencing lives.

## Queue engine contract

This section is the detailed contract for the queue and state machine layer introduced in Phase 1. It is a design contract only: no engine code is added here, and `backgroundAudioService.ts` and `useAutoPlayController.ts` are unchanged. A future task implements the engine against this contract.

### 1. Queue item shape

The engine never imports `VocabularyItem`, `PracticeItem`, or any other dataset specific type. A single builder function converts a raw dataset item into this flat shape once, when a queue is loaded, reusing the `getItemText`, `getBritishSoundsLike`, and `getLockScreenMetadata` logic that currently lives inside `useAutoPlayController.ts` instead of duplicating it elsewhere.

```ts
interface QueueItem {
  /** Stable for the life of the queue. Uses the source item's own id when
   * present (VocabularyTerm/RepeatSentenceItem/etc already carry an optional
   * id), and otherwise falls back to a deterministic id built from
   * datasetId + index + text, consistent with the "id or content fallback"
   * rule already documented on those dataset types. */
  id: string;

  /** The identifier already used to load this dataset: a VocabularyBookId
   * for vocabulary mode, or the equivalent practice mode/category id for
   * practice mode. Same value already passed to loadDataset() today. */
  datasetId: string;

  /** Position of this item inside the queue's item array at build time. */
  index: number;

  /** Resolved once by the shared builder, mirroring getItemText's existing
   * priority order (fullText, then word, then english, then sentence, then
   * question). Passed straight through as the text argument to
   * playText/playTextFromUserGesture. */
  text: string;

  /** Precomputed by the shared builder using the existing
   * getLockScreenMetadata mapping: mediaTitle is the sounds like text when
   * present, otherwise text; mediaArtist is text when a sounds like value
   * was used, otherwise an empty string. Passed straight through as
   * PlayTextOptions.mediaTitle/mediaArtist. */
  mediaTitle: string;
  mediaArtist: string;

  /** Coarse family, matching the existing DatasetType. */
  itemType: 'vocabulary' | 'practice';

  /** Optional phonetic hint, kept separately from mediaTitle so a future UI
   * can show it on screen even if the lock screen mapping ever changes.
   * Sourced from getBritishSoundsLike's existing lookup order. */
  soundsLike?: string;

  /** Reuses the existing Difficulty union and category values rather than
   * adding a parallel scheme. For practice items, category already doubles
   * as the rs/asq/wfd/swt mode, so no separate "practice mode" field is
   * needed. Kept as plain types here, not the VocabularyCategory/
   * PracticeCategory unions themselves, so the engine has no import
   * dependency on dataset types. */
  difficulty?: 'easy' | 'normal' | 'hard';
  category?: string;

  /** Per item override of the session repeat count
   * (settings.vocabRepeatCount). Absent means use the session setting.
   * Progress through the current item's repeats is runtime/persisted
   * state, not part of the item; see the persistence contract. */
  repeatCount?: number;
}
```

`datasetId` and `index` are both required even though `id` is stable, because `next`/`previous` and bounds checks operate on position inside the currently loaded queue, while `id` is what survives a future reorder or prefetch and is what UI code should key on for things like list highlighting.

### 2. Playback state model

```ts
type PlaybackState =
  | 'idle'
  | 'primed'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'suspended'
  | 'needs-user-resume'
  | 'error';
```

This is the exact list already in Phase 1 above; this section adds the transitions.

| From | To | Trigger |
| --- | --- | --- |
| `idle` | `primed` | `start` called and the current item's text is not resolved yet; the engine calls `primeForUserGesture()` to hold the gesture open, matching `handlePlay`'s existing fallback branch. |
| `idle` / `paused` / `error` | `playing` | `start` called with text already resolved, invoked synchronously inside a user gesture via `playTextFromUserGesture`. The service sets Media Session state to playing as soon as `play()` is called, before it resolves. |
| `primed` | `buffering` | The real item's text becomes available while primed; the engine calls `playText`, which fetches audio. |
| `primed` / `buffering` | `playing` | `playText`'s awaited `audio.play()` resolves. |
| `buffering` / `playing` | `error` | The fetch fails, the response is a fallback/failure payload, or `play()` rejects with anything other than an abort or supersession. The same reject rather than pretend rule `backgroundAudioService` already follows applies to the engine's own state. |
| `buffering` / `playing` | *(no state change)* | The fetch was aborted, or the request was superseded by a newer command before it resolved. Matches the existing AbortError/superseded check in `useAutoPlayController`; must not flip to `error` or fire a playback failed event. |
| `playing` | `paused` | `pause` command. |
| `paused` | `playing` | `resume` command, same item still loaded (`canResume()` true and the loaded text still matches the current item). |
| `paused` | `buffering` | `resume` command where the loaded text no longer matches the current item, because the queue index moved while paused. Treated as a fresh `start` for the current item, matching the existing "changed item is played fresh, not resumed" behavior. |
| `playing` | `suspended` | The browser or OS interrupts playback without an explicit `pause` command: `visibilitychange` to hidden, `pagehide`, a wake lock release, or an audio `pause`/`stalled`/`waiting` event the engine did not itself request. A holding state while the engine decides whether recovery needs a tap. |
| `suspended` | `playing` | The engine attempts a silent resume, for example on `pageshow`/`visibilitychange` back to visible, and the browser allows it. |
| `suspended` | `needs-user-resume` | The silent resume attempt is rejected by autoplay policy. |
| `playing` / `buffering` | `needs-user-resume` | An auto advance to the next item, not inside a user gesture, is blocked by autoplay policy. |
| `needs-user-resume` | `playing` | The user taps the resume prompt; this call must reach `playTextFromUserGesture` or `resume` synchronously inside that tap. |
| `playing` / `buffering` / `primed` / `suspended` / `needs-user-resume` / `error` | `buffering` | `next`/`previous` while the engine's play intent is active, including moving off a failed item. The new item is fetched fresh; no prefetch yet. |
| `idle` / `paused` | *(no state change)* | `next`/`previous` while play intent is not active; only the index and current item move. |
| any state | `idle` | `stop` command. |

Which states need a tap: `needs-user-resume` always does, by definition. The very first `start` of a session effectively needs one too, because `playTextFromUserGesture`/`primeForUserGesture` must be called synchronously inside that tap for mobile autoplay policy; it is the same underlying constraint, just applied at session start instead of mid session recovery. `resume` from `paused` is normally fine from an ordinary button click, since the click itself is a fresh gesture; it only turns into a `needs-user-resume` situation if that `play()` call is rejected. No other state requires a tap on its own.

### 3. Queue commands

`start`, `pause`, `resume`, `next`, `previous`, and `stop` are the only commands the engine exposes, matching the "expose simple commands" responsibility already listed in Phase 1.

| Command | Current audio | In flight fetches | Buffered clips | Current index | Persisted position |
| --- | --- | --- | --- | --- | --- |
| `start` | Text known: `playTextFromUserGesture` synchronously inside the gesture. Text not yet known: `primeForUserGesture` first, then swap in the real item once ready. | None for a direct gesture start; a fetch begins only if the engine falls back to `playText`. | Not used in this task; no prefetching yet. | Confirmed at the requested starting index; unchanged if already there. | Written immediately so a refresh mid start does not lose place. |
| `pause` | `backgroundAudioService.pause()`. | If paused while still `buffering`, before any clip has loaded, the in flight fetch is aborted too, so it cannot start audio after the user already asked to pause. `backgroundAudioService` has no such guard today; the engine adds it. | Unaffected. | Unchanged. | State updated to `paused`; index/id unchanged. |
| `resume` | Same item still loaded and paused: `backgroundAudioService.resume(rate, volume)`, no refetch. Loaded text no longer matches the current item: treated as `start` for the current item instead. | None on a true resume. | Unaffected. | Unchanged. | State updated to `playing`, or `needs-user-resume`/`error` if the resume's `play()` is rejected. |
| `next` | Torn down the same way `backgroundAudioService.stop()` tears it down (abort fetch, pause, clear src, revoke the blob URL), but the engine's own state does not settle at `idle`; it moves on to the next item. | Aborted. | Cleared; this is where a future prefetch buffer would hand off a ready clip instead of a fresh fetch. | Incremented by one, bounded to the dataset length. At the last item this is a no op: the index does not move, and no repeat mode or auto switch books logic runs, matching today's `handleNext`, which only advances inside dataset bounds and never applies the wraparound/auto switch rules that a natural end of clip advance applies. | Updated to the new index/item id immediately. |
| `previous` | Same teardown as `next`. | Aborted. | Cleared. | Decremented by one, bounded at zero, a no op at the first item, matching today's `audio.currentIndex > 0` guard. No wraparound. | Updated to the new index/item id immediately. |
| `stop` | Full `backgroundAudioService.stop()` teardown. | Aborted. | Cleared. | Unchanged. Stopping ends playback, not the session's position in the queue; this matches the plan's own goal of preserving the queue, current item, and playback mode across suspensions, and mirrors how `handleNext`/`handlePrev` already treat stopping the service and moving the index as two separate steps. | Index/id retained; state persisted as `idle`. |

Whether `next`/`previous` actually start playing the new item, or just move the pointer, depends on whether the engine's own play intent was active beforehand: if the queue was `playing`/`buffering`/`primed`, the new item goes through `buffering`/`playing`; if it was `paused` or `idle`, the pointer moves but the item does not start automatically. Today this happens as a side effect of a React effect re running when the index changes; the contract makes it an explicit part of the command instead, which is also the point of moving sequencing into the engine.

### 4. Events and callbacks

The engine's events are a different set from `BackgroundAudioHandlers`. `BackgroundAudioHandlers.onPlay/onPause/onNext/onPrevious` are OS Media Session button taps, not state notifications, and `onEnded`/`onError` are raw DOM events. The engine is the only caller of `backgroundAudioService.setHandlers(...)`, registering its internal handlers once during setup instead of once per item, which removes the need for the current `bgPlayRef`/`bgPauseRef`/`bgNextRef`/`bgPrevRef` ref indirection, and translates them into its own commands and events before anything reaches the UI:

```ts
interface QueueEngineEvents {
  onStateChanged: (payload: {
    state: PlaybackState;
    previousState: PlaybackState;
    itemId: string | null;
    at: number;
  }) => void;

  onItemChanged: (payload: {
    item: QueueItem;
    index: number;
    previousItem: QueueItem | null;
  }) => void;

  onBufferingStarted: (payload: { item: QueueItem; index: number }) => void;

  onClipEnded: (payload: {
    item: QueueItem;
    index: number;
    repeatIndex: number;
    repeatCount: number;
  }) => void;

  onPlaybackFailed: (payload: {
    item: QueueItem;
    index: number;
    error: Error;
    recoverable: boolean;
  }) => void;

  onResumeRequired: (payload: {
    item: QueueItem;
    index: number;
    reason: 'autoplay-blocked' | 'suspended';
  }) => void;
}
```

`onClipEnded` fires once per repeat, not once per item, when `repeatCount` is greater than one, matching the existing per repeat logging in `useAutoPlayController`. `onPlaybackFailed.recoverable` is `false` for every case in this contract, since a genuine failure today stops the whole session (`backgroundAudioService.stop()` plus `audio.stopAutoPlay()`); the field is included now so a later retry feature does not need a payload shape change.

For React/Zustand integration, the engine should expose a `setListeners(events: QueueEngineEvents)` call, named to match the existing `setHandlers` convention, rather than a generic string keyed event emitter, which would reintroduce the kind of loosely typed dispatch this codebase already avoids. A thin Zustand slice subscribes once and mirrors these payloads into store state; components keep reading from the store the same way `useAudioState()`/`useVocabulary()` work today, instead of importing the engine directly.

### 5. Persistence contract

```ts
interface PersistedQueuePosition {
  datasetId: string;
  currentIndex: number;
  currentItemId: string;
  queueMode: 'vocabulary' | 'practice';
  repeatMode: boolean;
  repeatsCompleted: number;
  playbackState: PlaybackState;
  updatedAt: number;
  lastError?: { message: string; at: number };
  retryCount?: number;
}
```

`queueMode` mirrors `itemType` on the queue item and the existing `DatasetType`. `repeatMode` mirrors the existing session level `audio.repeatMode` flag, which loops the whole queue at the end; this is a different concept from `repeatsCompleted`, which tracks progress through the current item's own `repeatCount`.

Rehydration on load does not restore `playbackState` verbatim, because `buffering`, `primed`, and `suspended` describe an in flight operation that has no meaning after a reload:

- `playing`, `buffering`, `primed`, or `paused` restore into `paused`. Inert and safe, and the required resume tap satisfies the mobile gesture rule anyway.
- `needs-user-resume` restores as `needs-user-resume` directly, since it is already an accurate, actionable state.
- `idle` or `error` restore as `idle`.

`lastError` and `retryCount` are markers only in this task. No retry behavior is implemented yet, so an implementation only needs to write and clear these fields, not act on them.

### 6. Integration constraints

- The engine calls the existing `backgroundAudioService` singleton. It never constructs its own `Audio()` element or a second `BackgroundAudioService` instance outside of tests.
- The engine is the only caller of `backgroundAudioService.setHandlers(...)`, called once during engine setup rather than once per item.
- Any command that starts or resumes audio for the first time in a session, or resumes after `needs-user-resume`, must call into `playTextFromUserGesture`/`primeForUserGesture`/`resume` synchronously inside the originating click or tap handler. No `await`, promise, or `setTimeout` may sit between the gesture and that call, or mobile Safari can drop the activation.
- The engine does not resend `rate`/`volume` on every item. It calls `setRate`/`setVolume` only when the underlying settings change, the same subscription pattern `useAutoPlayController` already uses, and lets `backgroundAudioService` keep applying the remembered values to future clips.
- `AbortError` and superseded requests stay silent: no `error` state, no `onPlaybackFailed`. Only a genuine failure enters `error`, matching the existing notification behavior in `useAutoPlayController`.
- `backgroundAudioService.ts` and `useAutoPlayController.ts` are not modified by this contract.
- `useAutoPlayController` becoming a thin adapter is future work: it will build a `QueueItem[]` from the active dataset through the single shared builder, call `engine.load(items, startIndex)` once, and map `handlePlay`/`handlePause`/`handleNext`/`handlePrev` onto `engine.start()`/`pause()`/`next()`/`previous()`, retiring the current effect id ref bookkeeping. None of that is built in this task.

### 7. Non goals

- No queue engine implementation. This section only fixes the contract it must satisfy.
- No prefetching or caching. `next`/`previous` fetch fresh, exactly like today.
- No batch TTS integration.
- No changes to playback UI, `backgroundAudioService.ts`, or `useAutoPlayController.ts`.

## Phase 2: Prefetch and cache audio

While one clip is playing, the app should prepare upcoming clips.

Design:

- start by prefetching the next 1 to 2 clips, then tune toward 3 to 10 only after mobile testing
- limit concurrent prefetches so `/api/premium-tts` is not flooded
- cache clips by normalized text, voice, language, rate, engine, and output format
- store generated clips in IndexedDB or Cache Storage as blobs
- reuse cached clips instead of calling TTS repeatedly
- continue playback from cache when network requests are throttled

This reduces gaps and prevents playback from depending on a live network request for every item.

Existing cache note:

- `src/services/tts/persistentCache.ts` can be used for reference, but it is not enough for long background sessions because it stores base64 in LocalStorage, has a small storage budget, and does not include every playback parameter in the cache key.
- Prefer a new blob-oriented cache for queue playback, or migrate the existing cache to IndexedDB/Cache Storage with versioned keys.

## Audio cache contract

This section is the detailed contract for the audio cache introduced in Phase 2's existing cache note above. It is a design contract only: no cache code is added here, and `backgroundAudioService.ts`, `api/premium-tts.ts`, and `api/audio/generate.ts` are unchanged. A future task implements the cache against this contract.

### 1. Cache purpose

The cache exists to serve queue playback: it lets the queue engine (from the Queue engine contract above) prefetch the next 1 to 2 clips and reuse clips across repeated practice sessions without calling `/api/premium-tts` (`AppConfig.api.endpoints.premiumTts`) for every item. It reduces transition gaps and duplicate synthesis calls; it is not a replacement for that endpoint.

The cache must not create a second playback path. The queue engine remains the single owner of sequencing, and `backgroundAudioService` remains the single owner of the reusable `HTMLAudioElement`, object URLs, Media Session integration, and actual playback. The cache supplies audio to that existing path only.

It is also not related to `/api/audio/generate` (`AppConfig.api.endpoints.audioGenerate`), which is a separate endpoint with its own server side cache in Supabase Storage, keyed on text, voice, and speed. That endpoint is not currently called from any queue, practice, or autoplay code path in this repo; it is out of scope for this contract and untouched by it.

### 2. Storage choice

Recommendation: IndexedDB, storing the synthesized audio as a `Blob` alongside its metadata in one record per cache key. Cache Storage is an acceptable fallback if IndexedDB is unavailable in a given environment, but IndexedDB is the better fit here because the cached value shape in section 4 needs queryable metadata (timestamps, duration) stored next to the blob, which IndexedDB supports natively as a structured record; Cache Storage is shaped around request/response pairs and is a better match for caching whole HTTP responses than for a record with several separate fields.

`persistentTTSCache` (`src/services/tts/persistentCache.ts`) is not sufficient for this purpose, for reasons visible directly in its implementation:

| Gap in `persistentTTSCache` | Effect |
| --- | --- |
| Stores `audioBase64` strings in `localStorage`, not blobs | Base64 inflates the stored size by roughly a third over the raw binary, inside a cache that already limits itself to a 5MB budget (`MAX_STORAGE_SIZE`) to stay well under the browser's per origin `localStorage` quota. |
| Cache key is `${CACHE_VERSION}:${languageCode}:${voiceId}:${text.toLowerCase().trim()}` | No `rate`, `engine`, or `outputFormat` dimension at all; a change in any of those would silently return the wrong cached audio if this key were reused for queue playback. |
| Text normalization is `.toLowerCase().trim()` only | Internal whitespace is not collapsed, unlike the sibling cache key builder already in `api/audio/generate.ts` (`text.toLowerCase().replace(/\s+/g, ' ').trim()`), so two requests that differ only by incidental double spaces would miss each other. |
| `timestamp` is set only in `set()`, never updated in `get()` | Eviction in `evictOldest()` sorts by this single timestamp, so it evicts by age since creation, not age since last use; a frequently replayed clip is just as evictable as one played once and forgotten. |
| Reads and writes go through synchronous `localStorage` calls | Fine for small JSON blobs, but every read blocks the main thread. Audio blobs are larger, and queue prefetching will read more often than the current usage, which fetches a single clip at a time. |

`persistentTTSCache` also wraps an in memory `Map` (`ttsCache`, exported from `src/services/tts.ts`) as a first tier before falling through to `localStorage`. The new cache does not need to reproduce that two tier shape; a single IndexedDB backed cache is enough on its own.

### 3. Cache key contract

```ts
const AUDIO_CACHE_KEY_VERSION = 'v1'; // bump whenever a dimension below changes

interface AudioCacheKeyInput {
  text: string;
  voiceId: string;
  languageCode: string;
  rate: number;
  engine: string;
  outputFormat: string;
}

function buildAudioCacheKey(input: AudioCacheKeyInput): string {
  const normalizedText = input.text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return [
    AUDIO_CACHE_KEY_VERSION,
    input.languageCode,
    input.voiceId,
    input.engine,
    String(input.rate),
    input.outputFormat,
    normalizedText,
  ].join(':');
}
```

Normalization rule for `text`: trim, collapse internal whitespace to a single space, then lowercase. The collapse step is new relative to `persistentTTSCache` but already precedented in `api/audio/generate.ts`'s own key builder. Lowercasing matches both existing cache key builders in this repo and is kept as the default; the one documented exception in TTS engines generally is that some engines read an all caps word as an acronym rather than a normal word. Neither `api/premium-tts.ts` nor the underlying `azureSpeech` synthesis module was read as part of this task to confirm whether Azure AI Speech specifically behaves this way, so this is flagged as a point to verify during implementation rather than settled here. If it does matter, the fix is to stop lowercasing runs of two or more consecutive capital letters rather than abandoning lowercasing generally.

Why `rate`, `engine`, and `outputFormat` are included even though none of them vary today:

- `/api/premium-tts`'s request body (`{ text, voiceId?, languageCode? }`) has no `rate` or `speed` field at all. The `rate` that `backgroundAudioService.setRate()`/`resume(rate)` controls is `HTMLAudioElement.playbackRate`, applied to already loaded audio; `resume()` explicitly does not refetch when only the rate changes on the same item. So `rate` has no effect on the bytes returned by this endpoint today.
- It is still part of the key because the sibling endpoint `api/audio/generate.ts` already accepts and cache keys on a `speed` parameter server side, and the Phase 6 batch endpoint sketch above already includes a `rate` field in its example request. If `/api/premium-tts` or its batch successor ever gains a real rate parameter, the key is already correct with no migration needed; until then this dimension is always the same constant value and costs nothing.
- `engine` is always `'neural'` in `/api/premium-tts`'s response today. It is included for the same forward looking reason: a future tier that is not neural should not collide with cached neural audio under the same key.
- `outputFormat` is not currently negotiable either; default it to whatever `contentType` the synthesis call returns, treated as an opaque string rather than an enum, since only one value exists in practice today.

`voiceId` and `languageCode` are passed through as is; they are already controlled, config driven identifiers (for example `Russell`/`en-AU` in the Phase 6 example), not free text needing normalization.

### 4. Cached value shape

```ts
interface CachedAudioMetadata {
  contentType: string;
  createdAt: number;
  lastAccessedAt: number;
  durationSeconds?: number;
  sourceEndpoint: '/api/premium-tts';
  cacheSchemaVersion: typeof AUDIO_CACHE_KEY_VERSION;
  /** Cache-trace metadata for debugging only; none of these fields change
   * cache identity or queue state. */
  debug: {
    createdBy: 'foreground' | 'prefetch';
    hitCount: number;
    lastCacheEventAt: number;
  };
  /** For debugging and inspection only, not part of key identity: the same
   * audio can legitimately serve multiple queue items that happen to share
   * identical text, voice, language, rate, engine, and output format. */
  itemId?: string;
  datasetId?: string;
}

interface CachedAudioEntry {
  audioBlob: Blob;
  metadata: CachedAudioMetadata;
}
```

`durationSeconds` is optional because it may not be known until the browser decodes the blob; it can be filled in lazily after first playback rather than required at write time. Storing the raw `Blob` directly (IndexedDB supports structured clone of `Blob` values) avoids `persistentTTSCache`'s base64 overhead entirely.

### 5. Read and write behavior

```ts
interface AudioCache {
  get(key: string): Promise<CachedAudioEntry | null>;
  set(
    key: string,
    audioBlob: Blob,
    metadata: Omit<CachedAudioMetadata, 'createdAt' | 'lastAccessedAt'>
  ): Promise<void>;
}
```

- `get(key)` returns the cached entry, updating its `lastAccessedAt` as part of the same read, or `null` on a plain miss. A miss is a normal return value, not a thrown error.
- `set(key, audioBlob, metadata)` is only called after synthesis has actually succeeded. `/api/premium-tts` responds with `{ success: false, error, fallback: true }` on a synthesis failure while still returning a success status code, rather than signaling the failure through the response status; the caller must check `success` before calling `set`, exactly as `backgroundAudioService.ts` already rejects on this same fallback shape today. The cache itself does not need its own duplicate check as long as callers follow this rule, but it should never be handed a fallback payload as if it were audio.
- A stored entry that fails to read back cleanly (a decode error, or a zero byte blob) is deleted and treated as a miss, the same pattern `persistentTTSCache.get()` already follows for a version mismatch or an expired entry, just extended to cover blob integrity rather than only version and age.
- A cache failure must not pretend playback succeeded. A `get()` failure (IndexedDB unavailable, a blocked or aborted transaction) falls through to a miss so the caller fetches from `/api/premium-tts` as if there were no cache at all. A `set()` failure is logged and swallowed, matching `persistentTTSCache.set()`'s existing "do not throw, the rest of the system still works" behavior, so a cache write problem never blocks or invalidates audio that already played successfully.
- The cache coordinator owns `inFlightByKey: Map<string, Promise<CachedAudioEntry>>`. Both foreground playback and prefetch call the same get-or-fetch operation, so simultaneous requests for one key share exactly one `/api/premium-tts` call. The map entry is removed when that promise settles, whether it succeeds, fails, or is aborted.

### 6. Eviction policy

- The first implementation uses `MAX_AUDIO_CACHE_BYTES = 50 * 1024 * 1024` (50 MiB), `MAX_AUDIO_CACHE_ITEMS = 200`, and `MAX_AUDIO_CACHE_ENTRY_BYTES = 2 * 1024 * 1024` (2 MiB). A write that exceeds the per-entry limit is returned for immediate playback but is not persisted. Before every persisted write, evict until both total limits are satisfied.
- Also check `navigator.storage.estimate()` where available as a second, browser reported ceiling, and evict proactively as usage approaches it rather than only reacting after a write already fails on quota.
- Evict using `lastAccessedAt` (section 4), oldest accessed first. This is the direct fix for `persistentTTSCache.evictOldest()`, which only has a creation timestamp to sort by and therefore evicts by age since creation instead of age since last use.
- Version invalidation: bumping `AUDIO_CACHE_KEY_VERSION` (section 3) makes every existing key miss immediately; delete the old schema namespace during the next cache initialization rather than retaining unusable blobs indefinitely. Keep a maximum age as a secondary safeguard too, mirroring `persistentTTSCache`'s 30 day expiry, in case a voice or engine changes upstream without a local version bump.
- Ordinary changes to `voiceId`, `languageCode`, `rate`, `engine`, or `outputFormat` do not require a synchronous full-cache clear because each produces a different key. They do cancel stale prefetch work (section 7). Explicitly clear the cache namespace when the user chooses "clear TTS cache" or when a non-key implementation/settings change can alter generated audio; the latter must also bump `AUDIO_CACHE_KEY_VERSION`.

### 7. Prefetch interaction

- The queue engine checks the cache before fetching. A hit skips the network call to `/api/premium-tts` entirely; a miss proceeds to fetch, then calls `set()` once synthesis succeeds.
- Prefetch starts at the next 1 to 2 clips, matching Phase 2's own stated starting point above, before tuning further only after mobile testing.
- `MAX_PREFETCH_CONCURRENCY = 1` is a strict initial limit. Current-item work always has priority; a prefetch waits or yields rather than delaying current-item playback, and a prefetch failure never fails the current item.
- In flight fetches are tracked separately from the persisted cache, for example as an in memory `Map` from cache key to the pending promise, so a prefetch already underway for a key is not started a second time, and so a `next`/`previous` command that lands on an item mid prefetch reuses that same pending promise instead of issuing a duplicate request.
- Cancel prefetch jobs that are no longer in the next 1 to 2 clip window when the queue changes. Cancel all prefetch jobs when the user stops playback, the dataset changes, or any setting that participates in the cache key changes. If a pending prefetch becomes the current item, hand it off to foreground playback instead of cancelling and refetching it.
- Cancelling a prefetch must not cancel currently playing audio. These are two independent abort paths: the Queue engine contract's command table above already scopes `next`/`previous`'s abort behavior to the current or in flight item being left, never to a separate prefetch running for a different item.
- Prefetch only fills the cache or an in-memory ready-clip buffer. It never changes the current item, repeat counter, queue index, playback state, persisted queue position, or Media Session metadata by itself.
- IndexedDB and Cache Storage reads are both asynchronous, which matters against the Queue engine contract's synchronous gesture requirement (no `await` between a tap and `play()`). Prefetch's job is to resolve the next item's blob into memory, as a ready object URL, before it is needed, so that when the queue auto advances there is nothing left to await. A cold cache miss on the very first `start` of a session, or on recovery from `needs-user-resume`, is unaffected by any of this and falls back to today's direct fetch path exactly as it does without a cache.

### 8. API interaction

- `/api/premium-tts` (`AppConfig.api.endpoints.premiumTts`) remains the only single clip source this cache fronts.
- `/api/audio/generate` (`AppConfig.api.endpoints.audioGenerate`) is untouched; as noted in section 1, it is not currently called from any queue or practice playback path.
- Batch TTS (Phase 6) is future work. The key contract in section 3 already has room for `rate`, `engine`, and `outputFormat` so a future batch response can populate this same cache without a key migration when that work happens.
- `/api/premium-tts` has two response shapes today: a JSON body (`POST`, or `GET` without `format=audio`) carrying `audioBase64` that must be decoded to a `Blob` before it can be cached, and a direct binary response (`GET` with `format=audio`) that can be fetched and cached as a `Blob` directly. Decode the JSON path's base64 to a `Blob` before storing so the cached value shape in section 4 stays uniform no matter which response path produced it.
- The browser cache calls the app's `/api/premium-tts` endpoint only. It must never call Azure Speech directly or expose `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `SUPABASE_SERVICE_ROLE_KEY`, or any other server-only credential to client code or persisted cache metadata.

### 9. Non goals

- No IndexedDB or Cache Storage implementation yet.
- No queue-engine implementation in this task.
- No UI changes.
- No batch TTS integration yet.
- No replacement for `backgroundAudioService` or a second playback service.
- No changes to `backgroundAudioService.ts`.
- No changes to the existing `localStorage` cache (`ttsCache` in `src/services/tts.ts`, `persistentTTSCache` in `src/services/tts/persistentCache.ts`) unless a future task documents an explicit migration; this contract defines a new, separate cache rather than modifying those in place.
- No changes to `api/audio/generate.ts` or its Supabase Storage cache.
- No pronunciation-data changes or edits to `docs/PRONUNCIATION_DATA_AUDIT_2026-07-24.md`.

### 10. Acceptance criteria

- [ ] The future implementation has one versioned cache-key builder containing normalized text, `voiceId`, `languageCode`, `rate`, `engine`, `outputFormat`, and the cache schema version.
- [ ] Cached entries store a raw audio `Blob`, content type, creation/access timestamps, optional duration, `/api/premium-tts` as their source endpoint, and cache hit/miss trace metadata.
- [ ] A hit serves the blob without calling `/api/premium-tts`; a miss validates the TTS response before persisting it; corrupt entries are deleted and treated as misses; failed TTS payloads are never cached as audio.
- [ ] Foreground playback and prefetch dedupe equal in-flight cache keys, while current-item playback remains higher priority than prefetch.
- [ ] The cache enforces the documented byte/item limits, LRU eviction, expiry, schema invalidation, and explicit clear behavior.
- [ ] Prefetch is limited to the next 1 to 2 clips and one concurrent request, is cancelled for the documented lifecycle changes, never blocks the current item, and never advances queue state itself.
- [ ] The design explains why the existing LocalStorage/base64 cache is insufficient and preserves the queue-engine plus `backgroundAudioService` playback boundary.
- [ ] Azure Speech credentials remain server-only behind `/api/premium-tts`.
- [ ] This task changes no source code or unrelated documentation, including pronunciation data and its audit document.

## Phase 3: Playlist style playback

Use one reusable audio element as a continuous queue player.

Behavior:

- when clip A starts, clip B should already be fetched
- when clip A ends, immediately swap to clip B
- avoid long silent gaps
- keep the browser aware that audio playback is still active
- save exact queue position after every item
- make repeat count, next/previous, repeat mode, difficulty filters, and auto-switch-books part of the queue rules instead of React effect timing

This makes the app behave more like a continuous audio session.

## Phase 4: Background recovery UX

Even with a better design, the browser or OS may still suspend playback. This phase is required for iOS/PWA and Low Power Mode reliability, not just a polish step.

Add recovery handling for:

- `visibilitychange`
- `pagehide`
- `pageshow`
- audio `pause`
- audio `error`
- audio `stalled` and `waiting`
- wake-lock release
- failed autoplay resume

When playback is blocked, show a clear prompt:

> Tap to resume practice audio

The app should preserve the queue, current item, and playback mode so the user can resume cleanly.

Recovery behavior should distinguish:

- user pause: stay paused and do not show an error
- browser/OS suspension: enter `needs-user-resume`
- network/cache failure: enter `error` with a clear retry path
- stale playback request superseded by navigation or next/previous: cancel quietly

## Phase 5: Background Practice Mode

Add a dedicated mobile/background mode.

Behavior:

- larger prefetch window
- shorter gaps between clips
- fewer UI updates during playback
- stronger session persistence
- explicit warning when Low Power Mode may interrupt playback
- visible resume prompt when the page is suspended

This mode should prioritize playback continuity over rich foreground UI updates.

This mode should still use the same queue engine as foreground autoplay. Avoid a second playback implementation.

## Phase 6: Batch TTS API

Add a server endpoint that accepts multiple texts and returns multiple generated audio clips.

Benefits:

- fewer network requests
- faster queue warmup
- less chance of throttling between clips
- easier pre-generation for whole practice sessions
- better control over server-side rate limits and cache writes

Example:

```json
{
  "items": [
    { "id": "item-1", "text": "First sentence" },
    { "id": "item-2", "text": "Second sentence" }
  ],
  "voice": "Russell",
  "languageCode": "en-AU",
  "rate": 1
}
```

Implementation notes:

- Keep the existing `/api/premium-tts` single-item path for manual playback and fallback.
- Add a batch endpoint only after the queue API and cache keys are stable.
- Return per-item success/error results so one failed synthesis does not fail the entire queue warmup.
- Consider server-side cache integration before increasing the client prefetch window.

## Phase 7: Native wrapper if required

For Spotify or podcast level reliability, a native app or native wrapper is the strongest solution.

Options:

- Capacitor
- React Native
- fully native iOS and Android

Native apps can request real background audio privileges. A PWA cannot fully guarantee continuous background execution, especially in Low Power Mode.

## Recommended roadmap

1. Add the queue state machine around the existing `backgroundAudioService`.
2. Move autoplay sequencing out of `useAutoPlayController` into the queue engine.
3. Add next-clip prefetch with a small window and strict concurrency limits.
4. Add persistent blob caching with complete, versioned cache keys.
5. Convert autoplay to playlist style playback.
6. Add suspension detection and tap-to-resume UX.
7. Add Background Practice Mode using the same queue engine.
8. Add batch TTS generation if prefetch warmup still creates too many requests or gaps.
9. Consider a native wrapper only if web/PWA reliability is still not enough.

## Success criteria

- Playback does not fetch audio one item at a time during normal autoplay.
- The next clip is ready before the current clip ends.
- The app can resume from the exact queue position after suspension.
- Low Power Mode interruptions show a clear recovery prompt.
- Manual foreground practice and background practice use the same queue engine.
- Mobile/PWA testing confirms fewer stops during long sessions.
- Average gap between clips is low enough that playback feels continuous.
- Cache hit rate improves across repeated practice sessions.
- Playback failures, autoplay-blocked events, and resume outcomes are logged so reliability can be measured.
- Next/previous lock-screen controls stay in sync with the queue and visible item.
