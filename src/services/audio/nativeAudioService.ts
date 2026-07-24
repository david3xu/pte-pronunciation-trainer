import { backgroundAudioService, type BackgroundAudioHandlers, type PlayTextOptions } from './backgroundAudioService';
import BackgroundAudio from './backgroundAudioPlugin';

/**
 * QueueAudioService implementation for iOS. AudioQueueEngine and TTSEngine
 * (on native) both talk to this instead of backgroundAudioService, so there
 * is exactly one playback owner on native, matching the one-Audio()-element
 * invariant this whole session has enforced on web (see
 * audioServiceForPlatform.ts for where that selection happens).
 *
 * fetchAudioBlob is the only method that touches backgroundAudioService: it
 * delegates unchanged, since backgroundAudioService already owns fetching
 * (Azure/Gemini-backed, via api.baseUrl) and this service must not
 * reimplement or duplicate that -- no network call, no secret, and no API
 * knowledge exists on the native side at all. Every other method talks to
 * the BackgroundAudioPlugin native bridge instead of the browser Audio
 * element, which this service never touches.
 *
 * canResume()/getLoadedText() must answer synchronously (AudioQueueEngine
 * calls them without awaiting), but the plugin bridge is inherently async.
 * This service mirrors the plugin's state locally rather than trying to
 * query it live, updated optimistically by every call and corrected by
 * getState() only where a call actually needs the fresher value (see
 * resume(), which reads the plugin's own canResume before deciding whether
 * to resume in place or start fresh, since a stale local guess there could
 * pick the wrong branch).
 */
export class NativeAudioService {
  private handlers: BackgroundAudioHandlers = {};
  private listenersBound = false;
  private currentText: string | null = null;
  private currentRate: number | null = null;
  private currentVolume: number | null = null;
  private isPaused = false;
  private endFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private playbackToken = 0;

  isSupported(): boolean {
    return true;
  }

  canResume(): boolean {
    return this.currentText !== null && this.isPaused;
  }

  getLoadedText(): string | null {
    return this.currentText;
  }

  prefersDirectQueuePlayback(): boolean {
    return true;
  }

  async fetchAudioBlob(
    text: string,
    options: PlayTextOptions = {},
    signal?: AbortSignal
  ): Promise<{ blob: Blob; contentType: string }> {
    return backgroundAudioService.fetchAudioBlob(text, options, signal);
  }

  async playBlob(text: string, blob: Blob, options: PlayTextOptions = {}): Promise<void> {
    if (!text || !text.trim()) {
      throw new Error('Cannot play empty text in native audio mode');
    }
    const base64Audio = await blobToBase64(blob);
    await this.playBase64(text, base64Audio, blob.type || 'audio/mpeg', options);
  }

  async playText(text: string, options: PlayTextOptions = {}): Promise<void> {
    const { audioBase64, contentType } = await backgroundAudioService.fetchAudioBase64(text, options);
    await this.playBase64(text, audioBase64, contentType, options);
  }

  playTextFromUserGesture(text: string, options: PlayTextOptions = {}): Promise<void> {
    // No separate priming path on native: AVAudioSession does not have
    // browser autoplay policy's "must play silent audio inside the gesture
    // first" requirement. A plain playText() already starts inside the
    // gesture's call stack, which is all iOS needs.
    return this.playText(text, options);
  }

  private async playBase64(
    text: string,
    base64Audio: string,
    contentType: string,
    options: PlayTextOptions = {}
  ): Promise<void> {
    if (typeof options.rate === 'number') this.currentRate = options.rate;
    if (typeof options.volume === 'number') this.currentVolume = options.volume;

    console.info('[NativeAudioService] Starting native playback', {
      textLength: text.length,
      contentType,
      audioBytesApprox: Math.floor((base64Audio.length * 3) / 4),
    });

    const token = ++this.playbackToken;
    this.clearEndFallbackTimer();

    const result = await BackgroundAudio.play({
      base64Audio,
      contentType,
      text,
      rate: this.currentRate ?? undefined,
      volume: this.currentVolume ?? undefined,
      mediaTitle: options.mediaTitle ?? text,
      mediaArtist: options.mediaArtist,
    });

    this.currentText = text;
    this.isPaused = false;
    this.scheduleEndFallback(result?.duration, token);
  }

  pause(): void {
    this.isPaused = true;
    this.clearEndFallbackTimer();
    void BackgroundAudio.pause();
  }

