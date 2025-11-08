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
export class Storage {
  private readonly prefix: string = 'ccl-trainer-';

  /**
   * Get item from localStorage with type safety
   *
   * @example
   * const settings = storage.getItem<SettingsType>('settings');
   * const currentMode = storage.getItem<string>('currentMode');
   */
  getItem<T = any>(key: string): T | null {
    try {
      const value = localStorage.getItem(this.prefix + key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      console.warn(`Storage getItem error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Get item with default value
   * Returns default if key doesn't exist or parsing fails
   *
   * @example
   * const theme = storage.getItemOr('theme', 'auto');
   */
  getItemOr<T>(key: string, defaultValue: T): T {
    const value = this.getItem<T>(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Set item in localStorage
   * Automatically JSON-stringifies the value
   *
   * @example
   * storage.setItem('settings', { theme: 'dark', autoPlay: true });
   */
  setItem<T = any>(key: string, value: T): boolean {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Storage setItem error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.warn(`Storage removeItem error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if localStorage is available
   * Tests by attempting to write and remove a test value
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all keys with this storage's prefix
   * Returns unprefixed keys
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * Clear all items with this storage's prefix
   * Returns count of items cleared
   */
  clear(): number {
    const keys = this.getAllKeys();
    keys.forEach(key => this.removeItem(key));
    return keys.length;
  }

  /**
   * Get a setting value (alias for getItem)
   * Provided for backwards compatibility
   */
  getSetting<T = any>(key: string): T | null {
    return this.getItem<T>(key);
  }

  /**
   * Check if a key exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  /**
   * Get storage size in bytes (approximate)
   * Calculates total size of all items with this prefix
   */
  getSize(): number {
    let totalSize = 0;
    const keys = this.getAllKeys();

    keys.forEach(key => {
      const value = localStorage.getItem(this.prefix + key);
      if (value) {
        // Count key + value in bytes (UTF-16, so 2 bytes per char)
        totalSize += ((this.prefix + key).length + value.length) * 2;
      }
    });

    return totalSize;
  }

  /**
   * Get storage size in human-readable format
   */
  getSizeFormatted(): string {
    const bytes = this.getSize();
    const kb = bytes / 1024;
    const mb = kb / 1024;

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  }

  /**
   * Export all data as JSON object
   * Useful for backup/debugging
   */
  exportData(): Record<string, any> {
    const data: Record<string, any> = {};
    const keys = this.getAllKeys();

    keys.forEach(key => {
      data[key] = this.getItem(key);
    });

    return data;
  }

  /**
   * Import data from JSON object
   * Overwrites existing keys
   */
  importData(data: Record<string, any>): { imported: number; failed: number } {
    let imported = 0;
    let failed = 0;

    Object.entries(data).forEach(([key, value]) => {
      if (this.setItem(key, value)) {
        imported++;
      } else {
        failed++;
      }
    });

    return { imported, failed };
  }
}

// Export singleton instance
export const storage = new Storage();

// Default export
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

// Expose as global reference for PTE app (browser compatibility)
if (typeof window !== 'undefined') {
  window.storage = storage;
}
