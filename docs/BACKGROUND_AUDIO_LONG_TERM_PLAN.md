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

## Phase 1: Audio queue engine

Create one central audio queue service that owns playback.

Responsibilities:

- maintain the current item, next item, and buffered upcoming clips
- control one reusable audio element
- expose simple commands: start, pause, resume, next, previous, stop
- own retry and error handling
- own Media Session API metadata and handlers
- report state back to the UI

Recommended states:

- `idle`
- `primed`
- `buffering`
- `playing`
- `paused`
- `suspended`
- `needs-user-resume`
- `error`

The UI should not directly fetch or play individual clips. It should request a practice session queue and let the engine handle playback.

## Phase 2: Prefetch and cache audio

While one clip is playing, the app should prepare upcoming clips.

Design:

- prefetch the next 3 to 10 clips
- cache clips by text, voice, language, rate, and engine
- store generated clips in IndexedDB or Cache Storage
- reuse cached clips instead of calling TTS repeatedly
- continue playback from cache when network requests are throttled

This reduces gaps and prevents playback from depending on a live network request for every item.

## Phase 3: Playlist style playback

Use one reusable audio element as a continuous queue player.

Behavior:

- when clip A starts, clip B should already be fetched
- when clip A ends, immediately swap to clip B
- avoid long silent gaps
- keep the browser aware that audio playback is still active
- save exact queue position after every item

This makes the app behave more like a continuous audio session.

## Phase 4: Background recovery UX

Even with a better design, the browser or OS may still suspend playback.

Add recovery handling for:

- `visibilitychange`
- `pagehide`
- `pageshow`
- audio `pause`
- audio `error`
- wake-lock release
- failed autoplay resume

When playback is blocked, show a clear prompt:

> Tap to resume practice audio

The app should preserve the queue, current item, and playback mode so the user can resume cleanly.

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

## Phase 6: Batch TTS API

Add a server endpoint that accepts multiple texts and returns multiple generated audio clips.

Benefits:

- fewer network requests
- faster queue warmup
- less chance of throttling between clips
- easier pre-generation for whole practice sessions

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

## Phase 7: Native wrapper if required

For Spotify or podcast level reliability, a native app or native wrapper is the strongest solution.

Options:

- Capacitor
- React Native
- fully native iOS and Android

Native apps can request real background audio privileges. A PWA cannot fully guarantee continuous background execution, especially in Low Power Mode.

## Recommended roadmap

1. Build the central audio queue engine.
2. Add prefetch and persistent clip caching.
3. Convert autoplay to playlist style playback.
4. Add suspension detection and tap-to-resume UX.
5. Add Background Practice Mode.
6. Add batch TTS generation.
7. Consider a native wrapper only if web/PWA reliability is still not enough.

## Success criteria

- Playback does not fetch audio one item at a time during normal autoplay.
- The next clip is ready before the current clip ends.
- The app can resume from the exact queue position after suspension.
- Low Power Mode interruptions show a clear recovery prompt.
- Manual foreground practice and background practice use the same queue engine.
- Mobile/PWA testing confirms fewer stops during long sessions.
