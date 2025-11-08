/**
 * SettingsPanel - Settings panel management and interaction
 *
 * Type-safe UI controller for settings panel
 * Manages practice mode switching, settings persistence, import/export
 */

/**
 * Saved settings structure
 */
interface SavedSettings {
  difficulty?: string;
  speed?: string;
  delay?: string;
  repeat?: string;
  voice?: string;
  learningMode?: string;
  practiceMode?: string;
  exportDate?: string;
  version?: string;
  [key: string]: any;
}

/**
 * Practice mode mapping structure
 */
interface PracticeModeMapping {
  type: string;
  defaultPracticeDataset?: string;
}

/**
 * SettingsPanel - Manages settings UI and persistence
 *
 * Event-driven settings management via SettingsModule
 * Handles practice mode switching between vocabulary and practice modes
 */
export class SettingsPanel {
  private isOpen: boolean = false;
  private config: any;

  constructor() {
    this.config = (window as any).appConfig || new (window as any).AppConfig();
    this.setupSettingsPanel();
  }

  /**
   * Initialize settings panel with event listeners
   */
  setupSettingsPanel(): void {
    // Settings panel uses SettingsModule (event-driven)

    // Settings panel toggle
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', () => {
        this.togglePanel();
      });

      // Close button handler
      if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
          this.closePanel();
        });
      }

      // Close settings when clicking outside
      document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as Node;
        if (!settingsPanel.contains(target) && !settingsBtn.contains(target)) {
          this.closePanel();
        }
      });
    }

    // Phase 2: Setup practice mode switching
    this.setupPracticeModeSwitch();

    // Listen for voice changes to update dropdown (from Config.js)
    const voicePreferenceChangedEvent = (window as any).appConfig?.get('events.voice.preference.changed') || 'voice:preference:changed';
    (window as any).eventBus.on(voicePreferenceChangedEvent, (data: any) => {
      this.updateVoiceSelection(data.voiceName);
    });

    // Listen for settings changes to persist them
    this.setupSettingsPersistence().catch(console.error);
  }

  /**
   * Phase 2: Setup practice mode switching between Vocabulary/RS/ASQ/WFD
   */
  setupPracticeModeSwitch(): void {
    const practiceModeSelect = document.getElementById('practiceModeSelect') as HTMLSelectElement | null;
    const vocabularyBookSetting = document.getElementById('vocabularyBookSetting');
    const practiceDatasetSetting = document.getElementById('practiceDatasetSetting');

    if (!practiceModeSelect) return; // Phase 2 not loaded

    // IMPORTANT: Initialize window.currentPracticeMode from dropdown value
    // This ensures mode is set even before settings are loaded
    const defaultPracticeMode = (window as any).appConfig?.get('data.defaults.practiceMode') || 'vocabulary';
    const initialMode = practiceModeSelect.value || defaultPracticeMode;
    (window as any).currentPracticeMode = initialMode;
    console.log(`[SettingsPanel] Initial practice mode from dropdown: ${(window as any).currentPracticeMode}`);

    // Initialize dataset dropdown with filtered options for initial mode
    const modeMapping = (window as any).appConfig?.get('data.practiceModeMapping');
    const mapping: PracticeModeMapping | undefined = modeMapping && modeMapping[initialMode];
    const isVocabularyMode = mapping && mapping.type === 'vocabulary';

    if (!isVocabularyMode && (window as any).uiController) {
      const defaultDataset = mapping?.defaultPracticeDataset || null;
      (window as any).uiController.populateDropdown('practiceDatasetSelect', 'practiceDataset', defaultDataset, initialMode);
      console.log(`[SettingsPanel] 🔄 Initialized dataset dropdown for mode: ${initialMode}`);
    }

    // Handle practice mode changes
    practiceModeSelect.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLSelectElement;
      const mode = target.value;
      console.log(`[SettingsPanel] 🎯 Practice mode changed to: ${mode}`);

      // Show/hide appropriate dataset selectors using Config.js mapping
      const modeMapping = (window as any).appConfig?.get('data.practiceModeMapping');
      const mapping: PracticeModeMapping | undefined = modeMapping && modeMapping[mode];
      const isVocabularyMode = mapping && mapping.type === 'vocabulary';

      if (isVocabularyMode) {
        if (vocabularyBookSetting) vocabularyBookSetting.style.display = 'block';
        if (practiceDatasetSetting) practiceDatasetSetting.style.display = 'none';
      } else {
        if (vocabularyBookSetting) vocabularyBookSetting.style.display = 'none';
        if (practiceDatasetSetting) practiceDatasetSetting.style.display = 'block';

        // Repopulate practiceDatasetSelect with filtered options for the current mode
        const practiceDatasetSelect = document.getElementById('practiceDatasetSelect');
        if (practiceDatasetSelect && (window as any).uiController) {
          // Get default dataset for this mode
          const defaultDataset = mapping?.defaultPracticeDataset || null;

          // Repopulate with filtered datasets (only show datasets matching this mode's type)
          (window as any).uiController.populateDropdown('practiceDatasetSelect', 'practiceDataset', defaultDataset, mode);
          console.log(`[SettingsPanel] 🔄 Repopulated dataset dropdown for mode: ${mode}`);
        }
      }

      // INSTEAD of emitting both events, just save the setting
      // SettingsModule will emit the mode:practice:changed event
      // This prevents circular event references
      console.log(`[SettingsPanel] 📤 Saving practiceMode setting: ${mode}`);
      this.saveSetting('practiceMode', mode);
    });
  }

  /**
   * Setup settings persistence - load saved settings from SettingsModule
   */
  async setupSettingsPersistence(): Promise<void> {
    // Load saved settings from SettingsModule
    if (!(window as any).settingsModule) {
      console.warn('⚠️ SettingsModule not available - using fallback initialization');
      // Wait for SettingsModule to become available (it will be initialized by PTEApp)
      await this.waitForSettingsModule();
      if (!(window as any).settingsModule) {
        console.error('❌ SettingsModule still not available after waiting - settings persistence disabled');
        return;
      }
    }

    // Make sure the SettingsModule has the get method
    if (!(window as any).settingsModule.exportSettings) {
      console.error('❌ SettingsModule.exportSettings method not available - settings persistence disabled');
      return;
    }

    const savedSettings: SavedSettings = (window as any).settingsModule.exportSettings();

    // Apply settings to UI elements (UIController handles dropdown population)
    this.applySettingToElement('difficultySelect', savedSettings.difficulty);
    this.applySettingToElement('speedSelect', savedSettings.speed);
    this.applySettingToElement('delaySelect', savedSettings.delay);
    this.applySettingToElement('repeatSelect', savedSettings.repeat);
    const defaultVoice = (window as any).appConfig?.get('data.defaults.voice') || 'auto';
    this.applySettingToElement('voiceSelect', savedSettings.voice || defaultVoice);
    this.applySettingToElement('learningModeSelect', savedSettings.learningMode);

    // IMPORTANT: Restore saved practice mode (vocabulary/rs/asq/wfd)
    const defaultPracticeMode = (window as any).appConfig?.get('data.defaults.practiceMode') || 'vocabulary';
    const savedPracticeMode = savedSettings.practiceMode || defaultPracticeMode;
    console.log(`[SettingsPanel] Saved practice mode from settings: ${savedPracticeMode}`);
    this.applySettingToElement('practiceModeSelect', savedPracticeMode);

    // Update window.currentPracticeMode (may have been initialized earlier)
    (window as any).currentPracticeMode = savedPracticeMode;
    console.log(`[SettingsPanel] Set window.currentPracticeMode to: ${savedPracticeMode}`);

    // If practice mode is not vocabulary, load the dataset (use Config.js mapping)
    const modeMapping = (window as any).appConfig?.get('data.practiceModeMapping');
    const mapping: PracticeModeMapping | undefined = modeMapping && modeMapping[savedPracticeMode];
    const isVocabularyMode = mapping && mapping.type === 'vocabulary';

    if (!isVocabularyMode && (window as any).uiController) {
      console.log(`[SettingsPanel] Restoring practice mode: ${savedPracticeMode}, calling handlePracticeModeChange...`);
      (window as any).uiController.handlePracticeModeChange(savedPracticeMode);
    } else if (!isVocabularyMode) {
      console.warn(`[SettingsPanel] ⚠️ window.uiController not available, cannot restore mode ${savedPracticeMode}`);
    }

    // Settings are automatically applied through event listeners in engines
    // No need to call setters directly anymore
  }

  /**
   * Toggle settings panel open/close
   */
  togglePanel(): void {
    const settingsPanel = document.getElementById('settingsPanel');
    if (!settingsPanel) return;

    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.openPanel();
    } else {
      this.closePanel();
    }
  }

  /**
   * Open settings panel
   */
  openPanel(): void {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      settingsPanel.classList.add('active');
      settingsPanel.classList.remove('collapsed');
      this.isOpen = true;

      // Emit panel opened event (standardized from Config.js)
      const panelOpenedEvent = (window as any).appConfig.get('events.settings.panel.opened');
      (window as any).eventBus.emit(panelOpenedEvent, {
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Close settings panel
   */
  closePanel(): void {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      settingsPanel.classList.remove('active');
      settingsPanel.classList.add('collapsed');
      this.isOpen = false;

      // Emit panel closed event (standardized from Config.js)
      const panelClosedEvent = (window as any).appConfig.get('events.settings.panel.closed');
      (window as any).eventBus.emit(panelClosedEvent, {
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Apply a setting value to a DOM element
   */
  applySettingToElement(elementId: string, value: any): void {
    const element = document.getElementById(elementId) as HTMLInputElement | HTMLSelectElement | null;
    if (element && value !== null && value !== undefined) {
      element.value = value;
    }
  }

  /**
   * Update voice selection dropdown
   */
  updateVoiceSelection(voiceName: string): void {
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement | null;
    if (voiceSelect) {
      const defaultVoice = (window as any).appConfig?.get('data.defaults.voice') || 'auto';
      voiceSelect.value = voiceName || defaultVoice;
    }
  }

  /**
   * Export settings to JSON file
   */
  exportSettings(): void {
    // Use SettingsModule to get all settings
    if (!(window as any).settingsModule) {
      console.error('❌ SettingsModule not available - cannot export settings');
      return;
    }
    const settings: SavedSettings = (window as any).settingsModule.exportSettings();

    // Add export metadata
    settings.exportDate = new Date().toISOString();
    settings.version = this.config.get('ui.labels.version');

    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = this.config.get('ui.labels.exportFilename');
    link.click();

    URL.revokeObjectURL(url);

    // Emit export event (standardized from Config.js)
    const settingsExportedEvent = (window as any).appConfig.get('events.settings.exported');
    (window as any).eventBus.emit(settingsExportedEvent, {
      settingsCount: Object.keys(settings).length - 2, // Exclude exportDate and version
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Import settings from JSON data
   */
  importSettings(settingsData: string | SavedSettings): boolean {
    try {
      const settings: SavedSettings = typeof settingsData === 'string' ? JSON.parse(settingsData) : settingsData;

      // Validate settings structure
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings format');
      }

      // Use SettingsModule to import settings
      if (!(window as any).settingsModule) {
        console.error('❌ SettingsModule not available - cannot import settings');
        return false;
      }

      // Import settings through SettingsModule
      const result = (window as any).settingsModule.importSettings(settings);

      if (result) {
        // Emit import event (standardized from Config.js)
        const settingsImportedEvent = (window as any).appConfig.get('events.settings.imported');
        (window as any).eventBus.emit(settingsImportedEvent, {
          settingsCount: Object.keys(settings).length - 2,
          timestamp: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      console.error('Settings import failed:', error);
      (window as any).progressTracker.showError('Failed to import settings');
      return false;
    }
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings(): void {
    // Use SettingsModule to reset settings
    if ((window as any).settingsModule) {
      (window as any).settingsModule.resetSettings();
    } else {
      console.error('❌ SettingsModule not available - cannot reset settings');
    }
  }

  /**
   * Check if settings panel is open
   */
  isSettingsPanelOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Save a setting value using SettingsModule events
   */
  saveSetting(key: string, value: any): void {
    // Emit event to request setting change (standardized from Config.js)
    const settingsRequestChangeEvent = (window as any).appConfig.get('events.settings.requestChange');
    (window as any).eventBus.emit(settingsRequestChangeEvent, { key, value });
  }

  /**
   * Helper method to wait for SettingsModule to become available
   * @param timeout - Maximum time to wait in ms
   * @returns True if SettingsModule became available, false if timed out
   */
  async waitForSettingsModule(timeout: number = 3000): Promise<boolean> {
    console.log(`[SettingsPanel] Waiting for SettingsModule to be initialized (timeout: ${timeout}ms)...`);

    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    return new Promise(resolve => {
      const checkForModule = (): void => {
        if ((window as any).settingsModule) {
          console.log(`[SettingsPanel] SettingsModule is now available after ${Date.now() - startTime}ms`);
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          console.warn(`[SettingsPanel] Timed out waiting for SettingsModule after ${timeout}ms`);
          resolve(false);
          return;
        }

        setTimeout(checkForModule, checkInterval);
      };

      checkForModule();
    });
  }
}

// Global settings panel instance
const settingsPanel = new SettingsPanel();

// Expose as global reference for PTE app
(window as any).settingsPanel = settingsPanel;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    settingsPanel: SettingsPanel;
    currentPracticeMode: string;
  }
}

// Export for module use
export default settingsPanel;
