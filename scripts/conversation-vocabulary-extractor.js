#!/usr/bin/env node

/**
 * Conversation-Based Vocabulary Extractor (Highlighted Terms)
 *
 * Extracts highlighted terms (_xxx_) from merged CCL conversation file
 * and creates contextual vocabulary entries with example sentences.
 * Uses manually highlighted key terms for better accuracy.
 */

const fs = require('fs');
const path = require('path');

class ConversationVocabularyExtractor {
    constructor(inputFile = null) {
        this.inputFile = inputFile || path.join(__dirname, '../data-processing/extractors/merged-conversations.md');
        this.outputDir = path.join(__dirname, '../data/generated');
        this.reportsDir = path.join(__dirname, '../reports');
        this.vocabularyItems = [];
        this.conversationData = [];
        this.dialoguesWithTerms = new Set(); // Track dialogues that contain highlighted terms

        // Ensure output directories exist
        [this.outputDir, this.reportsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Category mapping for conversations (corrected based on raw.md)
        this.categoryMapping = {
            'business': 'business',
            'medical': 'medical',
            'legal': 'legal',
            'education': 'education',
            'social welfare': 'social-welfare',
            'social': 'social',
            'immigration': 'immigration',
            'tourism': 'tourism',
            'housing': 'housing',
            'finance': 'business',
            'healthcare': 'medical',
            'government': 'legal',
            // Add the exact strings that appear in dialogue titles
            'social+education': 'education',
            'social+business': 'business',
            'legal+business': 'legal',
            'tourism+business': 'tourism',
            'social+legal': 'legal',
            'business+social': 'business'
        };
    }

    /**
     * Parse the merged conversation file and extract highlighted terms
     * Only process dialogues that contain _xxx_ highlighted terms
     */
    async processConversationFile() {
        console.log(`📋 Processing conversation file: ${path.basename(this.inputFile)}`);

        if (!fs.existsSync(this.inputFile)) {
            throw new Error(`Input file not found: ${this.inputFile}`);
        }

        const content = fs.readFileSync(this.inputFile, 'utf-8');
        const lines = content.split('\n');

        // First pass: identify dialogues with highlighted terms
        const dialoguesWithHighlights = this.identifyDialoguesWithHighlights(lines);
        console.log(`📊 Found ${dialoguesWithHighlights.size} dialogues with highlighted terms`);

        let currentConversation = null;
        let sentenceNumber = 0;
        let pendingEnglishLine = null;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Parse conversation header: #70241. Suite Bathroom Design Clarification–Business or - Business
            const conversationMatch = trimmed.match(/^#(\d+)\.\s*(.+?)\s*[-–]\s*([^-–]+)$/);
            if (conversationMatch) {
                const conversationId = conversationMatch[1];

                // Only process if this dialogue contains highlighted terms
                if (dialoguesWithHighlights.has(conversationId)) {
                    currentConversation = {
                        id: conversationId,
                        title: conversationMatch[2].trim(),
                        domain: conversationMatch[3].trim().toLowerCase(),
                        category: this.mapCategory(conversationMatch[3].trim().toLowerCase())
                    };
                    sentenceNumber = 0;
                } else {
                    currentConversation = null; // Skip this dialogue
                }
                continue;
            }

            // Parse sentence lines with | delimiter and highlighted terms
            if (trimmed.match(/^\d+\.\s+/) && currentConversation) {
                sentenceNumber++;
                pendingEnglishLine = trimmed;

                // Look for the next line which should be translation
                const nextLine = lines[i + 1];
                if (nextLine && nextLine.trim() && !nextLine.trim().match(/^\d+\./)) {
                    const translationLine = nextLine.trim();

                    // Extract from both the main line and translation line if they have highlights
                    if (trimmed.includes('_')) {
                        this.extractTermsFromSentencePair(pendingEnglishLine, translationLine, currentConversation, sentenceNumber);
                    }
                    if (translationLine.includes('_')) {
                        this.extractTermsFromSentencePair(translationLine, pendingEnglishLine, currentConversation, sentenceNumber);
                    }
                    pendingEnglishLine = null;
                }
            }
        }

        console.log(`✅ Extracted ${this.vocabularyItems.length} highlighted terms from ${this.dialoguesWithTerms.size} conversations`);
    }

    /**
     * First pass: identify which dialogues contain highlighted terms _xxx_
     */
    identifyDialoguesWithHighlights(lines) {
        const dialoguesWithHighlights = new Set();
        let currentDialogueId = null;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Check for conversation header
            const conversationMatch = trimmed.match(/^#(\d+)\.\s*(.+?)\s*[-–]\s*(.+)$/);
            if (conversationMatch) {
                currentDialogueId = conversationMatch[1];
                continue;
            }

            // Check if this line contains highlighted terms (numbered line or its translation)
            if (currentDialogueId && trimmed.match(/^\d+\.\s+/)) {
                // Check main line
                if (trimmed.includes('_') && trimmed.match(/_[^_]+_/)) {
                    dialoguesWithHighlights.add(currentDialogueId);
                }
                // Check translation line
                const nextLine = lines[i + 1];
                if (nextLine && nextLine.trim() && !nextLine.trim().match(/^\d+\./) &&
                    nextLine.includes('_') && nextLine.match(/_[^_]+_/)) {
                    dialoguesWithHighlights.add(currentDialogueId);
                }
            }
        }

        return dialoguesWithHighlights;
    }

    /**
     * Extract highlighted terms from English/Chinese sentence pair
     * Rule 1: Split by "|" for both English and Chinese - use corresponding parts as examples
     * Rule 2: If a part contains multiple _xxx_ terms, extract each term but use same example part
     */
    extractTermsFromSentencePair(englishLine, chineseLine, conversation, sentenceNumber) {
        // Split both lines by | to get corresponding parts
        const englishParts = englishLine.replace(/^\d+\.\s*/, '').split('|');
        const chineseParts = chineseLine.split('|');

        // Process each part separately
        for (let i = 0; i < englishParts.length; i++) {
            const englishPart = englishParts[i];
            const chinesePart = chineseParts[i] || ''; // Fallback if Chinese parts don't match

            // Find all highlighted terms _xxx_ in this English part
            const highlightedTerms = englishPart.match(/_([^_]+)_/g);

            if (highlightedTerms) {
                // Get the clean example sentence for this part (remove highlighting)
                const partExample = englishPart.replace(/_([^_]+)_/g, '$1').trim();
                const partExampleChinese = chinesePart.trim();

                // Extract each term but use the same part example
                for (const highlighted of highlightedTerms) {
                    const term = highlighted.replace(/_/g, '').trim();

                    // Only process English terms (skip Chinese terms)
                    if (term && term.length > 1 && this.isEnglishTerm(term)) {
                        // Try to extract Chinese translation for the specific term
                        const chineseTranslation = this.extractChineseForTerm(term, englishPart, chinesePart);

                        // Track that this dialogue contains highlighted terms
                        this.dialoguesWithTerms.add(conversation.id);

                        this.addVocabularyItem({
                            english: term,
                            chinese: chineseTranslation,
                            difficulty: this.classifyDifficulty(term),
                            example: partExample,           // Part-specific example
                            exampleChinese: partExampleChinese, // Part-specific Chinese
                            category: conversation.category,
                            conversationId: conversation.id,
                            conversationTitle: conversation.title,
                            sentenceNumber: sentenceNumber
                        });
                    }
                }
            }
        }
    }

    /**
     * Check if a term is in English (not Chinese)
     */
    isEnglishTerm(term) {
        // Check if term contains Chinese characters (Unicode range for Chinese)
        const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/;
        return !chineseRegex.test(term);
    }

    /**
     * Extract Chinese translation for a specific English term
     */
    extractChineseForTerm(englishTerm, englishContext, chineseContext) {
        // Simple mapping for common terms, expandable as needed
        const termMap = {
            'crew': '施工队',
            'supplier': '供应商',
            'plumber': '水管工',
            'material delivery': '材料配送',
            'construction plans': '施工图纸',
            'suite bathroom': '套房浴室',
            'shower stall': '淋浴间'
        };

        return termMap[englishTerm.toLowerCase()] || '';
    }

    /**
     * Map conversation domain to vocabulary category
     */
    mapCategory(domain) {
        return this.categoryMapping[domain];
    }

    /**
     * Simple difficulty classification
     */
    classifyDifficulty(term) {
        const wordCount = term.split(/\s+/).length;
        const termLength = term.length;

        // Single short words
        if (wordCount === 1 && termLength <= 6) {
            return 'easy';
        }

        // Technical or complex phrases
        if (wordCount >= 4 || termLength > 25) {
            return 'hard';
        }

        // Medical/legal/technical terms
        if (term.includes('specialist') || term.includes('professional') ||
            term.includes('certificate') || term.includes('assessment')) {
            return 'hard';
        }

        return 'normal';
    }

    /**
     * Add vocabulary item to collection (avoid duplicates)
     */
    addVocabularyItem(item) {
        // Check for duplicates
        const exists = this.vocabularyItems.find(existing =>
            existing.english.toLowerCase() === item.english.toLowerCase()
        );

        if (!exists) {
            this.vocabularyItems.push(item);
        }
    }

    /**
     * Generate output files
     */
    async generateOutputFiles() {
        console.log('📄 Generating vocabulary data files...');

        const data = {
            generatedAt: new Date().toISOString(),
            totalTerms: this.vocabularyItems.length,
            totalConversations: this.dialoguesWithTerms.size, // Only count dialogues with highlighted terms
            extractionMethod: 'highlighted-terms',
            sourceFile: path.basename(this.inputFile),
            vocabulary: this.vocabularyItems
        };

        // Generate JSON file
        const jsonPath = path.join(this.outputDir, 'conversation-vocabulary-data.json');
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

        // Generate JS file
        const jsContent = `// Conversation-Based CCL Vocabulary Data (Highlighted Terms)
// Generated on: ${data.generatedAt}
// Source: ${data.totalConversations} CCL conversations
// Total terms: ${data.totalTerms}
// Method: Manually highlighted key terms (_xxx_)

window.conversationVocabularyData = ${JSON.stringify(data, null, 2)};
`;

        const jsPath = path.join(this.outputDir, 'conversation-vocabulary-data.js');
        fs.writeFileSync(jsPath, jsContent);

        // Generate report
        this.generateReport(data);

        console.log(`✅ Generated vocabulary files:`);
        console.log(`   📄 ${jsonPath}`);
        console.log(`   📄 ${jsPath}`);
        console.log(`   📊 ${this.vocabularyItems.length} terms extracted`);
    }

    /**
     * Generate detailed report
     */
    generateReport(data) {
        const reportPath = path.join(this.reportsDir, 'conversation-vocabulary-report.md');

        const report = `# Conversation Vocabulary Extraction Report (Highlighted Terms)

## Summary
- **Generated**: ${data.generatedAt}
- **Method**: Manually highlighted terms extraction
- **Source**: ${data.sourceFile}
- **Total Terms**: ${data.totalTerms}
- **Total Conversations**: ${data.totalConversations}

## Terms by Difficulty
${this.generateDifficultyBreakdown()}

## Terms by Category
${this.generateCategoryBreakdown()}

## Sample Terms
${this.generateSampleTerms()}
`;

        fs.writeFileSync(reportPath, report);
        console.log(`   📊 Report: ${reportPath}`);
    }

    generateDifficultyBreakdown() {
        const difficulties = {};
        this.vocabularyItems.forEach(item => {
            difficulties[item.difficulty] = (difficulties[item.difficulty] || 0) + 1;
        });

        return Object.entries(difficulties)
            .map(([diff, count]) => `- **${diff}**: ${count} terms`)
            .join('\n');
    }

    generateCategoryBreakdown() {
        const categories = {};
        this.vocabularyItems.forEach(item => {
            categories[item.category] = (categories[item.category] || 0) + 1;
        });

        return Object.entries(categories)
            .map(([cat, count]) => `- **${cat}**: ${count} terms`)
            .join('\n');
    }

    generateSampleTerms() {
        return this.vocabularyItems.slice(0, 10)
            .map(item => `- **${item.english}** (${item.difficulty}) - "${item.example}"`)
            .join('\n');
    }

    /**
     * Main execution method
     */
    async run() {
        try {
            console.log('🚀 Starting highlighted terms vocabulary extraction...');

            await this.processConversationFile();
            await this.generateOutputFiles();

            console.log('✅ Extraction completed successfully!');
        } catch (error) {
            console.error('❌ Extraction failed:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    // Check for command line argument for input file
    const inputFile = process.argv[2] || null;

    if (inputFile && !fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${inputFile}`);
        console.log('Usage: node conversation-vocabulary-extractor.js [input-file.md]');
        process.exit(1);
    }

    const extractor = new ConversationVocabularyExtractor(inputFile);
    extractor.run();
}

module.exports = ConversationVocabularyExtractor;