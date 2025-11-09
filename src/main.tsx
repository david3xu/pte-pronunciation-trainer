/**
 * React Application Entry Point
 *
 * This file initializes the React application and mounts it to the DOM.
 * Fully migrated from vanilla JS to React + TypeScript.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@radix-ui/themes/styles.css';
import './css/tailwind.css';

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

// Export for testing
export { App };
