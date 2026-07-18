/**
 * TTSEngine - Text-to-Speech Synthesis Engine
 *
 * ARCHITECTURE: Zustand state management
 * - Subscribes to settings.ttsRate and settings.ttsVoice changes
 * - Updates tts store (isSpeaking, currentWord, etc.) instead of emitting events
 * - Direct state updates for speaking start/complete/stop
 *
 * Type-safe TTS engine with Web Speech API integration
 * Features:
 * - Zustand-driven initialization (settings from store)
 * - iOS background audio support
 * - HTML5 Audio fallback
 * - Voice selection and caching
 * - Repeat modes for learning
 * - Text cleaning and normalization
 */

import { useAppStore, type AppState } from '../../stores';
import { appConfig } from '../../config/AppConfig';
import { BrowserSpeechService } from './browserSpeechService';
import { IOSBackgroundAudio } from './iosBackgroundAudio';
import { isPremiumTTSAvailable } from './pollyService';
import { speakWithPolly } from './pollySpeechService';
import { selectVoice } from './voiceSelector';

/**
 * Vocabulary word structure
 */
interface VocabularyWord {
  english: string;
  example?: string;
  examples?: Array<{ text: string }>;
  [key: string]: any;
}

/**
 * Speaking event data
 */
interface SpeakingEventData {
  word?: VocabularyWord | string;
  text?: string;
  mode?: string;
  rate?: number;
  repeatCount?: number;
}

/**
 * TTSEngine - Type-safe text-to-speech engine
 *
 * ARCHITECTURE: Zustand state management
 * - Subscribes to settings.ttsRate and settings.ttsVoice changes
 * - Updates tts store instead of emitting events
 * - Single source of truth: Config.js → SettingsModule → Zustand store → TTS engine
 */
export class TTSEngine {
  private config: any;
  private currentRepeatCount: number = 0;
  private unsubscribers: Array<() => void> = [];

  // Initialize properties (will be set by Zustand store subscriptions)
  private speechRate: number | null = null;
  private targetRepeats: number | null = null;

  private synth: SpeechSynthesis;
  private isSpeaking: boolean = false;
  private cachedVoice: SpeechSynthesisVoice | null = null;
  // Track current utterance for proper cancellation (used for state tracking)
  // @ts-ignore - Tracked for future cancellation improvements
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  // Debug: Track last spoken text to detect overlaps
  private lastSpokenText: string = '';
  private speakCallCount: number = 0;

  private audioContextInitialized: boolean = false;
  private browserSpeechService: BrowserSpeechService;
  private iosBackgroundAudio: IOSBackgroundAudio;

  constructor() {
    // Load configuration from centralized config (lazily loaded)
    this.config = null;
    this.synth = window.speechSynthesis || ({
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      cancel: () => {},
      resume: () => {},
      speak: () => {},
    } as unknown as SpeechSynthesis);
    this.iosBackgroundAudio = new IOSBackgroundAudio();
    this.browserSpeechService = new BrowserSpeechService({
      synth: this.synth,
      getConfig: () => this.getConfig(),
      getSpeechRate: () => this.speechRate,
      getCachedVoice: () => this.cachedVoice,
      setCachedVoice: (voice) => {
        this.cachedVoice = voice;
      },
      selectVoice,
      showFallback: (text) => this.showTTSFallback(text),
      stopAutoPlay: () => useAppStore.getState().audio.stopAutoPlay(),
      setCurrentUtterance: (utterance) => {
        this.currentUtterance = utterance;
      },
      markSpeechSettled: () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.lastSpokenText = '';
      },
    });

    // Subscribe to Zustand store changes (replaces EventBus listeners)
    this._setupStoreSubscriptions();

    // CRITICAL FIX: Preload voices immediately to prevent first-click delays
    this._preloadVoices();

