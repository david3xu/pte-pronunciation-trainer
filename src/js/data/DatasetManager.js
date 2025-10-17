/**
 * DatasetManager - Unified Dataset Management System
 *
 * Purpose: Centralized manager for all PTE dataset types
 * - Vocabulary datasets (with IPA)
 * - Repeat Sentence (RS) - sentences
 * - Answer Short Question (ASQ) - Q&A
 * - Write From Dictation (WFD) - sentences
 *
 * Features:
 * - Auto-detects dataset type (vocabulary vs sentence vs question)
 * - Unified API for all dataset operations
 * - Smart caching with localStorage
 * - Filtering by difficulty, category, tags
 * - Progress tracking integration
 *
 * @class DatasetManager
 * @date 2025-10-07
 */

class DatasetManager {
    constructor() {
        this.datasets = new Map(); // datasetId -> dataset object
        this.metadata = new Map(); // datasetId -> metadata
        this.config = null;
        this.cache = {
            enabled: true,
            prefix: 'pte_dataset_',
            version: '1.0'
        };

        // For error diagnostics: track the last path used in fetch operations
        this._lastUsedPath = {
            configPath: null,
            resolvedPath: null,
            fullPath: null
        };
    }

    /**
     * Initialize the DatasetManager with configuration
     * @param {Object} config - Configuration from Config.js (optional)
     */
    async initialize(config) {
        this.config = config || {};
        console.log('📦 DatasetManager: Initializing...');

        // Get dataset registry from Config.js (single source of truth)
        this.registry = this.config.get('data.datasetFiles');

        // Try to load from cache first
        if (this.cache.enabled) {
            await this.loadFromCache();
        }

        console.log('✅ DatasetManager: Ready');
    }

