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
  outputFiles: {
    report: 'pte-processing-report.json'
  },
  registry: [
    {
      id: 'pte-sgd-vocabulary',
      input: 'pte-sgd-vocabulary.md',
      output: 'pte-sgd-vocabulary.json',
      category: 'pte-sgd-vocabulary', // Matches AppConfig category/id
      description: 'SGD Vocabulary with IPA',
      sourceType: 'pte-sgd-vocabulary-with-ipa',
      extractorType: 'PTETermsExtractor',
      inputSubdir: 'sgd', // Specify the subdirectory
      keepDuplicates: true // Keep duplicate terms if they appear in different topics
    },
    {
      id: 'pte-rl-vocabulary',
      input: 'pte-rl-vocabulary.md',
      output: 'pte-rl-vocabulary.json',
      category: 'pte-rl-vocabulary',
      description: 'RL Vocabulary with IPA',
      sourceType: 'pte-rl-vocabulary-with-ipa',
      extractorType: 'PTETermsExtractor',
      inputSubdir: 'rl',
      keepDuplicates: true
    },
    {
      id: 'pte-my-ra',
      input: 'pte-my-ra.md',
      output: 'pte-my-ra.json',
      category: 'pte-my-ra',
      description: 'My PTE Read Aloud word list',
      sourceType: 'pte-my-ra',
      extractorType: 'PTETermsExtractor',
      inputSubdir: 'ra',
      keepDuplicates: false
    },
    {
      id: 'pte-my-rs-wfd',
      input: 'pte-my-rs-wfd.md',
      output: 'pte-my-rs-wfd.json',
      category: 'pte-my-rs-wfd',
      description: 'My PTE RS and WFD word list',
      sourceType: 'pte-my-rs-wfd',
      extractorType: 'PTETermsExtractor',
      inputSubdir: 'rs-wfd',
      keepDuplicates: false
    }
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

    // Extract word type (n., v., adj., phr., etc.) if present
    let wordType = null;
    let term = termPart.trim();

    // Match word type patterns
    const wordTypeMatch = term.match(/^(n\.|v\.|adj\.|adv\.|num\.|abbr\.|prep\.|conj\.|pron\.|interj\.|phr\.|art\.|aux\.|det\.)\s+(.+)$/i);
    if (wordTypeMatch) {
      wordType = wordTypeMatch[1].toLowerCase();
      term = wordTypeMatch[2].trim();
    }

    // Parse pronunciation data
    // Format: /IPA/ — sounds like **PHONETIC**  OR just /IPA/
    const parsePronunciation = (text) => {
      if (!text) return null;

      // Try full format with phonetic spelling
      const fullMatch = text.match(/^\/(.+?)\/\s*—\s*(?:sounds\s+like\s+)?\*\*(.+?)\*\*/);
      if (fullMatch) {
        return {
          ipa: fullMatch[1].trim(),
          phonetic: fullMatch[2].trim()
        };
      }

      // Try IPA-only format
      const ipaMatch = text.match(/^\/(.+?)\/?\s*$/); // Allow optional trailing slash
      if (ipaMatch) {
        return {
          ipa: ipaMatch[1].trim(),
          phonetic: '' // No phonetic spelling available
        };
      }

      return null;
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

const SWT_ANSWER_TYPING_SOURCE_FILE = 'swt-answer-typing.md';

/**
 * SWTMarkdownExtractor - Parses PTE Summarize Written Text markdown files.
 *
 * Source format:
 *   ## Example N: Title (Difficulty)          (also "## Bonus Example N: ...")
 *   ### Original Passage
 *   <one or more paragraphs, may contain **bold** emphasis>
 *   ### SWT Answer
 *   **<one sentence model answer>**
 *   **Word count:** NN words \u2713
 *   ### Key Changes Made
 *   ...ignored...
 *   ---
 *
 * Only the passage and the answer sentence are extracted; the key-changes
 * and linking-words commentary are teaching content, not dataset fields.
 */
class SWTMarkdownExtractor {
  static extract(filePath, fsModule, sourceSet) {
    if (!fsModule.existsSync(filePath)) {
      throw new Error(`SWT source file not found: ${filePath}`);
    }

    const content = fsModule.readFileSync(filePath, 'utf-8');
    const blocks = this.splitIntoBlocks(content);

    const items = [];
    for (const block of blocks) {
      const item = this.parseBlock(block, sourceSet);
      if (item) items.push(item);
    }
    return items;
  }

  /**
   * Slice the file into per-example blocks. Each block starts at a line
   * matching "## Example N: ..." (optionally "## Bonus Example N: ...") and
   * runs until the next level-2 heading or end of file, so trailing sections
   * like "## Practice Tips" and the copyright line are excluded naturally.
   */
  static splitIntoBlocks(content) {
    // Some source files wrap the entire header line in bold, e.g.
    // "## **Example 4: Natural Language (Medium)**" instead of the plain
    // "## Example 4: Natural Language (Medium)" used elsewhere. The optional
    // \*{0,2} on both ends tolerates that without changing anything for the
    // plain, unwrapped form.
    const headerRe = /^##\s+\*{0,2}(?:Bonus\s+)?Example\s+\d+:\s*(.+?)\s*\(([^)]+)\)\*{0,2}\s*$/;
    const lines = content.split('\n');

    const blocks = [];
    let current = null;

    for (const line of lines) {
      const headerMatch = line.match(headerRe);
      if (headerMatch) {
        if (current) blocks.push(current);
        current = {
          title: headerMatch[1].replace(/\*\*/g, '').trim(),
          rawDifficulty: headerMatch[2].replace(/\*\*/g, '').trim(),
          lines: [],
        };
        continue;
      }

      if (current && /^##\s+/.test(line)) {
        // A different level-2 heading (e.g. "## Practice Tips") ends the block.
        blocks.push(current);
        current = null;
        continue;
      }

      if (current) current.lines.push(line);
    }

    if (current) blocks.push(current);
    return blocks;
  }

  static parseBlock(block, sourceSet) {
    const blockText = block.lines.join('\n');
    const passageSection = this.extractSection(blockText, 'Original Passage');
    const answerSection = this.extractSwtAnswerSection(blockText);

    if (!passageSection || !answerSection) {
      console.warn(`   \u26a0\ufe0f SWT example "${block.title}" is missing a passage or answer section, skipping`);
      return null;
    }

    const passage = this.cleanParagraphs(passageSection);
    const answer = this.cleanInline(this.firstParagraph(answerSection));

    if (!passage || !answer) {
      console.warn(`   \u26a0\ufe0f SWT example "${block.title}" had an empty passage or answer after cleaning, skipping`);
      return null;
    }

    return {
      title: block.title,
      passage,
      answer,
      wordCount: answer.split(/\s+/).filter(Boolean).length,
      sourceSet,
      difficulty: this.mapDifficulty(block.rawDifficulty),
    };
  }

  /**
   * Most examples have a plain "### SWT Answer" heading. A few in Set 3 are
   * authored as multiple draft attempts instead (First Attempt, Second
   * Attempt, ...) with no "SWT Answer" heading at all. For those, fall back
   * to the last heading the author themselves marked with a check mark as
   * the accepted final draft, e.g. "### \u2705 Final Answer (SUCCESS)".
   */
  static extractSwtAnswerSection(blockText) {
    const plain = this.extractSection(blockText, 'SWT Answer');
    if (plain) return plain;

    const headingRe = /^###\s+(.+)$/gm;
    let match;
    let lastCheckmarkHeading = null;
    while ((match = headingRe.exec(blockText)) !== null) {
      if (match[1].trim().startsWith('\u2705')) {
        lastCheckmarkHeading = match[1].trim();
      }
    }
    return lastCheckmarkHeading ? this.extractSection(blockText, lastCheckmarkHeading) : null;
  }

  /** Text between "### <heading>" and the next "### " heading, or null if the heading is absent. */
  static extractSection(blockText, heading) {
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headingRe = new RegExp(`^###\\s+${escapedHeading}\\s*$`, 'm');
    const match = headingRe.exec(blockText);
    if (!match) return null;

    const rest = blockText.slice(match.index + match[0].length);
    const nextHeadingIndex = rest.search(/^###\s+/m);
    const section = nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex);
    return section.trim();
  }

  static firstParagraph(sectionText) {
    const [first] = sectionText.split(/\n\s*\n/);
    return (first || '').trim();
  }

  /** Strip markdown bold markers and collapse internal whitespace to single spaces. */
  static cleanInline(text) {
    return text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  }

  /** Clean each paragraph individually while keeping paragraph breaks. */
  static cleanParagraphs(sectionText) {
    return sectionText
      .split(/\n\s*\n/)
      .map((paragraph) => this.cleanInline(paragraph))
      .filter(Boolean)
      .join('\n\n');
  }

  /** Normalize source difficulty labels ("Easy", "Medium", "Hard", "Medium - Complex", ...) to the app's scale. */
  static mapDifficulty(rawLabel) {
    const normalized = rawLabel.toLowerCase();
    if (normalized.includes('hard') || normalized.includes('complex')) return 'hard';
    if (normalized.includes('medium')) return 'normal';
    if (normalized.includes('easy')) return 'easy';
    console.warn(`   \u26a0\ufe0f Unrecognized SWT difficulty label "${rawLabel}", defaulting to normal`);
    return 'normal';
  }
}

/**
 * Parses the clean SWT Monkeytype source used by the app.
 *
 * Source format:
 *   1. Exact target answer text
 *   2. Another exact target answer text
 *
 * The app is practicing typing the SWT model answer, not simulating the real
 * PTE SWT task, so this app-facing source deliberately contains answers only.
 */
class SWTAnswerTypingMarkdownExtractor {
  static extract(filePath, fsModule, sourceSet) {
    if (!fsModule.existsSync(filePath)) {
      throw new Error(`SWT answer typing source file not found: ${filePath}`);
    }

    const content = fsModule.readFileSync(filePath, 'utf-8');
    const items = [];

    for (const line of content.split('\n')) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('<!--')) continue;

      const match = trimmedLine.match(/^\d+\.\s+(.+)$/);
      if (!match) continue;

      const answer = SWTMarkdownExtractor.cleanInline(match[1]);
      if (!answer) continue;

      items.push({
        title: `Answer ${items.length + 1}`,
        passage: '',
        answer,
        wordCount: answer.split(/\s+/).filter(Boolean).length,
        sourceSet,
        difficulty: 'normal',
      });
    }

    return items;
  }
}

