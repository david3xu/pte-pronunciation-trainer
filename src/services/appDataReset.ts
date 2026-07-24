import { audioCache } from './audio/audioCache';

const clearCacheStorage = async (): Promise<void> => {
  if (typeof caches === 'undefined') return;

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
};

export const clearLocalAppData = async (): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }

  await Promise.all([
    audioCache.clear(),
    clearCacheStorage(),
  ]);
};
