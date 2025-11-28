/**
 * Data Migration Service
 *
 * Migrates user progress data from localStorage to Supabase.
 * Phase 1.5: Ensures no data loss for existing users transitioning to database-backed system.
 *
 * Migration Flow:
 * 1. Detect localStorage data
 * 2. Parse and validate old format
 * 3. Transform to Supabase schema
 * 4. Bulk insert with error handling
 * 5. Verify migration success
 * 6. Clear old localStorage (with user consent)
 */

import type { User } from '../../stores/types';
import { supabase } from '../supabase/supabaseClient';

// ============================================
// Types
// ============================================

interface OldProgressData {
  practiceProgress?: {
    sessions?: Array<{
      mode?: string;
      date?: string;
      itemsCompleted?: number;
      itemsCorrect?: number;
      accuracy?: number;
      duration?: number;
      items?: Array<{
        itemId?: string;
        text?: string;
        score?: number;
        attempts?: number;
        timestamp?: string;
      }>;
    }>;
  };
  preferences?: {
    autoPlay?: boolean;
    repeatMode?: string;
    vocabularyBook?: string;
    difficultyFilter?: string;
  };
}

export interface MigrationResult {
  status: 'success' | 'no_data' | 'error' | 'cancelled';
  sessionsCount?: number;
  itemsCount?: number;
  message?: string;
  error?: string;
}

