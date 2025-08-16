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
    constructor() {
        this.mergedFile = path.join(__dirname, '../data-processing/extractors/merged-70241-70158.md');
        this.outputDir = path.join(__dirname, '../data/generated');
        this.reportsDir = path.join(__dirname, '../reports');
        this.vocabularyItems = [];
        this.conversationData = [];
        
        // Ensure output directories exist
        [this.outputDir, this.reportsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        // Category mapping for conversations
        this.categoryMapping = {
            'business': 'business-finance',
            'medical': 'medical-healthcare', 
            'legal': 'legal-government',
            'education': 'education',
            'social': 'social-welfare',
            'immigration': 'travel-immigration',
            'travel': 'travel-immigration',
            'finance': 'business-finance',
            'healthcare': 'medical-healthcare',
            'government': 'legal-government'
        };
    }

    /**
     * Parse the merged conversation file and extract highlighted terms
     */
    async processMergedFile() {
        console.log('📋 Processing merged conversation file with highlighted terms...');
        
        const content = fs.readFileSync(this.mergedFile, 'utf-8');
        const lines = content.split('\n');
        
        let currentConversation = null;
        let sentenceNumber = 0;
        let pendingEnglishLine = null;
        
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            
            // Parse conversation header: #70241. Suite Bathroom Design Clarification–Business
            const conversationMatch = trimmed.match(/^#(\d+)\.\s*(.+?)–(.+)$/);
            if (conversationMatch) {
                currentConversation = {
                    id: conversationMatch[1],
                    title: conversationMatch[2].trim(),
                    domain: conversationMatch[3].trim().toLowerCase(),
                    category: this.mapCategory(conversationMatch[3].trim().toLowerCase())
                };
                sentenceNumber = 0;
                continue;
            }
            
            // Parse sentence lines with | delimiter and highlighted terms
            if (trimmed.match(/^\d+\.\s+/) && trimmed.includes('|') && currentConversation) {
                sentenceNumber++;
                pendingEnglishLine = trimmed;
                
                // Look for the next line which should be Chinese translation
                const nextLine = lines[i + 1];
                if (nextLine && nextLine.trim() && !nextLine.trim().match(/^\d+\./)) {
                    const chineseLine = nextLine.trim();
                    this.extractTermsFromSentencePair(pendingEnglishLine, chineseLine, currentConversation, sentenceNumber);
                    pendingEnglishLine = null;
                }
            }
        }
        
        console.log(`✅ Extracted ${this.vocabularyItems.length} highlighted terms from conversations`);
    }

    /**
     * Extract highlighted terms from English/Chinese sentence pair
     */
    extractTermsFromSentencePair(englishLine, chineseLine, conversation, sentenceNumber) {
        // Split both lines by | to get corresponding parts
        const englishParts = englishLine.split('|');
        const chineseParts = chineseLine.split('|');
        
        for (let i = 0; i < englishParts.length; i++) {
            const englishPart = englishParts[i];
            const chinesePart = chineseParts[i] || ''; // Fallback if Chinese parts don't match
            
            // Find all highlighted terms _xxx_ in this English part
            const highlightedTerms = englishPart.match(/_([^_]+)_/g);
            
            if (highlightedTerms) {
                for (const highlighted of highlightedTerms) {
                    const term = highlighted.replace(/_/g, '').trim();
                    
                    if (term && term.length > 1) {
                        // Get the full sentence for context (remove highlighting for example)
                        const fullSentence = englishPart.replace(/^\d+\.\s*/, '').replace(/_([^_]+)_/g, '$1').trim();
                        const fullChineseSentence = chinesePart.trim();
                        
                        // Try to extract Chinese translation for the specific term
                        const chineseTranslation = this.extractChineseForTerm(term, englishPart, chinesePart);
                        
                        this.addVocabularyItem({
                            english: term,
                            chinese: chineseTranslation,
                            difficulty: this.classifyDifficulty(term),
                            example: fullSentence,
                            exampleChinese: fullChineseSentence,
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
        return this.categoryMapping[domain] || 'business-finance';
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
            totalConversations: new Set(this.vocabularyItems.map(item => item.conversationId)).size,
            extractionMethod: 'highlighted-terms',
            sourceFile: 'merged-70241-70158.md',
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
- **Source**: merged-70241-70158.md
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
            
            await this.processMergedFile();
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
    const extractor = new ConversationVocabularyExtractor();
    extractor.run();
}

module.exports = ConversationVocabularyExtractor;