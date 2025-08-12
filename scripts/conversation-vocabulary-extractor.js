#!/usr/bin/env node

/**
 * Conversation-Based Vocabulary Extractor
 * 
 * Extracts meaningful terms and phrases from CCL conversation files
 * and creates contextual vocabulary entries with example sentences.
 * Processes files starting from highest ID (70241) backwards.
 */

const fs = require('fs');
const path = require('path');

class ConversationVocabularyExtractor {
    constructor() {
        this.extractorsDir = path.join(__dirname, '../data-processing/extractors');
        this.outputDir = path.join(__dirname, '../data/generated');
        this.vocabularyItems = []; // Array to maintain processing order
        this.conversationData = [];
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        
        // Define phrase patterns for extraction - improved for complete meaningful phrases
        this.phrasePatterns = [
            // Specific patterns for common complete phrases
            /\b(to visit the site again today)\b/gi,  // Specific case: to visit the site again today
            /\b(to \w+(?:\s+\w+){1,5}(?:\s+(?:today|tomorrow|well|properly|quickly|successfully|completely)))\b/gi,  // to visit the site again today
            /\b(to \w+(?:\s+\w+){1,3}(?!(?:\s+(?:the|a|an|in|on|at|with|for|of|to|from))\b))\b/gi, // to visit, to speak with him
            /\b(have been \w+(?:\s+\w+){0,3}(?!(?:\s+(?:the|a|an|in|on|at|with|for|of|to|from))\b))\b/gi, // have been working
            /\b(have gone \w+(?:\s+\w+){0,2})\b/gi, // have gone up
            /\b(going to \w+(?:\s+\w+){0,3}(?!(?:\s+(?:the|a|an|in|on|at|with|for|of|to|from))\b))\b/gi, // going to include
            /\b(need to \w+(?:\s+\w+){0,3}(?!(?:\s+(?:the|a|an|in|on|at|with|for|of|to|from))\b))\b/gi, // need to speak
            
            // Common noun + noun patterns
            /\b(material prices?)\b/gi, // material prices
            /\b(\w+ prices?)\b/gi, // prices patterns
            /\b(\w+ costs?)\b/gi, // cost patterns
            /\b(\w+ fees?)\b/gi, // fee patterns
            
            // Common verb phrases
            /\b(have gone \w+)\b/gi, // have gone up/down
            /\b(has gone \w+)\b/gi, // has gone up/down
            /\b(have come \w+)\b/gi, // have come up
            /\b(has come \w+)\b/gi, // has come up
            /\b(went \w+)\b/gi, // went well
            /\b(came \w+)\b/gi, // came up
            
            // Simple phrases that might be missed
            /\b(\w+(?:\s+\w+){1,2}(?:\s+too))\b/gi, // something too
            /\b(\w+(?:\s+\w+){1,2}(?:\s+also))\b/gi, // something also
            
            // Complete noun phrases with meaningful endings - avoid hanging prepositions
            /\b(the \w+(?:\s+\w+){1,4}(?:\s+(?:was|were|is|are|has|have|will|would)\s+\w+(?:\s+\w+)*))\b/gi, // the material delivery was delayed
            /\b(the \w+(?:\s+\w+){1,3}(?!(?:\s+(?:was|were|is|are|has|have|will|would|in|on|at|with|for|of|to|from))\b))\b/gi, // the crew, the site
            /\b(a \w+(?:\s+\w+){1,3}(?:\s+could\s+be\s+\w+(?:\s+\w+)*))\b/gi,  // a house could be this complicated
            /\b(a \w+(?:\s+\w+){1,3}(?!(?:\s+(?:could|would|should|might|in|on|at|with|for|of|to|from))\b))\b/gi,  // a new house
            
            // Complete prepositional phrases - ensure they have objects
            /\b(in \w+(?:\s+\w+){1,3}(?:\s+my\s+\w+(?:\s+\w+)*))\b/gi, // in looking after my customers
            /\b(looking after \w+(?:\s+\w+){0,2})\b/gi, // looking after my customers
            /\b(exactly what \w+(?:\s+\w+){1,4}(?:\s+will\s+\w+(?:\s+\w+)*))\b/gi, // exactly what each room will look like
            /\b(exactly what \w+(?:\s+\w+){1,3}(?!(?:\s+(?:will|would|should|might|in|on|at|with|for|of|to|from))\b))\b/gi, // exactly what
            
            // Complete phrases ending with bathroom, house, etc.
            /\b(to include \w+(?:\s+\w+){1,3}(?:\s+in\s+the\s+\w+(?:\s+\w+)*))\b/gi, // to include a shower in the bathroom
            /\b(a shower in \w+(?:\s+\w+){1,2})\b/gi, // a shower in my suite
            
            // Professional/technical terms
            /\b(\w+(?:\s+\w+){1,3}(?:\s+(?:permit|license|insurance|contract|budget|experience|support|services?)))\b/gi,
            /\b(\w+ services?)\b/gi,
            /\b(\w+ support)\b/gi,
            /\b(\w+ permit)\b/gi,
            /\b(\w+ license)\b/gi,
            /\b(\w+ insurance)\b/gi,
            /\b(\w+ contract)\b/gi,
            /\b(\w+ budget)\b/gi,
            /\b(\w+ experience)\b/gi,
            /\b(\w+ property)\b/gi,
            /\b(\w+ house)\b/gi,
            /\b(\w+ cleaning)\b/gi,
            
            // Safe prepositional phrases - with complete objects
            /\b(on the \w+(?:\s+\w+){0,2})\b/gi,
            /\b(at the \w+(?:\s+\w+){0,2})\b/gi,
            /\b(for the \w+(?:\s+\w+){0,2})\b/gi,
            /\b(with the \w+(?:\s+\w+){0,2})\b/gi,
            
            // Professional terms
            /\b(\w+ly \w+(?:\s+\w+){0,2})\b/gi,
            /\b(\w+ professional \w+)\b/gi,
            /\b(\w+ fully \w+)\b/gi,
            
            // Common CCL phrases
            /\b(building permit)\b/gi,
            /\b(dream house)\b/gi,
            /\b(home visit)\b/gi,
            /\b(cleaning support)\b/gi,
            /\b(government \w+)\b/gi,
            /\b(social welfare)\b/gi,
            /\b(take time)\b/gi,
            /\b(busy schedule)\b/gi,
            /\b(strongly recommend)\b/gi,
            /\b(great experience)\b/gi,
            /\b(price range)\b/gi,
            /\b(maximum budget)\b/gi,
            /\b(move in)\b/gi,
            /\b(as soon as possible)\b/gi,
            /\b(come to the right place)\b/gi,
            /\b(different \w+(?:\s+\w+)?)\b/gi,
            
            // Simple catchall patterns for basic phrases
            /\b(\w+ly \w+)\b/gi, // adverb + word
            /\b(\w+ \w+ly)\b/gi, // word + adverb  
            /\b(really \w+)\b/gi, // really + word
            /\b(very \w+)\b/gi, // very + word
            /\b(quite \w+)\b/gi, // quite + word
            /\b(pretty \w+)\b/gi, // pretty + word
            /\b(loads of \w+)\b/gi, // loads of + word
            /\b(lots of \w+)\b/gi, // lots of + word
            /\b(kind of \w+)\b/gi, // kind of + word
            /\b(sort of \w+)\b/gi // sort of + word
        ];
        
        // Domain mapping based on filenames - aligned with specialized vocabulary categories
        this.domainMapping = {
            'social-welfare': ['welfare', 'support', 'care', 'social', 'government', 'house', 'property', 'building', 'home'],
            'education': ['school', 'education', 'student', 'camp'],
            'legal-government': ['legal', 'court', 'law', 'police', 'violence'],
            'business-finance': ['business', 'insurance', 'finance', 'commercial'],
            'medical-healthcare': ['medical', 'health', 'doctor', 'examination'],
            'travel-immigration': ['immigration', 'visa', 'citizenship']
        };
    }
    
