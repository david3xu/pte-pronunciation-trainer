# Browser Testing Checklist 🧪

**Date**: 7 October 2025  
**Purpose**: Verify Phase 2 implementation and CSS refactoring

---

## Test Environment Setup

### Start Development Server
```bash
cd ~/eng-workspace/ccl-pronunciation-trainer
python3 -m http.server 8000
# Or use any local server
# Open: http://localhost:8000
```

### Clear Cache First
- Open DevTools (F12)
- Application → Storage → Clear site data
- Hard reload (Ctrl+Shift+R or Cmd+Shift+R)

---

## 1. ✅ CSS Loading & Styling

### Test: Files Load Correctly
- [ ] Open DevTools → Network tab
- [ ] Refresh page
- [ ] Verify all CSS files load (200 status):
  - [ ] `variables.css` (6.2K)
  - [ ] `animations.css` (1.8K)
  - [ ] `components.css` (6.7K)
  - [ ] `style.css` (11K)
  - [ ] `practice-modes.css` (9.2K)
  - [ ] `responsive.css` (6.1K)

### Test: No Console Errors
- [ ] DevTools → Console tab
- [ ] No CSS parsing errors
- [ ] No 404 errors for CSS files
- [ ] No JavaScript errors on page load

### Test: Buttons Render Correctly
- [ ] PREV button: Gray background, correct padding
- [ ] PLAY button: Blue background, larger size
- [ ] NEXT button: Gray background, correct padding
- [ ] Settings button (⚙️): Icon displays
- [ ] Fullscreen button: Icon displays
- [ ] All buttons have hover effects

### Test: Color Scheme
- [ ] Page background gradient displays (purple)
- [ ] Main container has white background
- [ ] Text is readable (good contrast)
- [ ] Buttons have correct colors (blue primary, gray secondary)

---

## 2. ✅ Animations Work

### Test: Speaking Animation
- [ ] Click PLAY button
- [ ] Word displays on screen
- [ ] TTS speaks the word
- [ ] **CRITICAL**: Word pulses during speech (opacity + scale)
- [ ] Animation stops when speech ends
- [ ] No jerky or stuttering animation

### Test: Word Change Animation
- [ ] Click NEXT button
- [ ] New word appears
- [ ] **CRITICAL**: Fade-in-up animation plays
- [ ] Smooth transition (no flicker)

### Test: No Animation Conflicts
- [ ] Multiple animations work together
- [ ] No unexpected transform/opacity changes
- [ ] Consistent animation timing

---

## 3. ✅ Vocabulary Mode (Backward Compatibility)

### Test: Basic Functionality
- [ ] Open app, default mode is vocabulary
- [ ] Click PLAY → TTS speaks word
- [ ] Word display shows:
  - [ ] English word
  - [ ] Phonetic spelling
  - [ ] IPA notation
  - [ ] Example sentence (if available)
- [ ] Progress counter works (e.g., "Word 1 of 885")
- [ ] Difficulty badge shows (Easy/Normal/Hard)

### Test: Navigation
- [ ] PREV button goes to previous word
- [ ] NEXT button goes to next word
- [ ] Can navigate through all words without errors

### Test: Settings Panel
- [ ] Click ⚙️ Settings button
- [ ] Panel slides up from bottom
- [ ] Settings visible:
  - [ ] Practice Mode selector (Vocabulary/RS/ASQ/WFD)
  - [ ] Vocabulary Book selector (when in Vocabulary mode)
  - [ ] Category filter
  - [ ] Difficulty filter
  - [ ] Voice selection
  - [ ] Speech rate
  - [ ] Repeat count
- [ ] Can change settings
- [ ] Settings persist on page reload

---

## 4. ✅ Practice Modes (Phase 2)

### Test: Mode Switching
- [ ] Open Settings
- [ ] Change "Practice Mode" dropdown to "RS (Repeat Sentence)"
- [ ] Vocabulary Book selector hides
- [ ] Practice Dataset selector appears
- [ ] Display switches to RS practice interface
- [ ] No JavaScript errors

