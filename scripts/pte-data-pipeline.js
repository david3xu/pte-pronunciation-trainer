#!/usr/bin/env node

/**
 * PTE Data Pipeline - Processes PTE vocabulary data
 * Converts PTE vocabulary markdown files to structured JSON datasets
 *
 * NOTE: This script has been updated to be self-contained for Vercel builds,
 * removing dependencies on external TS files or deleted legacy code.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents of __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// INLINED CONFIGURATION
// ==========================================
const PIPELINE_CONFIG = {
  inputDir: 'data/source/pte',
  outputDir: 'data',
  reportsDir: 'data/reports',
  dataSources: {
    primary: 'pte-fib-listening-with-ipa.md',
    fallback: 'fib-listening-vocabulary.md',
    subdirectory: 'vocabs'
  },
  outputFiles: {
    dataset: 'pte-fib-listening-dataset.json',
    report: 'pte-processing-report.json'
  },
  registry: [
    {
      id: 'pte-fib-listening',
      input: 'pte-fib-listening-with-ipa.md',
      fallback: 'fib-listening-vocabulary.md',
      output: 'pte-fib-listening-dataset.json',
      category: 'pte-fib-listening',
      description: 'PTE FIB Listening vocabulary with IPA',
      sourceType: 'pte-fib-listening-with-ipa',
      dataType: 'vocabulary',
      extractorType: 'PTETermsExtractor',
      inputSubdir: 'vocabs',
      isDefault: true
    }
    // Add other registry entries here if needed for the build
  ]
};

// ==========================================
// INLINED EXTRACTORS
// ==========================================

/**
 * PTETermsExtractor - Parses PTE vocabulary markdown files
 */
class PTETermsExtractor {
  static async extract(filePath, fsModule, options = {}) {
    if (!fsModule.existsSync(filePath)) {
      throw new Error(`PTE terms file not found: ${filePath}`);
    }

    const content = fsModule.readFileSync(filePath, 'utf-8');
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
        trimmedLine.includes('Essential vocabulary') ||
        trimmedLine.includes('Co-words')) {
        continue;
      }

      // Extract term with IPA pronunciation data
      const termData = this.parsePTETermLine(trimmedLine, options);
      if (termData) {
        terms.push(termData);
      }
    }

    return terms;
  }

  static parsePTETermLine(line, options = {}) {
    // Match the format: number. term | /IPA/ — sounds like **PHONETIC** [| /IPA/ — sounds like **PHONETIC**]
    // Support both single pronunciation (one pipe) and dual pronunciation (two pipes)
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(.+?)(?:\s*\|\s*(.+))?$/);

    if (!match) {
      return null;
    }

    let [, termPart, firstPronunciation, secondPronunciation] = match;

    // Extract word type (n., v., adj., adv., num., abbr., etc.) if present
    let wordType = null;
    let term = termPart.trim();

    // Match word type patterns
    const wordTypeMatch = term.match(/^(n\.|v\.|adj\.|adv\.|num\.|abbr\.|prep\.|conj\.|pron\.|interj\.)\s+(.+)$/i);
    if (wordTypeMatch) {
      wordType = wordTypeMatch[1].toLowerCase();
      term = wordTypeMatch[2].trim();
    }

    // Parse pronunciation data
    // Format: /IPA/ — sounds like **PHONETIC**
    const parsePronunciation = (text) => {
      if (!text) return null;
      const match = text.match(/^\/(.+?)\/\s*—\s*(?:sounds\s+like\s+)?\*\*(.+?)\*\*$/);
      if (!match) return null;
      return {
        ipa: match[1].trim(),
        phonetic: match[2].trim()
      };
    };

    const firstData = parsePronunciation(firstPronunciation);
    const secondData = parsePronunciation(secondPronunciation);

    if (!firstData) {
      return null;
    }

    // If we have two pronunciations, assume British | American
    // If we have only one, use it for both or default to British
    const britishData = firstData;
    const americanData = secondData || firstData;

    // Create initial result object with extracted data
    const extractedData = {
      english: term,
      pronunciation: {
        british: {
          ipa: britishData.ipa,
          phonetic: britishData.phonetic
        },
        american: {
          ipa: americanData.ipa,
          phonetic: americanData.phonetic
        }
      },
      difficulty: this.inferDifficulty(term),
      category: options.category || 'pte-vocabulary',
      source: options.source || 'pte-vocabulary-with-ipa'
    };

    if (wordType) {
      extractedData.wordType = wordType;
    }

    return extractedData;
  }

  static inferDifficulty(word) {
    if (!word) return 'normal';
    if (word.length <= 5) return 'easy';
    if (word.length <= 9) return 'normal';
    return 'hard';
  }
}

// ==========================================
// PIPELINE CLASS
// ==========================================

