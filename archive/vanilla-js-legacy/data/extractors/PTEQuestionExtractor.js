/**
 * PTEQuestionExtractor - Extracts question-answer data from ASQ markdown files
 *
 * Type-safe extractor for Answer Short Question (ASQ) practice questions
 *
 * Source Format (supports both):
 * Format A (with answers): 1. Question text? - Answer
 * Format B (without answers): 1. Question text?
 *
 * Output Format: Structured question objects with metadata
 */
/**
 * PTEQuestionExtractor - Parses ASQ questions from markdown
 *
 * Extracts Answer Short Question items with optional answers
 * Infers difficulty based on word count
 * Categorizes questions by content keywords
 */
export class PTEQuestionExtractor {
    /**
     * Extract questions from markdown file
     *
     * @param filePath - Path to source markdown file
     * @param fs - File system module (Node.js only)
     * @param path - Path module (Node.js only)
     * @param options - Extraction options (encoding)
     * @returns Extracted dataset with metadata
     */
    static async extract(filePath, fs, path, options = {}) {
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
        }
        catch (error) {
            console.error(`❌ Error extracting questions:`, error);
            throw error;
        }
    }
    /**
     * Parse questions from markdown content
     *
     * @param content - Markdown file content
     * @returns Parsed question items
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
                const [, numberStr, questionText, answerText] = match;
                const id = parseInt(numberStr, 10);
                // Extract question and answer
                const question = questionText.trim();
                const answer = hasAnswer ? answerText.trim() : '';
                // Calculate word count
                const wordCount = this.countWords(question);
                // Infer difficulty from word count
                const difficulty = this.inferDifficulty(wordCount);
                // Infer category
                const category = this.inferCategory(question);
                items.push({
                    id,
                    type: 'asq',
                    content: {
                        question,
                        answer,
                        ipa: null
                    },
                    metadata: {
                        category,
                        difficulty,
                        wordCount,
                        tags: this.extractTags(question)
                    }
                });
            }
        }
        return items;
    }
    /**
     * Count words in a question
     *
     * @param question - Question text
     * @returns Word count
     */
    static countWords(question) {
        return question.split(/\s+/).filter(word => word.length > 0).length;
    }
    /**
     * Infer difficulty based on word count
     *
     * Uses Config-driven thresholds when available through DataSchema
     * Thresholds: ≤8 easy, ≤12 normal, 13+ hard
     *
     * @param wordCount - Number of words
     * @returns Difficulty level ('easy', 'normal', 'hard')
     */
    static inferDifficulty(wordCount) {
        // Use DataSchema and Config if available (single source of truth)
        if (typeof window !== 'undefined' && window.dataSchema) {
            try {
                const dataSchema = window.dataSchema;
                // Create a mock question of appropriate length for difficulty inference
                const mockQuestion = "word ".repeat(wordCount).trim() + "?";
                return dataSchema.inferDifficulty(mockQuestion);
            }
            catch (error) {
                // Silent fallback - use defaults below
            }
        }
        // Fallback thresholds if DataSchema not available
        if (wordCount <= 8)
            return 'easy';
        if (wordCount <= 12)
            return 'normal';
        return 'hard';
    }
    /**
     * Infer category from question content (basic heuristic)
     *
     * @param question - Question text
     * @returns Category
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
     *
     * @param question - Question text
     * @returns Tags
     */
    static extractTags(question) {
        const tags = [];
        const lowerQuestion = question.toLowerCase();
        // Question type indicators
        if (lowerQuestion.startsWith('what'))
            tags.push('what-question');
        if (lowerQuestion.startsWith('where'))
            tags.push('where-question');
        if (lowerQuestion.startsWith('when'))
            tags.push('when-question');
        if (lowerQuestion.startsWith('who'))
            tags.push('who-question');
        if (lowerQuestion.startsWith('how'))
            tags.push('how-question');
        if (lowerQuestion.startsWith('which'))
            tags.push('which-question');
        // Content indicators
        if (lowerQuestion.includes('opposite'))
            tags.push('opposite');
        if (lowerQuestion.includes('antonym'))
            tags.push('antonym');
        if (lowerQuestion.includes('synonym'))
            tags.push('synonym');
        if (lowerQuestion.match(/\b(call|called|name)\b/))
            tags.push('terminology');
        return tags;
    }
    /**
     * Validate extracted dataset using DataSchema when available
     *
     * @param dataset - Dataset to validate
     * @returns Validation result
     */
    static validate(dataset) {
        // Use DataSchema for validation if available (single source of truth)
        if (typeof window !== 'undefined' && window.dataSchema) {
            try {
                const dataSchema = window.dataSchema;
                const schemaType = 'question';
                return dataSchema.validate(schemaType, dataset);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`⚠️ PTEQuestionExtractor: DataSchema validation error: ${errorMessage}`);
                // Fall through to minimal validation
            }
        }
        // Minimal fallback validation if DataSchema not available
        const errors = [];
        const warnings = [];
        // Basic structure check
        if (!dataset.meta) {
            errors.push('Missing meta object');
        }
        else if (dataset.meta.type !== 'asq') {
            errors.push('Invalid meta.type (should be "asq")');
        }
        // Validate items
        if (!Array.isArray(dataset.items)) {
            errors.push('Items is not an array');
        }
        else if (dataset.items.length === 0) {
            warnings.push('Items array is empty');
        }
        else {
            // Only check first item for basic structure (performance)
            const firstItem = dataset.items[0];
            if (!firstItem.content || !firstItem.content.question) {
                errors.push('First item missing content.question');
            }
            // Quick statistics
            const withAnswers = dataset.items.filter(item => item.content && item.content.answer && item.content.answer.trim().length > 0).length;
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
// Default export
export default PTEQuestionExtractor;
//# sourceMappingURL=PTEQuestionExtractor.js.map