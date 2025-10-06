// Cache migration utility for updating old localStorage data
class CacheMigration {
    constructor() {
        this.currentVersion = 4; // Version 4 forces clean initialization with new defaults
        this.versionKey = 'cache-version';

        // Mapping of old categories to new ones
        this.categoryMigrations = {
            'group-1': 'group-240s',
            'group-2': 'group-230s',
            'group-3': 'group-220s',
            'group-4': 'group-210s',
            'group-5': 'group-200s',
            'group-6': 'group-190s',
            'group-7': 'group-180s',
            'group-8': 'group-170s',
            'group-9': 'group-160s',
            'group-10': 'group-150s'
        };
    }

    // Check if migration is needed and perform it
    checkAndMigrate(forceClear = false) {
        const currentVersion = window.storage.getItem(this.versionKey) || 1;

        if (forceClear || currentVersion < this.currentVersion) {
            if (forceClear) {
                console.log('Force clearing all cache data...');
                this.clearAllCache();
            } else {
                console.log(`Migrating cache from version ${currentVersion} to ${this.currentVersion}`);
                this.migrateToDecadeGroups();
            }

            // Set default values for clean initialization
            this.setDefaultValues();
            window.storage.setItem(this.versionKey, this.currentVersion);
            console.log('Cache migration completed');
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

            console.log('Default values set through SettingsManager');
        } else {
            console.error('❌ SettingsManager not available - cannot set default values');
        }
    }

    // Clear all cache data (emergency reset)
    clearAllCache() {
        const clearedCount = window.storage.clear();
        console.log(`Cleared ${clearedCount} cache items`);
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
// Create and expose global instance
const cacheMigration = new CacheMigration();

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('cacheMigration', cacheMigration);
}

// Legacy compatibility - maintain existing global reference
window.cacheMigration = cacheMigration;