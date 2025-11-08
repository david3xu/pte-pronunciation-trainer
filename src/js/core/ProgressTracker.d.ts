/**
 * ProgressTracker - Type-safe learning progress and status updates
 * Displays current word/item position and emits progress events
 *
 * This is the TypeScript version of src/js/core/ProgressTracker.js
 * Provides type-safe progress tracking and status updates
 */
import type { VocabularyTerm } from '../../types';
/**
 * Type-safe Progress Tracker
 * Manages learning progress display and event emission
 */
export declare class ProgressTracker {
    private currentIndex;
    private config;
    constructor(config?: any);
    /**
     * Update progress display and emit progress event
     */
    updateProgress(currentIndex: number, totalWords: number, currentWord?: VocabularyTerm | null): void;
    /**
     * Update status text and emit status event
     */
    updateStatus(status: string): void;
    /**
     * Show error message and emit error event
     */
    showError(message: string): void;
    /**
     * Show learning statistics and emit stats event
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