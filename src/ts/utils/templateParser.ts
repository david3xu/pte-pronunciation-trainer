/**
 * Template Parser for DI Shadowing Practice
 * 
 * Parses DI answers to identify:
 * - Template phrases (fixed, memorized)
 * - Variable content (changes per image)
 * - Stress words (CAPITALS)
 */

// Template A: Single Category Data Charts
const TEMPLATE_A_PATTERNS = [
  'This',
  'ILLUSTRATES information',
  'REGARDING',
  'At the TOP,',
  'DEMONSTRATES the HIGHEST value,',
  'which is approximately',
  'Following THAT,',
  'SHOWS around',
  'representing the SECOND-highest figure.',
  'Conversely,',
  'INDICATES the LOWEST value',
  'at approximately',
  'Additionally,',
  'and',
  'also contribute SIGNIFICANTLY',
  'to the data ANALYSIS.',
  'In CONCLUSION,',
  'this chart PRESENTS comprehensive DATA',
  'demonstrating CLEAR variations',
  'in'
];

// Template B: Multiple Categories
const TEMPLATE_B_PATTERNS = [
  'This',
  'PRESENTS statistical data',
  'COMPARING',
  'When EXAMINING',
  'LEADS',
  'at approximately',
  'Conversely,',
  'shows the LOWEST value',
  'at around',
  'SWITCHING to',
  'REPRESENTS the highest figure',
  'Furthermore,',
  'and',
  'also DEMONSTRATE notable VALUES',
  'across BOTH categories.',
  'OVERALL,',
  'this data CLEARLY illustrates',
  'the COMPARATIVE analysis',
  'between'
];

// Template F: Diagrams/Illustrations
const TEMPLATE_F_PATTERNS = [
  'This DIAGRAM',
  'ILLUSTRATES information about',
  'The STRUCTURE is organized into',
  'MAIN sections or layers.',
  'At the TOP,',
  'is POSITIONED,',
  'representing',
  'In the MIDDLE portion,',
  'and',
  'are DISPLAYED,',
  'indicating',
  'At the BASE or BOTTOM,',
  'APPEARS,',
  'showing',
  'Additionally,',
  'VARIOUS labels and VISUAL elements',
  'provide DETAILED information about',
  'In CONCLUSION,',
  'this diagram EFFECTIVELY explains',
  'the STRUCTURE and COMPONENTS',
  'of'
];

// Template C: Flow Charts/Processes
const TEMPLATE_C_PATTERNS = [
  'This FLOW chart',
  'DEPICTS the PROCESS of',
  'INITIALLY,',
  'the process COMMENCES with',
  'which serves as the STARTING point.',
  'SUBSEQUENTLY,',
  'OCCURS as the NEXT stage,',
  'involving',
  'Following THAT,',
  'TAKES place,',
  'which LEADS to',
  'In the FINAL stage,',
  'REPRESENTS the CONCLUSION',
  'of this systematic PROCESS.',
  'In SUMMARY,',
  'these SEQUENTIAL steps',
  'clearly DEMONSTRATE',
  'how',
  'OPERATES effectively.'
];

// Template D: Photos/Scenes
const TEMPLATE_D_PATTERNS = [
  'This PHOTOGRAPH',
  'ILLUSTRATES information about',
  'In the FOREGROUND,',
  'APPEARS as the PRIMARY focus,',
  'showing',
  'Just ADJACENT to that,',
  'and',
  'provide ADDITIONAL context',
  'to the SCENE.',
  'In the BACKGROUND,',
  'CREATE the environmental SETTING,',
  'featuring',
  'Additionally,',
  'CONTRIBUTE to the OVERALL composition.',
  'In CONCLUSION,',
  'this image EFFECTIVELY captures'
];

