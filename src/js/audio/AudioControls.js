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
     * Safely get current practice mode from SettingsModule or Config.js fallback
     * @returns {string} Current practice mode
     */
    getPracticeMode() {
        if (window.settingsModule && typeof window.settingsModule.get === 'function') {
            return window.settingsModule.get('practiceMode') || this.config.get('data.defaults.practiceMode');
        }
        return this.config.get('data.defaults.practiceMode');
    }

    /**
     * Attach event listeners for settings changes and audio control events
     * @private
     */
    _attachEventListeners() {
        // Listen to standardized settings:changed event from Config.js
        const settingsChangedEvent = window.appConfig.get('events.settings.changed');
        window.eventBus.on(settingsChangedEvent, this._handleSettingChange.bind(this));

        // Listen for learning mode changes to reset index
        // Use standardized settings.changed event from Config.js
        const settingsChangedEvent2 = window.appConfig.get('events.settings.changed');
        window.eventBus.on(settingsChangedEvent2, (data) => {
            if (data.key === 'learningMode') {
                console.log(`[AudioControls] 🔄 Learning mode changed to ${data.value}, resetting index to 0`);
                // Reset current index to start from the beginning of the new book
                this.setCurrentIndex(0);
                // Also pause autoplay to prevent continuous playback when switching books
                if (this.isPlaying) {
                    this.pauseAutoPlay();
                }
            }
        });

        // Also listen for the standardized event as a backup
        const learningModeChangedEvent = window.appConfig.get('events.mode.learning.changed');
        window.eventBus.on(learningModeChangedEvent, () => {
            console.log('[AudioControls] 🔄 Learning mode changed event received, resetting index to 0');
            // Reset current index to start from the beginning of the new book
            this.setCurrentIndex(0);
            // Also pause autoplay to prevent continuous playback when switching books
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
        });

        // Listen for practice mode changes to reset state
        const practiceModeChangedEvent = window.appConfig.get('events.mode.practice.changed');
        window.eventBus.on(practiceModeChangedEvent, (data) => {
            console.log(`[AudioControls] 🔄 Practice mode changed to ${data.mode}, resetting state`);

            // Reset playback state
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }

            // Reset index for vocabulary mode
            if (data.mode === 'vocabulary') {
                this.setCurrentIndex(0);
            }
        });

        // Listen for dataset changes in practice modes
        const datasetChangedEvent = window.appConfig.get('events.dataset.practice.changed');
        window.eventBus.on(datasetChangedEvent, (data) => {
            console.log(`[AudioControls] 📚 Practice dataset changed: ${data.datasetId} (${data.itemCount} items)`);

            // Reset playback state
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
        });

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
        } else if (key === 'practiceMode') {
            console.log(`[AudioControls] Practice mode changed to ${value}`);

            // Reset any ongoing playback
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }

            // Reset index to 0 when changing practice modes
            this.setCurrentIndex(0);
        } else if (key === 'practiceDataset') {
            console.log(`[AudioControls] Practice dataset changed to ${value}`);

            // Reset any ongoing playback
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
        }
    }

    /**
     * Set repeat mode for audio playback
     * @param {string} mode - Repeat mode ('once', 'twice', 'intensive', 'loop')
     * @private
     */
    _setRepeatMode(mode) {
        // Validate mode against config values
        const validModes = this.config.get('audio.repeatModes') || ['once', 'loop'];

        // Default to 'once' if invalid mode provided
        this.repeatMode = validModes.includes(mode) ? mode : 'once';

        // Convert repeat mode to target number of repetitions
        const repeatModeToCount = {
            'once': 1,
            'twice': 2,
            'intensive': 3,
            'loop': 1  // Loop plays each word once, then advances
        };

        const targetRepeats = repeatModeToCount[this.repeatMode] || 1;

        // Set target repeats in TTSEngine
        if (window.ttsEngine && typeof window.ttsEngine.setRepeatMode === 'function') {
            window.ttsEngine.setRepeatMode(targetRepeats);
            console.log(`[AudioControls] Set TTSEngine targetRepeats to ${targetRepeats} for mode '${this.repeatMode}'`);
        }

        // Emit standardized event (from Config.js)
        const repeatModeChangedEvent = this.config.get('events.audio.repeat.changed') || 'audio:repeat:changed';
        window.eventBus.emit(repeatModeChangedEvent, {
            mode: this.repeatMode,
            targetRepeats: targetRepeats,
            timestamp: new Date().toISOString()
        });
    }

    startAutoPlay() {
        const currentMode = this.getPracticeMode();
        console.log('[AudioControls] 🎬 startAutoPlay called - Mode:', currentMode);
        console.log('[AudioControls] currentPracticeMode (from SettingsModule):', currentMode);
        console.log('[AudioControls] window.currentItem:', window.currentItem);
        console.log('[AudioControls] window.currentDataset:', window.currentDataset);

        // Use Config.js mapping to determine mode type
        const modeMapping = this.config.get('data.practiceModeMapping') || {};
        const mapping = modeMapping[currentMode];
        const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');

        console.log(`[AudioControls] Current mode: ${currentMode} (vocabulary mode: ${isVocabularyMode})`);

        // Check for required data based on mode
        let canPlay = false;

        if (isVocabularyMode) {
            // Enhanced safety checks for vocabulary mode
            if (!window.pteVocabularyManager) {
                console.error('[AudioControls] ❌ PTEVocabularyManager not available - cannot start auto-play');
                window.progressTracker?.showError('Vocabulary manager not initialized. Please refresh the page.');
                return;
            }

            // Check if we have words to play
            const totalWords = window.pteVocabularyManager.getTotalWords();
            console.log(`[AudioControls] Current words count: ${totalWords}`);

            canPlay = totalWords > 0;

            if (!canPlay) {
                console.error('[AudioControls] ❌ No vocabulary loaded - cannot start auto-play');
                window.progressTracker?.showError('No vocabulary data loaded. Please refresh the page.');
                return;
            }

            // Create a current word reference for display
            const currentIndex = this.currentIndex || 0;
            const currentWord = window.pteVocabularyManager.getCurrentWord(currentIndex);

            // Make sure we have a valid word object
            if (!currentWord) {
                console.error('[AudioControls] ❌ Invalid current word at index:', currentIndex);
                window.progressTracker?.showError('Could not find the current word. Please try again.');
                return;
            }

            // Log current word for debugging
            console.log(`[AudioControls] Current word: ${currentWord?.english || '(unknown)'}`);

            // Update display immediately
            if (window.uiController && typeof window.uiController.displayWord === 'function') {
                window.uiController.displayWord(currentWord, currentIndex);
            }
        } else {
            // Practice mode (RS/ASQ/WFD): Check for current item and dataset
            canPlay = !!window.currentItem && !!window.currentDataset;

            if (!canPlay) {
                console.error('[AudioControls] ❌ No practice dataset loaded - cannot start auto-play');

                // Check if we need to reload the dataset
                if (!window.datasetManager || !window.uiController) {
                    console.error('[AudioControls] ❌ DatasetManager or UIController not available');
                    window.progressTracker?.showError(`Required components not initialized. Please refresh the page.`);
                    return;
                }

                // Try to load the dataset via UIController
                console.log('[AudioControls] 🔄 Attempting to load practice dataset via UIController...');

                try {
                    // Use SettingsModule to get the current dataset
                    const settingsModule = window.settingsModule;
                    const practiceDatasetSetting = settingsModule ? settingsModule.get('practiceDataset') : null;

                    if (practiceDatasetSetting && window.uiController.loadPracticeDataset) {
                        console.log(`[AudioControls] 🔄 Loading dataset: ${practiceDatasetSetting}`);

                        // Give feedback to user
                        window.progressTracker?.updateStatus(`Loading ${currentMode.toUpperCase()} dataset...`);

                        // Try to load the practice dataset
                        window.uiController.loadPracticeDataset(currentMode)
                            .then(success => {
                                if (success && window.currentItem) {
                                    console.log('[AudioControls] ✅ Dataset loaded successfully, starting playback...');

                                    // Now we can start playback
                                    this.isPlaying = true;
                                    this.showPlayingUI();
                                    this.playCurrentItem();
                                } else {
                                    console.error('[AudioControls] ❌ Failed to load dataset');
                                    window.progressTracker?.showError(`Failed to load ${currentMode.toUpperCase()} dataset`);
                                }
                            })
                            .catch(err => {
                                console.error('[AudioControls] ❌ Error loading dataset:', err);
                                window.progressTracker?.showError(`Error loading dataset: ${err.message}`);
                            });

                        return; // Exit early as we're handling this asynchronously
                    } else {
                        console.error('[AudioControls] ❌ No practice dataset configured');
                        window.progressTracker?.showError(`No ${currentMode.toUpperCase()} dataset configured. Please check settings.`);
                        return;
                    }
                } catch (error) {
                    console.error('[AudioControls] ❌ Failed to load dataset:', error);
                    window.progressTracker?.showError(`Failed to load ${currentMode.toUpperCase()} dataset`);
                    return;
                }
            }

            console.log(`[AudioControls] ✅ Practice dataset ready - item: ${window.currentItem ? 'available' : 'missing'}`);
        }

        if (this.isPlaying) {
            console.log('[AudioControls] ⚠️ Already playing, ignoring start request');
            return;
        }

        this.isPlaying = true;
        this.showPlayingUI();

        // Call appropriate playback method based on mode
        if (isVocabularyMode) {
            this.playCurrentWord();
        } else {
            this.playCurrentItem();
        }
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

        // Emit auto-play pause event (from Config.js)
        const autoPlayPausedEvent = this.config.get('events.audio.autoplay.paused') || 'audio:autoplay:paused';
        window.eventBus.emit(autoPlayPausedEvent, {
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
            console.log(`[AudioControls] 🎵 Playing word: "${currentWord?.english || '(unknown)'}" at index ${this.currentIndex} (${this.currentIndex + 1} of ${window.pteVocabularyManager.getTotalWords()})`);

            // Update display immediately before playing audio
            if (window.uiController && typeof window.uiController.displayWord === 'function') {
                window.uiController.displayWord(currentWord, this.currentIndex);
            } else {
                // Fallback: emit content display event for UI update
                const contentDisplayEvent = this.config.get('events.content.display') || 'content:display';
                window.eventBus.emit(contentDisplayEvent, {
                    word: currentWord,
                    index: this.currentIndex
                });
            }

            // Emit word play start event (from Config.js)
            const wordPlayStartedEvent = this.config.get('events.audio.word.started') || 'audio:word:started';
            window.eventBus.emit(wordPlayStartedEvent, {
                word: currentWord,
                index: this.currentIndex
            });

            // Start TTS - display will be updated when speech actually begins
            await this.handleWordRepetition(currentWord);

            console.log(`[AudioControls] ✅ Finished speaking "${currentWord.english}", isPlaying=${this.isPlaying}`);

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

        console.log(`[AudioControls] 📅 Scheduling next word after ${this.delay}ms delay...`);

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
        console.log(`[AudioControls] ⏭️ Advanced to next word: index ${this.currentIndex} (${this.currentIndex + 1} of ${totalWords})`);

        if (this.currentIndex >= totalWords) {
            // Reached end of current dataset/book
            console.log(`[AudioControls] 🏁 Reached end of dataset`);
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

    // Deprecated methods removed - use SettingsModule with events instead

    /**
     * SIMPLIFIED: Play current item in practice mode (RS/ASQ/WFD)
     */
    async playCurrentItem() {
        if (!this.isPlaying || !window.currentItem) return;

        try {
            const mode = this.getPracticeMode();
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
        const currentMode = this.getPracticeMode();
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
        const currentMode = this.getPracticeMode();
        window.uiController.displayContent(prevItem, currentMode);
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * Set the current index and update UI to display the word at that index
     * @param {number} index - The index to set
     */
    setCurrentIndex(index) {
        // Ensure index is within valid range
        if (!window.pteVocabularyManager) return;

        const totalWords = window.pteVocabularyManager.getTotalWords() || 0;
        if (totalWords === 0) return;

        // Bound index to valid range
        this.currentIndex = Math.max(0, Math.min(index, totalWords - 1));
        console.log(`[AudioControls] Setting current index to ${this.currentIndex}`);

        // Get the current word at this index
        const currentWord = window.pteVocabularyManager.getCurrentWord(this.currentIndex);

        // Update the UI with this word
        if (currentWord && window.uiController && typeof window.uiController.displayWord === 'function') {
            console.log(`[AudioControls] Updating UI to show word: ${currentWord.english}`);
            window.uiController.displayWord(currentWord, this.currentIndex);
        } else if (window.eventBus) {
            // Fallback: emit content display event
            const contentDisplayEvent = this.config.get('events.content.display') || 'content:display';
            window.eventBus.emit(contentDisplayEvent, {
                word: currentWord,
                index: this.currentIndex
            });
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global audio controls instance
const audioControls = new AudioControls();

// Expose as global reference for PTE app
window.audioControls = audioControls;