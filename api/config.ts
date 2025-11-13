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
  ttsCacheSize: 100,
  ttsCacheMaxAge: 3600000, // 1 hour in ms
} as const;

// Voice Configuration
export const VOICE_CONFIG = {
  defaultVoiceId: 'Joanna',
  defaultEngine: 'neural',
  defaultLanguage: 'en-US',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
} as const;

/**
 * Get Gemini API key from environment
 */
export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || null;
}

/**
 * Get AWS credentials from environment
 */
export function getAWSCredentials() {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || null,
    region: VOICE_CONFIG.awsRegion,
  };
}

/**
 * Get Supabase configuration from environment
 */
export function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || null,
  };
}
