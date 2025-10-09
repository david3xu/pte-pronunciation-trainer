/**
 * PTEQuestionExtractor.js
 * 
 * Extracts question-answer data from Answer Short Question (ASQ) markdown files.
 * 
 * Source Format (supports both formats):
 * Format A (with answers): 1. Question text? - Answer
 * Format B (without answers): 1. Question text?
 * 
 * Output Format:
 * {
 *   id: 1,
 *   type: 'asq',
 *   content: {
 *     question: "What is the place you share bedroom with your classmates?",
 *     answer: "dormitory",  // or '' if not provided
 *     ipa: null  // No IPA for questions - use TTS at runtime
 *   },
 *   metadata: {
 *     category: 'general',
 *     difficulty: 'normal',  // Based on word count: ≤8 easy, ≤12 normal, 13+ hard
 *     wordCount: 10,
 *     tags: []
 *   }
 * }
 * 
 * @module PTEQuestionExtractor
 * @version 1.0.0
 * @date 2025-10-07
 */

// Use dynamic require for Node.js compatibility
const fs = (typeof require !== 'undefined') ? require('fs') : null;
const path = (typeof require !== 'undefined') ? require('path') : null;

class PTEQuestionExtractor {
  /**
   * Extract questions from markdown file
   * @param {string} filePath - Path to source markdown file
   * @param {object} options - Extraction options
   * @param {string} [options.encoding='utf-8'] - File encoding
   * @returns {Promise<object>} Extracted dataset
   */
  static async extract(filePath, options = {}) {
    const { encoding = 'utf-8' } = options;
    
    try {
      console.log(`📖 Reading file: ${filePath}`);
      const content = fs.readFileSync(filePath, encoding);
      
      console.log(`🔍 Parsing ASQ questions...`);
      const items = this.parseQuestions(content);
      
      console.log(`✅ Extracted ${items.length} questions`);
      
      return {
        meta: {
          type: 'asq',
          version: '1.0',
          count: items.length,
          updated: new Date().toISOString().split('T')[0],
          source: path.basename(filePath),
          description: 'PTE Answer Short Question dataset'
        },
        items
      };
    } catch (error) {
      console.error(`❌ Error extracting questions:`, error);
      throw error;
    }
  }
  
  /**
   * Parse questions from markdown content
   * @param {string} content - Markdown file content
   * @returns {Array<object>} Parsed question items
   */
  static parseQuestions(content) {
    const items = [];
    const lines = content.split('\n');
    
    // Regex patterns:
    // Format A: "1. Question text? - Answer"
    // Format B: "1. Question text?"
    const questionWithAnswerRegex = /^(\d+)\.\s+(.+?)\s+-\s+(.+)$/;
    const questionOnlyRegex = /^(\d+)\.\s+(.+)$/;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, headers, separators
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('**')) {
        continue;
      }
      
      // Try matching with answer first
      let match = trimmed.match(questionWithAnswerRegex);
      let hasAnswer = true;
      
      if (!match) {
        // Try matching without answer
        match = trimmed.match(questionOnlyRegex);
        hasAnswer = false;
      }
      
