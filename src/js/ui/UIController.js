// UIController - DOM manipulation and display updates
class UIController {
    constructor() {
        this.initialized = false;
        // Load configuration from centralized config
        this.config = window.appConfig || new AppConfig();
        this.pronunciationPreference = this.config.get('modes.pronunciation.british'); // Default to British
        this.currentWordPronunciations = null; // Store current word's pronunciations

        // Local state to reduce global window dependencies
        this.state = {
            currentDatasetIndex: 0,
            currentPracticeMode: this.config.get('modes.practice.vocabulary'),
            currentDataset: null,
            currentItem: null
        };

        this.setupEventListeners();
    }

    /**
     * Get module instance with error handling to reduce direct window references
     * @param {string} moduleName - Name of the module to retrieve (e.g., 'settingsModule')
     * @param {boolean} [required=false] - Whether the module is required (throws if missing)
     * @param {*} [defaultValue=null] - Default value to return if module not found
     * @returns {Object|null} The module instance or defaultValue if not found
     * @throws {Error} If module is required and not found
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
     * Centralized error handling to standardize error reporting across the application
     * Provides consistent logging, user feedback, and error event emission
     *
     * @param {string} message - User-friendly error message to display
     * @param {Error|string} [error] - Original error object or detailed error message for logging
     * @param {boolean} [showToUser=true] - Whether to show the error to the user via progressTracker
     * @param {string} [level='error'] - Log level: 'error', 'warn', or 'info'
     * @fires events.ui.error - Emitted with error details for centralized error handling
     * @requires ProgressTracker - For showing errors to the user
     * @requires EventBus - For error event emission
     * @example
     * // Basic error
     * this.handleError('Failed to load vocabulary');
     *
     * // With original error object
     * try {
     *   // Some operation
     * } catch (err) {
     *   this.handleError('Operation failed', err);
     * }
     *
     * // As a warning without showing to user
     * this.handleError('Non-critical issue', 'Missing optional data', false, 'warn');
     */
    handleError(message, error, showToUser = true, level = 'error') {
        // Generate a detailed message for logging
        const details = error instanceof Error ? error.message : error;
        const logMessage = details ? `${message}: ${details}` : message;

        // Log to console with appropriate level
        if (level === 'warn') {
            console.warn(`[UIController] ⚠️ ${logMessage}`);
        } else if (level === 'info') {
            console.info(`[UIController] ℹ️ ${logMessage}`);
        } else {
            console.error(`[UIController] ❌ ${logMessage}`);
        }

        // Show to user if requested
        if (showToUser) {
            const progressTracker = this.getModule('progressTracker');
            if (progressTracker) {
                progressTracker.showError(message);
            }
        }

        // Emit error event through standardized event system
        const errorEvent = this.config.get('events.ui.error');
        if (errorEvent && window.eventBus) {
            window.eventBus.emit(errorEvent, {
                source: 'UIController',
                message,
                details: details || null,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Safely get current practice mode from state, SettingsModule, or Config.js fallback
     * @returns {string} Current practice mode
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

    setupEventListeners() {
        // Use standardized event names from Config.js for all event handlers

        // Listen for vocabulary loaded event
        const vocabularyLoadedEvent = this.config.get('events.vocabulary.loaded');
        window.eventBus.on(vocabularyLoadedEvent, (data) => {
            this.updateUI();
        });

        // Listen for vocabulary difficulty filtered event
        const difficultyFilteredEvent = this.config.get('events.vocabulary.difficulty.filtered');
        window.eventBus.on(difficultyFilteredEvent, (data) => {
            this.updateBookDisplay();
            this.updateButtons();
        });

        // Listen for learning mode changes
        const learningModeChangedEvent = this.config.get('events.mode.learning.changed');
        window.eventBus.on(learningModeChangedEvent, (data) => {
            // Reset audio position to first word
            window.audioControls.setCurrentIndex(0);
            this.updateBookDisplay();
            this.updateButtons();
            this.displayFirstWord(); // Show first word of new mode
        });
        
        // Listen for practice mode changes (using standardized event from Config.js)
        const practiceModeChangedEvent = window.appConfig.get('events.mode.practice.changed');
        window.eventBus.on(practiceModeChangedEvent, (data) => {
            // Get default vocabulary mode from config instead of hardcoding it
            const defaultMode = this.config.get('modes.practice.vocabulary');
            const mode = data?.mode || defaultMode; // Default to vocabulary mode if not specified
            console.log(`[UIController] 🔄 Practice mode changed event received - Switching to: ${mode}`);

            // Prevent excessive event handling during initialization
            if (window.initializing) {
                console.log(`[UIController] Skipping mode change during initialization`);
                return;
            }

            // Handle the practice mode change
            this.handlePracticeModeChange(mode);
        });

        // Listen for unified content display events (standardized from Config.js)
        const contentDisplayEvent = window.appConfig.get('events.content.display');
        window.eventBus.on(contentDisplayEvent, (data) => {
            // Use unified display method for mode-aware rendering
            this.displayCurrent(data);
        });

        // TTS speaking started (standardized event name from Config.js)
        const ttsSpeakingStartedEvent = window.appConfig.get('events.tts.speaking.started');
        window.eventBus.on(ttsSpeakingStartedEvent, (data) => {
            // Update UI to show current word when TTS starts speaking
            this.displayCurrent(data);
        });

        // Listen for progress events (from Config.js)
        const progressUpdatedEvent = window.appConfig?.get('events.progress.updated') || 'progress:updated';
        window.eventBus.on(progressUpdatedEvent, (data) => {
            // Progress display is handled by ProgressTracker
        });

        // Settings changed (standardized event name from Config.js)
        const settingsChangedEvent = window.appConfig.get('events.settings.changed');
        window.eventBus.on(settingsChangedEvent, (data) => {
            // Handle settings UI updates
            if (data.key === 'learningMode') {
                this.updateBookDisplay();
            }
        });
    }

    bindEventListeners() {
        // Bind all settings controls using event-driven architecture
        this.bindSettingControls();

        // Control buttons - using event-driven architecture with standardized events from Config.js
        document.getElementById('startBtn').addEventListener('click', () => {
            const audioStartEvent = window.appConfig.get('events.audio.autoplay.start');
            window.eventBus.emit(audioStartEvent);
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            const audioPauseEvent = window.appConfig.get('events.audio.autoplay.pause');
            window.eventBus.emit(audioPauseEvent);
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            // Mode-aware: emit appropriate next event (standardized from Config.js)
            const defaultMode = this.config.get('data.defaults.practiceMode') || this.config.get('fallbacks.practiceMode');
            const mode = this.getPracticeMode();
            const audioNextEvent = window.appConfig.get('events.audio.navigate.next');
            window.eventBus.emit(audioNextEvent, { mode });
        });

        document.getElementById('prevBtn').addEventListener('click', () => {
            // Mode-aware: emit appropriate prev event (standardized from Config.js)
            const defaultMode = this.config.get('data.defaults.practiceMode') || this.config.get('fallbacks.practiceMode');
            const mode = this.getPracticeMode();
            const audioPrevEvent = window.appConfig.get('events.audio.navigate.prev');
            window.eventBus.emit(audioPrevEvent, { mode });
        });

        // Pronunciation toggle button
        const pronunciationToggleBtn = document.getElementById('pronunciationToggleBtn');
        if (pronunciationToggleBtn) {
            pronunciationToggleBtn.addEventListener('click', () => {
                const newPreference = this.togglePronunciation();
                // Update button icon using configurable flags
                const britishFlag = this.config.get('ui.elements.pronunciationToggle.british');
                const americanFlag = this.config.get('ui.elements.pronunciationToggle.american');
                pronunciationToggleBtn.textContent = newPreference === this.config.get('modes.pronunciation.british') ? britishFlag : americanFlag;
                const british = this.config.get('modes.pronunciation.british');
                pronunciationToggleBtn.title = `Current: ${newPreference === british ? 'British' : 'American'} pronunciation`;
            });
        }

        // Initialize dropdowns based on current settings
        this.initializeDropdowns();
        this.updateBookDisplay(); // Initial update
    }

    /**
     * Unified display orchestrator - routes to appropriate display method based on mode
     * @param {Object} data - Display data containing item/word and index
     * @param {string} [mode] - Optional mode override, defaults to currentPracticeMode
     */
    displayCurrent(data = {}, mode = null) {
        const defaultMode = this.config.get('data.defaults.practiceMode');
        const currentMode = mode || this.getPracticeMode();

        // Use Config.js mapping to determine mode type instead of hardcoded string comparison
        const modeMapping = this.config.get('data.practiceModeMapping');
        const mapping = modeMapping && modeMapping[currentMode];
        const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');

        // Debug information to help troubleshoot display issues
        console.log(`[UIController] displayCurrent - Mode: ${currentMode}, isVocabularyMode: ${isVocabularyMode}`);

        if (isVocabularyMode) {
            // Vocabulary mode - use displayWord()
            const word = data.word || data.item;
            // Get index from data, or from audioControls if not provided
            const index = data.index !== undefined ? data.index : (window.audioControls?.getCurrentIndex() || 0);

            // Check if we have valid word data
            if (!word && window.pteVocabularyManager) {
                console.log('[UIController] No word in event data, using current index from vocabulary manager');
                const currentIndex = window.audioControls?.getCurrentIndex() || 0;
                const currentWord = window.pteVocabularyManager.getCurrentWord(currentIndex);
                if (currentWord) {
                    this.displayWord(currentWord, currentIndex);
                    return;
                }
            }

            this.displayWord(word, index);
        } else {
            // Practice modes (RS/ASQ/WFD) - use displayContent()
            let item = data.item || data.word;

            // If no item provided in event but we have a current item, use that
            if (!item && window.currentItem) {
                console.log('[UIController] No item in event data, using window.currentItem');
                item = window.currentItem;
            }

            // Only call displayContent if we have a valid item
            if (item) {
                this.displayContent(item, currentMode);
            } else {
                console.warn(`[UIController] No valid item to display for mode: ${currentMode}`);
            }
        }
    }

    /**
     * Bind all setting controls using generic event-driven pattern
     * This replaces 80+ lines of duplicate event listeners with a clean, DRY approach
     */
    bindSettingControls() {
        const settingControls = [
            { elementId: 'practiceModeSelect', settingKey: 'practiceMode' },
            { elementId: 'learningModeSelect', settingKey: 'learningMode', afterChange: () => this.updateBookDisplay() },
            { elementId: 'practiceDatasetSelect', settingKey: 'practiceDataset' },
            { elementId: 'difficultySelect', settingKey: 'difficulty', afterChange: () => this.updateBookDisplay() },
            { elementId: 'speedSelect', settingKey: 'speed' },
            { elementId: 'delaySelect', settingKey: 'delay' },
            { elementId: 'repeatSelect', settingKey: 'repeat' },
            { elementId: 'voiceSelect', settingKey: 'voice' }
        ];

        settingControls.forEach(({ elementId, settingKey, afterChange }) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('change', (e) => {
                    // Emit event for SettingsModule to handle (standardized from Config.js)
                    if (window.eventBus) {
                        const settingsRequestChangeEvent = window.appConfig.get('events.settings.requestChange');
                        window.eventBus.emit(settingsRequestChangeEvent, {
                            key: settingKey,
                            value: e.target.value
                        });
                    }
                    
                    // Execute any after-change callbacks (e.g., UI updates)
                    if (afterChange) {
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
        if (window.settingsModule) {
            // Use SettingsModule to populate ALL dropdowns consistently
            this.populateAllDropdownsFromSettingsModule();
        } else {
            console.warn('⚠️ SettingsModule not available - dropdowns may not work properly');
        }
    }

    /**
     * Populate ALL dropdowns using SettingsModule (unified approach)
     */
    populateAllDropdownsFromSettingsModule() {
        const settingsModule = window.settingsModule;
        if (!settingsModule) return;

        // Practice mode dropdown
        this.populateDropdown('practiceModeSelect', 'practiceMode', this.config.get('data.defaults.practiceMode'));

        // Vocabulary book (learning mode) dropdown
        this.populateDropdown('learningModeSelect', 'learningMode', this.config.get('data.defaults.learningMode'));
        
        // Practice dataset dropdown (for RS/ASQ/WFD modes)
        this.populateDropdown('practiceDatasetSelect', 'practiceDataset', this.config.get('data.defaults.practiceDataset'));

        // Difficulty dropdown
        this.populateDropdown('difficultySelect', 'difficulty', this.config.get('data.defaults.difficulty'));

        // Audio dropdowns
        this.populateDropdown('speedSelect', 'speed', String(this.config.get('data.defaults.speed')));
        const defaultDelay = this.config.get('tts.delays.long'); // Match SettingsModule default
        this.populateDropdown('delaySelect', 'delay', String(defaultDelay));
        this.populateDropdown('repeatSelect', 'repeat', this.config.get('data.defaults.repeat'));
        
        // Voice dropdown is populated separately by VoiceSelector
        if (window.voiceSelector) {
            window.voiceSelector.populateVoiceOptions();
        }
    }

    /**
     * Generic dropdown population method
     */
    populateDropdown(elementId, settingKey, defaultValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const settingsModule = window.settingsModule;
        const options = settingsModule.getAvailableOptions(settingKey);

        element.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.label;
            if (option.id === defaultValue) optionElement.selected = true;
            element.appendChild(optionElement);
        });
    }

    updateBookDisplay() {
        const bookDisplay = document.getElementById('bookDisplay');

        if (!window.pteVocabularyManager) return;

        const currentWords = window.pteVocabularyManager.getCurrentWords();
        const totalWords = window.pteVocabularyManager.getAllWords().length;
        const defaultLearningMode = this.config.get('data.defaults.learningMode') || 'pte-fib-listening';
        const currentMode = window.pteVocabularyManager.currentLearningMode || defaultLearningMode;

        // Get friendly name for current vocabulary book
        // Get learning mode labels from Config.js instead of hardcoded map
        const learningModes = this.config.get('data.learningModes') || [];
        const modeLabels = {};
        learningModes.forEach(mode => {
            modeLabels[mode.id] = mode.label;
        });
        
        const displayName = modeLabels[currentMode] || currentMode;

        // Update context bar display with vocabulary book name and word count
        if (bookDisplay) {
            const modeName = modeLabels[currentMode] || currentMode;
            let displayText = `${modeName} (${currentWords.length}/${totalWords})`;
            
            // Add difficulty indicator if filtered
            const defaultDifficulty = this.config.get('data.defaults.difficulty') || 'all';
            if (window.pteVocabularyManager.getCurrentDifficulty() !== defaultDifficulty) {
                const emoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[window.pteVocabularyManager.getCurrentDifficulty()] || '';
                displayText += ` ${emoji}`;
            }
            
            bookDisplay.textContent = displayText;
        }
    }

    displayWord(word, index) {
        // Safety check: ensure word object has required data
        if (!word || !word.english) {
            console.error('[UIController] ❌ Invalid word object received:', word);

            // Check if we're in a practice mode - this might be expected
            const currentMode = this.getPracticeMode();
            const modeMapping = this.config.get('data.practiceModeMapping');
            const mapping = modeMapping && modeMapping[currentMode];
            const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');

            if (!isVocabularyMode && window.currentItem) {
                // In practice mode, don't show an error - just ignore this call
                console.log('[UIController] In practice mode, ignoring invalid word object');
                return;
            }

            // In vocabulary mode, show an error message
            const phoneticElement = document.getElementById('phoneticSpelling');
            const englishElement = document.getElementById('englishWord');
            const chineseElement = document.getElementById('chineseTranslation');

            if (phoneticElement) phoneticElement.textContent = 'Error: No Data';
            if (englishElement) englishElement.textContent = 'Please refresh the page';
            if (chineseElement) chineseElement.textContent = '';
            return;
        }

        // All PTE datasets use standardized pronunciation structure
        let phoneticPlain = '';
        let ipaOnly = '';

        // Standard PTE format: pronunciation.british / pronunciation.american
        if (word.pronunciation && word.pronunciation.british && word.pronunciation.american) {
            const useAmerican = this.getPronunciationPreference() === 'american';
            const selected = useAmerican ? word.pronunciation.american : word.pronunciation.british;

            phoneticPlain = selected.phonetic || '';
            ipaOnly = selected.ipa ? `/${selected.ipa}/` : '';
            
            // Store both pronunciations for toggle functionality
            this.currentWordPronunciations = {
                british: word.pronunciation.british,
                american: word.pronunciation.american
            };
        }
        // Fallback: pronunciation.british only (older or partial data)
        else if (word.pronunciation && word.pronunciation.british) {
            phoneticPlain = word.pronunciation.british.phonetic || '';
            ipaOnly = word.pronunciation.british.ipa ? `/${word.pronunciation.british.ipa}/` : '';
            this.currentWordPronunciations = { british: word.pronunciation.british };
        }
        // Legacy fallback (should not occur in current PTE datasets)
        else {
            console.warn('Word missing standard pronunciation data:', word.english);
        }

        // Update phonetic (top)
        const phoneticElement = document.getElementById('phoneticSpelling');
        if (phoneticElement) {
            if (phoneticPlain) {
                phoneticElement.textContent = phoneticPlain;
                phoneticElement.style.display = 'block';
            } else {
                phoneticElement.style.display = 'none';
            }
            phoneticElement.classList.add('word-change');
            setTimeout(() => {
                phoneticElement.classList.remove('word-change');
            }, 500);
        }

        // Update English word (middle)
        const englishElement = document.getElementById('englishWord');
        if (englishElement) {
            // For vocabulary-clean entries, make sure we're using the full word
            // and not just the phonetic representation
            if (word.source === 'vocabulary-clean') {
                // Handle words that might contain slashes (like "Behave/act")
                if (word.english.includes('/')) {
                    const fullWord = word.english.split('/')[0].trim();
                    englishElement.textContent = fullWord;
                } else {
                    englishElement.textContent = word.english;
                }
            } else {
                englishElement.textContent = word.english;
            }
            englishElement.classList.add('word-change');
            setTimeout(() => {
                englishElement.classList.remove('word-change');
            }, 500);
        }
        
        // Update word type badge (ONLY for vocabulary mode)
        const wordTypeBadge = document.getElementById('wordTypeBadge');
        const defaultMode = this.config.get('data.defaults.practiceMode') || this.config.get('fallbacks.practiceMode');
        const currentMode = this.getPracticeMode();
        
        if (wordTypeBadge) {
            // Only show word type in vocabulary mode, hide in practice modes (RS/ASQ/WFD)
            // Use Config.js mapping to determine if this is vocabulary mode
            const modeMapping = this.config.get('data.practiceModeMapping');
            const mapping = modeMapping && modeMapping[currentMode];
            const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');
            
            if (isVocabularyMode && word.wordType) {
                wordTypeBadge.textContent = `[${word.wordType}]`;
                wordTypeBadge.style.display = 'inline-block';
                wordTypeBadge.classList.add('word-change');
                setTimeout(() => {
                    wordTypeBadge.classList.remove('word-change');
                }, 500);
            } else {
                wordTypeBadge.style.display = 'none';
            }
        }

        // Update IPA (bottom)
        const ipaElement = document.getElementById('ipaNotation');
        if (ipaElement) {
            if (ipaOnly) {
                ipaElement.textContent = ipaOnly;
                ipaElement.style.display = 'block';
            } else {
                ipaElement.style.display = 'none';
            }
            ipaElement.classList.add('word-change');
            setTimeout(() => {
                ipaElement.classList.remove('word-change');
            }, 500);
        }

        // Hide old combined pronunciation if present
        const pronunciationElement = document.getElementById('pronunciationText');
        if (pronunciationElement) {
            pronunciationElement.style.display = 'none';
        }

        // Update example sentence display (for conversation vocabulary)
        const exampleElement = document.getElementById('exampleSentence');

        // Special handling for terms with definitions (PTE format)
        if (exampleElement && word.definition) {

            // Definition is now clean (no pronunciation), just display it directly
            if (word.definition && word.definition.trim()) {
                let displayContent = `<div class="example-english definition"><strong>Definition:</strong> ${word.definition}</div>`;

                exampleElement.innerHTML = displayContent;
                exampleElement.style.display = 'block';
                exampleElement.classList.add('word-change');

                setTimeout(() => {
                    exampleElement.classList.remove('word-change');
                }, 500);
            } else {
                // No definition, hide the element
                exampleElement.style.display = 'none';
            }
        }
        // Standard example sentence handling
        else if (exampleElement && word.example) {
            // Clean example sentence (remove speaker prefixes like "Jenny:", "Officer:", etc.)
            const cleanExample = this.cleanExampleSentence(word.example);

            // Display English examples
            let displayContent = `<div class="example-english">${cleanExample}</div>`;

            exampleElement.innerHTML = displayContent;
            exampleElement.style.display = 'block';
            exampleElement.classList.add('word-change');

            setTimeout(() => {
                exampleElement.classList.remove('word-change');
            }, 500);
        } else if (exampleElement) {
            exampleElement.style.display = 'none';
        }

        // Update progress display
        const totalWords = window.pteVocabularyManager.getTotalWordCount();
        window.progressTracker.updateProgress(index, totalWords, word);

    }

    displayFirstWord() {
        // Display the first word when vocabulary source changes
        const firstWord = window.pteVocabularyManager.getCurrentWord(0);
        if (firstWord) {
            this.displayWord(firstWord, 0);
        }
    }

    cleanExampleSentence(rawSentence) {
        // Remove speaker prefixes and conversation metadata
        let cleaned = rawSentence
            // Remove speaker names followed by colon (e.g., "Jenny:", "Officer:", "Doctor:")
            .replace(/^[A-Z][a-z]*\s*[：:]\s*/g, '')
            // Remove numbered dialogue markers (e.g., "1. ", "2. ")
            .replace(/^\d+\.\s*/g, '')
            // Remove text in parentheses (translations)
            .replace(/（[^）]*）/g, '')
            .replace(/\([^)]*\)/g, '')
            // Remove markdown image references
            .replace(/\\n!\[Image\]/g, '')
            // Remove extra whitespace and clean up
            .replace(/\s+/g, ' ')
            .trim();

        // Smart sentence splitting - ensure the vocabulary term appears in the displayed sentence
        // Get the current vocabulary term to ensure it's included in the displayed sentence
        const currentWord = window.pteVocabularyManager?.getCurrentWords()?.[window.pteVocabularyManager?.currentIndex]?.english;

        const maxLength = this.config.get('ui.text.maxLength');
        if (cleaned.length > maxLength) {
            const sentences = cleaned.split(/[.!?]+/);

            if (sentences.length > 1) {
                // Find the shortest sentence that contains the vocabulary term
                let selectedSentence = sentences[0]; // Default to first
                let bestSentence = null;
                let shortestLength = Infinity;

                if (currentWord) {
                    // Look for the vocabulary term in each sentence
                    for (let i = 0; i < sentences.length; i++) {
                        const sentence = sentences[i].trim();
                        if (sentence.toLowerCase().includes(currentWord.toLowerCase())) {
                            // Pick the shortest sentence that contains the term
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

                // Clean up the selected sentence
                selectedSentence = selectedSentence.trim();
                if (selectedSentence.length > 15) {
                    if (!/[.!?]$/.test(selectedSentence)) {
                        cleaned = selectedSentence + '.';
                    } else {
                        cleaned = selectedSentence;
                    }
                } else {
                    // Fallback: use first two sentences if selected is too short
                    cleaned = (sentences[0] + '. ' + sentences[1]).trim() + '.';
                }
            } else {
                // No clear sentence breaks, truncate at word boundary
                cleaned = cleaned.substring(0, 80).replace(/\s+\w+$/, '') + '...';
            }
        }

        return cleaned;
    }

    updateUI() {
        // Initial word display
        const currentIndex = window.audioControls.getCurrentIndex();
        const currentWord = window.pteVocabularyManager.getCurrentWord(currentIndex);

        if (currentWord) {
            this.displayWord(currentWord, currentIndex);
        } else if (window.pteVocabularyManager.getTotalWordCount() === 0) {
            window.progressTracker.updateStatus('No words available');
        }

        // Update category display
        this.updateBookDisplay();

        // Set initial UI state
        window.audioControls.showPausedUI();

        // Update button states
        this.updateButtons();
    }

    syncRepeatModeFromHTML() {
        // Repeat mode is now handled via event-driven architecture
        // Setting changes are automatically synced via 'setting:changed' events
        // This method is kept for backward compatibility but does nothing
        console.log('[UIController] syncRepeatModeFromHTML: Using event-driven settings (no-op)');
    }

    updateButtons() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');

        // Ensure we have vocabulary loaded
        const hasVocabulary = window.pteVocabularyManager.getTotalWordCount() > 0;

        // Get centralized opacity values
        const enabledOpacity = this.config.get('ui.opacity.enabled');
        const disabledOpacity = this.config.get('ui.opacity.disabled');

        // Always show all three buttons for consistent layout
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

        if (window.audioControls.isPlaying && hasVocabulary) {
            if (startBtn) startBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'inline-block';
        } else {
            if (startBtn) startBtn.style.display = 'inline-block';
            if (pauseBtn) pauseBtn.style.display = 'none';

            // Update start button state
            if (startBtn) {
                startBtn.disabled = !hasVocabulary;
                startBtn.style.opacity = hasVocabulary ? enabledOpacity : disabledOpacity;
                startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌ NO VOCABULARY';
            }
        }

        // Override: Keep navigation buttons enabled when vocabulary is loaded
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

    handleError(error) {
        console.error('UI Error:', error);
        window.progressTracker.showError(error.message || 'An error occurred');
    }

    showLoadingState() {
        window.progressTracker.updateStatus('Loading...');
    }

    hideLoadingState() {
        window.progressTracker.updateStatus('Ready');
    }

    /**
     * Get pronunciation preference (british or american)
     */
    getPronunciationPreference() {
        return this.pronunciationPreference || this.config.get('modes.pronunciation.british');
    }

    /**
     * Set pronunciation preference
     */
    setPronunciationPreference(preference) {
        this.pronunciationPreference = preference;
        // Update current word display if we have pronunciations available
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
     * Handle settings changes from SettingsModule
     */
    handleSettingsChange(key, value) {
        switch (key) {
            case 'category':
                this.updateBookDisplay();
                break;
            case 'difficulty':
                this.updateBookDisplay();
                break;
            case 'learningMode':
                // SettingsModule handles dependencies automatically
                this.updateBookDisplay();
                break;
            case 'speed':
                // Speed changes are handled by TTS engine
                break;
            case 'delay':
                // Delay changes are handled by audio controls
                break;
            case 'repeat':
                // Repeat mode changes are handled by audio controls
                break;
            case 'voice':
                // Voice changes are handled by voice selector
                break;
            default:
        }
    }

    /**
     * Handle practice mode changes by loading appropriate datasets and updating UI
     * All modes use the same .word-display container for unified UI experience
     *
     * @param {string} mode - Practice mode identifier from config.modes.practice
     *                        (e.g., 'vocabulary', 'rs', 'asq', 'wfd')
     * @fires events.mode.practice.changing - Before processing mode change
     * @fires events.mode.practice.changed - After processing mode change
     * @fires events.dataset.practice.changed - When dataset for mode is loaded
     * @requires SettingsModule - For mode and dataset settings
     * @requires DatasetManager - For loading practice datasets
     * @requires ProgressTracker - For status updates
     * @see loadPracticeDataset - Called for non-vocabulary modes to load dataset
     * @see displayContent - Used to display loaded content
     * @see Config.js - Source of mode mappings and enumerations
     * @throws {Error} May throw errors during dataset loading
     * @returns {Promise<boolean>} True if mode change was successful, false otherwise
     */
    async handlePracticeModeChange(mode) {
        // Safety check for valid mode
        if (!mode) {
            this.handleError(
                'Invalid practice mode',
                'No mode provided to handlePracticeModeChange',
                true
            );
            return false;
        }

        // Show status during mode change
        window.progressTracker?.updateStatus(`Changing to ${mode.toUpperCase()} mode...`);

        // Store current mode globally
        window.currentPracticeMode = mode;

        // Use Config.js mapping to determine mode type
        const modeMapping = this.config.get('data.practiceModeMapping');

        // Check that we have valid mappings - the first few loads during initialization might return empty objects
        if (!modeMapping || Object.keys(modeMapping).length === 0) {
            this.handleError(
                'Mode configuration not loaded',
                'Mode mappings not yet available, this is expected during initialization',
                false, // Don't show to user during initialization
                'warn'  // Log level
            );
            return false;
        }

        const mapping = modeMapping[mode];

        // Safety check for mapping
        if (!mapping) {
            this.handleError(
                `Invalid practice mode: ${mode}`,
                `No mapping found for mode ${mode} in config.data.practiceModeMapping`,
                true
            );
            return false;
        }

        const isVocabularyMode = mapping.type === this.config.get('modes.practice.vocabulary');

        // We don't need to emit the changing event here since we're responding to changes, not initiating them

        let success = false;

        // IMPORTANT: Ensure dataset settings are properly synchronized
        // Check if SettingsModule has a value for practiceDataset when in practice mode
        if (!isVocabularyMode && window.settingsModule) {
            const practiceDataset = window.settingsModule.get('practiceDataset');
            if (!practiceDataset) {
                console.log('[UIController] 📝 No practiceDataset in settings, setting default for this mode...');

                // Get default dataset from mode mapping
                if (mapping.defaultPracticeDataset) {
                    try {
                        await window.settingsModule.updateSetting('practiceDataset', mapping.defaultPracticeDataset);
                        console.log(`[UIController] ✅ Set practiceDataset to ${mapping.defaultPracticeDataset}`);
                    } catch (error) {
                        console.error(`[UIController] ❌ Failed to set practiceDataset: ${error.message}`);
                    }
                }
            } else {
                console.log(`[UIController] 📝 Using existing practiceDataset setting: ${practiceDataset}`);
            }
        }

        if (isVocabularyMode) {
            console.log('[UIController] Switching to vocabulary mode...');
            // Show vocabulary mode - restore normal display
            this.updateBookDisplay();
            this.displayFirstWord();
            success = true;
        } else {
            console.log(`[UIController] Switching to practice mode: ${mode}...`);

            // Practice modes (RS/ASQ/WFD) - load dataset and display first item
            const datasetLoaded = await this.loadPracticeDataset(mode);

            if (datasetLoaded) {
                // Update book display for practice mode
                const bookDisplay = document.getElementById('bookDisplay');
                if (bookDisplay) {
                    // Get mode labels from config using practiceModes array
                    const modeLabels = {};
                    const practiceModes = this.config.get('data.practiceModes') || [];
                    practiceModes.forEach(modeObj => {
                        modeLabels[modeObj.id] = modeObj.label;
                    });

                    // Use label from config or fallback to uppercase mode
                    bookDisplay.textContent = modeLabels[mode] || mode.toUpperCase();
                    console.log(`[UIController] Updated book display to: ${modeLabels[mode]}`);
                }

                success = true;
            } else {
                console.error(`[UIController] ❌ Failed to load dataset for mode: ${mode}`);
                window.progressTracker?.showError(`Failed to load dataset for ${mode} mode`);
                success = false;
            }
        }

        // Do NOT emit mode changed event here, as it creates an infinite recursion loop
        // The event is already emitted from the SettingsPanel or other callers
        // This handler simply responds to those events

        return success;
    }

    /**
     * Load dataset for practice mode and display first item
     * Uses unified displayContent() method for consistent UI across all modes
     *
     * @param {string} mode - Practice mode from Config.js modes.practice values
     *                         (e.g., 'rs', 'asq', 'wfd')
     * @throws {Error} If dataset loading fails or has invalid structure
     * @fires events.dataset.practice.changed - When a dataset is successfully loaded
     * @listens events.mode.practice.changed - Triggered when practice mode changes
     * @see displayContent - Method used to display loaded content
     * @see DatasetManager.loadDataset - Used to load the dataset
     * @returns {Promise<boolean>} True if dataset loaded successfully, false otherwise
     */
    async loadPracticeDataset(mode) {
        console.log(`[UIController] 📥 loadPracticeDataset() called with mode: ${mode}`);

        // Enhanced error handling for DatasetManager
        if (!window.datasetManager) {
            console.error('❌ DatasetManager not available');

            // Try to wait for DatasetManager to initialize
            if (typeof window.DatasetManager === 'function') {
                console.log('🔄 Creating new DatasetManager instance...');
                try {
                    const datasetManager = new window.DatasetManager();
                    const config = window.appConfig || { get: () => undefined };
                    await datasetManager.initialize(config);

                    // Make globally available
                    window.datasetManager = datasetManager;
                    console.log('✅ Successfully created DatasetManager instance');
                } catch (error) {
                    console.error('❌ Failed to create DatasetManager instance:', error);
                    window.progressTracker?.showError('Practice dataset feature not available');
                    return false;
                }
            } else {
                window.progressTracker?.showError('Practice dataset feature not available');
                return false;
            }
        }

        // Check if we have a valid mode
        if (!mode) {
            console.error('❌ No practice mode provided to loadPracticeDataset()');
            return false;
        }

        // Use the datasetFiles registry from Config.js instead of hardcoded mappings
        const datasetFiles = this.config.get('data.datasetFiles');

        // Map practice mode enum values to dataset types
        const datasetMap = {};

        // RS mode mapping
        const rsMode = this.config.get('modes.practice.repeatSentence');
        datasetMap[rsMode] = 'pte-repeat-sentence';

        // ASQ mode mapping
        const asqMode = this.config.get('modes.practice.answerShortQuestion');
        datasetMap[asqMode] = 'pte-answer-short-question';

        // WFD mode mapping
        const wfdMode = this.config.get('modes.practice.writeFromDictation');
        datasetMap[wfdMode] = 'pte-write-from-dictation';

        const datasetType = datasetMap[mode];
        if (!datasetType) {
            this.handleError(
                `Unknown practice mode: ${mode}`,
                `No dataset type mapping found for mode: ${mode}`,
                true
            );
            return false;
        }

        try {
            // Show loading status using getModule for progressTracker
            const progressTracker = this.getModule('progressTracker');
            progressTracker?.updateStatus(`Loading ${mode.toUpperCase()} dataset...`);

            // Get dataset ID through multiple fallback mechanisms
            let datasetId = null;

            // Try to get dataset from settings if available
            const settingsModule = this.getModule('settingsModule');
            if (settingsModule && typeof settingsModule.get === 'function') {
                datasetId = settingsModule.get('practiceDataset');
            }

            // If no dataset specified in settings, use the default from config mapping
            if (!datasetId) {
                const modeMapping = this.config.get('data.practiceModeMapping');
                const mapping = modeMapping && modeMapping[mode];
                if (mapping && mapping.defaultPracticeDataset) {
                    datasetId = mapping.defaultPracticeDataset;

                    // Update the settings for consistency using the same settingsModule reference
                    if (settingsModule && typeof settingsModule.updateSetting === 'function') {
                        try {
                            await settingsModule.updateSetting('practiceDataset', datasetId);
                        } catch (err) {
                            // Non-critical error
                            this.handleError(
                                'Failed to update settings',
                                err,
                                false, // Don't show to user
                                'warn'  // Log level
                            );
                        }
                    }
                }
            }

            // If still no dataset ID, try direct dataset ID from config
            if (!datasetId) {
                // Try matching direct dataset ID (rs -> pte-repeat-sentence)
                const datasetFiles = this.config.get('data.datasetFiles');
                if (datasetFiles && datasetFiles[mode]) {
                    datasetId = mode;
                }
            }

            // If still no dataset ID, use the mapped datasetType
            if (!datasetId) {
                datasetId = datasetType;
            }

            // Safety check - if still no datasetId, show error
            if (!datasetId) {
                this.handleError(
                    `Could not determine dataset ID for mode: ${mode}`,
                    `No datasetId available after checking settings, config mapping, and fallbacks`
                );
                return false;
            }

            // Load dataset with retry mechanism
            let dataset = null;
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
                try {
                    dataset = await window.datasetManager.loadDataset(datasetId);
                    break; // Break out of retry loop if successful
                } catch (loadError) {
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        // Wait before retrying (using Config.js value)
                        const retryDelay = this.config.get('ui.delays.retry') || 500;
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    } else {
                        throw loadError; // Re-throw if all retries failed
                    }
                }
            }

            if (!dataset) {
                throw new Error(`Dataset ${datasetId} could not be loaded after ${maxRetries} retries`);
            }

            if (!dataset.items || !Array.isArray(dataset.items) || dataset.items.length === 0) {
                throw new Error(`Dataset ${datasetId} is empty or has invalid structure`);
            }

            // Store in local state to reduce global state dependencies
            this.state.currentDataset = dataset;
            this.state.currentDatasetIndex = 0;
            this.state.currentItem = dataset.items[0];

            // Also update global references for backward compatibility
            window.currentDataset = dataset;
            window.currentDatasetIndex = 0;
            window.currentItem = dataset.items[0];

            // Display first item using unified method
            this.displayContent(dataset.items[0], mode);

            // Update progress status
            window.progressTracker?.updateStatus(`${mode.toUpperCase()} Mode - ${dataset.items.length} items loaded`);

            // Emit dataset change event (standardized from Config.js)
            const datasetChangedEvent = this.config.get('events.dataset.practice.changed');
            if (datasetChangedEvent) {
                window.eventBus.emit(datasetChangedEvent, {
                    mode: mode,
                    datasetId: datasetId,
                    itemCount: dataset.items.length
                });
            }

            return true;
        } catch (error) {
            // Enhanced error details for debugging dataset loading issues
            let errorDetails = error.message || 'Unknown error';
            let userMessage = `Failed to load dataset for ${mode}`;

            // Add context to help diagnose specific issues
            if (errorDetails.includes('fetch') || errorDetails.includes('HTTP')) {
                // Get path from config (single source of truth)
                const processedPath = this.config.get('data.paths.processed') || 'data/processed/';
                const fileName = datasetFiles[datasetType]?.file || `${datasetType}.json`;

                // Check if error has detailed diagnostics added by DatasetManager
                let diagnosticInfo = '';
                if (error.details) {
                    diagnosticInfo = `\nDiagnostic details: ${JSON.stringify(error.details, null, 2)}`;
                }

                errorDetails = `Network error: ${errorDetails}. Ensure dataset file exists at ${processedPath}${fileName}${diagnosticInfo}`;
                userMessage = `Dataset file not found for ${mode} mode. Please check the data directory.`;
            } else if (errorDetails.includes('Dataset type not found')) {
                errorDetails = `Dataset type error: ${errorDetails}. Available types in registry: ${Object.keys(datasetFiles || {}).join(', ')}`;
                userMessage = `Invalid dataset type for ${mode} mode. Configuration issue detected.`;
            } else if (errorDetails.includes('invalid structure') || errorDetails.includes('empty')) {
                errorDetails = `Dataset validation error: ${errorDetails}. Dataset ID: ${datasetId}, Type: ${datasetType}`;
                userMessage = `The ${mode} dataset has an invalid structure or is empty.`;
            }

            this.handleError(
                userMessage,
                errorDetails,
                true, // Show to user
                'error' // Log level
            );

            // Clear any partial state to prevent UI issues
            this.state.currentDataset = null;
            this.state.currentDatasetIndex = 0;
            this.state.currentItem = null;

            // Also clear global references for backward compatibility
            window.currentDataset = null;
            window.currentDatasetIndex = 0;
            window.currentItem = null;

            return false;
        }
    }

    /**
     * UNIFIED DISPLAY METHOD - Works for ALL modes!
     * Uses the same .word-display container for vocabulary/RS/ASQ/WFD
     *
     * @param {Object} item - Item to display (word, sentence, question)
     * @param {Object} [item.content] - Content object containing display data
     * @param {string} [item.content.word] - Word to display (vocabulary mode)
     * @param {string} [item.content.phoneticSpelling] - Phonetic spelling (vocabulary mode)
     * @param {string} [item.content.ipa] - IPA notation (vocabulary mode)
     * @param {string} [item.content.pronunciation] - Pronunciation guide (vocabulary mode)
     * @param {string} [item.content.example] - Example sentence (vocabulary mode)
     * @param {string} [item.content.sentence] - Sentence to display (rs/wfd modes)
     * @param {string} [item.content.translation] - Translation (rs/wfd modes)
     * @param {string} [item.content.question] - Question to display (asq mode)
     * @param {string} [item.content.answer] - Answer to display (asq mode)
     * @param {Object} [item.metadata] - Metadata for the item
     * @param {string} mode - Current mode from config.modes.practice
     * @returns {void}
     */
    displayContent(item, mode) {
        // Enhanced null checking with placeholder creation
        if (!item) {
            // Create a placeholder item structure to prevent null reference errors
            item = {
                content: {},
                metadata: {}
            };
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

        // Clear content elements (but NOT progressText - that's managed by ProgressTracker)
        [phoneticSpelling, englishWord, ipaNotation, pronunciationText, exampleSentence].forEach(el => {
            if (el) el.textContent = '';
        });
        
        // Hide word type badge for practice modes (RS/ASQ/WFD)
        // Word type badges are ONLY for vocabulary mode
        // Use Config.js mapping to determine if word type badge should be hidden
        const modeMapping = this.config.get('data.practiceModeMapping');
        const mapping = modeMapping && modeMapping[mode];
        const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');
        
        if (wordTypeBadge && !isVocabularyMode) {
            wordTypeBadge.style.display = 'none';
        }

        // Display based on mode
        switch(mode) {
            case this.config.get('modes.practice.vocabulary'):
                // Vocabulary mode - show word with phonetics
                if (item.content) {
                    if (englishWord) englishWord.textContent = item.content.word || '';
                    if (phoneticSpelling) {
                        phoneticSpelling.textContent = item.content.phoneticSpelling || '';
                        phoneticSpelling.style.display = item.content.phoneticSpelling ? '' : 'none';
                    }
                    if (ipaNotation) {
                        ipaNotation.textContent = item.content.ipa || '';
                        ipaNotation.style.display = item.content.ipa ? '' : 'none';
                    }
                    if (pronunciationText) {
                        pronunciationText.textContent = item.content.pronunciation || '';
                        pronunciationText.style.display = item.content.pronunciation ? '' : 'none';
                    }
                    if (exampleSentence) {
                        exampleSentence.textContent = item.content.example || '';
                        exampleSentence.style.display = item.content.example ? '' : 'none';
                    }
                }
                break;

            case this.config.get('modes.practice.repeatSentence'):
                // Repeat Sentence - show sentence only
                if (item.content && englishWord) {
                    englishWord.textContent = item.content.sentence || '';
                }
                // Hide phonetic fields
                if (phoneticSpelling) phoneticSpelling.style.display = 'none';
                if (ipaNotation) ipaNotation.style.display = 'none';
                if (pronunciationText) pronunciationText.style.display = 'none';
                // Show translation if available - with safe access using optional chaining
                if (exampleSentence && item.content?.translation) {
                    exampleSentence.textContent = item.content.translation;
                    exampleSentence.style.display = '';
                } else if (exampleSentence) {
                    exampleSentence.style.display = 'none';
                }
                break;

            case this.config.get('modes.practice.answerShortQuestion'):
                // Answer Short Question - show question and answer
                if (item.content && englishWord) {
                    englishWord.textContent = item.content?.question || '';
                }
                // Hide phonetic fields
                if (phoneticSpelling) phoneticSpelling.style.display = 'none';
                if (ipaNotation) ipaNotation.style.display = 'none';
                if (pronunciationText) pronunciationText.style.display = 'none';
                // Show answer in example sentence area with safe access using optional chaining
                if (exampleSentence && item.content?.answer) {
                    exampleSentence.innerHTML = `<div class="example-english"><strong>Answer:</strong> ${item.content.answer}</div>`;
                    exampleSentence.style.display = '';
                } else if (exampleSentence) {
                    exampleSentence.style.display = 'none';
                }
                break;

            case this.config.get('modes.practice.writeFromDictation'):
                // Write From Dictation - show the sentence to practice
                if (item.content && englishWord) {
                    englishWord.textContent = item.content?.sentence || '';
                }
                // Hide phonetic fields
                if (phoneticSpelling) phoneticSpelling.style.display = 'none';
                if (ipaNotation) ipaNotation.style.display = 'none';
                if (pronunciationText) pronunciationText.style.display = 'none';
                // Show translation if available - with safe access using optional chaining
                if (exampleSentence && item.content?.translation) {
                    exampleSentence.textContent = item.content.translation;
                    exampleSentence.style.display = '';
                } else if (exampleSentence) {
                    exampleSentence.style.display = 'none';
                }
                break;
        }

        // Show difficulty badge if available
        if (difficultyBadge && item.metadata && item.metadata.difficulty) {
            difficultyBadge.textContent = `${this.getDifficultyEmoji(item.metadata.difficulty)} ${item.metadata.difficulty}`;
            difficultyBadge.style.display = '';
        } else if (difficultyBadge) {
            difficultyBadge.style.display = 'none';
        }

        // Update progress text
        if (progressText && window.currentDataset) {
            const current = (window.currentDatasetIndex || 0) + 1;
            const total = window.currentDataset.items.length;
            progressText.textContent = `${current} / ${total}`;
        }

        // Store current item globally for TTS
        window.currentItem = item;
    }

    /**
     * Helper: Get emoji for difficulty level
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

// Global UI controller instance
const uiController = new UIController();

// Expose as global reference for PTE app
window.uiController = uiController;