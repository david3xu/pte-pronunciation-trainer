#!/usr/bin/env node

/**
 * CCL Dialogue Data Processor - Phase 1 Implementation
 * Converts markdown file into structured JSON data for efficient frontend usage
 */

const fs = require('fs');
const path = require('path');

class DialogueDataProcessor {
    constructor() {
        this.dialogues = [];
        this.vocabulary = [];
        this.errors = [];
        this.warnings = [];

        // Predefined categories with proper mapping
        this.categories = {
            'business': {
                id: 'business',
                name: 'Business and Financial Matters',
                emoji: '💼',
                description: 'Topics related to business registration, financial matters, and commercial activities',
                color: '#3B82F6',
                priority: 1
            },
            'legal': {
                id: 'legal',
                name: 'Legal and Government Services',
                emoji: '⚖️',
                description: 'Legal matters, government services, and regulatory compliance',
                color: '#8B5CF6',
                priority: 2
            },
            'medical': {
                id: 'medical',
                name: 'Healthcare and Medical Services',
                emoji: '🏥',
                description: 'Medical consultations, healthcare services, and health-related topics',
                color: '#EF4444',
                priority: 3
            },
            'education': {
                id: 'education',
                name: 'Education and Training',
                emoji: '🎓',
                description: 'Educational programs, training courses, and academic matters',
                color: '#10B981',
                priority: 4
            },
            'housing': {
                id: 'housing',
                name: 'Housing and Accommodation',
                emoji: '🏠',
                description: 'Housing rental, accommodation services, and property matters',
                color: '#F59E0B',
                priority: 5
            },
            'social': {
                id: 'social',
                name: 'Social Interactions and Daily Life',
                emoji: '👥',
                description: 'Social interactions, daily activities, and community services',
                color: '#EC4899',
                priority: 6
            },
            'social-welfare': {
                id: 'social-welfare',
                name: 'Social Welfare and Support',
                emoji: '🤝',
                description: 'Social welfare programs, support services, and community assistance',
                color: '#06B6D4',
                priority: 7
            },
            'immigration': {
                id: 'immigration',
                name: 'Immigration and Visas',
                emoji: '🛂',
                description: 'Immigration services, visa applications, and residency matters',
                color: '#84CC16',
                priority: 8
            },
            'tourism': {
                id: 'tourism',
                name: 'Travel and Tourism',
                emoji: '✈️',
                description: 'Travel services, tourism information, and destination guidance',
                color: '#F97316',
                priority: 9
            }
        };
    }

    processMarkdownFile(inputFile) {
        console.log(`\n🚀 Starting CCL Dialogue Data Processing...`);
        console.log(`📁 Input file: ${inputFile}`);

        if (!fs.existsSync(inputFile)) {
            throw new Error(`❌ Input file not found: ${inputFile}`);
        }

        const content = fs.readFileSync(inputFile, 'utf8');
        console.log(`📄 File size: ${(content.length / 1024).toFixed(2)} KB`);

        const dialogueBlocks = this.extractDialogueBlocks(content);
        console.log(`🔍 Found ${dialogueBlocks.length} dialogue blocks`);

        if (dialogueBlocks.length === 0) {
            throw new Error('❌ No dialogue blocks found in the file');
        }

        // Process each dialogue block
        for (const block of dialogueBlocks) {
            console.log(`\n📝 Processing dialogue ${block.id}: ${block.title}`);
            const dialogue = this.parseDialogueBlock(block);
            if (dialogue) {
                this.dialogues.push(dialogue);
                this.extractVocabularyFromDialogue(dialogue);
                console.log(`✅ Processed: ${dialogue.sentences.length} sentences, ${dialogue.metadata.total_vocabulary_terms} vocabulary terms`);
            } else {
                console.log(`⚠️  Skipped dialogue ${block.id} due to parsing errors`);
            }
        }

        // Generate final dataset
        const dataset = {
            dialogues: this.dialogues,
            vocabulary: this.vocabulary,
            categories: this.categories,
            metadata: {
                totalDialogues: this.dialogues.length,
                totalVocabularyTerms: this.vocabulary.length,
                processedAt: new Date().toISOString(),
                sourceFile: path.basename(inputFile),
                processingErrors: this.errors.length,
                processingWarnings: this.warnings.length
            }
        };

        console.log(`\n📊 Processing Summary:`);
        console.log(`   • Dialogues: ${dataset.metadata.totalDialogues}`);
        console.log(`   • Vocabulary Terms: ${dataset.metadata.totalVocabularyTerms}`);
        console.log(`   • Errors: ${dataset.metadata.processingErrors}`);
        console.log(`   • Warnings: ${dataset.metadata.processingWarnings}`);

        return dataset;
    }

