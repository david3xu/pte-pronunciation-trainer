#!/usr/bin/env node

/**
 * Unified Data Pipeline - Consolidates all data processing into one command
 * Replaces multiple scattered scripts with organized pipeline stages
 * Maintains backward compatibility with existing data formats
 */

const fs = require('fs');
const path = require('path');

class UnifiedDataPipeline {
    constructor() {
        this.config = {
            inputDir: path.join(__dirname, '../data-processing'),
            outputDir: path.join(__dirname, '../data'),
            reportsDir: path.join(__dirname, '../reports')
        };
        this.processors = new Map();
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
        console.log('🚀 Starting Unified Data Pipeline...\n');

        try {
            // Stage 1: Extract and validate source data
            await this.stage1_ExtractSourceData();

            // Stage 2: Process into standardized formats
            await this.stage2_ProcessData();

            // Stage 3: Generate specialized datasets
            await this.stage3_GenerateDatasets();

            // Stage 4: Validate and generate reports
            await this.stage4_ValidateAndReport();

            // Stage 5: Create legacy compatibility files
            await this.stage5_LegacyCompatibility();

            this.stats.processingTime = Date.now() - startTime;
            console.log('\n✅ Unified Data Pipeline completed successfully!');
            this.printSummary();

        } catch (error) {
            console.error('\n❌ Pipeline failed:', error);
            console.error(error.stack);
            process.exit(1);
        }
    }

    /**
     * Stage 1: Extract source data from markdown files
     */
    async stage1_ExtractSourceData() {
        console.log('📥 Stage 1: Extracting source data...');

        const extractors = [
            { name: 'conversations', file: 'extractors/merged-conversations.md', processor: 'extractConversations' },
            { name: 'unfamiliar', file: 'extractors/unfamilar-words.md', processor: 'extractUnfamiliarWords' },
            { name: 'vocabulary', file: 'vocabulary-clean.md', processor: 'extractVocabulary' },
            { name: 'words', file: 'words.md', processor: 'extractWords' },
            { name: 'chineseEnglish', file: 'english-chinese-word-pairs.md', processor: 'extractChineseEnglish' },
            { name: 'resumeTerms', file: 'resume-terms.md', processor: 'extractResumeTerms' }
        ];

        for (const extractor of extractors) {
            const filePath = path.join(this.config.inputDir, extractor.file);
            if (fs.existsSync(filePath)) {
                console.log(`  Processing ${extractor.name}...`);
                try {
                    const data = await this[extractor.processor](filePath);
                    this.results.set(extractor.name, data);
                    const count = Array.isArray(data) ? data.length : (data.vocabulary?.length || Object.keys(data).length);
                    console.log(`    ✅ ${count} items extracted`);
                    this.stats.totalProcessed += count;
                } catch (error) {
                    console.error(`    ❌ Error processing ${extractor.name}:`, error.message);
                    this.stats.totalErrors++;
                }
            } else {
                console.log(`  ⚠️  ${extractor.file} not found, skipping ${extractor.name}`);
            }
        }
    }

    /**
     * Stage 2: Process into standardized formats
     */
    async stage2_ProcessData() {
        console.log('\n🔄 Stage 2: Processing into standardized formats...');

        // Standardize all data to common vocabulary format
        const standardizedData = new Map();

        for (const [source, data] of this.results) {
            console.log(`  Standardizing ${source}...`);
            const standardized = this.standardizeVocabularyFormat(source, data);
            standardizedData.set(source, standardized);
            console.log(`    ✅ ${standardized.length} terms standardized`);
        }

        this.results = standardizedData;
    }

