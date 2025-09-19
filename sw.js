// Service Worker for Background Operation and PWA Functionality
const CACHE_NAME = 'ccl-trainer-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/css/style.css',
  '/src/css/dark-mode.css',
  '/src/js/core/App.js',
  '/src/js/core/VocabularyManager.js',
  '/src/js/audio/TTSEngine.js',
  '/src/js/audio/AudioControls.js',
  '/src/js/ui/UIController.js',
  '/src/js/ui/SettingsPanel.js',
  '/data/generated/conversation-vocabulary-data.json',
  '/data/generated/pronunciation-vocabulary-data.json',
  '/manifest.json'
];

// Install Service Worker and Cache Resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker for background operation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell for offline use');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Service Worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate Service Worker and Clean Old Caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker for background operation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker activated - App can now run in background');
      return self.clients.claim(); // Take control immediately
    })
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
  
  if (event.tag === 'audio-playback') {
    event.waitUntil(handleAudioPlaybackSync());
  }
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
async function handleAudioPlaybackSync() {
  try {
    console.log('[SW] Handling audio playback sync for iOS background...');
    
    // Keep the service worker alive for audio playback
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'AUDIO_PLAYBACK_SYNC',
        timestamp: Date.now(),
        message: 'Audio playback maintained in background'
      });
    });
    
    // Register another sync to keep it alive
    if (self.registration && self.registration.sync) {
      await self.registration.sync.register('audio-playback');
    }
    
  } catch (error) {
    console.error('[SW] Audio playback sync failed:', error);
  }
}

// Handle Background Audio Requests
async function handleBackgroundAudioRequest(payload) {
  try {
    console.log('[SW] Handling background audio request:', payload);
    
    // Register background sync for audio playback
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-audio-sync');
      await registration.sync.register('audio-playback');
      console.log('[SW] Background audio sync registered');
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
    console.error('[SW] Background audio request failed:', error);
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