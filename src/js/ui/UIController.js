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
        window.eventBus.on('vocabulary:categoryLoaded', (data) => {
            this.updateCategoryDisplay();
            this.updateButtons();
        });

        window.eventBus.on('vocabulary:difficultyFiltered', (data) => {
            this.updateCategoryDisplay();
            this.updateButtons();
        });

        // Listen for learning mode changes
        window.eventBus.on('vocabulary:learningModeChanged', (data) => {
            // Reset audio position to first word
            window.audioControls.setCurrentIndex(0);
            this.updateCategoryDisplay();
            this.updateButtons();
            this.displayFirstWord(); // Show first word of new mode
        });

        // Listen for word display events
        window.eventBus.on('word:display', (data) => {
            this.displayWord(data.word, data.index);
        });

        // Listen for TTS speaking started to sync display with actual speech
        window.eventBus.on('tts:speakingStarted', (data) => {
            // Get current word and index from audio controls for accurate sync
            const currentIndex = window.audioControls.getCurrentIndex();
            const currentWord = window.pteVocabularyManager.getCurrentWord(currentIndex);
            if (currentWord) {
                this.displayWord(currentWord, currentIndex);
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
        // Category selection removed - each vocabulary book is a single category.
        // The learningMode (vocabulary book) selector serves this purpose.

        // Difficulty selection - use SettingsManager
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            window.pteVocabularyManager.setDifficulty(e.target.value);
            this.updateCategoryDisplay(); // Update counts in category selector and context bar
            // Save difficulty preference through SettingsManager
            if (window.settingsManager) {
                window.settingsManager.updateSetting('difficulty', e.target.value);
            }
        });

        // Learning mode selection
        document.getElementById('learningModeSelect').addEventListener('change', async (e) => {
            const newMode = e.target.value;
            await window.pteVocabularyManager.setLearningMode(newMode);
            this.updateCategoryDisplay(); // Update UI for new mode

            // Save the learning mode through SettingsManager
            if (window.settingsManager) {
                window.settingsManager.updateSetting('learningMode', newMode);
            }
        });

        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            window.audioControls.startAutoPlay();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            window.audioControls.pauseAutoPlay();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            window.audioControls.nextWord();
        });

        document.getElementById('prevBtn').addEventListener('click', () => {
            window.audioControls.previousWord();
        });

        // Settings
        document.getElementById('speedSelect').addEventListener('change', (e) => {
            window.ttsEngine.setSpeechRate(parseFloat(e.target.value));
            // Save speed preference through SettingsManager
            if (window.settingsManager) {
                window.settingsManager.updateSetting('speed', e.target.value);
            }
        });

        document.getElementById('delaySelect').addEventListener('change', (e) => {
            window.audioControls.setDelay(parseInt(e.target.value));
            // Save delay preference through SettingsManager
            if (window.settingsManager) {
                window.settingsManager.updateSetting('delay', e.target.value);
            }
        });

        document.getElementById('repeatSelect').addEventListener('change', (e) => {
            window.audioControls.setRepeatMode(e.target.value);

            // Reset repeat count when changing mode
            window.ttsEngine.currentRepeatCount = 0;


            // Save repeat preference through SettingsManager
            if (window.settingsManager) {
                window.settingsManager.updateSetting('repeat', e.target.value);
            }

            // Don't override the progress display during auto-play
        });

        // Voice selection - use SettingsManager
        document.getElementById('voiceSelect').addEventListener('change', (e) => {
            window.voiceSelector.setPreferredVoice(e.target.value);
            // Save voice preference through SettingsManager
            if (window.settingsManager) {
                window.settingsManager.updateSetting('voice', e.target.value);
            }
        });

        // Note: Event listeners for learningMode, category, and difficulty 
        // are already defined above - no need for duplicates

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
        this.updateCategoryDisplay(); // Initial update
    }

    /**
     * Initialize dropdowns based on current configuration
     */
    initializeDropdowns() {
        if (window.settingsManager) {
            // Use SettingsManager to populate ALL dropdowns consistently
            this.populateAllDropdownsFromSettingsManager();
        } else {
            console.warn('⚠️ SettingsManager not available - dropdowns may not work properly');
        }

    }

    /**
     * Populate ALL dropdowns using SettingsManager (unified approach)
     */
    populateAllDropdownsFromSettingsManager() {
        const settingsManager = window.settingsManager;
        if (!settingsManager) return;

        // Vocabulary book (learning mode) dropdown
        this.populateDropdown('learningModeSelect', 'learningMode', 'pte-fib-listening');

        // Difficulty dropdown
        this.populateDropdown('difficultySelect', 'difficulty', 'all');

        // Audio dropdowns
        this.populateDropdown('speedSelect', 'speed', '0.7');
        const defaultDelay = this.config.get('tts.delays.normal');
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

        const settingsManager = window.settingsManager;
        const options = settingsManager.getAvailableOptions(settingKey);

        element.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.label;
            if (option.id === defaultValue) optionElement.selected = true;
            element.appendChild(optionElement);
        });
    }

    updateCategoryDisplay() {
        const categoryDisplay = document.getElementById('categoryDisplay');

        if (!window.pteVocabularyManager) return;

        const currentWords = window.pteVocabularyManager.getCurrentWords();
        const totalWords = window.pteVocabularyManager.getAllWords().length;
        const currentMode = window.pteVocabularyManager.currentLearningMode || 'pte-fib-listening';

        // Get friendly name for current vocabulary book
        const modeLabels = {
            'pte-fib-listening': '🎧 PTE FIB Listening',
            'pte-beginner': '📗 PTE Beginner',
            'pte-intermediate': '📘 PTE Intermediate'
        };

        // Update context bar display with vocabulary book name and word count
        if (categoryDisplay) {
            const modeName = modeLabels[currentMode] || currentMode;
            let displayText = `${modeName} (${currentWords.length}/${totalWords})`;
            
            // Add difficulty indicator if filtered
            if (window.pteVocabularyManager.getCurrentDifficulty() !== 'all') {
                const emoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[window.pteVocabularyManager.getCurrentDifficulty()] || '';
                displayText += ` ${emoji}`;
            }
            
            categoryDisplay.textContent = displayText;
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
        this.updateCategoryDisplay();

        // Set initial UI state
        window.audioControls.showPausedUI();

        // Update button states
        this.updateButtons();
    }

    syncRepeatModeFromHTML() {
        const repeatSelect = document.getElementById('repeatSelect');
        if (repeatSelect) {
            window.audioControls.setRepeatMode(repeatSelect.value);
        }
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
     * Handle settings changes from SettingsManager
     */
    handleSettingsChange(key, value) {
        switch (key) {
            case 'category':
                this.updateCategoryDisplay();
                break;
            case 'difficulty':
                this.updateCategoryDisplay();
                break;
            case 'learningMode':
                // SettingsManager handles dependencies automatically
                this.updateCategoryDisplay();
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
}

// Global UI controller instance
const uiController = new UIController();

// Expose as global reference for PTE app
window.uiController = uiController;