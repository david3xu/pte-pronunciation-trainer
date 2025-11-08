/**
 * SettingsPanel - Settings panel management and interaction
 *
 * ARCHITECTURE: Zustand state management
 * - Replaces EventBus with Zustand store subscriptions
 * - Direct SettingsModule calls instead of event emissions
 * - Panel state tracked in settings store
 *
 * Type-safe UI controller for settings panel
 * Manages practice mode switching, settings persistence, import/export
 */
/**
 * Saved settings structure
 */
interface SavedSettings {
    difficulty?: string;
    speed?: string;
    delay?: string;
    repeat?: string;
    voice?: string;
    learningMode?: string;
    practiceMode?: string;
    exportDate?: string;
    version?: string;
    [key: string]: any;
}
/**
 * SettingsPanel - Manages settings UI and persistence
 *
 * Event-driven settings management via SettingsModule
 * Handles practice mode switching between vocabulary and practice modes
 */
export declare class SettingsPanel {
    private isOpen;
    private config;
    private unsubscribers;
    constructor();
    /**
     * Cleanup subscriptions
     */
    destroy(): void;
    /**
     * Initialize settings panel with event listeners
     */
    setupSettingsPanel(): void;
    /**
     * Phase 2: Setup practice mode switching between Vocabulary/RS/ASQ/WFD
     */
    setupPracticeModeSwitch(): void;
    /**
     * Setup settings persistence - load saved settings from SettingsModule
     */
    setupSettingsPersistence(): Promise<void>;
    /**
     * Toggle settings panel open/close
     */
    togglePanel(): void;
    /**
     * Open settings panel
     */
    openPanel(): void;
    /**
     * Close settings panel
     */
    closePanel(): void;
    /**
     * Apply a setting value to a DOM element
     */
    applySettingToElement(elementId: string, value: any): void;
    /**
     * Update voice selection dropdown
     */
    updateVoiceSelection(voiceName: string): void;
    /**
     * Export settings to JSON file
     */
    exportSettings(): void;
    /**
     * Import settings from JSON data
     */
    importSettings(settingsData: string | SavedSettings): boolean;
    /**
     * Reset all settings to defaults
     */
    resetSettings(): void;
    /**
     * Check if settings panel is open
     */
    isSettingsPanelOpen(): boolean;
    /**
     * Save a setting value using SettingsModule directly (replaces EventBus)
     */
    saveSetting(key: string, value: any): void;
    /**
     * Helper method to wait for SettingsModule to become available
     * @param timeout - Maximum time to wait in ms
     * @returns True if SettingsModule became available, false if timed out
     */
    waitForSettingsModule(timeout?: number): Promise<boolean>;
}
declare const settingsPanel: SettingsPanel;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        settingsPanel: SettingsPanel;
        currentPracticeMode: string;
    }
}
export default settingsPanel;
//# sourceMappingURL=SettingsPanel.d.ts.map