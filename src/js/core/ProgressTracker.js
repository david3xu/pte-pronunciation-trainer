/**
 * ProgressTracker - Handles learning progress and status updates
 * Displays current word/item position and emits progress events
 */
class ProgressTracker {
    constructor() {
        this.currentIndex = 0;
        this.config = window.appConfig || new AppConfig();
    }

    /**
     * Update progress display and emit progress event
     * @param {number} currentIndex - Current word/item index (0-based)
     * @param {number} totalWords - Total number of words/items
     * @param {Object} [currentWord=null] - Current word/item object
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
            // Show dialogue ID and TOKEN progress within the dialogue (e.g., 70245 (3/56))
            if (currentWord && currentWord.conversationId) {
                // Use PTEVocabularyManager's complete dataset
                const vocabularyManager = window.pteVocabularyManager;
                let tokensInDialogue = [];

                if (vocabularyManager && vocabularyManager.extractedVocabulary) {
                    // Use complete dataset from PTEVocabularyManager
                    const allTokens = vocabularyManager.extractedVocabulary;
                    tokensInDialogue = allTokens.filter(item => item.conversationId === currentWord.conversationId);
                } else if (window.conversationVocabularyData && Array.isArray(window.conversationVocabularyData.vocabulary)) {
                    // Fallback to legacy generated dataset (still dynamic, no hardcodes)
                    const allTokens = window.conversationVocabularyData.vocabulary;
                    tokensInDialogue = allTokens.filter(item => item.conversationId === currentWord.conversationId);
                }

                // Determine current TOKEN index within this dialogue using robust matching
                let tokenIndex = -1;
                if (tokensInDialogue && tokensInDialogue.length) {
                    // Match by identity or by key fields (term/english + sentence id)
                    tokenIndex = tokensInDialogue.indexOf(currentWord);
                    if (tokenIndex === -1) {
                        tokenIndex = tokensInDialogue.findIndex(t => {
                            const tEnglish = t.english || t.term;
                            const tSentence = typeof t.sentenceNumber !== 'undefined' ? t.sentenceNumber : t.sentence_id;
                            const cSentence = typeof currentWord.sentenceNumber !== 'undefined' ? currentWord.sentenceNumber : currentWord.sentence_id;
                            return tEnglish === currentWord.english && tSentence === cSentence;
                        });
                    }
                }

                const tokenNumber = tokenIndex !== -1 ? tokenIndex + 1 : 1;
                const totalTermsInDialogue = tokensInDialogue ? tokensInDialogue.length : 0;
                const dialogueText = `Dialogue ${currentWord.conversationId} (${tokenNumber}/${totalTermsInDialogue})`;
                progressElement.textContent = dialogueText;
                console.log(`[ProgressTracker] ✅ Set progress to: "${dialogueText}"`);
            } else {
                const progressText = `${currentIndex + 1} of ${totalWords}`;
                progressElement.textContent = progressText;
                console.log(`[ProgressTracker] ✅ Set progress to: "${progressText}"`);
            }
        }

        // Update difficulty badge if current word provided
        if (currentWord) {
            const difficultyBadge = document.getElementById('difficultyBadge');
            if (difficultyBadge && currentWord.difficulty) {
                difficultyBadge.style.display = 'inline-block';
                difficultyBadge.className = `difficulty-badge ${currentWord.difficulty}`;

                const difficultyEmoji = {
                    'easy': '🟢',
                    'normal': '🟡',
                    'hard': '🔴'
                }[currentWord.difficulty] || '';

                const difficultyLabel = currentWord.difficulty.charAt(0).toUpperCase() +
                    currentWord.difficulty.slice(1);

                difficultyBadge.textContent = `${difficultyEmoji} ${difficultyLabel}`;
            }
        }

        // Emit progress event for other modules
        const progressEvent = this.config.get('events.progress.updated') || 'progress:updated';
        window.eventBus.emit(progressEvent, {
            currentIndex,
            totalWords,
            percentage: Math.round(((currentIndex + 1) / totalWords) * 100),
            currentWord
        });
    }

    /**
     * Update status text and emit status event
     * @param {string} status - Status message to display
     */
    updateStatus(status) {
        console.log(`[ProgressTracker] 📢 updateStatus called: "${status}"`);
        const progressElement = document.getElementById('progressText');
        if (progressElement) {
            progressElement.textContent = status;
            console.log(`[ProgressTracker] ✅ Set status to: "${status}"`);
        }


        // Emit status event for other modules
        const statusEvent = this.config.get('events.progress.status.updated') || 'progress:status:updated';
        window.eventBus.emit(statusEvent, { status });
    }

    /**
     * Show error message and emit error event
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error(message);
        this.updateStatus(`Error: ${message}`);

        // Emit error event for other modules
        const errorEvent = this.config.get('events.progress.error') || 'progress:error';
        window.eventBus.emit(errorEvent, {
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Show learning statistics and emit stats event
     * @param {number} wordsCompleted - Number of words completed
     * @param {number} totalTime - Total time in seconds
     * @param {number|null} [accuracy=null] - Accuracy percentage (0-100)
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
        window.eventBus.emit(statsEvent, {
            wordsCompleted,
            totalTime,
            accuracy,
            timestamp: new Date().toISOString()
        });
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    setCurrentIndex(index) {
        this.currentIndex = index;
    }
}

// Global progress tracker instance
const progressTracker = new ProgressTracker();

// Expose as global reference for PTE app
window.progressTracker = progressTracker;