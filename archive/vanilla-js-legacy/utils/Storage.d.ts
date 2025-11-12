/**
 * Storage - Type-safe localStorage wrapper
 * Provides namespaced localStorage operations with JSON serialization
 *
 * This is the TypeScript version of src/js/utils/Storage.js
 * Adds generic type support for type-safe get/set operations
 */
/**
 * Storage operation result
 */
export interface StorageResult<T> {
    success: boolean;
    value?: T;
    error?: Error;
}
/**
 * Type-safe localStorage wrapper
 * Automatically handles JSON serialization and namespacing
 */
export declare class Storage {
    private readonly prefix;
    /**
     * Get item from localStorage with type safety
     *
     * @example
     * const settings = storage.getItem<SettingsType>('settings');
     * const currentMode = storage.getItem<string>('currentMode');
     */
    getItem<T = any>(key: string): T | null;
    /**
     * Get item with default value
     * Returns default if key doesn't exist or parsing fails
     *
     * @example
     * const theme = storage.getItemOr('theme', 'auto');
     */
    getItemOr<T>(key: string, defaultValue: T): T;
    /**
     * Set item in localStorage
     * Automatically JSON-stringifies the value
     *
     * @example
     * storage.setItem('settings', { theme: 'dark', autoPlay: true });
     */
    setItem<T = any>(key: string, value: T): boolean;
    /**
     * Remove item from localStorage
     */
    removeItem(key: string): boolean;
    /**
     * Check if localStorage is available
     * Tests by attempting to write and remove a test value
     */
    isAvailable(): boolean;
    /**
     * Get all keys with this storage's prefix
     * Returns unprefixed keys
     */
    getAllKeys(): string[];
    /**
     * Clear all items with this storage's prefix
     * Returns count of items cleared
     */
    clear(): number;
    /**
     * Get a setting value (alias for getItem)
     * Provided for backwards compatibility
     */
    getSetting<T = any>(key: string): T | null;
    /**
     * Check if a key exists
     */
    hasItem(key: string): boolean;
    /**
     * Get storage size in bytes (approximate)
     * Calculates total size of all items with this prefix
     */
    getSize(): number;
    /**
     * Get storage size in human-readable format
     */
    getSizeFormatted(): string;
    /**
     * Export all data as JSON object
     * Useful for backup/debugging
     */
    exportData(): Record<string, any>;
    /**
     * Import data from JSON object
     * Overwrites existing keys
     */
    importData(data: Record<string, any>): {
        imported: number;
        failed: number;
    };
}
export declare const storage: Storage;
export default storage;
/**
 * Global type declarations for window object
 * Allows TypeScript to recognize window.storage
 */
declare global {
    interface Window {
        storage: Storage;
    }
}
//# sourceMappingURL=Storage.d.ts.map