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

        // Run cache migration before any module initialization
        // Force clear cache to ensure clean initialization
        window.cacheMigration.checkAndMigrate(true);

        // Initialize all modules in correct order
        this.initializeModules();

        console.log('CCL Pronunciation Trainer initialized');

        // Emit app initialization event
        window.eventBus.emit('app:initialized', {
            timestamp: new Date().toISOString(),
            version: '2.0-complete-dataset'
        });
    }

    async initializeModules() {
        console.log('🚀 Starting module initialization...');

        // 0. Register service worker for PWA and background operation
        this.registerServiceWorker();

        // 1. Initialize state manager (must be first to restore settings)
        this.initializeStateManager();

        // 2. Initialize vocabulary manager (loads conversation data asynchronously)
        await window.vocabularyManager.initialize();

        // 3. Initialize UI controller and bind events
        window.uiController.bindEventListeners();

        // 4. Sync settings from HTML
        window.uiController.syncRepeatModeFromHTML();

        // 5. Update initial UI state
        window.uiController.updateUI();

        // 6. Populate voice options when available
        this.initializeVoices();

        // 7. Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // 8. Setup fullscreen functionality
        this.setupFullscreen();

        // 9. Restore UI settings from state
        this.restoreUIState();

        console.log('✅ All modules initialized successfully');
    }

    initializeStateManager() {
        // StateManager is already initialized as a global instance
        // Just ensure other modules can access it
        if (window.stateManager) {
            console.log('📂 StateManager initialized and ready');
            
            // Check if we're restoring a previous session
            if (window.stateManager.hasPreviousSession()) {
                console.log('🔄 Previous session detected - will restore state');
            } else {
                console.log('🆕 New session started');
            }
        } else {
            console.warn('StateManager not available');
        }
    }

    restoreUIState() {
        // Restore UI state after all modules are initialized
        if (window.stateManager && window.stateManager.hasPreviousSession()) {
            const preferences = window.stateManager.getUserPreferences();
            
            // Apply TTS settings
            if (window.ttsEngine && preferences.speed) {
                window.ttsEngine.setSpeechRate(parseFloat(preferences.speed));
            }
            
            // Apply audio control settings
            if (window.audioControls) {
                if (preferences.delay) {
                    window.audioControls.setDelay(parseInt(preferences.delay));
                }
                if (preferences.repeat) {
                    window.audioControls.setRepeatMode(preferences.repeat);
                }
            }
            
            // Apply voice preference
            if (window.voiceSelector && preferences.voice && preferences.voice !== 'auto') {
                window.voiceSelector.setPreferredVoice(preferences.voice);
            }
            
            console.log('🎯 UI state restored from previous session');
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered for background operation');
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    initializeVoices() {
        const initVoices = () => {
            window.voiceSelector.populateVoiceOptions();

            // Force default voice selection after voices are loaded
            const currentVoice = window.storage.getSetting('preferredVoice');
            if (!currentVoice) {
                // Set Google UK English Male as default and save it
                const defaultVoice = 'Google UK English Male';
                window.voiceSelector.setPreferredVoice(defaultVoice);
                window.storage.saveSetting('preferredVoice', defaultVoice);
                console.log('Forced default voice to Google UK English Male');

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

        console.log('Keyboard shortcuts initialized: Space (play/pause), ← → (navigate), R (repeat), F (fullscreen), Esc (close settings)');
    }

    setupFullscreen() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (!fullscreenBtn) return;

        // Update button icon based on fullscreen state
        const updateFullscreenIcon = () => {
            const isFullscreen = document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement || 
                                document.msFullscreenElement;
            
            fullscreenBtn.textContent = isFullscreen ? '⛶' : '⛶';
            fullscreenBtn.title = isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen';
        };

        // Fullscreen toggle function
        const toggleFullscreen = async () => {
            try {
                const isFullscreen = document.fullscreenElement || 
                                    document.webkitFullscreenElement || 
                                    document.mozFullScreenElement || 
                                    document.msFullscreenElement;

                if (isFullscreen) {
                    // Exit fullscreen
                    if (document.exitFullscreen) {
                        await document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                        await document.webkitExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        await document.mozCancelFullScreen();
                    } else if (document.msExitFullscreen) {
                        await document.msExitFullscreen();
                    }
                } else {
                    // Enter fullscreen
                    const element = document.documentElement;
                    if (element.requestFullscreen) {
                        await element.requestFullscreen();
                    } else if (element.webkitRequestFullscreen) {
                        await element.webkitRequestFullscreen();
                    } else if (element.mozRequestFullScreen) {
                        await element.mozRequestFullScreen();
                    } else if (element.msRequestFullscreen) {
                        await element.msRequestFullscreen();
                    }
                }
            } catch (error) {
                console.warn('Fullscreen toggle failed:', error);
            }
        };

        // Event listeners
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        
        // Listen for fullscreen changes
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange']
            .forEach(event => {
                document.addEventListener(event, updateFullscreenIcon);
            });

        // Keyboard shortcut for fullscreen (F11 alternative: F)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                // Don't interfere with input fields
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                toggleFullscreen();
            }
        });

        // Initial icon update
        updateFullscreenIcon();
        
        console.log('Fullscreen functionality initialized (Click button or press F key)');
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