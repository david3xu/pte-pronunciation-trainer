/**
 * TTSEngine - Text-to-Speech Synthesis Engine
 *
 * Type-safe TTS engine with Web Speech API integration
 * Features:
 * - Event-driven initialization (no hardcoded defaults)
 * - iOS background audio support
 * - HTML5 Audio fallback
 * - Voice selection and caching
 * - Repeat modes for learning
 * - Text cleaning and normalization
 */
/**
 * TTSEngine - Type-safe text-to-speech engine
 *
 * ARCHITECTURE: Event-driven initialization
 * - No hard-coded settings defaults in constructor
 * - All settings (speechRate, targetRepeats) initialized via SettingsModule events
 * - SettingsModule emits 'setting:changed' events during loadSettings()
 * - This ensures single source of truth: Config.js → SettingsModule → Audio modules
 */
export class TTSEngine {
    config;
    currentRepeatCount = 0;
    backgroundAudioEnabled = false;
    // Initialize properties (will be set by SettingsModule events)
    speechRate = null;
    targetRepeats = null;
    synth;
    isSpeaking = false;
    cachedVoice = null;
    // Audio context for iOS background audio
    audioContext;
    audioContextInitialized = false;
    backgroundAudioElement;
    constructor() {
        // Load configuration from centralized config
        this.config = window.appConfig;
        this.synth = window.speechSynthesis;
        // Initialize events first - don't start audio context yet
        this._attachEventListeners();
        // We'll initialize AudioContext on first user interaction
    }
    /**
     * Safely get current practice mode from SettingsModule or Config.js fallback
     */
    getPracticeMode() {
        const settingsModule = window.settingsModule;
        if (settingsModule && typeof settingsModule.get === 'function') {
            return settingsModule.get('practiceMode') || this.config.get('data.defaults.practiceMode');
        }
        return this.config.get('data.defaults.practiceMode');
    }
    /**
     * Attach event listeners for settings changes
     */
    _attachEventListeners() {
        // Listen to standardized settings:changed event from Config.js
        const settingsChangedEvent = this.config?.get('events.settings.changed') || 'settings:changed';
        const eventBus = window.eventBus;
        eventBus.on(settingsChangedEvent, this._handleSettingChange.bind(this));
    }
    /**
     * Handle setting changes from SettingsModule
     */
    _handleSettingChange({ key, value }) {
        if (key === 'speed') {
            this.speechRate = parseFloat(value) || this.config.get('tts.speeds.normal');
            console.log(`[TTSEngine] Speed changed to ${this.speechRate}`);
        }
        else if (key === 'voice') {
            // Reset voice cache when voice preference changes
            this.resetVoiceCache();
            console.log(`[TTSEngine] Voice preference changed to ${value}`);
        }
        else if (key === 'repeat') {
            // Handle repeat mode from SettingsModule (set by AudioControls)
            // Note: AudioControls converts mode to targetRepeats and calls setRepeatMode
            // This listener is for potential direct repeat settings
        }
    }
    /**
     * HELPER: Add visual feedback and emit speaking started event
     */
    _addSpeakingFeedback(elementId, eventData) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('speaking');
        }
        // Only emit tts:speaking:started event for vocabulary mode
        // Practice modes (RS/ASQ/WFD) handle their own display logic
        const currentMode = this.getPracticeMode();
        const isVocabularyMode = currentMode === 'vocabulary';
        if (isVocabularyMode) {
            // Vocabulary mode: emit event with word data for display
            const payload = { ...eventData };
            const ttsSpeakingStartedEvent = this.config.get('events.tts.speaking.started');
            const eventBus = window.eventBus;
            eventBus.emit(ttsSpeakingStartedEvent, payload);
        }
        // Practice modes don't need this event - they use displayContent() directly
        return element;
    }
    /**
     * HELPER: Remove visual feedback and emit speaking completed event
     */
    _removeSpeakingFeedback(element, eventData) {
        if (element) {
            element.classList.remove('speaking');
        }
        // Emit standardized event from Config.js
        const ttsSpeakingCompletedEvent = this.config.get('events.tts.speaking.completed');
        const eventBus = window.eventBus;
        eventBus.emit(ttsSpeakingCompletedEvent, eventData);
    }
    /**
     * SIMPLIFIED: Pronounce any text (sentence, question, word)
     * Universal method for RS/ASQ/WFD modes - reuses existing TTS infrastructure
     */
    async pronounceText(text, lang = null, rate = null) {
        if (!text) {
            const progressTracker = window.progressTracker;
            progressTracker.showError('No text to pronounce');
            return;
        }
        try {
            const cleanText = this.cleanTextForTTS(text);
            // Use custom rate if provided, otherwise use user's speed setting, fallback to normal
            const speechRate = rate || this.speechRate || this.config.get('tts.speeds.normal');
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
        }
        catch (error) {
            console.warn('Speech error:', error);
            this.showTTSFallback(text);
        }
    }
    /**
     * Pronounce a vocabulary word with repetition support
     */
    async pronounceWord(word, repeatIndex = 0) {
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
            const pronunciationRate = this.speechRate || this.config.get('tts.speeds.normal');
            // Add visual feedback during speech
            const englishWordElement = document.getElementById('englishWord');
            const exampleElement = document.getElementById('exampleSentence');
            if (englishWordElement) {
                englishWordElement.classList.add('speaking');
            }
            // Emit speaking start event (standardized from Config.js)
            const ttsSpeakingStartedEvent = this.config.get('events.tts.speaking.started');
            const eventBus = window.eventBus;
            eventBus.emit(ttsSpeakingStartedEvent, {
                word: word, // Send full word object, not just word.english
                repeatCount: this.currentRepeatCount,
                rate: pronunciationRate
            });
            console.log(`[TTSEngine] 🔊 Calling speak() for: "${cleanText}"`);
            // Speak the term first
            await this.speak(cleanText, this.config.get('tts.language.default'), pronunciationRate);
            console.log(`[TTSEngine] ✅ speak() completed for: "${cleanText}"`);
            // For vocabulary with examples, optionally speak the example sentence
            // Only speak example on the LAST repetition to avoid: term+example+term+example
            const hasExample = (word.examples && word.examples.length > 0) || word.example;
            const isLastRepetition = this.currentRepeatCount === ((this.targetRepeats || 1) - 1);
            const audioControls = window.audioControls;
            const shouldSpeakExample = audioControls && isLastRepetition &&
                (audioControls.repeatMode === 'intensive' || audioControls.repeatMode === 'loop');
            if (hasExample && shouldSpeakExample && exampleElement && exampleElement.style.display !== 'none') {
                // Add small pause between term and sentence
                await new Promise(resolve => setTimeout(resolve, this.config.get('tts.delays.voiceReady')));
                // Highlight example sentence during speech
                if (exampleElement) {
                    exampleElement.classList.add('speaking');
                }
                // Get example text from either format
                let rawExample;
                if (word.example) {
                    rawExample = word.example;
                }
                else if (word.examples && word.examples.length > 0) {
                    rawExample = word.examples[0].text;
                }
                if (rawExample) {
                    const cleanExample = this.cleanExampleSentenceForTTS(rawExample);
                    await this.speak(cleanExample, this.config.get('tts.language.default'), this.speechRate || this.config.get('tts.speeds.normal'));
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
            // Emit speaking completed event (standardized from Config.js)
            const ttsSpeakingCompletedEvent = this.config.get('events.tts.speaking.completed');
            eventBus.emit(ttsSpeakingCompletedEvent, {
                word: word.english,
                repeatCount: this.currentRepeatCount
            });
        }
        catch (error) {
            console.warn('Speech error:', error);
            this.showTTSFallback(word.english);
        }
        finally {
            this.isSpeaking = false;
        }
    }
    /**
     * Core speak method - uses Web Speech API
     */
    speak(text, lang = null, customRate = null) {
        // Use configured language if not specified
        const language = lang || this.config.get('tts.language.default');
        console.log(`[TTSEngine] 🎤 speak() called with: "${text}", lang: ${language}, rate: ${customRate}`);
        // Initialize AudioContext on first speech attempt (user interaction)
        if (!this.audioContextInitialized) {
            this.enableBackgroundAudio();
            this.audioContextInitialized = true;
        }
        return new Promise((resolve) => {
            // Check if we're on iOS and should use HTML5 Audio fallback
            const app = window.app;
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
            utterance.rate = customRate !== null ? customRate : (this.speechRate || this.config.get('tts.speeds.normal'));
            utterance.volume = 1.0;
            utterance.pitch = 1.0;
            // Try to find the best voice match
            if (!this.cachedVoice || this.synth.getVoices().length > 0) {
                const voices = this.synth.getVoices();
                if (voices.length > 0) {
                    const voiceSelector = window.voiceSelector;
                    this.cachedVoice = voiceSelector ? voiceSelector.selectBestVoiceMatch(voices, lang) : null;
                    if (this.cachedVoice) {
                        console.log(`[TTSEngine] Selected voice: ${this.cachedVoice.name}`);
                    }
                }
            }
            const voice = this.cachedVoice;
            if (voice) {
                utterance.voice = voice;
            }
            else {
                console.warn('[TTSEngine] ⚠️ No cached voice, trying fallback...');
                const voices = this.synth.getVoices();
                console.log(`[TTSEngine] Fallback check - voices available: ${voices.length}`);
                if (voices.length > 0) {
                    const voiceSelector = window.voiceSelector;
                    const fallbackVoice = voiceSelector ? voiceSelector.selectBestVoiceMatch(voices, lang) : voices[0];
                    if (fallbackVoice) {
                        console.warn('[TTSEngine] Using fallback voice:', fallbackVoice.name);
                        utterance.voice = fallbackVoice;
                        this.cachedVoice = fallbackVoice;
                    }
                    else {
                        console.error('No voice available for text-to-speech');
                        this.showTTSFallback(text);
                        resolve();
                        return;
                    }
                }
                else {
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
            utterance.onerror = (error) => {
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
                }
                else {
                    this.showTTSFallback(text);
                    resolve();
                }
            };
            console.log(`[TTSEngine] 🚀 Calling speechSynthesis.speak() for: "${text}"`);
            this.synth.speak(utterance);
        });
    }
    /**
     * Check if should use HTML5 Audio fallback
     */
    shouldUseHTML5Audio() {
        return document.hidden ||
            document.visibilityState === 'hidden' ||
            !('speechSynthesis' in window) ||
            this.synth.speaking === false;
    }
    /**
     * Speak with HTML5 Audio (iOS background fallback)
     */
    speakWithHTML5Audio(text, lang = null, customRate = null) {
        const language = lang || this.config.get('tts.language.default');
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = language;
                utterance.rate = customRate !== null ? customRate : (this.speechRate || this.config.get('tts.speeds.normal'));
                utterance.volume = 1.0;
                utterance.pitch = 1.0;
                // Try to find voice
                if (!this.cachedVoice || this.synth.getVoices().length > 0) {
                    const voices = this.synth.getVoices();
                    if (voices.length > 0) {
                        const voiceSelector = window.voiceSelector;
                        this.cachedVoice = voiceSelector ? voiceSelector.selectBestVoiceMatch(voices, lang) : voices[0];
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
            }
            else {
                this.showTTSFallback(text);
                resolve();
            }
        });
    }
    /**
     * Show TTS fallback message
     */
    showTTSFallback(text) {
        const progressTracker = window.progressTracker;
        progressTracker.updateStatus(`🔊 Please read aloud: "${text}"`);
        setTimeout(() => {
            progressTracker.updateStatus('Text-to-speech not available in this browser');
        }, this.config.get('tts.delays.resetTimeout'));
    }
    /**
     * Enable background audio for iOS
     */
    enableBackgroundAudio() {
        // Only register sync once
        if (!this.backgroundAudioEnabled) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    if (registration.sync) {
                        registration.sync.register('audio-playback');
                    }
                });
            }
            this.backgroundAudioEnabled = true;
        }
        // Set up background audio context for iOS
        if (typeof AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || window.webkitAudioContext;
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
    setupIOSBackgroundAudio() {
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
            }
            else {
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
    startBackgroundAudio() {
        if (!this.backgroundAudioElement)
            return;
        const playPromise = this.backgroundAudioElement.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                console.log('[TTSEngine] ✅ Background audio started successfully');
            })
                .catch((error) => {
                console.warn('[TTSEngine] ⚠️ Background audio failed to start:', error.message);
                // Retry after user interaction
                const retryPlay = () => {
                    this.backgroundAudioElement.play()
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
    cleanTextForTTS(text) {
        if (!text)
            return '';
        // Remove extra whitespace and normalize
        let cleanText = text.trim().replace(/\s+/g, ' ');
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
    cleanExampleSentenceForTTS(rawSentence) {
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
            if (sentences.length > 1 && sentences[0].length > 20 && sentences[0].length <= 120) {
                cleaned = sentences[0] + '.';
            }
            else {
                cleaned = cleaned.substring(0, 120) + '...';
            }
        }
        return this.cleanTextForTTS(cleaned);
    }
    /**
     * Set repeat mode for word repetition
     */
    setRepeatMode(targetRepeats) {
        this.targetRepeats = parseInt(targetRepeats.toString()) || 1;
        this.currentRepeatCount = 0;
        // Emit repeat mode change event
        const ttsRepeatChangedEvent = this.config.get('events.tts.repeat.changed');
        const eventBus = window.eventBus;
        eventBus.emit(ttsRepeatChangedEvent, {
            targetRepeats: this.targetRepeats
        });
    }
    /**
     * Stop all speech
     */
    stopSpeaking() {
        if ('speechSynthesis' in window) {
            this.synth.cancel();
        }
        this.isSpeaking = false;
        // Remove visual feedback
        const englishWordElement = document.getElementById('englishWord');
        if (englishWordElement) {
            englishWordElement.classList.remove('speaking');
        }
        // Emit stop event
        const ttsStoppedEvent = this.config.get('events.tts.speaking.stopped');
        const eventBus = window.eventBus;
        eventBus.emit(ttsStoppedEvent, {
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Get current repeat count
     */
    getCurrentRepeatCount() {
        return this.currentRepeatCount;
    }
    /**
     * Get target repeats
     */
    getTargetRepeats() {
        return this.targetRepeats || 1;
    }
    /**
     * Reset voice cache (force re-selection)
     */
    resetVoiceCache() {
        this.cachedVoice = null;
    }
}
// Export singleton instance
export const ttsEngine = new TTSEngine();
// Default export
export default ttsEngine;
// Expose as global reference for PTE app
if (typeof window !== 'undefined') {
    window.ttsEngine = ttsEngine;
}
//# sourceMappingURL=TTSEngine.js.map