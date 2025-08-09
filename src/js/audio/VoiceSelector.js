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
        
        // Auto mode: prefer Microsoft James (user's favorite) as default
        const voicePreferences = [
            'Microsoft James - English (Australia)',
            'Microsoft James',
            'James',
            'Google UK English Male',
            'Alex (Enhanced)',
            'Alex',
            'Microsoft Catherine - English (Australia)', 
            'Microsoft Catherine',
            'Google UK English Female',
            'Karen (Enhanced)',
            'Karen'
        ];
        
        // Try to find preferred voices in order
        for (const preferredName of voicePreferences) {
            const voice = voices.find(v => 
                v.name === preferredName || v.name.includes(preferredName)
            );
            if (voice) {
                console.log(`Auto-selected voice: ${voice.name} (${voice.lang})`);
                return voice;
            }
        }
        
        // Last resort: any English voice
        const fallbackVoice = voices.find(v => v.lang.startsWith('en'));
        if (fallbackVoice) {
            console.log(`Using fallback voice: ${fallbackVoice.name}`);
        }
        return fallbackVoice;
    }

    getCuratedVoiceInfo(voiceName) {
        const curatedVoices = [
            { name: 'Microsoft James - English (Australia)', fallbacks: ['Microsoft James', 'James'] },
            { name: 'Google UK English Male', fallbacks: ['Google UK English Male'] },
            { name: 'Alex (Enhanced)', fallbacks: ['Alex'] },
            { name: 'Microsoft Catherine - English (Australia)', fallbacks: ['Microsoft Catherine', 'Catherine'] },
            { name: 'Google UK English Female', fallbacks: ['Google UK English Female'] },
            { name: 'Karen (Enhanced)', fallbacks: ['Karen'] }
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
        
        // Curated static voice presets - always available
        const curatedVoices = [
            // Male voices (2-3 options)
            { name: 'Microsoft James - English (Australia)', fallbacks: ['Microsoft James', 'James'], flag: '🇦🇺', gender: '♂️' },
            { name: 'Google UK English Male', fallbacks: ['Google UK English Male'], flag: '🇬🇧', gender: '♂️' },
            { name: 'Alex (Enhanced)', fallbacks: ['Alex'], flag: '🇺🇸', gender: '♂️' },
            
            // Female voices (2-3 options)  
            { name: 'Microsoft Catherine - English (Australia)', fallbacks: ['Microsoft Catherine', 'Catherine'], flag: '🇦🇺', gender: '♀️' },
            { name: 'Google UK English Female', fallbacks: ['Google UK English Female'], flag: '🇬🇧', gender: '♀️' },
            { name: 'Karen (Enhanced)', fallbacks: ['Karen'], flag: '🇦🇺', gender: '♀️' }
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