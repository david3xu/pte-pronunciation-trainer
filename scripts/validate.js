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
                    throw new Error(this.config.errorMessages.datasetNotFound);
                }
            }

            // Use first required file as primary dataset
            const vocabPath = this.config.requiredFiles[0];

            // Load vocabulary data from JSON file
            const fullPath = path.resolve(vocabPath);
            const fileContent = fs.readFileSync(fullPath, 'utf-8');
            const vocabularyData = JSON.parse(fileContent);

            // Validate structure
            await this.validateStructure(vocabularyData);

            // Validate all terms by category
            await this.validateCategory(vocabularyData);

            // Check for global duplicates (using the same data)
            await this.checkGlobalDuplicates(vocabularyData);

            // Generate report
            this.generateReport();

        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        }
    }

    async validateStructure(data) {
        console.log('🏗️  Validating data structure...');

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

    async validateCategory(data) {
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

    async checkGlobalDuplicates(data) {
        console.log('🔍 Checking for global duplicates...');

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