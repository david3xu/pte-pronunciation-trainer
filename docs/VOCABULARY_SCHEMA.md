# Conversation Vocabulary Data Schema

## Overview
This document defines the data schema for the CCL conversation-based vocabulary system.

## Top-Level Structure
```javascript
window.conversationVocabularyData = {
  // Metadata
  "generatedAt": "2025-08-11T23:00:00.000Z",
  "source": "conversation-extractors", 
  "totalTerms": 5548,
  "totalConversations": 116,
  
  // Available categories  
  "domains": [
    "business-finance", 
    "social-welfare", 
    "medical-healthcare", 
    "legal-government", 
    "education", 
    "travel-immigration", 
    "general"
  ],
  
  // Main vocabulary data (flat array structure)
  "vocabulary": [
    // Array of vocabulary items in processing order
    // Each item contains category as property
  ],
  
  // Statistics for reporting
  "statistics": {
    "difficulty": { "easy": 0, "normal": 784, "hard": 4764 },
    "wordCount": { "single": 1, "phrase": 1947, "complex": 3600 },
    "processing": { 
      "order": "highest-id-to-lowest",
      "mapping": "1:1-term-to-sentence"
    }
  }
}
```

## Individual Term Schema
Each vocabulary term follows this exact structure:

```javascript
{
  // Core vocabulary data
  "english": "to visit the site again",           // The extracted term/phrase
  "chinese": "嗨，办公室那边说你今天要再来工地一趟。",  // Full Chinese sentence (for context)
  "difficulty": "hard",                           // "easy" | "normal" | "hard"
  
  // 1:1 mapping - example sentence (FIRST HALF ONLY)
  "example": "Hey, the office mentioned you'd drop by to visit the site again",
  "exampleChinese": "嗨，办公室那边说你今天要再来工地一趟。我相信你会对进度满意的。",
  
  // Domain category as property
  "category": "business-finance",                 // Domain category of the term
  
  // Source traceability
  "conversationId": "70241",
  "conversationTitle": "Suite Bathroom Design Clarification",
  "dialogueNumber": 1                             // Sentence number within conversation
}
```

## Processing Requirements

### Order
1. **Conversations**: Process from highest ID (70241) backwards to lowest (70001)
2. **Sentences**: Within each conversation, process in order (1, 2, 3, 4, ...)
3. **Terms**: Extract multiple terms from each sentence
4. **Deduplication**: First occurrence of each term wins

### 1:1 Mapping Rule
- Each term gets exactly ONE example sentence
- The example is the sentence the term was extracted from
- No term appears twice in the final vocabulary

## UI Display Schema

### Display Structure
```javascript
{
  english: "to visit the site again",           // Main term (primary display)
  chinese: "嗨，办公室那边说你今天要再来工地一趟。",  // Chinese context 
  example: "Hey, the office mentioned...",      // Example sentence
  difficulty: "hard"                           // Difficulty level
}
```

### Expected UI Layout
```
┌─────────────────────────────────────┐
│   🔴 Hard                          │ ← Difficulty badge
│                                     │
│   to visit the site again          │ ← English term (large)
│                                     │
│   嗨，办公室那边说你今天要再来工地一趟。    │ ← Chinese context (medium)  
│                                     │
│   Example: "Hey, the office        │ ← Example sentence (small)
│   mentioned you'd drop by to       │
│   visit the site again today..."   │
│                                     │
│   From: Suite Bathroom Design      │ ← Source info (optional)
└─────────────────────────────────────┘
```

## Implementation Notes

### Data Generation
- Source: Conversation markdown files in `/data-processing/extractors/`
- Output: `/data/generated/conversation-vocabulary-data.js`
- Script: `scripts/conversation-vocabulary-extractor.js`

### Browser Integration
- Global variable: `window.conversationVocabularyData`
- Loaded by: `index.html` script tags
- Used by: `VocabularyManager.js` for term management
- Displayed by: `UIController.js` for rendering

### Quality Assurance
- Total terms: ~5,500 unique entries
- Coverage: 116 conversations processed
- Categories: 7 domain-specific categories
- Mapping: 1:1 term-to-sentence relationship maintained