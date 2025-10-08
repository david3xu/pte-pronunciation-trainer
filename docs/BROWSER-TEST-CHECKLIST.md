# Browser Test Checklist - Settings Module Migration

**Test Date:** _________________  
**Tester:** _________________  
**Browser:** _________________  
**Status:** ⏳ Pending

---

## Pre-Test Setup

- [ ] Open browser DevTools (F12)
- [ ] Open Console tab to monitor for errors
- [ ] Clear browser cache and localStorage: `localStorage.clear()`
- [ ] Open `index.html` in browser
- [ ] Verify no console errors on page load

---

## 1. Initial Load Tests

### 1.1 Page Load
- [ ] ✅ Page loads without errors
- [ ] ✅ No red errors in console
- [ ] ✅ "Press PLAY to start learning" displayed
- [ ] ✅ Settings button (⚙️) visible

### 1.2 Module Initialization
Check console for these messages:
- [ ] ✅ `EventBus initialized`
- [ ] ✅ `Storage initialized`
- [ ] ✅ `SettingsModule initialized` (verify NEW module)
- [ ] ❌ `SettingsManager` NOT mentioned (old module removed)
- [ ] ✅ `PTEVocabularyManager initialized`
- [ ] ✅ `DatasetManager initialized`

---

## 2. Settings Panel Tests

### 2.1 Open Settings Panel
- [ ] Click settings button (⚙️)
- [ ] Panel slides open smoothly
- [ ] All 8 dropdowns visible:
  - [ ] Practice Type
  - [ ] Vocabulary Book (if Practice Type = vocabulary)
  - [ ] Dataset (if Practice Type = RS/ASQ/WFD)
  - [ ] Difficulty Level
  - [ ] Speed
  - [ ] Pause
  - [ ] Repeat
  - [ ] Voice

### 2.2 Dropdown Population
Verify each dropdown has options:
- [ ] **Practice Type**: vocabulary, rs, asq, wfd
- [ ] **Vocabulary Book**: beginner, intermediate, advanced, aiml-terms, etc.
- [ ] **Dataset**: 2024, 2025, combined, etc.
- [ ] **Difficulty**: all, easy, medium, hard, advanced
- [ ] **Speed**: 0.6x, 0.7x, 0.8x, 0.9x, 1.0x, 1.1x, 1.2x
- [ ] **Pause**: 1 sec, 2 sec, 3 sec (default: 3 sec)
- [ ] **Repeat**: off, 1x, 2x, 3x, 5x, infinite
- [ ] **Voice**: Auto, Microsoft voices...

---

## 3. Setting Change Tests

### 3.1 Speed Setting
- [ ] Change speed to `0.8x`
- [ ] Console shows: `[SettingsModule] Setting changed: speed = 0.8`
- [ ] Console shows: `[TTSEngine] Speed changed to 0.8`
- [ ] Play audio and verify slower speed
- [ ] No errors in console

### 3.2 Pause Setting (Default = 3 sec)
- [ ] Verify default is **3 sec** ✅
- [ ] Change to `2 sec`
- [ ] Console shows: `[SettingsModule] Setting changed: delay = 2000`
- [ ] Console shows: `[AudioControls] Delay changed to 2000ms`
- [ ] Play audio and verify 2-second pause between words
- [ ] Change back to `3 sec` and verify

### 3.3 Repeat Setting
- [ ] Change to `2x`
- [ ] Console shows: `[SettingsModule] Setting changed: repeat = 2`
- [ ] Console shows: `[AudioControls] Repeat mode changed to 2`
- [ ] Play audio and verify word repeats 2 times
- [ ] No errors in console

### 3.4 Voice Setting
- [ ] Change voice to different option
- [ ] Console shows: `[SettingsModule] Setting changed: voice = ...`
- [ ] Console shows: `[VoiceSelector] Voice preference changed to ...`
- [ ] Console shows: `[TTSEngine] Voice changed to ...`
- [ ] Play audio and verify voice changed
- [ ] No errors in console

### 3.5 Difficulty Setting
- [ ] Change difficulty to `advanced`
- [ ] Console shows: `[SettingsModule] Setting changed: difficulty = advanced`
- [ ] Console shows: `[PTEVocabularyManager] Difficulty changed to advanced`
- [ ] Console shows: `[PTEVocabularyManager] vocabulary:updated event emitted`
- [ ] Word list updates (check word count in UI)
- [ ] No errors in console

### 3.6 Learning Mode Setting
- [ ] Change vocabulary book to `pte-intermediate`
- [ ] Console shows: `[SettingsModule] Setting changed: learningMode = pte-intermediate`
- [ ] Console shows: `[PTEVocabularyManager] Learning mode changed to pte-intermediate`
- [ ] Console shows: `[PTEVocabularyManager] vocabulary:updated event emitted`
- [ ] Word list updates
- [ ] No errors in console