### Test: RS (Repeat Sentence) Mode
- [ ] Interface displays:
  - [ ] Header: "Repeat Sentence Practice"
  - [ ] Sentence text (can be hidden)
  - [ ] Metadata (difficulty, category, word count)
  - [ ] "🔊 Listen" button
  - [ ] "👁️ Show Text" / "🙈 Hide Text" button
  - [ ] "🎤 Record" button
  - [ ] "⏭️ Next Sentence" button
- [ ] Click "Listen" → TTS speaks sentence
- [ ] Click "Show/Hide Text" → Text visibility toggles
- [ ] Click "Record" → Recording starts (browser permission)
- [ ] Recording indicator shows
- [ ] Click "Stop Recording" → Audio saves
- [ ] Playback controls appear
- [ ] Can play recorded audio
- [ ] Click "Next" → New sentence loads

### Test: ASQ (Answer Short Question) Mode
- [ ] Switch to ASQ mode in settings
- [ ] Interface displays:
  - [ ] Header: "Answer Short Question Practice"
  - [ ] Question text (can be hidden)
  - [ ] Metadata
  - [ ] "🔊 Listen" button
  - [ ] "👁️ Show Question" button
  - [ ] Answer input field
  - [ ] "✅ Check Answer" button
  - [ ] "⏭️ Next Question" button
- [ ] Click "Listen" → TTS speaks question
- [ ] Type answer in input field
- [ ] Click "Check Answer" → Feedback shows
  - [ ] Correct answer: Green feedback
  - [ ] Close answer: Yellow feedback (fuzzy match)
  - [ ] Wrong answer: Red feedback with correct answer
- [ ] Click "Next" → New question loads

### Test: WFD (Write From Dictation) Mode
- [ ] Switch to WFD mode in settings
- [ ] Interface displays:
  - [ ] Header: "Write From Dictation Practice"
  - [ ] Sentence text (hidden initially)
  - [ ] Metadata
  - [ ] "🔊 Listen" button
  - [ ] "👁️ Show Text" button
  - [ ] Textarea for typing sentence
  - [ ] "✅ Check Sentence" button
  - [ ] "⏭️ Next Sentence" button
- [ ] Click "Listen" → TTS speaks sentence
- [ ] Type sentence in textarea
- [ ] Click "Check" → Word-by-word comparison shows
  - [ ] Correct words: Green
  - [ ] Wrong words: Red underline
  - [ ] Missing words: Orange italic
  - [ ] Extra words: Gray strikethrough
- [ ] Accuracy percentage displays
- [ ] Correct sentence shows if mistakes made
- [ ] Click "Next" → New sentence loads

---

## 5. ✅ Dark Mode

### Test: System Dark Mode
- [ ] OS Settings → Enable Dark Mode
- [ ] Refresh page
- [ ] Page switches to dark theme:
  - [ ] Dark background gradient
  - [ ] Dark card backgrounds
  - [ ] Light text (good contrast)
  - [ ] Border colors adjusted
  - [ ] Shadows stronger
- [ ] All text is readable
- [ ] No color contrast issues

### Test: Light Mode Return
- [ ] OS Settings → Disable Dark Mode
- [ ] Refresh page
- [ ] Page switches back to light theme
- [ ] All colors correct

---

## 6. ✅ Responsive Design

### Test: Desktop (1920x1080)
- [ ] Layout uses full width (max 800px container)
- [ ] Large font sizes
- [ ] Settings panel full width
- [ ] Buttons in horizontal row
- [ ] All content visible without scrolling

### Test: Tablet (768px)
- [ ] Container adjusts to tablet width
- [ ] Font sizes scale down
- [ ] Buttons remain in row
- [ ] Settings panel scrollable if needed
- [ ] Touch targets adequate (44px min)

