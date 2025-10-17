/**
 * SettingsModule - Centralized Settings Management with Event-Driven Architecture
 *
 * This module is the single source of truth for ALL application settings.
 * It handles validation, application to engines, persistence, and event emission.
 *
 * Architecture:
 * - View Layer (UIController) emits 'setting:request-change' events
 * - SettingsModule validates, applies, persists, and emits 'setting:changed' events
 * - Engines/Managers react to validated settings
 *
 * Benefits:
 * - Centralized validation
 * - Decoupled modules (loose coupling via EventBus)
 * - Easy to test (mock EventBus only)
 * - Scalable (handler registry pattern)
 * - Consistent behavior (UI and programmatic changes same)
 */

class SettingsModule {
    constructor(config = null, eventBus = null, storage = null) {
        // Dependencies
        this.config = config || window.appConfig;
        this.eventBus = eventBus || window.eventBus;
        this.storage = storage || window.storage;

        if (!this.config || !this.eventBus || !this.storage) {
            const missing = [];
            if (!this.config) missing.push('config');
            if (!this.eventBus) missing.push('eventBus');
            if (!this.storage) missing.push('storage');
            const errorMsg = `SettingsModule: Missing dependencies: ${missing.join(', ')}`;
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }

        // Current settings (in-memory cache)
        this.settings = {};

        // Setting handlers - declarative configuration for each setting
        this.handlers = this.initializeHandlers();

        // Load settings from storage
        this.loadSettings();

        // Listen for setting change requests (standardized event from Config.js)
        const settingsRequestChangeEvent = window.appConfig.get('events.settings.requestChange');
        this.eventBus.on(settingsRequestChangeEvent, this.handleSettingChange.bind(this));

        console.log('✅ SettingsModule: Initialized with', Object.keys(this.handlers).length, 'handlers');
    }