### 3.7 Practice Mode Setting
- [ ] Change practice type to `rs` (Repeat Sentence)
- [ ] Console shows: `[SettingsModule] Setting changed: practiceMode = rs`
- [ ] Dataset dropdown appears (Vocabulary Book hides)
- [ ] Word display changes to sentence format
- [ ] No errors in console

### 3.8 Practice Dataset Setting
- [ ] With Practice Type = `rs`, change dataset to `2025`
- [ ] Console shows: `[SettingsModule] Setting changed: practiceDataset = 2025`
- [ ] Dataset loads correctly
- [ ] Sentences from 2025 dataset display
- [ ] No errors in console

---

## 4. Validation Tests

### 4.1 Invalid Value Test
Open console and run:
```javascript
window.eventBus.emit('setting:request-change', {key: 'speed', value: 99.9});
```
- [ ] Console shows: `[SettingsModule] Validation failed for speed`
- [ ] Speed NOT changed
- [ ] No errors, just validation warning

### 4.2 Unknown Setting Test
```javascript
window.eventBus.emit('setting:request-change', {key: 'fakeSettings', value: 'test'});
```
- [ ] Console shows: `[SettingsModule] No handler for setting: fakeSettings`
- [ ] No errors, just warning

---

## 5. Persistence Tests

### 5.1 Settings Persistence After Refresh
- [ ] Set all dropdowns to non-default values:
  - Speed: `0.7x`
  - Pause: `2 sec`
  - Repeat: `3x`
  - Voice: (any non-auto)
  - Difficulty: `medium`
  - Learning Mode: `pte-intermediate`
- [ ] **Refresh page (F5)**
- [ ] All settings restored correctly ✅
- [ ] Check localStorage in DevTools:
  ```javascript
  JSON.parse(localStorage.getItem('pte_settings'))
  ```
- [ ] Verify all 8 settings stored correctly

### 5.2 Export/Import Settings
- [ ] Open settings panel
- [ ] Change several settings
- [ ] Click "Export Settings" (if button exists)
- [ ] Download JSON file
- [ ] Change settings to different values
- [ ] Click "Import Settings"
- [ ] Upload JSON file
- [ ] Verify settings restored ✅

### 5.3 Reset Settings
- [ ] Change all settings to non-default values
- [ ] Click "Reset Settings" button
- [ ] Confirm reset
- [ ] Verify all settings return to defaults:
  - Speed: `1.0x`
  - Pause: **`3 sec`** ✅ (NEW DEFAULT)
  - Repeat: `off`
  - Voice: `auto`
  - Difficulty: `all`
  - Practice Mode: `vocabulary`
  - Learning Mode: `pte-fib-listening`
- [ ] No errors in console

---

## 6. Event-Driven Architecture Tests

### 6.1 Event Flow Test
Open console and monitor events:
```javascript
// Listen to all setting changes
window.eventBus.on('setting:changed', (data) => {
  console.log('🔔 Setting changed:', data);
});
```
- [ ] Change any setting
- [ ] Verify event emitted with correct data: `{key, value, previous}`
- [ ] Multiple engines receive the event
- [ ] Each engine logs its response

### 6.2 Direct API Test
Test SettingsModule API directly:
```javascript
// Get current settings
console.log(window.settingsModule.getAllSettings());

// Get specific setting
console.log(window.settingsModule.getSetting('speed'));

// Request change via event (proper way)
window.eventBus.emit('setting:request-change', {key: 'speed', value: 0.9});
```
- [ ] All API methods work correctly
- [ ] No errors
- [ ] Settings updated via events

### 6.3 Old API Test (Should Fail)
Verify old SettingsManager is completely removed:
```javascript
// This should be undefined
console.log(window.settingsManager);
```
- [ ] Returns `undefined` ✅
- [ ] Old API completely removed

---

## 7. Audio Playback Tests

### 7.1 Basic Playback
- [ ] Click PLAY button
- [ ] Audio starts playing
- [ ] Word displayed correctly
- [ ] Phonetic spelling shown
- [ ] IPA notation shown
- [ ] Example sentence shown
- [ ] Progress counter updates
- [ ] No errors in console

### 7.2 Speed Control During Playback
- [ ] Start playback
- [ ] While playing, change speed to `0.6x`
- [ ] Next word plays at new speed ✅
- [ ] No audio glitches
- [ ] No errors

### 7.3 Pause Duration During Playback
- [ ] Start playback
- [ ] While playing, change pause to `1 sec`
- [ ] Next word waits only 1 second ✅
- [ ] Timing feels correct
- [ ] No errors

