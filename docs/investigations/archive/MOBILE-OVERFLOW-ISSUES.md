# Mobile Overflow Issues Investigation

**Date:** 10 October 2025  
**Issue:** Text content overflow on mobile + Button size changes  
**Reporter:** User observation on mobile device

---

## 🔍 Issues Found

### Issue #1: Button Text Changes Dynamically (PLAY → NO VOCABULARY)

**Location:** `src/js/ui/UIController.js` line 764

```javascript
startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌ NO VOCABULARY';
```

**Problem:**
- Button switches from short text `"▶️ PLAY"` (6 chars) to long text `"❌ NO VOCABULARY"` (16 chars)
- On mobile, this causes button width to expand/contract
- Creates layout shift and potential overflow

**Visual Impact:**
```
Normal:     [⏮️ PREV]  [▶️ PLAY]  [⏭️ NEXT]
No Vocab:   [⏮️ PREV]  [❌ NO VOCABULARY]  [⏭️ NEXT]
                           ↑
                    Button stretches!
```

---

### Issue #2: Long Words May Overflow Container on Small Screens

**Location:** Various text display elements

**Current CSS (style.css line 74-79):**
```css
.english-word {
    font-size: 48px;           /* Fixed at 48px on desktop */
    font-weight: 700;
    color: var(--color-blue);
    word-wrap: break-word;     /* ← Wraps but doesn't scale */
    line-height: 1.2;
}
```

**Mobile CSS (style.css line 373-375):**
```css
@media (max-width: 640px) {
    .english-word {
        font-size: 40px;       /* Still quite large! */
    }
}
```

**Problem:**
- Long words like "Ophthalmology" (14 chars) at 40px font size
- Calculate: 14 chars × ~24px avg char width = ~336px minimum
- Mobile viewport: 320px (iPhone SE) to 375px (iPhone 8)
- **OVERFLOW POTENTIAL!**

**Actual Test Cases to Check:**
1. "Ophthalmology" - 14 characters
2. "Autobiography" - 14 characters  
3. "Community service" - 17 characters (with space)
4. Long example sentences

---

### Issue #3: `.primary-controls` Flex Layout May Wrap Awkwardly

**Location:** `src/css/style.css` line 200-206

```css
.primary-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-bottom: 15px;
}
```

**Missing:** No `flex-wrap` property!

**Problem:**
- On very small screens (< 320px), 3 buttons with 20px gap may overflow
- Button calculation:
  - PREV button: ~80px (⏮️ PREV)
  - PLAY button: ~80px normally, **~160px** when "NO VOCABULARY"
  - NEXT button: ~80px (⏭️ NEXT)
  - Gaps: 2 × 20px = 40px
  - **Total: 280px normal, 360px with NO VOCABULARY**
  - **320px viewport = OVERFLOW!**

---

### Issue #4: Responsive CSS Has Conflicting Breakpoints

**Two different responsive systems:**

1. **Legacy (`style.css`):**
   ```css
   @media (max-width: 640px) { ... }
   @media (max-width: 767px) { ... }
   @media (min-width: 768px) { ... }
   ```

2. **Modern (`responsive.css`):**
   ```css
   /* Base mobile: 320px+ */
   @media (max-width: 374px) { ... }
   @media (min-width: 375px) and (max-width: 767px) { ... }
   @media (min-width: 768px) and (max-width: 991px) { ... }
   ```

**Conflict Example:**
- At 640px width: Both old and new rules may apply!
- Could cause double-sizing or CSS specificity battles

---

## 🔧 Root Causes

### 1. **Dynamic Button Text Without Width Constraints**

```javascript
// UIController.js line 764
startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌ NO VOCABULARY';
```

**Why It's Bad:**
- ❌ Violates visual consistency
- ❌ Causes layout shift (CLS - Core Web Vital)
- ❌ No `min-width` or `max-width` on button

### 2. **No Container Max-Width for Word Display**

