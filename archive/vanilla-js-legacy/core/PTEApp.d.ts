/**
 * PTEApp - Application coordinator for PTE branch
 *
 * Type-safe main application coordinator
 * Manages module initialization, dependency ordering, and application lifecycle
 */
/**
 * Module validation options
 */
interface ValidationOptions {
    requiredProperties?: string[];
    critical?: boolean;
    customCheck?: (() => boolean) | null;
    customCheckMessage?: string;
}
/**
 * PTEVocabularyTrainer - Main application class
 *
 * Coordinates initialization of all modules
 * Handles keyboard shortcuts, fullscreen, and mobile UX
 */
export declare class PTEVocabularyTrainer {
    private initialized;
    constructor();
    /**
     * Initialize the application
     * Sets up modules in dependency order and emits app:initialized event
     */
    init(): void;
    /**
     * Initialize all application modules in correct dependency order
     * Critical modules will throw errors if initialization fails
     */
    initializeModules(): Promise<void>;
    /**
     * Initialize analytics (PostHog)
     * Non-critical - app works without analytics
     */
    initializeAnalytics(): Promise<void>;
    /**
     * Initialize auth store (check for existing Supabase session)
     * Non-critical - app works without authentication
     */
    initializeAuth(): Promise<void>;
    /**
     * Initialize SettingsModule for event-driven settings architecture
     *
     * @throws Error if SettingsModule class not found or initialization fails
     */
    initializeSettingsModule(): Promise<void>;
    /**
     * Validate that a module initialized correctly
     *
     * @param moduleName - Name of the module for logging
     * @param moduleInstance - The module instance to validate
     * @param options - Validation options
     * @returns True if validation passed
     */
    validateModule(moduleName: string, moduleInstance: any, options?: ValidationOptions): boolean;
    /**
     * Initialize DatasetManager for Phase 2 (RS, ASQ, WFD support)
     * Non-critical - logs warning if initialization fails
     */
    initializeDatasetManager(): Promise<void>;
    /**
     * Initialize DataSchema with Config injection (single source of truth)
     */
    initializeDataSchema(): void;
    /**
     * Register service worker for PWA support
     */
    registerServiceWorker(): void;
    /**
     * Setup service worker message handling for background audio
     */
    setupServiceWorkerMessageHandling(): void;
    /**
     * Initialize voices with timeout
     * Waits for voiceschanged event or 3 second timeout
     */
    initializeVoices(): Promise<void>;
    /**
     * Setup keyboard shortcuts
     * Space: Play/Pause, Arrows: Navigate, R: Repeat, F: Fullscreen, Esc: Settings
     */
    setupKeyboardShortcuts(): void;
    /**
     * Setup fullscreen functionality
     * Handled by keyboard shortcut listener
     */
    setupFullscreen(): void;
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen(): void;
    /**
     * Restore UI state from settings
     * Restores learning mode, category, difficulty, repeat mode, voice
     */
    restoreUIState(): Promise<void>;
    /**
     * Detect if running on mobile device
     */
    isMobileDevice(): boolean;
    /**
     * Show mobile loading indicator
     */
    showMobileLoadingIndicator(): void;
    /**
     * Hide mobile loading indicator
     */
    hideMobileLoadingIndicator(): void;
}
/**
 * Global type declarations
 */
declare global {
    interface Window {
        pteApp: PTEVocabularyTrainer;
        initializing: boolean;
        PTEVocabularyTrainer: typeof PTEVocabularyTrainer;
    }
}
export default PTEVocabularyTrainer;
//# sourceMappingURL=PTEApp.d.ts.map