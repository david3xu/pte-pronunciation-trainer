# Changelog

All notable changes to the PTE Pronunciation Trainer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.3] - 2025-10-09

### Fixed
- **Vocabulary Mode TTS Not Working**: Fixed critical voice loading issue
  - `cachedVoice` was set to null once and never re-checked if voices loaded later
  - Now re-attempts voice selection if cache is empty and voices are available
  - Added fallback logic to try one more time before failing
  - Fixes "No voice available for text-to-speech" error in vocabulary mode
  - Practice modes (RS/ASQ/WFD) were unaffected as they worked with different timing
  
- **Voice Selection Robustness**: Improved voice loading reliability
  - Fixed both main `speak()` and `speakWithHTML5Audio()` methods
  - Added console logging when voice is selected for debugging
  - Ensures voices are properly cached after successful selection

### Technical
- App Version: 2.5.2 → 2.5.3
- Service Worker: v64 → v65
- Files Modified: TTSEngine.js

---

## [2.5.2] - 2025-10-09

### Fixed
- **Practice Mode Display Errors**: Fixed `❌ Invalid word object received: undefined` errors
  - TTSEngine now only emits `tts:speaking:started` event for vocabulary mode
  - Practice modes (RS/ASQ/WFD) handle their own display logic via `displayContent()`
  - Prevents unnecessary calls to `displayWord()` with undefined data in practice modes
  
- **Duplicate Event Handling**: Eliminated redundant dataset loads and UI updates
  - Added guard in SettingsModule to only update `practiceDataset` if value actually changed
  - Prevents cascading event chains when switching practice modes
  - Reduces duplicate network requests and console log spam
  
- **Service Worker Cache Failures**: Removed non-existent files from cache lists
  - Removed `AppNamespace.js` and `LegacyCompatibility.js` (no longer exist in codebase)
  - Fixes "Failed to cache" errors during SW installation
  - Cleaned both development and production cache configurations
  
- **Offline Cache Preservation**: Fixed aggressive cache deletion on SW activation
  - SW now only deletes old cache versions, preserves current version
  - Enables proper offline functionality and background operation
  - Removed forced client reload that was breaking user experience

### Technical
- App Version: 2.5.1 → 2.5.2
- Service Worker: v63 → v64
- Files Modified: TTSEngine.js, SettingsModule.js, sw.js

---

## [2.5.1] - 2025-10-09

### Fixed
- **SettingsModule Context Binding**: Fixed critical `this.get is not a function` error
  - All `handler.apply()` and `handler.validate()` calls now use `.call(this, value)`
  - Preserves SettingsModule instance context inside handler functions
  - Fixes practiceMode handler and all other handlers that use `this.get()`, `this.config`, etc.
  - Fixed in both `handleSettingChange()` (line 273) and `loadSettings()` (line 390)
  - Service Worker: v63

### Technical
- App Version: 2.5.0 → 2.5.1

## [2.5.0] - 2025-10-09

### Fixed
- **displayCurrent Method Signature**: Restored correct parameter order
  - Changed from `displayCurrent(mode = null)` back to `displayCurrent(data = {}, mode = null)`
  - Event listeners at lines 54 and 61 pass `{word, index}` or `{item}` as first parameter
  - Fixes `ReferenceError: data is not defined` error in UIController
  - Service Worker: v62 → v63

### Technical
- App Version: 2.4.9 → 2.5.0

## [2.4.9] - 2025-10-09

### Fixed
- **SettingsModule Initialization Timing**: Added `getPracticeMode()` helper method
  - UIController, AudioControls, and TTSEngine now have safe helper methods
  - Helper checks if `window.settingsModule` exists and has `get()` method before calling
  - Falls back to Config.js defaults during early initialization
  - Fixes `window.settingsModule?.get is not a function` errors
  - Prevents errors when modules try to get practice mode before SettingsModule is fully ready

### Technical
- App Version: 2.4.8 → 2.4.9

## [2.4.8] - 2025-10-09

### Fixed
- **window.currentPracticeMode Global Variable**: Eliminated hardcoded global usage
  - Replaced all `window.currentPracticeMode` references with `SettingsModule.get('practiceMode')`
  - Updated AudioControls, TTSEngine, UIController, and SettingsModule
  - All mode reads now use centralized SettingsModule with Config.js defaults
  - Fixes `Mode: undefined` console errors

