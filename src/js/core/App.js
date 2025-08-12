// App - Main application coordinator
class CCLPronunciationTrainer {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        // Prevent multiple initialization
        if (this.initialized) {
            console.warn('Already initialized, skipping');
            return;
        }
        this.initialized = true;
        
        // Initialize all modules in correct order
        this.initializeModules();
        
        console.log('CCL Pronunciation Trainer initialized');
        
        // Emit app initialization event
        window.eventBus.emit('app:initialized', {
            timestamp: new Date().toISOString(),
            version: '2.0-refactored'
        });
    }

    initializeModules() {
        // 1. Initialize core data management
        window.vocabularyManager.calculateCategoryCounts();
        
        // 2. Initialize UI controller and bind events
        window.uiController.bindEventListeners();
        
        // 3. Sync settings from HTML
        window.uiController.syncRepeatModeFromHTML();
        
        // 4. Load initial category
        window.vocabularyManager.loadCategory(window.vocabularyManager.currentCategory);
        
        // 5. Update initial UI state
        window.uiController.updateUI();
        
        // 6. Populate voice options when available
        this.initializeVoices();
        
        // 7. Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('All modules initialized successfully');
    }

    initializeVoices() {
        const initVoices = () => {
            window.voiceSelector.populateVoiceOptions();
            
            // Force Microsoft James selection after voices are loaded
            const currentVoice = window.storage.getSetting('preferredVoice');
            if (!currentVoice) {
                // Set Microsoft James as default and save it
                const defaultVoice = 'Microsoft James - English (Australia)';
                window.voiceSelector.setPreferredVoice(defaultVoice);
                window.storage.saveSetting('preferredVoice', defaultVoice);
                console.log('Forced default voice to Microsoft James for mobile compatibility');
                
                // Update the UI selector
                const voiceSelect = document.getElementById('voiceSelect');
                if (voiceSelect) {
                    voiceSelect.value = defaultVoice;
                }
            }
        };
        
        // Populate voice options when voices are available
        if (speechSynthesis.getVoices().length > 0) {
            initVoices();
        } else {
            // Wait for voices to load
            speechSynthesis.addEventListener('voiceschanged', initVoices, { once: true });
        }
        
        // Additional safety check for mobile - retry after delay
        setTimeout(() => {
            if (speechSynthesis.getVoices().length > 0) {
                initVoices();
            }
        }, 1000);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't interfere with input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    window.audioControls.previousWord();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    window.audioControls.nextWord();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.repeatCurrentWord();
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (window.settingsPanel.isSettingsPanelOpen()) {
                        window.settingsPanel.closePanel();
                    }
                    break;
                default:
                    // Ignore other keys
                    break;
            }
        });

        console.log('Keyboard shortcuts initialized: Space (play/pause), ← → (navigate), R (repeat), Esc (close settings)');
    }

    togglePlayPause() {
        if (window.audioControls.isPlaying) {
            window.audioControls.pauseAutoPlay();
        } else {
            window.audioControls.startAutoPlay();
        }
    }

    async repeatCurrentWord() {
        const currentIndex = window.audioControls.getCurrentIndex();
        const currentWord = window.vocabularyManager.getCurrentWord(currentIndex);
        
        if (currentWord) {
            // Pause auto-play if running
            const wasPlaying = window.audioControls.isPlaying;
            if (wasPlaying) {
                window.audioControls.pauseAutoPlay();
            }
            
            // Pronounce current word
            await window.ttsEngine.pronounceWord(currentWord, 0);
            
            // Resume auto-play if it was running
            if (wasPlaying) {
                setTimeout(() => {
                    window.audioControls.startAutoPlay();
                }, 1000);
            }
        }
    }

    // Public API methods for external access
    getCurrentWord() {
        const currentIndex = window.audioControls.getCurrentIndex();
        return window.vocabularyManager.getCurrentWord(currentIndex);
    }

    getCurrentCategory() {
        return window.vocabularyManager.currentCategory;
    }

    getCurrentDifficulty() {
        return window.vocabularyManager.currentDifficulty;
    }

    getTotalWords() {
        return window.vocabularyManager.getTotalWords();
    }

    getCurrentIndex() {
        return window.audioControls.getCurrentIndex();
    }

    isPlaying() {
        return window.audioControls.isPlaying;
    }

    // Category management
    loadCategory(category) {
        window.vocabularyManager.loadCategory(category);
        window.audioControls.setCurrentIndex(0); // Reset to first word
    }

    setDifficulty(difficulty) {
        window.vocabularyManager.setDifficulty(difficulty);
        window.audioControls.setCurrentIndex(0); // Reset to first word
    }

    // Audio control methods
    play() {
        window.audioControls.startAutoPlay();
    }

    pause() {
        window.audioControls.pauseAutoPlay();
    }

    next() {
        window.audioControls.nextWord();
    }

    previous() {
        window.audioControls.previousWord();
    }

    // Settings methods
    setSpeechRate(rate) {
        window.ttsEngine.setSpeechRate(rate);
    }

    setDelay(delay) {
        window.audioControls.setDelay(delay);
    }

    setRepeatMode(mode) {
        window.audioControls.setRepeatMode(mode);
    }

    setVoice(voiceName) {
        window.voiceSelector.setPreferredVoice(voiceName);
    }

    // Utility methods
    exportSettings() {
        return window.settingsPanel.exportSettings();
    }

    importSettings(settingsData) {
        return window.settingsPanel.importSettings(settingsData);
    }

    resetSettings() {
        window.settingsPanel.resetSettings();
    }

    // Debug/development methods
    getModuleStatus() {
        return {
            vocabularyManager: !!window.vocabularyManager,
            progressTracker: !!window.progressTracker,
            ttsEngine: !!window.ttsEngine,
            voiceSelector: !!window.voiceSelector,
            audioControls: !!window.audioControls,
            uiController: !!window.uiController,
            settingsPanel: !!window.settingsPanel,
            eventBus: !!window.eventBus,
            storage: !!window.storage
        };
    }

    getStats() {
        return {
            currentWord: this.getCurrentWord(),
            currentCategory: this.getCurrentCategory(),
            currentDifficulty: this.getCurrentDifficulty(),
            totalWords: this.getTotalWords(),
            currentIndex: this.getCurrentIndex(),
            isPlaying: this.isPlaying(),
            moduleStatus: this.getModuleStatus()
        };
    }
}

// Global app instance
window.cclApp = new CCLPronunciationTrainer();