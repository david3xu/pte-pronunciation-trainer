// UIController - DOM manipulation and display updates
class UIController {
    constructor() {
        this.initialized = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for vocabulary events
        window.eventBus.on('vocabulary:categoryLoaded', (data) => {
            this.updateCategoryDisplay();
            this.updateButtons();
        });

        window.eventBus.on('vocabulary:difficultyFiltered', (data) => {
            this.updateCategoryDisplay();
            this.updateButtons();
        });

        // Listen for word display events
        window.eventBus.on('word:display', (data) => {
            this.displayWord(data.word, data.index);
        });

        // Listen for progress events
        window.eventBus.on('progress:updated', (data) => {
            // Progress display is handled by ProgressTracker
        });
    }

    bindEventListeners() {
        // Category selection
        document.getElementById('categorySelect').addEventListener('change', (e) => {
            window.vocabularyManager.loadCategory(e.target.value);
        });

        // Difficulty selection
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            window.vocabularyManager.setDifficulty(e.target.value);
            this.updateCategoryDisplay(); // Update counts in category selector and context bar
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
        });

        document.getElementById('delaySelect').addEventListener('change', (e) => {
            window.audioControls.setDelay(parseInt(e.target.value));
        });

        document.getElementById('repeatSelect').addEventListener('change', (e) => {
            window.audioControls.setRepeatMode(e.target.value);
            
            // Reset repeat count when changing mode
            window.ttsEngine.currentRepeatCount = 0;
            
            console.log(`Repeat mode changed to: ${e.target.value}`);
            
            // Don't override the progress display during auto-play
        });

        // Voice selection
        document.getElementById('voiceSelect').addEventListener('change', (e) => {
            window.voiceSelector.setPreferredVoice(e.target.value);
        });

        // Update category display in context bar
        document.getElementById('categorySelect').addEventListener('change', () => {
            this.updateCategoryDisplay();
        });
        
        this.updateCategoryDisplay(); // Initial update
    }

    updateCategoryDisplay() {
        const categorySelect = document.getElementById('categorySelect');
        const categoryDisplay = document.getElementById('categoryDisplay');
        
        if (!categorySelect || !window.vocabularyManager.categoryCounts) return;

        const categoryLabels = window.vocabularyManager.categoryLabels;

        // Update all option texts with current difficulty filter
        Array.from(categorySelect.options).forEach(option => {
            const category = option.value;
            const label = categoryLabels[category];
            
            if (label && window.vocabularyManager.categoryCounts[category]) {
                const count = window.vocabularyManager.categoryCounts[category][window.vocabularyManager.currentDifficulty] || 0;
                let suffix = 'words';
                if (window.vocabularyManager.currentDifficulty !== 'all') {
                    const emoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[window.vocabularyManager.currentDifficulty] || '';
                    suffix = `${emoji} ${window.vocabularyManager.currentDifficulty}`;
                }
                option.textContent = `${label} (${count} ${suffix})`;
            }
        });
        
        // Update the context bar display with current category name
        if (categoryDisplay) {
            const currentCategoryName = categoryLabels[window.vocabularyManager.currentCategory] || window.vocabularyManager.currentCategory;
            console.log(`Updating context bar display: ${window.vocabularyManager.currentCategory} → ${currentCategoryName}`);
            categoryDisplay.textContent = currentCategoryName;
        }
    }

    displayWord(word, index) {
        if (!word) return;

        // Update English word display
        const englishElement = document.getElementById('englishWord');
        if (englishElement) {
            englishElement.textContent = word.english;
            englishElement.classList.add('word-change');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                englishElement.classList.remove('word-change');
            }, 500);
        }

        // Update Chinese word display
        const chineseElement = document.getElementById('chineseWord');
        if (chineseElement) {
            // Handle conversation vocabulary differently - they don't have individual translations
            if (word.chinese) {
                chineseElement.textContent = word.chinese;
            } else if (word.example && word.exampleChinese) {
                // For conversation vocabulary, show that Chinese is available in context
                chineseElement.textContent = 'See context below';
                chineseElement.style.fontStyle = 'italic';
                chineseElement.style.opacity = '0.7';
            } else {
                chineseElement.textContent = 'Translation not available';
            }
            
            chineseElement.classList.add('word-change');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                chineseElement.classList.remove('word-change');
                // Reset styles
                chineseElement.style.fontStyle = 'normal';
                chineseElement.style.opacity = '1';
            }, 500);
        }

        // Update example sentence display (for conversation vocabulary)
        const exampleElement = document.getElementById('exampleSentence');
        console.log('Example debug - word.example:', word.example ? 'EXISTS' : 'MISSING');
        console.log('Example debug - word keys:', Object.keys(word));
        
        if (exampleElement && word.example) {
            // Clean example sentence (remove speaker prefixes like "Jenny:", "Officer:", etc.)
            const cleanExample = this.cleanExampleSentence(word.example);
            console.log('Showing example sentence:', cleanExample);
            
            // Display both English and Chinese examples
            let displayContent = `<div class="example-english">${cleanExample}</div>`;
            if (word.exampleChinese) {
                displayContent += `<div class="example-chinese">${word.exampleChinese}</div>`;
            }
            
            exampleElement.innerHTML = displayContent;
            exampleElement.style.display = 'block';
            exampleElement.classList.add('word-change');
            
            setTimeout(() => {
                exampleElement.classList.remove('word-change');
            }, 500);
        } else if (exampleElement) {
            console.log('Hiding example sentence - no word.example found');
            exampleElement.style.display = 'none';
        }

        // Update progress display
        const totalWords = window.vocabularyManager.getTotalWords();
        window.progressTracker.updateProgress(index, totalWords, word);

        console.log(`Displayed word ${index + 1}/${totalWords}: "${word.english}" - "${word.chinese || 'No translation'}"`);
    }

    displayFirstWord() {
        // Display the first word when vocabulary source changes
        const firstWord = window.vocabularyManager.getCurrentWord(0);
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
            // Remove Chinese text in parentheses (translations)
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
        const currentWord = window.vocabularyManager?.currentWords?.[window.vocabularyManager?.currentIndex]?.english;
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
        const currentWord = window.vocabularyManager.getCurrentWord(currentIndex);
        
        if (currentWord) {
            this.displayWord(currentWord, currentIndex);
        } else if (window.vocabularyManager.getTotalWords() === 0) {
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
        const hasVocabulary = window.vocabularyManager.getTotalWords() > 0;

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
}

// Global UI controller instance
window.uiController = new UIController();