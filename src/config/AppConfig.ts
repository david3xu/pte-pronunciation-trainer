/**
 * Centralized Configuration Management (TypeScript)
 *
 * Type-safe configuration for the PTE Pronunciation Trainer. This is the
 * single source of truth for dataset paths, learning modes, API endpoints,
 * delays, and limits.
 */

import { AppConfig as AppConfigType, ConfigPath } from '../types';

// The native shell loads the web bundle from capacitor://localhost, where a
// relative API path has no server to resolve against. Native builds must be
// given an absolute API origin explicitly at build time.
const CAPACITOR_PROTOCOL = 'capacitor:';

// A browser deployment serves the bundle and the /api routes from one origin,
// so relative API paths are correct there by construction. This constant
// encodes the meaning of "same origin", it is not a stand in for absent
// operator configuration.
const SAME_ORIGIN_API_BASE_URL = '';

const isNativeRuntime = (): boolean =>
  typeof window !== 'undefined' && window.location.protocol === CAPACITOR_PROTOCOL;

const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env['VITE_API_BASE_URL'];
  if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.length > 0) {
    return configuredBaseUrl;
  }

  if (isNativeRuntime()) {
    throw new Error(
      'AppConfig: VITE_API_BASE_URL must be set to an absolute API origin for native builds, ' +
        'because capacitor://localhost cannot resolve relative API paths'
    );
  }

  return SAME_ORIGIN_API_BASE_URL;
};

/**
 * Application Configuration Class
 * Provides type-safe access to all application settings
 */
export class AppConfig {
  private config: AppConfigType;

  constructor() {
    this.config = this.initializeConfig();
  }

