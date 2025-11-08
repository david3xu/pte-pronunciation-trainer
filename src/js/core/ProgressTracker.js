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
import { useAppStore } from '../stores';
/**
 * Type-safe Progress Tracker with Zustand integration
 * Manages learning progress display and Zustand store updates
 */
export class ProgressTracker {
    currentIndex = 0;
    constructor(_config) {
        // Config parameter kept for API compatibility but not used (Zustand handles state)
    }
    /**
     * Update progress display and emit progress event
     */
    updateProgress(currentIndex, totalWords, currentWord = null) {
        this.currentIndex = currentIndex;
        console.log(`[ProgressTracker] 📊 updateProgress called: index=${currentIndex}, total=${totalWords}, word="${currentWord?.english || 'none'}"`);
        if (totalWords === 0) {
            this.updateStatus('No words available');
            return;
        }
        const progressElement = document.getElementById('progressText');
        console.log(`[ProgressTracker] progressElement found: ${!!progressElement}`);
        if (progressElement) {
            const currentWordAny = currentWord;
            // Show dialogue ID and TOKEN progress
            if (currentWordAny && currentWordAny.conversationId) {
                const vocabularyManager = window.pteVocabularyManager;
                let tokensInDialogue = [];
                if (vocabularyManager && vocabularyManager.extractedVocabulary) {
                    const allTokens = vocabularyManager.extractedVocabulary;
                    tokensInDialogue = allTokens.filter((item) => item.conversationId === currentWordAny.conversationId);
                }
                else if (window.conversationVocabularyData && Array.isArray(window.conversationVocabularyData.vocabulary)) {
                    const allTokens = window.conversationVocabularyData.vocabulary;
                    tokensInDialogue = allTokens.filter((item) => item.conversationId === currentWordAny.conversationId);
                }
                // Determine current TOKEN index
                let tokenIndex = -1;
                if (tokensInDialogue && tokensInDialogue.length) {
                    tokenIndex = tokensInDialogue.indexOf(currentWordAny);
                    if (tokenIndex === -1) {
                        tokenIndex = tokensInDialogue.findIndex((t) => {
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
            }
            else {
                const progressText = `${currentIndex + 1} of ${totalWords}`;
                progressElement.textContent = progressText;
                console.log(`[ProgressTracker] ✅ Set progress to: "${progressText}"`);
            }
        }
        // Update difficulty badge
        if (currentWord) {
            const currentWordAny = currentWord;
            const difficultyBadge = document.getElementById('difficultyBadge');
            if (difficultyBadge && currentWordAny.difficulty) {
                difficultyBadge.style.display = 'inline-block';
                difficultyBadge.className = `difficulty-badge ${currentWordAny.difficulty}`;
                const difficultyEmoji = {
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
        useAppStore.getState().progress.updateProgress(currentIndex, totalWords);
    }
    /**
     * Update status text (no Zustand store action needed - just DOM update)
     */
    updateStatus(status) {
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
    showError(message) {
        console.error(message);
        this.updateStatus(`Error: ${message}`);
        // Show error notification via Zustand store (replaces EventBus emission)
        useAppStore.getState().ui.showNotification(message, 'error');
    }
    /**
     * Show learning statistics (Zustand version)
     */
    showLearningStats(wordsCompleted, totalTime, accuracy = null) {
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
        useAppStore.getState().progress.calculateAccuracy();
    }
    /**
     * Get current index
     */
    getCurrentIndex() {
        return this.currentIndex;
    }
    /**
     * Set current index
     */
    setCurrentIndex(index) {
        this.currentIndex = index;
    }
}
// Export singleton instance
export const progressTracker = new ProgressTracker();
// Default export
export default progressTracker;
// Expose as global reference
if (typeof window !== 'undefined') {
    window.progressTracker = progressTracker;
}
//# sourceMappingURL=ProgressTracker.js.map