#!/usr/bin/env node

/**
 * Data Validation Script for CCL Pronunciation Trainer
 * Validates vocabulary data integrity and format
 */

const fs = require('fs');
const path = require('path');
const AppConfig = require('../src/js/shared/Config.js');

class ValidationError extends Error {
    constructor(message, category, index) {
        super(message);
        this.category = category;
        this.index = index;
        this.name = 'ValidationError';
    }
}

class DataValidator {
    constructor() {
        // Load centralized configuration
        const appConfig = new AppConfig();
        this.config = {
            requiredFiles: appConfig.get('validation.requiredFiles'),
            errorMessages: appConfig.get('validation.errorMessages'),
            reportsDir: appConfig.get('pipeline.reportsDir')
        };

        this.errors = [];
        this.warnings = [];
        this.stats = {
            totalTerms: 0,
            totalCategories: 0,
            emptyTerms: 0,
            duplicates: 0,
            invalidFormat: 0
        };
    }

    async validate() {
        console.log('🔍 Starting data validation...\n');

        try {
            // Check if required files exist
            for (const filePath of this.config.requiredFiles) {
                if (!fs.existsSync(filePath)) {
                    throw new Error(`${this.config.errorMessages.datasetNotFound}\nMissing file: ${filePath}`);
                }
            }

            // Validate ALL vocabulary files
            for (const vocabPath of this.config.requiredFiles) {
                console.log(`\n📖 Validating: ${path.basename(vocabPath)}`);
                console.log('─'.repeat(50));

                // Load vocabulary data from JSON file
                const fullPath = path.resolve(vocabPath);
                const fileContent = fs.readFileSync(fullPath, 'utf-8');
                const data = JSON.parse(fileContent);

                // Determine dataset type
                const datasetType = this.detectDatasetType(data);
                
                if (datasetType === 'vocabulary') {
                    // Validate vocabulary structure (existing logic)
                    await this.validateStructure(data, vocabPath);
                    await this.validateCategory(data, vocabPath);
                    await this.checkGlobalDuplicates(data, vocabPath);
                } else {
                    // Validate new dataset types (RS, ASQ, WFD)
                    await this.validateNewDatasetStructure(data, vocabPath, datasetType);
                }
            }
            
            // Also validate new PTE datasets if they exist
            await this.validateNewPTEDatasets();

            // Generate report
            this.generateReport();

        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        }
    }
    
    detectDatasetType(data) {
        // Check if it's a new dataset type (has meta and items)
        if (data.meta && data.items) {
            return data.meta.type || 'unknown';
        }
        // Otherwise it's a vocabulary dataset (has metadata and vocabulary)
        return 'vocabulary';
    }
    
    async validateNewPTEDatasets() {
        const newDatasets = [
            'data/processed/pte-repeat-sentence-dataset.json',
            'data/processed/pte-answer-short-question-dataset.json',
            'data/processed/pte-write-from-dictation-dataset.json'
        ];
        
        for (const datasetPath of newDatasets) {
            if (fs.existsSync(datasetPath)) {
                console.log(`\n📖 Validating: ${path.basename(datasetPath)}`);
                console.log('─'.repeat(50));
                
                const fileContent = fs.readFileSync(datasetPath, 'utf-8');
                const data = JSON.parse(fileContent);
                const datasetType = data.meta?.type || 'unknown';
                
                await this.validateNewDatasetStructure(data, datasetPath, datasetType);
            }
        }
    }
    
    async validateNewDatasetStructure(data, filename, datasetType) {
        const bookName = path.basename(filename, '.json');
        console.log(`🏗️  Validating ${datasetType.toUpperCase()} dataset structure for ${bookName}...`);
        
        // Validate meta
        if (!data.meta) {
            throw new ValidationError('Dataset must have meta property');
        }
        
        if (!data.meta.type || !['rs', 'asq', 'wfd'].includes(data.meta.type)) {
            throw new ValidationError(`Invalid meta.type: ${data.meta.type}`);
        }
        
        if (!data.meta.count || data.meta.count !== data.items.length) {
            this.warnings.push(`Meta count (${data.meta.count}) doesn't match items length (${data.items.length})`);
        }
        
        // Validate items
        if (!Array.isArray(data.items)) {
            throw new ValidationError('Items property must be an array');
        }
        
        console.log(`   ✓ Dataset type: ${data.meta.type}`);
        console.log(`   ✓ Total items: ${data.items.length}`);
        console.log(`   ✓ Source: ${data.meta.source || 'unknown'}`);
        
        // Validate individual items
        const seenIds = new Set();
        let validItems = 0;
        
        data.items.forEach((item, index) => {
            try {
                if (datasetType === 'rs' || datasetType === 'wfd') {
                    this.validateSentenceItem(item, index, seenIds);
                } else if (datasetType === 'asq') {
                    this.validateQuestionItem(item, index, seenIds);
                }
                validItems++;
            } catch (error) {
                this.errors.push(new ValidationError(
                    `Item ${index}: ${error.message}`,
                    datasetType,
                    index
                ));
            }
        });
        
        console.log(`   ✓ Valid items: ${validItems}`);
        console.log(`   ✓ Invalid items: ${data.items.length - validItems}`);
    }
    