    /**
     * Initialize setting handlers - each setting has validate, apply, default
     * This is the heart of the module - declarative configuration for all settings
     */
    initializeHandlers() {
        return {
            // ===== AUDIO SETTINGS =====

            speed: {
                validate: (value) => {
                    const speeds = Object.values(this.config.get('tts.speeds'));
                    return speeds.includes(parseFloat(value));
                },
                apply: (value) => {
                    // Set property directly - event-driven architecture
                    if (window.ttsEngine) {
                        window.ttsEngine.speechRate = parseFloat(value);
                        console.log(`[SettingsModule] Speed set to ${value} (event-driven)`);
                    }
                },
                default: () => String(this.config.get('tts.speeds.slow')),
                storageKey: 'speed',
                description: 'TTS speech rate (slow/normal/fast)'
            },

            delay: {
                validate: (value) => {
                    // Get delays from Config.js instead of hardcoded values
                    const delays = this.config.get('tts.delays');
                    const userDelays = {
                        short: delays.short,
                        normal: delays.normal,
                        long: delays.long
                    };
                    return Object.values(userDelays).includes(parseInt(value));
                },
                apply: (value) => {
                    // Set property directly in AudioControls
                    if (window.audioControls) {
                        window.audioControls.delay = parseInt(value);
                        console.log(`[SettingsModule] Delay set to ${value}ms (event-driven)`);
                    }
                },
                default: () => String(this.config.get('tts.delays.long')),
                storageKey: 'delay',
                description: 'Pause duration between words (1/2/3 seconds)'
            },

            repeat: {
                validate: (value) => {
                    return this.config.get('tts.repeatModes').includes(value);
                },
                apply: (value) => {
                    // AudioControls listens to 'setting:changed' event
                    // No direct method call needed - event-driven architecture
                    console.log(`[SettingsModule] Repeat mode changed to ${value} (event-driven)`);

                    // Reset repeat count when mode changes
                    if (window.ttsEngine) {
                        window.ttsEngine.currentRepeatCount = 0;
                    }
                },
                default: () => this.config.get('data.defaults.repeat'),
                storageKey: 'repeat',
                description: 'Repeat mode (once/twice/intensive/loop)'
            },

            voice: {
                validate: (value) => {
                    // Always valid - voiceSelector handles auto/specific voices
                    const defaultVoice = this.config.get('data.defaults.voice');
                    return value === defaultVoice || this.isValidVoice(value);
                },
                apply: (value) => {
                    if (window.voiceSelector && typeof window.voiceSelector.setPreferredVoice === 'function') {
                        window.voiceSelector.setPreferredVoice(value);
                    } else {
                        console.warn('⚠️ VoiceSelector not ready yet, voice setting deferred');
                    }
                },
                default: () => this.config.get('data.defaults.voice'),
                storageKey: 'voice',
                description: 'TTS voice (auto or specific voice name)'
            },

            // ===== VOCABULARY SETTINGS =====

            difficulty: {
                validate: (value) => {
                    return this.config.get('data.difficulties').includes(value);
                },
                apply: (value) => {
                    if (window.pteVocabularyManager && typeof window.pteVocabularyManager.setDifficulty === 'function') {
                        window.pteVocabularyManager.setDifficulty(value);
                    } else {
                        console.warn('⚠️ PTEVocabularyManager not ready yet, difficulty setting deferred');
                    }
                },
                default: () => this.config.get('data.defaults.difficulty'),
                storageKey: 'difficulty',
                description: 'Difficulty filter (all/easy/normal/hard)'
            },

            learningMode: {
                validate: (value) => {
                    const modes = this.config.get('data.learningModes');
                    return modes.some(m => m.id === value);
                },
                apply: async (value) => {
                    if (window.pteVocabularyManager && typeof window.pteVocabularyManager.setLearningMode === 'function') {
                        await window.pteVocabularyManager.setLearningMode(value);
                    } else {
                        console.warn('⚠️ PTEVocabularyManager not ready yet, learning mode setting deferred');
                    }
                },
                default: () => this.config.get('data.defaults.learningMode'),
                storageKey: 'learningMode',
                description: 'Vocabulary book selection'
            },

            // ===== PHASE 2: PRACTICE MODE SETTINGS =====

            practiceMode: {
                validate: (value) => {
                    const modes = this.config.get('data.practiceModes');
                    return modes.some(m => m.id === value);
                },
                apply: (value) => {
                    // Get old mode from SettingsModule (not window)
                    const oldMode = this.get('practiceMode');

                    // Emit mode:changing event BEFORE the change (standardized from Config.js)
                    const modeChangingEvent = window.appConfig.get('events.mode.practice.changing');
                    this.eventBus.emit(modeChangingEvent, {
                        oldMode,
                        newMode: value,
                        timestamp: Date.now()
                    });

                    // Set global practice mode
                    window.currentPracticeMode = value;

                    // Apply practice mode mapping from Config.js - no hardcoded values
                    const modeMapping = this.config.get('data.practiceModeMapping');
                    const mapping = modeMapping && modeMapping[value];

                    if (mapping) {
                        console.log(`[SettingsModule] Applying mode mapping for '${value}':`, mapping);

                        // If this mode uses learning mode (vocabulary), ensure learning mode is set
                        if (mapping.usesLearningMode && mapping.defaultLearningMode) {
                            // Only set if no learning mode is currently set
                            const currentLearningMode = this.exportSettings().learningMode;
                            if (!currentLearningMode) {
                                console.log(`[SettingsModule] Setting default learning mode: ${mapping.defaultLearningMode}`);
                                this.updateSetting('learningMode', mapping.defaultLearningMode);
                            }
                        }

                        // If this mode uses practice dataset (rs/asq/wfd), ensure dataset is set
                        if (mapping.usesPracticeDataset && mapping.defaultPracticeDataset) {
                            // Only update if dataset actually changed (prevent duplicate events)
                            const currentDataset = this.exportSettings().practiceDataset;
                            if (currentDataset !== mapping.defaultPracticeDataset) {
                                console.log(`[SettingsModule] Setting practice dataset: ${mapping.defaultPracticeDataset}`);
                                this.updateSetting('practiceDataset', mapping.defaultPracticeDataset);
                            } else {
                                console.log(`[SettingsModule] Practice dataset already set to ${mapping.defaultPracticeDataset}, skipping update`);
                            }
                        }
                    } else {
                        console.warn(`[SettingsModule] ⚠️ No mapping found for practice mode: ${value}`);
                    }

                    // Emit mode:changed event AFTER the change (standardized from Config.js)
                    const modeChangedEvent = window.appConfig.get('events.mode.practice.changed');
                    this.eventBus.emit(modeChangedEvent, {
                        mode: value,
                        oldMode,
                        mapping: mapping || null,
                        timestamp: Date.now()
                    });
                },
                default: () => this.config.get('data.defaults.practiceMode'),
                storageKey: 'practiceMode',
                description: 'Practice type (vocabulary/rs/asq/wfd)'
            },

            practiceDataset: {
                validate: (value) => {
                    const datasets = this.config.get('data.practiceDatasets');
                    return datasets.some(d => d.id === value);
                },
                apply: async (value) => {
                    // Emit dataset changed event for loading (standardized from Config.js)
                    const datasetChangedEvent = window.appConfig.get('events.dataset.practice.changed');
                    this.eventBus.emit(datasetChangedEvent, { dataset: value });
                },
                default: () => this.config.get('data.defaults.practiceDataset'),
                storageKey: 'practiceDataset',
                description: 'Practice dataset selection (RS/ASQ/WFD)'
            }
        };
    }

