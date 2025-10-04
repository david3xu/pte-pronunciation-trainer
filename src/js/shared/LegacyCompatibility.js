/**
 * Legacy Compatibility Layer
 * Ensures all existing code continues to work while new architecture is introduced
 * Provides transparent migration from old patterns to new patterns
 */

class LegacyCompatibility {
    constructor() {
        this.initialized = false;
        this.legacyModules = new Map();
        this.moduleProxies = new Map();
    }

    /**
     * Initialize compatibility layer
     * This runs after all modules are loaded but before app initialization
     */
    initialize() {
        if (this.initialized) return;

        console.log('🔄 Initializing legacy compatibility layer...');

        // Ensure new modules create legacy window references
        this.createLegacyReferences();

        // Create compatibility proxies for changed interfaces
        this.createCompatibilityProxies();

        // Migrate stored data formats
        this.migrateStoredData();

        this.initialized = true;
        console.log('✅ Legacy compatibility layer initialized');
    }

    /**
     * Create legacy window references for all modules
     * Ensures existing code that uses window.vocabularyManager etc. continues to work
     */
    createLegacyReferences() {
        const moduleMap = {
            eventBus: 'eventBus',
            vocabularyManager: 'vocabularyManager',
            audioControls: 'audioControls',
            ttsEngine: 'ttsEngine',
            voiceSelector: 'voiceSelector',
            uiController: 'uiController',
            settingsPanel: 'settingsPanel',
            progressTracker: 'progressTracker',
            storage: 'storage',
            stateManager: 'stateManager',
            cacheMigration: 'cacheMigration'
        };

        Object.keys(moduleMap).forEach(moduleKey => {
            const legacyKey = moduleMap[moduleKey];
            const module = window.CCLApp.getModule(moduleKey);

            if (module && !window[legacyKey]) {
                window[legacyKey] = module;
                console.log(`  ✅ Legacy reference: window.${legacyKey}`);
            }
        });
    }

    /**
     * Create compatibility proxies for modules with changed interfaces
     */
    createCompatibilityProxies() {
        // VocabularyManager compatibility
        this.createVocabularyManagerProxy();

        // Configuration compatibility
        this.createConfigurationProxy();

        // Data format compatibility
        this.createDataFormatProxy();
    }

    /**
     * Create VocabularyManager compatibility proxy
     * Handles interface changes while maintaining backward compatibility
     */
    createVocabularyManagerProxy() {
        const originalVocabManager = window.CCLApp.getModule('vocabularyManager');
        if (!originalVocabManager) return;

        // Create proxy to intercept method calls and provide compatibility
        const compatibilityProxy = new Proxy(originalVocabManager, {
            get(target, property) {
                // Legacy method mappings
                const methodMappings = {
                    // Add any legacy method names that might have changed
                    'loadVocabularyData': 'initialize',
                    'getWords': 'getCurrentWords',
                    'setCategory': 'filterByCategory'
                };

                if (methodMappings[property]) {
                    console.warn(`⚠️  Using legacy method '${property}', consider updating to '${methodMappings[property]}'`);
                    return target[methodMappings[property]];
                }

                return target[property];
            }
        });

        // Store proxy for reference
        this.moduleProxies.set('vocabularyManager', compatibilityProxy);
    }

    /**
     * Create configuration compatibility proxy
     * Provides access to old configuration patterns
     */
    createConfigurationProxy() {
        const config = window.CCLApp.getModule('config');
        if (!config) return;

        // Legacy configuration access patterns
        window.TTS_CONFIG = {
            get defaultVoice() { return config.get('tts.defaultVoice'); },
            get speeds() { return config.get('tts.speeds'); },
            get delays() { return config.get('tts.delays'); }
        };

        window.VOCABULARY_CONFIG = {
            get learningModes() { return config.get('vocabulary.learningModes'); },
            get categories() { return config.get('vocabulary.categories'); }
        };

        console.log('  ✅ Legacy configuration objects created');
    }

    /**
     * Create data format compatibility
     * Ensures old data formats continue to work
     */
    createDataFormatProxy() {
        // Intercept fetch requests for old data paths
        const originalFetch = window.fetch;

        window.fetch = async function(url, options) {
            // Redirect old data paths to new ones
            const pathRedirects = {
                '/data/generated/conversation-vocabulary-data.js': '/data/processed/dialogue-data.json',
                '/data/generated/unfamiliar-words.js': '/data/processed/unfamiliar-words.json',
                '/data/generated/vocabulary-clean.js': '/data/processed/vocabulary-clean-dataset.json'
            };

            const redirectUrl = pathRedirects[url] || url;

            if (redirectUrl !== url) {
                console.log(`🔄 Redirecting data request: ${url} → ${redirectUrl}`);

                // Fetch new format and convert to legacy format if needed
                const response = await originalFetch.call(this, redirectUrl, options);

                if (url.endsWith('.js') && redirectUrl.endsWith('.json')) {
                    // Convert JSON response to legacy JS format
                    const data = await response.json();
                    const legacyFormat = convertToLegacyFormat(data, url);

                    return new Response(legacyFormat, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: { ...response.headers, 'content-type': 'application/javascript' }
                    });
                }
            }

            return originalFetch.call(this, redirectUrl, options);
        };

