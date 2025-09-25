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
        // Set default category to all-categories
        window.storage.setItem('category', 'all-categories');

        // Set default difficulty to all
        window.storage.setItem('difficulty', 'all');

        // Set default learning mode to vocabulary
        window.storage.setItem('learningMode', 'vocabulary');

        // Set default repeat mode to 2x (individual)
        window.storage.setItem('repeatMode', 'individual');

        // Set default pause duration (2 seconds between words, 1 second between repetitions)
        window.storage.setItem('delay', Constants.DELAYS.DEFAULT_PAUSE);

        // Set default speech rate to slow
        window.storage.setItem('speechRate', Constants.SPEEDS.SLOW);

        console.log('Default values set for clean initialization');
    }

    // Clear all cache data (emergency reset)
    clearAllCache() {
        const clearedCount = window.storage.clear();
        console.log(`Cleared ${clearedCount} cache items`);
        return clearedCount;
    }

    // Get current cache info
    getCacheInfo() {
        return {
            version: window.storage.getItem(this.versionKey) || 1,
            category: window.storage.getItem('category'),
            allKeys: window.storage.getAllKeys()
        };
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