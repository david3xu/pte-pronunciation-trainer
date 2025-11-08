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
 * Field mapping configuration
 */
type FieldMapping = Record<string, string[]>;

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
export class DataSchema {
  // Valid categories for PTE vocabulary books
  static readonly PTE_CATEGORIES: string[] = [
    'pte-beginner',
    'pte-intermediate',
    'pte-advanced',
    'pte-must-know',
    'pte-fib-listening',
    'pte-ra-vocabulary',
    'pte-rs-vocabulary',
    'pte-wfd-vocabulary',
    'pte-reading-fib',
    'pte-reading-fib-drag'
  ];

  private config: any;
  private schemas: Record<string, SchemaStructure>;

  /**
   * Create a new DataSchema instance with optional config injection
   */
  constructor(config: any = null) {
    this.config = config;

    // Schema definitions - single source of truth
    this.schemas = {
      vocabulary: {
        required: ['english'],
        optional: [
          'difficulty', 'category', 'example', 'ipa_uk', 'ipa_us',
          'phonetic_uk', 'phonetic_us', 'definition', 'phonetic',
          'pronunciation', 'source', 'id'
        ],
        defaults: {
          difficulty: 'all',
          category: 'general',
          example: '',
          definition: '',
          phonetic: '',
          pronunciation: '',
          source: 'unknown'
        }
      },

      dataset: {
        required: ['metadata', 'vocabulary'],
        structure: {
          metadata: {
            required: ['generated', 'totalTerms', 'source'],
            optional: ['version', 'description', 'categories', 'difficulties']
          },
          vocabulary: 'array'
        }
      },

      sentence: {
        required: ['meta', 'items'],
        structure: {
          meta: {
            required: ['type', 'count'],
            optional: ['version', 'updated', 'source', 'description']
          },
          items: 'array'
        },
        itemSchema: {
          required: ['id', 'type', 'content', 'metadata'],
          structure: {
            content: {
              required: ['sentence'],
              optional: ['ipa']
            },
            metadata: {
              required: ['difficulty', 'wordCount'],
              optional: ['category', 'tags']
            }
          }
        }
      },

      question: {
        required: ['meta', 'items'],
        structure: {
          meta: {
            required: ['type', 'count'],
            optional: ['version', 'updated', 'source', 'description']
          },
          items: 'array'
        },
        itemSchema: {
          required: ['id', 'type', 'content', 'metadata'],
          structure: {
            content: {
              required: ['question'],
              optional: ['answer', 'ipa']
            },
            metadata: {
              required: ['difficulty', 'wordCount'],
              optional: ['category', 'tags']
            }
          }
        }
      },

      dialogue: {
        required: ['id', 'title', 'sentences'],
        optional: ['category', 'difficulty', 'metadata'],
        structure: {
          sentences: {
            required: ['english'],
            optional: ['speaker', 'vocabulary', 'id', 'pronunciation']
          }
        }
      }
    };
  }

