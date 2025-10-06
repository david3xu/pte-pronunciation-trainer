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
            console.log('UIController: Vocabulary loaded, updating UI');
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
            console.log('UIController: Learning mode changed to:', data.mode);
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
    }

    bindEventListeners() {
        // Category selection
        document.getElementById('categorySelect').addEventListener('change', (e) => {
            window.pteVocabularyManager.setCategory(e.target.value);
            // Save category preference
            if (window.settingsPanel) {
                window.settingsPanel.saveSetting('category', e.target.value);
            }
        });

        // Difficulty selection
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            window.pteVocabularyManager.setDifficulty(e.target.value);
            this.updateCategoryDisplay(); // Update counts in category selector and context bar
            // Save difficulty preference
            if (window.settingsPanel) {
                window.settingsPanel.saveSetting('difficulty', e.target.value);
            }
        });

        // Learning mode selection
        document.getElementById('learningModeSelect').addEventListener('change', async (e) => {
            const newMode = e.target.value;
            await window.pteVocabularyManager.setLearningMode(newMode);
            this.updateCategoryDisplay(); // Update UI for new mode
            console.log(`Learning mode changed to: ${newMode}`);

            // Save the learning mode to localStorage
            if (window.storage && window.storage.isAvailable()) {
                window.storage.setItem('learningMode', newMode);
                console.log(`Learning mode saved to storage: ${newMode}`);
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
            // Save speed preference
            if (window.settingsPanel) {
                window.settingsPanel.saveSetting('speed', e.target.value);
            }
        });

        document.getElementById('delaySelect').addEventListener('change', (e) => {
            window.audioControls.setDelay(parseInt(e.target.value));
            // Save delay preference
            if (window.settingsPanel) {
                window.settingsPanel.saveSetting('delay', e.target.value);
            }
        });

        document.getElementById('repeatSelect').addEventListener('change', (e) => {
            window.audioControls.setRepeatMode(e.target.value);

            // Reset repeat count when changing mode
            window.ttsEngine.currentRepeatCount = 0;

            console.log(`Repeat mode changed to: ${e.target.value}`);

            // Save repeat preference
            if (window.settingsPanel) {
                window.settingsPanel.saveSetting('repeat', e.target.value);
            }

            // Don't override the progress display during auto-play
        });

        // Voice selection
        document.getElementById('voiceSelect').addEventListener('change', (e) => {
            window.voiceSelector.setPreferredVoice(e.target.value);
            // Save voice preference
            if (window.settingsPanel) {
                window.settingsPanel.saveSetting('voice', e.target.value);
            }
        });

        // Update category display in context bar
        document.getElementById('categorySelect').addEventListener('change', () => {
            this.updateCategoryDisplay();
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

        this.updateCategoryDisplay(); // Initial update
    }

    updateCategoryDisplay() {
        const categorySelect = document.getElementById('categorySelect');
        const categoryDisplay = document.getElementById('categoryDisplay');

        if (!categorySelect || !window.pteVocabularyManager) return;

        const categoryLabels = window.appConfig?.config?.vocabulary?.categories || {};

        // Update all option texts with current difficulty filter
        Array.from(categorySelect.options).forEach(option => {
            const category = option.value;
            const label = categoryLabels[category];

            if (label) {
                const currentWords = window.pteVocabularyManager.getCurrentWords();
                const count = currentWords.length;
                let suffix = 'words';
                if (window.pteVocabularyManager.getCurrentDifficulty() !== 'all') {
                    const emoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[window.pteVocabularyManager.getCurrentDifficulty()] || '';
                    suffix = `${emoji} ${window.pteVocabularyManager.getCurrentDifficulty()}`;
                }
                option.textContent = `${label} (${count} ${suffix})`;
            }
        });

        // Update the context bar display with current category name
        if (categoryDisplay) {
            const currentCategoryName = categoryLabels[window.pteVocabularyManager.getCurrentCategory()] || window.pteVocabularyManager.getCurrentCategory();
            console.log(`Updating context bar display: ${window.pteVocabularyManager.getCurrentCategory()} → ${currentCategoryName}`);
            categoryDisplay.textContent = currentCategoryName;
        }
    }

    displayWord(word, index) {
        if (!word) return;

        // Resolve pronunciation pieces: phonetic (no asterisks) and IPA
        let phoneticPlain = '';
        let ipaOnly = '';

        // NEW: Use standardized pronunciationGuide structure (unified data pipeline)
        if (word.pronunciationGuide && word.pronunciationGuide.british) {
            const british = word.pronunciationGuide.british;
            phoneticPlain = british.phonetic || '';
            ipaOnly = british.ipa ? `/${british.ipa}/` : '';
            console.log('Using pronunciationGuide (British):', { ipaOnly, phoneticPlain });
        }
        // PTE terms: Use pronunciation structure with British/American IPA
        else if (word.pronunciation && word.pronunciation.british && word.pronunciation.american) {
            const british = word.pronunciation.british;
            const american = word.pronunciation.american;

            // Check if user prefers American pronunciation
            const useAmerican = this.getPronunciationPreference() === 'american';
            const selected = useAmerican ? american : british;

            phoneticPlain = selected.phonetic || '';
            ipaOnly = selected.ipa ? `/${selected.ipa}/` : '';
            console.log(`Using PTE pronunciation (${useAmerican ? 'American' : 'British'}):`, { ipaOnly, phoneticPlain, british, american });

            // Store both pronunciations for toggle functionality
            this.currentWordPronunciations = { british, american };
        }
        // NEW: Direct ipa and phonetic fields from unified pipeline
        else if (word.ipa || word.phonetic) {
            phoneticPlain = word.phonetic || '';
            ipaOnly = word.ipa ? `/${word.ipa}/` : '';
            console.log('Using direct ipa/phonetic fields:', { ipaOnly, phoneticPlain });
        }
        // Legacy support for old data formats (can be removed in future versions)
        else if (word.source && (word.source.includes('legacy') || word.source.includes('resume') || word.source.includes('aiml'))) {
            console.warn('Legacy data format detected, consider updating to PTE format');
            // Minimal fallback handling for any remaining legacy data
        }
        // No fallback needed - PTE dataset contains all pronunciation data

        // Update phonetic (top)
        const phoneticElement = document.getElementById('phoneticSpelling');
        if (phoneticElement) {
            if (phoneticPlain) {
                phoneticElement.textContent = phoneticPlain;
                phoneticElement.style.display = 'block';
                console.log('Displaying phonetic:', phoneticPlain);
            } else {
                phoneticElement.style.display = 'none';
                console.log('No phonetic to display');
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
                console.log('Vocabulary word:', word);
                // Handle words that might contain slashes (like "Behave/act")
                // or other special characters
                if (word.english.includes('/')) {
                    // Get the full phrase before any '/' character
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
                console.log('Displaying IPA:', ipaOnly);
            } else {
                ipaElement.style.display = 'none';
                console.log('No IPA to display');
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
        console.log('Example debug - word.example:', word.example ? 'EXISTS' : 'MISSING');
        console.log('Example debug - word.definition:', word.definition ? 'EXISTS' : 'MISSING');
        console.log('Example debug - word keys:', Object.keys(word));

        // Special handling for terms with definitions (PTE format)
        if (exampleElement && word.definition) {
            console.log('Showing definition for term:', word.definition);
            console.log('Word source:', word.source);
            console.log('Word definition exists:', !!word.definition);

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
            console.log('Showing example sentence:', cleanExample);

            // Display English examples
            let displayContent = `<div class="example-english">${cleanExample}</div>`;

            exampleElement.innerHTML = displayContent;
            exampleElement.style.display = 'block';
            exampleElement.classList.add('word-change');

            setTimeout(() => {
                exampleElement.classList.remove('word-change');
            }, 500);
        } else if (exampleElement) {
            console.log('Hiding example sentence - no word.example or definition found');
            exampleElement.style.display = 'none';
        }

        // Update progress display
        const totalWords = window.pteVocabularyManager.getTotalWordCount();
        window.progressTracker.updateProgress(index, totalWords, word);

        console.log(`Displayed word ${index + 1}/${totalWords}: "${word.english}"`);
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
        console.log('Original sentence length:', cleaned.length, '- Content:', cleaned);

        // Get the current vocabulary term to ensure it's included in the displayed sentence
        const currentWord = window.pteVocabularyManager?.getCurrentWords()?.[window.pteVocabularyManager?.currentIndex]?.english;
        console.log('Current vocabulary term:', currentWord);

        if (cleaned.length > 50) {
            const sentences = cleaned.split(/[.!?]+/);
            console.log('Split into sentences:', sentences);

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
                            console.log(`Found term "${currentWord}" in sentence ${i + 1}: "${sentence}"`);
                            // Pick the shortest sentence that contains the term
                            if (sentence.length < shortestLength) {
                                bestSentence = sentence;
                                shortestLength = sentence.length;
                            }
                        }
                    }

                    if (bestSentence) {
                        selectedSentence = bestSentence;
                        console.log(`Using shortest sentence containing term: "${selectedSentence}"`);
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
                    console.log('Using selected sentence:', cleaned);
                } else {
                    // Fallback: use first two sentences if selected is too short
                    cleaned = (sentences[0] + '. ' + sentences[1]).trim() + '.';
                    console.log('Using first two sentences as fallback:', cleaned);
                }
            } else {
                // No clear sentence breaks, truncate at word boundary
                cleaned = cleaned.substring(0, 80).replace(/\s+\w+$/, '') + '...';
                console.log('Truncated at word boundary:', cleaned);
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
            console.log(`Repeat mode synced from HTML: ${repeatSelect.value}`);
        }
    }

    updateButtons() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');

        // Ensure we have vocabulary loaded
        const hasVocabulary = window.pteVocabularyManager.getTotalWordCount() > 0;

        // Always show all three buttons for consistent layout
        if (nextBtn) {
            nextBtn.style.display = 'inline-block';
            nextBtn.disabled = !hasVocabulary;
            nextBtn.style.opacity = hasVocabulary ? '1' : '0.5';
        }
        if (prevBtn) {
            prevBtn.style.display = 'inline-block';
            prevBtn.disabled = !hasVocabulary;
            prevBtn.style.opacity = hasVocabulary ? '1' : '0.5';
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
                startBtn.style.opacity = hasVocabulary ? '1' : '0.5';
                startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌ NO VOCABULARY';
            }
        }

        // Override: Keep navigation buttons enabled when vocabulary is loaded
        if (hasVocabulary) {
            if (prevBtn) {
                prevBtn.disabled = false;
                prevBtn.style.opacity = '1';
            }
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.style.opacity = '1';
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
        console.log(`Switched to ${newPreference} pronunciation`);
        return newPreference;
    }
}

// Global UI controller instance
// Create and expose global instance
const uiController = new UIController();

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('uiController', uiController);
}

// Legacy compatibility - maintain existing global reference
window.uiController = uiController;