/**
 * Progress Tracking Component for CCL Pronunciation Trainer
 * Handles progress visualization and statistics
 */

class ProgressComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            showPercentage: true,
            showStats: true,
            showStreak: true,
            animated: true,
            ...options
        };
        
        this.state = {
            current: 0,
            total: 0,
            completed: [],
            category: '',
            sessionStartTime: null,
            studyStreak: 0,
            totalStudyTime: 0
        };
        
        this.init();
    }

    init() {
        this.render();
        this.loadStoredProgress();
        console.log('Progress component initialized');
    }

    render() {
        const template = `
            <div class="progress-component">
                <div class="progress-main">
                    <div class="progress-bar-container">
                        <div class="progress-bar" data-progress-bar>
                            <div class="progress-fill" data-progress-fill></div>
                            <div class="progress-text" data-progress-text>0 / 0</div>
                        </div>
                        ${this.options.showPercentage ? '<div class="progress-percentage" data-progress-percentage>0%</div>' : ''}
                    </div>
                    
                    <div class="progress-category" data-progress-category>
                        Select a category to begin
                    </div>
                </div>
                
                ${this.options.showStats ? this.renderStats() : ''}
                ${this.options.showStreak ? this.renderStreak() : ''}
            </div>
        `;
        
        this.container.innerHTML = template;
        this.cacheElements();
    }

    renderStats() {
        return `
            <div class="progress-stats">
                <div class="stat-item">
                    <span class="stat-value" data-session-time>0:00</span>
                    <span class="stat-label">Session Time</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" data-terms-studied>0</span>
                    <span class="stat-label">Terms Studied</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" data-accuracy>0%</span>
                    <span class="stat-label">Accuracy</span>
                </div>
            </div>
        `;
    }

    renderStreak() {
        return `
            <div class="progress-streak">
                <div class="streak-fire">🔥</div>
                <div class="streak-info">
                    <span class="streak-count" data-streak-count>0</span>
                    <span class="streak-label">Day Streak</span>
                </div>
            </div>
        `;
    }

    cacheElements() {
        this.elements = {
            progressBar: this.container.querySelector('[data-progress-bar]'),
            progressFill: this.container.querySelector('[data-progress-fill]'),
            progressText: this.container.querySelector('[data-progress-text]'),
            progressPercentage: this.container.querySelector('[data-progress-percentage]'),
            progressCategory: this.container.querySelector('[data-progress-category]'),
            sessionTime: this.container.querySelector('[data-session-time]'),
            termsStudied: this.container.querySelector('[data-terms-studied]'),
            accuracy: this.container.querySelector('[data-accuracy]'),
            streakCount: this.container.querySelector('[data-streak-count]')
        };
    }

    loadStoredProgress() {
        try {
            const stored = localStorage.getItem('ccl-trainer-progress');
            if (stored) {
                const data = JSON.parse(stored);
                this.state = { ...this.state, ...data };
                this.updateDisplay();
            }
        } catch (error) {
            console.warn('Failed to load stored progress:', error);
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('ccl-trainer-progress', JSON.stringify({
                completed: this.state.completed,
                totalStudyTime: this.state.totalStudyTime,
                studyStreak: this.state.studyStreak,
                lastStudyDate: new Date().toDateString()
            }));
        } catch (error) {
            console.warn('Failed to save progress:', error);
        }
    }

    updateProgress(current, total, category = '') {
        const wasCompleted = this.isComplete();
        
        this.state.current = current;
        this.state.total = total;
        this.state.category = category;
        
        this.updateDisplay();
        
        // Check if category was just completed
        if (!wasCompleted && this.isComplete()) {
            this.onCategoryCompleted();
        }
        
        // Auto-save progress
        this.saveProgress();
    }

    updateSessionStats(termsStudied, accuracy = null) {
        if (this.elements.termsStudied) {
            this.elements.termsStudied.textContent = termsStudied;
        }
        
        if (accuracy !== null && this.elements.accuracy) {
            this.elements.accuracy.textContent = `${Math.round(accuracy)}%`;
        }
        
        // Update session time
        if (this.state.sessionStartTime) {
            const sessionDuration = Date.now() - this.state.sessionStartTime;
            this.updateSessionTime(sessionDuration);
        }
    }

    updateSessionTime(duration) {
        if (!this.elements.sessionTime) return;
        
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        const timeStr = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.elements.sessionTime.textContent = timeStr;
    }

    startSession() {
        this.state.sessionStartTime = Date.now();
        this.updateSessionTimer();
    }

    updateSessionTimer() {
        if (!this.state.sessionStartTime) return;
        
        const updateTimer = () => {
            if (this.state.sessionStartTime) {
                const duration = Date.now() - this.state.sessionStartTime;
                this.updateSessionTime(duration);
                setTimeout(updateTimer, 1000);
            }
        };
        
        updateTimer();
    }

    updateDisplay() {
        const percentage = this.state.total > 0 ? Math.round((this.state.current / this.state.total) * 100) : 0;
        
        // Update progress bar
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percentage}%`;
            
            if (this.options.animated) {
                this.elements.progressFill.style.transition = 'width 0.5s ease';
            }
        }
        
        // Update progress text
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${this.state.current} / ${this.state.total}`;
        }
        
        // Update percentage
        if (this.elements.progressPercentage) {
            this.elements.progressPercentage.textContent = `${percentage}%`;
        }
        
        // Update category
        if (this.elements.progressCategory && this.state.category) {
            const categoryName = this.formatCategoryName(this.state.category);
            this.elements.progressCategory.textContent = `${categoryName} - ${this.state.total} terms`;
        }
        
        // Update progress bar color based on completion
        if (this.elements.progressBar) {
            this.elements.progressBar.className = 'progress-bar';
            if (percentage === 100) {
                this.elements.progressBar.classList.add('progress-bar--completed');
            } else if (percentage >= 75) {
                this.elements.progressBar.classList.add('progress-bar--high');
            } else if (percentage >= 50) {
                this.elements.progressBar.classList.add('progress-bar--medium');
            }
        }
    }

    formatCategoryName(category) {
        return category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    onCategoryCompleted() {
        // Add confetti animation or celebration effect
        this.showCelebration();
        
        // Update streak
        this.updateStreak();
        
        // Show completion message
        this.showCompletionMessage();
        
        // Save achievement
        this.recordCompletion();
    }

    showCelebration() {
        if (!this.elements.progressBar) return;
        
        const celebration = document.createElement('div');
        celebration.className = 'celebration-effect';
        celebration.innerHTML = '🎉';
        
        this.elements.progressBar.appendChild(celebration);
        
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
        }, 2000);
        
        // Add pulse animation to progress bar
        this.elements.progressBar.classList.add('celebration-pulse');
        setTimeout(() => {
            this.elements.progressBar.classList.remove('celebration-pulse');
        }, 1000);
    }

    showCompletionMessage() {
        const message = `🎉 Congratulations! You've completed all ${this.state.total} terms in ${this.formatCategoryName(this.state.category)}!`;
        
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'completion-toast';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastStudy = this.getLastStudyDate();
        
        if (lastStudy !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastStudy === yesterday.toDateString()) {
                this.state.studyStreak++;
            } else {
                this.state.studyStreak = 1;
            }
            
            this.setLastStudyDate(today);
        }
        
        if (this.elements.streakCount) {
            this.elements.streakCount.textContent = this.state.studyStreak;
        }
        
        this.saveProgress();
    }

    recordCompletion() {
        const completion = {
            category: this.state.category,
            completedAt: new Date().toISOString(),
            sessionTime: this.state.sessionStartTime ? Date.now() - this.state.sessionStartTime : 0,
            termCount: this.state.total
        };
        
        this.state.completed.push(completion);
        this.state.totalStudyTime += completion.sessionTime;
        
        this.saveProgress();
    }

    getLastStudyDate() {
        try {
            return localStorage.getItem('ccl-trainer-last-study') || '';
        } catch {
            return '';
        }
    }

    setLastStudyDate(date) {
        try {
            localStorage.setItem('ccl-trainer-last-study', date);
        } catch (error) {
            console.warn('Failed to save last study date:', error);
        }
    }

    isComplete() {
        return this.state.current >= this.state.total && this.state.total > 0;
    }

    reset() {
        this.state.current = 0;
        this.state.sessionStartTime = Date.now();
        this.updateDisplay();
    }

    getProgressData() {
        return {
            current: this.state.current,
            total: this.state.total,
            percentage: this.state.total > 0 ? Math.round((this.state.current / this.state.total) * 100) : 0,
            category: this.state.category,
            completed: this.state.completed.length,
            streak: this.state.studyStreak,
            totalStudyTime: this.state.totalStudyTime
        };
    }

    destroy() {
        this.container.innerHTML = '';
        console.log('Progress component destroyed');
    }
}

// Export as global for browser use
window.ProgressComponent = ProgressComponent;