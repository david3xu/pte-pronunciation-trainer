// TTSEngine - Text-to-speech synthesis functionality
class TTSEngine {
    constructor() {
        this.speechRate = 0.7;
        this.currentRepeatCount = 0;
        this.targetRepeats = 2;
    }

    async pronounceWord(word, repeatCount = 0) {
        if (!word || !word.english) {
            window.progressTracker.showError('No word to pronounce');
            return;
        }

        try {
            this.currentRepeatCount = repeatCount;

            // Enable background audio for iOS
            this.enableBackgroundAudio();

            // Clean text for TTS
            const cleanText = this.cleanTextForTTS(word.english);

            // Get pronunciation rate based on repeat count (progressive learning)
            let pronunciationRate;
            if (this.currentRepeatCount === 0) {
                pronunciationRate = 0.7; // SLOW & CLEAR for first pronunciation
            } else if (this.currentRepeatCount === 1) {
                pronunciationRate = this.speechRate; // Normal speed for second
            } else {
                pronunciationRate = Math.min(this.speechRate * 1.3, 2.0); // Faster for third+
            }

            // For vocabulary-clean mode, use UK pronunciation for first repeat, US for second
            if (word.source === 'vocabulary-clean' && word.ukPronunciation && word.usPronunciation) {
                console.log('Using vocabulary-clean pronunciation data for TTS');
            }

            // Add visual feedback during speech
            const englishWordElement = document.getElementById('englishWord');
            const exampleElement = document.getElementById('exampleSentence');

            if (englishWordElement) {
                englishWordElement.classList.add('speaking');
            }

            // Emit speaking start event
            window.eventBus.emit('tts:speakingStarted', {
                word: word.english,
                repeatCount: this.currentRepeatCount,
                rate: pronunciationRate
            });

            // Speak the term first
            await this.speak(cleanText, 'en-AU', pronunciationRate);

            // For vocabulary with examples, optionally speak the example sentence based on repeat mode
            const hasExample = (word.examples && word.examples.length > 0) || word.example;
            const shouldSpeakExample = window.audioControls &&
                (window.audioControls.repeatMode === 'intensive' || window.audioControls.repeatMode === 'loop');

            if (hasExample && shouldSpeakExample && exampleElement && exampleElement.style.display !== 'none') {
                // Add small pause between term and sentence
                await new Promise(resolve => setTimeout(resolve, Constants.DELAYS.TTS_VOICE_READY_DELAY));

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

            // Emit speaking completed event
            window.eventBus.emit('tts:speakingCompleted', {
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
            const voices = speechSynthesis.getVoices();
            const voice = window.voiceSelector ? window.voiceSelector.selectBestVoiceMatch(voices, lang) : null;
            if (voice) {
                utterance.voice = voice;
                console.log(`Using voice: ${voice.name} (${voice.lang})`);
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

                // Try to find voice
                const voices = speechSynthesis.getVoices();
                const voice = window.voiceSelector ? window.voiceSelector.selectBestVoiceMatch(voices, lang) : null;
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
        }, Constants.DELAYS.TTS_RESET_TIMEOUT);
    }

    enableBackgroundAudio() {
        // Enable background audio for iOS
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                if (registration.sync) {
                    registration.sync.register('audio-playback');
                }
            });
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
            // Remove Chinese text in parentheses (translations)
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

    setSpeechRate(rate) {
        this.speechRate = parseFloat(rate) || 1.0;

        // Emit rate change event
        window.eventBus.emit('tts:rateChanged', {
            rate: this.speechRate
        });
    }

    setRepeatMode(targetRepeats) {
        this.targetRepeats = parseInt(targetRepeats) || 1;
        this.currentRepeatCount = 0; // Reset count

        // Emit repeat mode change event
        window.eventBus.emit('tts:repeatModeChanged', {
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

        // Emit stop event
        window.eventBus.emit('tts:stopped', {
            timestamp: new Date().toISOString()
        });
    }

    getCurrentRepeatCount() {
        return this.currentRepeatCount;
    }

    getTargetRepeats() {
        return this.targetRepeats;
    }
}

// Global TTS engine instance
// Create and expose global instance
const ttsEngine = new TTSEngine();

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('ttsEngine', ttsEngine);
}

// Legacy compatibility - maintain existing global reference
window.ttsEngine = ttsEngine;