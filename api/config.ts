/**
 * Configuration for Vercel Serverless Functions
 *
 * Server owned configuration only. Values the browser reads live in
 * src/config/AppConfig.ts and are deliberately not repeated here: API endpoint
 * paths and UI delays are consumed by the client, and duplicating them created
 * two copies free to drift. What remains is what server code actually imports,
 * namely the Gemini model settings, the recommendation cap, and the voice
 * tables.
 *
 * The three voice defaults below are the one genuine overlap with AppConfig,
 * since both sides need them. That is recorded rather than solved here, because
 * sharing a module across the api boundary needs a deliberate check that Vercel
 * bundles it.
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

// Request Limits
export const LIMITS = {
  recommendations: 5,
} as const;

// Voice Configuration
export const VOICE_CONFIG = {
  defaultVoiceId: 'en-AU-WilliamNeural',
  defaultEngine: 'neural',
  defaultLanguage: 'en-AU',
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
 *
 * This is the single place that decides whether Azure is usable. It throws
 * naming the variables that are missing, rather than returning nulls for a
 * caller to reinterpret as a generic failure, because a missing key is an
 * operator configuration fault and the deployment should say which one.
 */
export function getAzureSpeechConfig(): { key: string; region: string } {
  const key = process.env['AZURE_SPEECH_KEY'];
  const region = process.env['AZURE_SPEECH_REGION'];

  const missing: string[] = [];
  if (!key) missing.push('AZURE_SPEECH_KEY');
  if (!region) missing.push('AZURE_SPEECH_REGION');

  if (missing.length > 0) {
    throw new Error(
      `Azure Speech is not configured: ${missing.join(' and ')} must be set in the deployment environment`
    );
  }

  return { key: key as string, region: region as string };
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
