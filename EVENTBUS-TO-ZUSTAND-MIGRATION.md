# EventBus to Zustand Migration Plan

**Generated**: 2025-11-08
**Status**: In Progress (Phase 1 Week 5-6)

## Overview

Migration from EventBus pattern to Zustand state management for improved type safety, performance, and maintainability.

## Analysis Summary

- **Files with EventBus usage**: 12 files
- **Total EventBus usages**: 74 occurrences
- **Event types**: ~25 unique event types
- **Zustand stores**: 6 slices (Audio, TTS, Settings, Vocabulary, Progress, UI)

## EventBus Usage Breakdown

### High Priority Files (Heavy EventBus Usage)

#### 1. AudioControls.js (16 usages)
**Location**: `src/js/audio/AudioControls.js`

**Listeners (8)**:
- `settings:changed` → Settings changes (delay, repeat, etc.)
- `mode:learning:changed` → Learning mode changes (vocabulary books)
- `mode:practice:changed` → Practice mode changes (RS/ASQ/WFD)
- `dataset:practice:changed` → Practice dataset changes
- `audio:autoplay:start` → Start autoplay
- `audio:autoplay:pause` → Pause autoplay
- `audio:navigate:next` → Next item
- `audio:navigate:prev` → Previous item

**Emissions (8)**:
- `audio:autoplay:paused` → Autoplay paused
- `audio:word:started` → Word playback started
- `audio:repeat:changed` → Repeat mode changed
- `content:display` → Display content (3 locations)
- `settings:request-change` → Request settings change

**Migration Strategy**:
```javascript
// BEFORE (EventBus)
eventBus.on('audio:autoplay:start', () => this.startAutoPlay());
eventBus.emit('content:display', { word, index });

// AFTER (Zustand)
// Subscribe to audio store changes
useAppStore.subscribe(
  (state) => state.audio.isAutoPlaying,
  (isAutoPlaying) => {
    if (isAutoPlaying && !this.isPlaying) {
      this.startAutoPlay();
    }
  }
);

// Update store directly
useAppStore.getState().vocabulary.setCurrentItem(word);
useAppStore.getState().audio.setCurrentIndex(index);
```

---

#### 2. UIController.js (15 usages)
**Location**: `src/js/ui/UIController.js`

**Listeners (14)**:
- `vocabulary:loaded` → Update UI
- `vocabulary:difficulty:filtered` → Update book display + buttons
- `mode:learning:changed` → Reset index, update display
- `mode:practice:changed` → Handle practice mode change
- `content:display` → Display current item
- `tts:speaking:started` → Display current item
- `progress:updated` → Update progress display
- `settings:changed` → Handle settings changes
- `audio:autoplay:paused` → Update button states
- `audio:autoplay:stopped` → Update button states
- `audio:word:started` → Highlight current word
- `dataset:practice:changed` → Update UI for practice dataset

**Emissions (1)**:
- `ui:error` → Error occurred

**Migration Strategy**:
```javascript
// BEFORE (EventBus)
eventBus.on('vocabulary:loaded', () => this.updateUI());
eventBus.on('content:display', (data) => this.displayCurrent(data));

// AFTER (Zustand)
// Subscribe to vocabulary changes
useAppStore.subscribe(
  (state) => state.vocabulary.currentDataset,
  () => this.updateUI()
);

// Subscribe to currentItem changes
useAppStore.subscribe(
  (state) => state.vocabulary.currentItem,
  (item) => {
    if (item) this.displayCurrent({ word: item });
  }
);
```

---

#### 3. SettingsModule.js (9 usages)
**Location**: `src/js/core/SettingsModule.js`

**Listeners (2)**:
- `settings:request-change` → Handle setting change request

**Emissions (7)**:
- `settings:changed` → Setting changed (7 different settings)
- `mode:learning:changed` → Learning mode changed
- `mode:practice:changed` → Practice mode changed

**Migration Strategy**:
```javascript
// BEFORE (EventBus)
eventBus.on('settings:request-change', ({ key, value }) => {
  this.set(key, value);
  eventBus.emit('settings:changed', { key, value });
});

// AFTER (Zustand)
// Settings changes are now direct store updates
// No need for request-change pattern
useAppStore.getState().settings.updateSetting('learningMode', 'pte-beginner');

// Components subscribe to settings changes
useAppStore.subscribe(
  (state) => state.settings.learningMode,
  (mode) => {
    // React to learning mode change
    this.loadVocabulary(mode);
  }
);
```

---

#### 4. SettingsPanel.js (6 usages)
**Location**: `src/js/ui/SettingsPanel.js`

**Listeners (1)**:
- `voice:preference:changed` → Update voice selection UI

**Emissions (0)** - Uses `saveSetting()` which calls SettingsModule

