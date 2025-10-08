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
            console.error('❌ SettingsModule: Missing dependencies');
            return;
        }
        
        // Current settings (in-memory cache)
        this.settings = {};
        
        // Setting handlers - declarative configuration for each setting
        this.handlers = this.initializeHandlers();
        
        // Load settings from storage
        this.loadSettings();
        
        // Listen for setting change requests
        this.eventBus.on('setting:request-change', this.handleSettingChange.bind(this));
        
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
                    if (window.ttsEngine) {
                        window.ttsEngine.setSpeechRate(parseFloat(value));
                    }
                },
                default: () => String(this.config.get('tts.speeds.slow')),
                storageKey: 'speed',
                description: 'TTS speech rate (slow/normal/fast)'
            },
            
            delay: {
                validate: (value) => {
                    const userDelays = { short: 1000, normal: 2000, long: 3000 };
                    return Object.values(userDelays).includes(parseInt(value));
                },
                apply: (value) => {
                    if (window.audioControls) {
                        window.audioControls.setDelay(parseInt(value));
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
                    if (window.audioControls) {
                        window.audioControls.setRepeatMode(value);
                    }
                    if (window.ttsEngine) {
                        window.ttsEngine.currentRepeatCount = 0;
                    }
                },
                default: () => 'once',
                storageKey: 'repeat',
                description: 'Repeat mode (once/twice/intensive/loop)'
            },
            
            voice: {
                validate: (value) => {
                    // Always valid - voiceSelector handles auto/specific voices
                    return value === 'auto' || this.isValidVoice(value);
                },
                apply: (value) => {
                    if (window.voiceSelector) {
                        window.voiceSelector.setPreferredVoice(value);
                    }
                },
                default: () => 'auto',
                storageKey: 'voice',
                description: 'TTS voice (auto or specific voice name)'
            },
            
            // ===== VOCABULARY SETTINGS =====
            
            difficulty: {
                validate: (value) => {
                    return this.config.get('data.difficulties').includes(value);
                },
                apply: (value) => {
                    if (window.pteVocabularyManager) {
                        window.pteVocabularyManager.setDifficulty(value);
                    }
                },
                default: () => 'all',
                storageKey: 'difficulty',
                description: 'Difficulty filter (all/easy/normal/hard)'
            },
            
            learningMode: {
                validate: (value) => {
                    const modes = this.config.get('data.learningModes');
                    return modes.some(m => m.id === value);
                },
                apply: async (value) => {
                    if (window.pteVocabularyManager) {
                        await window.pteVocabularyManager.setLearningMode(value);
                    }
                },
                default: () => 'pte-fib-listening',
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
                    // Set global practice mode
                    window.currentPracticeMode = value;
                    
                    // Emit mode changed event for UI updates
                    this.eventBus.emit('practiceMode:changed', { mode: value });
                },
                default: () => 'vocabulary',
                storageKey: 'practiceMode',
                description: 'Practice type (vocabulary/rs/asq/wfd)'
            },
            
            practiceDataset: {
                validate: (value) => {
                    const datasets = this.config.get('data.practiceDatasets');
                    return datasets.some(d => d.id === value);
                },
                apply: async (value) => {
                    // Emit dataset changed event for loading
                    this.eventBus.emit('practiceDataset:changed', { dataset: value });
                },
                default: () => 'pte-repeat-sentence',
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
            if (handler.validate && !handler.validate(value)) {
                console.warn(`⚠️ SettingsModule: Invalid value for '${key}': ${value}`);
                return { success: false, error: 'Invalid value', key, value };
            }
            
            // 3. Apply to engine/manager
            if (handler.apply) {
                await handler.apply(value);
            }
            
            // 4. Update in-memory cache
            this.settings[key] = value;
            
            // 5. Persist to storage
            if (handler.storageKey) {
                this.storage.setItem(handler.storageKey, value);
            }
            
            // 6. Emit success event
            this.eventBus.emit('setting:changed', { key, value, timestamp: Date.now() });
            
            console.log(`✅ SettingsModule: Updated '${key}' = '${value}'`);
            return { success: true, key, value };
            
        } catch (error) {
            console.error(`❌ SettingsModule: Error updating '${key}':`, error);
            this.eventBus.emit('setting:error', { key, value, error: error.message });
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
        
        this.eventBus.emit('settings:reset', { timestamp: Date.now() });
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
        
        this.eventBus.emit('settings:batch-updated', { results, timestamp: Date.now() });
        return results;
    }
    
    /**
     * Load settings from storage
     */
    loadSettings() {
        for (const [key, handler] of Object.entries(this.handlers)) {
            if (handler.storageKey) {
                const value = this.storage.getItem(handler.storageKey);
                if (value !== null) {
                    this.settings[key] = value;
                }
            }
        }
        
        console.log('📥 SettingsModule: Loaded', Object.keys(this.settings).length, 'settings from storage');
    }
    
    /**
     * Get available options for a setting (for dropdown population)
     * Delegates to SettingsManager for now (can be merged later)
     */
    getAvailableOptions(key) {
        if (window.settingsManager) {
            return window.settingsManager.getAvailableOptions(key);
        }
        return [];
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