/**
 * PTESegmentsExtractor - Parses PTE segment markdown files (RS, WFD)
 */
class PTESegmentsExtractor {
  static async extract(filePath, fsModule, options = {}) {
    if (!fsModule.existsSync(filePath)) {
      throw new Error(`PTE segments file not found: ${filePath}`);
    }

    const content = fsModule.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const items = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines or non-content lines
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const segmentData = this.parsePTESegmentLine(trimmedLine);
      if (segmentData) {
        items.push(segmentData);
      }
    }

    return items;
  }

  static parsePTESegmentLine(line) {
    // Match format: Number. Sentence | /IPA/
    // Example: 1350. I will be in my office | /aɪ wɪl bi ɪn maɪ ˈɒfɪs/
    const match = line.match(/^\d+\.\s*(.+?)\s*\|\s*(\/.+\/)\s*$/);

    if (!match) {
      // Fallback for lines without IPA or different formatting
      const simpleMatch = line.match(/^\d+\.\s*(.+?)$/);
      if (simpleMatch) {
        return {
          content: {
            sentence: simpleMatch[1].trim()
          }
        };
      }
      return null;
    }

    const sentence = match[1].trim();
    const ipa = match[2].trim();

    return {
      content: {
        sentence: sentence,
        ipa: {
          british: ipa
        }
      }
    };
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
      // Stage 1: Generate datasets
      await this.generatePTEDatasets();

      // Stage 2: Generate DI Shadowing data
      await this.generateDIShadowingData();

      // Stage 2.6: Generate SWT (Summarize Written Text) dataset
      await this.generateSWTDataset();

      // Stage 3: Report
      this.generateReport();

      console.log('\n✅ PTE Data Pipeline completed successfully!');
    } catch (error) {
      console.error('\n❌ PTE Data Pipeline failed:', error.message);
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Generate DI Shadowing natural data
   */
  async generateDIShadowingData() {
    console.log('\n🎙️ STAGE 2.5: Generating DI Shadowing Data');

    try {
      // Import and execute the natural DI shadowing script
      const scriptPath = path.join(__dirname, 'generate-natural-di-shadowing.js');
      const { execSync } = await import('child_process');

      // Run the script
      execSync(`node "${scriptPath}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });

      console.log('   ✅ DI shadowing data generated successfully\n');
    } catch (error) {
      console.warn(`   ⚠️ Failed to generate DI shadowing data: ${error.message}\n`);
    }
  }

  /**
   * Generate SWT Answer Typing dataset from one clean answer-only markdown
   * source. The older full SWT example files may remain as raw references,
   * but they are not app-facing source data for Monkeytype mode.
   */
  async generateSWTDataset() {
    console.log('\n📝 STAGE 2.6: Generating SWT Dataset');

    const swtDir = path.join(this.config.inputDir, 'swt');
    const filePath = path.join(swtDir, SWT_ANSWER_TYPING_SOURCE_FILE);
    const sourceSet = SWT_ANSWER_TYPING_SOURCE_FILE.replace(/\.md$/, '');
    let parsedItems = [];

    try {
      parsedItems = SWTAnswerTypingMarkdownExtractor.extract(filePath, fs, sourceSet);
      console.log(`   🔄 Parsed ${parsedItems.length} SWT answer targets from ${SWT_ANSWER_TYPING_SOURCE_FILE}`);
    } catch (e) {
      console.warn(`   ⚠️  Failed to parse ${SWT_ANSWER_TYPING_SOURCE_FILE}: ${e.message}`);
    }

    const items = parsedItems.map((item, index) => ({
      id: `swt-${index + 1}`,
      title: item.title,
      passage: item.passage,
      answer: item.answer,
      wordCount: item.wordCount,
      sourceSet: item.sourceSet,
      metadata: {
        difficulty: item.difficulty,
        category: 'pte-swt',
        source: 'pte-swt',
        tags: ['swt', 'answer-typing', 'monkeytype'],
      },
    }));

    const dataset = {
      metadata: {
        generated: new Date().toISOString(),
        source: 'pte-swt',
        description: 'SWT answer typing practice targets',
        totalTerms: items.length,
        version: '1.0',
      },
      items,
    };

    this.saveDataset('pte-swt-dataset.json', dataset);
    console.log(`\n📊 Stage 2.6 Summary: Generated ${items.length} SWT items\n`);
  }

  /**
   * Generate PTE datasets
   */
  async generatePTEDatasets() {
    console.log('📦 STAGE 2: Generating PTE Datasets');

    // Auto-discover vocabulary books
    const discoveredBooks = await this.discoverVocabularyBooks();
    const segmentFiles = await this.discoverSegmentFiles();
    console.log(`   🔎 Discovered ${discoveredBooks.length} vocabulary books and ${segmentFiles.length} segment files`);

    // Merge discovered books with existing registry (avoiding duplicates by ID)
    const existingIds = new Set((this.config.registry || []).map(r => r.id));
    const registry = [
      ...(this.config.registry || []),
      ...discoveredBooks.filter(book => !existingIds.has(book.id)),
      ...segmentFiles
    ].filter(Boolean);

    if (registry.length > 0) {
      for (const entry of registry) {
        try {
          // Support PTETermsExtractor and PTESegmentsExtractor
          if (entry.extractorType !== 'PTETermsExtractor' && entry.extractorType !== 'PTESegmentsExtractor') {
            console.log(`   ℹ️ Skipping ${entry.id} (extractor ${entry.extractorType} not supported in build script)`);
            continue;
          }

          const inputSubdir = entry.inputSubdir || this.config.dataSources.subdirectory;
          const inputPath = path.join(this.config.inputDir, inputSubdir, entry.input);

          console.log(`   🔄 Processing ${entry.id} using ${entry.extractorType}...`);

          let terms = [];
          try {
            if (entry.extractorType === 'PTESegmentsExtractor') {
              terms = await PTESegmentsExtractor.extract(inputPath, fs, {
                category: entry.category,
                source: entry.sourceType
              });
            } else {
              terms = await PTETermsExtractor.extract(inputPath, fs, {
                category: entry.category,
                source: entry.sourceType
              });
            }
          } catch (e) {
            console.warn(`   ⚠️  Failed to extract ${entry.id}: ${e.message}`);
            continue;
          }

          // Skip de-duplication for files that need to keep duplicates (like template vocab for practice flow)
          const keepDuplicates = entry.id.includes('di-natural-template') || entry.keepDuplicates;
          const processedTerms = keepDuplicates ? terms : this.removeDuplicates(terms);
          const dataset = {
            metadata: {
              generated: new Date().toISOString(),
              totalTerms: processedTerms.length,
              source: entry.sourceType,
              description: entry.description,
              version: '1.0',
              categories: [entry.category],
              hasIPA: true,
              keepDuplicates: keepDuplicates
            },
            vocabulary: processedTerms
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

          // Files that should keep duplicates (e.g., DI vocabulary that matches example images order)
          const filesWithDuplicates = [
            'pte-di-difficult-words',
            'pte-di-easy-phrases',
            'pte-essay-b1-examples-vocabulary',
            'pte-essay-b1-examples-vocabulary-24',
            'pte-essay-90plus-filled-terms',
            'pte-essay-topic-paraphrase-vocabulary'
          ];

          return {
            id: id,
            input: file,
            output: `${id}.json`,
            category: id, // Use ID as category so it shows up in UI
            description: `Auto-discovered vocabulary book: ${id}`,
            sourceType: id,
            dataType: 'vocabulary',
            extractorType: 'PTETermsExtractor',
            inputSubdir: 'vocabs',
            keepDuplicates: filesWithDuplicates.includes(id)
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

    const count = dataset.vocabulary ? dataset.vocabulary.length : (dataset.items ? dataset.items.length : 0);
    this.stats.totalProcessed += count;
    console.log(`   ✅ Saved ${count} items to ${filename}`);
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
   * Discover segment files (RS, WFD)
   */
  async discoverSegmentFiles() {
    // Hardcoded segments configuration since they are specific files
    const segments = [
      {
        id: 'pte-repeat-sentence-segments',
        input: 'pte-repeat-sentence-segments.md',
        output: 'pte-rs-segments-dataset.json',
        category: 'pte-rs',
        description: 'PTE Repeat Sentence Segments',
        sourceType: 'pte-rs-segments',
        extractorType: 'PTESegmentsExtractor',
        inputSubdir: 'rs',
        keepDuplicates: true
      },
      {
        id: 'pte-wfd-segments',
        input: 'pte-wfd-segments.md',
        output: 'pte-wfd-segments-dataset.json',
        category: 'pte-wfd',
        description: 'PTE Write From Dictation Segments',
        sourceType: 'pte-wfd-segments',
        extractorType: 'PTESegmentsExtractor',
        inputSubdir: 'wfd',
        keepDuplicates: true
      }
    ];

    return segments;
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

export {
  PTEDataPipeline,
  SWTMarkdownExtractor,
  SWTAnswerTypingMarkdownExtractor,
  SWT_ANSWER_TYPING_SOURCE_FILE,
};
export default PTEDataPipeline;
