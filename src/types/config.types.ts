/**
 * Configuration Type Definitions
 *
 * TypeScript types for the entire application configuration (Config.js)
 * This is the single source of truth for all app settings.
 */

import type {
  VocabularyCategory,
  PracticeMode,
  ShadowingCategory,
  Difficulty,
  DatasetRegistryEntry
} from './dataset.types';

/* ============================================
   EVENT TYPES
   ============================================ */

/**
 * Event payload types for type-safe event handling
 */
export interface EventPayloads {
  // Audio events
  'audio:autoplay:start': void;
  'audio:autoplay:pause': void;
  'audio:autoplay:resume': void;
  'audio:autoplay:stop': void;
  'audio:navigate:next': void;
  'audio:navigate:prev': void;
  'audio:repeat:toggle': void;
  'audio:speed:change': { speed: number };
  'audio:volume:change': { volume: number };

  // TTS events
  'tts:speaking:started': { word: string; phonetic?: string; mode?: 'word' | 'sentence' | 'question' };
  'tts:speaking:completed': { word: string };
  'tts:speaking:error': { word: string; error: Error };
  'tts:voice:changed': { voice: SpeechSynthesisVoice };

  // Content events
  'content:display': { word?: any; item?: any; index: number };
  'content:filter': { difficulty?: Difficulty; category?: string };

  // Mode events
  'mode:practice:changed': { mode: PracticeMode; timestamp: number };
  'mode:vocabulary:changed': { category: VocabularyCategory; timestamp: number };

  // Vocabulary events
  'vocabulary:loaded': { mode: string; wordCount: number };
  'vocabulary:difficulty:filtered': { difficulty: Difficulty; count: number };
  'vocabulary:error': { error: Error };

  // Settings events
  'settings:changed': { key: string; value: any; timestamp: number };
  'settings:request-change': { key: string; value: any };
  'settings:panel:toggle': void;
  'settings:reset': void;

  // Progress events
  'progress:updated': { current: number; total: number; percentage: number };
  'progress:reset': void;

  // Shadowing events
  'shadowing:dataset:loaded': { totalAnswers: number; category: string };
  'shadowing:answer:changed': { answerIndex: number; answerId?: string; answerNumber?: number };
  'shadowing:playback:started': { answerId: string; answerNumber: number };
  'shadowing:playback:paused': void;
  'shadowing:playback:stopped': void;
  'shadowing:playback:completed': { answerId: string };
  'shadowing:phrase:highlighted': { phraseIndex: number; totalPhrases: number; phraseText: string };
  'shadowing:speed:changed': { speed: number };
  'shadowing:error': { error: any };

  // System events
  'system:ready': void;
  'system:error': { event: string; error: Error; stack?: string; timestamp: number };
  'system:warning': { message: string; timestamp: number };
}

/**
 * Event names (typed)
 */
export type EventName = keyof EventPayloads;

/**
 * Event configuration structure
 */
export interface EventsConfig {
  audio: {
    autoplay: {
      start: EventName;
      pause: EventName;
      resume: EventName;
      stop: EventName;
    };
    navigate: {
      next: EventName;
      prev: EventName;
    };
    repeat: {
      toggle: EventName;
    };
    speed: {
      change: EventName;
    };
    volume: {
      change: EventName;
    };
  };
  tts: {
    speaking: {
      started: EventName;
      completed: EventName;
      error: EventName;
    };
    voice: {
      changed: EventName;
    };
  };
  content: {
    display: EventName;
    filter: EventName;
  };
  mode: {
    practice: {
      changed: EventName;
    };
    vocabulary: {
      changed: EventName;
    };
  };
  vocabulary: {
    loaded: EventName;
    difficulty: {
      filtered: EventName;
    };
    error: EventName;
  };
  settings: {
    changed: EventName;
    requestChange: EventName;
    panel: {
      toggle: EventName;
    };
    reset: EventName;
  };
  progress: {
    updated: EventName;
    reset: EventName;
  };
  system: {
    ready: EventName;
    error: EventName;
    warning: EventName;
  };
}

/* ============================================
   DATA TYPES
   ============================================ */

/**
 * Data paths configuration
 */
export interface DataPathsConfig {
  base: string;
  processed: string;
  byMode: Record<VocabularyCategory | PracticeMode | string, string>;
}

/**
 * Learning modes configuration
 */
export interface LearningMode {
  id: VocabularyCategory | PracticeMode | string;
  name: string;
  category: 'vocabulary' | 'practice' | 'shadowing';
  difficulty?: Difficulty;
  description?: string;
}

/**
 * Data configuration
 */
export interface DataConfig {
  paths: DataPathsConfig;
  learningModes: LearningMode[];
  defaultMode: VocabularyCategory;
}

/* ============================================
   AI TYPES
   ============================================ */

/**
 * AI configuration for Google Gemini
 */