    validateSentenceItem(item, index, seenIds) {
        // Check required fields
        if (!item.id) throw new Error('missing id');
        if (!item.type) throw new Error('missing type');
        if (!item.content) throw new Error('missing content');
        if (!item.content.sentence) throw new Error('missing content.sentence');
        if (item.content.ipa !== null) {
            this.warnings.push(`Item ${index}: ipa should be null, got ${item.content.ipa}`);
        }
        if (!item.metadata) throw new Error('missing metadata');
        if (!item.metadata.difficulty) throw new Error('missing metadata.difficulty');
        if (!item.metadata.category) throw new Error('missing metadata.category');
        
        // Check for duplicate IDs
        if (seenIds.has(item.id)) {
            throw new Error(`duplicate id: ${item.id}`);
        }
        seenIds.add(item.id);
        
        // Validate difficulty values
        if (!['easy', 'normal', 'hard'].includes(item.metadata.difficulty)) {
            throw new Error(`invalid difficulty: ${item.metadata.difficulty}`);
        }
        
        // Validate sentence content
        if (typeof item.content.sentence !== 'string' || !item.content.sentence.trim()) {
            throw new Error('sentence must be a non-empty string');
        }
    }
    
    validateQuestionItem(item, index, seenIds) {
        // Check required fields
        if (!item.id) throw new Error('missing id');
        if (!item.type) throw new Error('missing type');
        if (item.type !== 'asq') throw new Error(`invalid type: ${item.type}`);
        if (!item.content) throw new Error('missing content');
        if (!item.content.question) throw new Error('missing content.question');
        if (item.content.answer === undefined) {
            throw new Error('missing content.answer (should be empty string if no answer)');
        }
        if (item.content.ipa !== null) {
            this.warnings.push(`Item ${index}: ipa should be null, got ${item.content.ipa}`);
        }
        if (!item.metadata) throw new Error('missing metadata');
        if (!item.metadata.difficulty) throw new Error('missing metadata.difficulty');
        if (!item.metadata.category) throw new Error('missing metadata.category');
        
        // Check for duplicate IDs
        if (seenIds.has(item.id)) {
            throw new Error(`duplicate id: ${item.id}`);
        }
        seenIds.add(item.id);
        
        // Validate difficulty values
        if (!['easy', 'normal', 'hard'].includes(item.metadata.difficulty)) {
            throw new Error(`invalid difficulty: ${item.metadata.difficulty}`);
        }
        
        // Validate question content
        if (typeof item.content.question !== 'string' || !item.content.question.trim()) {
            throw new Error('question must be a non-empty string');
        }
        
        // Validate answer (can be empty string)
        if (typeof item.content.answer !== 'string') {
            throw new Error('answer must be a string (use empty string if no answer)');
        }
    }

    async validateStructure(data, filename) {
        const bookName = path.basename(filename, '.json');
        console.log(`🏗️  Validating data structure for ${bookName}...`);

        if (!data || typeof data !== 'object') {
            throw new ValidationError('Vocabulary data must be an object');
        }

        // Check for expected JSON structure
        if (!data.metadata || !data.vocabulary) {
            throw new ValidationError('Data must have metadata and vocabulary properties');
        }

        if (!Array.isArray(data.vocabulary)) {
            throw new ValidationError('Vocabulary property must be an array');
        }

        // Extract categories from the vocabulary
        const categories = new Set();
        data.vocabulary.forEach(item => {
            if (item.category) {
                categories.add(item.category);
            }
        });

        this.stats.totalCategories = categories.size;
        console.log(`   ✓ Found ${this.stats.totalCategories} categories`);
        console.log(`   ✓ Total vocabulary items: ${data.vocabulary.length}`);
    }

    async validateCategory(data, filename) {
        const bookName = path.basename(filename, '.json');
        // Group items by category
        const categorizedTerms = {};
        const allTerms = data.vocabulary || [];

        allTerms.forEach(term => {
            const category = term.category || 'uncategorized';
            if (!categorizedTerms[category]) {
                categorizedTerms[category] = [];
            }
            categorizedTerms[category].push(term);
        });

        const seenTerms = new Set();

        // Validate each category
        for (const [category, terms] of Object.entries(categorizedTerms)) {
            console.log(`📚 Validating ${category}...`);

            const categoryStats = {
                total: terms.length,
                empty: 0,
                duplicates: 0,
                invalid: 0
            };

            terms.forEach((term, index) => {
                try {
                    this.validateTerm(term, category, index, seenTerms, categoryStats);
                } catch (error) {
                    if (error instanceof ValidationError) {
                        this.errors.push(error);
                    } else {
                        this.errors.push(new ValidationError(
                            error.message,
                            category,
                            index
                        ));
                    }
                }
            });

            this.stats.totalTerms += categoryStats.total;
            this.stats.emptyTerms += categoryStats.empty;
            this.stats.duplicates += categoryStats.duplicates;
            this.stats.invalidFormat += categoryStats.invalid;

            console.log(`   ✓ ${categoryStats.total} terms, ${categoryStats.empty} empty, ${categoryStats.duplicates} duplicates`);
        }
    }

