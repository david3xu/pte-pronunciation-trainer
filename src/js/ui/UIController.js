/**
 * UIController - Type-safe DOM manipulation and display updates
 * Handles all UI interactions, content display, and event orchestration
 *
 * This is the TypeScript version of src/js/ui/UIController.js
 * Provides type-safe DOM manipulation for both vocabulary and practice modes
 */
/**
 * Type-safe UI Controller
 * Manages DOM updates, content display, and user interactions
 */
export class UIController {
    // Configuration
    config;
    // State
    pronunciationPreference;
    currentWordPronunciations = null;
    state;
    // Current word tracking (for pronunciation toggle)
    currentWord = null;
    currentIndex = 0;
    constructor(config) {
        this.config = config || window.appConfig || null;
        this.pronunciationPreference = this.config.get('modes.pronunciation.british');
        // Initialize local state
        this.state = {
            currentDatasetIndex: 0,
            currentPracticeMode: this.config.get('modes.practice.vocabulary'),
            currentDataset: null,
            currentItem: null
        };
        this.setupEventListeners();
    }
    /**
     * Get module instance with error handling
     */
    getModule(moduleName, required = false, defaultValue = null) {
        const module = window[moduleName];
        if (!module && required) {
            const error = new Error(`Required module '${moduleName}' not found`);
            this.handleError(`Missing required module: ${moduleName}`, error);
            throw error;
        }
        return module || defaultValue;
    }
    /**
     * Centralized error handling
     */
    handleError(message, error, showToUser = true, level = 'error') {
        const details = error instanceof Error ? error.message : error;
        const logMessage = details ? `${message}: ${details}` : message;
        // Log to console
        if (level === 'warn') {
            console.warn(`[UIController] ⚠️ ${logMessage}`);
        }
        else if (level === 'info') {
            console.info(`[UIController] ℹ️ ${logMessage}`);
        }
        else {
            console.error(`[UIController] ❌ ${logMessage}`);
        }
        // Show to user if requested
        if (showToUser) {
            const progressTracker = this.getModule('progressTracker');
            if (progressTracker) {
                progressTracker.showError(message);
            }
        }
        // Emit error event
        const errorEvent = this.config.get('events.ui.error');
        const eventBus = window.eventBus;
        if (errorEvent && eventBus) {
            eventBus.emit(errorEvent, {
                source: 'UIController',
                message,
                details: details || null,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Get current practice mode from state, SettingsModule, or config fallback
     */
    getPracticeMode() {
        // First check local state
        if (this.state && this.state.currentPracticeMode) {
            return this.state.currentPracticeMode;
        }
        // Next try SettingsModule
        const settingsModule = this.getModule('settingsModule');
        if (settingsModule && typeof settingsModule.get === 'function') {
            return settingsModule.get('practiceMode') || this.config.get('data.defaults.practiceMode');
        }
        // Fallback to config default
        return this.config.get('data.defaults.practiceMode');
    }
    /**
     * Setup event listeners for UI updates
     */
    setupEventListeners() {
        const eventBus = window.eventBus;
        // Vocabulary loaded event
        const vocabularyLoadedEvent = this.config.get('events.vocabulary.loaded');
        eventBus.on(vocabularyLoadedEvent, () => {
            this.updateUI();
        });
        // Vocabulary difficulty filtered event
        const difficultyFilteredEvent = this.config.get('events.vocabulary.difficulty.filtered');
        eventBus.on(difficultyFilteredEvent, () => {
            this.updateBookDisplay();
            this.updateButtons();
        });
        // Learning mode changes
        const learningModeChangedEvent = this.config.get('events.mode.learning.changed');
        eventBus.on(learningModeChangedEvent, () => {
            const audioControls = window.audioControls;
            if (audioControls) {
                audioControls.setCurrentIndex(0);
            }
            this.updateBookDisplay();
            this.updateButtons();
            this.displayFirstWord();
        });
        // Practice mode changes
        const practiceModeChangedEvent = this.config.get('events.mode.practice.changed');
        eventBus.on(practiceModeChangedEvent, (data) => {
            const defaultMode = this.config.get('modes.practice.vocabulary');
            const mode = data?.mode || defaultMode;
            console.log(`[UIController] 🔄 Practice mode changed event received - Switching to: ${mode}`);
            // Prevent excessive event handling during initialization
            if (window.initializing) {
                console.log(`[UIController] Skipping mode change during initialization`);
                return;
            }
            this.handlePracticeModeChange(mode);
        });
        // Unified content display events
        const contentDisplayEvent = this.config.get('events.content.display');
        eventBus.on(contentDisplayEvent, (data) => {
            this.displayCurrent(data);
        });
        // TTS speaking started
        const ttsSpeakingStartedEvent = this.config.get('events.tts.speaking.started');
        eventBus.on(ttsSpeakingStartedEvent, (data) => {
            this.displayCurrent(data);
        });
        // Progress events
        const progressUpdatedEvent = this.config.get('events.progress.updated') || 'progress:updated';
        eventBus.on(progressUpdatedEvent, () => {
            // Progress display is handled by ProgressTracker
        });
        // Settings changed
        const settingsChangedEvent = this.config.get('events.settings.changed');
        eventBus.on(settingsChangedEvent, (data) => {
            if (data.key === 'learningMode') {
                this.updateBookDisplay();
            }
        });
    }
    /**
     * Bind event listeners to DOM elements
     */
    bindEventListeners() {
        // Bind all settings controls
        this.bindSettingControls();
        const eventBus = window.eventBus;
        // Control buttons
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const audioStartEvent = this.config.get('events.audio.autoplay.start');
                eventBus.emit(audioStartEvent);
            });
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                const audioPauseEvent = this.config.get('events.audio.autoplay.pause');
                eventBus.emit(audioPauseEvent);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const mode = this.getPracticeMode();
                const audioNextEvent = this.config.get('events.audio.navigate.next');
                eventBus.emit(audioNextEvent, { mode });
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const mode = this.getPracticeMode();
                const audioPrevEvent = this.config.get('events.audio.navigate.prev');
                eventBus.emit(audioPrevEvent, { mode });
            });
        }
        // Pronunciation toggle button
        const pronunciationToggleBtn = document.getElementById('pronunciationToggleBtn');
        if (pronunciationToggleBtn) {
            pronunciationToggleBtn.addEventListener('click', () => {
                const newPreference = this.togglePronunciation();
                const britishFlag = this.config.get('ui.elements.pronunciationToggle.british');
                const americanFlag = this.config.get('ui.elements.pronunciationToggle.american');
                const british = this.config.get('modes.pronunciation.british');
                pronunciationToggleBtn.textContent = newPreference === british ? britishFlag : americanFlag;
                pronunciationToggleBtn.title = `Current: ${newPreference === british ? 'British' : 'American'} pronunciation`;
            });
        }
        // Initialize dropdowns
        this.initializeDropdowns();
        this.updateBookDisplay();
    }
    /**
     * Unified display orchestrator
     */
    displayCurrent(data = {}, mode = null) {
        const currentMode = mode || this.getPracticeMode();
        // Use Config.js mapping to determine mode type
        const modeMapping = this.config.get('data.practiceModeMapping');
        const mapping = modeMapping && modeMapping[currentMode];
        const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');
        console.log(`[UIController] displayCurrent - Mode: ${currentMode}, isVocabularyMode: ${isVocabularyMode}`);
        if (isVocabularyMode) {
            // Vocabulary mode - use displayWord()
            const word = data.word || data.item;
            const index = data.index !== undefined ? data.index : (window.audioControls?.getCurrentIndex() || 0);
            const pteVocabularyManager = window.pteVocabularyManager;
            if (!word && pteVocabularyManager) {
                console.log('[UIController] No word in event data, using current index from vocabulary manager');
                const currentIndex = window.audioControls?.getCurrentIndex() || 0;
                const currentWord = pteVocabularyManager.getCurrentWord(currentIndex);
                if (currentWord) {
                    this.displayWord(currentWord, currentIndex);
                    return;
                }
            }
            this.displayWord(word, index);
        }
        else {
            // Practice modes (RS/ASQ/WFD) - use displayContent()
            let item = data.item || data.word;
            if (!item && window.currentItem) {
                console.log('[UIController] No item in event data, using window.currentItem');
                item = window.currentItem;
            }
            if (item) {
                this.displayContent(item, currentMode);
            }
            else {
                console.warn(`[UIController] No valid item to display for mode: ${currentMode}`);
            }
        }
    }
    /**
     * Bind all setting controls using generic event-driven pattern
     */
    bindSettingControls() {
        const settingControls = [
            { elementId: 'practiceModeSelect', settingKey: 'practiceMode' },
            { elementId: 'learningModeSelect', settingKey: 'learningMode', afterChange: () => this.updateBookDisplay() },
            { elementId: 'practiceDatasetSelect', settingKey: 'practiceDataset', afterChange: () => this.handlePracticeDatasetChange() },
            { elementId: 'difficultySelect', settingKey: 'difficulty', afterChange: () => this.updateBookDisplay() },
            { elementId: 'speedSelect', settingKey: 'speed' },
            { elementId: 'delaySelect', settingKey: 'delay' },
            { elementId: 'repeatSelect', settingKey: 'repeat' },
            { elementId: 'voiceSelect', settingKey: 'voice' }
        ];
        const eventBus = window.eventBus;
        settingControls.forEach(({ elementId, settingKey, afterChange }) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('change', async (e) => {
                    const target = e.target;
                    // Emit event for SettingsModule to handle
                    if (eventBus) {
                        const settingsRequestChangeEvent = this.config.get('events.settings.requestChange');
                        eventBus.emit(settingsRequestChangeEvent, {
                            key: settingKey,
                            value: target.value
                        });
                    }
                    // Wait for SettingsModule to finish saving
                    if (afterChange) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        afterChange();
                    }
                });
            }
        });
        console.log('✅ UIController: Bound', settingControls.length, 'setting controls using event-driven pattern');
    }
    /**
     * Initialize dropdowns based on current configuration
     */
    initializeDropdowns() {
        const settingsModule = window.settingsModule;
        if (settingsModule) {
            this.populateAllDropdownsFromSettingsModule();
        }
        else {
            console.warn('⚠️ SettingsModule not available - dropdowns may not work properly');
        }
    }
    /**
     * Populate all dropdowns using SettingsModule
     */
    populateAllDropdownsFromSettingsModule() {
        const settingsModule = window.settingsModule;
        if (!settingsModule)
            return;
        // Practice mode dropdown
        this.populateDropdown('practiceModeSelect', 'practiceMode', this.config.get('data.defaults.practiceMode'));
        // Vocabulary book dropdown
        this.populateDropdown('learningModeSelect', 'learningMode', this.config.get('data.defaults.learningMode'));
        // Practice dataset dropdown
        this.populateDropdown('practiceDatasetSelect', 'practiceDataset', this.config.get('data.defaults.practiceDataset'));
        // Difficulty dropdown
        this.populateDropdown('difficultySelect', 'difficulty', this.config.get('data.defaults.difficulty'));
        // Audio dropdowns
        this.populateDropdown('speedSelect', 'speed', String(this.config.get('data.defaults.speed')));
        const defaultDelay = this.config.get('tts.delays.long');
        this.populateDropdown('delaySelect', 'delay', String(defaultDelay));
        this.populateDropdown('repeatSelect', 'repeat', this.config.get('data.defaults.repeat'));
        // Voice dropdown is populated separately by VoiceSelector
        const voiceSelector = window.voiceSelector;
        if (voiceSelector) {
            voiceSelector.populateVoiceOptions();
        }
    }
    /**
     * Generic dropdown population method
     */
    populateDropdown(elementId, settingKey, defaultValue, filterType = null) {
        const element = document.getElementById(elementId);
        if (!element)
            return;
        const settingsModule = window.settingsModule;
        const options = settingsModule.getAvailableOptions(settingKey, filterType);
        element.innerHTML = '';
        options.forEach((option) => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.label;
            if (option.id === defaultValue)
                optionElement.selected = true;
            element.appendChild(optionElement);
        });
    }
    /**
     * Update book display with current mode and word count
     */
    updateBookDisplay() {
        const bookDisplay = document.getElementById('bookDisplay');
        const pteVocabularyManager = window.pteVocabularyManager;
        if (!pteVocabularyManager)
            return;
        const currentWords = pteVocabularyManager.getCurrentWords();
        const totalWords = pteVocabularyManager.getAllWords().length;
        const defaultLearningMode = this.config.get('data.defaults.learningMode') || 'pte-fib-listening';
        const currentMode = pteVocabularyManager.currentLearningMode || defaultLearningMode;
        // Get learning mode labels from Config.js
        const learningModes = this.config.get('data.learningModes') || [];
        const modeLabels = {};
        learningModes.forEach((mode) => {
            modeLabels[mode.id] = mode.label;
        });
        // Update display
        if (bookDisplay) {
            const modeName = modeLabels[currentMode] || currentMode;
            let displayText = `${modeName} (${currentWords.length}/${totalWords})`;
            // Add difficulty indicator if filtered
            const defaultDifficulty = this.config.get('data.defaults.difficulty') || 'all';
            if (pteVocabularyManager.getCurrentDifficulty() !== defaultDifficulty) {
                const emoji = {
                    easy: '🟢',
                    normal: '🟡',
                    hard: '🔴'
                };
                displayText += ` ${emoji[pteVocabularyManager.getCurrentDifficulty()] || ''}`;
            }
            bookDisplay.textContent = displayText;
        }
    }
    /**
     * Display a vocabulary word
     */
    displayWord(word, index) {
        // Safety check
        if (!word || !word.english) {
            console.error('[UIController] ❌ Invalid word object received:', word);
            const currentMode = this.getPracticeMode();
            const modeMapping = this.config.get('data.practiceModeMapping');
            const mapping = modeMapping && modeMapping[currentMode];
            const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');
            if (!isVocabularyMode && window.currentItem) {
                console.log('[UIController] In practice mode, ignoring invalid word object');
                return;
            }
            // Show error in vocabulary mode
            const phoneticElement = document.getElementById('phoneticSpelling');
            const englishElement = document.getElementById('englishWord');
            const chineseElement = document.getElementById('chineseTranslation');
            if (phoneticElement)
                phoneticElement.textContent = 'Error: No Data';
            if (englishElement)
                englishElement.textContent = 'Please refresh the page';
            if (chineseElement)
                chineseElement.textContent = '';
            return;
        }
        // Extract pronunciation data
        let phoneticPlain = '';
        let ipaOnly = '';
        const wordAny = word;
        // Standard PTE format: pronunciation.british / pronunciation.american
        if (wordAny.pronunciation?.british && wordAny.pronunciation?.american) {
            const useAmerican = this.getPronunciationPreference() === 'american';
            const selected = useAmerican ? wordAny.pronunciation.american : wordAny.pronunciation.british;
            phoneticPlain = selected.phonetic || '';
            ipaOnly = selected.ipa ? `/${selected.ipa}/` : '';
            this.currentWordPronunciations = {
                british: wordAny.pronunciation.british,
                american: wordAny.pronunciation.american
            };
        }
        // Fallback: pronunciation.british only
        else if (wordAny.pronunciation?.british) {
            phoneticPlain = wordAny.pronunciation.british.phonetic || '';
            ipaOnly = wordAny.pronunciation.british.ipa ? `/${wordAny.pronunciation.british.ipa}/` : '';
            this.currentWordPronunciations = { british: wordAny.pronunciation.british };
        }
        // Single IPA format
        else if (wordAny.pronunciation?.ipa) {
            phoneticPlain = wordAny.pronunciation.phonetic || '';
            ipaOnly = wordAny.pronunciation.ipa ? `/${wordAny.pronunciation.ipa}/` : '';
            this.currentWordPronunciations = null;
        }
        // Legacy fallback
        else {
            console.warn('Word missing standard pronunciation data:', wordAny.english);
        }
        // Update phonetic (top)
        const phoneticElement = document.getElementById('phoneticSpelling');
        if (phoneticElement) {
            if (phoneticPlain) {
                phoneticElement.textContent = phoneticPlain;
                phoneticElement.style.display = 'block';
            }
            else {
                phoneticElement.style.display = 'none';
            }
            phoneticElement.classList.add('word-change');
            setTimeout(() => phoneticElement.classList.remove('word-change'), 500);
        }
        // Update English word (middle)
        const englishElement = document.getElementById('englishWord');
        if (englishElement) {
            let displayText = wordAny.english;
            if (wordAny.source === 'vocabulary-clean' && wordAny.english.includes('/')) {
                displayText = wordAny.english.split('/')[0].trim();
            }
            englishElement.textContent = displayText;
            // Add word-length based sizing
            const wordLength = displayText.length;
            englishElement.classList.remove('word-short', 'word-medium', 'word-long');
            if (wordLength > 12) {
                englishElement.classList.add('word-long');
            }
            else if (wordLength > 7) {
                englishElement.classList.add('word-medium');
            }
            else {
                englishElement.classList.add('word-short');
            }
            englishElement.classList.add('word-change');
            setTimeout(() => englishElement.classList.remove('word-change'), 500);
        }
        // Update word type badge (vocabulary mode only)
        const wordTypeBadge = document.getElementById('wordTypeBadge');
        const currentMode = this.getPracticeMode();
        if (wordTypeBadge) {
            const modeMapping = this.config.get('data.practiceModeMapping');
            const mapping = modeMapping && modeMapping[currentMode];
            const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');
            if (isVocabularyMode && wordAny.wordType) {
                wordTypeBadge.textContent = `[${wordAny.wordType}]`;
                wordTypeBadge.style.display = 'inline-block';
                wordTypeBadge.classList.add('word-change');
                setTimeout(() => wordTypeBadge.classList.remove('word-change'), 500);
            }
            else {
                wordTypeBadge.style.display = 'none';
            }
        }
        // Update IPA (bottom)
        const ipaElement = document.getElementById('ipaNotation');
        if (ipaElement) {
            if (ipaOnly) {
                ipaElement.textContent = ipaOnly;
                ipaElement.style.display = 'block';
            }
            else {
                ipaElement.style.display = 'none';
            }
            ipaElement.classList.add('word-change');
            setTimeout(() => ipaElement.classList.remove('word-change'), 500);
        }
        // Hide old combined pronunciation
        const pronunciationElement = document.getElementById('pronunciationText');
        if (pronunciationElement) {
            pronunciationElement.style.display = 'none';
        }
        // Update example sentence
        const exampleElement = document.getElementById('exampleSentence');
        // Special handling for definitions
        if (exampleElement && wordAny.definition) {
            if (wordAny.definition && wordAny.definition.trim()) {
                const displayContent = `<div class="example-english definition"><strong>Definition:</strong> ${wordAny.definition}</div>`;
                exampleElement.innerHTML = displayContent;
                exampleElement.style.display = 'block';
                exampleElement.classList.add('word-change');
                setTimeout(() => exampleElement.classList.remove('word-change'), 500);
            }
            else {
                exampleElement.style.display = 'none';
            }
        }
        // Standard example sentence
        else if (exampleElement && wordAny.example) {
            const cleanExample = this.cleanExampleSentence(wordAny.example);
            const displayContent = `<div class="example-english">${cleanExample}</div>`;
            exampleElement.innerHTML = displayContent;
            exampleElement.style.display = 'block';
            exampleElement.classList.add('word-change');
            setTimeout(() => exampleElement.classList.remove('word-change'), 500);
        }
        else if (exampleElement) {
            exampleElement.style.display = 'none';
        }
        // Update progress display
        const pteVocabularyManager = window.pteVocabularyManager;
        const progressTracker = window.progressTracker;
        const totalWords = pteVocabularyManager.getTotalWordCount();
        progressTracker.updateProgress(index, totalWords, word);
    }
    /**
     * Display first word when vocabulary source changes
     */
    displayFirstWord() {
        const pteVocabularyManager = window.pteVocabularyManager;
        const firstWord = pteVocabularyManager.getCurrentWord(0);
        if (firstWord) {
            this.displayWord(firstWord, 0);
        }
    }
    /**
     * Clean example sentence by removing speaker prefixes and metadata
     */
    cleanExampleSentence(rawSentence) {
        let cleaned = rawSentence
            .replace(/^[A-Z][a-z]*\s*[：:]\s*/g, '')
            .replace(/^\d+\.\s*/g, '')
            .replace(/（[^）]*）/g, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\\n!\[Image\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        const pteVocabularyManager = window.pteVocabularyManager;
        const currentWords = pteVocabularyManager?.getCurrentWords();
        const currentWord = currentWords?.[pteVocabularyManager?.currentIndex]?.english;
        const maxLength = this.config.get('ui.text.maxLength');
        if (cleaned.length > maxLength) {
            const sentences = cleaned.split(/[.!?]+/);
            if (sentences.length > 1) {
                let selectedSentence = sentences[0];
                let bestSentence = null;
                let shortestLength = Infinity;
                if (currentWord) {
                    for (let i = 0; i < sentences.length; i++) {
                        const sentenceRaw = sentences[i];
                        if (!sentenceRaw)
                            continue;
                        const sentence = sentenceRaw.trim();
                        if (sentence.toLowerCase().includes(currentWord.toLowerCase())) {
                            if (sentence.length < shortestLength) {
                                bestSentence = sentence;
                                shortestLength = sentence.length;
                            }
                        }
                    }
                    if (bestSentence) {
                        selectedSentence = bestSentence;
                    }
                }
                if (selectedSentence) {
                    selectedSentence = selectedSentence.trim();
                    if (selectedSentence.length > 15) {
                        if (!/[.!?]$/.test(selectedSentence)) {
                            cleaned = selectedSentence + '.';
                        }
                        else {
                            cleaned = selectedSentence;
                        }
                    }
                    else {
                        cleaned = (sentences[0] + '. ' + sentences[1]).trim() + '.';
                    }
                }
            }
            else {
                cleaned = cleaned.substring(0, 80).replace(/\s+\w+$/, '') + '...';
            }
        }
        return cleaned;
    }
    /**
     * Update UI with current vocabulary
     */
    updateUI() {
        const audioControls = window.audioControls;
        const pteVocabularyManager = window.pteVocabularyManager;
        const progressTracker = window.progressTracker;
        const currentIndex = audioControls.getCurrentIndex();
        const currentWord = pteVocabularyManager.getCurrentWord(currentIndex);
        if (currentWord) {
            this.displayWord(currentWord, currentIndex);
        }
        else if (pteVocabularyManager.getTotalWordCount() === 0) {
            progressTracker.updateStatus('No words available');
        }
        this.updateBookDisplay();
        audioControls.showPausedUI();
        this.updateButtons();
    }
    /**
     * Sync repeat mode from HTML (kept for backward compatibility)
     */
    syncRepeatModeFromHTML() {
        console.log('[UIController] syncRepeatModeFromHTML: Using event-driven settings (no-op)');
    }
    /**
     * Update button states
     */
    updateButtons() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const pteVocabularyManager = window.pteVocabularyManager;
        const hasVocabulary = pteVocabularyManager.getTotalWordCount() > 0;
        const enabledOpacity = this.config.get('ui.opacity.enabled');
        const disabledOpacity = this.config.get('ui.opacity.disabled');
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
            nextBtn.disabled = !hasVocabulary;
            nextBtn.style.opacity = hasVocabulary ? enabledOpacity : disabledOpacity;
        }
        if (prevBtn) {
            prevBtn.style.display = 'inline-block';
            prevBtn.disabled = !hasVocabulary;
            prevBtn.style.opacity = hasVocabulary ? enabledOpacity : disabledOpacity;
        }
        const audioControls = window.audioControls;
        if (audioControls.isPlaying && hasVocabulary) {
            if (startBtn)
                startBtn.style.display = 'none';
            if (pauseBtn)
                pauseBtn.style.display = 'inline-block';
        }
        else {
            if (startBtn)
                startBtn.style.display = 'inline-block';
            if (pauseBtn)
                pauseBtn.style.display = 'none';
            if (startBtn) {
                startBtn.disabled = !hasVocabulary;
                startBtn.style.opacity = hasVocabulary ? enabledOpacity : disabledOpacity;
                startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌ NO DATA';
                startBtn.title = hasVocabulary ? 'Play vocabulary' : 'No vocabulary loaded';
            }
        }
        // Keep navigation buttons enabled when vocabulary is loaded
        if (hasVocabulary) {
            if (prevBtn) {
                prevBtn.disabled = false;
                prevBtn.style.opacity = enabledOpacity;
            }
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.style.opacity = enabledOpacity;
            }
        }
    }
    /**
     * Show loading state
     */
    showLoadingState() {
        const progressTracker = window.progressTracker;
        progressTracker.updateStatus('Loading...');
    }
    /**
     * Hide loading state
     */
    hideLoadingState() {
        const progressTracker = window.progressTracker;
        progressTracker.updateStatus('Ready');
    }
    /**
     * Get pronunciation preference
     */
    getPronunciationPreference() {
        return this.pronunciationPreference || this.config.get('modes.pronunciation.british');
    }
    /**
     * Set pronunciation preference
     */
    setPronunciationPreference(preference) {
        this.pronunciationPreference = preference;
        if (this.currentWordPronunciations && this.currentWord) {
            this.displayWord(this.currentWord, this.currentIndex);
        }
    }
    /**
     * Toggle between British and American pronunciation
     */
    togglePronunciation() {
        const current = this.getPronunciationPreference();
        const british = this.config.get('modes.pronunciation.british');
        const american = this.config.get('modes.pronunciation.american');
        const newPreference = current === british ? american : british;
        this.setPronunciationPreference(newPreference);
        return newPreference;
    }
    /**
     * Handle settings changes
     */
    handleSettingsChange(key, _value) {
        switch (key) {
            case 'category':
            case 'difficulty':
            case 'learningMode':
                this.updateBookDisplay();
                break;
            case 'speed':
            case 'delay':
            case 'repeat':
            case 'voice':
                // Handled by respective modules
                break;
        }
    }
    /**
     * Handle practice mode changes
     */
    async handlePracticeModeChange(mode) {
        if (!mode) {
            this.handleError('Invalid practice mode', 'No mode provided to handlePracticeModeChange', true);
            return false;
        }
        const progressTracker = window.progressTracker;
        progressTracker?.updateStatus(`Changing to ${mode.toUpperCase()} mode...`);
        window.currentPracticeMode = mode;
        const modeMapping = this.config.get('data.practiceModeMapping');
        if (!modeMapping || Object.keys(modeMapping).length === 0) {
            this.handleError('Mode configuration not loaded', 'Mode mappings not yet available, this is expected during initialization', false, 'warn');
            return false;
        }
        const mapping = modeMapping[mode];
        if (!mapping) {
            this.handleError(`Invalid practice mode: ${mode}`, `No mapping found for mode ${mode} in config.data.practiceModeMapping`, true);
            return false;
        }
        const isVocabularyMode = mapping.type === this.config.get('modes.practice.vocabulary');
        let success = false;
        // Ensure dataset settings are synchronized
        if (!isVocabularyMode) {
            const settingsModule = window.settingsModule;
            if (settingsModule) {
                const practiceDataset = settingsModule.get('practiceDataset');
                if (!practiceDataset && mapping.defaultPracticeDataset) {
                    try {
                        await settingsModule.updateSetting('practiceDataset', mapping.defaultPracticeDataset);
                        console.log(`[UIController] ✅ Set practiceDataset to ${mapping.defaultPracticeDataset}`);
                    }
                    catch (error) {
                        console.error(`[UIController] ❌ Failed to set practiceDataset: ${error.message}`);
                    }
                }
            }
        }
        if (isVocabularyMode) {
            console.log('[UIController] Switching to vocabulary mode...');
            this.updateBookDisplay();
            this.displayFirstWord();
            success = true;
        }
        else {
            console.log(`[UIController] Switching to practice mode: ${mode}...`);
            const datasetLoaded = await this.loadPracticeDataset(mode);
            if (datasetLoaded) {
                const bookDisplay = document.getElementById('bookDisplay');
                if (bookDisplay) {
                    const modeLabels = {};
                    const practiceModes = this.config.get('data.practiceModes') || [];
                    practiceModes.forEach((modeObj) => {
                        modeLabels[modeObj.id] = modeObj.label;
                    });
                    bookDisplay.textContent = modeLabels[mode] || mode.toUpperCase();
                    console.log(`[UIController] Updated book display to: ${modeLabels[mode]}`);
                }
                success = true;
            }
            else {
                console.error(`[UIController] ❌ Failed to load dataset for mode: ${mode}`);
                progressTracker?.showError(`Failed to load dataset for ${mode} mode`);
                success = false;
            }
        }
        return success;
    }
    /**
     * Handle practice dataset change
     */
    async handlePracticeDatasetChange() {
        const settingsModule = window.settingsModule;
        const currentMode = window.currentPracticeMode || settingsModule?.get('practiceMode');
        if (!currentMode) {
            console.warn('[UIController] ⚠️ No practice mode set, cannot reload dataset');
            return;
        }
        const modeMapping = this.config.get('data.practiceModeMapping');
        const mapping = modeMapping?.[currentMode];
        const isVocabularyMode = mapping?.type === this.config.get('modes.practice.vocabulary');
        if (isVocabularyMode) {
            console.log('[UIController] In vocabulary mode, ignoring dataset change');
            return;
        }
        const newDatasetId = settingsModule?.get('practiceDataset');
        console.log(`[UIController] 🔄 Practice dataset changed to: ${newDatasetId}, reloading ${currentMode} mode...`);
        const datasetManager = window.datasetManager;
        if (datasetManager && newDatasetId) {
            console.log(`[UIController] 🗑️ Clearing cache for fresh reload...`);
            datasetManager.clearCache(newDatasetId);
        }
        await this.loadPracticeDataset(currentMode);
    }
    /**
     * Load dataset for practice mode
     */
    async loadPracticeDataset(mode) {
        console.log(`[UIController] 📥 loadPracticeDataset() called with mode: ${mode}`);
        // Enhanced error handling for DatasetManager
        let datasetManager = window.datasetManager;
        if (!datasetManager) {
            console.error('❌ DatasetManager not available');
            if (typeof window.DatasetManager === 'function') {
                console.log('🔄 Creating new DatasetManager instance...');
                try {
                    const DatasetManagerClass = window.DatasetManager;
                    datasetManager = new DatasetManagerClass();
                    const config = window.appConfig || { get: () => undefined };
                    await datasetManager.initialize(config);
                    window.datasetManager = datasetManager;
                    console.log('✅ Successfully created DatasetManager instance');
                }
                catch (error) {
                    console.error('❌ Failed to create DatasetManager instance:', error);
                    window.progressTracker?.showError('Practice dataset feature not available');
                    return false;
                }
            }
            else {
                window.progressTracker?.showError('Practice dataset feature not available');
                return false;
            }
        }
        if (!mode) {
            console.error('❌ No practice mode provided to loadPracticeDataset()');
            return false;
        }
        try {
            const progressTracker = this.getModule('progressTracker');
            progressTracker?.updateStatus(`Loading ${mode.toUpperCase()} dataset...`);
            // Get dataset ID
            let datasetId = null;
            const settingsModule = this.getModule('settingsModule');
            if (settingsModule && typeof settingsModule.get === 'function') {
                datasetId = settingsModule.get('practiceDataset');
                console.log(`[UIController] 📝 Got practiceDataset from settings: ${datasetId}`);
            }
            if (!datasetId) {
                const modeMapping = this.config.get('data.practiceModeMapping');
                const mapping = modeMapping && modeMapping[mode];
                if (mapping && mapping.defaultPracticeDataset) {
                    datasetId = mapping.defaultPracticeDataset;
                    if (settingsModule && typeof settingsModule.updateSetting === 'function') {
                        try {
                            await settingsModule.updateSetting('practiceDataset', datasetId);
                        }
                        catch (err) {
                            this.handleError('Failed to update settings', err, false, 'warn');
                        }
                    }
                }
            }
            if (!datasetId) {
                this.handleError(`Could not determine dataset ID for mode: ${mode}`, `No datasetId available in settings or config mapping. Please check Config.js data.practiceModeMapping`, true);
                return false;
            }
            // Load dataset with retry
            let dataset = null;
            let retryCount = 0;
            const maxRetries = 2;
            while (retryCount <= maxRetries) {
                try {
                    dataset = await datasetManager.loadDataset(datasetId);
                    break;
                }
                catch (loadError) {
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        const retryDelay = this.config.get('ui.delays.retry') || 500;
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                    else {
                        throw loadError;
                    }
                }
            }
            if (!dataset) {
                throw new Error(`Dataset ${datasetId} could not be loaded after ${maxRetries} retries`);
            }
            if (!dataset.items || !Array.isArray(dataset.items) || dataset.items.length === 0) {
                throw new Error(`Dataset ${datasetId} is empty or has invalid structure`);
            }
            // Store in local state
            this.state.currentDataset = dataset;
            this.state.currentDatasetIndex = 0;
            this.state.currentItem = dataset.items[0];
            // Update global references for backward compatibility
            window.currentDataset = dataset;
            window.currentDatasetIndex = 0;
            window.currentItem = dataset.items[0];
            // Display first item
            this.displayContent(dataset.items[0], mode);
            // Update progress
            window.progressTracker?.updateStatus(`${mode.toUpperCase()} Mode - ${dataset.items.length} items loaded`);
            // Emit dataset change event
            const datasetChangedEvent = this.config.get('events.dataset.practice.changed');
            if (datasetChangedEvent) {
                window.eventBus.emit(datasetChangedEvent, {
                    mode: mode,
                    datasetId: datasetId,
                    itemCount: dataset.items.length
                });
            }
            return true;
        }
        catch (error) {
            let errorDetails = error.message || 'Unknown error';
            let userMessage = `Failed to load dataset for ${mode}`;
            const settingsModule = this.getModule('settingsModule');
            const datasetId = settingsModule?.get('practiceDataset') || mode;
            if (errorDetails.includes('fetch') || errorDetails.includes('HTTP')) {
                let diagnosticInfo = '';
                if (error.details) {
                    diagnosticInfo = `\nDiagnostic details: ${JSON.stringify(error.details, null, 2)}`;
                }
                errorDetails = `Network error: ${errorDetails}. Dataset ID: ${datasetId}${diagnosticInfo}`;
                userMessage = `Dataset file not found for ${mode} mode. Please check the data directory.`;
            }
            else if (errorDetails.includes('Dataset type not found')) {
                errorDetails = `Dataset type error: ${errorDetails}. Dataset ID: ${datasetId}`;
                userMessage = `Invalid dataset type for ${mode} mode. Configuration issue detected.`;
            }
            else if (errorDetails.includes('invalid structure') || errorDetails.includes('empty')) {
                errorDetails = `Dataset validation error: ${errorDetails}. Dataset ID: ${datasetId}`;
                userMessage = `The ${mode} dataset has an invalid structure or is empty.`;
            }
            this.handleError(userMessage, errorDetails, true, 'error');
            // Clear partial state
            this.state.currentDataset = null;
            this.state.currentDatasetIndex = 0;
            this.state.currentItem = null;
            window.currentDataset = null;
            window.currentDatasetIndex = 0;
            window.currentItem = null;
            return false;
        }
    }
    /**
     * Unified display method for all modes
     */
    displayContent(item, mode) {
        // Enhanced null checking
        if (!item) {
            item = {};
        }
        // Get DOM elements
        const phoneticSpelling = document.getElementById('phoneticSpelling');
        const englishWord = document.getElementById('englishWord');
        const ipaNotation = document.getElementById('ipaNotation');
        const pronunciationText = document.getElementById('pronunciationText');
        const exampleSentence = document.getElementById('exampleSentence');
        const progressText = document.getElementById('progressText');
        const difficultyBadge = document.getElementById('difficultyBadge');
        const wordTypeBadge = document.getElementById('wordTypeBadge');
        // Clear content elements
        [phoneticSpelling, englishWord, ipaNotation, pronunciationText, exampleSentence].forEach(el => {
            if (el)
                el.textContent = '';
        });
        // Hide word type badge for practice modes
        const modeMapping = this.config.get('data.practiceModeMapping');
        const mapping = modeMapping && modeMapping[mode];
        const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');
        if (wordTypeBadge && !isVocabularyMode) {
            wordTypeBadge.style.display = 'none';
        }
        const itemAny = item;
        // Display based on mode
        if (mode === this.config.get('modes.practice.vocabulary')) {
            // Vocabulary mode
            if (itemAny.content) {
                if (englishWord)
                    englishWord.textContent = itemAny.content.word || '';
                if (phoneticSpelling) {
                    phoneticSpelling.textContent = itemAny.content.phoneticSpelling || '';
                    phoneticSpelling.style.display = itemAny.content.phoneticSpelling ? '' : 'none';
                }
                if (ipaNotation) {
                    ipaNotation.textContent = itemAny.content.ipa || '';
                    ipaNotation.style.display = itemAny.content.ipa ? '' : 'none';
                }
                if (pronunciationText) {
                    pronunciationText.textContent = itemAny.content.pronunciation || '';
                    pronunciationText.style.display = itemAny.content.pronunciation ? '' : 'none';
                }
                if (exampleSentence) {
                    exampleSentence.textContent = itemAny.content.example || '';
                    exampleSentence.style.display = itemAny.content.example ? '' : 'none';
                }
            }
        }
        else if (mode === this.config.get('modes.practice.repeatSentence')) {
            // Repeat Sentence
            if (itemAny.content && englishWord) {
                englishWord.textContent = itemAny.content.sentence || '';
            }
            if (phoneticSpelling)
                phoneticSpelling.style.display = 'none';
            if (ipaNotation)
                ipaNotation.style.display = 'none';
            if (pronunciationText)
                pronunciationText.style.display = 'none';
            if (exampleSentence && itemAny.content?.translation) {
                exampleSentence.textContent = itemAny.content.translation;
                exampleSentence.style.display = '';
            }
            else if (exampleSentence) {
                exampleSentence.style.display = 'none';
            }
        }
        else if (mode === this.config.get('modes.practice.answerShortQuestion')) {
            // Answer Short Question
            if (itemAny.content && englishWord) {
                englishWord.textContent = itemAny.content?.question || '';
            }
            if (phoneticSpelling)
                phoneticSpelling.style.display = 'none';
            if (ipaNotation)
                ipaNotation.style.display = 'none';
            if (pronunciationText)
                pronunciationText.style.display = 'none';
            if (exampleSentence && itemAny.content?.answer) {
                exampleSentence.innerHTML = `<div class="example-english"><strong>Answer:</strong> ${itemAny.content.answer}</div>`;
                exampleSentence.style.display = '';
            }
            else if (exampleSentence) {
                exampleSentence.style.display = 'none';
            }
        }
        else if (mode === this.config.get('modes.practice.writeFromDictation')) {
            // Write From Dictation
            if (itemAny.content && englishWord) {
                englishWord.textContent = itemAny.content?.sentence || '';
            }
            if (phoneticSpelling)
                phoneticSpelling.style.display = 'none';
            if (ipaNotation)
                ipaNotation.style.display = 'none';
            if (pronunciationText)
                pronunciationText.style.display = 'none';
            if (exampleSentence && itemAny.content?.translation) {
                exampleSentence.textContent = itemAny.content.translation;
                exampleSentence.style.display = '';
            }
            else if (exampleSentence) {
                exampleSentence.style.display = 'none';
            }
        }
        // Show difficulty badge
        if (difficultyBadge && itemAny.metadata?.difficulty) {
            difficultyBadge.textContent = `${this.getDifficultyEmoji(itemAny.metadata.difficulty)} ${itemAny.metadata.difficulty}`;
            difficultyBadge.style.display = '';
        }
        else if (difficultyBadge) {
            difficultyBadge.style.display = 'none';
        }
        // Update progress text
        const currentDataset = window.currentDataset;
        if (progressText && currentDataset) {
            const current = (window.currentDatasetIndex || 0) + 1;
            const total = currentDataset.items.length;
            progressText.textContent = `${current} / ${total}`;
        }
        // Store current item globally
        window.currentItem = item;
    }
    /**
     * Get emoji for difficulty level
     */
    getDifficultyEmoji(difficulty) {
        const emojiMap = {
            'easy': '🟢',
            'medium': '🟡',
            'hard': '🔴'
        };
        return emojiMap[difficulty.toLowerCase()] || '⚪';
    }
}
// Export singleton instance
export const uiController = new UIController();
// Default export
export default uiController;
// Expose as global reference
if (typeof window !== 'undefined') {
    window.uiController = uiController;
}
//# sourceMappingURL=UIController.js.map