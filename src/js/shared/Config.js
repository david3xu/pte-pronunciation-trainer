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
                },
                // Centralized dataset registry for the pipeline. Each entry defines a dataset to build.
                // New books should be added here; the pipeline will iterate over this list.
                // NOTE: "category" field is metadata assigned to each word for FILTERING purposes
                // (e.g., word.category = 'pte-beginner' allows filtering by category)
                // It's NOT for navigation hierarchy (that was the legacy CCL app's concept)
                registry: [
                    {
                        id: 'pte-fib-listening',
                        input: 'pte-fib-listening-with-ipa.md',
                        fallback: 'fib-listening-vocabulary.md',
                        output: 'pte-fib-listening-dataset.json',
                        category: 'pte-fib-listening', // Metadata: what category label to assign to words from this dataset
                        description: 'PTE FIB Listening vocabulary with IPA',
                        sourceType: 'pte-fib-listening-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: true
                    },
                    {
                        id: 'pte-beginner',
                        input: 'pte-beginner-vocabulary-with-ipa.md',
                        output: 'pte-beginner-vocabulary.json',
                        category: 'pte-beginner', // Metadata: what category label to assign to words from this dataset
                        description: 'PTE Beginner high-frequency vocabulary with IPA',
                        sourceType: 'pte-beginner-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-intermediate',
                        input: 'pte-intermediate-vocabulary-with-ipa.md',
                        fallback: 'pte-intermediate-vocabulary.md',
                        output: 'pte-intermediate-vocabulary.json',
                        category: 'pte-intermediate',
                        description: 'PTE Intermediate vocabulary (simple list fallback, IPA when available)',
                        sourceType: 'pte-intermediate-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-advanced',
                        input: 'pte-advanced-vocabulary-with-ipa.md',
                        output: 'pte-advanced-vocabulary.json',
                        category: 'pte-advanced',
                        description: 'PTE Advanced vocabulary with IPA',
                        sourceType: 'pte-advanced-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-ra',
                        input: 'pte-ra-vocabulary-with-ipa.md',
                        output: 'pte-ra-vocabulary.json',
                        category: 'pte-ra',
                        description: 'PTE Read Aloud (RA) vocabulary with IPA',
                        sourceType: 'pte-ra-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-rs',
                        input: 'pte-rs-vocabulary-with-ipa.md',
                        output: 'pte-rs-vocabulary.json',
                        category: 'pte-rs-vocab',
                        description: 'PTE Repeat Sentence (RS) vocabulary with IPA',
                        sourceType: 'pte-rs-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-must-know',
                        input: 'pte-must-know-vocabulary-with-ipa.md',
                        output: 'pte-must-know-vocabulary.json',
                        category: 'pte-must-know',
                        description: 'PTE Must-Know Vocabulary (1,397 essential terms with IPA)',
                        sourceType: 'pte-must-know-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-wfd-vocab',
                        input: 'pte-wfd-vocabulary-with-ipa.md',
                        output: 'pte-wfd-vocabulary.json',
                        category: 'pte-wfd-vocab',
                        description: 'PTE Write From Dictation vocabulary with IPA',
                        sourceType: 'pte-wfd-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-rs-wfd-vocab',
                        input: 'pte-rs-wfd-vocabulary-with-ipa.md',
                        output: 'pte-rs-wfd-vocabulary.json',
                        category: 'pte-rs-wfd-vocab',
                        description: 'PTE RS & WFD Academic Vocabulary (1,834 essential terms with IPA)',
                        sourceType: 'pte-rs-wfd-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'SingleIPATermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-reading-fib',
                        input: 'pte-reading-fib-vocabulary-with-ipa.md',
                        output: 'pte-reading-fib-vocabulary.json',
                        category: 'pte-reading-fib',
                        description: 'PTE Reading Fill-in-the-Blanks vocabulary with IPA',
                        sourceType: 'pte-reading-fib-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-reading-fib-drag',
                        input: 'pte-reading-fib-drag-vocabulary-with-ipa.md',
                        output: 'pte-reading-fib-drag-vocabulary.json',
                        category: 'pte-reading-fib-drag',
                        description: 'PTE Reading FIB (Drag & Drop) vocabulary with IPA',
                        sourceType: 'pte-reading-fib-drag-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-asq-answers',
                        input: 'pte-asq-answers-vocabulary-with-ipa.md',
                        output: 'pte-asq-answers-vocabulary.json',
                        category: 'pte-asq-answers',
                        description: 'PTE ASQ Answers Vocabulary (692 answer words with IPA)',
                        sourceType: 'pte-asq-answers-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'PTETermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-high-frequency',
                        input: 'pte-high-frequency-vocabulary-with-ipa.md',
                        output: 'pte-high-frequency-vocabulary.json',
                        category: 'pte-high-frequency',
                        description: 'PTE High-Frequency Vocabulary (293 common exam words with IPA)',
                        sourceType: 'pte-high-frequency-vocabulary-with-ipa',
                        dataType: 'vocabulary',
                        extractorType: 'SingleIPATermsExtractor',
                        inputSubdir: 'vocabs',
                        isDefault: false
                    },
                    {
                        id: 'pte-repeat-sentence',
                        input: 'pte-repeat-sentence.md',
                        output: 'pte-repeat-sentence-dataset.json',
                        category: 'pte-rs',
                        description: 'PTE Repeat Sentence practice sentences (620 sentences, no IPA)',
                        sourceType: 'numbered-sentences',
                        dataType: 'rs',
                        extractorType: 'PTESentenceExtractor',
                        inputSubdir: 'rs',
                        isDefault: false
                    },
                    {
                        id: 'pte-rs-segments',
                        input: 'pte-repeat-sentence-segments.md',
                        output: 'pte-rs-segments-dataset.json',
                        category: 'pte-rs-segments',
                        description: 'PTE RS Thought Group Segments (1,424 segments for pronunciation practice)',
                        sourceType: 'numbered-sentences',
                        dataType: 'rs',
                        extractorType: 'PTESentenceExtractor',
                        inputSubdir: 'rs',
                        isDefault: false
                    },
                    {
                        id: 'pte-answer-short-question',
                        input: 'pte-answer-short-question.md',
                        output: 'pte-answer-short-question-dataset.json',
                        category: 'pte-asq',
                        description: 'PTE Answer Short Question dataset (692 questions with verified answers, no IPA)',
                        sourceType: 'question-answer',
                        dataType: 'asq',
                        extractorType: 'PTEQuestionExtractor',
                        inputSubdir: 'asq',
                        isDefault: false
                    },
                    {
                        id: 'pte-write-from-dictation',
                        input: 'pte-write-from-dictation.md',
                        output: 'pte-write-from-dictation-dataset.json',
                        category: 'pte-wfd',
                        description: 'PTE Write From Dictation sentences (1,195 sentences, no IPA)',
                        sourceType: 'numbered-sentences',
                        dataType: 'wfd',
                        extractorType: 'PTESentenceExtractor',
                        inputSubdir: 'wfd',
                        isDefault: false
                    }
                ],
                extraSources: [
                    {
                        id: 'pte-beginner',
                        input: 'pte-beginner-vocabulary-with-ipa.md',
                        output: 'pte-beginner-vocabulary.json',
                        category: 'pte-beginner',
                        description: 'PTE Beginner high-frequency vocabulary with IPA',
                        sourceType: 'pte-beginner-vocabulary-with-ipa'
                    }
                ]
            },

            // ===== DATA SOURCES CONFIGURATION =====
            data: {
                paths: {
                    dataset: '/data/processed/pte-fib-listening-dataset.json',
                    byMode: {
                        // Vocabulary learning modes
                        'pte-fib-listening': '/data/processed/pte-fib-listening-dataset.json',
                        'pte-beginner': '/data/processed/pte-beginner-vocabulary.json',
                        'pte-intermediate': '/data/processed/pte-intermediate-vocabulary.json',
                        'pte-advanced': '/data/processed/pte-advanced-vocabulary.json',
                        'pte-ra': '/data/processed/pte-ra-vocabulary.json',
                        'pte-rs': '/data/processed/pte-rs-vocabulary.json',
                        'pte-must-know': '/data/processed/pte-must-know-vocabulary.json',
                        'pte-wfd-vocab': '/data/processed/pte-wfd-vocabulary.json',
                        'pte-rs-wfd-vocab': '/data/processed/pte-rs-wfd-vocabulary.json',
                        'pte-reading-fib': '/data/processed/pte-reading-fib-vocabulary.json',
                        'pte-reading-fib-drag': '/data/processed/pte-reading-fib-drag-vocabulary.json',
                        'pte-asq-answers': '/data/processed/pte-asq-answers-vocabulary.json',
                        'pte-high-frequency': '/data/processed/pte-high-frequency-vocabulary.json',

                        // Practice datasets (RS/ASQ/WFD)
                        'pte-repeat-sentence': '/data/processed/pte-repeat-sentence-dataset.json',
                        'pte-rs-segments': '/data/processed/pte-rs-segments-dataset.json',
                        'pte-answer-short-question': '/data/processed/pte-answer-short-question-dataset.json',
                        'pte-write-from-dictation': '/data/processed/pte-write-from-dictation-dataset.json'
                    },
                    source: 'data/source/pte/vocabs/',
                    processed: 'data/processed/',
                    reports: 'data/reports/'
                },
                categories: {
                    'all-categories': '🌟 All Categories',
                    'pte-fib-listening': '🎧 FIB Listening',
                    'pte-beginner': '📗 PTE Beginner',
                    'pte-intermediate': '📘 PTE Intermediate'
                },
                practiceModes: [
                    { id: 'vocabulary', label: '📚 Vocabulary Training', type: 'vocab' },
                    { id: 'rs', label: '🎤 Repeat Sentence (RS)', type: 'practice' },
                    { id: 'asq', label: '❓ Answer Short Question (ASQ)', type: 'practice' },
                    { id: 'wfd', label: '✍️ Write From Dictation (WFD)', type: 'practice' }
                ],
                learningModes: [
                    { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening', dataset: 'pte-fib-listening-with-ipa' },
                    { id: 'pte-beginner', label: '📗 PTE Beginner Vocabulary', dataset: 'pte-beginner-vocabulary-with-ipa' },
                    { id: 'pte-intermediate', label: '📘 PTE Intermediate Vocabulary', dataset: 'pte-intermediate-vocabulary-with-ipa' },
                    { id: 'pte-advanced', label: '📕 PTE Advanced Vocabulary', dataset: 'pte-advanced-vocabulary-with-ipa' },
                    { id: 'pte-ra', label: '📚 PTE Read Aloud (RA) Vocabulary', dataset: 'pte-ra-vocabulary-with-ipa' },
                    { id: 'pte-rs', label: '🎯 PTE Repeat Sentence (RS) Vocabulary', dataset: 'pte-rs-vocabulary-with-ipa' },
                    { id: 'pte-must-know', label: '⭐ PTE Must-Know Vocabulary', dataset: 'pte-must-know-vocabulary-with-ipa' },
                    { id: 'pte-wfd-vocab', label: '✍️ PTE WFD Vocabulary', dataset: 'pte-wfd-vocabulary-with-ipa' },
                    { id: 'pte-rs-wfd-vocab', label: '🎯✍️ PTE RS & WFD Academic Vocabulary', dataset: 'pte-rs-wfd-vocabulary-with-ipa' },
                    { id: 'pte-reading-fib', label: '📖 PTE Reading FIB Vocabulary', dataset: 'pte-reading-fib-vocabulary-with-ipa' },
                    { id: 'pte-reading-fib-drag', label: '🔀 PTE Reading FIB Drag Vocabulary', dataset: 'pte-reading-fib-drag-vocabulary-with-ipa' },
                    { id: 'pte-asq-answers', label: '❓ PTE ASQ Answers Vocabulary', dataset: 'pte-asq-answers-vocabulary-with-ipa' },
                    { id: 'pte-high-frequency', label: '⚡ PTE High-Frequency Vocabulary', dataset: 'pte-high-frequency-vocabulary-with-ipa' }
                ],
                practiceDatasets: [
                    { id: 'pte-repeat-sentence', label: '🎤 Repeat Sentence', itemCount: 620, type: 'rs' },
                    { id: 'pte-rs-segments', label: '🎯 RS Thought Groups', itemCount: 1424, type: 'rs' },
                    { id: 'pte-answer-short-question', label: '❓ Answer Short Question', itemCount: 692, type: 'asq' },
                    { id: 'pte-write-from-dictation', label: '✍️ Write From Dictation', itemCount: 1195, type: 'wfd' }
                ],

                // Practice Mode Mappings - Single source of truth for mode relationships
                // Maps UI practice modes to their default internal modes and behavior
                practiceModeMapping: {
                    vocabulary: {
                        type: 'vocabulary',
                        defaultLearningMode: 'pte-fib-listening',  // Default vocabulary book
                        usesLearningMode: true,   // Uses learningModeSelect dropdown
                        usesPracticeDataset: false // Doesn't use practiceDatasetSelect
                    },
                    rs: {
                        type: 'practice',
                        defaultPracticeDataset: 'pte-repeat-sentence',
                        usesLearningMode: false,
                        usesPracticeDataset: true
                    },
                    asq: {
                        type: 'practice',
                        defaultPracticeDataset: 'pte-answer-short-question',
                        usesLearningMode: false,
                        usesPracticeDataset: true
                    },
                    wfd: {
                        type: 'practice',
                        defaultPracticeDataset: 'pte-write-from-dictation',
                        usesLearningMode: false,
                        usesPracticeDataset: true
                    }
                },

                difficulties: ['all', 'normal', 'hard', 'easy'], // All PTE terms with mixed difficulties

                // Dataset file registry - single source of truth for all dataset files
                datasetFiles: {
                    // Practice datasets for sentence modes (RS/ASQ/WFD)
                    'pte-repeat-sentence': { file: 'pte-repeat-sentence-dataset.json', type: 'sentence' },
                    'repeat-sentence': { file: 'pte-repeat-sentence-dataset.json', type: 'sentence' }, // Legacy ID mapping
                    'pte-rs-segments': { file: 'pte-rs-segments-dataset.json', type: 'sentence' },
                    'pte-answer-short-question': { file: 'pte-answer-short-question-dataset.json', type: 'question' },
                    'answer-short-question': { file: 'pte-answer-short-question-dataset.json', type: 'question' }, // Legacy ID mapping
                    'pte-write-from-dictation': { file: 'pte-write-from-dictation-dataset.json', type: 'sentence' },
                    'write-from-dictation': { file: 'pte-write-from-dictation-dataset.json', type: 'sentence' }, // Legacy ID mapping

                    // Vocabulary datasets
                    'pte-fib-listening': { file: 'pte-fib-listening-dataset.json', type: 'vocabulary' },
                    'pte-beginner': { file: 'pte-beginner-vocabulary.json', type: 'vocabulary' },
                    'pte-intermediate': { file: 'pte-intermediate-vocabulary.json', type: 'vocabulary' },
                    'pte-advanced': { file: 'pte-advanced-vocabulary.json', type: 'vocabulary' },
                    'pte-ra': { file: 'pte-ra-vocabulary.json', type: 'vocabulary' },
                    'pte-rs': { file: 'pte-rs-vocabulary.json', type: 'vocabulary' },
                    'pte-must-know': { file: 'pte-must-know-vocabulary.json', type: 'vocabulary' },
                    'pte-wfd-vocab': { file: 'pte-wfd-vocabulary.json', type: 'vocabulary' },
                    'pte-reading-fib': { file: 'pte-reading-fib-vocabulary.json', type: 'vocabulary' },
                    'pte-reading-fib-drag': { file: 'pte-reading-fib-drag-vocabulary.json', type: 'vocabulary' }
                }
            },

            // ===== DEBUG CONFIGURATION =====
            // Controls logging and development features
            debug: {
                enabled: false,  // Set to true for development mode
                verbose: false,  // Enable verbose logging (detailed traces)
                logEvents: false,  // Log all EventBus emissions
                logSettings: true,  // Log settings changes
                logModules: true,  // Log module initialization
                logTTS: false,  // Log TTS operations
                logUI: false,  // Log UI updates
                logData: false  // Log data loading operations
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
                language: {
                    default: 'en-AU',
                    alternatives: ['en-GB', 'en-US']
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
                delays: {
                    retry: 500,  // Delay before retrying dataset load
                    transition: 300  // UI transition delay
                },
                elements: {
                    pronunciationToggle: {
                        british: '🇬🇧',
                        american: '🇺🇸'
                    }
                },
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

            // ===== EVENT TAXONOMY =====
            // Single source of truth for ALL event names in the application
            // Pattern: domain:action[:modifier]
            events: {
                // Content display and navigation
                content: {
                    display: 'content:display',
                    next: 'content:next',
                    prev: 'content:prev'
                },

                // Audio playback and controls
                audio: {
                    autoplay: {
                        start: 'audio:autoplay:start',
                        started: 'audio:autoplay:started',
                        pause: 'audio:autoplay:pause',
                        paused: 'audio:autoplay:paused'
                    },
                    navigate: {
                        next: 'audio:navigate:next',
                        prev: 'audio:navigate:prev'
                    },
                    word: {
                        started: 'audio:word:started'
                    },
                    delay: {
                        changed: 'audio:delay:changed'
                    },
                    repeat: {
                        changed: 'audio:repeat:changed'
                    }
                },

                // Text-to-speech events
                tts: {
                    speaking: {
                        started: 'tts:speaking:started',
                        completed: 'tts:speaking:completed',
                        stopped: 'tts:speaking:stopped'
                    },
                    rate: {
                        changed: 'tts:rate:changed'
                    },
                    repeat: {
                        changed: 'tts:repeat:changed'
                    }
                },

                // Settings and configuration
                settings: {
                    requestChange: 'settings:request-change',
                    changed: 'settings:changed',
                    error: 'settings:error',
                    reset: 'settings:reset',
                    batchUpdated: 'settings:batch-updated',
                    panel: {
                        opened: 'settings:panel:opened',
                        closed: 'settings:panel:closed'
                    },
                    exported: 'settings:exported',
                    imported: 'settings:imported'
                },

                // Mode changes (practice mode, learning mode)
                mode: {
                    practice: {
                        changing: 'mode:practice:changing',
                        changed: 'mode:practice:changed'
                    },
                    learning: {
                        changing: 'mode:learning:changing',
                        changed: 'mode:learning:changed'
                    }
                },

                // System-level events
                system: {
                    error: 'system:error',  // Global error handler
                    initialized: 'system:initialized',  // System ready
                    ready: 'system:ready'  // All modules loaded
                },

                // Dataset loading and management
                dataset: {
                    loading: 'dataset:loading',  // Before load starts
                    loaded: 'dataset:loaded',  // After successful load
                    error: 'dataset:error',  // On load failure
                    practice: {
                        changed: 'dataset:practice:changed'
                    }
                },

                // Vocabulary-specific events
                vocabulary: {
                    loaded: 'vocabulary:loaded',
                    updated: 'vocabulary:updated',
                    difficulty: {
                        filtered: 'vocabulary:difficulty:filtered'
                    },
                    error: 'vocabulary:error',
                    loadError: 'vocabulary:load-error'
                },

                // Progress tracking
                progress: {
                    updated: 'progress:updated',
                    status: {
                        updated: 'progress:status:updated'
                    },
                    stats: {
                        updated: 'progress:stats:updated'
                    },
                    error: 'progress:error'
                },

                // Voice selection
                voice: {
                    preference: {
                        changed: 'voice:preference:changed'
                    }
                },

                // Application lifecycle
                app: {
                    initialized: 'app:initialized'
                },

                // System-level events
                system: {
                    error: 'system:error'
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
                    delay: 'tts.delays.long',
                    repeat: 'loop', // Loop through all words continuously
                    voice: 'auto',
                    learningMode: 'pte-fib-listening'
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

            // ===== MODE ENUMERATIONS =====
            // Used throughout the codebase to avoid string literals
            modes: {
                practice: {
                    vocabulary: 'vocabulary',
                    repeatSentence: 'rs',
                    answerShortQuestion: 'asq',
                    writeFromDictation: 'wfd'
                },
                pronunciation: {
                    british: 'british',
                    american: 'american'
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
                // CRITICAL: CSS files must load in this exact order
                css: {
                    loadOrder: [
                        'variables',    // Design tokens first
                        'animations',   // Keyframes second
                        'components',   // Reusable components third
                        'style',        // Main layout fourth
                        'practice-modes'  // Mode-specific styles last
                    ],
                    files: {
                        variables: 'src/css/variables.css',
                        animations: 'src/css/animations.css',
                        components: 'src/css/components.css',
                        style: 'src/css/style.css',
                        'practice-modes': 'src/css/practice-modes.css'
                    }
                },
                jsFiles: [
                    'src/js/shared/AppNamespace.js',
                    'src/js/shared/Config.js',
                    'src/js/shared/DataSchema.js',
                    'src/js/shared/LegacyCompatibility.js',
                    'src/js/utils/EventBus.js',
                    'src/js/utils/Storage.js',
                    'src/js/utils/CacheMigration.js',
                    'src/js/data/extractors/PTETermsExtractor.js',
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
                output: {
                    js: 'js/app.min.js',
                    css: 'css/style.min.css',
                    html: 'index.html'
                }
            },

            // ===== VALIDATION CONFIGURATION =====
            validation: {
                requiredFiles: [
                    'data/processed/pte-fib-listening-dataset.json',
                    'data/processed/pte-beginner-vocabulary.json',
                    'data/processed/pte-intermediate-vocabulary.json'
                ],
                errorMessages: {
                    datasetNotFound: 'PTE vocabulary data file not found. Run "npm run data:pte" first.',
                    noTerms: 'No vocabulary terms found in dataset.'
                }
            },

            // ===== FALLBACK CONFIGURATION =====
            // Used when config values are missing or invalid
            fallbacks: {
                learningMode: 'pte-fib-listening',
                category: 'all-categories',
                difficulty: 'all',
                practiceMode: 'vocabulary',
                repeatMode: 'once'
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
    // Initialize config
    const appConfig = new AppConfig();

    // Expose as global reference for PTE app
    window.appConfig = appConfig;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}