import {
  backgroundAudioService,
  type BackgroundAudioHandlers,
  type BackgroundAudioService,
  type PlayTextOptions,
} from './backgroundAudioService';
import { audioCache, buildAudioCacheKey, type AudioCache } from './audioCache';

/** Only the method the engine actually calls. Pick<AudioCache, ...> alone
 * would require matching AudioCache's private fields too; a fake cache used
 * in tests only needs to satisfy this narrower, public-only shape. */
export type QueueAudioCache = Pick<AudioCache, 'getOrFetch'>;

export type PlaybackState =
  | 'idle'
  | 'primed'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'suspended'
  | 'needs-user-resume'
  | 'error';

export interface QueueItem {
  id: string;
  datasetId: string;
  index: number;
  text: string;
  mediaTitle: string;
  mediaArtist: string;
  itemType: 'vocabulary' | 'practice';
  soundsLike?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  category?: string;
  repeatCount?: number;
}

export interface QueueEngineEvents {
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

export interface PersistedQueuePosition {
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

export type QueuePlaybackOptions = Omit<PlayTextOptions, 'mediaArtist' | 'mediaTitle'>;

export interface QueueCommandResult {
  item: QueueItem | null;
  index: number;
  moved: boolean;
  state: PlaybackState;
}

export type QueueAudioService = Pick<
  BackgroundAudioService,
  | 'canResume'
  | 'fetchAudioBlob'
  | 'getLoadedText'
  | 'pause'
  | 'playBlob'
  | 'playText'
  | 'playTextFromUserGesture'
  | 'resume'
  | 'setHandlers'
  | 'setRate'
  | 'setVolume'
  | 'stop'
>;

/** Prefetch stays deliberately small: the next 1-2 clips only. */
const PREFETCH_WINDOW = 2;

/**
 * Queue/state-machine layer over the shared background audio service.
 *
 * It owns queue sequencing and state only. The underlying service remains the
 * sole owner of the reusable HTMLAudioElement and Media Session integration.
 */
export class AudioQueueEngine {
  private readonly audioService: QueueAudioService;
  private readonly cache: QueueAudioCache;
  private items: QueueItem[] = [];
  private currentIndex = 0;
  private playbackState: PlaybackState = 'idle';
  private listeners: Partial<QueueEngineEvents> = {};
  private playbackOptions: QueuePlaybackOptions = {};
  private repeatMode = false;
  private defaultRepeatCount = 1;
  private repeatsCompleted = 0;
  private playbackIntent = false;
  private playbackOperation = 0;
  private isStoppingAudioService = false;
  private updatedAt = Date.now();
  private lastError: { message: string; at: number } | undefined;
  private prefetchGeneration = 0;
  private prefetchInFlight = false;

  constructor(
    audioService: QueueAudioService = backgroundAudioService,
    cache: QueueAudioCache = audioCache
  ) {
    this.audioService = audioService;
    this.cache = cache;
    this.audioService.setHandlers(this.createAudioHandlers());
  }

  load(items: QueueItem[], startIndex = 0): QueueCommandResult {
    const previousItem = this.getCurrentItem();
    this.invalidatePlayback();
    this.stopAudioService();

    this.items = items.map((item, index) => ({ ...item, index }));
    this.currentIndex = this.clampIndex(startIndex);
    this.repeatsCompleted = 0;
    this.lastError = undefined;
    this.touch();
    this.setState('idle');

    const currentItem = this.getCurrentItem();
    if (currentItem) {
      this.listeners.onItemChanged?.({
        item: currentItem,
        index: this.currentIndex,
        previousItem,
      });
    }

    this.triggerPrefetch();
    return this.commandResult(false);
  }

