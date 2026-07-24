/**
 * React Application Entry Point
 *
 * This file initializes the React application and mounts it to the DOM.
 * Fully migrated from vanilla JS to React + TypeScript.
 */

import '@radix-ui/themes/styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './css/tailwind.css';

// Initialize configuration (must be imported before App)
// This sets up window.appConfig which is needed by PTEVocabularyManager

// Initialize voice selector (legacy, removed)
// import { ttsEngine } from './services/audio/TTSEngine';Selector';

// Mount React app to #root div
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure index.html has <div id="root"></div>');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('✅ React app mounted successfully');

// Register service worker for offline caching and PWA functionality
// Using vite-plugin-pwa for automatic updates
const SERVICE_WORKER_UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const SERVICE_WORKER_UPDATE_CHECK_THROTTLE_MS = 60 * 1000;

let lastServiceWorkerUpdateCheckAt = 0;
let isCheckingForServiceWorkerUpdate = false;
let hasRequestedServiceWorkerReload = false;
let updateSW: (reloadPage?: boolean) => Promise<void> = async () => {};

const reloadForServiceWorkerUpdate = () => {
  if (hasRequestedServiceWorkerReload) return;
  hasRequestedServiceWorkerReload = true;
  console.log('🔄 New content available, reloading to apply update.');
  updateSW(true);
};

const requestServiceWorkerUpdateCheck = (
  registration: ServiceWorkerRegistration | undefined,
  force = false
) => {
  if (!registration || isCheckingForServiceWorkerUpdate) return;

  const now = Date.now();
  if (!force && now - lastServiceWorkerUpdateCheckAt < SERVICE_WORKER_UPDATE_CHECK_THROTTLE_MS) {
    return;
  }

  lastServiceWorkerUpdateCheckAt = now;
  isCheckingForServiceWorkerUpdate = true;

  registration.update()
    .then(() => {
      if (registration.waiting) {
        reloadForServiceWorkerUpdate();
      }
    })
    .catch((error) => {
      console.warn('[PWA] Failed to check for service worker update:', error);
    })
    .finally(() => {
      isCheckingForServiceWorkerUpdate = false;
    });
};

if (window.location.protocol === 'capacitor:') {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => console.warn('[PWA] Failed to unregister service workers in native app:', error));
  }
  if ('caches' in window) {
    void caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch((error) => console.warn('[PWA] Failed to clear native app caches:', error));
  }
} else {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      reloadForServiceWorkerUpdate();
    },
    onRegisteredSW(_swScriptUrl, registration) {
      requestServiceWorkerUpdateCheck(registration, true);

      const checkForUpdates = () => requestServiceWorkerUpdateCheck(registration);
      const checkForUpdatesWhenVisible = () => {
        if (document.visibilityState === 'visible') {
          checkForUpdates();
        }
      };

      window.addEventListener('focus', checkForUpdates);
      window.addEventListener('online', checkForUpdates);
      window.addEventListener('pageshow', checkForUpdates);
      document.addEventListener('visibilitychange', checkForUpdatesWhenVisible);

      window.setInterval(
        checkForUpdates,
        SERVICE_WORKER_UPDATE_CHECK_INTERVAL_MS
      );
    },
    onOfflineReady() {
      console.log('✅ App ready to work offline');
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed:', error);
    },
  });
}

// Export for testing
export { App };
