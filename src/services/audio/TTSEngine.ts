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
  private backgroundAudioEnabled: boolean = false;
  private unsubscribers: Array<() => void> = [];

  // Initialize properties (will be set by Zustand store subscriptions)
  private speechRate: number | null = null;
  private targetRepeats: number | null = null;

  private synth: SpeechSynthesis;
  private isSpeaking: boolean = false;
  private cachedVoice: SpeechSynthesisVoice | null = null;

  // Audio context for iOS background audio
  private audioContext?: AudioContext;
  private audioContextInitialized: boolean = false;
  private backgroundAudioElement?: HTMLAudioElement;

  constructor() {
    // Load configuration from centralized config (lazily loaded)
    this.config = null;
    this.synth = window.speechSynthesis;

    // Subscribe to Zustand store changes (replaces EventBus listeners)
    this._setupStoreSubscriptions();

    // We'll initialize AudioContext on first user interaction
  }

  /**
   * Lazily get config (only load when needed, not during module initialization)
   */
  private getConfig(): any {
    if (!this.config) {
      this.config = (window as any).appConfig;
    }
    return this.config;
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
      return settingsModule.get('practiceMode') || this.getConfig().get('data.defaults.practiceMode');
    }
    return this.getConfig().get('data.defaults.practiceMode');
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
          this.resetVoiceCache(); // Original line
          // this.selectVoice(ttsVoice); // This was in the provided snippet, but resetVoiceCache was original
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
      await this.speak(cleanText, this.getConfig().get('tts.language.default'), pronunciationRate);
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
          await this.speak(cleanExample, this.getConfig().get('tts.language.default'), this.speechRate || configRate);
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
  speak(text: string, lang: string | null = null, customRate: number | null = null): Promise<void> {
    // Use configured language if not specified
    const language = lang || this.getConfig().get('tts.language.default');

    console.log(`[TTSEngine] 🎤 speak() called with: "${text}", lang: ${language}, rate: ${customRate}`);

    // Check if premium voice (AWS Polly) is selected
    const ttsVoice = useAppStore.getState().settings.ttsVoice;
    if (ttsVoice === 'premium') {
      console.log('[TTSEngine] 🎯 Using Premium AWS Polly voice');
      return this.speakWithPolly(text, language);
    }

    // Initialize AudioContext on first speech attempt (user interaction)
    if (!this.audioContextInitialized) {
      this.enableBackgroundAudio();
      this.audioContextInitialized = true;
    }

    return new Promise((resolve) => {
      // Check if we're on iOS and should use HTML5 Audio fallback
      const app = (window as any).app;
      const isIOS = app && app.isMobileDevice && /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS && this.shouldUseHTML5Audio()) {
        console.log('[TTSEngine] Using HTML5 Audio fallback for iOS');
        this.speakWithHTML5Audio(text, language, customRate).then(resolve).catch(resolve);
        return;
      }

      if (!('speechSynthesis' in window)) {
        console.error('[TTSEngine] ❌ speechSynthesis not available in browser');
        this.showTTSFallback(text);
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      // Ensure rate is always a valid number (default to 1.0 if all else fails)
      const configRate = this.getConfig()?.get('tts.speeds.normal') || 1.0;
      utterance.rate = customRate !== null ? customRate : (this.speechRate || configRate);
      utterance.volume = 1.0;
      utterance.pitch = 1.0;

      // Try to find the best voice match
      if (!this.cachedVoice || this.synth.getVoices().length > 0) {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
          this.cachedVoice = this.selectVoice(voices, lang);
          if (this.cachedVoice) {
            console.log(`[TTSEngine] Selected voice: ${this.cachedVoice.name}`);
          }
        }
      }

      const voice = this.cachedVoice;
      if (voice) {
        utterance.voice = voice;
      } else {
        console.warn('[TTSEngine] ⚠️ No cached voice, trying fallback...');
        const voices = this.synth.getVoices();
        console.log(`[TTSEngine] Fallback check - voices available: ${voices.length}`);

        if (voices.length > 0) {
          const fallbackVoice = this.selectVoice(voices, lang) || voices[0];

          if (fallbackVoice) {
            console.warn('[TTSEngine] Using fallback voice:', fallbackVoice.name);
            utterance.voice = fallbackVoice;
            this.cachedVoice = fallbackVoice;
          } else {
            console.error('No voice available for text-to-speech');
            this.showTTSFallback(text);
            resolve();
            return;
          }
        } else {
          console.error('No voices loaded yet - speech synthesis unavailable');
          this.showTTSFallback(text);
          resolve();
          return;
        }
      }

      utterance.onend = () => {
        console.log(`[TTSEngine] ✅ Speech ended for: "${text}"`);
        resolve();
      };

      utterance.onerror = (error: SpeechSynthesisErrorEvent) => {
        // 'interrupted' is normal when user clicks rapidly or auto-advances
        if (error.error === 'interrupted') {
          resolve();
          return;
        }

        console.warn('TTS Error:', error.error);
        // Try fallback without voice for other errors
        if (voice && utterance.voice && error.error !== 'not-allowed') {
          utterance.voice = null;
          this.synth.speak(utterance);
        } else {
          this.showTTSFallback(text);
          resolve();
        }
      };

      console.log(`[TTSEngine] 🚀 Calling speechSynthesis.speak() for: "${text}"`);
      this.synth.speak(utterance);
    });
  }

  /**
   * Speak using AWS Polly Premium TTS
   */
  private async speakWithPolly(text: string, lang: string | null = null): Promise<void> {
    try {
      // Determine voice and language for Polly - using Male voices for mobile
      const voiceId = lang === 'en-AU' ? 'Russell' :  // Australian male
                      lang === 'en-GB' ? 'Brian' :     // British male
                      'Brian'; // Default to British male

      const languageCode = lang === 'en-AU' ? 'en-AU' :
                          lang === 'en-GB' ? 'en-GB' :
                          'en-GB'; // Default to British English

      console.log(`[TTSEngine] 🌐 Calling Polly API with voice: ${voiceId}, lang: ${languageCode}`);

      const response = await fetch('/api/premium-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId,
          engine: 'neural', // Neural Amy is available in ap-southeast-2
          languageCode,
          outputFormat: 'mp3',
        }),
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[TTSEngine] Polly API error (${response.status}): ${errorText}`);
        console.warn('[TTSEngine] Falling back to browser TTS');
        return this.speakWithBrowserTTS(text, lang);
      }

      const result = await response.json();

      if (!result.success || result.fallback) {
        console.warn('[TTSEngine] Polly unavailable, falling back to browser TTS');
        // Fall back to browser TTS
        return this.speakWithBrowserTTS(text, lang);
      }

      // Play the audio
      const audioData = `data:${result.data.contentType};base64,${result.data.audioBase64}`;
      const audio = new Audio(audioData);

      return new Promise((resolve) => {
        audio.onended = () => {
          console.log(`[TTSEngine] ✅ Polly speech ended for: "${text}"`);
          resolve();
        };
        audio.onerror = () => {
          console.warn('[TTSEngine] Polly audio error, falling back');
          this.speakWithBrowserTTS(text, lang).then(resolve);
        };
        audio.play().catch(() => {
          console.warn('[TTSEngine] Polly audio play failed, falling back');
          this.speakWithBrowserTTS(text, lang).then(resolve);
        });
      });
    } catch (error) {
      console.error('[TTSEngine] Polly error:', error);
      // Fall back to browser TTS
      return this.speakWithBrowserTTS(text, lang);
    }
  }

  /**
   * Browser TTS fallback (extracted from speak method)
   */
  private speakWithBrowserTTS(text: string, lang: string | null = null): Promise<void> {
    const language = lang || this.getConfig()?.get('tts.language.default') || 'en-GB';

    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        this.showTTSFallback(text);
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = this.speechRate || 1.0;
      utterance.volume = 1.0;

      const voices = this.synth.getVoices();
      const voice = this.selectVoice(voices, lang) || voices[0];
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => {
        this.showTTSFallback(text);
        resolve();
      };

      this.synth.speak(utterance);
    });
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
    const language = lang || this.getConfig().get('tts.language.default');

    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        const configRate = this.getConfig()?.get('tts.speeds.normal') || 1.0;
        utterance.rate = customRate !== null ? customRate : (this.speechRate || configRate);
        utterance.volume = 1.0;
        utterance.pitch = 1.0;

        // Try to find voice
        if (!this.cachedVoice || this.synth.getVoices().length > 0) {
          const voices = this.synth.getVoices();
          if (voices.length > 0) {
            this.cachedVoice = this.selectVoice(voices, lang);
          }
        }

        const voice = this.cachedVoice;
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onend = () => {
          if (this.backgroundAudioElement) {
            this.startBackgroundAudio();
          }
          resolve();
        };

        utterance.onerror = () => resolve();

        this.synth.speak(utterance);
      } else {
        this.showTTSFallback(text);
        resolve();
      }
    });
  }

  /**
   * Show TTS fallback message
   */
  showTTSFallback(text: string): void {
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
  }

  /**
   * Enable background audio for iOS
   */
  enableBackgroundAudio(): void {
    // Only register sync once
    if (!this.backgroundAudioEnabled) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          if ((registration as any).sync) {
            (registration as any).sync.register('audio-playback');
          }
        });
      }
      this.backgroundAudioEnabled = true;
    }

    // Set up background audio context for iOS
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }

      // Resume audio context if suspended (iOS requirement)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }

    // iOS-specific background audio setup
    this.setupIOSBackgroundAudio();
  }

  /**
   * Setup iOS background audio with silent audio element
   */
  setupIOSBackgroundAudio(): void {
    // Create a silent audio element to keep audio session active
    if (!this.backgroundAudioElement) {
      this.backgroundAudioElement = document.createElement('audio');
      this.backgroundAudioElement.loop = true;
      this.backgroundAudioElement.volume = 0.05;
      this.backgroundAudioElement.preload = 'auto';
      this.backgroundAudioElement.muted = false;
      this.backgroundAudioElement.autoplay = false;

      // Create a very short silent audio data URL (200ms of silence)
      const silentAudioData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      this.backgroundAudioElement.src = silentAudioData;

      // Add to DOM (hidden)
      this.backgroundAudioElement.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
      this.backgroundAudioElement.setAttribute('playsinline', '');
      this.backgroundAudioElement.setAttribute('webkit-playsinline', '');

      // Ensure DOM is ready before appending
      if (document.body) {
        document.body.appendChild(this.backgroundAudioElement);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (this.backgroundAudioElement) {
            document.body.appendChild(this.backgroundAudioElement);
            this.startBackgroundAudio();
          }
        });
        return;
      }
    }

    // Start playing silent audio
    this.startBackgroundAudio();

    // Set up audio session for iOS
    if (navigator.mediaSession) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'PTE Pronunciation Trainer',
        artist: 'Learning Mode',
        album: 'Background Audio'
      });
    }
  }

  /**
   * Start background audio with proper error handling
   */
  startBackgroundAudio(): void {
    if (!this.backgroundAudioElement) return;

    const playPromise = this.backgroundAudioElement.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[TTSEngine] ✅ Background audio started successfully');
        })
        .catch((error: Error) => {
          console.warn('[TTSEngine] ⚠️ Background audio failed to start:', error.message);

          // Retry after user interaction
          const retryPlay = () => {
            this.backgroundAudioElement!.play()
              .then(() => {
                console.log('[TTSEngine] ✅ Background audio started on retry');
                document.removeEventListener('click', retryPlay);
                document.removeEventListener('touchstart', retryPlay);
              })
              .catch(() => {
                // Silent fail on retry
              });
          };

          document.addEventListener('click', retryPlay, { once: true });
          document.addEventListener('touchstart', retryPlay, { once: true });
        });
    }
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
  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      this.synth.cancel();
    }

    this.isSpeaking = false;

    // Remove visual feedback
    const englishWordElement = document.getElementById('englishWord');
    if (englishWordElement) {
      englishWordElement.classList.remove('speaking');
    }

    // Update Zustand TTS store (replaces EventBus emission)
    useAppStore.getState().tts.stopSpeaking();
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

  /**
   * Select best voice match from available voices
   */
  /**
   * Select best voice match from available voices
   * STRICTLY prioritizes Male AU/UK voices as per user request
   */
  private selectVoice(voices: SpeechSynthesisVoice[], lang: string | null): SpeechSynthesisVoice | null {
    // Check if user has selected a preferred voice in settings
    const preferredName = useAppStore.getState().settings.ttsVoice;

    if (preferredName && preferredName !== 'premium') {
      // Try exact match first
      const exactMatch = voices.find(v => v.name === preferredName);
      if (exactMatch) return exactMatch;

      // Try partial match
      const partialMatch = voices.find(v => v.name.includes(preferredName));
      if (partialMatch) return partialMatch;
    }

    // PRIORITY: British Female voices for natural PTE pronunciation

    // 1. UK Female (Google UK English Female is widely available and high quality)
    const ukFemale = voices.find(v =>
      (v.lang === 'en-GB' || v.lang === 'en_GB') &&
      (v.name.toLowerCase().includes('female') ||
       v.name.includes('Google UK English Female') ||
       v.name.includes('Kate') || // macOS/iOS UK Female
       v.name.includes('Serena')) // Another UK Female option
    );
    if (ukFemale) return ukFemale;

    // 2. Australian Female
    const auFemale = voices.find(v =>
      (v.lang === 'en-AU' || v.lang === 'en_AU') &&
      (v.name.toLowerCase().includes('female') ||
       v.name.includes('Karen') || // macOS/iOS AU Female
       v.name.includes('Google Australian English'))
    );
    if (auFemale) return auFemale;

    // 3. Any UK Voice
    const ukAny = voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB');
    if (ukAny) return ukAny;

    // 4. Any Australian Voice
    const auAny = voices.find(v => v.lang === 'en-AU' || v.lang === 'en_AU');
    if (auAny) return auAny;

    // Fallback: Try to match requested language
    if (lang) {
      const langMatch = voices.find(v => v.lang === lang || v.lang.startsWith(lang));
      if (langMatch) return langMatch;
    }

    // Final fallback: First available voice
    return voices[0] || null;
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