**Migration Strategy**:
```javascript
// BEFORE (EventBus via SettingsModule)
this.saveSetting('practiceMode', mode);
// SettingsModule emits settings:changed

// AFTER (Zustand)
useAppStore.getState().settings.updateSetting('practiceMode', mode);

// Listen to voice changes
useAppStore.subscribe(
  (state) => state.tts.selectedVoice,
  (voice) => {
    if (voice) this.updateVoiceSelection(voice.name);
  }
);
```

---

#### 5. TTSEngine.js (7 usages)
**Location**: `src/js/audio/TTSEngine.js`

**Listeners (1)**:
- `settings:changed` → Handle setting changes (voice, rate)

**Emissions (6)**:
- `tts:speaking:started` → TTS started (3 locations)
- `tts:speaking:completed` → TTS completed (2 locations)
- `tts:repeat:changed` → Repeat count changed
- `tts:stopped` → TTS stopped

**Migration Strategy**:
```javascript
// BEFORE (EventBus)
eventBus.emit('tts:speaking:started', { word, phonetic, mode });
eventBus.on('settings:changed', ({ key, value }) => {
  if (key === 'ttsVoice') this.setVoice(value);
});

// AFTER (Zustand)
useAppStore.getState().tts.startSpeaking(word, phonetic, mode);

// Subscribe to TTS settings
useAppStore.subscribe(
  (state) => state.settings.ttsVoice,
  (voiceName) => {
    if (voiceName) this.setVoice(voiceName);
  }
);
```

---

#### 6. PTEVocabularyManager.js (5 usages)
**Location**: `src/js/core/PTEVocabularyManager.js`

**Listeners (1)**:
- `settings:changed` → Handle difficulty/learning mode changes

**Emissions (2)**:
- `vocabulary:updated` → Vocabulary updated (2 locations)

**Migration Strategy**:
```javascript
// BEFORE (EventBus)
eventBus.on('settings:changed', ({ key, value }) => {
  if (key === 'learningMode') await this.setLearningMode(value);
  if (key === 'difficulty') this.setDifficulty(value);
});

eventBus.emit('vocabulary:updated', { totalWords, learningMode });

// AFTER (Zustand)
// Load vocabulary directly to store
const dataset = await this.loadDataset(mode);
useAppStore.getState().vocabulary.setDataset(dataset, mode);

// Subscribe to settings changes
useAppStore.subscribe(
  (state) => state.settings.learningMode,
  async (mode) => {
    await this.loadWordsForMode(mode);
  }
);

useAppStore.subscribe(
  (state) => state.settings.difficultyFilter,
  (difficulty) => {
    useAppStore.getState().vocabulary.filterByDifficulty(difficulty);
  }
);
```

---

#### 7. ProgressTracker.js (4 usages)
**Location**: `src/js/core/ProgressTracker.js`

**Emissions (1)**:
- `progress:updated` → Progress updated

**Migration Strategy**:
```javascript
// BEFORE (EventBus)
eventBus.emit('progress:updated', {
  currentIndex,
  totalWords,
  percentage,
  currentWord
});

// AFTER (Zustand)
useAppStore.getState().progress.updateProgress(currentIndex, totalWords);
```

---

### Medium Priority Files

#### 8. VoiceSelector.js (2 usages)
**Location**: `src/js/audio/VoiceSelector.js`

**Listeners (1)**:
- `settings:changed` → Handle voice setting changes

**Emissions (1)**:
- `voice:preference:changed` → Voice changed

**Migration Strategy**:
```javascript
// BEFORE
eventBus.emit('voice:preference:changed', { voiceName });

// AFTER
useAppStore.getState().tts.setVoice(voice);
useAppStore.getState().settings.updateSetting('ttsVoice', voice.name);
```

---

#### 9. DatasetManager.js (2 usages)
**Listeners (0)**

**Emissions (2)**:
- `dataset:practice:changed` → Practice dataset changed

**Migration Strategy**:
```javascript
// BEFORE
eventBus.emit('dataset:practice:changed', { datasetId, itemCount, mode });

// AFTER
useAppStore.getState().vocabulary.setDataset(dataset, mode);
```

---

#### 10. autoSyncManager.js (3 usages)
**Location**: `src/js/supabase/autoSyncManager.js`

**Listeners (2)**:
- `settings:changed` → Sync settings to Supabase
- `progress:updated` → Sync progress to Supabase

**Emissions (1)**:
- (System events)

**Migration Strategy**:
```javascript
// BEFORE
eventBus.on('settings:changed', async ({ key, value }) => {
  await this.syncSetting(key, value);
});

// AFTER
useAppStore.subscribe(
  (state) => state.settings,
  async (settings) => {
    await this.syncSettings(settings);
  }
);

useAppStore.subscribe(
  (state) => state.progress,
  async (progress) => {
    await this.syncProgress(progress);
  }
);
```

---

