/**
 * TTSEngine - Text-to-Speech Synthesis Engine
 *
 * Type-safe TTS engine with Web Speech API integration
 * Features:
 * - Event-driven initialization (no hardcoded defaults)
 * - iOS background audio support
 * - HTML5 Audio fallback
 * - Voice selection and caching
 * - Repeat modes for learning
 * - Text cleaning and normalization
 */
/**
 * Vocabulary word structure
 */
interface VocabularyWord {
    english: string;
    example?: string;
    examples?: Array<{
        text: string;
    }>;
    [key: string]: any;
}
/**
 * TTSEngine - Type-safe text-to-speech engine
 *
 * ARCHITECTURE: Event-driven initialization
 * - No hard-coded settings defaults in constructor
 * - All settings (speechRate, targetRepeats) initialized via SettingsModule events
 * - SettingsModule emits 'setting:changed' events during loadSettings()
 * - This ensures single source of truth: Config.js → SettingsModule → Audio modules
 */
export declare class TTSEngine {
    private config;
    private currentRepeatCount;
    private backgroundAudioEnabled;
    private speechRate;
    private targetRepeats;
    private synth;
    private isSpeaking;
    private cachedVoice;
    private audioContext?;
    private audioContextInitialized;
    private backgroundAudioElement?;
    constructor();
    /**
     * Safely get current practice mode from SettingsModule or Config.js fallback
     */
    getPracticeMode(): string;
    /**
     * Attach event listeners for settings changes
     */
    private _attachEventListeners;
    /**
     * Handle setting changes from SettingsModule
     */
    private _handleSettingChange;
    /**
     * HELPER: Add visual feedback and emit speaking started event
     */
    private _addSpeakingFeedback;
    /**
     * HELPER: Remove visual feedback and emit speaking completed event
     */
    private _removeSpeakingFeedback;
    /**
     * SIMPLIFIED: Pronounce any text (sentence, question, word)
     * Universal method for RS/ASQ/WFD modes - reuses existing TTS infrastructure
     */
    pronounceText(text: string, lang?: string | null, rate?: number | null): Promise<void>;
    /**
     * Pronounce a vocabulary word with repetition support
     */
    pronounceWord(word: VocabularyWord, repeatIndex?: number): Promise<void>;
    /**
     * Core speak method - uses Web Speech API
     */
    speak(text: string, lang?: string | null, customRate?: number | null): Promise<void>;
    /**
     * Check if should use HTML5 Audio fallback
     */
    shouldUseHTML5Audio(): boolean;
    /**
     * Speak with HTML5 Audio (iOS background fallback)
     */
    speakWithHTML5Audio(text: string, lang?: string | null, customRate?: number | null): Promise<void>;
    /**
     * Show TTS fallback message
     */
    showTTSFallback(text: string): void;
    /**
     * Enable background audio for iOS
     */
    enableBackgroundAudio(): void;
    /**
     * Setup iOS background audio with silent audio element
     */
    setupIOSBackgroundAudio(): void;
    /**
     * Start background audio with proper error handling
     */
    startBackgroundAudio(): void;
    /**
     * Clean text for TTS (remove symbols, abbreviations)
     */
    cleanTextForTTS(text: string): string;
    /**
     * Clean example sentence for TTS (remove speaker names, metadata)
     */
    cleanExampleSentenceForTTS(rawSentence: string): string;
    /**
     * Set repeat mode for word repetition
     */
    setRepeatMode(targetRepeats: number): void;
    /**
     * Stop all speech
     */
    stopSpeaking(): void;
    /**
     * Get current repeat count
     */
    getCurrentRepeatCount(): number;
    /**
     * Get target repeats
     */
    getTargetRepeats(): number;
    /**
     * Reset voice cache (force re-selection)
     */
    resetVoiceCache(): void;
}
export declare const ttsEngine: TTSEngine;
export default ttsEngine;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        ttsEngine: TTSEngine;
    }
}
//# sourceMappingURL=TTSEngine.d.ts.map