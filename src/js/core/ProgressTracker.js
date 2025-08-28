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
                // Get all unique dialogue IDs and sort them in descending order
                const allDialogueIds = [...new Set(window.conversationVocabularyData.vocabulary.map(item => item.conversationId))].sort((a, b) => parseInt(b) - parseInt(a));
                const totalDialogues = allDialogueIds.length;

                // Determine current TOKEN index within this dialogue
                const allTokens = window.conversationVocabularyData.vocabulary;
                const tokensInDialogue = allTokens.filter(item => item.conversationId === currentWord.conversationId);
                // Try to find the token index by strict reference first, then by fields
                let tokenIndex = tokensInDialogue.indexOf(currentWord);
                if (tokenIndex === -1) {
                    tokenIndex = tokensInDialogue.findIndex(t => (
                        t.english === currentWord.english &&
                        (t.sentenceNumber === currentWord.sentenceNumber || t.sentence_id === currentWord.sentence_id)
                    ));
                }
                const tokenNumber = tokenIndex !== -1 ? tokenIndex + 1 : 1;

                // Show dialogue ID with token number over total dialogues
                progressElement.textContent = `Dialogue ${currentWord.conversationId} (${tokenNumber}/${totalDialogues})`;
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