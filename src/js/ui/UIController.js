// UIController - DOM manipulation and display updates
class UIController {
    constructor() {
        this.initialized = false;
        // Load configuration from centralized config
        this.config = window.appConfig || new AppConfig();
        this.pronunciationPreference = 'british'; // Default to British
        this.currentWordPronunciations = null; // Store current word's pronunciations
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for vocabulary loaded event
        window.eventBus.on('vocabulary:loaded', (data) => {
            this.updateUI();
        });

        // Listen for vocabulary events
        window.eventBus.on('vocabulary:difficultyFiltered', (data) => {
            this.updateBookDisplay();
            this.updateButtons();
        });

        // Listen for learning mode changes
        window.eventBus.on('vocabulary:learningModeChanged', (data) => {
            // Reset audio position to first word
            window.audioControls.setCurrentIndex(0);
            this.updateBookDisplay();
            this.updateButtons();
            this.displayFirstWord(); // Show first word of new mode
        });
        
        // Phase 2: Listen for practice mode changes
        window.eventBus.on('practice:modeChanged', (data) => {
            console.log('[UIController] 🔄 practice:modeChanged event received:', data);
            this.handlePracticeModeChange(data.mode);
        });

        // Listen for word display events
        window.eventBus.on('word:display', (data) => {
            this.displayWord(data.word, data.index);
        });

        // Listen for TTS speaking started to sync display with actual speech
        window.eventBus.on('tts:speakingStarted', (data) => {
            // Only sync display for vocabulary mode
            // Practice modes (RS/ASQ/WFD) manage their own display via displayContent()
            if (window.currentPracticeMode === 'vocabulary' || !window.currentPracticeMode) {
                // Get current word and index from audio controls for accurate sync
                const currentIndex = window.audioControls.getCurrentIndex();
                const currentWord = window.pteVocabularyManager.getCurrentWord(currentIndex);
                if (currentWord) {
                    this.displayWord(currentWord, currentIndex);
                }
            }
        });

        // Listen for progress events
        window.eventBus.on('progress:updated', (data) => {
            // Progress display is handled by ProgressTracker
        });

        // Listen for settings changes using centralized event names
        const settingsChangedEvent = this.config.get('settings.events.changed');
        window.eventBus.on(settingsChangedEvent, (data) => {
            // Update UI based on settings changes
            this.handleSettingsChange(data.key, data.value);
        });
    }

