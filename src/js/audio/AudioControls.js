// AudioControls - Play/pause/repeat functionality and timing
// ARCHITECTURE: Event-driven initialization
// - No hard-coded settings defaults in constructor (delay, repeatMode)
// - All settings initialized via SettingsModule events on app startup
// - Ensures consistent behavior across all vocabulary books
// - Single source of truth: Config.js → SettingsModule → AudioControls → TTSEngine
class AudioControls {
    constructor() {
        // Load configuration from centralized config
        this.config = window.appConfig || new AppConfig();
        this.isPlaying = false;
        this.currentIndex = 0;
        this.autoPlayTimeout = null;
        
        // Initialize properties (will be set by SettingsModule events)
        this.delay = null; // Will be set by SettingsModule
        this.repeatMode = null; // Will be set by SettingsModule
        
        // Listen to settings changes
        this._attachEventListeners();
    }

    /**
     * Attach event listeners for settings changes and audio control events
     * @private
     */
    _attachEventListeners() {
        // Listen to standardized settings:changed event from Config.js
        const settingsChangedEvent = window.appConfig.get('events.settings.changed');
        window.eventBus.on(settingsChangedEvent, this._handleSettingChange.bind(this));
        
        // Audio control events (using standardized names from Config.js)
        const audioStartEvent = window.appConfig.get('events.audio.autoplay.start');
        const audioPauseEvent = window.appConfig.get('events.audio.autoplay.pause');
        const audioNextEvent = window.appConfig.get('events.audio.navigate.next');
        const audioPrevEvent = window.appConfig.get('events.audio.navigate.prev');
        
        window.eventBus.on(audioStartEvent, () => this.startAutoPlay());
        window.eventBus.on(audioPauseEvent, () => this.pauseAutoPlay());
        window.eventBus.on(audioNextEvent, ({ mode }) => {
            if (mode && mode !== 'vocabulary') {
                this.nextItem();
            } else {
                this.nextWord();
            }
        });
        window.eventBus.on(audioPrevEvent, ({ mode }) => {
            if (mode && mode !== 'vocabulary') {
                this.prevItem();
            } else {
                this.previousWord();
            }
        });
    }

    /**
     * Handle setting changes from SettingsModule
     * @private
     */
    _handleSettingChange({key, value}) {
        if (key === 'delay') {
            this.delay = parseInt(value) || this.config.get('tts.delays.normal');
            console.log(`[AudioControls] Delay changed to ${this.delay}ms`);
        } else if (key === 'repeat') {
            this._setRepeatMode(value);
            console.log(`[AudioControls] Repeat mode changed to ${value}`);
        }
    }

    startAutoPlay() {
        const currentMode = window.settingsModule?.get('practiceMode') || this.config.get('data.defaults.practiceMode');
        console.log('[AudioControls] 🎬 startAutoPlay called - Mode:', currentMode);
        console.log('[AudioControls] currentPracticeMode (from SettingsModule):', currentMode);
        console.log('[AudioControls] window.currentItem:', window.currentItem);
        console.log('[AudioControls] window.currentDataset:', window.currentDataset);

        // Safety check: verify we have word data
        const totalWords = window.pteVocabularyManager?.getTotalWords() || 0;
        if (totalWords === 0) {
            console.error('[AudioControls] ❌ No words loaded - cannot start auto-play');
            window.progressTracker?.showError('No vocabulary data loaded. Please refresh the page.');
            return;
        }

        if (this.isPlaying) {
            console.log('[AudioControls] ⚠️ Already playing, ignoring start request');
            return;
        }

        this.isPlaying = true;
        this.showPlayingUI();
        this.playCurrentWord();
    }

    pauseAutoPlay() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.showPausedUI();

        if (this.autoPlayTimeout) {
            clearTimeout(this.autoPlayTimeout);
            this.autoPlayTimeout = null;
        }

