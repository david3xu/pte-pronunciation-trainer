#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the merged conversations file
const mergedFilePath = path.join(__dirname, '../data-processing/extractors/merged-conversations.md');
const wordsListPath = path.join(__dirname, '../data-processing/extractors/words-list.md');

function extractVocabularyTerms() {
    const content = fs.readFileSync(mergedFilePath, 'utf8');
    const vocabularyList = [];
    
    // Split content into lines for processing
    const lines = content.split('\n');
    let currentDialogue = null;
    let dialogueWords = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for dialogue header
        const dialogueMatch = line.match(/^#(70\d+)\.\s*(.+?)(?:\s*–\s*(.+))?$/);
        if (dialogueMatch) {
            // Process previous dialogue if exists
            if (currentDialogue && dialogueWords.length > 0) {
                // Select top 5-10 most important words per dialogue
                const selectedWords = selectTopWords(dialogueWords, 10);
                vocabularyList.push(...selectedWords);
            }
            
            // Reset for new dialogue
            currentDialogue = {
                number: dialogueMatch[1],
                title: dialogueMatch[2].trim(),
                category: dialogueMatch[3] || 'Unknown'
            };
            dialogueWords = [];
            continue;
        }
        
        // Skip empty lines and metadata
            line.startsWith('---') || line.startsWith('**') || line.startsWith('_This file contains')) {
            continue;
        }
        
        // Check if this is a numbered dialogue line (English)
        const numberMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (numberMatch && currentDialogue) {
            const lineNumber = parseInt(numberMatch[1]);
            const englishSentence = numberMatch[2];
            
            // Find the Chinese translation (next non-empty line that doesn't start with a number)
            let nextLineIndex = i + 1;
            let chineseTranslation = '';
            while (nextLineIndex < lines.length) {
                const nextLine = lines[nextLineIndex].trim();
                    !nextLine.startsWith('#') && !nextLine.startsWith('---') && !nextLine.startsWith('**')) {
                    chineseTranslation = nextLine;
                    break;
                }
                nextLineIndex++;
            }
            
            // Extract vocabulary terms (words between underscores)
            const vocabularyMatches = englishSentence.match(/_([^_]+?)_/g);
            if (vocabularyMatches) {
                vocabularyMatches.forEach(match => {
                    const term = match.replace(/_/g, '').trim();
                    if (term && term.length > 0) {
                        // Split term into individual words and extract key words
                        const words = term.split(/\s+/);
                        words.forEach(word => {
                            // Clean the word (remove punctuation, numbers, etc.)
                            const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
                            
                            // Filter out common words and keep only meaningful key words
                            const stopWords = new Set([
                                'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 
                                'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 
                                'that', 'the', 'to', 'was', 'were', 'will', 'with', 'you', 
                                'your', 'i', 'me', 'my', 'we', 'us', 'our', 'they', 'them', 
                                'their', 'this', 'these', 'those', 'can', 'could', 'would', 
                                'should', 'may', 'might', 'must', 'shall', 'do', 'does', 
                                'did', 'have', 'had', 'get', 'got', 'go', 'went', 'come', 
                                'came', 'see', 'saw', 'know', 'knew', 'think', 'thought',
                                'say', 'said', 'tell', 'told', 'ask', 'asked', 'give', 
                                'gave', 'take', 'took', 'make', 'made', 'put', 'let',
                                'about', 'after', 'all', 'also', 'any', 'back', 'because',
                                'been', 'before', 'being', 'between', 'both', 'but', 'each',
                                'even', 'every', 'first', 'here', 'how', 'if', 'into',
                                'just', 'like', 'more', 'most', 'much', 'new', 'no', 'not',
                                'now', 'only', 'or', 'other', 'out', 'over', 'own', 'same',
                                'some', 'such', 'than', 'then', 'there', 'through', 'time',
                                'too', 'two', 'up', 'very', 'way', 'well', 'what', 'when',
                                'where', 'which', 'who', 'why', 'work', 'year', 'years'
                            ]);
                            
                            // Only include meaningful words (length > 2, not stop words, not numbers)
                            if (cleanWord.length > 2 && 
                                !stopWords.has(cleanWord) && 
                                !/^\d+$/.test(cleanWord) &&
                                /^[a-z]+$/.test(cleanWord)) {
                                
                                dialogueWords.push({
                                    englishTerm: cleanWord,
                                    originalTerm: term,
                                    chineseTranslation: chineseTranslation,
                                    sentenceContext: englishSentence.replace(/_/g, ''),
                                    dialogueReference: `#${currentDialogue.number} - ${currentDialogue.title} (${currentDialogue.category})`,
                                    lineNumber: lineNumber,
                                    wordLength: cleanWord.length,
                                    frequency: 1
                                });
                            }
                        });
                    }
                });
            }
        }
    }
    
    // Process the last dialogue
    if (currentDialogue && dialogueWords.length > 0) {
        const selectedWords = selectTopWords(dialogueWords, 10);
        vocabularyList.push(...selectedWords);
    }
    
    return vocabularyList;
}