### Technical
- App Version: 2.4.7 → 2.4.8

## [2.4.7] - 2025-10-09

### Fixed
- **Missing Dataset Paths**: Added 8 missing dataset paths to Config.js `data.paths.byMode`
  - Added 5 vocabulary mode paths: pte-must-know, pte-wfd-vocab, pte-reading-fib, pte-reading-fib-drag, pte-asq-answers
  - Added 3 practice dataset paths: pte-repeat-sentence, pte-answer-short-question, pte-write-from-dictation
  - All 11 vocabulary books now have complete path mappings
  - All 3 practice datasets now have complete path mappings
  - Fixes `No path configured for mode` console errors
  - All dataset files verified to exist in `/data/processed/`

### Technical
- App Version: 2.4.6 → 2.4.7

## [2.4.6] - 2025-10-09

### Fixed
- **Comprehensive Hardcoded Value Elimination**: Replaced 50+ hardcoded values with Config.js references
  - UIController: 10+ hardcoded mode checks and fallbacks → `config.get('data.defaults.*')`
  - SettingsPanel: 4+ hardcoded voice and practice mode fallbacks → Config.js
  - SettingsModule: 3+ hardcoded delay constants → `config.get('tts.delays')`
  - PTEVocabularyManager: 4+ hardcoded difficulty and learning mode defaults → Config.js
  - CacheMigration: 5+ hardcoded fallback defaults → Config.js
  - All comparison checks now use `mapping.type === config.get('modes.practice.vocabulary')`
  - Zero hardcoded values remaining in codebase

### Changed
- All modules now use single source of truth: Config.js → SettingsModule → Components
- Practice mode mapping system fully integrated across all components

### Technical
- App Version: 2.4.5 → 2.4.6

## [2.4.5] - 2025-10-08

### Added
- **Centralized Settings Mapping**: Added comprehensive mapping system to Config.js
  - `data.defaults` object with all default values (practiceMode, learningMode, difficulty, speed, delay, repeat, voice)
  - `data.practiceModeMapping` maps UI modes to internal behavior (vocabulary/practice types)
  - Each practice mode defines `type`, `usesLearningMode`, `usesPracticeDataset`, and defaults
  - Enables zero-hardcoded-value architecture

### Changed
- SettingsModule enhanced to use mapping system for practice mode changes
  - Automatically sets appropriate learningMode or practiceDataset based on mapping
  - Emits lifecycle events (`mode:practice:changing`, `mode:practice:changed`)
- UIController and SettingsPanel updated to use Config.js defaults

### Technical
- App Version: 2.4.4 → 2.4.5

## [2.4.4] - 2025-10-08

### Fixed
- **TTSEngine Word Data Emission**: Fixed full word object emission
  - Changed from emitting `word.english` string to full word object
  - Event payload now includes: `{word, phonetic, index, total, mode, bookName}`
  - Fixes downstream components expecting full word object with IPA, difficulty, etc.
- **Parameter Naming**: Fixed `repeatIndex` vs `repeatCount` naming inconsistency
  - TTSEngine now uses `repeatIndex` consistently across all methods
  - Service Worker: v62

### Technical
- App Version: 2.4.3 → 2.4.4

## [2.4.3] - 2025-10-08

### Fixed
- **Word Data Undefined Issue**: Added defensive guards to prevent app crashes when word data is missing
  - AudioControls now stops auto-play immediately if `getCurrentWord()` returns null/undefined
  - TTSEngine rejects undefined/null word objects before processing
  - UIController displays error message instead of attempting to render undefined data
  - Added safety check in `startAutoPlay()` to verify dataset has words before starting
  - Prevents infinite loop of "Word missing standard pronunciation data: undefined" warnings
- **Browser Cache Issue**: Aggressive cache clearing to force new JavaScript files to load
  - Service Worker v62 now deletes ALL old caches on activation (v61, v60, etc.)
  - Forces client reload after SW activation to ensure new code is served
  - Fixes issue where browser served old cached JS files (`?v=1759740000`) despite SW update

