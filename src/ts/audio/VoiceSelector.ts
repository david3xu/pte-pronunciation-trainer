/**
 * VoiceSelector - Voice Selection and Management
 *
 * ARCHITECTURE: Zustand state management
 * - Subscribes to settings.ttsVoice changes
 * - Updates TTS store selected voice instead of emitting events
 *
 * Type-safe voice selection with Web Speech API
 * Features:
 * - User preference management
 * - Male voice priority filtering
 * - Curated voice list with fallbacks
 * - Zustand-driven preference changes
 * - Dropdown population for UI
 */

import { useAppStore } from '../stores';

/**
 * Curated voice information
 */
interface CuratedVoice {
  name: string;
  fallbacks: string[];
  flag?: string;
  gender?: string;
}

/**
 * VoiceSelector - Manages voice selection and preferences
 */
export class VoiceSelector {
  private preferredVoice: string | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor() {
    // Subscribe to Zustand store changes (replaces EventBus listener)
    this._setupStoreSubscriptions();
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /**
   * Setup Zustand store subscriptions (replaces EventBus listeners)
   */
  private _setupStoreSubscriptions(): void {
    if (typeof window === 'undefined') return;

    // Subscribe to TTS voice changes
    const unsubVoice = useAppStore.subscribe(
      (state) => state.settings.ttsVoice,
      (ttsVoice, prevTtsVoice) => {
        if (ttsVoice !== prevTtsVoice) {
          this._setPreferredVoice(ttsVoice || 'auto');
          console.log(`[VoiceSelector] Voice preference changed to ${ttsVoice}`);
        }
      }
    );
    this.unsubscribers.push(unsubVoice);
  }

  /**
   * Select best voice match from available voices
   * Prioritizes male voices for PTE pronunciation training
   */
  selectBestVoiceMatch(voices: SpeechSynthesisVoice[], _lang?: string | null): SpeechSynthesisVoice | null {
    // Check if user has selected a preferred voice from curated list
    if (this.preferredVoice) {
      // Try exact match first
      let selectedVoice = voices.find(v => v.name === this.preferredVoice);

      // If not found, try fallback names for the selected voice
      if (!selectedVoice) {
        const curatedVoice = this.getCuratedVoiceInfo(this.preferredVoice);
        if (curatedVoice) {
          for (const fallbackName of curatedVoice.fallbacks) {
            selectedVoice = voices.find(v => v.name === fallbackName || v.name.includes(fallbackName));
            if (selectedVoice) break;
          }
        }
      }

      if (selectedVoice) {
        return selectedVoice;
      }
    }

    // ONLY MALE VOICES - Use centralized priority list from config
    const config = (window as any).appConfig;
    const priorityNames = [config.get('tts.voices.default'), ...config.get('tts.voices.fallbacks')];

    // First try exact priority by name within available voices
    for (const preferredName of priorityNames) {
      const voice = voices.find(v => v.name === preferredName || v.name.includes(preferredName));
      if (voice) {
        return voice;
      }
    }

    // Then prefer any en-AU male-ish voice
    const maleIndicators = [
      'male', 'man', 'boy', 'james', 'william', 'ryan', 'daniel',
      'alex', 'david', 'tom', 'michael', 'robert'
    ];
    const femaleIndicators = [
      'female', 'woman', 'girl', 'kate', 'susan', 'karen', 'catherine',
      'samantha', 'helen', 'sarah', 'maria', 'anna'
    ];

    const enAuVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en-au'));
    const enAuMaleVoices = enAuVoices.filter(v => {
      const nameLower = v.name.toLowerCase();
      const isFemale = femaleIndicators.some(ind => nameLower.includes(ind));
      return !isFemale;
    });

    if (enAuMaleVoices.length > 0) {
      const explicitMale = enAuMaleVoices.find(v =>
        maleIndicators.some(ind => v.name.toLowerCase().includes(ind))
      );
      if (explicitMale) {
        return explicitMale;
      }
      return enAuMaleVoices[0]!;
    }

    // Fallback to other English male voices (non-AU)
    const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    const englishMaleVoices = englishVoices.filter(v => {
      const nameLower = v.name.toLowerCase();
      const isFemale = femaleIndicators.some(ind => nameLower.includes(ind));
      return !isFemale;
    });

    if (englishMaleVoices.length > 0) {
      const explicitMaleEn = englishMaleVoices.find(v =>
        maleIndicators.some(ind => v.name.toLowerCase().includes(ind))
      );
      if (explicitMaleEn) {
        return explicitMaleEn;
      }
      return englishMaleVoices[0]!;
    }

    // Last resort: Use any English voice available
    const anyEnglishVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (anyEnglishVoice) {
      return anyEnglishVoice;
    }

    // Final fallback: Use first available voice
    if (voices.length > 0) {
      return voices[0]!;
    }

    console.error('No voices available at all');
    return null;
  }

  /**
   * Get curated voice information by name
   */
  getCuratedVoiceInfo(voiceName: string): CuratedVoice | undefined {
    // ONLY MALE VOICES - NO FEMALE VOICES ALLOWED
    const config = (window as any).appConfig;
    const defaultVoice = config.get('tts.voices.default');

    const curatedVoices: CuratedVoice[] = [
      { name: 'Microsoft James - English (Australia)', fallbacks: ['Microsoft James', 'James'] },
      { name: defaultVoice, fallbacks: [defaultVoice] },
      { name: 'Alex (Enhanced)', fallbacks: ['Alex'] },
      { name: 'Daniel (Enhanced)', fallbacks: ['Daniel'] }
      // REMOVED ALL FEMALE VOICES: Catherine, Karen, etc.
    ];

    return curatedVoices.find(v => v.name === voiceName);
  }

  /**
   * Populate voice options dropdown in UI
   */
  populateVoiceOptions(): void {
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement | null;
    if (!voiceSelect) return;

    const voices = speechSynthesis.getVoices();

    // Clear all existing options
    voiceSelect.innerHTML = '';

    // Add "Auto" option first
    const autoOption = document.createElement('option');
    autoOption.value = 'auto';
    autoOption.textContent = '🤖 Auto (Best Available)';
    voiceSelect.appendChild(autoOption);

    // ONLY MALE VOICES - NO FEMALE VOICES IN DROPDOWN
    const config = (window as any).appConfig;
    const defaultVoice = config.get('tts.voices.default');

    const curatedVoices: CuratedVoice[] = [
      { name: 'Microsoft James - English (Australia)', fallbacks: ['Microsoft James', 'James'], flag: '🇦🇺', gender: '♂️' },
      { name: defaultVoice, fallbacks: [defaultVoice], flag: '🇬🇧', gender: '♂️' },
      { name: 'Alex (Enhanced)', fallbacks: ['Alex'], flag: '🇺🇸', gender: '♂️' },
      { name: 'Daniel (Enhanced)', fallbacks: ['Daniel'], flag: '🇺🇸', gender: '♂️' }
      // REMOVED ALL FEMALE VOICES FROM DROPDOWN
    ];

    // Add curated voices to dropdown
    curatedVoices.forEach(curatedVoice => {
      // Try to find the actual voice
      let actualVoice: SpeechSynthesisVoice | undefined = undefined;
      for (const name of [curatedVoice.name, ...curatedVoice.fallbacks]) {
        actualVoice = voices.find(v => v.name === name || v.name.includes(name));
        if (actualVoice) break;
      }

      // Add option even if voice not found (will fallback to auto selection)
      const option = document.createElement('option');
      option.value = curatedVoice.name;
      option.textContent = `${curatedVoice.gender} ${curatedVoice.name.split(' - ')[0]} ${curatedVoice.flag}`;

      // Mark as available or unavailable
      if (actualVoice) {
        option.style.fontWeight = 'normal';
      } else {
        option.style.fontWeight = 'lighter';
        option.style.color = '#999';
        option.textContent += ' (fallback)';
      }

      voiceSelect.appendChild(option);
    });
  }

  /**
   * Set preferred voice and reset cache
   */
  private _setPreferredVoice(voiceName: string): void {
    this.preferredVoice = voiceName === 'auto' ? null : voiceName;

    // Reset TTS voice cache to ensure new preference is used
    const ttsEngine = (window as any).ttsEngine;
    if (ttsEngine && typeof ttsEngine.resetVoiceCache === 'function') {
      ttsEngine.resetVoiceCache();
    }

    // Update Zustand TTS store (replaces EventBus emission)
    // Note: Voice selection is tracked in TTS store for voice-related functionality
    const voices = speechSynthesis.getVoices();
    const selectedVoice = this.selectBestVoiceMatch(voices);
    if (selectedVoice) {
      useAppStore.getState().tts.setVoice(selectedVoice);
    }
  }

  /**
   * Get current preferred voice name
   */
  getPreferredVoice(): string | null {
    return this.preferredVoice;
  }

  /**
   * Get all available English voices
   */
  getAllAvailableVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  }
}

// Export singleton instance
export const voiceSelector = new VoiceSelector();

// Default export
export default voiceSelector;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    voiceSelector: VoiceSelector;
  }
}

// Expose as global reference for PTE app
if (typeof window !== 'undefined') {
  (window as any).voiceSelector = voiceSelector;
}
