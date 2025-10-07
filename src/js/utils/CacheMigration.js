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
        // Use SettingsManager to set defaults instead of direct storage access
        if (window.settingsManager) {
            const defaults = window.settingsManager.config.get('settings.defaults');

            // Set all defaults through SettingsManager
            Object.keys(defaults).forEach(key => {
                const defaultValue = defaults[key];
                // Resolve nested config paths if needed
                const value = defaultValue.includes('.') ?
                    window.settingsManager.config.get(defaultValue) : defaultValue;
                window.settingsManager.updateSetting(key, value);
            });

        } else {
            console.error('❌ SettingsManager not available - cannot set default values');
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

        // Get current category from SettingsManager if available
        if (window.settingsManager) {
            info.category = window.settingsManager.getSetting('category');
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