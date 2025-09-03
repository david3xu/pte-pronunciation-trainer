#!/usr/bin/env node

/**
 * Unfamiliar Words Processor
 * Processes the curated unfamiliar-words.md file and creates a clean dataset
 * for the new "Unfamiliar Words Focus" learning mode
 */

const fs = require('fs');
const path = require('path');

// File paths
const unfamiliarWordsPath = path.join(__dirname, '../data-processing/extractors/unfamilar-words.md');
const completeDatasetPath = path.join(__dirname, '../data/processed/complete-dataset.json');
const outputPath = path.join(__dirname, '../data/processed/unfamiliar-words-dataset.json');

class UnfamiliarWordsProcessor {
    constructor() {
        this.unfamiliarWords = [];
        this.completeDataset = null;
        this.processedCount = 0;
        this.matchedCount = 0;
    }

    async process() {
        console.log('🔥 Processing Unfamiliar Words Dataset...');
        
        // Load complete dataset for matching vocabulary details
        await this.loadCompleteDataset();
        
        // Parse unfamiliar words file
        this.parseUnfamiliarWords();
        
        // Match with complete dataset to get phonetics, examples, etc.
        this.matchWithCompleteDataset();
        
        // Generate output
        this.generateOutput();
        
        console.log(`✅ Unfamiliar words dataset created: ${this.matchedCount}/${this.processedCount} terms matched`);
    }

    async loadCompleteDataset() {
        try {
            const data = fs.readFileSync(completeDatasetPath, 'utf8');
            this.completeDataset = JSON.parse(data);
            console.log(`📊 Loaded complete dataset with ${this.completeDataset.dialogues.length} dialogues`);
        } catch (error) {
            console.error('❌ Failed to load complete dataset:', error.message);
            process.exit(1);
        }
    }

