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
import { useAppStore } from '../stores/index.js';
/**
 * SettingsPanel - Manages settings UI and persistence
 *
 * Event-driven settings management via SettingsModule
 * Handles practice mode switching between vocabulary and practice modes
 */
export class SettingsPanel {
    isOpen = false;
    config;
    unsubscribers = [];
    constructor() {
        this.config = window.appConfig || new window.AppConfig();
        this.setupSettingsPanel();
    }
    /**
     * Cleanup subscriptions
     */
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
    /**
     * Initialize settings panel with event listeners
     */
    setupSettingsPanel() {
        // Settings panel uses SettingsModule (event-driven)
        // Settings panel toggle
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', () => {
                this.togglePanel();
            });
            // Close button handler
            if (closeSettingsBtn) {
                closeSettingsBtn.addEventListener('click', () => {
                    this.closePanel();
                });
            }
            // Close settings when clicking outside
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (!settingsPanel.contains(target) && !settingsBtn.contains(target)) {
                    this.closePanel();
                }
            });
        }
        // Phase 2: Setup practice mode switching
        this.setupPracticeModeSwitch();
        // Subscribe to voice changes in Zustand store (replaces EventBus listener)
        const unsubVoice = useAppStore.subscribe((state) => state.tts.selectedVoice, (selectedVoice) => {
            if (selectedVoice) {
                this.updateVoiceSelection(selectedVoice.name);
            }
        });
        this.unsubscribers.push(unsubVoice);
        // Listen for settings changes to persist them
        this.setupSettingsPersistence().catch(console.error);
    }
    /**
     * Phase 2: Setup practice mode switching between Vocabulary/RS/ASQ/WFD
     */
    setupPracticeModeSwitch() {
        const practiceModeSelect = document.getElementById('practiceModeSelect');
        const vocabularyBookSetting = document.getElementById('vocabularyBookSetting');
        const practiceDatasetSetting = document.getElementById('practiceDatasetSetting');
        if (!practiceModeSelect)
            return; // Phase 2 not loaded
        // IMPORTANT: Initialize window.currentPracticeMode from dropdown value
        // This ensures mode is set even before settings are loaded
        const defaultPracticeMode = window.appConfig?.get('data.defaults.practiceMode') || 'vocabulary';
        const initialMode = practiceModeSelect.value || defaultPracticeMode;
        window.currentPracticeMode = initialMode;
        console.log(`[SettingsPanel] Initial practice mode from dropdown: ${window.currentPracticeMode}`);
        // Initialize dataset dropdown with filtered options for initial mode
        const modeMapping = window.appConfig?.get('data.practiceModeMapping');
        const mapping = modeMapping && modeMapping[initialMode];
        const isVocabularyMode = mapping && mapping.type === 'vocabulary';
        if (!isVocabularyMode && window.uiController) {
            const defaultDataset = mapping?.defaultPracticeDataset || null;
            window.uiController.populateDropdown('practiceDatasetSelect', 'practiceDataset', defaultDataset, initialMode);
            console.log(`[SettingsPanel] 🔄 Initialized dataset dropdown for mode: ${initialMode}`);
        }
        // Handle practice mode changes
        practiceModeSelect.addEventListener('change', (e) => {
            const target = e.target;
            const mode = target.value;
            console.log(`[SettingsPanel] 🎯 Practice mode changed to: ${mode}`);
            // Show/hide appropriate dataset selectors using Config.js mapping
            const modeMapping = window.appConfig?.get('data.practiceModeMapping');
            const mapping = modeMapping && modeMapping[mode];
            const isVocabularyMode = mapping && mapping.type === 'vocabulary';
            if (isVocabularyMode) {
                if (vocabularyBookSetting)
                    vocabularyBookSetting.style.display = 'block';
                if (practiceDatasetSetting)
                    practiceDatasetSetting.style.display = 'none';
            }
            else {
                if (vocabularyBookSetting)
                    vocabularyBookSetting.style.display = 'none';
                if (practiceDatasetSetting)
                    practiceDatasetSetting.style.display = 'block';
                // Repopulate practiceDatasetSelect with filtered options for the current mode
                const practiceDatasetSelect = document.getElementById('practiceDatasetSelect');
                if (practiceDatasetSelect && window.uiController) {
                    // Get default dataset for this mode
                    const defaultDataset = mapping?.defaultPracticeDataset || null;
                    // Repopulate with filtered datasets (only show datasets matching this mode's type)
                    window.uiController.populateDropdown('practiceDatasetSelect', 'practiceDataset', defaultDataset, mode);
                    console.log(`[SettingsPanel] 🔄 Repopulated dataset dropdown for mode: ${mode}`);
                }
            }
            // INSTEAD of emitting both events, just save the setting
            // SettingsModule will emit the mode:practice:changed event
            // This prevents circular event references
            console.log(`[SettingsPanel] 📤 Saving practiceMode setting: ${mode}`);
            this.saveSetting('practiceMode', mode);
        });
    }
    /**
     * Setup settings persistence - load saved settings from SettingsModule
     */
    async setupSettingsPersistence() {
        // Load saved settings from SettingsModule
        if (!window.settingsModule) {
            console.warn('⚠️ SettingsModule not available - using fallback initialization');
            // Wait for SettingsModule to become available (it will be initialized by PTEApp)
            await this.waitForSettingsModule();
            if (!window.settingsModule) {
                console.error('❌ SettingsModule still not available after waiting - settings persistence disabled');
                return;
            }
        }
        // Make sure the SettingsModule has the get method
        if (!window.settingsModule.exportSettings) {
            console.error('❌ SettingsModule.exportSettings method not available - settings persistence disabled');
            return;
        }
        const savedSettings = window.settingsModule.exportSettings();
        // Apply settings to UI elements (UIController handles dropdown population)
        this.applySettingToElement('difficultySelect', savedSettings.difficulty);
        this.applySettingToElement('speedSelect', savedSettings.speed);
        this.applySettingToElement('delaySelect', savedSettings.delay);
        this.applySettingToElement('repeatSelect', savedSettings.repeat);
        const defaultVoice = window.appConfig?.get('data.defaults.voice') || 'auto';
        this.applySettingToElement('voiceSelect', savedSettings.voice || defaultVoice);
        this.applySettingToElement('learningModeSelect', savedSettings.learningMode);
        // IMPORTANT: Restore saved practice mode (vocabulary/rs/asq/wfd)
        const defaultPracticeMode = window.appConfig?.get('data.defaults.practiceMode') || 'vocabulary';
        const savedPracticeMode = savedSettings.practiceMode || defaultPracticeMode;
        console.log(`[SettingsPanel] Saved practice mode from settings: ${savedPracticeMode}`);
        this.applySettingToElement('practiceModeSelect', savedPracticeMode);
        // Update window.currentPracticeMode (may have been initialized earlier)
        window.currentPracticeMode = savedPracticeMode;
        console.log(`[SettingsPanel] Set window.currentPracticeMode to: ${savedPracticeMode}`);
        // If practice mode is not vocabulary, load the dataset (use Config.js mapping)
        const modeMapping = window.appConfig?.get('data.practiceModeMapping');
        const mapping = modeMapping && modeMapping[savedPracticeMode];
        const isVocabularyMode = mapping && mapping.type === 'vocabulary';
        if (!isVocabularyMode && window.uiController) {
            console.log(`[SettingsPanel] Restoring practice mode: ${savedPracticeMode}, calling handlePracticeModeChange...`);
            window.uiController.handlePracticeModeChange(savedPracticeMode);
        }
        else if (!isVocabularyMode) {
            console.warn(`[SettingsPanel] ⚠️ window.uiController not available, cannot restore mode ${savedPracticeMode}`);
        }
        // Settings are automatically applied through event listeners in engines
        // No need to call setters directly anymore
    }
    /**
     * Toggle settings panel open/close
     */
    togglePanel() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (!settingsPanel)
            return;
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.openPanel();
        }
        else {
            this.closePanel();
        }
    }
    /**
     * Open settings panel
     */
    openPanel() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.add('active');
            settingsPanel.classList.remove('collapsed');
            this.isOpen = true;
            // Update Zustand store (replaces EventBus emission)
            useAppStore.getState().settings.updateSetting('isPanelOpen', true);
            console.log('[SettingsPanel] Panel opened (Zustand updated)');
        }
    }
    /**
     * Close settings panel
     */
    closePanel() {
        // Only close if currently open
        if (!this.isOpen)
            return;
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.remove('active');
            settingsPanel.classList.add('collapsed');
            this.isOpen = false;
            // Update Zustand store (replaces EventBus emission)
            useAppStore.getState().settings.updateSetting('isPanelOpen', false);
            console.log('[SettingsPanel] Panel closed (Zustand updated)');
        }
    }
    /**
     * Apply a setting value to a DOM element
     */
    applySettingToElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== null && value !== undefined) {
            element.value = value;
        }
    }
    /**
     * Update voice selection dropdown
     */
    updateVoiceSelection(voiceName) {
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            const defaultVoice = window.appConfig?.get('data.defaults.voice') || 'auto';
            voiceSelect.value = voiceName || defaultVoice;
        }
    }
    /**
     * Export settings to JSON file
     */
    exportSettings() {
        // Use SettingsModule to get all settings
        if (!window.settingsModule) {
            console.error('❌ SettingsModule not available - cannot export settings');
            return;
        }
        const settings = window.settingsModule.exportSettings();
        // Add export metadata
        settings.exportDate = new Date().toISOString();
        settings.version = this.config.get('ui.labels.version');
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.config.get('ui.labels.exportFilename');
        link.click();
        URL.revokeObjectURL(url);
        // Note: Settings exported event removed (informational, no listeners)
        console.log(`[SettingsPanel] ✅ Exported ${Object.keys(settings).length - 2} settings`);
    }
    /**
     * Import settings from JSON data
     */
    importSettings(settingsData) {
        try {
            const settings = typeof settingsData === 'string' ? JSON.parse(settingsData) : settingsData;
            // Validate settings structure
            if (!settings || typeof settings !== 'object') {
                throw new Error('Invalid settings format');
            }
            // Use SettingsModule to import settings
            if (!window.settingsModule) {
                console.error('❌ SettingsModule not available - cannot import settings');
                return false;
            }
            // Import settings through SettingsModule
            const result = window.settingsModule.importSettings(settings);
            if (result) {
                // Note: Settings imported event removed (informational, no listeners)
                console.log(`[SettingsPanel] ✅ Imported ${Object.keys(settings).length - 2} settings`);
            }
            return result;
        }
        catch (error) {
            console.error('Settings import failed:', error);
            window.progressTracker.showError('Failed to import settings');
            return false;
        }
    }
    /**
     * Reset all settings to defaults
     */
    resetSettings() {
        // Use SettingsModule to reset settings
        if (window.settingsModule) {
            window.settingsModule.resetSettings();
        }
        else {
            console.error('❌ SettingsModule not available - cannot reset settings');
        }
    }
    /**
     * Check if settings panel is open
     */
    isSettingsPanelOpen() {
        return this.isOpen;
    }
    /**
     * Save a setting value using SettingsModule directly (replaces EventBus)
     */
    saveSetting(key, value) {
        // Call SettingsModule directly instead of emitting event
        if (window.settingsModule) {
            window.settingsModule.updateSetting(key, value);
        }
        else {
            console.error('❌ SettingsModule not available - cannot save setting');
        }
    }
    /**
     * Helper method to wait for SettingsModule to become available
     * @param timeout - Maximum time to wait in ms
     * @returns True if SettingsModule became available, false if timed out
     */
    async waitForSettingsModule(timeout = 3000) {
        console.log(`[SettingsPanel] Waiting for SettingsModule to be initialized (timeout: ${timeout}ms)...`);
        const startTime = Date.now();
        const checkInterval = 100; // Check every 100ms
        return new Promise(resolve => {
            const checkForModule = () => {
                if (window.settingsModule) {
                    console.log(`[SettingsPanel] SettingsModule is now available after ${Date.now() - startTime}ms`);
                    resolve(true);
                    return;
                }
                if (Date.now() - startTime > timeout) {
                    console.warn(`[SettingsPanel] Timed out waiting for SettingsModule after ${timeout}ms`);
                    resolve(false);
                    return;
                }
                setTimeout(checkForModule, checkInterval);
            };
            checkForModule();
        });
    }
}
// Global settings panel instance
const settingsPanel = new SettingsPanel();
// Expose as global reference for PTE app
window.settingsPanel = settingsPanel;
// Export for module use
export default settingsPanel;
//# sourceMappingURL=SettingsPanel.js.map