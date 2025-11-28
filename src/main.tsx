/**
 * React Application Entry Point
 *
 * This file initializes the React application and mounts it to the DOM.
 * Fully migrated from vanilla JS to React + TypeScript.
 */

import '@radix-ui/themes/styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './css/tailwind.css';

// Initialize configuration (must be imported before App)
// This sets up window.appConfig which is needed by PTEVocabularyManager
import './ts/shared/Config';

// Initialize voice selector (legacy, removed)
// import './ts/audio/VoiceSelector';

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
// Enhanced for iOS PWA auto-update support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);

        // Check for updates immediately on iOS (PWA doesn't auto-check)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                             (window.navigator as any).standalone === true;

        if (isIOS && isStandalone) {
          console.log('📱 iOS PWA detected - enabling aggressive update checking');

          // Check for updates every 5 minutes
          setInterval(() => {
            console.log('[PWA Update] Checking for new version...');
            registration.update();
          }, 5 * 60 * 1000);

          // Also check on visibility change (app comes to foreground)
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              console.log('[PWA Update] App became visible - checking for updates');
              registration.update();
            }
          });
        }

        // Listen for updates and auto-reload
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New Service Worker version found, installing...');

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✅ New version installed!');

                // Show update notification to user
                if (confirm('🎉 New version available! Reload to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                } else {
                  console.log('⏳ User chose to update later');
                }
              }
            });
          }
        });

        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 Service Worker controller changed - reloading page');
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Export for testing
export { App };
