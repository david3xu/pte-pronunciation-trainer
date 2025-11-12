/**
 * InitializationManager - Manages module initialization with dependency ordering
 *
 * Type-safe dependency injection and initialization orchestrator
 * Uses topological sort (Kahn's algorithm) to resolve module dependencies
 */
/**
 * Module initialization options
 */
export interface ModuleOptions {
    critical?: boolean;
    timeout?: number;
    retries?: number;
    validateFn?: ((instance: any) => Promise<ValidationResult>) | null;
}
/**
 * Validation result
 */
interface ValidationResult {
    valid: boolean;
    message?: string;
}
/**
 * Succeeded module info
 */
interface SucceededModule {
    module: string;
    time: number;
}
/**
 * Failed module info
 */
interface FailedModule {
    module: string;
    error: string;
}
/**
 * Overall initialization results
 */
interface InitializationResults {
    succeeded: SucceededModule[];
    failed: FailedModule[];
    skipped: string[];
    totalTime: number;
}
/**
 * Status summary
 */
interface StatusSummary {
    total: number;
    initialized: number;
    failed: number;
    pending: number;
    modules: {
        initialized: string[];
        failed: string[];
        pending: string[];
    };
}
/**
 * InitializationManager - Dependency-aware module initialization
 *
 * Features:
 * - Topological sort for dependency resolution
 * - Fail-fast for critical modules
 * - Graceful degradation for optional modules
 * - Timeout and retry logic with exponential backoff
 * - Validation functions
 */
export declare class InitializationManager {
    private modules;
    private initializationOrder;
    private dependencies;
    private initialized;
    private failed;
    constructor();
    /**
     * Define dependency relationships between modules
     */
    private _defineDependencies;
    /**
     * Register a module with its initialization function
     *
     * @param name - Module name
     * @param initFn - Async initialization function
     * @param options - Module options (critical, timeout, retries, validateFn)
     */
    register(name: string, initFn: () => Promise<any>, options?: ModuleOptions): void;
    /**
     * Compute initialization order using topological sort (Kahn's algorithm)
     *
     * @returns Ordered list of module names
     */
    private _computeInitializationOrder;
    /**
     * Initialize all registered modules in dependency order
     *
     * @returns Initialization results with succeeded/failed/skipped modules
     */
    initializeAll(): Promise<InitializationResults>;
    /**
     * Initialize a single module with retry logic
     *
     * @param module - Module configuration
     * @returns Result with success, time, error
     */
    private _initializeModule;
    /**
     * Execute a promise with timeout
     *
     * @param promise - Promise to execute
     * @param timeoutMs - Timeout in milliseconds
     * @param moduleName - Module name for error message
     * @returns Original promise or timeout rejection
     */
    private _withTimeout;
    /**
     * Get initialization status
     *
     * @returns Status summary with counts and module lists
     */
    getStatus(): StatusSummary;
    /**
     * Get module instance by name
     *
     * @param name - Module name
     * @returns Module instance or null
     */
    getInstance(name: string): any;
    /**
     * Check if module is initialized
     *
     * @param name - Module name
     * @returns True if initialized
     */
    isInitialized(name: string): boolean;
    /**
     * Visualize dependency graph (for debugging)
     *
     * @returns Mermaid diagram syntax
     */
    visualizeDependencies(): string;
}
/**
 * Global type declarations
 */
declare global {
    interface Window {
        InitializationManager: typeof InitializationManager;
    }
}
export default InitializationManager;
//# sourceMappingURL=InitializationManager.d.ts.map