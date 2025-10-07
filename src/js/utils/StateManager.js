// State management for preserving app state across page refreshes
class StateManager {
    constructor() {
        this.storage = window.storage || new Storage();
        this.config = window.appConfig || new AppConfig();
        this.state = {
            // Learning state
            currentWordIndex: 0,
            currentCategory: 'all-categories',
            currentDifficulty: 'all',

            // User preferences
            speed: String(this.config.get('tts.speeds.slow')),
            delay: String(this.config.get('tts.delays.normal')),
            repeat: 'once',
            voice: 'auto',

            // UI state
            settingsPanelOpen: false,

            // Session info
            lastSaved: Date.now()
        };

        // Check if cache migration is needed before loading state
        this.checkCacheMigration();
        this.loadState();
    }

    // Check if cache migration is needed
    checkCacheMigration() {
        const currentVersion = this.storage.getItem('cache-version') || 1;
        const requiredVersion = 5; // Match CacheMigration version

        if (currentVersion < requiredVersion) {
            this.storage.removeItem('app-state');
            this.storage.setItem('cache-version', requiredVersion);
        }
    }

    // Load state from localStorage
    loadState() {
        try {
            const savedState = this.storage.getItem('app-state');
            if (savedState) {
                this.state = { ...this.state, ...savedState };
            }
        } catch (error) {
            console.warn('Failed to load state:', error);
        }
    }

    // Save current state to localStorage
    saveState() {
        try {
            this.state.lastSaved = Date.now();
            this.storage.setItem('app-state', this.state);
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }

    // Get a specific state value
    get(key) {
        return this.state[key];
    }

    // Set a specific state value and save
    set(key, value) {
        this.state[key] = value;
        this.saveState();
    }

    // Update multiple state values at once
    update(updates) {
        this.state = { ...this.state, ...updates };
        this.saveState();
    }

    // Get learning state (word position, category, etc.)
    getLearningState() {
        return {
            currentWordIndex: this.state.currentWordIndex,
            currentCategory: this.state.currentCategory,
            currentDifficulty: this.state.currentDifficulty
        };
    }

    // Save learning state
    saveLearningState(wordIndex, category, difficulty) {
        this.update({
            currentWordIndex: wordIndex,
            currentCategory: category,
            currentDifficulty: difficulty
        });
    }

    // Get user preferences
    getUserPreferences() {
        return {
            speed: this.state.speed,
            delay: this.state.delay,
            repeat: this.state.repeat,
            voice: this.state.voice,
            category: this.state.currentCategory,
            difficulty: this.state.currentDifficulty
        };
    }

    // Save user preferences
    saveUserPreferences(preferences) {
        this.update(preferences);
    }

    // Check if we have a previous session
    hasPreviousSession() {
        return this.state.lastSaved && (Date.now() - this.state.lastSaved) < 24 * 60 * 60 * 1000; // 24 hours
    }

    // Clear all state (reset to defaults)
    clearState() {
        this.storage.removeItem('app-state');
        this.state = {
            currentWordIndex: 0,
            currentCategory: 'all-categories',
            currentDifficulty: 'all',
            speed: String(this.config.get('tts.speeds.slow')),
            delay: String(this.config.get('tts.delays.normal')),
            repeat: 'once',
            voice: 'auto',
            settingsPanelOpen: false,
            lastSaved: Date.now()
        };
    }

    // Export state for debugging
    exportState() {
        return JSON.stringify(this.state, null, 2);
    }

    /**
     * Save a user preference
     */
    saveUserPreference(key, value) {
        // Map setting keys to state properties
        const keyMap = {
            'category': 'currentCategory',
            'difficulty': 'currentDifficulty',
            'speed': 'speed',
            'delay': 'delay',
            'repeat': 'repeat',
            'voice': 'voice',
            'learningMode': 'learningMode'
        };

        const stateKey = keyMap[key];
        if (stateKey && this.state.hasOwnProperty(stateKey)) {
            this.state[stateKey] = value;
            this.saveState();
        }
    }
}

// Global state manager instance
const stateManager = new StateManager();

// Expose as global reference for PTE app
window.stateManager = stateManager;