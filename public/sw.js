// Service Worker for PTE Pronunciation Trainer (React App)
// Handles offline caching and PWA functionality
// Updated for React + Vite build

// Version 75 - Force complete cache invalidation to clear merge conflict artifacts
const CACHE_VERSION = 'v75';
const CACHE_NAME = `pte-trainer-${CACHE_VERSION}`;

// Detect if we're in development or production mode
const isDevelopment = self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname.includes('localhost');

// Cache different files based on environment
const urlsToCache = isDevelopment ? [
  // Development mode - Vite serves files dynamically
  // Only cache essential static files
  '/',
  '/index.html',
  // Vocabulary datasets (14 books) - these are static JSON files
  '/data/processed/pte-fib-listening-dataset.json',
  '/data/processed/pte-beginner-vocabulary.json',
  '/data/processed/pte-intermediate-vocabulary.json',
  '/data/processed/pte-advanced-vocabulary.json',
  '/data/processed/pte-ra-vocabulary.json',
  '/data/processed/pte-rs-vocabulary.json',
  '/data/processed/pte-must-know-vocabulary.json',
  '/data/processed/pte-wfd-vocabulary.json',
  '/data/processed/pte-rs-wfd-vocabulary.json',
  '/data/processed/pte-reading-fib-vocabulary.json',
  '/data/processed/pte-reading-fib-drag-vocabulary.json',
  '/data/processed/pte-asq-answers-vocabulary.json',
  '/data/processed/pte-high-frequency-vocabulary.json',
  '/data/processed/pte-rs-core-vocabulary.json',
  // Phase 2: PTE practice datasets
  '/data/processed/pte-repeat-sentence-dataset.json',
  '/data/processed/pte-answer-short-question-dataset.json',
  '/data/processed/pte-write-from-dictation-dataset.json',
  '/manifest.json'
] : [
  // Production mode - cache Vite build output + JSON datasets
  '/',
  '/index.html',
  // Vocabulary datasets (14 books) - these are always needed
  '/data/processed/pte-fib-listening-dataset.json',
  '/data/processed/pte-beginner-vocabulary.json',
  '/data/processed/pte-intermediate-vocabulary.json',
  '/data/processed/pte-advanced-vocabulary.json',
  '/data/processed/pte-ra-vocabulary.json',
  '/data/processed/pte-rs-vocabulary.json',
  '/data/processed/pte-must-know-vocabulary.json',
  '/data/processed/pte-wfd-vocabulary.json',
  '/data/processed/pte-rs-wfd-vocabulary.json',
  '/data/processed/pte-reading-fib-vocabulary.json',
  '/data/processed/pte-reading-fib-drag-vocabulary.json',
  '/data/processed/pte-asq-answers-vocabulary.json',
  '/data/processed/pte-high-frequency-vocabulary.json',
  '/data/processed/pte-rs-core-vocabulary.json',
  // PTE practice datasets (3 modes)
  '/data/processed/pte-repeat-sentence-dataset.json',
  '/data/processed/pte-answer-short-question-dataset.json',
  '/data/processed/pte-write-from-dictation-dataset.json',
  '/manifest.json'
];

// Install Service Worker and Cache Resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker for background operation...');
  console.log('[SW] Environment:', isDevelopment ? 'Development' : 'Production');
  console.log('[SW] Hostname:', self.location.hostname);
  console.log('[SW] Files to cache:', urlsToCache.length);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell for offline use');
        // Cache files individually to avoid failing on missing files
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Service Worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(err => {
        console.error('[SW] Service Worker installation failed:', err);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker for background operation...');

  event.waitUntil(
    (async () => {
      // Delete ONLY old cache versions, preserve current version for offline functionality
      const cacheNames = await caches.keys();
      console.log('[SW] Found caches:', cacheNames);

      await Promise.all(
        cacheNames.map((cacheName) => {
          // Keep current version, delete old versions only
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] ❌ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          } else {
            console.log('[SW] ✅ Keeping current cache:', cacheName);
            return Promise.resolve();
          }
        })
      );

      console.log('[SW] Service Worker activated - App can now run in background');
      return self.clients.claim();
    })()
  );
});

