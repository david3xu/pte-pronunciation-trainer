/**
 * Centralized Configuration Management
 * Consolidates all app configuration in one place
 */

class AppConfig {
    constructor() {
        // Define constants inline since Constants.js was removed
        const CONSTANTS = {
            VOICES: {
                DEFAULT: 'Google UK English Male',
                FALLBACK_VOICES: [
                    'Microsoft James (en-AU)',
                    'Google UK English Female',
                    'Microsoft George (en-GB)',
                    'Google US English Female'
                ]
            },
            DELAYS: {
                SHORT_PAUSE: 1000,
                NORMAL_PAUSE: 2000,
                LONG_PAUSE: 3000,
                EXTENDED_PAUSE: 4000
            },
            DATA: {
                FULL_PATHS: {
                    RESUME_TERMS: '/data/processed/resume-terms-dataset.json',
                    AIML_TERMS: '/data/processed/aiml-terms-dataset.json',
                    PROFESSIONAL_TERMS: '/data/processed/professional-terms-dataset.json'
                }
            },
            PROFESSIONAL_CATEGORIES: {
                'all-categories': '🌟 All Categories',
                'foundation-terms': '🧠 Foundation Terms',
                'essential-production-terms': '⚙️ Production Terms',
                'agent-automation-terms': '🤖 Agent & Automation',
                'model-training-data': '📊 Model Training',
                'explainability-trust': '🔍 Explainability & Trust',
                'mlops-production': '🚀 MLOps & Production',
                'natural-language-processing': '📝 NLP',
                'computer-vision': '👁️ Computer Vision',
                'model-types-architectures': '📐 Model Architectures',
                'optimization-efficiency': '⚡ Optimization',
                'safety-governance': '🛡️ Safety & Governance',
                'performance-metrics': '📈 Performance Metrics',
                'infrastructure-deployment': '🏗️ Infrastructure',
                'collaboration-development': '👥 Collaboration',
                'current-trends': '🚀 2025 Trends'
            }
        };

        this.config = {
            // TTS Configuration
            tts: {
                defaultVoice: CONSTANTS.VOICES.DEFAULT,
                fallbackVoices: CONSTANTS.VOICES.FALLBACK_VOICES,
                speeds: {
                    slow: 0.7,
                    normal: 1.0,
                    fast: 1.3
                },
                delays: {
                    short: CONSTANTS.DELAYS.SHORT_PAUSE,
                    normal: CONSTANTS.DELAYS.NORMAL_PAUSE,
                    long: CONSTANTS.DELAYS.LONG_PAUSE,
                    extended: CONSTANTS.DELAYS.EXTENDED_PAUSE
                },
                repeatModes: ['once', 'individual', 'intensive', 'loop']
            },

            // Vocabulary Configuration
            vocabulary: {
                learningModes: [
                    { id: 'resume-terms', label: '💼 Resume Terms', dataset: 'resumeTerms' },
                    { id: 'aiml-terms', label: '🤖 AI/ML Terms', dataset: 'aimlTerms' },
                    { id: 'professional-terms', label: '🌟 All Professional Terms', dataset: 'professionalTerms' }
                ],
                difficulties: ['easy', 'normal', 'hard'],
                categories: CONSTANTS.PROFESSIONAL_CATEGORIES
            },

            // Data Sources Configuration
            dataSources: {
                resumeTerms: CONSTANTS.DATA.FULL_PATHS.RESUME_TERMS,
                aimlTerms: CONSTANTS.DATA.FULL_PATHS.AIML_TERMS,
                professionalTerms: CONSTANTS.DATA.FULL_PATHS.PROFESSIONAL_TERMS
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
                    vocabulary: 'professional_vocabulary_progress',
                    settings: 'professional_settings',
                    stats: 'professional_study_stats'
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

// Only initialize if window is defined (for Node.js compatibility)
if (typeof window !== 'undefined') {
    // Initialize and register
    const appConfig = new AppConfig();

    // Register with CCL App namespace if available
    if (window.CCLApp) {
        window.CCLApp.registerModule('config', appConfig);
    }

    // Legacy compatibility
    window.appConfig = appConfig;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}