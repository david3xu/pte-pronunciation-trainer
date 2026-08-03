/**
 * Configuration for Vercel Serverless Functions
 *
 * This file provides access to Config.ts for API routes running in Node.js environment.
 * Centralized configuration eliminates hardcoded values in API routes.
 */

// AI Configuration
export const AI_CONFIG = {
  gemini: {
    defaultModel: 'gemini-2.5-flash',
    fallbackModel: 'gemini-1.5-flash',
    conversationHistoryLimit: 10,
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
  },
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  aiRecommendations: '/api/ai-recommendations',
  aiChat: '/api/ai/chat',
  aiTutor: '/api/ai-tutor',
  pronunciationScore: '/api/pronunciation-score',
  premiumTts: '/api/premium-tts',
  voices: '/api/voices',
  audioGenerate: '/api/audio/generate',
} as const;

// Delays & Timeouts
export const DELAYS = {
  autoPlayBetweenWords: 500,
  autoPlayRestartPause: 1000,
  recordingTimeout: 10000,
  animationDuration: 500,
  notificationTimeout: 5000,
  modalHideDelay: 1500,
  onboardingDelay: 500,
  quickQuestionDelay: 100,
  moduleInitTimeout: 5000,
  exponentialBackoffBase: 1000,
} as const;

// Request Limits
export const LIMITS = {
  conversationHistory: 10,
  recommendations: 5,
} as const;

// Voice Configuration
export const VOICE_CONFIG = {
  defaultVoiceId: 'en-AU-WilliamNeural',
  defaultEngine: 'neural',
  defaultLanguage: 'en-AU',
  azureRegion: process.env['AZURE_SPEECH_REGION'] || null,
} as const;

// Premium Voices List (Azure AI Speech Neural Voices)
export const PREMIUM_VOICES = {
  'en-US': {
    'en-US-JennyNeural': 'Female, American English (Neural)',
    'en-US-GuyNeural': 'Male, American English (Neural)',
    'en-US-AriaNeural': 'Female, American English (Neural)',
    'en-US-DavisNeural': 'Male, American English (Neural)',
  },
  'en-GB': {
    'en-GB-SoniaNeural': 'Female, British English (Neural)',
    'en-GB-RyanNeural': 'Male, British English (Neural)',
    'en-GB-LibbyNeural': 'Female, British English (Neural)',
  },
  'en-AU': {
    'en-AU-NatashaNeural': 'Female, Australian English (Neural)',
    'en-AU-WilliamNeural': 'Male, Australian English (Neural)',
  },
  'en-IN': {
    'en-IN-NeerjaNeural': 'Female, Indian English (Neural)',
    'en-IN-PrabhatNeural': 'Male, Indian English (Neural)',
  },
} as const;

const LEGACY_VOICE_ALIASES: Record<string, string> = {
  Joanna: 'en-US-JennyNeural',
  Matthew: 'en-US-GuyNeural',
  Brian: 'en-GB-RyanNeural',
  Amy: 'en-GB-SoniaNeural',
  Emma: 'en-GB-LibbyNeural',
  Russell: 'en-AU-WilliamNeural',
  Olivia: 'en-AU-NatashaNeural',
  Nicole: 'en-AU-NatashaNeural',
};

/**
 * Get language code for a voice ID
 */
export function getVoiceLanguageCode(voiceId: string): string {
  const resolvedVoiceId = resolveAzureVoiceName(voiceId);
  for (const [lang, voices] of Object.entries(PREMIUM_VOICES)) {
    if (resolvedVoiceId in voices) {
      return lang;
    }
  }
  return VOICE_CONFIG.defaultLanguage;
}

/**
 * Resolve either an Azure voice name or a legacy voice alias to an Azure voice.
 */
export function resolveAzureVoiceName(voiceId: string | undefined, languageCode?: string): string {
  if (voiceId && voiceId in LEGACY_VOICE_ALIASES) {
    return LEGACY_VOICE_ALIASES[voiceId]!;
  }

  if (voiceId && Object.values(PREMIUM_VOICES).some((voices) => voiceId in voices)) {
    return voiceId;
  }

  switch (languageCode) {
    case 'en-US':
      return 'en-US-JennyNeural';
    case 'en-GB':
      return 'en-GB-SoniaNeural';
    case 'en-IN':
      return 'en-IN-NeerjaNeural';
    case 'en-AU':
    default:
      return VOICE_CONFIG.defaultVoiceId;
  }
}

/**
 * Get Gemini API key from environment
 */
export function getGeminiApiKey(): string | null {
  return process.env['GEMINI_API_KEY'] || null;
}

/**
 * Get Azure Speech configuration from environment.
 */
export function getAzureSpeechConfig() {
  return {
    key: process.env['AZURE_SPEECH_KEY'] || null,
    region: VOICE_CONFIG.azureRegion,
  };
}

/**
 * Get Supabase configuration from environment
 */
export function getSupabaseConfig() {
  return {
    url: process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || null,
    serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] || null,
    anonKey: process.env['VITE_SUPABASE_ANON_KEY'] || null,
  };
}
