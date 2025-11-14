/**
 * SettingsModule - Type-Safe Centralized Settings Management
 *
 * Single source of truth for ALL application settings with Zustand state management.
 * Handles validation, application to engines, persistence, and store updates.
 *
 * ARCHITECTURE: Zustand state management
 * - View Layer calls settings.updateSetting() directly (or via SettingsModule)
 * - SettingsModule validates, applies, persists, and updates Zustand store
 * - Components subscribe to settings store changes and react automatically
 * - Replaces EventBus emissions with direct store actions
 *
 * TypeScript version of src/js/core/SettingsModule.js
 */

import type { Difficulty, PracticeMode, VocabularyCategory } from '../../types';
import { useAppStore } from '../stores';

/**
 * Setting handler configuration
 */
interface SettingHandler<T = any> {
  validate?: (value: T) => boolean;
  apply?: (value: T) => void | Promise<void>;
  default: () => T;
  storageKey: string;
  description: string;
}

/**
 * Setting handlers registry
 */
interface SettingHandlers {
  speed: SettingHandler<string>;
  delay: SettingHandler<string>;
  repeat: SettingHandler<string>;
  voice: SettingHandler<string>;
  difficulty: SettingHandler<Difficulty | 'all'>;
  learningMode: SettingHandler<VocabularyCategory>;
  practiceMode: SettingHandler<PracticeMode>;
  practiceDataset: SettingHandler<string>;
}

/**
 * Setting change request
 */
interface SettingChangeRequest {
  key: string;
  value: any;
}

/**
 * Setting change result
 */
interface SettingChangeResult {
  success: boolean;
  key?: string;
  value?: any;
  error?: string;
}

/**
 * Settings export format
 */
interface SettingsExport {
  version: string;
  timestamp: number;
  settings: Record<string, any>;
}

/**
 * Available option for dropdowns
 */
interface SettingOption {
  id: string;
  label: string;
  type?: string;
}

/**
 * Handler information for debugging
 */
interface HandlerInfo {
  key: string;
  description: string;
  currentValue: any;
  defaultValue: any;
  hasValidation: boolean;
  hasApplication: boolean;
  storageKey: string;
}

/**
 * Type-safe Settings Module
 * Centralized management of all application settings
 */
export class SettingsModule {
  private config: any;
  private eventBus: any;
  private storage: any;
  private settings: Record<string, any> = {};
  private handlers: SettingHandlers;