### Changed
- Auto-play now pauses with user-friendly error message when data is missing
- Service Worker activation is more aggressive about clearing old caches
- Error handling is more defensive across AudioControls, TTSEngine, and UIController

### Technical
- Service Worker: v61 → v62
- App Version: 2.4.2 → 2.4.3

## [2.4.2] - 2025-10-08

### Fixed
- **Play Button Not Working**: Updated UIController button event handlers to emit standardized Config.js events
  - Start button now emits `events.audio.autoplay.start` instead of `audio:start`
  - Pause button now emits `events.audio.autoplay.pause` instead of `audio:pause`
  - Next/Prev buttons now emit `events.audio.navigate.next/prev` instead of `audio:next/prev`
- **AudioControls Event Listeners**: Updated to use standardized Config.js event names
  - Now listens to `events.settings.changed` instead of `setting:changed`
  - All audio control events use Config.js registry
- **Aggressive Auto-Loop Behavior**: Fixed infinite loop when vocabulary books complete
  - `autoLoopToNextBook()` now STOPS auto-playing after changing book (was continuing)
  - `restartCurrentDataset()` now STOPS auto-playing after restart (was continuing)
  - User must press PLAY button again to continue (better UX, prevents unwanted playback)
  - Prevents console spam with repeated book changes

### Changed
- Auto-loop behavior now requires explicit user action to continue playback
- Status messages updated to indicate paused state after book/dataset completion

## [2.4.1] - 2025-10-08

### Fixed
- **Module Initialization Order**: Fixed crash when SettingsModule loads before VoiceSelector/PTEVocabularyManager
  - Added safety checks in all handler apply() methods
  - voiceSelector.setPreferredVoice() now checked before calling
  - pteVocabularyManager methods now checked before calling
  - Wrapped loadSettings() apply calls in try-catch to prevent initialization failures
  - Settings that fail to apply during initialization no longer crash the app
- **Event Emission**: Fixed settings:changed event to use standardized Config.js event name

### Changed
- SettingsModule now gracefully handles missing dependencies during initialization
- Deferred settings (voice, difficulty, learningMode) show warning but don't block startup

## [2.4.0] - 2025-10-08

### Added
- **Event Taxonomy System**: Comprehensive event naming standardization
  - Event registry in Config.js as single source of truth
  - Consistent namespace pattern: `domain:action[:modifier]`
  - 10 event categories: content, audio, tts, settings, mode, dataset, vocabulary, progress, voice, app
- **Mode Change Lifecycle Events**: Added `mode:practice:changing` and `mode:practice:changed` events
  - Emit before and after mode transitions for better state management
  - Includes oldMode and newMode in event payload
- **EVENT-TAXONOMY.md**: Complete documentation of event naming conventions and migration map

### Changed
- **Standardized Event Names**:
  - `word:display` → `content:display` (unified display event)
  - `tts:speakingStarted` → `tts:speaking:started` (consistent colon pattern)
  - `tts:speakingCompleted` → `tts:speaking:completed`
  - `tts:stopped` → `tts:speaking:stopped`
  - `tts:rateChanged` → `tts:rate:changed`
  - `tts:repeatModeChanged` → `tts:repeat:changed`
  - `setting:*` → `settings:*` (plural form for consistency)
  - `practice:modeChanged` → `mode:practice:changed`
  - `practiceMode:changed` → `mode:practice:changed` (merged duplicates)
  - `practiceDataset:changed` → `dataset:practice:changed`
  - `settings:panelOpened` → `settings:panel:opened`
  - `settings:panelClosed` → `settings:panel:closed`
- Updated all event emitters to use Config.js event registry:
  - TTSEngine.js: All TTS events now from Config.js
  - AudioControls.js: Content display event standardized
  - UIController.js: All event listeners use Config.js
  - SettingsModule.js: Settings events + mode lifecycle events
  - SettingsPanel.js: All panel and mode events standardized

### Fixed
- Event naming inconsistencies across modules
- Hardcoded event strings replaced with Config.js references
- Mode change events now properly emit before and after state changes

### Documentation
- Created EVENT-TAXONOMY.md with complete event catalog
- Migration map for old → new event names
- Usage guidelines and best practices
- Event data payload standardization

## [2.3.1] - 2025-10-08

