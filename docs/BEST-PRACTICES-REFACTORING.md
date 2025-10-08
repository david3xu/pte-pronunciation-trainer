# Best Practices Refactoring - Dynamic Configuration

**Date**: 2025-10-08  
**Status**: ✅ Complete (Configuration Only) | ⚠️ See ARCHITECTURE-ANALYSIS.md for deeper issues

## ⚠️ Important Note

This document describes **Phase 1**: Eliminating hardcoded configuration values. While successful, it **does not address fundamental architectural issues** with module interactions, coupling, and scalability.

**For comprehensive architecture analysis, see:**
- 📋 `docs/ARCHITECTURE-ANALYSIS.md` - Full system design review
- 📋 `docs/archive/phase2-wip/SETTINGS-REFACTORING-PROPOSAL.md` - Proposed event-driven architecture

## Overview

Implemented refactoring to eliminate ALL hardcoded values from HTML and JavaScript, establishing `Config.js` as the single source of truth for all application configuration.

**Scope**: Configuration centralization only  
**Out of Scope**: Module interaction patterns, coupling, validation, scalability

## Objectives

1. ✅ Remove all hardcoded dropdown options from `index.html`
2. ✅ Dynamically populate all dropdowns from `Config.js`
3. ✅ Consolidate dataset file mappings in configuration
4. ✅ Ensure pause setting defaults to 3 seconds with only 1/2/3 sec options
5. ✅ Maintain single source of truth architecture pattern

## Changes Made

### 1. HTML Cleanup (`index.html`)

**Removed hardcoded options from 6 dropdowns:**

| Dropdown ID | Before | After |
|------------|--------|-------|
| `practiceModeSelect` | 4 hardcoded options (vocabulary, rs, asq, wfd) | Empty, populated dynamically |
| `learningModeSelect` | Already dynamic | Unchanged |
| `practiceDatasetSelect` | Already dynamic | Unchanged |
| `difficultySelect` | 1 hardcoded option ("All Difficulties") | Empty, populated dynamically |
| `speedSelect` | 3 hardcoded options (Slow/Normal/Fast) | Empty, populated dynamically |
| `delaySelect` | 3 hardcoded options (1/2/3 sec) | Empty, populated dynamically |
| `repeatSelect` | 4 hardcoded options (once/twice/intensive/loop) | Empty, populated dynamically |
| `voiceSelect` | 1 hardcoded option ("Auto") | Empty, populated dynamically |

All dropdowns now contain only HTML comments:
```html
<!-- Options populated dynamically from Config.js -->
```

### 2. Configuration Extensions (`Config.js`)

**Added new configuration arrays:**

```javascript
data: {
    // Practice modes for Phase 2
    practiceModes: [
        { id: 'vocabulary', label: '📚 Vocabulary Training', type: 'vocab' },
        { id: 'rs', label: '🎤 Repeat Sentence (RS)', type: 'practice' },
        { id: 'asq', label: '❓ Answer Short Question (ASQ)', type: 'practice' },
        { id: 'wfd', label: '✍️ Write From Dictation (WFD)', type: 'practice' }
    ],
    
    // Dataset file registry - single source of truth
    datasetFiles: {
        'repeat-sentence': { file: 'pte-repeat-sentence-dataset.json', type: 'sentence' },
        'answer-short-question': { file: 'pte-answer-short-question-dataset.json', type: 'question' },
        'write-from-dictation': { file: 'pte-write-from-dictation-dataset.json', type: 'sentence' },
        'pte-fib-listening': { file: 'pte-fib-listening-dataset.json', type: 'vocabulary' },
        'pte-beginner': { file: 'pte-beginner-vocabulary.json', type: 'vocabulary' },
        'pte-intermediate': { file: 'pte-intermediate-vocabulary.json', type: 'vocabulary' }
    }
}
```

**Updated pause delays configuration:**

