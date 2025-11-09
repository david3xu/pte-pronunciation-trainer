/**
 * AudioControls - Type-safe audio playback and navigation
 * Handles play/pause/repeat functionality and timing for both vocabulary and practice modes
 *
 * This is the TypeScript version of src/js/audio/AudioControls.js
 * ARCHITECTURE: Zustand state management
 * - Replaced EventBus with Zustand store subscriptions
 * - Settings synchronized with Settings store
 * - State changes trigger reactive updates across components
 * - Single source of truth: Zustand stores → AudioControls → TTSEngine
 */
import { useAppStore } from '../stores/index.js';
/**
 * Type-safe Audio Controls with Zustand integration
 * Manages playback, navigation, and repeat modes
 */
export class AudioControls {
    // Dependencies
    config;
    // Playback state (local state, not in store - specific to AudioControls instance)
    isPlaying = false;
    currentIndex = 0;
    autoPlayTimeout = null;
    // Settings (synchronized with Zustand store)
    delay = null;
    repeatMode = null;
    // Store subscriptions (for cleanup)
    unsubscribers = [];
    constructor(config) {
        this.config = config || window.appConfig || null;
        // Initialize settings from store
        this._initializeFromStore();
        // Setup Zustand store subscriptions (replaces EventBus listeners)
        this._setupStoreSubscriptions();
    }
    /**
     * Initialize settings from Zustand store
     */
    _initializeFromStore() {
        // Initialize delay from config default
        const defaultDelay = this.config.get('tts.delays.normal');
        this.delay = defaultDelay;
        this.repeatMode = 'once'; // Default
        console.log('[AudioControls] Initialized from Zustand store');
    }
    /**
     * Cleanup subscriptions
     */
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
    /**
     * Safely get current practice mode from Zustand Settings store
     */
    getPracticeMode() {
        const practiceMode = useAppStore.getState().settings.practiceMode;
        return practiceMode || this.config.get('data.defaults.practiceMode');
    }
    /**
     * Setup Zustand store subscriptions (replaces EventBus listeners)
     */
    _setupStoreSubscriptions() {
        // Subscribe to vocabulary book changes (learning mode)
        const unsubVocabBook = useAppStore.subscribe((state) => state.settings.vocabularyBook, (vocabularyBook) => {
            console.log(`[AudioControls] 🔄 Vocabulary book changed to ${vocabularyBook}, resetting index to 0`);
            this.setCurrentIndex(0);
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
        });
        this.unsubscribers.push(unsubVocabBook);
        // Subscribe to practice mode changes
        const unsubPracticeMode = useAppStore.subscribe((state) => state.settings.practiceMode, (mode) => {
            console.log(`[AudioControls] 🔄 Practice mode changed to ${mode}, resetting state`);
            if (this.isPlaying) {
                this.pauseAutoPlay();
            }
            if (mode === null) { // vocabulary mode
                this.setCurrentIndex(0);
            }
        });
        this.unsubscribers.push(unsubPracticeMode);
        // Subscribe to dataset changes
        const unsubDataset = useAppStore.subscribe((state) => state.vocabulary.currentDataset, (dataset) => {
            const mode = useAppStore.getState().settings.practiceMode;
            if (dataset.length > 0 && mode !== null) {
                console.log(`[AudioControls] 📚 Practice dataset changed (${dataset.length} items)`);
                if (this.isPlaying) {
                    this.pauseAutoPlay();
                }
            }
        });
        this.unsubscribers.push(unsubDataset);
        // Subscribe to audio store auto-play trigger
        const unsubAudioAutoPlay = useAppStore.subscribe((state) => state.audio.isAutoPlaying, (isAutoPlaying, prevIsAutoPlaying) => {
            // Only start if state changed from false to true
            if (isAutoPlaying && !prevIsAutoPlaying && !this.isPlaying) {
                this.startAutoPlay();
            }
        });
        this.unsubscribers.push(unsubAudioAutoPlay);
        // Subscribe to audio pause trigger
        const unsubAudioPause = useAppStore.subscribe((state) => state.audio.isPaused, (isPaused, prevIsPaused) => {
            // Only pause if state changed from false to true
            if (isPaused && !prevIsPaused && this.isPlaying) {
                this.pauseAutoPlay();
            }
        });
        this.unsubscribers.push(unsubAudioPause);
        // Subscribe to repeat mode changes
        const unsubRepeat = useAppStore.subscribe((state) => state.audio.repeatMode, (repeatMode) => {
            this._setRepeatMode(repeatMode ? 'loop' : 'once');
            console.log(`[AudioControls] Repeat mode changed to ${repeatMode}`);
        });
        this.unsubscribers.push(unsubRepeat);
        console.log('[AudioControls] Zustand store subscriptions setup complete');
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
        // Update audio store (replaces event emission)
        useAppStore.getState().audio.toggleRepeat();
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
        // Check if mode is defined
        if (!currentMode) {
            console.error('[AudioControls] ❌ No practice mode selected');
            useAppStore.getState().ui.showNotification('Please select a practice mode or vocabulary book first.', 'error');
            return;
        }
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
                useAppStore.getState().ui.showNotification('Vocabulary manager not initialized. Please refresh the page.', 'error');
                return;
            }
            // Check if we have words to play
            const totalWords = pteVocabularyManager.getTotalWords();
            console.log(`[AudioControls] Current words count: ${totalWords}`);
            canPlay = totalWords > 0;
            if (!canPlay) {
                console.error('[AudioControls] ❌ No vocabulary loaded - cannot start auto-play');
                useAppStore.getState().ui.showNotification('No vocabulary data loaded. Please refresh the page.', 'error');
                return;
            }
            // Create a current word reference for display
            const currentIndex = this.currentIndex || 0;
            const currentWord = pteVocabularyManager.getCurrentWord(currentIndex);
            // Make sure we have a valid word object
            if (!currentWord) {
                console.error('[AudioControls] ❌ Invalid current word at index:', currentIndex);
                useAppStore.getState().ui.showNotification('Could not find the current word. Please try again.', 'error');
                return;
            }
            // Log current word for debugging
            console.log(`[AudioControls] Current word: ${currentWord?.english || '(unknown)'}`);
            // Update store (replaces content:display event)
            useAppStore.getState().vocabulary.setCurrentItem(currentWord);
            useAppStore.getState().audio.setCurrentIndex(currentIndex);
        }
        else {
            // Practice mode (RS/ASQ/WFD): Check for current item and dataset from store
            const currentDataset = useAppStore.getState().vocabulary.currentDataset;
            const currentItem = useAppStore.getState().vocabulary.currentItem;
            canPlay = !!currentItem && currentDataset.length > 0;
            if (!canPlay) {
                console.error('[AudioControls] ❌ No practice dataset loaded - cannot start auto-play');
                // Check if we need to reload the dataset
                if (!window.datasetManager || !window.uiController) {
                    console.error('[AudioControls] ❌ DatasetManager or UIController not available');
                    useAppStore.getState().ui.showNotification('Required components not initialized. Please refresh the page.', 'error');
                    return;
                }
                // Try to load the dataset via UIController
                console.log('[AudioControls] 🔄 Attempting to load practice dataset via UIController...');
                try {
                    const practiceDatasetSetting = useAppStore.getState().settings.datasetId;
                    if (practiceDatasetSetting && window.uiController.loadPracticeDataset) {
                        console.log(`[AudioControls] 🔄 Loading dataset: ${practiceDatasetSetting}`);
                        // Give feedback to user
                        useAppStore.getState().ui.showNotification(`Loading ${currentMode.toUpperCase()} dataset...`, 'info');
                        // Try to load the practice dataset
                        window.uiController.loadPracticeDataset(currentMode)
                            .then((success) => {
                            if (success && useAppStore.getState().vocabulary.currentItem) {
                                console.log('[AudioControls] ✅ Dataset loaded successfully, starting playback...');
                                // Now we can start playback
                                this.isPlaying = true;
                                this.showPlayingUI();
                                this.playCurrentItem();
                            }
                            else {
                                console.error('[AudioControls] ❌ Failed to load dataset');
                                useAppStore.getState().ui.showNotification(`Failed to load ${currentMode.toUpperCase()} dataset`, 'error');
                            }
                        })
                            .catch((err) => {
                            console.error('[AudioControls] ❌ Error loading dataset:', err);
                            useAppStore.getState().ui.showNotification(`Error loading dataset: ${err.message}`, 'error');
                        });
                        return; // Exit early as we're handling this asynchronously
                    }
                    else {
                        console.error('[AudioControls] ❌ No practice dataset configured');
                        useAppStore.getState().ui.showNotification(`No ${currentMode.toUpperCase()} dataset configured. Please check settings.`, 'error');
                        return;
                    }
                }
                catch (error) {
                    console.error('[AudioControls] ❌ Failed to load dataset:', error);
                    useAppStore.getState().ui.showNotification(`Failed to load ${currentMode.toUpperCase()} dataset`, 'error');
                    return;
                }
            }
            console.log(`[AudioControls] ✅ Practice dataset ready`);
        }
        if (this.isPlaying) {
            console.log('[AudioControls] ⚠️ Already playing, ignoring start request');
            return;
        }
        this.isPlaying = true;
        this.showPlayingUI();
        // Update audio store
        useAppStore.getState().audio.startAutoPlay();
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
        // Update audio store (replaces event emission)
        useAppStore.getState().audio.pauseAutoPlay();
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
            // Update store (replaces content:display event)
            useAppStore.getState().vocabulary.setCurrentItem(currentWord);
            useAppStore.getState().audio.setCurrentIndex(this.currentIndex);
            // Start TTS
            await this.handleWordRepetition(currentWord);
            console.log(`[AudioControls] ✅ Finished speaking "${currentWord.english}", isPlaying=${this.isPlaying}`);
            if (this.isPlaying) {
                await this.scheduleNextWord();
            }
        }
        catch (error) {
            console.error('Error playing word:', error);
            useAppStore.getState().ui.showNotification('Error playing word', 'error');
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
        // Change to next book via Zustand store (replaces event emission)
        useAppStore.getState().settings.updateSetting('vocabularyBook', nextMode);
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
        // Update audio store
        useAppStore.getState().audio.navigateNext();
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
        // Update audio store
        useAppStore.getState().audio.navigatePrev();
    }
    /**
     * Update current display
     */
    updateCurrentDisplay() {
        const pteVocabularyManager = window.pteVocabularyManager;
        const currentWord = pteVocabularyManager.getCurrentWord(this.currentIndex);
        if (currentWord) {
            // Update store (replaces event emission)
            useAppStore.getState().vocabulary.setCurrentItem(currentWord);
            useAppStore.getState().audio.setCurrentIndex(this.currentIndex);
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
        const currentItem = useAppStore.getState().vocabulary.currentItem;
        if (!this.isPlaying || !currentItem)
            return;
        try {
            const mode = this.getPracticeMode();
            console.log(`[AudioControls] 🎵 playCurrentItem - Mode: ${mode}`);
            console.log(`[AudioControls] Current item:`, currentItem);
            // IMPORTANT: Refresh display when PLAY is clicked
            const uiController = window.uiController;
            uiController.displayContent(currentItem, mode);
            // Get text to speak based on mode
            let textToSpeak = '';
            const item = currentItem;
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
            useAppStore.getState().ui.showNotification('Error playing item', 'error');
        }
    }
    /**
     * Navigate to next item in practice mode
     */
    nextItem() {
        const currentDataset = useAppStore.getState().vocabulary.currentDataset;
        if (currentDataset.length === 0)
            return;
        const currentIndex = useAppStore.getState().audio.currentIndex;
        let nextIndex = currentIndex + 1;
        console.log(`[AudioControls] ⏭️ nextItem - Index: ${nextIndex}/${currentDataset.length}`);
        if (nextIndex >= currentDataset.length) {
            // Reached end - loop or stop
            if (this.repeatMode === 'loop') {
                nextIndex = 0;
                console.log(`[AudioControls] 🔄 Looping back to start`);
            }
            else {
                this.handlePlaybackEnd();
                return;
            }
        }
        // Display next item
        const nextItem = currentDataset[nextIndex];
        if (!nextItem) {
            console.error(`[AudioControls] No item found at index ${nextIndex}`);
            return;
        }
        // Update store (replaces window.currentItem assignment)
        useAppStore.getState().vocabulary.setCurrentItem(nextItem);
        useAppStore.getState().audio.setCurrentIndex(nextIndex);
        console.log(`[AudioControls] Displaying next item:`, nextItem);
        const currentMode = this.getPracticeMode();
        window.uiController.displayContent(nextItem, currentMode);
        // Update audio store
        useAppStore.getState().audio.navigateNext();
    }
    /**
     * Navigate to previous item in practice mode
     */
    prevItem() {
        const currentDataset = useAppStore.getState().vocabulary.currentDataset;
        if (currentDataset.length === 0)
            return;
        const currentIndex = useAppStore.getState().audio.currentIndex;
        let prevIndex = currentIndex - 1;
        console.log(`[AudioControls] ⏮️ prevItem - Index: ${prevIndex}/${currentDataset.length}`);
        if (prevIndex < 0) {
            prevIndex = currentDataset.length - 1;
            console.log(`[AudioControls] 🔄 Wrapping to end`);
        }
        // Display previous item
        const prevItem = currentDataset[prevIndex];
        if (!prevItem) {
            console.error(`[AudioControls] No item found at index ${prevIndex}`);
            return;
        }
        // Update store (replaces window.currentItem assignment)
        useAppStore.getState().vocabulary.setCurrentItem(prevItem);
        useAppStore.getState().audio.setCurrentIndex(prevIndex);
        console.log(`[AudioControls] Displaying previous item:`, prevItem);
        const currentMode = this.getPracticeMode();
        window.uiController.displayContent(prevItem, currentMode);
        // Update audio store
        useAppStore.getState().audio.navigatePrev();
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
        // Update store (replaces event emission)
        if (currentWord) {
            useAppStore.getState().vocabulary.setCurrentItem(currentWord);
            useAppStore.getState().audio.setCurrentIndex(this.currentIndex);
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