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

/**
 * Rejection name used when the browser declines the lock rather than failing.
 *
 * A decline is an expected outcome the app is built to survive: the screen may
 * sleep and practice continues either way. It is emphatically not the same as an
 * unexpected fault, and conflating the two is what put a red console entry in
 * front of every session start.
 */
const WAKE_LOCK_DENIED_ERROR_NAME = 'NotAllowedError';

/**
 * Events that establish user activation.
 *
 * Safari declines a wake lock requested before the user has interacted with the
 * page, and the app requests one as the practice screen mounts, which is always
 * earlier than that. Re-requesting on the first of these is what lets the lock
 * actually be held on the platform it matters most on: an unattended listening
 * session on a phone is exactly the screen that must not sleep.
 */
const USER_ACTIVATION_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;

/** Visibility state in which a wake lock request can succeed at all. */
const VISIBLE_DOCUMENT_STATE = 'visible';

/** Read a name off an unknown rejection without assuming it is an Error. A
 * DOMException is not guaranteed to be one across engines. */
function readErrorName(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('name' in error)) return '';
  const { name } = error as { name: unknown };
  return typeof name === 'string' ? name : '';
}

class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isSupported: boolean = false;
  /** A denial is reported once per lock lifecycle. Repeating it on every
   * re-acquire attempt says nothing new and buries real errors. */
  private denialReported = false;
  private activationRetryArmed = false;
  /** One retry per lifecycle. Without this bound, a browser that denies for a
   * reason user activation cannot fix would turn every tap into another
   * rejected request. */
  private activationRetryUsed = false;

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

    // A hidden document is refused by definition, so asking produces a
    // rejection that carries no information about whether the lock is
    // available. The visibility listener below re-requests once it is visible.
    if (document.visibilityState !== VISIBLE_DOCUMENT_STATE) {
      return false;
    }

    try {
      const nav = navigator as NavigatorWithWakeLock;
      this.wakeLock = await nav.wakeLock!.request('screen');

      this.denialReported = false;
      console.log('[WakeLock] Screen wake lock acquired - screen will stay on');

      // Re-acquire if released (e.g., when tab becomes visible again)
      this.wakeLock.addEventListener('release', () => {
        console.log('[WakeLock] Released');
        this.wakeLock = null;
      });

      // Re-acquire when page becomes visible again
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      return true;
    } catch (error) {
      this.reportRequestFailure(error);
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
    this.disarmActivationRetry();
    this.activationRetryUsed = false;
    this.denialReported = false;
  }

  /**
   * Handle visibility change - re-acquire lock when page becomes visible
   */
  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === VISIBLE_DOCUMENT_STATE && !this.active) {
      console.log('[WakeLock] Page visible again, re-acquiring...');
      await this.request();
    }
  };

  /**
   * Separates a browser declining the lock from an actual fault.
   *
   * The app degrades cleanly when the lock is unavailable, so a denial is not an
   * error condition and must not be logged as one. Anything that is not a denial
   * is unexplained and stays at error level, where it can be seen.
   */
  private reportRequestFailure(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    if (readErrorName(error) !== WAKE_LOCK_DENIED_ERROR_NAME) {
      console.error('[WakeLock] Failed to acquire:', message);
      return;
    }

    if (!this.denialReported) {
      this.denialReported = true;
      console.warn('[WakeLock] Declined by the browser, screen may turn off:', message);
    }
    this.armActivationRetry();
  }

  /** Re-request on the first user activation, at most once per lifecycle. */
  private armActivationRetry(): void {
    if (this.activationRetryArmed || this.activationRetryUsed) return;
    this.activationRetryArmed = true;
    for (const eventName of USER_ACTIVATION_EVENTS) {
      window.addEventListener(eventName, this.handleUserActivation, { passive: true });
    }
  }

  private disarmActivationRetry(): void {
    if (!this.activationRetryArmed) return;
    this.activationRetryArmed = false;
    for (const eventName of USER_ACTIVATION_EVENTS) {
      window.removeEventListener(eventName, this.handleUserActivation);
    }
  }

  /** Every armed listener is removed here, not by a once option on each: the
   * first activation event to fire is the one that counts, and leaving the
   * others registered would spend later taps re-entering this path. */
  private handleUserActivation = (): void => {
    this.activationRetryUsed = true;
    this.disarmActivationRetry();
    void this.request();
  };
}

// Singleton instance
export const wakeLockService = new WakeLockService();