    /**
     * Main extraction process
     */
    async extract() {
        console.log('🔍 Starting conversation-based vocabulary extraction...');
        console.log('📋 Processing files from highest ID (70241) backwards...');
        
        try {
            // Process all extractor files
            await this.processAllFiles();
            
            // Extract vocabulary terms
            await this.extractVocabularyTerms();
            
            // Generate output files
            await this.generateOutput();
            
            console.log('✅ Conversation vocabulary extraction completed!');
            
        } catch (error) {
            console.error('❌ Extraction failed:', error);
            throw error;
        }
    }
    
    /**
     * Process all markdown files in extractors directory (from highest ID backwards)
     */
    async processAllFiles() {
        const files = fs.readdirSync(this.extractorsDir)
            .filter(file => {
                if (!file.endsWith('.md') || !file.startsWith('70')) return false;
                // Only include conversations from 70241 to 70158
                const id = parseInt(file.match(/(\d+)/)?.[1]);
                return id >= 70158 && id <= 70241;
            })
            .sort((a, b) => {
                // Extract ID numbers and sort descending (70241, 70240, 70239, ...)
                const idA = parseInt(a.match(/(\d+)/)[1]);
                const idB = parseInt(b.match(/(\d+)/)[1]);
                return idB - idA; // Descending order: 70241 → 70240 → 70239 → ... → 70158
            });
        
        console.log(`📚 Found ${files.length} conversation files to process`);
        console.log(`🎯 Processing order: ID ${files[0]?.match(/(\d+)/)?.[1]} → ${files[files.length-1]?.match(/(\d+)/)?.[1]} (descending)`);
        
        for (const file of files) {
            await this.processFile(file);
        }
        
        console.log(`📝 Processed ${this.conversationData.length} conversations`);
    }
    
