/**
 * Centralized Configuration Management
 * ALL configuration values in one place - NO hardcoded values elsewhere
 */

class AppConfig {
    constructor() {
        // COMPREHENSIVE CONFIGURATION - ALL VALUES HERE
        this.config = {
            // ===== DATA PIPELINE CONFIGURATION =====
            pipeline: {
                inputDir: 'data/source/pte',
                outputDir: 'data',
                reportsDir: 'data/reports',
                dataSources: {
                    primary: 'pte-fib-listening-with-ipa.md',
                    fallback: 'fib-listening-vocabulary.md',
                    subdirectory: 'vocabs'
                },
                outputFiles: {
                    dataset: 'pte-fib-listening-dataset.json',
                    report: 'pte-processing-report.json'
                }
            },

            // ===== DATA SOURCES CONFIGURATION =====
            data: {
                paths: {
                    dataset: '/data/processed/pte-fib-listening-dataset.json',
                    source: 'data/source/pte/vocabs/',
                    processed: 'data/processed/',
                    reports: 'data/reports/'
                },
                categories: {
                    'all-categories': '🌟 All Categories',
                    'pte-fib-listening': '🎧 FIB Listening'
                },
                learningModes: [
                    { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening', dataset: 'pte-fib-listening-with-ipa' }
                ],
                        difficulties: ['all', 'normal', 'hard', 'easy'] // All PTE terms with mixed difficulties
            },

            // ===== TTS CONFIGURATION =====
            tts: {
                voices: {
                    default: 'Google UK English Male',
                    fallbacks: [
                        'Microsoft James (en-AU)',
                        'Google UK English Female',
                        'Microsoft George (en-GB)',
                        'Google US English Female'
                    ]
                },
                speeds: {
                    slow: 0.7,
                    normal: 1.0,
                    fast: 1.3
                },
                delays: {
                    short: 1000,
                    normal: 2000,
                    long: 3000,
                    extended: 4000,
                    voiceReady: 100,
                    resetTimeout: 5000
                },
                repeatModes: ['once', 'twice', 'intensive', 'loop']
            },

            // ===== UI CONFIGURATION =====
            ui: {
                themes: ['light', 'dark', 'auto'],
                shortcuts: {
                    playPause: ' ',
                    previous: 'ArrowLeft',
                    next: 'ArrowRight',
                    repeat: 'r',
                    settings: 'Escape'
                },
                animations: {
                    duration: 300,
                    easing: 'ease-in-out'
                },
                elements: {
                    pronunciationToggle: {
                        british: '🇬🇧',
                        american: '🇺🇸'
                    }
                }
            },

            // ===== SETTINGS CONFIGURATION =====
            settings: {
                storageKeys: {
                    category: 'category',
                    difficulty: 'difficulty',
                    speed: 'speechRate',
                    delay: 'delay',
                    repeat: 'repeatMode',
                    voice: 'preferredVoice',
                    learningMode: 'learningMode'
                },
                defaults: {
                    category: 'all-categories',
                    difficulty: 'all', // Show all difficulty levels (normal, hard, easy)
                    speed: 'tts.speeds.slow',
                    delay: 'tts.delays.normal',
                    repeat: 'once',
                    voice: 'auto',
                    learningMode: 'pte-fib-listening'
                },
                events: {
                    changed: 'settings:changed',
                    loaded: 'settings:loaded',
                    reset: 'settings:reset'
                }
            },

            // ===== AUDIO CONFIGURATION =====
            audio: {
                maxRetries: 3,
                retryDelay: 1000,
                volumeStep: 0.1,
                fadeInDuration: 200,
                fadeOutDuration: 200
            },

            // ===== UI CONFIGURATION =====
            ui: {
                opacity: {
                    enabled: '1',
                    disabled: '0.5'
                },
                text: {
                    maxLength: 50,
                    sentenceSplitThreshold: 1
                },
                labels: {
                    version: '1.0',
                    exportFilename: 'ccl-trainer-settings.json'
                }
            },

            // ===== DATA PROCESSING CONFIGURATION =====
            dataProcessing: {
                difficulty: {
                    easy: {
                        maxWords: 1,
                        maxLength: 8
                    },
                    normal: {
                        minWords: 2,
                        maxWords: 3
                    },
                    hard: {
                        minWords: 4
                    }
                },
                termCounts: {
                    normal: 436,
                    hard: 411,
                    easy: 38,
                    total: 885
                }
            },

            // ===== BUILD CONFIGURATION =====
            build: {
                jsFiles: [
                    'src/js/shared/AppNamespace.js',
                    'src/js/shared/Config.js',
                    'src/js/shared/DataSchema.js',
                    'src/js/shared/LegacyCompatibility.js',
                    'src/js/utils/EventBus.js',
                    'src/js/utils/Storage.js',
                    'src/js/utils/StateManager.js',
                    'src/js/utils/CacheMigration.js',
                    'src/js/utils/StateTest.js',
                    'src/js/data/extractors/PTETermsExtractor.js',
                    'src/js/core/SettingsManager.js',
                    'src/js/core/PTEVocabularyManager.js',
                    'src/js/core/ProgressTracker.js',
                    'src/js/audio/TTSEngine.js',
                    'src/js/audio/VoiceSelector.js',
                    'src/js/audio/AudioControls.js',
                    'src/js/ui/UIController.js',
                    'src/js/ui/SettingsPanel.js',
                    'src/js/core/PTEApp.js'
                ],
                output: {
                    js: 'js/app.min.js',
                    css: 'css/style.min.css',
                    html: 'index.html'
                }
            },

            // ===== VALIDATION CONFIGURATION =====
            validation: {
                requiredFiles: [
                    'data/processed/pte-fib-listening-dataset.json'
                ],
                errorMessages: {
                    datasetNotFound: 'PTE vocabulary data file not found. Run "npm run data:pte" first.',
                    noTerms: 'No vocabulary terms found in dataset.'
                }
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