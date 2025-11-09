/**
 * Centralized Configuration Management (TypeScript)
 *
 * Type-safe configuration for the PTE Pronunciation Trainer.
 * This will gradually replace src/js/shared/Config.js during the TypeScript migration.
 */

import type {
  AppConfig as AppConfigType,
  ConfigPath
} from '../../types';

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

            // Practice modes
            'rs': 'data/processed/pte-repeat-sentence.json',
            'asq': 'data/processed/pte-answer-short-question.json',
            'wfd': 'data/processed/pte-write-from-dictation.json'
          }
        },

        learningModes: [
          // Vocabulary books (13 total)
          { id: 'pte-fib-listening', name: 'PTE FIB Listening', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-beginner', name: 'PTE Beginner', category: 'vocabulary', difficulty: 'easy' },
          { id: 'pte-intermediate', name: 'PTE Intermediate', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-advanced', name: 'PTE Advanced', category: 'vocabulary', difficulty: 'hard' },
          { id: 'pte-ra', name: 'PTE Read Aloud', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-rs-vocab', name: 'PTE RS Vocab', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-must-know', name: 'PTE Must-Know', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-wfd-vocab', name: 'PTE WFD Vocab', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-rs-wfd-vocab', name: 'PTE RS-WFD Vocab', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-reading-fib', name: 'PTE Reading FIB', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-reading-fib-drag', name: 'PTE Reading FIB Drag', category: 'vocabulary', difficulty: 'normal' },
          { id: 'pte-asq-answers', name: 'PTE ASQ Answers', category: 'vocabulary', difficulty: 'easy' },
          { id: 'pte-high-frequency', name: 'PTE High-Frequency', category: 'vocabulary', difficulty: 'normal' },

          // Practice modes (3 total)
          { id: 'rs', name: 'Repeat Sentence', category: 'practice', description: '620 practice sentences' },
          { id: 'asq', name: 'Answer Short Question', category: 'practice', description: '692 practice questions' },
          { id: 'wfd', name: 'Write From Dictation', category: 'practice', description: '1,195 practice sentences' }
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
          // ... Add more registry entries as needed during migration
        ],
        extractorTypes: {
          PTETermsExtractor: 'src/js/data/extractors/PTETermsExtractor.js',
          SingleIPATermsExtractor: 'src/js/data/extractors/SingleIPATermsExtractor.js',
          PTESentenceExtractor: 'src/js/data/extractors/PTESentenceExtractor.js',
          PTEQuestionExtractor: 'src/js/data/extractors/PTEQuestionExtractor.js'
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
