/**
 * Shadowing Practice UI Component
 * 
 * Displays DI answers with phrase-by-phrase highlighting for shadowing practice
 */

import type { ShadowingPractice, DIAnswer } from '../core/ShadowingPractice.js';
import { EventBus } from '../utils/EventBus.js';

export class ShadowingUI {
  private container: HTMLElement;
  private eventBus: EventBus;
  private shadowingPractice: ShadowingPractice;
  
  // UI Elements
  private answerDisplay: HTMLElement | null = null;
  private titleDisplay: HTMLElement | null = null;
  private progressDisplay: HTMLElement | null = null;
  
  // Control buttons
  private playPauseBtn: HTMLButtonElement | null = null;
  private replayBtn: HTMLButtonElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private speedSelect: HTMLSelectElement | null = null;

  constructor(
    container: HTMLElement,
    eventBus: EventBus,
    shadowingPractice: ShadowingPractice
  ) {
    this.container = container;
    this.eventBus = eventBus;
    this.shadowingPractice = shadowingPractice;
    
    this.initializeUI();
    this.setupEventListeners();
  }

  /**
   * Initialize UI structure
   */
  private initializeUI(): void {
    this.container.innerHTML = `
      <div class="shadowing-practice-container">
        <!-- Header -->
        <div class="shadowing-header">
          <h2 class="shadowing-title">DI Shadowing Practice</h2>
          <div class="shadowing-progress">
            <span id="current-answer-number">1</span> / 
            <span id="total-answers">10</span>
          </div>
        </div>

        <!-- Answer Title -->
        <div class="answer-title-container">
          <h3 id="answer-title">Loading...</h3>
          <span class="template-badge" id="template-badge">Template A</span>
        </div>

        <!-- Answer Display with Phrase Highlighting -->
        <div class="answer-display-container">
          <div id="answer-text" class="answer-text">
            <!-- Phrases will be rendered here -->
          </div>
        </div>

        <!-- Phrase Progress -->
        <div class="phrase-progress-bar">
          <div id="phrase-progress-fill" class="progress-fill"></div>
        </div>
        <p class="phrase-counter">
          Phrase <span id="current-phrase">0</span> of <span id="total-phrases">0</span>
        </p>

        <!-- Controls -->
        <div class="shadowing-controls">
          <div class="playback-controls">
            <button id="prev-answer-btn" class="control-btn" title="Previous Answer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>
            
            <button id="play-pause-btn" class="control-btn primary" title="Play/Pause">
              <svg id="play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg id="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
            
            <button id="replay-btn" class="control-btn" title="Replay Current Answer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>
            
            <button id="next-answer-btn" class="control-btn" title="Next Answer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div class="speed-control">
            <label for="speed-select">Speed:</label>
            <select id="speed-select" class="speed-select">
              <option value="0.75">0.75x</option>
              <option value="1.0" selected>1.0x</option>
              <option value="1.25">1.25x</option>
            </select>
          </div>
        </div>

        <!-- Instructions -->
        <div class="shadowing-instructions">
          <p><strong>📖 How to Practice:</strong></p>
          <ol>
            <li>Click <strong>Play</strong> to start the DI answer</li>
            <li><strong>Speak along</strong> with the audio as each phrase highlights</li>
            <li>Focus on <strong>pronunciation</strong> and <strong>rhythm</strong></li>
            <li>Use <strong>Replay</strong> to practice the same answer again</li>
          </ol>
        </div>
      </div>
    `;

    // Get references to UI elements
    this.answerDisplay = document.getElementById('answer-text');
    this.titleDisplay = document.getElementById('answer-title');
    this.progressDisplay = document.getElementById('current-answer-number');
    
    // Control buttons
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.replayBtn = document.getElementById('replay-btn') as HTMLButtonElement;
    this.prevBtn = document.getElementById('prev-answer-btn') as HTMLButtonElement;
    this.nextBtn = document.getElementById('next-answer-btn') as HTMLButtonElement;
    this.speedSelect = document.getElementById('speed-select') as HTMLSelectElement;

    // Setup button event listeners
    this.setupControlListeners();
  }

  /**
   * Setup control button listeners
   */
  private setupControlListeners(): void {
    this.playPauseBtn?.addEventListener('click', () => {
      const state = this.shadowingPractice.getState();
      if (state.isPlaying) {
        this.shadowingPractice.pause();
      } else {
        this.shadowingPractice.play();
      }
    });

    this.replayBtn?.addEventListener('click', () => {
      this.shadowingPractice.replay();
    });

    this.prevBtn?.addEventListener('click', () => {
      this.shadowingPractice.previousAnswer();
    });

    this.nextBtn?.addEventListener('click', () => {
      this.shadowingPractice.nextAnswer();
    });

    this.speedSelect?.addEventListener('change', (e) => {
      const speed = parseFloat((e.target as HTMLSelectElement).value);
      this.shadowingPractice.setSpeed(speed);
    });
  }

