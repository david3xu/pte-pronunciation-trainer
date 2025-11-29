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

import {
  VoiceId
} from '@aws-sdk/client-polly';

// ============================================
// Types & Interfaces
// ============================================

export interface PollyVoice {
  id: VoiceId;
  name: string;
  language: string;
  gender: 'Male' | 'Female';
  accent: 'US' | 'UK' | 'AU' | 'IN';
  isPremium: true;
}



// ============================================
// Available Premium Voices
// ============================================

export const PREMIUM_VOICES: Record<string, PollyVoice> = {
  // British English - Male
  'Brian': {
    id: 'Brian' as VoiceId,
    name: 'Brian',
    language: 'English (UK)',
    gender: 'Male',
    accent: 'UK',
    isPremium: true
  },
  'Arthur': {
    id: 'Arthur' as VoiceId,
    name: 'Arthur',
    language: 'English (UK)',
    gender: 'Male',
    accent: 'UK',
    isPremium: true
  },

  // Australian English - Male
  'Russell': {
    id: 'Russell' as VoiceId,
    name: 'Russell',
    language: 'English (AU)',
    gender: 'Male',
    accent: 'AU',
    isPremium: true
  }
};







/**
 * Check if premium TTS is available
 *
 * This checks a client-side flag to determine if premium TTS should be shown.
 * The actual availability is verified server-side when making API calls.
 *
 * Set VITE_PREMIUM_TTS_ENABLED=true in .env to enable premium TTS UI
 */
export function isPremiumTTSAvailable(): boolean {
  const enabled = import.meta.env['VITE_PREMIUM_TTS_ENABLED'];
  return enabled === 'true' || enabled === true;
}



/**
 * Get all voices filtered by criteria
 */
export function getVoices(filter?: {
  accent?: 'US' | 'UK' | 'AU' | 'IN';
  gender?: 'Male' | 'Female';
}): PollyVoice[] {
  let voices = Object.values(PREMIUM_VOICES);

  if (filter?.accent) {
    voices = voices.filter(v => v.accent === filter.accent);
  }

  if (filter?.gender) {
    voices = voices.filter(v => v.gender === filter.gender);
  }

  return voices;
}


