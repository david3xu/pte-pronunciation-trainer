import React from 'react';
import { AppContent } from './components/AppContent';
import { ToastProvider } from './components/shared/ToastProvider';
import './css/tailwind.css';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
