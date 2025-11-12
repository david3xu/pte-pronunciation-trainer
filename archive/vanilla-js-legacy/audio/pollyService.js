/**
 * AWS Polly Text-to-Speech Service
 *
 * Provides premium neural voice synthesis with SSML support.
 * This service wraps AWS Polly API calls and handles audio generation,
 * caching, and voice management.
 *
 * Pricing: $16.00 per 1 million characters (Neural voices)
 * Free Tier: 1 million characters/month (first 12 months)
 */
import { SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
// ============================================
// Available Premium Voices
// ============================================
export const PREMIUM_VOICES = {
    // US English - Female
    'Joanna': {
        id: 'Joanna',
        name: 'Joanna',
        language: 'English (US)',
        gender: 'Female',
        accent: 'US',
        isPremium: true
    },
    'Kendra': {
        id: 'Kendra',
        name: 'Kendra',
        language: 'English (US)',
        gender: 'Female',
        accent: 'US',
        isPremium: true
    },
    'Ivy': {
        id: 'Ivy',
        name: 'Ivy',
        language: 'English (US)',
        gender: 'Female',
        accent: 'US',
        isPremium: true
    },
    'Kimberly': {
        id: 'Kimberly',
        name: 'Kimberly',
        language: 'English (US)',
        gender: 'Female',
        accent: 'US',
        isPremium: true
    },
    'Salli': {
        id: 'Salli',
        name: 'Salli',
        language: 'English (US)',
        gender: 'Female',
        accent: 'US',
        isPremium: true
    },
    // US English - Male
    'Matthew': {
        id: 'Matthew',
        name: 'Matthew',
        language: 'English (US)',
        gender: 'Male',
        accent: 'US',
        isPremium: true
    },
    'Joey': {
        id: 'Joey',
        name: 'Joey',
        language: 'English (US)',
        gender: 'Male',
        accent: 'US',
        isPremium: true
    },
    'Justin': {
        id: 'Justin',
        name: 'Justin',
        language: 'English (US)',
        gender: 'Male',
        accent: 'US',
        isPremium: true
    },
    'Kevin': {
        id: 'Kevin',
        name: 'Kevin',
        language: 'English (US)',
        gender: 'Male',
        accent: 'US',
        isPremium: true
    },
    // British English - Female
    'Amy': {
        id: 'Amy',
        name: 'Amy',
        language: 'English (UK)',
        gender: 'Female',
        accent: 'UK',
        isPremium: true
    },
    'Emma': {
        id: 'Emma',
        name: 'Emma',
        language: 'English (UK)',
        gender: 'Female',
        accent: 'UK',
        isPremium: true
    },
    // British English - Male
    'Brian': {
        id: 'Brian',
        name: 'Brian',
        language: 'English (UK)',
        gender: 'Male',
        accent: 'UK',
        isPremium: true
    },
    'Arthur': {
        id: 'Arthur',
        name: 'Arthur',
        language: 'English (UK)',
        gender: 'Male',
        accent: 'UK',
        isPremium: true
    },
    // Australian English
    'Nicole': {
        id: 'Nicole',
        name: 'Nicole',
        language: 'English (AU)',
        gender: 'Female',
        accent: 'AU',
        isPremium: true
    },
    'Russell': {
        id: 'Russell',
        name: 'Russell',
        language: 'English (AU)',
        gender: 'Male',
        accent: 'AU',
        isPremium: true
    },
    // Indian English
    'Aditi': {
        id: 'Aditi',
        name: 'Aditi',
        language: 'English (IN)',
        gender: 'Female',
        accent: 'IN',
        isPremium: true
    },
    'Raveena': {
        id: 'Raveena',
        name: 'Raveena',
        language: 'English (IN)',
        gender: 'Female',
        accent: 'IN',
        isPremium: true
    }
};
// ============================================
// Polly Client Initialization
// ============================================
/**
 * Initialize AWS Polly client with credentials from environment
 *
 * IMPORTANT: This function should only be used SERVER-SIDE (API routes).
 * AWS credentials should NEVER be exposed to the client.
 *
 * Required environment variables (server-side):
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (optional, defaults to 'us-east-1')
 *
 * Note: This function is kept for potential server-side usage,
 * but the main audio generation happens through /api/audio/generate endpoint.
 */
export function getPollyClient() {
    // This should only be called server-side
    console.warn('⚠️ getPollyClient() called. This should only be used server-side.');
    return null;
}
// ============================================
// SSML Builder
// ============================================
/**
 * Build SSML markup for text synthesis with prosody control
 */
export function buildSSML(text, options) {
    const { speed = '100%', pitch = 'medium', emphasis = 'moderate' } = options;
    // If emphasis is 'none', don't wrap in emphasis tag
    const emphasizedText = emphasis !== 'none'
        ? `<emphasis level="${emphasis}">${text}</emphasis>`
        : text;
    return `
    <speak>
      <prosody rate="${speed}" pitch="${pitch}">
        ${emphasizedText}
      </prosody>
    </speak>
  `.trim();
}
// ============================================
// Audio Generation
// ============================================
/**
 * Generate audio using AWS Polly neural voices
 *
 * @param options - Synthesis options (text, voice, speed, etc.)
 * @returns SynthesisResult with audio data or error
 */
export async function generateAudio(options) {
    const client = getPollyClient();
    if (!client) {
        return {
            voiceId: options.voiceId || 'Joanna',
            characterCount: options.text.length,
            cached: false,
            error: 'AWS Polly not configured. Please set AWS credentials.'
        };
    }
    try {
        const { text, voiceId = 'Joanna', useSSML = true } = options;
        // Build SSML or use plain text
        const synthesisText = useSSML ? buildSSML(text, options) : text;
        // Prepare synthesis parameters
        const params = {
            Text: synthesisText,
            TextType: useSSML ? 'ssml' : 'text',
            OutputFormat: 'mp3',
            VoiceId: voiceId,
            Engine: 'neural',
            LanguageCode: getLanguageCodeForVoice(voiceId)
        };
        // Call AWS Polly
        const command = new SynthesizeSpeechCommand(params);
        const response = await client.send(command);
        // Convert AudioStream to Uint8Array
        if (response.AudioStream) {
            const audioStream = await streamToUint8Array(response.AudioStream);
            return {
                audioStream,
                voiceId,
                characterCount: text.length,
                cached: false
            };
        }
        else {
            return {
                voiceId,
                characterCount: text.length,
                cached: false,
                error: 'No audio stream returned from Polly'
            };
        }
    }
    catch (error) {
        console.error('❌ AWS Polly synthesis failed:', error);
        return {
            voiceId: options.voiceId || 'Joanna',
            characterCount: options.text.length,
            cached: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
// ============================================
// Helper Functions
// ============================================
/**
 * Get language code for a voice ID
 */
function getLanguageCodeForVoice(voiceId) {
    const voice = PREMIUM_VOICES[voiceId];
    if (!voice)
        return 'en-US';
    switch (voice.accent) {
        case 'US': return 'en-US';
        case 'UK': return 'en-GB';
        case 'AU': return 'en-AU';
        case 'IN': return 'en-IN';
        default: return 'en-US';
    }
}
/**
 * Convert ReadableStream to Uint8Array
 */
async function streamToUint8Array(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    // Concatenate all chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}
/**
 * Create audio blob from Uint8Array
 */
export function createAudioBlob(audioData) {
    return new Blob([audioData], { type: 'audio/mpeg' });
}
/**
 * Create object URL from audio blob
 */
export function createAudioURL(audioBlob) {
    return URL.createObjectURL(audioBlob);
}
/**
 * Check if premium TTS is available
 *
 * This checks a client-side flag to determine if premium TTS should be shown.
 * The actual availability is verified server-side when making API calls.
 *
 * Set VITE_PREMIUM_TTS_ENABLED=true in .env to enable premium TTS UI
 */
export function isPremiumTTSAvailable() {
    const enabled = import.meta.env['VITE_PREMIUM_TTS_ENABLED'];
    return enabled === 'true' || enabled === true;
}
/**
 * Get voice by ID
 */
export function getVoiceById(voiceId) {
    return PREMIUM_VOICES[voiceId];
}
/**
 * Get all voices filtered by criteria
 */
export function getVoices(filter) {
    let voices = Object.values(PREMIUM_VOICES);
    if (filter?.accent) {
        voices = voices.filter(v => v.accent === filter.accent);
    }
    if (filter?.gender) {
        voices = voices.filter(v => v.gender === filter.gender);
    }
    return voices;
}
// ============================================
// Usage Tracking (optional)
// ============================================
let characterCount = 0;
/**
 * Track character usage for cost estimation
 */
export function trackUsage(characters) {
    characterCount += characters;
}
/**
 * Get total character usage
 */
export function getUsage() {
    // $16.00 per 1 million characters
    const costPerCharacter = 16.00 / 1_000_000;
    const estimatedCost = characterCount * costPerCharacter;
    return {
        characters: characterCount,
        estimatedCost: Math.round(estimatedCost * 100) / 100 // Round to 2 decimals
    };
}
/**
 * Reset usage counter
 */
export function resetUsage() {
    characterCount = 0;
}
//# sourceMappingURL=pollyService.js.map