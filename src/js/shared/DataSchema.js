/**
 * Standardized Data Schema
 *
 * Defines consistent data structures across all sources
 * Provides validation and transformation utilities
 */
/**
 * DataSchema - Standardized data validation and transformation
 */
export class DataSchema {
    // Valid categories for PTE vocabulary books
    static PTE_CATEGORIES = [
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
    config;
    schemas;
    /**
     * Create a new DataSchema instance with optional config injection
     */
    constructor(config = null) {
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
    validate(schemaType, data) {
        const schema = this.schemas[schemaType];
        if (!schema) {
            return { valid: false, errors: [`Unknown schema type: ${schemaType}`] };
        }
        const errors = [];
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
                    const nestedValidation = this._validateNested(field, data[field], schema.structure[field], schema);
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
    standardizeVocabulary(rawData, source = 'unknown') {
        const schema = this.schemas['vocabulary'];
        const standardized = { ...schema.defaults };
        // Map common field variations to standard fields
        const fieldMappings = {
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
            const possibleFields = fieldMappings[standardField];
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
        return standardized;
    }
    /**
     * Transform data to standard dataset format
     */
    standardizeDataset(vocabularyItems, metadata = {}) {
        const standardizedVocabulary = vocabularyItems.map(item => this.standardizeVocabulary(item, metadata.source || 'unknown'));
        const standardMetadata = {
            generated: new Date().toISOString(),
            totalTerms: standardizedVocabulary.length,
            source: 'unified-pipeline',
            version: '2.0',
            ...metadata
        };
        // Calculate statistics
        const categories = {};
        const difficulties = {};
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
    generateId(english) {
        if (!english)
            return 'unknown-' + Date.now();
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
    inferDifficulty(english) {
        if (!english)
            return 'normal';
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
        if (words === 1 && english.length <= easyMaxLength)
            return 'easy';
        if (words <= easyMaxWords && !hasComplexTerms)
            return 'easy';
        if (words <= normalMaxWords && !hasComplexTerms)
            return 'normal';
        return 'hard';
    }
    /**
     * Infer category from vocabulary item
     */
    inferCategory(item) {
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
    _validateNested(field, data, structure, schema) {
        const errors = [];
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
        }
        else if (typeof structure === 'object') {
            if (structure.required) {
                structure.required.forEach((requiredField) => {
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
    _validateItem(item, itemSchema) {
        const errors = [];
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
                    const nestedValidation = this._validateNested(field, item[field], itemSchema.structure[field]);
                    errors.push(...nestedValidation);
                }
            });
        }
        return errors;
    }
    /**
     * Get schema definition
     */
    getSchema(schemaType) {
        return this.schemas[schemaType];
    }
    /**
     * List all available schemas
     */
    getAvailableSchemas() {
        return Object.keys(this.schemas);
    }
}
/**
 * Initialize DataSchema with Config (single source of truth)
 */
export function initializeDataSchema(config) {
    const dataSchema = new DataSchema(config);
    // Expose globally in browser environment
    if (typeof window !== 'undefined') {
        window.dataSchema = dataSchema;
        console.log('✅ DataSchema initialized with Config');
    }
    return dataSchema;
}
// Export singleton instance (will be initialized with config)
export let dataSchema = null;
// Auto-initialize if appConfig is available
if (typeof window !== 'undefined' && window.appConfig) {
    dataSchema = new DataSchema(window.appConfig);
    window.dataSchema = dataSchema;
}
// Default export
export default DataSchema;
//# sourceMappingURL=DataSchema.js.map