    /**
     * Process a single markdown file
     */
    async processFile(filename) {
        const filepath = path.join(this.extractorsDir, filename);
        const content = fs.readFileSync(filepath, 'utf8');
        
        // Extract conversation metadata
        const headerMatch = content.match(/#(\d+)\.\s*([^-\n]+)\s*-\s*([^\n]+)/);
        if (!headerMatch) return;
        
        const [, id, title, domain] = headerMatch;
        
        // Parse dialogue pairs
        const dialogues = this.parseDialogues(content);
        
        if (dialogues.length === 0) return;
        
        const conversation = {
            id: id.trim(),
            title: title.trim(),
            domain: domain.trim().toLowerCase(),
            domainCategory: this.categorizeDomain(title + ' ' + domain),
            filename,
            dialogues: dialogues
        };
        
        this.conversationData.push(conversation);
        console.log(`  📄 ${filename}: ${dialogues.length} dialogue pairs`);
    }
    
    /**
     * Parse dialogue pairs from content
     */
    parseDialogues(content) {
        const dialogues = [];
        const lines = content.split('\n');
        
        let currentNumber = null;
        let currentEnglish = '';
        let currentChinese = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check for dialogue number (1-14 typically)
            if (/^\d{1,2}\.$/.test(trimmed)) {
                // Save previous dialogue if exists
                if (currentNumber && currentEnglish && currentChinese) {
                    dialogues.push({
                        number: currentNumber,
                        english: this.cleanText(currentEnglish),
                        chinese: this.cleanText(currentChinese)
                    });
                }
                
                // Start new dialogue
                currentNumber = parseInt(trimmed.replace('.', ''));
                currentEnglish = '';
                currentChinese = '';
                continue;
            }
            
            // Skip empty lines and headers
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // Determine if line is English or Chinese
            if (this.isEnglish(trimmed)) {
                currentEnglish = trimmed;
            } else if (this.isChinese(trimmed)) {
                currentChinese = trimmed;
            }
        }
        
        // Save final dialogue
        if (currentNumber && currentEnglish && currentChinese) {
            dialogues.push({
                number: currentNumber,
                english: this.cleanText(currentEnglish),
                chinese: this.cleanText(currentChinese)
            });
        }
        
        return dialogues;
    }
    
    /**
     * Extract vocabulary terms maintaining sentence order (1:1 term-to-sentence mapping)
     */
    async extractVocabularyTerms() {
        console.log('🔤 Extracting vocabulary terms maintaining sentence order (1:1 mapping)...');
        
        let totalSentences = 0;
        let totalTermsExtracted = 0;
        const seenTerms = new Set(); // Track duplicate terms (first occurrence wins)
        
        // Process conversations in order (from 70241 backwards to 70001)
        for (const conversation of this.conversationData) {
            console.log(`  📄 Conversation ${conversation.id}: ${conversation.title} (${conversation.dialogues.length} sentences)`);
            
            // Process sentences in their exact order (1, 2, 3, 4, ...)
            for (let i = 0; i < conversation.dialogues.length; i++) {
                const dialogue = conversation.dialogues[i];
                totalSentences++;
                
                console.log(`    Sentence ${dialogue.number}: "${dialogue.english.substring(0, 50)}..."`);
                
                // Create delimiter-split version (preserves all content)
                const delimiterSentences = this.splitIntoShortSentences(dialogue.english);
                const delimiterVersion = delimiterSentences[0]; // Single delimiter-split sentence
                
                // Create matching Chinese delimiter version
                const chineseDelimiterVersion = this.createChineseDelimiterVersion(
                    dialogue.chinese, 
                    dialogue.english, 
                    delimiterVersion
                );
                
                // Now split the delimiter version into actual short sentences for processing
                const shortSentences = delimiterVersion.includes('|') 
                    ? delimiterVersion.split('|').map(s => s.trim())
                    : [delimiterVersion];
                
                const shortChineseSentences = chineseDelimiterVersion.includes('|') 
                    ? chineseDelimiterVersion.split('|').map(s => s.trim())
                    : [chineseDelimiterVersion];
                
                // Process each short sentence separately
                let sentenceTermsAdded = 0;
                for (let i = 0; i < shortSentences.length; i++) {
                    const shortSentence = shortSentences[i];
                    const shortChineseSentence = shortChineseSentences[i] || shortChineseSentences[0]; // Fallback to first if mismatch
                    
                    // Extract terms from THIS short sentence
                    const extractedTerms = this.extractTermsFromSentence(
                        shortSentence, 
                        conversation.domainCategory
                    );
                    
                    // Each extracted term gets the short sentence as its example
                    for (const term of extractedTerms) {
                        const key = term.toLowerCase();
                        
                        // Skip if we already have this term (first occurrence wins)
                        if (seenTerms.has(key)) continue;
                        seenTerms.add(key);
                        
                        // Create vocabulary item: 1 term = 1 short sentence example
                        this.vocabularyItems.push({
                            english: term,
                            chinese: this.translateTerm(term, dialogue.chinese),
                            difficulty: this.assessDifficulty(term),
                            example: shortSentence.trim(), // Short sentence as example (split from delimiter)
                            exampleChinese: shortChineseSentence.trim(), // Matching Chinese short sentence
                            category: conversation.domainCategory, // Domain category as property
                            conversationId: conversation.id,
                            conversationTitle: conversation.title,
                            dialogueNumber: dialogue.number, // Sentence number within conversation
                            originalSentence: dialogue.english.trim(), // Keep original for reference
                            originalChineseSentence: dialogue.chinese.trim(), // Keep original Chinese for reference
                            delimiterVersion: delimiterVersion, // Keep "|" version for reference
                            chineseDelimiterVersion: chineseDelimiterVersion, // Keep Chinese "|" version for reference
                            shortSentenceIndex: i // Which split sentence this was
                        });
                        
                        totalTermsExtracted++;
                        sentenceTermsAdded++;
                    }
                }
                
                console.log(`      → Added ${sentenceTermsAdded} new terms from ${shortSentences.length} short sentences (from delimiter: "${delimiterVersion.substring(0, 50)}...")`);
            }
        }
        
        console.log(`  ✅ Final result: ${totalTermsExtracted} unique terms from ${totalSentences} sentences`);
        console.log(`  📝 Order: Conversation 70241→70001, Sentences 1→N within each`);
        console.log(`  🎯 Mapping: 1 term = 1 sentence example (first occurrence wins)`);
    }
    
