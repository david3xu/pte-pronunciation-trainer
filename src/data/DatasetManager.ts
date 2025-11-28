/**
 * DatasetManager - Type-safe Unified Dataset Management System
 *
 * ARCHITECTURE: Standalone dataset loader (no EventBus)
 * - Pure data loading and caching functionality
 * - Other components subscribe to Zustand vocabulary store for dataset changes
 *
 * Purpose: Centralized manager for all PTE dataset types
 * - Vocabulary datasets (13 books, 13,000+ terms with IPA)
 * - Repeat Sentence (RS) - 620 sentences
 * - Answer Short Question (ASQ) - 692 Q&A
 * - Write From Dictation (WFD) - 1,195 sentences
 *
 * Features:
 * - Auto-detects dataset type (vocabulary vs practice)
 * - Unified API for all dataset operations
 * - Smart caching with localStorage
 * - Type-safe filtering by difficulty, category, tags
 * - Progress tracking integration
 *
 * TypeScript version of src/js/data/DatasetManager.js
 */

import type {
    Dataset,
    DatasetRegistryEntry,
    DatasetType,
    Difficulty,
    PracticeCategory,
    PracticeDataset,
    PracticeItem,
    VocabularyCategory,
    VocabularyDataset,
    VocabularyTerm
} from '../types';

/**
 * Dataset registry type (string path or object entry)
 */
type DatasetRegistry = Record<string, string | DatasetRegistryEntry>;

/**
 * Dataset metadata
 */
interface DatasetMetadata {
  id: string;
  type: DatasetType;
  file: string;
  registryEntry: DatasetRegistryEntry | { file: string; type: DatasetType };
  itemCount: number;
  loadedAt: string;
}

/**
 * Filter options for querying dataset items
 */
interface DatasetFilters {
  difficulty?: Difficulty;
  category?: VocabularyCategory | PracticeCategory | string;
  tags?: string[];
}

/**
 * Dataset statistics
 */
interface DatasetStatistics {
  id: string;
  type: DatasetType;
  total: number;
  byDifficulty: {
    easy: number;
    normal: number;
    hard: number;
  };
  byCategory: Record<string, number>;
  loadedAt: string;
}

/**
 * Dataset summary for overview
 */
interface DatasetSummary {
  id: string;
  type: DatasetType;
  category: string;
  description: string;
  itemCount: number;
  loaded: boolean;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  enabled: boolean;
  prefix: string;
  version: string;
}

/**
 * Path tracking for error diagnostics
 */
interface PathTracking {
  configPath: string | null;
  resolvedPath: string | null;
  fullPath: string | null;
}

/**
 * Type-safe Dataset Manager
 */
export class DatasetManager {
  private datasets: Map<string, Dataset> = new Map();
  private metadata: Map<string, DatasetMetadata> = new Map();
  private config: any = null; // AppConfig instance
  private cache: CacheConfig = {
    enabled: true,
    prefix: 'pte_dataset_',
    version: '1.0'
  };
  private registry: DatasetRegistry = {};
  private _lastUsedPath: PathTracking = {
    configPath: null,
    resolvedPath: null,
    fullPath: null
  };

  /**
   * Initialize the DatasetManager with configuration
   */
  async initialize(config?: any): Promise<void> {
    this.config = config || {};
    console.log('📦 DatasetManager: Initializing...');

    // Get dataset registry from Config.js (single source of truth)
    this.registry = this.config.get?.('data.datasetFiles') || {};

    // Try to load from cache first
    if (this.cache.enabled) {
      await this.loadFromCache();
    }

    console.log('✅ DatasetManager: Ready');
  }

