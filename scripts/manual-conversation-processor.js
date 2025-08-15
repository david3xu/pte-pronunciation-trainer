#!/usr/bin/env node

/**
 * Manual Conversation Data Processor
 * 
 * Uses manually split and formatted sentences from merged-70241-70158.md
 * to create conversation-based vocabulary entries.
 */

const fs = require('fs');
const path = require('path');

class ManualConversationProcessor {
    constructor() {
        this.inputFile = path.join(__dirname, '../data-processing/extractors/merged-70241-70158.md');
        this.outputDir = path.join(__dirname, '../data/generated');
        this.reportsDir = path.join(__dirname, '../reports');
        this.vocabularyItems = [];
        
        // Ensure output directories exist
        [this.outputDir, this.reportsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        // Category mapping based on conversation topics
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
     * Parse the manually formatted conversation file
     */
    parseConversationFile() {
        const content = fs.readFileSync(this.inputFile, 'utf-8');
        const lines = content.split('\n');
        
        let currentConversation = null;
        let sentenceNumber = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and separator lines
            if (!line || line === '---') continue;
            
            // Check for conversation header (e.g., #70241. Suite Bathroom Design Clarification–Business)
            const conversationMatch = line.match(/^#(\d+)\.\s+(.+?)(?:–|—|-)\s*(\w+)?$/);
            if (conversationMatch) {
                currentConversation = {
                    id: conversationMatch[1],
                    title: conversationMatch[2].trim(),
                    category: this.detectCategory(conversationMatch[3] || conversationMatch[2])
                };
                sentenceNumber = 0;
                continue;
            }
            
            // Check for sentence pairs (numbered lines with English | Chinese)
            const sentenceMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (sentenceMatch && currentConversation) {
                sentenceNumber = parseInt(sentenceMatch[1]);
                const content = sentenceMatch[2];
                
                // Split by | to separate English and Chinese parts
                const parts = content.split('|').map(p => p.trim());
                
                if (parts.length >= 1) {
                    // Process English segments
                    const englishSegments = parts[0].split(/[.!?]+/).filter(s => s.trim());
                    
                    // Get Chinese line (next line if it exists and doesn't start with number)
                    let chineseLine = '';
                    if (i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        if (nextLine && !nextLine.match(/^\d+\./) && !nextLine.startsWith('#') && nextLine !== '---') {
                            chineseLine = nextLine;
                            i++; // Skip the Chinese line in next iteration
                        }
                    }
                    
                    // Extract vocabulary from each segment
                    englishSegments.forEach(segment => {
                        this.extractVocabularyFromSegment(
                            segment.trim(),
                            chineseLine,
                            currentConversation
                        );
                    });
                    
                    // Also process any additional English in parts[1] if it exists
                    if (parts.length > 1 && parts[1]) {
                        const additionalSegments = parts[1].split(/[.!?]+/).filter(s => s.trim());
                        additionalSegments.forEach(segment => {
                            this.extractVocabularyFromSegment(
                                segment.trim(),
                                chineseLine,
                                currentConversation
                            );
                        });
                    }
                }
            }
        }
    }
    
    /**
     * Extract vocabulary items from a sentence segment
     */
    extractVocabularyFromSegment(englishSegment, chineseContext, conversation) {
        if (!englishSegment || englishSegment.length < 3) return;
        
        // Define patterns for meaningful phrases
        const patterns = [
            // Verb phrases
            /\b(drop by to visit)\b/gi,
            /\b(swing by)\b/gi,
            /\b(take shape)\b/gi,
            /\b(gone up)\b/gi,
            /\b(go over)\b/gi,
            /\b(double-check)\b/gi,
            /\b(puts? my mind at ease)\b/gi,
            /\b(catch and fix issues)\b/gi,
            /\b(look after)\b/gi,
            /\b(keep track of)\b/gi,
            
            // Noun phrases
            /\b(material delivery)\b/gi,
            /\b(material prices?)\b/gi,
            /\b(construction plans?)\b/gi,
            /\b(blueprints?)\b/gi,
            /\b(suite bathroom)\b/gi,
            /\b(vintage bathtub)\b/gi,
            /\b(master bathroom)\b/gi,
            /\b(shower stall)\b/gi,
            /\b(lounge chair)\b/gi,
            /\b(leather sofa)\b/gi,
            /\b(payment method)\b/gi,
            /\b(installment payment)\b/gi,
            /\b(credit score)\b/gi,
            
            // Professional terms
            /\b(plumber)\b/gi,
            /\b(supplier)\b/gi,
            /\b(crew)\b/gi,
            
            // Time expressions
            /\b(early last week)\b/gi,
            /\b(every night)\b/gi,
            /\b(nowadays)\b/gi,
            
            // Business/financial terms
            /\b(Buy Now,? Pay Later)\b/gi,
            /\b(split the payment)\b/gi,
            /\b(extra fees?)\b/gi,
            /\b(big purchases?)\b/gi,
            
            // Common phrases
            /\b(strike\w* \w+ as \w+ strange)\b/gi,
            /\b(inspect the site)\b/gi,
            /\b(browse\w* the mall)\b/gi,
            /\b(loads of options)\b/gi,
            /\b(makes? the most sense)\b/gi,
            
            // Multi-word expressions
            /\b(it's been ages since)\b/gi,
            /\b(watch out for)\b/gi,
            /\b(works? well for)\b/gi,
            /\b(designed around)\b/gi,
            /\b(looking forward to)\b/gi
        ];
        
        // Extract phrases using patterns
        patterns.forEach(pattern => {
            const matches = englishSegment.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleanMatch = match.trim();
                    if (cleanMatch.length >= 3 && !this.isDuplicate(cleanMatch)) {
                        this.vocabularyItems.push({
                            english: cleanMatch.toLowerCase(),
                            chinese: '', // Will be filled from context if available
                            difficulty: this.calculateDifficulty(cleanMatch),
                            example: englishSegment,
                            exampleChinese: chineseContext,
                            category: conversation.category,
                            conversationId: conversation.id
                        });
                    }
                });
            }
        });
        
        // Also extract important individual words (nouns, verbs, adjectives)
        const importantWords = englishSegment.match(/\b(plumber|supplier|crew|vintage|suite|bathroom|material|delivery|construction|blueprint|payment|installment|credit|purchase|inspect|browse|design|progress|issue|customer|option)\b/gi);
        
        if (importantWords) {
            importantWords.forEach(word => {
                const cleanWord = word.trim().toLowerCase();
                if (cleanWord.length >= 3 && !this.isDuplicate(cleanWord)) {
                    this.vocabularyItems.push({
                        english: cleanWord,
                        chinese: '',
                        difficulty: 'easy',
                        example: englishSegment,
                        exampleChinese: chineseContext,
                        category: conversation.category,
                        conversationId: conversation.id
                    });
                }
            });
        }
    }
    
