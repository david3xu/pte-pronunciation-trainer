// TTSEngine - Text-to-speech synthesis functionality
// ARCHITECTURE: Event-driven initialization
// - No hard-coded settings defaults in constructor
// - All settings (speechRate, targetRepeats) initialized via SettingsModule events
// - SettingsModule emits 'setting:changed' events during loadSettings()
// - This ensures single source of truth: Config.js → SettingsModule → Audio modules
class TTSEngine {
    constructor() {
        // Load configuration from centralized config
        this.config = window.appConfig || new AppConfig();
        this.currentRepeatCount = 0;
        this.backgroundAudioEnabled = false; // Flag to prevent multiple sync registrations
        
        // Initialize properties (will be set by SettingsModule events)
        this.speechRate = null; // Will be set by SettingsModule
        this.targetRepeats = null; // Will be set by SettingsModule via AudioControls
        
        // Initialize background audio ONCE in constructor
        this.enableBackgroundAudio();
        
        // Listen to settings changes
        this._attachEventListeners();
    }

    /**
     * Attach event listeners for settings changes
     * @private
     */
    _attachEventListeners() {
        window.eventBus.on('setting:changed', this._handleSettingChange.bind(this));
    }

    /**
     * Handle setting changes from SettingsModule
     * @private
     */
    _handleSettingChange({key, value}) {
        if (key === 'speed') {
            this.speechRate = parseFloat(value) || this.config.get('tts.speeds.normal');
            console.log(`[TTSEngine] Speed changed to ${this.speechRate}`);
        } else if (key === 'voice') {
            // Reset voice cache when voice preference changes
            this.resetVoiceCache();
            console.log(`[TTSEngine] Voice preference changed to ${value}`);
        } else if (key === 'repeat') {
            // Handle repeat mode from SettingsModule (set by AudioControls)
            // Note: AudioControls converts mode to targetRepeats and calls setRepeatMode
            // This listener is for potential direct repeat settings
        }
    }

