# Learning Mode vs Category Architecture

**Date:** 7 October 2025  
**Status:** Current Architecture Documented  
**Related:** CODE-ANALYSIS.md Issue #6

---

## Overview

The application has two filtering concepts that can be confusing:
- **Learning Mode** (Vocabulary Book Selector)
- **Category** (Content Filter)

This document clarifies their relationship and current state.

---

## Current Architecture

### Learning Mode (Vocabulary Book)
**Purpose:** Selects which dataset/vocabulary book to load

**Values:**
- `pte-fib-listening` → `/data/processed/pte-fib-listening-dataset.json` (885 words)
- `pte-beginner` → `/data/processed/pte-beginner-vocabulary.json` (383 words)
- `pte-intermediate` → `/data/processed/pte-intermediate-vocabulary.json` (1,910 words)

**Implementation:**
- Dropdown in settings: "Vocabulary Book"
- Managed by: `PTEVocabularyManager.setLearningMode()`
- Loads entire dataset into memory

### Category (Content Filter)
**Purpose:** Filters words WITHIN the currently loaded dataset by their `category` field

**Current State:** 
- **Each dataset is monolithic** - all words in a dataset have the same category value
- `pte-fib-listening` dataset → all words have `category: "pte-fib-listening"`
- `pte-beginner` dataset → all words have `category: "pte-beginner"`  
- `pte-intermediate` dataset → all words have `category: "pte-intermediate"`

**Result:**
- Category filter currently has NO EFFECT (filtering to `pte-beginner` when that's already the only category does nothing)
- The "All Categories" option shows the same words as selecting the specific category

**Implementation:**
- ~~Dropdown in settings: "Category"~~ (removed in Phase 2 cleanup)
- Managed by: `PTEVocabularyManager.setCategory()`
- Filters `currentWords` array based on `word.category` field

---

## Why Keep the Category System?

Even though categories are currently not used, the infrastructure should be kept because:

### 1. **Future Subcategories**
Datasets could be enhanced with mixed content:
```javascript
// Future pte-beginner dataset could have:
{
  english: "accommodate",
  category: "academic-vocabulary",  // subcategory
  // ...
},
{
  english: "hello",
  category: "conversation-basics",  // different subcategory
  // ...
}
```

### 2. **Cross-Dataset Filtering**
Could enable filtering across multiple loaded datasets:
- Load both beginner + intermediate
- Filter to show only "academic-vocabulary" from both

### 3. **Existing Integration**
Category system is deeply integrated:
- `AudioControls.js` - handles category transitions
- `StateManager.js` - persists `currentCategory`
- `ProgressTracker.js` - tracks progress by category
- `LegacyCompatibility.js` - maps `setCategory` to legacy code

---

## Current User Experience

**What Users See:**
1. Settings Panel has "Vocabulary Book" dropdown (Learning Mode)
2. ~~Settings Panel has "Category" dropdown (Content Filter)~~ - REMOVED
3. Context bar shows current book name and word count

**Simplified in Phase 2:**
- Category dropdown removed from UI (not useful when datasets are monolithic)
- Category filtering still works in backend (ready for future use)
- Context bar now shows: `📗 PTE Beginner (383/383)`

---

## Future Enhancement Path

To make categories useful, update the data pipeline:

### Step 1: Add Category Field to Source Data
```markdown
<!-- pte-beginner-vocabulary-with-ipa.md -->
## Academic Vocabulary
1. accommodate /əˈkɒmədeɪt/
2. analyze /ˈænəlaɪz/

## Conversation Basics  
1. hello /həˈləʊ/
2. goodbye /ˌɡʊdˈbaɪ/
```

### Step 2: Update PTETermsExtractor
Modify `src/js/data/extractors/PTETermsExtractor.js` to:
- Detect `## Heading` as category markers
- Assign `category` field based on current heading
- Generate metadata with multiple categories

### Step 3: Update Config.js
```javascript
categories: {
    'all-categories': '🌟 All Categories',
    'academic-vocabulary': '📚 Academic',
    'conversation-basics': '💬 Conversation',
    'business-english': '💼 Business',
    // ...
}
```

### Step 4: Re-enable Category Dropdown
Add back to `index.html`:
```html
<div class="setting-item">
    <label for="categorySelect">Category:</label>
    <select id="categorySelect">
        <option value="all-categories">🌟 All Content</option>
        <!-- Populated dynamically from dataset metadata -->
    </select>
</div>
```

---

## Architecture Diagram

```
User Selects Learning Mode
         ↓
    [pte-beginner]
         ↓
PTEVocabularyManager.setLearningMode('pte-beginner')
         ↓
Load pte-beginner-vocabulary.json (383 words)
         ↓
    allWords = [word1, word2, ...]
         ↓
         ├─→ User Selects Category [future: "academic"]
         │         ↓
         │   PTEVocabularyManager.setCategory('academic')
         │         ↓
         │   Filter: currentWords = allWords.filter(w => w.category === 'academic')
         │
         └─→ User Selects Difficulty [current: "hard"]
                   ↓
             PTEVocabularyManager.setDifficulty('hard')
                   ↓
             Filter: currentWords = currentWords.filter(w => w.difficulty === 'hard')
                   ↓
             Display filtered words
```

---

## Recommendations

### Current State (Phase 2 Complete) ✅
- [x] Category dropdown removed from UI (not useful yet)
- [x] Category filtering code kept in backend (ready for future)
- [x] Documentation updated to explain architecture
- [x] Context bar simplified to show book name + count

### Future Enhancements (Optional) 🔄
- [ ] Add subcategories to vocabulary source files
- [ ] Update data pipeline to extract categories from headings
- [ ] Re-enable category dropdown in UI
- [ ] Add category-specific progress tracking
- [ ] Enable cross-dataset category filtering

---

## Code References

**Learning Mode:**
- `PTEVocabularyManager.setLearningMode()` - line 115
- `PTEVocabularyManager.loadWordsForMode()` - line 124
- Config: `pipeline.registry[]` - defines all modes

**Category:**
- `PTEVocabularyManager.setCategory()` - line 184
- `PTEVocabularyManager.applyFilters()` - line 158 (includes category filter)
- `PTEVocabularyManager.getCurrentCategory()` - line 252

**UI:**
- `UIController.updateCategoryDisplay()` - line 232 (updated in Phase 2)
- ~~`index.html` categorySelect dropdown~~ - removed in Phase 2

---

## Summary

**Learning Mode** = Which book to read from  
**Category** = Which chapter within the book to focus on *(not used yet, all books are currently single-chapter)*

The architecture is sound and ready for future expansion. Category system was simplified in Phase 2 but not removed, maintaining backward compatibility and future extensibility.