    // We'll initialize AudioContext on first user interaction
  }

  /**
   * Lazily get config (only load when needed, not during module initialization)
   */
  private getConfig(): any {
    if (!this.config) {
      this.config = (window as any).appConfig || appConfig;
    }
    return this.config;
  }

  /**
   * Get default language from config or safe fallback
   */
  private getDefaultLanguage(): string {
    return this.getConfig()?.get('tts.defaultVoice.lang') || 
           this.getConfig()?.get('voice.defaultLanguage') || 
           'en-GB';
  }

  private getPreferredVoiceName(): string | null {
    return useAppStore.getState().settings.ttsVoice;
  }

  /**
   * Preload voices to avoid first-click delay
   * Chrome/Edge require waiting for 'voiceschanged' event
   */
  private _preloadVoices(): void {
    // Try immediate load (works on Firefox)
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      console.log(`[TTSEngine] ✅ ${voices.length} voices preloaded immediately`);
      return;
    }

    // Chrome/Edge pattern: wait for voiceschanged event
    console.log('[TTSEngine] ⏳ Waiting for voices to load...');
    this.synth.addEventListener('voiceschanged', () => {
      const loadedVoices = this.synth.getVoices();
      console.log(`[TTSEngine] ✅ ${loadedVoices.length} voices loaded after event`);
    }, { once: true });
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /**
   * Safely get current practice mode from SettingsModule or Config.js fallback
   */
  getPracticeMode(): string {
    const settingsModule = (window as any).settingsModule;
    if (settingsModule && typeof settingsModule.get === 'function') {
      return settingsModule.get('practiceMode') || this.getConfig()?.get('data.defaults.practiceMode') || 'vocabulary';
    }
    return this.getConfig()?.get('data.defaults.practiceMode') || 'vocabulary';
  }

  private hasTransientUserActivation(): boolean {
    const userActivation = navigator.userActivation;
    return Boolean(userActivation?.isActive);
  }

  /**
   * Setup Zustand store subscriptions (replaces EventBus listeners)
   */
  private _setupStoreSubscriptions(): void {
    if (typeof window === 'undefined') return;

    // Subscribe to TTS rate changes
    const unsubTtsRate = useAppStore.subscribe(
      (state: AppState) => state.settings.ttsRate,
      (ttsRate: number, prevTtsRate: number) => {
        if (ttsRate !== prevTtsRate) {
          this.speechRate = ttsRate; // Original line
          console.log(`[TTSEngine] Speed changed to ${this.speechRate}`);
          // If speaking, restart with new rate (assuming pause/resume methods exist or are intended)
          // if (this.isSpeaking) {
          //   this.pause(); // Placeholder for actual pause logic
          //   this.resume(); // Placeholder for actual resume logic
          // }
        }
      }
    );
    this.unsubscribers.push(unsubTtsRate);

    // Subscribe to voice changes
    const unsubVoice = useAppStore.subscribe(
      (state: AppState) => state.settings.ttsVoice,
      (ttsVoice: string | null, prevTtsVoice: string | null) => {
        if (ttsVoice !== prevTtsVoice) {
          this.resetVoiceCache();
          console.log(`[TTSEngine] Voice preference changed to ${ttsVoice}`);
        }
      }
    );
    this.unsubscribers.push(unsubVoice);
  }

  /**
   * HELPER: Add visual feedback and update TTS store (replaces EventBus emission)
   */
  private _addSpeakingFeedback(elementId: string, eventData: SpeakingEventData): HTMLElement | null {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('speaking');
    }

    // Update Zustand TTS store (replaces EventBus emission)
    const word = typeof eventData.word === 'string' ? eventData.word : (eventData.word as VocabularyWord)?.english;
    const phonetic = typeof eventData.word === 'object' ? (eventData.word as VocabularyWord)?.['ipa'] : null;
    const mode = (eventData.mode || 'word') as 'word' | 'sentence' | 'question';

    useAppStore.getState().tts.startSpeaking(word || eventData.text || '', phonetic, mode);

    return element;
  }

  /**
   * HELPER: Remove visual feedback and update TTS store (replaces EventBus emission)
   */
  private _removeSpeakingFeedback(element: HTMLElement | null, _eventData: SpeakingEventData): void {
    if (element) {
      element.classList.remove('speaking');
    }

    // Update Zustand TTS store (replaces EventBus emission)
    useAppStore.getState().tts.stopSpeaking();
  }

  /**
   * SIMPLIFIED: Pronounce any text (sentence, question, word)
   * Universal method for RS/ASQ/WFD modes - reuses existing TTS infrastructure
   */
  async pronounceText(text: string, lang: string | null = null, rate: number | null = null): Promise<void> {
    if (!text) {
      const progressTracker = (window as any).progressTracker;
      progressTracker.showError('No text to pronounce');
      return;
    }

    try {
      const cleanText = this.cleanTextForTTS(text);
      // Use custom rate if provided, otherwise use user's speed setting, fallback to normal
      const configRate = this.getConfig()?.get('tts.speeds.normal') || 1.0;
      const speechRate = rate || this.speechRate || configRate;

      // Add visual feedback to main display element
      const element = this._addSpeakingFeedback('englishWord', {
        text: text,
        mode: this.getPracticeMode(),
        rate: speechRate
      });

      // Speak the text
      await this.speak(cleanText, lang, speechRate);

      // Remove visual feedback
      this._removeSpeakingFeedback(element, {
        text: text,
        mode: this.getPracticeMode()
      });

    } catch (error) {
      console.warn('Speech error:', error);
      this.showTTSFallback(text);
    }
  }

  /**
   * Pronounce a vocabulary word with repetition support
   */
  async pronounceWord(word: VocabularyWord, repeatIndex: number = 0): Promise<void> {
    // Safety check: reject undefined/null word objects
    if (!word || !word.english) {
      console.error('[TTSEngine] ❌ Invalid word object:', word);
      throw new Error('Cannot pronounce undefined or invalid word');
    }

    if (this.isSpeaking) {
      console.warn('[TTSEngine] ⚠️ Already speaking, skipping...');
      return;
    }

    try {
      this.isSpeaking = true;
      this.currentRepeatCount = repeatIndex;

      // Clean text for TTS
      const cleanText = this.cleanTextForTTS(word.english);
      const configRate = this.getConfig()?.get('tts.speeds.normal') || 1.0;
      const pronunciationRate = this.speechRate || configRate;

      // Add visual feedback during speech
      const englishWordElement = document.getElementById('englishWord');
      const exampleElement = document.getElementById('exampleSentence');

      if (englishWordElement) {
        englishWordElement.classList.add('speaking');
      }

      // Update Zustand TTS store (replaces EventBus emission)
      useAppStore.getState().tts.startSpeaking(
        word.english,
        word['ipa'] || null,
        'word'
      );

      console.log(`[TTSEngine] 🔊 Calling speak() for: "${cleanText}"`);
      // Speak the term first
      await this.speak(cleanText, this.getDefaultLanguage(), pronunciationRate);
      console.log(`[TTSEngine] ✅ speak() completed for: "${cleanText}"`);

      // For vocabulary with examples, optionally speak the example sentence
      // Only speak example on the LAST repetition to avoid: term+example+term+example
      const hasExample = (word.examples && word.examples.length > 0) || word.example;
      const isLastRepetition = this.currentRepeatCount === ((this.targetRepeats || 1) - 1);
      const audioControls = (window as any).audioControls;
      const shouldSpeakExample = audioControls && isLastRepetition &&
        (audioControls.repeatMode === 'intensive' || audioControls.repeatMode === 'loop');

      if (hasExample && shouldSpeakExample && exampleElement && exampleElement.style.display !== 'none') {
        // Add small pause between term and sentence
        await new Promise(resolve => setTimeout(resolve, this.getConfig().get('tts.delays.voiceReady')));

        // Highlight example sentence during speech
        if (exampleElement) {
          exampleElement.classList.add('speaking');
        }

        // Get example text from either format
        let rawExample: string | undefined;
        if (word.example) {
          rawExample = word.example;
        } else if (word.examples && word.examples.length > 0) {
          rawExample = word.examples[0]!.text;
        }

        if (rawExample) {
          const cleanExample = this.cleanExampleSentenceForTTS(rawExample!);
          const configRate = this.getConfig()?.get('tts.speeds.normal') || 1.0;
          await this.speak(cleanExample, this.getDefaultLanguage(), this.speechRate || configRate);
        }

        // Remove example highlighting
        if (exampleElement) {
          exampleElement.classList.remove('speaking');
        }
      }

      // Remove visual feedback
      if (englishWordElement) {
        englishWordElement.classList.remove('speaking');
      }

      // Update Zustand TTS store (replaces EventBus emission)
      useAppStore.getState().tts.stopSpeaking();

    } catch (error) {
      console.warn('Speech error:', error);
      this.showTTSFallback(word.english);
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Core speak method - uses Web Speech API
   */
  async speak(text: string, lang: string | null = null, customRate: number | null = null): Promise<void> {
    // Use configured language if not specified
    const language = lang || this.getDefaultLanguage();

    this.speakCallCount++;
    const callId = this.speakCallCount;
    console.log(`[TTSEngine #${callId}] 🎤 speak() called with: "${text.substring(0, 30)}...", lang: ${language}, rate: ${customRate}`);
    console.log(`[TTSEngine #${callId}] 📊 Current state: isSpeaking=${this.isSpeaking}, lastSpoken="${this.lastSpokenText.substring(0, 20)}..."`);
    console.log(`[TTSEngine #${callId}] 📊 Synth state: speaking=${this.synth.speaking}, pending=${this.synth.pending}, paused=${this.synth.paused}`);

    // Check if premium voice (AWS Polly) is selected
    const ttsVoice = useAppStore.getState().settings.ttsVoice;
    if (ttsVoice === 'premium') {
      if (!isPremiumTTSAvailable()) {
        console.warn('[TTSEngine] Premium TTS is selected but unavailable; using browser TTS immediately');
        useAppStore.getState().settings.updateSetting('ttsVoice', null);
      } else {
        console.log('[TTSEngine] 🎯 Using Premium AWS Polly voice');
        return speakWithPolly({
          text,
          language,
          fallback: (fallbackText, fallbackLanguage) => {
            useAppStore.getState().settings.updateSetting('ttsVoice', null);
            return this.speakWithBrowserTTS(fallbackText, fallbackLanguage);
          },
        });
      }
    }

    // Initialize AudioContext on first speech attempt (user interaction)
    if (!this.audioContextInitialized) {
      this.enableBackgroundAudio();
      this.audioContextInitialized = true;
    }

    // CRITICAL FIX: Check if already speaking or pending, cancel it
    const isActivelySpeaking = this.synth.speaking || this.synth.pending;
    if (isActivelySpeaking) {
      console.warn(`[TTSEngine #${callId}] ⚠️ Already speaking or pending, cancelling previous speech...`);
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.lastSpokenText = '';

      // Desktop Chrome can require speak() to happen inside the same click
      // activation. Do not await after cancel while activation is still live.
      if (!this.hasTransientUserActivation()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      // Clear state variables instantly without delay when no audio is playing
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.lastSpokenText = '';
    }

    this.isSpeaking = true;
    this.lastSpokenText = text;
    console.log(`[TTSEngine #${callId}] ✅ Setting isSpeaking=true, starting speech...`);

    const app = (window as any).app;
    const isIOS = app && app.isMobileDevice && /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && this.shouldUseHTML5Audio()) {
      console.log('[TTSEngine] Using HTML5 Audio fallback for iOS');
      return this.speakWithHTML5Audio(text, language, customRate);
    }

    return this.browserSpeechService.speak({
      text,
      language,
      customRate,
      preferredVoiceName: this.getPreferredVoiceName(),
    });
  }

  /**
   * Browser TTS fallback (extracted from speak method)
   */
  private speakWithBrowserTTS(text: string, lang: string | null = null): Promise<void> {
    const language = lang || this.getDefaultLanguage();
    return this.browserSpeechService.speakSimple(text, language, this.getPreferredVoiceName());
  }

  /**
   * Check if should use HTML5 Audio fallback
   */
  shouldUseHTML5Audio(): boolean {
    return document.hidden ||
      document.visibilityState === 'hidden' ||
      !('speechSynthesis' in window) ||
      this.synth.speaking === false;
  }

  /**
   * Speak with HTML5 Audio (iOS background fallback)
   */
  speakWithHTML5Audio(text: string, lang: string | null = null, customRate: number | null = null): Promise<void> {
    const language = lang || this.getDefaultLanguage();
    return this.browserSpeechService.speakWithBackgroundAudio({
      text,
      language,
      customRate,
      preferredVoiceName: this.getPreferredVoiceName(),
    }, () => {
      this.iosBackgroundAudio.start();
    });
  }

  /**
   * Show TTS fallback message
   */
  showTTSFallback(text: string): void {
    const store = useAppStore.getState();
    const progressTracker = (window as any).progressTracker;

    // Check if progressTracker exists before calling methods
    if (progressTracker && typeof progressTracker.updateStatus === 'function') {
      progressTracker.updateStatus(`🔊 Please read aloud: "${text}"`);

      setTimeout(() => {
        progressTracker.updateStatus('Text-to-speech not available in this browser');
      }, this.getConfig()?.get('tts.delays.resetTimeout') || 5000);
    } else {
      // Fallback: log to console if no progress tracker available
      console.warn(`[TTSEngine] TTS fallback - please read aloud: "${text}"`);
    }

    store.ui.showNotification(
      'Browser text-to-speech did not start. Check Chrome site sound settings, or choose another voice in Settings.',
      'warning'
    );
  }

  /**
   * Enable background audio for iOS
   */
  enableBackgroundAudio(): void {
    this.iosBackgroundAudio.enable();
  }

  /**
   * Setup iOS background audio with silent audio element
   */
  setupIOSBackgroundAudio(): void {
    this.iosBackgroundAudio.enable();
  }

  /**
   * Start background audio with proper error handling
   */
  startBackgroundAudio(): void {
    this.iosBackgroundAudio.start();
  }

  /**
   * Clean text for TTS (remove symbols, abbreviations)
   */
  cleanTextForTTS(text: string): string {
    if (!text) return '';

    // Remove extra whitespace and normalize
    let cleanText = text.trim().replace(/\s+/g, ' ');

    // Normalize all-caps words to prevent letter-by-letter pronunciation
    // Convert ALL CAPS to Title Case for natural speech (e.g., "TOP" -> "Top")
    cleanText = cleanText.replace(/\b[A-Z]{2,}\b/g, (match) => {
      return match.charAt(0) + match.slice(1).toLowerCase();
    });

    // Handle common abbreviations and symbols
    cleanText = cleanText
      .replace(/\b&\b/g, 'and')
      .replace(/\b@\b/g, 'at')
      .replace(/\b#\b/g, 'number')
      .replace(/\b%\b/g, 'percent')
      .replace(/\b\+\b/g, 'plus')
      .replace(/\b-\b/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase

    return cleanText;
  }

  /**
   * Clean example sentence for TTS (remove speaker names, metadata)
   */
  cleanExampleSentenceForTTS(rawSentence: string): string {
    // Remove speaker prefixes and conversation metadata
    let cleaned = rawSentence
      .replace(/^[A-Z][a-z]*\s*[：:]\s*/g, '')
      .replace(/^\d+\.\s*/g, '')
      .replace(/（[^）]*）/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\\n!\[Image\]/g, '')
      .replace(/- (Legal|Medical|Business|Immigration|Education) Briefing.*$/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // If sentence is too long, take first complete sentence
    if (cleaned.length > 120) {
      const sentences = cleaned.split(/[.!?]+/);
      if (sentences.length > 1 && sentences[0]!.length > 20 && sentences[0]!.length <= 120) {
        cleaned = sentences[0]! + '.';
      } else {
        cleaned = cleaned.substring(0, 120) + '...';
      }
    }

    return this.cleanTextForTTS(cleaned);
  }

  /**
   * Set repeat mode for word repetition
   */
  setRepeatMode(targetRepeats: number): void {
    this.targetRepeats = parseInt(targetRepeats.toString()) || 1;
    this.currentRepeatCount = 0;

    // Note: Repeat mode change event removed (informational, no listeners)
    console.log(`[TTSEngine] Repeat mode set to ${this.targetRepeats} repetitions`);
  }

  /**
   * Stop all speech
   */
  stopSpeaking(): Promise<void> {
    const timestamp = Date.now();
    console.log(`[TTSEngine @${timestamp}] 🛑 stopSpeaking() called`);
    console.log(`[TTSEngine @${timestamp}] 📊 State before stop: isSpeaking=${this.isSpeaking}, lastSpoken="${this.lastSpokenText.substring(0, 30)}..."`);
    console.log(`[TTSEngine @${timestamp}] 📊 Synth state: speaking=${this.synth.speaking}, pending=${this.synth.pending}, paused=${this.synth.paused}`);
    
    // Clear current utterance reference
    this.currentUtterance = null;
    
    if ('speechSynthesis' in window) {
      // Cancel all pending and current utterances
      console.log(`[TTSEngine @${timestamp}] 🧹 Calling synth.cancel()...`);
      this.synth.cancel();
    }

    this.isSpeaking = false;
    this.lastSpokenText = '';
    console.log(`[TTSEngine @${timestamp}] ✅ isSpeaking set to false`);

    // Remove visual feedback
    const englishWordElement = document.getElementById('englishWord');
    if (englishWordElement) {
      englishWordElement.classList.remove('speaking');
    }

    // Update Zustand TTS store (replaces EventBus emission)
    useAppStore.getState().tts.stopSpeaking();
    
    // CRITICAL FIX: Return a Promise that resolves after a short delay
    // This ensures the Web Speech API has time to fully process the cancel
    console.log(`[TTSEngine @${timestamp}] ⏳ Waiting 100ms for cancellation to complete...`);
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`[TTSEngine @${timestamp}] ✅ stopSpeaking() complete`);
        resolve();
      }, 100);
    });
  }

  /**
   * Get current repeat count
   */
  getCurrentRepeatCount(): number {
    return this.currentRepeatCount;
  }

  /**
   * Get target repeats
   */
  getTargetRepeats(): number {
    return this.targetRepeats || 1;
  }

  /**
   * Reset voice cache (force re-selection)
   */
  resetVoiceCache(): void {
    this.cachedVoice = null;
  }
}

// Export singleton instance
export const ttsEngine = new TTSEngine();

// Default export
export default ttsEngine;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    ttsEngine: TTSEngine;
  }
}

// Expose as global reference for PTE app
if (typeof window !== 'undefined') {
  (window as any).ttsEngine = ttsEngine;
}