  /**
   * Validate data against schema
   */
  validate(schemaType: string, data: any): ValidationResult {
    const schema = this.schemas[schemaType];
    if (!schema) {
      return { valid: false, errors: [`Unknown schema type: ${schemaType}`] };
    }

    const errors: string[] = [];

    // Check required fields
    if (schema.required) {
      schema.required.forEach(field => {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }

    // Validate nested structures
    if (schema.structure) {
      Object.keys(schema.structure).forEach(field => {
        if (data[field]) {
          const nestedValidation = this._validateNested(
            field,
            data[field],
            schema.structure![field],
            schema
          );
          errors.push(...nestedValidation);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform data to standard vocabulary format
   */
  standardizeVocabulary(rawData: any, source: string = 'unknown'): StandardizedVocabulary {
    const schema = this.schemas['vocabulary'];
    const standardized: any = { ...schema!.defaults };

    // Map common field variations to standard fields
    const fieldMappings: FieldMapping = {
      english: ['english', 'term', 'word', 'text'],
      difficulty: ['difficulty', 'level'],
      category: ['category', 'domain', 'type'],
      example: ['example', 'sentence', 'context'],
      definition: ['definition', 'meaning', 'description'],
      phonetic: ['phonetic', 'ipa', 'pronunciation_guide'],
      pronunciation: ['pronunciation', 'phonetic_spelling'],
      ipa_uk: ['ipa_uk', 'british_ipa', 'uk_ipa'],
      ipa_us: ['ipa_us', 'american_ipa', 'us_ipa'],
      phonetic_uk: ['phonetic_uk', 'british_phonetic'],
      phonetic_us: ['phonetic_us', 'american_phonetic']
    };

    // Map fields from raw data
    Object.keys(fieldMappings).forEach(standardField => {
      const possibleFields = fieldMappings[standardField]!;
      for (const field of possibleFields) {
        if (rawData[field] !== undefined && rawData[field] !== '') {
          standardized[standardField] = rawData[field];
          break;
        }
      }
    });

    // Set source and generate ID
    standardized.source = source;
    standardized.id = this.generateId(standardized.english);

    // Infer missing fields
    if (!standardized.difficulty || standardized.difficulty === 'all') {
      standardized.difficulty = this.inferDifficulty(standardized.english);
    }

    if (!standardized.category || standardized.category === 'general') {
      standardized.category = this.inferCategory(standardized);
    }

    return standardized as StandardizedVocabulary;
  }

  /**
   * Transform data to standard dataset format
   */
  standardizeDataset(
    vocabularyItems: any[],
    metadata: Partial<DatasetMetadata> = {}
  ): StandardizedDataset {
    const standardizedVocabulary = vocabularyItems.map(item =>
      this.standardizeVocabulary(item, metadata.source || 'unknown')
    );

    const standardMetadata: DatasetMetadata = {
      generated: new Date().toISOString(),
      totalTerms: standardizedVocabulary.length,
      source: 'unified-pipeline',
      version: '2.0',
      ...metadata
    };

    // Calculate statistics
    const categories: Record<string, number> = {};
    const difficulties: Record<string, number> = {};

    standardizedVocabulary.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
      difficulties[item.difficulty] = (difficulties[item.difficulty] || 0) + 1;
    });

    standardMetadata.categories = categories;
    standardMetadata.difficulties = difficulties;

    return {
      metadata: standardMetadata,
      vocabulary: standardizedVocabulary
    };
  }

  /**
   * Generate unique ID from English text
   */
  generateId(english: string): string {
    if (!english) return 'unknown-' + Date.now();

    return english
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Infer difficulty from English text
   */
  inferDifficulty(english: string): string {
    if (!english) return 'normal';

    const words = english.trim().split(/\s+/).length;
    const hasComplexTerms = /\b(comprehensive|administrative|implementation|coordination|infrastructure)\b/i.test(english);

    // Get difficulty criteria from config or use defaults
    let easyMaxLength = 8;
    let easyMaxWords = 2;
    let normalMaxWords = 4;

    if (this.config && typeof this.config.get === 'function') {
      const easyConfig = this.config.get('dataProcessing.difficulty.easy');
      const normalConfig = this.config.get('dataProcessing.difficulty.normal');

      easyMaxLength = easyConfig?.maxLength || easyMaxLength;
      easyMaxWords = easyConfig?.maxWords || easyMaxWords;
      normalMaxWords = normalConfig?.maxWords || normalMaxWords;
    }

    // Apply rules in priority order
    if (words === 1 && english.length <= easyMaxLength) return 'easy';
    if (words <= easyMaxWords && !hasComplexTerms) return 'easy';
    if (words <= normalMaxWords && !hasComplexTerms) return 'normal';
    return 'hard';
  }

  /**
   * Infer category from vocabulary item
   */
  inferCategory(item: Partial<StandardizedVocabulary>): string {
    const { english, category } = item;

    // If category is already set and valid for PTE, use it
    const pteCategories = [
      'pte-beginner', 'pte-intermediate', 'pte-advanced', 'pte-must-know',
      'pte-fib-listening', 'pte-ra', 'pte-rs-vocab',
      'pte-wfd-vocab', 'pte-reading-fib', 'pte-reading-fib-drag'
    ];

    if (category && pteCategories.includes(category)) {
      return category;
    }

    // Fallback for data without explicit category
    if (!category) {
      console.warn(`Term "${english}" missing category - using 'general' fallback`);
    }

    return category || 'general';
  }

  /**
   * Validate nested structure (private)
   */
  private _validateNested(
    field: string,
    data: any,
    structure: any,
    schema?: SchemaStructure
  ): string[] {
    const errors: string[] = [];

    if (structure === 'array') {
      if (!Array.isArray(data)) {
        errors.push(`Field ${field} must be an array`);
        return errors;
      }

      // If parent schema has itemSchema, validate first item
      if (schema && schema.itemSchema && data.length > 0) {
        const firstItem = data[0];
        const itemErrors = this._validateItem(firstItem, schema.itemSchema);

        if (itemErrors.length > 0) {
          errors.push(`Invalid item in ${field}: ${itemErrors.join(', ')}`);
        }
      }
    } else if (typeof structure === 'object') {
      if (structure.required) {
        structure.required.forEach((requiredField: string) => {
          if (!(requiredField in data)) {
            errors.push(`Missing required field in ${field}: ${requiredField}`);
          }
        });
      }
    }

    return errors;
  }

  /**
   * Validate item against itemSchema (private)
   */
  private _validateItem(item: any, itemSchema: ItemSchema): string[] {
    const errors: string[] = [];

    // Check required fields
    if (itemSchema.required) {
      itemSchema.required.forEach(field => {
        if (!(field in item)) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }

    // Validate nested structures
    if (itemSchema.structure) {
      Object.keys(itemSchema.structure).forEach(field => {
        if (item[field]) {
          const nestedValidation = this._validateNested(
            field,
            item[field],
            itemSchema.structure![field]
          );
          errors.push(...nestedValidation);
        }
      });
    }

    return errors;
  }

  /**
   * Get schema definition
   */
  getSchema(schemaType: string): SchemaStructure | undefined {
    return this.schemas[schemaType];
  }

  /**
   * List all available schemas
   */
  getAvailableSchemas(): string[] {
    return Object.keys(this.schemas);
  }
}

/**
 * Initialize DataSchema with Config (single source of truth)
 */
export function initializeDataSchema(config: any): DataSchema {
  const dataSchema = new DataSchema(config);

  // Expose globally in browser environment
  if (typeof window !== 'undefined') {
    (window as any).dataSchema = dataSchema;
    console.log('✅ DataSchema initialized with Config');
  }

  return dataSchema;
}

// Export singleton instance (will be initialized with config)
export let dataSchema: DataSchema | null = null;

// Auto-initialize if appConfig is available
if (typeof window !== 'undefined' && (window as any).appConfig) {
  dataSchema = new DataSchema((window as any).appConfig);
  (window as any).dataSchema = dataSchema;
}

// Expose DataSchema class on window for dynamic instantiation
if (typeof window !== 'undefined') {
  (window as any).DataSchema = DataSchema;
}

// Default export
export default DataSchema;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    dataSchema: DataSchema;
    DataSchema: typeof DataSchema;
  }
}
