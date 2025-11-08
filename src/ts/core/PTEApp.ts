/**
 * PTEApp - Application coordinator for PTE branch
 *
 * Type-safe main application coordinator
 * Manages module initialization, dependency ordering, and application lifecycle
 */

/**
 * Module validation options
 */
interface ValidationOptions {
  requiredProperties?: string[];
  critical?: boolean;
  customCheck?: (() => boolean) | null;
  customCheckMessage?: string;
}

/**
 * PTEVocabularyTrainer - Main application class
 *
 * Coordinates initialization of all modules
 * Handles keyboard shortcuts, fullscreen, and mobile UX
 */
export class PTEVocabularyTrainer {
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the application
   * Sets up modules in dependency order and emits app:initialized event
   */
  init(): void {
    // Prevent multiple initialization
    if (this.initialized) {
      console.warn('Already initialized, skipping');
      return;
    }
    this.initialized = true;

    // Set global initializing flag to prevent event loops during startup
    (window as any).initializing = true;

    // Show loading indicator for mobile users
    if (this.isMobileDevice()) {
      this.showMobileLoadingIndicator();
    }

    // Run cache migration before any module initialization
    // Force clear cache to ensure clean initialization
    if ((window as any).cacheMigration) {
      (window as any).cacheMigration.checkAndMigrate(true);
    }

    // Initialize all modules in correct order
    this.initializeModules();

    // Note: App initialization event removed (informational, no listeners)
    console.log('✅ PTEApp: Initialized successfully - v3.0-pte');
  }

  /**
   * Initialize all application modules in correct dependency order
   * Critical modules will throw errors if initialization fails
   */
  async initializeModules(): Promise<void> {
    console.log('🚀 PTEApp: Starting module initialization...');
    const initStart = Date.now();

    // 0. Register service worker for PWA and background operation
    this.registerServiceWorker();

    // 0.1. Set up service worker message handling for background audio
    this.setupServiceWorkerMessageHandling();

    // 0.2. Initialize DataSchema with Config (single source of truth for data structures)
    this.initializeDataSchema();
    this.validateModule('DataSchema', (window as any).dataSchema, {
      requiredProperties: ['schemas', 'config', 'validate'],
      critical: true
    });

    // 1. Initialize SettingsModule (event-driven settings architecture)
    // Note: StateManager was removed - settings now load directly from storage
    await this.initializeSettingsModule();
    this.validateModule('SettingsModule', (window as any).settingsModule, {
      requiredProperties: ['settings', 'config', 'eventBus'],
      critical: true
    });

    // 2. Initialize dataset manager (Phase 2 - unified dataset loading)
    await this.initializeDatasetManager();
    this.validateModule('DatasetManager', (window as any).datasetManager, {
      requiredProperties: ['datasets'],
      critical: false // Not critical - vocabulary manager is primary
    });

    // 3. Initialize PTE vocabulary manager (loads data asynchronously)
    if ((window as any).pteVocabularyManager) {
      await (window as any).pteVocabularyManager.initialize();
      this.validateModule('PTEVocabularyManager', (window as any).pteVocabularyManager, {
        requiredProperties: ['datasets', 'currentWords'],
        critical: true,
        customCheck: () => (window as any).pteVocabularyManager.datasets.size > 0,
        customCheckMessage: 'No datasets loaded'
      });
    } else {
      console.error('❌ PTEApp: pteVocabularyManager not found');
      throw new Error('Critical module pteVocabularyManager not available');
    }

    // 4. Initialize UI controller and bind events
    if ((window as any).uiController) {
      (window as any).uiController.bindEventListeners();
      this.validateModule('UIController', (window as any).uiController, {
        requiredProperties: ['config'],
        critical: true
      });
    } else {
      console.error('❌ PTEApp: uiController not found');
      throw new Error('Critical module uiController not available');
    }

    // 5. Sync settings from HTML
    if ((window as any).uiController) {
      (window as any).uiController.syncRepeatModeFromHTML();
    }

    // 6. Update initial UI state
    if ((window as any).uiController) {
      (window as any).uiController.updateUI();
    }

    // 7. Populate voice options when available
    await this.initializeVoices();

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
    (window as any).initializing = false;
    console.log(`✅ PTEApp: Initialization complete, application ready for events`);
  }

