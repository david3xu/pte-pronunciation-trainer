/**
 * Standardized Data Schema for CCL Pronunciation Trainer
 * Defines consistent data structures across all sources
 * Provides validation and transformation utilities
 */

class DataSchema {
    constructor() {
        this.schemas = {
            vocabulary: {
                required: ['english'],
                optional: ['difficulty', 'category', 'example', 'ipa_uk', 'ipa_us', 'phonetic_uk', 'phonetic_us', 'definition', 'phonetic', 'pronunciation', 'source', 'id'],
                defaults: {
                    difficulty: 'normal',
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
                    vocabulary: 'array' // Array of vocabulary items
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
     * @param {string} schemaType - Type of schema to validate against
     * @param {Object} data - Data to validate
     * @returns {Object} Validation result
     */
    validate(schemaType, data) {
        const schema = this.schemas[schemaType];
        if (!schema) {
            return { valid: false, errors: [`Unknown schema type: ${schemaType}`] };
        }

        const errors = [];

        // Check required fields
        schema.required.forEach(field => {
            if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // Validate nested structures
        if (schema.structure) {
            Object.keys(schema.structure).forEach(field => {
                if (data[field]) {
                    const nestedValidation = this._validateNested(field, data[field], schema.structure[field]);
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
     * @param {Object} rawData - Raw data from any source
     * @param {string} source - Data source identifier
     * @returns {Object} Standardized vocabulary item
     */
    standardizeVocabulary(rawData, source = 'unknown') {
        const schema = this.schemas.vocabulary;
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
        if (!standardized.difficulty || standardized.difficulty === 'normal') {
            standardized.difficulty = this.inferDifficulty(standardized.english);
        }

        if (!standardized.category || standardized.category === 'general') {
            standardized.category = this.inferCategory(standardized);
        }

        return standardized;
    }

    /**
     * Transform data to standard dataset format
     * @param {Array} vocabularyItems - Array of vocabulary items
     * @param {Object} metadata - Dataset metadata
     * @returns {Object} Standardized dataset
     */
    standardizeDataset(vocabularyItems, metadata = {}) {
        const standardizedVocabulary = vocabularyItems.map(item =>
            this.standardizeVocabulary(item, metadata.source || 'unknown')
        );

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
     * @param {string} english - English text
     * @returns {string} Generated ID
     */
    generateId(english) {
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
     * @param {string} english - English text
     * @returns {string} Inferred difficulty
     */
    inferDifficulty(english) {
        if (!english) return 'normal';

        const words = english.trim().split(/\s+/).length;
        const hasComplexTerms = /\b(comprehensive|administrative|implementation|coordination|infrastructure)\b/i.test(english);

        if (words === 1 && english.length <= 8) return 'easy';
        if (words <= 2 && !hasComplexTerms) return 'easy';
        if (words <= 4 && !hasComplexTerms) return 'normal';
        return 'hard';
    }

    /**
     * Infer category from vocabulary item
     * @param {Object} item - Vocabulary item
     * @returns {string} Inferred category
     */
    inferCategory(item) {
        const { english, conversationId, example } = item;

        // If we have conversation ID, use group-based categorization
        if (conversationId) {
            return Constants.getCategoryFromDialogueId(conversationId);
        }

        // Content-based categorization
        const text = (english + ' ' + example).toLowerCase();

        if (/\b(court|legal|judge|lawyer|case|law)\b/.test(text)) return 'legal';
        if (/\b(doctor|medical|health|hospital|treatment)\b/.test(text)) return 'medical';
        if (/\b(school|education|student|teacher|university)\b/.test(text)) return 'education';
        if (/\b(visa|immigration|resident|citizen|passport)\b/.test(text)) return 'immigration';
        if (/\b(business|company|work|job|employment)\b/.test(text)) return 'business';
        if (/\b(welfare|social|community|support|service)\b/.test(text)) return 'social-welfare';
        if (/\b(house|housing|rent|property|landlord)\b/.test(text)) return 'housing';

        return 'general';
    }

    /**
     * Validate nested structure
     * @private
     */
    _validateNested(field, data, structure) {
        const errors = [];

        if (structure === 'array') {
            if (!Array.isArray(data)) {
                errors.push(`Field ${field} must be an array`);
            }
        } else if (typeof structure === 'object') {
            if (structure.required) {
                structure.required.forEach(requiredField => {
                    if (!(requiredField in data)) {
                        errors.push(`Missing required field in ${field}: ${requiredField}`);
                    }
                });
            }
        }

        return errors;
    }

    /**
     * Get schema definition
     * @param {string} schemaType - Schema type
     * @returns {Object} Schema definition
     */
    getSchema(schemaType) {
        return this.schemas[schemaType];
    }

    /**
     * List all available schemas
     * @returns {Array} Array of schema names
     */
    getAvailableSchemas() {
        return Object.keys(this.schemas);
    }
}

// Initialize and register
const dataSchema = new DataSchema();
window.CCLApp.registerModule('dataSchema', dataSchema);

// Legacy compatibility
window.dataSchema = dataSchema;