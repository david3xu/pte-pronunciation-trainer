// VoiceSelector - Voice selection and management
class VoiceSelector {
    constructor() {
        this.preferredVoice = null; // User's selected voice preference
    }

    selectBestVoiceMatch(voices, lang) {
        // Check if user has selected a preferred voice from curated list
        if (this.preferredVoice) {
            // Try exact match first
            let selectedVoice = voices.find(v => v.name === this.preferredVoice);

            // If not found, try fallback names for the selected voice
            if (!selectedVoice) {
                const curatedVoice = this.getCuratedVoiceInfo(this.preferredVoice);
                if (curatedVoice) {
                    for (const fallbackName of curatedVoice.fallbacks) {
                        selectedVoice = voices.find(v => v.name === fallbackName || v.name.includes(fallbackName));
                        if (selectedVoice) break;
                    }
                }
            }

            if (selectedVoice) {
                console.log(`Using user-selected voice: ${selectedVoice.name}`);
                return selectedVoice;
            }
        }

        // ONLY MALE VOICES - PRIORITIZE GOOGLE UK ENGLISH MALE, THEN AU NATURAL MALE
        // 1) Google UK English Male
        // 2) Microsoft James Online (Natural) - en-AU
        // 3) Microsoft James - en-AU
        // 4) Google Australian English Male
        // 5) Any other en-AU male
        // 6) Other English male voices
        const priorityNames = [
            'Google UK English Male',
            'Microsoft James Online (Natural) - English (Australia)',
            'Microsoft James - English (Australia)',
            'Microsoft James',
            'James',
            'Google Australian English Male'
        ];

        // First try exact priority by name within available voices
        for (const preferredName of priorityNames) {
            const voice = voices.find(v => v.name === preferredName || v.name.includes(preferredName));
            if (voice) {
                console.log(`Auto-selected AU priority voice: ${voice.name} (${voice.lang})`);
                return voice;
            }
        }

        // Then prefer any en-AU male-ish voice
        const maleIndicators = ['male', 'man', 'boy', 'james', 'william', 'ryan', 'daniel', 'alex', 'david', 'tom', 'michael', 'robert'];
        const femaleIndicators = ['female', 'woman', 'girl', 'kate', 'susan', 'karen', 'catherine', 'samantha', 'helen', 'sarah', 'maria', 'anna'];

        const enAuVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en-au'));
        const enAuMaleVoices = enAuVoices.filter(v => {
            const nameLower = v.name.toLowerCase();
            const isFemale = femaleIndicators.some(ind => nameLower.includes(ind));
            return !isFemale;
        });

        if (enAuMaleVoices.length > 0) {
            const explicitMale = enAuMaleVoices.find(v => maleIndicators.some(ind => v.name.toLowerCase().includes(ind)));
            if (explicitMale) {
                console.log(`Auto-selected en-AU explicit male voice: ${explicitMale.name} (${explicitMale.lang})`);
                return explicitMale;
            }
            console.log(`Auto-selected en-AU voice (non-female): ${enAuMaleVoices[0].name} (${enAuMaleVoices[0].lang})`);
            return enAuMaleVoices[0];
        }

        // Fallback to other English male voices (non-AU)
        const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        const englishMaleVoices = englishVoices.filter(v => {
            const nameLower = v.name.toLowerCase();
            const isFemale = femaleIndicators.some(ind => nameLower.includes(ind));
            return !isFemale;
        });

        if (englishMaleVoices.length > 0) {
            const explicitMaleEn = englishMaleVoices.find(v => maleIndicators.some(ind => v.name.toLowerCase().includes(ind)));
            if (explicitMaleEn) {
                console.log(`Auto-selected English explicit male voice: ${explicitMaleEn.name} (${explicitMaleEn.lang})`);
                return explicitMaleEn;
            }
            console.log(`Auto-selected English voice (non-female): ${englishMaleVoices[0].name} (${englishMaleVoices[0].lang})`);
            return englishMaleVoices[0];
        }

        // Last resort: Use any English voice available
        const anyEnglishVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        if (anyEnglishVoice) {
            console.log(`Using fallback English voice: ${anyEnglishVoice.name}`);
            return anyEnglishVoice;
        }

        // Final fallback: Use first available voice
        if (voices.length > 0) {
            console.log(`Using first available voice: ${voices[0].name}`);
            return voices[0];
        }

        console.error('No voices available at all');
        return null;
    }

    getCuratedVoiceInfo(voiceName) {
        // ONLY MALE VOICES - NO FEMALE VOICES ALLOWED
        const curatedVoices = [
            { name: 'Microsoft James - English (Australia)', fallbacks: ['Microsoft James', 'James'] },
            { name: 'Google UK English Male', fallbacks: ['Google UK English Male'] },
            { name: 'Alex (Enhanced)', fallbacks: ['Alex'] },
            { name: 'Daniel (Enhanced)', fallbacks: ['Daniel'] }
            // REMOVED ALL FEMALE VOICES: Catherine, Karen, etc.
        ];

        return curatedVoices.find(v => v.name === voiceName);
    }

    populateVoiceOptions() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;

        const voices = speechSynthesis.getVoices();

        // Clear existing options except the first "Auto" option
        while (voiceSelect.children.length > 1) {
            voiceSelect.removeChild(voiceSelect.lastChild);
        }

        // ONLY MALE VOICES - NO FEMALE VOICES IN DROPDOWN
        const curatedVoices = [
            { name: 'Microsoft James - English (Australia)', fallbacks: ['Microsoft James', 'James'], flag: '🇦🇺', gender: '♂️' },
            { name: 'Google UK English Male', fallbacks: ['Google UK English Male'], flag: '🇬🇧', gender: '♂️' },
            { name: 'Alex (Enhanced)', fallbacks: ['Alex'], flag: '🇺🇸', gender: '♂️' },
            { name: 'Daniel (Enhanced)', fallbacks: ['Daniel'], flag: '🇺🇸', gender: '♂️' }
            // REMOVED ALL FEMALE VOICES FROM DROPDOWN
        ];

        // Add curated voices to dropdown
        curatedVoices.forEach(curatedVoice => {
            // Try to find the actual voice
            let actualVoice = null;
            for (const name of [curatedVoice.name, ...curatedVoice.fallbacks]) {
                actualVoice = voices.find(v => v.name === name || v.name.includes(name));
                if (actualVoice) break;
            }

            // Add option even if voice not found (will fallback to auto selection)
            const option = document.createElement('option');
            option.value = curatedVoice.name;
            option.textContent = `${curatedVoice.gender} ${curatedVoice.name.split(' - ')[0]} ${curatedVoice.flag}`;

            // Mark as available or unavailable
            if (actualVoice) {
                option.style.fontWeight = 'normal';
            } else {
                option.style.fontWeight = 'lighter';
                option.style.color = '#999';
                option.textContent += ' (fallback)';
            }

            voiceSelect.appendChild(option);
        });

        console.log('Populated curated voice presets');
    }

    setPreferredVoice(voiceName) {
        this.preferredVoice = voiceName === 'auto' ? null : voiceName;
        console.log(`Voice preference changed to: ${this.preferredVoice || 'auto'}`);

        // Emit voice change event
        window.eventBus.emit('voice:preferenceChanged', {
            voiceName: this.preferredVoice || 'auto'
        });
    }

    getPreferredVoice() {
        return this.preferredVoice;
    }

    getAllAvailableVoices() {
        return speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    }
}

// Global voice selector instance
window.voiceSelector = new VoiceSelector();