    /**
     * Create Chinese delimiter version matching English split pattern
     */
    createChineseDelimiterVersion(chineseSentence, originalEnglish, englishDelimiterVersion) {
        // If English wasn't split, return Chinese as-is
        if (!englishDelimiterVersion.includes('|')) {
            return chineseSentence;
        }
        
        // Split Chinese using punctuation patterns similar to English
        // Chinese typically uses 。！？ for sentence endings
        const chineseSentences = chineseSentence.split(/[。！？]+/).map(s => s.trim()).filter(s => s.length > 0);
        
        // If we have exactly 2 Chinese sentences, join with delimiter
        if (chineseSentences.length === 2) {
            return chineseSentences.join(' | ');
        } else if (chineseSentences.length > 2) {
            // Find best split point similar to English logic
            for (let i = 1; i < chineseSentences.length; i++) {
                const firstPart = chineseSentences.slice(0, i).join('');
                if (firstPart.length >= 10) { // Chinese characters are denser
                    const secondPart = chineseSentences.slice(i).join('');
                    return firstPart + ' | ' + secondPart;
                }
            }
            // Fallback: midpoint split
            const midPoint = Math.floor(chineseSentences.length / 2);
            const firstHalf = chineseSentences.slice(0, midPoint).join('');
            const secondHalf = chineseSentences.slice(midPoint).join('');
            return firstHalf + ' | ' + secondHalf;
        }
        
        // If no good split found, return original
        return chineseSentence;
    }
    