    parseUnfamiliarWords() {
        try {
            const content = fs.readFileSync(unfamiliarWordsPath, 'utf8');
            const lines = content.split('\n');
            
            let currentDialogue = null;
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Check for dialogue number (e.g., "70248")
                if (/^\d{5}$/.test(trimmed)) {
                    currentDialogue = trimmed;
                    continue;
                }
                
                // Skip empty lines
                if (!trimmed || !currentDialogue) continue;
                
                // Process vocabulary term
                this.unfamiliarWords.push({
                    term: trimmed,
                    dialogueId: currentDialogue,
                    difficulty: 'hard', // Unfamiliar words are typically hard
                    source: 'unfamiliar-words'
                });
                this.processedCount++;
            }
            
            console.log(`📝 Parsed ${this.processedCount} unfamiliar words from ${new Set(this.unfamiliarWords.map(w => w.dialogueId)).size} dialogues`);
        } catch (error) {
            console.error('❌ Failed to parse unfamiliar words:', error.message);
            process.exit(1);
        }
    }

    matchWithCompleteDataset() {
        console.log('🔍 Matching unfamiliar words with complete dataset...');
        
        // Create a lookup map for fast searching
        const vocabularyMap = new Map();
        
        for (const dialogue of this.completeDataset.dialogues) {
            for (const sentence of dialogue.sentences) {
                for (const vocab of sentence.vocabulary) {
                    const key = vocab.term.toLowerCase().trim();
                    vocabularyMap.set(key, {
                        ...vocab,
                        dialogueId: dialogue.id,
                        dialogueTitle: dialogue.title,
                        category: dialogue.category,
                        sentenceId: sentence.id,
                        example: sentence.english,
                        exampleChinese: sentence.chinese
                    });
                }
            }
        }
        
        // Match unfamiliar words
        const matched = [];
        const unmatched = [];
        
        for (const unfamiliarWord of this.unfamiliarWords) {
            const key = unfamiliarWord.term.toLowerCase().trim();
            const match = vocabularyMap.get(key);
            
            if (match && match.dialogueId === unfamiliarWord.dialogueId) {
                // Perfect match: same term in same dialogue
                matched.push({
                    term: match.term,
                    dialogueId: match.dialogueId,
                    dialogueTitle: match.dialogueTitle,
                    category: match.category,
                    difficulty: 'hard', // Force hard difficulty for unfamiliar words
                    phonetic: match.phonetic || '',
                    example: match.example,
                    exampleChinese: match.exampleChinese,
                    sentenceId: match.sentenceId,
                    source: 'unfamiliar-words',
                    context: match.context || match.example
                });
                this.matchedCount++;
            } else {
                // Try fuzzy matching within the same dialogue
                const dialogueMatches = Array.from(vocabularyMap.values())
                    .filter(v => v.dialogueId === unfamiliarWord.dialogueId);
                
                const fuzzyMatch = dialogueMatches.find(v => 
                    v.term.toLowerCase().includes(key) || 
                    key.includes(v.term.toLowerCase())
                );
                
                if (fuzzyMatch) {
                    matched.push({
                        term: unfamiliarWord.term, // Use original term from unfamiliar words
                        dialogueId: fuzzyMatch.dialogueId,
                        dialogueTitle: fuzzyMatch.dialogueTitle,
                        category: fuzzyMatch.category,
                        difficulty: 'hard',
                        phonetic: this.generatePhonetic(unfamiliarWord.term),
                        example: fuzzyMatch.example,
                        exampleChinese: fuzzyMatch.exampleChinese,
                        sentenceId: fuzzyMatch.sentenceId,
                        source: 'unfamiliar-words',
                        context: fuzzyMatch.example,
                        note: `Fuzzy matched with: ${fuzzyMatch.term}`
                    });
                    this.matchedCount++;
                } else {
                    unmatched.push(unfamiliarWord);
                }
            }
        }
        
        this.unfamiliarWords = matched;
        
        if (unmatched.length > 0) {
            console.log(`⚠️  ${unmatched.length} terms could not be matched:`);
            unmatched.slice(0, 10).forEach(w => console.log(`  - ${w.term} (${w.dialogueId})`));
        }
    }

    generatePhonetic(term) {
        // Simple phonetic generation for unmatched terms
        // This is a fallback - ideally would use a proper phonetic API
        return `UK /${term.toLowerCase().replace(/[^a-z\s]/g, '').split(' ').join(' ')}/`;
    }

    generateOutput() {
        const output = {
            metadata: {
                name: "Unfamiliar Words Dataset",
                description: "Curated challenging vocabulary from CCL conversations",
                source: "unfamiliar-words.md",
                generatedAt: new Date().toISOString(),
                totalTerms: this.unfamiliarWords.length,
                dialogues: [...new Set(this.unfamiliarWords.map(w => w.dialogueId))].length,
                categories: [...new Set(this.unfamiliarWords.map(w => w.category))],
                version: "1.0.0"
            },
            words: this.unfamiliarWords.sort((a, b) => {
                // Sort by dialogue ID (descending), then by term
                if (a.dialogueId !== b.dialogueId) {
                    return b.dialogueId.localeCompare(a.dialogueId);
                }
                return a.term.localeCompare(b.term);
            })
        };

        // Write to file
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
        
        // Generate summary
        const categoryCounts = {};
        for (const word of this.unfamiliarWords) {
            categoryCounts[word.category] = (categoryCounts[word.category] || 0) + 1;
        }
        
        console.log('\n📊 Unfamiliar Words Dataset Summary:');
        console.log(`Total Terms: ${this.unfamiliarWords.length}`);
        console.log(`Dialogues: ${[...new Set(this.unfamiliarWords.map(w => w.dialogueId))].length}`);
        console.log('Categories:');
        Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([category, count]) => {
                console.log(`  ${category}: ${count} terms`);
            });
    }
}

// Run if called directly
if (require.main === module) {
    const processor = new UnfamiliarWordsProcessor();
    processor.process().catch(error => {
        console.error('❌ Processing failed:', error);
        process.exit(1);
    });
}

module.exports = UnfamiliarWordsProcessor;