function selectTopWords(dialogueWords, maxWords) {
    // Group by word and count frequency
    const wordMap = new Map();
    dialogueWords.forEach(wordObj => {
        const key = wordObj.englishTerm;
        if (wordMap.has(key)) {
            wordMap.get(key).frequency += 1;
        } else {
            wordMap.set(key, {...wordObj});
        }
    });
    
    // Convert to array and sort by importance
    const words = Array.from(wordMap.values());
    
    // Score words based on:
    // 1. Word length (longer words are often more meaningful)
    // 2. Business/academic vocabulary (common domain-specific words)
    // 3. Less common words get higher priority
    const businessWords = new Set([
        'insurance', 'appointment', 'business', 'company', 'customer', 'service',
        'payment', 'account', 'contract', 'agreement', 'policy', 'invoice',
        'delivery', 'product', 'order', 'reservation', 'booking', 'application',
        'registration', 'consultation', 'professional', 'manager', 'employee',
        'doctor', 'medical', 'treatment', 'prescription', 'clinic', 'hospital',
        'property', 'apartment', 'rental', 'lease', 'maintenance', 'repair',
        'restaurant', 'menu', 'ingredients', 'accommodation', 'training',
        'education', 'university', 'college', 'course', 'lesson', 'student'
    ]);
    
    words.forEach(word => {
        let score = word.wordLength * 2; // Base score from length
        
        if (businessWords.has(word.englishTerm)) {
            score += 10; // Boost business vocabulary
        }
        
        if (word.wordLength >= 6) {
            score += 5; // Boost longer words
        }
        
        word.score = score;
    });
    
    // Sort by score (descending) and take top words
    words.sort((a, b) => b.score - a.score);
    
    // Return top 5-10 words, ensuring variety
    const selectedWords = words.slice(0, Math.min(maxWords, words.length));
    
    // Remove the scoring properties before returning
    selectedWords.forEach(word => {
        delete word.score;
        delete word.frequency;
        delete word.wordLength;
    });
    
    return selectedWords;
}

