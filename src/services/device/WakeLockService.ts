/**
 * Screen Wake Lock Service
 *
 * Keeps the device screen on during practice sessions.
 * Uses the Screen Wake Lock API (supported in Chrome, Edge, Safari 16.4+)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
 */

type WakeLockSentinel = {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
};

// Use type assertion instead of interface extension to avoid conflicts
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
};

class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'wakeLock' in navigator;
    if (!this.isSupported) {
      console.log('[WakeLock] Screen Wake Lock API not supported in this browser');
    }
  }

  /**
   * Check if wake lock is supported
   */
  get supported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if wake lock is currently active
   */
  get active(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  /**
   * Request screen wake lock to keep the screen on
   * @returns true if successfully acquired, false otherwise
   */
  async request(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[WakeLock] Not supported - screen may turn off');
      return false;
    }

    // Already have an active lock
    if (this.active) {
      console.log('[WakeLock] Already active');
      return true;
    }

    try {
      const nav = navigator as NavigatorWithWakeLock;
      this.wakeLock = await nav.wakeLock!.request('screen');

      console.log('[WakeLock] ✅ Screen wake lock acquired - screen will stay on');

      // Re-acquire if released (e.g., when tab becomes visible again)
      this.wakeLock.addEventListener('release', () => {
        console.log('[WakeLock] Released');
        this.wakeLock = null;
      });

      // Re-acquire when page becomes visible again
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[WakeLock] Failed to acquire:', errorMessage);
      return false;
    }
  }

  /**
   * Release the screen wake lock
   */
  async release(): Promise<void> {
    if (this.wakeLock && !this.wakeLock.released) {
      try {
        await this.wakeLock.release();
        console.log('[WakeLock] Released by user');
      } catch (error) {
        console.error('[WakeLock] Failed to release:', error);
      }
    }
    this.wakeLock = null;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handle visibility change - re-acquire lock when page becomes visible
   */
  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && !this.active) {
      console.log('[WakeLock] Page visible again, re-acquiring...');
      await this.request();
    }
  };
}

// Singleton instance
export const wakeLockService = new WakeLockService();
