// SettingsPanel - Settings panel management and interaction
class SettingsPanel {
    constructor() {
        this.isOpen = false;
        this.config = window.appConfig || new AppConfig();
        this.setupSettingsPanel();
    }

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
                if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
                    this.closePanel();
                }
            });
        }
        
        // Phase 2: Setup practice mode switching
        this.setupPracticeModeSwitch();

        // Listen for voice changes to update dropdown
        window.eventBus.on('voice:preferenceChanged', (data) => {
            this.updateVoiceSelection(data.voiceName);
        });

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
        
        if (!practiceModeSelect) return; // Phase 2 not loaded
        
        // IMPORTANT: Initialize window.currentPracticeMode from dropdown value
        // This ensures mode is set even before settings are loaded
        window.currentPracticeMode = practiceModeSelect.value || 'vocabulary';
        console.log(`[SettingsPanel] Initial practice mode from dropdown: ${window.currentPracticeMode}`);
        
        // Handle practice mode changes
        practiceModeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            console.log(`[SettingsPanel] 🎯 Practice mode changed to: ${mode}`);
            
            // Show/hide appropriate dataset selectors
            if (mode === 'vocabulary') {
                if (vocabularyBookSetting) vocabularyBookSetting.style.display = 'block';
                if (practiceDatasetSetting) practiceDatasetSetting.style.display = 'none';
            } else {
                if (vocabularyBookSetting) vocabularyBookSetting.style.display = 'none';
                if (practiceDatasetSetting) practiceDatasetSetting.style.display = 'block';
                
                // Auto-select matching dataset for practice mode
                const practiceDatasetSelect = document.getElementById('practiceDatasetSelect');
                if (practiceDatasetSelect) {
                    if (mode === 'rs') practiceDatasetSelect.value = 'pte-repeat-sentence';
                    else if (mode === 'asq') practiceDatasetSelect.value = 'pte-answer-short-question';
                    else if (mode === 'wfd') practiceDatasetSelect.value = 'pte-write-from-dictation';
                }
            }
            
            // Emit mode change event
            console.log(`[SettingsPanel] 📤 Emitting practice:modeChanged event with mode: ${mode}`);
            window.eventBus.emit('practice:modeChanged', { mode });
            
            // Save preference
            this.saveSetting('practiceMode', mode);
        });
    }

    async setupSettingsPersistence() {
        // Load saved settings from SettingsModule
        if (!window.settingsModule) {
            console.warn('⚠️ SettingsModule not available - using fallback initialization');
            return;
        }

        const savedSettings = window.settingsModule.exportSettings();

        // Apply settings to UI elements (UIController handles dropdown population)
        this.applySettingToElement('difficultySelect', savedSettings.difficulty);
        this.applySettingToElement('speedSelect', savedSettings.speed);
        this.applySettingToElement('delaySelect', savedSettings.delay);
        this.applySettingToElement('repeatSelect', savedSettings.repeat);
        this.applySettingToElement('voiceSelect', savedSettings.voice || 'auto');
        this.applySettingToElement('learningModeSelect', savedSettings.learningMode);
        
        // IMPORTANT: Restore saved practice mode (vocabulary/rs/asq/wfd)
        const savedPracticeMode = savedSettings.practiceMode || 'vocabulary';
        console.log(`[SettingsPanel] Saved practice mode from settings: ${savedPracticeMode}`);
        this.applySettingToElement('practiceModeSelect', savedPracticeMode);
        
        // Update window.currentPracticeMode (may have been initialized earlier)
        window.currentPracticeMode = savedPracticeMode;
        console.log(`[SettingsPanel] Set window.currentPracticeMode to: ${savedPracticeMode}`);
        
        // If practice mode is not vocabulary, load the dataset
        if (savedPracticeMode !== 'vocabulary' && window.uiController) {
            console.log(`[SettingsPanel] Restoring practice mode: ${savedPracticeMode}, calling handlePracticeModeChange...`);
            window.uiController.handlePracticeModeChange(savedPracticeMode);
        } else if (savedPracticeMode !== 'vocabulary') {
            console.warn(`[SettingsPanel] ⚠️ window.uiController not available, cannot restore mode ${savedPracticeMode}`);
        }

        // Settings are automatically applied through event listeners in engines
        // No need to call setters directly anymore
    }


    togglePanel() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (!settingsPanel) return;

        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            this.openPanel();
        } else {
            this.closePanel();
        }
    }

    openPanel() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.add('active');
            settingsPanel.classList.remove('collapsed');
            this.isOpen = true;

            // Emit panel opened event
            window.eventBus.emit('settings:panelOpened', {
                timestamp: new Date().toISOString()
            });
        }
    }

    closePanel() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.remove('active');
            settingsPanel.classList.add('collapsed');
            this.isOpen = false;

            // Emit panel closed event
            window.eventBus.emit('settings:panelClosed', {
                timestamp: new Date().toISOString()
            });
        }
    }

    applySettingToElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== null && value !== undefined) {
            element.value = value;
        }
    }

    updateVoiceSelection(voiceName) {
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            voiceSelect.value = voiceName || 'auto';
        }
    }

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

        // Emit export event
        window.eventBus.emit('settings:exported', {
            settingsCount: Object.keys(settings).length - 2, // Exclude exportDate and version
            timestamp: new Date().toISOString()
        });
    }

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
                // Emit import event
                window.eventBus.emit('settings:imported', {
                    settingsCount: Object.keys(settings).length - 2,
                    timestamp: new Date().toISOString()
                });
            }

            return result;
        } catch (error) {
            console.error('Settings import failed:', error);
            window.progressTracker.showError('Failed to import settings');
            return false;
        }
    }

    resetSettings() {
        // Use SettingsModule to reset settings
        if (window.settingsModule) {
            window.settingsModule.resetSettings();
        } else {
            console.error('❌ SettingsModule not available - cannot reset settings');
        }
    }

    isSettingsPanelOpen() {
        return this.isOpen;
    }

    /**
     * Save a setting value using SettingsModule events
     */
    saveSetting(key, value) {
        // Emit event to request setting change
        window.eventBus.emit('setting:request-change', { key, value });
    }

}

// Global settings panel instance
const settingsPanel = new SettingsPanel();

// Expose as global reference for PTE app
window.settingsPanel = settingsPanel;