    bindEventListeners() {
        // Bind all settings controls using event-driven architecture
        this.bindSettingControls();

        // Control buttons - using event-driven architecture
        document.getElementById('startBtn').addEventListener('click', () => {
            window.eventBus.emit('audio:start');
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            window.eventBus.emit('audio:pause');
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            // Mode-aware: emit appropriate next event
            const mode = window.currentPracticeMode || 'vocabulary';
            window.eventBus.emit('audio:next', { mode });
        });

        document.getElementById('prevBtn').addEventListener('click', () => {
            // Mode-aware: emit appropriate prev event
            const mode = window.currentPracticeMode || 'vocabulary';
            window.eventBus.emit('audio:prev', { mode });
        });

        // Pronunciation toggle button
        const pronunciationToggleBtn = document.getElementById('pronunciationToggleBtn');
        if (pronunciationToggleBtn) {
            pronunciationToggleBtn.addEventListener('click', () => {
                const newPreference = this.togglePronunciation();
                // Update button icon using configurable flags
                const britishFlag = this.config.get('ui.elements.pronunciationToggle.british');
                const americanFlag = this.config.get('ui.elements.pronunciationToggle.american');
                pronunciationToggleBtn.textContent = newPreference === 'british' ? britishFlag : americanFlag;
                pronunciationToggleBtn.title = `Current: ${newPreference === 'british' ? 'British' : 'American'} pronunciation`;
            });
        }

        // Initialize dropdowns based on current settings
        this.initializeDropdowns();
        this.updateBookDisplay(); // Initial update
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
                    // Emit event for SettingsModule to handle
                    if (window.eventBus) {
                        window.eventBus.emit('setting:request-change', {
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
        this.populateDropdown('practiceModeSelect', 'practiceMode', 'vocabulary');

        // Vocabulary book (learning mode) dropdown
        this.populateDropdown('learningModeSelect', 'learningMode', 'pte-fib-listening');
        
        // Practice dataset dropdown (for RS/ASQ/WFD modes)
        this.populateDropdown('practiceDatasetSelect', 'practiceDataset', 'pte-repeat-sentence');

        // Difficulty dropdown
        this.populateDropdown('difficultySelect', 'difficulty', 'all');

        // Audio dropdowns
        this.populateDropdown('speedSelect', 'speed', '0.7');
        const defaultDelay = this.config.get('tts.delays.long'); // Match SettingsModule default
        this.populateDropdown('delaySelect', 'delay', String(defaultDelay));
        this.populateDropdown('repeatSelect', 'repeat', 'once');
        this.populateDropdown('voiceSelect', 'voice', 'auto');
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
        const currentMode = window.pteVocabularyManager.currentLearningMode || 'pte-fib-listening';

        // Get friendly name for current vocabulary book
        const modeLabels = {
            'pte-fib-listening': '🎧 PTE FIB Listening',
            'pte-beginner': '📗 PTE Beginner',
            'pte-intermediate': '📘 PTE Intermediate',
            'pte-advanced': '📕 PTE Advanced',
            'pte-ra': '📚 PTE Read Aloud (RA)',
            'pte-rs': '🎯 PTE Repeat Sentence (RS)',
            'pte-must-know': '⭐ PTE Must-Know',
            'pte-wfd-vocab': '✍️ PTE WFD Vocab',
            'pte-reading-fib': '📖 PTE Reading FIB',
            'pte-reading-fib-drag': '🔀 PTE Reading FIB Drag'
        };

        // Update context bar display with vocabulary book name and word count
        if (bookDisplay) {
            const modeName = modeLabels[currentMode] || currentMode;
            let displayText = `${modeName} (${currentWords.length}/${totalWords})`;
            
            // Add difficulty indicator if filtered
            if (window.pteVocabularyManager.getCurrentDifficulty() !== 'all') {
                const emoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[window.pteVocabularyManager.getCurrentDifficulty()] || '';
                displayText += ` ${emoji}`;
            }
            
            bookDisplay.textContent = displayText;
        }
    }

    displayWord(word, index) {
        if (!word) return;

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
        
        // Update word type badge (if available) - NEW
        const wordTypeBadge = document.getElementById('wordTypeBadge');
        if (wordTypeBadge) {
            if (word.wordType) {
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
        return this.pronunciationPreference || 'british';
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
        const newPreference = current === 'british' ? 'american' : 'british';
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
     * Phase 2 SIMPLIFIED: Handle practice mode changes
     * All modes use the same .word-display container!
     * @param {string} mode - 'vocabulary' | 'rs' | 'asq' | 'wfd'
     */
    async handlePracticeModeChange(mode) {
        console.log(`[UIController] 🎯 handlePracticeModeChange called with mode: ${mode}`);
        
        // Store current mode globally
        window.currentPracticeMode = mode;
        console.log(`[UIController] Stored window.currentPracticeMode: ${window.currentPracticeMode}`);
        
        if (mode === 'vocabulary') {
            console.log('[UIController] Switching to vocabulary mode...');
            // Show vocabulary mode - restore normal display
            this.updateBookDisplay();
            this.displayFirstWord();
        } else {
            console.log(`[UIController] Switching to practice mode: ${mode}...`);
            // Practice modes (RS/ASQ/WFD) - load dataset and display first item
            await this.loadPracticeDataset(mode);
            
            // Update book display for practice mode
            const bookDisplay = document.getElementById('bookDisplay');
            if (bookDisplay) {
                const modeLabels = {
                    'rs': '🎤 Repeat Sentence',
                    'asq': '❓ Answer Short Question',
                    'wfd': '✍️ Write From Dictation'
                };
                bookDisplay.textContent = modeLabels[mode] || mode.toUpperCase();
                console.log(`[UIController] Updated book display to: ${modeLabels[mode]}`);
            }
        }
    }

    /**
     * SIMPLIFIED: Load dataset for practice mode and display first item
     * Uses unified displayContent() method - same UI for all modes!
     */
    async loadPracticeDataset(mode) {
        if (!window.datasetManager) {
            console.error('❌ DatasetManager not available');
            return;
        }

        // Map practice mode to dataset type
        const datasetMap = {
            'rs': 'repeat-sentence',
            'asq': 'answer-short-question',
            'wfd': 'write-from-dictation'
        };

        const datasetType = datasetMap[mode];
        if (!datasetType) {
            console.warn(`Unknown practice mode: ${mode}`);
            return;
        }

        try {
            console.log(`📥 Loading dataset for ${mode}...`);
            const dataset = await window.datasetManager.loadDataset(datasetType);
            
            if (dataset && dataset.items && dataset.items.length > 0) {
                console.log(`✅ Loaded ${dataset.items.length} items for ${mode}`);
                
                // Store dataset and index globally (simple approach)
                window.currentDataset = dataset;
                window.currentDatasetIndex = 0;
                
                // IMPORTANT: Update currentItem so PLAY button works
                window.currentItem = dataset.items[0];
                
                // Display first item using unified method
                this.displayContent(dataset.items[0], mode);
                
                console.log(`📄 Displaying first item:`, dataset.items[0]);
            } else {
                console.error(`❌ No items found in dataset for ${mode}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load dataset for ${mode}:`, error);
        }
    }

    /**
     * UNIFIED DISPLAY METHOD - Works for ALL modes!
     * Uses the same .word-display container for vocabulary/RS/ASQ/WFD
     * @param {Object} item - Item to display (word, sentence, question)
     * @param {string} mode - Current mode ('vocabulary', 'rs', 'asq', 'wfd')
     */
    displayContent(item, mode) {
        if (!item) return;

        console.log(`[UIController] 📺 displayContent() called - Mode: ${mode}`);
        console.log(`[UIController] Item content:`, item.content);

        // Get DOM elements
        const phoneticSpelling = document.getElementById('phoneticSpelling');
        const englishWord = document.getElementById('englishWord');
        const ipaNotation = document.getElementById('ipaNotation');
        const pronunciationText = document.getElementById('pronunciationText');
        const exampleSentence = document.getElementById('exampleSentence');
        const progressText = document.getElementById('progressText');
        const difficultyBadge = document.getElementById('difficultyBadge');

        // Clear all first
        [phoneticSpelling, englishWord, ipaNotation, pronunciationText, exampleSentence, progressText].forEach(el => {
            if (el) el.textContent = '';
        });

        // Display based on mode
        switch(mode) {
            case 'vocabulary':
                // Vocabulary mode - show word with phonetics
                console.log(`[Vocabulary Mode] Displaying:`, {
                    word: item.content?.word,
                    phoneticSpelling: item.content?.phoneticSpelling,
                    ipa: item.content?.ipa,
                    pronunciation: item.content?.pronunciation,
                    example: item.content?.example
                });
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

            case 'rs':
                // Repeat Sentence - show sentence only
                console.log(`[RS Mode] Displaying:`, {
                    sentence: item.content?.sentence,
                    translation: item.content?.translation
                });
                if (item.content && englishWord) {
                    englishWord.textContent = item.content.sentence || '';
                }
                // Hide phonetic fields
                if (phoneticSpelling) phoneticSpelling.style.display = 'none';
                if (ipaNotation) ipaNotation.style.display = 'none';
                if (pronunciationText) pronunciationText.style.display = 'none';
                // Show translation if available
                if (exampleSentence && item.content.translation) {
                    exampleSentence.textContent = item.content.translation;
                    exampleSentence.style.display = '';
                } else if (exampleSentence) {
                    exampleSentence.style.display = 'none';
                }
                break;

            case 'asq':
                // Answer Short Question - show question and answer
                console.log(`[ASQ Mode] Displaying:`, {
                    question: item.content?.question,
                    answer: item.content?.answer
                });
                if (item.content && englishWord) {
                    englishWord.textContent = item.content.question || '';
                }
                // Hide phonetic fields
                if (phoneticSpelling) phoneticSpelling.style.display = 'none';
                if (ipaNotation) ipaNotation.style.display = 'none';
                if (pronunciationText) pronunciationText.style.display = 'none';
                // Show answer in example sentence area
                if (exampleSentence && item.content.answer) {
                    exampleSentence.innerHTML = `<div class="example-english"><strong>Answer:</strong> ${item.content.answer}</div>`;
                    exampleSentence.style.display = '';
                } else if (exampleSentence) {
                    exampleSentence.style.display = 'none';
                }
                break;

            case 'wfd':
                // Write From Dictation - show the sentence to practice
                console.log(`[WFD Mode] Displaying:`, {
                    sentence: item.content?.sentence,
                    translation: item.content?.translation
                });
                if (item.content && englishWord) {
                    englishWord.textContent = item.content.sentence || '';
                }
                // Hide phonetic fields
                if (phoneticSpelling) phoneticSpelling.style.display = 'none';
                if (ipaNotation) ipaNotation.style.display = 'none';
                if (pronunciationText) pronunciationText.style.display = 'none';
                // Show translation if available
                if (exampleSentence && item.content.translation) {
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