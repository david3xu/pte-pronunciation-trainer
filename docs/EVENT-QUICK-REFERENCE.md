# Event System Quick Reference

**Quick lookup guide for PTE Pronunciation Trainer events**  
**Version:** v2.4.0

---

## 🔥 Most Used Events

### Display & Navigation
```javascript
// Display content (unified for vocabulary + practice modes)
window.appConfig.get('events.content.display')
// → 'content:display'

// Navigate
window.appConfig.get('events.content.next')
window.appConfig.get('events.content.prev')
```

### TTS (Text-to-Speech)
```javascript
// Speaking lifecycle
window.appConfig.get('events.tts.speaking.started')    // → 'tts:speaking:started'
window.appConfig.get('events.tts.speaking.completed')  // → 'tts:speaking:completed'
window.appConfig.get('events.tts.speaking.stopped')    // → 'tts:speaking:stopped'

// TTS controls
window.appConfig.get('events.tts.rate.changed')        // → 'tts:rate:changed'
window.appConfig.get('events.tts.repeat.changed')      // → 'tts:repeat:changed'
```

### Settings
```javascript
// Request/response pattern
window.appConfig.get('events.settings.requestChange')  // → 'settings:request-change'
window.appConfig.get('events.settings.changed')        // → 'settings:changed'
window.appConfig.get('events.settings.error')          // → 'settings:error'
```

### Mode Changes (with Lifecycle)
```javascript
// Practice mode lifecycle
window.appConfig.get('events.mode.practice.changing')  // → 'mode:practice:changing' (BEFORE)
window.appConfig.get('events.mode.practice.changed')   // → 'mode:practice:changed' (AFTER)

// Learning mode lifecycle
window.appConfig.get('events.mode.learning.changing')  // → 'mode:learning:changing' (BEFORE)
window.appConfig.get('events.mode.learning.changed')   // → 'mode:learning:changed' (AFTER)
```

---

## 📖 Usage Patterns

### 1. Listen to Events
```javascript
// Get event name from Config.js
const eventName = window.appConfig.get('events.tts.speaking.started');

// Subscribe to event
window.eventBus.on(eventName, (data) => {
    console.log('TTS started speaking:', data.word);
});
```

### 2. Emit Events
```javascript
// Get event name from Config.js
const eventName = window.appConfig.get('events.content.display');

// Emit event with payload
window.eventBus.emit(eventName, {
    word: currentWord,
    index: currentIndex,
    timestamp: Date.now()
});
```

### 3. Mode Change Lifecycle
```javascript
// Listen to BOTH lifecycle events
window.eventBus.on(
    window.appConfig.get('events.mode.practice.changing'),
    (data) => {
        console.log('Mode changing:', data.oldMode, '→', data.newMode);
        // Prepare for mode change (save state, cleanup)
    }
);

window.eventBus.on(
    window.appConfig.get('events.mode.practice.changed'),
    (data) => {
        console.log('Mode changed:', data.oldMode, '→', data.mode);
        // React to new mode (load data, update UI)
    }
);
```

---

## 🗂️ Complete Event Registry

### Content Events
```javascript
events.content.display  → 'content:display'
events.content.next     → 'content:next'
events.content.prev     → 'content:prev'
```

### Audio Events
```javascript
events.audio.autoplay.start      → 'audio:autoplay:start'
events.audio.autoplay.started    → 'audio:autoplay:started'
events.audio.autoplay.pause      → 'audio:autoplay:pause'
events.audio.autoplay.paused     → 'audio:autoplay:paused'
events.audio.navigate.next       → 'audio:navigate:next'
events.audio.navigate.prev       → 'audio:navigate:prev'
events.audio.word.started        → 'audio:word:started'
events.audio.delay.changed       → 'audio:delay:changed'
events.audio.repeat.changed      → 'audio:repeat:changed'
```

### TTS Events
```javascript
events.tts.speaking.started      → 'tts:speaking:started'
events.tts.speaking.completed    → 'tts:speaking:completed'
events.tts.speaking.stopped      → 'tts:speaking:stopped'
events.tts.rate.changed          → 'tts:rate:changed'
events.tts.repeat.changed        → 'tts:repeat:changed'
```

