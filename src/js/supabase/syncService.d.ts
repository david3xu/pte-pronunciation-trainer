/**
 * Cloud Sync Service
 *
 * Type-safe cloud synchronization for user progress, settings, and study data
 * Syncs local state with Supabase database
 */
import type { Database } from './supabaseClient';
type UserProgress = Database['public']['Tables']['user_progress']['Row'];
/**
 * Sync result type
 */
export interface SyncResult {
    success: boolean;
    error?: Error;
    message?: string;
}
/**
 * SyncService - Handles cloud synchronization
 */
export declare class SyncService {
    private userId;
    /**
     * Initialize sync service with current user
     */
    initialize(): Promise<void>;
    /**
     * Check if sync is available (user is authenticated)
     */
    isAvailable(): boolean;
    /**
     * Sync user progress for a dataset
     */
    syncProgress(datasetType: 'vocabulary' | 'practice', datasetId: string, currentIndex: number, totalItems: number, completedItems: number): Promise<SyncResult>;
    /**
     * Load user progress for a dataset
     */
    loadProgress(datasetId: string): Promise<UserProgress | null>;
    /**
     * Sync user setting
     */
    syncSetting(key: string, value: any): Promise<SyncResult>;
    /**
     * Load all user settings
     */
    loadSettings(): Promise<Record<string, any>>;
    /**
     * Save study session
     */
    saveStudySession(sessionType: 'vocabulary' | 'practice', datasetId: string, wordsStudied: number, durationSeconds: number, accuracyPercentage?: number): Promise<SyncResult>;
    /**
     * Get user statistics
     */
    getUserStats(): Promise<{
        profile: any;
        recentSessions: any[];
    } | null>;
    /**
     * Update user profile statistics
     */
    updateProfileStats(totalWordsStudied: number, totalPracticeSessions: number, currentStreakDays: number, longestStreakDays: number): Promise<SyncResult>;
}
export declare const syncService: SyncService;
export default syncService;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        syncService: SyncService;
    }
}
//# sourceMappingURL=syncService.d.ts.map