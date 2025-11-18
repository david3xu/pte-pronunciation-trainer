/**
 * Shadowing Practice Module
 * 
 * Manages DI answer shadowing practice with phrase-by-phrase highlighting
 * and continuous TTS playback for natural pronunciation practice
 */

import { EventBus } from '../utils/EventBus.js';
import type { TTSEngine } from '../audio/TTSEngine';

export interface DIPhrase {
  index: number;
  text: string;
  startIndex: number;
  endIndex: number;
  estimatedDuration: number;
}

export interface DIAnswer {
  id: string;
  imageNumber: number;
  title: string;
  template: string;
  fullText: string;
  phrases: DIPhrase[];
  wordCount: number;
  duration: number;
  category: string;
}

export interface ShadowingDataset {
  metadata: {
    generated: string;
    totalAnswers: number;
    source: string;
    description: string;
    version: string;
    category: string;
    dataType: string;
  };
  answers: DIAnswer[];
}

export interface ShadowingState {
  currentAnswerIndex: number;
  currentPhraseIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: number;
}

export class ShadowingPractice {
  private eventBus: EventBus;
  private ttsEngine: TTSEngine | null = null;
  private dataset: ShadowingDataset | null = null;
  private state: ShadowingState;
  private phraseTimeouts: number[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.state = {
      currentAnswerIndex: 0,
      currentPhraseIndex: 0,
      isPlaying: false,
      isPaused: false,
      playbackSpeed: 1.0
    };
  }

  /**
   * Initialize with TTS engine
   */
  setTTSEngine(ttsEngine: TTSEngine): void {
    this.ttsEngine = ttsEngine;
  }

  /**
   * Load shadowing dataset
   */
  async loadDataset(dataPath: string): Promise<void> {
    try {
      const response = await fetch(dataPath);
      if (!response.ok) {
        throw new Error(`Failed to load shadowing dataset: ${response.statusText}`);
      }
      
      this.dataset = await response.json();
      
      if (this.dataset) {
        this.eventBus.emit('shadowing:dataset:loaded', {
          totalAnswers: this.dataset.answers.length,
          category: this.dataset.metadata.category
        });
        
        console.log(`✅ Loaded ${this.dataset.answers.length} DI answers for shadowing`);
      }
    } catch (error) {
      console.error('❌ Error loading shadowing dataset:', error);
      this.eventBus.emit('shadowing:error', { error });
      throw error;
    }
  }

  /**
   * Get current answer
   */
  getCurrentAnswer(): DIAnswer | null {
    if (!this.dataset || this.state.currentAnswerIndex >= this.dataset.answers.length) {
      return null;
    }
    const answer = this.dataset.answers[this.state.currentAnswerIndex];
    return answer || null;
  }

  /**
   * Get all answers
   */
  getAllAnswers(): DIAnswer[] {
    return this.dataset?.answers || [];
  }

  /**
   * Get current state
   */
  getState(): ShadowingState {
    return { ...this.state };
  }

  /**
   * Start shadowing practice for current answer
   */
  async play(): Promise<void> {
    if (!this.ttsEngine || !this.dataset) {
      console.error('❌ TTS engine or dataset not loaded');
      return;
    }

    const answer = this.getCurrentAnswer();
    if (!answer) {
      console.error('❌ No answer to play');
      return;
    }

    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.currentPhraseIndex = 0;

    this.eventBus.emit('shadowing:playback:started', {
      answerId: answer.id,
      answerNumber: answer.imageNumber
    });

    // Play the complete answer with phrase-by-phrase highlighting
    await this.playWithHighlighting(answer);
  }

  /**
   * Play answer with phrase highlighting
   */
  private async playWithHighlighting(answer: DIAnswer): Promise<void> {
    if (!this.ttsEngine) return;

    // Prepare the full text for TTS (remove line breaks, keep phrases)
    const cleanText = answer.fullText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Highlight first phrase when starting
    this.highlightPhrase(0);
    
    // Schedule phrase highlighting based on estimated durations
    this.schedulePhrasesHighlighting(answer.phrases);
    
    // Start TTS playback of the complete answer
    try {
      await this.ttsEngine.speak(cleanText, null, this.state.playbackSpeed);
      
      // Playback completed
      this.state.isPlaying = false;
      this.eventBus.emit('shadowing:playback:completed', {
        answerId: answer.id
      });
    } catch (error) {
      console.error('TTS error:', error);
      this.state.isPlaying = false;
    }
  }

