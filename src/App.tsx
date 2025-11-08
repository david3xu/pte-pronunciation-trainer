/**
 * Main React Application Component
 *
 * This is the root React component that will gradually replace the vanilla JS UI.
 * It integrates with the existing Zustand store for state management.
 */

import React, { useEffect } from 'react';
import { Theme } from '@radix-ui/themes';
import { useAppStore } from './ts/stores';
import WordCard from './components/WordCard';
import AIRecommendations from './components/AIRecommendations';
import AudioControls from './components/AudioControls';
import './css/tailwind.css';

const App: React.FC = () => {
  // Access Zustand store
  const { vocabulary, ui, auth } = useAppStore();
  const currentItem = vocabulary.currentItem;
  const isAuthenticated = auth.isAuthenticated;

  // Initialize app on mount
  useEffect(() => {
    console.log('React App mounted');
    // Integration with existing vanilla JS code
    // The vanilla JS PTEApp will continue to manage data loading
  }, []);

  return (
    <Theme
      appearance="light"
      accentColor="blue"
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
      <div className="react-app min-h-screen bg-background">
        {/* Header */}
        <header className="bg-surface border-b border-border px-lg py-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">
              PTE Pronunciation Trainer
            </h1>
            {isAuthenticated && (
              <div className="text-sm text-text-secondary">
                Welcome, {auth.user?.email}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-lg py-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-lg">
              {/* Word Card */}
              {currentItem && (
                <WordCard item={currentItem} />
              )}

              {/* Audio Controls */}
              <AudioControls />
            </div>

            {/* Right Column - AI Recommendations */}
            <div className="lg:col-span-1">
              {isAuthenticated && <AIRecommendations />}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-surface border-t border-border mt-2xl px-lg py-md">
          <div className="max-w-7xl mx-auto text-center text-sm text-text-secondary">
            <p>
              PTE Pronunciation Trainer v{import.meta.env.VITE_APP_VERSION || '2.5.4'}
            </p>
            <p className="mt-2">
              Built with React + TypeScript + Zustand
            </p>
          </div>
        </footer>
      </div>
    </Theme>
  );
};

export default App;