    /**
     * Stage 3: Generate specialized datasets
     */
    async stage3_GenerateDatasets() {
        console.log('\n📦 Stage 3: Generating specialized datasets...');

        // Create output directories
        const outputDirs = ['processed', 'generated', 'conversation'];
        outputDirs.forEach(dir => {
            const dirPath = path.join(this.config.outputDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });

        // Generate each dataset
        const datasets = [
            { name: 'complete-dataset.json', source: 'conversations', processor: 'generateCompleteDataset' },
            { name: 'unfamiliar-words.json', source: 'unfamiliar', processor: 'generateUnfamiliarDataset' },
            { name: 'vocabulary-clean-dataset.json', source: 'vocabulary', processor: 'generateVocabularyDataset' },
            { name: 'words-dataset.json', source: 'words', processor: 'generateWordsDataset' },
            { name: 'chinese-english-dataset.json', source: 'chineseEnglish', processor: 'generateChineseEnglishDataset' },
            { name: 'resume-terms-dataset.json', source: 'resumeTerms', processor: 'generateResumeTermsDataset' }
        ];

        for (const dataset of datasets) {
            if (this.results.has(dataset.source)) {
                console.log(`  Generating ${dataset.name}...`);
                const processed = await this[dataset.processor](this.results.get(dataset.source));
                const outputPath = path.join(this.config.outputDir, 'processed', dataset.name);
                fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2));
                console.log(`    ✅ Written to ${outputPath}`);
            }
        }
    }

    /**
     * Stage 4: Validate and generate reports
     */
    async stage4_ValidateAndReport() {
        console.log('\n🔍 Stage 4: Validation and reporting...');

        if (!fs.existsSync(this.config.reportsDir)) {
            fs.mkdirSync(this.config.reportsDir, { recursive: true });
        }

        const validationResults = [];

        // Validate each dataset
        const processedDir = path.join(this.config.outputDir, 'processed');
        const files = fs.readdirSync(processedDir).filter(f => f.endsWith('.json'));

        for (const file of files) {
            console.log(`  Validating ${file}...`);
            const filePath = path.join(processedDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const validation = this.validateDataset(file, data);
            validationResults.push(validation);
            console.log(`    ${validation.valid ? '✅' : '❌'} ${validation.errors.length} errors found`);
        }

        // Generate validation report
        const reportPath = path.join(this.config.reportsDir, 'unified-pipeline-report.json');
        const report = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            validationResults,
            summary: {
                totalDatasets: validationResults.length,
                validDatasets: validationResults.filter(v => v.valid).length,
                totalErrors: validationResults.reduce((sum, v) => sum + v.errors.length, 0)
            }
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`  📊 Pipeline report: ${reportPath}`);
    }

    /**
     * Stage 5: Create legacy compatibility files
     */
    async stage5_LegacyCompatibility() {
        console.log('\n🔗 Stage 5: Creating legacy compatibility files...');

        // Create legacy conversation-vocabulary-data.js
        const conversationsPath = path.join(this.config.outputDir, 'processed', 'complete-dataset.json');
        if (fs.existsSync(conversationsPath)) {
            const conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
            const legacy = this.createLegacyVocabularyFormat(conversations);

            const legacyPath = path.join(this.config.outputDir, 'generated', 'conversation-vocabulary-data.js');
            const jsContent = `// Legacy vocabulary data - auto-generated by unified pipeline\nwindow.conversationVocabularyData = ${JSON.stringify(legacy, null, 2)};`;
            fs.writeFileSync(legacyPath, jsContent);
            console.log(`  ✅ Legacy format: ${legacyPath}`);
        }

        // Create other legacy JS files
        const legacyMappings = {
            'unfamiliar-words.json': 'unfamiliar-words.js',
            'vocabulary-clean-dataset.json': 'vocabulary-clean.js',
            'words-dataset.json': 'words-dataset.js'
        };

        for (const [jsonFile, jsFile] of Object.entries(legacyMappings)) {
            const jsonPath = path.join(this.config.outputDir, 'processed', jsonFile);
            if (fs.existsSync(jsonPath)) {
                const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                const jsPath = path.join(this.config.outputDir, 'generated', jsFile);
                const varName = jsFile.replace('.js', '').replace(/-/g, '');
                const jsContent = `// Legacy data - auto-generated by unified pipeline\nwindow.${varName}Data = ${JSON.stringify(data, null, 2)};`;
                fs.writeFileSync(jsPath, jsContent);
                console.log(`  ✅ Legacy JS: ${jsPath}`);
            }
        }
    }

    // ===== EXTRACTOR IMPLEMENTATIONS =====

    /**
     * Extract conversations from merged markdown - FULL IMPLEMENTATION
     */
    async extractConversations(filePath) {
        console.log('    📋 Processing conversation file with highlighted terms...');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Conversation file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        const conversations = [];
        const vocabularyItems = [];
        let currentConversation = null;
        let sentenceNumber = 0;

        // Category mapping
        const categoryMapping = {
            'business': 'business-finance',
            'medical': 'medical',
            'legal': 'legal',
            'education': 'education',
            'social welfare': 'social-welfare',
            'social': 'social',
            'immigration': 'immigration',
            'tourism': 'tourism',
            'housing': 'housing',
            'finance': 'business-finance',
            'healthcare': 'medical',
            'government': 'legal'
        };

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Parse conversation header: #70241. Suite Bathroom Design Clarification–Business
            const conversationMatch = trimmed.match(/^#(\d+)\.\s*(.+?)\s*[-–]\s*([^-–]+)$/);
            if (conversationMatch) {
                currentConversation = {
                    id: conversationMatch[1],
                    title: conversationMatch[2].trim(),
                    domain: conversationMatch[3].trim().toLowerCase(),
                    category: categoryMapping[conversationMatch[3].trim().toLowerCase()] || 'general',
                    sentences: []
                };
                conversations.push(currentConversation);
                sentenceNumber = 0;
                continue;
            }

            // Parse sentence with highlighted terms
            if (trimmed.match(/^\d+\.\s+/) && currentConversation) {
                const sentenceMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
                if (sentenceMatch) {
                    const sentenceId = sentenceMatch[1];
                    const sentenceContent = sentenceMatch[2];

                    // Check if next line is Chinese translation
                    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
                    const isChineseLine = nextLine && /[\u4e00-\u9fff]/.test(nextLine) && !nextLine.match(/^\d+\./);

                    if (isChineseLine) {
                        const englishSentence = sentenceContent;
                        const chineseSentence = nextLine;

                        // Add sentence to conversation
                        const sentence = {
                            id: sentenceId,
                            english: englishSentence,
                            chinese: chineseSentence,
                            vocabulary: []
                        };
                        currentConversation.sentences.push(sentence);

                        // Extract highlighted terms
                        const highlightedTerms = englishSentence.match(/_([^_]+)_/g);
                        if (highlightedTerms) {
                            highlightedTerms.forEach(term => {
                                const cleanTerm = term.replace(/_/g, '');
                                const vocabularyItem = {
                                    english: cleanTerm,
                                    chinese: '', // Will be inferred or left empty
                                    difficulty: this.inferDifficulty(cleanTerm),
                                    category: currentConversation.category,
                                    example: englishSentence.replace(/_/g, ''),
                                    exampleChinese: chineseSentence,
                                    conversationId: currentConversation.id,
                                    sentenceId: sentenceId,
                                    source: 'conversations'
                                };

                                vocabularyItems.push(vocabularyItem);
                                sentence.vocabulary.push(cleanTerm);
                            });
                        }

                        i++; // Skip the Chinese line
                    }
                }
            }
        }

        console.log(`    📊 Extracted ${conversations.length} conversations with ${vocabularyItems.length} vocabulary terms`);

        return {
            conversations,
            vocabulary: vocabularyItems,
            metadata: {
                totalConversations: conversations.length,
                totalVocabularyTerms: vocabularyItems.length,
                source: 'merged-conversations.md',
                extracted: new Date().toISOString()
            }
        };
    }

    /**
     * Extract unfamiliar words - FULL IMPLEMENTATION
     */
    async extractUnfamiliarWords(filePath) {
        console.log('    🔥 Processing unfamiliar words...');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Unfamiliar words file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        const unfamiliarWords = [];
        let currentDialogueId = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Dialogue ID (5-digit number)
            if (/^\d{5}$/.test(trimmed)) {
                currentDialogueId = trimmed;
                continue;
            }

            // Term under current dialogue
            if (currentDialogueId && trimmed) {
                unfamiliarWords.push({
                    english: trimmed,
                    chinese: '', // To be matched with complete dataset
                    difficulty: 'hard', // Unfamiliar words are typically hard
                    category: this.inferCategoryFromDialogueId(currentDialogueId),
                    conversationId: currentDialogueId,
                    source: 'unfamiliar-words'
                });
            }
        }

        console.log(`    📊 Extracted ${unfamiliarWords.length} unfamiliar words from ${new Set(unfamiliarWords.map(w => w.conversationId)).size} dialogues`);
        return unfamiliarWords;
    }

    /**
     * Extract vocabulary from vocabulary-clean.md - FULL IMPLEMENTATION
     */
    async extractVocabulary(filePath) {
        console.log('    📚 Processing vocabulary clean data...');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Vocabulary file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        const vocabulary = [];
        let currentCategory = 'general';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Category headers
            if (trimmed.match(/^#+ .+/)) {
                const categoryMatch = trimmed.match(/^#+\s*(.+?)(?:\s+词汇表|\s+Vocabulary)?/i);
                if (categoryMatch) {
                    currentCategory = this.normalizeCategory(categoryMatch[1]);
                }
                continue;
            }

            // Skip table headers
            if (trimmed.includes('English') && trimmed.includes('Chinese')) continue;
            if (trimmed.match(/^[\|\-\s]+$/)) continue;

            // Parse table rows: | English | Chinese |
            const tableMatch = trimmed.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
            if (tableMatch) {
                const english = tableMatch[1].trim();
                const chinese = tableMatch[2].trim();

                if (english && chinese && english !== 'English' && chinese !== 'Chinese') {
                    vocabulary.push({
                        english,
                        chinese,
                        difficulty: this.inferDifficulty(english),
                        category: currentCategory,
                        source: 'vocabulary-clean'
                    });
                }
            }
        }

        console.log(`    📊 Extracted ${vocabulary.length} vocabulary terms`);
        return vocabulary;
    }

    /**
     * Extract words from words.md - FULL IMPLEMENTATION
     */
    async extractWords(filePath) {
        console.log('    📝 Processing words data...');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Words file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        const words = [];
        let currentDialogueId = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Dialogue ID (5-digit number)
            if (/^\d{5}$/.test(trimmed)) {
                currentDialogueId = trimmed;
                continue;
            }

            // Word under current dialogue
            if (currentDialogueId && trimmed) {
                words.push({
                    english: trimmed,
                    chinese: '', // No Chinese translations in words.md
                    difficulty: this.inferDifficulty(trimmed),
                    category: this.inferCategoryFromDialogueId(currentDialogueId),
                    conversationId: currentDialogueId,
                    source: 'words'
                });
            }
        }

        console.log(`    📊 Extracted ${words.length} words from ${new Set(words.map(w => w.conversationId)).size} dialogues`);
        return words;
    }

    /**
     * Extract Chinese-English pairs - FULL IMPLEMENTATION
     */
    async extractChineseEnglish(filePath) {
        console.log('    🈯 Processing Chinese-English word pairs...');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Chinese-English file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        const pairs = [];
        let currentCategory = 'general';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Category headers
            if (trimmed.match(/^#+ .+/)) {
                const categoryMatch = trimmed.match(/^#+\s*(.+?)(?:\s+词汇表|\s+Vocabulary)?/i);
                if (categoryMatch) {
                    currentCategory = this.normalizeCategory(categoryMatch[1]);
                }
                continue;
            }

            // Skip table headers and separators
            if (trimmed.includes('English') && trimmed.includes('Chinese')) continue;
            if (trimmed.match(/^[\|\-\s]+$/)) continue;

            // Skip dialogue IDs (numbers only)
            if (trimmed.match(/^\d+$/)) continue;

            // Parse pipe-delimited format: english | chinese | uk_pronunciation | us_pronunciation
            if (trimmed.includes(' | ')) {
                const parts = trimmed.split(' | ');
                if (parts.length >= 2) {
                    const english = parts[0].trim();
                    const chinese = parts[1].trim();
                    const ukPronunciation = parts[2] ? parts[2].trim() : '';
                    const usPronunciation = parts[3] ? parts[3].trim() : '';

                    if (english && chinese && english !== 'English' && chinese !== 'Chinese') {
                        pairs.push({
                            english,
                            chinese,
                            ukPronunciation,
                            usPronunciation,
                            difficulty: this.inferDifficulty(english),
                            category: currentCategory,
                            source: 'chinese-english-pairs'
                        });
                    }
                }
            }

            // Also support table format for backward compatibility: | English | Chinese |
            const tableMatch = trimmed.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
            if (tableMatch) {
                const english = tableMatch[1].trim();
                const chinese = tableMatch[2].trim();

                if (english && chinese && english !== 'English' && chinese !== 'Chinese') {
                    pairs.push({
                        english,
                        chinese,
                        difficulty: this.inferDifficulty(english),
                        category: currentCategory,
                        source: 'chinese-english-pairs'
                    });
                }
            }
        }

        console.log(`    📊 Extracted ${pairs.length} Chinese-English pairs`);
        return pairs;
    }

    /**
     * Extract resume terms with pronunciation guides - FULL IMPLEMENTATION
     */
    async extractResumeTerms(filePath) {
        console.log('    💼 Processing resume terms with pronunciation guides...');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Resume terms file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        const terms = [];
        let currentSection = 'general';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Section headers (## Section Name)
            if (trimmed.startsWith('## ')) {
                currentSection = trimmed.replace('## ', '').trim().toLowerCase().replace(/\s+/g, '-');
                continue;
            }

            // Skip main title
            if (trimmed.startsWith('# ')) continue;

            // Process terms with pronunciation guides
            // Format: term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**
            const termMatch = trimmed.match(/^([^|]+)\s*\|\s*(.+)$/);
            if (termMatch) {
                const term = termMatch[1].trim();
                const pronunciationData = termMatch[2].trim();

                // Parse pronunciation data
                const pronunciationParts = pronunciationData.split('|');
                let britishIPA = '';
                let britishPhonetic = '';
                let americanIPA = '';
                let americanPhonetic = '';

                // Parse British pronunciation (first part)
                if (pronunciationParts[0]) {
                    const britishMatch = pronunciationParts[0].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
                    if (britishMatch) {
                        britishIPA = britishMatch[1];
                        britishPhonetic = britishMatch[2];
                    }
                }

                // Parse American pronunciation (second part)
                if (pronunciationParts[1]) {
                    const americanMatch = pronunciationParts[1].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
                    if (americanMatch) {
                        americanIPA = americanMatch[1];
                        americanPhonetic = americanMatch[2];
                    }
                }

                terms.push({
                    english: term,
                    chinese: '', // Resume terms don't have Chinese translations
                    difficulty: this.inferDifficulty(term),
                    category: currentSection,
                    phonetic: britishPhonetic || americanPhonetic,
                    ipa: britishIPA || americanIPA,
                    pronunciationGuide: {
                        british: { ipa: britishIPA, phonetic: britishPhonetic },
                        american: { ipa: americanIPA, phonetic: americanPhonetic }
                    },
                    source: 'resume-terms'
                });
            }
        }

        console.log(`    📊 Extracted ${terms.length} resume terms with pronunciation guides`);
        return terms;
    }

    // ===== DATASET GENERATORS =====

    async generateCompleteDataset(data) {
        return {
            metadata: {
                generated: new Date().toISOString(),
                totalTerms: data.vocabulary ? data.vocabulary.length : 0,
                totalConversations: data.conversations ? data.conversations.length : 0,
                source: 'unified-pipeline-conversations',
                version: '2.0'
            },
            dialogues: data.conversations || [],
            vocabulary: data.vocabulary || []
        };
    }

    async generateUnfamiliarDataset(data) {
        return {
            metadata: {
                generated: new Date().toISOString(),
                totalTerms: data.length,
                source: 'unified-pipeline-unfamiliar',
                description: 'Curated challenging vocabulary for advanced learners',
                version: '2.0'
            },
            vocabulary: data
        };
    }

    async generateVocabularyDataset(data) {
        return {
            metadata: {
                generated: new Date().toISOString(),
                totalTerms: data.length,
                source: 'unified-pipeline-vocabulary-clean',
                version: '2.0'
            },
            vocabulary: data
        };
    }

    async generateWordsDataset(data) {
        return {
            metadata: {
                generated: new Date().toISOString(),
                totalTerms: data.length,
                source: 'unified-pipeline-words',
                version: '2.0'
            },
            vocabulary: data
        };
    }

    async generateChineseEnglishDataset(data) {
        return {
            metadata: {
                generated: new Date().toISOString(),
                totalTerms: data.length,
                source: 'unified-pipeline-chinese-english',
                version: '2.0'
            },
            vocabulary: data
        };
    }

    async generateResumeTermsDataset(data) {
        return {
            metadata: {
                generated: new Date().toISOString(),
                totalTerms: data.length,
                source: 'unified-pipeline-resume-terms',
                description: 'Professional vocabulary with pronunciation guides',
                version: '2.0'
            },
            vocabulary: data
        };
    }

    // ===== UTILITY METHODS =====

    /**
     * Standardize vocabulary format across all sources
     */
    standardizeVocabularyFormat(source, data) {
        // Handle different data structures
        let vocabularyArray = [];

        if (Array.isArray(data)) {
            vocabularyArray = data;
        } else if (data.vocabulary) {
            vocabularyArray = data.vocabulary;
        } else if (data.conversations) {
            vocabularyArray = data.vocabulary || [];
        }

        const standardize = (item) => ({
            english: item.english || item.term || item.word || '',
            chinese: item.chinese || item.translation || '',
            difficulty: item.difficulty || this.inferDifficulty(item.english || item.term),
            category: item.category || this.inferCategoryFromDialogueId(item.conversationId) || 'general',
            example: item.example || item.sentence || '',
            exampleChinese: item.exampleChinese || item.sentenceChinese || '',
            conversationId: item.conversationId || item.dialogue_id || '',
            sentenceId: item.sentenceId || '',
            phonetic: item.phonetic || '',
            ipa: item.ipa || '',
            pronunciationGuide: item.pronunciationGuide || null,
            source: source,
            id: this.generateId(item.english || item.term || item.word)
        });

        return vocabularyArray.map(standardize);
    }

    /**
     * Generate unique ID from English text
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
     */
    inferDifficulty(english) {
        if (!english) return 'normal';

        const words = english.trim().split(/\s+/).length;
        const hasComplexTerms = /\b(comprehensive|administrative|implementation|coordination|infrastructure|consultation|documentation|specification)\b/i.test(english);
        const hasSimpleWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i.test(english);

        if (words === 1 && english.length <= 6 && !hasComplexTerms) return 'easy';
        if (words <= 2 && !hasComplexTerms && hasSimpleWords) return 'easy';
        if (words <= 4 && !hasComplexTerms) return 'normal';
        return 'hard';
    }

    /**
     * Infer category from dialogue ID
     */
    inferCategoryFromDialogueId(dialogueId) {
        if (!dialogueId) return 'general';

        const id = parseInt(dialogueId);
        if (id >= 70240) return 'group-240s';
        if (id >= 70230) return 'group-230s';
        if (id >= 70220) return 'group-220s';
        if (id >= 70210) return 'group-210s';
        if (id >= 70200) return 'group-200s';
        if (id >= 70190) return 'group-190s';
        if (id >= 70180) return 'group-180s';
        if (id >= 70170) return 'group-170s';
        if (id >= 70160) return 'group-160s';
        if (id >= 70150) return 'group-150s';

        return 'general';
    }

    /**
     * Normalize category names
     */
    normalizeCategory(category) {
        const categoryMap = {
            'business': 'business-finance',
            'medical': 'medical',
            'legal': 'legal',
            'education': 'education',
            'social welfare': 'social-welfare',
            'social': 'social',
            'immigration': 'immigration',
            'tourism': 'tourism',
            'housing': 'housing',
            'finance': 'business-finance',
            'healthcare': 'medical',
            'government': 'legal'
        };

        const normalized = category.toLowerCase().trim();
        return categoryMap[normalized] || normalized.replace(/\s+/g, '-');
    }

    /**
     * Validate dataset structure
     */
    validateDataset(filename, data) {
        const errors = [];

        if (!data.metadata) errors.push('Missing metadata');
        if (!data.vocabulary || !Array.isArray(data.vocabulary)) errors.push('Missing or invalid vocabulary array');

        if (data.vocabulary) {
            data.vocabulary.forEach((item, index) => {
                if (!item.english) errors.push(`Item ${index}: Missing english field`);
                if (!item.source) errors.push(`Item ${index}: Missing source field`);
                if (!item.difficulty) errors.push(`Item ${index}: Missing difficulty field`);
                if (typeof item.english !== 'string') errors.push(`Item ${index}: English field must be string`);
            });
        }

        return {
            filename,
            valid: errors.length === 0,
            errors,
            itemCount: data.vocabulary ? data.vocabulary.length : 0,
            hasMetadata: !!data.metadata,
            hasDialogues: !!(data.dialogues && data.dialogues.length > 0)
        };
    }

    /**
     * Create legacy vocabulary format for backward compatibility
     */
    createLegacyVocabularyFormat(data) {
        return {
            vocabulary: data.vocabulary || [],
            metadata: {
                ...data.metadata,
                legacy: true,
                generatedBy: 'unified-pipeline'
            }
        };
    }

    /**
     * Print pipeline summary
     */
    printSummary() {
        console.log('\n📊 Pipeline Summary:');
        console.log(`⏱️  Processing time: ${(this.stats.processingTime / 1000).toFixed(2)}s`);
        console.log(`📈 Total items processed: ${this.stats.totalProcessed}`);
        console.log(`❌ Errors encountered: ${this.stats.totalErrors}`);

        const processedDir = path.join(this.config.outputDir, 'processed');
        if (fs.existsSync(processedDir)) {
            const files = fs.readdirSync(processedDir).filter(f => f.endsWith('.json'));
            console.log(`📁 Generated datasets: ${files.length}`);

            files.forEach(file => {
                try {
                    const filePath = path.join(processedDir, file);
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const count = data.vocabulary ? data.vocabulary.length : 0;
                    console.log(`  • ${file}: ${count} terms`);
                } catch (error) {
                    console.log(`  • ${file}: Error reading file`);
                }
            });
        }

        console.log('\n🎉 All data processing completed successfully!');
        console.log('💡 Use "npm run start" to run the application with new data.');
    }
}

// Execute if run directly
if (require.main === module) {
    const pipeline = new UnifiedDataPipeline();
    pipeline.run().catch(error => {
        console.error('Pipeline execution failed:', error);
        process.exit(1);
    });
}

module.exports = UnifiedDataPipeline;