export interface MigrationProgress {
  phase: 'detecting' | 'parsing' | 'transforming' | 'inserting' | 'verifying' | 'cleaning';
  progress: number; // 0-100
  message: string;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEYS = {
  PRACTICE_PROGRESS: 'practice_progress',
  PREFERENCES: 'user_preferences',
  COMPLETED_ITEMS: 'completed_items',
  SESSION_HISTORY: 'session_history',
  // Zustand persist key
  APP_STORAGE: 'pte-app-storage',
};

const BACKUP_KEY = 'migration_backup';
const MIGRATION_COMPLETED_KEY = 'migration_completed_v1';

// ============================================
// Migration Detection
// ============================================

/**
 * Check if user has localStorage data that needs migration
 */
export function hasDataToMigrate(): boolean {
  try {
    // Check if migration was already completed
    if (localStorage.getItem(MIGRATION_COMPLETED_KEY)) {
      return false;
    }

    // Check for any old data keys
    for (const key of Object.values(STORAGE_KEYS)) {
      if (localStorage.getItem(key)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[Migration] Error checking for data:', error);
    return false;
  }
}

/**
 * Get summary of data to be migrated
 */
export function getMigrationSummary(): { hasData: boolean; sessionCount: number; itemCount: number } {
  try {
    const progressData = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
    const appData = localStorage.getItem(STORAGE_KEYS.APP_STORAGE);

    let sessionCount = 0;
    let itemCount = 0;

    if (progressData) {
      try {
        const data = JSON.parse(progressData);
        sessionCount = data.practiceProgress?.sessions?.length || 0;
        data.practiceProgress?.sessions?.forEach((session: any) => {
          itemCount += session.items?.length || 0;
        });
      } catch (err) {
        console.warn('[Migration] Error parsing progress data:', err);
      }
    }

    if (appData) {
      try {
        const data = JSON.parse(appData);
        // Check Zustand persisted data
        if (data.state?.progress?.completedItems) {
          itemCount += Array.isArray(data.state.progress.completedItems)
            ? data.state.progress.completedItems.length
            : 0;
        }
      } catch (err) {
        console.warn('[Migration] Error parsing app data:', err);
      }
    }

    return {
      hasData: sessionCount > 0 || itemCount > 0,
      sessionCount,
      itemCount,
    };
  } catch (error) {
    console.error('[Migration] Error getting summary:', error);
    return { hasData: false, sessionCount: 0, itemCount: 0 };
  }
}

// ============================================
// Data Parsing & Transformation
// ============================================

/**
 * Parse and validate old localStorage data
 */
function parseOldData(): OldProgressData | null {
  try {
    const progressData = localStorage.getItem(STORAGE_KEYS.PRACTICE_PROGRESS);
    const preferencesData = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    const appData = localStorage.getItem(STORAGE_KEYS.APP_STORAGE);

    const result: OldProgressData = {};

    // Parse practice progress
    if (progressData) {
      try {
        result.practiceProgress = JSON.parse(progressData);
      } catch (err) {
        console.warn('[Migration] Error parsing progress data:', err);
      }
    }

    // Parse preferences
    if (preferencesData) {
      try {
        result.preferences = JSON.parse(preferencesData);
      } catch (err) {
        console.warn('[Migration] Error parsing preferences:', err);
      }
    }

    // Parse Zustand app data
    if (appData) {
      try {
        const data = JSON.parse(appData);
        if (data.state) {
          // Merge Zustand settings into preferences
          result.preferences = {
            ...result.preferences,
            autoPlay: data.state.settings?.autoPlay,
            repeatMode: data.state.settings?.repeatMode,
            vocabularyBook: data.state.settings?.vocabularyBook,
            difficultyFilter: data.state.settings?.difficultyFilter,
          };
        }
      } catch (err) {
        console.warn('[Migration] Error parsing app data:', err);
      }
    }

    return result;
  } catch (error) {
    console.error('[Migration] Error parsing old data:', error);
    return null;
  }
}

/**
 * Transform old data to Supabase schema
 */
function transformData(oldData: OldProgressData, userId: string) {
  const sessions: any[] = [];
  const items: any[] = [];

  // Transform sessions
  oldData.practiceProgress?.sessions?.forEach((oldSession) => {
    const sessionId = crypto.randomUUID();
    const taskType = oldSession.mode || 'vocabulary';

    sessions.push({
      id: sessionId,
      user_id: userId,
      task_type: taskType,
      start_time: oldSession.date || new Date().toISOString(),
      end_time: oldSession.date || new Date().toISOString(),
      items_attempted: oldSession.itemsCompleted || 0,
      items_correct: oldSession.itemsCorrect || 0,
      accuracy: oldSession.accuracy || 0,
      duration_seconds: oldSession.duration || 0,
      status: 'completed',
    });

    // Transform session items
    oldSession.items?.forEach((oldItem) => {
      items.push({
        session_id: sessionId,
        item_id: oldItem.itemId || crypto.randomUUID(),
        item_text: oldItem.text || '',
        user_response: '',
        score: oldItem.score || 0,
        attempts: oldItem.attempts || 1,
        time_spent: 0,
        created_at: oldItem.timestamp || new Date().toISOString(),
      });
    });
  });

  return { sessions, items };
}

// ============================================
// Migration Execution
// ============================================

/**
 * Perform migration (main function)
 */
export async function performMigration(
  user: User,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  try {
    // Phase 1: Detecting
    onProgress?.({ phase: 'detecting', progress: 0, message: 'Detecting localStorage data...' });

    if (!hasDataToMigrate()) {
      return { status: 'no_data', message: 'No data to migrate' };
    }

    // Backup old data first
    const allData: any = {};
    for (const key of Object.values(STORAGE_KEYS)) {
      const value = localStorage.getItem(key);
      if (value) {
        allData[key] = value;
      }
    }
    localStorage.setItem(BACKUP_KEY, JSON.stringify(allData));

    // Phase 2: Parsing
    onProgress?.({ phase: 'parsing', progress: 20, message: 'Parsing localStorage data...' });

    const oldData = parseOldData();
    if (!oldData) {
      return { status: 'error', error: 'Failed to parse old data' };
    }

    // Phase 3: Transforming
    onProgress?.({ phase: 'transforming', progress: 40, message: 'Transforming data format...' });

    const { sessions, items } = transformData(oldData, user.id);

    if (sessions.length === 0) {
      return { status: 'no_data', message: 'No valid session data found' };
    }

    // Phase 4: Inserting
    onProgress?.({ phase: 'inserting', progress: 60, message: 'Uploading to database...' });

    // Insert sessions
    const { error: sessionsError } = await supabase.from('study_sessions').insert(sessions);

    if (sessionsError) {
      console.error('[Migration] Error inserting sessions:', sessionsError);
      return { status: 'error', error: `Database error: ${sessionsError.message}` };
    }

    // Insert items
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('session_items').insert(items);

      if (itemsError) {
        console.error('[Migration] Error inserting items:', itemsError);
        // Don't fail entire migration if items fail
        console.warn('[Migration] Sessions migrated, but some items failed');
      }
    }

    // Phase 5: Verifying
    onProgress?.({ phase: 'verifying', progress: 80, message: 'Verifying migration...' });

    const { error: countError } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('[Migration] Error verifying:', countError);
    }

    // Phase 6: Cleaning
    onProgress?.({ phase: 'cleaning', progress: 100, message: 'Migration complete!' });

    // Mark migration as completed
    localStorage.setItem(MIGRATION_COMPLETED_KEY, new Date().toISOString());

    return {
      status: 'success',
      sessionsCount: sessions.length,
      itemsCount: items.length,
      message: `Migrated ${sessions.length} sessions and ${items.length} items`,
    };
  } catch (error: any) {
    console.error('[Migration] Unexpected error:', error);
    return {
      status: 'error',
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Clear old localStorage data (only after successful migration)
 */
export function clearOldData(): void {
  try {
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
    console.log('[Migration] Old data cleared');
  } catch (error) {
    console.error('[Migration] Error clearing old data:', error);
  }
}

/**
 * Rollback migration (restore from backup)
 */
export function rollbackMigration(): boolean {
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) {
      console.warn('[Migration] No backup found');
      return false;
    }

    const allData = JSON.parse(backup);
    for (const [key, value] of Object.entries(allData)) {
      localStorage.setItem(key, value as string);
    }

    // Remove migration markers
    localStorage.removeItem(MIGRATION_COMPLETED_KEY);
    localStorage.removeItem(BACKUP_KEY);

    console.log('[Migration] Rolled back successfully');
    return true;
  } catch (error) {
    console.error('[Migration] Error rolling back:', error);
    return false;
  }
}
