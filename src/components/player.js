/**
 * Audio Player Controls Component for CCL Pronunciation Trainer
 * Handles playback controls and audio player UI
 */

class PlayerComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            autoPlay: false,
            showProgress: true,
            showControls: true,
            ...options
        };
        
        this.state = {
            isPlaying: false,
            isPaused: false,
            currentTime: 0,
            duration: 0,
            volume: 1.0
        };
        
        this.callbacks = {
            onPlay: () => {},
            onPause: () => {},
            onStop: () => {},
            onNext: () => {},
            onPrevious: () => {},
            onVolumeChange: () => {}
        };
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        console.log('Player component initialized');
    }

    render() {
        const template = `
            <div class="player-component">
                ${this.options.showProgress ? this.renderProgressBar() : ''}
                ${this.options.showControls ? this.renderControls() : ''}
            </div>
        `;
        
        this.container.innerHTML = template;
        this.cacheElements();
    }

    renderProgressBar() {
        return `
            <div class="player-progress">
                <div class="player-progress__bar">
                    <div class="player-progress__fill" data-progress-fill></div>
                </div>
                <div class="player-progress__time">
                    <span data-current-time>0:00</span>
                    <span data-duration>0:00</span>
                </div>
            </div>
        `;
    }

    renderControls() {
        return `
            <div class="player-controls">
                <button class="player-btn player-btn--previous" data-previous>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                    </svg>
                    <span class="sr-only">Previous</span>
                </button>
                
                <button class="player-btn player-btn--play" data-play>
                    <svg class="play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg class="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                    <span class="sr-only">Play/Pause</span>
                </button>
                
                <button class="player-btn player-btn--next" data-next>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                    </svg>
                    <span class="sr-only">Next</span>
                </button>
                
                <div class="player-volume">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    <input 
                        type="range" 
                        class="player-volume__slider" 
                        min="0" 
                        max="100" 
                        value="100" 
                        data-volume
                        aria-label="Volume"
                    >
                </div>
            </div>
        `;
    }

    cacheElements() {
        this.elements = {
            progressFill: this.container.querySelector('[data-progress-fill]'),
            currentTime: this.container.querySelector('[data-current-time]'),
            duration: this.container.querySelector('[data-duration]'),
            playButton: this.container.querySelector('[data-play]'),
            previousButton: this.container.querySelector('[data-previous]'),
            nextButton: this.container.querySelector('[data-next]'),
            volumeSlider: this.container.querySelector('[data-volume]'),
            playIcon: this.container.querySelector('.play-icon'),
            pauseIcon: this.container.querySelector('.pause-icon')
        };
    }

    bindEvents() {
        // Play/Pause button
        if (this.elements.playButton) {
            this.elements.playButton.addEventListener('click', () => {
                this.togglePlayback();
            });
        }

        // Previous button
        if (this.elements.previousButton) {
            this.elements.previousButton.addEventListener('click', () => {
                this.callbacks.onPrevious();
            });
        }

        // Next button
        if (this.elements.nextButton) {
            this.elements.nextButton.addEventListener('click', () => {
                this.callbacks.onNext();
            });
        }

        // Volume slider
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.addEventListener('input', (e) => {
                const volume = parseFloat(e.target.value) / 100;
                this.updateVolume(volume);
                this.callbacks.onVolumeChange(volume);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayback();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.callbacks.onPrevious();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.callbacks.onNext();
                    break;
            }
        });
    }

    togglePlayback() {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.updatePlayButton();
        this.callbacks.onPlay();
    }

    pause() {
        this.state.isPlaying = false;
        this.state.isPaused = true;
        this.updatePlayButton();
        this.callbacks.onPause();
    }

    stop() {
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.currentTime = 0;
        this.updatePlayButton();
        this.updateProgress();
        this.callbacks.onStop();
    }

    updatePlayButton() {
        if (!this.elements.playIcon || !this.elements.pauseIcon) return;

        if (this.state.isPlaying) {
            this.elements.playIcon.style.display = 'none';
            this.elements.pauseIcon.style.display = 'block';
            this.elements.playButton.setAttribute('aria-label', 'Pause');
        } else {
            this.elements.playIcon.style.display = 'block';
            this.elements.pauseIcon.style.display = 'none';
            this.elements.playButton.setAttribute('aria-label', 'Play');
        }
    }

    updateProgress(currentTime = this.state.currentTime, duration = this.state.duration) {
        this.state.currentTime = currentTime;
        this.state.duration = duration;

        if (this.elements.progressFill && duration > 0) {
            const percentage = (currentTime / duration) * 100;
            this.elements.progressFill.style.width = `${percentage}%`;
        }

        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(currentTime);
        }

        if (this.elements.duration) {
            this.elements.duration.textContent = this.formatTime(duration);
        }
    }

    updateVolume(volume) {
        this.state.volume = volume;
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.value = volume * 100;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    getState() {
        return { ...this.state };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updatePlayButton();
        this.updateProgress();
    }

    enable() {
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
    }

    disable() {
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
    }

    destroy() {
        this.stop();
        this.container.innerHTML = '';
        console.log('Player component destroyed');
    }
}

// Export as global for browser use
window.PlayerComponent = PlayerComponent;