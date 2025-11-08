/**
 * DatasetManager - Type-safe Unified Dataset Management System
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
import type { Dataset, VocabularyTerm, PracticeItem, DatasetType, Difficulty, VocabularyCategory, PracticeCategory, DatasetRegistryEntry } from '../../types';
/**
 * Dataset metadata
 */
interface DatasetMetadata {
    id: string;
    type: DatasetType;
    file: string;
    registryEntry: DatasetRegistryEntry | {
        file: string;
        type: DatasetType;
    };
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
 * Type-safe Dataset Manager
 */
export declare class DatasetManager {
    private datasets;
    private metadata;
    private config;
    private cache;
    private registry;
    private _lastUsedPath;
    /**
     * Initialize the DatasetManager with configuration
     */
    initialize(config?: any): Promise<void>;
    /**
     * Load a specific dataset by type
     */
    loadDataset(datasetType: string, forceReload?: boolean): Promise<Dataset>;
    /**
     * Load all datasets from the registry
     */
    loadAllDatasets(): Promise<Map<string, Dataset>>;
    /**
     * Get dataset type from registry (single source of truth)
     */
    getDatasetType(datasetId: string): DatasetType;
    /**
     * Auto-detect dataset type from structure
     */
    private detectDatasetType;
    /**
     * Validate dataset structure
     */
    private validateDataset;
    /**
     * Get item count from dataset
     */
    private getItemCount;
    /**
     * Helper: Get item field value based on dataset type
     * Handles the schema difference: vocabulary has direct properties,
     * practice items have nested metadata
     */
    private _getItemField;
    /**
     * Get items from a dataset with optional filtering
     * Type-safe filtering by difficulty, category, tags
     */
    getItems(datasetId: string, filters?: DatasetFilters): Array<VocabularyTerm | PracticeItem>;
    /**
     * Get random items from a dataset
     */
    getRandomItems(datasetId: string, count: number, filters?: DatasetFilters): Array<VocabularyTerm | PracticeItem>;
    /**
     * Get dataset statistics
     */
    getStatistics(datasetId: string): DatasetStatistics | null;
    /**
     * Cache dataset to localStorage
     */
    private cacheDataset;
    /**
     * Load datasets from localStorage cache
     */
    private loadFromCache;
    /**
     * Clear cached datasets
     */
    clearCache(datasetId?: string): void;
    /**
     * Get metadata for a dataset
     */
    getMetadata(datasetId: string): DatasetMetadata | null;
    /**
     * Check if a dataset is loaded
     */
    isLoaded(datasetId: string): boolean;
    /**
     * Get all loaded dataset IDs
     */
    getLoadedDatasetIds(): string[];
    /**
     * Unload a specific dataset from memory
     */
    unloadDataset(datasetId: string): void;
    /**
     * Get summary of all loaded datasets
     */
    getSummary(): DatasetSummary[];
}
export declare const datasetManager: DatasetManager;
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
//# sourceMappingURL=DatasetManager.d.ts.map