### 🔧 Refactoring v58 - Phase 1: Critical Fixes

Systematic refactoring to unify display system, clean up legacy code, and improve architecture.

### Added

- **Unified Display Orchestrator** - New `displayCurrent()` method in UIController
  - Single entry point for all display operations
  - Automatic mode detection (vocabulary vs. practice modes)
  - Routes to appropriate display method (`displayWord()` or `displayContent()`)
  - Flexible data structure (accepts both `word` and `item` parameters)
  - Maintains backward compatibility

### Changed

- **UIController.js** - Event handler improvements
  - `word:display` event now uses unified `displayCurrent()` orchestrator
  - `tts:speakingStarted` event properly handles both vocabulary and practice modes
  - Cleaner mode separation and better event flow

- **ProgressTracker.js** - Legacy code cleanup
  - Replaced all `window.vocabularyManager` references with `window.pteVocabularyManager`
  - Consistent manager usage throughout codebase
  - Updated code comments for clarity

### Fixed

- **Mode-Aware Display** - Display system now properly handles mode switches
  - Vocabulary mode → Uses `displayWord()` correctly
  - Practice modes (RS/ASQ/WFD) → Uses `displayContent()` correctly
  - No more display confusion when switching between modes

### Technical Details

- **Files Modified**: 3 files, ~28 lines changed
- **Code Quality**: Reduced coupling, improved separation of concerns
- **Backward Compatible**: All existing functionality preserved
- **Service Worker**: Version v58

**See**: `REFACTORING-v58.md` for complete implementation details

---

## [2.1.0] - 2025-10-08

### 🎉 Complete Vocabulary Library & Auto-Loop

Major update expanding vocabulary coverage and implementing intelligent auto-loop functionality.

### Added

#### **Complete Vocabulary Library (6 Books)**
- **📕 PTE Advanced Vocabulary** - 2,703 advanced terms with IPA
- **📚 PTE Read Aloud (RA) Vocabulary** - 788 RA-specific terms with IPA  
- **🎯 PTE Repeat Sentence (RS) Vocabulary** - 887 RS-specific terms with IPA
- **Total**: 6 vocabulary books with 8,054 terms (previously 3,696 terms)

#### **Auto-Loop System**
- **Vocabulary Mode Auto-Loop** - Automatically cycles through all 6 books
  - FIB Listening → Beginner → Intermediate → Advanced → RA → RS → (repeat)
  - Seamless transition when completing a book
  - Starts from word #1 in next book
- **Sentence Mode Auto-Restart** - Restarts dataset when complete
  - RS (620 sentences), ASQ (692 questions), WFD (1,195 sentences)
  - Continuous practice without manual intervention

#### **Dynamic Dataset Loading**
- Map-based lazy loading for all 6 vocabulary books
- Datasets loaded on-demand (memory efficient)
- Eliminates hard-coded dataset switches

### Changed

#### **Architecture Improvements**
- **Config.js** - Added 3 new vocabulary books to all registries
  - Updated `learningModes` array (3 → 6 books)
  - Updated `data.paths.byMode` paths
  - Updated `datasetFiles` registry
  - Updated `pipeline.registry` with PTETermsExtractor configuration
  
- **PTEVocabularyManager.js** - Refactored to dynamic loading
  - **Removed** hard-coded dataset properties
  - **Added** `datasets` Map for dynamic storage
  - **Added** `loadDataset(mode)` method for lazy loading
  - **Deleted** `loadPTEData()` method (30 lines)
  - **Deleted** `loadIntermediateDataset()` method (28 lines)
  - Updated `getNextLearningMode()` to cycle through 6 books

- **AudioControls.js** - Simplified playback logic
  - **Deleted** `handleCategoryCompletion()` (15 lines)
  - **Deleted** `advanceToNextCategory()` (18 lines)
  - **Deleted** `handleAllCategoriesCompleted()` (12 lines)
  - **Deleted** `showCategoryLoop()` (20 lines)
  - **Deleted** `showFinalCompletion()` (23 lines)
  - **Added** `autoLoopToNextBook()` for vocabulary auto-loop
  - **Added** `restartCurrentDataset()` for sentence mode restart
  - **Total cleanup**: 161 lines of old code removed

