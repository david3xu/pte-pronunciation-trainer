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
            
            // Update status if currently playing
            if (window.audioControls.isPlaying) {
                const targetRepeats = window.ttsEngine.getTargetRepeats();
                if (e.target.value === 'individual' || e.target.value === 'intensive') {
                    window.progressTracker.updateStatus(`Playing... (1/${targetRepeats})`);
                } else {
                    window.progressTracker.updateStatus('Playing...');
                }
            }
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
            chineseElement.textContent = word.chinese || 'Translation not available';
            chineseElement.classList.add('word-change');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                chineseElement.classList.remove('word-change');
            }, 500);
        }

        // Update example sentence display (for conversation vocabulary)
        const exampleElement = document.getElementById('exampleSentence');
        if (exampleElement && word.examples && word.examples.length > 0) {
            // Get a clean example sentence (remove speaker prefixes like "Jenny:", "Officer:", etc.)
            const rawExample = word.examples[0].text;
            const cleanExample = this.cleanExampleSentence(rawExample);
            
            exampleElement.textContent = cleanExample;
            exampleElement.style.display = 'block';
            exampleElement.classList.add('word-change');
            
            setTimeout(() => {
                exampleElement.classList.remove('word-change');
            }, 500);
        } else if (exampleElement) {
            exampleElement.style.display = 'none';
        }

        // Update progress display
        const totalWords = window.vocabularyManager.getTotalWords();
        window.progressTracker.updateProgress(index, totalWords, word);

        console.log(`Displayed word ${index + 1}/${totalWords}: "${word.english}" - "${word.chinese || 'No translation'}"`);
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
        
        // If the sentence is too long, take the first complete sentence
        if (cleaned.length > 150) {
            const sentences = cleaned.split(/[.!?]+/);
            if (sentences.length > 1 && sentences[0].length > 30) {
                cleaned = sentences[0] + '.';
            } else {
                cleaned = cleaned.substring(0, 150) + '...';
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