#!/usr/bin/env node

/**
 * Resume Data Pipeline - Focused version of the Unified Data Pipeline
 * Processes only resume-terms.md and professional vocabulary
 */

const fs = require('fs');
const path = require('path');

// Import specialized data extractors and formatters
const ResumeTermsExtractor = require('../src/js/data/extractors/ResumeTermsExtractor');

class ResumeDataPipeline {
    constructor() {
        this.config = {
            inputDir: path.join(__dirname, '../data/source'),
            outputDir: path.join(__dirname, '../data'),
            reportsDir: path.join(__dirname, '../data/reports')
        };
        this.results = new Map();
        this.stats = {
            totalProcessed: 0,
            totalErrors: 0,
            processingTime: 0
        };
    }

    /**
     * Main pipeline execution
     */
    async run() {
        const startTime = Date.now();
        console.log('🚀 Starting Resume Data Pipeline...\n');

        try {
            // Stage 1: Extract resume terms data
            await this.extractResumeTerms();

            // Stage 2: Generate dataset
            await this.generateResumeTermsDataset();

            // Stage 3: Validate and report
            this.validateData();

            // Complete
            const endTime = Date.now();
            this.stats.processingTime = ((endTime - startTime) / 1000).toFixed(2);
            this.generateReport();

            console.log(`\n✅ Resume Data Pipeline completed in ${this.stats.processingTime}s`);
            console.log(`   Processed ${this.stats.totalProcessed} terms with ${this.stats.totalErrors} errors`);
        } catch (error) {
            console.error(`❌ Pipeline failed: ${error.message}`);
            console.error(error);
            process.exit(1);
        }
    }