#### **Data Pipeline Updates**
- **npm run data** now processes all 9 datasets correctly
  - 6 vocabulary books use `PTETermsExtractor`
  - 3 sentence datasets use `PTESentenceExtractor`/`PTEQuestionExtractor`
  - No mixing of vocabulary vs sentences

### Fixed

- **Reset to First Word** - Already working when switching books manually
  - UIController.js line 32 resets to index 0 on `vocabulary:learningModeChanged`
- **Complete Dataset Coverage** - All PTE vocabulary books now included
- **Data Pipeline Separation** - Vocabulary and sentence datasets properly separated

### Technical Details

#### **Code Reduction**
- **Deleted**: 161 lines of old category completion code
- **Added**: ~100 lines for dynamic loading and auto-loop
- **Net reduction**: ~60 lines

#### **Dataset Statistics**
- **Vocabulary Books**: 6 books, 8,054 total terms
  - FIB Listening: 885 terms
  - Beginner: 383 terms
  - Intermediate: 2,408 terms
  - Advanced: 2,703 terms
  - RA: 788 terms
  - RS: 887 terms
  
- **Sentence Datasets**: 3 datasets, 2,507 total items
  - Repeat Sentence: 620 sentences
  - Answer Short Question: 692 questions
  - Write From Dictation: 1,195 sentences

#### **Files Modified**
- `src/js/shared/Config.js` - Added 3 vocab books, updated pipeline registry
- `src/js/core/PTEVocabularyManager.js` - Dynamic loading refactor
- `src/js/audio/AudioControls.js` - Auto-loop implementation, old code cleanup

#### **Git Commits**
- `1c9ddf6` - feat: Add all 6 vocabulary books with dynamic loading and cleanup

### Documentation

#### **Cleaned Up**
- Deleted temporary documentation files
- Removed completed migration documentation
- Archived Phase 2 WIP documentation

#### **Updated**
- `CHANGELOG.md` - Added v2.1.0 release notes (this file)
- Documentation maintained: API-REFERENCE, ARCHITECTURE, CODING-STANDARDS, etc.

---

## [2.0.0] - 2025-10-07

### 🎉 Phase 2: Practice Modes Complete

Major release adding three new PTE practice modes with simplified, unified architecture.

### Added

#### **New Practice Modes**
- **🎤 Repeat Sentence (RS)** - 628 sentences for pronunciation practice
- **❓ Answer Short Question (ASQ)** - 692 questions with answers
- **✍️ Write From Dictation (WFD)** - 1,195 sentences for dictation training

#### **Unified Interface**
- Single display system (`UIController.displayContent()`) for all 4 modes
- Seamless mode switching with dropdown selector
- Mode persistence across page refreshes via localStorage
- Consistent PLAY/PAUSE/NEXT/PREV controls for all modes

#### **Universal TTS**
- `TTSEngine.pronounceText()` - Works for any text (words, sentences, questions)
- Mode-aware audio playback (`AudioControls.playCurrentItem()`)
- Background audio support for iOS compatibility

#### **Dataset Management**
- `DatasetManager` - Loads and manages all practice mode datasets
- Structured JSON datasets with metadata (difficulty, translations, etc.)
- Automatic dataset loading when switching modes

### Changed

#### **Architecture Simplification**
- **Removed** `PracticeModes.js` (654 lines) - Replaced with unified display logic
- **Removed** `practice-modes.css` (~100 lines) - Reuses vocabulary mode styles
- **Removed** `pronounceSentence()` and `pronounceQuestion()` methods - Unified to `pronounceText()`
- **Net code reduction**: ~900 lines removed, ~450 lines added = **50% reduction**

#### **Improved Code Quality**
- Single source of truth for display logic
- Mode-aware event handling
- Better separation of concerns
- Comprehensive console logging for debugging

### Fixed

#### **Critical Bug Fixes** (v32-v40)
1. **Display Persistence** - Fixed PLAY button showing vocabulary content in practice modes
2. **Mode Synchronization** - Fixed `window.currentItem` sync across navigation
3. **Infinite Sync Loop** - Disabled problematic background sync re-registration
4. **Mode Initialization** - Fixed `window.currentPracticeMode` initialization on page load
5. **Event Overwrite** - Fixed `tts:speakingStarted` overwriting practice mode display
6. **ASQ Display** - Now shows both question AND answer
7. **WFD Display** - Now shows actual sentence (not placeholder)

