// CCL Pronunciation Trainer - Main Application
class CCLPronunciationTrainer {
    constructor() {
        this.currentCategory = 'social-welfare';
        this.currentIndex = 0;
        this.isPlaying = false;
        this.speechRate = 1.0;
        this.delay = 2000;
        this.repeatMode = 'individual';
        this.currentRepeatCount = 0;
        this.targetRepeats = 2;
        this.currentWords = [];
        this.currentDifficulty = 'all';
        this.allWords = []; // Store unfiltered words
        this.categoryCounts = {}; // Store counts per category per difficulty
        
        this.init();
    }

    calculateCategoryCounts() {
        if (typeof vocabularyData === 'undefined') return;
        
        this.categoryCounts = {};
        
        // Calculate individual category counts
        Object.keys(vocabularyData).forEach(category => {
            this.categoryCounts[category] = {
                all: vocabularyData[category].length,
                easy: vocabularyData[category].filter(word => word.difficulty === 'easy').length,
                normal: vocabularyData[category].filter(word => word.difficulty === 'normal').length,
                hard: vocabularyData[category].filter(word => word.difficulty === 'hard').length
            };
        });
        
        // Calculate total counts across all categories
        this.categoryCounts['all-categories'] = {
            all: 0,
            easy: 0,
            normal: 0,
            hard: 0
        };
        
        Object.keys(vocabularyData).forEach(category => {
            this.categoryCounts['all-categories'].all += this.categoryCounts[category].all;
            this.categoryCounts['all-categories'].easy += this.categoryCounts[category].easy;
            this.categoryCounts['all-categories'].normal += this.categoryCounts[category].normal;
            this.categoryCounts['all-categories'].hard += this.categoryCounts[category].hard;
        });
        
        console.log('Category counts calculated:', this.categoryCounts);
    }

    updateCategoryDisplay() {
        const categorySelect = document.getElementById('categorySelect');
        if (!categorySelect || !this.categoryCounts) return;

        const categoryLabels = {
            'all-categories': '🌟 All Categories',
            'social-welfare': 'Social Welfare',
            'education': 'Education', 
            'legal-government': 'Legal & Government',
            'business-finance': 'Business & Finance',
            'medical-healthcare': 'Medical & Healthcare',
            'travel-immigration': 'Travel & Immigration'
        };

        // Update all option texts with current difficulty filter
        Array.from(categorySelect.options).forEach(option => {
            const category = option.value;
            const label = categoryLabels[category];
            
            if (label && this.categoryCounts[category]) {
                const count = this.categoryCounts[category][this.currentDifficulty] || 0;
                let suffix = 'words';
                if (this.currentDifficulty !== 'all') {
                    const emoji = { easy: '🟢', normal: '🟡', hard: '🔴' }[this.currentDifficulty] || '';
                    suffix = `${emoji} ${this.currentDifficulty}`;
                }
                option.textContent = `${label} (${count} ${suffix})`;
            }
        });
    }

    init() {
        // Prevent multiple initialization
        if (this.initialized) {
            console.warn('Already initialized, skipping');
            return;
        }
        this.initialized = true;
        
        this.bindEventListeners();
        this.syncRepeatModeFromHTML(); // Sync with HTML selection
        this.loadCategory(this.currentCategory);
        this.updateUI();
        console.log('CCL Pronunciation Trainer initialized');
    }

    syncRepeatModeFromHTML() {
        const repeatSelect = document.getElementById('repeatSelect');
        if (repeatSelect) {
            this.repeatMode = repeatSelect.value;
            switch(this.repeatMode) {
                case 'individual':
                    this.targetRepeats = 2;
                    break;
                case 'intensive':
                    this.targetRepeats = 3;
                    break;
                case 'once':
                    this.targetRepeats = 1;
                    break;
                case 'loop':
                    this.targetRepeats = 1;
                    break;
                default:
                    this.targetRepeats = 1;
            }
            console.log(`Repeat mode synced: ${this.repeatMode} (${this.targetRepeats}x)`);
        }
    }

