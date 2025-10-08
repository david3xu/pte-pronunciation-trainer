# Complete Migration Plan: SettingsModule
**Status**: 🚧 In Progress  
**Started**: 2025-10-08  
**Target Completion**: TBD

---

## Overview

Migrate from dual settings system (SettingsModule + old SettingsManager) to single event-driven architecture.

**Current State**: ⚠️ Partial implementation (30% complete)  
**Target State**: ✅ Complete event-driven architecture (100%)

---

## Migration Phases

### ✅ Phase 1: Foundation (COMPLETE)
**Goal**: Create SettingsModule without breaking existing code  
**Status**: ✅ Done  
**Duration**: 1 day

- [x] Create SettingsModule.js with handler registry
- [x] Add event listeners (setting:request-change)
- [x] Implement validation layer
- [x] Add utility methods (get, set, batch, export/import)
- [x] Initialize in PTEApp.js
- [x] Update UIController.js dropdowns to emit events
- [x] Test that both old and new systems coexist

**Deliverables**:
- `src/js/core/SettingsModule.js` ✅
- Updated `src/js/ui/UIController.js` (partial) ✅
- Updated `src/js/core/PTEApp.js` ✅

---

### 🚧 Phase 2: Update All Files to Use Events (IN PROGRESS)
**Goal**: Replace all direct calls with events  
**Status**: 🚧 30% Complete  
**Est. Duration**: 2-3 days

#### 2.1. Update UI Layer Files

- [x] **UIController.js** - Update dropdown bindings (DONE)
- [ ] **UIController.js** - Search for any remaining direct engine calls
- [ ] **SettingsPanel.js** - Replace all `settingsManager.updateSetting()` with events

#### 2.2. Update Utility Files

- [ ] **CacheMigration.js** - Replace `settingsManager.updateSetting()` with events
- [ ] **StateManager.js** - Review overlap with SettingsModule, define clear boundaries

#### 2.3. Make Engines Listen to Events (Critical!)

- [ ] **TTSEngine.js** - Add event listener for `setting:changed` (speed, voice)
- [ ] **AudioControls.js** - Add event listener for `setting:changed` (delay, repeat)
- [ ] **VoiceSelector.js** - Add event listener for `setting:changed` (voice)
- [ ] **PTEVocabularyManager.js** - Add event listener for `setting:changed` (difficulty, learningMode)

#### 2.4. Remove Engine Setter Methods (After listeners added)

- [ ] **TTSEngine.js** - Make `setSpeechRate()` private or remove
- [ ] **AudioControls.js** - Make `setDelay()`, `setRepeatMode()` private or remove
- [ ] **VoiceSelector.js** - Make `setPreferredVoice()` private or remove
- [ ] **PTEVocabularyManager.js** - Make `setDifficulty()`, `setLearningMode()` private or remove

---

### 🔜 Phase 3: Remove Old SettingsManager (PENDING)
**Goal**: Delete redundant old settings system  
**Status**: 🔜 Not Started  
**Est. Duration**: 1 day

- [ ] Verify all usages of `window.settingsManager` removed
- [ ] Run grep search to confirm no references
- [ ] Delete `src/js/core/SettingsManager.js`
- [ ] Remove from `index.html` script tags
- [ ] Remove from `PTEApp.js` initialization
- [ ] Update all documentation

---

### 🔜 Phase 4: Cleanup & Consistency (PENDING)
**Goal**: Remove redundant code, enforce standards  
**Status**: 🔜 Not Started  
**Est. Duration**: 1 day

- [ ] Remove redundant `getSetting()` from Storage.js (if exists)
- [ ] Define StateManager vs SettingsModule boundaries
- [ ] Create CODING-STANDARDS.md
- [ ] Add ESLint rules to prevent old patterns
- [ ] Add pre-commit hooks
- [ ] Search for all direct engine calls and verify removed
- [ ] Verify no code duplication

---

### 🔜 Phase 5: Testing & Verification (PENDING)
**Goal**: Ensure everything works correctly  
**Status**: 🔜 Not Started  
**Est. Duration**: 1-2 days

- [ ] Manual browser testing (all dropdowns)
- [ ] Settings persistence test (reload page)
- [ ] Validation test (invalid values rejected)
- [ ] Event flow test (all events emitted)
- [ ] Batch update test
- [ ] Export/import test
- [ ] Write unit tests for SettingsModule
- [ ] Integration tests
- [ ] Performance test (event overhead)

