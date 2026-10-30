/**
 * BackgroundAudioService
 *
 * Real-audio playback for practice modes. This service plays generated audio
 * through a single reusable HTMLAudioElement instead of browser speech
 * synthesis, which is less reliable and can be throttled by browsers.
 *
 * Audio is fetched from the existing premium TTS endpoint and
 * played as a Blob URL. Voice, engine, language and output format come from
 * AppConfig, so nothing is hardcoded here. If audio cannot be fetched or
 * played, playText rejects so the caller can surface an error or fall back
 * explicitly; this service never silently pretends background playback worked.
 */

import { appConfig } from '../../config/AppConfig';
import {
  createPlaybackTimeoutError,
  createUnplayableAudioError,
  isAbortError,
} from './playbackErrors';

// A short silent WAV loop. It is started synchronously inside a user gesture and
// kept muted until the real Azure MP3 is ready. Mobile browsers, especially iOS
// Safari/PWA mode, can still reject a later play() if the primed element was
// paused before the async fetch completed.
const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

export interface BackgroundAudioHandlers {
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  /** Fires when the element pauses, stalls, or starts waiting for data
   * without this service itself having called pause() or stop(): a browser
   * or OS level interruption (backgrounding, Low Power Mode, a dropped
   * connection mid-buffer), not a user or app initiated pause.
   *
   * info.deferRecovery, native only: true when this suspension came from an
   * AVAudioSession interruption beginning, where an immediate resume() retry
   * would just fail (the session is still interrupted) and onInterruptionEnded
   * below is coming with the actual "safe to retry now" answer. Web callers
   * never pass this, so a caller that ignores it keeps today's immediate
   * retry behavior unchanged. */
  onSuspended?: (info?: { deferRecovery?: boolean }) => void;
  /** Native only. Fires once AVAudioSession reports the interruption that
   * caused onSuspended has ENDED, with shouldResume reflecting whether iOS
   * says reactivating the session now will actually succeed. onSuspended
   * itself fires early (on the interruption's began signal, before iOS has
   * decided whether resume is safe), so a caller retrying resume() from
   * onSuspended alone is guessing at timing; this is the authoritative
   * follow up signal for a caller that wants to defer a real resume attempt
   * until iOS confirms it is safe rather than retrying blind. */
  onInterruptionEnded?: (shouldResume: boolean) => void;
  /** Fires on the PREVIOUSLY registered handlers when a different caller
   * calls setHandlers(), taking over the shared element. There is exactly
   * one audio element and exactly one active handler set at a time, so a
   * caller that starts its own playback (a manual word tap, for example)
   * necessarily displaces whoever was listening before (a running autoplay
   * queue, for example). This lets the displaced caller react correctly
   * (settle a pending promise, pause its own state) instead of silently
   * going stale with no way to tell its handlers stopped receiving events. */
  onOwnershipLost?: () => void;
}

export interface PlayTextOptions {
  voiceId?: string;
  engine?: 'standard' | 'neural';
  languageCode?: string;
  rate?: number;
  /** Output volume in the range [0, 1]. Callers pass the store's audio volume. */
  volume?: number;
  /** Optional lock-screen/title-row text. Defaults to the spoken text. */
  mediaTitle?: string;
  /** Optional lock-screen second-row text. Defaults to the configured app name. */
  mediaArtist?: string;
}

interface PremiumTtsResponse {
  success: boolean;
  fallback?: boolean;
  error?: string;
  data?: {
    audioBase64: string;
    contentType: string;
  };
}

export class BackgroundAudioService {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private currentText: string | null = null;
  private currentRate: number | null = null;
  private currentVolume: number | null = null;
  private primeGeneration = 0;
  private handlers: BackgroundAudioHandlers = {};
  private fetchController: AbortController | null = null;
  private mediaSessionBound = false;
  /** Set immediately before this service itself calls audio.pause(), and
   * consumed by the native 'pause' listener below. Left false, a native
   * pause event means the browser or OS paused the element out from under
   * us, not something we asked for. */
  private expectingPause = false;
  private expectedPauseToken = 0;
  private suppressSuspensionEvents = false;
  private sourceLoadToken = 0;
  private playbackToken = 0;
  private endFallbackTimer: number | null = null;

