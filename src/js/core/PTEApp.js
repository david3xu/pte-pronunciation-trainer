/**
 * PTEApp - Application coordinator for PTE branch
 * Manages module initialization, dependency ordering, and application lifecycle
 */
class PTEVocabularyTrainer {
  constructor() {
    this.initialized = false;
    this.init();
  }

  /**
   * Initialize the application
   * Sets up modules in dependency order and emits app:initialized event
   */
  init() {
    // Prevent multiple initialization
    if (this.initialized) {
      console.warn('Already initialized, skipping');
      return;
    }
    this.initialized = true;

    // Set global initializing flag to prevent event loops during startup
    window.initializing = true;

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
      const appInitEvent = window.appConfig.get('events.app.initialized') || 'app:initialized';
      window.eventBus.emit(appInitEvent, {
        timestamp: new Date().toISOString(),
        version: '3.0-pte'
      });
    }
  }

  /**
   * Initialize all application modules in correct dependency order
   * Critical modules will throw errors if initialization fails
   * @async
   */
  async initializeModules() {
    console.log('🚀 PTEApp: Starting module initialization...');
    const initStart = Date.now();

    // 0. Register service worker for PWA and background operation
    this.registerServiceWorker();

    // 0.1. Set up service worker message handling for background audio
    this.setupServiceWorkerMessageHandling();

    // 0.2. Initialize DataSchema with Config (single source of truth for data structures)
    this.initializeDataSchema();
    this.validateModule('DataSchema', window.dataSchema, {
      requiredProperties: ['schemas', 'config', 'validate'],
      critical: true
    });

    // 1. Initialize SettingsModule (event-driven settings architecture)
    // Note: StateManager was removed - settings now load directly from storage
    await this.initializeSettingsModule();
    this.validateModule('SettingsModule', window.settingsModule, {
      requiredProperties: ['settings', 'config', 'eventBus'],
      critical: true
    });

    // 2. Initialize dataset manager (Phase 2 - unified dataset loading)
    await this.initializeDatasetManager();
    this.validateModule('DatasetManager', window.datasetManager, {
      requiredProperties: ['datasets'],
      critical: false // Not critical - vocabulary manager is primary
    });

    // 3. Initialize PTE vocabulary manager (loads data asynchronously)
    if (window.pteVocabularyManager) {
      await window.pteVocabularyManager.initialize();
      this.validateModule('PTEVocabularyManager', window.pteVocabularyManager, {
        requiredProperties: ['datasets', 'currentWords'],
        critical: true,
        customCheck: () => window.pteVocabularyManager.datasets.size > 0,
        customCheckMessage: 'No datasets loaded'
      });
    } else {
      console.error('❌ PTEApp: pteVocabularyManager not found');
      throw new Error('Critical module pteVocabularyManager not available');
    }

    // 4. Initialize UI controller and bind events
    if (window.uiController) {
      window.uiController.bindEventListeners();
      this.validateModule('UIController', window.uiController, {
        requiredProperties: ['config'],
        critical: true
      });
    } else {
      console.error('❌ PTEApp: uiController not found');
      throw new Error('Critical module uiController not available');
    }

    // 5. Sync settings from HTML
    if (window.uiController) {
      window.uiController.syncRepeatModeFromHTML();
    }

    // 6. Update initial UI state
    if (window.uiController) {
      window.uiController.updateUI();
    }

    // 7. Populate voice options when available
    this.initializeVoices();

    // 8. Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // 9. Setup fullscreen functionality
    this.setupFullscreen();

    // 10. Restore UI settings from state
    this.restoreUIState().catch(console.error);

    // Hide mobile loading indicator
    this.hideMobileLoadingIndicator();

    const initTime = Date.now() - initStart;
    console.log(`✅ PTEApp: All modules initialized successfully in ${initTime}ms`);

    // Clear initializing flag now that all modules are ready
    window.initializing = false;
    console.log(`✅ PTEApp: Initialization complete, application ready for events`);
  }

  /**
   * Initialize SettingsModule for event-driven settings architecture
   * @async
   * @throws {Error} If SettingsModule class not found or initialization fails
   */
  async initializeSettingsModule() {
    // Initialize SettingsModule for event-driven settings architecture
    if (typeof SettingsModule !== 'undefined') {
      try {
        window.settingsModule = new SettingsModule(
          window.appConfig,
          window.eventBus,
          window.storage
        );
        console.log('✅ PTEApp: SettingsModule initialized');

        // Validate SettingsModule is ready
        if (!window.settingsModule.settings) {
          throw new Error('SettingsModule initialized but settings object is missing');
        }
      } catch (error) {
        console.error('❌ PTEApp: Failed to initialize SettingsModule:', error);
        throw error; // Propagate error - settings are critical
      }
    } else {
      const errorMsg = 'SettingsModule class not found - check script loading order';
      console.error('❌ PTEApp:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Validate that a module initialized correctly
   * @param {string} moduleName - Name of the module for logging
   * @param {Object} moduleInstance - The module instance to validate
   * @param {Object} options - Validation options
   */
  validateModule(moduleName, moduleInstance, options = {}) {
    const {
      requiredProperties = [],
      critical = false,
      customCheck = null,
      customCheckMessage = 'Custom validation failed'
    } = options;

    // Check module exists
    if (!moduleInstance) {
      const errorMsg = `${moduleName} is null or undefined`;
      console.error(`❌ PTEApp: ${errorMsg}`);
      if (critical) {
        throw new Error(`Critical module validation failed: ${errorMsg}`);
      }
      return false;
    }

    // Check required properties
    const missingProps = requiredProperties.filter(prop => !(prop in moduleInstance));
    if (missingProps.length > 0) {
      const errorMsg = `${moduleName} missing required properties: ${missingProps.join(', ')}`;
      console.error(`❌ PTEApp: ${errorMsg}`);
      if (critical) {
        throw new Error(`Critical module validation failed: ${errorMsg}`);
      }
      return false;
    }

    // Run custom validation check
    if (customCheck && typeof customCheck === 'function') {
      try {
        const result = customCheck();
        if (!result) {
          const errorMsg = `${moduleName} failed custom validation: ${customCheckMessage}`;
          console.error(`❌ PTEApp: ${errorMsg}`);
          if (critical) {
            throw new Error(`Critical module validation failed: ${errorMsg}`);
          }
          return false;
        }
      } catch (error) {
        const errorMsg = `${moduleName} custom validation threw error: ${error.message}`;
        console.error(`❌ PTEApp: ${errorMsg}`);
        if (critical) {
          throw new Error(`Critical module validation failed: ${errorMsg}`);
        }
        return false;
      }
    }

    console.log(`✅ PTEApp: ${moduleName} validation passed`);
    return true;
  }

  /**
   * Initialize DatasetManager for Phase 2 (RS, ASQ, WFD support)
   * Non-critical - logs warning if initialization fails
   * @async
   */
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

  /**
   * Initialize DataSchema with Config injection (single source of truth)
   */
  initializeDataSchema() {
    // If DataSchema exists but hasn't been initialized with Config
    if (!window.dataSchema) {
      console.log('🔄 PTEApp: Initializing DataSchema with Config...');
      try {
        // Create new instance with Config injection
        window.dataSchema = new DataSchema(window.appConfig);
        console.log('✅ PTEApp: DataSchema initialized');
      } catch (error) {
        console.error('❌ PTEApp: Failed to initialize DataSchema:', error);
      }
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
    // Wait for voices to be available with timeout
    if (speechSynthesis.getVoices().length === 0) {
      console.log('[PTEApp] Waiting for voices to load...');
      
      // Wait for voiceschanged event with 3 second timeout
      let voicesLoaded = false;
      await Promise.race([
        new Promise(resolve => {
          speechSynthesis.addEventListener('voiceschanged', () => {
            voicesLoaded = true;
            console.log('[PTEApp] ✅ Voices loaded:', speechSynthesis.getVoices().length);
            resolve();
          }, { once: true });
        }),
        new Promise(resolve => setTimeout(() => {
          if (!voicesLoaded) {
            console.warn('[PTEApp] ⚠️  Voice loading timeout after 3s');
          }
          resolve();
        }, 3000))
      ]);
      
      // Check if we have voices after waiting
      const voiceCount = speechSynthesis.getVoices().length;
      if (voiceCount === 0) {
        console.error('[PTEApp] ❌ No voices available after initialization');
      }
    } else {
      console.log('[PTEApp] ✅ Voices already available:', speechSynthesis.getVoices().length);
    }

    // Voice selector is ready (no initialization needed)
    if (window.voiceSelector) {
      console.log('[PTEApp] ✅ VoiceSelector ready');
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
