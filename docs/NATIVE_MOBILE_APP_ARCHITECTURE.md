# Native Mobile App Architecture

**Status:** Architecture only. No `ios/`, `android/`, or Capacitor config exists in
the repository yet. Nothing in this document has been implemented. The immediate
foundation round is iOS-first: generate and validate the iOS Capacitor shell
before starting Android parity work. Android remains part of the broader
architecture, but it is deferred until the iOS path is ready.

**Relationship to the long-term plan:** `docs/BACKGROUND_AUDIO_LONG_TERM_PLAN.md`
Phases 7-9 state the *goal* (a full native mobile app, comparable to a podcast
app, because a browser/PWA cannot guarantee background audio). This document
is the *how*: framework choice, project structure, the React/native bridge
contract, platform-specific audio session design, and the rollout plan. Phases
7-9 there now point here for detail instead of duplicating it.

**Relationship to the pre-existing app audit:** `docs/AUDIT-app-review-2026-07-22.md`
found several issues in the current web app. This document is not a re-audit
of that list, but four of its findings are load-bearing for native decisions
made below and are cited where relevant (H1: Supabase sync has zero call
sites; H4: `AppConfig` reads `process.env` in the browser bundle; H5: iOS
autoplay priming gap on book switch; H7: PWA cache-buster, since fixed per the
current `resolveDatasetPath` comment). Whether the others are still open was
not re-verified in this round.

---

## 1. Chosen framework and rationale

**Choice: Capacitor**, wrapping the existing React/Vite app. The current
implementation stage is iOS-first, so the first custom native work is Swift.
Kotlin/Android parity stays in the architecture but is deferred. Custom native
plugins handle the parts a WebView genuinely cannot: the background audio
session, lock-screen/notification controls, and OS interruption handling.
Everything else — UI, routing, the Zustand store, the entire
`src/services/audio` queue/cache/recovery stack built out this session,
Supabase, PostHog — runs unchanged inside the WebView.

**Why not React Native.** RN does not render HTML/CSS; every component is
rebuilt against a different view layer. This app's UI surface is large and
mature — nine dedicated CSS files (`variables`, `animations`, `components`,
`style`, `auth`, `analytics`, `responsive`, `shadowing`, `tailwind`) and a
practice-mode component for each of vocabulary, SWT, RS, WFD, ASQ, typing, and
AI pronunciation scoring. Rewriting all of it for a second, RN-only view layer
is a multi-month effort with no corresponding benefit here: the app is
text/audio-driven, not animation- or gesture-heavy, so RN's main advantage
(native-feel complex UI) does not pay for its cost. RN would still need its
own native audio session code for background playback; nothing in this
document changes on that front.

**Why not fully native (separate Swift/Kotlin apps).** This means three
codebases (web, iOS, Android) with the queue/repeat/cache/recovery logic
re-implemented three times, tripling the maintenance and regression-testing
surface built up over `audioQueueEngine.test.ts` (20 tests), `audioCache.test.ts`
(8), `backgroundAudioService.test.ts` (21), and `useAutoPlayController.test.ts`
(16). Not justified at this project's team size.

**Why Capacitor fits this codebase specifically, not just in general.**
`AudioQueueEngine`'s constructor already takes an injectable `audioService:
QueueAudioService` parameter — added for testability, but it is exactly the
seam a native platform needs. A `nativeAudioService.ts` implementing the same
`QueueAudioService`/`BackgroundAudioHandlers` shapes as `backgroundAudioService.ts`
slots in with zero changes to the engine, the cache, the store, or the adapter.
No other framework choice gets this reuse for free; see §10.

---

## 2. Project structure

**`capacitor.config.ts` (illustrative content, not created this round):**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ptetrainer.app', // placeholder; finalize as a real reverse-domain id before store submission
  appName: 'PTE Pronunciation Trainer', // matches the existing PWA manifest name
  webDir: 'dist', // vite build's output directory; must match vite.config.ts's build.outDir
  plugins: {
    // Registered here once the custom plugin (§10) exists under native-plugins/background-audio
  },
};

export default config;
```