  /** True when this environment can support real-audio background playback. */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof Audio !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
    );
  }

  /** True when a clip is loaded and paused mid-playback, so it can be resumed. */
  canResume(): boolean {
    return (
      !!this.audio &&
      this.currentText !== null &&
      this.audio.paused &&
      !this.audio.ended
    );
  }

  /** The text of the currently loaded clip, or null when nothing is loaded. */
  getLoadedText(): string | null {
    return this.currentText;
  }

  /**
   * Prepare the reusable audio element inside a user gesture so a later,
   * post-fetch play() is not blocked by mobile autoplay policy. Best-effort:
   * if the browser still blocks it, the real play() in playText rejects and the
   * caller surfaces a clear error, so background mode is never faked.
   */
  primeForUserGesture(): void {
    if (!this.isSupported()) return;
    const audio = this.ensureAudioElement();

    // Priming must not leave the service believing a real clip is loaded. Clear
    // the previous clip state first so canResume() is false and getLoadedText()
    // is null while the element points at the silent priming source.
    this.releaseObjectUrl();
    this.currentText = null;

    // Tag this priming attempt. A later playText()/stop() bumps the generation.
    const generation = ++this.primeGeneration;

    try {
      audio.loop = true;
      audio.muted = true;
      this.expectTransientNativePause();
      audio.src = SILENT_AUDIO_DATA_URI;
      const played = audio.play();
      if (played && typeof played.then === 'function') {
        played.catch(() => {
          if (this.primeGeneration === generation && this.audio?.src === SILENT_AUDIO_DATA_URI) {
            this.audio.loop = false;
            this.audio.muted = false;
          }
          /* policy blocked priming; the real play() will fail loud */
        });
      }
    } catch {
      /* ignore priming errors; a real play() will surface any problem */
    }
  }

  /**
   * Registers the active handler set, taking over from whoever previously
   * called setHandlers(). There is only ever one active set: this service
   * does not track callers by identity, since the audio element itself can
   * only play one thing at a time, so only one caller's lifecycle events
   * (onEnded, onSuspended, and so on) are ever meaningful at once. If a
   * different handlers object was previously registered, its
   * onOwnershipLost fires first, so that caller can react (settle a pending
   * promise, pause its own state) rather than silently losing its handlers
   * with no signal. A caller re-registering the exact same object (rare;
   * none of today's callers do this) does not trigger it against itself.
   */
  setHandlers(handlers: BackgroundAudioHandlers): void {
    const previous = this.handlers;
    if (previous !== handlers) {
      previous.onOwnershipLost?.();
    }
    this.handlers = handlers;
    this.bindMediaSession();
  }

  /**
   * Fetches and decodes audio for `text` without touching the shared audio
   * element or Media Session. Exposed so callers such as the audio cache can
   * obtain a blob to store, independent of playText()'s side effects. Does
   * not manage its own AbortController; pass a signal to make a given call
   * cancellable, or omit one for a fire and forget prefetch.
   */
  async fetchAudioBlob(
    text: string,
    options: PlayTextOptions = {},
    signal?: AbortSignal
  ): Promise<{ blob: Blob; contentType: string }> {
    if (!text || !text.trim()) {
      throw new Error('Cannot play empty text in background audio mode');
    }
    const { audioBase64, contentType } = await this.fetchAudioBase64(text, options, signal);
    const blob = this.base64ToBlob(audioBase64, contentType);
    this.assertPlayableBlob(blob);
    return { blob, contentType };
  }

  /**
   * Plays an already obtained blob (from the audio cache, or a prior
   * fetchAudioBlob() call) through the shared reusable element. Fetches
   * nothing itself; playText() below is the fetch-then-play composition of
   * fetchAudioBlob() and this method, and callers with their own blob (a
   * cache hit) can call this directly to skip the network entirely.
   */
  async playBlob(text: string, blob: Blob, options: PlayTextOptions = {}): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Background audio is not supported in this environment');
    }
    if (!text || !text.trim()) {
      throw new Error('Cannot play empty text in background audio mode');
    }

    // Checked before anything is torn down. This method is also reached with a
    // blob the caller supplied (a cache hit, a prior fetchAudioBlob) rather
    // than one this service just validated, and every step below is
    // destructive: it supersedes the pending fetch, revokes the previous clip's
    // object URL and overwrites the element's source. Discovering an unusable
    // blob after all that has already destroyed a clip that was playing fine,
    // for a replacement that was never going to play.
    this.assertPlayableBlob(blob);

    // A real playback supersedes any in-flight priming or fetch, the same as
    // playText's existing guarantee.
    this.primeGeneration++;
    this.abortPendingFetch();

    const blobUrl = URL.createObjectURL(blob);
    const audio = this.ensureAudioElement();
    const playbackToken = ++this.playbackToken;
    this.clearEndFallbackTimer();
    this.releaseObjectUrl(); // revoke the previous clip before swapping src
    this.objectUrl = blobUrl;
    this.currentText = text;
    audio.loop = false;
    audio.muted = false;
    const sourceLoadToken = this.beginIntentionalSourceLoad();
    audio.src = blobUrl;

    if (typeof options.rate === 'number') {
      this.currentRate = options.rate;
    }
    if (this.currentRate !== null) {
      audio.playbackRate = this.currentRate;
    }

    if (typeof options.volume === 'number') {
      this.currentVolume = options.volume;
    }
    if (this.currentVolume !== null) {
      audio.volume = this.currentVolume;
    }

    this.setMediaMetadata(text, options);

    try {
      await audio.play();
      this.endIntentionalSourceLoad(sourceLoadToken);
      this.scheduleEndFallback(playbackToken);
      this.setPlaybackState('playing');
    } catch (error) {
      this.endIntentionalSourceLoad(sourceLoadToken);
      throw error instanceof Error ? error : new Error('Background audio playback failed');
    }
  }

  /**
   * Fetch audio for `text` and start playback on the reusable element.
   * Resolves once playback has started. Rejects if the audio cannot be fetched
   * or played, so the caller can fall back to browser TTS explicitly.
   */
  async playText(text: string, options: PlayTextOptions = {}): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Background audio is not supported in this environment');
    }
    if (!text || !text.trim()) {
      throw new Error('Cannot play empty text in background audio mode');
    }

    // Disarm priming and any earlier fetch immediately, before this attempt's
    // own async work starts, so a deferred priming pause cannot fire against
    // this clip while the fetch below is in flight.
    this.primeGeneration++;
    this.abortPendingFetch();
    const controller = new AbortController();
    this.fetchController = controller;

    const { blob } = await this.fetchAudioBlob(text, options, controller.signal);
    if (this.fetchController === controller) {
      this.fetchController = null;
    }
    await this.playBlob(text, blob, options);
  }

  /**
   * Start real audio directly from the API URL inside the user's tap/click.
   * Mobile Safari/PWA mode is stricter than desktop: a later play() after an
   * async fetch can be blocked even if a silent clip was primed. Assigning the
   * real MP3 URL and calling play() synchronously keeps the activation attached
   * to the actual media element.
   */
  playTextFromUserGesture(text: string, options: PlayTextOptions = {}): Promise<void> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('Background audio is not supported in this environment'));
    }

    if (!text || !text.trim()) {
      return Promise.reject(new Error('Cannot play empty text in background audio mode'));
    }

    this.primeGeneration++;
    this.abortPendingFetch();

    const audio = this.ensureAudioElement();
    const playbackToken = ++this.playbackToken;
    this.clearEndFallbackTimer();
    this.releaseObjectUrl();
    this.currentText = text;
    audio.loop = false;
    audio.muted = false;
    const sourceLoadToken = this.beginIntentionalSourceLoad();
    audio.src = this.buildDirectAudioUrl(text, options);

    if (typeof options.rate === 'number') {
      this.currentRate = options.rate;
    }
    if (this.currentRate !== null) {
      audio.playbackRate = this.currentRate;
    }

    if (typeof options.volume === 'number') {
      this.currentVolume = options.volume;
    }
    if (this.currentVolume !== null) {
      audio.volume = this.currentVolume;
    }

    this.setMediaMetadata(text, options);

    try {
      const played = audio.play();
      this.setPlaybackState('playing');
      return played.then(
        () => {
          this.endIntentionalSourceLoad(sourceLoadToken);
          this.scheduleEndFallback(playbackToken);
        },
        (error: unknown) => {
          this.endIntentionalSourceLoad(sourceLoadToken);
          throw error instanceof Error ? error : new Error('Background audio playback failed');
        }
      );
    } catch (error) {
      this.endIntentionalSourceLoad(sourceLoadToken);
      return Promise.reject(error instanceof Error ? error : new Error('Background audio playback failed'));
    }
  }

  /** True when the requested text is already loaded and actively playing. */
  isPlayingLoadedText(text: string): boolean {
    return !!this.audio &&
      this.currentText === text &&
      !this.audio.paused &&
      !this.audio.ended;
  }

  pause(): void {
    this.clearEndFallbackTimer();
    this.expectNativePause();
    this.audio?.pause();
    this.setPlaybackState('paused');
  }

  async resume(rate?: number, volume?: number): Promise<void> {
    if (!this.audio) return;
    if (typeof rate === 'number') {
      this.currentRate = rate;
    }
    if (this.currentRate !== null) {
      this.audio.playbackRate = this.currentRate;
    }
    if (typeof volume === 'number') {
      this.currentVolume = volume;
    }
    if (this.currentVolume !== null) {
      this.audio.volume = this.currentVolume;
    }
    await this.audio.play();
    this.setPlaybackState('playing');
    // Rearm the missed-ended watchdog from the current position. Without
    // this, a clip that gets interrupted and resumed keeps whatever fallback
    // timer (or none) was scheduled at the original play() call, so a later
    // missed native "ended" event for the remainder of this clip has no
    // protection.
    this.scheduleEndFallback(this.playbackToken);
  }

  /**
   * Set the playback rate for the current and future clips. This makes the
   * global speed slider apply immediately while a real-audio clip is playing.
   */
  setRate(rate: number): void {
    this.currentRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  /**
   * Set the output volume for the current and future clips. Applied live to the
   * loaded element so a store volume change takes effect mid-playback. The
   * caller (store) is the single source of truth and clamps to [0, 1].
   */
  setVolume(volume: number): void {
    this.currentVolume = volume;
    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  stop(): void {
    this.abortPendingFetch();
    this.playbackToken++;
    this.clearEndFallbackTimer();
    // Disarm any in-flight priming pause so it cannot fire after a reset.
    this.primeGeneration++;
    if (this.audio) {
      this.expectNativePause();
      this.audio.pause();
      this.audio.loop = false;
      this.audio.muted = false;
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.releaseObjectUrl();
    this.currentText = null;
    this.setPlaybackState('none');
    this.handlers.onStop?.();
  }

  // ---- internals ----

  private ensureAudioElement(): HTMLAudioElement {
    if (this.audio) return this.audio;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.addEventListener('ended', () => this.handleEnded());
    audio.addEventListener('error', () => {
      this.clearEndFallbackTimer();
      this.handlers.onError?.(new Error('Background audio element reported an error'));
    });
    audio.addEventListener('pause', this.handleNativePause);
    audio.addEventListener('waiting', this.handleStalled);
    audio.addEventListener('stalled', this.handleStalled);

    this.audio = audio;
    return audio;
  }

  /** The element paused; expectingPause tells us whether pause()/stop() asked
   * for it. If neither did, the browser or OS paused it out from under us. */
  private handleNativePause = (): void => {
    const wasExpected = this.expectingPause;
    this.expectingPause = false;
    this.expectedPauseToken += 1;
    if (wasExpected || this.suppressSuspensionEvents || this.isAtNaturalEnd()) return;
    this.handlers.onSuspended?.();
  };

  /** A transient 'waiting'/'stalled' event while the element is still playing
   * is normal buffering and the browser can recover by itself. Only escalate
   * if the element has also become paused before natural end. */
  private handleStalled = (): void => {
    if (this.suppressSuspensionEvents) return;
    if (this.audio && !this.audio.paused && !this.audio.ended) return;
    this.handlers.onSuspended?.();
  };

  private handleEnded(): void {
    if (!this.currentText) return;
    this.clearEndFallbackTimer();
    this.currentText = null;
    this.setPlaybackState('none');
    this.handlers.onEnded?.();
  }

  private isAtNaturalEnd(): boolean {
    if (!this.audio) return false;
    if (this.audio.ended) return true;

    const { currentTime, duration } = this.audio;
    return Number.isFinite(duration) && duration > 0 && duration - currentTime <= 0.25;
  }

  private beginIntentionalSourceLoad(): number {
    this.expectNativePause();
    this.suppressSuspensionEvents = true;
    this.sourceLoadToken += 1;
    return this.sourceLoadToken;
  }

  private endIntentionalSourceLoad(token: number): void {
    if (this.sourceLoadToken === token) {
      this.suppressSuspensionEvents = false;
    }
  }

  private scheduleEndFallback(token: number): void {
    const audio = this.audio;
    if (!audio) return;

    const scheduleFromDuration = () => {
      if (this.playbackToken !== token || !this.currentText || !this.audio) return;
      const { currentTime, duration } = this.audio;
      if (!Number.isFinite(duration) || duration <= 0) return;

      const rate = this.currentRate && this.currentRate > 0 ? this.currentRate : 1;
      const remainingSeconds = Math.max(0, duration - currentTime);
      const timeoutMs = (remainingSeconds / rate) * 1000 + Math.max(2000, duration * 500);
      this.clearEndFallbackTimer();
      this.endFallbackTimer = window.setTimeout(() => {
        if (this.playbackToken !== token || !this.currentText || this.audio?.paused) return;
        this.handleEnded();
      }, timeoutMs);
    };

    scheduleFromDuration();
    audio.addEventListener('loadedmetadata', scheduleFromDuration, { once: true });
  }

  private clearEndFallbackTimer(): void {
    if (this.endFallbackTimer) {
      window.clearTimeout(this.endFallbackTimer);
      this.endFallbackTimer = null;
    }
  }

  private expectNativePause(): void {
    this.expectedPauseToken += 1;
    this.expectingPause = true;
  }

  private expectTransientNativePause(): void {
    this.expectNativePause();
    const token = this.expectedPauseToken;
    window.setTimeout(() => {
      if (this.expectedPauseToken === token) {
        this.expectingPause = false;
      }
    }, 0);
  }

  async fetchAudioBase64(
    text: string,
    options: PlayTextOptions,
    signal?: AbortSignal
  ): Promise<{ audioBase64: string; contentType: string }> {
    const baseUrl = appConfig.get<string>('api.baseUrl');
    const endpoint = appConfig.get<string>('api.endpoints.premiumTts');
    const voiceId = options.voiceId ?? appConfig.get<string>('voice.defaultVoiceId');
    const engine = options.engine ?? appConfig.get<'standard' | 'neural'>('voice.defaultEngine');
    const languageCode = options.languageCode ?? appConfig.get<string>('voice.defaultLanguage');
    const outputFormat = appConfig.get<string>('backgroundAudio.outputFormat');
    const timeoutMs = appConfig.get<number>('backgroundAudio.fetchTimeoutMs');
    const retryAttempts = appConfig.get<number>('backgroundAudio.fetchRetryAttempts');
    const retryDelayMs = appConfig.get<number>('backgroundAudio.fetchRetryDelayMs');

    // A single attempt, bounded by timeoutMs so a stalled connection (common
    // on a degraded or backgrounded network) fails instead of leaving the
    // caller waiting on a promise that may never settle. The caller's own
    // signal, when it aborts, also aborts this attempt immediately.
    const requestOnce = async (): Promise<{ audioBase64: string; contentType: string }> => {
      const timeoutController = new AbortController();
      // Which side aborted has to be recorded here, because both sides abort the
      // same controller and the DOMException fetch produces is identical either
      // way. Without this flag a timeout is indistinguishable upstream from a
      // deliberate cancellation.
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
      }, timeoutMs);
      const onCallerAbort = () => timeoutController.abort();
      signal?.addEventListener('abort', onCallerAbort);

      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId, engine, languageCode, outputFormat }),
          signal: timeoutController.signal,
        });

        if (!response.ok) {
          throw new Error(`Premium TTS request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as PremiumTtsResponse;

        if (!payload.success || payload.fallback || !payload.data) {
          throw new Error(payload.error || 'Premium TTS is unavailable for background audio');
        }

        // A success envelope is not proof of audio. The two fields below are
        // what the element actually consumes, and a gateway or provider can
        // return a well formed success with either one empty or missing. Read
        // defensively rather than trusting the declared shape, because the
        // response is parsed as unknown JSON and only asserted to be this type.
        const { audioBase64, contentType } = payload.data;
        if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
          throw createUnplayableAudioError(
            `Premium TTS returned a success response with no audio for ${endpoint}`
          );
        }
        if (typeof contentType !== 'string' || contentType.length === 0) {
          throw createUnplayableAudioError(
            `Premium TTS returned audio with no content type for ${endpoint}`
          );
        }

        // Checked here rather than against the decoded blob, because this is the
        // only point where the media type is something the server declared
        // rather than something a local caller happened to set. An HTML error
        // page or a JSON fault body served with a 200 lands here.
        const expectedPrefix = appConfig.get<string>('backgroundAudio.audioContentTypePrefix');
        if (!contentType.toLowerCase().startsWith(expectedPrefix)) {
          throw createUnplayableAudioError(
            `Premium TTS declared content type ${contentType}, which is not ${expectedPrefix}*`
          );
        }

        return { audioBase64, contentType };
      } catch (error) {
        // This attempt ran out of time on its own. Nobody asked for it to stop,
        // so it must not leave here looking like a cancellation: upstream treats
        // a cancellation as an expected, silent outcome and would drop it,
        // stranding the queue in 'buffering' with nothing reported at all. A
        // caller abort still wins when both happened, matching the retry
        // precedence below.
        if (timedOut && !signal?.aborted && isAbortError(error)) {
          throw createPlaybackTimeoutError(timeoutMs, error);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onCallerAbort);
      }
    };

    for (let attempt = 0; ; attempt++) {
      try {
        return await requestOnce();
      } catch (error) {
        // The caller superseded this fetch (a skip, a stop, a new clip
        // starting): never retry a deliberate cancellation, and never
        // report it as a fetch failure. Only this branch still surfaces an
        // AbortError, which is what lets shouldIgnorePlaybackFailure upstream
        // stay silent for cancellations without also silencing timeouts.
        // Retrying here would just waste a request the caller no longer wants.
        if (signal?.aborted) {
          throw error;
        }
        if (attempt >= retryAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  private buildDirectAudioUrl(text: string, options: PlayTextOptions): string {
    const baseUrl = appConfig.get<string>('api.baseUrl');
    const endpoint = appConfig.get<string>('api.endpoints.premiumTts');
    const voiceId = options.voiceId ?? appConfig.get<string>('voice.defaultVoiceId');
    const languageCode = options.languageCode ?? appConfig.get<string>('voice.defaultLanguage');
    const params = new URLSearchParams({
      format: 'audio',
      text,
      voiceId,
      languageCode,
    });
    return `${baseUrl}${endpoint}?${params.toString()}`;
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    let byteCharacters: string;
    try {
      byteCharacters = atob(base64);
    } catch (error) {
      // atob throws InvalidCharacterError, whose message names neither the
      // field nor the endpoint. A payload that is not base64 at all (an error
      // page, a data URI prefix a provider added, a truncated body) lands here,
      // and the caller needs to be able to tell that apart from a device that
      // cannot decode the codec.
      throw createUnplayableAudioError(
        'Premium TTS returned audio that is not valid base64',
        error
      );
    }
    const byteNumbers = new Array<number>(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
  }

  /**
   * Rejects a blob the audio element cannot play, before it is ever assigned.
   *
   * Size is the whole check, and deliberately so. An empty blob is the case that
   * hides: `URL.createObjectURL` accepts it, so the assignment looks like it
   * worked, and the failure arrives as an unreadable blob resource in the
   * console plus a `NotSupportedError` from `play()`, neither of which mentions
   * the payload, so an endpoint returning no audio reads exactly like an
   * unsupported codec.
   *
   * A blob's own `type` is not checked here, because it is not a declaration of
   * anything: it is whatever the constructing caller passed, empty by default,
   * and a caller handing over perfectly good audio bytes with no type set must
   * not be refused. The media type is verified at the fetch boundary instead,
   * against the value the server actually declared. The floor comes from
   * AppConfig so this rule and the one the cache applies on read cannot drift.
   */
  private assertPlayableBlob(blob: Blob): void {
    const minimumBytes = appConfig.get<number>('backgroundAudio.minimumAudioBytes');

    if (blob.size < minimumBytes) {
      throw createUnplayableAudioError(
        `Audio payload is ${blob.size} bytes, below the ${minimumBytes} byte minimum for playback`
      );
    }
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private abortPendingFetch(): void {
    if (this.fetchController) {
      this.fetchController.abort();
      this.fetchController = null;
    }
  }

  // ---- Media Session (lock-screen controls) ----

  private hasMediaSession(): boolean {
    return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
  }

  private setPlaybackState(state: MediaSessionPlaybackState): void {
    if (this.hasMediaSession()) {
      navigator.mediaSession.playbackState = state;
    }
  }

  private setMediaMetadata(text: string, options: PlayTextOptions = {}): void {
    if (!this.hasMediaSession() || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: options.mediaTitle ?? text,
      artist: options.mediaArtist ?? appConfig.get<string>('backgroundAudio.mediaSessionArtist'),
      artwork: [],
    });
  }

  private bindMediaSession(): void {
    if (this.mediaSessionBound || !this.hasMediaSession()) return;

    const ms = navigator.mediaSession;
    const setAction = (action: MediaSessionAction, handler: () => void): void => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Some browsers throw for unsupported actions; ignore those.
      }
    };

    // Handlers dispatch dynamically, so setHandlers() updates take effect
    // without re-binding.
    setAction('play', () => this.handlers.onPlay?.());
    setAction('pause', () => this.handlers.onPause?.());
    setAction('stop', () => this.handlers.onStop?.());
    setAction('nexttrack', () => this.handlers.onNext?.());
    setAction('previoustrack', () => this.handlers.onPrevious?.());

    this.mediaSessionBound = true;
  }
}

/** Shared singleton, mirroring the other audio services. */
export const backgroundAudioService = new BackgroundAudioService();