    /**
     * Split a long sentence using delimiter (|) to preserve all content without loss
     */
    splitIntoShortSentences(sentence) {
        // First try splitting on sentence-ending punctuation (. ! ?) while preserving punctuation
        let sentences = sentence.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
        
        // Clean up sentences and ensure they're complete thoughts
        const cleanedSentences = sentences.map(s => {
            // Remove leading quotes and speaker tags
            s = s.replace(/^[""'"]/, '').replace(/^\w+:\s*/, '');
            // Ensure sentence has proper capitalization
            if (s.length > 0) {
                s = s.charAt(0).toUpperCase() + s.slice(1);
            }
            return s.trim();
        }).filter(s => s.length > 0); // Keep ALL sentences, no minimum length filter
        
        // Merge very short sentences (< 15 chars) with adjacent longer sentences
        const mergedSentences = [];
        for (let i = 0; i < cleanedSentences.length; i++) {
            const current = cleanedSentences[i];
            
            if (current.length < 15) {
                // Short sentence - merge with next or previous (preserve punctuation)
                if (i + 1 < cleanedSentences.length) {
                    // Merge with next sentence - add proper punctuation
                    const merged = current + " " + cleanedSentences[i + 1];
                    mergedSentences.push(merged);
                    i++; // Skip the next sentence since we merged it
                } else if (mergedSentences.length > 0) {
                    // Merge with previous sentence (modify last entry) - add proper punctuation
                    mergedSentences[mergedSentences.length - 1] += " " + current;
                } else {
                    // Only sentence and it's short - keep it
                    mergedSentences.push(current);
                }
            } else {
                // Normal length sentence - keep as is
                mergedSentences.push(current);
            }
        }
        
        // Find the best split point (avoid creating too short first part)
        if (mergedSentences.length === 2) {
            // Check if first sentence is too short (< 15 chars), if so don't split
            if (mergedSentences[0].length < 15) {
                return [mergedSentences.join(' ')]; // Join without delimiter
            }
            return [mergedSentences.join(' | ')];
        } else if (mergedSentences.length > 2) {
            // Find best split point that doesn't create too short first part
            for (let i = 1; i < mergedSentences.length; i++) {
                const firstPart = mergedSentences.slice(0, i).join(' ');
                if (firstPart.length >= 20) { // Minimum length for meaningful first part
                    const secondPart = mergedSentences.slice(i).join(' ');
                    return [firstPart + ' | ' + secondPart];
                }
            }
            // Fallback: use midpoint if no good split found
            const midPoint = Math.floor(mergedSentences.length / 2);
            const firstHalf = mergedSentences.slice(0, midPoint).join(' ');
            const secondHalf = mergedSentences.slice(midPoint).join(' ');
            return [firstHalf + ' | ' + secondHalf];
        }
        
        // For very long sentences, try comma splitting and join with delimiter
        if (sentence.length > 80 && sentence.includes(',')) {
            const commaSplits = sentence.split(/,\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 0) // Keep ALL parts, no minimum length
                .map(s => {
                    // Ensure proper capitalization
                    if (s.length > 0) {
                        s = s.charAt(0).toUpperCase() + s.slice(1);
                    }
                    // Add period if doesn't end with punctuation
                    if (!/[.!?]$/.test(s)) {
                        s += '.';
                    }
                    return s;
                });
            
            if (commaSplits.length === 2) {
                // Check if first part is too short, if so don't split
                if (commaSplits[0].length < 15) {
                    return [commaSplits.join(', ')]; // Join without delimiter
                }
                return [commaSplits.join(' | ')];
            } else if (commaSplits.length > 2) {
                // Find best split point that doesn't create too short first part
                for (let i = 1; i < commaSplits.length; i++) {
                    const firstPart = commaSplits.slice(0, i).join(', ');
                    if (firstPart.length >= 20) { // Minimum length for meaningful first part
                        const secondPart = commaSplits.slice(i).join(', ');
                        return [firstPart + ' | ' + secondPart];
                    }
                }
                // Fallback: use midpoint if no good split found
                const midPoint = Math.floor(commaSplits.length / 2);
                const firstHalf = commaSplits.slice(0, midPoint).join(', ');
                const secondHalf = commaSplits.slice(midPoint).join(', ');
                return [firstHalf + ' | ' + secondHalf];
            }
        }
        
        // Default: return merged sentence if we have one, otherwise original
        return mergedSentences.length > 0 ? [mergedSentences[0]] : [sentence];
    }
    
    /**
     * Extract the most meaningful term from a short sentence using pattern matching
     * Limited to exactly 1 term per short sentence
     */
    extractTermsFromSentence(sentence, domain) {
        const allTerms = new Set();
        
        // Apply phrase patterns
        for (const pattern of this.phrasePatterns) {
            const matches = sentence.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const cleaned = this.cleanTerm(match);
                    if (this.isValidTerm(cleaned)) {
                        allTerms.add(cleaned);
                    }
                }
            }
        }
        
        // Extract domain-specific terms
        const domainTerms = this.extractDomainSpecificTerms(sentence, domain);
        domainTerms.forEach(term => allTerms.add(term));
        
        // Select only the 1 most meaningful term per short sentence
        return this.selectBestTerms(Array.from(allTerms), sentence, 1);
    }
    
