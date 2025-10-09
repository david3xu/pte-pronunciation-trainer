/**
 * PTESentenceExtractor.js
 * 
 * Extracts sentence data from Repeat Sentence (RS) and Write From Dictation (WFD) markdown files.
 * 
 * Source Format (numbered sentences):
 * 1. The archeologist's new discoveries...
 * 2. Another sentence example...
 * 
 * Output Format:
 * {
 *   id: 1,
 *   type: 'rs' | 'wfd',
 *   content: {
 *     sentence: "The archeologist's new discoveries...",
 *     ipa: null  // No IPA for sentences - use TTS at runtime
 *   },
 *   metadata: {
 *     category: 'general',
 *     difficulty: 'normal',  // Based on word count: ≤8 easy, ≤12 normal, 13+ hard
 *     wordCount: 10,
 *     tags: []
 *   }
 * }
 * 
 * @module PTESentenceExtractor
 * @version 1.0.0
 * @date 2025-10-07
 */

// Use dynamic require for Node.js compatibility
const fs = (typeof require !== 'undefined') ? require('fs') : null;
const path = (typeof require !== 'undefined') ? require('path') : null;

class PTESentenceExtractor {
  /**
   * Extract sentences from markdown file
   * @param {string} filePath - Path to source markdown file
   * @param {object} options - Extraction options
   * @param {string} options.type - Dataset type ('rs' or 'wfd')
   * @param {string} [options.encoding='utf-8'] - File encoding
   * @returns {Promise<object>} Extracted dataset
   */
  static async extract(filePath, options = {}) {
    const { type, encoding = 'utf-8' } = options;
    
    if (!type || !['rs', 'wfd'].includes(type)) {
      throw new Error(`Invalid type: ${type}. Must be 'rs' or 'wfd'`);
    }
    
    try {
      console.log(`📖 Reading file: ${filePath}`);
      const content = fs.readFileSync(filePath, encoding);
      
      console.log(`🔍 Parsing ${type.toUpperCase()} sentences...`);
      const items = this.parseSentences(content, type);
      
      console.log(`✅ Extracted ${items.length} sentences`);
      
      return {
        meta: {
          type,
          version: '1.0',
          count: items.length,
          updated: new Date().toISOString().split('T')[0],
          source: path.basename(filePath),
          description: type === 'rs' ? 'PTE Repeat Sentence practice sentences' : 'PTE Write From Dictation sentences'
        },
        items
      };
    } catch (error) {
      console.error(`❌ Error extracting sentences:`, error);
      throw error;
    }
  }
  
  /**
   * Parse sentences from markdown content
   * @param {string} content - Markdown file content
   * @param {string} type - Dataset type ('rs' or 'wfd')
   * @returns {Array<object>} Parsed sentence items
   */
  static parseSentences(content, type) {
    const items = [];
    const lines = content.split('\n');
    
    // Regex to match numbered sentences: "1. Sentence text..."
    const sentenceRegex = /^(\d+)\.\s+(.+)$/;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, headers, separators
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('**')) {
        continue;
      }
      
