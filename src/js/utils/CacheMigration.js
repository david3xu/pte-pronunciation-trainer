// Cache migration utility for updating old localStorage data
class CacheMigration {
    constructor() {
        this.currentVersion = 5; // Version 5 forces clean initialization with new difficulty defaults
        this.versionKey = 'cache-version';
    }

    // Check if migration is needed and perform it
    checkAndMigrate(forceClear = false) {
        const currentVersion = window.storage.getItem(this.versionKey) || 1;

        if (forceClear || currentVersion < this.currentVersion) {
            if (forceClear) {
                this.clearAllCache();
            } else {
                // Migration is handled by clearing and setting defaults
            }

            // Set default values for clean initialization
            this.setDefaultValues();
            window.storage.setItem(this.versionKey, this.currentVersion);
        }
    }

    // Set default values for clean initialization
    setDefaultValues() {
        // Use SettingsModule to set defaults if available
        if (window.settingsModule) {
            // Reset to defaults through SettingsModule
            window.settingsModule.resetSettings();
        } else {
            // Fallback: Set basic defaults from Config.js
            console.log('ℹ️ SettingsModule not available - setting basic defaults');
            const config = window.appConfig || new AppConfig();
            const defaults = {
                'category': 'all-categories',
                'difficulty': config.get('data.defaults.difficulty') || 'all',
                'speechRate': 'tts.speeds.slow',
                'delay': 'tts.delays.long',
                'repeatMode': config.get('data.defaults.repeat') || 'once',
                'preferredVoice': config.get('data.defaults.voice') || 'auto',
                'learningMode': config.get('data.defaults.learningMode') || 'pte-fib-listening'
            };

            Object.entries(defaults).forEach(([key, value]) => {
                window.storage.setItem(key, value);
            });
        }
    }

    // Clear all cache data (emergency reset)
    clearAllCache() {
        const clearedCount = window.storage.clear();
        return clearedCount;
    }

    // Get current cache info
    getCacheInfo() {
        const info = {
            version: window.storage.getItem(this.versionKey) || 1,
            allKeys: window.storage.getAllKeys()
        };

        // Get current category from SettingsModule if available
        if (window.settingsModule) {
            const settings = window.settingsModule.exportSettings();
            info.category = settings.category;
        } else {
            info.category = window.storage.getItem('category');
        }

        return info;
    }
}

// Global cache migration instance
// Create global instance
const cacheMigration = new CacheMigration();

// Expose as global reference for PTE app
window.cacheMigration = cacheMigration;