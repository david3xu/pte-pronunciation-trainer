// Storage utilities for localStorage operations
class Storage {
    constructor() {
        this.prefix = 'ccl-trainer-';
    }

    // Get item from localStorage with prefix
    getItem(key) {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.warn(`Storage getItem error for ${key}:`, error);
            return null;
        }
    }

    // Set item in localStorage with prefix
    setItem(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`Storage setItem error for ${key}:`, error);
            return false;
        }
    }

    // Remove item from localStorage
    removeItem(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.warn(`Storage removeItem error for ${key}:`, error);
            return false;
        }
    }

    // Check if localStorage is available
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get all keys with prefix
    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }
        return keys;
    }

    // Clear all items with prefix
    clear() {
        const keys = this.getAllKeys();
        keys.forEach(key => this.removeItem(key));
        return keys.length;
    }

    // Get a setting value (alias for getItem)
    getSetting(key) {
        return this.getItem(key);
    }

    // Save a setting value (alias for setItem)
    saveSetting(key, value) {
        return this.setItem(key, value);
    }
}

// Global storage instance
window.storage = new Storage();