    /**
     * HELPER: Add visual feedback and emit speaking started event
     * (Eliminates duplicate visual feedback code)
     * @private
     */
    _addSpeakingFeedback(elementId, eventData) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('speaking');
        }
        // Emit standardized event from Config.js
        const ttsSpeakingStartedEvent = window.appConfig.get('events.tts.speaking.started');
        window.eventBus.emit(ttsSpeakingStartedEvent, eventData);
        return element;
    }

    /**
     * HELPER: Remove visual feedback and emit speaking completed event
     * (Eliminates duplicate visual feedback code)
     * @private
     */
    _removeSpeakingFeedback(element, eventData) {
        if (element) {
            element.classList.remove('speaking');
        }
        // Emit standardized event from Config.js
        const ttsSpeakingCompletedEvent = window.appConfig.get('events.tts.speaking.completed');
        window.eventBus.emit(ttsSpeakingCompletedEvent, eventData);
    }

    /**
     * SIMPLIFIED: Pronounce any text (sentence, question, word)
     * Universal method for RS/ASQ/WFD modes - reuses existing TTS infrastructure
     * @param {string} text - Text to pronounce
     * @param {string} lang - Language code (default: 'en-AU')
     * @param {number} rate - Speech rate (default: normal)
     */
    async pronounceText(text, lang = 'en-AU', rate = null) {
        if (!text) {
            window.progressTracker.showError('No text to pronounce');
            return;
        }

        try {
            const cleanText = this.cleanTextForTTS(text);
            const speechRate = rate || this.config.get('tts.speeds.normal');

            // Add visual feedback to main display element
            const element = this._addSpeakingFeedback('englishWord', {
                text: text,
                mode: window.currentPracticeMode,
                rate: speechRate
            });

            // Speak the text
            await this.speak(cleanText, lang, speechRate);

            // Remove visual feedback
            this._removeSpeakingFeedback(element, {
                text: text,
                mode: window.currentPracticeMode
            });

        } catch (error) {
            console.warn('Speech error:', error);
            this.showTTSFallback(text);
        }
    }

    /**
     * Pronounce a vocabulary word with repetition support
     * @param {Object} word - Word object with english, pronunciation, etc.
     * @param {number} repeatIndex - Current repetition index (0, 1, 2...)
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
            this.currentRepeatCount = repeatIndex;

            // Clean text for TTS
            const cleanText = this.cleanTextForTTS(word.english);

            // Get pronunciation rate based on repeat count for progressive learning
            let pronunciationRate;
            if (this.currentRepeatCount === 0) {
                pronunciationRate = this.config.get('tts.speeds.slow'); // Always slow for first pronunciation
            } else if (this.currentRepeatCount === 1) {
                pronunciationRate = this.config.get('tts.speeds.normal'); // Always normal for second pronunciation
            } else {
                pronunciationRate = this.config.get('tts.speeds.fast'); // Faster for third+ pronunciations
            }

            // For vocabulary-clean mode, use UK pronunciation for first repeat, US for second
            if (word.source === 'vocabulary-clean' && word.ukPronunciation && word.usPronunciation) {
            }

            // Add visual feedback during speech
            const englishWordElement = document.getElementById('englishWord');
            const exampleElement = document.getElementById('exampleSentence');

            if (englishWordElement) {
                englishWordElement.classList.add('speaking');
            }

            // Emit speaking start event (standardized from Config.js)
            const ttsSpeakingStartedEvent = window.appConfig.get('events.tts.speaking.started');
            window.eventBus.emit(ttsSpeakingStartedEvent, {
                word: word.english,
                repeatCount: this.currentRepeatCount,
                rate: pronunciationRate
            });

            // Speak the term first
            await this.speak(cleanText, 'en-AU', pronunciationRate);

            // For vocabulary with examples, optionally speak the example sentence based on repeat mode
            // Only speak example on the LAST repetition to avoid: term+example+term+example
            const hasExample = (word.examples && word.examples.length > 0) || word.example;
            const isLastRepetition = this.currentRepeatCount === (this.targetRepeats - 1);
            const shouldSpeakExample = window.audioControls && isLastRepetition &&
                (window.audioControls.repeatMode === 'intensive' || window.audioControls.repeatMode === 'loop');

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
                    // Conversation vocabulary format
                    rawExample = word.example;
                } else if (word.examples && word.examples.length > 0) {
                    // Specialized vocabulary format
                    rawExample = word.examples[0].text;
                }

                if (rawExample) {
                    const cleanExample = this.cleanExampleSentenceForTTS(rawExample);

                    // Speak example sentence at normal rate
                    await this.speak(cleanExample, 'en-AU', this.speechRate);
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
            const ttsSpeakingCompletedEvent = window.appConfig.get('events.tts.speaking.completed');
            window.eventBus.emit(ttsSpeakingCompletedEvent, {
                word: word.english,
                repeatCount: this.currentRepeatCount
            });

        } catch (error) {
            console.warn('Speech error:', error);
            // Don't show error to user - fallback is already handled in speak()
            this.showTTSFallback(word.english);
        }
    }

    speak(text, lang = 'en-AU', customRate = null) {
        return new Promise((resolve, reject) => {
            // Check if we're on iOS and should use HTML5 Audio fallback
            const isIOS = window.app && window.app.isMobileDevice &&
                /iPad|iPhone|iPod/.test(navigator.userAgent);

            if (isIOS && this.shouldUseHTML5Audio()) {
                return this.speakWithHTML5Audio(text, lang, customRate).then(resolve).catch(resolve);
            }

            if (!('speechSynthesis' in window)) {
                this.showTTSFallback(text);
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            // Use custom rate if provided, otherwise use default speechRate
            utterance.rate = customRate !== null ? customRate : this.speechRate;
            utterance.volume = 1.0;
            utterance.pitch = 1.0;

            // Try to find the best voice match for user's practice - ONLY MALE VOICES
            // Cache the voice selection to ensure consistency across all pronunciations
            if (!this.cachedVoice) {
                const voices = speechSynthesis.getVoices();
                this.cachedVoice = window.voiceSelector ? window.voiceSelector.selectBestVoiceMatch(voices, lang) : null;
                if (this.cachedVoice) {
                }
            }
            const voice = this.cachedVoice;
            if (voice) {
                utterance.voice = voice;
            } else {
                console.error('No voice available for text-to-speech');
                this.showTTSFallback(text);
                resolve();
                return;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (error) => {
                // 'interrupted' is normal when user clicks rapidly or auto-advances
                if (error.error === 'interrupted') {
                    resolve(); // Just continue, this is expected
                    return;
                }

                console.warn('TTS Error:', error.error);
                // Try fallback without voice for other errors
                if (voice && utterance.voice && error.error !== 'not-allowed') {
                    utterance.voice = null;
                    speechSynthesis.speak(utterance);
                } else {
                    this.showTTSFallback(text);
                    resolve();
                }
            };

            speechSynthesis.speak(utterance);
        });
    }

    shouldUseHTML5Audio() {
        // Use HTML5 Audio for background scenarios or when speech synthesis fails
        return document.hidden || document.visibilityState === 'hidden' ||
            !('speechSynthesis' in window) ||
            speechSynthesis.speaking === false;
    }

    speakWithHTML5Audio(text, lang = 'en-AU', customRate = null) {
        return new Promise((resolve, reject) => {
            // For iOS background audio, use HTML5 Audio fallback

            // Create audio element for background playback
            const audio = document.createElement('audio');
            audio.preload = 'auto';
            audio.volume = 1.0;

            // Use Web Speech API to generate audio, then play it via HTML5 Audio
            if ('speechSynthesis' in window) {
                // Create utterance and capture audio
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = lang;
                utterance.rate = customRate !== null ? customRate : this.speechRate;
                utterance.volume = 1.0;
                utterance.pitch = 1.0;

                // Try to find voice - use same cached voice for consistency
                if (!this.cachedVoice) {
                    const voices = speechSynthesis.getVoices();
                    this.cachedVoice = window.voiceSelector ? window.voiceSelector.selectBestVoiceMatch(voices, lang) : null;
                }
                const voice = this.cachedVoice;
                if (voice) {
                    utterance.voice = voice;
                }

                // For iOS background, we'll use a different approach
                utterance.onend = () => {
                    // Keep audio session alive
                    if (this.backgroundAudioElement) {
                        this.backgroundAudioElement.play().catch(() => { });
                    }
                    resolve();
                };

                utterance.onerror = () => resolve();

                speechSynthesis.speak(utterance);
            } else {
                // Fallback to text display
                this.showTTSFallback(text);
                resolve();
            }
        });
    }

    showTTSFallback(text) {
        window.progressTracker.updateStatus(`🔊 Please read aloud: "${text}"`);
        setTimeout(() => {
            window.progressTracker.updateStatus('Text-to-speech not available in this browser');
        }, this.config.get('tts.delays.resetTimeout'));
    }

    enableBackgroundAudio() {
        // Only register sync once (use flag to prevent multiple registrations)
        if (!this.backgroundAudioEnabled) {
            // Enable background audio for iOS
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
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
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

    setupIOSBackgroundAudio() {
        // Create a silent audio element to keep audio session active
        if (!this.backgroundAudioElement) {
            this.backgroundAudioElement = document.createElement('audio');
            this.backgroundAudioElement.loop = true;
            this.backgroundAudioElement.volume = 0.01; // Almost silent
            this.backgroundAudioElement.preload = 'auto';

            // Create a very short silent audio data URL
            const silentAudioData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
            this.backgroundAudioElement.src = silentAudioData;

            // Add to DOM (hidden)
            this.backgroundAudioElement.style.display = 'none';
            document.body.appendChild(this.backgroundAudioElement);
        }

        // Start playing silent audio to maintain audio session
        this.backgroundAudioElement.play().catch(() => { });

        // Set up audio session for iOS
        if (navigator.mediaSession) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'CCL Pronunciation Trainer',
                artist: 'Learning Mode',
                album: 'Background Audio'
            });
        }
    }

    cleanTextForTTS(text) {
        if (!text) return '';

        // Remove extra whitespace and normalize
        let cleanText = text.trim().replace(/\s+/g, ' ');

        // Handle common abbreviations and symbols
        cleanText = cleanText
            .replace(/\b&\b/g, 'and')
            .replace(/\b@\b/g, 'at')
            .replace(/\b#\b/g, 'number')
            .replace(/\b%\b/g, 'percent')
            .replace(/\b\+\b/g, 'plus')
            .replace(/\b-\b/g, ' ') // Replace standalone hyphens with space
            .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase

        return cleanText;
    }

    cleanExampleSentenceForTTS(rawSentence) {
        // Remove speaker prefixes and conversation metadata for TTS
        let cleaned = rawSentence
            // Remove speaker names followed by colon (e.g., "Jenny:", "Officer:", "Doctor:")
            .replace(/^[A-Z][a-z]*\s*[：:]\s*/g, '')
            // Remove numbered dialogue markers (e.g., "1. ", "2. ")
            .replace(/^\d+\.\s*/g, '')
            // Remove text in parentheses (translations)
            .replace(/（[^）]*）/g, '')
            .replace(/\([^)]*\)/g, '')
            // Remove markdown image references
            .replace(/\\n!\[Image\]/g, '')
            // Remove conversation metadata phrases
            .replace(/- (Legal|Medical|Business|Immigration|Education) Briefing.*$/gi, '')
            // Remove extra whitespace and clean up
            .replace(/\s+/g, ' ')
            .trim();

        // If the sentence is too long for comfortable TTS, take the first complete sentence
        if (cleaned.length > 120) {
            const sentences = cleaned.split(/[.!?]+/);
            if (sentences.length > 1 && sentences[0].length > 20 && sentences[0].length <= 120) {
                cleaned = sentences[0] + '.';
            } else {
                cleaned = cleaned.substring(0, 120) + '...';
            }
        }

        // Apply general TTS cleaning
        return this.cleanTextForTTS(cleaned);
    }

    /**
     * @deprecated Use SettingsModule with events instead
     * @private
     */
    _setSpeechRate(rate) {
        this.speechRate = parseFloat(rate) || this.config.get('tts.speeds.normal');

        // Emit rate change event (standardized from Config.js)
        const ttsRateChangedEvent = window.appConfig.get('events.tts.rate.changed');
        window.eventBus.emit(ttsRateChangedEvent, {
            rate: this.speechRate
        });
    }

    setRepeatMode(targetRepeats) {
        this.targetRepeats = parseInt(targetRepeats) || 1;
        this.currentRepeatCount = 0; // Reset count

        // Emit repeat mode change event (standardized from Config.js)
        const ttsRepeatChangedEvent = window.appConfig.get('events.tts.repeat.changed');
        window.eventBus.emit(ttsRepeatChangedEvent, {
            targetRepeats: this.targetRepeats
        });
    }

    stopSpeaking() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }

        // Remove visual feedback
        const englishWordElement = document.getElementById('englishWord');
        if (englishWordElement) {
            englishWordElement.classList.remove('speaking');
        }

        // Emit stop event (standardized from Config.js)
        const ttsStoppedEvent = window.appConfig.get('events.tts.speaking.stopped');
        window.eventBus.emit(ttsStoppedEvent, {
            timestamp: new Date().toISOString()
        });
    }

    getCurrentRepeatCount() {
        return this.currentRepeatCount;
    }

    getTargetRepeats() {
        return this.targetRepeats;
    }

    resetVoiceCache() {
        this.cachedVoice = null;
    }
}

// Global TTS engine instance
const ttsEngine = new TTSEngine();

// Expose as global reference for PTE app
window.ttsEngine = ttsEngine;