    /**
     * Handle setting change request (main orchestration method)
     * Flow: validate → apply → persist → emit
     */
    async handleSettingChange({ key, value }) {
        try {
            // 1. Get handler for this setting
            const handler = this.handlers[key];
            if (!handler) {
                console.warn(`⚠️ SettingsModule: Unknown setting '${key}'`);
                return { success: false, error: 'Unknown setting', key };
            }

            // 2. Validate value
            if (handler.validate && !handler.validate.call(this, value)) {
                console.warn(`⚠️ SettingsModule: Invalid value for '${key}': ${value}`);
                return { success: false, error: 'Invalid value', key, value };
            }

            // 3. Apply to engine/manager
            if (handler.apply) {
                await handler.apply.call(this, value);
            }

            // 4. Update in-memory cache
            this.settings[key] = value;

            // 5. Persist to storage
            if (handler.storageKey) {
                this.storage.setItem(handler.storageKey, value);
            }

            // 6. Emit success event (standardized from Config.js)
            const settingsChangedEvent = window.appConfig.get('events.settings.changed');
            this.eventBus.emit(settingsChangedEvent, { key, value, timestamp: Date.now() });

            console.log(`✅ SettingsModule: Updated '${key}' = '${value}'`);
            return { success: true, key, value };

        } catch (error) {
            console.error(`❌ SettingsModule: Error updating '${key}':`, error);
            // Emit error event (standardized from Config.js)
            const settingsErrorEvent = window.appConfig.get('events.settings.error');
            this.eventBus.emit(settingsErrorEvent, { key, value, error: error.message });
            return { success: false, error: error.message, key, value };
        }
    }

    /**
     * Get current setting value
     */
    getSetting(key) {
        const handler = this.handlers[key];

        // Return cached value or default
        if (this.settings[key] !== undefined) {
            return this.settings[key];
        }

        return handler?.default?.();
    }

    /**
     * Alias for getSetting - used throughout the codebase
     */
    get(key) {
        return this.getSetting(key);
    }

    /**
     * Updates a setting by calling handleSettingChange
     * Used by other methods that need to update settings
     */
    async updateSetting(key, value) {
        return await this.handleSettingChange({ key, value });
    }