        // Stop any ongoing speech
        window.ttsEngine.stopSpeaking();

        window.progressTracker.updateStatus('Paused');

        // Emit auto-play pause event
        window.eventBus.emit('audioControls:autoPlayPaused', {
            currentIndex: this.currentIndex
        });
    }

    async playCurrentWord() {
        if (!this.isPlaying) return;

        const currentWord = window.pteVocabularyManager.getCurrentWord(this.currentIndex);
        if (!currentWord) {
            this.handlePlaybackEnd();
            return;
        }

        try {
            // Emit word play start event
            window.eventBus.emit('audioControls:wordPlayStarted', {
                word: currentWord,
                index: this.currentIndex
            });

            // Start TTS - display will be updated when speech actually begins
            await this.handleWordRepetition(currentWord);

            if (this.isPlaying) {
                await this.scheduleNextWord();
            }

        } catch (error) {
            console.error('Error playing word:', error);
            window.progressTracker.showError('Error playing word');
        }
    }

    async handleWordRepetition(word) {
        const targetRepeats = window.ttsEngine.getTargetRepeats();

        for (let repeatCount = 0; repeatCount < targetRepeats; repeatCount++) {
            if (!this.isPlaying) break;

            // Don't update status - let the term index display remain visible
            await window.ttsEngine.pronounceWord(word, repeatCount);

            // Add delay between repetitions (except after last repetition)
            if (repeatCount < targetRepeats - 1 && this.isPlaying) {
                await this.wait(this.delay / 2); // Shorter delay between repetitions
            }
        }
    }

    async scheduleNextWord() {
        if (!this.isPlaying) return;

        // Wait for the configured delay before next word
        this.autoPlayTimeout = setTimeout(async () => {
            if (this.isPlaying) {
                this.advanceToNextWord();
                await this.playCurrentWord();
            }
        }, this.delay);
    }

    advanceToNextWord() {
        const totalWords = window.pteVocabularyManager.getTotalWords();

        this.currentIndex++;

        if (this.currentIndex >= totalWords) {
            // Reached end of current dataset/book
            this.handleDatasetCompletion();
            return;
        }
    }

    handlePlaybackEnd() {
        console.log('[AudioControls] 🛑 Playback ended');
        this.pauseAutoPlay();
        window.progressTracker.updateStatus('Playback completed');
    }

    async handleDatasetCompletion() {
        // Get current practice mode to determine loop behavior
        const practiceMode = window.settingsModule ? 
            window.settingsModule.getSetting('practiceMode') : 'vocabulary';

        if (practiceMode === 'vocabulary') {
            // Vocabulary mode: Auto-loop to next book in circle
            await this.autoLoopToNextBook();
        } else {
            // Sentence mode (RS/ASQ/WFD): Restart current dataset
            this.restartCurrentDataset();
        }
    }

    async autoLoopToNextBook() {
        const currentMode = window.pteVocabularyManager.currentLearningMode;
        const nextMode = window.pteVocabularyManager.getNextLearningMode();
        
        const config = window.appConfig || new AppConfig();
        const learningModes = config.get('data.learningModes') || [];
        const currentBook = learningModes.find(m => m.id === currentMode);
        const nextBook = learningModes.find(m => m.id === nextMode);
        
        console.log(`[AudioControls] 🔄 Vocabulary book completed: ${currentBook?.label || currentMode}`);
        console.log(`[AudioControls] ➡️ Auto-looping to next book: ${nextBook?.label || nextMode}`);
        
        // Update status message
        window.progressTracker.updateStatus(
            `🎉 ${currentBook?.label || currentMode} completed! ` +
            `🔄 Auto-looping to ${nextBook?.label || nextMode}...`
        );
        
        // Change to next book via event (standardized from Config.js)
        const settingsRequestChangeEvent = window.appConfig.get('events.settings.requestChange');
        window.eventBus.emit(settingsRequestChangeEvent, {
            key: 'learningMode',
            value: nextMode
        });
        
        // Reset to first word
        this.currentIndex = 0;
        
        // STOP auto-playing - user must press play again to continue
        // This prevents infinite loop behavior
        this.pauseAutoPlay();
        
        console.log('[AudioControls] ⏸️ Auto-play paused - press PLAY to continue with new book');
    }

    restartCurrentDataset() {
        const practiceMode = window.settingsModule ? 
            window.settingsModule.getSetting('practiceMode') : 'vocabulary';
        const practiceDataset = window.settingsModule ? 
            window.settingsModule.getSetting('practiceDataset') : '';
        
        console.log(`[AudioControls] 🔄 Dataset completed: ${practiceMode.toUpperCase()}`);
        console.log(`[AudioControls] ➡️ Restarting dataset from beginning...`);
        
        // Update status message
        window.progressTracker.updateStatus(
            `🎉 ${practiceMode.toUpperCase()} dataset completed! ` +
            `🔄 Restarting from beginning...`
        );
        
        // Loop back to beginning
        this.currentIndex = 0;
        
        // STOP auto-playing - user must press play again to continue
        // This prevents infinite loop behavior
        this.pauseAutoPlay();
        
        console.log('[AudioControls] ⏸️ Auto-play paused - press PLAY to restart dataset');
    }

    nextWord() {
        const totalWords = window.pteVocabularyManager.getTotalWords();
        if (totalWords === 0) return;

        // Reset repeat count when manually navigating
        window.ttsEngine.currentRepeatCount = 0;

        this.currentIndex++;
        if (this.currentIndex >= totalWords) {
            // Loop to first word in current book
            this.currentIndex = 0;
        }

        this.updateCurrentDisplay();
    }

    previousWord() {
        const totalWords = window.pteVocabularyManager.getTotalWords();
        if (totalWords === 0) return;

        // Reset repeat count when manually navigating
        window.ttsEngine.currentRepeatCount = 0;

        this.currentIndex--;
        if (this.currentIndex < 0) {
            // Loop to last word in current book
            this.currentIndex = totalWords - 1;
        }

        this.updateCurrentDisplay();
    }



    updateCurrentDisplay() {
        const currentWord = window.pteVocabularyManager.getCurrentWord(this.currentIndex);
        if (currentWord) {
            // Emit standardized event from Config.js
            const contentDisplayEvent = window.appConfig.get('events.content.display');
            window.eventBus.emit(contentDisplayEvent, {
                word: currentWord,
                index: this.currentIndex
            });
        }
    }

    showPlayingUI() {
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        if (window.uiController) {
            window.uiController.updateButtons();
        }
    }

    showPausedUI() {
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
        if (window.uiController) {
            window.uiController.updateButtons();
        }
    }

    /**
     * @deprecated Use SettingsModule with events instead
     * @private
     */
    _setDelay(delay) {
        this.delay = parseInt(delay) || this.config.get('tts.delays.normal');

        // Emit delay change event
        window.eventBus.emit('audioControls:delayChanged', {
            delay: this.delay
        });
    }

    /**
     * @deprecated Use SettingsModule with events instead
     * @private
     */
    _setRepeatMode(mode) {
        this.repeatMode = mode;

        // Update TTS engine repeat settings
        const targetRepeats = {
            'once': 1,
            'twice': 2,
            'intensive': 3,
            'loop': 1
        }[mode] || 1;

        window.ttsEngine.setRepeatMode(targetRepeats);

        // Emit repeat mode change event
        window.eventBus.emit('audioControls:repeatModeChanged', {
            mode: this.repeatMode,
            targetRepeats
        });
    }

    /**
     * SIMPLIFIED: Play current item in practice mode (RS/ASQ/WFD)
     */
    async playCurrentItem() {
        if (!this.isPlaying || !window.currentItem) return;

        try {
            const mode = window.settingsModule?.get('practiceMode') || this.config.get('data.defaults.practiceMode');
            const item = window.currentItem;

            console.log(`[AudioControls] 🎵 playCurrentItem - Mode: ${mode}`);
            console.log(`[AudioControls] Current item:`, item);

            // IMPORTANT: Refresh display when PLAY is clicked
            // This ensures UI shows the correct content for current mode
            window.uiController.displayContent(item, mode);

            // Get text to speak based on mode
            let textToSpeak = '';
            if (mode === 'rs' && item.content.sentence) {
                textToSpeak = item.content.sentence;
            } else if (mode === 'asq' && item.content.question) {
                textToSpeak = item.content.question;
            } else if (mode === 'wfd' && item.content.sentence) {
                textToSpeak = item.content.sentence;
            }

            if (textToSpeak) {
                console.log(`[AudioControls] 🔊 Speaking: "${textToSpeak.substring(0, 50)}..."`);
                // Use simplified pronounceText() method
                await window.ttsEngine.pronounceText(textToSpeak);
            }

            // Auto-advance to next item after delay (if in auto-play mode)
            if (this.isPlaying) {
                this.autoPlayTimeout = setTimeout(async () => {
                    if (this.isPlaying) {
                        this.nextItem();
                        await this.playCurrentItem();
                    }
                }, this.delay);
            }

        } catch (error) {
            console.error('Error playing item:', error);
            window.progressTracker.showError('Error playing item');
        }
    }

    /**
     * Navigate to next item in practice mode
     */
    nextItem() {
        if (!window.currentDataset) return;

        window.currentDatasetIndex = window.currentDatasetIndex || 0;
        window.currentDatasetIndex++;

        console.log(`[AudioControls] ⏭️ nextItem - Index: ${window.currentDatasetIndex}/${window.currentDataset.items.length}`);

        if (window.currentDatasetIndex >= window.currentDataset.items.length) {
            // Reached end - loop or stop
            if (this.repeatMode === 'loop') {
                window.currentDatasetIndex = 0;
                console.log(`[AudioControls] 🔄 Looping back to start`);
            } else {
                this.handlePlaybackEnd();
                return;
            }
        }

        // Display next item
        const nextItem = window.currentDataset.items[window.currentDatasetIndex];
        window.currentItem = nextItem; // IMPORTANT: Update currentItem for PLAY button
        console.log(`[AudioControls] Displaying next item:`, nextItem);
        const currentMode = window.settingsModule?.get('practiceMode') || this.config.get('data.defaults.practiceMode');
        window.uiController.displayContent(nextItem, currentMode);
    }

    /**
     * Navigate to previous item in practice mode
     */
    prevItem() {
        if (!window.currentDataset) return;

        window.currentDatasetIndex = window.currentDatasetIndex || 0;
        window.currentDatasetIndex--;

        console.log(`[AudioControls] ⏮️ prevItem - Index: ${window.currentDatasetIndex}/${window.currentDataset.items.length}`);

        if (window.currentDatasetIndex < 0) {
            window.currentDatasetIndex = window.currentDataset.items.length - 1;
            console.log(`[AudioControls] 🔄 Wrapping to end`);
        }

        // Display previous item
        const prevItem = window.currentDataset.items[window.currentDatasetIndex];
        window.currentItem = prevItem; // IMPORTANT: Update currentItem for PLAY button
        console.log(`[AudioControls] Displaying previous item:`, prevItem);
        const currentMode = window.settingsModule?.get('practiceMode') || this.config.get('data.defaults.practiceMode');
        window.uiController.displayContent(prevItem, currentMode);
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    setCurrentIndex(index) {
        this.currentIndex = Math.max(0, Math.min(index, window.pteVocabularyManager.getTotalWords() - 1));
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global audio controls instance
const audioControls = new AudioControls();

// Expose as global reference for PTE app
window.audioControls = audioControls;