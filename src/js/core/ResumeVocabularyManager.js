// ResumeVocabularyManager - Specialized version for professional vocabulary
// Modified from VocabularyManager for resume branch
class ResumeVocabularyManager {
    constructor() {
        this.currentCategory = 'all-categories';
        this.currentDifficulty = 'all';
        this.currentLearningMode = 'resume-terms'; // resume-terms, aiml-terms, professional-terms
        this.currentWords = [];
        this.allWords = []; // Store unfiltered words
        this.categoryCounts = {}; // Store counts per category per difficulty
        this.currentIndex = 0;
        this.isInitialized = false;

        // State management integration
        this.stateManager = null;

        // Store different datasets
        this.resumeTermsDataset = null; // Dataset for resume-terms mode
        this.aimlTermsDataset = null; // Dataset for AI/ML terms with definitions
        this.professionalTermsDataset = null; // Combined dataset

        // Professional category labels
        this.categoryLabels = {
            'all-categories': '🌟 All Categories',
            'foundation-terms': '🧠 Foundation Terms',
            'essential-production-terms': '⚙️ Production Terms',
            'agent-automation-terms': '🤖 Agent & Automation',
            'model-training-data': '📊 Model Training',
            'explainability-trust': '🔍 Explainability & Trust',
            'mlops-production': '🚀 MLOps & Production',
            'natural-language-processing': '📝 NLP',
            'computer-vision': '👁️ Computer Vision',
            'model-types-architectures': '📐 Model Architectures',
            'optimization-efficiency': '⚡ Optimization',
            'safety-governance': '🛡️ Safety & Governance',
            'performance-metrics': '📈 Performance Metrics',
            'infrastructure-deployment': '🏗️ Infrastructure',
            'collaboration-development': '👥 Collaboration',
            'current-trends': '🚀 2025 Trends'
        };

        // Bind event handlers
        this.handleLearningModeChange = this.handleLearningModeChange.bind(this);
        this.handleCategoryChange = this.handleCategoryChange.bind(this);
        this.handleDifficultyChange = this.handleDifficultyChange.bind(this);

        // Register with event bus
        if (window.eventBus) {
            window.eventBus.on('settings:learningModeChanged', this.handleLearningModeChange);
            window.eventBus.on('settings:categoryChanged', this.handleCategoryChange);
            window.eventBus.on('settings:difficultyChanged', this.handleDifficultyChange);
        }
    }

    // Initialize the vocabulary manager
    async initialize() {
        console.log('🔤 Initializing Resume Vocabulary Manager...');

        try {
            await this.loadResumeData();
            this.isInitialized = true;
            console.log('✅ Resume Vocabulary Manager initialized successfully');

            // Emit initialization event
            if (window.eventBus) {
                window.eventBus.emit('vocabulary:initialized', {
                    mode: this.currentLearningMode,
                    totalWords: this.getTotalWords()
                });
            }

        } catch (error) {
            console.error('❌ Failed to initialize Resume Vocabulary Manager:', error);
        }
    }

    // Load resume data from JSON files
    async loadResumeData() {
        console.log('📚 Loading resume data...');

        try {
            // Load resume terms dataset
            const resumeResponse = await fetch('data/processed/resume-terms-dataset.json');
            this.resumeTermsDataset = await resumeResponse.json();
            console.log(`✅ Loaded ${this.resumeTermsDataset.vocabulary.length} resume terms`);

            // Load AI/ML terms dataset
            const aimlResponse = await fetch('data/processed/aiml-terms-dataset.json');
            this.aimlTermsDataset = await aimlResponse.json();
            console.log(`✅ Loaded ${this.aimlTermsDataset.vocabulary.length} AI/ML terms`);

            // Load or create professional terms dataset (combined)
            try {
                const professionalResponse = await fetch('data/processed/professional-terms-dataset.json');
                this.professionalTermsDataset = await professionalResponse.json();
            } catch (e) {
                // Create combined dataset if not available
                this.professionalTermsDataset = {
                    metadata: {
                        generated: new Date().toISOString(),
                        totalTerms: this.resumeTermsDataset.vocabulary.length + this.aimlTermsDataset.vocabulary.length,
                        source: 'resume-branch-combined',
                        description: 'Combined professional vocabulary',
                        version: '2.0'
                    },
                    vocabulary: [
                        ...this.resumeTermsDataset.vocabulary,
                        ...this.aimlTermsDataset.vocabulary
                    ]
                };
            }

            console.log(`✅ Combined dataset has ${this.professionalTermsDataset.vocabulary.length} terms`);

            // Set initial learning mode and load words
            this.setLearningMode('resume-terms');

        } catch (error) {
            console.error('❌ Error loading resume data:', error);
            throw error;
        }
    }

    // Handle learning mode changes
    handleLearningModeChange(mode) {
        this.setLearningMode(mode);
    }