  /**
   * Load a specific dataset by type
   */
  async loadDataset(datasetType: string, forceReload: boolean = false): Promise<Dataset> {
    // Check if already loaded
    if (!forceReload && this.datasets.has(datasetType)) {
      console.log(`📦 DatasetManager: Using cached ${datasetType}`);
      return this.datasets.get(datasetType)!;
    }

    // Get registry entry
    const registryEntry = this.registry[datasetType];
    if (!registryEntry) {
      throw new Error(
        `Dataset type not found: ${datasetType}. Available: ${Object.keys(this.registry).join(', ')}`
      );
    }

    // Support both string paths and object entries
    const isStringPath = typeof registryEntry === 'string';
    let filePath: string;

    if (isStringPath) {
      // String path: use as-is (full path like '/data/processed/...')
      filePath = registryEntry;
    } else {
      // Object entry: combine with base path
      const processedPath = this.config.get?.('data.paths.processed') || 'data/processed/';
      const basePath = processedPath.startsWith('/') ? processedPath : `/${processedPath}`;
      filePath = `${basePath}${registryEntry.output}`;
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
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText} for ${filePath}`);
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
      const datasetTypeDetected: DatasetType = isStringPath
        ? this.detectDatasetType(data)
        : (registryEntry as DatasetRegistryEntry).category?.startsWith('pte-') ? 'vocabulary' : 'practice';

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

      // Note: Dataset loaded event removed (informational, components subscribe to vocabulary store)

      return validatedData;

    } catch (error) {
      console.error(`❌ DatasetManager: Failed to load ${datasetType}`, error);

      // Note: Dataset error event removed (error already logged, components handle errors via try/catch)

      throw error;
    }
  }

  /**
   * Load all datasets from the registry
   */
  async loadAllDatasets(): Promise<Map<string, Dataset>> {
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
   */
  getDatasetType(datasetId: string): DatasetType {
    // Use datasetFiles registry from Config as single source of truth
    const datasetFiles = this.config.get?.('data.datasetFiles');
    if (!datasetFiles || !datasetFiles[datasetId]) {
      throw new Error(`Unknown dataset: ${datasetId}`);
    }

    return datasetFiles[datasetId].type as DatasetType;
  }

  /**
   * Auto-detect dataset type from structure
   */
  private detectDatasetType(data: any): DatasetType {
    if (!data) return 'practice';

    // Vocabulary datasets have a 'vocabulary' array
    if (data.vocabulary && Array.isArray(data.vocabulary)) {
      return 'vocabulary';
    }

    // Check items array for type hints
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      const firstItem = data.items[0];

      // Question datasets have question/answer structure
      if (firstItem.content?.question) {
        return 'practice';
      }

      // Sentence datasets have sentence text
      if (firstItem.content?.text) {
        return 'practice';
      }
    }

    // Default to practice type
    return 'practice';
  }

  /**
   * Validate dataset structure
   */
  private validateDataset(data: any, type: DatasetType): Dataset {
    if (!data) {
      throw new Error(`Dataset is null or undefined`);
    }

    // Use DataSchema for validation if available (single source of truth)
    if (typeof window !== 'undefined' && (window as any).dataSchema) {
      console.log(`📊 DatasetManager: Validating ${type} dataset using schema`);

      const schemaType = type === 'vocabulary' ? 'dataset' : type;
      const validationResult = (window as any).dataSchema.validate(schemaType, data);

      if (!validationResult.valid) {
        const errorMessage = `Invalid ${type} dataset: ${validationResult.errors.join(', ')}`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      return data as Dataset;
    }

    // Minimal fallback validation if DataSchema not available
    console.warn(`⚠️ DataSchema not available - using minimal validation`);

    if (type === 'vocabulary' && (!data.vocabulary || !Array.isArray(data.vocabulary))) {
      throw new Error('Invalid vocabulary dataset: missing vocabulary array');
    } else if (type !== 'vocabulary' && (!data.items || !Array.isArray(data.items))) {
      throw new Error(`Invalid ${type} dataset: missing items array`);
    }

    return data as Dataset;
  }

  /**
   * Get item count from dataset
   */
  private getItemCount(data: Dataset, type: DatasetType): number {
    if (type === 'vocabulary') {
      return (data as VocabularyDataset).items?.length || 0;
    }
    return (data as PracticeDataset).items?.length || 0;
  }

  /**
   * Helper: Get item field value based on dataset type
   * Handles the schema difference: vocabulary has direct properties,
   * practice items have nested metadata
   */
  private _getItemField(item: VocabularyTerm | PracticeItem, field: string, datasetType: DatasetType): any {
    if (datasetType === 'vocabulary') {
      return (item as any)[field];
    }
    return (item as any).metadata?.[field];
  }

  /**
   * Get items from a dataset with optional filtering
   * Type-safe filtering by difficulty, category, tags
   */
  getItems(datasetId: string, filters: DatasetFilters = {}): Array<VocabularyTerm | PracticeItem> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      console.warn(`Dataset not loaded: ${datasetId}`);
      return [];
    }

    const meta = this.metadata.get(datasetId);
    if (!meta) {
      return [];
    }

    const items = dataset.items || [];

    // Apply filters
    let filtered = items;

    if (filters.difficulty) {
      filtered = filtered.filter((item: VocabularyTerm | PracticeItem) =>
        this._getItemField(item, 'difficulty', meta.type) === filters.difficulty
      );
    }

    if (filters.category) {
      filtered = filtered.filter((item: VocabularyTerm | PracticeItem) =>
        this._getItemField(item, 'category', meta.type) === filters.category
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((item: VocabularyTerm | PracticeItem) => {
        const itemTags = this._getItemField(item, 'tags', meta.type) || [];
        return filters.tags!.some(tag => itemTags.includes(tag));
      });
    }

    return filtered;
  }

  /**
   * Get random items from a dataset
   */
  getRandomItems(
    datasetId: string,
    count: number,
    filters: DatasetFilters = {}
  ): Array<VocabularyTerm | PracticeItem> {
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
   */
  getStatistics(datasetId: string): DatasetStatistics | null {
    const dataset = this.datasets.get(datasetId);
    const meta = this.metadata.get(datasetId);

    if (!dataset || !meta) {
      return null;
    }

    const items = dataset.items || [];

    // Count by difficulty
    const byDifficulty: DatasetStatistics['byDifficulty'] = {
      easy: 0,
      normal: 0,
      hard: 0
    };

    // Count by category
    const byCategory: Record<string, number> = {};

    items.forEach((item: VocabularyTerm | PracticeItem) => {
      const difficulty = this._getItemField(item, 'difficulty', meta.type) as Difficulty;
      const category = this._getItemField(item, 'category', meta.type) as string;

      if (difficulty && difficulty in byDifficulty) {
        byDifficulty[difficulty]++;
      }

      if (category) {
        byCategory[category] = (byCategory[category] || 0) + 1;
      }
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
   */
  private cacheDataset(datasetId: string, data: Dataset): void {
    try {
      const cacheKey = `${this.cache.prefix}${datasetId}_v${this.cache.version}`;
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(`💾 Cached ${datasetId} to localStorage`);
    } catch (error) {
      console.warn(`⚠️ Failed to cache ${datasetId}:`, (error as Error).message);
    }
  }

  /**
   * Load datasets from localStorage cache
   */
  private async loadFromCache(): Promise<void> {
    console.log('💾 Loading from cache...');

    let loadedCount = 0;

    Object.keys(this.registry).forEach(datasetType => {
      const cacheKey = `${this.cache.prefix}${datasetType}_v${this.cache.version}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const data = JSON.parse(cached) as Dataset;
          const registryEntry = this.registry[datasetType];

          if (!registryEntry) {
            console.warn(`⚠️ No registry entry for ${datasetType}`);
            return;
          }

          const type: DatasetType = typeof registryEntry === 'string'
            ? this.detectDatasetType(data)
            : registryEntry.category?.startsWith('pte-') ? 'vocabulary' : 'practice';

          this.datasets.set(datasetType, data);
          this.metadata.set(datasetType, {
            id: datasetType,
            type: type,
            file: typeof registryEntry === 'string' ? registryEntry : registryEntry.output,
            itemCount: this.getItemCount(data, type),
            loadedAt: 'from-cache',
            registryEntry: typeof registryEntry === 'string'
              ? { file: registryEntry, type }
              : registryEntry
          });

          loadedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to parse cached ${datasetType}:`, (error as Error).message);
        }
      }
    });

    if (loadedCount > 0) {
      console.log(`✅ Loaded ${loadedCount} datasets from cache`);
    }
  }

  /**
   * Clear cached datasets
   */
  clearCache(datasetId?: string): void {
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
   */
  getMetadata(datasetId: string): DatasetMetadata | null {
    return this.metadata.get(datasetId) || null;
  }

  /**
   * Check if a dataset is loaded
   */
  isLoaded(datasetId: string): boolean {
    return this.datasets.has(datasetId);
  }

  /**
   * Get all loaded dataset IDs
   */
  getLoadedDatasetIds(): string[] {
    return Array.from(this.datasets.keys());
  }

  /**
   * Unload a specific dataset from memory
   */
  unloadDataset(datasetId: string): void {
    if (this.datasets.has(datasetId)) {
      this.datasets.delete(datasetId);
      this.metadata.delete(datasetId);
      console.log(`🗑️ Unloaded ${datasetId} from memory`);
    }
  }

  /**
   * Get summary of all loaded datasets
   */
  getSummary(): DatasetSummary[] {
    return Array.from(this.metadata.values()).map(meta => ({
      id: meta.id,
      type: meta.type,
      category: (meta.registryEntry as any).category || meta.id,
      description: (meta.registryEntry as any).description || `${meta.type} dataset`,
      itemCount: meta.itemCount,
      loaded: true
    }));
  }
}

// Export singleton instance
export const datasetManager = new DatasetManager();

// Default export
export default datasetManager;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    DatasetManager: typeof DatasetManager;
    datasetManager?: DatasetManager;
  }
}

// Make DatasetManager globally available (browser compatibility)
if (typeof window !== 'undefined') {
  window.DatasetManager = DatasetManager;
  window.datasetManager = datasetManager;
}