## Migration Order & Timeline

### Phase 1: Core State (Week 5-6) ✅ COMPLETED
- [x] Install Zustand + middleware
- [x] Create store types (`src/ts/stores/types.ts`)
- [x] Implement 6 store slices (`src/ts/stores/index.ts`)
- [x] Configure persistence (settings + progress)
- [x] Configure DevTools integration
- [x] Compile TypeScript to JavaScript

### Phase 2: Audio & Navigation (Week 6)
Priority: **HIGH** - Core functionality

**Files to Migrate**:
1. ✅ Create migration plan
2. ⏳ **AudioControls.js** - Replace 16 EventBus usages
   - Replace event listeners with store subscriptions
   - Replace event emissions with store actions
   - Test autoplay, navigation, repeat modes
3. ⏳ **VoiceSelector.js** - Replace 2 EventBus usages
   - Subscribe to TTS store voice changes
   - Update TTS store on voice selection

**Tests**:
- Autoplay functionality
- Next/Previous navigation
- Repeat mode toggling
- Voice selection persistence

---

### Phase 3: UI & Display (Week 6)
Priority: **HIGH** - User experience

**Files to Migrate**:
1. ⏳ **UIController.js** - Replace 15 EventBus usages
   - Subscribe to vocabulary changes
   - Subscribe to currentItem changes
   - Subscribe to mode changes
   - Update error handling to use UI store
2. ⏳ **ProgressTracker.js** - Replace 4 EventBus usages
   - Update progress store directly
   - Remove event emissions

**Tests**:
- Content display updates
- Progress tracking
- Error notifications
- Mode switching UI updates

---

### Phase 4: Settings & Management (Week 7)
Priority: **MEDIUM** - Configuration management

**Files to Migrate**:
1. ⏳ **SettingsModule.js** - Replace 9 EventBus usages
   - Remove event-based settings pattern
   - Direct store updates for settings
   - Keep validation logic
2. ⏳ **SettingsPanel.js** - Replace 6 EventBus usages
   - Update settings store directly
   - Subscribe to settings changes for UI updates
3. ⏳ **PTEVocabularyManager.js** - Replace 5 EventBus usages
   - Subscribe to settings changes
   - Update vocabulary store directly
   - Remove vocabulary:updated emissions

**Tests**:
- Settings persistence
- Settings panel UI updates
- Vocabulary loading on settings changes
- Difficulty filtering

---

### Phase 5: TTS & Audio (Week 7)
Priority: **MEDIUM** - Speech functionality

**Files to Migrate**:
1. ⏳ **TTSEngine.js** - Replace 7 EventBus usages
   - Update TTS store on speaking events
   - Subscribe to settings changes
   - Remove TTS event emissions

**Tests**:
- TTS speaking started/completed
- TTS rate changes
- TTS voice changes
- Repeat functionality

---

### Phase 6: Data & Sync (Week 7-8)
Priority: **LOW** - Data management

**Files to Migrate**:
1. ⏳ **DatasetManager.js** - Replace 2 EventBus usages
   - Update vocabulary store directly
   - Remove dataset:practice:changed emission
2. ⏳ **autoSyncManager.js** - Replace 3 EventBus usages
   - Subscribe to settings store
   - Subscribe to progress store
   - Sync on state changes

**Tests**:
- Dataset loading
- Supabase settings sync
- Supabase progress sync
- Multi-device sync

---

## Event to Store Mapping

### Audio Events → Audio Store
- `audio:autoplay:start` → `audio.startAutoPlay()`
- `audio:autoplay:pause` → `audio.pauseAutoPlay()`
- `audio:navigate:next` → `audio.navigateNext()`
- `audio:navigate:prev` → `audio.navigatePrev()`
- `audio:repeat:changed` → `audio.toggleRepeat()`

### TTS Events → TTS Store
- `tts:speaking:started` → `tts.startSpeaking(word, phonetic, mode)`
- `tts:speaking:completed` → `tts.stopSpeaking()`
- `tts:stopped` → `tts.stopSpeaking()`

### Settings Events → Settings Store
- `settings:changed` → `settings.updateSetting(key, value)`
- `settings:request-change` → `settings.updateSetting(key, value)` (direct)

### Vocabulary Events → Vocabulary Store
- `vocabulary:loaded` → `vocabulary.setDataset(dataset, mode)`
- `vocabulary:updated` → `vocabulary.setDataset(dataset, mode)`
- `vocabulary:difficulty:filtered` → `vocabulary.filterByDifficulty(difficulty)`

### Progress Events → Progress Store
- `progress:updated` → `progress.updateProgress(index, total)`

### UI Events → UI Store
- `ui:error` → `ui.showNotification(message, 'error')`
- `content:display` → `vocabulary.setCurrentItem(item)`

