// TTSEngine - Text-to-speech synthesis functionality  
class TTSEngine {
    constructor() {
        this.speechRate = 1.0;
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
            
            // For vocabulary with examples, also speak the example sentence
            const hasExample = (word.examples && word.examples.length > 0) || word.example;
            if (hasExample && exampleElement && exampleElement.style.display !== 'none') {
                // Add small pause between term and sentence
                await new Promise(resolve => setTimeout(resolve, 800));
                
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
            
            // Try to find the best voice match for user's practice
            const voices = speechSynthesis.getVoices();
            const voice = window.voiceSelector ? window.voiceSelector.selectBestVoiceMatch(voices, lang) : null;
            if (voice) {
                utterance.voice = voice;
                console.log(`Using voice: ${voice.name} (${voice.lang}) - closest match to user voice`);
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

    showTTSFallback(text) {
        window.progressTracker.updateStatus(`🔊 Please read aloud: "${text}"`);
        setTimeout(() => {
            window.progressTracker.updateStatus('Text-to-speech not available in this browser');
        }, 3000);
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
window.ttsEngine = new TTSEngine();