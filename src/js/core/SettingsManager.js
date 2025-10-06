// SettingsManager - Centralized settings management and validation
class SettingsManager {
  constructor() {
    this.config = window.appConfig || new AppConfig();
    this.stateManager = null;
    this.settings = {};
    this.dependencies = this.initializeDependencies();
    this.initializeSettings();
  }

  /**
   * Initialize settings dependencies and relationships
   */
  initializeDependencies() {
    return {
      // Learning mode affects available categories and difficulties
      learningMode: {
        affects: ['category', 'difficulty'],
        validator: (mode) => this.config.get('data.learningModes').find(m => m.id === mode)
      },

      // Category affects available difficulties
      category: {
        affects: ['difficulty'],
        validator: (category) => Object.keys(this.config.get('data.categories')).includes(category)
      },

      // Difficulty is terminal (no dependencies)
      difficulty: {
        affects: [],
        validator: (difficulty) => this.config.get('data.difficulties').includes(difficulty)
      },

      // Audio settings are independent
      speed: {
        affects: [],
        validator: (speed) => Object.values(this.config.get('tts.speeds')).includes(parseFloat(speed))
      },

      delay: {
        affects: [],
        validator: (delay) => Object.values(this.config.get('tts.delays')).includes(parseInt(delay))
      },

      repeat: {
        affects: [],
        validator: (repeat) => this.config.get('tts.repeatModes').includes(repeat)
      },

      voice: {
        affects: [],
        validator: (voice) => voice === 'auto' || this.isValidVoice(voice)
      }
    };
  }

  /**
   * Initialize settings with defaults
   */
  initializeSettings() {
    const defaults = this.config.get('settings.defaults');

    // Initialize StateManager reference
    if (window.stateManager) {
      this.stateManager = window.stateManager;
    }

    // Load from StateManager if available
    if (this.stateManager && this.stateManager.hasPreviousSession()) {
      this.settings = this.stateManager.getUserPreferences();
    } else {
      // Use defaults from config
      this.settings = {
        category: defaults.category,
        difficulty: defaults.difficulty,
        speed: String(this.config.get(defaults.speed)),
        delay: String(this.config.get(defaults.delay)),
        repeat: defaults.repeat,
        voice: defaults.voice,
        learningMode: defaults.learningMode
      };
    }

    console.log('SettingsManager: Initialized with settings:', this.settings);
  }

  /**
   * Update a setting and handle dependencies
   */
  updateSetting(key, value) {
    // Validate the setting
    if (!this.validateSetting(key, value)) {
      console.warn(`Invalid setting: ${key} = ${value}`);
      return false;
    }

    // Update the setting
    this.settings[key] = value;

    // Handle dependencies
    this.handleDependencies(key, value);

    // Persist the setting
    this.persistSetting(key, value);

    // Emit change event
    this.emitSettingChange(key, value);

    console.log(`SettingsManager: Updated ${key} = ${value}`);
    return true;
  }

  /**
   * Handle setting dependencies
   */
  handleDependencies(changedKey, newValue) {
    const dependency = this.dependencies[changedKey];
    if (!dependency || !dependency.affects.length) return;

    // Update dependent settings
    dependency.affects.forEach(dependentKey => {
      const dependentValue = this.getDependentValue(changedKey, newValue, dependentKey);
      if (dependentValue !== undefined) {
        this.settings[dependentKey] = dependentValue;
        this.persistSetting(dependentKey, dependentValue);
        this.emitSettingChange(dependentKey, dependentValue);
      }
    });
  }

  /**
   * Get dependent setting value based on parent setting
   */
  getDependentValue(parentKey, parentValue, dependentKey) {
    switch (parentKey) {
      case 'learningMode':
        if (dependentKey === 'category') {
          return 'all-categories'; // Default category for any learning mode
        } else if (dependentKey === 'difficulty') {
          return 'normal'; // All PTE terms are normal difficulty
        }
        break;

      case 'category':
        if (dependentKey === 'difficulty') {
          return 'normal'; // All PTE terms are normal difficulty
        }
        break;
    }
    return undefined;
  }

  /**
   * Validate a setting value
   */
  validateSetting(key, value) {
    const dependency = this.dependencies[key];
    if (!dependency) return false;

    return dependency.validator(value);
  }

  /**
   * Check if voice is valid
   */
  isValidVoice(voice) {
    if (voice === 'auto') return true;

    // Check against available voices
    const availableVoices = speechSynthesis.getVoices();
    return availableVoices.some(v => v.name === voice);
  }

  /**
   * Persist setting to storage
   */
  persistSetting(key, value) {
    const storageKeys = this.config.get('settings.storageKeys');
    const storageKey = storageKeys[key];

    if (storageKey) {
      // Save to legacy storage
      window.storage.setItem(storageKey, value);

      // Save to StateManager if available
      if (this.stateManager) {
        this.stateManager.saveUserPreference(key, value);
      }
    }
  }

  /**
   * Emit setting change event
   */
  emitSettingChange(key, value) {
    const eventName = this.config.get('settings.events.changed');
    window.eventBus.emit(eventName, {
      key: key,
      value: value,
      timestamp: Date.now()
    });
  }

  /**
   * Get current setting value
   */
  getSetting(key) {
    return this.settings[key];
  }

  /**
   * Get all current settings
   */
  getAllSettings() {
    return { ...this.settings };
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings() {
    this.initializeSettings();

    // Emit reset event
    const eventName = this.config.get('settings.events.reset');
    window.eventBus.emit(eventName, {
      timestamp: Date.now()
    });

    console.log('SettingsManager: Reset all settings to defaults');
  }

  /**
   * Get available options for a setting based on current context
   */
  getAvailableOptions(key) {
    switch (key) {
      case 'learningMode':
        return this.config.get('data.learningModes');

      case 'category':
        return Object.entries(this.config.get('data.categories')).map(([id, label]) => ({
          id, label
        }));

      case 'difficulty':
        return this.config.get('data.difficulties').map(diff => ({
          id: diff,
          label: diff === 'all' ? '🌟 All Difficulties' :
                 diff === 'normal' ? '🟡 Normal (436 terms)' :
                 diff === 'hard' ? '🔴 Hard (411 terms)' :
                 diff === 'easy' ? '🟢 Easy (38 terms)' :
                 `🟡 ${diff.charAt(0).toUpperCase() + diff.slice(1)}`
        }));

      case 'speed':
        return Object.entries(this.config.get('tts.speeds')).map(([key, value]) => ({
          id: String(value),
          label: key.charAt(0).toUpperCase() + key.slice(1)
        }));

      case 'delay':
        return Object.entries(this.config.get('tts.delays')).map(([key, value]) => ({
          id: String(value),
          label: key === 'short' ? '1 sec' :
            key === 'normal' ? '2 sec' :
              key === 'long' ? '3 sec' : '4 sec'
        }));

      case 'repeat':
        return this.config.get('tts.repeatModes').map(mode => ({
          id: mode,
          label: mode === 'once' ? '1x - Single Pronunciation' :
            mode === 'twice' ? '2x - Slow + Normal Speed' :
              mode === 'intensive' ? '3x - Slow + Normal + Fast' :
                'Loop - Continuous Practice'
        }));

      case 'voice':
        return [{ id: 'auto', label: '🎯 Auto (Best Match)' }];

      default:
        return [];
    }
  }
}

// Global settings manager instance
const settingsManager = new SettingsManager();

// Register with new namespace (if available)
if (window.CCLApp) {
  window.CCLApp.registerModule('settingsManager', settingsManager);
}

// Legacy compatibility - maintain existing global reference
window.settingsManager = settingsManager;
