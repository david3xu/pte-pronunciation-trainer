/**
 * ProgressTracker - Type-safe learning progress and status updates
 * Displays current word/item position and emits progress events
 *
 * This is the TypeScript version of src/js/core/ProgressTracker.js
 * Provides type-safe progress tracking and status updates
 */
/**
 * Type-safe Progress Tracker
 * Manages learning progress display and event emission
 */
export class ProgressTracker {
    currentIndex = 0;
    config;
    constructor(config) {
        this.config = config || window.appConfig || null;
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
        // Emit progress event
        const progressEvent = this.config.get('events.progress.updated') || 'progress:updated';
        const eventBus = window.eventBus;
        const progressData = {
            currentIndex,
            totalWords,
            percentage: Math.round(((currentIndex + 1) / totalWords) * 100),
            currentWord
        };
        eventBus.emit(progressEvent, progressData);
    }
    /**
     * Update status text and emit status event
     */
    updateStatus(status) {
        console.log(`[ProgressTracker] 📢 updateStatus called: "${status}"`);
        const progressElement = document.getElementById('progressText');
        if (progressElement) {
            progressElement.textContent = status;
            console.log(`[ProgressTracker] ✅ Set status to: "${status}"`);
        }
        // Emit status event
        const statusEvent = this.config.get('events.progress.status.updated') || 'progress:status:updated';
        const eventBus = window.eventBus;
        const statusData = { status };
        eventBus.emit(statusEvent, statusData);
    }
    /**
     * Show error message and emit error event
     */
    showError(message) {
        console.error(message);
        this.updateStatus(`Error: ${message}`);
        // Emit error event
        const errorEvent = this.config.get('events.progress.error') || 'progress:error';
        const eventBus = window.eventBus;
        const errorData = {
            message,
            timestamp: new Date().toISOString()
        };
        eventBus.emit(errorEvent, errorData);
    }
    /**
     * Show learning statistics and emit stats event
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
        // Emit stats event
        const statsEvent = this.config.get('events.progress.stats.updated') || 'progress:stats:updated';
        const eventBus = window.eventBus;
        const statsData = {
            wordsCompleted,
            totalTime,
            accuracy,
            timestamp: new Date().toISOString()
        };
        eventBus.emit(statsEvent, statsData);
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