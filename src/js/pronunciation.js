/**
 * Text-to-Speech Engine for CCL Pronunciation Trainer
 * Handles Web Speech API integration for vocabulary pronunciation
 */

class PronunciationEngine {
    constructor() {
        this.isSupported = 'speechSynthesis' in window;
        this.voices = [];
        this.currentUtterance = null;
        this.settings = {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        };
        
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Web Speech API not supported');
            return;
        }

        // Load available voices
        this.loadVoices();
        
        // Listen for voice changes
        speechSynthesis.addEventListener('voiceschanged', () => {
            this.loadVoices();
        });

        console.log('Pronunciation engine initialized');
    }

    loadVoices() {
        this.voices = speechSynthesis.getVoices();
        console.log(`Loaded ${this.voices.length} voices`);
    }

    /**
     * Get preferred voice for a language
     * @param {string} lang - Language code (e.g., 'en-AU', 'zh-CN')
     * @returns {SpeechSynthesisVoice|null}
     */
    getVoiceForLanguage(lang) {
        if (!this.voices.length) return null;

        // First try exact match
        let voice = this.voices.find(v => v.lang === lang);
        
        // Then try language prefix match
        if (!voice) {
            const langPrefix = lang.split('-')[0];
            voice = this.voices.find(v => v.lang.startsWith(langPrefix));
        }

        // For English, prefer Australian accent
        if (lang.startsWith('en') && !voice) {
            voice = this.voices.find(v => 
                v.lang.includes('AU') || v.lang.includes('GB')
            );
        }

        return voice || this.voices[0];
    }

    /**
     * Speak text using TTS
     * @param {string} text - Text to pronounce
     * @param {string} lang - Language code
     * @returns {Promise<void>}
     */
    speak(text, lang = 'en-AU') {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            // Cancel any ongoing speech
            this.stop();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = this.settings.rate;
            utterance.pitch = this.settings.pitch;
            utterance.volume = this.settings.volume;

            // Set appropriate voice
            const voice = this.getVoiceForLanguage(lang);
            if (voice) {
                utterance.voice = voice;
            }

            // Set up event handlers
            utterance.onend = () => {
                this.currentUtterance = null;
                resolve();
            };

            utterance.onerror = (error) => {
                this.currentUtterance = null;
                reject(error);
            };

            // Store reference and speak
            this.currentUtterance = utterance;
            speechSynthesis.speak(utterance);
        });
    }

    /**
     * Stop current speech
     */
    stop() {
        if (this.isSupported && speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    }

    /**
     * Pause current speech
     */
    pause() {
        if (this.isSupported && speechSynthesis.speaking) {
            speechSynthesis.pause();
        }
    }

    /**
     * Resume paused speech
     */
    resume() {
        if (this.isSupported && speechSynthesis.paused) {
            speechSynthesis.resume();
        }
    }

    /**
     * Update speech settings
     * @param {Object} newSettings - Settings to update
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Check if currently speaking
     * @returns {boolean}
     */
    isSpeaking() {
        return this.isSupported && speechSynthesis.speaking;
    }

    /**
     * Get available voices
     * @returns {SpeechSynthesisVoice[]}
     */
    getVoices() {
        return this.voices;
    }
}

// Export as global for browser use
window.PronunciationEngine = PronunciationEngine;