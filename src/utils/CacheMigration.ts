/**
 * Cache Migration Utility
 *
 * Manages localStorage cache versioning and data migration
 * Handles upgrading from old cache versions to new ones
 */

/**
 * Cache information structure
 */
interface CacheInfo {
  version: number;
  allKeys: string[];
  category?: string;
}

/**
 * CacheMigration - Handles cache versioning and migration
 */
export class CacheMigration {
  private readonly currentVersion: number = 5; // Version 5 forces clean initialization
  private readonly versionKey: string = 'cache-version';

  /**
   * Check if migration is needed and perform it
   * @param forceClear - Force clear all cache regardless of version
   */
  checkAndMigrate(forceClear: boolean = false): void {
    const storage = (window as any).storage;
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
  private setDefaultValues(): void {
    const settingsModule = (window as any).settingsModule;

    // Use SettingsModule to set defaults if available
    if (settingsModule) {
      settingsModule.resetSettings();
      console.log('[CacheMigration] Reset settings via SettingsModule');
    } else {
      // Fallback: Set basic defaults from Config.js
      console.log('[CacheMigration] ℹ️ SettingsModule not available - setting basic defaults');

      const config = (window as any).appConfig;
      if (!config) {
        console.warn('[CacheMigration] AppConfig not available');
        return;
      }

      const storage = (window as any).storage;
      const defaults: Record<string, string> = {
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
  clearAllCache(): number {
    const storage = (window as any).storage;
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
  getCacheInfo(): CacheInfo {
    const storage = (window as any).storage;

    if (!storage) {
      return {
        version: 1,
        allKeys: [],
      };
    }

    const info: CacheInfo = {
      version: storage.getItem(this.versionKey) || 1,
      allKeys: storage.getAllKeys()
    };

    // Get current category from SettingsModule if available
    const settingsModule = (window as any).settingsModule;
    if (settingsModule) {
      const settings = settingsModule.exportSettings();
      info.category = settings.category;
    } else {
      info.category = storage.getItem('category');
    }

    return info;
  }

  /**
   * Get current cache version
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Get stored cache version
   */
  getStoredVersion(): number {
    const storage = (window as any).storage;
    return storage?.getItem(this.versionKey) || 1;
  }
}

// Export singleton instance
export const cacheMigration = new CacheMigration();

// Default export
export default cacheMigration;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    cacheMigration: CacheMigration;
  }
}

// Expose as global reference for PTE app
if (typeof window !== 'undefined') {
  (window as any).cacheMigration = cacheMigration;
}