```css
.english-word {
    font-size: 48px;
    word-wrap: break-word;  /* Wraps but doesn't prevent overflow */
}
```

**Missing:**
```css
.english-word {
    max-width: 100%;        /* ← Not set! */
    box-sizing: border-box; /* ← Not set! */
    overflow-wrap: break-word; /* ← Modern alternative */
}
```

### 3. **No Flex-Wrap on Primary Controls**

```css
.primary-controls {
    display: flex;
    /* Missing: flex-wrap: wrap; */
}
```

**Result:** Buttons can overflow on narrow viewports

---

## 🎯 Recommended Fixes

### Fix #1: Stabilize Button Width

**Option A: Use Icon-Only State (Preferred)**
```javascript
// UIController.js line 764
startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌';
startBtn.title = hasVocabulary ? 'Play' : 'No vocabulary loaded';
// Now both states are similar width!
```

**Option B: Set Fixed Min-Width**
```css
/* components.css or style.css */
.btn--large {
    min-width: 120px;  /* Accommodate longest text */
    max-width: 180px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}
```

**Option C: Use Separate Button States (Best UX)**
```html
<button id="startBtn" class="btn btn--primary btn--large">▶️ PLAY</button>
<button id="noVocabBtn" class="btn btn--danger btn--large" style="display: none;">
    ❌ NO DATA
</button>
```

### Fix #2: Add Container Constraints for Long Words

```css
/* style.css - Add to .english-word */
.english-word {
    font-size: 48px;
    max-width: 100%;           /* ← ADD: Prevent overflow */
    box-sizing: border-box;    /* ← ADD: Include padding in width */
    overflow-wrap: break-word; /* ← ADD: Modern break-word */
    hyphens: auto;             /* ← ADD: Hyphenate long words */
    padding: 0 10px;           /* ← ADD: Breathing room on sides */
}
```

**Mobile Enhancement:**
```css
@media (max-width: 374px) {
    .english-word {
        font-size: clamp(24px, 8vw, 32px); /* ← Scale down on tiny screens */
    }
}
```

### Fix #3: Add Flex-Wrap to Primary Controls

```css
/* style.css line 200 */
.primary-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin-bottom: 15px;
    flex-wrap: wrap;  /* ← ADD: Allow wrapping on narrow screens */
}
```

**Mobile-Specific:**
```css
@media (max-width: 374px) {
    .primary-controls {
        gap: 10px;        /* ← Reduce gap on small screens */
        padding: 0 10px;  /* ← Add side padding */
    }
    
    .btn {
        min-width: 80px;  /* ← Smaller buttons on mobile */
        padding: 0.5rem 0.75rem;
    }
}
```

### Fix #4: Consolidate Responsive Breakpoints

**Strategy: Migrate all to responsive.css**

1. Mark legacy breakpoints in `style.css`:
```css
/* TODO: MIGRATE TO responsive.css */
@media (max-width: 640px) {
    /* Legacy mobile styles */
}
```

2. Add comprehensive mobile rules in `responsive.css`:
```css
/* === EXTRA SMALL MOBILE (< 320px) === */
@media (max-width: 319px) {
    .english-word {
        font-size: clamp(20px, 6vw, 28px);
    }
    
    .primary-controls {
        flex-direction: column;
        gap: 8px;
    }
    
    .btn {
        width: 100%;
        min-width: 0;
    }
}
```

---

## 📊 Testing Checklist

### Devices to Test:
- [ ] iPhone SE (320px width) - Smallest common viewport
- [ ] iPhone 8 (375px width) - Most common mobile
- [ ] iPhone 12/13 (390px width) - Modern standard
- [ ] Samsung Galaxy S8 (360px width)
- [ ] iPad Mini (768px width) - Tablet

### Test Scenarios:

#### Scenario 1: Long Word Display
```
Word: "Ophthalmology" (14 chars)
Expected: Word wraps or hyphenates, no horizontal scroll
Actual: [ ] PASS [ ] FAIL
```

