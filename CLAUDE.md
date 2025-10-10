# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PTE Pronunciation Trainer** - A web-based pronunciation training application for PTE exam preparation, featuring comprehensive vocabulary (11 books, 12,000+ terms) and practice modes (RS/ASQ/WFD with 2,507 sentences/questions). Built with vanilla JavaScript using event-driven architecture.

**Current Version**: v2.5.4 (Production Ready - October 2025)

## Essential Commands

### Development
```bash
# Start development (processes data + starts server on port 3001)
npm run start

# Start dev server only (port 3001)
npm run dev

# Process PTE vocabulary data (required before first run)
npm run data:pte

# Run tests
npm test

# Lint code
npm run lint
```

### Build & Deploy
```bash
# Production build (minifies JS/CSS)
npm run build

# Full deploy pipeline (data + build + validate)
npm run deploy

# Clean build artifacts
npm run clean

# Validate datasets
npm run validate
```

## Core Architecture Principles

### 1. **Zero Hardcoded Values**
- **ALL configuration in `src/js/shared/Config.js`**
- Never hardcode paths, event names, or settings
- Use `window.appConfig.get('path.to.value')` everywhere

### 2. **Event-Driven Architecture**
- **Complete decoupling via EventBus** (`src/js/utils/EventBus.js`)
- NO direct method calls between modules
- All communication via events defined in `Config.js` (lines 390-508)

**Example**:
```javascript
// ✅ CORRECT: Event-driven
window.eventBus.emit('audio:autoplay:start');

// ❌ WRONG: Direct call
window.audioControls.startAutoPlay();
```

### 3. **Dependency-Ordered Initialization**
- Use **InitializationManager** (`src/js/core/InitializationManager.js`)
- Automatically resolves dependencies via topological sort
- Critical modules fail-fast, optional modules degrade gracefully

### 4. **Handler Registry Pattern** (Settings)
- Settings managed via **SettingsModule** (`src/js/core/SettingsModule.js`)
- Each setting has `validate()`, `apply()`, `default` handlers
- Change settings via events: `emit('settings:request-change', {key, value})`

## Critical Files

### Configuration (Single Source of Truth)
- **`src/js/shared/Config.js`** (715 lines)
  - ALL app configuration (data paths, events, TTS, UI)
  - Event taxonomy (lines 390-508) - namespace: `domain:action[:modifier]`
  - Practice mode mappings (lines 271-298)
  - Dataset registry (lines 29-200)

### Core Application
- **`src/js/core/PTEApp.js`** - Main coordinator, lifecycle manager
- **`src/js/core/PTEVocabularyManager.js`** - Vocabulary loading with retry logic (3 retries, exponential backoff: 1s, 2s, 4s)
- **`src/js/core/SettingsModule.js`** - Event-driven settings (8 settings with handlers)
- **`src/js/core/InitializationManager.js`** - Dependency graph + topological sort

### Audio System
- **`src/js/audio/TTSEngine.js`** - Web Speech API wrapper (word + sentence + question pronunciation)
- **`src/js/audio/AudioControls.js`** - Auto-play, navigation, repeat modes
- **`src/js/audio/VoiceSelector.js`** - Voice preference management

### UI Layer
- **`src/js/ui/UIController.js`** - Main UI controller
- **`src/js/ui/SettingsPanel.js`** - Settings UI (practice mode switching)

### Data Pipeline
- **`scripts/pte-data-pipeline.js`** - Markdown → JSON processing
- **`src/js/data/DatasetManager.js`** - Unified dataset loader (6 types)
- **`src/js/data/extractors/PTETermsExtractor.js`** - Vocabulary extraction
- **`src/js/data/extractors/PTESentenceExtractor.js`** - RS/WFD sentence extraction
- **`src/js/data/extractors/PTEQuestionExtractor.js`** - ASQ question extraction

## Data Architecture

### Dataset Types
1. **Vocabulary** (11 books) - Words with IPA pronunciation
   - PTE FIB Listening, Beginner, Intermediate, Advanced, RA, RS Vocab, Must-Know, WFD Vocab, Reading FIB, Reading FIB Drag, ASQ Answers
2. **Practice** (3 modes) - Sentences/questions for practice
   - Repeat Sentence (620), Answer Short Question (692), Write From Dictation (1,195)

### Data Flow
```
Markdown Source (data/source/pte/)
  ↓ pte-data-pipeline.js
JSON Dataset (data/processed/)
  ↓ DatasetManager/PTEVocabularyManager
Application
```

### Schema Differences
**Vocabulary**: Direct properties
```json
{ "word": "ubiquitous", "difficulty": "hard", "category": "pte-advanced" }
```

**Practice (RS/ASQ/WFD)**: Nested in `metadata`
```json
{ "sentence": "...", "metadata": { "difficulty": "normal", "category": "pte-rs" } }
```

**DatasetManager handles both transparently via `_getItemField()`**

## Important Terminology

### "Category" Has TWO Meanings

⚠️ **Context-dependent**:

1. **✅ Current (PTE)**: Category as **filter field** on vocabulary
   - `word.category = 'pte-beginner'` (metadata for filtering)
   - Used in: `filterByCategory()`, difficulty filters

2. **❌ Legacy (CCL)**: Category as **navigation sections** (REMOVED)
   - ~~CCL had: Health → Education → Travel topics~~
   - ~~Methods: `loadCategory()`, `getPreviousCategory()`~~ (DO NOT use)

**Current Navigation**: User selects **vocabulary book** (e.g., "PTE Beginner"), not categories

## Event System Reference

### Event Naming Convention
Pattern: `domain:action[:modifier]`