  start(options: QueuePlaybackOptions = {}): Promise<QueueCommandResult> {
    const item = this.requireCurrentItem();
    if (!item) return Promise.reject(new Error('Cannot start an empty audio queue'));

    if (this.playbackState === 'playing') {
      return Promise.resolve(this.commandResult(false));
    }

    this.applyPlaybackOptions(options);
    this.playbackIntent = true;
    this.repeatsCompleted = 0;
    this.lastError = undefined;
    this.touch();

    const operation = ++this.playbackOperation;
    let playback: Promise<void>;

    try {
      // This call intentionally happens before any await or promise hop so the
      // browser can associate it with the originating tap/click gesture.
      playback = this.audioService.playTextFromUserGesture(
        item.text,
        this.getAudioOptions(item)
      );
      this.setState('playing');
    } catch (error) {
      return this.handleSynchronousPlaybackFailure(error, operation, item);
    }

    return this.settlePlayback(playback, operation, item)
      .then(() => this.commandResult(false));
  }

  /**
   * Starts the current item without relying on a user gesture. This is only
   * for queue continuity, such as switching to the next vocabulary book after
   * a natural queue end; buttons must continue to call start() or resume().
   */
  startAutomatic(options: QueuePlaybackOptions = {}): Promise<QueueCommandResult> {
    const item = this.requireCurrentItem();
    if (!item) return Promise.reject(new Error('Cannot start an empty audio queue'));

    if (this.playbackState === 'playing') {
      return Promise.resolve(this.commandResult(false));
    }

    this.applyPlaybackOptions(options);
    this.repeatsCompleted = 0;

    return this.playCurrentInBackground()
      .then(() => this.commandResult(false));
  }

  pause(): QueueCommandResult {
    if (this.playbackState === 'idle' || this.playbackState === 'paused') {
      return this.commandResult(false);
    }

    const wasBuffering = this.playbackState === 'buffering' || this.playbackState === 'primed';
    this.invalidatePlayback();

    if (wasBuffering) {
      // stop() is the service's public cancellation path for its fetch. The
      // queue retains its index and moves to paused after cancellation.
      this.stopAudioService();
    } else {
      this.audioService.pause();
    }

    this.setState('paused');
    return this.commandResult(false);
  }

  resume(options: QueuePlaybackOptions = {}): Promise<QueueCommandResult> {
    const item = this.requireCurrentItem();
    if (!item) return Promise.reject(new Error('Cannot resume an empty audio queue'));

    if (this.playbackState === 'playing') {
      return Promise.resolve(this.commandResult(false));
    }

    this.applyPlaybackOptions(options);

    if (
      this.audioService.canResume() &&
      this.audioService.getLoadedText() === item.text
    ) {
      this.playbackIntent = true;
      this.lastError = undefined;
      this.touch();

      const operation = ++this.playbackOperation;
      let playback: Promise<void>;

      try {
        // resume() calls mediaElement.play() synchronously before its promise
        // settles, preserving the caller's gesture activation.
        playback = this.audioService.resume(this.playbackOptions.rate, this.playbackOptions.volume);
        this.setState('playing');
      } catch (error) {
        return this.handleSynchronousPlaybackFailure(error, operation, item);
      }

      return this.settlePlayback(playback, operation, item)
        .then(() => this.commandResult(false));
    }

    // A changed or unloaded item must start fresh; start() performs the direct
    // gesture-bound service call synchronously.
    return this.start();
  }

  next(): Promise<QueueCommandResult> {
    return this.moveToIndex(this.currentIndex + 1);
  }

  previous(): Promise<QueueCommandResult> {
    return this.moveToIndex(this.currentIndex - 1);
  }

  stop(): QueueCommandResult {
    this.invalidatePlayback();
    this.stopAudioService();
    this.setState('idle');
    return this.commandResult(false);
  }

  setListeners(events: Partial<QueueEngineEvents>): void {
    this.listeners = events;
  }

  setPlaybackOptions(options: QueuePlaybackOptions): void {
    this.applyPlaybackOptions(options);
  }

