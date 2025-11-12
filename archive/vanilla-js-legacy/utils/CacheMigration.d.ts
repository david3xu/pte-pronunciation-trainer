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
export declare class CacheMigration {
    private readonly currentVersion;
    private readonly versionKey;
    /**
     * Check if migration is needed and perform it
     * @param forceClear - Force clear all cache regardless of version
     */
    checkAndMigrate(forceClear?: boolean): void;
    /**
     * Set default values for clean initialization
     */
    private setDefaultValues;
    /**
     * Clear all cache data (emergency reset)
     * @returns Number of items cleared
     */
    clearAllCache(): number;
    /**
     * Get current cache information
     */
    getCacheInfo(): CacheInfo;
    /**
     * Get current cache version
     */
    getCurrentVersion(): number;
    /**
     * Get stored cache version
     */
    getStoredVersion(): number;
}
export declare const cacheMigration: CacheMigration;
export default cacheMigration;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        cacheMigration: CacheMigration;
    }
}
//# sourceMappingURL=CacheMigration.d.ts.map