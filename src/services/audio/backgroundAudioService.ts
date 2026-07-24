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
   * connection mid-buffer), not a user or app initiated pause. */
  onSuspended?: () => void;
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
    return { blob: this.base64ToBlob(audioBase64, contentType), contentType };
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

    // A real playback supersedes any in-flight priming or fetch, the same as
    // playText's existing guarantee.
    this.primeGeneration++;
    this.abortPendingFetch();

    const blobUrl = URL.createObjectURL(blob);
    const audio = this.ensureAudioElement();
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
    audio.addEventListener('ended', () => this.handlers.onEnded?.());
    audio.addEventListener('error', () => {
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
    if (wasExpected || this.suppressSuspensionEvents || this.audio?.ended) return;
    this.handlers.onSuspended?.();
  };

  /** 'waiting' and 'stalled' both mean playback is stuck buffering, which is
   * the same recoverable situation as an unexpected pause from the caller's
   * point of view; neither is something pause()/stop() would cause. */
  private handleStalled = (): void => {
    if (this.suppressSuspensionEvents) return;
    this.handlers.onSuspended?.();
  };

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

  private async fetchAudioBase64(
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

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId, engine, languageCode, outputFormat }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Premium TTS request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as PremiumTtsResponse;

    if (!payload.success || payload.fallback || !payload.data) {
      throw new Error(payload.error || 'Premium TTS is unavailable for background audio');
    }

    return { audioBase64: payload.data.audioBase64, contentType: payload.data.contentType };
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
    const byteCharacters = atob(base64);
    const byteNumbers = new Array<number>(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
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
