# CCL Pronunciation Trainer - Refactoring Plan

## Current State Analysis

### Problems with Current Architecture
- ❌ **Single Giant File**: `app.js` is 1000+ lines with mixed responsibilities
- ❌ **Hard to Maintain**: Finding specific functionality requires scrolling through entire file
- ❌ **Feature Conflicts**: New features risk breaking existing functionality
- ❌ **Testing Complexity**: Cannot test individual components in isolation
- ❌ **Code Duplication**: Similar logic scattered throughout single file

### Current File Structure
```
src/js/app.js (1043 lines)
├── Class CCLPronunciationTrainer
│   ├── Constructor & initialization (lines 1-20)
│   ├── Vocabulary management (lines 100-400)
│   ├── TTS/Audio functionality (lines 400-600) 
│   ├── UI updates & event handling (lines 600-800)
│   ├── Progress tracking (lines 800-900)
│   └── Utility methods (lines 900-1000)
```

## Refactoring Strategy

### Pure Code Extraction
**Goal**: Split existing code into logical modules **without changing functionality**

### Module Extraction Plan

#### 1. Core Application Logic
**File**: `src/js/core/App.js` (~150 lines)
```javascript
// Extract from current app.js:
class CCLPronunciationTrainer {
    constructor() // App initialization only
    init()        // Coordinate other modules
    start()       // Begin learning session
    stop()        // End learning session
}
```

#### 2. Vocabulary Management  
**File**: `src/js/core/VocabularyManager.js` (~200 lines)
```javascript
// Extract from current app.js:
loadCategory()           // Category loading logic
filterByDifficulty()     // Difficulty filtering  
getNextCategory()        // Navigation logic
getPreviousCategory()    // Navigation logic
calculateCategoryCounts() // Category statistics
shuffleArray()          // Utility method
```

#### 3. Audio/TTS Engine
**File**: `src/js/audio/TTSEngine.js` (~150 lines)
```javascript
// Extract from current app.js:
speak()                  // Main TTS functionality
pronounceWord()          // Word pronunciation 
cleanTextForTTS()        // Text preprocessing
showTTSFallback()        // Error handling
```

#### 4. Voice Selection
**File**: `src/js/audio/VoiceSelector.js` (~100 lines)  
```javascript
// Extract from current app.js:
selectBestVoiceMatch()   // Voice selection algorithm
getCuratedVoiceInfo()    // Voice metadata
populateVoiceOptions()   // UI population
```

#### 5. Audio Controls
**File**: `src/js/audio/AudioControls.js` (~150 lines)
```javascript
// Extract from current app.js:
startAutoPlay()          // Auto-play logic
pauseAutoPlay()          // Pause functionality
nextWord()               // Navigation controls
previousWord()           // Navigation controls
syncRepeatModeFromHTML() // Repeat mode logic
```

#### 6. UI Controller
**File**: `src/js/ui/UIController.js` (~200 lines)
```javascript
// Extract from current app.js:
displayWord()            // Word display updates
updateUI()               // General UI updates
updateCategoryDisplay()  // Category UI updates
bindEventListeners()     // Event handling setup
```

#### 7. Progress Tracking
**File**: `src/js/core/ProgressTracker.js` (~100 lines)
```javascript
// Extract from current app.js:
updateProgress()         // Progress calculation
updateStatus()           // Status messages
showError()              // Error display
```

#### 8. Settings Management
**File**: `src/js/ui/SettingsPanel.js` (~80 lines)
```javascript
// Extract from current app.js:
// Settings panel toggle logic
// Settings event listeners
// Settings persistence
```

#### 9. Storage Utilities
**File**: `src/js/utils/Storage.js` (~50 lines)
```javascript
// Create new utility for localStorage operations
// No extraction needed - will be new utility code
```

#### 10. Event Bus
**File**: `src/js/utils/EventBus.js` (~50 lines)
```javascript
// Create new inter-module communication system
// No extraction needed - will be new utility code
```

## Implementation Steps

### Phase 1: Create Directory Structure
1. Create `src/js/core/` directory
2. Create `src/js/audio/` directory  
3. Create `src/js/ui/` directory
4. Create `src/js/utils/` directory

### Phase 2: Extract Utility Modules (No Dependencies)
1. Create `EventBus.js` - Simple pub/sub system
2. Create `Storage.js` - localStorage utilities  

### Phase 3: Extract Core Logic (Foundation)
1. Extract `VocabularyManager.js` from vocabulary-related methods
2. Extract `ProgressTracker.js` from progress-related methods

### Phase 4: Extract Audio Modules (Specialized)
1. Extract `TTSEngine.js` from speech-related methods
2. Extract `VoiceSelector.js` from voice selection methods  
3. Extract `AudioControls.js` from playback control methods

### Phase 5: Extract UI Modules (Presentation)
1. Extract `UIController.js` from display/event methods
2. Extract `SettingsPanel.js` from settings-related methods

### Phase 6: Refactor Main App (Coordinator)
1. Refactor `App.js` to coordinate modules via EventBus
2. Remove extracted code, keep only coordination logic
3. Update HTML to load all modules

### Phase 7: Testing & Validation
1. Verify exact same functionality
2. Test all features work identically
3. Check browser console for errors

## Quality Assurance

### Refactoring Rules
✅ **No New Features**: Only move existing code  
✅ **Same Functionality**: App behavior remains identical  
✅ **Same UI**: No HTML/CSS changes  
✅ **Same Performance**: No performance degradation  

### Testing Checklist
- [ ] All vocabulary categories load correctly
- [ ] TTS pronunciation works identically  
- [ ] Voice selection functions the same
- [ ] Progress tracking maintains state
- [ ] Settings persist correctly
- [ ] Navigation works identically
- [ ] Auto-play functions the same
- [ ] Keyboard shortcuts work
- [ ] Mobile responsiveness unchanged

## Expected Outcomes

### Code Quality Improvements
- **Maintainability**: Each module under 200 lines
- **Testability**: Individual modules can be tested
- **Debuggability**: Issues isolated to specific modules
- **Readability**: Clear separation of concerns

### Development Benefits  
- **Feature Development**: New features isolated to relevant modules
- **Bug Fixes**: Easier to locate and fix issues
- **Code Reviews**: Smaller, focused code changes
- **Team Collaboration**: Multiple developers can work simultaneously

### Long-term Benefits
- **Scalability**: Easy to add new modules/features
- **Maintenance**: Reduced cognitive load for developers
- **Documentation**: Each module can have focused documentation
- **Testing**: Unit tests for individual components

## Risk Mitigation

### Potential Issues
- **Integration Bugs**: Modules may not communicate properly
- **Performance Impact**: Additional module loading overhead
- **Circular Dependencies**: Modules depending on each other

### Mitigation Strategies
- **Event Bus**: Loose coupling between modules
- **Incremental Testing**: Test after each extraction
- **Rollback Plan**: Keep original app.js as backup
- **Gradual Migration**: Extract one module at a time

## Success Metrics

✅ **Functionality Preserved**: All features work identically  
✅ **Code Size Reduced**: Individual files under 200 lines  
✅ **Clear Architecture**: Logical module separation  
✅ **Easy Maintenance**: Developers can quickly locate code  
✅ **Testing Ready**: Modules can be tested in isolation