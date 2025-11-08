/**
 * Centralized Configuration Management (TypeScript)
 *
 * Type-safe configuration for the PTE Pronunciation Trainer.
 * This will gradually replace src/js/shared/Config.js during the TypeScript migration.
 */
import type { AppConfig as AppConfigType, ConfigPath } from '../../types';
/**
 * Application Configuration Class
 * Provides type-safe access to all application settings
 */
export declare class AppConfig {
    private config;
    constructor();
    /**
     * Initialize the complete configuration object
     */
    private initializeConfig;
    /**
     * Get configuration value using dot notation
     * Type-safe version of the original get() method
     *
     * @example
     * config.get('app.name') // Returns: 'PTE Pronunciation Trainer'
     * config.get('events.audio.autoplay.start') // Returns: 'audio:autoplay:start'
     */
    get<T = any>(path: ConfigPath, defaultValue?: T): T;
    /**
     * Set configuration value using dot notation
     */
    set(path: ConfigPath, value: any): void;
    /**
     * Get all configuration
     */
    getAll(): AppConfigType;
    /**
     * Merge configuration
     */
    merge(newConfig: Partial<AppConfigType>): void;
    /**
     * Get nested value from object using dot notation
     * @private
     */
    private getNestedValue;
    /**
     * Set nested value in object using dot notation
     * @private
     */
    private setNestedValue;
    /**
     * Deep merge two objects
     * @private
     */
    private deepMerge;
}
export declare const appConfig: AppConfig;
export default appConfig;
//# sourceMappingURL=Config.d.ts.map