    extractDialogueBlocks(content) {
        console.log(`🔍 Extracting dialogue blocks...`);

        // Split content by dialogue headers (#70245., #70244., etc.)
        const dialogueRegex = /^#(\d+)\.\s*(.+?)\s*[-–]\s*([^-–]+)$/gm;
        const blocks = [];
        let match;

        while ((match = dialogueRegex.exec(content)) !== null) {
            const startIndex = match.index;
            const endIndex = content.indexOf('#', startIndex + 1);

            const blockContent = endIndex !== -1
                ? content.substring(startIndex, endIndex)
                : content.substring(startIndex);

            blocks.push({
                header: match[0],
                id: match[1],
                title: match[2].trim(),
                category: match[3].trim(),
                content: blockContent.trim()
            });
        }

        // Sort blocks by ID (descending order: 70245, 70244, 70243, etc.)
        blocks.sort((a, b) => parseInt(b.id) - parseInt(a.id));

        console.log(`   • Extracted ${blocks.length} dialogue blocks`);
        console.log(`   • ID range: ${blocks[blocks.length - 1] && blocks[blocks.length - 1].id} to ${blocks[0] && blocks[0].id}`);

        return blocks;
    }

    parseDialogueBlock(block) {
        try {
            const sentences = this.extractSentences(block.content);
            const briefing = this.extractBriefing(block.content);

            if (sentences.length === 0) {
                this.warnings.push(`Dialogue ${block.id}: No sentences found`);
                return null;
            }

            return {
                id: block.id,
                title: block.title,
                category: this.normalizeCategory(block.category),
                briefing: briefing,
                sentences: sentences,
                metadata: {
                    source_file: 'merged-conversations.md',
                    extraction_date: new Date().toISOString(),
                    total_vocabulary_terms: sentences.reduce((sum, s) => sum + s.vocabulary.length, 0)
                }
            };
        } catch (error) {
            this.errors.push(`Error parsing dialogue ${block.id}: ${error.message}`);
            return null;
        }
    }

    extractSentences(content) {
        const sentences = [];
        const lines = content.split('\n');
        let sentenceNumber = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Look for numbered sentences (1., 2., 3., etc.)
            const sentenceMatch = line.match(/^(\d+)\.\s*(.+)$/);
            if (sentenceMatch) {
                sentenceNumber++;
                const firstLine = sentenceMatch[2].trim();

                // Check if this line contains English text (has underscores for highlighted terms)
                const hasHighlightedTerms = firstLine.includes('_');

                // Determine which line contains English (with underscores) vs Chinese
                let englishText = '';
                let chineseText = '';

                // Check if first line contains mainly English (has underscores and little/no Chinese)
                const firstLineHasChinese = /[\u4e00-\u9fff]/.test(firstLine);
                const firstLineHasEnglish = hasHighlightedTerms && !firstLineHasChinese;

                if (firstLineHasEnglish) {
                    // First line is English with highlighted terms
                    englishText = firstLine;

                    // Look for Chinese translation on the next line
                    if (i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        if (nextLine && !nextLine.match(/^\d+\./) && !nextLine.startsWith('---')) {
                            chineseText = nextLine;
                        }
                    }
                } else if (firstLineHasChinese) {
                    // First line is Chinese, look for English on next line
                    chineseText = firstLine;

                    // Look for English text with highlighted terms on the next line
                    if (i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        const nextLineHasEnglish = nextLine.includes('_') && !/[\u4e00-\u9fff]/.test(nextLine);
                        if (nextLineHasEnglish && !nextLine.match(/^\d+\./) && !nextLine.startsWith('---')) {
                            englishText = nextLine;
                        }
                    }
                }

                // Only create sentence if we have both English and Chinese text
                if (englishText && chineseText) {
                    const sentence = {
                        id: sentenceNumber,
                        english: englishText,
                        chinese: chineseText,
                        vocabulary: this.extractVocabularyFromSentence(englishText, sentenceNumber)
                    };

                    sentences.push(sentence);
                } else {
                    // Log warning for incomplete sentences
                    this.warnings.push(`Dialogue sentence ${sentenceNumber}: Missing English or Chinese text`);
                }
            }
        }