  /**
   * Initialize SettingsModule for event-driven settings architecture
   *
   * @throws Error if SettingsModule class not found or initialization fails
   */
  async initializeSettingsModule(): Promise<void> {
    // Initialize SettingsModule for event-driven settings architecture
    if (typeof (window as any).SettingsModule !== 'undefined') {
      try {
        (window as any).settingsModule = new (window as any).SettingsModule(
          (window as any).appConfig,
          (window as any).eventBus,
          (window as any).storage
        );
        console.log('✅ PTEApp: SettingsModule initialized');

        // Validate SettingsModule is ready
        if (!(window as any).settingsModule.settings) {
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
   *
   * @param moduleName - Name of the module for logging
   * @param moduleInstance - The module instance to validate
   * @param options - Validation options
   * @returns True if validation passed
   */
  validateModule(moduleName: string, moduleInstance: any, options: ValidationOptions = {}): boolean {
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
        const err = error as Error;
        const errorMsg = `${moduleName} custom validation threw error: ${err.message}`;
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
   */
  async initializeDatasetManager(): Promise<void> {
    // Initialize DatasetManager for Phase 2 (RS, ASQ, WFD support)
    if ((window as any).DatasetManager) {
      try {
        const datasetManager = new (window as any).DatasetManager();
        const config = (window as any).appConfig || new (window as any).AppConfig();
        await datasetManager.initialize(config);

        // Make globally available
        (window as any).datasetManager = datasetManager;

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
  initializeDataSchema(): void {
    // If DataSchema exists but hasn't been initialized with Config
    if (!(window as any).dataSchema) {
      console.log('🔄 PTEApp: Initializing DataSchema with Config...');
      try {
        // Create new instance with Config injection
        (window as any).dataSchema = new (window as any).DataSchema((window as any).appConfig);
        console.log('✅ PTEApp: DataSchema initialized');
      } catch (error) {
        console.error('❌ PTEApp: Failed to initialize DataSchema:', error);
      }
    }
  }

  /**
   * Register service worker for PWA support
   */
  registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(_registration => {
          // Service worker registered successfully
        })
        .catch(error => {
          console.warn('⚠️ Service Worker registration failed:', error);
        });
    }
  }

  /**
   * Setup service worker message handling for background audio
   */
  setupServiceWorkerMessageHandling(): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'AUDIO_READY') {
          // Handle audio ready event from service worker
        }
      });
    }
  }

  /**
   * Initialize voices with timeout
   * Waits for voiceschanged event or 3 second timeout
   */
  async initializeVoices(): Promise<void> {
    // Wait for voices to be available with timeout
    if (speechSynthesis.getVoices().length === 0) {
      console.log('[PTEApp] Waiting for voices to load...');

      // Wait for voiceschanged event with 3 second timeout
      let voicesLoaded = false;
      await Promise.race([
        new Promise<void>(resolve => {
          speechSynthesis.addEventListener('voiceschanged', () => {
            voicesLoaded = true;
            console.log('[PTEApp] ✅ Voices loaded:', speechSynthesis.getVoices().length);
            resolve();
          }, { once: true });
        }),
        new Promise<void>(resolve => setTimeout(() => {
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
    if ((window as any).voiceSelector) {
      console.log('[PTEApp] ✅ VoiceSelector ready');
    }
  }

  /**
   * Setup keyboard shortcuts
   * Space: Play/Pause, Arrows: Navigate, R: Repeat, F: Fullscreen, Esc: Settings
   */
  setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if ((window as any).uiController) {
            (window as any).uiController.togglePlayPause();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if ((window as any).uiController) {
            (window as any).uiController.nextWord();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if ((window as any).uiController) {
            (window as any).uiController.previousWord();
          }
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          if ((window as any).uiController) {
            (window as any).uiController.repeatCurrentWord();
          }
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Escape':
          event.preventDefault();
          if ((window as any).settingsPanel) {
            (window as any).settingsPanel.togglePanel();
          }
          break;
      }
    });
  }

  /**
   * Setup fullscreen functionality
   * Handled by keyboard shortcut listener
   */
  setupFullscreen(): void {
    // Fullscreen functionality is handled by the event listener above
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(): void {
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

  /**
   * Restore UI state from settings
   * Restores learning mode, category, difficulty, repeat mode, voice
   */
  async restoreUIState(): Promise<void> {
    // Restore user preferences from SettingsModule (single source of truth)
    if (!(window as any).settingsModule) return;

    const preferences = (window as any).settingsModule.exportSettings();
    if (!preferences) return;

    // Restore learning mode
    if (preferences.learningMode && (window as any).pteVocabularyManager) {
      await (window as any).pteVocabularyManager.setLearningMode(preferences.learningMode);
    }

    // Restore category
    if (preferences.category && (window as any).pteVocabularyManager) {
      (window as any).pteVocabularyManager.setCategory(preferences.category);
    }

    // Restore difficulty
    if (preferences.difficulty && (window as any).pteVocabularyManager) {
      (window as any).pteVocabularyManager.setDifficulty(preferences.difficulty);
    }

    // Restore repeat mode
    if (preferences.repeatMode && (window as any).uiController) {
      (window as any).uiController.setRepeatMode(preferences.repeatMode);
    }

    // Restore voice preference
    if ((window as any).voiceSelector && preferences.voice && preferences.voice !== 'auto') {
      (window as any).voiceSelector.setPreferredVoice(preferences.voice);
    }

    // Force PTE FIB listening mode
    if ((window as any).pteVocabularyManager) {
      await (window as any).pteVocabularyManager.setLearningMode('pte-fib-listening');
    }
  }

  /**
   * Detect if running on mobile device
   */
  isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Show mobile loading indicator
   */
  showMobileLoadingIndicator(): void {
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

  /**
   * Hide mobile loading indicator
   */
  hideMobileLoadingIndicator(): void {
    const loadingDiv = document.getElementById('mobile-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }
}

// Initialize the app when DOM is ready
let pteApp: PTEVocabularyTrainer | undefined;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pteApp = new PTEVocabularyTrainer();
    (window as any).pteApp = pteApp;
  });
} else {
  pteApp = new PTEVocabularyTrainer();
  (window as any).pteApp = pteApp;
}

/**
 * Global type declarations
 */
declare global {
  interface Window {
    pteApp: PTEVocabularyTrainer;
    initializing: boolean;
  }
}

// Export for module systems
export default PTEVocabularyTrainer;
