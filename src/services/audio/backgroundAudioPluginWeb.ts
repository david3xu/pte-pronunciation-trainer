import { WebPlugin } from '@capacitor/core';
import type { BackgroundAudioPlugin } from './backgroundAudioPlugin';

/**
 * Never actually used: audioServiceForPlatform.ts selects
 * backgroundAudioService on web, so this class is never constructed there.
 * It exists only because registerPlugin() requires a web implementation to
 * satisfy its type contract. Every method throws rather than silently doing
 * nothing, so a bug that somehow routed a web build through here would fail
 * loudly instead of pretending to work.
 */
export class BackgroundAudioWeb extends WebPlugin implements BackgroundAudioPlugin {
  private unreachable(method: string): never {
    throw new Error(
      `BackgroundAudioWeb.${method} should never be called: web builds use backgroundAudioService directly, not this plugin.`
    );
  }

  async play(): Promise<{ duration?: number } | void> {
    this.unreachable('play');
  }

  async pause(): Promise<void> {
    this.unreachable('pause');
  }

  async resume(): Promise<void> {
    this.unreachable('resume');
  }

  async stop(): Promise<void> {
    this.unreachable('stop');
  }

  async setRate(): Promise<void> {
    this.unreachable('setRate');
  }

  async setVolume(): Promise<void> {
    this.unreachable('setVolume');
  }

  async getState(): Promise<{ loadedText: string | null; canResume: boolean }> {
    this.unreachable('getState');
  }
}
