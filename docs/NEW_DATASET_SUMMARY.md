# New Conversation Vocabulary Dataset

Generated: August 11, 2025

## 📊 Dataset Overview

- **Total Terms**: 5,548 unique vocabulary entries
- **Source Conversations**: 116 CCL dialogue files  
- **Processing Order**: ID 70241 → 70001 (descending)
- **Mapping**: 1:1 term-to-sentence (first occurrence wins)

## 🗂️ Category Distribution

| Category | Terms | Percentage |
|----------|-------|------------|
| **business-finance** | 2,133 | 38.4% |
| **social-welfare** | 1,600 | 28.8% |
| **legal-government** | 641 | 11.6% |
| **education** | 516 | 9.3% |
| **travel-immigration** | 299 | 5.4% |
| **medical-healthcare** | 245 | 4.4% |
| **general** | 114 | 2.1% |

## 📋 Data Schema (Corrected)

Each vocabulary entry follows this exact structure:

```javascript
{
  // Core vocabulary data
  "english": "to visit the site again",           // The extracted term/phrase
  "chinese": "嗨，办公室那边说你今天要再来工地一趟。我相信你会对进度满意的。",  // Full Chinese sentence (for context)
  "difficulty": "hard",                           // "easy" | "normal" | "hard"
  
  // 1:1 mapping - example sentence (FIRST HALF ONLY) ✅
  "example": "Hey, the office mentioned you'd drop by to visit the site again",  
  "exampleChinese": "嗨，办公室那边说你今天要再来工地一趟。我相信你会对进度满意的。",
  
  // Source traceability
  "conversationId": "70241",
  "conversationTitle": "Suite Bathroom Design Clarification",
  "dialogueNumber": 1
}
```

## 🎯 Key Features

### Processing Order ✅
1. **Conversations**: Processed from highest ID (70241) backwards to lowest (70001)
2. **Sentences**: Within each conversation, processed in order (1, 2, 3, 4, ...)
3. **Terms**: Multiple terms extracted per sentence
4. **Deduplication**: First occurrence of each term wins

### Example Sentence Logic ✅
- **Input**: `"Hey, the office mentioned you'd drop by to visit the site again today. I bet you'll be pleased with the progress."`
- **Term**: `"to visit the site again"`
- **Example**: `"Hey, the office mentioned you'd drop by to visit the site again"` (stops after term)
- **❌ Wrong**: Full sentence
- **✅ Correct**: First half containing the term

### Difficulty Distribution
- **Easy**: 0 terms (0%)
- **Normal**: 784 terms (14%)  
- **Hard**: 4,764 terms (86%)

### Term Complexity
- **Single Words**: 1 term
- **Phrases (2-3 words)**: 1,947 terms
- **Complex (4+ words)**: 3,600 terms

## 🔧 Technical Implementation

### Files Generated
- `/data/generated/conversation-vocabulary-data.js` - Main data file for browser
- `/data/generated/conversation-vocabulary-data.json` - JSON format for analysis
- `/reports/conversation-vocabulary-report.md` - Statistical summary

### Browser Integration
- **Global Variable**: `window.conversationVocabularyData`
- **Loading**: Via HTML script tags with cache busters
- **Usage**: VocabularyManager switches between specialized/conversation modes
- **Display**: UIController shows term + Chinese context + example sentence

## 🎮 Usage in CCL Trainer

### Dual Vocabulary System
1. **Specialized Terms** (1,618) - Domain-specific terminology from markdown
2. **Conversation Vocabulary** (5,548) - Contextual phrases from real dialogues ✅

### UI Display Format
```
┌─────────────────────────────────────┐
│   🔴 Hard                          │ ← Difficulty badge
│                                     │
│   to visit the site again          │ ← English term (large)
│                                     │
│   嗨，办公室那边说你今天要再来工地一趟。    │ ← Chinese context (medium)  
│                                     │
│   Example: "Hey, the office        │ ← Example sentence (small) ✅
│   mentioned you'd drop by to       │
│   visit the site again"            │
│                                     │
│   From: Suite Bathroom Design      │ ← Source conversation (tiny)
└─────────────────────────────────────┘
```

## ✅ Schema Validation

The new dataset follows the corrected schema requirements:

- ✅ **Processing Order**: 70241→70001, sentences 1→N within each conversation
- ✅ **1:1 Mapping**: Each term has exactly one example sentence  
- ✅ **First Half Examples**: Example sentences stop after the term (not full sentences)
- ✅ **Source Traceability**: Each term linked to specific conversation and sentence
- ✅ **Category Consistency**: Aligned with specialized vocabulary categories
- ✅ **Chinese Context**: Full Chinese sentence provided for contextual understanding

## 🚀 Ready for Production

This dataset is ready for integration with the CCL Pronunciation Trainer web application. Users can switch between specialized and conversation vocabularies to practice contextual English phrases with Australian TTS pronunciation.