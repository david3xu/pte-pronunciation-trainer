/**
 * AppNamespace - Unified namespace for CCL Pronunciation Trainer
 * Replaces global window pollution with organized namespace
 * Maintains backward compatibility with existing global references
 */

class AppNamespace {
    constructor() {
        this.modules = {};
        this.config = {};
        this.initialized = false;
    }

    /**
     * Register a module in the namespace
     * @param {string} name - Module name
     * @param {Object} instance - Module instance
     */
    registerModule(name, instance) {
        this.modules[name] = instance;

        // Maintain backward compatibility - expose on window
        const globalName = this._getGlobalName(name);
        if (!window[globalName]) {
            window[globalName] = instance;
        }
    }

    /**
     * Get a module instance
     * @param {string} name - Module name
     * @returns {Object} Module instance
     */
    getModule(name) {
        return this.modules[name];
    }

    /**
     * Set configuration
     * @param {string} key - Config key
     * @param {*} value - Config value
     */
    setConfig(key, value) {
        this.config[key] = value;
    }

    /**
     * Get configuration
     * @param {string} key - Config key
     * @returns {*} Config value
     */
    getConfig(key) {
        return this.config[key];
    }

    /**
     * Convert module name to legacy global name
     * @private
     */
    _getGlobalName(name) {
        const mapping = {
            'eventBus': 'eventBus',
            'vocabularyManager': 'vocabularyManager',
            'audioControls': 'audioControls',
            'ttsEngine': 'ttsEngine',
            'voiceSelector': 'voiceSelector',
            'uiController': 'uiController',
            'settingsPanel': 'settingsPanel',
            'progressTracker': 'progressTracker',
            'storage': 'storage',
            'stateManager': 'stateManager',
            'cacheMigration': 'cacheMigration',
            'dialogueDataLoader': 'dialogueDataLoader',
            'cclApp': 'cclApp'
        };
        return mapping[name] || name;
    }

    /**
     * Initialize all registered modules
     */
    async initializeAll() {
        if (this.initialized) return;

        console.log('🚀 Initializing CCL App modules...');

        // Initialize in dependency order
        const initOrder = [
            'eventBus', 'storage', 'stateManager', 'cacheMigration',
            'vocabularyManager', 'progressTracker', 'dialogueDataLoader',
            'ttsEngine', 'voiceSelector', 'audioControls',
            'uiController', 'settingsPanel'
        ];

        for (const moduleName of initOrder) {
            const module = this.modules[moduleName];
            if (module && typeof module.initialize === 'function') {
                try {
                    await module.initialize();
                    console.log(`✅ ${moduleName} initialized`);
                } catch (error) {
                    console.error(`❌ Failed to initialize ${moduleName}:`, error);
                }
            }
        }

        this.initialized = true;
        console.log('✅ All CCL App modules initialized');
    }
}

// Create global app instance with backward compatibility
window.CCLApp = new AppNamespace();

// Legacy compatibility - ensure existing global references still work
window.cclApp = window.CCLApp; // For the main app reference