    // Handle category changes
    handleCategoryChange(category) {
        this.setCategory(category);
    }

    // Handle difficulty changes
    handleDifficultyChange(difficulty) {
        this.setDifficulty(difficulty);
    }

    // Set the current learning mode
    setLearningMode(mode) {
        console.log(`🔄 Changing learning mode to: ${mode}`);

        if (!this.isInitialized) {
            console.warn('VocabularyManager not yet initialized, deferring mode change');
            this.currentLearningMode = mode;
            return;
        }

        this.currentLearningMode = mode;

        // Load the appropriate dataset
        switch (mode) {
            case 'resume-terms':
                this.allWords = this.resumeTermsDataset.vocabulary;
                break;
            case 'aiml-terms':
                this.allWords = this.aimlTermsDataset.vocabulary;
                break;
            case 'professional-terms':
                this.allWords = this.professionalTermsDataset.vocabulary;
                break;
            default:
                this.allWords = this.resumeTermsDataset.vocabulary;
        }

        // Calculate category counts
        this.calculateCategoryCounts();

        // Apply current category and difficulty filters
        this.applyFilters();

        // Emit event
        if (window.eventBus) {
            window.eventBus.emit('vocabulary:loaded', {
                mode: this.currentLearningMode,
                totalWords: this.getTotalWords(),
                filteredWords: this.currentWords.length
            });
        }
    }

    // Set the current category
    setCategory(category) {
        console.log(`🔄 Changing category to: ${category}`);
        this.currentCategory = category;
        this.applyFilters();

        // Emit event for category change
        if (window.eventBus) {
            window.eventBus.emit('vocabulary:categoryChanged', {
                category: this.currentCategory,
                filteredWords: this.currentWords.length
            });
        }
    }

    // Set the current difficulty level
    setDifficulty(difficulty) {
        console.log(`🔄 Changing difficulty to: ${difficulty}`);
        this.currentDifficulty = difficulty;
        this.applyFilters();

        // Emit event for difficulty change
        if (window.eventBus) {
            window.eventBus.emit('vocabulary:difficultyChanged', {
                difficulty: this.currentDifficulty,
                filteredWords: this.currentWords.length
            });
        }
    }

    // Apply category and difficulty filters
    applyFilters() {
        // Start with all words for the current learning mode
        let filteredWords = [...this.allWords];

        // Apply category filter
        if (this.currentCategory !== 'all-categories') {
            filteredWords = filteredWords.filter(word =>
                word.category && word.category.toLowerCase() === this.currentCategory.toLowerCase());
        }

        // Apply difficulty filter
        if (this.currentDifficulty !== 'all') {
            filteredWords = filteredWords.filter(word =>
                word.difficulty && word.difficulty.toLowerCase() === this.currentDifficulty.toLowerCase());
        }

        // Update current words
        this.currentWords = filteredWords;

        console.log(`🔍 Applied filters: ${this.currentWords.length} words match (category: ${this.currentCategory}, difficulty: ${this.currentDifficulty})`);

        // Reset current index if out of bounds
        if (this.currentIndex >= this.currentWords.length) {
            this.currentIndex = 0;
        }
    }

    // Calculate word counts by category and difficulty
    calculateCategoryCounts() {
        this.categoryCounts = {
            total: { easy: 0, normal: 0, hard: 0, all: 0 }
        };

        // Initialize counts for each category
        Object.keys(this.categoryLabels).forEach(category => {
            this.categoryCounts[category] = { easy: 0, normal: 0, hard: 0, all: 0 };
        });

        // Count words by category and difficulty
        this.allWords.forEach(word => {
            const category = word.category ? word.category.toLowerCase() : 'uncategorized';
            const difficulty = word.difficulty ? word.difficulty.toLowerCase() : 'normal';

            // Increment category counts
            if (this.categoryCounts[category]) {
                this.categoryCounts[category][difficulty]++;
                this.categoryCounts[category].all++;
            }

            // Increment total counts
            this.categoryCounts.total[difficulty]++;
            this.categoryCounts.total.all++;
        });

        console.log('📊 Category counts calculated:', this.categoryCounts);
    }

    // Get total number of words
    getTotalWords() {
        return this.currentWords.length;
    }

    // Get current word at index
    getCurrentWord(index) {
        index = index || 0;
        if (index >= this.currentWords.length) {
            return null;
        }
        return this.currentWords[index];
    }

    // Get all category counts
    getCategoryCounts() {
        return this.categoryCounts;
    }
}

// Register with CCL App namespace if available
if (typeof window !== 'undefined' && window.CCLApp) {
    const resumeVocabularyManager = new ResumeVocabularyManager();
    window.CCLApp.registerModule('vocabularyManager', resumeVocabularyManager);
    window.vocabularyManager = resumeVocabularyManager;
}