  async resume(rate?: number, volume?: number): Promise<void> {
    if (typeof rate === 'number') this.currentRate = rate;
    if (typeof volume === 'number') this.currentVolume = volume;
    await BackgroundAudio.resume({
      rate: this.currentRate ?? undefined,
      volume: this.currentVolume ?? undefined,
    });
    this.isPaused = false;
  }

  setRate(rate: number): void {
    this.currentRate = rate;
    void BackgroundAudio.setRate({ rate });
  }

  setVolume(volume: number): void {
    this.currentVolume = volume;
    void BackgroundAudio.setVolume({ volume });
  }

  stop(): void {
    this.playbackToken += 1;
    this.clearEndFallbackTimer();
    this.currentText = null;
    this.isPaused = false;
    void BackgroundAudio.stop();
    this.handlers.onStop?.();
  }

  /**
   * Same ownership-conflict-prevention behavior as
   * backgroundAudioService.setHandlers(): fires the previous handlers'
   * onOwnershipLost before replacing them, skipped only when the exact same
   * object re-registers. This is what lets a manual word tap through
   * TTSEngine on native take over from AudioQueueEngine cleanly, the same
   * way it already does on web (see the handler-conflict fix).
   */
  setHandlers(handlers: BackgroundAudioHandlers): void {
    const previous = this.handlers;
    if (previous !== handlers) {
      previous.onOwnershipLost?.();
    }
    this.handlers = handlers;
    this.bindPluginListeners();
  }

  private bindPluginListeners(): void {
    if (this.listenersBound) return;
    this.listenersBound = true;

    void BackgroundAudio.addListener('ended', () => {
      this.clearEndFallbackTimer();
      this.currentText = null;
      this.isPaused = false;
      this.handlers.onEnded?.();
    });
    void BackgroundAudio.addListener('error', (data) => {
      this.clearEndFallbackTimer();
      this.currentText = null;
      this.isPaused = false;
      this.handlers.onError?.(new Error(data?.message || 'Native background audio reported an error'));
    });
    void BackgroundAudio.addListener('interrupted', () => {
      // Mark paused/resumable before notifying, not after: AudioQueueEngine's
      // handleSuspended() may call canResume()/getLoadedText() synchronously
      // as part of deciding how to react, and those must already reflect
      // "native is no longer audibly playing" by the time onSuspended runs,
      // not the stale "still playing" state from just before the
      // interruption or route change fired.
      this.isPaused = true;
      this.handlers.onSuspended?.();
    });
    void BackgroundAudio.addListener('remotePlay', () => {
      this.isPaused = false;
      this.handlers.onPlay?.();
    });
    void BackgroundAudio.addListener('remotePause', () => {
      this.isPaused = true;
      this.handlers.onPause?.();
    });
    void BackgroundAudio.addListener('remoteNext', () => this.handlers.onNext?.());
    void BackgroundAudio.addListener('remotePrevious', () => this.handlers.onPrevious?.());
    void BackgroundAudio.addListener('remoteStop', () => {
      this.playbackToken += 1;
      this.clearEndFallbackTimer();
      this.currentText = null;
      this.isPaused = false;
      this.handlers.onStop?.();
    });
  }

  private scheduleEndFallback(duration: number | undefined, token: number): void {
    if (!Number.isFinite(duration) || !duration || duration <= 0) return;

    const rate = this.currentRate && this.currentRate > 0 ? this.currentRate : 1;
    const timeoutMs = Math.max(250, (duration / rate) * 1000 + 250);
    this.endFallbackTimer = setTimeout(() => {
      if (this.playbackToken !== token || this.isPaused || !this.currentText) return;
      this.currentText = null;
      this.isPaused = false;
      this.handlers.onEnded?.();
    }, timeoutMs);
  }

  private clearEndFallbackTimer(): void {
    if (this.endFallbackTimer) {
      clearTimeout(this.endFallbackTimer);
      this.endFallbackTimer = null;
    }
  }
}

/** AVAudioPlayer plays from a file URL, not raw bytes, and Capacitor's
 * bridge cannot pass a Blob directly, so the fetched audio crosses the
 * bridge as base64; the native plugin decodes it and writes its own temp
 * file. FileReader is a standard WebView API, available unchanged inside a
 * Capacitor WebView. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read audio blob as base64'));
        return;
      }
      // readAsDataURL yields "data:<mime>;base64,<data>"; the plugin only
      // wants the part after the comma.
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

export const nativeAudioService = new NativeAudioService();
