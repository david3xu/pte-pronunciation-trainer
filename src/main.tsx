/**
 * React Application Entry Point
 *
 * This file initializes the React application and mounts it to the DOM.
 * It coexists with the vanilla JS app during the migration phase.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@radix-ui/themes/styles.css';
import './css/tailwind.css';

// Mount React app to #react-root div
const rootElement = document.getElementById('react-root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ React app mounted successfully');
} else {
  console.warn('⚠️ React root element (#react-root) not found - skipping React mount');
  // Vanilla JS app will continue to work
}

// Export for testing
export { App };