    /**
     * Check if vocabulary item already exists
     */
    isDuplicate(term) {
        return this.vocabularyItems.some(item => 
            item.english.toLowerCase() === term.toLowerCase()
        );
    }
    
    /**
     * Detect category from conversation title or category tag
     */
    detectCategory(text) {
        const lowerText = text.toLowerCase();
        
        for (const [keyword, category] of Object.entries(this.categoryMapping)) {
            if (lowerText.includes(keyword)) {
                return category;
            }
        }
        
        // Default category
        return 'general';
    }
    
    /**
     * Calculate difficulty based on phrase complexity
     */
    calculateDifficulty(text) {
        const words = text.split(/\s+/).length;
        const length = text.length;
        
        if (words === 1 && length <= 10) return 'easy';
        if (words <= 2 && length <= 20) return 'easy';
        if (words <= 3 && length <= 30) return 'normal';
        if (words <= 4 && length <= 40) return 'normal';
        return 'hard';
    }
    
    /**
     * Generate output files
     */
    generateOutput() {
        // Remove duplicates and sort by conversation ID (descending)
        const uniqueVocabulary = Array.from(
            new Map(this.vocabularyItems.map(item => [item.english, item])).values()
        ).sort((a, b) => {
            const idDiff = parseInt(b.conversationId) - parseInt(a.conversationId);
            if (idDiff !== 0) return idDiff;
            return a.english.localeCompare(b.english);
        });
        
        // Generate JavaScript file
        const jsContent = `// Auto-generated conversation vocabulary data from manually split sentences
// Source: merged-70241-70158.md
// Generated: ${new Date().toISOString()}
// Total items: ${uniqueVocabulary.length}

window.conversationVocabularyData = {
    vocabulary: ${JSON.stringify(uniqueVocabulary, null, 2)}
};

console.log(\`Loaded \${window.conversationVocabularyData.vocabulary.length} conversation vocabulary items\`);`;
        
        fs.writeFileSync(
            path.join(this.outputDir, 'conversation-vocabulary-data.js'),
            jsContent
        );
        
        // Generate JSON file
        fs.writeFileSync(
            path.join(this.outputDir, 'conversation-vocabulary-data.json'),
            JSON.stringify({ vocabulary: uniqueVocabulary }, null, 2)
        );
        
        // Generate report
        this.generateReport(uniqueVocabulary);
        
        return uniqueVocabulary.length;
    }
    