export interface AIConfig {
  gemini: {
    defaultModel: string;
    fallbackModel: string;
    conversationHistoryLimit: number;
    requestsPerDay: number;
    maxTokens: number;
    temperature: number;
    topP: number;
    topK: number;
  };
}

/* ============================================
   API TYPES
   ============================================ */

/**
 * API endpoints configuration
 */
export interface APIConfig {
  baseUrl: string;
  endpoints: {
    aiRecommendations: string;
    aiChat: string;
    aiTutor: string;
    pronunciationScore: string;
    premiumTts: string;
    voices: string;
    audioGenerate: string;
  };
}

/* ============================================
   DELAYS & TIMEOUTS TYPES
   ============================================ */

/**
 * Delays and timeouts configuration
 */
export interface DelaysConfig {
  autoPlayBetweenWords: number;
  autoPlayRestartPause: number;
  recordingTimeout: number;
  animationDuration: number;
  notificationTimeout: number;
  modalHideDelay: number;
  onboardingDelay: number;
  quickQuestionDelay: number;
  moduleInitTimeout: number;
  exponentialBackoffBase: number;
}

/* ============================================
   LIMITS TYPES
   ============================================ */

/**
 * Request limits configuration
 */
export interface LimitsConfig {
  conversationHistory: number;
  recommendations: number;
  ttsCacheSize: number;
  ttsCacheMaxAge: number;
}

/* ============================================
   TTS TYPES
   ============================================ */

/**
 * Voice preference criteria
 */
export interface VoicePreference {
  lang: string;
  name?: string;
  gender?: 'male' | 'female';
  localService?: boolean;
}

/**
 * TTS configuration
 */
export interface TTSConfig {
  defaultVoice: VoicePreference;
  fallbackVoices: VoicePreference[];
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
}

/* ============================================
   VOICE & LANGUAGE TYPES
   ============================================ */

/**
 * Voice and language settings for AWS Polly
 */
export interface VoiceConfig {
  defaultVoiceId: string;
  defaultEngine: string;
  defaultLanguage: string;
  awsRegion: string;
}

/* ============================================
   UI TYPES
   ============================================ */

/**
 * UI configuration
 */
export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  animationsEnabled: boolean;
  compactMode: boolean;
  showPhonetic: boolean;
  showIPA: boolean;
}

/* ============================================
   SETTINGS TYPES
   ============================================ */

/**
 * Settings defaults
 */
export interface SettingsDefaults {
  autoPlayNext: boolean;
  repeatMode: 'off' | 'one' | 'all';
  showPhonetic: boolean;
  ttsRate: number;
  ttsVolume: number;
  practiceMode: PracticeMode | null;
  difficultyFilter: Difficulty | 'all';
  theme: 'light' | 'dark' | 'auto';
}

/* ============================================
   PIPELINE TYPES
   ============================================ */

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  inputDir: string;
  outputDir: string;
  reportsDir: string;
  dataSources: {
    primary: string;
    fallback: string;
    subdirectory: string;
  };
  outputFiles: {
    dataset: string;
    report: string;
  };
  registry: DatasetRegistryEntry[];
  extractorTypes: {
    PTETermsExtractor: string;
    SingleIPATermsExtractor: string;
    PTESentenceExtractor: string;
    PTEQuestionExtractor: string;
    DIAnswerExtractor: string;
  };
}

/* ============================================
   BUILD TYPES
   ============================================ */

/**
 * Build configuration
 */
export interface BuildConfig {
  devServerPort: number;
  previewServerPort: number;
  chunkSizeWarningLimit: number;
  nodeEnv: string;
  cssFiles: string[];
  jsFiles: string[];
  outputDir: string;
  minify: boolean;
  sourceMaps: boolean;
}

/* ============================================
   APP CONFIG (ROOT)
   ============================================ */

/**
 * Main application configuration
 * This mirrors the structure of Config.ts
 */
export interface AppConfig {
  app: {
    name: string;
    version: string;
    description: string;
  };
  data: DataConfig;
  ai: AIConfig;
  api: APIConfig;
  delays: DelaysConfig;
  limits: LimitsConfig;
  tts: TTSConfig;
  voice: VoiceConfig;
  ui: UIConfig;
  settings: {
    defaults: SettingsDefaults;
  };
  events: EventsConfig;
  pipeline: PipelineConfig;
  build: BuildConfig;
}

/* ============================================
   HELPER TYPES
   ============================================ */

/**
 * Deep partial (for partial updates)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Config path (dot notation)
 * Examples: 'app.name', 'events.audio.autoplay.start', 'data.paths.base'
 */
export type ConfigPath = string;

/**
 * Config getter function signature
 */
export type ConfigGetter = <T = any>(path: ConfigPath, defaultValue?: T) => T;

/**
 * Config setter function signature
 */
export type ConfigSetter = (path: ConfigPath, value: any) => void;