// Fetch Event - Cache First Strategy for Background Operation
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network and cache
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              console.log('[SW] Caching new resource:', event.request.url);
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // If offline, try to serve from cache
          console.log('[SW] Network failed, trying cache for:', event.request.url);
          return caches.match(event.request);
        });
      })
  );
});

// Background Sync for Audio Playback
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-audio-sync') {
    event.waitUntil(handleBackgroundAudioSync());
  }

  // DISABLED: audio-playback sync was causing infinite loop
  // if (event.tag === 'audio-playback') {
  //   event.waitUntil(handleAudioPlaybackSync());
  // }
});

// Handle Background Audio Synchronization
async function handleBackgroundAudioSync() {
  try {
    console.log('[SW] Handling background audio sync...');

    // Notify all clients that background sync is active
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_ACTIVE',
        timestamp: Date.now()
      });
    });

    console.log('[SW] Background audio sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push Notifications for Background Operation
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received for background operation');

  const options = {
    body: 'CCL Trainer is ready for background learning!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'ccl-trainer-background',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open Trainer'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CCL Pronunciation Trainer', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        // Focus existing client if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Message Handler for Background Operation Commands
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'BACKGROUND_AUDIO_REQUEST':
      // Handle background audio requests
      handleBackgroundAudioRequest(event.data.payload);
      break;

    case 'KEEP_ALIVE':
      // Respond to keep-alive pings
      event.ports[0].postMessage({
        type: 'KEEP_ALIVE_RESPONSE',
        timestamp: Date.now()
      });
      break;

    default:
      console.log('[SW] Unknown message type:', event.data.type);
  }
});

// Handle Audio Playback Sync for iOS Background
// DISABLED: This was causing infinite loop by re-registering itself
async function handleAudioPlaybackSync() {
  try {
    // Keep the service worker alive for audio playback
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'AUDIO_PLAYBACK_SYNC',
        timestamp: Date.now(),
        message: 'Audio playback maintained in background',
        action: 'keep-alive'
      });
    });

    // REMOVED: This was causing infinite loop!
    // Register another sync to keep it alive (only if supported)
    // if (self.registration && self.registration.sync) {
    //   try {
    //     await self.registration.sync.register('audio-playback');
    //   } catch (syncError) {
    //     // Background Sync not supported, ignore silently
    //   }
    // }

    // Send notification to maintain audio session (only if supported)
    if (self.registration && self.registration.showNotification) {
      try {
        await self.registration.showNotification('CCL Trainer Audio Active', {
          body: 'Audio playback continues in background',
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: 'audio-playback',
          silent: true,
          requireInteraction: false
        });
      } catch (notifError) {
        // Notifications not supported or permission denied, ignore silently
      }
    }

  } catch (error) {
    // Ignore errors silently - background sync is optional enhancement
  }
}

// Handle Background Audio Requests
async function handleBackgroundAudioRequest(payload) {
  try {
    // Register background sync for audio playback (only if supported)
    if (self.registration && self.registration.sync) {
      try {
        await self.registration.sync.register('background-audio-sync');
        await self.registration.sync.register('audio-playback');
      } catch (syncError) {
        // Background Sync not supported, ignore silently
      }
    }

    // Notify clients of audio processing
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_AUDIO_PROCESSING',
        payload: payload,
        timestamp: Date.now()
      });
    });

  } catch (error) {
    // Ignore errors silently - background audio is optional enhancement
  }
}

// Page Visibility Change Handler for Background Operation
self.addEventListener('visibilitychange', (event) => {
  if (document.hidden) {
    console.log('[SW] App moved to background - maintaining operation...');

    // Register background sync to keep app active
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register('background-audio-sync');
      });
    }
  } else {
    console.log('[SW] App returned to foreground');
  }
});

// Error Handler
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

// Unhandled Rejection Handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

console.log('[SW] Service Worker script loaded - Background operation enabled');