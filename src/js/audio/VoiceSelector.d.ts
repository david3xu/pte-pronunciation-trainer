/**
 * VoiceSelector - Voice Selection and Management
 *
 * Type-safe voice selection with Web Speech API
 * Features:
 * - User preference management
 * - Male voice priority filtering
 * - Curated voice list with fallbacks
 * - Event-driven preference changes
 * - Dropdown population for UI
 */
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
export declare class VoiceSelector {
    private preferredVoice;
    constructor();
    /**
     * Attach event listeners for settings changes
     */
    private _attachEventListeners;
    /**
     * Handle setting changes from SettingsModule
     */
    private _handleSettingChange;
    /**
     * Select best voice match from available voices
     * Prioritizes male voices for PTE pronunciation training
     */
    selectBestVoiceMatch(voices: SpeechSynthesisVoice[], _lang?: string | null): SpeechSynthesisVoice | null;
    /**
     * Get curated voice information by name
     */
    getCuratedVoiceInfo(voiceName: string): CuratedVoice | undefined;
    /**
     * Populate voice options dropdown in UI
     */
    populateVoiceOptions(): void;
    /**
     * Set preferred voice and reset cache
     */
    private _setPreferredVoice;
    /**
     * Get current preferred voice name
     */
    getPreferredVoice(): string | null;
    /**
     * Get all available English voices
     */
    getAllAvailableVoices(): SpeechSynthesisVoice[];
}
export declare const voiceSelector: VoiceSelector;
export default voiceSelector;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        voiceSelector: VoiceSelector;
    }
}
//# sourceMappingURL=VoiceSelector.d.ts.map