    /**
     * Extract resume terms with pronunciation guides
     */
    async extractResumeTerms() {
        console.log('📝 STAGE 1: Extracting Resume Terms Data');

        // Process resume-terms.md
        const filePath = path.join(this.config.inputDir, 'resume-terms.md');
        try {
            const resumeTerms = await ResumeTermsExtractor.extract(filePath, fs);
            this.results.set('resumeTerms', resumeTerms);
            this.stats.totalProcessed += resumeTerms.length;
            console.log(`   ✅ Processed ${resumeTerms.length} resume terms from ${filePath}`);
        } catch (error) {
            console.error(`   ❌ Error processing ${filePath}: ${error.message}`);
            this.stats.totalErrors++;
        }

        // Process ai-ml-pronunciation-terms.md (AI/ML terms) if it exists
        const aimlFilePath = path.join(this.config.inputDir, 'ai-ml-pronunciation-terms.md');
        if (fs.existsSync(aimlFilePath)) {
            try {
                // Basic extraction for AI/ML terms from ai-ml-pronunciation-terms.md
                const content = fs.readFileSync(aimlFilePath, 'utf-8');
                const lines = content.split('\n');
                const terms = [];
                let currentSection = null;

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    // Section headers (## Section Name)
                    if (trimmed.startsWith('## ')) {
                        currentSection = trimmed.replace('## ', '').trim();
                        continue;
                    }

                    // Skip main title
                    if (trimmed.startsWith('# ')) continue;

                    // Process terms with pronunciation guides and definitions
                    if (trimmed.startsWith('**')) {
                        // Handle format: **Term** | pronunciation | definition
                        const match = trimmed.match(/^\*\*([^*]+)\*\*\s*\|\s*(.+)$/);
                        if (match) {
                            const term = match[1].trim();
                            const restOfLine = match[2].trim();

                            // Extract definition (everything after the last pronunciation guide)
                            // Look for the pattern: sounds like **SIMPLE-GUIDE** | sounds like **SIMPLE-GUIDE** | definition
                            const parts = restOfLine.split('|');
                            let definition = '';

                            if (parts.length >= 3) {
                                // Format: pronunciation1 | pronunciation2 | definition
                                definition = parts.slice(2).join('|').trim();
                            } else if (parts.length === 2) {
                                // Format: pronunciation | definition
                                definition = parts[1].trim();
                            } else {
                                // Fallback: use the whole rest of line as definition
                                definition = restOfLine;
                            }

                            const termData = {
                                english: term,
                                definition: definition,
                                difficulty: this.inferDifficulty(term),
                                category: currentSection || 'ai-ml',
                                source: 'ai-ml-pronunciation-terms'
                            };

                            terms.push(termData);
                        }
                    }
                }

                this.results.set('aimlTerms', terms);
                this.stats.totalProcessed += terms.length;
                console.log(`   ✅ Processed ${terms.length} AI/ML terms from ${aimlFilePath}`);
            } catch (error) {
                console.error(`   ❌ Error processing ${aimlFilePath}: ${error.message}`);
                this.stats.totalErrors++;
            }
        }
    }

    /**
     * Generate resume terms dataset
     */
    async generateResumeTermsDataset() {
        console.log('\n📊 STAGE 2: Generating Datasets');

        // Generate resume terms dataset
        const resumeTerms = this.results.get('resumeTerms') || [];
        if (resumeTerms.length > 0) {
            const dataset = {
                metadata: {
                    generated: new Date().toISOString(),
                    totalTerms: resumeTerms.length,
                    source: 'resume-data-pipeline',
                    description: 'Professional vocabulary with pronunciation guides',
                    version: '2.0'
                },
                vocabulary: resumeTerms
            };

            this.saveDataset('resume-terms-dataset.json', dataset);
        }

        // Generate AI/ML terms dataset if available
        const aimlTerms = this.results.get('aimlTerms') || [];
        if (aimlTerms.length > 0) {
            const dataset = {
                metadata: {
                    generated: new Date().toISOString(),
                    totalTerms: aimlTerms.length,
                    source: 'resume-data-pipeline',
                    description: 'AI/ML terminology with definitions',
                    version: '2.0'
                },
                vocabulary: aimlTerms
            };

            this.saveDataset('aiml-terms-dataset.json', dataset);
        }

        // Generate a combined professional dataset
        const combinedTerms = [...resumeTerms, ...aimlTerms];
        if (combinedTerms.length > 0) {
            const dataset = {
                metadata: {
                    generated: new Date().toISOString(),
                    totalTerms: combinedTerms.length,
                    source: 'resume-data-pipeline',
                    description: 'Combined professional vocabulary dataset',
                    version: '2.0'
                },
                vocabulary: combinedTerms
            };

            this.saveDataset('professional-terms-dataset.json', dataset);
        }
    }

    /**
     * Save dataset to file
     */
    saveDataset(filename, data) {
        // Ensure processed directory exists
        const processedDir = path.join(this.config.outputDir, 'processed');
        if (!fs.existsSync(processedDir)) {
            fs.mkdirSync(processedDir, { recursive: true });
        }

        const filePath = path.join(processedDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`   ✅ Generated ${filename} with ${data.vocabulary.length} terms`);
    }

    /**
     * Validate the processed data for errors
     */
    validateData() {
        console.log('\n🔍 STAGE 3: Validating Data');

        let hasErrors = false;
        const errors = [];

        // Check resume terms
        const resumeTerms = this.results.get('resumeTerms') || [];
        for (const term of resumeTerms) {
            if (!term.english || !term.ipa) {
                errors.push(`Missing required field in term: ${term.english || 'unnamed term'}`);
                hasErrors = true;
            }
        }

        // Check AI/ML terms
        const aimlTerms = this.results.get('aimlTerms') || [];
        for (const term of aimlTerms) {
            if (!term.english || !term.definition) {
                errors.push(`Missing required field in AI/ML term: ${term.english || 'unnamed term'}`);
                hasErrors = true;
            }
        }

        if (hasErrors) {
            console.log(`   ❌ Found ${errors.length} validation errors`);
            this.stats.totalErrors += errors.length;
        } else {
            console.log('   ✅ All data validated successfully');
        }
    }

    /**
     * Generate processing report
     */
    generateReport() {
        // Create reports directory if it doesn't exist
        if (!fs.existsSync(this.config.reportsDir)) {
            fs.mkdirSync(this.config.reportsDir, { recursive: true });
        }

        const report = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            datasets: [
                {
                    name: 'resume-terms',
                    count: (this.results.get('resumeTerms') || []).length
                },
                {
                    name: 'aiml-terms',
                    count: (this.results.get('aimlTerms') || []).length
                }
            ]
        };

        const reportPath = path.join(this.config.reportsDir, 'resume-processing-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📑 Processing report saved to ${reportPath}`);
    }

    /**
     * Infer difficulty from English text
     */
    inferDifficulty(english) {
        if (!english) return 'normal';

        const words = english.trim().split(/\s+/).length;
        const length = english.length;

        // Single word, short
        if (words === 1 && length < 8) return 'easy';

        // Long phrases or technical terms
        if (words > 4 || length > 40 || english.includes('application') || english.includes('assessment')) {
            return 'hard';
        }

        // Everything else
        return 'normal';
    }
}

// Run the pipeline if called directly
if (require.main === module) {
    const pipeline = new ResumeDataPipeline();
    pipeline.run().catch(console.error);
}

module.exports = ResumeDataPipeline;