  constructor(config?: any, eventBus?: any, storage?: any) {
    // Dependencies
    this.config = config || (typeof window !== 'undefined' && (window as any).appConfig);
    this.eventBus = eventBus || (typeof window !== 'undefined' && (window as any).eventBus);
    this.storage = storage || (typeof window !== 'undefined' && (window as any).storage);

    if (!this.config || !this.eventBus || !this.storage) {
      const missing: string[] = [];
      if (!this.config) missing.push('config');
      if (!this.eventBus) missing.push('eventBus');
      if (!this.storage) missing.push('storage');
      const errorMsg = `SettingsModule: Missing dependencies: ${missing.join(', ')}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Initialize handlers
    this.handlers = this.initializeHandlers();

    // Load settings from storage
    this.loadSettings();

    // Note: No EventBus listener needed - UI calls updateSetting() directly via Zustand store

    console.log('✅ SettingsModule: Initialized with', Object.keys(this.handlers).length, 'handlers');
  }

  /**
   * Initialize setting handlers - declarative configuration for all settings
   */
  private initializeHandlers(): SettingHandlers {
    return {
      // ===== AUDIO SETTINGS =====

      speed: {
        validate: (value: string): boolean => {
          const speeds = Object.values(this.config.get('tts.speeds'));
          return speeds.includes(parseFloat(value));
        },
        apply: (value: string): void => {
          if (typeof window !== 'undefined' && (window as any).ttsEngine) {
            (window as any).ttsEngine.speechRate = parseFloat(value);
            console.log(`[SettingsModule] Speed set to ${value} (event-driven)`);
          }
        },
        default: (): string => String(this.config.get('tts.speeds.slow')),
        storageKey: 'speed',
        description: 'TTS speech rate (slow/normal/fast)'
      },

      delay: {
        validate: (value: string): boolean => {
          const delays = this.config.get('tts.delays');
          const userDelays = {
            short: delays.short,
            normal: delays.normal,
            long: delays.long
          };
          return Object.values(userDelays).includes(parseInt(value));
        },
        apply: (value: string): void => {
          if (typeof window !== 'undefined' && (window as any).audioControls) {
            (window as any).audioControls.delay = parseInt(value);
            console.log(`[SettingsModule] Delay set to ${value}ms (event-driven)`);
          }
        },
        default: (): string => String(this.config.get('tts.delays.long')),
        storageKey: 'delay',
        description: 'Pause duration between words (1/2/3 seconds)'
      },

      repeat: {
        validate: (value: string): boolean => {
          return this.config.get('tts.repeatModes').includes(value);
        },
        apply: (value: string): void => {
          console.log(`[SettingsModule] Repeat mode changed to ${value} (event-driven)`);
          if (typeof window !== 'undefined' && (window as any).ttsEngine) {
            (window as any).ttsEngine.currentRepeatCount = 0;
          }
        },
        default: (): string => this.config.get('data.defaults.repeat'),
        storageKey: 'repeat',
        description: 'Repeat mode (once/twice/intensive/loop)'
      },

      voice: {
        validate: (value: string): boolean => {
          const defaultVoice = this.config.get('data.defaults.voice');
          return value === defaultVoice || this.isValidVoice(value);
        },
        apply: (value: string): void => {
          if (typeof window !== 'undefined' && (window as any).voiceSelector?.setPreferredVoice) {
            (window as any).voiceSelector.setPreferredVoice(value);
          } else {
            console.warn('⚠️ VoiceSelector not ready yet, voice setting deferred');
          }
        },
        default: (): string => this.config.get('data.defaults.voice'),
        storageKey: 'voice',
        description: 'TTS voice (auto or specific voice name)'
      },

      // ===== VOCABULARY SETTINGS =====

      difficulty: {
        validate: (value: Difficulty | 'all'): boolean => {
          return this.config.get('data.difficulties').includes(value);
        },
        apply: (value: Difficulty | 'all'): void => {
          if (typeof window !== 'undefined' && (window as any).pteVocabularyManager?.setDifficulty) {
            (window as any).pteVocabularyManager.setDifficulty(value);
          } else {
            console.warn('⚠️ PTEVocabularyManager not ready yet, difficulty setting deferred');
          }
        },
        default: (): Difficulty | 'all' => this.config.get('data.defaults.difficulty'),
        storageKey: 'difficulty',
        description: 'Difficulty filter (all/easy/normal/hard)'
      },

      learningMode: {
        validate: (value: VocabularyCategory): boolean => {
          const modes = this.config.get('data.learningModes');
          return modes.some((m: any) => m.id === value);
        },
        apply: async (value: VocabularyCategory): Promise<void> => {
          if (typeof window !== 'undefined' && (window as any).pteVocabularyManager?.setLearningMode) {
            await (window as any).pteVocabularyManager.setLearningMode(value);
          } else {
            console.warn('⚠️ PTEVocabularyManager not ready yet, learning mode setting deferred');
          }
        },
        default: (): VocabularyCategory => this.config.get('data.defaults.learningMode'),
        storageKey: 'learningMode',
        description: 'Vocabulary book selection'
      },

      // ===== PRACTICE MODE SETTINGS =====

      practiceMode: {
        validate: (value: PracticeMode): boolean => {
          const modes = this.config.get('data.practiceModes');
          return modes.some((m: any) => m.id === value);
        },
        apply: (value: PracticeMode): void => {
          const oldMode = this.get('practiceMode');

          console.log(`[SettingsModule] Practice mode changing: ${oldMode} → ${value}`);

          // Set global practice mode
          if (typeof window !== 'undefined') {
            (window as any).currentPracticeMode = value;
          }

          // Apply practice mode mapping from Config.js
          const modeMapping = this.config.get('data.practiceModeMapping');
          const mapping = modeMapping?.[value];

          if (mapping) {
            console.log(`[SettingsModule] Applying mode mapping for '${value}':`, mapping);

            if (mapping.usesLearningMode && mapping.defaultLearningMode) {
              const currentLearningMode = this.exportSettings().settings['learningMode'];
              if (!currentLearningMode) {
                console.log(`[SettingsModule] Setting default learning mode: ${mapping.defaultLearningMode}`);
                this.updateSetting('learningMode', mapping.defaultLearningMode);
              }
            }

            if (mapping.usesPracticeDataset && mapping.defaultPracticeDataset) {
              const currentDataset = this.exportSettings().settings['practiceDataset'];
              if (currentDataset !== mapping.defaultPracticeDataset) {
                console.log(`[SettingsModule] Setting practice dataset: ${mapping.defaultPracticeDataset}`);
                this.updateSetting('practiceDataset', mapping.defaultPracticeDataset);
              }
            }
          }

          // Note: Mode change events replaced by Zustand store subscriptions
          // Components subscribe to settings.practiceMode changes
          console.log(`[SettingsModule] Practice mode changed to: ${value} (Zustand will notify subscribers)`);
        },
        default: (): PracticeMode => this.config.get('data.defaults.practiceMode'),
        storageKey: 'practiceMode',
        description: 'Practice type (vocabulary/rs/asq/wfd)'
      },

      practiceDataset: {
        validate: (value: string): boolean => {
          const datasets = this.config.get('data.practiceDatasets');
          return datasets.some((d: any) => d.id === value);
        },
        apply: async (value: string): Promise<void> => {
          // Note: Dataset change event replaced by Zustand store subscriptions
          // Components subscribe to settings.practiceDataset changes
          console.log(`[SettingsModule] Practice dataset changed to: ${value} (Zustand will notify subscribers)`);
        },
        default: (): string => this.config.get('data.defaults.practiceDataset'),
        storageKey: 'practiceDataset',
        description: 'Practice dataset selection (RS/ASQ/WFD)'
      }
    };
  }

  /**
   * Handle setting change request
   * Flow: validate → apply → persist → emit
   */
  async handleSettingChange({ key, value }: SettingChangeRequest): Promise<SettingChangeResult> {
    try {
      // 1. Get handler for this setting
      const handler = (this.handlers as any)[key];
      if (!handler) {
        console.warn(`⚠️ SettingsModule: Unknown setting '${key}'`);
        return { success: false, error: 'Unknown setting', key };
      }

      // 2. Validate value
      if (handler.validate && !handler.validate.call(this, value)) {
        console.warn(`⚠️ SettingsModule: Invalid value for '${key}': ${value}`);
        return { success: false, error: 'Invalid value', key, value };
      }

      // 3. Apply to engine/manager
      if (handler.apply) {
        await handler.apply.call(this, value);
      }

      // 4. Update in-memory cache
      this.settings[key] = value;

      // 5. Persist to storage
      if (handler.storageKey) {
        this.storage.setItem(handler.storageKey, value);
      }

      // 6. Update Zustand store (replaces EventBus emission)
      // Note: Only update store for settings that exist in the store schema
      const storeSettings = useAppStore.getState().settings;
      if (key in storeSettings) {
        useAppStore.getState().settings.updateSetting(key as any, value);
      } else {
        console.log(`[SettingsModule] Setting '${key}' updated but not in Zustand store schema`);
      }

      console.log(`✅ SettingsModule: Updated '${key}' = '${value}'`);
      return { success: true, key, value };

    } catch (error) {
      console.error(`❌ SettingsModule: Error updating '${key}':`, error);
      // Show error via UI store (replaces EventBus emission)
      useAppStore.getState().ui.showNotification(
        `Settings error: ${(error as Error).message}`,
        'error'
      );
      return { success: false, error: (error as Error).message, key, value };
    }
  }

  /**
   * Get current setting value
   */
  getSetting(key: string): any {
    const handler = (this.handlers as any)[key];

    if (this.settings[key] !== undefined) {
      return this.settings[key];
    }

    return handler?.default?.();
  }

  /**
   * Alias for getSetting
   */
  get(key: string): any {
    return this.getSetting(key);
  }

  /**
   * Update a setting
   */
  async updateSetting(key: string, value: any): Promise<SettingChangeResult> {
    return await this.handleSettingChange({ key, value });
  }

  /**
   * Get all current settings
   */
  getAllSettings(): Record<string, any> {
    const allSettings: Record<string, any> = {};

    for (const key of Object.keys(this.handlers)) {
      allSettings[key] = this.getSetting(key);
    }

    return allSettings;
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(): Promise<void> {
    console.log('🔄 SettingsModule: Resetting all settings to defaults...');

    for (const [key, handler] of Object.entries(this.handlers)) {
      const defaultValue = handler.default?.();
      if (defaultValue !== undefined) {
        await this.handleSettingChange({ key, value: defaultValue });
      }
    }

    // Note: Settings reset event replaced by Zustand store subscriptions
    // Components will automatically see all setting changes via their subscriptions
    console.log('✅ SettingsModule: All settings reset (Zustand will notify subscribers)');
  }

  /**
   * Batch update multiple settings
   */
  async batchUpdate(settingsObject: Record<string, any>): Promise<Record<string, SettingChangeResult>> {
    console.log('📦 SettingsModule: Batch updating', Object.keys(settingsObject).length, 'settings...');

    const results: Record<string, SettingChangeResult> = {};

    for (const [key, value] of Object.entries(settingsObject)) {
      results[key] = await this.handleSettingChange({ key, value });
    }

    // Note: Batch update event replaced by Zustand store subscriptions
    // Components will see all individual setting changes via their subscriptions
    console.log('✅ SettingsModule: Batch update complete (Zustand notified subscribers)');
    return results;
  }

  /**
   * Load settings from storage AND apply them
   */
  loadSettings(): void {
    // Load all values from storage
    for (const [key, handler] of Object.entries(this.handlers)) {
      if (handler.storageKey) {
        const value = this.storage.getItem(handler.storageKey);
        if (value !== null) {
          this.settings[key] = value;
        } else {
          const defaultValue = handler.default ? handler.default() : null;
          if (defaultValue !== null) {
            this.settings[key] = defaultValue;
          }
        }
      }
    }

    // Ensure required settings are initialized
    if (!this.settings['practiceMode']) {
      this.settings['practiceMode'] = this.config.get('fallbacks.practiceMode');
      console.log(`[SettingsModule] Initialized missing practiceMode with default: ${this.settings['practiceMode']}`);
    }

    if (!this.settings['repeat']) {
      this.settings['repeat'] = this.config.get('fallbacks.repeatMode');
      console.log(`[SettingsModule] Initialized missing repeat with default: ${this.settings['repeat']}`);
    }

    if (!this.settings['voice']) {
      this.settings['voice'] = this.config.get('settings.defaults.voice');
      console.log(`[SettingsModule] Initialized missing voice with default: ${this.settings['voice']}`);
    }

    console.log('📥 SettingsModule: Loaded', Object.keys(this.settings).length, 'settings from storage');

    // Apply all loaded settings to initialize modules
    for (const [key, value] of Object.entries(this.settings)) {
      const handler = (this.handlers as any)[key];
      if (handler?.apply) {
        try {
          handler.apply.call(this, value);
          console.log(`[SettingsModule] ${key.charAt(0).toUpperCase() + key.slice(1)} set to ${value} (Zustand)`);
        } catch (error) {
          console.warn(`⚠️ SettingsModule: Failed to apply '${key}' during initialization:`, (error as Error).message);
        }

        // Update Zustand store with loaded setting
        const storeSettings = useAppStore.getState().settings;
        if (key in storeSettings) {
          useAppStore.getState().settings.updateSetting(key as any, value);
        }
      }
    }

    console.log('✅ SettingsModule: Applied all initial settings to modules (Zustand updated)');
  }

  /**
   * Get available options for a setting (for dropdown population)
   */
  getAvailableOptions(key: string, filterType: string | null = null): SettingOption[] {
    try {
      if (!this.config) {
        console.error('❌ SettingsModule.getAvailableOptions: config is not available');
        return [];
      }

      if (key === 'speed') {
        const speeds = this.config.get('tts.speeds');
        if (!speeds) return [];
        return Object.keys(speeds).map(k => ({
          id: speeds[k].toString(),
          label: `${k.charAt(0).toUpperCase() + k.slice(1)} (${speeds[k]}x)`
        }));
      }

      if (key === 'delay') {
        const delays = this.config.get('tts.delays');
        if (!delays) return [];
        const userDelays = { short: delays.short, normal: delays.normal, long: delays.long };
        return Object.keys(userDelays).map(k => ({
          id: (userDelays as any)[k].toString(),
          label: `${k.charAt(0).toUpperCase() + k.slice(1)} (${(userDelays as any)[k] / 1000}s)`
        }));
      }

      if (key === 'repeat') {
        const repeatModes = this.config.get('tts.repeatModes');
        if (!repeatModes) return [];
        const labels: Record<string, string> = {
          'once': 'Once (1x)',
          'twice': 'Twice (2x)',
          'intensive': 'Intensive (3x)',
          'loop': 'Loop (Continuous)'
        };
        return repeatModes.map((mode: string) => ({
          id: mode,
          label: labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1)
        }));
      }

      if (key === 'voice') {
        return [];
      }

      const optionsMap: Record<string, any> = {
        difficulty: this.config.get('data.difficulties'),
        learningMode: this.config.get('data.learningModes'),
        practiceMode: this.config.get('data.practiceModes'),
        practiceDataset: this.config.get('data.practiceDatasets')
      };

      let options = optionsMap[key] || [];

      if (key === 'practiceDataset' && filterType) {
        options = options.filter((opt: any) => opt.type === filterType);
      }

      if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'string') {
        return options.map((opt: string) => ({ id: opt, label: opt }));
      }

      return options;
    } catch (error) {
      console.error(`❌ SettingsModule.getAvailableOptions(${key}) error:`, error);
      return [];
    }
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): SettingsExport {
    return {
      version: '1.0',
      timestamp: Date.now(),
      settings: this.getAllSettings()
    };
  }

  /**
   * Import settings from JSON
   */
  async importSettings(settingsData: SettingsExport): Promise<Record<string, SettingChangeResult>> {
    if (!settingsData?.settings) {
      throw new Error('Invalid settings data');
    }

    console.log('📥 SettingsModule: Importing settings...');
    return await this.batchUpdate(settingsData.settings);
  }

  /**
   * Check if voice name is valid
   * @private
   */
  private isValidVoice(voiceName: string): boolean {
    return typeof voiceName === 'string' && voiceName.length > 0;
  }

  /**
   * Get handler information for debugging
   */
  getHandlerInfo(key: string): HandlerInfo | null {
    const handler = (this.handlers as any)[key];
    if (!handler) return null;

    return {
      key,
      description: handler.description,
      currentValue: this.getSetting(key),
      defaultValue: handler.default?.(),
      hasValidation: !!handler.validate,
      hasApplication: !!handler.apply,
      storageKey: handler.storageKey
    };
  }

  /**
   * Get all handlers information
   */
  getAllHandlers(): HandlerInfo[] {
    return Object.keys(this.handlers)
      .map(key => this.getHandlerInfo(key))
      .filter((info): info is HandlerInfo => info !== null);
  }
}

// Export for browser compatibility
declare global {
  interface Window {
    SettingsModule: typeof SettingsModule;
  }
}

if (typeof window !== 'undefined') {
  window.SettingsModule = SettingsModule;
}

// Export for Node.js
export default SettingsModule;
