/**
 * Local Storage Management for CCL Pronunciation Trainer
 * Handles progress persistence, settings, and user data
 */

class StorageManager {
    constructor() {
        this.isSupported = typeof(Storage) !== 'undefined';
        this.prefix = 'ccl-trainer-';
        
        this.init();
    }

    init() {
        if (!this.isSupported) {
            console.warn('localStorage not supported');
        } else {
            console.log('Storage manager initialized');
        }
    }

    /**
     * Save user progress
     * @param {Object} progress - Progress data to save
     */
    saveProgress(progress) {
        if (!this.isSupported) return false;

        try {
            const progressData = {
                ...progress,
                timestamp: Date.now(),
                version: '1.0.0'
            };

            localStorage.setItem(
                `${this.prefix}progress`, 
                JSON.stringify(progressData)
            );
            return true;
        } catch (error) {
            console.error('Failed to save progress:', error);
            return false;
        }
    }

    /**
     * Load user progress
     * @returns {Object|null} Saved progress or null
     */
    loadProgress() {
        if (!this.isSupported) return null;

        try {
            const data = localStorage.getItem(`${this.prefix}progress`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load progress:', error);
            return null;
        }
    }

    /**
     * Save user settings
     * @param {Object} settings - Settings to save
     */
    saveSettings(settings) {
        if (!this.isSupported) return false;

        try {
            const settingsData = {
                ...settings,
                timestamp: Date.now()
            };

            localStorage.setItem(
                `${this.prefix}settings`, 
                JSON.stringify(settingsData)
            );
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Load user settings
     * @returns {Object|null} Saved settings or null
     */
    loadSettings() {
        if (!this.isSupported) return null;

        try {
            const data = localStorage.getItem(`${this.prefix}settings`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return null;
        }
    }

    /**
     * Save study session data
     * @param {Object} session - Session data
     */
    saveSession(session) {
        if (!this.isSupported) return false;

        try {
            const sessionData = {
                ...session,
                timestamp: Date.now()
            };

            localStorage.setItem(
                `${this.prefix}session`, 
                JSON.stringify(sessionData)
            );
            return true;
        } catch (error) {
            console.error('Failed to save session:', error);
            return false;
        }
    }

    /**
     * Load last study session
     * @returns {Object|null} Last session or null
     */
    loadSession() {
        if (!this.isSupported) return null;

        try {
            const data = localStorage.getItem(`${this.prefix}session`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load session:', error);
            return null;
        }
    }

    /**
     * Save statistics
     * @param {Object} stats - Statistics to save
     */
    saveStatistics(stats) {
        if (!this.isSupported) return false;

        try {
            const existing = this.loadStatistics() || {
                totalStudyTime: 0,
                totalTermsStudied: 0,
                sessionsCompleted: 0,
                streakDays: 0,
                lastStudyDate: null
            };

            const updated = {
                ...existing,
                ...stats,
                lastUpdated: Date.now()
            };

            localStorage.setItem(
                `${this.prefix}statistics`, 
                JSON.stringify(updated)
            );
            return true;
        } catch (error) {
            console.error('Failed to save statistics:', error);
            return false;
        }
    }

    /**
     * Load statistics
     * @returns {Object|null} Statistics or null
     */
    loadStatistics() {
        if (!this.isSupported) return null;

        try {
            const data = localStorage.getItem(`${this.prefix}statistics`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load statistics:', error);
            return null;
        }
    }

    /**
     * Update study streak
     */
    updateStreak() {
        const stats = this.loadStatistics() || {};
        const today = new Date().toDateString();
        const lastStudy = stats.lastStudyDate;

        if (lastStudy === today) {
            // Already studied today, no change
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastStudy === yesterday.toDateString()) {
            // Continued streak
            stats.streakDays = (stats.streakDays || 0) + 1;
        } else {
            // Broke streak or first day
            stats.streakDays = 1;
        }

        stats.lastStudyDate = today;
        this.saveStatistics(stats);
    }

    /**
     * Clear all stored data
     */
    clearAll() {
        if (!this.isSupported) return false;

        try {
            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            }
            console.log('All stored data cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        if (!this.isSupported) {
            return { supported: false };
        }

        try {
            let totalSize = 0;
            let itemCount = 0;

            for (const key in localStorage) {
                if (key.startsWith(this.prefix)) {
                    totalSize += localStorage[key].length;
                    itemCount++;
                }
            }

            return {
                supported: true,
                itemCount,
                totalSize,
                totalSizeKB: Math.round(totalSize / 1024 * 100) / 100
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return { supported: true, error: error.message };
        }
    }

    /**
     * Export all data for backup
     * @returns {Object|null} All stored data or null
     */
    exportData() {
        if (!this.isSupported) return null;

        const data = {};
        try {
            for (const key in localStorage) {
                if (key.startsWith(this.prefix)) {
                    const shortKey = key.replace(this.prefix, '');
                    data[shortKey] = JSON.parse(localStorage[key]);
                }
            }
            return data;
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }

    /**
     * Import data from backup
     * @param {Object} data - Data to import
     * @returns {boolean} Success status
     */
    importData(data) {
        if (!this.isSupported || !data) return false;

        try {
            for (const [key, value] of Object.entries(data)) {
                localStorage.setItem(
                    `${this.prefix}${key}`, 
                    JSON.stringify(value)
                );
            }
            console.log('Data imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
}

// Export as global for browser use
window.StorageManager = StorageManager;