    bindEventListeners() {
        // Category selection
        document.getElementById('categorySelect').addEventListener('change', (e) => {
            this.loadCategory(e.target.value);
        });

        // Difficulty selection
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.currentDifficulty = e.target.value;
            console.log(`Difficulty changed to: ${this.currentDifficulty}`);
            this.filterByDifficulty();
            this.updateCategoryDisplay(); // Update counts in category selector
        });

        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startAutoPlay();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseAutoPlay();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextWord();
        });

        document.getElementById('prevBtn').addEventListener('click', () => {
            this.previousWord();
        });

        // Settings
        document.getElementById('speedSelect').addEventListener('change', (e) => {
            this.speechRate = parseFloat(e.target.value);
        });

        document.getElementById('delaySelect').addEventListener('change', (e) => {
            this.delay = parseInt(e.target.value);
        });

        document.getElementById('repeatSelect').addEventListener('change', (e) => {
            this.repeatMode = e.target.value;
            // Set target repeats based on mode
            switch(this.repeatMode) {
                case 'individual':
                    this.targetRepeats = 2;
                    break;
                case 'intensive':
                    this.targetRepeats = 3;
                    break;
                case 'once':
                    this.targetRepeats = 1;
                    break;
                case 'loop':
                    this.targetRepeats = 1;
                    break;
                default:
                    this.targetRepeats = 1;
            }
            
            
            // Reset repeat count when changing mode
            this.currentRepeatCount = 0;
            
            console.log(`Repeat mode changed to: ${this.repeatMode} (${this.targetRepeats}x)`);
            
            // Update status if currently playing
            if (this.isPlaying) {
                if (this.repeatMode === 'individual' || this.repeatMode === 'intensive') {
                    this.updateStatus(`Playing... (1/${this.targetRepeats})`);
                } else {
                    this.updateStatus('Playing...');
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
                e.preventDefault();
                this.togglePlayback();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                this.nextWord();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                this.previousWord();
            }
        });
    }

    loadCategory(category) {
        this.currentCategory = category;
        
        try {
            // Check if vocabularyData is available
            if (typeof vocabularyData === 'undefined') {
                throw new Error('Vocabulary data not loaded. Please refresh the page.');
            }
            
            if (category === 'all-categories') {
                // Combine all categories into one array
                this.allWords = [];
                Object.keys(vocabularyData).forEach(cat => {
                    this.allWords = this.allWords.concat(vocabularyData[cat]);
                });
                
                // Shuffle for variety across categories
                this.shuffleArray(this.allWords);
                
                if (this.allWords.length === 0) {
                    throw new Error('No vocabulary data found');
                }
            } else {
                if (!vocabularyData[category]) {
                    throw new Error(`Category "${category}" not found`);
                }
                
                if (!Array.isArray(vocabularyData[category]) || vocabularyData[category].length === 0) {
                    throw new Error(`No vocabulary found for category "${category}"`);
                }
                
                this.allWords = vocabularyData[category];
            }
            this.filterByDifficulty(); // Apply current difficulty filter
            this.currentIndex = 0;
            console.log(`Loaded ${this.allWords.length} words from ${category} category`);
            this.updateUI();
            this.updateCategoryDisplay(); // Refresh category counts
            
        } catch (error) {
            console.error('Vocabulary loading error:', error.message);
            this.currentWords = [];
            this.showError(error.message);
        }
    }

    filterByDifficulty() {
        if (!this.allWords || this.allWords.length === 0) {
            this.currentWords = [];
            return;
        }

        if (this.currentDifficulty === 'all') {
            this.currentWords = [...this.allWords];
        } else {
            this.currentWords = this.allWords.filter(word => 
                word.difficulty === this.currentDifficulty
            );
        }

        // Reset index and repeat count when filtering
        this.currentIndex = 0;
        this.currentRepeatCount = 0;
        
        // Stop any ongoing playback when filtering
        if (this.isPlaying) {
            this.isPlaying = false;
            this.updateButtons();
            this.updateStatus('Ready - vocabulary filtered');
        }

        console.log(`Filtering: ${this.allWords.length} total words → ${this.currentWords.length} ${this.currentDifficulty} words`);
        
        // Handle empty filter results
        if (this.currentWords.length === 0) {
            this.updateStatus(`No ${this.currentDifficulty} words found in this category`);
        }
        
        this.updateUI();
    }

    async startAutoPlay() {
        if (this.currentWords.length === 0) {
            this.showError('No vocabulary loaded');
            return;
        }

        this.isPlaying = true;
        this.currentRepeatCount = 0; // Reset repeat count when starting
        this.updateButtons();
        
        // Show initial status with repeat info
        if (this.repeatMode === 'individual' || this.repeatMode === 'intensive') {
            this.updateStatus(`Playing... (1/${this.targetRepeats})`);
        } else {
            this.updateStatus('Playing...');
        }

        await this.playCurrentWord();
        
        if (this.isPlaying) {
            this.scheduleNext();
        }
    }

    pauseAutoPlay() {
        this.isPlaying = false;
        this.updateButtons();
        this.updateStatus('Paused');
        
        // Cancel speech
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pauseAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    async playCurrentWord() {
        if (!this.currentWords[this.currentIndex]) return;

        const word = this.currentWords[this.currentIndex];
        this.displayWord(word);

        try {
            // Play English only (cleaned for better TTS)
            const cleanText = this.cleanTextForTTS(word.english);
            await this.speak(cleanText, 'en-AU');
        } catch (error) {
            console.warn('Speech error:', error);
            // Don't show error to user - fallback is already handled in speak()
            this.showTTSFallback(cleanText);
        }
    }

    speak(text, lang = 'en-AU') {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                this.showTTSFallback(text);
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = this.speechRate;
            utterance.volume = 1.0;
            utterance.pitch = 1.0;
            
            // Try to find appropriate voice
            const voices = speechSynthesis.getVoices();
            const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
            if (voice) {
                utterance.voice = voice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (error) => {
                // 'interrupted' is normal when user clicks rapidly or auto-advances
                if (error.error === 'interrupted') {
                    resolve(); // Just continue, this is expected
                    return;
                }
                
                console.warn('TTS Error:', error.error);
                // Try fallback without voice for other errors
                if (voice && utterance.voice && error.error !== 'not-allowed') {
                    utterance.voice = null;
                    speechSynthesis.speak(utterance);
                } else {
                    this.showTTSFallback(text);
                    resolve();
                }
            };

            // Cancel any existing speech before starting new one
            speechSynthesis.cancel();
            
            // Small delay to ensure cancellation is complete
            setTimeout(() => {
                speechSynthesis.speak(utterance);
            }, 50);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    scheduleNext() {
        setTimeout(() => {
            if (this.isPlaying) {
                this.advanceToNext();
                if (this.isPlaying) {
                    this.playCurrentWord().then(() => {
                        if (this.isPlaying) {
                            this.scheduleNext();
                        }
                    });
                }
            }
        }, this.delay);
    }

    advanceToNext() {
        if (this.repeatMode === 'individual' || this.repeatMode === 'intensive') {
            this.currentRepeatCount++;
            
            // If we haven't reached target repeats, stay on current word
            if (this.currentRepeatCount < this.targetRepeats) {
                this.updateStatus(`Playing... (${this.currentRepeatCount + 1}/${this.targetRepeats})`);
                return;
            }
            
            // Reset repeat count and move to next word
            this.currentRepeatCount = 0;
        }
        
        this.nextWord();
    }

    nextWord() {
        if (this.currentWords.length === 0) return;

        // Reset repeat count when manually navigating
        this.currentRepeatCount = 0;

        this.currentIndex++;
        if (this.currentIndex >= this.currentWords.length) {
            if (this.repeatMode === 'loop') {
                this.currentIndex = 0;
            } else {
                this.pauseAutoPlay();
                this.updateStatus('Completed');
                return;
            }
        }
        this.updateProgress();
        this.displayWord(this.currentWords[this.currentIndex]);
    }

    previousWord() {
        if (this.currentWords.length === 0) return;

        // Reset repeat count when manually navigating
        this.currentRepeatCount = 0;

        this.currentIndex--;
        if (this.currentIndex < 0) {
            this.currentIndex = this.currentWords.length - 1;
        }
        this.updateProgress();
        this.displayWord(this.currentWords[this.currentIndex]);
    }

    displayWord(word) {
        document.getElementById('englishWord').textContent = word.english;
        document.getElementById('chineseWord').textContent = word.chinese;
        
        // Update difficulty badge
        const difficultyBadge = document.getElementById('difficultyBadge');
        const termCounter = document.getElementById('termCounter');
        
        if (word.difficulty) {
            const difficultyEmojis = {
                'easy': '🟢',
                'normal': '🟡', 
                'hard': '🔴'
            };
            
            difficultyBadge.textContent = `${difficultyEmojis[word.difficulty]} ${word.difficulty.toUpperCase()}`;
            difficultyBadge.className = `difficulty-badge ${word.difficulty}`;
        }
        
        // Update term counter
        termCounter.textContent = `Term ${this.currentIndex + 1}/${this.currentWords.length}`;
    }

    updateUI() {
        this.updateProgress();
        if (this.currentWords.length > 0) {
            this.displayWord(this.currentWords[this.currentIndex]);
            document.querySelector('.word-meta').style.display = 'flex';
        } else {
            document.getElementById('englishWord').textContent = 'No vocabulary found for this difficulty level';
            document.getElementById('chineseWord').textContent = '此难度级别未找到词汇';
            document.querySelector('.word-meta').style.display = 'none';
        }
    }

    updateProgress() {
        const progress = this.currentWords.length > 0 
            ? Math.round(((this.currentIndex + 1) / this.currentWords.length) * 100)
            : 0;
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${this.currentIndex + 1} / ${this.currentWords.length} (${progress}%)`;
    }

    updateButtons() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const btnGroup = document.querySelector('.btn-secondary-group');
        
        // Ensure we have vocabulary loaded
        const hasVocabulary = this.currentWords && this.currentWords.length > 0;

        if (this.isPlaying && hasVocabulary) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
            if (btnGroup) btnGroup.style.display = 'flex';
        } else {
            startBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
            if (btnGroup) btnGroup.style.display = hasVocabulary ? 'flex' : 'none';
            
            // Disable start button if no vocabulary
            if (startBtn) {
                startBtn.disabled = !hasVocabulary;
                startBtn.style.opacity = hasVocabulary ? '1' : '0.5';
                startBtn.textContent = hasVocabulary ? '▶️ START' : '❌ NO VOCABULARY';
            }
        }

        // Disable previous button if at first word
        if (prevBtn && hasVocabulary) {
            prevBtn.disabled = (this.currentIndex === 0);
            prevBtn.style.opacity = (this.currentIndex === 0) ? '0.5' : '1';
        }
    }

    updateStatus(status) {
        const statusDisplay = document.querySelector('.current-status');
        if (statusDisplay) {
            statusDisplay.textContent = status;
        }
    }

    showError(message) {
        console.error(message);
        this.updateStatus(`Error: ${message}`);
    }

    showTTSFallback(text) {
        this.updateStatus(`🔊 Please read aloud: "${text}"`);
        setTimeout(() => {
            this.updateStatus('Text-to-speech not available in this browser');
        }, 3000);
    }

    cleanTextForTTS(text) {
        return text
            .replace(/\([^)]*\)/g, '') // Remove parentheses content
            .replace(/;.*$/g, '')      // Remove text after semicolon
            .replace(/,.*$/g, '')      // Remove text after comma (for multi-definitions)
            
            // Expand common abbreviations to full forms for better pronunciation
            .replace(/\bADHD\b/gi, 'Attention Deficit Hyperactivity Disorder')
            .replace(/\bG\.P\.\b/gi, 'General Practitioner')  // Handle G.P. with periods
            .replace(/\bGP\b/gi, 'General Practitioner')
            .replace(/\bE\.N\.T\.\b/gi, 'Ear Nose and Throat')  // Handle E.N.T. with periods
            .replace(/\bENT\b/gi, 'Ear Nose and Throat')
            .replace(/\bCCL\b/gi, 'Credentialed Community Language')
            .replace(/\bNAATI\b/gi, 'National Accreditation Authority for Translators and Interpreters')
            .replace(/\bTAFE\b/gi, 'Technical and Further Education')
            .replace(/\bATO\b/gi, 'Australian Taxation Office')
            .replace(/\bABS\b/gi, 'Australian Bureau of Statistics')
            .replace(/\bDHS\b/gi, 'Department of Human Services')
            .replace(/\bPBS\b/gi, 'Pharmaceutical Benefits Scheme')
            .replace(/\bMRI\b/gi, 'Magnetic Resonance Imaging')
            .replace(/\bCT\b/gi, 'Computed Tomography')
            .replace(/\bECG\b/gi, 'Electrocardiogram')
            .replace(/\bABN\b/gi, 'Australian Business Number')
            .replace(/\bACN\b/gi, 'Australian Company Number')
            .replace(/\bGST\b/gi, 'Goods and Services Tax')
            .replace(/\bSMS\b/gi, 'Short Message Service')
            .replace(/\bATM\b/gi, 'Automated Teller Machine')
            .replace(/\bID\b/gi, 'Identification')
            .replace(/\bTV\b/gi, 'Television')
            .replace(/\bPC\b/gi, 'Personal Computer')
            .replace(/\bCEO\b/gi, 'Chief Executive Officer')
            .replace(/\bCFO\b/gi, 'Chief Financial Officer')
            .replace(/\bHR\b/gi, 'Human Resources')
            .replace(/\bIT\b/gi, 'Information Technology')
            .replace(/\bPR\b/gi, 'Public Relations')
            .replace(/\bVCE\b/gi, 'Victorian Certificate of Education')
            .replace(/\bHSC\b/gi, 'Higher School Certificate')
            .replace(/\bATAR\b/gi, 'Australian Tertiary Admission Rank')
            .replace(/\bUAI\b/gi, 'Universities Admission Index')
            .replace(/\bRTO\b/gi, 'Registered Training Organization')
            .replace(/\bIELTS\b/gi, 'International English Language Testing System')
            .replace(/\bTOEFL\b/gi, 'Test of English as a Foreign Language')
            .replace(/\bESL\b/gi, 'English as a Second Language')
            
            // Grammar abbreviations
            .replace(/\bsth\b/gi, 'something')  // Expand 'sth' to 'something'
            .replace(/\bsb\b/gi, 'somebody')    // Expand 'sb' to 'somebody'
            .replace(/\betc\b/gi, 'etcetera')   // Expand 'etc' to 'etcetera'
            .replace(/\be\.g\.\b/gi, 'for example')  // Expand 'e.g.' to 'for example'
            .replace(/\bi\.e\.\b/gi, 'that is')      // Expand 'i.e.' to 'that is'
            
            .trim();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for voices to be loaded
    if ('speechSynthesis' in window) {
        speechSynthesis.addEventListener('voiceschanged', initApp, { once: true });
        // Fallback if voiceschanged doesn't fire
        setTimeout(initApp, 100);
    } else {
        console.warn('Speech synthesis not supported');
        initApp();
    }
});

function initApp() {
    // Prevent multiple app instances
    if (window.cclApp) {
        console.warn('App already initialized, skipping');
        return;
    }
    
    window.cclApp = new CCLPronunciationTrainer();
    window.cclApp.calculateCategoryCounts();
    window.cclApp.updateCategoryDisplay();
}