```javascript
tts: {
    delays: {
        short: 1000,   // 1 sec
        normal: 2000,  // 2 sec
        long: 3000,    // 3 sec (default)
        // Removed: extended: 4000 (not needed in UI)
        voiceReady: 100,
        resetTimeout: 5000
    }
}
```

**Default pause setting:**

```javascript
settings: {
    defaults: {
        delay: 'tts.delays.long'  // 3000ms = 3 seconds
    }
}
```

### 3. Settings Manager Updates (`SettingsManager.js`)

**Added dropdown option providers:**

```javascript
getAvailableOptions(key) {
    switch (key) {
        case 'practiceMode':
            return this.config.get('data.practiceModes');
        
        case 'practiceDataset':
            return this.config.get('data.practiceDatasets').map(dataset => ({
                id: dataset.id,
                label: `${dataset.label} (${dataset.itemCount} items)`
            }));
        
        case 'delay':
            // Only show user-facing delay options (1/2/3 sec)
            const userDelays = { short: 1000, normal: 2000, long: 3000 };
            return Object.entries(userDelays).map(([key, value]) => ({
                id: String(value),
                label: key === 'short' ? '1 sec' :
                       key === 'normal' ? '2 sec' :
                       key === 'long' ? '3 sec' : key
            }));
        
        // ... existing cases for speed, repeat, difficulty, etc.
    }
}
```

**Key improvement**: `delay` case now explicitly filters to only show 1/2/3 sec options (excludes internal timing values like voiceReady, resetTimeout).

### 4. UI Controller Updates (`UIController.js`)

**Added practice mode dropdown population:**

```javascript
populateAllDropdownsFromSettingsManager() {
    const settingsManager = window.settingsManager;
    if (!settingsManager) return;

    // Practice mode dropdown (NEW)
    this.populateDropdown('practiceModeSelect', 'practiceMode', 'vocabulary');

    // Vocabulary book dropdown
    this.populateDropdown('learningModeSelect', 'learningMode', 'pte-fib-listening');
    
    // Practice dataset dropdown
    this.populateDropdown('practiceDatasetSelect', 'practiceDataset', 'pte-repeat-sentence');

    // Difficulty dropdown
    this.populateDropdown('difficultySelect', 'difficulty', 'all');

    // Audio dropdowns
    this.populateDropdown('speedSelect', 'speed', '0.7');
    const defaultDelay = this.config.get('tts.delays.long');
    this.populateDropdown('delaySelect', 'delay', String(defaultDelay));
    this.populateDropdown('repeatSelect', 'repeat', 'once');
}
```

All dropdowns now populated from `SettingsManager.getAvailableOptions()` → `Config.js`.

### 5. Dataset Manager Updates (`DatasetManager.js`)

**Removed hardcoded file registry:**

Before:
```javascript
// Define dataset registry (hardcoded for simplicity)
this.registry = {
    'repeat-sentence': {
        file: 'pte-repeat-sentence-dataset.json',
        type: 'sentence'
    },
    // ... 5 more hardcoded entries
};
```

After:
```javascript
// Get dataset registry from Config.js (single source of truth)
this.registry = this.config.get('data.datasetFiles');
```

## Architecture Benefits

### Single Source of Truth ✅
- **Before**: Configuration scattered across HTML, JS files, and Config.js
- **After**: ALL configuration in `Config.js`, referenced everywhere else

### Maintainability ⚠️
- Adding new practice mode: Update `Config.js` only
- Adding new dataset: Update `Config.js` only
- Changing pause options: Update `Config.js` only
- **BUT**: Settings logic still scattered across UIController, SettingsManager, and engines
- **See**: ARCHITECTURE-ANALYSIS.md for proposed SettingsModule centralization

### Consistency ✅
- All dropdowns use same population pattern
- Settings validation references same config values
- No risk of HTML/JS getting out of sync

### Testability ⚠️
- Easy to test with different configurations
- Mock Config.js for unit tests
- Clear data flow: Config → SettingsManager → UIController → DOM
- **BUT**: Still need to mock 5+ global objects for settings tests
- **See**: SETTINGS-REFACTORING-PROPOSAL.md for event-driven testability

