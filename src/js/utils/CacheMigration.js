// Cache migration utility for updating old localStorage data
class CacheMigration {
    constructor() {
        this.currentVersion = 2; // Version 2 uses decade-based groups
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
    checkAndMigrate() {
        const currentVersion = window.storage.getItem(this.versionKey) || 1;
        
        if (currentVersion < this.currentVersion) {
            console.log(`Migrating cache from version ${currentVersion} to ${this.currentVersion}`);
            this.migrateToDecadeGroups();
            window.storage.setItem(this.versionKey, this.currentVersion);
            console.log('Cache migration completed');
        }
    }

    // Migrate old group categories to new decade-based ones
    migrateToDecadeGroups() {
        const currentCategory = window.storage.getItem('category');
        
        if (currentCategory) {
            if (this.categoryMigrations[currentCategory]) {
                const newCategory = this.categoryMigrations[currentCategory];
                window.storage.setItem('category', newCategory);
                console.log(`Migrated category from '${currentCategory}' to '${newCategory}'`);
            } else if (currentCategory.startsWith('group-') && !currentCategory.includes('s')) {
                // Handle any other old group-X pattern by defaulting to all-categories
                window.storage.setItem('category', 'all-categories');
                console.log(`Unknown old category '${currentCategory}' reset to 'all-categories'`);
            }
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
        return {
            version: window.storage.getItem(this.versionKey) || 1,
            category: window.storage.getItem('category'),
            allKeys: window.storage.getAllKeys()
        };
    }
}

// Global cache migration instance
window.cacheMigration = new CacheMigration();