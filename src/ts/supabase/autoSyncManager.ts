/**
 * Auto Sync Manager
 *
 * ARCHITECTURE: Zustand state management
 * - Subscribes to progress store changes instead of EventBus
 * - Subscribes to settings.practiceMode and vocabulary.currentDataset for session tracking
 *
 * Automatically syncs user progress and study sessions to Supabase
 * Tracks progress via Zustand store subscriptions and handles cloud synchronization
 */

import { useAppStore } from '../stores';
import { syncService } from './syncService';
import type { SyncResult } from './syncService';

/**
 * Study session data
 */
interface StudySessionData {
  startTime: number;
  endTime?: number;
  datasetId: string;
  datasetType: 'vocabulary' | 'practice';
  wordsStudied: number;
  currentIndex: number;
  totalWords: number;
}

/**
 * AutoSyncManager - Handles automatic cloud synchronization
 */
export class AutoSyncManager {
  private currentSession: StudySessionData | null = null;
  private syncEnabled: boolean = false;
  private syncInterval: number = 30000; // Sync every 30 seconds
  private lastSyncTime: number = 0;
  private pendingSync: boolean = false;
  private unsubscribers: Array<() => void> = [];

  /**
   * Initialize auto-sync manager
   */
  async initialize(): Promise<void> {
    await syncService.initialize();
    this.syncEnabled = syncService.isAvailable();

    if (!this.syncEnabled) {
      console.log('[AutoSyncManager] Sync disabled - user not authenticated');
      return;
    }

    console.log('[AutoSyncManager] ✅ Initialized successfully');
    this.setupStoreSubscriptions();
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /**
   * Setup Zustand store subscriptions (replaces EventBus listeners)
   */
  private setupStoreSubscriptions(): void {
    if (typeof window === 'undefined') return;

    // Subscribe to progress updates
    const unsubProgress = useAppStore.subscribe(
      (state) => ({ currentIndex: state.progress.currentIndex, totalItems: state.progress.totalItems }),
      (progress, prevProgress) => {
        if (progress.currentIndex !== prevProgress.currentIndex || progress.totalItems !== prevProgress.totalItems) {
          this.handleProgressUpdate({ currentIndex: progress.currentIndex, totalWords: progress.totalItems });
        }
      }
    );
    this.unsubscribers.push(unsubProgress);

    // Subscribe to vocabulary dataset changes (start of session)
    const unsubDataset = useAppStore.subscribe(
      (state) => state.vocabulary.currentDataset,
      (dataset, prevDataset) => {
        if (dataset.length > 0 && dataset !== prevDataset) {
          this.startStudySession({ wordCount: dataset.length });
        }
      }
    );
    this.unsubscribers.push(unsubDataset);

    // Subscribe to practice mode changes (end previous session, start new)
    const unsubMode = useAppStore.subscribe(
      (state) => state.settings.practiceMode,
      (practiceMode, prevPracticeMode) => {
        if (practiceMode !== prevPracticeMode) {
          this.endCurrentSession();
          // New session will start on next dataset load
        }
      }
    );
    this.unsubscribers.push(unsubMode);

    // Listen to page unload (save session before leaving)
    window.addEventListener('beforeunload', () => {
      this.endCurrentSession();
    });

    console.log('[AutoSyncManager] Zustand store subscriptions registered');
  }

  /**
   * Start a new study session
   */
  private startStudySession(data: any): void {
    if (!this.syncEnabled) return;

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
  private async handleProgressUpdate(data: any): Promise<void> {
    if (!this.syncEnabled) return;

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
  private async syncProgress(data: any): Promise<void> {
    const datasetId = this.getDatasetId();
    if (!datasetId) return;

    const datasetType = this.getDatasetType();
    const currentIndex = data.currentIndex;
    const totalItems = data.totalWords;
    const completedItems = currentIndex + 1;

    const result = await syncService.syncProgress(
      datasetType,
      datasetId,
      currentIndex,
      totalItems,
      completedItems
    );

    if (result.success) {
      console.log(`[AutoSyncManager] ☁️ Progress synced: ${datasetId} (${currentIndex}/${totalItems})`);
    } else {
      console.error('[AutoSyncManager] Sync failed:', result.message);
    }
  }

  /**
   * End current study session and save to cloud
   */
  private async endCurrentSession(): Promise<void> {
    if (!this.currentSession || !this.syncEnabled) return;

    const session = this.currentSession;
    session.endTime = Date.now();

    const durationSeconds = Math.floor((session.endTime - session.startTime) / 1000);

    // Only save sessions longer than 10 seconds
    if (durationSeconds < 10) {
      console.log('[AutoSyncManager] Session too short, not saving');
      this.currentSession = null;
      return;
    }

    const result = await syncService.saveStudySession(
      session.datasetType,
      session.datasetId,
      session.wordsStudied,
      durationSeconds
    );

    if (result.success) {
      console.log(`[AutoSyncManager] 💾 Session saved: ${session.wordsStudied} words in ${durationSeconds}s`);
    } else {
      console.error('[AutoSyncManager] Failed to save session:', result.message);
    }

    this.currentSession = null;
  }

  /**
   * Force sync now (for testing or manual triggers)
   */
  async forceSyncNow(): Promise<SyncResult> {
    const progressTracker = (window as any).progressTracker;
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
    const vocabularyManager = (window as any).pteVocabularyManager;
    const totalWords = vocabularyManager?.extractedVocabulary?.length || 0;

    if (totalWords === 0) {
      return {
        success: false,
        message: 'No vocabulary loaded',
      };
    }

    const result = await syncService.syncProgress(
      this.getDatasetType(),
      datasetId,
      currentIndex,
      totalWords,
      currentIndex + 1
    );

    if (result.success) {
      console.log('[AutoSyncManager] 🔄 Force sync completed');
    }

    return result;
  }

  /**
   * Get current dataset ID from settings or storage
   */
  private getDatasetId(): string | null {
    const storage = (window as any).storage;
    if (!storage) return null;

    // Try to get from current mode
    const currentMode = storage.getItem('currentLearningMode') || storage.getItem('currentMode');
    return currentMode;
  }

  /**
   * Get dataset type (vocabulary or practice)
   */
  private getDatasetType(): 'vocabulary' | 'practice' {
    const config = (window as any).appConfig;
    const currentMode = this.getDatasetId();

    if (!config || !currentMode) return 'vocabulary';

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
  async loadProgressFromCloud(datasetId: string): Promise<number | null> {
    if (!this.syncEnabled) return null;

    const progress = await syncService.loadProgress(datasetId);
    if (!progress) return null;

    console.log(`[AutoSyncManager] 📥 Loaded progress: ${datasetId} at index ${(progress as any).current_index}`);
    return (progress as any).current_index;
  }

  /**
   * Check if sync is enabled
   */
  isSyncEnabled(): boolean {
    return this.syncEnabled;
  }
}

// Export singleton instance
export const autoSyncManager = new AutoSyncManager();

// Default export
export default autoSyncManager;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    autoSyncManager: AutoSyncManager;
  }
}

// Expose as global reference
if (typeof window !== 'undefined') {
  (window as any).autoSyncManager = autoSyncManager;
}
