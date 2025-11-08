/**
 * SettingsModule - Type-Safe Centralized Settings Management
 *
 * Single source of truth for ALL application settings with event-driven architecture.
 * Handles validation, application to engines, persistence, and event emission.
 *
 * Architecture:
 * - View Layer emits 'setting:request-change' events
 * - SettingsModule validates, applies, persists, and emits 'setting:changed' events
 * - Engines/Managers react to validated settings
 *
 * TypeScript version of src/js/core/SettingsModule.js
 */
/**
 * Type-safe Settings Module
 * Centralized management of all application settings
 */
export class SettingsModule {
    config;
    eventBus;
    storage;
    settings = {};
    handlers;
    constructor(config, eventBus, storage) {
        // Dependencies
        this.config = config || (typeof window !== 'undefined' && window.appConfig);
        this.eventBus = eventBus || (typeof window !== 'undefined' && window.eventBus);
        this.storage = storage || (typeof window !== 'undefined' && window.storage);
        if (!this.config || !this.eventBus || !this.storage) {
            const missing = [];
            if (!this.config)
                missing.push('config');
            if (!this.eventBus)
                missing.push('eventBus');
            if (!this.storage)
                missing.push('storage');
            const errorMsg = `SettingsModule: Missing dependencies: ${missing.join(', ')}`;
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
        }
        // Initialize handlers
        this.handlers = this.initializeHandlers();
        // Load settings from storage
        this.loadSettings();
        // Listen for setting change requests
        const settingsRequestChangeEvent = this.config.get('events.settings.requestChange');
        this.eventBus.on(settingsRequestChangeEvent, this.handleSettingChange.bind(this));
        console.log('✅ SettingsModule: Initialized with', Object.keys(this.handlers).length, 'handlers');
    }
    /**
     * Initialize setting handlers - declarative configuration for all settings
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
                    if (typeof window !== 'undefined' && window.ttsEngine) {
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
                    const delays = this.config.get('tts.delays');
                    const userDelays = {
                        short: delays.short,
                        normal: delays.normal,
                        long: delays.long
                    };
                    return Object.values(userDelays).includes(parseInt(value));
                },
                apply: (value) => {
                    if (typeof window !== 'undefined' && window.audioControls) {
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
                    console.log(`[SettingsModule] Repeat mode changed to ${value} (event-driven)`);
                    if (typeof window !== 'undefined' && window.ttsEngine) {
                        window.ttsEngine.currentRepeatCount = 0;
                    }
                },
                default: () => this.config.get('data.defaults.repeat'),
                storageKey: 'repeat',
                description: 'Repeat mode (once/twice/intensive/loop)'
            },
            voice: {
                validate: (value) => {
                    const defaultVoice = this.config.get('data.defaults.voice');
                    return value === defaultVoice || this.isValidVoice(value);
                },
                apply: (value) => {
                    if (typeof window !== 'undefined' && window.voiceSelector?.setPreferredVoice) {
                        window.voiceSelector.setPreferredVoice(value);
                    }
                    else {
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
                    if (typeof window !== 'undefined' && window.pteVocabularyManager?.setDifficulty) {
                        window.pteVocabularyManager.setDifficulty(value);
                    }
                    else {
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
                    return modes.some((m) => m.id === value);
                },
                apply: async (value) => {
                    if (typeof window !== 'undefined' && window.pteVocabularyManager?.setLearningMode) {
                        await window.pteVocabularyManager.setLearningMode(value);
                    }
                    else {
                        console.warn('⚠️ PTEVocabularyManager not ready yet, learning mode setting deferred');
                    }
                },
                default: () => this.config.get('data.defaults.learningMode'),
                storageKey: 'learningMode',
                description: 'Vocabulary book selection'
            },
            // ===== PRACTICE MODE SETTINGS =====
            practiceMode: {
                validate: (value) => {
                    const modes = this.config.get('data.practiceModes');
                    return modes.some((m) => m.id === value);
                },
                apply: (value) => {
                    const oldMode = this.get('practiceMode');
                    // Emit mode:changing event BEFORE the change
                    const modeChangingEvent = this.config.get('events.mode.practice.changing');
                    this.eventBus.emit(modeChangingEvent, {
                        oldMode,
                        newMode: value,
                        timestamp: Date.now()
                    });
                    // Set global practice mode
                    if (typeof window !== 'undefined') {
                        window.currentPracticeMode = value;
                    }
                    // Apply practice mode mapping from Config.js
                    const modeMapping = this.config.get('data.practiceModeMapping');
                    const mapping = modeMapping?.[value];
                    if (mapping) {
                        console.log(`[SettingsModule] Applying mode mapping for '${value}':`, mapping);
                        if (mapping.usesLearningMode && mapping.defaultLearningMode) {
                            const currentLearningMode = this.exportSettings().settings['learningMode'];
                            if (!currentLearningMode) {
                                console.log(`[SettingsModule] Setting default learning mode: ${mapping.defaultLearningMode}`);
                                this.updateSetting('learningMode', mapping.defaultLearningMode);
                            }
                        }
                        if (mapping.usesPracticeDataset && mapping.defaultPracticeDataset) {
                            const currentDataset = this.exportSettings().settings['practiceDataset'];
                            if (currentDataset !== mapping.defaultPracticeDataset) {
                                console.log(`[SettingsModule] Setting practice dataset: ${mapping.defaultPracticeDataset}`);
                                this.updateSetting('practiceDataset', mapping.defaultPracticeDataset);
                            }
                        }
                    }
                    // Emit mode:changed event AFTER the change
                    const modeChangedEvent = this.config.get('events.mode.practice.changed');
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
                    return datasets.some((d) => d.id === value);
                },
                apply: async (value) => {
                    const datasetChangedEvent = this.config.get('events.dataset.practice.changed');
                    this.eventBus.emit(datasetChangedEvent, { dataset: value });
                },
                default: () => this.config.get('data.defaults.practiceDataset'),
                storageKey: 'practiceDataset',
                description: 'Practice dataset selection (RS/ASQ/WFD)'
            }
        };
    }
    /**
     * Handle setting change request
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
            // 6. Emit success event
            const settingsChangedEvent = this.config.get('events.settings.changed');
            this.eventBus.emit(settingsChangedEvent, { key, value, timestamp: Date.now() });
            console.log(`✅ SettingsModule: Updated '${key}' = '${value}'`);
            return { success: true, key, value };
        }
        catch (error) {
            console.error(`❌ SettingsModule: Error updating '${key}':`, error);
            const settingsErrorEvent = this.config.get('events.settings.error');
            this.eventBus.emit(settingsErrorEvent, { key, value, error: error.message });
            return { success: false, error: error.message, key, value };
        }
    }
    /**
     * Get current setting value
     */
    getSetting(key) {
        const handler = this.handlers[key];
        if (this.settings[key] !== undefined) {
            return this.settings[key];
        }
        return handler?.default?.();
    }
    /**
     * Alias for getSetting
     */
    get(key) {
        return this.getSetting(key);
    }
    /**
     * Update a setting
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
        const batchUpdatedEvent = this.config.get('events.settings.batchUpdated') || 'settings:batch-updated';
        this.eventBus.emit(batchUpdatedEvent, { results, timestamp: Date.now() });
        return results;
    }
    /**
     * Load settings from storage AND apply them
     */
    loadSettings() {
        // Load all values from storage
        for (const [key, handler] of Object.entries(this.handlers)) {
            if (handler.storageKey) {
                const value = this.storage.getItem(handler.storageKey);
                if (value !== null) {
                    this.settings[key] = value;
                }
                else {
                    const defaultValue = handler.default ? handler.default() : null;
                    if (defaultValue !== null) {
                        this.settings[key] = defaultValue;
                    }
                }
            }
        }
        // Ensure required settings are initialized
        if (!this.settings['practiceMode']) {
            this.settings['practiceMode'] = this.config.get('fallbacks.practiceMode');
            console.log(`[SettingsModule] Initialized missing practiceMode with default: ${this.settings['practiceMode']}`);
        }
        if (!this.settings['repeat']) {
            this.settings['repeat'] = this.config.get('fallbacks.repeatMode');
            console.log(`[SettingsModule] Initialized missing repeat with default: ${this.settings['repeat']}`);
        }
        if (!this.settings['voice']) {
            this.settings['voice'] = this.config.get('settings.defaults.voice');
            console.log(`[SettingsModule] Initialized missing voice with default: ${this.settings['voice']}`);
        }
        console.log('📥 SettingsModule: Loaded', Object.keys(this.settings).length, 'settings from storage');
        // Apply all loaded settings to initialize modules
        for (const [key, value] of Object.entries(this.settings)) {
            const handler = this.handlers[key];
            if (handler?.apply) {
                try {
                    handler.apply.call(this, value);
                    console.log(`[SettingsModule] ${key.charAt(0).toUpperCase() + key.slice(1)} set to ${value} (event-driven)`);
                }
                catch (error) {
                    console.warn(`⚠️ SettingsModule: Failed to apply '${key}' during initialization:`, error.message);
                }
                const settingsChangedEvent = this.config.get('events.settings.changed');
                this.eventBus.emit(settingsChangedEvent, { key, value });
            }
        }
        console.log('✅ SettingsModule: Applied all initial settings to modules');
    }
    /**
     * Get available options for a setting (for dropdown population)
     */
    getAvailableOptions(key, filterType = null) {
        try {
            if (!this.config) {
                console.error('❌ SettingsModule.getAvailableOptions: config is not available');
                return [];
            }
            if (key === 'speed') {
                const speeds = this.config.get('tts.speeds');
                if (!speeds)
                    return [];
                return Object.keys(speeds).map(k => ({
                    id: speeds[k].toString(),
                    label: `${k.charAt(0).toUpperCase() + k.slice(1)} (${speeds[k]}x)`
                }));
            }
            if (key === 'delay') {
                const delays = this.config.get('tts.delays');
                if (!delays)
                    return [];
                const userDelays = { short: delays.short, normal: delays.normal, long: delays.long };
                return Object.keys(userDelays).map(k => ({
                    id: userDelays[k].toString(),
                    label: `${k.charAt(0).toUpperCase() + k.slice(1)} (${userDelays[k] / 1000}s)`
                }));
            }
            if (key === 'repeat') {
                const repeatModes = this.config.get('tts.repeatModes');
                if (!repeatModes)
                    return [];
                const labels = {
                    'once': 'Once (1x)',
                    'twice': 'Twice (2x)',
                    'intensive': 'Intensive (3x)',
                    'loop': 'Loop (Continuous)'
                };
                return repeatModes.map((mode) => ({
                    id: mode,
                    label: labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1)
                }));
            }
            if (key === 'voice') {
                return [];
            }
            const optionsMap = {
                difficulty: this.config.get('data.difficulties'),
                learningMode: this.config.get('data.learningModes'),
                practiceMode: this.config.get('data.practiceModes'),
                practiceDataset: this.config.get('data.practiceDatasets')
            };
            let options = optionsMap[key] || [];
            if (key === 'practiceDataset' && filterType) {
                options = options.filter((opt) => opt.type === filterType);
            }
            if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'string') {
                return options.map((opt) => ({ id: opt, label: opt }));
            }
            return options;
        }
        catch (error) {
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
        if (!settingsData?.settings) {
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
        return typeof voiceName === 'string' && voiceName.length > 0;
    }
    /**
     * Get handler information for debugging
     */
    getHandlerInfo(key) {
        const handler = this.handlers[key];
        if (!handler)
            return null;
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
     * Get all handlers information
     */
    getAllHandlers() {
        return Object.keys(this.handlers)
            .map(key => this.getHandlerInfo(key))
            .filter((info) => info !== null);
    }
}
if (typeof window !== 'undefined') {
    window.SettingsModule = SettingsModule;
}
// Export for Node.js
export default SettingsModule;
//# sourceMappingURL=SettingsModule.js.map