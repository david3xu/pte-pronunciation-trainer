/**
 * ModeConfigurations - Centralized configuration for all learning modes
 *
 * Each mode defines its data sources, display preferences, processing rules,
 * and UI behavior in a structured, maintainable way.
 */
class ModeConfigurations {
    static getModeConfig(modeId) {
        const configs = {
            'vocabulary': {
                id: 'vocabulary',
                label: '📚 Vocabulary Focus',
                description: 'Complete vocabulary from all dialogues',

                // Data Configuration
                data: {
                    primaryDataset: 'dialogue-data.json',
                    fallbackDatasets: ['complete-dataset.json'],
                    extractionMethod: 'extractCompleteVocabulary',
                    expectedTerms: 2800
                },

                // Display Configuration
                display: {
                    showPronunciation: true,
                    pronunciationPriority: ['british', 'american'],
                    showExample: true,
                    showCategory: true,
                    showDifficulty: true,
                    primaryFields: ['english', 'chinese', 'example']
                },

                // Processing Rules
                processing: {
                    difficultyInference: 'standard',
                    categoryMapping: 'dialogueId',
                    supportedCategories: 'all',
                    defaultDifficulty: 'normal'
                },

                // UI Behavior
                ui: {
                    enableCategoryFilter: true,
                    enableDifficultyFilter: true,
                    showProgress: true,
                    specialFeatures: []
                }
            },

            'chinese-english': {
                id: 'chinese-english',
                label: '🈯 Chinese-English Match',
                description: 'Bilingual vocabulary with pronunciation guides',

                data: {
                    primaryDataset: 'chinese-english-dataset.json',
                    fallbackDatasets: [],
                    extractionMethod: 'getChineseEnglishData',
                    expectedTerms: 2954
                },

                display: {
                    showPronunciation: true,
                    pronunciationPriority: ['british', 'american'],
                    showExample: false, // Chinese-English pairs don't have examples
                    showCategory: true,
                    showDifficulty: true,
                    primaryFields: ['english', 'chinese'],
                    pronunciationSources: ['pronunciationGuide', 'ipa', 'phonetic']
                },

                processing: {
                    difficultyInference: 'wordCount',
                    categoryMapping: 'explicit', // Uses provided category
                    supportedCategories: 'limited',
                    defaultDifficulty: 'normal'
                },

                ui: {
                    enableCategoryFilter: true,
                    enableDifficultyFilter: true,
                    showProgress: true,
                    specialFeatures: ['pronunciationToggle']
                }
            },

            'resume-terms': {
                id: 'resume-terms',
                label: '💼 Resume Terms Practice',
                description: 'Professional vocabulary with IPA pronunciation guides',

                data: {
                    primaryDataset: 'resume-terms-dataset.json',
                    fallbackDatasets: [],
                    extractionMethod: 'getResumeTermsData',
                    expectedTerms: 445
                },

                display: {
                    showPronunciation: true,
                    pronunciationPriority: ['british', 'american'],
                    showExample: false, // Resume terms are vocabulary-only
                    showCategory: true,
                    showDifficulty: false, // Resume terms are all professional level
                    primaryFields: ['english'],
                    pronunciationSources: ['pronunciationGuide', 'ipa', 'phonetic']
                },

                processing: {
                    difficultyInference: 'fixed', // All resume terms are 'normal'
                    categoryMapping: 'section', // Maps to resume sections
                    supportedCategories: 'sections',
                    defaultDifficulty: 'normal'
                },

                ui: {
                    enableCategoryFilter: true,
                    enableDifficultyFilter: false,
                    showProgress: true,
                    specialFeatures: ['ipaPractice', 'phoneticPractice']
                }
            },

            'unfamiliar': {
                id: 'unfamiliar',
                label: '🔥 Unfamiliar Words',
                description: 'Curated challenging vocabulary for advanced study',

                data: {
                    primaryDataset: 'unfamiliar-words.json',
                    fallbackDatasets: ['unfamiliar-words-dataset.json'],
                    extractionMethod: 'getUnfamiliarWordsData',
                    expectedTerms: 2360
                },

                display: {
                    showPronunciation: true,
                    pronunciationPriority: ['british', 'american'],
                    showExample: true,
                    showCategory: true,
                    showDifficulty: true,
                    primaryFields: ['english', 'chinese', 'example']
                },

                processing: {
                    difficultyInference: 'bias-hard', // Unfamiliar words tend to be harder
                    categoryMapping: 'dialogueId',
                    supportedCategories: 'all',
                    defaultDifficulty: 'hard'
                },

                ui: {
                    enableCategoryFilter: true,
                    enableDifficultyFilter: true,
                    showProgress: true,
                    specialFeatures: ['difficultyEmphasis']
                }
            },

            'words': {
                id: 'words',
                label: '📝 Words Practice',
                description: 'Dialogue-based word lists',

                data: {
                    primaryDataset: 'words-dataset.json',
                    fallbackDatasets: [],
                    extractionMethod: 'getWordsData',
                    expectedTerms: 2955
                },

                display: {
                    showPronunciation: false, // Words dataset has limited pronunciation data
                    pronunciationPriority: ['british'],
                    showExample: false,
                    showCategory: true,
                    showDifficulty: true,
                    primaryFields: ['english']
                },

                processing: {
                    difficultyInference: 'standard',
                    categoryMapping: 'dialogueId',
                    supportedCategories: 'all',
                    defaultDifficulty: 'normal'
                },

                ui: {
                    enableCategoryFilter: true,
                    enableDifficultyFilter: true,
                    showProgress: true,
                    specialFeatures: []
                }
            }
        };

        return configs[modeId] || null;
    }

    /**
     * Get all available mode configurations
     */
    static getAllModeConfigs() {
        return [
            'vocabulary',
            'chinese-english',
            'resume-terms',
            'unfamiliar',
            'words'
        ].map(modeId => this.getModeConfig(modeId));
    }

    /**
     * Check if a mode supports a specific feature
     */
    static modeSupportsFeature(modeId, feature) {
        const config = this.getModeConfig(modeId);
        return config?.ui?.specialFeatures?.includes(feature) || false;
    }

    /**
     * Get display configuration for a mode
     */
    static getDisplayConfig(modeId) {
        const config = this.getModeConfig(modeId);
        return config?.display || {};
    }

    /**
     * Get data configuration for a mode
     */
    static getDataConfig(modeId) {
        const config = this.getModeConfig(modeId);
        return config?.data || {};
    }
}

// Register with CCL App namespace if available
if (typeof window !== 'undefined' && window.CCLApp) {
    window.CCLApp.registerModule('modeConfigurations', ModeConfigurations);
}

// Also make available globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.ModeConfigurations = ModeConfigurations;
}

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModeConfigurations;
}