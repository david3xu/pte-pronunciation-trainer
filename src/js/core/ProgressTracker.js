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
            // Show dialogue progress in reverse order (245/245, 244/245, etc.)
            if (currentWord && currentWord.conversationId) {
                // Get total number of dialogues from the data
                const totalDialogues = window.conversationVocabularyData?.totalConversations || 56;
                // Get all unique dialogue IDs and sort them in descending order
                const allDialogueIds = [...new Set(window.conversationVocabularyData.vocabulary.map(item => item.conversationId))].sort((a, b) => parseInt(b) - parseInt(a));
                // Find the position of current dialogue in the sorted list
                const dialogueIndex = allDialogueIds.indexOf(currentWord.conversationId);
                const dialogueNumber = dialogueIndex !== -1 ? dialogueIndex + 1 : 1;
                progressElement.textContent = `${dialogueNumber}/${totalDialogues}`;
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