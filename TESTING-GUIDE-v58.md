# Phase 1 Refactoring - Testing Guide

## 🧪 Manual Testing Checklist

Use this guide to verify that Phase 1 refactoring (v58) works correctly across all modes.

---

## Prerequisites

1. Open the app in a browser: `http://localhost:3001`
2. Open Developer Console (F12) to see logs
3. Clear localStorage to start fresh (optional)

---

## Test Suite 1: Vocabulary Mode Navigation

### Test 1.1: Basic Navigation
- [ ] Click **Settings** → Select "Vocabulary Training" mode
- [ ] Select "PTE FIB Listening" book
- [ ] Click **PLAY** → Should display first word
- [ ] Click **NEXT** → Should advance to word #2
- [ ] Click **PREV** → Should go back to word #1
- [ ] Click **NEXT** 5 times → Should advance through words
- [ ] Verify progress counter updates (e.g., "2/885")

**Expected Result**: ✅ Navigation works smoothly in vocabulary mode

### Test 1.2: Mode Switching from Vocabulary
- [ ] While in vocabulary mode at word #5
- [ ] Click **Settings** → Change to "Repeat Sentence (RS)"
- [ ] Verify RS sentence #1 displays
- [ ] Click **NEXT** → Should show RS sentence #2
- [ ] Click **PREV** → Should show RS sentence #1

**Expected Result**: ✅ Navigation works after switching from vocabulary to practice mode

---

## Test Suite 2: Repeat Sentence (RS) Mode

### Test 2.1: RS Navigation
- [ ] Click **Settings** → Select "Repeat Sentence (RS)"
- [ ] Verify sentence displays with metadata
- [ ] Click **Listen** → Audio plays sentence
- [ ] Click **NEXT** → Shows next sentence
- [ ] Click **PREV** → Shows previous sentence
- [ ] Navigate to sentence #10
- [ ] Click **NEXT** → Should show sentence #11

**Expected Result**: ✅ NEXT/PREV buttons work in RS mode

### Test 2.2: RS Display Verification
- [ ] Verify sentence text displays correctly
- [ ] Verify progress counter shows (e.g., "1/620")
- [ ] Verify "Show Text" button works
- [ ] Verify "Record" button is visible
- [ ] Verify "Listen" button works

**Expected Result**: ✅ All RS UI elements display and function correctly

---

## Test Suite 3: Answer Short Question (ASQ) Mode

### Test 3.1: ASQ Navigation
- [ ] Click **Settings** → Select "Answer Short Question (ASQ)"
- [ ] Verify question displays
- [ ] Click **NEXT** → Shows next question
- [ ] Click **PREV** → Shows previous question
- [ ] Navigate to question #5
- [ ] Answer the question
- [ ] Click **NEXT** → Should show question #6

**Expected Result**: ✅ Navigation works in ASQ mode

### Test 3.2: ASQ Answer Checking
- [ ] Type correct answer → Click "Check Answer"
- [ ] Verify green "Correct!" feedback
- [ ] Type wrong answer → Click "Check Answer"
- [ ] Verify red "Incorrect" feedback
- [ ] Type similar answer → Click "Check Answer"
- [ ] Verify yellow "Close" feedback

**Expected Result**: ✅ Answer checking works correctly

---

## Test Suite 4: Write From Dictation (WFD) Mode

### Test 4.1: WFD Navigation
- [ ] Click **Settings** → Select "Write From Dictation (WFD)"
- [ ] Verify sentence (hidden) with textarea
- [ ] Click **NEXT** → Shows next WFD item
- [ ] Click **PREV** → Shows previous WFD item
- [ ] Navigate to item #10
- [ ] Click **NEXT** → Should show item #11

**Expected Result**: ✅ Navigation works in WFD mode

### Test 4.2: WFD Dictation Checking
- [ ] Click **Listen** → Audio plays
- [ ] Type the sentence in textarea
- [ ] Click "Check Sentence"
- [ ] Verify word-by-word comparison
- [ ] Check for color coding:
  - Green = Correct words
  - Red underline = Wrong words
  - Orange italic = Missing words
  - Gray strikethrough = Extra words

**Expected Result**: ✅ Dictation checking works correctly

---

## Test Suite 5: Mode Switching Stress Test

