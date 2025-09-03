// SettingsPanel - Settings panel management and interaction
class SettingsPanel {
    constructor() {
        this.isOpen = false;
        this.setupSettingsPanel();
    }

    setupSettingsPanel() {
        // Settings panel toggle
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', () => {
                this.togglePanel();
            });
            
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
                // Load saved settings or defaults
        const savedSettings = {
            category: window.storage.getItem('category') || 'all-categories',
            difficulty: window.storage.getItem('difficulty') || 'all',
            speechRate: window.storage.getItem('speechRate') || 1.0,
            delay: window.storage.getItem('delay') || 2000,
            repeatMode: window.storage.getItem('repeatMode') || 'individual',
            preferredVoice: window.storage.getItem('preferredVoice') || null
        };

        // Apply settings to UI elements
        this.applySettingToElement('categorySelect', savedSettings.category);
        this.applySettingToElement('difficultySelect', savedSettings.difficulty);
        this.applySettingToElement('speedSelect', savedSettings.speechRate);
        this.applySettingToElement('delaySelect', savedSettings.delay);
        this.applySettingToElement('repeatSelect', savedSettings.repeatMode);
        this.applySettingToElement('voiceSelect', savedSettings.preferredVoice || 'Microsoft James - English (Australia)');

        // Apply settings to modules
        window.vocabularyManager.currentCategory = savedSettings.category;
        window.vocabularyManager.currentDifficulty = savedSettings.difficulty;
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
        // Load and apply saved settings
        const savedSettings = {
            category: window.storage.getItem('category') || 'all-categories',
            difficulty: window.storage.getItem('difficulty') || 'all',
            speechRate: window.storage.getItem('speechRate') || 1.0,
            delay: window.storage.getItem('delay') || 2000,
            repeatMode: window.storage.getItem('repeatMode') || 'individual',
            preferredVoice: window.storage.getItem('preferredVoice') || null
        };

        // Apply settings to UI elements
        this.applySettingToElement('categorySelect', savedSettings.category);
        this.applySettingToElement('difficultySelect', savedSettings.difficulty);
        this.applySettingToElement('speedSelect', savedSettings.speechRate);
        this.applySettingToElement('delaySelect', savedSettings.delay);
        this.applySettingToElement('repeatSelect', savedSettings.repeatMode);
        this.applySettingToElement('voiceSelect', savedSettings.preferredVoice || 'Microsoft James - English (Australia)');

        // Apply settings to modules
        window.vocabularyManager.currentCategory = savedSettings.category;
        window.vocabularyManager.currentDifficulty = savedSettings.difficulty;
        window.ttsEngine.setSpeechRate(savedSettings.speechRate);
        window.audioControls.setDelay(savedSettings.delay);
        window.audioControls.setRepeatMode(savedSettings.repeatMode);
        // Always set voice preference - default to Microsoft James if none saved
        const voicePreference = savedSettings.preferredVoice || 'Microsoft James - English (Australia)';
        window.voiceSelector.setPreferredVoice(voicePreference);

        console.log('Settings loaded:', savedSettings);
    }

    applySettingToElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== null && value !== undefined) {
            element.value = value;
        }
    }

    saveSetting(key, value) {
        if (window.storage.isAvailable()) {
            window.storage.setItem(key, value);
            console.log(`Setting saved: ${key} = ${value}`);
        }
    }

    updateVoiceSelection(voiceName) {
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            voiceSelect.value = voiceName || 'auto';
        }
    }

    exportSettings() {
        const settings = {
            category: window.storage.getItem('category'),
            difficulty: window.storage.getItem('difficulty'),
            speechRate: window.storage.getItem('speechRate'),
            delay: window.storage.getItem('delay'),
            repeatMode: window.storage.getItem('repeatMode'),
            preferredVoice: window.storage.getItem('preferredVoice'),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ccl-trainer-settings.json';
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

            // Reload settings to apply them
            this.loadSettings();
            
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
        // Clear all stored settings
        window.storage.clear();
        
        // Reload page to reset to defaults
        window.location.reload();
        
        console.log('Settings reset to defaults');
        
        // Emit reset event
        window.eventBus.emit('settings:reset', {
            timestamp: new Date().toISOString()
        });
    }

    isSettingsPanelOpen() {
        return this.isOpen;
    }
}

// Global settings panel instance
window.settingsPanel = new SettingsPanel();