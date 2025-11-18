/**
 * DI Answer Extractor
 *
 * Extracts complete DI answers from markdown files for shadowing practice
 * Format: Each answer is split into phrases by "|" marks
 */

export class DIAnswerExtractor {
  /**
   * Extract DI answers from markdown content
   * @param {string} content - Raw markdown content
   * @returns {Array<Object>} Array of DI answer objects
   */
  extract(content) {
    const answers = [];
    const imageBlocks = content.split(/(?=^# DI IMAGE #)/gm);

    for (const block of imageBlocks) {
      if (!block.trim() || !block.includes('DI IMAGE #')) continue;

      const answer = this.extractAnswerFromBlock(block);
      if (answer) {
        answers.push(answer);
      }
    }

    return answers;
  }

  /**
   * Extract single answer from image block
   * @param {string} block - Single IMAGE block content
   * @returns {Object|null} DI answer object or null
   */
  extractAnswerFromBlock(block) {
    // Extract image number and title
    const titleMatch = block.match(/# DI IMAGE #(\d+): (.+?)(?:\(#\d+\))?$/m);
    if (!titleMatch) return null;

    const imageNumber = parseInt(titleMatch[1]);
    const title = titleMatch[2].trim();

    // Extract template type (default to A if not found)
    const template = 'A';

    // Extract complete answer text (everything between title and ---)
    const lines = block.split('\n');
    const answerLines = [];
    let inAnswer = false;

    for (const line of lines) {
      if (line.startsWith('# DI IMAGE')) {
        inAnswer = false;
        continue;
      }
      if (line.trim() === '' && !inAnswer) {
        inAnswer = true;
        continue;
      }
      if (line.trim() === '---') {
        break;
      }
      if (inAnswer && line.trim() !== '') {
        answerLines.push(line);
      }
    }

    if (answerLines.length === 0) return null;

    const fullText = answerLines.join('\n').trim();

    // Split into phrases by "|"
    const phrases = this.splitIntoPhrases(fullText);

    // Estimate word count and duration
    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
    const duration = Math.round(wordCount / 2.5); // Approximate 150 words/minute = 2.5 words/second

    return {
      id: `di-image-${imageNumber}`,
      imageNumber,
      title,
      template,
      fullText,
      phrases,
      wordCount,
      duration,
      category: 'di-shadowing'
    };
  }

  /**
   * Split answer text into phrases
   * @param {string} text - Full answer text
   * @returns {Array<Object>} Array of phrase objects
   */
  splitIntoPhrases(text) {
    // Clean up the text - remove extra whitespace but preserve "|"
    const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

    // Split by "|" and clean each phrase
    const phraseParts = cleanText.split('|').map(p => p.trim()).filter(p => p.length > 0);

    const phrases = [];
    let startIndex = 0;

    for (let i = 0; i < phraseParts.length; i++) {
      const phraseText = phraseParts[i];
      const endIndex = startIndex + phraseText.length;

      phrases.push({
        index: i,
        text: phraseText,
        startIndex,
        endIndex,
        // Estimate duration based on word count (assuming ~140 words/minute)
        estimatedDuration: (phraseText.split(' ').length / 140) * 60 * 1000 // ms
      });

      // Account for the "|" separator and space after it
      startIndex = endIndex + 3; // " | " = 3 chars
    }

    return phrases;
  }

  /**
   * Extract pronunciation guide (optional, for reference)
   * @param {string} block - Single IMAGE block content
   * @returns {Array<Object>} Array of pronunciation tips
   */
  extractPronunciationGuide(block) {
    const guide = [];
    const tableMatch = block.match(/### PRONUNCIATION GUIDE[\s\S]+?\n\n([\s\S]+?)(?=\n---|\n##|$)/);

    if (!tableMatch) return guide;

    const rows = tableMatch[1].split('\n').filter(line => line.startsWith('||'));

    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 5) {
        guide.push({
          word: cells[0].replace(/\*\*/g, ''),
          syllables: cells[1],
          stressPattern: cells[2],
          pronunciation: cells[3],
          tips: cells[4]
        });
      }
    }

    return guide;
  }

  /**
   * Get validation schema for DI answers
   * @returns {Object} Schema definition
   */
  getSchema() {
    return {
      required: ['id', 'imageNumber', 'title', 'fullText', 'phrases'],
      properties: {
        id: { type: 'string' },
        imageNumber: { type: 'number' },
        title: { type: 'string' },
        template: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
        fullText: { type: 'string' },
        phrases: {
          type: 'array',
          items: {
            required: ['index', 'text', 'startIndex', 'endIndex'],
            properties: {
              index: { type: 'number' },
              text: { type: 'string' },
              startIndex: { type: 'number' },
              endIndex: { type: 'number' },
              estimatedDuration: { type: 'number' }
            }
          }
        },
        wordCount: { type: 'number' },
        duration: { type: 'number' },
        category: { type: 'string' }
      }
    };
  }
}

export default DIAnswerExtractor;