### Core Events (from Config.js)
```javascript
// Audio
'audio:autoplay:start', 'audio:autoplay:pause'
'audio:navigate:next', 'audio:navigate:prev'

// Settings
'settings:changed' → {key, value, timestamp}
'settings:request-change' → {key, value}

// TTS
'tts:speaking:started' → {word, phonetic, mode}
'tts:speaking:completed' → {word}

// Content
'content:display' → {word/item, index}

// Mode
'mode:practice:changed' → {mode, timestamp}

// Vocabulary
'vocabulary:loaded' → {mode, wordCount}
'vocabulary:difficulty:filtered' → {difficulty, count}
```

**See `Config.js` lines 390-508 for complete registry**

## CSS Architecture (Phase 2 Refactoring)

### Modular Structure (6 files, 0% duplication)
```
src/css/
├── variables.css (222 lines)      - Design tokens (222 CSS vars)
├── animations.css (95 lines)      - Centralized @keyframes
├── components.css (331 lines)     - BEM components (.btn, .vocab-card)
├── style.css (479 lines)          - Main layout
├── practice-modes.css (552 lines) - RS/ASQ/WFD styles
└── responsive.css (367 lines)     - Media queries
```

**Load Order** (MUST maintain):
```html
1. variables.css   (tokens)
2. animations.css  (keyframes)
3. components.css  (components)
4. style.css       (layout)
5. practice-modes.css (practice-specific)
```

### Design Tokens (variables.css)
- **100+ CSS variables**: `--primary-color`, `--space-lg`, `--radius-md`, `--shadow-sm`
- **Dark mode**: Automatic via `@media (prefers-color-scheme: dark)`
- **High contrast**: `@media (prefers-contrast: high)`

**Never hardcode values - use tokens**

## Error Handling

### Fail-Fast for Critical Modules
- `SettingsModule`, `PTEVocabularyManager`, `UIController` - MUST succeed
- If critical module fails → throw error, stop app

### Graceful Degradation for Optional
- `DatasetManager`, `PracticeModes` - Can fail without breaking app
- If optional fails → log warning, disable feature, continue

### Retry Logic (Network)
```javascript
// PTEVocabularyManager.loadDataset()
maxRetries: 3
delays: [1000, 2000, 4000]  // Exponential backoff
```

### Global Error Events
```javascript
window.eventBus.emit('system:error', {
  event, error, stack, timestamp
});
```

## Common Tasks

### Adding a New Vocabulary Book
1. Add Markdown file to `data/source/pte/vocabs/`
2. Add entry to `Config.js` → `pipeline.registry[]`
3. Add path to `Config.js` → `data.paths.byMode{}`
4. Add to `Config.js` → `data.learningModes[]`
5. Run `npm run data:pte` to process
6. Update Service Worker cache list if needed

### Adding a New Event
1. Define in `Config.js` → `events` object (lines 390-508)
2. Use namespaced pattern: `domain:action[:modifier]`
3. Emit: `window.eventBus.emit(window.appConfig.get('events.domain.action'), data)`
4. Listen: `window.eventBus.on(window.appConfig.get('events.domain.action'), handler)`

### Modifying Settings
1. Edit handlers in `SettingsModule.js` → `handlers` object
2. Add validation, apply logic, default value
3. Update `Config.js` → `settings.defaults` if needed
4. Emit change request: `emit('settings:request-change', {key, value})`

### Debugging Event Flow
- All events logged with timestamps
- Check EventBus error handler for failures
- Listen to `system:error` for global issues

## Testing

- **Unit tests**: `npm test` (Jest + jsdom)
- **Manual testing**: Required for TTS (browser-specific)
- **Validation**: `npm run validate` (checks datasets)

## Common Pitfalls

❌ **Don't**: Hardcode event names as strings
✅ **Do**: Use `window.appConfig.get('events.domain.action')`

❌ **Don't**: Call methods directly between modules
✅ **Do**: Emit events via EventBus

❌ **Don't**: Add magic numbers or paths in code
✅ **Do**: Add to `Config.js` and reference

❌ **Don't**: Use legacy CCL category navigation methods
✅ **Do**: Use current book-based navigation

❌ **Don't**: Assume module is loaded
✅ **Do**: Check existence, handle optional modules gracefully

## Performance Notes

- **Lazy loading**: Datasets loaded on-demand
- **Caching**: Datasets cached in memory after first load
- **Service Worker**: Offline support (v64+)
- **Minification**: Production build reduces size ~40%

## Documentation

- **`docs/GUIDELINES.md`** - Design principles and development rules (START HERE)
- **`docs/ENFORCING-GUIDELINES.md`** - 5 methods to enforce guidelines with AI
- **`docs/ARCHITECTURE.md`** - Detailed system architecture (2,230 lines!)
- **`docs/API-REFERENCE.md`** - Complete API documentation
- **`docs/DEPLOYMENT.md`** - Deployment guide
- **`docs/TROUBLESHOOTING.md`** - Common issues
- **`README.md`** - User-facing overview

## Deployment

### Vercel (Recommended)
```bash
npm run vercel-build  # Auto-runs data pipeline + build
```

### Manual
```bash
npm run deploy  # data + build + validate
# Upload dist/ folder
```

## Version History

- **v2.5.4** (Oct 2025) - Current, production-ready, comprehensive documentation overhaul
- **v2.5.2** - Zero console errors, optimized performance
- **Phase 2** - Practice modes (RS/ASQ/WFD), CSS refactoring

---

**Key Insight**: This is a **configuration-driven, event-based architecture**. Almost every aspect is controlled via `Config.js` and communicated via EventBus. When in doubt, check Config.js first, and never hardcode values.