---

## File-by-File Checklist

### Core Files

| File | Status | Actions Needed | Priority |
|------|--------|---------------|----------|
| `SettingsModule.js` | ✅ Done | None | - |
| `SettingsManager.js` | 🗑️ To Delete | Delete after Phase 3 | HIGH |
| `PTEApp.js` | ⚠️ Partial | Remove old SettingsManager init | MEDIUM |
| `PTEVocabularyManager.js` | ❌ Not Updated | Add event listeners, privatize setters | HIGH |
| `ProgressTracker.js` | ✅ OK | No settings logic | - |

### UI Files

| File | Status | Actions Needed | Priority |
|------|--------|---------------|----------|
| `UIController.js` | ⚠️ Partial | Find/replace remaining direct calls | HIGH |
| `SettingsPanel.js` | ❌ Not Updated | Replace all `updateSetting()` calls | HIGH |

### Audio Files

| File | Status | Actions Needed | Priority |
|------|--------|---------------|----------|
| `TTSEngine.js` | ❌ Not Updated | Add event listeners, privatize `setSpeechRate()` | HIGH |
| `AudioControls.js` | ❌ Not Updated | Add event listeners, privatize setters | HIGH |
| `VoiceSelector.js` | ❌ Not Updated | Add event listener, privatize `setPreferredVoice()` | HIGH |

### Utility Files

| File | Status | Actions Needed | Priority |
|------|--------|---------------|----------|
| `EventBus.js` | ✅ OK | None | - |
| `Storage.js` | ⚠️ Review | Check for redundant `getSetting()` | MEDIUM |
| `StateManager.js` | ⚠️ Review | Define vs SettingsModule boundaries | MEDIUM |
| `CacheMigration.js` | ❌ Not Updated | Replace `updateSetting()` calls | MEDIUM |

### Data Files

| File | Status | Actions Needed | Priority |
|------|--------|---------------|----------|
| `DatasetManager.js` | ✅ OK | No settings logic | - |
| `extractors/*.js` | ✅ OK | No settings logic | - |

### Shared Files

| File | Status | Actions Needed | Priority |
|------|--------|---------------|----------|
| `Config.js` | ✅ OK | Already centralized | - |
| `DataSchema.js` | ✅ OK | No settings logic | - |

---

## Grep Search Commands

To find remaining old code:

```bash
# Find all uses of old SettingsManager
grep -r "window.settingsManager" src/js/

# Find all direct engine calls (potential issues)
grep -r "setSpeechRate\|setDelay\|setRepeatMode\|setPreferredVoice\|setDifficulty\|setLearningMode" src/js/

# Find any remaining hardcoded <option> tags
grep -r "<option" index.html

# Find redundant getSetting calls
grep -r "getSetting" src/js/
```

---

## Automated Migration Scripts

### Script 1: Find Old Patterns
```bash
#!/bin/bash
# scripts/find-old-patterns.sh

echo "🔍 Searching for old settings patterns..."
echo ""

echo "1. Old SettingsManager calls:"
grep -n "window.settingsManager.updateSetting" src/js/**/*.js || echo "   ✅ None found"

echo ""
echo "2. Direct engine setter calls:"
grep -n "window.ttsEngine.setSpeechRate\|window.audioControls.setDelay" src/js/**/*.js || echo "   ✅ None found"

echo ""
echo "3. Remaining <option> tags:"
grep -n "<option" index.html || echo "   ✅ None found"

echo ""
echo "✅ Scan complete!"
```

### Script 2: Replace Patterns (Careful!)
```bash
#!/bin/bash
# scripts/replace-old-patterns.sh
# WARNING: Review changes before running!

# Replace old updateSetting() calls with events
find src/js -name "*.js" -exec sed -i.bak 's/window\.settingsManager\.updateSetting(\([^,]*\), \([^)]*\))/window.eventBus.emit("setting:request-change", { key: \1, value: \2 })/g' {} +

echo "✅ Replaced! Review .bak files before committing!"
```

---

## Testing Strategy

### Manual Testing Checklist

After each phase, test:

