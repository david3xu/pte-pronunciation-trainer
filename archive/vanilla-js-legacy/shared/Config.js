/**
 * Centralized Configuration Management (TypeScript)
 *
 * Type-safe configuration for the PTE Pronunciation Trainer.
 * This will gradually replace src/js/shared/Config.js during the TypeScript migration.
 */
/**
 * Application Configuration Class
 * Provides type-safe access to all application settings
 */
export class AppConfig {
    config;
    constructor() {
        this.config = this.initializeConfig();
    }
    /**
     * Initialize the complete configuration object
     */
    initializeConfig() {
        return {
            app: {
                name: 'PTE Pronunciation Trainer',
                version: '2.5.4',
                description: 'Comprehensive pronunciation training for PTE Academic exam preparation'
            },
            // ===== DATA CONFIGURATION =====
            data: {
                paths: {
                    base: 'data',
                    processed: 'data/processed',
                    byMode: {
                        // Vocabulary books
                        'pte-fib-listening': 'data/processed/pte-fib-listening-dataset.json',
                        'pte-beginner': 'data/processed/pte-beginner-vocabulary.json',
                        'pte-intermediate': 'data/processed/pte-intermediate-vocabulary.json',
                        'pte-advanced': 'data/processed/pte-advanced-vocabulary.json',
                        'pte-ra': 'data/processed/pte-ra-vocabulary.json',
                        'pte-rs-vocab': 'data/processed/pte-rs-vocabulary.json',
                        'pte-must-know': 'data/processed/pte-must-know-vocabulary.json',
                        'pte-wfd-vocab': 'data/processed/pte-wfd-vocabulary.json',
                        'pte-rs-wfd-vocab': 'data/processed/pte-rs-wfd-vocabulary.json',
                        'pte-reading-fib': 'data/processed/pte-reading-fib-vocabulary.json',
                        'pte-reading-fib-drag': 'data/processed/pte-reading-fib-drag-vocabulary.json',
                        'pte-asq-answers': 'data/processed/pte-asq-answers-vocabulary.json',
                        'pte-high-frequency': 'data/processed/pte-high-frequency-vocabulary.json',
                        'pte-rs-core': 'data/processed/pte-rs-core-vocabulary.json',
                        'pte-di-rl-templates': 'data/processed/pte-di-rl-templates-vocabulary.json',
                        'pte-sst-complete': 'data/processed/pte-sst-complete-vocabulary.json',
                        // Practice modes
                        'rs': 'data/processed/pte-repeat-sentence.json',
                        'asq': 'data/processed/pte-answer-short-question.json',
                        'wfd': 'data/processed/pte-write-from-dictation.json',
                        // Shadowing modes
<<<<<<< HEAD
=======
                        'di-shadowing-1-10': 'data/processed/di-shadowing-images-1-10.json',
>>>>>>> claude/fix-ui-vocabulary-books
                        'di-shadowing-11-20': 'data/processed/di-shadowing-images-11-20.json'
                    }
                },
                learningModes: [
                    // Vocabulary books (16 total)
                    { id: 'pte-fib-listening', name: 'PTE FIB Listening', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-beginner', name: 'PTE Beginner', category: 'vocabulary', difficulty: 'easy' },
                    { id: 'pte-intermediate', name: 'PTE Intermediate', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-advanced', name: 'PTE Advanced', category: 'vocabulary', difficulty: 'hard' },
                    { id: 'pte-ra', name: 'PTE Read Aloud', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-rs-vocab', name: 'PTE RS Vocabulary', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-must-know', name: 'PTE Must-Know', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-wfd-vocab', name: 'PTE WFD Vocabulary', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-rs-wfd-vocab', name: 'PTE RS-WFD Vocabulary', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-reading-fib', name: 'PTE Reading FIB', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-reading-fib-drag', name: 'PTE Reading FIB Drag', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-asq-answers', name: 'PTE ASQ Answers', category: 'vocabulary', difficulty: 'easy' },
                    { id: 'pte-high-frequency', name: 'PTE High-Frequency', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-rs-core', name: 'PTE RS Core', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-di-rl-templates', name: 'PTE DI/RL Templates', category: 'vocabulary', difficulty: 'normal' },
                    { id: 'pte-sst-complete', name: 'PTE SST Complete', category: 'vocabulary', difficulty: 'normal' },
                    // Practice modes (3 total)
                    { id: 'rs', name: 'Repeat Sentence', category: 'practice', description: '620 practice sentences' },
                    { id: 'asq', name: 'Answer Short Question', category: 'practice', description: '692 practice questions' },
                    { id: 'wfd', name: 'Write From Dictation', category: 'practice', description: '1,195 practice sentences' },
                    
<<<<<<< HEAD
                    // Shadowing modes (1 total)
=======
                    // Shadowing modes (2 total)
                    { id: 'di-shadowing-1-10', name: 'DI Shadowing (Images 1-10)', category: 'shadowing', description: '10 DI answers for pronunciation practice' },
>>>>>>> claude/fix-ui-vocabulary-books
                    { id: 'di-shadowing-11-20', name: 'DI Shadowing (Images 11-20)', category: 'shadowing', description: '10 DI answers for pronunciation practice' }
                ],
                defaultMode: 'pte-beginner'
            },
            // ===== TTS CONFIGURATION =====
            tts: {
                defaultVoice: {
                    lang: 'en-US',
                    name: 'Google US English',
                    gender: 'female',
                    localService: false
                },
                fallbackVoices: [
                    { lang: 'en-GB', name: 'Google UK English Female' },
                    { lang: 'en-US', name: 'Microsoft Zira' },
                    { lang: 'en-AU', name: 'Google Australian English' }
                ],
                rate: 0.9,
                pitch: 1.0,
                volume: 1.0,
                autoSpeak: true
            },
            // ===== UI CONFIGURATION =====
            ui: {
                theme: 'auto',
                animationsEnabled: true,
                compactMode: false,
                showPhonetic: true,
                showIPA: true
            },
            // ===== SETTINGS CONFIGURATION =====
            settings: {
                defaults: {
                    autoPlayNext: false,
                    repeatMode: 'off',
                    showPhonetic: true,
                    ttsRate: 0.9,
                    ttsVolume: 1.0,
                    practiceMode: null,
                    difficultyFilter: 'all',
                    theme: 'auto'
                }
            },
            // ===== EVENT TAXONOMY =====
            events: {
                audio: {
                    autoplay: {
                        start: 'audio:autoplay:start',
                        pause: 'audio:autoplay:pause',
                        resume: 'audio:autoplay:resume',
                        stop: 'audio:autoplay:stop'
                    },
                    navigate: {
                        next: 'audio:navigate:next',
                        prev: 'audio:navigate:prev'
                    },
                    repeat: {
                        toggle: 'audio:repeat:toggle'
                    },
                    speed: {
                        change: 'audio:speed:change'
                    },
                    volume: {
                        change: 'audio:volume:change'
                    }
                },
                tts: {
                    speaking: {
                        started: 'tts:speaking:started',
                        completed: 'tts:speaking:completed',
                        error: 'tts:speaking:error'
                    },
                    voice: {
                        changed: 'tts:voice:changed'
                    }
                },
                content: {
                    display: 'content:display',
                    filter: 'content:filter'
                },
                mode: {
                    practice: {
                        changed: 'mode:practice:changed'
                    },
                    vocabulary: {
                        changed: 'mode:vocabulary:changed'
                    }
                },
                vocabulary: {
                    loaded: 'vocabulary:loaded',
                    difficulty: {
                        filtered: 'vocabulary:difficulty:filtered'
                    },
                    error: 'vocabulary:error'
                },
                settings: {
                    changed: 'settings:changed',
                    requestChange: 'settings:request-change',
                    panel: {
                        toggle: 'settings:panel:toggle'
                    },
                    reset: 'settings:reset'
                },
                progress: {
                    updated: 'progress:updated',
                    reset: 'progress:reset'
                },
                system: {
                    ready: 'system:ready',
                    error: 'system:error',
                    warning: 'system:warning'
                }
            },
            // ===== PIPELINE CONFIGURATION =====
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
                },
                registry: [
                    {
                        id: 'pte-fib-listening',
                        input: 'pte-fib-listening-with-ipa.md',
                        fallback: 'fib-listening-vocabulary.md',
                        output: 'pte-fib-listening-dataset.json',
                        category: 'pte-fib-listening',
                        description: 'PTE FIB Listening vocabulary with IPA',
                        sourceType: 'pte-fib-listening-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: true
                    },
                    {
                        id: 'pte-di-rl-templates',
                        input: 'pte-di-rl-templates-with-ipa.md',
                        output: 'pte-di-rl-templates-vocabulary.json',
                        category: 'pte-di-rl-templates',
                        description: 'PTE Describe Image & Retell Lecture templates with IPA',
                        sourceType: 'pte-di-rl-templates',
                        dataType: 'vocabulary',
                        extractorType: 'SingleIPATermsExtractor',
                        inputSubdir: 'vocabs'
                    },
                    {
                        id: 'pte-sst-complete',
                        input: 'pte-sst-complete-with-ipa.md',
                        output: 'pte-sst-complete-vocabulary.json',
                        category: 'pte-sst-complete',
                        description: 'PTE SST (Summarize Spoken Text) complete vocabulary with IPA - ALL 368 terms from 29 topics',
                        sourceType: 'pte-sst-complete',
                        dataType: 'vocabulary',
                        extractorType: 'SingleIPATermsExtractor',
                        inputSubdir: 'vocabs'
                    },
                    {
<<<<<<< HEAD
                        id: 'di-shadowing-11-20',
                        input: 'DI_Images_11-20_With_Pronunciation.md',
=======
                        id: 'di-shadowing-1-10',
                        input: 'di-answers-1-10.md',
                        output: 'di-shadowing-images-1-10.json',
                        category: 'di-shadowing',
                        description: 'DI complete answers (Images 1-10) for shadowing practice with phrase-by-phrase breakdown',
                        sourceType: 'di-answers',
                        dataType: 'shadowing',
                        extractorType: 'DIAnswerExtractor',
                        inputSubdir: 'di'
                    },
                    {
                        id: 'di-shadowing-11-20',
                        input: 'di-answers-11-20.md',
>>>>>>> claude/fix-ui-vocabulary-books
                        output: 'di-shadowing-images-11-20.json',
                        category: 'di-shadowing',
                        description: 'DI complete answers (Images 11-20) for shadowing practice with phrase-by-phrase breakdown',
                        sourceType: 'di-answers',
                        dataType: 'shadowing',
                        extractorType: 'DIAnswerExtractor',
                        inputSubdir: 'di'
                    },
                    // ... Add more registry entries as needed during migration
                ],
                extractorTypes: {
                    PTETermsExtractor: 'src/js/data/extractors/PTETermsExtractor.js',
                    SingleIPATermsExtractor: 'src/js/data/extractors/SingleIPATermsExtractor.js',
                    PTESentenceExtractor: 'src/js/data/extractors/PTESentenceExtractor.js',
                    PTEQuestionExtractor: 'src/js/data/extractors/PTEQuestionExtractor.js',
                    DIAnswerExtractor: 'src/js/data/extractors/DIAnswerExtractor.js'
                }
            },
            // ===== BUILD CONFIGURATION =====
            build: {
                cssFiles: [
                    'src/css/variables.css',
                    'src/css/animations.css',
                    'src/css/components.css',
                    'src/css/style.css',
                    'src/css/responsive.css'
                ],
                jsFiles: [
                    'src/js/shared/Config.js',
                    'src/js/shared/DataSchema.js',
                    'src/js/utils/EventBus.js',
                    'src/js/utils/Storage.js',
                    'src/js/utils/CacheMigration.js',
                    'src/js/data/DatasetManager.js',
                    'src/js/core/InitializationManager.js',
                    'src/js/core/SettingsModule.js',
                    'src/js/core/PTEVocabularyManager.js',
                    'src/js/core/ProgressTracker.js',
                    'src/js/audio/TTSEngine.js',
                    'src/js/audio/VoiceSelector.js',
                    'src/js/audio/AudioControls.js',
                    'src/js/ui/UIController.js',
                    'src/js/ui/SettingsPanel.js',
                    'src/js/core/PTEApp.js'
                ],
                outputDir: 'dist',
                minify: true,
                sourceMaps: true
            }
        };
    }
    /**
     * Get configuration value using dot notation
     * Type-safe version of the original get() method
     *
     * @example
     * config.get('app.name') // Returns: 'PTE Pronunciation Trainer'
     * config.get('events.audio.autoplay.start') // Returns: 'audio:autoplay:start'
     */
    get(path, defaultValue) {
        const value = this.getNestedValue(this.config, path);
        return (value !== undefined ? value : defaultValue);
    }
    /**
     * Set configuration value using dot notation
     */
    set(path, value) {
        this.setNestedValue(this.config, path, value);
    }
    /**
     * Get all configuration
     */
    getAll() {
        return this.config;
    }
    /**
     * Merge configuration
     */
    merge(newConfig) {
        this.config = this.deepMerge(this.config, newConfig);
    }
    /**
     * Get nested value from object using dot notation
     * @private
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Set nested value in object using dot notation
     * @private
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        if (!lastKey)
            return;
        const target = keys.reduce((current, key) => {
            if (!current[key])
                current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    /**
     * Deep merge two objects
     * @private
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
}
// Export singleton instance
export const appConfig = new AppConfig();
// Default export: singleton instance (for scripts that need config immediately)
export default appConfig;
// Attach to window for vanilla JS compatibility (Phase 2 migration)
if (typeof window !== 'undefined') {
    window.appConfig = appConfig;
    console.log('✅ Config.js loaded - window.appConfig attached:', typeof window.appConfig);
}
//# sourceMappingURL=Config.js.map