### Test: Mobile (375px)
- [ ] Container fills screen width
- [ ] Font sizes readable
- [ ] Buttons stack vertically (if needed)
- [ ] Settings panel uses full height
- [ ] No horizontal scrolling
- [ ] Touch-friendly spacing

### Test: Small Mobile (320px)
- [ ] All content fits without overflow
- [ ] Text doesn't break layout
- [ ] Buttons remain accessible
- [ ] Settings remain usable

---

## 7. ✅ Offline Mode (PWA)

### Test: Service Worker
- [ ] DevTools → Application → Service Workers
- [ ] Service worker registered and active
- [ ] Cache version: `pte-trainer-v23`

### Test: Offline Access
- [ ] Close all tabs
- [ ] DevTools → Network → Offline checkbox
- [ ] Open app URL
- [ ] App loads from cache
- [ ] Basic navigation works
- [ ] TTS may not work (requires network)
- [ ] No major errors

### Test: Cache Contents
- [ ] DevTools → Application → Cache Storage
- [ ] `pte-trainer-v23` cache exists
- [ ] Contains all CSS files:
  - [ ] variables.css
  - [ ] animations.css
  - [ ] components.css
  - [ ] style.css
  - [ ] practice-modes.css
- [ ] Contains all JS files
- [ ] Contains all JSON datasets

---

## 8. ✅ Data Loading

### Test: Vocabulary Datasets
- [ ] Settings → Vocabulary Book → "PTE FIB Listening"
- [ ] 885 words load
- [ ] No loading errors
- [ ] Can browse all words

- [ ] Switch to "PTE Beginner"
- [ ] 620 words load
- [ ] Can browse all words

- [ ] Switch to "PTE Intermediate"
- [ ] 692 words load
- [ ] Can browse all words

### Test: Practice Datasets
- [ ] Settings → Practice Mode → "RS"
- [ ] 1,912 sentences load
- [ ] Can browse sentences
- [ ] All metadata present

- [ ] Switch to "ASQ"
- [ ] 383 questions load
- [ ] Can browse questions
- [ ] Answers available

- [ ] Switch to "WFD"
- [ ] 1,195 sentences load
- [ ] Can browse sentences

---

## 9. ✅ Performance

### Test: Page Load Speed
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] DevTools → Network → Check timing
- [ ] Total load time < 2 seconds
- [ ] CSS loads in < 500ms
- [ ] First paint < 1 second

### Test: Smooth Interactions
- [ ] Clicking buttons feels responsive
- [ ] Mode switching is smooth
- [ ] No lag when typing in inputs
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts or flicker

---

## 10. ✅ Browser Compatibility

### Test in Multiple Browsers
- [ ] Chrome/Edge (Chromium)
  - [ ] All features work
  - [ ] Animations smooth
  - [ ] TTS works
- [ ] Firefox
  - [ ] All features work
  - [ ] CSS variables supported
  - [ ] TTS works
- [ ] Safari (if available)
  - [ ] All features work
  - [ ] CSS animations work
  - [ ] TTS works

---

## Known Issues to Watch For

### From CSS Refactoring
- [ ] Animation collision (should be fixed)
- [ ] Button styling inconsistency (should be fixed)
- [ ] Input styling conflicts (should be fixed)

### Potential Issues
- [ ] TTS not working (check browser support)
- [ ] Recording not working (check microphone permission)
- [ ] Service worker not updating (hard refresh needed)
- [ ] CSS not loading (check file paths)

---

## Bug Report Template

If you find issues, document them:

```markdown
### Bug: [Short Description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**: 
**Actual**: 
**Browser**: 
**Console Errors**: 
**Screenshot**: 
```

---

## Sign-Off

**Tester**: _______________  
**Date**: _______________  
**Result**: ⬜ PASS ⬜ FAIL ⬜ PASS WITH ISSUES

**Notes**:
```


```

---

**Next Steps After Testing**:
- Fix any bugs found
- Update documentation
- Prepare for deployment