```
/
├── capacitor.config.ts              # NEW (foundation round): appId, webDir, plugin config
├── ios/                              # NEW (current foundation round): generated Xcode project
│   └── App/
│       ├── App.xcodeproj
│       ├── App/
│       │   ├── AppDelegate.swift
│       │   ├── Info.plist            # UIBackgroundModes: audio; privacy strings (§8)
│       │   └── capacitor.config.json
│       └── CapApp-SPM/
│           └── Package.swift         # Capacitor 8 Swift Package Manager integration; no Podfile
├── android/                          # DEFERRED: generated in the Android parity track, not iOS stage
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml   # foregroundServiceType="mediaPlayback"; permissions (§8)
│           ├── java/.../MainActivity.kt
│           └── res/
├── native-plugins/                   # NEW: custom Capacitor plugin, one plugin, two platforms
│   └── background-audio/
│       ├── src/
│       │   ├── definitions.ts        # TS interface the plugin implements (mirrors §10's contract)
│       │   └── web.ts                # Web fallback stub (throws "use backgroundAudioService")
│       ├── ios/Plugin/
│       │   └── BackgroundAudioPlugin.swift
│       └── android/src/main/java/.../
│           └── BackgroundAudioPlugin.kt
├── src/
│   └── services/audio/
│       ├── backgroundAudioService.ts  # UNCHANGED. Web-only playback owner (one Audio() element).
│       ├── audioQueueEngine.ts        # UNCHANGED. Platform-agnostic; takes QueueAudioService.
│       ├── audioCache.ts              # UNCHANGED. IndexedDB works the same inside a Capacitor WebView.
│       └── nativeAudioService.ts      # NEW: QueueAudioService adapter over the plugin (§10).
└── src/platform/
    └── audioServiceForPlatform.ts     # NEW: Capacitor.isNativePlatform() ? nativeAudioService : backgroundAudioService
```

Nothing under `ios/`, `android/`, or `native-plugins/` exists yet. The current
foundation round creates `ios/` and `capacitor.config.ts` only. `android/` and
Kotlin plugin files stay documented here so their contracts are not forgotten,
but they must not be generated in the current iOS-first stage.

---

## 3. Mobile scripts

To add to `package.json` in the iOS foundation round (not this architecture round):

```json
{
  "scripts": {
    "cap:sync:ios": "vite build && npx cap sync ios",
    "cap:open:ios": "npx cap open ios",
    "cap:run:ios": "npx cap run ios"
  }
}
```

`cap sync ios` copies the fresh `vite build` output into `ios/App/App/public`,
then updates native iOS dependencies from `capacitor.config.ts`'s plugin list.
With Capacitor 8.4.x, the generated iOS project uses Swift Package Manager via
`ios/App/CapApp-SPM/Package.swift`; there is no CocoaPods `Podfile` in the
generated shell. `cap open ios` launches Xcode for anything that needs the
native IDE (signing, capability toggles, Info.plist edits, running on a real
device). `cap run ios` builds and launches on a connected device or simulator
directly from the CLI, useful for quick iteration once the shell exists.
Android scripts should be added later with the Android parity track, not in the
current iOS foundation round.

---

## 4. Packaging `data/processed` in mobile builds

**Current web mechanism does not carry over.** `data/processed/*.json` (46
files, ~32k vocabulary terms + ~2.5k practice items per the data pipeline's own
report) is served on web via a Vercel rewrite (`vercel.json`: `"source":
"/data/processed/(.*)"`), not through Vite's build output — confirmed by
`publicDir: 'public'` in `vite.config.ts` and the absence of any
`public/data/` directory or static-copy plugin. Capacitor's `webDir` only
bundles what `vite build` actually emits. Left as-is, a mobile build would ship
with zero dataset content, since there is no Vercel in front of the app on a
phone.

**Fix, foundation round:** copy `data/processed/**/*.json` into `public/data/processed/`
as a build step before `vite build` runs (either a small script invoked from
`cap:sync`, or a Vite plugin such as `vite-plugin-static-copy` configured for
this one directory). This makes the dataset content part of the actual app
binary — available offline with certainty, with no dependency on service
worker behavior (see §6). `resolveDatasetPath`'s existing relative-path
resolution (`data/processed/...`, no leading slash for registry-matched ids)
needs no change: once the files exist under `public/`, Vite serves them at the
same relative path in dev and bundles them at the same path in the build,
so `fetch()` calls in `datasetLoader.ts` resolve identically on web and native.

