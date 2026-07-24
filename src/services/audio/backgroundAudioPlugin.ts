import { registerPlugin } from '@capacitor/core';

/**
 * Native-side background audio for iOS. Mirrors the subset of
 * backgroundAudioService's surface that nativeAudioService.ts needs, but the
 * data flow is deliberately different: this plugin never fetches audio
 * itself and never touches the network or any API secret. JS fetches and
 * decodes audio exactly as it already does for web (see
 * nativeAudioService.ts, which delegates fetchAudioBlob to
 * backgroundAudioService.fetchAudioBlob unchanged), converts the resulting
 * Blob to a base64 string, and hands that string to play(). The native side
 * decodes it and writes it to a local temp file itself before handing that
 * file's URL to AVAudioPlayer.
 *
 * Deliberately not using @capacitor/filesystem: the plugin already needs
 * local file handling to play at all (AVAudioPlayer plays from a file URL,
 * not raw bytes), so writing the temp file is work it does regardless.
 * Adding a whole extra plugin dependency just to move that one write one
 * step earlier, into JS, would not change what native code ends up touching,
 * only where the write happens, and was avoided given no path to install an
 * arbitrary new dependency was available in this round.
 *
 * Web builds never construct this: audioServiceForPlatform.ts selects
 * backgroundAudioService there instead, so the web fallback below exists
 * only to satisfy Capacitor's registerPlugin() contract, not because it is
 * ever actually reached.
 *
 * Native source: ios/App/App/BackgroundAudioPlugin.swift (placed directly in
 * the App target rather than under a separate native-plugins/ package,
 * matching the "local, app-only Capacitor plugin" pattern from Capacitor's
 * own iOS custom-code docs: a CAPBridgedPlugin-conforming Swift file in the
 * App target, no Package.swift or Podfile of its own).
 */
export interface BackgroundAudioPlugin {
  /**
   * Decodes base64Audio, writes it to a local temp file, and plays it.
   * Supersedes any currently playing clip, mirroring
   * backgroundAudioService.playBlob()'s "a real playback supersedes any
   * in-flight fetch or priming" guarantee.
   */
  play(options: {
    base64Audio: string;
    contentType: string;
    text: string;
    rate?: number;
    volume?: number;
    mediaTitle?: string;
    mediaArtist?: string;
  }): Promise<void>;

  pause(): Promise<void>;
  resume(options: { rate?: number; volume?: number }): Promise<void>;
  stop(): Promise<void>;
  setRate(options: { rate: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;

  /** Synchronous-from-JS's-perspective state queries. Native state itself
   * is inherently async (AVAudioSession, notification callbacks), so these
   * answer from the plugin's own last-known state rather than querying
   * AVAudioPlayer live; nativeAudioService.ts additionally mirrors this in
   * JS so canResume()/getLoadedText() (which AudioQueueEngine calls
   * synchronously, never awaited) never need to await a bridge round trip. */
  getState(): Promise<{ loadedText: string | null; canResume: boolean }>;

  addListener(
    eventName: 'ended' | 'error' | 'interrupted' | 'remotePlay' | 'remotePause' | 'remoteNext' | 'remotePrevious' | 'remoteStop',
    listenerFunc: (data?: { message?: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;

  removeAllListeners(): Promise<void>;
}

const BackgroundAudio = registerPlugin<BackgroundAudioPlugin>('BackgroundAudio', {
  web: () => import('./backgroundAudioPluginWeb').then((module) => new module.BackgroundAudioWeb()),
});

export default BackgroundAudio;
