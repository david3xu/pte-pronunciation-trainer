#!/usr/bin/env node

/**
 * Data Validation Script for CCL Pronunciation Trainer
 * Validates vocabulary data integrity and format
 */

const fs = require('fs');
const path = require('path');

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
            // Check if vocabulary data exists
            const vocabPath = 'data/generated/vocabulary-data.js';
            if (!fs.existsSync(vocabPath)) {
                throw new Error('Vocabulary data file not found. Run "npm run convert" first.');
            }

            // Load vocabulary data by requiring the module
            const fullPath = path.resolve(vocabPath);
            delete require.cache[fullPath]; // Clear cache to get fresh data
            const vocabularyData = require('../' + vocabPath);

            // Validate structure
            await this.validateStructure(vocabularyData);
            
            // Validate each category
            for (const [category, terms] of Object.entries(vocabularyData)) {
                await this.validateCategory(category, terms);
            }
            
            // Check for global duplicates
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

        const expectedCategories = [
            'social-welfare',
            'education', 
            'legal-government',
            'business-finance',
            'medical-healthcare',
            'travel-immigration'
        ];

        this.stats.totalCategories = Object.keys(data).length;

        // Check expected categories
        for (const category of expectedCategories) {
            if (!data[category]) {
                this.warnings.push(`Missing expected category: ${category}`);
            }
        }

        // Check for unexpected categories
        for (const category of Object.keys(data)) {
            if (!expectedCategories.includes(category)) {
                this.warnings.push(`Unexpected category found: ${category}`);
            }
        }

        console.log(`   ✓ Found ${this.stats.totalCategories} categories`);
    }

    async validateCategory(category, terms) {
        console.log(`📚 Validating ${category}...`);
        
        if (!Array.isArray(terms)) {
            this.errors.push(new ValidationError(
                `Category ${category} must contain an array of terms`,
                category
            ));
            return;
        }

        const categoryStats = {
            total: terms.length,
            empty: 0,
            duplicates: 0,
            invalid: 0
        };

        const seenTerms = new Set();

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

        // Check required fields
        if (!term.english || !term.chinese) {
            categoryStats.empty++;
            throw new ValidationError(
                `Term at index ${index} missing english or chinese field`,
                category,
                index
            );
        }

        // Check field types
        if (typeof term.english !== 'string' || typeof term.chinese !== 'string') {
            categoryStats.invalid++;
            throw new ValidationError(
                `Term at index ${index} has non-string fields`,
                category,
                index
            );
        }

        // Check for empty content
        if (!term.english.trim() || !term.chinese.trim()) {
            categoryStats.empty++;
            this.warnings.push(`Empty term content in ${category} at index ${index}`);
        }

        // Check for duplicates within category
        const termKey = `${term.english.toLowerCase()}:${term.chinese}`;
        if (seenTerms.has(termKey)) {
            categoryStats.duplicates++;
            this.warnings.push(`Duplicate term in ${category}: "${term.english}"`);
        } else {
            seenTerms.add(termKey);
        }

        // Validate English content
        this.validateEnglishTerm(term.english, category, index);
        
        // Validate Chinese content
        this.validateChineseTerm(term.chinese, category, index);
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

    validateChineseTerm(chinese, category, index) {
        // Check for common issues
        if (chinese.length > 100) {
            this.warnings.push(`Very long Chinese term in ${category}[${index}]: "${chinese.substring(0, 20)}..."`);
        }

        // Check if contains Chinese characters
        if (!/[\u4e00-\u9fff]/.test(chinese)) {
            this.warnings.push(`Chinese term may not contain Chinese characters ${category}[${index}]: "${chinese}"`);
        }
    }

    async checkGlobalDuplicates(vocabularyData) {
        console.log('🔍 Checking for global duplicates...');
        
        const globalTerms = new Map();
        let globalDuplicates = 0;

        for (const [category, terms] of Object.entries(vocabularyData)) {
            terms.forEach((term, index) => {
                const key = term.english.toLowerCase();
                if (globalTerms.has(key)) {
                    const existing = globalTerms.get(key);
                    if (existing.chinese !== term.chinese) {
                        globalDuplicates++;
                        this.warnings.push(
                            `Same English term with different Chinese: "${term.english}" ` +
                            `in ${existing.category} ("${existing.chinese}") and ${category} ("${term.chinese}")`
                        );
                    }
                } else {
                    globalTerms.set(key, {
                        category,
                        index,
                        chinese: term.chinese
                    });
                }
            });
        }

        console.log(`   ✓ Found ${globalDuplicates} global duplicates with different translations`);
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

        // Save report in a reports directory
        const reportsDir = 'reports';
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