class PTEDataPipeline {
  constructor(config = {}) {
    // Use provided config or fall back to inlined config
    this.config = {
      inputDir: config.inputDir || path.join(__dirname, '..', PIPELINE_CONFIG.inputDir),
      outputDir: config.outputDir || path.join(__dirname, '..', PIPELINE_CONFIG.outputDir),
      reportsDir: config.reportsDir || path.join(__dirname, '..', PIPELINE_CONFIG.reportsDir),
      dataSources: config.dataSources || PIPELINE_CONFIG.dataSources,
      outputFiles: config.outputFiles || PIPELINE_CONFIG.outputFiles,
      registry: config.registry || PIPELINE_CONFIG.registry || []
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

    const fibIpaFilePath = path.join(this.config.inputDir, this.config.dataSources.subdirectory, this.config.dataSources.primary);

    // Check if file exists before trying to extract
    if (!fs.existsSync(fibIpaFilePath)) {
      console.warn(`   ⚠️ Primary file not found: ${fibIpaFilePath}`);
      return;
    }

    try {
      const fibIpaVocabulary = await PTETermsExtractor.extract(fibIpaFilePath, fs);
      this.results.set('fibIpaVocabulary', fibIpaVocabulary);
      this.stats.totalProcessed += fibIpaVocabulary.length;
      console.log(`   ✅ Processed ${fibIpaVocabulary.length} FIB listening terms with IPA from ${fibIpaFilePath}`);
    } catch (error) {
      console.error(`   ❌ Error processing ${fibIpaFilePath}: ${error.message}`);
      this.stats.totalErrors++;
    }

    console.log(`\n📊 Stage 1 Summary: ${this.stats.totalProcessed} terms processed, ${this.stats.totalErrors} errors\n`);
  }

  /**
   * Generate PTE datasets
   */
  /**
   * Generate PTE datasets
   */
  async generatePTEDatasets() {
    console.log('📦 STAGE 2: Generating PTE Datasets');

    // Auto-discover vocabulary books
    const discoveredBooks = await this.discoverVocabularyBooks();
    console.log(`   🔎 Discovered ${discoveredBooks.length} vocabulary books in source directory`);

    // Merge discovered books with existing registry (avoiding duplicates by ID)
    const existingIds = new Set((this.config.registry || []).map(r => r.id));
    const registry = [
      ...(this.config.registry || []),
      ...discoveredBooks.filter(book => !existingIds.has(book.id))
    ].filter(Boolean);

    if (registry.length > 0) {
      for (const entry of registry) {
        try {
          // Only support PTETermsExtractor for now in this simplified build script
          if (entry.extractorType !== 'PTETermsExtractor') {
            console.log(`   ℹ️ Skipping ${entry.id} (extractor ${entry.extractorType} not supported in build script)`);
            continue;
          }

          const inputSubdir = entry.inputSubdir || this.config.dataSources.subdirectory;
          const inputPath = path.join(this.config.inputDir, inputSubdir, entry.input);

          console.log(`   🔄 Processing ${entry.id} using ${entry.extractorType}...`);

          let terms = [];
          try {
            terms = await PTETermsExtractor.extract(inputPath, fs, {
              category: entry.category,
              source: entry.sourceType
            });
          } catch (e) {
            console.warn(`   ⚠️  Failed to extract ${entry.id}: ${e.message}`);
            continue;
          }

          const unique = this.removeDuplicates(terms);
          const dataset = {
            metadata: {
              generated: new Date().toISOString(),
              totalTerms: unique.length,
              source: entry.sourceType,
              description: entry.description,
              version: '1.0',
              categories: [entry.category],
              hasIPA: true
            },
            vocabulary: unique
          };

          this.saveDataset(entry.output, dataset);
        } catch (e) {
          console.warn(`   ⚠️  Skipped dataset ${entry.id}: ${e.message}`);
        }
      }
    }

    console.log(`\n📊 Stage 2 Summary: Generated PTE datasets\n`);
  }

  /**
   * Discover vocabulary books from source directory
   */
  async discoverVocabularyBooks() {
    const vocabsDir = path.join(this.config.inputDir, 'vocabs');

    if (!fs.existsSync(vocabsDir)) {
      console.warn(`   ⚠️ Vocabs directory not found: ${vocabsDir}`);
      return [];
    }

    try {
      const files = fs.readdirSync(vocabsDir);
      return files
        .filter(file => file.endsWith('.md') && !file.startsWith('help-'))
        .map(file => {
          // Generate ID from filename (remove -with-ipa.md or .md)
          const id = file
            .replace('-with-ipa.md', '')
            .replace('.md', '');

          return {
            id: id,
            input: file,
            output: `${id}.json`,
            category: 'vocabulary', // Default category
            description: `Auto-discovered vocabulary book: ${id}`,
            sourceType: id,
            dataType: 'vocabulary',
            extractorType: 'PTETermsExtractor',
            inputSubdir: 'vocabs'
          };
        });
    } catch (error) {
      console.error(`   ❌ Error discovering books: ${error.message}`);
      return [];
    }
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

    const count = dataset.vocabulary ? dataset.vocabulary.length : 0;
    console.log(`   ✅ Saved ${count} items to ${filename}`);
  }

  /**
   * Validate processed data
   */
  validateData() {
    console.log('🔍 STAGE 3: Validating Data');
    // Simplified validation
    const fibIpaTerms = this.results.get('fibIpaVocabulary') || [];
    console.log(`   ✓ FIB terms: ${fibIpaTerms.length}`);
  }

  /**
   * Remove duplicate terms
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
    if (!fs.existsSync(this.config.reportsDir)) {
      fs.mkdirSync(this.config.reportsDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      status: this.stats.totalErrors === 0 ? 'success' : 'partial_success'
    };

    const reportPath = path.join(this.config.reportsDir, this.config.outputFiles.report);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📑 Processing report saved to ${reportPath}`);
  }
}

// Run pipeline if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const pipeline = new PTEDataPipeline();
  pipeline.run().catch(error => {
    console.error('❌ PTE Data Pipeline failed:', error);
    process.exit(1);
  });
}

export { PTEDataPipeline };
export default PTEDataPipeline;
