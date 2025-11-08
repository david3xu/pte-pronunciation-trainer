/**
 * AudioControls - Type-safe audio playback and navigation
 * Handles play/pause/repeat functionality and timing for both vocabulary and practice modes
 *
 * This is the TypeScript version of src/js/audio/AudioControls.js
 * ARCHITECTURE: Event-driven initialization
 * - No hard-coded settings defaults in constructor (delay, repeatMode)
 * - All settings initialized via SettingsModule events on app startup
 * - Ensures consistent behavior across all vocabulary books
 * - Single source of truth: Config.js → SettingsModule → AudioControls → TTSEngine
 */
import type { VocabularyTerm, PracticeMode } from '../../types';
/**
 * Type-safe Audio Controls
 * Manages playback, navigation, and repeat modes
 */
export declare class AudioControls {
    private config;
    private isPlaying;
    private currentIndex;
    private autoPlayTimeout;
    private delay;
    private repeatMode;
    constructor(config?: any);
    /**
     * Safely get current practice mode from SettingsModule or Config.js fallback
     */
    getPracticeMode(): PracticeMode;
    /**
     * Attach event listeners for settings changes and audio control events
     */
    private _attachEventListeners;
    /**
     * Handle setting changes from SettingsModule
     */
    private _handleSettingChange;
    /**
     * Set repeat mode for audio playback
     */
    private _setRepeatMode;
    /**
     * Start auto-play
     */
    startAutoPlay(): void;
    /**
     * Pause auto-play
     */
    pauseAutoPlay(): void;
    /**
     * Play current word (vocabulary mode)
     */
    playCurrentWord(): Promise<void>;
    /**
     * Handle word repetition based on repeat mode
     */
    handleWordRepetition(word: VocabularyTerm): Promise<void>;
    /**
     * Schedule next word after delay
     */
    scheduleNextWord(): Promise<void>;
    /**
     * Advance to next word
     */
    advanceToNextWord(): void;
    /**
     * Handle playback end
     */
    handlePlaybackEnd(): void;
    /**
     * Handle dataset completion
     */
    handleDatasetCompletion(): Promise<void>;
    /**
     * Auto-loop to next vocabulary book
     */
    autoLoopToNextBook(): Promise<void>;
    /**
     * Restart current dataset
     */
    restartCurrentDataset(): void;
    /**
     * Navigate to next word
     */
    nextWord(): void;
    /**
     * Navigate to previous word
     */
    previousWord(): void;
    /**
     * Update current display
     */
    updateCurrentDisplay(): void;
    /**
     * Show playing UI
     */
    showPlayingUI(): void;
    /**
     * Show paused UI
     */
    showPausedUI(): void;
    /**
     * Play current item in practice mode (RS/ASQ/WFD)
     */
    playCurrentItem(): Promise<void>;
    /**
     * Navigate to next item in practice mode
     */
    nextItem(): void;
    /**
     * Navigate to previous item in practice mode
     */
    prevItem(): void;
    /**
     * Get current index
     */
    getCurrentIndex(): number;
    /**
     * Set the current index and update UI
     */
    setCurrentIndex(index: number): void;
    /**
     * Wait helper
     */
    wait(ms: number): Promise<void>;
}
export declare const audioControls: AudioControls;
export default audioControls;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        audioControls: AudioControls;
    }
}
//# sourceMappingURL=AudioControls.d.ts.map