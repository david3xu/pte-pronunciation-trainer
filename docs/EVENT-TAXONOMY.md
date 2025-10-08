# Event Taxonomy & Naming Convention

**Version:** v2.4.0  
**Date:** October 8, 2025  
**Status:** Phase 2.1 - Event Standardization

---

## 📋 Table of Contents

- [Overview](#overview)
- [Naming Convention](#naming-convention)
- [Event Categories](#event-categories)
- [Migration Map](#migration-map)
- [Event Registry](#event-registry)
- [Usage Guidelines](#usage-guidelines)

---

## Overview

This document establishes a **standardized event naming taxonomy** for the PTE Pronunciation Trainer application. All events follow a consistent namespace pattern aligned with the **"no hardcoded values"** design philosophy.

### Design Principles

1. **Consistent Namespace Pattern**: `domain:action[:modifier]`
2. **Self-Documenting**: Event names clearly describe what happened
3. **Hierarchical**: Use colons to create semantic hierarchy
4. **Action-Oriented**: Past tense for completed actions, present for ongoing
5. **Single Source of Truth**: Event names defined in Config.js

---

## Naming Convention

### Pattern

```
domain:action[:modifier]
```

### Components

1. **Domain** (required): The feature area or module
   - Examples: `content`, `audio`, `settings`, `tts`, `dataset`, `progress`

2. **Action** (required): What happened
   - Past tense for completed events: `changed`, `loaded`, `updated`, `started`, `completed`
   - Present tense for requests: `change`, `load`, `update`

3. **Modifier** (optional): Additional context
   - State changes: `started`, `completed`, `paused`
   - Specificity: `autoplay:started`, `repeat:changed`

### Examples

✅ **Good:**
```javascript
'content:display'       // Display content (unified for word/practice)
'audio:autoplay:started'
'settings:changed'
'tts:speaking:started'
```

❌ **Bad:**
```javascript
'word:display'          // Too specific, use 'content:display'
'tts:speakingStarted'   // Inconsistent casing
'vocabulary:learningModeChanged'  // Too specific, use 'settings:learning-mode:changed'
```

---

## Event Categories

### 1. Content Events

**Domain:** `content`  
**Purpose:** Display and navigation of vocabulary/practice content

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `word:display` | `content:display` | Display current content (unified) |
| - | `content:next` | Navigate to next item |
| - | `content:prev` | Navigate to previous item |

### 2. Audio Events

**Domain:** `audio`  
**Purpose:** Audio playback control

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `audio:start` | `audio:autoplay:start` | Start autoplay mode |
| `audio:pause` | `audio:autoplay:pause` | Pause autoplay mode |
| `audio:next` | `audio:navigate:next` | Navigate next (audio context) |
| `audio:prev` | `audio:navigate:prev` | Navigate previous (audio context) |
| `audioControls:autoPlayStarted` | `audio:autoplay:started` | Autoplay started (event) |
| `audioControls:autoPlayPaused` | `audio:autoplay:paused` | Autoplay paused (event) |
| `audioControls:wordPlayStarted` | `audio:word:started` | Word playback started |
| `audioControls:delayChanged` | `audio:delay:changed` | Autoplay delay changed |
| `audioControls:repeatModeChanged` | `audio:repeat:changed` | Repeat mode changed |

### 3. TTS Events

**Domain:** `tts`  
**Purpose:** Text-to-speech engine events

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `tts:speakingStarted` | `tts:speaking:started` | TTS started speaking |
| `tts:speakingCompleted` | `tts:speaking:completed` | TTS finished speaking |
| `tts:stopped` | `tts:speaking:stopped` | TTS stopped |
| `tts:rateChanged` | `tts:rate:changed` | Speech rate changed |
| `tts:repeatModeChanged` | `tts:repeat:changed` | TTS repeat mode changed |

### 4. Settings Events

**Domain:** `settings`  
**Purpose:** Application settings and configuration

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `setting:request-change` | `settings:request-change` | Request setting change |
| `setting:changed` | `settings:changed` | Setting changed |
| `setting:error` | `settings:error` | Setting validation error |
| `settings:reset` | `settings:reset` | ✅ Already correct |
| `settings:batch-updated` | `settings:batch-updated` | ✅ Already correct |
| `settings:panelOpened` | `settings:panel:opened` | Settings panel opened |
| `settings:panelClosed` | `settings:panel:closed` | Settings panel closed |
| `settings:exported` | `settings:exported` | ✅ Already correct |
| `settings:imported` | `settings:imported` | ✅ Already correct |

### 5. Mode Events

**Domain:** `mode`  
**Purpose:** Practice mode and learning mode changes

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `practice:modeChanged` | `mode:practice:changed` | Practice mode changed |
| `vocabulary:learningModeChanged` | `mode:learning:changed` | Learning mode changed |
| `practiceMode:changed` | `mode:practice:changed` | (Duplicate) |
| - | `mode:practice:changing` | **NEW** Before change |
| - | `mode:learning:changing` | **NEW** Before change |

### 6. Dataset Events

**Domain:** `dataset`  
**Purpose:** Dataset loading and management

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `dataset:loaded` | `dataset:loaded` | ✅ Already correct |
| `dataset:error` | `dataset:error` | ✅ Already correct |
| `practiceDataset:changed` | `dataset:practice:changed` | Practice dataset changed |

### 7. Vocabulary Events

**Domain:** `vocabulary`  
**Purpose:** Vocabulary-specific events

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `vocabulary:loaded` | `vocabulary:loaded` | ✅ Already correct |
| `vocabulary:updated` | `vocabulary:updated` | ✅ Already correct |
| `vocabulary:difficultyFiltered` | `vocabulary:difficulty:filtered` | Difficulty filter applied |
| `vocabulary:load-error` | `vocabulary:error` | Load error occurred |

### 8. Progress Events

**Domain:** `progress`  
**Purpose:** Learning progress tracking

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `progress:updated` | `progress:updated` | ✅ Already correct |
| `status:updated` | `progress:status:updated` | Status updated |
| `stats:updated` | `progress:stats:updated` | Statistics updated |
| `error:occurred` | `progress:error` | Error occurred |

### 9. Voice Events

**Domain:** `voice`  
**Purpose:** TTS voice selection

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `voice:preferenceChanged` | `voice:preference:changed` | Voice preference changed |

### 10. App Events

**Domain:** `app`  
**Purpose:** Application lifecycle

| Old Event | New Event | Description |
|-----------|-----------|-------------|
| `app:initialized` | `app:initialized` | ✅ Already correct |

---

## Migration Map

### High Priority (Phase 2.1)

**Must change for consistency:**

1. ✅ `word:display` → `content:display` (CRITICAL - unified display)
2. ✅ `tts:speakingStarted` → `tts:speaking:started`
3. ✅ `tts:speakingCompleted` → `tts:speaking:completed`
4. ✅ `setting:*` → `settings:*` (singular → plural)
5. ✅ `practice:modeChanged` → `mode:practice:changed`
6. ✅ `vocabulary:learningModeChanged` → `mode:learning:changed`

### Medium Priority (Phase 2.2)

**Add lifecycle events:**

7. ⏳ Add `mode:practice:changing` (before change)
8. ⏳ Add `mode:practice:changed` (after change)
9. ⏳ Add `mode:learning:changing` (before change)
10. ⏳ Add `mode:learning:changed` (after change)

### Low Priority (Phase 3)

**Nice to have standardization:**

11. `audioControls:*` → `audio:*`
12. `vocabulary:difficultyFiltered` → `vocabulary:difficulty:filtered`
13. Unify audio navigation events

---

## Event Registry

### Config.js Integration

All event names should be defined in `Config.js` as single source of truth:

```javascript
events: {
    // Content events
    content: {
        display: 'content:display',
        next: 'content:next',
        prev: 'content:prev'
    },
    
    // Audio events
    audio: {
        autoplay: {
            start: 'audio:autoplay:start',
            started: 'audio:autoplay:started',
            pause: 'audio:autoplay:pause',
            paused: 'audio:autoplay:paused'
        },
        navigate: {
            next: 'audio:navigate:next',
            prev: 'audio:navigate:prev'
        },
        word: {
            started: 'audio:word:started'
        },
        delay: {
            changed: 'audio:delay:changed'
        },
        repeat: {
            changed: 'audio:repeat:changed'
        }
    },
    
    // TTS events
    tts: {
        speaking: {
            started: 'tts:speaking:started',
            completed: 'tts:speaking:completed',
            stopped: 'tts:speaking:stopped'
        },
        rate: {
            changed: 'tts:rate:changed'
        },
        repeat: {
            changed: 'tts:repeat:changed'
        }
    },
    
    // Settings events
    settings: {
        requestChange: 'settings:request-change',
        changed: 'settings:changed',
        error: 'settings:error',
        reset: 'settings:reset',
        batchUpdated: 'settings:batch-updated',
        panel: {
            opened: 'settings:panel:opened',
            closed: 'settings:panel:closed'
        },
        exported: 'settings:exported',
        imported: 'settings:imported'
    },
    
    // Mode events
    mode: {
        practice: {
            changing: 'mode:practice:changing',
            changed: 'mode:practice:changed'
        },
        learning: {
            changing: 'mode:learning:changing',
            changed: 'mode:learning:changed'
        }
    },
    
    // Dataset events
    dataset: {
        loaded: 'dataset:loaded',
        error: 'dataset:error',
        practice: {
            changed: 'dataset:practice:changed'
        }
    },
    
    // Vocabulary events
    vocabulary: {
        loaded: 'vocabulary:loaded',
        updated: 'vocabulary:updated',
        difficulty: {
            filtered: 'vocabulary:difficulty:filtered'
        },
        error: 'vocabulary:error'
    },
    
    // Progress events
    progress: {
        updated: 'progress:updated',
        status: {
            updated: 'progress:status:updated'
        },
        stats: {
            updated: 'progress:stats:updated'
        },
        error: 'progress:error'
    },
    
    // Voice events
    voice: {
        preference: {
            changed: 'voice:preference:changed'
        }
    },
    
    // App events
    app: {
        initialized: 'app:initialized'
    }
}
```

### Usage Example

```javascript
// ✅ GOOD: Use Config.js event names
const config = new Config();
const eventName = config.get('events.content.display');
window.eventBus.emit(eventName, data);

// ❌ BAD: Hardcoded event names
window.eventBus.emit('word:display', data);
```

---

## Usage Guidelines

### 1. Emitting Events

Always use Config.js for event names:

```javascript
// In any module
this.eventBus.emit(
    this.config.get('events.tts.speaking.started'),
    { word, voice, rate }
);
```

### 2. Listening to Events

```javascript
// Subscribe using Config.js
this.eventBus.on(
    this.config.get('events.content.display'),
    this.handleDisplay.bind(this)
);
```

### 3. Event Data Payload

Standardize event data structure:

```javascript
{
    // Core data (varies by event)
    word: 'example',
    index: 0,
    mode: 'vocabulary',
    
    // Metadata (consistent across all events)
    timestamp: Date.now(),
    source: 'UIController',
    
    // Optional context
    metadata: {
        previousValue: 'old',
        trigger: 'user-action'
    }
}
```

### 4. Backward Compatibility

During migration, support both old and new event names temporarily:

```javascript
// Emit both for transition period
this.eventBus.emit('word:display', data);  // Legacy
this.eventBus.emit('content:display', data);  // New

// After migration period, remove legacy
```

---

## Benefits

### ✅ Consistency
- All events follow same pattern
- Easy to predict event names
- Self-documenting code

### ✅ Maintainability
- Single source of truth (Config.js)
- Easy to find all events
- Type-safe event names

### ✅ Scalability
- Easy to add new events
- Clear namespace prevents collisions
- Hierarchical organization

### ✅ Debugging
- Event names describe what happened
- Easy to trace event flow
- Better logging and monitoring

---

## Implementation Checklist

### Phase 2.1: Event Name Standardization

- [ ] Add event registry to Config.js
- [ ] Update all event emitters to use Config.js
- [ ] Update all event listeners to use Config.js
- [ ] Verify no hardcoded event strings remain
- [ ] Update documentation

### Phase 2.2: Mode Change Lifecycle Events

- [ ] Add `mode:practice:changing` event
- [ ] Add `mode:practice:changed` event
- [ ] Add `mode:learning:changing` event
- [ ] Add `mode:learning:changed` event
- [ ] Update SettingsModule to emit lifecycle events
- [ ] Update UIController to handle lifecycle events

---

## Testing

After implementation, verify:

1. ✅ All events use Config.js event names
2. ✅ No hardcoded event strings in codebase
3. ✅ Event flow works correctly
4. ✅ No regressions in existing functionality
5. ✅ New lifecycle events fire correctly

---

**Related Documents:**
- [DESIGN-PHILOSOPHY.md](./DESIGN-PHILOSOPHY.md) - Core design principles
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [REFACTORING-v58.md](../REFACTORING-v58.md) - Refactoring history
- [CONFIG-FLOW-DIAGRAM.md](./CONFIG-FLOW-DIAGRAM.md) - Configuration flow

---

*Last Updated: October 8, 2025 | Phase 2.1 Event Standardization*