    /**
     * Generate detailed report
     */
    generateReport(vocabulary) {
        const categoryStats = {};
        const difficultyStats = { easy: 0, normal: 0, hard: 0 };
        const conversationStats = {};
        
        vocabulary.forEach(item => {
            // Category stats
            categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
            
            // Difficulty stats
            difficultyStats[item.difficulty]++;
            
            // Conversation stats
            conversationStats[item.conversationId] = (conversationStats[item.conversationId] || 0) + 1;
        });
        
        const report = `# Conversation Vocabulary Extraction Report

Generated: ${new Date().toISOString()}
Source: merged-70241-70158.md (manually split sentences)

## Summary
- Total vocabulary items: ${vocabulary.length}
- Total conversations processed: ${Object.keys(conversationStats).length}

## Category Distribution
${Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `- ${cat}: ${count} items (${((count/vocabulary.length)*100).toFixed(1)}%)`)
    .join('\n')}

## Difficulty Distribution
- Easy: ${difficultyStats.easy} items (${((difficultyStats.easy/vocabulary.length)*100).toFixed(1)}%)
- Normal: ${difficultyStats.normal} items (${((difficultyStats.normal/vocabulary.length)*100).toFixed(1)}%)
- Hard: ${difficultyStats.hard} items (${((difficultyStats.hard/vocabulary.length)*100).toFixed(1)}%)

## Top Conversations by Vocabulary Count
${Object.entries(conversationStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => `- Conversation ${id}: ${count} items`)
    .join('\n')}

## Sample Vocabulary Items

### Easy Examples
${vocabulary.filter(v => v.difficulty === 'easy').slice(0, 5)
    .map(v => `- "${v.english}" (${v.category})`)
    .join('\n')}

### Normal Examples
${vocabulary.filter(v => v.difficulty === 'normal').slice(0, 5)
    .map(v => `- "${v.english}" (${v.category})`)
    .join('\n')}

### Hard Examples
${vocabulary.filter(v => v.difficulty === 'hard').slice(0, 5)
    .map(v => `- "${v.english}" (${v.category})`)
    .join('\n')}
`;
        
        fs.writeFileSync(
            path.join(this.reportsDir, 'manual-conversation-vocabulary-report.md'),
            report
        );
    }
    
    /**
     * Main execution
     */
    run() {
        console.log('📚 Processing manually split conversation data...');
        console.log(`📂 Input: ${this.inputFile}`);
        
        if (!fs.existsSync(this.inputFile)) {
            console.error(`❌ Input file not found: ${this.inputFile}`);
            process.exit(1);
        }
        
        console.log('🔍 Parsing conversation file...');
        this.parseConversationFile();
        
        console.log(`✨ Extracted ${this.vocabularyItems.length} vocabulary items (with duplicates)`);
        
        console.log('💾 Generating output files...');
        const finalCount = this.generateOutput();
        
        console.log(`✅ Successfully generated ${finalCount} unique vocabulary items!`);
        console.log('📁 Output files:');
        console.log(`   - ${path.join(this.outputDir, 'conversation-vocabulary-data.js')}`);
        console.log(`   - ${path.join(this.outputDir, 'conversation-vocabulary-data.json')}`);
        console.log(`📊 Report: ${path.join(this.reportsDir, 'manual-conversation-vocabulary-report.md')}`);
    }
}

// Run if called directly
if (require.main === module) {
    const processor = new ManualConversationProcessor();
    processor.run();
}

module.exports = ManualConversationProcessor;