      const match = trimmed.match(sentenceRegex);
      if (match) {
        const [, numberStr, sentenceText] = match;
        const id = parseInt(numberStr, 10);
        
        // Extract sentence
        const sentence = sentenceText.trim();
        
        // Calculate word count
        const wordCount = this.countWords(sentence);
        
        // Infer difficulty from word count (based on RS metadata)
        // Simple: 5-8 words → easy
        // General: 9-12 words → normal
        // Disaster: 13+ words → hard
        const difficulty = this.inferDifficulty(wordCount);
        
        // Infer category (basic categorization)
        const category = this.inferCategory(sentence);
        
        items.push({
          id,
          type,
          content: {
            sentence,
            ipa: null  // No IPA for sentences - use TTS at runtime
          },
          metadata: {
            category,
            difficulty,
            wordCount,
            tags: this.extractTags(sentence)
          }
        });
      }
    }
    
    return items;
  }
  
  /**
   * Count words in a sentence
   * @param {string} sentence - Sentence text
   * @returns {number} Word count
   */
  static countWords(sentence) {
    return sentence.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Infer difficulty based on word count
   * Uses Config-driven thresholds when available through DataSchema
   *
   * @param {number} wordCount - Number of words
   * @returns {string} Difficulty level ('easy', 'normal', 'hard')
   */
  static inferDifficulty(wordCount) {
    // Use DataSchema and Config if available (single source of truth)
    if (typeof window !== 'undefined' && window.dataSchema) {
      try {
        // Create a mock sentence of appropriate length for difficulty inference
        // This leverages the centralized difficulty logic in DataSchema
        const mockSentence = "word ".repeat(wordCount).trim();
        return window.dataSchema.inferDifficulty(mockSentence);
      } catch (error) {
        // Silent fallback - use defaults below
      }
    }

    // Fallback thresholds if DataSchema not available
    if (wordCount <= 8) return 'easy';
    if (wordCount <= 12) return 'normal';
    return 'hard';
  }
  
  /**
   * Infer category from sentence content (basic heuristic)
   * @param {string} sentence - Sentence text
   * @returns {string} Category
   */
  static inferCategory(sentence) {
    const lowerSentence = sentence.toLowerCase();
    
    // Academic indicators
    if (lowerSentence.match(/\b(research|study|university|academic|theory|hypothesis|experiment|scholar)\b/)) {
      return 'academic';
    }
    
    // Science indicators
    if (lowerSentence.match(/\b(science|chemical|biology|physics|scientist|laboratory|molecule)\b/)) {
      return 'science';
    }
    
    // Business indicators
    if (lowerSentence.match(/\b(business|company|market|profit|customer|employee|management)\b/)) {
      return 'business';
    }
    
    // Technology indicators
    if (lowerSentence.match(/\b(technology|computer|software|digital|internet|data|system)\b/)) {
      return 'technology';
    }
    
    // History/Geography indicators
    if (lowerSentence.match(/\b(history|ancient|civilization|century|empire|country|continent|geography)\b/)) {
      return 'history-geography';
    }
    
    // Default category
    return 'general';
  }
  
  /**
   * Extract tags from sentence (for future filtering)
   * @param {string} sentence - Sentence text
   * @returns {Array<string>} Tags
   */
  static extractTags(sentence) {
    const tags = [];
    const lowerSentence = sentence.toLowerCase();
    
    // Add tags based on content
    if (lowerSentence.includes('?')) tags.push('question');
    if (lowerSentence.match(/\b(however|therefore|thus|consequently|moreover)\b/)) tags.push('complex');
    if (lowerSentence.match(/\b(first|second|third|finally)\b/)) tags.push('sequential');
    if (lowerSentence.match(/\b(important|essential|crucial|vital|significant)\b/)) tags.push('emphasis');
    
    return tags;
  }
  
  /**
   * Validate extracted dataset using DataSchema when available
   * @param {object} dataset - Dataset to validate
   * @returns {object} Validation result
   */
  static validate(dataset) {
    // Use DataSchema for validation if available (single source of truth)
    if (typeof window !== 'undefined' && window.dataSchema) {
      try {
        // Schema type for sentence datasets
        const schemaType = 'sentence';
        return window.dataSchema.validate(schemaType, dataset);
      } catch (error) {
        console.warn(`⚠️ PTESentenceExtractor: DataSchema validation error: ${error.message}`);
        // Fall through to minimal validation if DataSchema validation fails
      }
    }

    // Minimal fallback validation if DataSchema not available
    const errors = [];
    const warnings = [];

    // Basic structure check
    if (!dataset.meta) {
      errors.push('Missing meta object');
    } else if (!dataset.meta.type) {
      errors.push('Missing meta.type');
    }

    if (!Array.isArray(dataset.items)) {
      errors.push('Items is not an array');
    } else if (dataset.items.length === 0) {
      warnings.push('Items array is empty');
    } else {
      // Only check first item for critical structure (performance)
      const firstItem = dataset.items[0];
      if (!firstItem.content || !firstItem.content.sentence) {
        errors.push('First item missing content.sentence');
      }

      // Check meta count matches actual count
      if (dataset.meta && dataset.meta.count !== dataset.items.length) {
        warnings.push(`Meta count (${dataset.meta.count}) doesn't match items length (${dataset.items.length})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PTESentenceExtractor;
}
