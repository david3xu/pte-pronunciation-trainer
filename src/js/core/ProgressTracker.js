// ProgressTracker - Handles learning progress and status updates
class ProgressTracker {
    constructor() {
        this.currentIndex = 0;
    }

    updateProgress(currentIndex, totalWords, currentWord = null) {
        this.currentIndex = currentIndex;

        if (totalWords === 0) {
            this.updateStatus('No words available');
            return;
        }

        const progressElement = document.getElementById('progressText');
        if (progressElement) {
            // Show dialogue ID and TOKEN progress within the dialogue (e.g., 70245 (3/56))
            if (currentWord && currentWord.conversationId) {
                // Use VocabularyManager's complete dataset
                const vocabularyManager = window.vocabularyManager;
                let totalDialogues = 0;
                let tokensInDialogue = [];

                if (vocabularyManager && vocabularyManager.extractedVocabulary) {
                    // Use complete dataset from VocabularyManager
                    const allTokens = vocabularyManager.extractedVocabulary;
                    const allDialogueIds = [...new Set(allTokens.map(item => item.conversationId))].sort((a, b) => parseInt(b) - parseInt(a));
                    totalDialogues = allDialogueIds.length;
                    tokensInDialogue = allTokens.filter(item => item.conversationId === currentWord.conversationId);
                } else if (window.conversationVocabularyData && Array.isArray(window.conversationVocabularyData.vocabulary)) {
                    // Fallback to legacy generated dataset (still dynamic, no hardcodes)
                    const allTokens = window.conversationVocabularyData.vocabulary;
                    const allDialogueIds = [...new Set(allTokens.map(item => item.conversationId))].sort((a, b) => parseInt(b) - parseInt(a));
                    totalDialogues = allDialogueIds.length;
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
                progressElement.textContent = `Dialogue ${currentWord.conversationId} (${tokenNumber}/${totalTermsInDialogue})`;
            } else {
                progressElement.textContent = `${currentIndex + 1} of ${totalWords}`;
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
        window.eventBus.emit('progress:updated', {
            currentIndex,
            totalWords,
            percentage: Math.round(((currentIndex + 1) / totalWords) * 100),
            currentWord
        });
    }

    updateStatus(status) {
        const progressElement = document.getElementById('progressText');
        if (progressElement) {
            progressElement.textContent = status;
        }

        console.log('Status:', status);

        // Emit status event for other modules
        window.eventBus.emit('status:updated', { status });
    }

    showError(message) {
        console.error(message);
        this.updateStatus(`Error: ${message}`);

        // Emit error event for other modules
        window.eventBus.emit('error:occurred', {
            message,
            timestamp: new Date().toISOString()
        });
    }

    showCompletionMessage(categoryName, totalWords) {
        const message = `🎉 ${categoryName} completed! ${totalWords} words mastered!`;
        this.updateStatus(message);

        // Emit completion event
        window.eventBus.emit('category:completed', {
            categoryName,
            totalWords,
            timestamp: new Date().toISOString()
        });
    }

    showCategoryTransition(fromCategory, toCategory, isCircular = false) {
        const symbol = isCircular ? '🔄' : '➡️';
        const message = `${symbol} Moving from ${fromCategory} to ${toCategory}...`;
        this.updateStatus(message);

        // Emit transition event
        window.eventBus.emit('category:transitioned', {
            fromCategory,
            toCategory,
            isCircular
        });
    }

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
        window.eventBus.emit('stats:updated', {
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
window.progressTracker = new ProgressTracker();