    validateTerm(term, category, index, seenTerms, categoryStats) {
        // Check term structure
        if (!term || typeof term !== 'object') {
            categoryStats.invalid++;
            throw new ValidationError(
                `Term at index ${index} is not an object`,
                category,
                index
            );
        }

        // Check required fields - only english is required now
        if (!term.english) {
            categoryStats.empty++;
            throw new ValidationError(
                `Term at index ${index} missing english field`,
                category,
                index
            );
        }

        // Check field types
        if (typeof term.english !== 'string') {
            categoryStats.invalid++;
            throw new ValidationError(
                `Term at index ${index} has non-string english field`,
                category,
                index
            );
        }

        // Check for empty content
        if (!term.english.trim()) {
            categoryStats.empty++;
            this.warnings.push(`Empty term content in ${category} at index ${index}`);
        }

        // Check for duplicates within category
        const termKey = term.english.toLowerCase();
        if (seenTerms.has(termKey)) {
            categoryStats.duplicates++;
            this.warnings.push(`Duplicate term in ${category}: "${term.english}"`);
        } else {
            seenTerms.add(termKey);
        }

        // Validate English content
        this.validateEnglishTerm(term.english, category, index);
    }

    validateEnglishTerm(english, category, index) {
        // Check for common issues
        if (english.length > 200) {
            this.warnings.push(`Very long English term in ${category}[${index}]: "${english.substring(0, 50)}..."`);
        }

        // Check for suspicious characters
        if (/[^\x00-\x7F]/.test(english) && !/[À-ÿ]/.test(english)) {
            this.warnings.push(`Non-ASCII characters in English term ${category}[${index}]: "${english}"`);
        }

        // Check for multiple sentences (might be intentional)
        if (english.split('.').length > 2) {
            this.warnings.push(`Multi-sentence English term in ${category}[${index}]: "${english}"`);
        }
    }

    // Chinese translation validation removed - not needed for professional vocabulary

    async checkGlobalDuplicates(data, filename) {
        const bookName = path.basename(filename, '.json');
        console.log(`🔍 Checking for duplicates in ${bookName}...`);

        const globalTerms = new Map();
        let globalDuplicates = 0;

        // Process all terms in the vocabulary array
        const vocabulary = data.vocabulary || [];
        vocabulary.forEach((term, index) => {
            const key = term.english.toLowerCase();
            const category = term.category || 'uncategorized';

            if (globalTerms.has(key)) {
                const existing = globalTerms.get(key);
                // Check if there are conflicting definitions or properties
                if ((term.definition && existing.definition &&
                    term.definition !== existing.definition) ||
                    (term.ipa_uk && existing.ipa_uk &&
                        term.ipa_uk !== existing.ipa_uk)) {

                    globalDuplicates++;
                    this.warnings.push(
                        `Same English term with different properties: "${term.english}" ` +
                        `in ${existing.category} and ${category}`
                    );
                }
            } else {
                globalTerms.set(key, {
                    category,
                    index,
                    definition: term.definition,
                    ipa_uk: term.ipa_uk
                });
            }
        });

        console.log(`   ✓ Found ${globalDuplicates} global duplicates with different properties`);
    }

    generateReport() {
        console.log('\n📋 Validation Report');
        console.log('='.repeat(50));

        // Statistics
        console.log('\n📊 Statistics:');
        console.log(`   Total categories: ${this.stats.totalCategories}`);
        console.log(`   Total terms: ${this.stats.totalTerms}`);
        console.log(`   Empty terms: ${this.stats.emptyTerms}`);
        console.log(`   Duplicate terms: ${this.stats.duplicates}`);
        console.log(`   Invalid format: ${this.stats.invalidFormat}`);

        // Errors
        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach((error, index) => {
                const location = error.category ?
                    ` (${error.category}${error.index !== undefined ? `[${error.index}]` : ''})` : '';
                console.log(`   ${index + 1}. ${error.message}${location}`);
            });
        }

        // Warnings
        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.warnings.slice(0, 20).forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });

            if (this.warnings.length > 20) {
                console.log(`   ... and ${this.warnings.length - 20} more warnings`);
            }
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        if (this.errors.length === 0) {
            console.log('✅ Validation passed!');
            if (this.warnings.length === 0) {
                console.log('🎉 No issues found - data quality is excellent!');
            } else {
                console.log(`📝 ${this.warnings.length} warnings found - consider reviewing`);
            }
        } else {
            console.log(`❌ Validation failed with ${this.errors.length} errors`);
            process.exit(1);
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            errors: this.errors.map(e => ({
                message: e.message,
                category: e.category,
                index: e.index
            })),
            warnings: this.warnings,
            status: this.errors.length === 0 ? 'passed' : 'failed'
        };

        // Save report using configured directory
        const reportsDir = this.config.reportsDir;
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const reportPath = path.join(reportsDir, 'validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to ${reportPath}`);
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new DataValidator();
    validator.validate().catch(error => {
        console.error('❌ Validation script failed:', error);
        process.exit(1);
    });
}

module.exports = { DataValidator };