    /**
     * Fallback term extraction when primary patterns fail
     * Guarantees at least one term per short sentence
     */
    fallbackTermExtraction(sentence) {
        console.log(`    Fallback extraction for: "${sentence.substring(0, 50)}..."`);
        
        // Remove common words and extract meaningful phrases
        const words = sentence.toLowerCase()
            .replace(/[.!?,:;'"]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        // Skip very common words for fallback
        const commonWords = ['the', 'and', 'but', 'for', 'you', 'are', 'can', 'will', 'was', 'were', 'have', 'has', 'had', 'they', 'them', 'this', 'that', 'with', 'from', 'very', 'well', 'just', 'also', 'like', 'know', 'would', 'could', 'should'];
        const meaningfulWords = words.filter(word => !commonWords.includes(word));
        
        if (meaningfulWords.length >= 2) {
            // Create 2-3 word phrases from meaningful words
            for (let i = 0; i < meaningfulWords.length - 1; i++) {
                const phrase = meaningfulWords.slice(i, i + Math.min(3, meaningfulWords.length - i)).join(' ');
                if (phrase.length >= 8 && phrase.length <= 30) {
                    return [phrase];
                }
            }
        }
        
        // If no good phrases, take the longest meaningful word
        if (meaningfulWords.length > 0) {
            const longestWord = meaningfulWords.reduce((a, b) => a.length > b.length ? a : b);
            if (longestWord.length >= 4) {
                return [longestWord];
            }
        }
        
        // Last resort: take first 2-3 non-common words
        if (words.length >= 2) {
            const firstWords = words.slice(0, Math.min(3, words.length));
            const fallbackPhrase = firstWords.join(' ');
            if (fallbackPhrase.length >= 6) {
                return [fallbackPhrase];
            }
        }
        
        // Absolute last resort: first word if it's meaningful
        if (words.length > 0 && words[0].length >= 4) {
            return [words[0]];
        }
        
        return []; // Only return empty if sentence is truly unusable
    }
    
    /**
     * Select the best 1 term from a short sentence based on meaningfulness and completeness
     * Ensures at least one term is always extracted
     */
    selectBestTerms(terms, sentence, maxTerms = 1) {
        // If we have no terms, try fallback extraction
        if (terms.length === 0) {
            return this.fallbackTermExtraction(sentence);
        }
        
        if (terms.length <= maxTerms) {
            return terms;
        }
        
        // Score terms based on meaningfulness and completeness
        const scoredTerms = terms.map(term => {
            let score = 0;
            
            // Prefer complete, meaningful phrases (2-5 words)
            const wordCount = term.split(' ').length;
            if (wordCount >= 2 && wordCount <= 5) {
                score += wordCount * 3;
            } else if (wordCount > 5) {
                score += 10; // Very long phrases might be complete thoughts
            }
            
            // Bonus for complete verb phrases
            if (term.match(/^(to \w+|going to|need to|have been|will be|would be)/)) {
                score += 15;
            }
            
            // Bonus for complete noun phrases
            if (term.match(/(delivery was \w+|materials \w+|house \w+|progress \w+)/)) {
                score += 12;
            }
            
            // Prefer domain-specific terms
            const domainKeywords = ['building', 'construction', 'permit', 'site', 'progress', 'design', 
                                  'bathroom', 'suite', 'plumber', 'materials', 'delivery', 'plans', 'delayed'];
            if (domainKeywords.some(keyword => term.includes(keyword))) {
                score += 8;
            }
            
            // HEAVY PENALTY for incomplete phrases ending with problematic words
            if (term.match(/\b(was|were|is|are|has|have|will|would|can|could|should|might|the|a|an|in|on|at|with|for|of|to|from|this|that|my|your|his|her|its|our|their)$/)) {
                score -= 25; // Much heavier penalty for incomplete phrases
            }
            
            // HEAVY PENALTY for incomplete prepositional phrases
            if (term.match(/^(in|on|at|with|for|of|to|from)\s+\w+\s+(the|a|an|my|your|his|her|its|our|their)$/)) {
                score -= 20; // "in looking after my" style incomplete phrases
            }
            
            // HEAVY PENALTY for phrases that clearly need more words
            if (term.match(/\b(exactly what|could be this|include.*in the|looking after my)$/)) {
                score -= 20;
            }
            
            // Bonus for complete phrases we want to capture
            if (term.match(/(will look like|could be this \w+|in the \w+|after my \w+|shower in \w+)$/)) {
                score += 15;
            }
            
            // MAJOR BONUS for complete phrases with time/manner adverbs
            if (term.match(/(today|tomorrow|yesterday|again|properly|completely|successfully|quickly|slowly)$/)) {
                score += 25;
            }
            
            // Avoid very short or generic terms
            if (term.length < 8 || ['the site', 'the office', 'with the'].includes(term)) {
                score -= 8;
            }
            
            return { term, score };
        });
        
        // Sort by score descending and take top terms
        scoredTerms.sort((a, b) => b.score - a.score);
        
        // Additional filtering: remove any terms that still end with problematic words
        const filteredTerms = scoredTerms.filter(item => 
            !item.term.match(/\b(the|a|an|in|on|at|with|for|of|to|from|this|that|my|your|his|her|its|our|their|was|were|is|are|has|have|will|would|can|could|should|might)$/)
        );
        
        // If we filtered out everything, use original scored terms (but user will notice the issue)
        const finalTerms = filteredTerms.length > 0 ? filteredTerms : scoredTerms;
        
        return finalTerms.slice(0, maxTerms).map(item => item.term);
    }
    
    /**
     * Extract domain-specific terms
     */
    extractDomainSpecificTerms(sentence, domain) {
        const terms = [];
        
        // Domain-specific patterns
        const domainPatterns = {
            'social-welfare': [
                /\b(building permit)\b/gi,
                /\b(brick veneer)\b/gi,
                /\b(two-storey)\b/gi,
                /\b(dream house)\b/gi,
                /\b(block of land)\b/gi,
                /\b(home visit)\b/gi,
                /\b(cleaning support)\b/gi,
                /\b(government \w+)\b/gi,
                /\b(aged people)\b/gi
            ],
            'business-finance': [
                /\b(professional experience)\b/gi,
                /\b(fully licensed)\b/gi,
                /\b(fully insured)\b/gi
            ]
        };
        
        if (domainPatterns[domain]) {
            for (const pattern of domainPatterns[domain]) {
                const matches = sentence.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        const cleaned = this.cleanTerm(match);
                        if (this.isValidTerm(cleaned)) {
                            terms.push(cleaned);
                        }
                    });
                }
            }
        }
        
