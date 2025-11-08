/**
 * Cache Migration Utility
 *
 * Manages localStorage cache versioning and data migration
 * Handles upgrading from old cache versions to new ones
 */
/**
 * CacheMigration - Handles cache versioning and migration
 */
export class CacheMigration {
    currentVersion = 5; // Version 5 forces clean initialization
    versionKey = 'cache-version';
    /**
     * Check if migration is needed and perform it
     * @param forceClear - Force clear all cache regardless of version
     */
    checkAndMigrate(forceClear = false) {
        const storage = window.storage;
        if (!storage) {
            console.warn('[CacheMigration] Storage not available');
            return;
        }
        const currentVersion = storage.getItem(this.versionKey) || 1;
        if (forceClear || currentVersion < this.currentVersion) {
            if (forceClear) {
                this.clearAllCache();
            }
            // Set default values for clean initialization
            this.setDefaultValues();
            storage.setItem(this.versionKey, this.currentVersion);
            console.log(`[CacheMigration] Migrated from v${currentVersion} to v${this.currentVersion}`);
        }
    }
    /**
     * Set default values for clean initialization
     */
    setDefaultValues() {
        const settingsModule = window.settingsModule;
        // Use SettingsModule to set defaults if available
        if (settingsModule) {
            settingsModule.resetSettings();
            console.log('[CacheMigration] Reset settings via SettingsModule');
        }
        else {
            // Fallback: Set basic defaults from Config.js
            console.log('[CacheMigration] ℹ️ SettingsModule not available - setting basic defaults');
            const config = window.appConfig;
            if (!config) {
                console.warn('[CacheMigration] AppConfig not available');
                return;
            }
            const storage = window.storage;
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
                storage.setItem(key, value);
            });
        }
    }
    /**
     * Clear all cache data (emergency reset)
     * @returns Number of items cleared
     */
    clearAllCache() {
        const storage = window.storage;
        if (!storage) {
            console.warn('[CacheMigration] Storage not available');
            return 0;
        }
        const clearedCount = storage.clear();
        console.log(`[CacheMigration] Cleared ${clearedCount} cache items`);
        return clearedCount;
    }
    /**
     * Get current cache information
     */
    getCacheInfo() {
        const storage = window.storage;
        if (!storage) {
            return {
                version: 1,
                allKeys: [],
            };
        }
        const info = {
            version: storage.getItem(this.versionKey) || 1,
            allKeys: storage.getAllKeys()
        };
        // Get current category from SettingsModule if available
        const settingsModule = window.settingsModule;
        if (settingsModule) {
            const settings = settingsModule.exportSettings();
            info.category = settings.category;
        }
        else {
            info.category = storage.getItem('category');
        }
        return info;
    }
    /**
     * Get current cache version
     */
    getCurrentVersion() {
        return this.currentVersion;
    }
    /**
     * Get stored cache version
     */
    getStoredVersion() {
        const storage = window.storage;
        return storage?.getItem(this.versionKey) || 1;
    }
}
// Export singleton instance
export const cacheMigration = new CacheMigration();
// Default export
export default cacheMigration;
// Expose as global reference for PTE app
if (typeof window !== 'undefined') {
    window.cacheMigration = cacheMigration;
}
//# sourceMappingURL=CacheMigration.js.map