### Settings Events
```javascript
events.settings.requestChange    → 'settings:request-change'
events.settings.changed          → 'settings:changed'
events.settings.error            → 'settings:error'
events.settings.reset            → 'settings:reset'
events.settings.batchUpdated     → 'settings:batch-updated'
events.settings.panel.opened     → 'settings:panel:opened'
events.settings.panel.closed     → 'settings:panel:closed'
events.settings.exported         → 'settings:exported'
events.settings.imported         → 'settings:imported'
```

### Mode Events
```javascript
events.mode.practice.changing    → 'mode:practice:changing'   ⭐ NEW
events.mode.practice.changed     → 'mode:practice:changed'
events.mode.learning.changing    → 'mode:learning:changing'   ⭐ NEW
events.mode.learning.changed     → 'mode:learning:changed'    ⭐ NEW
```

### Dataset Events
```javascript
events.dataset.loaded            → 'dataset:loaded'
events.dataset.error             → 'dataset:error'
events.dataset.practice.changed  → 'dataset:practice:changed'
```

### Vocabulary Events
```javascript
events.vocabulary.loaded              → 'vocabulary:loaded'
events.vocabulary.updated             → 'vocabulary:updated'
events.vocabulary.difficulty.filtered → 'vocabulary:difficulty:filtered'
events.vocabulary.error               → 'vocabulary:error'
```

### Progress Events
```javascript
events.progress.updated              → 'progress:updated'
events.progress.status.updated       → 'progress:status:updated'
events.progress.stats.updated        → 'progress:stats:updated'
events.progress.error                → 'progress:error'
```

### Voice Events
```javascript
events.voice.preference.changed      → 'voice:preference:changed'
```

### App Events
```javascript
events.app.initialized               → 'app:initialized'
```

---

## 🎨 Event Naming Pattern

```
domain:action[:modifier]
  │      │        │
  │      │        └─ Optional: Additional context
  │      └─ What happened (past tense)
  └─ Feature area
```

### Examples
```
content:display           ← Display content
tts:speaking:started      ← TTS started speaking
settings:panel:opened     ← Settings panel opened
mode:practice:changing    ← Practice mode is changing
```

---

## 🔍 Find All Events in Console

```javascript
// View complete event registry
console.table(window.appConfig.get('events'));

// Get specific category
console.log(window.appConfig.get('events.tts'));

// Search for events
Object.entries(window.appConfig.get('events')).forEach(([domain, events]) => {
    console.log(`${domain}:`, events);
});
```

---

## ⚡ Common Patterns

### Request/Response Pattern (Settings)
```javascript
// 1. User requests change
window.eventBus.emit(
    window.appConfig.get('events.settings.requestChange'),
    { key: 'speed', value: '1.0' }
);

// 2. SettingsModule validates & applies

// 3. SettingsModule emits success
window.eventBus.emit(
    window.appConfig.get('events.settings.changed'),
    { key: 'speed', value: '1.0' }
);
```

### Lifecycle Pattern (Mode Changes)
```javascript
// 1. BEFORE change
emit('mode:practice:changing', { oldMode, newMode })

// 2. DO the change
window.currentPracticeMode = newMode;

// 3. AFTER change
emit('mode:practice:changed', { mode: newMode, oldMode })
```

### Display Pattern (Content)
```javascript
// Unified display - works for vocabulary AND practice modes
window.eventBus.emit(
    window.appConfig.get('events.content.display'),
    { word: data, index: 0 }
);

// UIController automatically routes to:
// - displayWord() for vocabulary mode
// - displayContent() for practice modes
```

---

## ❌ Don't Do This

```javascript
// ❌ WRONG: Hardcoded event strings
window.eventBus.emit('word:display', data);
window.eventBus.on('tts:speakingStarted', handler);

// ❌ WRONG: Old event names
window.eventBus.emit('practice:modeChanged', data);
window.eventBus.emit('setting:changed', data);
```

## ✅ Do This Instead

```javascript
// ✅ CORRECT: Use Config.js
const eventName = window.appConfig.get('events.content.display');
window.eventBus.emit(eventName, data);

// ✅ CORRECT: Standardized names
window.eventBus.on(
    window.appConfig.get('events.tts.speaking.started'),
    handler
);

// ✅ CORRECT: New event names
window.eventBus.emit(
    window.appConfig.get('events.mode.practice.changed'),
    data
);
```

---

## 📚 See Also

- **EVENT-TAXONOMY.md** - Complete event documentation
- **Config.js** - Event registry source code (lines 340-467)
- **PHASE-2-COMPLETE.md** - Implementation details

---

*Quick Reference v2.4.0 | Last Updated: October 8, 2025*
