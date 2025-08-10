#!/usr/bin/env node

/**
 * CCL Conversation Extraction Script
 * 
 * Extracts structured conversation data from the 77 CCL exam markdown files
 * and creates clean, organized conversation data for pronunciation training.
 */

const fs = require('fs');
const path = require('path');

class CCLConversationExtractor {
    constructor() {
        this.conversations = [];
        this.outputDir = path.join(__dirname, '../data/generated');
        this.reportDir = path.join(__dirname, '../reports');
        
        // Ensure directories exist
        this.ensureDirectories();
        
        // Domain mapping based on conversation titles
        this.domainKeywords = {
            'housing': ['house', 'home', 'property', 'rent', 'lease', 'apartment', 'building'],
            'social-welfare': ['welfare', 'pension', 'care', 'support', 'social', 'aged care', 'disability'],
            'legal': ['legal', 'court', 'police', 'lawyer', 'law', 'crime', 'dispute', 'fine'],
            'medical': ['medical', 'health', 'doctor', 'hospital', 'clinic', 'medicine', 'examination'],
            'education': ['school', 'education', 'student', 'teacher', 'university', 'course', 'study'],
            'business': ['business', 'insurance', 'bank', 'finance', 'investment', 'trade', 'employment'],
            'immigration': ['immigration', 'visa', 'citizenship', 'passport', 'border', 'resident']
        };
    }
    
