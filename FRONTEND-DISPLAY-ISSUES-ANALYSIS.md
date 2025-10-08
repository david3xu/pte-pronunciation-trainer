# Frontend Display Issues Analysis - Different Books

## 🔍 Issue Summary

**Problem**: The codebase has **TWO DIFFERENT DISPLAY SYSTEMS** that handle vocabulary books:

1. **OLD SYSTEM** (Legacy CCL) - Uses `displayWord()` for conversation vocabulary
2. **NEW SYSTEM** (PTE) - Uses `displayContent()` for PTE vocabulary books + practice modes

This creates **inconsistent behavior** when switching between different vocabulary books!

---

## 🚨 Critical Issues Found

### Issue #1: **Mixed Display Functions**

**File**: `UIController.js`

**Two separate display methods**:

```javascript
// OLD METHOD - Used for CCL conversation vocabulary
displayWord(word, index) {
    // Lines 254-420
    // Handles: phoneticSpelling, english, IPA, example, definition
    // Works with: window.pteVocabularyManager
}

// NEW METHOD - Used for PTE practice modes (RS/ASQ/WFD)
displayContent(item, mode) {
    // Lines 730-850
    // Handles: Same UI elements but different data structure
    // Works with: window.currentDataset, window.currentItem
}
```

**Problem**: When user switches between:
- **PTE Vocabulary Books** (FIB, Beginner, etc.) → Uses `displayWord()`
- **Practice Modes** (RS/ASQ/WFD) → Uses `displayContent()`

But both use the **SAME DOM elements**! This causes display confusion.

---

### Issue #2: **Inconsistent Event Handlers**

**File**: `UIController.js` (Lines 38-55)

```javascript
// Listen for word display events
window.eventBus.on('word:display', (data) => {
    this.displayWord(data.word, data.index);  // ❌ ONLY calls displayWord()
});

// Listen for TTS speaking started
window.eventBus.on('tts:speakingStarted', (data) => {
    if (window.currentPracticeMode === 'vocabulary' || !window.currentPracticeMode) {
        // ✅ Correctly checks practice mode
        const currentWord = window.pteVocabularyManager.getCurrentWord(currentIndex);
        this.displayWord(currentWord, currentIndex);
    }
    // ❌ But doesn't handle practice modes here!
});
```

**Problem**: `word:display` event **ALWAYS** calls `displayWord()`, even in practice modes!

---

### Issue #3: **AudioControls Uses Wrong Display Method**

**File**: `AudioControls.js` (Lines 274-315)

```javascript
// Navigation functions
nextWord() {
    // ...
    this.updateCurrentDisplay();  // ❌ Calls displayWord() for ALL modes
}

previousWord() {
    // ...
    this.updateCurrentDisplay();  // ❌ Calls displayWord() for ALL modes
}

updateCurrentDisplay() {
    const currentWord = window.pteVocabularyManager.getCurrentWord(this.currentIndex);
    if (currentWord) {
        window.eventBus.emit('word:display', {  // ❌ Only vocabulary mode
            word: currentWord,
            index: this.currentIndex
        });
    }
    // ⚠️ Missing: Check for practice mode and call displayContent() instead
}
```

**Problem**: PREV/NEXT buttons **ONLY work for vocabulary mode**, not practice modes!

---

### Issue #4: **Duplicate Manager Systems**

**Two separate vocabulary managers**:

```javascript
// OLD: VocabularyManager.js (Lines 1-1100+)
// - Used for CCL conversation vocabulary
// - Has: getCurrentWord(), loadCategory(), etc.
window.vocabularyManager  // ❌ Old reference still exists in some code

// NEW: PTEVocabularyManager.js (Lines 1-350)
// - Used for PTE vocabulary books
// - Has: setLearningMode(), loadDataset(), etc.
window.pteVocabularyManager  // ✅ Current PTE system
```

**Grep results show mixed usage**:
```javascript
// AudioControls.js Line 300 - OLD REFERENCE
const currentWord = window.vocabularyManager.getCurrentWord(this.currentIndex);

// AudioControls.js Line 135 - NEW REFERENCE
const currentWord = window.pteVocabularyManager.getCurrentWord(currentIndex);
```

**Problem**: Code references **BOTH managers** inconsistently!

---

### Issue #5: **Practice Mode Navigation Broken**

**File**: `AudioControls.js` (Lines 24-40)

```javascript
window.eventBus.on('audio:next', ({ mode }) => {
    if (mode && mode !== 'vocabulary') {
        this.nextItem();  // ✅ Calls practice mode function
    } else {
        this.nextWord();  // ✅ Calls vocabulary function
    }
});
```

**But the NEXT/PREV button event listeners**:

```javascript
// UIController.js Lines 90-95 (bindEventListeners)
document.getElementById('nextBtn').addEventListener('click', () => {
    window.audioControls.nextWord();  // ❌ ALWAYS calls vocabulary version!
});

document.getElementById('prevBtn').addEventListener('click', () => {
    window.audioControls.previousWord();  // ❌ ALWAYS calls vocabulary version!
});
```

**Problem**: Button clicks **ignore practice mode** and always use vocabulary navigation!

---

## 📊 Impact Assessment

### Affected Functionality

| Feature | Vocabulary Books | Practice Modes (RS/ASQ/WFD) | Status |
|---------|-----------------|----------------------------|---------|
| **Display Content** | ✅ `displayWord()` | ✅ `displayContent()` | ✅ Both work separately |
| **PLAY Button** | ✅ Works | ✅ Works | ✅ Handles both modes |
| **NEXT Button** | ✅ Works | ❌ Calls wrong function | 🔴 **BROKEN** |
| **PREV Button** | ✅ Works | ❌ Calls wrong function | 🔴 **BROKEN** |
| **Auto-play** | ✅ Works | ✅ Works | ✅ Handles both modes |
| **Event Sync** | ✅ Works | ⚠️ Partial | 🟡 **INCONSISTENT** |

---

## 🔧 Root Causes

### 1. **Legacy Code Retention**
- Old CCL conversation vocabulary system (`VocabularyManager`) still exists
- New PTE system (`PTEVocabularyManager`) added on top
- Code references both managers inconsistently

### 2. **Duplicate Display Logic**
- `displayWord()` - Old function for CCL format
- `displayContent()` - New function for PTE format
- Both manipulate same DOM elements with different logic

### 3. **Hard-coded Button Handlers**
```javascript
// UIController.js - Button clicks are hard-coded
document.getElementById('nextBtn').addEventListener('click', () => {
    window.audioControls.nextWord();  // ❌ No mode check!
});
```

Should be:
```javascript
document.getElementById('nextBtn').addEventListener('click', () => {
    const mode = window.currentPracticeMode || 'vocabulary';
    if (mode === 'vocabulary') {
        window.audioControls.nextWord();
    } else {
        window.audioControls.nextItem();
    }
});
```

### 4. **Event Bus Inconsistency**
- `word:display` event → Only works for vocabulary
- No `item:display` event for practice modes
- TTS events check mode, but display events don't

---

## 🎯 Recommendations

### Priority 1: **Unify Display System**
```javascript
// Create unified display method
displayCurrent() {
    const mode = window.currentPracticeMode || 'vocabulary';
    
    if (mode === 'vocabulary') {
        const word = window.pteVocabularyManager.getCurrentWord(this.currentIndex);
        this.displayWord(word, this.currentIndex);
    } else {
        const item = window.currentItem;
        this.displayContent(item, mode);
    }
}
```

### Priority 2: **Fix Navigation Buttons**
```javascript
// UIController.js - Make buttons mode-aware
document.getElementById('nextBtn').addEventListener('click', () => {
    window.eventBus.emit('audio:next', { 
        mode: window.currentPracticeMode || 'vocabulary' 
    });
});

document.getElementById('prevBtn').addEventListener('click', () => {
    window.eventBus.emit('audio:prev', { 
        mode: window.currentPracticeMode || 'vocabulary' 
    });
});
```

### Priority 3: **Remove Legacy References**
```bash
# Search and replace all instances
window.vocabularyManager → window.pteVocabularyManager
```

### Priority 4: **Unified Event System**
```javascript
// Replace word:display with unified event
window.eventBus.emit('content:display', {
    mode: 'vocabulary' | 'rs' | 'asq' | 'wfd',
    data: word | item,
    index: currentIndex
});
```

---

## 📝 Testing Checklist

After fixes, test:

- [ ] Switch from FIB Listening → Beginner → Advanced (vocabulary books)
- [ ] Switch from Vocabulary → RS → ASQ → WFD (practice modes)
- [ ] Click NEXT in vocabulary mode
- [ ] Click NEXT in RS mode
- [ ] Click PREV in vocabulary mode
- [ ] Click PREV in ASQ mode
- [ ] Press PLAY in each mode
- [ ] Auto-play through multiple books
- [ ] Auto-play through practice datasets

---

## 🏁 Conclusion

**The issue**: The codebase **evolved** from CCL (conversation vocabulary) to PTE (test preparation) by **adding new code on top** of old code, rather than **refactoring** the old code.

**Result**: 
- ✅ Both systems work **independently**
- ❌ Navigation buttons are **hard-coded** for vocabulary mode
- ❌ Display events don't check current mode
- ❌ Mixed references to old and new managers

**Solution**: Implement mode-aware navigation and unified display system.

---

**Date**: October 8, 2025  
**Version**: v2.3 Production Ready  
**Priority**: High - Affects user experience when switching modes