// Template E: Maps
const TEMPLATE_E_PATTERNS = [
  'This MAP',
  'PRESENTS geographical information',
  'REGARDING',
  'In the NORTHERN section,',
  'is SITUATED,',
  'featuring',
  'Proceeding to the CENTRAL area,',
  'APPEARS',
  'with',
  'In the SOUTHERN portion,',
  'is LOCATED',
  'at approximately',
  'NOTABLY,',
  'and',
  'MARK significant GEOGRAPHICAL locations',
  'throughout the REGION.',
  'OVERALL,',
  'this map COMPREHENSIVELY displays',
  'the spatial DISTRIBUTION',
  'of'
];

const ALL_TEMPLATES = {
  A: TEMPLATE_A_PATTERNS,
  B: TEMPLATE_B_PATTERNS,
  C: TEMPLATE_C_PATTERNS,
  D: TEMPLATE_D_PATTERNS,
  E: TEMPLATE_E_PATTERNS,
  F: TEMPLATE_F_PATTERNS
};

export interface TextSegment {
  text: string;
  type: 'template' | 'variable' | 'stress';
  isStress?: boolean;
}

/**
 * Parse text to identify template phrases, variable content, and stress words
 */
export function parseTemplateText(text: string, template: string = 'A'): TextSegment[] {
  const segments: TextSegment[] = [];
  const patterns = ALL_TEMPLATES[template as keyof typeof ALL_TEMPLATES] || TEMPLATE_A_PATTERNS;
  
  let remainingText = text;
  let currentIndex = 0;
  
  while (remainingText.length > 0) {
    let matched = false;
    
    // Try to match template patterns
    for (const pattern of patterns) {
      const regex = new RegExp(`^${escapeRegex(pattern)}`, 'i');
      const match = remainingText.match(regex);
      
      if (match) {
        const matchedText = match[0];
        segments.push({
          text: matchedText,
          type: 'template',
          isStress: hasStressWords(matchedText)
        });
        
        remainingText = remainingText.slice(matchedText.length).trimStart();
        currentIndex += matchedText.length;
        matched = true;
        break;
      }
    }
    
    // If no template match, extract next word/phrase as variable content
    if (!matched) {
      const nextPause = remainingText.indexOf('|');
      const nextSpace = remainingText.indexOf(' ');
      
      let endIndex;
      if (nextPause >= 0 && (nextSpace < 0 || nextPause < nextSpace)) {
        endIndex = nextPause;
      } else if (nextSpace >= 0) {
        endIndex = nextSpace;
      } else {
        endIndex = remainingText.length;
      }
      
      const word = remainingText.slice(0, endIndex).trim();
      if (word) {
        segments.push({
          text: word,
          type: 'variable',
          isStress: hasStressWords(word)
        });
      }
      
      remainingText = remainingText.slice(endIndex + 1).trimStart();
    }
  }
  
  return segments;
}

/**
 * Check if text contains stress words (all caps words)
 */
function hasStressWords(text: string): boolean {
  // Match words that are all uppercase (2+ letters)
  return /\b[A-Z]{2,}\b/.test(text);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Render text with color coding
 */
export function renderColorCodedText(text: string, template: string = 'A', showColors: boolean = true): string {
  if (!showColors) {
    return text;
  }
  
  const segments = parseTemplateText(text, template);
  
  return segments.map(segment => {
    let className = '';
    
    if (segment.type === 'template') {
      className = 'template-phrase';
    } else if (segment.type === 'variable') {
      className = 'variable-content';
    }
    
    if (segment.isStress) {
      className += ' stress-word';
    }
    
    return `<span class="${className}">${segment.text}</span>`;
  }).join(' ');
}

/**
 * Parse and structure answer text for rendering
 */
export function parseAnswerForDisplay(fullText: string, template: string = 'A'): {
  sentences: Array<{ text: string; segments: TextSegment[] }>;
} {
  // Split by newlines to get sentences
  const sentences = fullText
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(sentence => ({
      text: sentence,
      segments: parseTemplateText(sentence, template)
    }));
  
  return { sentences };
}

