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
> & {
  prefersDirectQueuePlayback?: () => boolean;
  prefetchText?: (text: string, options?: PlayTextOptions) => Promise<void>;
};

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
  private recoveryInFlight = false;
  private recoveryDeferredUntilInterruptionEnd = false;
  /** Created once and reused for every setHandlers() call this engine ever
   * makes (construction and every ownership reclaim below), so
   * backgroundAudioService's reference check correctly treats the engine
   * re-asserting its own ownership as a no-op, and only a genuinely
   * different handlers object (TTSEngine's, for example) as a takeover. */
  private readonly audioHandlers: BackgroundAudioHandlers;

  constructor(
    audioService: QueueAudioService = backgroundAudioService,
    cache: QueueAudioCache = audioCache
  ) {
    this.audioService = audioService;
    this.cache = cache;
    this.audioHandlers = this.createAudioHandlers();
    this.audioService.setHandlers(this.audioHandlers);
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

    // Reclaim ownership of the shared handlers before touching the audio
    // element, in case a manual word tap displaced them since this engine
    // last had them. setHandlers() is synchronous and a no-op against this
    // engine's own already-active handlers, so it does not disturb the
    // gesture-timing guarantee on the play() call directly below.
    this.audioService.setHandlers(this.audioHandlers);

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

      // Same reclaim as start(): synchronous, and a no-op against this
      // engine's own already-active handlers.
      this.audioService.setHandlers(this.audioHandlers);

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

  /**
   * Retries recovery if the engine is currently suspended. Intended to be
   * called from page lifecycle listeners (visibilitychange, pageshow) owned
   * by external code, not by this class itself, so this class stays free of
   * direct document/window coupling and the listener cleanup that would
   * require. Deliberately does nothing from needs-user-resume: that state
   * already means a silent attempt failed once, and repeating it from a
   * lifecycle event (not a user gesture) would just fail again.
   */
  checkForRecovery(): void {
    if (this.playbackState === 'suspended' && !this.recoveryDeferredUntilInterruptionEnd) {
      this.attemptRecovery();
    }
  }

  private createAudioHandlers(): BackgroundAudioHandlers {
    return {
      onEnded: () => this.handleClipEnded(),
      onError: (error) => this.handleAudioError(error),
      onSuspended: (info) => this.handleSuspended(info?.deferRecovery ?? false),
      onInterruptionEnded: (shouldResume) => this.handleInterruptionEnded(shouldResume),
      onOwnershipLost: () => this.handleOwnershipLost(),
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

    // Same reclaim as start()/resume(): synchronous, and a no-op against
    // this engine's own already-active handlers.
    this.audioService.setHandlers(this.audioHandlers);

    this.playbackIntent = true;
    this.lastError = undefined;
    this.touch();

    const operation = ++this.playbackOperation;
    this.setState('buffering');
    this.listeners.onBufferingStarted?.({ item, index: this.currentIndex });

    const options = this.getAudioOptions(item);
    if (this.audioService.prefersDirectQueuePlayback?.()) {
      const playback = this.audioService.playText(item.text, options);
      return this.settlePlayback(playback, operation, item);
    }

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
            if (this.audioService.prefersDirectQueuePlayback?.() && this.audioService.prefetchText) {
              await this.audioService.prefetchText(item.text, options);
            } else {
              await this.cache.getOrFetch(
                this.buildCacheKeyForItem(item),
                () => this.audioService.fetchAudioBlob(item.text, options),
                { itemId: item.id, datasetId: item.datasetId }
              );
            }
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
    if (
      !item ||
      !this.playbackIntent ||
      (this.playbackState !== 'playing' && this.playbackState !== 'suspended')
    ) {
      return;
    }

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

  /** A native pause/waiting/stalled signal from backgroundAudioService, not
   * something this engine's own pause()/stop() caused (those never reach
   * here; backgroundAudioService only calls onSuspended when it did not
   * expect the pause itself). Only a playback attempt actually in progress
   * can be suspended; an idle, paused, or already-erroring queue ignores a
   * stray signal rather than surfacing a false error.
   *
   * deferRecovery (native interruption start): sets 'suspended' but does NOT
   * attempt a resume yet. iOS has not said whether resuming will work at
   * this point (AVAudioSessionInterruptionType.began only), so an immediate
   * attempt is just guessing at timing and, on a real interruption, will
   * reliably fail while it is still active. handleInterruptionEnded() below
   * carries the actual answer and is what attempts recovery for this path.
   * Web suspensions never set this and keep today's immediate retry. */
  private handleSuspended(deferRecovery = false): void {
    const item = this.getCurrentItem();
    if (
      !item ||
      !this.playbackIntent ||
      (this.playbackState !== 'playing' && this.playbackState !== 'buffering')
    ) {
      return;
    }
    this.setState('suspended');
    this.recoveryDeferredUntilInterruptionEnd = deferRecovery;
    if (!deferRecovery) {
      this.attemptRecovery();
    }
  }

  /**
   * The authoritative "is it actually safe to resume now" signal for a
   * native interruption that handleSuspended(deferRecovery=true) deliberately
   * did not act on. Ignored unless still 'suspended' from that same
   * interruption: if recovery already resolved some other way (a user tap,
   * a stale/late event after the operation moved on) by the time this
   * fires, acting on it again would be wrong. shouldResume=true reuses
   * attemptRecovery(), whose own recoveryInFlight guard already prevents a
   * duplicate attempt if one is somehow already running. shouldResume=false
   * skips attempting a resume iOS already told us will fail, and escalates
   * straight to needs-user-resume, the same outcome attemptRecovery()'s own
   * rejection branch would reach, just without wasting a doomed attempt. */
  private handleInterruptionEnded(shouldResume: boolean): void {
    if (this.playbackState !== 'suspended') return;
    this.recoveryDeferredUntilInterruptionEnd = false;

    if (shouldResume) {
      this.attemptRecovery();
      return;
    }

    const item = this.getCurrentItem();
    if (!item) return;
    this.setState('needs-user-resume');
    this.listeners.onResumeRequired?.({
      item,
      index: this.currentIndex,
      reason: 'suspended',
    });
  }

  /**
   * Attempts a silent resume after a suspension. Guarded so only one resume()
   * call is ever in flight at a time: a native pause/stall event and a
   * visibilitychange/pageshow signal (see checkForRecovery) can both fire for
   * the same interruption, and this must not turn into two overlapping
   * resume attempts. A rejection escalates to needs-user-resume, since a
   * resume() call made outside a fresh gesture is exactly what mobile
   * autoplay policy blocks; only an explicit tap can recover from there.
   */
  private attemptRecovery(): void {
    const item = this.getCurrentItem();
    if (!item || this.recoveryInFlight) return;

    this.recoveryInFlight = true;
    const operation = ++this.playbackOperation;

    this.audioService
      .resume(this.playbackOptions.rate, this.playbackOptions.volume)
      .then(() => {
        this.recoveryInFlight = false;
        if (!this.isCurrentOperation(operation) || this.playbackState !== 'suspended') return;
        this.setState('playing');
      })
      .catch(() => {
        this.recoveryInFlight = false;
        if (!this.isCurrentOperation(operation) || this.playbackState !== 'suspended') return;
        this.setState('needs-user-resume');
        this.listeners.onResumeRequired?.({
          item,
          index: this.currentIndex,
          reason: 'suspended',
        });
      });
  }

  /**
   * The shared audio element has exactly one active handler set at a time;
   * this fires when a different caller (a manual word tap through TTSEngine,
   * for example) takes it over. Any state that assumed this engine still
   * controlled the element (playing, buffering, suspended, or waiting on a
   * user tap to resume) no longer matches reality once someone else's clip
   * is loaded, so it settles to paused instead of going stale. This never
   * calls into audioService itself (no pause(), no stop()): this engine no
   * longer owns the element, and touching it here could interrupt whatever
   * the new owner is doing. Ownership is reclaimed later, when this engine
   * next actually starts or resumes playback (see start()/resume()/
   * playCurrentInBackground()), not by re-registering here defensively.
   */
  private handleOwnershipLost(): void {
    if (
      this.playbackState === 'playing' ||
      this.playbackState === 'buffering' ||
      this.playbackState === 'suspended' ||
      this.playbackState === 'needs-user-resume'
    ) {
      this.invalidatePlayback();
      this.setState('paused');
    }
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
    this.recoveryDeferredUntilInterruptionEnd = false;
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