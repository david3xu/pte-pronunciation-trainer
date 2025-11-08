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
export declare class SettingsModule {
    private config;
    private eventBus;
    private storage;
    private settings;
    private handlers;
    constructor(config?: any, eventBus?: any, storage?: any);
    /**
     * Initialize setting handlers - declarative configuration for all settings
     */
    private initializeHandlers;
    /**
     * Handle setting change request
     * Flow: validate → apply → persist → emit
     */
    handleSettingChange({ key, value }: SettingChangeRequest): Promise<SettingChangeResult>;
    /**
     * Get current setting value
     */
    getSetting(key: string): any;
    /**
     * Alias for getSetting
     */
    get(key: string): any;
    /**
     * Update a setting
     */
    updateSetting(key: string, value: any): Promise<SettingChangeResult>;
    /**
     * Get all current settings
     */
    getAllSettings(): Record<string, any>;
    /**
     * Reset all settings to defaults
     */
    resetSettings(): Promise<void>;
    /**
     * Batch update multiple settings
     */
    batchUpdate(settingsObject: Record<string, any>): Promise<Record<string, SettingChangeResult>>;
    /**
     * Load settings from storage AND apply them
     */
    loadSettings(): void;
    /**
     * Get available options for a setting (for dropdown population)
     */
    getAvailableOptions(key: string, filterType?: string | null): SettingOption[];
    /**
     * Export settings as JSON
     */
    exportSettings(): SettingsExport;
    /**
     * Import settings from JSON
     */
    importSettings(settingsData: SettingsExport): Promise<Record<string, SettingChangeResult>>;
    /**
     * Check if voice name is valid
     * @private
     */
    private isValidVoice;
    /**
     * Get handler information for debugging
     */
    getHandlerInfo(key: string): HandlerInfo | null;
    /**
     * Get all handlers information
     */
    getAllHandlers(): HandlerInfo[];
}
declare global {
    interface Window {
        SettingsModule: typeof SettingsModule;
    }
}
export default SettingsModule;
//# sourceMappingURL=SettingsModule.d.ts.map