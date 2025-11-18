/**
 * Template Parser for DI Shadowing Practice (Bracket-Based)
 * 
 * Uses [brackets] to identify variable content:
 * - [Variable content] = specific to each image (Blue)
 * - Template phrases = common phrases (Gray)
 * - ALL CAPS words = stress words (Red)
 * 
 * Format: This [LINE graph] | ILLUSTRATES information | REGARDING [topic].
 */

export interface TextSegment {
  text: string;
  type: 'template' | 'variable';
  isStress: boolean;
}

export interface ParsedSentence {
  text: string;
  segments: TextSegment[];
}

export interface ParsedAnswer {
  sentences: ParsedSentence[];
}

/**
 * Check if a word is all-caps (stress word)
 */
function isStressWord(word: string): boolean {
  const trimmed = word.trim();
  return trimmed === trimmed.toUpperCase() && trimmed.length > 1 && /[A-Z]/.test(trimmed);
}

/**
 * Parse text with brackets for variable content
 * Example: "This [LINE graph] | ILLUSTRATES information | REGARDING [topic]."
 * 
 * Returns segments where:
 * - [bracketed text] = type: 'variable'
 * - non-bracketed text = type: 'template'
 */
export function parseTemplateText(text: string, _template: string = 'A'): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentText = '';
  let currentType: 'template' | 'variable' = 'template';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '[') {
      // Flush previous template segment
      if (currentText) {
        segments.push({
          text: currentText,
          type: 'template',
          isStress: isStressWord(currentText)
        });
        currentText = '';
      }
      currentType = 'variable';
    } else if (char === ']') {
      // Flush variable segment (without the bracket)
      if (currentText) {
        segments.push({
          text: currentText,
          type: 'variable',
          isStress: isStressWord(currentText)
        });
        currentText = '';
      }
      currentType = 'template';
    } else {
      currentText += char;
    }
  }
  
  // Flush remaining text
  if (currentText) {
    segments.push({
      text: currentText,
      type: currentType,
      isStress: isStressWord(currentText)
    });
  }
  
  return segments;
}

/**
 * Parse and structure answer text for rendering
 */
export function parseAnswerForDisplay(fullText: string, template: string = 'A'): ParsedAnswer {
  // Split by newlines to get sentences
  const lines = fullText.split('\n').filter(line => line.trim() !== '');
  
  const sentences: ParsedSentence[] = lines.map(line => ({
    text: line,
    segments: parseTemplateText(line, template)
  }));
  
  return { sentences };
}