  /**
   * Initialize the complete configuration object
   */
  private initializeConfig(): AppConfigType {
    return {
      app: {
        name: 'PTE Pronunciation Trainer',
        version: '3.0.6',
        description: 'Comprehensive pronunciation training for PTE Academic exam preparation'
      },

      // ===== DATA CONFIGURATION =====
      data: {
        paths: {
          base: 'data',
          processed: 'data/processed',
            byMode: {
              // Vocabulary books
              'pte-fib-listening': 'data/processed/pte-fib-listening.json',
              'pte-beginner': 'data/processed/pte-beginner-vocabulary.json',
              'pte-intermediate': 'data/processed/pte-intermediate-vocabulary.json',
              'pte-advanced': 'data/processed/pte-advanced-vocabulary.json',
              'pte-ra': 'data/processed/pte-ra-vocabulary.json',
              'pte-rs-vocabulary': 'data/processed/pte-rs-vocabulary.json',
              'pte-must-know': 'data/processed/pte-must-know-vocabulary.json',
              'pte-wfd-vocabulary': 'data/processed/pte-wfd-vocabulary.json',
              'pte-rs-wfd-vocabulary': 'data/processed/pte-rs-wfd-vocabulary.json',
              'pte-reading-fib': 'data/processed/pte-reading-fib-vocabulary.json',
              'pte-reading-fib-drag': 'data/processed/pte-reading-fib-drag-vocabulary.json',
              'pte-asq-answers': 'data/processed/pte-asq-answers-vocabulary.json',
              'pte-high-frequency': 'data/processed/pte-high-frequency-vocabulary.json',
              'pte-rs-core': 'data/processed/pte-rs-core-vocabulary.json',
              'pte-di-rl-templates': 'data/processed/pte-di-rl-templates-vocabulary.json',
              'pte-sst-complete': 'data/processed/pte-sst-complete.json',
              'pte-essay-topic-vocabulary': 'data/processed/pte-essay-topic-vocabulary.json',
              'pte-di-difficult-words': 'data/processed/pte-di-difficult-words.json',
              'pte-di-easy-phrases': 'data/processed/pte-di-easy-phrases.json',
              'pte-essay-b1-examples': 'data/processed/pte-essay-b1-examples-vocabulary.json',
              'pte-essay-b1-examples-24': 'data/processed/pte-essay-b1-examples-vocabulary-24.json',
              'pte-hard-rs-vocabulary': 'data/processed/pte-hard-rs-vocabulary.json',
              'pte-hard-fib-listening': 'data/processed/pte-hard-fib-listening.json',
              'pte-hard-wfd-vocabulary': 'data/processed/pte-hard-wfd-vocabulary.json',
              'pte-ra-vocabulary': 'data/processed/pte-ra-vocabulary.json',
              'pte-my-ra': 'data/processed/pte-my-ra.json',
              'pte-my-rs-wfd': 'data/processed/pte-my-rs-wfd.json',
              'pte-di-natural-template': 'data/processed/pte-di-natural-template-vocab.json',
              'pte-di-slots': 'data/processed/pte-di-slots-collection.json',
              'pte-rs-segments': 'data/processed/pte-rs-segments-dataset.json',
              'pte-wfd-segments': 'data/processed/pte-wfd-segments-dataset.json',
              'pte-sgd-vocabulary': 'data/processed/pte-sgd-vocabulary.json',
              'pte-rl-vocabulary': 'data/processed/pte-rl-vocabulary.json',
              'pte-essay-outcomes-vocabulary': 'data/processed/pte-essay-outcomes-vocabulary.json',
              'pte-essay-90plus-filled-terms': 'data/processed/pte-essay-90plus-filled-terms.json',
              'pte-plural-nouns-s-practice': 'data/processed/pte-plural-nouns-s-practice.json',
              'pte-template-practice': 'data/processed/pte-template-practice-vocabulary.json',
              'pte-essay-topic-paraphrase': 'data/processed/pte-essay-topic-paraphrase-vocabulary.json',
              'pte-phd-official-project-terms': 'data/processed/pte-phd-official-project-terms.json',

              // Practice modes
              'rs': 'data/processed/pte-repeat-sentence-dataset.json',
              'asq': 'data/processed/pte-answer-short-question-dataset.json',
              'wfd': 'data/processed/pte-write-from-dictation-dataset.json',
              'swt': 'data/processed/pte-swt-dataset.json',
              'essay-b1-terms': 'data/processed/pte-essay-b1-terms-dataset.json',

              // Shadowing modes
              'di-shadowing': 'data/processed/di-shadowing-natural.json'
            }
        },

        learningModes: [
          // Vocabulary books (13 total)
          { id: 'pte-my-ra', name: 'My RA PTE Words', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-my-rs-wfd', name: 'My RS & WFD PTE Words', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-fib-listening', name: 'PTE FIB Listening', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-beginner', name: 'PTE Beginner', category: 'vocabulary', difficulty: 'easy' },
          // { id: 'pte-intermediate', name: 'PTE Intermediate', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-advanced', name: 'PTE Advanced', category: 'vocabulary', difficulty: 'hard' },
          // { id: 'pte-ra', name: 'PTE Read Aloud', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-rs-vocabulary', name: 'PTE RS Vocab', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-must-know', name: 'PTE Must-Know', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-wfd-vocabulary', name: 'PTE WFD Vocab', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-rs-wfd-vocabulary', name: 'PTE RS-WFD Vocab', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-reading-fib', name: 'PTE Reading FIB', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-reading-fib-drag', name: 'PTE Reading FIB Drag', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-asq-answers', name: 'PTE ASQ Answers', category: 'vocabulary', difficulty: 'easy' },
          // { id: 'pte-high-frequency', name: 'PTE High-Frequency', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-rs-core', name: 'PTE RS Core', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-di-rl-templates', name: 'PTE DI/RL Templates', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-sst-complete', name: 'PTE SST Complete', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-essay-topic-vocabulary', name: 'PTE Essay Topics', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-di-difficult-words', name: 'PTE DI Difficult Words', category: 'vocabulary', difficulty: 'hard' },
          { id: 'pte-di-easy-phrases', name: 'PTE DI Easy Phrases', category: 'vocabulary', difficulty: 'easy' },
          { id: 'pte-essay-b1-examples', name: 'PTE Essay B1 Examples', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-essay-b1-examples-24', name: 'PTE Essay B1 Exam (24)', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-hard-fib-listening', name: 'PTE Hard FIB Listening', category: 'vocabulary', difficulty: 'hard' },
          { id: 'pte-hard-rs-vocabulary', name: 'PTE Hard RS Vocab', category: 'vocabulary', difficulty: 'hard' },
          { id: 'pte-hard-wfd-vocabulary', name: 'PTE Hard WFD Vocab', category: 'vocabulary', difficulty: 'hard' },
          { id: 'pte-ra-vocabulary', name: 'PTE RA Vocabulary', category: 'vocabulary', difficulty: 'hard' },
          { id: 'pte-di-natural-template', name: 'DI Natural Template', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-di-slots', name: 'DI Slots Collection', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-rs-segments', name: 'RS Segments Shadow', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-wfd-segments', name: 'WFD Segments Shadow', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-sgd-vocabulary', name: 'SGD Vocabulary', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-rl-vocabulary', name: 'RL Vocabulary', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-essay-outcomes-vocabulary', name: 'Essay Outcomes Vocab', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-essay-90plus-filled-terms', name: 'PTE 90+ Essay Filled Terms', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-plural-nouns-s-practice', name: 'Plural Nouns /s/ Practice', category: 'vocabulary', difficulty: 'easy' },
          { id: 'pte-template-practice', name: 'Template Practice', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-phd-official-project-terms', name: 'PhD Official Project Terms', category: 'vocabulary', difficulty: 'normal' },
          // { id: 'pte-essay-topic-paraphrase', name: 'Essay Topic & Paraphrase', category: 'vocabulary', difficulty: 'normal' },

          // Practice modes, nested under the 'practice' study type (3 total)
          { id: 'rs', name: 'Repeat Sentence', category: 'practice', description: '620 practice sentences' },
          { id: 'asq', name: 'Answer Short Question', category: 'practice', description: '692 practice questions' },
          { id: 'wfd', name: 'Write From Dictation', category: 'practice', description: '1,195 practice sentences' },

          // Writing modes, nested under the reusable 'writing' study type.
          // Both entries are exact text typing drills rather than PTE form
          // scored writing; see src/config/typingTasks.ts.
          { id: 'swt', name: 'Summarize Written Text', category: 'writing', description: '58 practice passages' },
          { id: 'essay-b1-terms', name: 'Essay B1 Terms', category: 'writing', description: '37 essay topics, 717 terms' },

          // Shadowing modes (1 total)
          { id: 'di-shadowing', name: 'DI Natural Shadowing', category: 'shadowing', description: '43 natural DI answers for pronunciation practice with human-like chunking' }
        ]
      },

      // ===== AI CONFIGURATION =====
      ai: {
        gemini: {
          // Model versions - standardized to gemini-2.5-flash across all routes
          defaultModel: 'gemini-2.5-flash',
          fallbackModel: 'gemini-1.5-flash',

          // Request limits
          conversationHistoryLimit: 10,
          requestsPerDay: 1500,

          // Generation parameters
          maxTokens: 2048,
          temperature: 0.7,
          topP: 0.95,
          topK: 40
        }
      },

      // ===== API ENDPOINTS =====
      api: {
        // Empty base URL means same origin (relative) API paths, which is
        // correct for browser deployments. Native Capacitor builds run from
        // capacitor://localhost and therefore require VITE_API_BASE_URL to be
        // set explicitly; startup fails loudly when it is missing.
        baseUrl: getApiBaseUrl(),
        endpoints: {
          // AI endpoints
          aiRecommendations: '/api/ai-recommendations',
          aiChat: '/api/ai/chat',
          aiTutor: '/api/ai-tutor',
          pronunciationScore: '/api/pronunciation-score',

          // TTS endpoints
          premiumTts: '/api/premium-tts',
          voices: '/api/voices',
          audioGenerate: '/api/audio/generate'
        }
      },

      // ===== DELAYS & TIMEOUTS =====
      delays: {
        // Audio playback
        autoPlayBetweenWords: 300,
        autoPlayRestartPause: 1000,

        // Recording
        recordingTimeout: 10000,

        // UI animations
        animationDuration: 500,
        notificationTimeout: 5000,
        modalHideDelay: 1500,
        onboardingDelay: 500,
        quickQuestionDelay: 100,

        // Initialization
        moduleInitTimeout: 5000,
        exponentialBackoffBase: 1000
      },

      // ===== REQUEST LIMITS =====
      limits: {
        // AI context
        conversationHistory: 10,
        recommendations: 5
      },

      // ===== TTS CONFIGURATION =====
      tts: {
        defaultVoice: {
          lang: 'en-AU',
          name: 'Russell',
          gender: 'male',
          localService: false
        },
        fallbackVoices: [
          { lang: 'en-AU', name: 'Gordon' }, // iOS/macOS AU Male
          { lang: 'en-GB', name: 'Daniel' }, // iOS/macOS UK Male
          { lang: 'en-AU', name: 'Google Australian English' },
          { lang: 'en-GB', name: 'Google UK English Male' },
          { lang: 'en-AU', name: 'Russell' },
          { lang: 'en-GB', name: 'Brian' }
        ],
        rate: 0.7,
        pitch: 1.0,
        volume: 1.0,
        autoSpeak: true
      },

      // ===== VOICE & LANGUAGE SETTINGS =====
      voice: {
        // Default voice settings for Azure AI Speech.
        defaultVoiceId: 'en-AU-WilliamNeural',
        defaultEngine: 'neural',
        defaultLanguage: 'en-AU',

        // The authoritative Azure Speech region is server-side (api/); this
        // client-side value is informational and only overridable via a VITE var.
        azureRegion: import.meta.env['VITE_AZURE_SPEECH_REGION'] || ''
      },

      // ===== REAL AUDIO PLAYBACK =====
      // Real-audio playback used by all practice modes. Voice, engine,
      // and language are sourced from the `voice` block above.
      backgroundAudio: {
        outputFormat: 'mp3', // Most broadly supported container for <audio> on mobile
        mediaSessionArtist: 'PTE Pronunciation Trainer',
        // A stalled fetch (common on a degraded or backgrounded connection)
        // must fail within a bounded time instead of leaving the queue
        // waiting on a promise that may never settle, which looks like
        // autoplay silently stopping with no feedback at all.
        fetchTimeoutMs: 10000,
        // One retry absorbs the common transient case (a momentary drop, a
        // slow cold start) without a visible interruption. Retrying past
        // this point on a persistently failing request would just delay an
        // already-inevitable, user-visible failure.
        fetchRetryAttempts: 1,
        fetchRetryDelayMs: 500
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
      // Single source of truth for user-settings defaults. The Zustand store
      // reads these values during initialization and reset.
      settings: {
        defaults: {
          autoPlayNext: true,
          repeatMode: 'all',
          showPhonetic: true,
          ttsRate: 0.7,
          ttsVolume: 1.0,
          vocabRepeatCount: 3,
          wordRepeatCount: {
            easy: 1,
            normal: 3,
            hard: 5
          },
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
            id: 'di-shadowing',
            input: 'templates/examples/example-answers.md',
            output: 'di-shadowing-natural.json',
            category: 'di-shadowing',
            description: 'DI natural answers (43 images) for shadowing practice with natural phrase chunking',
            sourceType: 'example-answers',
            dataType: 'shadowing',
            extractorType: 'NaturalDIExtractor',
            inputSubdir: 'di'
          },
          {
            id: 'pte-di-natural-template',
            input: 'pte-di-natural-template-vocab.md',
            output: 'pte-di-natural-template-vocabulary.json',
            category: 'vocabulary',
            description: 'DI Natural Template vocabulary with IPA for Template 1 & 2',
            sourceType: 'pte-di-natural-template-vocab',
            dataType: 'vocabulary',
            extractorType: 'PTETermsExtractor',
            inputSubdir: 'vocabs'
          },
          {
            id: 'pte-sgd-vocabulary',
            input: 'sgd/pte-sgd-vocabulary.md',
            output: 'pte-sgd-vocabulary.json',
            category: 'vocabulary',
            description: 'SGD Vocabulary with IPA',
            sourceType: 'pte-sgd-vocabulary-with-ipa',
            dataType: 'vocabulary',
            extractorType: 'PTETermsExtractor',
            inputSubdir: 'sgd'
          },
          {
            id: 'pte-rl-vocabulary',
            input: 'rl/pte-rl-vocabulary.md',
            output: 'pte-rl-vocabulary.json',
            category: 'vocabulary',
            description: 'RL Vocabulary with IPA',
            sourceType: 'pte-rl-vocabulary-with-ipa',
            dataType: 'vocabulary',
            extractorType: 'PTETermsExtractor',
            inputSubdir: 'rl'
          },
          {
            id: 'pte-template-practice',
            input: 'pte-template-practice-vocabulary-with-ipa.md',
            output: 'pte-template-practice-vocabulary.json',
            category: 'vocabulary',
            description: 'Vocabulary from DI, SGD, and RL templates',
            sourceType: 'pte-template-practice-vocabulary-with-ipa',
            dataType: 'vocabulary',
            extractorType: 'PTETermsExtractor',
            inputSubdir: 'vocabs'
          },
          {
            id: 'pte-essay-topic-paraphrase',
            input: 'pte-essay-topic-paraphrase-vocabulary-with-ipa.md',
            output: 'pte-essay-topic-paraphrase-vocabulary.json',
            category: 'vocabulary',
            description: 'Essay Topics and Paraphrases (3 per question)',
            sourceType: 'pte-essay-topic-paraphrase-vocabulary-with-ipa',
            dataType: 'vocabulary',
            extractorType: 'PTETermsExtractor',
            inputSubdir: 'vocabs'
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
        // Development
        devServerPort: 3001,
        previewServerPort: 3002,

        // Production
        chunkSizeWarningLimit: 1000, // KB

        // Environment (Vite mode: 'development' | 'production' | 'test')
        nodeEnv: import.meta.env.MODE,

        // Legacy build files (vanilla JS - archived)
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
  get<T = any>(path: ConfigPath, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, path);
    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * Set configuration value using dot notation
   */
  set(path: ConfigPath, value: any): void {
    this.setNestedValue(this.config, path, value);
  }

  /**
   * Get all configuration
   */
  getAll(): AppConfigType {
    return this.config;
  }

  /**
   * Merge configuration
   */
  merge(newConfig: Partial<AppConfigType>): void {
    this.config = this.deepMerge(this.config, newConfig);
  }

  /**
   * Enabled vocabulary book ids, in declaration order, sourced from
   * `data.learningModes` (the single source of truth for available books).
   */
  getVocabularyBookIds(): string[] {
    const learningModes = this.get<Array<{ id: string; category: string }>>('data.learningModes') || [];
    return learningModes
      .filter((mode) => mode.category === 'vocabulary')
      .map((mode) => mode.id);
  }

  /**
   * The default vocabulary book: the first enabled vocabulary book in
   * `data.learningModes`. Fails loudly when none is enabled, so a missing
   * configuration surfaces instead of silently falling back to a magic string.
   */
  getDefaultVocabularyBookId(): string {
    const [firstVocabularyBookId] = this.getVocabularyBookIds();
    if (!firstVocabularyBookId) {
      throw new Error(
        'AppConfig: no vocabulary books are enabled in data.learningModes; cannot determine a default vocabulary book'
      );
    }
    return firstVocabularyBookId;
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   * @private
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) return;

    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Deep merge two objects
   * @private
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
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

// Extend Window interface for vanilla JS compatibility
declare global {
  interface Window {
    appConfig: AppConfig;
  }
}

// Attach to window for vanilla JS compatibility (Phase 2 migration)
if (typeof window !== 'undefined') {
  window.appConfig = appConfig;
  console.log('✅ Config.js loaded - window.appConfig attached:', typeof window.appConfig);
}
