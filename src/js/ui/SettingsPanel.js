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

        // Listen for voice changes to update dropdown (from Config.js)
        const voicePreferenceChangedEvent = window.appConfig?.get('events.voice.preference.changed') || 'voice:preference:changed';
        window.eventBus.on(voicePreferenceChangedEvent, (data) => {
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
        const defaultPracticeMode = window.appConfig?.get('data.defaults.practiceMode') || 'vocabulary';
        window.currentPracticeMode = practiceModeSelect.value || defaultPracticeMode;
        console.log(`[SettingsPanel] Initial practice mode from dropdown: ${window.currentPracticeMode}`);
        
        // Handle practice mode changes
        practiceModeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            console.log(`[SettingsPanel] 🎯 Practice mode changed to: ${mode}`);
            
            // Show/hide appropriate dataset selectors using Config.js mapping
            const modeMapping = window.appConfig?.get('data.practiceModeMapping');
            const mapping = modeMapping && modeMapping[mode];
            const isVocabularyMode = mapping && mapping.type === 'vocabulary';
            
            if (isVocabularyMode) {
                if (vocabularyBookSetting) vocabularyBookSetting.style.display = 'block';
                if (practiceDatasetSetting) practiceDatasetSetting.style.display = 'none';
            } else {
                if (vocabularyBookSetting) vocabularyBookSetting.style.display = 'none';
                if (practiceDatasetSetting) practiceDatasetSetting.style.display = 'block';
                
                // Auto-select matching dataset for practice mode using Config.js mapping
                const practiceDatasetSelect = document.getElementById('practiceDatasetSelect');
                if (practiceDatasetSelect && window.appConfig) {
                    const modeMapping = window.appConfig.get('data.practiceModeMapping');
                    const mapping = modeMapping && modeMapping[mode];
                    if (mapping && mapping.defaultPracticeDataset) {
                        practiceDatasetSelect.value = mapping.defaultPracticeDataset;
                    }
                }
            }
            
            // INSTEAD of emitting both events, just save the setting
            // SettingsModule will emit the mode:practice:changed event
            // This prevents circular event references
            console.log(`[SettingsPanel] 📤 Saving practiceMode setting: ${mode}`);
            this.saveSetting('practiceMode', mode);
        });
    }

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
        } else if (!isVocabularyMode) {
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

            // Emit panel opened event (standardized from Config.js)
            const panelOpenedEvent = window.appConfig.get('events.settings.panel.opened');
            window.eventBus.emit(panelOpenedEvent, {
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

            // Emit panel closed event (standardized from Config.js)
            const panelClosedEvent = window.appConfig.get('events.settings.panel.closed');
            window.eventBus.emit(panelClosedEvent, {
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
            const defaultVoice = window.appConfig?.get('data.defaults.voice') || 'auto';
            voiceSelect.value = voiceName || defaultVoice;
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

        // Emit export event (standardized from Config.js)
        const settingsExportedEvent = window.appConfig.get('events.settings.exported');
        window.eventBus.emit(settingsExportedEvent, {
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
                // Emit import event (standardized from Config.js)
                const settingsImportedEvent = window.appConfig.get('events.settings.imported');
                window.eventBus.emit(settingsImportedEvent, {
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
        // Emit event to request setting change (standardized from Config.js)
        const settingsRequestChangeEvent = window.appConfig.get('events.settings.requestChange');
        window.eventBus.emit(settingsRequestChangeEvent, { key, value });
    }

    /**
     * Helper method to wait for SettingsModule to become available
     * @param {number} timeout - Maximum time to wait in ms
     * @returns {Promise<boolean>} - True if SettingsModule became available, false if timed out
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