  /**
   * Schedule phrase highlighting during playback
   */
  private schedulePhrasesHighlighting(phrases: DIPhrase[]): void {
    // Clear any existing timeouts
    this.clearPhraseTimeouts();

    let cumulativeTime = 0;

    phrases.forEach((phrase, index) => {
      const timeout = window.setTimeout(() => {
        if (this.state.isPlaying) {
          this.highlightPhrase(index);
        }
      }, cumulativeTime);

      this.phraseTimeouts.push(timeout);
      
      // Adjust cumulative time by playback speed
      cumulativeTime += phrase.estimatedDuration / this.state.playbackSpeed;
    });
  }

  /**
   * Highlight current phrase
   */
  private highlightPhrase(phraseIndex: number): void {
    this.state.currentPhraseIndex = phraseIndex;
    
    const answer = this.getCurrentAnswer();
    if (!answer) return;

    const phrase = answer.phrases[phraseIndex];
    if (!phrase) return;

    this.eventBus.emit('shadowing:phrase:highlighted', {
      phraseIndex,
      totalPhrases: answer.phrases.length,
      phraseText: phrase.text
    });
  }

  /**
   * Clear phrase highlighting timeouts
   */
  private clearPhraseTimeouts(): void {
    this.phraseTimeouts.forEach(timeout => window.clearTimeout(timeout));
    this.phraseTimeouts = [];
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.state.isPlaying) return;

    this.state.isPaused = true;
    this.clearPhraseTimeouts();
    
    // Cancel TTS using synth
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.eventBus.emit('shadowing:playback:paused', undefined);
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (!this.state.isPaused) return;

    this.state.isPaused = false;
    await this.play();
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentPhraseIndex = 0;
    this.clearPhraseTimeouts();
    
    // Cancel TTS using synth
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.eventBus.emit('shadowing:playback:stopped', undefined);
  }

  /**
   * Replay current answer
   */
  async replay(): Promise<void> {
    this.stop();
    await this.play();
  }

  /**
   * Go to next answer
   */
  async nextAnswer(): Promise<void> {
    if (!this.dataset) return;

    this.stop();
    
    if (this.state.currentAnswerIndex < this.dataset.answers.length - 1) {
      this.state.currentAnswerIndex++;
    } else {
      this.state.currentAnswerIndex = 0; // Loop back to first
    }

    const answer = this.getCurrentAnswer();
    this.eventBus.emit('shadowing:answer:changed', {
      answerIndex: this.state.currentAnswerIndex,
      answerId: answer?.id,
      answerNumber: answer?.imageNumber
    });
  }

  /**
   * Go to previous answer
   */
  async previousAnswer(): Promise<void> {
    if (!this.dataset) return;

    this.stop();
    
    if (this.state.currentAnswerIndex > 0) {
      this.state.currentAnswerIndex--;
    } else {
      this.state.currentAnswerIndex = this.dataset.answers.length - 1; // Loop to last
    }

    const answer = this.getCurrentAnswer();
    this.eventBus.emit('shadowing:answer:changed', {
      answerIndex: this.state.currentAnswerIndex,
      answerId: answer?.id,
      answerNumber: answer?.imageNumber
    });
  }

  /**
   * Set specific answer by index
   */
  setAnswer(index: number): void {
    if (!this.dataset || index < 0 || index >= this.dataset.answers.length) {
      return;
    }

    this.stop();
    this.state.currentAnswerIndex = index;

    const answer = this.getCurrentAnswer();
    this.eventBus.emit('shadowing:answer:changed', {
      answerIndex: index,
      answerId: answer?.id,
      answerNumber: answer?.imageNumber
    });
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    const validSpeed = Math.max(0.5, Math.min(2.0, speed));
    this.state.playbackSpeed = validSpeed;

    this.eventBus.emit('shadowing:speed:changed', {
      speed: validSpeed
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    this.clearPhraseTimeouts();
    this.dataset = null;
  }
}

export default ShadowingPractice;

