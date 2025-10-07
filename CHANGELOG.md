# Changelog

All notable changes to the PTE Pronunciation Trainer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
