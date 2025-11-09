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
import { PollyClient, VoiceId } from '@aws-sdk/client-polly';
export interface PollyVoice {
    id: VoiceId;
    name: string;
    language: string;
    gender: 'Male' | 'Female';
    accent: 'US' | 'UK' | 'AU' | 'IN';
    isPremium: true;
}
export interface SynthesisOptions {
    text: string;
    voiceId?: VoiceId;
    speed?: string;
    pitch?: string;
    emphasis?: 'strong' | 'moderate' | 'reduced' | 'none';
    useSSML?: boolean;
}
export interface SynthesisResult {
    audioUrl?: string;
    audioStream?: Uint8Array;
    voiceId: VoiceId;
    characterCount: number;
    cached: boolean;
    error?: string;
}
export declare const PREMIUM_VOICES: Record<string, PollyVoice>;
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
export declare function getPollyClient(): PollyClient | null;
/**
 * Build SSML markup for text synthesis with prosody control
 */
export declare function buildSSML(text: string, options: SynthesisOptions): string;
/**
 * Generate audio using AWS Polly neural voices
 *
 * @param options - Synthesis options (text, voice, speed, etc.)
 * @returns SynthesisResult with audio data or error
 */
export declare function generateAudio(options: SynthesisOptions): Promise<SynthesisResult>;
/**
 * Create audio blob from Uint8Array
 */
export declare function createAudioBlob(audioData: Uint8Array): Blob;
/**
 * Create object URL from audio blob
 */
export declare function createAudioURL(audioBlob: Blob): string;
/**
 * Check if premium TTS is available
 *
 * This checks a client-side flag to determine if premium TTS should be shown.
 * The actual availability is verified server-side when making API calls.
 *
 * Set VITE_PREMIUM_TTS_ENABLED=true in .env to enable premium TTS UI
 */
export declare function isPremiumTTSAvailable(): boolean;
/**
 * Get voice by ID
 */
export declare function getVoiceById(voiceId: string): PollyVoice | undefined;
/**
 * Get all voices filtered by criteria
 */
export declare function getVoices(filter?: {
    accent?: 'US' | 'UK' | 'AU' | 'IN';
    gender?: 'Male' | 'Female';
}): PollyVoice[];
/**
 * Track character usage for cost estimation
 */
export declare function trackUsage(characters: number): void;
/**
 * Get total character usage
 */
export declare function getUsage(): {
    characters: number;
    estimatedCost: number;
};
/**
 * Reset usage counter
 */
export declare function resetUsage(): void;
//# sourceMappingURL=pollyService.d.ts.map