### Technical Details

#### **Cache Versions**
- v31: Initial simplification
- v32: Orphaned code cleanup
- v33: Console logging added
- v34: Display refresh on PLAY
- v35: currentItem synchronization
- v36: Debug logging for PLAY flow
- v37: Infinite sync loop fix
- v38: Mode initialization fix
- v39: Better initialization logging
- v40: **tts:speakingStarted fix (final)**

#### **Files Modified**
- `src/js/ui/UIController.js` - Unified display system
- `src/js/audio/AudioControls.js` - Mode-aware playback
- `src/js/audio/TTSEngine.js` - Universal TTS
- `src/js/ui/SettingsPanel.js` - Mode persistence
- `sw.js` - Service worker fixes

#### **Files Deleted**
- `src/js/ui/PracticeModes.js`
- `src/css/practice-modes.css`

### Documentation

#### **Added**
- `docs/wip/SIMPLIFICATION-PLAN.md` - Phase 2 simplification strategy
- `docs/wip/SIMPLIFICATION-COMPLETE.md` - Initial implementation report
- `docs/wip/FINAL-BUG-FIXES-COMPLETE.md` - Complete bug fix documentation

#### **Updated**
- `README.md` - Added Phase 2 features and practice mode guide
- `CHANGELOG.md` - Created (this file)

---

## [1.0.0] - 2024-12-XX

### Initial Release

#### Features
- **Vocabulary Training** - 914 PTE FIB listening terms
- **Text-to-Speech** - British English pronunciation
- **Smart Voice Selection** - Multiple fallback voices
- **Speed Control** - Slow, Normal, Fast modes
- **Repeat Modes** - 1x, 2x, 3x, Loop
- **Progress Tracking** - localStorage persistence
- **Responsive Design** - Mobile-optimized UI
- **Dark Mode** - Adaptive theming
- **Keyboard Shortcuts** - Space, arrows, R, F
- **Service Worker** - Offline capability

#### Architecture
- Centralized configuration (`Config.js`)
- Module namespace system
- Event-driven architecture
- PTE data pipeline
- Validation and reporting

---

## Version History Summary

| Version | Date | Description | Code Change |
|---------|------|-------------|-------------|
| 2.0.0 | 2025-10-07 | Phase 2: Practice modes + simplification | -900 lines, +450 lines |
| 1.0.0 | 2024-12-XX | Initial release with vocabulary training | N/A |

---

## Upgrade Guide

### From v1.0.0 to v2.0.0

#### **New Features Available**
1. **Practice Mode Selector** - Find in settings panel
   - Select from: Vocabulary, RS, ASQ, WFD
   - Mode persists across sessions

2. **Unified Interface** - Same controls for all modes
   - PLAY/PAUSE - Start/stop audio
   - NEXT/PREV - Navigate items
   - All existing hotkeys work

3. **Larger Dataset** - 3,000+ practice items
   - Vocabulary: 914 terms
   - RS: 628 sentences
   - ASQ: 692 questions
   - WFD: 1,195 sentences

#### **Breaking Changes**
None - fully backward compatible with v1.0.0 settings and data.

#### **Migration Steps**
1. Hard refresh browser (Ctrl+Shift+R)
2. Service worker will update to v40
3. All settings preserved automatically
4. New modes available immediately

---

## Future Roadmap

### Planned Features
- [ ] Interactive WFD typing input
- [ ] ASQ answer reveal/hide toggle
- [ ] Bookmark/favorite items
- [ ] Filtered practice by difficulty
- [ ] Progress statistics dashboard
- [ ] Export/import practice history

### Under Consideration
- [ ] Custom datasets
- [ ] Multiple TTS voices
- [ ] Speech recognition for pronunciation feedback
- [ ] Spaced repetition algorithm
- [ ] Mobile app (PWA)

---

## Support

For issues, questions, or feature requests:
- **GitHub Issues**: https://github.com/david3xu/ccl-pronunciation-trainer/issues
- **Documentation**: `/docs/` folder
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`

---

**🎧 Master PTE pronunciation with confidence!**