  /**
   * Setup event listeners for shadowing events
   */
  private setupEventListeners(): void {
    // Dataset loaded
    this.eventBus.on('shadowing:dataset:loaded', () => {
      this.render();
    });

    // Answer changed
    this.eventBus.on('shadowing:answer:changed', () => {
      this.render();
    });

    // Phrase highlighted
    this.eventBus.on('shadowing:phrase:highlighted', (data: any) => {
      this.highlightPhrase(data.phraseIndex);
      this.updatePhraseProgress(data.phraseIndex, data.totalPhrases);
    });

    // Playback started
    this.eventBus.on('shadowing:playback:started', () => {
      this.updatePlayPauseButton(true);
    });

    // Playback paused
    this.eventBus.on('shadowing:playback:paused', () => {
      this.updatePlayPauseButton(false);
    });

    // Playback completed
    this.eventBus.on('shadowing:playback:completed', () => {
      this.updatePlayPauseButton(false);
    });
  }

  /**
   * Render current answer
   */
  render(): void {
    const answer = this.shadowingPractice.getCurrentAnswer();
    if (!answer) {
      this.renderEmptyState();
      return;
    }

    // Update title
    if (this.titleDisplay) {
      this.titleDisplay.textContent = `Image #${answer.imageNumber}: ${answer.title}`;
    }

    // Update template badge
    const templateBadge = document.getElementById('template-badge');
    if (templateBadge) {
      templateBadge.textContent = `Template ${answer.template}`;
    }

    // Update progress
    const state = this.shadowingPractice.getState();
    const totalAnswers = this.shadowingPractice.getAllAnswers().length;
    if (this.progressDisplay) {
      this.progressDisplay.textContent = (state.currentAnswerIndex + 1).toString();
    }
    const totalDisplay = document.getElementById('total-answers');
    if (totalDisplay) {
      totalDisplay.textContent = totalAnswers.toString();
    }

    // Render answer phrases
    this.renderAnswerPhrases(answer);
  }

  /**
   * Render answer with phrases
   */
  private renderAnswerPhrases(answer: DIAnswer): void {
    if (!this.answerDisplay) return;

    // Split fullText by "|" to get phrases
    const textParts = answer.fullText.split('|').map(p => p.trim()).filter(p => p);

    // Create phrase spans
    const phrasesHTML = textParts.map((phrase, index) => {
      return `<span class="phrase" data-phrase-index="${index}">${phrase}</span>`;
    }).join(' <span class="phrase-separator">|</span> ');

    this.answerDisplay.innerHTML = phrasesHTML;

    // Update phrase counter
    const totalPhrases = textParts.length;
    const totalPhrasesDisplay = document.getElementById('total-phrases');
    if (totalPhrasesDisplay) {
      totalPhrasesDisplay.textContent = totalPhrases.toString();
    }
  }

  /**
   * Highlight specific phrase
   */
  private highlightPhrase(phraseIndex: number): void {
    if (!this.answerDisplay) return;

    // Remove previous highlights
    const phrases = this.answerDisplay.querySelectorAll('.phrase');
    phrases.forEach(phrase => phrase.classList.remove('highlighted'));

    // Highlight current phrase
    const currentPhrase = this.answerDisplay.querySelector(`[data-phrase-index="${phraseIndex}"]`);
    if (currentPhrase) {
      currentPhrase.classList.add('highlighted');
      
      // Scroll into view if needed
      currentPhrase.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Update phrase progress bar
   */
  private updatePhraseProgress(current: number, total: number): void {
    const progressFill = document.getElementById('phrase-progress-fill');
    const currentPhraseDisplay = document.getElementById('current-phrase');
    
    if (progressFill) {
      const percentage = ((current + 1) / total) * 100;
      progressFill.style.width = `${percentage}%`;
    }

    if (currentPhraseDisplay) {
      currentPhraseDisplay.textContent = (current + 1).toString();
    }
  }

  /**
   * Update play/pause button state
   */
  private updatePlayPauseButton(isPlaying: boolean): void {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');

    if (isPlaying) {
      playIcon?.setAttribute('style', 'display:none;');
      pauseIcon?.setAttribute('style', 'display:block;');
    } else {
      playIcon?.setAttribute('style', 'display:block;');
      pauseIcon?.setAttribute('style', 'display:none;');
    }
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): void {
    if (this.answerDisplay) {
      this.answerDisplay.innerHTML = `
        <div class="empty-state">
          <p>No DI answers loaded. Please load the shadowing dataset.</p>
        </div>
      `;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Event listeners will be garbage collected when component is destroyed
    // No explicit removal needed
  }
}

export default ShadowingUI;

