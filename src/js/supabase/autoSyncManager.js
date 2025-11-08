/**
 * Auto Sync Manager
 *
 * Automatically syncs user progress and study sessions to Supabase
 * Listens to progress events and handles cloud synchronization
 */
import { syncService } from './syncService';
/**
 * AutoSyncManager - Handles automatic cloud synchronization
 */
export class AutoSyncManager {
    currentSession = null;
    syncEnabled = false;
    syncInterval = 30000; // Sync every 30 seconds
    lastSyncTime = 0;
    pendingSync = false;
    /**
     * Initialize auto-sync manager
     */
    async initialize() {
        await syncService.initialize();
        this.syncEnabled = syncService.isAvailable();
        if (!this.syncEnabled) {
            console.log('[AutoSyncManager] Sync disabled - user not authenticated');
            return;
        }
        console.log('[AutoSyncManager] ✅ Initialized successfully');
        this.setupEventListeners();
    }
    /**
     * Set up event listeners for progress tracking
     */
    setupEventListeners() {
        const eventBus = window.eventBus;
        const config = window.appConfig;
        if (!eventBus || !config) {
            console.warn('[AutoSyncManager] EventBus or Config not available');
            return;
        }
        // Listen to progress updates
        const progressEvent = config.get('events.progress.updated') || 'progress:updated';
        eventBus.on(progressEvent, (data) => {
            this.handleProgressUpdate(data);
        });
        // Listen to vocabulary loaded events (start of session)
        const vocabLoadedEvent = config.get('events.vocabulary.loaded') || 'vocabulary:loaded';
        eventBus.on(vocabLoadedEvent, (data) => {
            this.startStudySession(data);
        });
        // Listen to mode changes (end previous session, start new)
        const modeChangedEvent = config.get('events.mode.practice.changed') || 'mode:practice:changed';
        eventBus.on(modeChangedEvent, () => {
            this.endCurrentSession();
            // New session will start on next vocabulary:loaded event
        });
        // Listen to page unload (save session before leaving)
        window.addEventListener('beforeunload', () => {
            this.endCurrentSession();
        });
        console.log('[AutoSyncManager] Event listeners registered');
    }
    /**
     * Start a new study session
     */
    startStudySession(data) {
        if (!this.syncEnabled)
            return;
        // End previous session if exists
        this.endCurrentSession();
        const datasetId = this.getDatasetId();
        const datasetType = this.getDatasetType();
        if (!datasetId) {
            console.warn('[AutoSyncManager] Cannot start session - dataset ID not found');
            return;
        }
        this.currentSession = {
            startTime: Date.now(),
            datasetId,
            datasetType,
            wordsStudied: 0,
            currentIndex: 0,
            totalWords: data.wordCount || 0,
        };
        console.log(`[AutoSyncManager] 📚 Study session started: ${datasetId}`);
    }
    /**
     * Handle progress update event
     */
    async handleProgressUpdate(data) {
        if (!this.syncEnabled)
            return;
        // Update current session
        if (this.currentSession) {
            this.currentSession.currentIndex = data.currentIndex;
            this.currentSession.wordsStudied = data.currentIndex + 1;
            this.currentSession.totalWords = data.totalWords;
        }
        // Throttle syncing (every 30 seconds)
        const now = Date.now();
        if (now - this.lastSyncTime < this.syncInterval && !this.pendingSync) {
            this.pendingSync = true;
            return;
        }
        // Perform sync
        await this.syncProgress(data);
        this.lastSyncTime = now;
        this.pendingSync = false;
    }
    /**
     * Sync progress to cloud
     */
    async syncProgress(data) {
        const datasetId = this.getDatasetId();
        if (!datasetId)
            return;
        const datasetType = this.getDatasetType();
        const currentIndex = data.currentIndex;
        const totalItems = data.totalWords;
        const completedItems = currentIndex + 1;
        const result = await syncService.syncProgress(datasetType, datasetId, currentIndex, totalItems, completedItems);
        if (result.success) {
            console.log(`[AutoSyncManager] ☁️ Progress synced: ${datasetId} (${currentIndex}/${totalItems})`);
        }
        else {
            console.error('[AutoSyncManager] Sync failed:', result.message);
        }
    }
    /**
     * End current study session and save to cloud
     */
    async endCurrentSession() {
        if (!this.currentSession || !this.syncEnabled)
            return;
        const session = this.currentSession;
        session.endTime = Date.now();
        const durationSeconds = Math.floor((session.endTime - session.startTime) / 1000);
        // Only save sessions longer than 10 seconds
        if (durationSeconds < 10) {
            console.log('[AutoSyncManager] Session too short, not saving');
            this.currentSession = null;
            return;
        }
        const result = await syncService.saveStudySession(session.datasetType, session.datasetId, session.wordsStudied, durationSeconds);
        if (result.success) {
            console.log(`[AutoSyncManager] 💾 Session saved: ${session.wordsStudied} words in ${durationSeconds}s`);
        }
        else {
            console.error('[AutoSyncManager] Failed to save session:', result.message);
        }
        this.currentSession = null;
    }
    /**
     * Force sync now (for testing or manual triggers)
     */
    async forceSyncNow() {
        const progressTracker = window.progressTracker;
        if (!progressTracker) {
            return {
                success: false,
                message: 'Progress tracker not available',
            };
        }
        const datasetId = this.getDatasetId();
        if (!datasetId) {
            return {
                success: false,
                message: 'No active dataset',
            };
        }
        const currentIndex = progressTracker.getCurrentIndex();
        const vocabularyManager = window.pteVocabularyManager;
        const totalWords = vocabularyManager?.extractedVocabulary?.length || 0;
        if (totalWords === 0) {
            return {
                success: false,
                message: 'No vocabulary loaded',
            };
        }
        const result = await syncService.syncProgress(this.getDatasetType(), datasetId, currentIndex, totalWords, currentIndex + 1);
        if (result.success) {
            console.log('[AutoSyncManager] 🔄 Force sync completed');
        }
        return result;
    }
    /**
     * Get current dataset ID from settings or storage
     */
    getDatasetId() {
        const storage = window.storage;
        if (!storage)
            return null;
        // Try to get from current mode
        const currentMode = storage.getItem('currentLearningMode') || storage.getItem('currentMode');
        return currentMode;
    }
    /**
     * Get dataset type (vocabulary or practice)
     */
    getDatasetType() {
        const config = window.appConfig;
        const currentMode = this.getDatasetId();
        if (!config || !currentMode)
            return 'vocabulary';
        // Check if it's a practice mode (RS, ASQ, WFD)
        const practiceModes = config.get('data.practiceModes') || ['pte-repeat-sentence', 'pte-answer-short-question', 'pte-write-from-dictation'];
        if (practiceModes.includes(currentMode)) {
            return 'practice';
        }
        return 'vocabulary';
    }
    /**
     * Load progress from cloud and restore user's position
     */
    async loadProgressFromCloud(datasetId) {
        if (!this.syncEnabled)
            return null;
        const progress = await syncService.loadProgress(datasetId);
        if (!progress)
            return null;
        console.log(`[AutoSyncManager] 📥 Loaded progress: ${datasetId} at index ${progress.current_index}`);
        return progress.current_index;
    }
    /**
     * Check if sync is enabled
     */
    isSyncEnabled() {
        return this.syncEnabled;
    }
}
// Export singleton instance
export const autoSyncManager = new AutoSyncManager();
// Default export
export default autoSyncManager;
// Expose as global reference
if (typeof window !== 'undefined') {
    window.autoSyncManager = autoSyncManager;
}
//# sourceMappingURL=autoSyncManager.js.map