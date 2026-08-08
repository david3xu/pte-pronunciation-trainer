import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * These tests cover how the service REPORTS and RECOVERS, not whether a screen
 * lock is really held, which only a device can answer.
 *
 * Two behaviours are worth pinning. A browser declining the lock is an expected
 * outcome the app is built to survive, so it must not be reported as a fault:
 * the practice screen requests a lock as it mounts, which on Safari is always
 * before the user has interacted, and Safari declines a request made that early.
 * Reporting that at error level put a red console entry in front of every
 * session start. Second, a declined request has to be retried once the user has
 * actually interacted, or the lock is never held at all on the platform it was
 * written for.
 */

type WakeLockRequest = () => Promise<unknown>;

const DENIAL_NAME = 'NotAllowedError';
const DENIAL_MESSAGE = 'Permission was denied';

/**
 * A rejection shaped like the one Safari produces. Built as a named Error rather
 * than a DOMException on purpose: the service reads `.name` structurally instead
 * of narrowing by instanceof, precisely because DOMException is not guaranteed
 * to be an Error subclass across engines. A named Error therefore exercises the
 * same branch a real DOMException takes.
 */
function denial(): Error {
  const error = new Error(DENIAL_MESSAGE);
  error.name = DENIAL_NAME;
  return error;
}

/** Stand-in for a granted lock. Nothing here is asserted on beyond identity. */
function sentinel() {
  return {
    released: false,
    type: 'screen' as const,
    release: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

/**
 * The module exports a singleton built at import time, and its constructor reads
 * navigator once. A fresh module registry per test is the only way to get a
 * service that sees the navigator this test set up.
 *
 * The instance is kept so it can be released afterwards. That matters more than
 * it looks: a declined request leaves activation listeners on the shared window
 * until release() removes them, and every test here replaces navigator.wakeLock
 * with its own mock. A service left armed by an earlier test would therefore
 * answer this test's activation event by calling this test's mock, spending a
 * queued result the test was relying on.
 */
let loaded: { release(): Promise<void> } | null = null;

async function loadService(request: WakeLockRequest) {
  Object.defineProperty(navigator, 'wakeLock', {
    value: { request },
    configurable: true,
    writable: true,
  });
  vi.resetModules();
  const module = await import('./WakeLockService');
  loaded = module.wakeLockService;
  return module.wakeLockService;
}

function setVisibility(state: string): void {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });
}

describe('WakeLockService', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    setVisibility('visible');
  });

  afterEach(async () => {
    await loaded?.release();
    loaded = null;
    vi.restoreAllMocks();
    delete (navigator as { wakeLock?: unknown }).wakeLock;
    setVisibility('visible');
  });

  it('reports a declined lock as a warning rather than an error', async () => {
    const request = vi.fn(() => Promise.reject(denial()));
    const service = await loadService(request);

    await expect(service.request()).resolves.toBe(false);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0])).toMatch(/declined/i);
  });

  it('reports an unexplained failure at error level, where it can be seen', async () => {
    const request = vi.fn(() => Promise.reject(new Error('wake lock subsystem unavailable')));
    const service = await loadService(request);

    await expect(service.request()).resolves.toBe(false);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0])).toMatch(/subsystem unavailable/);
  });

  it('does not ask for a lock while the document is hidden', async () => {
    const request = vi.fn(() => Promise.resolve(sentinel()));
    const service = await loadService(request);
    setVisibility('hidden');

    await expect(service.request()).resolves.toBe(false);

    // A hidden document is refused by definition, so the rejection would carry
    // no information about whether the lock is actually available.
    expect(request).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('acquires the lock on the first user activation after a decline', async () => {
    const request = vi
      .fn<WakeLockRequest>()
      .mockRejectedValueOnce(denial())
      .mockResolvedValueOnce(sentinel());
    const service = await loadService(request);

    await expect(service.request()).resolves.toBe(false);
    expect(service.active).toBe(false);

    window.dispatchEvent(new Event('pointerdown'));

    await vi.waitFor(() => expect(service.active).toBe(true));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('retries at most once, so a permanent refusal cannot spend every tap', async () => {
    const request = vi.fn(() => Promise.reject(denial()));
    const service = await loadService(request);

    await expect(service.request()).resolves.toBe(false);
    window.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));

    // Both the tap that already spent the retry and a later keypress: neither
    // may produce a third request, and neither may repeat the warning.
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('keydown'));
    await Promise.resolve();

    expect(request).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('reports a decline again after a release, since the next session is a new attempt', async () => {
    const request = vi.fn(() => Promise.reject(denial()));
    const service = await loadService(request);

    await service.request();
    await service.release();
    await service.request();

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