        /**
         * Convert new data format to legacy format
         */
        function convertToLegacyFormat(data, originalUrl) {
            if (originalUrl.includes('conversation-vocabulary-data.js')) {
                return `window.conversationVocabularyData = ${JSON.stringify(data, null, 2)};`;
            }

            if (originalUrl.includes('unfamiliar-words.js')) {
                return `window.unfamiliarWordsData = ${JSON.stringify(data, null, 2)};`;
            }

            if (originalUrl.includes('vocabulary-clean.js')) {
                return `window.vocabularyCleanData = ${JSON.stringify(data, null, 2)};`;
            }

            return `window.data = ${JSON.stringify(data, null, 2)};`;
        }

        console.log('  ✅ Data format compatibility proxy created');
    }

    /**
     * Migrate stored data formats
     * Updates localStorage data to new formats while preserving functionality
     */
    migrateStoredData() {
        const storage = window.CCLApp.getModule('storage');
        if (!storage) return;

        try {
            // Migrate progress data
            const oldProgress = localStorage.getItem('vocabulary_progress');
            if (oldProgress && !localStorage.getItem('ccl_vocabulary_progress')) {
                localStorage.setItem('ccl_vocabulary_progress', oldProgress);
                console.log('  ✅ Migrated vocabulary progress data');
            }

            // Migrate settings data
            const oldSettings = localStorage.getItem('app_settings');
            if (oldSettings && !localStorage.getItem('ccl_settings')) {
                localStorage.setItem('ccl_settings', oldSettings);
                console.log('  ✅ Migrated settings data');
            }

            // Migrate any other legacy storage keys
            const migrationMap = {
                'tts_settings': 'ccl_tts_settings',
                'learning_mode': 'ccl_learning_mode',
                'category_progress': 'ccl_category_progress'
            };

            Object.keys(migrationMap).forEach(oldKey => {
                const newKey = migrationMap[oldKey];
                const data = localStorage.getItem(oldKey);
                if (data && !localStorage.getItem(newKey)) {
                    localStorage.setItem(newKey, data);
                    console.log(`  ✅ Migrated ${oldKey} → ${newKey}`);
                }
            });

        } catch (error) {
            console.warn('⚠️  Error during data migration:', error);
        }
    }

    /**
     * Provide legacy event compatibility
     * Ensures old event names continue to work
     */
    createEventCompatibility() {
        const eventBus = window.CCLApp.getModule('eventBus');
        if (!eventBus) return;

        // Legacy event name mappings
        const eventMappings = {
            'vocabulary:loaded': 'vocabulary:ready',
            'audio:playing': 'audio:started',
            'audio:stopped': 'audio:ended'
        };

        // Intercept event emissions and provide compatibility
        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = function(event, data) {
            // Emit original event
            originalEmit(event, data);

            // Also emit legacy event names if mapping exists
            const legacyEvent = eventMappings[event];
            if (legacyEvent) {
                console.log(`🔄 Legacy event compatibility: ${event} → ${legacyEvent}`);
                originalEmit(legacyEvent, data);
            }
        };

        console.log('  ✅ Event compatibility layer created');
    }

    /**
     * Check if running in legacy mode
     * @returns {boolean} True if legacy compatibility is needed
     */
    isLegacyMode() {
        // Check if old patterns are being used
        const hasLegacyReferences = Object.keys(window).some(key =>
            key.match(/^(vocabularyManager|audioControls|ttsEngine)$/) &&
            window[key] &&
            !window.CCLApp.getModule(key)
        );

        return hasLegacyReferences;
    }

    /**
     * Log compatibility warnings
     * Helps developers identify legacy code that should be updated
     */
    logCompatibilityWarnings() {
        if (this.isLegacyMode()) {
            console.group('⚠️  Legacy Compatibility Warnings');
            console.warn('This application is running in legacy compatibility mode.');
            console.warn('Consider updating code to use the new CCLApp namespace:');
            console.warn('  Old: window.vocabularyManager');
            console.warn('  New: window.CCLApp.getModule("vocabularyManager")');
            console.groupEnd();
        }
    }

    /**
     * Get compatibility status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.initialized,
            legacyMode: this.isLegacyMode(),
            proxiedModules: Array.from(this.moduleProxies.keys()),
            legacyModules: Array.from(this.legacyModules.keys())
        };
    }
}

// Initialize and register
const legacyCompatibility = new LegacyCompatibility();
window.CCLApp.registerModule('legacyCompatibility', legacyCompatibility);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        legacyCompatibility.initialize();
    });
} else {
    legacyCompatibility.initialize();
}

// Legacy compatibility
window.legacyCompatibility = legacyCompatibility;