### 7.4 Voice Change During Playback
- [ ] Start playback
- [ ] While playing, change voice
- [ ] Next word uses new voice ✅
- [ ] Voice transition smooth
- [ ] No errors

---

## 8. Error Handling Tests

### 8.1 Storage Error Test
```javascript
// Simulate storage error
localStorage.setItem('pte_settings', 'invalid-json{{{');
location.reload();
```
- [ ] Page loads with default settings
- [ ] Console shows error but recovers gracefully
- [ ] No fatal errors

### 8.2 Missing Handler Test
Check that all 8 settings have handlers:
```javascript
Object.keys(window.settingsModule.handlers).forEach(key => {
  console.log(`✅ Handler exists for: ${key}`);
});
```
- [ ] 8 handlers found: speed, delay, repeat, voice, difficulty, learningMode, practiceMode, practiceDataset

---

## 9. Deprecated Method Tests

### 9.1 Old Setter Methods (Should Still Exist but Deprecated)
These should still work (backward compatibility) but log deprecation warnings:
```javascript
// Old methods marked @deprecated
window.audioControls._setDelay(1000);
window.audioControls._setRepeatMode(2);
window.ttsEngine._setSpeechRate(0.8);
window.voiceSelector._setPreferredVoice('auto');
```
- [ ] Methods still work (private but accessible)
- [ ] Console shows deprecation warnings
- [ ] Functionality preserved

---

## 10. Mobile/Responsive Tests

### 10.1 Mobile View (Resize browser to 375px width)
- [ ] Settings panel fits screen
- [ ] All dropdowns accessible
- [ ] Touch targets large enough
- [ ] No horizontal scroll
- [ ] Buttons work on touch

### 10.2 Tablet View (768px width)
- [ ] Layout adapts correctly
- [ ] Settings panel readable
- [ ] All features accessible

---

## 11. Performance Tests

### 11.1 Settings Change Performance
- [ ] Rapidly change settings (10+ times)
- [ ] No lag or freezing
- [ ] Memory doesn't grow excessively
- [ ] No memory leaks (check DevTools Memory tab)

### 11.2 Event Bus Performance
```javascript
// Stress test: emit 100 events
for (let i = 0; i < 100; i++) {
  window.eventBus.emit('setting:request-change', {key: 'speed', value: 0.8 + (i % 5) * 0.1});
}
```
- [ ] Completes without errors
- [ ] No performance degradation
- [ ] UI remains responsive

---

## 12. Cross-Browser Tests

### 12.1 Chrome/Edge
- [ ] All tests pass ✅
- [ ] No browser-specific errors

### 12.2 Firefox
- [ ] All tests pass ✅
- [ ] Voice selection works
- [ ] Audio playback works

### 12.3 Safari (if available)
- [ ] All tests pass ✅
- [ ] SpeechSynthesis API works
- [ ] localStorage works

---

## 13. Final Verification

### 13.1 Console Clean
- [ ] No red errors in console
- [ ] Only expected logs/warnings
- [ ] No "SettingsManager" references
- [ ] Only "SettingsModule" references

### 13.2 Feature Completeness
- [ ] All 8 settings work independently
- [ ] Event-driven architecture working
- [ ] Persistence working
- [ ] Validation working
- [ ] Export/Import working
- [ ] Reset working

### 13.3 Code Quality
- [ ] No deprecated code paths used (except old setters)
- [ ] Clean event-driven flow
- [ ] Single source of truth (SettingsModule)
- [ ] No dual systems

---

## Test Results Summary

**Total Tests:** 150+  
**Passed:** _____  
**Failed:** _____  
**Blocked:** _____  

### Critical Issues Found:
1. _______________________
2. _______________________
3. _______________________

### Non-Critical Issues:
1. _______________________
2. _______________________

### Notes:
_______________________
_______________________
_______________________

---

## Sign-Off

**Tester Signature:** _________________  
**Date:** _________________  
**Status:** ✅ APPROVED / ⚠️ APPROVED WITH ISSUES / ❌ REJECTED

---

## Quick Smoke Test (5 minutes)

If you only have 5 minutes, run this minimal test:

1. [ ] Open `index.html` - no console errors
2. [ ] Open settings panel - all dropdowns populated
3. [ ] Change **Pause to 3 sec** (default) ✅
4. [ ] Change **Speed to 0.8x** - verify speed changes
5. [ ] Change **Difficulty to advanced** - verify word list updates
6. [ ] Click PLAY - audio plays correctly
7. [ ] Refresh page (F5) - settings persist
8. [ ] Console: verify `SettingsModule` exists, `SettingsManager` undefined

**If all 8 checks pass → Migration successful! ✅**
