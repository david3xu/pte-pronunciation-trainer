import { beforeEach, describe, expect, it, vi } from 'vitest';

const audioCacheMock = vi.hoisted(() => ({
  clear: vi.fn(() => Promise.resolve()),
}));

vi.mock('./audio/audioCache', () => ({
  audioCache: audioCacheMock,
}));

import { clearLocalAppData } from './appDataReset';

describe('clearLocalAppData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('persisted', 'yes');
    sessionStorage.setItem('session', 'yes');
  });

  it('clears browser storage and the persistent audio cache', async () => {
    const deleteCache = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: {
        keys: vi.fn(() => Promise.resolve(['precache', 'data-cache'])),
        delete: deleteCache,
      },
    });

    await clearLocalAppData();

    expect(localStorage.getItem('persisted')).toBeNull();
    expect(sessionStorage.getItem('session')).toBeNull();
    expect(audioCacheMock.clear).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('precache');
    expect(deleteCache).toHaveBeenCalledWith('data-cache');
  });
});
