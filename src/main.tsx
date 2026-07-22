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
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('🔄 New content available, reloading to apply update.');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('✅ App ready to work offline');
  },
});

// Export for testing
export { App };
