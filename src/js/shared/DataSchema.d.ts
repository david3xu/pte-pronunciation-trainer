/**
 * Standardized Data Schema
 *
 * Defines consistent data structures across all sources
 * Provides validation and transformation utilities
 */
/**
 * Validation result structure
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Schema structure definition
 */
interface SchemaStructure {
    required?: string[];
    optional?: string[];
    defaults?: Record<string, any>;
    structure?: Record<string, any>;
    itemSchema?: ItemSchema;
}
/**
 * Item schema structure
 */
interface ItemSchema {
    required: string[];
    structure?: Record<string, any>;
}
/**
 * Dataset metadata
 */
export interface DatasetMetadata {
    generated: string;
    totalTerms: number;
    source: string;
    version: string;
    description?: string;
    categories?: Record<string, number>;
    difficulties?: Record<string, number>;
}
/**
 * Standardized vocabulary item
 */
export interface StandardizedVocabulary {
    english: string;
    difficulty: string;
    category: string;
    example: string;
    definition: string;
    phonetic: string;
    pronunciation: string;
    source: string;
    id: string;
    ipa_uk?: string;
    ipa_us?: string;
    phonetic_uk?: string;
    phonetic_us?: string;
}
/**
 * Standardized dataset
 */
export interface StandardizedDataset {
    metadata: DatasetMetadata;
    vocabulary: StandardizedVocabulary[];
}
/**
 * DataSchema - Standardized data validation and transformation
 */
export declare class DataSchema {
    static readonly PTE_CATEGORIES: string[];
    private config;
    private schemas;
    /**
     * Create a new DataSchema instance with optional config injection
     */
    constructor(config?: any);
    /**
     * Validate data against schema
     */
    validate(schemaType: string, data: any): ValidationResult;
    /**
     * Transform data to standard vocabulary format
     */
    standardizeVocabulary(rawData: any, source?: string): StandardizedVocabulary;
    /**
     * Transform data to standard dataset format
     */
    standardizeDataset(vocabularyItems: any[], metadata?: Partial<DatasetMetadata>): StandardizedDataset;
    /**
     * Generate unique ID from English text
     */
    generateId(english: string): string;
    /**
     * Infer difficulty from English text
     */
    inferDifficulty(english: string): string;
    /**
     * Infer category from vocabulary item
     */
    inferCategory(item: Partial<StandardizedVocabulary>): string;
    /**
     * Validate nested structure (private)
     */
    private _validateNested;
    /**
     * Validate item against itemSchema (private)
     */
    private _validateItem;
    /**
     * Get schema definition
     */
    getSchema(schemaType: string): SchemaStructure | undefined;
    /**
     * List all available schemas
     */
    getAvailableSchemas(): string[];
}
/**
 * Initialize DataSchema with Config (single source of truth)
 */
export declare function initializeDataSchema(config: any): DataSchema;
export declare let dataSchema: DataSchema | null;
export default DataSchema;
/**
 * Global type declarations
 */
declare global {
    interface Window {
        dataSchema: DataSchema;
    }
}
//# sourceMappingURL=DataSchema.d.ts.map