        return sentences;
    }

    extractVocabularyFromSentence(sentence, sentenceId) {
        const vocabulary = [];

        // Find highlighted terms (_term_)
        const termRegex = /_([^_]+)_/g;
        let match;

        while ((match = termRegex.exec(sentence)) !== null) {
            const term = match[1];
            
            // Skip terms that contain Chinese characters
            if (/[\u4e00-\u9fff]/.test(term)) {
                continue;
            }
            
            const difficulty = this.assessDifficulty(term);

            vocabulary.push({
                term: term,
                difficulty: difficulty,
                phonetic: this.generatePhonetic(term),
                context: sentence
            });
        }

        return vocabulary;
    }

    extractBriefing(content) {
        // Look for briefing text (usually after the header, before sentences)
        const lines = content.split('\n');
        for (let i = 1; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();
            if (line && /[\u4e00-\u9fff]/.test(line) && !line.match(/^\d+\./)) {
                return line;
            }
        }
        return '';
    }

    normalizeCategory(category) {
        const categoryMap = {
            'business': 'business',
            'legal': 'legal',
            'medical': 'medical',
            'education': 'education',
            'housing': 'housing',
            'social': 'social',
            'social welfare': 'social-welfare',
            'immigration': 'immigration',
            'tourism': 'tourism',
            'finance': 'business',
            'healthcare': 'medical',
            'government': 'legal'
        };

        const normalized = category.toLowerCase().trim();
        const mappedCategory = categoryMap[normalized];

        if (!mappedCategory) {
            this.warnings.push(`Unknown category: "${category}" - defaulting to "social"`);
            return 'social';
        }

        return mappedCategory;
    }

    assessDifficulty(term) {
        const wordCount = term.split(' ').length;
        const hasComplexWords = /(government|business|cooperation|structure|certificate|application|registration|compliance|regulation)/i.test(term);

        if (wordCount >= 4 || hasComplexWords) return 'hard';
        if (wordCount >= 2) return 'normal';
        return 'easy';
    }

    generatePhonetic(term) {
        // Simple phonetic generation - in real implementation, you'd use a proper phonetic library
        const words = term.toLowerCase().split(' ');
        const phonetic = words.map(word => `'${word}?`).join(' ');
        return `UK /${phonetic}/`;
    }

    extractVocabularyFromDialogue(dialogue) {
        for (const sentence of dialogue.sentences) {
            for (const vocab of sentence.vocabulary) {
                this.vocabulary.push({
                    term: vocab.term,
                    conversation_id: dialogue.id,
                    sentence_id: sentence.id,
                    difficulty: vocab.difficulty,
                    category: dialogue.category,
                    phonetic: vocab.phonetic,
                    example: sentence.english,
                    example_chinese: sentence.chinese
                });
            }
        }
    }

    saveProcessedData(data, outputDir) {
        console.log(`\n💾 Saving processed data...`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`   • Created output directory: ${outputDir}`);
        }

        // Save main dialogue data
        const dialogueFile = path.join(outputDir, 'dialogue-data.json');
        fs.writeFileSync(dialogueFile, JSON.stringify(data.dialogues, null, 2));
        console.log(`   • Saved dialogue data: ${dialogueFile}`);

        // Save vocabulary data
        const vocabFile = path.join(outputDir, 'vocabulary-data.json');
        fs.writeFileSync(vocabFile, JSON.stringify(data.vocabulary, null, 2));
        console.log(`   • Saved vocabulary data: ${vocabFile}`);

        // Save complete dataset
        const completeFile = path.join(outputDir, 'complete-dataset.json');
        fs.writeFileSync(completeFile, JSON.stringify(data, null, 2));
        console.log(`   • Saved complete dataset: ${completeFile}`);

        // Generate summary report
        this.generateReport(data, outputDir);

        console.log(`✅ All data files saved successfully!`);
    }

    generateReport(data, outputDir) {
        console.log(`\n📊 Generating processing report...`);

        const report = {
            summary: {
                totalDialogues: data.metadata.totalDialogues,
                totalVocabularyTerms: data.metadata.totalVocabularyTerms,
                processedAt: data.metadata.processedAt,
                sourceFile: data.metadata.sourceFile,
                processingErrors: data.metadata.processingErrors,
                processingWarnings: data.metadata.processingWarnings
            },
            categoryDistribution: {},
            difficultyDistribution: {},
            dialogueList: data.dialogues.map(d => ({
                id: d.id,
                title: d.title,
                category: d.category,
                vocabularyCount: d.metadata.total_vocabulary_terms,
                sentenceCount: d.sentences.length
            }))
        };

        // Count categories
        for (const dialogue of data.dialogues) {
            const cat = dialogue.category;
            report.categoryDistribution[cat] = (report.categoryDistribution[cat] || 0) + 1;
        }

        // Count difficulties
        for (const vocab of data.vocabulary) {
            const diff = vocab.difficulty;
            report.difficultyDistribution[diff] = (report.difficultyDistribution[diff] || 0) + 1;
        }

        // Save JSON report
        const reportFile = path.join(outputDir, 'processing-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`   • Saved JSON report: ${reportFile}`);

        // Generate markdown report
        const markdownReport = this.generateMarkdownReport(report);
        const markdownFile = path.join(outputDir, 'processing-report.md');
        fs.writeFileSync(markdownFile, markdownReport);
        console.log(`   • Saved markdown report: ${markdownFile}`);
    }

    generateMarkdownReport(report) {
        let markdown = `# CCL Dialogue Data Processing Report\n\n`;
        markdown += `**Generated:** ${report.summary.processedAt}\n`;
        markdown += `**Source File:** ${report.summary.sourceFile}\n`;
        markdown += `**Total Dialogues:** ${report.summary.totalDialogues}\n`;
        markdown += `**Total Vocabulary Terms:** ${report.summary.totalVocabularyTerms}\n`;
        markdown += `**Processing Errors:** ${report.summary.processingErrors}\n`;
        markdown += `**Processing Warnings:** ${report.summary.processingWarnings}\n\n`;

        markdown += `## Category Distribution\n\n`;
        for (const [category, count] of Object.entries(report.categoryDistribution)) {
            const categoryInfo = this.categories[category];
            const emoji = categoryInfo ? categoryInfo.emoji : '❓';
            markdown += `- **${emoji} ${category}**: ${count} dialogues\n`;
        }

        markdown += `\n## Difficulty Distribution\n\n`;
        for (const [difficulty, count] of Object.entries(report.difficultyDistribution)) {
            const emoji = {
                'easy': '🟢',
                'normal': '🟡',
                'hard': '🔴'
            }[difficulty] || '❓';
            markdown += `- **${emoji} ${difficulty}**: ${count} terms\n`;
        }

        markdown += `\n## Dialogue List\n\n`;
        for (const dialogue of report.dialogueList) {
            const categoryInfo = this.categories[dialogue.category];
            const emoji = categoryInfo ? categoryInfo.emoji : '❓';
            markdown += `- **${emoji} ${dialogue.id}**: ${dialogue.title} (${dialogue.category})\n`;
            markdown += `  - Sentences: ${dialogue.sentenceCount}, Vocabulary: ${dialogue.vocabularyCount}\n`;
        }

        if (report.summary.processingErrors > 0) {
            markdown += `\n## Processing Errors\n\n`;
            markdown += `⚠️  ${report.summary.processingErrors} errors occurred during processing.\n`;
            markdown += `Please check the console output for details.\n`;
        }

        if (report.summary.processingWarnings > 0) {
            markdown += `\n## Processing Warnings\n\n`;
            markdown += `⚠️  ${report.summary.processingWarnings} warnings occurred during processing.\n`;
            markdown += `These are non-critical issues that don't prevent data generation.\n`;
        }

        return markdown;
    }

    validateData(data) {
        console.log(`\n🔍 Validating processed data...`);

        let isValid = true;
        const validationErrors = [];

        // Validate dialogues
        for (const dialogue of data.dialogues) {
            if (!dialogue.id || !dialogue.title || !dialogue.category) {
                validationErrors.push(`Dialogue ${dialogue.id}: Missing required fields`);
                isValid = false;
            }

            if (!this.categories[dialogue.category]) {
                validationErrors.push(`Dialogue ${dialogue.id}: Invalid category "${dialogue.category}"`);
                isValid = false;
            }

            if (!Array.isArray(dialogue.sentences) || dialogue.sentences.length === 0) {
                validationErrors.push(`Dialogue ${dialogue.id}: No sentences found`);
                isValid = false;
            }
        }

        // Validate vocabulary
        for (const vocab of data.vocabulary) {
            if (!vocab.term || !vocab.conversation_id || !vocab.category) {
                validationErrors.push(`Vocabulary: Missing required fields in term "${vocab.term}"`);
                isValid = false;
            }

            if (!['easy', 'normal', 'hard'].includes(vocab.difficulty)) {
                validationErrors.push(`Vocabulary: Invalid difficulty "${vocab.difficulty}" for term "${vocab.term}"`);
                isValid = false;
            }
        }

        if (validationErrors.length > 0) {
            console.log(`❌ Validation failed with ${validationErrors.length} errors:`);
            validationErrors.forEach(error => console.log(`   • ${error}`));
        } else {
            console.log(`✅ Data validation passed!`);
        }

        return isValid;
    }
}

