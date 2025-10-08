// PTEApp - Application coordinator for PTE branch
class PTEVocabularyTrainer {
  constructor() {
    this.initialized = false;
    this.init();
  }

  init() {
    // Prevent multiple initialization
    if (this.initialized) {
      console.warn('Already initialized, skipping');
      return;
    }
    this.initialized = true;

    // Show loading indicator for mobile users
    if (this.isMobileDevice()) {
      this.showMobileLoadingIndicator();
    }

    // Run cache migration before any module initialization
    // Force clear cache to ensure clean initialization
    if (window.cacheMigration) {
      window.cacheMigration.checkAndMigrate(true);
    }

    // Initialize all modules in correct order
    this.initializeModules();


    // Emit app initialization event
    if (window.eventBus) {
      window.eventBus.emit('app:initialized', {
        timestamp: new Date().toISOString(),
        version: '3.0-pte'
      });
    }
  }

  async initializeModules() {

    // 0. Register service worker for PWA and background operation
    this.registerServiceWorker();

    // 0.1. Set up service worker message handling for background audio
    this.setupServiceWorkerMessageHandling();

    // 1. Initialize state manager (must be first to restore settings)
    this.initializeStateManager();

    // 2. Initialize SettingsModule (event-driven settings architecture)
    this.initializeSettingsModule();

    // 1.3. Initialize dataset manager (Phase 2 - unified dataset loading)
    await this.initializeDatasetManager();

    // 2. Initialize PTE vocabulary manager (loads data asynchronously)
    if (window.pteVocabularyManager) {
      await window.pteVocabularyManager.initialize();
    }

    // 3. Initialize UI controller and bind events
    if (window.uiController) {
      window.uiController.bindEventListeners();
    }

    // 4. Sync settings from HTML
    if (window.uiController) {
      window.uiController.syncRepeatModeFromHTML();
    }

    // 5. Update initial UI state
    if (window.uiController) {
      window.uiController.updateUI();
    }

    // 6. Populate voice options when available
    this.initializeVoices();

    // 7. Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // 8. Setup fullscreen functionality
    this.setupFullscreen();

    // 9. Restore UI settings from state
    this.restoreUIState().catch(console.error);


    // Hide mobile loading indicator
    this.hideMobileLoadingIndicator();
  }

  initializeSettingsModule() {
    // Initialize SettingsModule for event-driven settings architecture
    if (window.SettingsModule) {
      try {
        window.settingsModule = new SettingsModule(
          window.appConfig,
          window.eventBus,
          window.storage
        );
        console.log('✅ PTEApp: SettingsModule initialized');
      } catch (error) {
        console.error('❌ PTEApp: Failed to initialize SettingsModule:', error);
      }
    } else {
      console.warn('⚠️ SettingsModule not found - using legacy settings handling');
    }
  }

  async initializeDatasetManager() {
    // Initialize DatasetManager for Phase 2 (RS, ASQ, WFD support)
    if (window.DatasetManager) {
      try {
        const datasetManager = new DatasetManager();
        const config = window.appConfig || new AppConfig();
        await datasetManager.initialize(config);
        
        // Make globally available
        window.datasetManager = datasetManager;
        
        console.log('✅ DatasetManager initialized');
      } catch (error) {
        console.warn('⚠️ DatasetManager initialization failed:', error);
      }
    } else {
      console.log('ℹ️ DatasetManager not available (Phase 2 not loaded)');
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
        })
        .catch(error => {
          console.warn('⚠️ Service Worker registration failed:', error);
        });
    }
  }

  setupServiceWorkerMessageHandling() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'AUDIO_READY') {
        }
      });
    }
  }

  async initializeVoices() {
    // Wait for voices to be available
    if (speechSynthesis.getVoices().length === 0) {
      await new Promise(resolve => {
        speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
      });
    }

    // Voice selector is ready (no initialization needed)
    if (window.voiceSelector) {
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Prevent shortcuts when typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (window.uiController) {
            window.uiController.togglePlayPause();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (window.uiController) {
            window.uiController.nextWord();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (window.uiController) {
            window.uiController.previousWord();
          }
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          if (window.uiController) {
            window.uiController.repeatCurrentWord();
          }
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Escape':
          event.preventDefault();
          if (window.settingsPanel) {
            window.settingsPanel.togglePanel();
          }
          break;
      }
    });

  }

  setupFullscreen() {
    // Fullscreen functionality is handled by the event listener above
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Could not enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Could not exit fullscreen:', err);
      });
    }
  }

  async restoreUIState() {
    // Restore user preferences from SettingsModule (single source of truth)
    if (!window.settingsModule) return;

    const preferences = window.settingsModule.exportSettings();
    if (!preferences) return;


    // Restore learning mode
    if (preferences.learningMode && window.pteVocabularyManager) {
      await window.pteVocabularyManager.setLearningMode(preferences.learningMode);
    }

    // Restore category
    if (preferences.category && window.pteVocabularyManager) {
      window.pteVocabularyManager.setCategory(preferences.category);
    }

    // Restore difficulty
    if (preferences.difficulty && window.pteVocabularyManager) {
      window.pteVocabularyManager.setDifficulty(preferences.difficulty);
    }

    // Restore repeat mode
    if (preferences.repeatMode && window.uiController) {
      window.uiController.setRepeatMode(preferences.repeatMode);
    }

    // Restore voice preference
    if (window.voiceSelector && preferences.voice && preferences.voice !== 'auto') {
      window.voiceSelector.setPreferredVoice(preferences.voice);
    }

    // Force PTE FIB listening mode
    if (window.pteVocabularyManager) {
      await window.pteVocabularyManager.setLearningMode('pte-fib-listening');
    }

  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  showMobileLoadingIndicator() {
    // Create loading indicator for mobile
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'mobile-loading';
    loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-size: 18px;
            ">
                <div style="text-align: center;">
                    <div style="margin-bottom: 20px;">🎧</div>
                    <div>Loading PTE Vocabulary Trainer...</div>
                </div>
            </div>
        `;
    document.body.appendChild(loadingDiv);
  }

  hideMobileLoadingIndicator() {
    const loadingDiv = document.getElementById('mobile-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }
}

// Initialize the app when DOM is ready
let pteApp;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pteApp = new PTEVocabularyTrainer();
    window.pteApp = pteApp;
  });
} else {
  pteApp = new PTEVocabularyTrainer();
  window.pteApp = pteApp;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PTEVocabularyTrainer;
}
