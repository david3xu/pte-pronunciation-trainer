/**
 * Cloud Sync Service
 *
 * Type-safe cloud synchronization for user progress, settings, and study data
 * Syncs local state with Supabase database
 */

import { supabase } from './supabaseClient';
import type { Database } from './supabaseClient';

type UserProgress = Database['public']['Tables']['user_progress']['Row'];
type UserProgressInsert = Database['public']['Tables']['user_progress']['Insert'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];
type StudySession = Database['public']['Tables']['study_sessions']['Insert'];

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
export class SyncService {
  private userId: string | null = null;

  /**
   * Initialize sync service with current user
   */
  async initialize(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id ?? null;

    if (!this.userId) {
      console.warn('[SyncService] No user authenticated - sync disabled');
    } else {
      console.log('[SyncService] Initialized for user:', this.userId);
    }
  }

  /**
   * Check if sync is available (user is authenticated)
   */
  isAvailable(): boolean {
    return !!this.userId;
  }

  /**
   * Sync user progress for a dataset
   */
  async syncProgress(
    datasetType: 'vocabulary' | 'practice',
    datasetId: string,
    currentIndex: number,
    totalItems: number,
    completedItems: number
  ): Promise<SyncResult> {
    if (!this.userId) {
      return {
        success: false,
        message: 'User not authenticated',
      };
    }

    try {
      const progress: UserProgressInsert = {
        user_id: this.userId,
        dataset_type: datasetType,
        dataset_id: datasetId,
        current_index: currentIndex,
        total_items: totalItems,
        completed_items: completedItems,
        last_studied_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_progress')
        .upsert([progress] as any, {
          onConflict: 'user_id,dataset_id',
        });

      if (error) {
        return {
          success: false,
          error: error as Error,
          message: error.message,
        };
      }

      console.log(`[SyncService] Progress synced: ${datasetId} (${currentIndex}/${totalItems})`);

      return {
        success: true,
        message: 'Progress synced successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'Failed to sync progress',
      };
    }
  }

  /**
   * Load user progress for a dataset
   */
  async loadProgress(datasetId: string): Promise<UserProgress | null> {
    if (!this.userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', this.userId)
        .eq('dataset_id', datasetId)
        .single();

      if (error) {
        console.warn('[SyncService] No progress found for dataset:', datasetId);
        return null;
      }

      console.log(`[SyncService] Progress loaded: ${datasetId} (${(data as any).current_index}/${(data as any).total_items})`);

      return data as any;
    } catch (error) {
      console.error('[SyncService] Error loading progress:', error);
      return null;
    }
  }

  /**
   * Sync user setting
   */
  async syncSetting(key: string, value: any): Promise<SyncResult> {
    if (!this.userId) {
      return {
        success: false,
        message: 'User not authenticated',
      };
    }

    try {
      const setting: UserSettingsInsert = {
        user_id: this.userId,
        setting_key: key,
        setting_value: value,
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert([setting] as any, {
          onConflict: 'user_id,setting_key',
        });

      if (error) {
        return {
          success: false,
          error: error as Error,
          message: error.message,
        };
      }

      console.log(`[SyncService] Setting synced: ${key} = ${value}`);

      return {
        success: true,
        message: 'Setting synced successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'Failed to sync setting',
      };
    }
  }

  /**
   * Load all user settings
   */
  async loadSettings(): Promise<Record<string, any>> {
    if (!this.userId) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.userId);

      if (error) {
        console.error('[SyncService] Error loading settings:', error);
        return {};
      }

      const settings: Record<string, any> = {};
      data.forEach((setting: UserSettings) => {
        settings[setting.setting_key] = setting.setting_value;
      });

      console.log(`[SyncService] Loaded ${data.length} settings`);

      return settings;
    } catch (error) {
      console.error('[SyncService] Error loading settings:', error);
      return {};
    }
  }

  /**
   * Save study session
   */
  async saveStudySession(
    sessionType: 'vocabulary' | 'practice',
    datasetId: string,
    wordsStudied: number,
    durationSeconds: number,
    accuracyPercentage?: number
  ): Promise<SyncResult> {
    if (!this.userId) {
      return {
        success: false,
        message: 'User not authenticated',
      };
    }

    try {
      const session: StudySession = {
        user_id: this.userId,
        session_type: sessionType,
        dataset_id: datasetId,
        words_studied: wordsStudied,
        duration_seconds: durationSeconds,
        accuracy_percentage: accuracyPercentage ?? null,
        completed_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('study_sessions')
        .insert([session] as any);

      if (error) {
        return {
          success: false,
          error: error as Error,
          message: error.message,
        };
      }

      console.log(`[SyncService] Study session saved: ${datasetId} (${wordsStudied} words, ${durationSeconds}s)`);

      return {
        success: true,
        message: 'Study session saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'Failed to save study session',
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    if (!this.userId) {
      return null;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.userId)
        .single();

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', this.userId)
        .order('completed_at', { ascending: false })
        .limit(10);

      return {
        profile,
        recentSessions: sessions || [],
      };
    } catch (error) {
      console.error('[SyncService] Error loading user stats:', error);
      return null;
    }
  }

  /**
   * Update user profile statistics
   */
  async updateProfileStats(
    totalWordsStudied: number,
    totalPracticeSessions: number,
    currentStreakDays: number,
    longestStreakDays: number
  ): Promise<SyncResult> {
    if (!this.userId) {
      return {
        success: false,
        message: 'User not authenticated',
      };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          total_words_studied: totalWordsStudied,
          total_practice_sessions: totalPracticeSessions,
          current_streak_days: currentStreakDays,
          longest_streak_days: longestStreakDays,
        } as any)
        .eq('id', this.userId);

      if (error) {
        return {
          success: false,
          error: error as Error,
          message: error.message,
        };
      }

      console.log(`[SyncService] Profile stats updated`);

      return {
        success: true,
        message: 'Profile stats updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: 'Failed to update profile stats',
      };
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Default export
export default syncService;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    syncService: SyncService;
  }
}

// Expose as global reference
if (typeof window !== 'undefined') {
  (window as any).syncService = syncService;
}