  setRate(rate: number): void {
    this.playbackOptions = { ...this.playbackOptions, rate };
    this.audioService.setRate(rate);
  }

  setVolume(volume: number): void {
    this.playbackOptions = { ...this.playbackOptions, volume };
    this.audioService.setVolume(volume);
  }

  setRepeatMode(repeatMode: boolean): void {
    this.repeatMode = repeatMode;
    this.touch();
  }

  setDefaultRepeatCount(repeatCount: number): void {
    this.defaultRepeatCount = this.normalizeRepeatCount(repeatCount);
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getCurrentItem(): QueueItem | null {
    return this.items[this.currentIndex] ?? null;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getItems(): readonly QueueItem[] {
    return this.items;
  }

  getPersistedPosition(): PersistedQueuePosition | null {
    const item = this.getCurrentItem();
    if (!item) return null;

    return {
      datasetId: item.datasetId,
      currentIndex: this.currentIndex,
      currentItemId: item.id,
      queueMode: item.itemType,
      repeatMode: this.repeatMode,
      repeatsCompleted: this.repeatsCompleted,
      playbackState: this.playbackState,
      updatedAt: this.updatedAt,
      lastError: this.lastError,
    };
  }

  private createAudioHandlers(): BackgroundAudioHandlers {
    return {
      onEnded: () => this.handleClipEnded(),
      onError: (error) => this.handleAudioError(error),
      onPlay: () => {
        void this.resume().catch(() => {
          // Queue events already report genuine failures.
        });
      },
      onPause: () => this.pause(),
      onStop: () => this.handleAudioServiceStop(),
      onNext: () => {
        void this.next().catch(() => {
          // Queue events already report genuine failures.
        });
      },
      onPrevious: () => {
        void this.previous().catch(() => {
          // Queue events already report genuine failures.
        });
      },
    };
  }

  private moveToIndex(index: number): Promise<QueueCommandResult> {
    if (index < 0 || index >= this.items.length || index === this.currentIndex) {
      return Promise.resolve(this.commandResult(false));
    }

    const previousItem = this.getCurrentItem();
    const shouldContinuePlayback = this.playbackIntent;

    this.invalidatePlayback();
    this.stopAudioService();
    this.currentIndex = index;
    this.repeatsCompleted = 0;
    this.lastError = undefined;
    this.touch();

    const item = this.getCurrentItem();
    if (item) {
      this.listeners.onItemChanged?.({
        item,
        index: this.currentIndex,
        previousItem,
      });
    }

    this.triggerPrefetch();

    if (!shouldContinuePlayback || !item) {
      return Promise.resolve(this.commandResult(true));
    }

    return this.playCurrentInBackground()
      .then(() => this.commandResult(true));
  }

  private playCurrentInBackground(): Promise<void> {
    const item = this.requireCurrentItem();
    if (!item) return Promise.reject(new Error('Cannot play an empty audio queue'));

    this.playbackIntent = true;
    this.lastError = undefined;
    this.touch();

    const operation = ++this.playbackOperation;
    this.setState('buffering');
    this.listeners.onBufferingStarted?.({ item, index: this.currentIndex });

    const options = this.getAudioOptions(item);
    const playback = this.cache
      .getOrFetch(
        this.buildCacheKeyForItem(item),
        () => this.audioService.fetchAudioBlob(item.text, options),
        { itemId: item.id, datasetId: item.datasetId }
      )
      .then(({ blob }) => this.audioService.playBlob(item.text, blob, options));

    return this.settlePlayback(playback, operation, item);
  }

  private buildCacheKeyForItem(item: QueueItem): string {
    const { rate, voiceId, languageCode, engine } = this.playbackOptions as PlayTextOptions;
    return buildAudioCacheKey({
      text: item.text,
      voiceId,
      languageCode,
      rate,
      engine,
    });
  }

  /** Recomputes and (re)starts prefetching the next PREFETCH_WINDOW items.
   * Bumping the generation here is what lets a running loop notice the queue
   * or index has moved on and stop chasing now-stale targets. */
  private triggerPrefetch(): void {
    this.prefetchGeneration += 1;
    if (this.prefetchInFlight) return; // the running loop will pick up the new generation itself
    void this.runPrefetchLoop();
  }

  private async runPrefetchLoop(): Promise<void> {
    this.prefetchInFlight = true;
    try {
      for (;;) {
        const generation = this.prefetchGeneration;
        const targets = this.getPrefetchTargets();

        for (const item of targets) {
          if (this.prefetchGeneration !== generation) break; // stale; recompute from the top

          const options = this.getAudioOptions(item);
          try {
            await this.cache.getOrFetch(
              this.buildCacheKeyForItem(item),
              () => this.audioService.fetchAudioBlob(item.text, options),
              { itemId: item.id, datasetId: item.datasetId }
            );
          } catch {
            // Prefetch failures are silent; real playback retries normally
            // through playCurrentInBackground when this item is actually needed.
          }
        }

        if (this.prefetchGeneration === generation) return; // finished cleanly, nothing newer queued
        // else: the queue/index moved while we worked; loop again with the latest state.
      }
    } finally {
      this.prefetchInFlight = false;
    }
  }

  /** The next PREFETCH_WINDOW items after the current index, skipping past
   * the end of the loaded queue rather than wrapping. */
  private getPrefetchTargets(): QueueItem[] {
    const targets: QueueItem[] = [];
    for (let offset = 1; offset <= PREFETCH_WINDOW; offset += 1) {
      const item = this.items[this.currentIndex + offset];
      if (item) targets.push(item);
    }
    return targets;
  }

  private settlePlayback(
    playback: Promise<void>,
    operation: number,
    item: QueueItem
  ): Promise<void> {
    return playback.then(
      () => {
        if (!this.isCurrentOperation(operation) || !this.playbackIntent) return;
        this.setState('playing');
      },
      (error: unknown) => {
        if (this.shouldIgnorePlaybackFailure(error, operation)) return;

        const playbackError = this.toError(error);
        this.handlePlaybackFailure(playbackError, item);
        throw playbackError;
      }
    );
  }

  private handleSynchronousPlaybackFailure(
    error: unknown,
    operation: number,
    item: QueueItem
  ): Promise<QueueCommandResult> {
    if (this.shouldIgnorePlaybackFailure(error, operation)) {
      return Promise.resolve(this.commandResult(false));
    }

    const playbackError = this.toError(error);
    this.handlePlaybackFailure(playbackError, item);
    return Promise.reject(playbackError);
  }

  private handleClipEnded(): void {
    const item = this.getCurrentItem();
    if (!item || !this.playbackIntent || this.playbackState !== 'playing') return;

    const repeatCount = this.getRepeatCount(item);
    this.repeatsCompleted += 1;
    this.touch();

    this.listeners.onClipEnded?.({
      item,
      index: this.currentIndex,
      repeatIndex: this.repeatsCompleted,
      repeatCount,
    });

    if (this.repeatsCompleted < repeatCount) {
      void this.playCurrentInBackground().catch(() => {
        // Queue events already report genuine failures.
      });
      return;
    }

    this.repeatsCompleted = 0;
    this.touch();

    if (this.currentIndex < this.items.length - 1) {
      void this.moveToIndex(this.currentIndex + 1).catch(() => {
        // Queue events already report genuine failures.
      });
      return;
    }

    if (this.repeatMode && this.items.length > 0) {
      if (this.currentIndex === 0) {
        void this.playCurrentInBackground().catch(() => {
          // Queue events already report genuine failures.
        });
      } else {
        void this.moveToIndex(0).catch(() => {
          // Queue events already report genuine failures.
        });
      }
      return;
    }

    this.playbackIntent = false;
    this.stopAudioService();
    this.setState('idle');
  }

  private handleAudioError(error: Error): void {
    const item = this.getCurrentItem();
    if (!item || !this.playbackIntent || this.isAbortError(error)) return;
    this.handlePlaybackFailure(error, item);
  }

  private handleAudioServiceStop(): void {
    if (this.isStoppingAudioService) return;
    this.stop();
  }

  private handlePlaybackFailure(error: Error, item: QueueItem): void {
    // An element error event and the rejected play promise can describe the
    // same failure. Retire this operation before notifying listeners so only
    // the first path reports it.
    this.playbackOperation += 1;

    if (this.isAutoplayBlocked(error)) {
      this.setState('needs-user-resume');
      this.listeners.onResumeRequired?.({
        item,
        index: this.currentIndex,
        reason: 'autoplay-blocked',
      });
      return;
    }

    this.lastError = { message: error.message, at: Date.now() };
    this.touch();
    this.stopAudioService();
    this.setState('error');
    this.listeners.onPlaybackFailed?.({
      item,
      index: this.currentIndex,
      error,
      recoverable: false,
    });
  }

  private applyPlaybackOptions(options: QueuePlaybackOptions): void {
    const { rate, volume, ...requestOptions } = options;
    this.playbackOptions = { ...this.playbackOptions, ...requestOptions };

    if (typeof rate === 'number') {
      this.setRate(rate);
    }
    if (typeof volume === 'number') {
      this.setVolume(volume);
    }
  }

  private getAudioOptions(item: QueueItem): PlayTextOptions {
    const { rate, volume, ...requestOptions } = this.playbackOptions;
    return {
      ...requestOptions,
      ...(typeof rate === 'number' ? { rate } : {}),
      ...(typeof volume === 'number' ? { volume } : {}),
      mediaTitle: item.mediaTitle,
      mediaArtist: item.mediaArtist,
    };
  }

  private getRepeatCount(item: QueueItem): number {
    return this.normalizeRepeatCount(item.repeatCount ?? this.defaultRepeatCount);
  }

  private normalizeRepeatCount(repeatCount: number): number {
    return Math.max(1, Math.trunc(repeatCount));
  }

  private requireCurrentItem(): QueueItem | null {
    const item = this.getCurrentItem();
    if (!item || !item.text.trim()) return null;
    return item;
  }

  private clampIndex(index: number): number {
    if (this.items.length === 0) return 0;
    return Math.max(0, Math.min(index, this.items.length - 1));
  }

  private invalidatePlayback(): void {
    this.playbackOperation += 1;
    this.playbackIntent = false;
  }

  private stopAudioService(): void {
    this.isStoppingAudioService = true;
    try {
      this.audioService.stop();
    } finally {
      this.isStoppingAudioService = false;
    }
  }

  private setState(state: PlaybackState): void {
    if (this.playbackState === state) return;

    const previousState = this.playbackState;
    this.playbackState = state;
    this.touch();
    this.listeners.onStateChanged?.({
      state,
      previousState,
      itemId: this.getCurrentItem()?.id ?? null,
      at: this.updatedAt,
    });
  }

  private touch(): void {
    this.updatedAt = Date.now();
  }

  private commandResult(moved: boolean): QueueCommandResult {
    return {
      item: this.getCurrentItem(),
      index: this.currentIndex,
      moved,
      state: this.playbackState,
    };
  }

  private isCurrentOperation(operation: number): boolean {
    return this.playbackOperation === operation;
  }

  private shouldIgnorePlaybackFailure(error: unknown, operation: number): boolean {
    return (
      !this.isCurrentOperation(operation) ||
      !this.playbackIntent ||
      this.isAbortError(error)
    );
  }

  private isAbortError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: unknown }).name === 'AbortError'
    );
  }

  private isAutoplayBlocked(error: Error): boolean {
    return error.name === 'NotAllowedError' || /autoplay|user gesture|not allowed/i.test(error.message);
  }

  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error('Background audio playback failed');
  }
}