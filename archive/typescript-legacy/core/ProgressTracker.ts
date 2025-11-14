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
import { useAppStore } from '../stores';

/**
 * Type-safe Progress Tracker with Zustand integration
 * Manages learning progress display and Zustand store updates
 */
export class ProgressTracker {
  private currentIndex: number = 0;

  constructor(_config?: any) {
    // Config parameter kept for API compatibility but not used (Zustand handles state)
  }

  /**
   * Update progress display and emit progress event
   */
  updateProgress(currentIndex: number, totalWords: number, currentWord: VocabularyTerm | null = null): void {
    this.currentIndex = currentIndex;
    console.log(`[ProgressTracker] 📊 updateProgress called: index=${currentIndex}, total=${totalWords}, word="${(currentWord as any)?.english || 'none'}"`);

    if (totalWords === 0) {
      this.updateStatus('No words available');
      return;
    }

    const progressElement = document.getElementById('progressText');
    console.log(`[ProgressTracker] progressElement found: ${!!progressElement}`);

    if (progressElement) {
      const currentWordAny = currentWord as any;

      // Show dialogue ID and TOKEN progress
      if (currentWordAny && currentWordAny.conversationId) {
        const vocabularyManager = (window as any).pteVocabularyManager;
        let tokensInDialogue: any[] = [];

        if (vocabularyManager && vocabularyManager.extractedVocabulary) {
          const allTokens = vocabularyManager.extractedVocabulary;
          tokensInDialogue = allTokens.filter((item: any) => item.conversationId === currentWordAny.conversationId);
        } else if ((window as any).conversationVocabularyData && Array.isArray((window as any).conversationVocabularyData.vocabulary)) {
          const allTokens = (window as any).conversationVocabularyData.vocabulary;
          tokensInDialogue = allTokens.filter((item: any) => item.conversationId === currentWordAny.conversationId);
        }

        // Determine current TOKEN index
        let tokenIndex = -1;
        if (tokensInDialogue && tokensInDialogue.length) {
          tokenIndex = tokensInDialogue.indexOf(currentWordAny);
          if (tokenIndex === -1) {
            tokenIndex = tokensInDialogue.findIndex((t: any) => {
              const tEnglish = t.english || t.term;
              const tSentence = typeof t.sentenceNumber !== 'undefined' ? t.sentenceNumber : t.sentence_id;
              const cSentence = typeof currentWordAny.sentenceNumber !== 'undefined' ? currentWordAny.sentenceNumber : currentWordAny.sentence_id;
              return tEnglish === currentWordAny.english && tSentence === cSentence;
            });
          }
        }

        const tokenNumber = tokenIndex !== -1 ? tokenIndex + 1 : 1;
        const totalTermsInDialogue = tokensInDialogue ? tokensInDialogue.length : 0;
        const dialogueText = `Dialogue ${currentWordAny.conversationId} (${tokenNumber}/${totalTermsInDialogue})`;
        progressElement.textContent = dialogueText;
        console.log(`[ProgressTracker] ✅ Set progress to: "${dialogueText}"`);
      } else {
        const progressText = `${currentIndex + 1} of ${totalWords}`;
        progressElement.textContent = progressText;
        console.log(`[ProgressTracker] ✅ Set progress to: "${progressText}"`);
      }
    }

    // Update difficulty badge
    if (currentWord) {
      const currentWordAny = currentWord as any;
      const difficultyBadge = document.getElementById('difficultyBadge');

      if (difficultyBadge && currentWordAny.difficulty) {
        difficultyBadge.style.display = 'inline-block';
        difficultyBadge.className = `difficulty-badge ${currentWordAny.difficulty}`;

        const difficultyEmoji: Record<string, string> = {
          'easy': '🟢',
          'normal': '🟡',
          'hard': '🔴'
        };

        const emoji = difficultyEmoji[currentWordAny.difficulty] || '';
        const difficultyLabel = currentWordAny.difficulty.charAt(0).toUpperCase() +
          currentWordAny.difficulty.slice(1);

        difficultyBadge.textContent = `${emoji} ${difficultyLabel}`;
      }
    }

    // Update progress store (replaces EventBus emission)
    const progressStore = useAppStore.getState().progress;
    if (progressStore && typeof progressStore.updateProgress === 'function') {
      progressStore.updateProgress(currentIndex, totalWords);
    } else {
      console.warn('[ProgressTracker] Progress store or updateProgress method not available');
    }
  }

  /**
   * Update status text (no Zustand store action needed - just DOM update)
   */
  updateStatus(status: string): void {
    console.log(`[ProgressTracker] 📢 updateStatus called: "${status}"`);
    const progressElement = document.getElementById('progressText');

    if (progressElement) {
      progressElement.textContent = status;
      console.log(`[ProgressTracker] ✅ Set status to: "${status}"`);
    }

    // Note: Status is just a temporary UI message, no store update needed
  }

  /**
   * Show error message via UI notification (Zustand version)
   */
  showError(message: string): void {
    console.error(message);
    this.updateStatus(`Error: ${message}`);

    // Show error notification via Zustand store (replaces EventBus emission)
    const uiStore = useAppStore.getState().ui;
    if (uiStore && typeof uiStore.showNotification === 'function') {
      uiStore.showNotification(message, 'error');
    }
  }

  /**
   * Show learning statistics (Zustand version)
   */
  showLearningStats(wordsCompleted: number, totalTime: number, accuracy: number | null = null): void {
    let statsMessage = `📊 Session: ${wordsCompleted} words`;

    if (totalTime) {
      statsMessage += ` in ${Math.round(totalTime / 60)}min`;
    }

    if (accuracy !== null) {
      statsMessage += ` (${accuracy}% accuracy)`;
    }

    this.updateStatus(statsMessage);

    // Update progress store with session stats (replaces EventBus emission)
    // Note: These stats are already tracked in the progress store's session tracking
    const progressStore = useAppStore.getState().progress;
    if (progressStore && typeof progressStore.calculateAccuracy === 'function') {
      progressStore.calculateAccuracy();
    }
  }

  /**
   * Get current index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Set current index
   */
  setCurrentIndex(index: number): void {
    this.currentIndex = index;
  }
}

// Export singleton instance
export const progressTracker = new ProgressTracker();

// Default export
export default progressTracker;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    progressTracker: ProgressTracker;
  }
}

// Expose as global reference
if (typeof window !== 'undefined') {
  (window as any).progressTracker = progressTracker;
}