#### Scenario 2: Button State Change
```
Action: Load vocabulary with no data
Expected: Button changes text without layout shift
Actual: [ ] PASS [ ] FAIL
```

#### Scenario 3: Three-Button Layout
```
Screen: 320px width
Expected: All three buttons visible, possibly wrapped
Actual: [ ] PASS [ ] FAIL
```

#### Scenario 4: Example Sentence Overflow
```
Text: Long example sentence (> 100 chars)
Expected: Text wraps within container, no overflow
Actual: [ ] PASS [ ] FAIL
```

### Performance Metrics:
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] No horizontal scrollbar appears
- [ ] Touch targets ≥ 44px (WCAG compliance)

---

## 🚀 Implementation Priority

### Priority 1: Critical (Fix Immediately)
1. ✅ **Button Text Stabilization** - Prevents layout shift
2. ✅ **Add flex-wrap to primary-controls** - Prevents button overflow
3. ✅ **Add max-width: 100% to .english-word** - Prevents text overflow

### Priority 2: Important (Fix Soon)
4. ⚠️ **Add responsive font scaling** - Better small-screen UX
5. ⚠️ **Consolidate breakpoints** - Reduce CSS conflicts

### Priority 3: Enhancement (Nice to Have)
6. 📝 **Add hyphenation support** - Better typography
7. 📝 **Improve button touch targets** - Better accessibility

---

## 💡 Code Violations Found

### Violation 1: Dynamic Content Without Constraints
```javascript
// UIController.js line 764
startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌ NO VOCABULARY';
```
**Violates:** UX Best Practice - Consistent button sizing  
**Fix:** Use shorter text or fixed width

### Violation 2: Missing Box Model Properties
```css
.english-word {
    /* Missing: max-width, box-sizing, overflow-wrap */
}
```
**Violates:** Defensive CSS - Prevent overflow  
**Fix:** Add container constraints

### Violation 3: No Flex Fallback
```css
.primary-controls {
    display: flex;
    /* Missing: flex-wrap */
}
```
**Violates:** Responsive Design - Handle narrow viewports  
**Fix:** Add flex-wrap: wrap

---

## 📸 Visual Examples

### Before Fix (PROBLEM):
```
┌─────────────────────────────────────┐ 320px viewport
│ ┌─────────────────────────────────┐ │
│ │   Ophthalmology                 │ │ ← Overflows!
│ └─────────────────────────────────┘ │
│                                     │
│ [⏮️ PREV] [❌ NO VOCABULARY] [⏭️ ]  │ ← Button cut off!
└─────────────────────────────────────┘
```

### After Fix (SOLUTION):
```
┌─────────────────────────────────────┐ 320px viewport
│ ┌─────────────────────────────────┐ │
│ │   Ophthal-                      │ │ ← Hyphenated!
│ │   mology                        │ │
│ └─────────────────────────────────┘ │
│                                     │
│     [⏮️ PREV]  [▶️ PLAY]            │ ← Wraps nicely!
│     [⏭️ NEXT]                       │
└─────────────────────────────────────┘
```

---

## 🎓 Lessons Learned

1. **Always test on actual small devices** - Simulators can miss real-world issues
2. **Dynamic text content needs width constraints** - Or use icon-only states
3. **Mobile-first CSS prevents these issues** - But we have legacy desktop-first code
4. **Flex layouts need wrap strategies** - Especially for buttons
5. **Long words are real** - Medical, scientific, compound words exist!

---

## Next Steps

1. [ ] Apply Priority 1 fixes (button text, flex-wrap, max-width)
2. [ ] Test on physical iPhone SE (320px)
3. [ ] Run Lighthouse mobile audit
4. [ ] Update ARCHITECTURE.md with mobile constraints
5. [ ] Add mobile testing to pre-commit checklist

---

**End of Investigation**
