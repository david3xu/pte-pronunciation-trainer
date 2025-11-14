/**
 * Session Manager for AI-Powered PTE Trainer
 *
 * Handles practice session tracking with offline-first approach:
 * - Creates and manages practice sessions
 * - Tracks individual item performance
 * - Auto-saves to Supabase with batching and debouncing
 * - Falls back to localStorage when offline
 * - Background syncs queued sessions when online
 *
 * Architecture: Hybrid offline-first
 * - Primary: Supabase (when online)
 * - Fallback: localStorage + IndexedDB queue
 * - Sync: Service Worker background sync
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import localForage from 'localforage';
import supabase from '../supabase/client';
import type { Database, PracticeSessionInsert, SessionItemInsert, TaskType, PracticeMode, ItemType } from '../../types/database';

// ============================================================================
// Types
// ============================================================================

export interface SessionConfig {
  autoSaveInterval: number; // Default: 120000 (2 minutes)
  batchSize: number; // Default: 10
  backgroundSync: boolean; // Default: true
  debounceWrites: boolean; // Default: true
  onlyWhenOnline: boolean; // Default: true
  maxSessionDuration: number; // Default: 7200000 (2 hours)
}

export interface SessionItemData {
  item_id: string;
  item_type: ItemType;
  item_text: string;
  user_response?: string;
  transcription?: string;
  is_correct?: boolean;
  score?: number;
  time_spent_sec?: number;
  attempts?: number;
  feedback?: string;
  pronunciation_errors?: any[];
}

export interface CurrentSession {
  id: string;
  task_type: TaskType;
  dataset_id: string;
  started_at: string;
  items: SessionItemData[];
  settings: Record<string, any>;
}

// ============================================================================
// Session Manager Class
// ============================================================================

export class SessionManager {
  private supabase: SupabaseClient<Database> | null = null;
  private currentSession: CurrentSession | null = null;
  private itemQueue: SessionItemData[] = [];
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSaveTimestamp: number = 0;
  private config: SessionConfig;

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      autoSaveInterval: 120000, // 2 minutes
      batchSize: 10,
      backgroundSync: true,
      debounceWrites: true,
      onlyWhenOnline: true,
      maxSessionDuration: 7200000, // 2 hours
      ...config,
    };

    this.initializeSupabase();
    this.setupAutoSave();
    this.loadQueuedSessions();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeSupabase(): void {
    // Use shared Supabase client to avoid multiple instances
    if (supabase) {
      this.supabase = supabase as SupabaseClient<Database>;
    } else {
      console.warn('[SessionManager] Supabase not configured, using offline-only mode');
    }
  }

  private setupAutoSave(): void {
    if (this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.autoSave();
      }, this.config.autoSaveInterval);
    }
  }

  // ============================================================================
  // Session Lifecycle
  // ============================================================================

  /**
   * Start a new practice session
   */
  async startSession(
    taskType: TaskType,
    datasetId: string,
    mode: PracticeMode = 'practice',
    settings: Record<string, any> = {}
  ): Promise<string> {
    // Complete previous session if exists
    if (this.currentSession) {
      await this.completeSession();
    }

    const sessionId = crypto.randomUUID();
    const session: CurrentSession = {
      id: sessionId,
      task_type: taskType,
      dataset_id: datasetId,
      started_at: new Date().toISOString(),
      items: [],
      settings,
    };

    this.currentSession = session;

    // Save to localStorage immediately (backup)
    this.saveToLocalStorage(session);

    // Attempt to save to Supabase
    if (navigator.onLine && this.supabase) {
      try {
        const sessionData: PracticeSessionInsert = {
          id: sessionId,
          user_id: await this.getCurrentUserId(),
          task_type: taskType,
          dataset_id: datasetId,
          started_at: session.started_at,
          mode,
          settings,
        };

        const { error } = await this.supabase
          .from('study_sessions')
          // @ts-ignore - Supabase client type inference limitation with custom Database type
          .insert(sessionData);

        if (error) {
          console.error('[SessionManager] Failed to save session to Supabase:', error);
          await this.queueForSync(session);
        }
      } catch (error) {
        console.error('[SessionManager] Error saving session:', error);
        await this.queueForSync(session);
      }
    } else {
      // Offline: queue for later sync
      await this.queueForSync(session);
    }

    return sessionId;
  }

  /**
   * Record an item attempt in the current session
   */
  async recordItem(itemData: SessionItemData): Promise<void> {
    if (!this.currentSession) {
      throw new Error('[SessionManager] No active session');
    }

    // Add to current session
    this.currentSession.items.push(itemData);
    this.itemQueue.push(itemData);

    // Update localStorage backup
    this.saveToLocalStorage(this.currentSession);

    // Batch save if queue is full
    if (this.itemQueue.length >= this.config.batchSize) {
      await this.flushItemQueue();
    }
  }

  /**
   * Complete the current session
   */
  async completeSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    // Flush any remaining items
    await this.flushItemQueue();

    // Calculate final metrics
    const completedAt = new Date().toISOString();
    const startedAt = new Date(this.currentSession.started_at);
    const endedAt = new Date(completedAt);
    const duration_sec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    const items_attempted = this.currentSession.items.length;
    const items_correct = this.currentSession.items.filter((item) => item.is_correct === true).length;
    const accuracy = items_attempted > 0 ? (items_correct / items_attempted) * 100 : 0;

    // Update session in Supabase
    if (navigator.onLine && this.supabase) {
      try {
        const userId = await this.getCurrentUserId();
        const { error } = await this.supabase
          .from('study_sessions')
          // @ts-ignore - Supabase client type inference limitation with custom Database type
          .update({
            completed_at: completedAt,
            duration_sec,
            items_attempted,
            items_correct,
            accuracy: Number(accuracy.toFixed(2)),
          })
          .eq('id', this.currentSession.id)
          .eq('user_id', userId);

        if (error) {
          console.error('[SessionManager] Failed to complete session:', error);
        }
      } catch (error) {
        console.error('[SessionManager] Error completing session:', error);
      }
    }

    // Clear current session
    const completedSession = this.currentSession;
    this.currentSession = null;

    // Remove from localStorage
    localStorage.removeItem(`current-session`);

    // Archive to localStorage history
    this.archiveSession(completedSession, { completed_at: completedAt, duration_sec, items_attempted, items_correct, accuracy });
  }

  // ============================================================================
  // Auto-Save & Batching
  // ============================================================================

  private async autoSave(): Promise<void> {
    if (!this.currentSession || this.itemQueue.length === 0) {
      return;
    }

    // Debounce: skip if saved recently
    if (this.config.debounceWrites) {
      const timeSinceLastSave = Date.now() - this.lastSaveTimestamp;
      if (timeSinceLastSave < 10000) {
        // 10 seconds
        return;
      }
    }

    // Only save when online (if configured)
    if (this.config.onlyWhenOnline && !navigator.onLine) {
      console.log('[SessionManager] Offline, skipping auto-save');
      return;
    }

    await this.flushItemQueue();
  }

  private async flushItemQueue(): Promise<void> {
    if (!this.currentSession || this.itemQueue.length === 0) {
      return;
    }

    const itemsToSave = [...this.itemQueue];
    this.itemQueue = [];

    if (!this.supabase || !navigator.onLine) {
      // Offline: items already saved to localStorage in currentSession
      return;
    }

    try {
      const sessionItems: SessionItemInsert[] = itemsToSave.map((item) => ({
        session_id: this.currentSession!.id,
        ...item,
      }));

      const { error } = await this.supabase
        .from('session_items')
        // @ts-ignore - Supabase client type inference limitation with custom Database type
        .insert(sessionItems);

      if (error) {
        console.error('[SessionManager] Failed to save items:', error);
        // Re-queue for retry
        this.itemQueue.push(...itemsToSave);
      } else {
        this.lastSaveTimestamp = Date.now();
      }
    } catch (error) {
      console.error('[SessionManager] Error flushing item queue:', error);
      // Re-queue for retry
      this.itemQueue.push(...itemsToSave);
    }
  }

  // ============================================================================
  // Offline Support
  // ============================================================================

  private saveToLocalStorage(session: CurrentSession): void {
    try {
      localStorage.setItem(`current-session`, JSON.stringify(session));
    } catch (error) {
      console.error('[SessionManager] Failed to save to localStorage:', error);
    }
  }

  private async queueForSync(session: CurrentSession): Promise<void> {
    try {
      await localForage.setItem(`offline-session-${session.id}`, session);

      // Also save to localStorage as backup
      const existing = JSON.parse(localStorage.getItem('offline-sessions') || '[]');
      existing.push({ id: session.id, queued_at: new Date().toISOString() });
      localStorage.setItem('offline-sessions', JSON.stringify(existing));

      console.log(`[SessionManager] Queued session ${session.id} for sync`);
    } catch (error) {
      console.error('[SessionManager] Failed to queue session:', error);
    }
  }

  private async loadQueuedSessions(): Promise<void> {
    try {
      const queuedList = JSON.parse(localStorage.getItem('offline-sessions') || '[]');

      if (queuedList.length > 0) {
        console.log(`[SessionManager] Found ${queuedList.length} queued sessions`);

        // If online, attempt to sync
        if (navigator.onLine && this.supabase) {
          await this.syncQueuedSessions();
        }
      }
    } catch (error) {
      console.error('[SessionManager] Error loading queued sessions:', error);
    }
  }

  /**
   * Sync queued offline sessions to Supabase
   */
  async syncQueuedSessions(): Promise<number> {
    if (!this.supabase || !navigator.onLine) {
      return 0;
    }

    // Check if user is authenticated before attempting sync
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      // User not authenticated - can't sync to database yet
      // Sessions remain queued in localStorage and will sync when user logs in
      return 0;
    }

    try {
      const queuedList = JSON.parse(localStorage.getItem('offline-sessions') || '[]');
      let syncedCount = 0;

      for (const { id } of queuedList) {
        try {
          const session = await localForage.getItem<CurrentSession>(`offline-session-${id}`);

          if (session) {
            // Save session
            const sessionData: PracticeSessionInsert = {
              id: session.id,
              user_id: await this.getCurrentUserId(),
              task_type: session.task_type,
              dataset_id: session.dataset_id,
              started_at: session.started_at,
              settings: session.settings,
            };

            const { error: sessionError } = await this.supabase
              .from('study_sessions')
              // @ts-ignore - Supabase client type inference limitation with custom Database type
              .upsert(sessionData);

            if (!sessionError && session.items.length > 0) {
              // Save items
              const items: SessionItemInsert[] = session.items.map((item: SessionItemData) => ({
                session_id: session.id,
                ...item,
              }));

              const { error: itemsError } = await this.supabase
                .from('session_items')
                // @ts-ignore - Supabase client type inference limitation with custom Database type
                .insert(items);

              if (!itemsError) {
                // Successfully synced
                await localForage.removeItem(`offline-session-${id}`);
                syncedCount++;
              }
            }
          }
        } catch (error) {
          console.error(`[SessionManager] Failed to sync session ${id}:`, error);
        }
      }

      // Update queued list
      if (syncedCount > 0) {
        const remainingList = queuedList.filter((item: any) =>
          localForage.getItem(`offline-session-${item.id}`).then((s: unknown) => s !== null)
        );
        localStorage.setItem('offline-sessions', JSON.stringify(remainingList));
        console.log(`[SessionManager] Synced ${syncedCount} sessions`);
      }

      return syncedCount;
    } catch (error) {
      console.error('[SessionManager] Error syncing queued sessions:', error);
      return 0;
    }
  }

  private archiveSession(session: CurrentSession, metrics: any): void {
    try {
      const archive = JSON.parse(localStorage.getItem('session-archive') || '[]');
      archive.push({
        ...session,
        ...metrics,
        archived_at: new Date().toISOString(),
      });

      // Keep last 50 sessions
      if (archive.length > 50) {
        archive.splice(0, archive.length - 50);
      }

      localStorage.setItem('session-archive', JSON.stringify(archive));
    } catch (error) {
      console.error('[SessionManager] Failed to archive session:', error);
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private async getCurrentUserId(): Promise<string> {
    // Always try to get device ID for fallback
    let deviceId = localStorage.getItem('device-user-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device-user-id', deviceId);
    }

    // If no Supabase, use device ID
    if (!this.supabase) {
      return deviceId;
    }

    // Try to get authenticated user
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    // If authenticated, return user ID, otherwise use device ID
    return user ? user.id : deviceId;
  }

  getCurrentSession(): CurrentSession | null {
    return this.currentSession;
  }

  getQueuedSessionCount(): number {
    try {
      const queuedList = JSON.parse(localStorage.getItem('offline-sessions') || '[]');
      return queuedList.length;
    } catch {
      return 0;
    }
  }

  /**
   * Cleanup: call when component unmounts or app closes
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Save current session before cleanup
    if (this.currentSession) {
      this.completeSession();
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(config?: Partial<SessionConfig>): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(config);
  }
  return sessionManagerInstance;
}

export default SessionManager;