        return terms;
    }
    
    
    /**
     * Simple term translation (for now, use placeholder)
     */
    translateTerm(englishTerm, chineseSentence) {
        // Since we can't accurately translate individual terms from context,
        // return empty string. Full Chinese context is available in exampleChinese field.
        return '';
    }
    
    /**
     * Assess difficulty of a term
     */
    assessDifficulty(term) {
        const wordCount = term.split(/\s+/).length;
        const avgWordLength = term.replace(/[^a-zA-Z]/g, '').length / wordCount;
        
        if (wordCount === 1 && avgWordLength <= 6) {
            return 'easy';
        } else if (wordCount <= 2 && avgWordLength <= 7) {
            return 'normal';
        } else {
            return 'hard';
        }
    }
    
    /**
     * Utility functions
     */
    isEnglish(text) {
        const englishChars = text.match(/[a-zA-Z]/g) || [];
        const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
        return englishChars.length > chineseChars.length;
    }
    
    isChinese(text) {
        return /[\u4e00-\u9fff]/.test(text);
    }
    
    cleanText(text) {
        return text
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    cleanTerm(term) {
        return term
            .replace(/[.!?,:;]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }
    
    isValidTerm(term) {
        // Filter out very short, very long, or common words
        const words = term.split(' ');
        
        if (words.length === 0 || term.length < 3) return false;
        if (term.length > 50) return false;
        
        // Skip very common words
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        if (words.length === 1 && commonWords.includes(term)) return false;
        
        // Must contain at least one letter
        if (!/[a-zA-Z]/.test(term)) return false;
        
        return true;
    }
    
    categorizeDomain(text) {
        const lowerText = text.toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.domainMapping)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return category;
            }
        }
        
        return 'general';
    }
    
    /**
     * Generate output files (flat vocabulary array maintaining processing order)
     */
    async generateOutput() {
        console.log('📝 Generating conversation vocabulary output (flat structure)...');
        
        // Create flat vocabulary array maintaining processing order
        const vocabularyArray = [];
        const categoryStats = {};
        
        console.log(`  📊 Processing ${this.vocabularyItems.length} vocabulary items...`);
        
        // Process items in order and create flat array
        for (const item of this.vocabularyItems) {
            const category = item.category;
            
            // Track stats by category
            if (!categoryStats[category]) {
                categoryStats[category] = { easy: 0, normal: 0, hard: 0, total: 0 };
            }
            
            // Add item to flat vocabulary array (short sentence examples from delimiter-split)
            vocabularyArray.push({
                english: item.english,
                chinese: item.chinese,
                difficulty: item.difficulty,
                example: item.example, // Short sentence as example (split from delimiter version)
                exampleChinese: item.exampleChinese, // Matching Chinese short sentence
                category: item.category, // Domain category as property
                conversationId: item.conversationId,
                conversationTitle: item.conversationTitle,
                dialogueNumber: item.dialogueNumber, // Sentence number within conversation
                originalSentence: item.originalSentence, // Full original sentence for reference
                originalChineseSentence: item.originalChineseSentence, // Full original Chinese sentence for reference
                delimiterVersion: item.delimiterVersion, // "|" delimiter version for reference
                chineseDelimiterVersion: item.chineseDelimiterVersion, // Chinese "|" delimiter version for reference
                shortSentenceIndex: item.shortSentenceIndex // Which split sentence this was
            });
            
            categoryStats[category][item.difficulty]++;
            categoryStats[category].total++;
        }
        
        // Print category summary
        console.log('  📋 Category distribution:');
        Object.entries(categoryStats).forEach(([cat, stats]) => {
            console.log(`    ${cat}: ${stats.total} terms (${stats.easy} easy, ${stats.normal} normal, ${stats.hard} hard)`);
        });
        
        // Generate JavaScript file for the app (flat structure)
        const conversationVocabularyData = {
            generatedAt: new Date().toISOString(),
            source: 'conversation-extractors',
            totalTerms: this.vocabularyItems.length,
            totalConversations: this.conversationData.length,
            domains: Object.keys(categoryStats),
            vocabulary: vocabularyArray, // Flat array instead of category-grouped object
            statistics: this.generateStatistics(this.vocabularyItems)
        };
        
        // Write main JS data file
        const jsContent = `// Conversation-Based CCL Vocabulary Data (Short Sentence Examples)
// Generated on: ${new Date().toISOString()}
// Source: ${this.conversationData.length} CCL conversations
// Total terms: ${this.vocabularyItems.length}
// Processing: Highest ID → Lowest ID (maintaining conversation order)
// Method: Create "|" delimiter version → Split into short sentences → Extract terms
// Examples: Use short sentences (split from delimiter version, no content loss)

window.conversationVocabularyData = ${JSON.stringify(conversationVocabularyData, null, 2)};

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.conversationVocabularyData;
}`;
        
        const outputPath = path.join(this.outputDir, 'conversation-vocabulary-data.js');
        fs.writeFileSync(outputPath, jsContent);
        
        // Write JSON file for analysis
        const jsonPath = path.join(this.outputDir, 'conversation-vocabulary-data.json');
        fs.writeFileSync(jsonPath, JSON.stringify(conversationVocabularyData, null, 2));
        
        console.log(`✅ Generated conversation vocabulary: ${this.vocabularyItems.length} terms`);
        console.log(`📁 Files created:`);
        console.log(`   - ${outputPath}`);
        console.log(`   - ${jsonPath}`);
        
        // Generate summary report
        this.generateReport(conversationVocabularyData);
    }
    
    /**
     * Generate statistics
     */
    generateStatistics(vocabularyItems) {
        const stats = {
            difficulty: { easy: 0, normal: 0, hard: 0 },
            wordCount: { single: 0, phrase: 0, complex: 0 },
            processing: { 
                order: 'highest-id-to-lowest',
                mapping: '1:1-term-to-sentence'
            }
        };
        
        for (const item of vocabularyItems) {
            // Difficulty stats
            stats.difficulty[item.difficulty]++;
            
            // Word count stats
            const words = item.english.split(' ').length;
            if (words === 1) stats.wordCount.single++;
            else if (words <= 3) stats.wordCount.phrase++;
            else stats.wordCount.complex++;
        }
        
        return stats;
    }
    
    /**
     * Generate analysis report
     */
    generateReport(data) {
        const reportsDir = path.join(__dirname, '../reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const report = `# Conversation-Based Vocabulary Extraction Report

Generated: ${new Date().toLocaleString()}

## Summary

- **Total Terms Extracted**: ${data.totalTerms}
- **Source Conversations**: ${data.totalConversations}
- **Unique Domains**: ${data.domains.length}

## Domain Distribution

${Object.entries(data.vocabulary).map(([domain, terms]) => 
    `- **${domain}**: ${terms.length} terms`
).join('\n')}

## Difficulty Distribution

- 🟢 **Easy**: ${data.statistics.difficulty.easy} terms (${Math.round(data.statistics.difficulty.easy/data.totalTerms*100)}%)
- 🟡 **Normal**: ${data.statistics.difficulty.normal} terms (${Math.round(data.statistics.difficulty.normal/data.totalTerms*100)}%)
- 🔴 **Hard**: ${data.statistics.difficulty.hard} terms (${Math.round(data.statistics.difficulty.hard/data.totalTerms*100)}%)

## Term Complexity

- **Single Words**: ${data.statistics.wordCount.single}
- **Phrases (2-3 words)**: ${data.statistics.wordCount.phrase}
- **Complex (4+ words)**: ${data.statistics.wordCount.complex}

## Top Terms by Frequency

${data.vocabulary
    .slice(0, 10)
    .map(term => `- **${term.english}** - ${term.category}`)
    .join('\n')}

## Usage

This conversation-based vocabulary provides:

1. **Contextual Learning** - Each term includes real conversation examples
2. **Natural Phrases** - Terms extracted from actual CCL conversations
3. **Domain Awareness** - Terms categorized by conversation topics
4. **Practical Application** - Focus on commonly used expressions

## Integration

To use this vocabulary in the CCL Pronunciation Trainer:

1. Load the conversation vocabulary data
2. Switch between specialized and conversation vocabularies
3. Practice terms with their contextual examples
4. Focus on high-frequency terms for maximum impact
`;
        
        const reportPath = path.join(reportsDir, 'conversation-vocabulary-report.md');
        fs.writeFileSync(reportPath, report);
        console.log(`📊 Report generated: ${reportPath}`);
    }
}

// Main execution
async function main() {
    try {
        const extractor = new ConversationVocabularyExtractor();
        await extractor.extract();
        
        console.log('\n🎉 Conversation vocabulary extraction completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Extraction failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = ConversationVocabularyExtractor;