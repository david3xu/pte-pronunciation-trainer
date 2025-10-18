#!/usr/bin/env node

/**
 * PTE Data Pipeline - Processes PTE vocabulary data
 * Converts PTE vocabulary markdown files to structured JSON datasets
 */

const fs = require('fs');
const path = require('path');
const PTETermsExtractor = require('../src/js/data/extractors/PTETermsExtractor.js');
const SingleIPATermsExtractor = require('../src/js/data/extractors/SingleIPATermsExtractor.js');
const PTESentenceExtractor = require('../src/js/data/extractors/PTESentenceExtractor.js');
const PTEQuestionExtractor = require('../src/js/data/extractors/PTEQuestionExtractor.js');
const AppConfig = require('../src/js/shared/Config.js');

class PTEDataPipeline {
  constructor(config = {}) {
    // Load centralized configuration
    const appConfig = new AppConfig();
    const pipelineConfig = appConfig.get('pipeline');

    // Use provided config or fall back to centralized config
    this.config = {
      inputDir: config.inputDir || path.join(__dirname, '..', pipelineConfig.inputDir),
      outputDir: config.outputDir || path.join(__dirname, '..', pipelineConfig.outputDir),
      reportsDir: config.reportsDir || path.join(__dirname, '..', pipelineConfig.reportsDir),
      dataSources: config.dataSources || pipelineConfig.dataSources,
      outputFiles: config.outputFiles || pipelineConfig.outputFiles,
      extraSources: config.extraSources || pipelineConfig.extraSources || [],
      registry: config.registry || pipelineConfig.registry || []
    };
    this.results = new Map();
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      startTime: new Date()
    };
  }

  async run() {
    console.log('🚀 Starting PTE Data Pipeline...\n');
    console.log(`📁 Input directory: ${this.config.inputDir}`);
    console.log(`📁 Output directory: ${this.config.outputDir}\n`);

    try {
      // Stage 1: Extract PTE vocabulary
      await this.extractPTEVocabulary();

      // Stage 2: Generate datasets
      await this.generatePTEDatasets();

      // Stage 3: Validate and report
      this.validateData();
      this.generateReport();

      console.log('\n✅ PTE Data Pipeline completed successfully!');
    } catch (error) {
      console.error('\n❌ PTE Data Pipeline failed:', error.message);
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Extract PTE vocabulary from markdown files
   */
  async extractPTEVocabulary() {
    console.log('📝 STAGE 1: Extracting PTE Vocabulary Data');

    // If a centralized registry is present, just record primary extraction here.
    // The actual per-dataset extraction happens in generatePTEDatasets() using the registry.
    const fibIpaFilePath = path.join(this.config.inputDir, this.config.dataSources.subdirectory, this.config.dataSources.primary);
    try {
      const fibIpaVocabulary = await PTETermsExtractor.extract(fibIpaFilePath, fs);
      this.results.set('fibIpaVocabulary', fibIpaVocabulary);
      this.stats.totalProcessed += fibIpaVocabulary.length;
      console.log(`   ✅ Processed ${fibIpaVocabulary.length} FIB listening terms with IPA from ${fibIpaFilePath}`);
    } catch (error) {
      console.error(`   ❌ Error processing ${fibIpaFilePath}: ${error.message}`);
      this.stats.totalErrors++;

      // Only use fallback if primary fails
      console.log(`   🔄 Trying fallback file...`);
      const fibFilePath = path.join(this.config.inputDir, this.config.dataSources.subdirectory, this.config.dataSources.fallback);
      try {
        const fibVocabulary = await this.extractPTETerms(fibFilePath);
        this.results.set('fibVocabulary', fibVocabulary);
        this.stats.totalProcessed += fibVocabulary.length;
        console.log(`   ✅ Processed ${fibVocabulary.length} FIB listening terms from fallback ${fibFilePath}`);
      } catch (fallbackError) {
        console.error(`   ❌ Error processing fallback ${fibFilePath}: ${fallbackError.message}`);
        this.stats.totalErrors++;
      }
    }

    console.log(`\n📊 Stage 1 Summary: ${this.stats.totalProcessed} terms processed, ${this.stats.totalErrors} errors\n`);
  }

  /**
   * Extract PTE terms from markdown file
   */
  async extractPTETerms(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PTE vocabulary file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const terms = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines, headers, and metadata
      if (!trimmedLine ||
        trimmedLine.startsWith('#') ||
        trimmedLine.startsWith('**') ||
        trimmedLine.includes('Mastered:') ||
        trimmedLine.includes('默认排序') ||
        trimmedLine.includes('全部') ||
        trimmedLine.includes('This vocabulary booklet') ||
        trimmedLine.includes('Essential vocabulary')) {
        continue;
      }

      // Extract word from numbered list format: "1. word" or just "word"
      let word = trimmedLine;
      const match = trimmedLine.match(/^\d+\.\s*(.+)$/);
      if (match) {
        word = match[1].trim();
      }

      // Remove zero-width characters and BOMs
      word = word.replace(/[\u200B-\u200D\uFEFF]/g, '');

      // Strip trailing mastery markers like "Not mastered" or "Mastered"
      // Allow optional space or no space before the marker
      word = word.replace(/\s*(Not\s*mastered|Mastered)$/i, '');

      // Skip if not a valid word (allow letters, spaces, hyphens, and apostrophes)
      if (!word || word.length < 2 || !/^[a-zA-Z\s'-]+$/.test(word)) {
        continue;
      }

      // Create term object
      const term = {
        english: word,
        difficulty: this.inferDifficulty(word),
        category: 'pte-fib-listening',
        source: 'pte-fib-listening-vocabulary'
      };

      terms.push(term);
    }

    return terms;
  }

  /**
   * Infer difficulty level based on word characteristics
   */
  inferDifficulty(word) {
    const length = word.length;
    const syllables = this.countSyllables(word);

    if (length <= 4 && syllables <= 2) {
      return 'easy';
    } else if (length <= 8 && syllables <= 3) {
      return 'normal';
    } else {
      return 'hard';
    }
  }

  /**
   * Count syllables in a word (approximate)
   */
  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Generate PTE datasets
   */
  async generatePTEDatasets() {
    console.log('📦 STAGE 2: Generating PTE Datasets');

    const registry = (this.config.registry || []).filter(Boolean);

    if (registry.length > 0) {
      // Centralized build path: iterate over registry entries
      for (const entry of registry) {
        try {
          // Determine which extractor to use
          const extractorType = entry.extractorType || entry.extractor || 'PTETermsExtractor';
          const dataType = entry.dataType || entry.type || 'vocabulary';
          
          // Build input path with optional subdirectory
          const inputSubdir = entry.inputSubdir || this.config.dataSources.subdirectory;
          const inputPath = path.join(this.config.inputDir, inputSubdir, entry.input);
          
          console.log(`   🔄 Processing ${entry.id} (${dataType}) using ${extractorType}...`);
          
          let dataset;
          let terms = [];
          let usedFallback = false;

          // Dynamic extractor loading based on type
          if (extractorType === 'PTESentenceExtractor') {
            // Handle sentence-based datasets (RS, WFD)
            dataset = await PTESentenceExtractor.extract(inputPath, { type: dataType });

          } else if (extractorType === 'PTEQuestionExtractor') {
            // Handle question-based datasets (ASQ)
            dataset = await PTEQuestionExtractor.extract(inputPath);

          } else if (extractorType === 'SingleIPATermsExtractor') {
            // Handle vocabulary with single IPA format
            try {
              terms = await SingleIPATermsExtractor.extract(inputPath, fs, {
                category: entry.category,
                source: entry.sourceType
              });
            } catch (e) {
              // On parser error, try fallback simple list if configured
              if (entry.fallback) {
                const fallbackPath = path.join(this.config.inputDir, inputSubdir, entry.fallback);
                terms = await this.extractPTETerms(fallbackPath);
                usedFallback = true;
              } else {
                throw e;
              }
            }

            // If IPA extractor returned zero, attempt fallback simple list
            if ((!terms || terms.length === 0) && entry.fallback) {
              const fallbackPath = path.join(this.config.inputDir, inputSubdir, entry.fallback);
              terms = await this.extractPTETerms(fallbackPath);
              usedFallback = true;
            }

            const unique = this.removeDuplicates(terms);
            dataset = {
              metadata: {
                generated: new Date().toISOString(),
                totalTerms: unique.length,
                source: entry.sourceType,
                description: entry.description,
                version: '1.0',
                categories: [entry.category],
                hasIPA: !usedFallback
              },
              vocabulary: unique
            };

          } else {
            // Handle vocabulary-based datasets (default PTETermsExtractor)
            try {
              terms = await PTETermsExtractor.extract(inputPath, fs, {
                category: entry.category,
                source: entry.sourceType
              });
            } catch (e) {
              // On parser error, try fallback simple list if configured
              if (entry.fallback) {
                const fallbackPath = path.join(this.config.inputDir, inputSubdir, entry.fallback);
                terms = await this.extractPTETerms(fallbackPath);
                usedFallback = true;
              } else {
                throw e;
              }
            }

            // If IPA extractor returned zero, attempt fallback simple list
            if ((!terms || terms.length === 0) && entry.fallback) {
              const fallbackPath = path.join(this.config.inputDir, inputSubdir, entry.fallback);
              terms = await this.extractPTETerms(fallbackPath);
              usedFallback = true;
            }

            const unique = this.removeDuplicates(terms);
            dataset = {
              metadata: {
                generated: new Date().toISOString(),
                totalTerms: unique.length,
                source: entry.sourceType,
                description: entry.description,
                version: '1.0',
                categories: [entry.category],
                hasIPA: !usedFallback
              },
              vocabulary: unique
            };
          }
          
          // Save the dataset
          this.saveDataset(entry.output, dataset);
          
          // Get count based on dataset structure
          const count = dataset.items ? dataset.items.length : 
                       dataset.vocabulary ? dataset.vocabulary.length : 0;
          
          console.log(`   ✅ Generated dataset: ${entry.id} (${count} items)`);
          
        } catch (e) {
          console.warn(`   ⚠️  Skipped dataset ${entry.id}: ${e.message}`);
        }
      }
    } else {
      // Backward-compatible path (legacy build of FIB + extras)
      const fibIpaTerms = this.results.get('fibIpaVocabulary') || [];
      const fibTerms = this.results.get('fibVocabulary') || [];
      let finalTerms = fibIpaTerms.length > 0 ? fibIpaTerms : fibTerms;
      const sourceType = fibIpaTerms.length > 0 ? 'pte-fib-listening-with-ipa' : 'pte-fib-listening-vocabulary';
      const uniqueTerms = this.removeDuplicates(finalTerms);
      console.log(`   🔄 Removed ${finalTerms.length - uniqueTerms.length} duplicate terms`);
      finalTerms = uniqueTerms;
      if (finalTerms.length > 0) {
        const dataset = {
          metadata: {
            generated: new Date().toISOString(),
            totalTerms: finalTerms.length,
            source: sourceType,
            description: 'PTE FIB Listening vocabulary for pronunciation practice with IPA guides',
            version: '2.0',
            categories: ['pte-fib-listening'],
            hasIPA: fibIpaTerms.length > 0
          },
          vocabulary: finalTerms
        };
        this.saveDataset(this.config.outputFiles.dataset, dataset);
      }

      const extras = (this.config.extraSources || []).filter(Boolean);
      for (const extra of extras) {
        try {
          const extraPath = path.join(this.config.inputDir, this.config.dataSources.subdirectory, extra.input);
          const extraTerms = await PTETermsExtractor.extract(extraPath, fs);
          const unique = this.removeDuplicates(extraTerms);
          const dataset = {
            metadata: {
              generated: new Date().toISOString(),
              totalTerms: unique.length,
              source: extra.sourceType,
              description: extra.description,
              version: '1.0',
              categories: [extra.category],
              hasIPA: true
            },
            vocabulary: unique
          };
          this.saveDataset(extra.output, dataset);
          console.log(`   ✅ Generated extra dataset: ${extra.id} (${unique.length} terms)`);
        } catch (e) {
          console.warn(`   ⚠️  Skipped extra dataset ${extra.id}: ${e.message}`);
        }
      }
    }

    console.log(`\n📊 Stage 2 Summary: Generated PTE datasets\n`);
  }

  /**
   * Save dataset to file
   */
  saveDataset(filename, dataset) {
    const outputPath = path.join(this.config.outputDir, 'processed', filename);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
    
    // Get count based on dataset structure
    const count = dataset.items ? dataset.items.length : 
                 dataset.vocabulary ? dataset.vocabulary.length : 0;
    
    console.log(`   ✅ Saved ${count} items to ${filename}`);
  }

  /**
   * Validate processed data
   */
  validateData() {
    console.log('🔍 STAGE 3: Validating Data');

    const fibIpaTerms = this.results.get('fibIpaVocabulary') || [];
    const fibTerms = this.results.get('fibVocabulary') || [];
    const allTerms = fibIpaTerms.length > 0 ? fibIpaTerms : fibTerms;

    // Basic validation
    const emptyTerms = allTerms.filter(term => !term.english || !term.english.trim());
    const duplicateTerms = this.findDuplicates(allTerms);

    console.log(`   ✓ FIB terms: ${allTerms.length}`);
    console.log(`   ✓ Empty terms: ${emptyTerms.length}`);
    console.log(`   ✓ Duplicate terms: ${duplicateTerms.length}`);
    console.log(`   ✓ Has IPA pronunciation: ${fibIpaTerms.length > 0 ? 'Yes' : 'No'}`);

    if (emptyTerms.length > 0) {
      console.warn(`   ⚠️  Found ${emptyTerms.length} empty terms`);
    }

    if (duplicateTerms.length > 0) {
      console.warn(`   ⚠️  Found ${duplicateTerms.length} duplicate terms`);
    }
  }

  /**
   * Find duplicate terms
   */
  findDuplicates(terms) {
    const seen = new Set();
    const duplicates = [];

    for (const term of terms) {
      const key = term.english.toLowerCase();
      if (seen.has(key)) {
        duplicates.push(term.english);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  /**
   * Remove duplicate terms - keep only unique terms
   */
  removeDuplicates(terms) {
    const seen = new Set();
    const uniqueTerms = [];

    for (const term of terms) {
      const key = term.english.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTerms.push(term);
      }
    }

    return uniqueTerms;
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
      duration: new Date() - this.stats.startTime,
      datasets: [
        {
          name: 'pte-fib-listening',
          count: (this.results.get('fibIpaVocabulary') || this.results.get('fibVocabulary') || []).length,
          hasIPA: (this.results.get('fibIpaVocabulary') || []).length > 0
        }
      ],
      status: this.stats.totalErrors === 0 ? 'success' : 'partial_success'
    };

    const reportPath = path.join(this.config.reportsDir, this.config.outputFiles.report);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📑 Processing report saved to ${reportPath}`);
  }
}

// Run pipeline if called directly
if (require.main === module) {
  const pipeline = new PTEDataPipeline();
  pipeline.run().catch(error => {
    console.error('❌ PTE Data Pipeline failed:', error);
    process.exit(1);
  });
}

module.exports = { PTEDataPipeline };
