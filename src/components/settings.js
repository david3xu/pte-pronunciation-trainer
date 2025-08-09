/**
 * Settings Panel Component for CCL Pronunciation Trainer
 * Handles user preferences and configuration
 */

class SettingsComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            collapsible: true,
            saveAutomatically: true,
            showAdvanced: false,
            ...options
        };
        
        this.settings = {
            speechRate: 1.0,
            speechPitch: 1.0,
            speechVoice: '',
            playDelay: 3000,
            repeatMode: 'loop',
            shuffleTerms: false,
            theme: 'light',
            autoSave: true,
            showTranslations: true,
            playbackMode: 'both' // 'english', 'chinese', 'both'
        };
        
        this.callbacks = {
            onChange: () => {},
            onReset: () => {}
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.render();
        this.bindEvents();
        console.log('Settings component initialized');
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem('ccl-trainer-settings');
            if (stored) {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    saveSettings() {
        if (!this.options.saveAutomatically) return;
        
        try {
            localStorage.setItem('ccl-trainer-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    render() {
        const template = `
            <div class="settings-component ${this.options.collapsible ? 'settings--collapsible' : ''}">
                ${this.options.collapsible ? this.renderHeader() : ''}
                <div class="settings-content" data-settings-content>
                    ${this.renderBasicSettings()}
                    ${this.options.showAdvanced ? this.renderAdvancedSettings() : ''}
                    ${this.renderActions()}
                </div>
            </div>
        `;
        
        this.container.innerHTML = template;
        this.cacheElements();
        this.updateDisplay();
    }

    renderHeader() {
        return `
            <div class="settings-header" data-settings-header>
                <h3 class="settings-title">Settings</h3>
                <button class="settings-toggle" data-settings-toggle aria-label="Toggle settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                    </svg>
                </button>
            </div>
        `;
    }

    renderBasicSettings() {
        return `
            <div class="settings-section">
                <h4 class="settings-section-title">Speech Settings</h4>
                
                <div class="setting-row">
                    <label class="setting-label" for="speech-rate">Speech Speed:</label>
                    <div class="setting-control">
                        <input 
                            type="range" 
                            id="speech-rate" 
                            class="range-slider" 
                            min="0.5" 
                            max="2" 
                            step="0.1" 
                            value="${this.settings.speechRate}"
                            data-setting="speechRate"
                        >
                        <span class="range-value" data-rate-value>${this.settings.speechRate}x</span>
                    </div>
                </div>

                <div class="setting-row">
                    <label class="setting-label" for="play-delay">Pause Between Terms:</label>
                    <select id="play-delay" class="select" data-setting="playDelay">
                        <option value="1000" ${this.settings.playDelay === 1000 ? 'selected' : ''}>1 second</option>
                        <option value="2000" ${this.settings.playDelay === 2000 ? 'selected' : ''}>2 seconds</option>
                        <option value="3000" ${this.settings.playDelay === 3000 ? 'selected' : ''}>3 seconds</option>
                        <option value="4000" ${this.settings.playDelay === 4000 ? 'selected' : ''}>4 seconds</option>
                        <option value="5000" ${this.settings.playDelay === 5000 ? 'selected' : ''}>5 seconds</option>
                    </select>
                </div>

                <div class="setting-row">
                    <label class="setting-label" for="playback-mode">Playback Mode:</label>
                    <select id="playback-mode" class="select" data-setting="playbackMode">
                        <option value="both" ${this.settings.playbackMode === 'both' ? 'selected' : ''}>English + Chinese</option>
                        <option value="english" ${this.settings.playbackMode === 'english' ? 'selected' : ''}>English Only</option>
                        <option value="chinese" ${this.settings.playbackMode === 'chinese' ? 'selected' : ''}>Chinese Only</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h4 class="settings-section-title">Study Options</h4>
                
                <div class="setting-row">
                    <label class="setting-label" for="repeat-mode">Repeat Mode:</label>
                    <select id="repeat-mode" class="select" data-setting="repeatMode">
                        <option value="once" ${this.settings.repeatMode === 'once' ? 'selected' : ''}>Play Once</option>
                        <option value="loop" ${this.settings.repeatMode === 'loop' ? 'selected' : ''}>Loop Category</option>
                        <option value="infinite" ${this.settings.repeatMode === 'infinite' ? 'selected' : ''}>Loop Forever</option>
                    </select>
                </div>

                <div class="setting-row setting-row--checkbox">
                    <input 
                        type="checkbox" 
                        id="shuffle-terms" 
                        class="checkbox" 
                        ${this.settings.shuffleTerms ? 'checked' : ''}
                        data-setting="shuffleTerms"
                    >
                    <label class="setting-label" for="shuffle-terms">Shuffle Terms</label>
                </div>

                <div class="setting-row setting-row--checkbox">
                    <input 
                        type="checkbox" 
                        id="show-translations" 
                        class="checkbox" 
                        ${this.settings.showTranslations ? 'checked' : ''}
                        data-setting="showTranslations"
                    >
                    <label class="setting-label" for="show-translations">Show Translations</label>
                </div>
            </div>
        `;
    }

    renderAdvancedSettings() {
        return `
            <div class="settings-section settings-section--advanced">
                <h4 class="settings-section-title">Advanced Settings</h4>
                
                <div class="setting-row">
                    <label class="setting-label" for="speech-pitch">Speech Pitch:</label>
                    <div class="setting-control">
                        <input 
                            type="range" 
                            id="speech-pitch" 
                            class="range-slider" 
                            min="0.5" 
                            max="2" 
                            step="0.1" 
                            value="${this.settings.speechPitch}"
                            data-setting="speechPitch"
                        >
                        <span class="range-value" data-pitch-value>${this.settings.speechPitch}x</span>
                    </div>
                </div>

                <div class="setting-row">
                    <label class="setting-label" for="theme">Theme:</label>
                    <select id="theme" class="select" data-setting="theme">
                        <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="auto" ${this.settings.theme === 'auto' ? 'selected' : ''}>Auto</option>
                    </select>
                </div>

                <div class="setting-row setting-row--checkbox">
                    <input 
                        type="checkbox" 
                        id="auto-save" 
                        class="checkbox" 
                        ${this.settings.autoSave ? 'checked' : ''}
                        data-setting="autoSave"
                    >
                    <label class="setting-label" for="auto-save">Auto-save Progress</label>
                </div>
            </div>
        `;
    }

    renderActions() {
        return `
            <div class="settings-actions">
                <button class="btn btn--secondary btn--small" data-reset-settings>
                    Reset to Defaults
                </button>
                <button class="btn btn--outline btn--small" data-export-settings>
                    Export Settings
                </button>
                <button class="btn btn--outline btn--small" data-import-settings>
                    Import Settings
                </button>
                <input type="file" accept=".json" style="display: none;" data-file-input>
            </div>
        `;
    }

    cacheElements() {
        this.elements = {
            content: this.container.querySelector('[data-settings-content]'),
            toggle: this.container.querySelector('[data-settings-toggle]'),
            header: this.container.querySelector('[data-settings-header]'),
            rateValue: this.container.querySelector('[data-rate-value]'),
            pitchValue: this.container.querySelector('[data-pitch-value]'),
            resetButton: this.container.querySelector('[data-reset-settings]'),
            exportButton: this.container.querySelector('[data-export-settings]'),
            importButton: this.container.querySelector('[data-import-settings]'),
            fileInput: this.container.querySelector('[data-file-input]')
        };
    }

    bindEvents() {
        // Collapsible header
        if (this.elements.toggle) {
            this.elements.toggle.addEventListener('click', () => {
                this.toggleCollapse();
            });
        }

        // Setting inputs
        const settingInputs = this.container.querySelectorAll('[data-setting]');
        settingInputs.forEach(input => {
            const settingName = input.getAttribute('data-setting');
            
            if (input.type === 'range') {
                input.addEventListener('input', (e) => {
                    this.updateSetting(settingName, parseFloat(e.target.value));
                    this.updateRangeDisplay(settingName, e.target.value);
                });
            } else if (input.type === 'checkbox') {
                input.addEventListener('change', (e) => {
                    this.updateSetting(settingName, e.target.checked);
                });
            } else {
                input.addEventListener('change', (e) => {
                    const value = input.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                    this.updateSetting(settingName, value);
                });
            }
        });

        // Action buttons
        if (this.elements.resetButton) {
            this.elements.resetButton.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => {
                this.exportSettings();
            });
        }

        if (this.elements.importButton) {
            this.elements.importButton.addEventListener('click', () => {
                this.elements.fileInput.click();
            });
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                this.importSettings(e.target.files[0]);
            });
        }
    }

    updateDisplay() {
        // Update range displays
        if (this.elements.rateValue) {
            this.elements.rateValue.textContent = `${this.settings.speechRate}x`;
        }
        
        if (this.elements.pitchValue) {
            this.elements.pitchValue.textContent = `${this.settings.speechPitch}x`;
        }

        // Apply theme
        this.applyTheme();
    }

    updateRangeDisplay(settingName, value) {
        if (settingName === 'speechRate' && this.elements.rateValue) {
            this.elements.rateValue.textContent = `${value}x`;
        } else if (settingName === 'speechPitch' && this.elements.pitchValue) {
            this.elements.pitchValue.textContent = `${value}x`;
        }
    }

    updateSetting(name, value) {
        this.settings[name] = value;
        this.saveSettings();
        this.callbacks.onChange(name, value, this.settings);

        // Apply immediate changes
        if (name === 'theme') {
            this.applyTheme();
        }
    }

    applyTheme() {
        const theme = this.settings.theme;
        const body = document.body;
        
        body.classList.remove('theme-light', 'theme-dark');
        
        if (theme === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            body.classList.add(`theme-${theme}`);
        }
    }

    toggleCollapse() {
        if (!this.elements.content) return;
        
        const isCollapsed = this.elements.content.style.display === 'none';
        
        if (isCollapsed) {
            this.elements.content.style.display = 'block';
            this.elements.toggle.setAttribute('aria-expanded', 'true');
        } else {
            this.elements.content.style.display = 'none';
            this.elements.toggle.setAttribute('aria-expanded', 'false');
        }
        
        // Rotate toggle icon
        if (this.elements.toggle) {
            this.elements.toggle.classList.toggle('rotated', !isCollapsed);
        }
    }

    resetSettings() {
        if (confirm('Reset all settings to defaults?')) {
            const defaults = {
                speechRate: 1.0,
                speechPitch: 1.0,
                speechVoice: '',
                playDelay: 3000,
                repeatMode: 'loop',
                shuffleTerms: false,
                theme: 'light',
                autoSave: true,
                showTranslations: true,
                playbackMode: 'both'
            };
            
            this.settings = { ...defaults };
            this.saveSettings();
            this.render();
            this.bindEvents();
            this.callbacks.onReset(this.settings);
            
            console.log('Settings reset to defaults');
        }
    }

    exportSettings() {
        const data = {
            settings: this.settings,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ccl-trainer-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log('Settings exported');
    }

    async importSettings(file) {
        if (!file) return;
        
        try {
            const text = await this.readFile(file);
            const data = JSON.parse(text);
            
            if (data.settings) {
                this.settings = { ...this.settings, ...data.settings };
                this.saveSettings();
                this.render();
                this.bindEvents();
                this.callbacks.onChange('imported', this.settings, this.settings);
                
                console.log('Settings imported successfully');
                alert('Settings imported successfully!');
            } else {
                throw new Error('Invalid settings file format');
            }
        } catch (error) {
            console.error('Failed to import settings:', error);
            alert('Failed to import settings: ' + error.message);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    getSettings() {
        return { ...this.settings };
    }

    setSetting(name, value) {
        this.updateSetting(name, value);
        
        // Update UI
        const input = this.container.querySelector(`[data-setting="${name}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = value;
            } else {
                input.value = value;
            }
            
            if (input.type === 'range') {
                this.updateRangeDisplay(name, value);
            }
        }
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    destroy() {
        this.container.innerHTML = '';
        console.log('Settings component destroyed');
    }
}

// Export as global for browser use
window.SettingsComponent = SettingsComponent;