/**
 * Auto Sync Manager
 *
 * Automatically syncs user progress and study sessions to Supabase
 * Listens to progress events and handles cloud synchronization
 */
import type { SyncResult } from './syncService';
/**
 * AutoSyncManager - Handles automatic cloud synchronization
 */
export declare class AutoSyncManager {
    private currentSession;
    private syncEnabled;
    private syncInterval;
    private lastSyncTime;
    private pendingSync;
    /**
     * Initialize auto-sync manager
     */
    initialize(): Promise<void>;
    /**
     * Set up event listeners for progress tracking
     */
    private setupEventListeners;
    /**
     * Start a new study session
     */
    private startStudySession;
    /**
     * Handle progress update event
     */
    private handleProgressUpdate;
    /**
     * Sync progress to cloud
     */
    private syncProgress;
    /**
     * End current study session and save to cloud
     */
    private endCurrentSession;
    /**
     * Force sync now (for testing or manual triggers)
     */
    forceSyncNow(): Promise<SyncResult>;
    /**
     * Get current dataset ID from settings or storage
     */
    private getDatasetId;
    /**
     * Get dataset type (vocabulary or practice)
     */
    private getDatasetType;
    /**
     * Load progress from cloud and restore user's position
     */
    loadProgressFromCloud(datasetId: string): Promise<number | null>;
    /**
     * Check if sync is enabled
     */
    isSyncEnabled(): boolean;
}
export declare const autoSyncManager: AutoSyncManager;
export default autoSyncManager;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        autoSyncManager: AutoSyncManager;
    }
}
//# sourceMappingURL=autoSyncManager.d.ts.map