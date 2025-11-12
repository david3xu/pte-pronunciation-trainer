/**
 * InitializationManager - Manages module initialization with dependency ordering
 *
 * Type-safe dependency injection and initialization orchestrator
 * Uses topological sort (Kahn's algorithm) to resolve module dependencies
 */
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
export class InitializationManager {
    modules = new Map();
    initializationOrder = [];
    dependencies = new Map();
    initialized = new Set();
    failed = new Set();
    constructor() {
        // Define module dependencies (directed acyclic graph)
        this._defineDependencies();
    }
    /**
     * Define dependency relationships between modules
     */
    _defineDependencies() {
        // Format: module → [dependencies]
        // Empty array = no dependencies (can initialize first)
        this.dependencies.set('EventBus', []);
        this.dependencies.set('Storage', []);
        this.dependencies.set('Config', []);
        this.dependencies.set('CacheMigration', []);
        this.dependencies.set('ServiceWorker', []);
        this.dependencies.set('SettingsModule', ['Config', 'EventBus', 'Storage']);
        this.dependencies.set('DatasetManager', ['Config', 'EventBus']);
        this.dependencies.set('PTEVocabularyManager', ['Config', 'EventBus', 'DatasetManager']);
        this.dependencies.set('TTSEngine', ['Config', 'EventBus']);
        this.dependencies.set('AudioControls', ['Config', 'EventBus', 'TTSEngine']);
        this.dependencies.set('VoiceSelector', ['TTSEngine', 'EventBus']);
        this.dependencies.set('ProgressTracker', ['Storage', 'EventBus']);
        this.dependencies.set('UIController', ['Config', 'EventBus', 'SettingsModule']);
        this.dependencies.set('SettingsPanel', ['SettingsModule', 'UIController', 'EventBus']);
        this.dependencies.set('PracticeModes', ['DatasetManager', 'TTSEngine', 'EventBus']);
    }
    /**
     * Register a module with its initialization function
     *
     * @param name - Module name
     * @param initFn - Async initialization function
     * @param options - Module options (critical, timeout, retries, validateFn)
     */
    register(name, initFn, options = {}) {
        this.modules.set(name, {
            name,
            initFn,
            critical: options.critical !== false, // Default to critical
            timeout: options.timeout || 5000,
            retries: options.retries || 0,
            validateFn: options.validateFn || null,
            instance: null
        });
    }
    /**
     * Compute initialization order using topological sort (Kahn's algorithm)
     *
     * @returns Ordered list of module names
     */
    _computeInitializationOrder() {
        const order = [];
        const inDegree = new Map();
        const graph = new Map();
        // Initialize in-degree and adjacency list
        for (const [module, deps] of this.dependencies) {
            if (!inDegree.has(module))
                inDegree.set(module, 0);
            if (!graph.has(module))
                graph.set(module, []);
            for (const dep of deps) {
                if (!graph.has(dep))
                    graph.set(dep, []);
                graph.get(dep).push(module);
                inDegree.set(module, (inDegree.get(module) || 0) + 1);
            }
        }
        // Find all nodes with no dependencies
        const queue = [];
        for (const [module, degree] of inDegree) {
            if (degree === 0)
                queue.push(module);
        }
        // Process queue
        while (queue.length > 0) {
            const current = queue.shift();
            order.push(current);
            for (const neighbor of graph.get(current) || []) {
                const newDegree = (inDegree.get(neighbor) || 0) - 1;
                inDegree.set(neighbor, newDegree);
                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            }
        }
        // Check for cycles
        if (order.length !== inDegree.size) {
            const remaining = Array.from(inDegree.keys()).filter(m => !order.includes(m));
            throw new Error(`Circular dependency detected in modules: ${remaining.join(', ')}`);
        }
        return order;
    }
    /**
     * Initialize all registered modules in dependency order
     *
     * @returns Initialization results with succeeded/failed/skipped modules
     */
    async initializeAll() {
        const startTime = Date.now();
        const results = {
            succeeded: [],
            failed: [],
            skipped: [],
            totalTime: 0
        };
        try {
            // Compute initialization order
            this.initializationOrder = this._computeInitializationOrder();
            console.log(`📋 InitializationManager: Initialization order:`, this.initializationOrder);
            // Initialize modules in order
            for (const moduleName of this.initializationOrder) {
                const module = this.modules.get(moduleName);
                if (!module) {
                    console.log(`⏭️  Skipping ${moduleName} (not registered)`);
                    results.skipped.push(moduleName);
                    continue;
                }
                // Check if dependencies are satisfied
                const deps = this.dependencies.get(moduleName) || [];
                const unsatisfiedDeps = deps.filter(dep => !this.initialized.has(dep));
                if (unsatisfiedDeps.length > 0) {
                    const errorMsg = `Cannot initialize ${moduleName}: missing dependencies [${unsatisfiedDeps.join(', ')}]`;
                    console.error(`❌ ${errorMsg}`);
                    if (module.critical) {
                        results.failed.push({ module: moduleName, error: errorMsg });
                        throw new Error(errorMsg);
                    }
                    else {
                        results.skipped.push(moduleName);
                        continue;
                    }
                }
                // Initialize the module
                const moduleResult = await this._initializeModule(module);
                if (moduleResult.success) {
                    this.initialized.add(moduleName);
                    results.succeeded.push({
                        module: moduleName,
                        time: moduleResult.time || 0
                    });
                }
                else {
                    this.failed.add(moduleName);
                    results.failed.push({
                        module: moduleName,
                        error: moduleResult.error || 'Unknown error'
                    });
                    // Fail fast for critical modules
                    if (module.critical) {
                        throw new Error(`Critical module ${moduleName} failed to initialize: ${moduleResult.error}`);
                    }
                }
            }
            results.totalTime = Date.now() - startTime;
            console.log(`✅ InitializationManager: Completed in ${results.totalTime}ms`);
            console.log(`   Succeeded: ${results.succeeded.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`);
            return results;
        }
        catch (error) {
            results.totalTime = Date.now() - startTime;
            console.error(`❌ InitializationManager: Fatal error during initialization:`, error);
            throw error;
        }
    }
    /**
     * Initialize a single module with retry logic
     *
     * @param module - Module configuration
     * @returns Result with success, time, error
     */
    async _initializeModule(module) {
        const { name, initFn, timeout, retries, validateFn } = module;
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            const attemptStart = Date.now();
            try {
                console.log(`🔧 Initializing ${name}${attempt > 0 ? ` (retry ${attempt})` : ''}...`);
                // Run initialization with timeout
                const instance = await this._withTimeout(initFn(), timeout, name);
                module.instance = instance;
                // Validate if validation function provided
                if (validateFn) {
                    const validationResult = await validateFn(instance);
                    if (!validationResult.valid) {
                        throw new Error(`Validation failed: ${validationResult.message || 'Unknown validation error'}`);
                    }
                }
                const time = Date.now() - attemptStart;
                console.log(`✅ ${name} initialized in ${time}ms`);
                return { success: true, time, instance };
            }
            catch (error) {
                lastError = error;
                if (attempt < retries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.warn(`⚠️  ${name} failed (attempt ${attempt + 1}/${retries + 1}): ${lastError.message}. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                else {
                    console.error(`❌ ${name} failed after ${attempt + 1} attempts:`, error);
                }
            }
        }
        return { success: false, error: lastError?.message || 'Unknown error' };
    }
    /**
     * Execute a promise with timeout
     *
     * @param promise - Promise to execute
     * @param timeoutMs - Timeout in milliseconds
     * @param moduleName - Module name for error message
     * @returns Original promise or timeout rejection
     */
    _withTimeout(promise, timeoutMs, moduleName) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`${moduleName} initialization timeout (${timeoutMs}ms)`)), timeoutMs))
        ]);
    }
    /**
     * Get initialization status
     *
     * @returns Status summary with counts and module lists
     */
    getStatus() {
        return {
            total: this.modules.size,
            initialized: this.initialized.size,
            failed: this.failed.size,
            pending: this.modules.size - this.initialized.size - this.failed.size,
            modules: {
                initialized: Array.from(this.initialized),
                failed: Array.from(this.failed),
                pending: Array.from(this.modules.keys()).filter(m => !this.initialized.has(m) && !this.failed.has(m))
            }
        };
    }
    /**
     * Get module instance by name
     *
     * @param name - Module name
     * @returns Module instance or null
     */
    getInstance(name) {
        const module = this.modules.get(name);
        return module ? module.instance : null;
    }
    /**
     * Check if module is initialized
     *
     * @param name - Module name
     * @returns True if initialized
     */
    isInitialized(name) {
        return this.initialized.has(name);
    }
    /**
     * Visualize dependency graph (for debugging)
     *
     * @returns Mermaid diagram syntax
     */
    visualizeDependencies() {
        let mermaid = 'graph TD\n';
        for (const [module, deps] of this.dependencies) {
            if (deps.length === 0) {
                mermaid += `    ${module}[${module}]\n`;
            }
            else {
                for (const dep of deps) {
                    mermaid += `    ${dep} --> ${module}\n`;
                }
            }
        }
        return mermaid;
    }
}
// Export for use in other modules
if (typeof window !== 'undefined') {
    window.InitializationManager = InitializationManager;
}
// Default export
export default InitializationManager;
//# sourceMappingURL=InitializationManager.js.map