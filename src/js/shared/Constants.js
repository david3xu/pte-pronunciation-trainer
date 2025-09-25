/**
 * Constants - Centralized hardcoded values for the CCL Pronunciation Trainer
 *
 * This file consolidates all magic numbers, strings, and configuration values
 * that were previously scattered throughout the codebase.
 */
class Constants {
    // ===== TIMING CONSTANTS =====
    static DELAYS = {
        DEFAULT_PAUSE: 2000,
        SHORT_PAUSE: 1000,
        NORMAL_PAUSE: 2000,
        LONG_PAUSE: 3000,
        EXTENDED_PAUSE: 4000,

        // TTS Specific
        TTS_VOICE_READY_DELAY: 800,
        TTS_RESET_TIMEOUT: 3000,

        // Animation & UI
        FADE_IN_DURATION: 200,
        FADE_OUT_DURATION: 200,
        ANIMATION_DURATION: 300,

        // Testing & Debug
        TEST_WAIT_DURATION: 2000,
        INITIALIZATION_WAIT: 3000,

        // Network
        RETRY_DELAY: 1000
    };

    // ===== VOICE & TTS CONSTANTS =====
    static VOICES = {
        DEFAULT: 'Google UK English Male',

        PRIORITY_LIST: [
            'Google UK English Male',
            'Microsoft James Online (Natural) - English (Australia)',
            'Microsoft James - English (Australia)',
            'Microsoft James',
            'Google Australian English Male',
            'Microsoft James Online (Natural)',
            'Google Australian English Female',
            'Google UK English Female'
        ],

        FALLBACK_VOICES: [
            'Microsoft James – English (Australia)',
            'Google UK English Female'
        ],

        LOCALES: {
            UK: 'uk',
            AUSTRALIA: 'en-AU',
            US: 'en-US'
        },

        PRONUNCIATION_PRIORITY: ['british', 'american']
    };

    // ===== DATA PATHS & FILES =====
    static DATA = {
        BASE_PATH: '/data/processed',

        DATASETS: {
            COMPLETE: 'dialogue-data.json',
            UNFAMILIAR: 'unfamiliar-words.json',
            WORDS: 'words-dataset.json',
            CHINESE_ENGLISH: 'chinese-english-dataset.json',
            VOCABULARY_CLEAN: 'vocabulary-clean-dataset.json',
            RESUME_TERMS: 'resume-terms-dataset.json',
            COMPLETE_FALLBACK: 'complete-dataset.json'
        },

        // Full paths for convenience
        get FULL_PATHS() {
            const paths = {};
            Object.entries(this.DATASETS).forEach(([key, filename]) => {
                paths[key] = `${this.BASE_PATH}/${filename}`;
            });
            return paths;
        },

        EXPORT_FILENAME: 'ccl-trainer-settings.json'
    };

    // ===== DIALOGUE ID RANGES & CATEGORIES =====
    static DIALOGUE_GROUPS = {
        BOUNDARIES: {
            GROUP_240S: 70240,
            GROUP_230S: 70230,
            GROUP_220S: 70220,
            GROUP_210S: 70210,
            GROUP_200S: 70200,
            GROUP_190S: 70190,
            GROUP_180S: 70180,
            GROUP_170S: 70170,
            GROUP_160S: 70160,
            GROUP_150S: 70150
        },

        CATEGORY_KEYS: {
            ALL: 'all-categories',
            GROUP_240S: 'group-240s',
            GROUP_230S: 'group-230s',
            GROUP_220S: 'group-220s',
            GROUP_210S: 'group-210s',
            GROUP_200S: 'group-200s',
            GROUP_190S: 'group-190s',
            GROUP_180S: 'group-180s',
            GROUP_170S: 'group-170s',
            GROUP_160S: 'group-160s',
            GROUP_150S: 'group-150s'
        },

        LABELS: {
            'all-categories': '🌟 All Categories',
            'group-240s': '📚 70240s: 70248-70240 (Latest)',
            'group-230s': '📚 70230s: 70239-70230',
            'group-220s': '📚 70220s: 70229-70220',
            'group-210s': '📚 70210s: 70219-70210',
            'group-200s': '📚 70200s: 70209-70200',
            'group-190s': '📚 70190s: 70199-70190',
            'group-180s': '📚 70180s: 70189-70180',
            'group-170s': '📚 70170s: 70179-70170',
            'group-160s': '📚 70160s: 70169-70160',
            'group-150s': '📚 70150s: 70159-70150 (Earliest)'
        }
    };