    /**
     * Get all current settings
     */
    getAllSettings() {
        const allSettings = {};

        for (const key of Object.keys(this.handlers)) {
            allSettings[key] = this.getSetting(key);
        }

        return allSettings;
    }

    /**
     * Reset all settings to defaults
     */
    async resetSettings() {
        console.log('🔄 SettingsModule: Resetting all settings to defaults...');

        for (const [key, handler] of Object.entries(this.handlers)) {
            const defaultValue = handler.default?.();
            if (defaultValue !== undefined) {
                await this.handleSettingChange({ key, value: defaultValue });
            }
        }

        // Emit settings reset event (from Config.js)
        const settingsResetEvent = this.config.get('events.settings.reset') || 'settings:reset';
        this.eventBus.emit(settingsResetEvent, { timestamp: Date.now() });
        console.log('✅ SettingsModule: All settings reset');
    }

    /**
     * Batch update multiple settings
     */
    async batchUpdate(settingsObject) {
        console.log('📦 SettingsModule: Batch updating', Object.keys(settingsObject).length, 'settings...');

        const results = {};

        for (const [key, value] of Object.entries(settingsObject)) {
            results[key] = await this.handleSettingChange({ key, value });
        }

        // Emit batch updated event (from Config.js)
        const batchUpdatedEvent = this.config.get('events.settings.batchUpdated') || 'settings:batch-updated';
        this.eventBus.emit(batchUpdatedEvent, { results, timestamp: Date.now() });
        return results;
    }

    /**
     * Load settings from storage AND apply them
     * This ensures all modules get initialized with correct values on startup
     */
    loadSettings() {
        // First, load all values from storage into this.settings
        for (const [key, handler] of Object.entries(this.handlers)) {
            if (handler.storageKey) {
                const value = this.storage.getItem(handler.storageKey);
                if (value !== null) {
                    this.settings[key] = value;
                } else {
                    // Use default if no saved value
                    const defaultValue = handler.default ? handler.default() : null;
                    if (defaultValue !== null) {
                        this.settings[key] = defaultValue;
                    }
                }
            }
        }

        // Ensure required settings are initialized with defaults if missing
        if (!this.settings.practiceMode) {
            this.settings.practiceMode = this.config.get('fallbacks.practiceMode');
            console.log(`[SettingsModule] Initialized missing practiceMode with default: ${this.settings.practiceMode}`);
        }

        if (!this.settings.repeat) {
            this.settings.repeat = this.config.get('fallbacks.repeatMode');
            console.log(`[SettingsModule] Initialized missing repeat with default: ${this.settings.repeat}`);
        }

        if (!this.settings.voice) {
            this.settings.voice = this.config.get('settings.defaults.voice');
            console.log(`[SettingsModule] Initialized missing voice with default: ${this.settings.voice}`);
        }

        console.log('📥 SettingsModule: Loaded', Object.keys(this.settings).length, 'settings from storage');

        // Then, apply all loaded settings to initialize modules correctly
        // This emits setting:changed events for each setting
        for (const [key, value] of Object.entries(this.settings)) {
            const handler = this.handlers[key];
            if (handler && handler.apply) {
                try {
                    // Apply the setting (calls engine methods) - bind 'this' context
                    handler.apply.call(this, value);
                    console.log(`[SettingsModule] ${key.charAt(0).toUpperCase() + key.slice(1)} set to ${value} (event-driven)`);
                } catch (error) {
                    console.warn(`⚠️ SettingsModule: Failed to apply '${key}' during initialization:`, error.message);
                    // Continue with other settings even if one fails
                }

                // Emit event so other modules can react
                const settingsChangedEvent = window.appConfig.get('events.settings.changed');
                this.eventBus.emit(settingsChangedEvent, { key, value });
            }
        }

        console.log('✅ SettingsModule: Applied all initial settings to modules');
    }

