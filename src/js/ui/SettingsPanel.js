// SettingsPanel - Settings panel management and interaction
class SettingsPanel {
    constructor() {
        this.isOpen = false;
        this.settingsManager = null; // Will be initialized when available
        this.config = window.appConfig || new AppConfig();
        this.setupSettingsPanel();
    }

    setupSettingsPanel() {
        // Initialize settings manager if available
        if (window.settingsManager) {
            this.settingsManager = window.settingsManager;
        }

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

        // Listen for voice changes to update dropdown
        window.eventBus.on('voice:preferenceChanged', (data) => {
            this.updateVoiceSelection(data.voiceName);
        });

        // Listen for settings changes to persist them
        this.setupSettingsPersistence();
    }

    setupSettingsPersistence() {
        // Load saved settings from SettingsManager
        let savedSettings;

        if (this.settingsManager) {
            savedSettings = this.settingsManager.getAllSettings();
            console.log('📂 Loading settings from SettingsManager:', savedSettings);
        } else {
            console.warn('⚠️ SettingsManager not available - using fallback initialization');
            return;
        }

        // Apply settings to UI elements (UIController handles dropdown population)
        this.applySettingToElement('categorySelect', savedSettings.category);
        this.applySettingToElement('difficultySelect', savedSettings.difficulty);
        this.applySettingToElement('speedSelect', savedSettings.speed);
        this.applySettingToElement('delaySelect', savedSettings.delay);
        this.applySettingToElement('repeatSelect', savedSettings.repeat);
        this.applySettingToElement('voiceSelect', savedSettings.voice || 'auto');
        this.applySettingToElement('learningModeSelect', savedSettings.learningMode);

        // Apply settings to modules using setter methods
        if (savedSettings.category && window.pteVocabularyManager && window.pteVocabularyManager.setCategory) {
            window.pteVocabularyManager.setCategory(savedSettings.category);
        }
        if (savedSettings.difficulty && window.pteVocabularyManager && window.pteVocabularyManager.setDifficulty) {
            window.pteVocabularyManager.setDifficulty(savedSettings.difficulty);
        }
        if (savedSettings.learningMode && window.pteVocabularyManager && window.pteVocabularyManager.setLearningMode) {
            window.pteVocabularyManager.setLearningMode(savedSettings.learningMode);
        }
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
            console.log('Settings panel opened');

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
            console.log('Settings panel closed');

            // Emit panel closed event
            window.eventBus.emit('settings:panelClosed', {
                timestamp: new Date().toISOString()
            });
        }
    }

    loadSettings() {
        // This method is completely redundant - SettingsManager handles all settings
        console.log('⚠️ SettingsPanel.loadSettings() is deprecated - SettingsManager handles all settings');
        return;

        // All module updates are now handled by SettingsManager events

        console.log('Settings loaded:', savedSettings);
    }

    applySettingToElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== null && value !== undefined) {
            element.value = value;
        }
    }

    // This method is redundant - use the SettingsManager version below

    updateVoiceSelection(voiceName) {
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            voiceSelect.value = voiceName || 'auto';
        }
    }

    exportSettings() {
        // Use SettingsManager to get all settings - no fallback needed
        if (!window.settingsManager) {
            console.error('❌ SettingsManager not available - cannot export settings');
            return;
        }
        const settings = window.settingsManager.getAllSettings();

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

        console.log('Settings exported');

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

            // Apply imported settings
            Object.keys(settings).forEach(key => {
                if (key !== 'exportDate' && key !== 'version' && settings[key] !== null) {
                    this.saveSetting(key, settings[key]);
                }
            });

            // Settings are automatically applied through SettingsManager events

            console.log('Settings imported successfully');

            // Emit import event
            window.eventBus.emit('settings:imported', {
                settingsCount: Object.keys(settings).length - 2,
                timestamp: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error('Settings import failed:', error);
            window.progressTracker.showError('Failed to import settings');
            return false;
        }
    }

    resetSettings() {
        // Use SettingsManager to reset settings instead of direct storage access
        if (window.settingsManager) {
            window.settingsManager.resetSettings();
            console.log('Settings reset through SettingsManager');
        } else {
            console.error('❌ SettingsManager not available - cannot reset settings');
        }
    }

    isSettingsPanelOpen() {
        return this.isOpen;
    }


    /**
     * Save a setting value using SettingsManager
     */
    saveSetting(key, value) {
        if (this.settingsManager) {
            // Use SettingsManager for centralized handling
            this.settingsManager.updateSetting(key, value);
        } else {
            console.warn(`SettingsManager not available - cannot save setting: ${key} = ${value}`);
        }
    }

}

// Global settings panel instance
// Create and expose global instance
const settingsPanel = new SettingsPanel();

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('settingsPanel', settingsPanel);
}

// Legacy compatibility - maintain existing global reference
window.settingsPanel = settingsPanel;