    /**
     * Load a specific dataset by type
     * @param {string} datasetType - Dataset type identifier
     * @param {boolean} forceReload - Force reload from network
     * @returns {Promise<Object>} Dataset object
     */
    async loadDataset(datasetType, forceReload = false) {
        // Check if already loaded
        if (!forceReload && this.datasets.has(datasetType)) {
            console.log(`📦 DatasetManager: Using cached ${datasetType}`);
            return this.datasets.get(datasetType);
        }

        // Get registry entry
        const registryEntry = this.registry[datasetType];
        if (!registryEntry) {
            throw new Error(`Dataset type not found: ${datasetType}. Available: ${Object.keys(this.registry).join(', ')}`);
        }

        // Support both string paths and object entries
        const isStringPath = typeof registryEntry === 'string';
        let filePath;

        if (isStringPath) {
            // String path: use as-is (full path like '/data/processed/...')
            filePath = registryEntry;
        } else {
            // Object entry: combine with base path
            const processedPath = this.config.get('data.paths.processed') || 'data/processed/';
            const basePath = processedPath.startsWith('/') ? processedPath : `/${processedPath}`;
            filePath = `${basePath}${registryEntry.file}`;
        }

        console.log(`📥 DatasetManager: Loading ${datasetType} from ${filePath}...`);

        try {
            console.log(`📥 DatasetManager: Fetching dataset from ${filePath} (using ${isStringPath ? 'full' : 'registry'} path)`);

            // For error reporting: record the path used
            this._lastUsedPath = {
                configPath: isStringPath ? 'data.datasetFiles' : 'data.paths.processed',
                resolvedPath: filePath,
                fullPath: filePath
            };

            // Load from network
            const response = await fetch(filePath);
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText} for ${filePath}`);
                error.details = {
                    configPathUsed: this._lastUsedPath.configPath,
                    datasetType: datasetType,
                    fullPath: filePath
                };
                console.error(`❌ DatasetManager: Failed to load ${datasetType}:`, error.details);
                throw error;
            }

            const data = await response.json();

            // Auto-detect dataset type if not specified (for string paths)
            const datasetTypeDetected = isStringPath ? this.detectDatasetType(data) : registryEntry.type;

            // Validate dataset structure
            const validatedData = this.validateDataset(data, datasetTypeDetected);

            // Store in memory
            this.datasets.set(datasetType, validatedData);

            // Store metadata
            const itemCount = this.getItemCount(validatedData, datasetTypeDetected);
            this.metadata.set(datasetType, {
                id: datasetType,
                type: datasetTypeDetected,
                file: filePath,
                registryEntry: isStringPath ? { file: filePath, type: datasetTypeDetected } : registryEntry,
                itemCount: itemCount,
                loadedAt: new Date().toISOString()
            });

            // Cache to localStorage
            if (this.cache.enabled) {
                this.cacheDataset(datasetType, validatedData);
            }

            console.log(`✅ DatasetManager: Loaded ${datasetType} (${itemCount} items)`);

            // Emit dataset loaded event (from Config.js)
            if (window.eventBus && this.config) {
                const datasetLoadedEvent = this.config.get('events.dataset.loaded') || 'dataset:loaded';
                window.eventBus.emit(datasetLoadedEvent, {
                    type: datasetType,
                    itemCount: itemCount
                });
            }

            return validatedData;

        } catch (error) {
            console.error(`❌ DatasetManager: Failed to load ${datasetType}`, error);

            // Emit dataset error event (from Config.js)
            if (window.eventBus && this.config) {
                const datasetErrorEvent = this.config.get('events.dataset.error') || 'dataset:error';
                window.eventBus.emit(datasetErrorEvent, {
                    type: datasetType,
                    error: error
                });
            }

            throw error;
        }
    }

    /**
     * Load all datasets from the registry
     * @returns {Promise<Map>} Map of all loaded datasets
     */
    async loadAllDatasets() {
        console.log('📥 DatasetManager: Loading all datasets...');

        const datasetTypes = Object.keys(this.registry);
        const loadPromises = datasetTypes.map(type =>
            this.loadDataset(type).catch(err => {
                console.warn(`⚠️ Failed to load ${type}:`, err.message);
                return null;
            })
        );

        await Promise.all(loadPromises);

        console.log(`✅ DatasetManager: Loaded ${this.datasets.size}/${datasetTypes.length} datasets`);
        return this.datasets;
    }

    /**
     * Get dataset type from registry (single source of truth)
     * @param {string} datasetId - Dataset identifier
     * @returns {string} Type of the dataset
     * @throws {Error} If type cannot be determined
     */
    getDatasetType(datasetId) {
        // Use datasetFiles registry from Config as single source of truth
        const datasetFiles = this.config.get('data.datasetFiles');
        if (!datasetFiles || !datasetFiles[datasetId]) {
            throw new Error(`Unknown dataset: ${datasetId}`);
        }

        return datasetFiles[datasetId].type;
    }

    /**
     * Auto-detect dataset type from structure
     * @param {Object} data - Dataset object
     * @returns {string} Detected type: 'vocabulary', 'sentence', or 'question'
     */
    detectDatasetType(data) {
        if (!data) return 'sentence';

        // Vocabulary datasets have a 'vocabulary' array
        if (data.vocabulary && Array.isArray(data.vocabulary)) {
            return 'vocabulary';
        }

        // Check items array for type hints
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            const firstItem = data.items[0];

            // Question datasets have question/answer structure
            if (firstItem.content && firstItem.content.question) {
                return 'question';
            }

            // Sentence datasets have sentence text
            if (firstItem.content && firstItem.content.text) {
                return 'sentence';
            }
        }

        // Default to sentence type
        return 'sentence';
    }

    /**
     * Validate dataset structure using DataSchema as single source of truth
     * @param {Object} data - Dataset object
     * @param {string} type - Dataset type
     * @returns {Object} Validated dataset
     * @throws {Error} If dataset fails validation
     */
    validateDataset(data, type) {
        // Map type to schema type
        const schemaType = type === 'vocabulary' ? 'dataset' : type;

        // Simple validation to prevent runtime errors in case DataSchema isn't available
        // This is minimal, just enough to prevent crashes
        if (!data) {
            throw new Error(`Dataset is null or undefined`);
        }

        // Use DataSchema for validation (single source of truth)
        if (window.dataSchema) {
            console.log(`📊 DatasetManager: Validating ${type} dataset using schema`);

            const validationResult = window.dataSchema.validate(schemaType, data);
            if (!validationResult.valid) {
                const errorMessage = `Invalid ${type} dataset: ${validationResult.errors.join(', ')}`;
                console.error(`❌ ${errorMessage}`);
                throw new Error(errorMessage);
            }
            return data;
        }

        // Extremely minimal fallback if DataSchema not available
        console.warn(`⚠️ DataSchema not available - using minimal validation`);

        // Just verify basic structure exists to prevent runtime errors
        if (type === 'vocabulary' && (!data.vocabulary || !Array.isArray(data.vocabulary))) {
            throw new Error('Invalid vocabulary dataset: missing vocabulary array');
        } else if (type !== 'vocabulary' && (!data.items || !Array.isArray(data.items))) {
            throw new Error(`Invalid ${type} dataset: missing items array`);
        }

        return data;
    }

    /**
     * Get item count from dataset
     * @param {Object} data - Dataset object
     * @param {string} type - Dataset type
     * @returns {number} Number of items
     */
    getItemCount(data, type) {
        if (type === 'vocabulary') {
            return data.vocabulary.length;
        }
        return data.items.length;
    }

    /**
     * Helper: Get item field value based on dataset type
     * (Eliminates duplicate metadata access logic)
     * @private
     */
    _getItemField(item, field, datasetType) {
        if (datasetType === 'vocabulary') {
            return item[field];
        }
        return item.metadata ? item.metadata[field] : undefined;
    }

    /**
     * Get items from a dataset with optional filtering
     * @param {string} datasetId - Dataset ID
     * @param {Object} filters - Filter options
     * @param {string} filters.difficulty - 'easy' | 'normal' | 'hard'
     * @param {string} filters.category - Category name
     * @param {Array<string>} filters.tags - Array of tags to match
     * @returns {Array} Filtered items
     */
    getItems(datasetId, filters = {}) {
        const dataset = this.datasets.get(datasetId);
        if (!dataset) {
            console.warn(`Dataset not loaded: ${datasetId}`);
            return [];
        }

        const meta = this.metadata.get(datasetId);
        const items = meta.type === 'vocabulary' ? dataset.vocabulary : dataset.items;

        // Apply filters
        let filtered = items;

        if (filters.difficulty) {
            filtered = filtered.filter(item => {
                return this._getItemField(item, 'difficulty', meta.type) === filters.difficulty;
            });
        }

        if (filters.category) {
            filtered = filtered.filter(item => {
                return this._getItemField(item, 'category', meta.type) === filters.category;
            });
        }

        if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter(item => {
                const itemTags = this._getItemField(item, 'tags', meta.type) || [];
                return filters.tags.some(tag => itemTags.includes(tag));
            });
        }

        return filtered;
    }

    /**
     * Get random items from a dataset
     * @param {string} datasetId - Dataset ID
     * @param {number} count - Number of random items
     * @param {Object} filters - Optional filters
     * @returns {Array} Random items
     */
    getRandomItems(datasetId, count, filters = {}) {
        const items = this.getItems(datasetId, filters);

        if (items.length === 0) {
            return [];
        }

        // Shuffle and take count
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    /**
     * Get dataset statistics
     * @param {string} datasetId - Dataset ID
     * @returns {Object} Statistics object
     */
    getStatistics(datasetId) {
        const dataset = this.datasets.get(datasetId);
        const meta = this.metadata.get(datasetId);

        if (!dataset || !meta) {
            return null;
        }

        const items = meta.type === 'vocabulary' ? dataset.vocabulary : dataset.items;

        // Count by difficulty
        const byDifficulty = {
            easy: 0,
            normal: 0,
            hard: 0
        };

        // Count by category
        const byCategory = {};

        items.forEach(item => {
            const difficulty = this._getItemField(item, 'difficulty', meta.type);
            const category = this._getItemField(item, 'category', meta.type);

            if (byDifficulty[difficulty] !== undefined) {
                byDifficulty[difficulty]++;
            }

            byCategory[category] = (byCategory[category] || 0) + 1;
        });

        return {
            id: datasetId,
            type: meta.type,
            total: items.length,
            byDifficulty,
            byCategory,
            loadedAt: meta.loadedAt
        };
    }

    /**
     * Cache dataset to localStorage
     * @param {string} datasetId - Dataset ID
     * @param {Object} data - Dataset data
     */
    cacheDataset(datasetId, data) {
        try {
            const cacheKey = `${this.cache.prefix}${datasetId}_v${this.cache.version}`;
            localStorage.setItem(cacheKey, JSON.stringify(data));
            console.log(`💾 Cached ${datasetId} to localStorage`);
        } catch (error) {
            console.warn(`⚠️ Failed to cache ${datasetId}:`, error.message);
        }
    }

    /**
     * Load datasets from localStorage cache
     */
    async loadFromCache() {
        console.log('💾 Loading from cache...');

        let loadedCount = 0;

        // Use internal registry instead of config.pipeline.registry
        Object.keys(this.registry).forEach(datasetType => {
            const cacheKey = `${this.cache.prefix}${datasetType}_v${this.cache.version}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    const registryEntry = this.registry[datasetType];

                    this.datasets.set(datasetType, data);
                    this.metadata.set(datasetType, {
                        id: datasetType,
                        type: registryEntry.type,
                        file: registryEntry.file,
                        itemCount: this.getItemCount(data, registryEntry.type),
                        loadedAt: 'from-cache'
                    });

                    loadedCount++;
                } catch (error) {
                    console.warn(`⚠️ Failed to parse cached ${datasetType}:`, error.message);
                }
            }
        });

        if (loadedCount > 0) {
            console.log(`✅ Loaded ${loadedCount} datasets from cache`);
        }
    }

    /**
     * Clear cached datasets
     * @param {string} [datasetId] - Optional dataset ID to clear specific dataset, or undefined to clear all
     */
    clearCache(datasetId) {
        if (datasetId) {
            // Clear specific dataset
            console.log(`🗑️ Clearing cache for dataset: ${datasetId}...`);
            const cacheKey = `${this.cache.prefix}${datasetId}_v${this.cache.version}`;
            localStorage.removeItem(cacheKey);
            this.datasets.delete(datasetId);
            this.metadata.delete(datasetId);
            console.log(`✅ Cache cleared for ${datasetId}`);
        } else {
            // Clear all datasets
            console.log('🗑️ Clearing all dataset cache...');

            // Use internal registry instead of config.pipeline.registry
            Object.keys(this.registry).forEach(datasetType => {
                const cacheKey = `${this.cache.prefix}${datasetType}_v${this.cache.version}`;
                localStorage.removeItem(cacheKey);
            });

            this.datasets.clear();
            this.metadata.clear();

            console.log('✅ All cache cleared');
        }
    }

    /**
     * Get metadata for a dataset
     * @param {string} datasetId - Dataset ID
     * @returns {Object|null} Metadata object
     */
    getMetadata(datasetId) {
        return this.metadata.get(datasetId) || null;
    }

    /**
     * Check if a dataset is loaded
     * @param {string} datasetId - Dataset ID
     * @returns {boolean} True if loaded
     */
    isLoaded(datasetId) {
        return this.datasets.has(datasetId);
    }

    /**
     * Get all loaded dataset IDs
     * @returns {Array<string>} Array of dataset IDs
     */
    getLoadedDatasetIds() {
        return Array.from(this.datasets.keys());
    }

    /**
     * Unload a specific dataset from memory
     * @param {string} datasetId - Dataset ID
     */
    unloadDataset(datasetId) {
        if (this.datasets.has(datasetId)) {
            this.datasets.delete(datasetId);
            this.metadata.delete(datasetId);
            console.log(`🗑️ Unloaded ${datasetId} from memory`);
        }
    }

    /**
     * Get summary of all loaded datasets
     * @returns {Array<Object>} Summary array
     */
    getSummary() {
        return Array.from(this.metadata.values()).map(meta => ({
            id: meta.id,
            type: meta.type,
            category: meta.registryEntry.category || meta.id,
            description: meta.registryEntry.description || `${meta.type} dataset`,
            itemCount: meta.itemCount,
            loaded: true
        }));
    }
}

// Make DatasetManager globally available
window.DatasetManager = DatasetManager;

// Export for use in other modules (Node.js compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatasetManager;
}