    ensureDirectories() {
        [this.outputDir, this.reportDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    /**
     * Extract all conversations from markdown files
     */
    async extractAllConversations() {
        console.log('🔍 Starting CCL conversation extraction...');
        
        try {
            const files = fs.readdirSync(this.conversationDir)
                .filter(file => file.endsWith('.md'))
                .sort();
            
            console.log(`📚 Found ${files.length} markdown files to process`);
            
            for (const file of files) {
                await this.processFile(file);
            }
            
            await this.generateOutput();
            this.generateReport();
            
            console.log('✅ Conversation extraction completed successfully!');
            
        } catch (error) {
            console.error('❌ Error during extraction:', error);
            throw error;
        }
    }
    
    /**
     * Process a single markdown file
     */
    async processFile(filename) {
        const filepath = path.join(this.conversationDir, filename);
        const content = fs.readFileSync(filepath, 'utf8');
        
        console.log(`📄 Processing: ${filename}`);
        
        // Split content into sections by conversation ID pattern
        const conversationSections = this.splitIntoConversations(content);
        
        for (const section of conversationSections) {
            const conversation = this.parseConversation(section, filename);
            if (conversation) {
                this.conversations.push(conversation);
            }
        }
    }
    
    /**
     * Split file content into individual conversations
     */
    splitIntoConversations(content) {
        // Pattern: #70001. Title - Domain
        const conversationPattern = /#(\d+)\.\s*([^-\n]+)\s*-\s*([^\n]+)/g;
        const sections = [];
        let match;
        let lastIndex = 0;
        
        while ((match = conversationPattern.exec(content)) !== null) {
            // Add previous section content if exists
            if (lastIndex > 0) {
                const sectionContent = content.substring(lastIndex, match.index);
                if (sectionContent.trim()) {
                    sections.push({
                        content: sectionContent,
                        startIndex: lastIndex
                    });
                }
            }
            
            lastIndex = match.index;
        }
        
        // Add final section
        if (lastIndex > 0) {
            const finalContent = content.substring(lastIndex);
            if (finalContent.trim()) {
                sections.push({
                    content: finalContent,
                    startIndex: lastIndex
                });
            }
        }
        
        return sections;
    }
    
    /**
     * Parse individual conversation section
     */
    parseConversation(section, sourceFile) {
        const content = section.content;
        
        // Extract conversation header
        const headerMatch = content.match(/#(\d+)\.\s*([^-\n]+)\s*-\s*([^\n]+)/);
        if (!headerMatch) return null;
        
        const [, id, title, domain] = headerMatch;
        
        // Extract dialogue pairs
        const dialogues = this.extractDialogues(content);
        
        if (dialogues.length === 0) return null;
        
        // Determine domain category
        const domainCategory = this.categorizeDomain(title.toLowerCase() + ' ' + domain.toLowerCase());
        
        return {
            id: id.trim(),
            title: title.trim(),
            domain: domain.trim(),
            domainCategory,
            sourceFile,
            dialogueCount: dialogues.length,
            dialogues: dialogues,
            extractedAt: new Date().toISOString()
        };
    }
    
    /**
     * Extract dialogue pairs from conversation content
     */
    extractDialogues(content) {
        const dialogues = [];
        
        // Pattern for numbered dialogue entries
        // Matches: 1. English text (Chinese text) or Chinese text (English text)
        const dialoguePattern = /(\d+)\.\s*([^(]+?)\(([^)]+)\)/g;
        
        let match;
        while ((match = dialoguePattern.exec(content)) !== null) {
            const [, number, text1, text2] = match;
            
            // Determine which is English and which is Chinese
            const isText1English = this.isEnglish(text1.trim());
            const english = isText1English ? text1.trim() : text2.trim();
            const chinese = isText1English ? text2.trim() : text1.trim();
            
            // Clean up the text
            const cleanEnglish = this.cleanText(english);
            const cleanChinese = this.cleanText(chinese);
            
            if (cleanEnglish && cleanChinese) {
                dialogues.push({
                    number: parseInt(number),
                    english: cleanEnglish,
                    chinese: cleanChinese,
                    wordCount: cleanEnglish.split(' ').length,
                    difficulty: this.assessDifficulty(cleanEnglish)
                });
            }
        }
        
        return dialogues;
    }
    
    /**
     * Determine if text is primarily English
     */
    isEnglish(text) {
        // Count English characters vs Chinese characters
        const englishChars = text.match(/[a-zA-Z]/g) || [];
        const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
        
        return englishChars.length > chineseChars.length;
    }
    
    /**
     * Clean and normalize text
     */
    cleanText(text) {
        return text
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[""'']/g, '"')
            .replace(/…/g, '...')
            .trim();
    }
    
    /**
     * Assess difficulty level of English text
     */
    assessDifficulty(text) {
        const wordCount = text.split(' ').length;
        const avgWordLength = text.replace(/[^a-zA-Z]/g, '').length / wordCount;
        const complexWords = text.match(/\b\w{8,}\b/g) || [];
        
        if (wordCount <= 8 && avgWordLength < 5 && complexWords.length === 0) {
            return 'easy';
        } else if (wordCount <= 15 && avgWordLength < 6 && complexWords.length <= 2) {
            return 'normal';
        } else {
            return 'hard';
        }
    }
    
    /**
     * Categorize conversation domain
     */
    categorizeDomain(text) {
        for (const [domain, keywords] of Object.entries(this.domainKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return domain;
            }
        }
        return 'general';
    }
    
    /**
     * Generate structured output files
     */
    async generateOutput() {
        console.log('📝 Generating output files...');
        
        // Generate main conversation data file
        const conversationData = {
            generatedAt: new Date().toISOString(),
            totalConversations: this.conversations.length,
            totalDialogues: this.conversations.reduce((sum, conv) => sum + conv.dialogueCount, 0),
            domains: this.getDomainStatistics(),
            conversations: this.conversations
        };
        
        // Write main data file
        const dataFile = path.join(this.outputDir, 'conversation-data.js');
        const jsContent = `// CCL Conversation Data - Generated ${new Date().toISOString()}
// Total: ${conversationData.totalConversations} conversations, ${conversationData.totalDialogues} dialogues

window.conversationData = ${JSON.stringify(conversationData, null, 2)};

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.conversationData;
}`;
        
        fs.writeFileSync(dataFile, jsContent);
        
        // Write JSON data file for analysis
        const jsonFile = path.join(this.outputDir, 'conversation-data.json');
        fs.writeFileSync(jsonFile, JSON.stringify(conversationData, null, 2));
        
        console.log(`✅ Generated conversation data: ${conversationData.totalConversations} conversations`);
    }
    
    /**
     * Generate domain statistics
     */
    getDomainStatistics() {
        const stats = {};
        
        this.conversations.forEach(conv => {
            const domain = conv.domainCategory;
            if (!stats[domain]) {
                stats[domain] = {
                    conversations: 0,
                    dialogues: 0,
                    avgDialoguesPerConversation: 0
                };
            }
            
            stats[domain].conversations++;
            stats[domain].dialogues += conv.dialogueCount;
        });
        
        // Calculate averages
        Object.values(stats).forEach(stat => {
            stat.avgDialoguesPerConversation = Math.round(stat.dialogues / stat.conversations * 10) / 10;
        });
        
        return stats;
    }
    
    /**
     * Generate analysis report
     */
    generateReport() {
        console.log('📊 Generating analysis report...');
        
        const report = {
            summary: {
                totalFiles: 77,
                processedFiles: new Set(this.conversations.map(c => c.sourceFile)).size,
                totalConversations: this.conversations.length,
                totalDialogues: this.conversations.reduce((sum, conv) => sum + conv.dialogueCount, 0),
                avgDialoguesPerConversation: Math.round(this.conversations.reduce((sum, conv) => sum + conv.dialogueCount, 0) / this.conversations.length * 10) / 10
            },
            domains: this.getDomainStatistics(),
            difficulty: this.getDifficultyStatistics(),
            topConversations: this.getTopConversations(),
            extractionDate: new Date().toISOString()
        };
        
        // Write report
        const reportFile = path.join(this.reportDir, 'conversation-extraction-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        // Write readable markdown report
        this.generateMarkdownReport(report);
        
        console.log('✅ Analysis report generated');
    }
    
    /**
     * Get difficulty statistics
     */
    getDifficultyStatistics() {
        const allDialogues = this.conversations.flatMap(conv => conv.dialogues);
        const stats = { easy: 0, normal: 0, hard: 0 };
        
        allDialogues.forEach(dialogue => {
            stats[dialogue.difficulty]++;
        });
        
        const total = allDialogues.length;
        return {
            easy: { count: stats.easy, percentage: Math.round(stats.easy / total * 1000) / 10 },
            normal: { count: stats.normal, percentage: Math.round(stats.normal / total * 1000) / 10 },
            hard: { count: stats.hard, percentage: Math.round(stats.hard / total * 1000) / 10 }
        };
    }
    
    /**
     * Get top conversations by dialogue count
     */
    getTopConversations() {
        return this.conversations
            .sort((a, b) => b.dialogueCount - a.dialogueCount)
            .slice(0, 10)
            .map(conv => ({
                id: conv.id,
                title: conv.title,
                domain: conv.domainCategory,
                dialogueCount: conv.dialogueCount
            }));
    }
    
    /**
     * Generate readable markdown report
     */
    generateMarkdownReport(report) {
        const md = `# CCL Conversation Extraction Report

Generated: ${new Date(report.extractionDate).toLocaleString()}

## Summary

- **Total Files Processed**: ${report.summary.processedFiles}/${report.summary.totalFiles}
- **Total Conversations**: ${report.summary.totalConversations}
- **Total Dialogues**: ${report.summary.totalDialogues}
- **Average Dialogues per Conversation**: ${report.summary.avgDialoguesPerConversation}

## Domain Distribution

| Domain | Conversations | Dialogues | Avg Dialogues/Conv |
|--------|---------------|-----------|-------------------|
${Object.entries(report.domains).map(([domain, stats]) => 
    `| ${domain} | ${stats.conversations} | ${stats.dialogues} | ${stats.avgDialoguesPerConversation} |`
).join('\n')}

## Difficulty Distribution

- 🟢 **Easy**: ${report.difficulty.easy.count} dialogues (${report.difficulty.easy.percentage}%)
- 🟡 **Normal**: ${report.difficulty.normal.count} dialogues (${report.difficulty.normal.percentage}%)
- 🔴 **Hard**: ${report.difficulty.hard.count} dialogues (${report.difficulty.hard.percentage}%)

## Top 10 Conversations by Dialogue Count

| ID | Title | Domain | Dialogues |
|----|-------|---------|-----------|
${report.topConversations.map(conv => 
    `| #${conv.id} | ${conv.title} | ${conv.domain} | ${conv.dialogueCount} |`
).join('\n')}

## Usage Notes

- Conversations are structured with bilingual dialogue pairs
- Each dialogue includes English text, Chinese translation, and difficulty assessment
- Domain categorization uses keyword matching for CCL exam contexts
- Difficulty is assessed based on word count, complexity, and vocabulary level

## Integration Opportunities

1. **Context-aware vocabulary practice** - Show conversation examples for vocabulary terms
2. **Sentence-level pronunciation** - TTS practice with natural dialogue flow
3. **Progressive learning** - Start with easy dialogues, advance through difficulty levels
4. **Domain-specific training** - Focus practice on specific CCL exam domains
`;
        
        const mdFile = path.join(this.reportDir, 'conversation-extraction-report.md');
        fs.writeFileSync(mdFile, md);
    }
}

// Main execution
async function main() {
    try {
        const extractor = new CCLConversationExtractor();
        await extractor.extractAllConversations();
        
        console.log('\n🎉 CCL Conversation extraction completed successfully!');
        console.log('\n📁 Generated files:');
        console.log('   - data/generated/conversation-data.js (for web app)');
        console.log('   - data/generated/conversation-data.json (for analysis)');
        console.log('   - reports/conversation-extraction-report.json (detailed data)');
        console.log('   - reports/conversation-extraction-report.md (readable summary)');
        
    } catch (error) {
        console.error('\n❌ Extraction failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = CCLConversationExtractor;