### Test 5.1: Rapid Mode Switching
- [ ] Start in Vocabulary mode
- [ ] Navigate to word #10
- [ ] Switch to RS mode
- [ ] Click NEXT 3 times (should be at RS #4)
- [ ] Switch to ASQ mode
- [ ] Click PREV 2 times (should be at ASQ #-2 → wrap to end)
- [ ] Switch to WFD mode
- [ ] Click NEXT 5 times
- [ ] Switch back to Vocabulary
- [ ] Verify navigation still works

**Expected Result**: ✅ Navigation remains stable through rapid mode switches

### Test 5.2: Settings Panel Mode Switching
- [ ] Open Settings panel
- [ ] Change mode to RS
- [ ] Close Settings
- [ ] Verify RS mode active
- [ ] Click NEXT → Should work
- [ ] Open Settings again
- [ ] Change mode to Vocabulary
- [ ] Close Settings
- [ ] Click NEXT → Should work

**Expected Result**: ✅ Settings panel mode switching works correctly

---

## Test Suite 6: Event Flow Validation

### Test 6.1: Display Events (Check Console)
- [ ] Open Console (F12)
- [ ] Click **PLAY** in vocabulary mode
- [ ] Look for log: `[UIController] 📺 displayCurrent() called - Mode: vocabulary`
- [ ] Look for log: `[UIController] Displaying word...`
- [ ] Switch to RS mode
- [ ] Click **Listen**
- [ ] Look for log: `[UIController] 📺 displayCurrent() called - Mode: rs`
- [ ] Look for log: `[UIController] displayContent() called - Mode: rs`

**Expected Result**: ✅ Correct display methods called for each mode

### Test 6.2: Navigation Events (Check Console)
- [ ] In vocabulary mode, click NEXT
- [ ] Look for: `[AudioControls] audio:next event received - Mode: vocabulary`
- [ ] Switch to RS mode, click NEXT
- [ ] Look for: `[AudioControls] audio:next event received - Mode: rs`
- [ ] Look for: `[AudioControls] ⏭️ nextItem - Index: X/620`

**Expected Result**: ✅ Correct event flow for each mode

---

## Test Suite 7: Edge Cases

### Test 7.1: End of Dataset
- [ ] In vocabulary mode, navigate to last word (e.g., 885/885)
- [ ] Click NEXT → Should loop to word #1
- [ ] In RS mode, navigate to last sentence (620/620)
- [ ] Click NEXT → Should loop to sentence #1

**Expected Result**: ✅ Looping works at dataset boundaries

### Test 7.2: Beginning of Dataset
- [ ] In vocabulary mode, at word #1
- [ ] Click PREV → Should wrap to last word
- [ ] In WFD mode, at sentence #1
- [ ] Click PREV → Should wrap to last sentence

**Expected Result**: ✅ Wrap-around works at dataset start

### Test 7.3: Empty Dataset (Hypothetical)
- [ ] If dataset fails to load
- [ ] Verify error message shows
- [ ] Verify NEXT/PREV buttons disabled or show error
- [ ] Verify no console errors

**Expected Result**: ✅ Graceful error handling

---

## Test Suite 8: Regression Tests

### Test 8.1: Existing Features Still Work
- [ ] Speed control (Slow/Normal/Fast) works
- [ ] Delay control (Short/Normal/Long) works
- [ ] Repeat mode (Once/Twice/Intensive/Loop) works
- [ ] Voice selection works
- [ ] Difficulty filter works (Easy/Normal/Hard)
- [ ] Progress tracking persists across page refresh
- [ ] Settings save to localStorage

**Expected Result**: ✅ All existing features unaffected

### Test 8.2: Backward Compatibility
- [ ] Old event names still work (`word:display`)
- [ ] Direct calls to `displayWord()` still work
- [ ] Direct calls to `displayContent()` still work
- [ ] Progress tracking with old data format works

**Expected Result**: ✅ Backward compatible, no breaking changes

---

## Pass/Fail Criteria

### ✅ **PASS** if:
- All vocabulary mode navigation tests pass
- All practice mode (RS/ASQ/WFD) navigation tests pass
- Mode switching works smoothly
- Event logs show correct method calls
- No console errors
- Existing features unaffected

### ❌ **FAIL** if:
- Navigation broken in any mode
- NEXT/PREV buttons don't respond
- Mode switching causes errors
- Display shows wrong content
- Console shows errors
- Existing features broken

---

## Bug Reporting Template

If you find issues, report using this template:

```markdown
**Bug**: [Brief description]

**Mode**: [Vocabulary / RS / ASQ / WFD]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**: [What should happen]

**Actual Behavior**: [What actually happened]

**Console Errors**: [Any error messages]

**Browser**: [Chrome/Firefox/Safari/Edge + version]

**Screenshot**: [If applicable]
```

---

## Test Results Log

| Test Suite | Status | Tester | Date | Notes |
|-----------|--------|--------|------|-------|
| Suite 1: Vocabulary Navigation | ⏳ Pending | | | |
| Suite 2: RS Mode | ⏳ Pending | | | |
| Suite 3: ASQ Mode | ⏳ Pending | | | |
| Suite 4: WFD Mode | ⏳ Pending | | | |
| Suite 5: Mode Switching | ⏳ Pending | | | |
| Suite 6: Event Flow | ⏳ Pending | | | |
| Suite 7: Edge Cases | ⏳ Pending | | | |
| Suite 8: Regression | ⏳ Pending | | | |

**Legend**: ⏳ Pending | ✅ Pass | ❌ Fail | ⚠️ Warning

---

**Testing Version**: v58  
**Last Updated**: October 8, 2025  
**Estimated Testing Time**: 30-45 minutes (full suite)
