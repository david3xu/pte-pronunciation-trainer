/**
 * Template Parser for DI Shadowing Practice (Simplified)
 * 
 * Identifies:
 * - Template phrases (common phrases across all answers)
 * - Variable content (specific to each image)
 * - Stress words (ALL CAPS)
 */

export interface TextSegment {
  text: string;
  type: 'template' | 'variable';
  isStress: boolean;
}

// Common template phrases (case-insensitive matching)
const COMMON_TEMPLATE_PHRASES = [
  // Universal
  'this',
  'illustrates information',
  'regarding',
  'about',
  
  // Data description
  'at the top',
  'demonstrates the highest value',
  'which is approximately',
  'following that',
  'shows around',
  'representing the',
  'second-highest figure',
  'conversely',
  'indicates the lowest value',
  'at approximately',
  'additionally',
  'and',
  'also contribute significantly',
  'to the data analysis',
  'in conclusion',
  'this chart presents comprehensive data',
  'demonstrating clear variations',
  'in',
  
  // Comparisons
  'presents statistical data',
  'comparing',
  'when examining',
  'leads',
  'shows the lowest value',
  'at around',
  'switching to',
  'represents the highest figure',
  'furthermore',
  'also demonstrate notable values',
  'across both categories',
  'overall',
  'this data clearly illustrates',
  'the comparative analysis',
  'between',
  
  // Diagrams
  'this diagram',
  'the structure is organized into',
  'main sections or layers',
  'is positioned',
  'are displayed',
  'indicating',
  'at the base or bottom',
  'appears',
  'showing',
  'various labels and visual elements',
  'provide detailed information about',
  'this diagram effectively explains',
  'the structure and components',
  'of',
  
  // Process
  'this flow chart',
  'depicts the process of',
  'initially',
  'the process commences with',
  'which serves as the starting point',
  'subsequently',
  'occurs as the next stage',
  'involving',
  'takes place',
  'which leads to',
  'in the final stage',
  'represents the conclusion',
  'of this systematic process',
  'in summary',
  'these sequential steps',
  'clearly demonstrate',
  'how',
  'operates effectively',
  
  // Photos
  'this photograph',
  'in the foreground',
  'appears as the primary focus',
  'just adjacent to that',
  'provide additional context',
  'to the scene',
  'in the background',
  'create the environmental setting',
  'featuring',
  'contribute to the overall composition',
  'this image effectively captures',
  
  // Maps
  'this map',
  'presents geographical information',
  'in the northern section',
  'is situated',
  'proceeding to the central area',
  'with',
  'in the southern portion',
  'is located',
  'notably',
  'mark significant geographical locations',
  'throughout the region',
  'this map comprehensively displays',
  'the spatial distribution'
];

/**
 * Check if a word/phrase is all uppercase (STRESS word)
 */
function isStressWord(text: string): boolean {
  // Match words that have 2+ consecutive uppercase letters
  return /[A-Z]{2,}/.test(text);
}

/**
 * Check if text matches a template phrase (case-insensitive)
 */
function isTemplatePhrase(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  
  // Check exact matches
  for (const phrase of COMMON_TEMPLATE_PHRASES) {
    if (normalized === phrase.toLowerCase()) {
      return true;
    }
  }
  
  // Check if it's a common template word
  const templateWords = ['this', 'the', 'and', 'to', 'of', 'in', 'at', 'with', 'which', 'is'];
  if (templateWords.includes(normalized)) {
    return true;
  }
  
  return false;
}

/**
 * Parse text into segments with proper classification
 */
export function parseTemplateText(text: string, _template: string = 'A'): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Split by spaces and punctuation, keeping delimiters
  const tokens = text.split(/(\s+|[,.])/);
  
  let currentPhrase: string[] = [];
  let currentType: 'template' | 'variable' | null = null;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Skip empty or undefined tokens
    if (!token || token.trim() === '') {
      if (currentPhrase.length > 0 && token) {
        currentPhrase.push(token);
      }
      continue;
    }
    
    // Check if this token is a template phrase
    const isTemplate = isTemplatePhrase(token);
    
    // If type changes or we hit punctuation, flush current phrase
    if ((currentType !== null && isTemplate !== (currentType === 'template')) || 
        token === ',' || token === '.') {
      if (currentPhrase.length > 0) {
        const phraseText = currentPhrase.join('');
        segments.push({
          text: phraseText,
          type: currentType || 'variable',
          isStress: isStressWord(phraseText)
        });
        currentPhrase = [];
      }
      
      // Add punctuation as separate segment
      if (token === ',' || token === '.') {
        currentType = null;
        continue;
      }
    }
    
    // Start new phrase or continue current
    if (currentPhrase.length === 0) {
      currentType = isTemplate ? 'template' : 'variable';
    }
    
    currentPhrase.push(token);
  }
  
  // Flush remaining phrase
  if (currentPhrase.length > 0) {
    const phraseText = currentPhrase.join('');
    segments.push({
      text: phraseText,
      type: currentType || 'variable',
      isStress: isStressWord(phraseText)
    });
  }
  
  return segments;
}

/**
 * Parse and structure answer text for rendering
 */
export function parseAnswerForDisplay(fullText: string, template: string = 'A'): {
  sentences: Array<{ text: string; segments: TextSegment[] }>;
} {
  // Split by newlines and pipes to get logical segments
  const lines = fullText
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const sentences = lines.map(line => {
    // Remove pipes but keep the text
    const cleanLine = line.replace(/\s*\|\s*/g, ' ').trim();
    
    return {
      text: cleanLine,
      segments: parseTemplateText(cleanLine, template)
    };
  });
  
  return { sentences };
}