- [ ] **Speed Dropdown**: Changes TTS speed
- [ ] **Delay Dropdown**: Changes pause duration  
- [ ] **Repeat Dropdown**: Changes repeat mode
- [ ] **Voice Dropdown**: Changes TTS voice
- [ ] **Difficulty Dropdown**: Filters vocabulary
- [ ] **Learning Mode Dropdown**: Switches books
- [ ] **Practice Mode Dropdown**: Switches modes
- [ ] **Practice Dataset Dropdown**: Loads datasets
- [ ] **Settings Persist**: Reload page, verify settings kept
- [ ] **Invalid Values**: DOM manipulation rejected
- [ ] **Reset Settings**: Button works
- [ ] **Export Settings**: JSON export works
- [ ] **Import Settings**: JSON import works
- [ ] **Batch Update**: Multiple settings work
- [ ] **Event Emissions**: Check console for events
- [ ] **Error Handling**: Invalid values show errors

### Automated Testing

```javascript
// test/SettingsModule.test.js
describe('SettingsModule', () => {
    it('should validate before applying', async () => {
        const result = await settingsModule.handleSettingChange({
            key: 'speed',
            value: '999' // Invalid
        });
        expect(result.success).toBe(false);
    });
    
    it('should emit events on success', async () => {
        const events = [];
        eventBus.on('setting:changed', (e) => events.push(e));
        
        await settingsModule.handleSettingChange({
            key: 'speed',
            value: '0.7'
        });
        
        expect(events).toHaveLength(1);
    });
    
    it('should persist to storage', async () => {
        await settingsModule.handleSettingChange({
            key: 'speed',
            value: '1.0'
        });
        
        expect(storage.getItem('speed')).toBe('1.0');
    });
});
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | Medium | High | Dual system during migration, thorough testing |
| Missing old code references | Medium | Medium | Comprehensive grep searches, automated scripts |
| Event performance overhead | Low | Low | EventBus is lightweight, measure if needed |
| Team confusion (two patterns) | High | Medium | Clear documentation, coding standards |
| Incomplete migration | Medium | High | This checklist! Track progress systematically |

---

## Progress Tracking

**Overall Progress**: 🟨🟨⬜⬜⬜⬜⬜⬜⬜⬜ 30%

- ✅ Phase 1: Foundation - 100%
- 🚧 Phase 2: Update Files - 30%
- 🔜 Phase 3: Remove Old - 0%
- 🔜 Phase 4: Cleanup - 0%
- 🔜 Phase 5: Testing - 0%

---

## Commit Strategy

Each phase should have structured commits:

```bash
# Phase 2 commits
git commit -m "refactor(ui): Update SettingsPanel to use events"
git commit -m "refactor(audio): Make TTSEngine listen to settings events"
git commit -m "refactor(audio): Make AudioControls listen to settings events"
git commit -m "refactor(audio): Make VoiceSelector listen to settings events"
git commit -m "refactor(core): Make VocabularyManager listen to settings events"

# Phase 3 commits
git commit -m "refactor: Remove old SettingsManager.js"
git commit -m "refactor: Clean up PTEApp initialization"

# Phase 4 commits
git commit -m "refactor: Remove redundant Storage.getSetting()"
git commit -m "docs: Add CODING-STANDARDS.md"
git commit -m "chore: Add ESLint rules for settings pattern"

# Phase 5 commits
git commit -m "test: Add SettingsModule unit tests"
git commit -m "test: Add integration tests for settings flow"
```

---

## Success Criteria

Migration complete when:

- ✅ All files use event-driven pattern
- ✅ Old SettingsManager.js deleted
- ✅ All engine setters privatized or removed
- ✅ No direct module-to-module calls
- ✅ grep searches find no old patterns
- ✅ All manual tests pass
- ✅ Unit tests added and passing
- ✅ Integration tests added and passing
- ✅ Documentation updated
- ✅ Coding standards documented
- ✅ ESLint rules enforced
- ✅ Team onboarded

---

## Next Immediate Actions

1. **Review this plan** with team
2. **Create branch**: `feature/settings-module-migration-phase2`
3. **Update SettingsPanel.js** (highest priority)
4. **Add event listeners to engines** (TTSEngine first)
5. **Test thoroughly** after each file
6. **Commit incrementally** (don't batch!)
7. **Track progress** in this document

---

**Owner**: TBD  
**Reviewers**: TBD  
**Last Updated**: 2025-10-08
