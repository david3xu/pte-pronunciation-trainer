# Mobile Testing Guide

**Date:** 10 October 2025  
**Purpose:** Verify mobile overflow fixes on actual devices

---

## ✅ Fixes Applied

### 1. **Button Text Shortened**
- **Before:** `❌ NO VOCABULARY` (16 chars)
- **After:** `❌ NO DATA` (9 chars)
- **Impact:** Prevents layout shift on narrow screens
- **File:** `src/js/ui/UIController.js` line 766

### 2. **Flex-Wrap Added**
- **Change:** Added `flex-wrap: wrap` to `.primary-controls`
- **Impact:** Buttons wrap to next line instead of overflowing
- **File:** `src/css/style.css` line 206

### 3. **Text Overflow Prevention**
- **Changes:**
  - Added `max-width: 100%`
  - Added `overflow-wrap: break-word`
  - Added `hyphens: auto`
  - Added `padding: 0 10px`
- **Impact:** Long words (e.g., "Ophthalmology") wrap properly
- **File:** `src/css/style.css` lines 74-85

### 4. **Responsive Font Scaling**
- **Change:** Added `font-size: clamp(24px, 7vw, 32px)` for < 375px screens
- **Impact:** Text scales down on iPhone SE (320px)
- **File:** `src/css/responsive.css` lines 81-84

### 5. **Mobile Button Adjustments**
- **Changes:**
  - Reduced gap from 20px to 10px on small screens
  - Added padding: 0 10px to controls
  - Reduced min-width to 70px for buttons
- **Impact:** Buttons fit better on narrow viewports
- **File:** `src/css/responsive.css` lines 86-93

---

## 📱 Testing Checklist

### Test on These Devices:

#### iPhone SE (320px width) - **CRITICAL**
- [ ] Open app in Safari
- [ ] Check word: "Ophthalmology"
  - [ ] No horizontal scroll
  - [ ] Word wraps or hyphenates
  - [ ] Text stays within viewport
- [ ] Click through vocabulary
  - [ ] Button text changes: PLAY ↔ NO DATA
  - [ ] No layout shift or jumping
  - [ ] All 3 buttons visible
- [ ] Check buttons wrap properly
  - [ ] If viewport too narrow, buttons stack
  - [ ] No button cutoff

#### iPhone 8 (375px width)
- [ ] Same tests as iPhone SE
- [ ] Buttons should NOT wrap at this width

#### iPhone 12/13 (390px width)
- [ ] Same tests
- [ ] Should match desktop behavior more closely

#### Android (Samsung Galaxy S8 - 360px)
- [ ] Test in Chrome mobile
- [ ] Same word/button tests

---

## 🔍 Specific Test Cases

### Test Case 1: Long Words
**Words to test:**
1. Ophthalmology (14 chars)
2. Autobiography (14 chars)
3. Community service (17 chars with space)

**Expected behavior:**
- Text wraps to multiple lines
- Hyphenation visible (e.g., "Ophthal-mology")
- No horizontal scroll
- Word stays centered

**Test on:** iPhone SE (320px)

---

### Test Case 2: Button Layout Shift
**Steps:**
1. Load app with vocabulary
2. Button shows: "▶️ PLAY"
3. Switch to empty vocabulary book
4. Button changes to: "❌ NO DATA"

**Expected behavior:**
- Button width stays relatively stable
- No jumping or layout shift
- Other buttons (PREV/NEXT) don't move
- Tooltip shows full context

**Test on:** All devices

---

### Test Case 3: Three-Button Wrap
**Steps:**
1. Open on iPhone SE (320px)
2. Rotate to portrait mode
3. Check button layout

**Expected behavior:**
- If buttons don't fit: They wrap to 2 rows
  - Row 1: [PREV] [PLAY/NO DATA]
  - Row 2: [NEXT]
- If they fit: Stay in one row with 10px gap
- No cutoff or overflow

**Test on:** iPhone SE specifically

---

### Test Case 4: Landscape Mode
**Steps:**
1. Rotate device to landscape
2. Check layout

**Expected behavior:**
- Text should be smaller (responsive.css line 294)
- All content visible without scroll
- Buttons in one row

**Test on:** iPhone SE landscape (568px wide)

---

## 🎯 Success Criteria

### Visual Checks:
✅ **No horizontal scrollbar** appears on any screen  
✅ **No text cutoff** - all content within viewport  
✅ **No layout jumping** when button text changes  
✅ **Touch targets ≥ 44px** (WCAG AA compliance)  

### Performance Checks:
✅ **Cumulative Layout Shift (CLS) < 0.1**  
✅ **No JavaScript errors** in console  
✅ **Smooth animations** (60fps transitions)  

---

## 🐛 Known Issues (If Found)

### If horizontal scroll appears:
1. Check which element is overflowing:
   ```javascript
   // Run in browser console
   document.querySelectorAll('*').forEach(el => {
     if (el.scrollWidth > el.clientWidth) {
       console.log('Overflow:', el, el.scrollWidth, el.clientWidth);
     }
   });
   ```

2. Report element ID/class
3. Take screenshot

### If buttons still wrap unexpectedly:
1. Check viewport width: `window.innerWidth`
2. Check button widths in DevTools
3. Verify `flex-wrap: wrap` is applied
4. Screenshot the issue

---

## 📊 Browser DevTools Testing

### Chrome DevTools (Ctrl+Shift+M):
```
1. Open DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone SE" from dropdown
4. Test portrait: 320 × 568
5. Test landscape: 568 × 320
6. Check for overflow indicators (blue lines)
```

### Lighthouse Mobile Audit:
```
1. Open DevTools > Lighthouse tab
2. Select "Mobile" device
3. Run audit
4. Check:
   - CLS score
   - Touch target sizes
   - Viewport configuration
```

---

## 🔧 Quick Fixes (If Issues Found)

### If text still overflows:
```css
/* Add to responsive.css */
@media (max-width: 319px) {
  .english-word {
    font-size: 20px !important;
  }
}
```

### If buttons don't wrap:
```css
/* Verify in style.css */
.primary-controls {
  flex-wrap: wrap; /* ← Must be present */
}
```

### If button text too long:
```javascript
// Further shorten in UIController.js
startBtn.textContent = hasVocabulary ? '▶️' : '❌';
```

---

## 📝 Test Results Template

```
Device: iPhone SE (320px)
Date: YYYY-MM-DD
Tester: [Your Name]

Long Words Test:
- Ophthalmology: [PASS/FAIL]
- Screenshot: [link]

Button Layout:
- PLAY state: [PASS/FAIL]
- NO DATA state: [PASS/FAIL]
- Layout shift: [PASS/FAIL]

Button Wrap:
- Portrait: [PASS/FAIL]
- Landscape: [PASS/FAIL]

Overflow Check:
- Horizontal scroll: [YES/NO]
- Text cutoff: [YES/NO]

Notes:
[Any additional observations]
```

---

## 🚀 Next Steps After Testing

1. [ ] Test on physical iPhone SE
2. [ ] Test on physical Android device
3. [ ] Run Lighthouse mobile audit
4. [ ] Fix any found issues
5. [ ] Update MOBILE-OVERFLOW-ISSUES.md with results
6. [ ] Mark issues as resolved or create follow-up tasks

---

**End of Testing Guide**