    // ===== LEARNING MODE CONSTANTS =====
    static MODES = {
        VOCABULARY: 'vocabulary',
        DIALOGUE: 'dialogue',
        UNFAMILIAR: 'unfamiliar',
        WORDS: 'words',
        CHINESE_ENGLISH: 'chinese-english',
        VOCABULARY_CLEAN: 'vocabulary-clean',
        RESUME_TERMS: 'resume-terms'
    };

    // ===== DIFFICULTY CONSTANTS =====
    static DIFFICULTY = {
        LEVELS: ['easy', 'normal', 'hard'],
        DEFAULT: 'normal',

        // Inference thresholds
        EASY_MAX_LENGTH: 8,
        HARD_MIN_WORDS: 4,
        HARD_MIN_LENGTH: 40,

        COMPLEX_TERMS: [
            'comprehensive', 'administrative', 'implementation',
            'coordination', 'infrastructure', 'consultation',
            'documentation', 'specification', 'application', 'assessment'
        ]
    };

    // ===== PROGRESS & ACHIEVEMENT CONSTANTS =====
    static PROGRESS = {
        CELEBRATION_THRESHOLDS: [10, 25, 50, 100, 250, 500],
        PERCENTAGE_BASE: 100,
        ROUND_PRECISION: 0 // for Math.round
    };

    // ===== UI CONSTANTS =====
    static UI = {
        THEMES: ['light', 'dark', 'auto'],

        FIELD_PRIORITIES: {
            PRIMARY: ['english', 'chinese', 'example'],
            PRONUNCIATION: ['pronunciationGuide', 'ipa', 'phonetic']
        },

        SHORTCUTS: {
            PLAY_PAUSE: ' ',
            PREVIOUS: 'ArrowLeft',
            NEXT: 'ArrowRight',
            REPEAT: 'r',
            FULLSCREEN: 'f',
            CLOSE: 'Escape'
        }
    };

    // ===== SPEED CONSTANTS =====
    static SPEEDS = {
        SLOW: 0.7,
        NORMAL: 1.0,
        FAST: 1.3,

        LABELS: {
            0.7: 'Slow',
            1.0: 'Normal',
            1.3: 'Fast'
        }
    };

    // ===== REPEAT MODE CONSTANTS =====
    static REPEAT_MODES = {
        ONCE: 'individual',
        TWICE: '2x',
        THREE_TIMES: '3x',
        LOOP: 'loop'
    };

    // ===== VALIDATION CONSTANTS =====
    static VALIDATION = {
        MIN_EXPECTED_TERMS: {
            [this.MODES.VOCABULARY]: 2800,
            [this.MODES.UNFAMILIAR]: 2300,
            [this.MODES.WORDS]: 2900,
            [this.MODES.CHINESE_ENGLISH]: 2900,
            [this.MODES.RESUME_TERMS]: 400
        },

        MAX_RETRY_ATTEMPTS: 3,
        TIMEOUT_MS: 10000
    };

    // ===== UTILITY METHODS =====

    /**
     * Get dialogue group category from ID
     */
    static getCategoryFromDialogueId(id) {
        const numId = parseInt(id);
        const bounds = this.DIALOGUE_GROUPS.BOUNDARIES;

        if (numId >= bounds.GROUP_240S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_240S;
        if (numId >= bounds.GROUP_230S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_230S;
        if (numId >= bounds.GROUP_220S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_220S;
        if (numId >= bounds.GROUP_210S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_210S;
        if (numId >= bounds.GROUP_200S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_200S;
        if (numId >= bounds.GROUP_190S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_190S;
        if (numId >= bounds.GROUP_180S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_180S;
        if (numId >= bounds.GROUP_170S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_170S;
        if (numId >= bounds.GROUP_160S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_160S;
        if (numId >= bounds.GROUP_150S) return this.DIALOGUE_GROUPS.CATEGORY_KEYS.GROUP_150S;

        return 'general';
    }

    /**
     * Check if text contains complex terms indicating hard difficulty
     */
    static hasComplexTerms(text) {
        if (!text) return false;
        const lowerText = text.toLowerCase();
        return this.DIFFICULTY.COMPLEX_TERMS.some(term => lowerText.includes(term));
    }

    /**
     * Get full data path for a dataset
     */
    static getDataPath(datasetKey) {
        const filename = this.DATA.DATASETS[datasetKey.toUpperCase()];
        return filename ? `${this.DATA.BASE_PATH}/${filename}` : null;
    }
}

// Register with CCL App namespace if available
if (typeof window !== 'undefined' && window.CCLApp) {
    window.CCLApp.registerModule('constants', Constants);
}

// Also make available globally for legacy compatibility
if (typeof window !== 'undefined') {
    window.Constants = Constants;
}

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
}