/**
 * BackgroundAudioService
 *
 * Real-audio playback for practice modes. This service plays generated audio
 * through a single reusable HTMLAudioElement instead of browser speech
 * synthesis, which is less reliable and can be throttled by browsers.
 *
 * Audio is fetched from the existing premium TTS (AWS Polly) endpoint and
 * played as a Blob URL. Voice, engine, language and output format come from
 * AppConfig, so nothing is hardcoded here. If audio cannot be fetched or
 * played, playText rejects so the caller can surface an error or fall back
 * explicitly; this service never silently pretends background playback worked.
 */

import { appConfig } from '../../config/AppConfig';

// A short, effectively silent WAV. Played then paused synchronously inside a
// user gesture to "bless" the reusable audio element, so a later play() (after
// the async premium-TTS fetch) is permitted by mobile autoplay policy.
const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAABAAgAZGF0YQAAAAA=';

export interface BackgroundAudioHandlers {
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface PlayTextOptions {
  voiceId?: string;
  engine?: 'standard' | 'neural';
  languageCode?: string;
  rate?: number;
  /** Output volume in the range [0, 1]. Callers pass the store's audio volume. */
  volume?: number;
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
      this.objectUrl !== null &&
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

    // Tag this priming attempt. A later playText()/stop() bumps the generation,
    // which disarms this attempt's deferred pause so it can never pause a real
    // clip that has since replaced the silent source.
    const generation = ++this.primeGeneration;

    try {
      audio.src = SILENT_AUDIO_DATA_URI;
      const played = audio.play();
      if (played && typeof played.then === 'function') {
        played
          .then(() => {
            // Only pause if this priming is still current AND the element still
            // holds the silent source (not a Blob URL swapped in by playText).
            if (
              this.primeGeneration === generation &&
              this.audio &&
              this.audio.src === SILENT_AUDIO_DATA_URI
            ) {
              this.audio.pause();
            }
          })
          .catch(() => {
            /* policy blocked priming; the real play() will fail loud */
          });
      }
    } catch {
      /* ignore priming errors; a real play() will surface any problem */
    }
  }

  setHandlers(handlers: BackgroundAudioHandlers): void {
    this.handlers = handlers;
    this.bindMediaSession();
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

    // A real playback supersedes any in-flight priming, so a deferred priming
    // pause will not fire against this clip.
    this.primeGeneration++;

    // Cancel any in-flight fetch so dataset changes and rapid advances cannot race.
    this.abortPendingFetch();
    const controller = new AbortController();
    this.fetchController = controller;

    const { audioBase64, contentType } = await this.fetchAudioBase64(text, options, controller.signal);
    const blobUrl = URL.createObjectURL(this.base64ToBlob(audioBase64, contentType));

    const audio = this.ensureAudioElement();
    this.releaseObjectUrl(); // revoke the previous clip before swapping src
    this.objectUrl = blobUrl;
    this.currentText = text;
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

    this.setMediaMetadata(text);

    try {
      await audio.play();
      this.setPlaybackState('playing');
    } catch (error) {
      throw error instanceof Error ? error : new Error('Background audio playback failed');
    }
  }

  pause(): void {
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
      this.audio.pause();
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

    this.audio = audio;
    return audio;
  }

  private async fetchAudioBase64(
    text: string,
    options: PlayTextOptions,
    signal: AbortSignal
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

  private setMediaMetadata(text: string): void {
    if (!this.hasMediaSession() || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: text,
      artist: appConfig.get<string>('backgroundAudio.mediaSessionArtist'),
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