### Mode Events → Settings Store
- `mode:learning:changed` → `settings.updateSetting('vocabularyBook', mode)`
- `mode:practice:changed` → `settings.updateSetting('practiceMode', mode)`

---

## Migration Patterns

### Pattern 1: Event Listener → Store Subscription
```javascript
// BEFORE
eventBus.on('settings:changed', ({ key, value }) => {
  if (key === 'learningMode') {
    this.handleModeChange(value);
  }
});

// AFTER
useAppStore.subscribe(
  (state) => state.settings.learningMode,
  (mode) => {
    this.handleModeChange(mode);
  }
);
```

### Pattern 2: Event Emission → Store Action
```javascript
// BEFORE
eventBus.emit('tts:speaking:started', { word, phonetic });

// AFTER
useAppStore.getState().tts.startSpeaking(word, phonetic);
```

### Pattern 3: Event-Driven Data Flow → Direct Store Updates
```javascript
// BEFORE
async loadDataset(mode) {
  const dataset = await fetch(...);
  eventBus.emit('vocabulary:loaded', { mode, wordCount: dataset.length });
}

// Component listening
eventBus.on('vocabulary:loaded', () => {
  this.updateUI();
});

// AFTER
async loadDataset(mode) {
  const dataset = await fetch(...);
  useAppStore.getState().vocabulary.setDataset(dataset, mode);
  // Components automatically react via subscriptions
}

// Component subscribing
useAppStore.subscribe(
  (state) => state.vocabulary.currentDataset,
  () => {
    this.updateUI();
  }
);
```

### Pattern 4: Multi-Module Communication → Centralized State
```javascript
// BEFORE (Module A emits, Module B listens)
// Module A
eventBus.emit('audio:word:started', { word, index });

// Module B
eventBus.on('audio:word:started', ({ word, index }) => {
  this.displayWord(word);
  this.updateProgress(index);
});

// AFTER (Both modules access shared state)
// Module A
useAppStore.getState().vocabulary.setCurrentItem(word);
useAppStore.getState().audio.setCurrentIndex(index);

// Module B (automatic reaction via subscription)
useAppStore.subscribe(
  (state) => state.vocabulary.currentItem,
  (word) => {
    if (word) this.displayWord(word);
  }
);

useAppStore.subscribe(
  (state) => state.audio.currentIndex,
  (index) => {
    this.updateProgress(index);
  }
);
```

---

## TypeScript Integration

All store interactions will be type-safe:

```typescript
import { useAppStore } from './stores';

// Type-safe store access
const currentItem = useAppStore.getState().vocabulary.currentItem;
// currentItem is typed as VocabularyItem | PracticeItem | null

// Type-safe actions
useAppStore.getState().settings.updateSetting('learningMode', 'pte-beginner');
// TypeScript enforces valid keys and value types

// Type-safe subscriptions
useAppStore.subscribe(
  (state) => state.audio.isAutoPlaying,
  (isAutoPlaying: boolean) => {
    // isAutoPlaying is typed as boolean
  }
);
```

---

## Testing Strategy

### Unit Tests
- Store action tests (settings updates, vocabulary filtering, etc.)
- Store subscription tests (listeners fire correctly)
- Persistence tests (localStorage serialization)

### Integration Tests
- Component integration with stores
- Multi-store interactions (e.g., settings → vocabulary loading)
- Cross-module state synchronization

### End-to-End Tests
- Full user workflows (vocabulary browsing, practice modes, etc.)
- Autoplay functionality
- Settings persistence across page reloads

---

## Rollback Plan

If migration causes critical issues:

1. **Keep EventBus temporarily** - Run both systems in parallel
2. **Feature flags** - Toggle between EventBus and Zustand per module
3. **Gradual rollout** - Migrate one module at a time, test thoroughly
4. **Revert commits** - Each migration step is a separate commit for easy rollback

---

## Success Metrics

- ✅ Zero EventBus usage in migrated modules
- ✅ All existing functionality works identically
- ✅ Type safety enforced across all state interactions
- ✅ Performance improvements (measured via DevTools)
- ✅ Reduced code complexity (fewer event listeners)
- ✅ Improved debugging (Redux DevTools time-travel)

---

## Next Steps

1. ✅ **Create migration plan** (this document)
2. ⏳ **Migrate AudioControls.js** (16 usages) - START HERE
3. ⏳ **Test audio functionality thoroughly**
4. ⏳ **Migrate UIController.js** (15 usages)
5. ⏳ **Continue with remaining modules**

---

## Notes

- **Backward Compatibility**: Keep EventBus.js file during migration for any external dependencies
- **Global Exposure**: Zustand store is exposed as `window.appStore` for vanilla JS compatibility
- **DevTools**: Redux DevTools enabled in development for debugging
- **Persistence**: Settings and progress automatically persist to localStorage
- **Type Safety**: Full TypeScript support with type inference