      if (match) {
        const id = parseInt(match[1], 10);
        const questionText = match[2].trim();
        const answerText = hasAnswer ? match[3].trim() : '';
        
        // Calculate word count
        const wordCount = this.countWords(questionText);
        
        // Infer difficulty from word count
        const difficulty = this.inferDifficulty(wordCount);
        
        // Infer category
        const category = this.inferCategory(questionText);
        
        items.push({
          id,
          type: 'asq',
          content: {
            question: questionText,
            answer: answerText,
            ipa: null  // No IPA for questions - use TTS at runtime
          },
          metadata: {
            category,
            difficulty,
            wordCount,
            tags: this.extractTags(questionText)
          }
        });
      }
    }
    
    return items;
  }
  
  /**
   * Count words in a question
   * @param {string} question - Question text
   * @returns {number} Word count
   */
  static countWords(question) {
    return question.split(/\s+/).filter(word => word.length > 0).length;
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
        // Create a mock question of appropriate length for difficulty inference
        // This leverages the centralized difficulty logic in DataSchema
        const mockQuestion = "word ".repeat(wordCount).trim() + "?";
        return window.dataSchema.inferDifficulty(mockQuestion);
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
   * Infer category from question content (basic heuristic)
   * @param {string} question - Question text
   * @returns {string} Category
   */
  static inferCategory(question) {
    const lowerQuestion = question.toLowerCase();
    
    // Academic indicators
    if (lowerQuestion.match(/\b(university|degree|student|professor|academic|thesis|research|study)\b/)) {
      return 'academic';
    }
    
    // Science indicators
    if (lowerQuestion.match(/\b(science|scientist|chemical|biology|physics|laboratory|experiment)\b/)) {
      return 'science';
    }
    
    // Medical indicators
    if (lowerQuestion.match(/\b(doctor|hospital|medical|patient|disease|medicine|health|organ)\b/)) {
      return 'medical';
    }
    
    // Geography indicators
    if (lowerQuestion.match(/\b(country|continent|ocean|river|mountain|city|capital|geography)\b/)) {
      return 'geography';
    }
    
    // Profession indicators
    if (lowerQuestion.match(/\b(job|profession|occupation|career|work|employee|employer)\b/)) {
      return 'profession';
    }
    
    // Nature indicators
    if (lowerQuestion.match(/\b(animal|plant|tree|flower|bird|insect|nature|wildlife)\b/)) {
      return 'nature';
    }
    
    // Everyday objects/concepts
    if (lowerQuestion.match(/\b(color|shape|number|food|clothing|tool|furniture|vehicle)\b/)) {
      return 'everyday';
    }
    
    // Default category
    return 'general';
  }
  
  /**
   * Extract tags from question (for future filtering)
   * @param {string} question - Question text
   * @returns {Array<string>} Tags
   */
  static extractTags(question) {
    const tags = [];
    const lowerQuestion = question.toLowerCase();
    
    // Question type indicators
    if (lowerQuestion.startsWith('what')) tags.push('what-question');
    if (lowerQuestion.startsWith('where')) tags.push('where-question');
    if (lowerQuestion.startsWith('when')) tags.push('when-question');
    if (lowerQuestion.startsWith('who')) tags.push('who-question');
    if (lowerQuestion.startsWith('how')) tags.push('how-question');
    if (lowerQuestion.startsWith('which')) tags.push('which-question');
    
    // Content indicators
    if (lowerQuestion.includes('opposite')) tags.push('opposite');
    if (lowerQuestion.includes('antonym')) tags.push('antonym');
    if (lowerQuestion.includes('synonym')) tags.push('synonym');
    if (lowerQuestion.match(/\b(call|called|name)\b/)) tags.push('terminology');
    
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
        // Schema type for question datasets
        const schemaType = 'question';
        return window.dataSchema.validate(schemaType, dataset);
      } catch (error) {
        console.warn(`⚠️ PTEQuestionExtractor: DataSchema validation error: ${error.message}`);
        // Fall through to minimal validation if DataSchema validation fails
      }
    }

    // Minimal fallback validation if DataSchema not available
    const errors = [];
    const warnings = [];

    // Basic structure check
    if (!dataset.meta) {
      errors.push('Missing meta object');
    } else if (dataset.meta.type !== 'asq') {
      errors.push('Invalid meta.type (should be "asq")');
    }

    // Validate items
    if (!Array.isArray(dataset.items)) {
      errors.push('Items is not an array');
    } else if (dataset.items.length === 0) {
      warnings.push('Items array is empty');
    } else {
      // Only check first item for basic structure (performance)
      const firstItem = dataset.items[0];
      if (!firstItem.content || !firstItem.content.question) {
        errors.push('First item missing content.question');
      }

      // Quick statistics
      const withAnswers = dataset.items.filter(item =>
        item.content && item.content.answer && item.content.answer.trim().length > 0
      ).length;

      const withoutAnswers = dataset.items.length - withAnswers;
      if (withoutAnswers > 0) {
        warnings.push(`${withoutAnswers} questions without answers (${withAnswers} with answers)`);
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
  module.exports = PTEQuestionExtractor;
}