    /**
     * Get available options for a setting (for dropdown population)
     * Converts Config.js data to {id, label} format for dropdowns
     */
    getAvailableOptions(key, filterType = null) {
        try {
            // Validate config is available
            if (!this.config) {
                console.error('❌ SettingsModule.getAvailableOptions: config is not available');
                return [];
            }

            // For speeds and delays, convert object to array of {id, label}
            if (key === 'speed') {
                const speeds = this.config.get('tts.speeds');
                if (!speeds) {
                    console.warn('⚠️  tts.speeds not found in config');
                    return [];
                }
                return Object.keys(speeds).map(key => ({
                    id: speeds[key].toString(),
                    label: `${key.charAt(0).toUpperCase() + key.slice(1)} (${speeds[key]}x)`
                }));
            }

            if (key === 'delay') {
                const delays = this.config.get('tts.delays');
                if (!delays) {
                    console.warn('⚠️  tts.delays not found in config');
                    return [];
                }
                // Only include user-facing delays (short, normal, long)
                const userDelays = { short: delays.short, normal: delays.normal, long: delays.long };
                return Object.keys(userDelays).map(key => ({
                    id: userDelays[key].toString(),
                    label: `${key.charAt(0).toUpperCase() + key.slice(1)} (${userDelays[key] / 1000}s)`
                }));
            }

            if (key === 'repeat') {
                const repeatModes = this.config.get('tts.repeatModes');
                if (!repeatModes) {
                    console.warn('⚠️  tts.repeatModes not found in config');
                    return [];
                }
                // Provide descriptive labels for repeat modes
                const labels = {
                    'once': 'Once (1x)',
                    'twice': 'Twice (2x)',
                    'intensive': 'Intensive (3x)',
                    'loop': 'Loop (Continuous)'
                };
                return repeatModes.map(mode => ({
                    id: mode,
                    label: labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1)
                }));
            }

            if (key === 'voice') {
                // Voices are populated dynamically from browser TTS
                return [];
            }

            // For other settings, get arrays directly from config
            const optionsMap = {
                difficulty: this.config.get('data.difficulties'),
                learningMode: this.config.get('data.learningModes'),
                practiceMode: this.config.get('data.practiceModes'),
                practiceDataset: this.config.get('data.practiceDatasets')
            };

            // If it's already in {id, label} format, return as-is
            // If it's a simple array, convert to {id, label}
            let options = optionsMap[key] || [];

            // Filter practiceDatasets by type if requested
            if (key === 'practiceDataset' && filterType) {
                options = options.filter(opt => opt.type === filterType);
            }

            if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'string') {
                return options.map(opt => ({ id: opt, label: opt }));
            }

            return options;
        } catch (error) {
            console.error(`❌ SettingsModule.getAvailableOptions(${key}) error:`, error);
            return [];
        }
    }

    /**
     * Export settings as JSON
     */
    exportSettings() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            settings: this.getAllSettings()
        };
    }

    /**
     * Import settings from JSON
     */
    async importSettings(settingsData) {
        if (!settingsData || !settingsData.settings) {
            throw new Error('Invalid settings data');
        }

        console.log('📥 SettingsModule: Importing settings...');
        return await this.batchUpdate(settingsData.settings);
    }

    /**
     * Check if voice name is valid
     * @private
     */
    isValidVoice(voiceName) {
        // Simple validation - voiceSelector will handle actual availability
        return typeof voiceName === 'string' && voiceName.length > 0;
    }

    /**
     * Get handler information for debugging
     */
    getHandlerInfo(key) {
        const handler = this.handlers[key];
        if (!handler) return null;

        return {
            key,
            description: handler.description,
            currentValue: this.getSetting(key),
            defaultValue: handler.default?.(),
            hasValidation: !!handler.validate,
            hasApplication: !!handler.apply,
            storageKey: handler.storageKey
        };
    }

    /**
     * Get all handlers information (for debugging/documentation)
     */
    getAllHandlers() {
        return Object.keys(this.handlers).map(key => this.getHandlerInfo(key));
    }
}

// Export for use in Node.js tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModule;
}
