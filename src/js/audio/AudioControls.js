/**
 * AudioControls - Type-safe audio playback and navigation
 * Handles play/pause/repeat functionality and timing for both vocabulary and practice modes
 *
 * This is the TypeScript version of src/js/audio/AudioControls.js
 * ARCHITECTURE: Event-driven initialization
 * - No hard-coded settings defaults in constructor (delay, repeatMode)
 * - All settings initialized via SettingsModule events on app startup
 * - Ensures consistent behavior across all vocabulary books
 * - Single source of truth: Config.js → SettingsModule → AudioControls → TTSEngine
 */
/**
 * Type-safe Audio Controls
 * Manages playback, navigation, and repeat modes
 */
export class AudioControls {
    // Dependencies
    config;
    // Playback state
    isPlaying = false;
    currentIndex = 0;
    autoPlayTimeout = null;
    // Settings (initialized via events from SettingsModule)
    delay = null;
    repeatMode = null;
    constructor(config) {
        this.config = config || window.appConfig || null;
        // Attach event listeners for settings changes and audio control
        this._attachEventListeners();
    }
    /**
     * Safely get current practice mode from SettingsModule or Config.js fallback
     */
    getPracticeMode() {
        const settingsModule = window.settingsModule;
        if (settingsModule && typeof settingsModule.get === 'function') {
            return settingsModule.get('practiceMode') || this.config.get('data.defaults.practiceMode');
        }
        return this.config.get('data.defaults.practiceMode');
    }
    /**
     * Attach event listeners for settings changes and audio control events
     */
    _attachEventListeners() {
        const eventBus = window.eventBus;
        // Listen to settings:changed event
        const settingsChangedEvent = this.config.get('events.settings.changed');
        eventBus.on(settingsChangedEvent, this._handleSettingChange.bind(this));
        // Listen for learning mode changes to reset index
        eventBus.on(settingsChangedEvent, (data) => {
            if (data.key === 'learningMode') {
                console.log(`[AudioControls] 🔄 Learning mode changed to ${data.value}, resetting index to 0`);
                this.setCurrentIndex(0);
                if (this.isPlaying) {
                    this.pauseAutoPlay();
                }
            }
        });
        // Also listen for the standardized event as a backup
        const learningModeChangedEvent = this.config.get('events.mode.learning.changed');
        eventBus.on(learningModeChangedEvent, () => {
            console.log('[AudioControls] 🔄 Learning mode changed event received, resetting index to 0');
            this.setCurrentIndex(0);
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
        });
        // Listen for practice mode changes to reset state
        const practiceModeChangedEvent = this.config.get('events.mode.practice.changed');
        eventBus.on(practiceModeChangedEvent, (data) => {
            console.log(`[AudioControls] 🔄 Practice mode changed to ${data.mode}, resetting state`);
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
            if (data.mode === 'vocabulary') {
                this.setCurrentIndex(0);
            }
        });
        // Listen for dataset changes in practice modes
        const datasetChangedEvent = this.config.get('events.dataset.practice.changed');
        eventBus.on(datasetChangedEvent, (data) => {
            console.log(`[AudioControls] 📚 Practice dataset changed: ${data.datasetId} (${data.itemCount} items)`);
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
        });
        // Audio control events
        const audioStartEvent = this.config.get('events.audio.autoplay.start');
        const audioPauseEvent = this.config.get('events.audio.autoplay.pause');
        const audioNextEvent = this.config.get('events.audio.navigate.next');
        const audioPrevEvent = this.config.get('events.audio.navigate.prev');
        eventBus.on(audioStartEvent, () => this.startAutoPlay());
        eventBus.on(audioPauseEvent, () => this.pauseAutoPlay());
        eventBus.on(audioNextEvent, ({ mode }) => {
            if (mode && mode !== 'vocabulary') {
                this.nextItem();
            }
            else {
                this.nextWord();
            }
        });
        eventBus.on(audioPrevEvent, ({ mode }) => {
            if (mode && mode !== 'vocabulary') {
                this.prevItem();
            }
            else {
                this.previousWord();
            }
        });
    }
    /**
     * Handle setting changes from SettingsModule
     */
    _handleSettingChange({ key, value }) {
        if (key === 'delay') {
            this.delay = parseInt(value) || this.config.get('tts.delays.normal');
            console.log(`[AudioControls] Delay changed to ${this.delay}ms`);
        }
        else if (key === 'repeat') {
            this._setRepeatMode(value);
            console.log(`[AudioControls] Repeat mode changed to ${value}`);
        }
        else if (key === 'practiceMode') {
            console.log(`[AudioControls] Practice mode changed to ${value}`);
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
            this.setCurrentIndex(0);
        }
        else if (key === 'practiceDataset') {
            console.log(`[AudioControls] Practice dataset changed to ${value}`);
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
        }
    }
    /**
     * Set repeat mode for audio playback
     */
    _setRepeatMode(mode) {
        const validModes = this.config.get('audio.repeatModes') || ['once', 'loop'];
        // Default to 'once' if invalid mode provided
        this.repeatMode = validModes.includes(mode) ? mode : 'once';
        // Convert repeat mode to target number of repetitions
        const repeatModeToCount = {
            'once': 1,
            'twice': 2,
            'intensive': 3,
            'loop': 1
        };
        const targetRepeats = repeatModeToCount[this.repeatMode] || 1;
        // Set target repeats in TTSEngine
        const ttsEngine = window.ttsEngine;
        if (ttsEngine && typeof ttsEngine.setRepeatMode === 'function') {
            ttsEngine.setRepeatMode(targetRepeats);
            console.log(`[AudioControls] Set TTSEngine targetRepeats to ${targetRepeats} for mode '${this.repeatMode}'`);
        }
        // Emit event
        const repeatModeChangedEvent = this.config.get('events.audio.repeat.changed') || 'audio:repeat:changed';
        window.eventBus.emit(repeatModeChangedEvent, {
            mode: this.repeatMode,
            targetRepeats: targetRepeats,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Start auto-play
     */
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
            const pteVocabularyManager = window.pteVocabularyManager;
            if (!pteVocabularyManager) {
                console.error('[AudioControls] ❌ PTEVocabularyManager not available - cannot start auto-play');
                window.progressTracker?.showError('Vocabulary manager not initialized. Please refresh the page.');
                return;
            }
            // Check if we have words to play
            const totalWords = pteVocabularyManager.getTotalWords();
            console.log(`[AudioControls] Current words count: ${totalWords}`);
            canPlay = totalWords > 0;
            if (!canPlay) {
                console.error('[AudioControls] ❌ No vocabulary loaded - cannot start auto-play');
                window.progressTracker?.showError('No vocabulary data loaded. Please refresh the page.');
                return;
            }
            // Create a current word reference for display
            const currentIndex = this.currentIndex || 0;
            const currentWord = pteVocabularyManager.getCurrentWord(currentIndex);
            // Make sure we have a valid word object
            if (!currentWord) {
                console.error('[AudioControls] ❌ Invalid current word at index:', currentIndex);
                window.progressTracker?.showError('Could not find the current word. Please try again.');
                return;
            }
            // Log current word for debugging
            console.log(`[AudioControls] Current word: ${currentWord?.english || '(unknown)'}`);
            // Update display immediately
            const uiController = window.uiController;
            if (uiController && typeof uiController.displayWord === 'function') {
                uiController.displayWord(currentWord, currentIndex);
            }
        }
        else {
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
                            .then((success) => {
                            if (success && window.currentItem) {
                                console.log('[AudioControls] ✅ Dataset loaded successfully, starting playback...');
                                // Now we can start playback
                                this.isPlaying = true;
                                this.showPlayingUI();
                                this.playCurrentItem();
                            }
                            else {
                                console.error('[AudioControls] ❌ Failed to load dataset');
                                window.progressTracker?.showError(`Failed to load ${currentMode.toUpperCase()} dataset`);
                            }
                        })
                            .catch((err) => {
                            console.error('[AudioControls] ❌ Error loading dataset:', err);
                            window.progressTracker?.showError(`Error loading dataset: ${err.message}`);
                        });
                        return; // Exit early as we're handling this asynchronously
                    }
                    else {
                        console.error('[AudioControls] ❌ No practice dataset configured');
                        window.progressTracker?.showError(`No ${currentMode.toUpperCase()} dataset configured. Please check settings.`);
                        return;
                    }
                }
                catch (error) {
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
        }
        else {
            this.playCurrentItem();
        }
    }
    /**
     * Pause auto-play
     */
    pauseAutoPlay() {
        if (!this.isPlaying)
            return;
        this.isPlaying = false;
        this.showPausedUI();
        if (this.autoPlayTimeout) {
            clearTimeout(this.autoPlayTimeout);
            this.autoPlayTimeout = null;
        }
        // Stop any ongoing speech
        window.ttsEngine.stopSpeaking();
        window.progressTracker.updateStatus('Paused');
        // Emit event
        const autoPlayPausedEvent = this.config.get('events.audio.autoplay.paused') || 'audio:autoplay:paused';
        window.eventBus.emit(autoPlayPausedEvent, {
            currentIndex: this.currentIndex
        });
    }
    /**
     * Play current word (vocabulary mode)
     */
    async playCurrentWord() {
        if (!this.isPlaying)
            return;
        const pteVocabularyManager = window.pteVocabularyManager;
        const currentWord = pteVocabularyManager.getCurrentWord(this.currentIndex);
        if (!currentWord) {
            this.handlePlaybackEnd();
            return;
        }
        try {
            console.log(`[AudioControls] 🎵 Playing word: "${currentWord?.english || '(unknown)'}" at index ${this.currentIndex} (${this.currentIndex + 1} of ${pteVocabularyManager.getTotalWords()})`);
            // Update display immediately before playing audio
            const uiController = window.uiController;
            if (uiController && typeof uiController.displayWord === 'function') {
                uiController.displayWord(currentWord, this.currentIndex);
            }
            else {
                // Fallback: emit content display event for UI update
                const contentDisplayEvent = this.config.get('events.content.display') || 'content:display';
                window.eventBus.emit(contentDisplayEvent, {
                    word: currentWord,
                    index: this.currentIndex
                });
            }
            // Emit word play start event
            const wordPlayStartedEvent = this.config.get('events.audio.word.started') || 'audio:word:started';
            window.eventBus.emit(wordPlayStartedEvent, {
                word: currentWord,
                index: this.currentIndex
            });
            // Start TTS
            await this.handleWordRepetition(currentWord);
            console.log(`[AudioControls] ✅ Finished speaking "${currentWord.english}", isPlaying=${this.isPlaying}`);
            if (this.isPlaying) {
                await this.scheduleNextWord();
            }
        }
        catch (error) {
            console.error('Error playing word:', error);
            window.progressTracker.showError('Error playing word');
        }
    }
    /**
     * Handle word repetition based on repeat mode
     */
    async handleWordRepetition(word) {
        const ttsEngine = window.ttsEngine;
        const targetRepeats = ttsEngine.getTargetRepeats();
        for (let repeatCount = 0; repeatCount < targetRepeats; repeatCount++) {
            if (!this.isPlaying)
                break;
            await ttsEngine.pronounceWord(word, repeatCount);
            // Add delay between repetitions (except after last repetition)
            if (repeatCount < targetRepeats - 1 && this.isPlaying) {
                await this.wait((this.delay || 2000) / 2); // Shorter delay between repetitions
            }
        }
    }
    /**
     * Schedule next word after delay
     */
    async scheduleNextWord() {
        if (!this.isPlaying)
            return;
        console.log(`[AudioControls] 📅 Scheduling next word after ${this.delay}ms delay...`);
        // Wait for the configured delay before next word
        this.autoPlayTimeout = setTimeout(async () => {
            if (this.isPlaying) {
                this.advanceToNextWord();
                await this.playCurrentWord();
            }
        }, this.delay || 2000);
    }
    /**
     * Advance to next word
     */
    advanceToNextWord() {
        const pteVocabularyManager = window.pteVocabularyManager;
        const totalWords = pteVocabularyManager.getTotalWords();
        this.currentIndex++;
        console.log(`[AudioControls] ⏭️ Advanced to next word: index ${this.currentIndex} (${this.currentIndex + 1} of ${totalWords})`);
        if (this.currentIndex >= totalWords) {
            // Reached end of current dataset/book
            console.log(`[AudioControls] 🏁 Reached end of dataset`);
            this.handleDatasetCompletion();
            return;
        }
    }
    /**
     * Handle playback end
     */
    handlePlaybackEnd() {
        console.log('[AudioControls] 🛑 Playback ended');
        this.pauseAutoPlay();
        window.progressTracker.updateStatus('Playback completed');
    }
    /**
     * Handle dataset completion
     */
    async handleDatasetCompletion() {
        // Get current practice mode to determine loop behavior
        const settingsModule = window.settingsModule;
        const practiceMode = settingsModule ?
            settingsModule.getSetting('practiceMode') : 'vocabulary';
        if (practiceMode === 'vocabulary') {
            // Vocabulary mode: Auto-loop to next book in circle
            await this.autoLoopToNextBook();
        }
        else {
            // Sentence mode (RS/ASQ/WFD): Restart current dataset
            this.restartCurrentDataset();
        }
    }
    /**
     * Auto-loop to next vocabulary book
     */
    async autoLoopToNextBook() {
        const pteVocabularyManager = window.pteVocabularyManager;
        const currentMode = pteVocabularyManager.currentLearningMode;
        const nextMode = pteVocabularyManager.getNextLearningMode();
        const learningModes = this.config.get('data.learningModes') || [];
        const currentBook = learningModes.find((m) => m.id === currentMode);
        const nextBook = learningModes.find((m) => m.id === nextMode);
        console.log(`[AudioControls] 🔄 Vocabulary book completed: ${currentBook?.label || currentMode}`);
        console.log(`[AudioControls] ➡️ Auto-looping to next book: ${nextBook?.label || nextMode}`);
        // Update status message
        window.progressTracker.updateStatus(`🎉 ${currentBook?.label || currentMode} completed! ` +
            `🔄 Auto-looping to ${nextBook?.label || nextMode}...`);
        // Change to next book via event
        const settingsRequestChangeEvent = this.config.get('events.settings.requestChange');
        window.eventBus.emit(settingsRequestChangeEvent, {
            key: 'learningMode',
            value: nextMode
        });
        // Reset to first word
        this.currentIndex = 0;
        // STOP auto-playing - user must press play again to continue
        this.pauseAutoPlay();
        console.log('[AudioControls] ⏸️ Auto-play paused - press PLAY to continue with new book');
    }
    /**
     * Restart current dataset
     */
    restartCurrentDataset() {
        const settingsModule = window.settingsModule;
        const practiceMode = settingsModule ?
            settingsModule.getSetting('practiceMode') : 'vocabulary';
        console.log(`[AudioControls] 🔄 Dataset completed: ${practiceMode.toUpperCase()}`);
        console.log(`[AudioControls] ➡️ Restarting dataset from beginning...`);
        // Update status message
        window.progressTracker.updateStatus(`🎉 ${practiceMode.toUpperCase()} dataset completed! ` +
            `🔄 Restarting from beginning...`);
        // Loop back to beginning
        this.currentIndex = 0;
        // STOP auto-playing
        this.pauseAutoPlay();
        console.log('[AudioControls] ⏸️ Auto-play paused - press PLAY to restart dataset');
    }
    /**
     * Navigate to next word
     */
    nextWord() {
        const pteVocabularyManager = window.pteVocabularyManager;
        const totalWords = pteVocabularyManager.getTotalWords();
        if (totalWords === 0)
            return;
        // Reset repeat count when manually navigating
        window.ttsEngine.currentRepeatCount = 0;
        this.currentIndex++;
        if (this.currentIndex >= totalWords) {
            // Loop to first word in current book
            this.currentIndex = 0;
        }
        this.updateCurrentDisplay();
    }
    /**
     * Navigate to previous word
     */
    previousWord() {
        const pteVocabularyManager = window.pteVocabularyManager;
        const totalWords = pteVocabularyManager.getTotalWords();
        if (totalWords === 0)
            return;
        // Reset repeat count when manually navigating
        window.ttsEngine.currentRepeatCount = 0;
        this.currentIndex--;
        if (this.currentIndex < 0) {
            // Loop to last word in current book
            this.currentIndex = totalWords - 1;
        }
        this.updateCurrentDisplay();
    }
    /**
     * Update current display
     */
    updateCurrentDisplay() {
        const pteVocabularyManager = window.pteVocabularyManager;
        const currentWord = pteVocabularyManager.getCurrentWord(this.currentIndex);
        if (currentWord) {
            // Emit standardized event
            const contentDisplayEvent = this.config.get('events.content.display');
            window.eventBus.emit(contentDisplayEvent, {
                word: currentWord,
                index: this.currentIndex
            });
        }
    }
    /**
     * Show playing UI
     */
    showPlayingUI() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (startBtn)
            startBtn.style.display = 'none';
        if (pauseBtn)
            pauseBtn.style.display = 'inline-block';
        const uiController = window.uiController;
        if (uiController) {
            uiController.updateButtons();
        }
    }
    /**
     * Show paused UI
     */
    showPausedUI() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (startBtn)
            startBtn.style.display = 'inline-block';
        if (pauseBtn)
            pauseBtn.style.display = 'none';
        const uiController = window.uiController;
        if (uiController) {
            uiController.updateButtons();
        }
    }
    /**
     * Play current item in practice mode (RS/ASQ/WFD)
     */
    async playCurrentItem() {
        if (!this.isPlaying || !window.currentItem)
            return;
        try {
            const mode = this.getPracticeMode();
            const item = window.currentItem;
            console.log(`[AudioControls] 🎵 playCurrentItem - Mode: ${mode}`);
            console.log(`[AudioControls] Current item:`, item);
            // IMPORTANT: Refresh display when PLAY is clicked
            const uiController = window.uiController;
            uiController.displayContent(item, mode);
            // Get text to speak based on mode
            let textToSpeak = '';
            if (mode === 'rs' && item.content.sentence) {
                textToSpeak = item.content.sentence;
            }
            else if (mode === 'asq' && item.content.question) {
                textToSpeak = item.content.question;
            }
            else if (mode === 'wfd' && item.content.sentence) {
                textToSpeak = item.content.sentence;
            }
            if (textToSpeak) {
                console.log(`[AudioControls] 🔊 Speaking: "${textToSpeak.substring(0, 50)}..."`);
                // Use pronounceText() method
                await window.ttsEngine.pronounceText(textToSpeak);
            }
            // Auto-advance to next item after delay (if in auto-play mode)
            if (this.isPlaying) {
                this.autoPlayTimeout = setTimeout(async () => {
                    if (this.isPlaying) {
                        this.nextItem();
                        await this.playCurrentItem();
                    }
                }, this.delay || 2000);
            }
        }
        catch (error) {
            console.error('Error playing item:', error);
            window.progressTracker.showError('Error playing item');
        }
    }
    /**
     * Navigate to next item in practice mode
     */
    nextItem() {
        const currentDataset = window.currentDataset;
        if (!currentDataset)
            return;
        let currentDatasetIndex = window.currentDatasetIndex || 0;
        currentDatasetIndex++;
        console.log(`[AudioControls] ⏭️ nextItem - Index: ${currentDatasetIndex}/${currentDataset.items.length}`);
        if (currentDatasetIndex >= currentDataset.items.length) {
            // Reached end - loop or stop
            if (this.repeatMode === 'loop') {
                currentDatasetIndex = 0;
                console.log(`[AudioControls] 🔄 Looping back to start`);
            }
            else {
                this.handlePlaybackEnd();
                return;
            }
        }
        // Display next item
        const nextItem = currentDataset.items[currentDatasetIndex];
        window.currentDatasetIndex = currentDatasetIndex;
        window.currentItem = nextItem; // IMPORTANT: Update currentItem for PLAY button
        console.log(`[AudioControls] Displaying next item:`, nextItem);
        const currentMode = this.getPracticeMode();
        window.uiController.displayContent(nextItem, currentMode);
    }
    /**
     * Navigate to previous item in practice mode
     */
    prevItem() {
        const currentDataset = window.currentDataset;
        if (!currentDataset)
            return;
        let currentDatasetIndex = window.currentDatasetIndex || 0;
        currentDatasetIndex--;
        console.log(`[AudioControls] ⏮️ prevItem - Index: ${currentDatasetIndex}/${currentDataset.items.length}`);
        if (currentDatasetIndex < 0) {
            currentDatasetIndex = currentDataset.items.length - 1;
            console.log(`[AudioControls] 🔄 Wrapping to end`);
        }
        // Display previous item
        const prevItem = currentDataset.items[currentDatasetIndex];
        window.currentDatasetIndex = currentDatasetIndex;
        window.currentItem = prevItem; // IMPORTANT: Update currentItem for PLAY button
        console.log(`[AudioControls] Displaying previous item:`, prevItem);
        const currentMode = this.getPracticeMode();
        window.uiController.displayContent(prevItem, currentMode);
    }
    /**
     * Get current index
     */
    getCurrentIndex() {
        return this.currentIndex;
    }
    /**
     * Set the current index and update UI
     */
    setCurrentIndex(index) {
        const pteVocabularyManager = window.pteVocabularyManager;
        if (!pteVocabularyManager)
            return;
        const totalWords = pteVocabularyManager.getTotalWords() || 0;
        if (totalWords === 0)
            return;
        // Bound index to valid range
        this.currentIndex = Math.max(0, Math.min(index, totalWords - 1));
        console.log(`[AudioControls] Setting current index to ${this.currentIndex}`);
        // Get the current word at this index
        const currentWord = pteVocabularyManager.getCurrentWord(this.currentIndex);
        // Update the UI with this word
        const uiController = window.uiController;
        if (currentWord && uiController && typeof uiController.displayWord === 'function') {
            console.log(`[AudioControls] Updating UI to show word: ${currentWord.english}`);
            uiController.displayWord(currentWord, this.currentIndex);
        }
        else if (window.eventBus) {
            // Fallback: emit content display event
            const contentDisplayEvent = this.config.get('events.content.display') || 'content:display';
            window.eventBus.emit(contentDisplayEvent, {
                word: currentWord,
                index: this.currentIndex
            });
        }
    }
    /**
     * Wait helper
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// Export singleton instance
export const audioControls = new AudioControls();
// Default export
export default audioControls;
// Expose as global reference
if (typeof window !== 'undefined') {
    window.audioControls = audioControls;
}
//# sourceMappingURL=AudioControls.js.map