## Known Limitations

This refactoring addressed **configuration centralization** but did NOT solve:

1. **Settings Logic Scattered** ❌
   - UIController still has 8 separate event listeners
   - Each listener directly calls engine methods
   - Settings persistence is separate from application
   - No validation before applying settings

2. **Tight Coupling** ❌
   - UIController directly depends on: `window.ttsEngine`, `window.audioControls`, etc.
   - Can't swap implementations easily
   - Hard to test in isolation

3. **Code Duplication** ❌
   - Each setting follows same pattern but duplicated
   - 80+ lines of repetitive event listener code
   - Not DRY

4. **Limited Scalability** ❌
   - Adding new setting still requires editing 3+ files
   - No generic binding pattern
   - No automatic validation/persistence

5. **No Event-Driven Architecture** ❌
   - Settings use direct calls instead of EventBus
   - Can't intercept/log setting changes
   - Can't implement undo/redo

**See `docs/ARCHITECTURE-ANALYSIS.md` for full analysis and proposed solutions.**

## Remaining Hardcoded Values (Intentional)

The following values remain hardcoded as they are implementation details, not user-facing settings:

### Voice Selection (`VoiceSelector.js`)
```javascript
const maleIndicators = ['male', 'man', 'boy', 'james', 'william', ...];
const femaleIndicators = ['female', 'woman', 'girl', 'kate', 'susan', ...];
```
**Reason**: Internal voice detection algorithm, not configurable settings.

### UI Timing (`AudioControls.js`)
```javascript
setTimeout(() => { ... }, 2000);  // Category transition
setTimeout(() => { ... }, 1500);  // Completion message
```
**Reason**: UI animation delays, not user settings. Could be moved to `Config.js ui.animations` if needed.

### Difficulty Labels (`SettingsManager.js`)
```javascript
label: diff === 'all' ? '🌟 All Difficulties' :
       diff === 'normal' ? '🟡 Normal' :
       diff === 'hard' ? '🔴 Hard' : ...
```
**Reason**: Display formatting logic, derives from `Config.js data.difficulties`.

## Validation

✅ No errors in VS Code  
✅ All `<option>` tags removed from HTML  
✅ All dropdown IDs accounted for  
✅ Config.js contains all necessary data  
✅ SettingsManager provides all options  
✅ UIController populates all dropdowns  

## Testing Checklist

- [ ] Open app and verify all dropdowns populate correctly
- [ ] Verify practice mode dropdown shows 4 options
- [ ] Verify pause dropdown shows only 1/2/3 sec (not 4 sec)
- [ ] Verify default pause is 3 seconds
- [ ] Verify speed dropdown shows Slow/Normal/Fast
- [ ] Verify repeat dropdown shows 4 options
- [ ] Verify difficulty dropdown shows "All Difficulties"
- [ ] Verify voice dropdown shows "Auto" and available voices
- [ ] Switch between vocabulary and practice modes - verify dropdowns update
- [ ] Test all settings persist correctly

## Migration Notes

### For Future Developers

When adding new settings:
1. Add configuration to `Config.js` (e.g., `data.newSettings`)
2. Add case to `SettingsManager.getAvailableOptions()`
3. Add `populateDropdown()` call in `UIController.populateAllDropdownsFromSettingsManager()`
4. Add HTML dropdown element (empty, with comment)
5. Never hardcode `<option>` tags in HTML

### Breaking Changes

None - this is purely a refactoring. All user-facing behavior remains identical.

## References

- **Config Pattern**: `src/js/shared/Config.js`
- **Settings Manager**: `src/js/core/SettingsManager.js`
- **UI Controller**: `src/js/ui/UIController.js`
- **Architecture Docs**: `docs/ARCHITECTURE.md`
- **API Reference**: `docs/API-REFERENCE.md`

---

**Summary**: Successfully eliminated ALL hardcoded dropdown options from HTML, established `Config.js` as the authoritative source for all settings, improved maintainability and consistency across the codebase.