function generateMarkdownTable(vocabularyList) {
    let markdown = `# CCL Key Words List (Selected)

**Source:** Merged Conversations Dataset  
**Total Dialogues:** 91  
**Last Updated:** ${new Date().toLocaleDateString()}  
**Format:** 5-10 most important key words per dialogue  

This file contains carefully selected key words from CCL conversation dialogues, focusing on the most important vocabulary for pronunciation training.

---

## Key Words Table

| English Key Word | Original Term | Chinese Translation | Sentence Context | Dialogue Reference |
|------------------|---------------|--------------------|-----------------|--------------------|
`;

    // Group by dialogue to show selection per dialogue
    const dialogueGroups = new Map();
    vocabularyList.forEach(item => {
        const dialogueKey = item.dialogueReference;
        if (!dialogueGroups.has(dialogueKey)) {
            dialogueGroups.set(dialogueKey, []);
        }
        dialogueGroups.get(dialogueKey).push(item);
    });
    
    // Sort dialogues by number (descending)
    const sortedDialogues = Array.from(dialogueGroups.entries())
        .sort((a, b) => {
            const aNum = parseInt(a[0].match(/#(70\d+)/)[1]);
            const bNum = parseInt(b[0].match(/#(70\d+)/)[1]);
            return bNum - aNum;
        });
    
    sortedDialogues.forEach(([dialogueRef, words]) => {
        // Sort words within each dialogue alphabetically
        words.sort((a, b) => a.englishTerm.localeCompare(b.englishTerm));
        
        words.forEach(item => {
            // Clean up the data for table format
            const englishWord = item.englishTerm.replace(/\|/g, '\\|');
            const originalTerm = item.originalTerm.replace(/\|/g, '\\|');
            const chineseTranslation = item.chineseTranslation.replace(/\|/g, '\\|');
            const sentenceContext = item.sentenceContext.replace(/\|/g, '\\|').substring(0, 80) + (item.sentenceContext.length > 80 ? '...' : '');
            const dialogueReference = item.dialogueReference.replace(/\|/g, '\\|');
            
            markdown += `| ${englishWord} | ${originalTerm} | ${chineseTranslation} | ${sentenceContext} | ${dialogueReference} |\n`;
        });
    });
    
    const totalWords = vocabularyList.length;
    const avgWordsPerDialogue = Math.round(totalWords / dialogueGroups.size * 100) / 100;
    
    markdown += `\n---

## Summary Statistics

- **Total Key Words Selected:** ${totalWords}
- **Average Words per Dialogue:** ${avgWordsPerDialogue}
- **Dialogues Processed:** ${dialogueGroups.size}
- **Categories Covered:** Business, Social, Medical, Legal
- **Dialogue Range:** #70248 → #70158

## Selection Criteria

1. **Quality Focus:** 5-10 most important words per dialogue
2. **Business Vocabulary:** Prioritizes domain-specific terms
3. **Word Length:** Favors longer, more meaningful words (6+ characters get priority)
4. **Stop Word Filtering:** Removes common function words
5. **Scoring System:** Combines word length, business relevance, and uniqueness
6. **Alphabetical Ordering:** Words sorted within each dialogue group

## Usage Notes

- Each dialogue contributes 5-10 carefully selected key words
- Focus on vocabulary most useful for CCL pronunciation training
- Chinese translations provide complete sentence context
- Original terms show the full phrase where each word appeared
- Sentence context truncated to 80 characters for readability

---

*Generated automatically from merged-conversations.md with selective filtering*
`;

    return markdown;
}

// Main execution
try {
    console.log('Starting vocabulary extraction...');
    const vocabularyTerms = extractVocabularyTerms();
    console.log(`Extracted ${vocabularyTerms.length} key words from ${new Set(vocabularyTerms.map(item => item.dialogueReference)).size} dialogues.`);
    
    // Calculate average words per dialogue
    const dialogueCount = new Set(vocabularyTerms.map(item => item.dialogueReference)).size;
    const avgWords = Math.round(vocabularyTerms.length / dialogueCount * 100) / 100;
    console.log(`Average: ${avgWords} words per dialogue`);
    
    const markdownTable = generateMarkdownTable(vocabularyTerms);
    
    fs.writeFileSync(wordsListPath, markdownTable, 'utf8');
    console.log(`Key words table written to: ${wordsListPath}`);
    
    // Display sample words from first few dialogues
    console.log('\nSample key words from first dialogues:');
    const dialogueGroups = new Map();
    vocabularyTerms.forEach(item => {
        const dialogueKey = item.dialogueReference;
        if (!dialogueGroups.has(dialogueKey)) {
            dialogueGroups.set(dialogueKey, []);
        }
        dialogueGroups.get(dialogueKey).push(item);
    });
    
    const firstThreeDialogues = Array.from(dialogueGroups.entries()).slice(0, 3);
    firstThreeDialogues.forEach(([dialogueRef, words], index) => {
        const dialogueNum = dialogueRef.match(/#(70\d+)/)[1];
        console.log(`${index + 1}. ${dialogueNum}: ${words.map(w => w.englishTerm).join(', ')}`);
    });
    
} catch (error) {
    console.error('Error processing vocabulary extraction:', error);
}