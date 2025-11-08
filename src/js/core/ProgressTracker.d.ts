/**
 * ProgressTracker - Type-safe learning progress and status updates
 * Displays current word/item position and updates Zustand store
 *
 * This is the TypeScript version of src/js/core/ProgressTracker.js
 * Provides type-safe progress tracking and status updates
 *
 * ARCHITECTURE: Zustand state management
 * - Replaced EventBus emissions with Zustand store updates
 * - Direct progress store actions for status/error/stats
 */
import type { VocabularyTerm } from '../../types';
/**
 * Type-safe Progress Tracker with Zustand integration
 * Manages learning progress display and Zustand store updates
 */
export declare class ProgressTracker {
    private currentIndex;
    constructor(_config?: any);
    /**
     * Update progress display and emit progress event
     */
    updateProgress(currentIndex: number, totalWords: number, currentWord?: VocabularyTerm | null): void;
    /**
     * Update status text (no Zustand store action needed - just DOM update)
     */
    updateStatus(status: string): void;
    /**
     * Show error message via UI notification (Zustand version)
     */
    showError(message: string): void;
    /**
     * Show learning statistics (Zustand version)
     */
    showLearningStats(wordsCompleted: number, totalTime: number, accuracy?: number | null): void;
    /**
     * Get current index
     */
    getCurrentIndex(): number;
    /**
     * Set current index
     */
    setCurrentIndex(index: number): void;
}
export declare const progressTracker: ProgressTracker;
export default progressTracker;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        progressTracker: ProgressTracker;
    }
}
//# sourceMappingURL=ProgressTracker.d.ts.map