// Main execution
if (require.main === module) {
    const processor = new DialogueDataProcessor();

    try {
        const inputFile = path.join(__dirname, '..', 'data-processing', 'extractors', 'merged-conversations.md');
        const outputDir = path.join(__dirname, '..', 'data', 'processed');

        console.log('🚀 Starting CCL Dialogue Data Processing...\n');

        // Process the markdown file
        const data = processor.processMarkdownFile(inputFile);

        // Validate the processed data
        if (processor.validateData(data)) {
            // Save the processed data
            processor.saveProcessedData(data, outputDir);

            console.log('\n🎉 Processing completed successfully!');
            console.log(`📊 Final Summary:`);
            console.log(`   • Dialogues: ${data.metadata.totalDialogues}`);
            console.log(`   • Vocabulary Terms: ${data.metadata.totalVocabularyTerms}`);
            console.log(`   • Categories: ${Object.keys(data.categories).length}`);
            console.log(`   • Output Directory: ${outputDir}`);

            if (data.metadata.processingErrors > 0) {
                console.log(`⚠️  ${data.metadata.processingErrors} errors occurred - check logs above`);
            }

            if (data.metadata.processingWarnings > 0) {
                console.log(`⚠️  ${data.metadata.processingWarnings} warnings occurred - check logs above`);
            }
        } else {
            console.log('\n❌ Data validation failed - not saving files');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n💥 Processing failed:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

module.exports = DialogueDataProcessor;