**Update path.** Regenerating datasets (`pnpm run data:pte` /
`scripts/pte-data-pipeline.js`) must run, and its output must be re-copied and
the app rebuilt/resynced, before a new mobile binary ships. There is no
runtime "check for new data" path for bundled content; that would require a
versioned download mechanism, out of scope for this round and not needed at
current content-update frequency.

---

## 5. Env/secrets model

**No new model needed; one existing gap must be closed first.** The audit
round this session confirmed zero server-only secret names (`AZURE_SPEECH_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) appear anywhere in `src/`;
they live only in the Vercel-deployed `api/` serverless functions. Vite's own
convention — only `VITE_`-prefixed env vars are inlined into the client bundle
— already enforces the client/server boundary correctly for both web and a
Capacitor build, since both are built with the same `vite build`.

**The gap:** `docs/AUDIT-app-review-2026-07-22.md` H4 found `AppConfig` reading
`process.env` directly in the browser bundle. `process` does not exist in a
browser or WebView at runtime unless something polyfills it; a config read
that quietly resolves to `undefined` is a silent failure, not a working
fallback. This must be fixed to read exclusively through
`import.meta.env.VITE_*` before native ships an env-dependent value this way —
shipping a mobile binary with a silently-`undefined` config value is worse
than the equivalent web bug, since there is no server to patch and no
same-day redeploy; it needs an app-store release cycle to fix.

**Mobile-specific addition:** `api.baseUrl` (read via
`appConfig.get<string>('api.baseUrl')` throughout `backgroundAudioService.ts`)
is currently relative/same-origin, correct for a page served from the deployed
site. A Capacitor app is not served from that origin, so mobile builds need an
**absolute** base URL baked in via a `VITE_API_BASE_URL` env var set only for
mobile builds (e.g. `https://<production-domain>`), consumed by `AppConfig`'s
existing `api.baseUrl` resolution. No secret is involved; this is routing
configuration, and it is the only client-visible value that differs between
the web and mobile env files.

---

## 6. Native API strategy: Gemini and Azure Speech

Both continue to be called through the existing `api/` serverless endpoints
(e.g. `api/premium-tts.ts`) over HTTPS, using `api.baseUrl` (now absolute,
per §5). No native HTTP client or native SDK is needed for either; a
`fetch()` call from a Capacitor WebView behaves the same as from a browser
tab. This is a deliberate non-goal: routing Gemini/Azure calls through native
code would duplicate request/response handling that already works and is
tested (`backgroundAudioService.test.ts`), for no benefit.

**Failure and offline behavior.** `fetchAudioBlob`/`fetchAudioBase64` already
reject on any failure rather than faking success — a design principle stated
in `backgroundAudioService.ts`'s own header comment, carried through this
session's cache and recovery work. That behavior needs no change for native.
What does need to be explicit for native:

- **Cache-first, offline-tolerant reads.** `audioCache.ts`'s IndexedDB-backed
  storage works unchanged inside a Capacitor WebView (IndexedDB is a standard
  WebView capability on both platforms). A previously-played, cached clip
  plays offline with no network call at all; this is already true today and
  needs no native-specific work.
- **Do not rely on the PWA service worker for *audio* (as opposed to
  *dataset JSON*) offline behavior on native.** The existing
  `vite-plugin-pwa`/Workbox setup precaches build assets and
  StaleWhileRevalidate-caches the dataset JSON `data-cache` (see §4), but
  service worker support inside Capacitor WebViews is materially less
  consistent across iOS/Android versions and WebView engines than in a full
  browser tab. Audio clips already have a dedicated, purpose-built cache
  (`audioCache.ts`); dataset JSON already gets bundled directly per §4. Native
  should not add a third, less reliable offline path on top of those two.
- **A genuine miss while offline** (nothing cached, no network) surfaces
  through the same `'error'` state + `onPlaybackFailed` path the recovery
  round built — an explicit, user-visible failure, not a silent stop. No new
  state is needed; `needs-user-resume` and `error` already cover "blocked" and
  "failed" respectively.

---

## 7. Supabase auth/progress/settings and PostHog on native

**Do not port the current sync behavior uncritically.** `docs/AUDIT-app-review-2026-07-22.md`
H1 found `autoSyncManager.initialize()` has zero call sites — it never runs —
and separately that `syncService`'s setting/progress load functions also have
no call sites. Whether this has since been addressed elsewhere in the app was
not re-verified in this round. Before native ships any progress/settings sync
story, confirm on web first whether sync actually runs; shipping the same dead
path to a second platform doubles the surface of a bug rather than fixing it.
This is a rework item for whoever owns the Supabase sync path, not something
this architecture round resolves.

**What does transfer cleanly, mechanically:**

- Auth and Postgres/Realtime calls over HTTPS work unchanged in a Capacitor
  WebView, the same reasoning as §6.
- **OAuth redirect flows are the one real native gap.** If Supabase auth uses
  a provider redirect (Google/Apple sign-in via a hosted redirect URL) rather
  than a native SDK, a plain WebView redirect can fail or feel broken
  (no consistent way back into the app). The standard Capacitor fix is
  `@capacitor/browser`'s in-app browser (`Browser.open()`) plus a custom URL
  scheme or Universal/App Link to hand control back to the app after the
  provider redirects. If auth today is email/password or magic-link only,
  this does not apply and can be skipped.
- PostHog's HTTPS ingestion works unchanged. Two mobile-specific additions
  worth doing, not blocking: (a) track native `App` plugin lifecycle events
  (`pause`/`resume`) as explicit foreground/background analytics events, since
  a backgrounded WebView does not fire the web `visibilitychange` semantics
  PostHog's web SDK may assume; (b) consider event batching sensitivity to
  metered/poor mobile connections, lower priority than (a).

---

## 8. Permissions and privacy strings

**Microphone.** `PronunciationScoring.tsx` exists in the current app, so
microphone capture is already a real feature, not a hypothetical one.

- iOS: `NSMicrophoneUsageDescription` in `Info.plist`, a specific, honest
  string (e.g. "Used to record your pronunciation so the app can score it
  against the target audio").
- Android: `RECORD_AUDIO` permission, requested at runtime (not install-time)
  on API 23+, with an in-app rationale shown before the OS prompt if the first
  request is denied.

**Background audio (the reason this whole document exists).**

- iOS: `UIBackgroundModes: audio` capability. No separate runtime permission
  prompt — enabling the capability plus a genuine `AVAudioSession` playback
  category is what makes background audio work (see §11).
- Android: `FOREGROUND_SERVICE` and, on API 34+ specifically,
  `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (the media-playback foreground service
  type is a distinct, required manifest declaration, not implied by the
  general `FOREGROUND_SERVICE` permission). `POST_NOTIFICATIONS` (API 33+) is
  required too, since Android mandates a visible notification for any
  foreground service (see §12) and that notification needs the runtime
  notification permission to actually display.

**Not requesting `WAKE_LOCK`.** The existing web `WakeLockService`
(`src/services/device/WakeLockService.ts`) exists to keep the *screen* on
during foreground practice; it is orthogonal to background audio, which by
design continues with the screen off. A correctly-configured Android
foreground service does not need a wake lock to keep audio playing; adding
one would be requesting a permission the background audio path does not
actually need.

**App Store / Play Store review risk from requesting both capabilities
together.** Apps requesting background audio *and* microphone access can draw
extra reviewer scrutiny on both stores. The app description and review notes
should state the genuine, specific reasons for each (continuous listening
practice; pronunciation scoring) rather than leaving reviewers to guess; see
§15.

---

## 9. Playback ownership: browser vs. native, never both

The invariant this whole session's audit rounds have enforced for the web
path — `backgroundAudioService` is the only owner of the one `HTMLAudioElement`
— extends to native as: **exactly one playback owner is active per platform,
decided once at startup, never both.**

Mechanism: Capacitor exposes `Capacitor.isNativePlatform()` /
`Capacitor.getPlatform()`. A small selector (`src/platform/audioServiceForPlatform.ts`
in §2's tree) decides once, at the point `AudioQueueEngine` is constructed,
which `QueueAudioService` implementation to inject:

```ts
import { Capacitor } from '@capacitor/core';
import { backgroundAudioService } from '../services/audio/backgroundAudioService';
import { nativeAudioService } from '../services/audio/nativeAudioService';

export const audioServiceForPlatform = Capacitor.isNativePlatform()
  ? nativeAudioService
  : backgroundAudioService;
```

`queueEngine = new AudioQueueEngine(audioServiceForPlatform)` replaces the
current `new AudioQueueEngine()` default-argument construction in
`useAutoPlayController.ts`. `backgroundAudioService.ensureAudioElement()` (the
one `new Audio()` call, confirmed by the handler-conflict audit to still be
the sole instance in `src/`) is then simply never reached when running as a
native app, since nothing on the native path calls any `backgroundAudioService`
method at all. There is no runtime toggle between the two; the platform check
happens once, and `TTSEngine`'s manual-word-tap path (see the handler-conflict
fix) needs the equivalent platform selection for its own real-audio calls, so
a word tap on native also goes through `nativeAudioService`, not
`backgroundAudioService` — otherwise native builds would have two owners
trying to drive audio through code paths that assume they are the only one.

---

## 10. React/native bridge contract

**Design goal: `nativeAudioService.ts` is a thin adapter, not a new engine.**
It implements the exact `QueueAudioService` shape `AudioQueueEngine` already
depends on (`canResume`, `fetchAudioBlob`, `getLoadedText`, `pause`, `playBlob`,
`playText`, `playTextFromUserGesture`, `resume`, `setHandlers`, `setRate`,
`setVolume`, `stop`) and the same `BackgroundAudioHandlers` callback shape
(`onEnded`, `onError`, `onPlay`, `onPause`, `onStop`, `onNext`, `onPrevious`,
`onSuspended`, `onOwnershipLost`). Every plugin event below exists specifically
to satisfy one of these callbacks; nothing new is invented in
`AudioQueueEngine` for native. This is what makes §1's reuse claim concrete
rather than aspirational.

**Fetching and caching stay in JS, not native.** The plugin does not make its
own HTTP calls or own a cache. `nativeAudioService.fetchAudioBlob()` reuses
the existing fetch path (same `fetchAudioBase64`-equivalent logic, or a shared
extraction of it), and `AudioQueueEngine`'s existing `AudioCache`/prefetch
logic (small window, strict concurrency, stale cancellation, in-flight dedup —
already built and tested this session) decides what to fetch and when. The
plugin receives an already-resolved **local file path** for the current item
(written from the fetched blob to native filesystem storage, since native
media APIs play from a file/URL, not an in-memory JS Blob) plus, per the
existing `PREFETCH_WINDOW = 2`, the next item's metadata so native can prepare
it.

**Commands (JS → native, plugin method calls):**

| Method | Purpose |
|---|---|
| `load(items, startIndex)` | Queue metadata only: `{id, cacheKey, mediaTitle, mediaArtist}[]`. No audio yet. |
| `play(itemId, localAudioPath, options)` | `options: {rate, volume}`. Starts playback of an already-fetched file. |
| `pause()` / `resume()` / `stop()` | Mirrors the web service's methods 1:1. |
| `setRate(rate)` / `setVolume(volume)` | Live updates to the current clip. |
| `prepareNext(itemId, localAudioPath)` | Hands native the next item's file so it can preload for a fast transition; purely advisory, native may ignore it under memory pressure. |

**Events (native → JS, plugin listeners), each mapped to the matching
`BackgroundAudioHandlers` callback `nativeAudioService` calls in response:**

| Native event | Fires when | Maps to |
|---|---|---|
| `ended` | Clip finished naturally | `onEnded` |
| `error` | Native playback failure (bad file, decode error) | `onError` |
| `interrupted` | iOS `AVAudioSession` interruption began / Android audio focus lost (transient or full) | `onSuspended` |
| `ownershipTaken` | Another native audio-owning path (rare on native; mainly present for contract symmetry with web) took the session | `onOwnershipLost` |
| `remotePlay` / `remotePause` / `remoteStop` / `remoteNext` / `remotePrevious` | Lock-screen / notification / Bluetooth button press | `onPlay` / `onPause` / `onStop` / `onNext` / `onPrevious` |
| `routeChanged` | Output device changed (headphones unplugged, Bluetooth connect/disconnect) | No new handler; see §11/§12 for the pause-on-unplug convention. Logged for diagnostics. |
| `appStateChanged` | Foreground/background transition | No playback effect (background continuation is the point); informational only, for analytics per §7. |

Reusing `onSuspended` for both the web "native pause/waiting/stalled event"
case and the native "OS interruption" case is intentional: `AudioQueueEngine`'s
existing `handleSuspended()` → `attemptRecovery()` state machine (suspended →
silent resume attempt → playing, or → needs-user-resume on rejection) is
exactly the right response to *both*. No new engine states are needed for
native.

---

## 11. iOS design

**`AVAudioSession` category.** `.playback` for the background-audio-only case.
`PronunciationScoring.tsx`'s microphone use raises a real question this
architecture round flags rather than resolves: if playing a reference clip and
recording the user's attempt can ever overlap in time, the session needs
`.playAndRecord` (with `.duckOthers`/`.allowBluetooth` options) instead;
if they are always sequential (play, stop, then record), `.playback` with a
mode switch between the two flows is simpler and preferable. Pin this down by
reading the actual scoring flow in the foundation round, not by guessing here.

**Background mode.** `UIBackgroundModes: audio` in `Info.plist` (see §8).
Without a real, continuously-active `AVAudioSession` in `.playback` mode,
Apple can and does reject apps that declare this capability without using it
genuinely — the review notes (§15) should say so explicitly.

**Now Playing / lock-screen metadata.** `MPNowPlayingInfoCenter`, set with
title/artist/artwork/duration/elapsed on every item change and rate/volume
change. This maps directly to the web path's `setMediaMetadata()`
(`navigator.mediaSession.metadata = new MediaMetadata({...})`) — same
information, same update triggers, different API.

**Remote commands.** `MPRemoteCommandCenter` play/pause/next/previous/skip
handlers, each simply forwarding to the plugin's `remotePlay`/`remotePause`/
etc. events (§10). Direct native equivalent of `bindMediaSession()`'s
`setActionHandler` calls on web.

**Interruptions.** `AVAudioSession.interruptionNotification`. On `.began`,
fire the plugin's `interrupted` event (→ `onSuspended`, §10) — this is the
*same* signal shape a phone call, Siri, or an alarm all produce. On `.ended`
with the `.shouldResume` option set, attempt playback again immediately; this
is the *native* trigger for exactly the silent-resume-first behavior
`attemptRecovery()` already implements on web, just arriving as an
`AVAudioSession` callback instead of a DOM `pause` event.

**Route changes.** `AVAudioSession.routeChangeNotification`. On
`.oldDeviceUnavailable` (headphones/Bluetooth unplugged), pause — matching the
platform convention every other iOS audio app follows, so audio does not
suddenly blast from the phone speaker. `.newDeviceAvailable` needs no action;
continue playing through the newly connected route.

---

## 12. Android design

**Foreground service.** A dedicated service declared with
`android:foregroundServiceType="mediaPlayback"` (required on API 29+, and the
specific `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission is required
additionally on API 34+; see §8). This is the mechanism that keeps the process
alive and largely exempt from Doze/battery-saver restrictions while audio is
genuinely playing — the entire reason a foreground service exists rather than
a background one.

**Media session and notification.** `androidx.media3.session.MediaSession` (or
`MediaSessionCompat` if targeting an older `androidx.media` baseline) for
lock-screen and Bluetooth/wearable controls, paired with a persistent
`NotificationCompat.MediaStyle` notification showing title/artist and
play-pause/next/previous actions. The notification is not optional decoration
— Android requires a visible notification for any active foreground service.
Same direct mapping to `bindMediaSession()` as iOS's remote command center.

**Audio focus.** `AudioManager`/`AudioFocusRequest`. On
`AUDIOFOCUS_LOSS_TRANSIENT` (a brief interruption — notification sound,
short prompt), fire `interrupted` (→ `onSuspended`) and resume automatically
on `AUDIOFOCUS_GAIN`, the same silent-resume-first pattern as iOS. On the
non-transient `AUDIOFOCUS_LOSS` (another app, e.g. a music player, took full
focus), pause and do **not** auto-resume — respecting that the other app now
legitimately owns playback is the platform-correct behavior, distinct from a
transient interruption.

**Bluetooth / wired headset.** Android's `AudioManager` handles routing to a
connected device automatically; the one explicit case to handle is
`ACTION_AUDIO_BECOMING_NOISY` (Android's signal for "the output is about to
become the phone speaker unexpectedly," fired on headset unplug/Bluetooth
disconnect) — pause on this broadcast, mirroring iOS's `.oldDeviceUnavailable`
handling in §11.

**Battery saver / Doze.** A correctly-configured foreground media-playback
service is largely exempt from Doze's CPU/network restrictions specifically
because it is playing media — this is the intended, documented behavior, not
a workaround. Network access for *new* fetches (prefetching the next item, a
cache miss) can still be constrained under aggressive battery saver settings;
the app should degrade to the existing "network/cache failure surfaces an
explicit error" path (§6) rather than assume prefetch always succeeds.

---

## 13. Queue persistence and recovery after backgrounding or process death

`AudioQueueEngine.getPersistedPosition()` already exists and already returns
exactly what is needed: `{datasetId, currentIndex, currentItemId, queueMode,
repeatMode, repeatsCompleted, playbackState, updatedAt, lastError}`. No new
engine method is needed for native; only a native-appropriate place to store
and restore that snapshot.

**Storage.** `@capacitor/preferences` (a simple, durable key-value store
backed by `UserDefaults` on iOS and `SharedPreferences` on Android) — durable
across normal backgrounding *and* process death, unlike in-memory JS state,
which process death discards entirely.

**When to persist.** On every meaningful state change is simplest and cheap
(the payload is a handful of primitive fields); at minimum, on the native
`App` plugin's `appStateChange` listener firing with `isActive: false`
(about to background).

**When to restore.** On next launch, before rendering the practice UI: read
the snapshot, verify `datasetId`/`currentItemId` still resolve to a real item
in the current dataset (datasets do get regenerated; a stale id should not
crash restoration), then call `engine.load(items, persistedIndex)` to restore
*position* — deliberately **without** auto-starting playback. Autoplay
without a fresh user gesture is exactly what mobile autoplay policy blocks
(and is why `primeForUserGesture()`/`playTextFromUserGesture()` exist on web
already); a cold app launch is not a user gesture on a specific play action,
so restoring position and waiting for an explicit tap is the correct, and
only reliably working, behavior.

**Process death vs. normal backgrounding, in practice:** Android can kill a
backgrounded process even with an active foreground service under extreme
memory pressure, though this is rare specifically because foreground services
are deprioritized for reclaim; iOS is more likely to keep a genuinely-playing
`UIBackgroundModes: audio` session alive but can still terminate an app that
is backgrounded *without* active playback. Persisting to durable storage
rather than relying on in-memory state is what makes recovery work in the
worst case rather than only the common one.

---

## 14. Simulator / emulator / real-device test strategy and acceptance criteria

**Be honest about simulator/emulator limits up front.** The iOS Simulator does
not accurately reproduce all background-audio behavior, particularly
screen-lock scenarios; the Android Emulator is closer but still not identical
to real hardware for Bluetooth routing and battery-saver behavior. Simulators
are the right tool for fast iteration on logic that is platform-independent;
they are not sufficient evidence that background audio itself works.

**Tier 1 — simulator/emulator (fast iteration, every change).** Queue
sequencing, repeat mode, next/previous, cache/prefetch behavior — all pure JS,
identical regardless of native shell, and already covered by the existing
`audioQueueEngine.test.ts` (20 tests) / `audioCache.test.ts` (8 tests) suites.
Also basic UI and in-app play/pause/next/previous via on-screen controls.

**Tier 2 — real device, per-platform smoke test (every native-affecting
change).** Screen-locked background continuation; lock-screen controls (iOS)
and notification controls (Android) correctly reflect and control the same
queue state as the in-app UI, with no desync.

**Tier 3 — real device, interruption matrix (before each release).** Incoming
phone call during playback; Bluetooth headset connect/disconnect mid-clip;
wired/Bluetooth unplug mid-clip; battery saver / Low Power Mode enabled
mid-session; backgrounding for 30+ minutes then returning; airplane mode
toggled mid-playback (network loss, cache-hit vs. cache-miss cases); force-
killing the app process (Android: remove from the recent-apps switcher) then
relaunching.

**Acceptance criteria** (concrete, testable versions of the existing plan
doc's native success criteria):

- Audio continues for at least 10 minutes with the screen locked, on one real
  iOS and one real Android device.
- Lock-screen/notification play, pause, next, and previous each produce the
  same queue-state change as the equivalent in-app button, verified by reading
  the in-app UI immediately after the remote action.
- An incoming call pauses playback; if the call is declined or ends within a
  few seconds, playback resumes automatically with no tap required (silent
  resume, §11/§12); if resume is rejected, the tap-to-resume UI (built in the
  recovery round) appears.
- Unplugging headphones or disconnecting Bluetooth pauses playback rather than
  continuing through the phone speaker.
- After 30+ minutes backgrounded, returning to the app resumes from the
  correct queue position, not the beginning.
- Force-killing the process and relaunching restores queue *position* (per
  §13) but does not auto-start playback, matching mobile gesture policy.

---

## 15. Migration risks and rollout plan

**Risks:**

- **App/Play Store review rejection risk.** Both stores scrutinize apps
  requesting the background-audio capability without visibly, genuinely using
  it, and additionally scrutinize apps requesting microphone access alongside
  it. Mitigate with specific, honest review notes and privacy strings (§8),
  and by not submitting until Tier 2/3 testing (§14) actually demonstrates the
  capability working on real hardware.
- **Native code divergence.** The Swift/Kotlin plugin and platform-specific
  session/service code (§11, §12) are not covered by the existing 257-test web
  suite and need their own review discipline and, where feasible, native unit
  tests; this is genuinely new maintenance surface that a Capacitor-only
  choice cannot avoid, only minimize (§1).
- **Data pipeline drift.** `data/processed/` mobile packaging (§4) is a build
  step that must stay wired to the existing `scripts/pte-data-pipeline.js` /
  `scripts/validate.js` gate, not a separate, hand-maintained copy that goes
  stale.
- **Carrying forward known web bugs.** §5 (H4, `process.env` in the browser
  bundle) and §7 (H1, dead Supabase sync) are pre-existing, documented gaps
  that a native build would otherwise inherit unexamined. Fixing or explicitly
  deferring each is a precondition for, not a side effect of, native rollout.
- **Scope-creep risk within the native effort itself.** Phases 7-9 in the long
  term plan are large; shipping everything in one attempt before any real
  validation is itself a risk.

**Staged rollout, matching the long-term plan's roadmap items 10-12:**

1. **Foundation round** (next, pending explicit approval per this round's own
   instruction): `npx cap init`, `npx cap add ios android`, verify the
   existing web app renders correctly inside the WebView shell with *no*
   native plugin work yet — proves the Capacitor choice's core assumption
   before investing further.
2. **Native plugin round:** build the custom background-audio plugin (§10-§12)
   for both platforms; get basic background playback working, unreviewed by
   any store, internal builds only.
3. **Bridge integration round:** wire `nativeAudioService.ts` and
   `audioServiceForPlatform` (§9); confirm queue/repeat/recovery logic behaves
   identically to the web test suite's expectations when driven through the
   native adapter instead of `backgroundAudioService`.
4. **Device testing round:** execute §14's full tiered strategy on real
   devices, both platforms.
5. **Release hardening round:** privacy strings and store listings (§8),
   crash/error telemetry for native audio interruptions and resume failures,
   TestFlight / Play internal testing track — internal/limited distribution
   before public release, not a simultaneous first release.
6. **Public release**, only after 4 and 5 both pass.

---

## Appendix: pre-existing findings referenced above

From `docs/AUDIT-app-review-2026-07-22.md`, cited by section above; re-checking
whether each is still open was out of scope for this architecture round.

- **H1** (§7): `autoSyncManager.initialize()` / `syncService` load functions
  have zero call sites — Supabase sync does not run.
- **H4** (§5): `AppConfig` reads `process.env` directly in the browser bundle,
  which does not exist at runtime in a browser/WebView.
- **H5** (§11, implicitly): book switch with autoplay enabled fails on iOS due
  to a missing priming call inside the user gesture — directly relevant to
  the `primeForUserGesture()`/gesture-timing discipline native audio also
  depends on.
- **H7** (§4, §6): a `?t=` cache-buster previously defeated the Workbox data
  cache and broke offline dataset loads; the current `resolveDatasetPath`
  comment states this is fixed (stable URL, no cache-busting query), so this
  one is not treated as open above.
