/**
 * Centralized Configuration Management
 * Consolidates all app configuration in one place
 */

class AppConfig {
    constructor() {
        this.config = {
            // TTS Configuration
            tts: {
                defaultVoice: 'Google UK English Male',
                fallbackVoices: ['Microsoft James – English (Australia)', 'Google UK English Female'],
                speeds: {
                    slow: 0.7,
                    normal: 1.0,
                    fast: 1.3
                },
                delays: {
                    short: 1000,
                    normal: 2000,
                    long: 3000,
                    extended: 4000
                },
                repeatModes: ['once', 'individual', 'intensive', 'loop']
            },

            // Vocabulary Configuration
            vocabulary: {
                learningModes: [
                    { id: 'vocabulary', label: '📚 Vocabulary Focus', dataset: 'complete' },
                    { id: 'dialogue', label: '💬 Dialogue Practice', dataset: 'complete' },
                    { id: 'unfamiliar', label: '🔥 Unfamiliar Words', dataset: 'unfamiliar' },
                    { id: 'words', label: '📝 Words (words.md)', dataset: 'words' },
                    { id: 'chinese-english', label: '🈯 Chinese-English Match', dataset: 'chineseEnglish' },
                    { id: 'vocabulary-clean', label: '🎓 Vocabulary Trainer', dataset: 'vocabularyClean' },
                    { id: 'resume-terms', label: '💼 Resume Terms Practice', dataset: 'resumeTerms' }
                ],
                difficulties: ['easy', 'normal', 'hard'],
                categories: {
                    'all-categories': '🌟 All Categories',
                    'group-240s': '📚 70240s: 70248-70240 (Latest)',
                    'group-230s': '📚 70230s: 70239-70230',
                    'group-220s': '📚 70220s: 70229-70220',
                    'group-210s': '📚 70210s: 70219-70210',
                    'group-200s': '📚 70200s: 70209-70200',
                    'group-190s': '📚 70190s: 70199-70190',
                    'group-180s': '📚 70180s: 70189-70180',
                    'group-170s': '📚 70170s: 70179-70170',
                    'group-160s': '📚 70160s: 70169-70160',
                    'group-150s': '📚 70150s: 70159-70150 (Earliest)'
                }
            },

            // Data Sources Configuration
            dataSources: {
                complete: '/data/processed/complete-dataset.json',
                unfamiliar: '/data/processed/unfamiliar-words.json',
                words: '/data/processed/words-dataset.json',
                chineseEnglish: '/data/processed/chinese-english-dataset.json',
                vocabularyClean: '/data/processed/vocabulary-clean-dataset.json',
                resumeTerms: '/data/processed/resume-terms-dataset.json',
                // Legacy support
                conversationVocabulary: '/data/generated/conversation-vocabulary-data.js'
            },

            // UI Configuration
            ui: {
                themes: ['light', 'dark', 'auto'],
                shortcuts: {
                    playPause: ' ', // Space
                    previous: 'ArrowLeft',
                    next: 'ArrowRight',
                    repeat: 'r',
                    settings: 'Escape'
                },
                animations: {
                    duration: 300,
                    easing: 'ease-in-out'
                }
            },

            // Audio Configuration
            audio: {
                maxRetries: 3,
                retryDelay: 1000,
                volumeStep: 0.1,
                fadeInDuration: 200,
                fadeOutDuration: 200
            },

            // Progress Tracking
            progress: {
                storageKeys: {
                    vocabulary: 'ccl_vocabulary_progress',
                    settings: 'ccl_settings',
                    stats: 'ccl_study_stats'
                },
                celebrationThresholds: [10, 25, 50, 100, 250, 500]
            },

            // Development Configuration
            development: {
                debug: false,
                verbose: false,
                mockData: false
            }
        };
    }

    /**
     * Get configuration value
     * @param {string} path - Dot-separated path (e.g., 'tts.speeds.normal')
     * @returns {*} Configuration value
     */
    get(path) {
        return this._getNestedValue(this.config, path);
    }

    /**
     * Set configuration value
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    set(path, value) {
        this._setNestedValue(this.config, path, value);
    }

    /**
     * Get all configuration
     * @returns {Object} Complete configuration object
     */
    getAll() {
        return this.config;
    }

    /**
     * Merge configuration
     * @param {Object} newConfig - Configuration to merge
     */
    merge(newConfig) {
        this.config = this._deepMerge(this.config, newConfig);
    }

    /**
     * Get nested value from object using dot notation
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    /**
     * Set nested value in object using dot notation
     * @private
     */
    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    /**
     * Deep merge objects
     * @private
     */
    _deepMerge(target, source) {
        const result = { ...target };
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        });
        return result;
    }
}

// Initialize and register
const appConfig = new AppConfig();
window.CCLApp.registerModule('config', appConfig);

// Legacy compatibility
window.appConfig = appConfig;