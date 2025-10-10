# Development Guidelines

**High-level design principles and rules for developing the PTE Pronunciation Trainer.**

This document defines the **permanent design rules** that guide all development decisions. These principles ensure consistency, maintainability, and scalability across the entire codebase.

---

## Core Design Principles

### 1. Zero Hardcoded Values ⭐

**Rule**: ALL configuration values must be defined in `src/js/shared/Config.js`

**Why**: Single source of truth prevents inconsistencies and makes changes easy.

**Examples**:

✅ **Correct**:
```javascript
const speed = window.appConfig.get('tts.speeds.normal');
const eventName = window.appConfig.get('events.settings.changed');
const dataPath = window.appConfig.get('data.paths.byMode.pte-fib-listening');
```

❌ **Wrong**:
```javascript
const speed = 1.0;  // Hardcoded
const eventName = 'settings:changed';  // Hardcoded
const dataPath = '/data/processed/pte-fib-listening-dataset.json';  // Hardcoded
```

**What goes in Config.js**:
- Event names (ALL events)
- File paths (data, assets, outputs)
- TTS settings (speeds, delays, voices)
- UI configuration (shortcuts, animations)
- Data pipeline configuration
- Build configuration

**Exception**: Only `Config.js` itself can contain literal values. Everywhere else must reference Config.js.

---

### 2. Event-Driven Architecture ⭐

**Rule**: Modules communicate ONLY via EventBus. NO direct method calls between modules.

**Why**: Complete decoupling enables testability, extensibility, and error isolation.

**Pattern**:

```javascript
// ✅ CORRECT: Event-driven communication
// UIController.js
window.eventBus.emit('audio:autoplay:start');

// AudioControls.js
window.eventBus.on('audio:autoplay:start', () => {
  this.startAutoPlay();
});
```

```javascript
// ❌ WRONG: Direct coupling
// UIController.js
window.audioControls.startAutoPlay();  // Direct method call - NEVER DO THIS
```

**Event Naming Convention**:
- Pattern: `domain:action[:modifier]`
- Examples: `settings:changed`, `audio:autoplay:start`, `tts:speaking:completed`
- All event names defined in `Config.js` → `events` object

**Benefits**:
- Loose coupling: UIController doesn't need to know AudioControls exists
- Multiple subscribers: Many modules can react to same event
- Error isolation: Handler errors don't crash the emitter
- Easy testing: Mock events instead of modules

---

### 3. Handler Registry Pattern (Settings)

**Rule**: Settings use handler registry with `validate()`, `apply()`, and `default` methods.

**Why**: Consistent validation and application logic for all settings.

**Structure** (`SettingsModule.js`):

```javascript
handlers = {
  speed: {
    validate: (value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0.6 || num > 1.2) {
        throw new Error('Speed must be between 0.6 and 1.2');
      }
      return num;
    },
    apply: (value) => {
      console.log(`[Settings] Speed changed to ${value}`);
      // Side effects go here
    },
    default: window.appConfig.get('tts.speeds.slow')
  },
  // ... other settings
}
```

**How to Add a New Setting**:
1. Add handler to `SettingsModule.js` → `handlers` object
2. Add default to `Config.js` → `settings.defaults`
3. Request changes via events: `emit('settings:request-change', {key, value})`
4. Listen for changes: `on('settings:changed', handler)`

**Never**:
- ❌ Call `settingsModule.setSetting()` directly
- ❌ Bypass validation
- ❌ Hardcode default values outside Config.js

---

### 4. Dependency-Ordered Initialization

**Rule**: Use `InitializationManager` for module initialization with automatic dependency resolution.

**Why**: Ensures modules initialize in correct order, handles failures gracefully.

**Dependency Graph** (automatically sorted):

```javascript
{
  'EventBus': [],                    // No dependencies
  'Storage': [],
  'Config': [],

  'SettingsModule': ['Config', 'EventBus', 'Storage'],
  'PTEVocabularyManager': ['Config', 'EventBus', 'DatasetManager'],
  'UIController': ['Config', 'EventBus', 'SettingsModule'],
  // ... etc
}
```

**Critical vs Non-Critical Modules**:
- **Critical** (fail-fast): `SettingsModule`, `PTEVocabularyManager`, `UIController`
  - If these fail, app stops and shows error
- **Non-Critical** (graceful degradation): `DatasetManager`, `PracticeModes`
  - If these fail, app continues with reduced functionality

**How to Add a New Module**:
1. Define dependencies in `InitializationManager.js`
2. Mark as critical or non-critical
3. Add health check validation
4. Initialize via `PTEApp.initialize()`

---

### 5. Data Schema Transparency

**Rule**: Handle both vocabulary and practice schemas transparently via `DatasetManager`.

**Why**: Different data sources have different schemas; unified access simplifies code.

**Schema Differences**:

```javascript
// Vocabulary: Direct properties
{
  "word": "ubiquitous",
  "difficulty": "hard",
  "category": "pte-advanced"
}

// Practice (RS/ASQ/WFD): Nested in metadata
{
  "sentence": "The research was comprehensive.",
  "metadata": {
    "difficulty": "normal",
    "category": "pte-rs"
  }
}
```

**Unified Access** (`DatasetManager._getItemField()`):

```javascript
// ✅ CORRECT: Use DatasetManager helper
const difficulty = this._getItemField(item, 'difficulty', type);
// Returns item.difficulty OR item.metadata.difficulty automatically

// ❌ WRONG: Access directly
const difficulty = item.difficulty || item.metadata?.difficulty;  // Fragile
```

**When Adding New Data Sources**:
1. Add schema definition to `DataSchema.js`
2. Update `DatasetManager._getItemField()` if needed
3. Add to `Config.js` → `data.datasetFiles`
4. Create extractor in `src/js/data/extractors/`

---

### 6. Fail-Fast vs Graceful Degradation

**Rule**: Critical modules fail-fast, optional modules degrade gracefully.

**Critical Modules** (throw errors, stop app):
```javascript
if (!window.eventBus) {
  throw new Error('EventBus is required for SettingsModule');
}
```

**Optional Modules** (log warnings, continue):
```javascript
if (!window.DatasetManager) {
  console.warn('PracticeModes unavailable: DatasetManager not loaded');
  return;
}
```

**Guidelines**:
- **Fail-fast** if:
  - App is unusable without this module
  - Data corruption could occur
  - User would see broken UI
- **Degrade gracefully** if:
  - Feature is optional/enhanced
  - Fallback functionality exists
  - Can retry later

---

### 7. CSS Design System (Tokens)

**Rule**: Use CSS variables from `variables.css`. NEVER hardcode values in component styles.

**Why**: Consistent theming, easy changes, automatic dark mode.

**Token Categories** (222 total):
- Colors (`--primary-color`, `--success-color`)
- Spacing (`--space-xs`, `--space-lg`)
- Border radius (`--radius-md`, `--radius-xl`)
- Shadows (`--shadow-sm`, `--shadow-lg`)
- Typography (`--text-base`, `--font-semibold`)
- Transitions (`--transition-fast`, `--transition-slow`)
- Z-index (`--z-modal`, `--z-overlay`)

**Examples**:

✅ **Correct**:
```css
.button {
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  background: var(--primary-color);
  transition: all var(--transition-fast);
}
```

❌ **Wrong**:
```css
.button {
  padding: 12px 24px;           /* Hardcoded */
  border-radius: 8px;           /* Hardcoded */
  background: #4f46e5;          /* Hardcoded */
  transition: all 0.2s ease;    /* Hardcoded */
}
```

**CSS File Load Order** (CRITICAL):
```html
1. variables.css   (tokens first)
2. animations.css  (keyframes)
3. components.css  (reusable components)
4. style.css       (main layout)
5. practice-modes.css (mode-specific)
```

**Never**:
- ❌ Duplicate `@keyframes` definitions (use `animations.css`)
- ❌ Create component-specific button styles (use `.btn` variants)
- ❌ Hardcode colors/spacing/transitions

---

### 8. Error Handling Strategy

**Rule**: All errors must be handled, logged, and optionally emitted as events.

**Patterns**:

**Network Operations** (retry with exponential backoff):
```javascript
const maxRetries = 3;
const retryDelays = [1000, 2000, 4000];  // 1s, 2s, 4s

for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
    } else {
      throw new Error(`Failed after ${maxRetries + 1} attempts: ${error.message}`);
    }
  }
}
```

**Event Handler Errors** (isolate, don't crash):
```javascript
emit(event, data) {
  this.events[event].forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`EventBus error in ${event} handler:`, error);
      this.emit('system:error', { event, error: error.message, stack: error.stack });
    }
  });
}
```

**Module Initialization** (validate dependencies):
```javascript
constructor(config, eventBus, storage) {
  if (!config || !eventBus || !storage) {
    throw new Error('SettingsModule: Missing required dependencies');
  }
  this.config = config;
  this.eventBus = eventBus;
  this.storage = storage;
}
```

**Error Event Emission**:
- `system:error` - Global errors
- `vocabulary:error` - Dataset loading failures
- `tts:error` - Speech synthesis failures
- `settings:error` - Validation failures

---

### 9. State Management

**Rule**: State is managed at three levels with clear persistence rules.

**State Levels**:

1. **Application State** (transient, never persisted)
   - UI states (settings panel open/closed)
   - Loading indicators
   - Temporary error messages

2. **Session State** (persisted per session)
   - Current word index
   - Active filters
   - Temporary selections

3. **Persistent State** (long-term localStorage)
   - User settings (speed, voice, mode)
   - Learning progress (practiced words, scores)
   - Bookmarks

**Persistence Flow**:
```
User Action → Component → EventBus → StateManager → localStorage
```

**Guidelines**:
- ✅ Persist settings immediately on change
- ✅ Restore state on app load
- ✅ Provide fallback defaults if localStorage unavailable
- ✅ Migrate state schema on version upgrades
- ❌ Never persist temporary UI state
- ❌ Never assume localStorage is available

---

### 10. Module Design Principles (SOLID)

**Single Responsibility Principle**:
- Each module has ONE clear purpose
- `TTSEngine` = text-to-speech only
- `ProgressTracker` = learning progress only
- `UIController` = UI rendering only

**Dependency Injection**:
```javascript
// ✅ CORRECT: Inject dependencies via constructor
constructor(config, eventBus, ttsEngine) {
  this.config = config;
  this.eventBus = eventBus;
  this.ttsEngine = ttsEngine;
}

// ❌ WRONG: Access globals directly inside methods
playAudio() {
  window.ttsEngine.speak(text);  // Tight coupling
}
```

**Interface Segregation**:
- Modules expose minimal public API
- Private methods prefixed with `_`
- Use events for cross-module communication

**Liskov Substitution**:
- All data extractors implement same interface
- `PTETermsExtractor`, `PTESentenceExtractor`, `PTEQuestionExtractor` are swappable

---

## Terminology Standards

### "Category" Dual Meaning ⚠️

**Context 1: Filter Field** (✅ Current, keep):
```javascript
word.category = 'pte-beginner'  // Metadata for filtering
```

**Context 2: Navigation Sections** (❌ Legacy CCL, removed):
```javascript
// REMOVED: getPreviousCategory(), getNextCategory(), loadCategory()
```

**Current Model**: Users select **vocabulary books**, not categories.

---

## Code Quality Standards

### Naming Conventions

**Files**:
- PascalCase for classes: `PTEApp.js`, `SettingsModule.js`
- camelCase for utilities: `dataSchema.js`
- kebab-case for CSS: `practice-modes.css`

**Variables/Functions**:
- camelCase: `currentWord`, `loadDataset()`
- Private methods: `_validateSettings()`, `_getItemField()`
- Constants: `MAX_RETRIES`, `DEFAULT_SPEED`

**Events**:
- Namespace pattern: `domain:action[:modifier]`
- Examples: `settings:changed`, `audio:autoplay:started`

### Documentation

**Required Documentation**:
- JSDoc for all public methods
- Inline comments for complex logic
- Architecture diagrams for system design

**Example**:
```javascript
/**
 * Load vocabulary dataset from JSON file with retry logic
 * @param {string} mode - Learning mode ID (e.g., 'pte-fib-listening')
 * @returns {Promise<void>}
 * @throws {Error} If all retry attempts fail
 */
async loadDataset(mode) {
  // Implementation
}
```

### Testing

**Test Coverage Requirements**:
- Unit tests for utility functions
- Integration tests for module interactions
- Manual testing for browser-specific features (TTS)

**Test Organization**:
- Test files mirror source structure
- `src/js/utils/EventBus.js` → `tests/utils/EventBus.test.js`

---

## Data Pipeline Standards

### Data Source Requirements

**Markdown Format**:
- Must follow defined schema (`DataSchema.js`)
- Must include IPA pronunciation for vocabulary
- Must include metadata (difficulty, category)

**Processing Steps**:
1. Read Markdown source
2. Extract terms/sentences via extractor
3. Validate schema compliance
4. Transform to JSON
5. Write to `data/processed/`
6. Generate processing report

**Adding New Data Sources**:
1. Create Markdown file in `data/source/pte/`
2. Add to `Config.js` → `pipeline.registry[]`
3. Create/reuse extractor in `src/js/data/extractors/`
4. Run `npm run data:pte`
5. Validate with `npm run validate`

---

## Performance Guidelines

### Loading Optimization

- **Lazy load** datasets (load on-demand, not upfront)
- **Cache** datasets in memory after first load
- **Minify** JavaScript/CSS in production
- **Use Service Worker** for offline caching

### Runtime Optimization

- **Throttle** keyboard events (prevent spam)
- **Debounce** UI updates (batch changes)
- **Clean up** event listeners on module destroy
- **Limit** DOM queries (cache element references)

---

## Security Guidelines

### Data Validation

- ✅ Validate all user input
- ✅ Sanitize HTML before rendering
- ✅ Validate JSON schema on load
- ❌ Never use `eval()` or `innerHTML` with user data

### Storage Security

- ✅ Only store non-sensitive data in localStorage
- ✅ Validate data on restore (prevent corruption)
- ❌ Never store credentials or API keys

---

## Accessibility Guidelines

### CSS Accessibility

- Use `--touch-target-min: 44px` for buttons
- Support `prefers-color-scheme: dark`
- Support `prefers-contrast: high`
- Provide focus indicators for keyboard navigation

### Keyboard Shortcuts

All features accessible via keyboard:
- Space: Play/Pause
- Arrow keys: Navigation
- Escape: Close panels
- R: Repeat

---

## Version Control Standards

### Commit Messages

Format: `Type: Brief description`

**Types**:
- `Feat:` New feature
- `Fix:` Bug fix
- `Refactor:` Code restructuring
- `Docs:` Documentation changes
- `Style:` CSS/formatting changes
- `Test:` Test additions/changes

**Examples**:
- `Feat: Add WFD practice mode`
- `Fix: Progress counter now updates during playback`
- `Refactor: Extract duplicate TTS feedback code`

### Branch Strategy

- `main` - Production-ready code
- `dev` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

---

## When to Update Guidelines

This document should be updated when:

1. **New architectural patterns** are introduced
2. **Design principles change** (rare, requires team discussion)
3. **Best practices evolve** based on lessons learned
4. **New standards** are adopted (e.g., new CSS methodology)

**Process**:
1. Propose change in team discussion
2. Update GUIDELINES.md
3. Update CLAUDE.md if AI guidance changes
4. Notify team of guideline changes

---

## Quick Reference Checklist

Before committing code, verify:

- [ ] No hardcoded values (check Config.js)
- [ ] All inter-module communication via EventBus
- [ ] Event names defined in Config.js
- [ ] CSS uses design tokens (no magic numbers)
- [ ] Dependencies injected via constructor
- [ ] Error handling in place (try-catch, validation)
- [ ] State persisted appropriately
- [ ] JSDoc for public methods
- [ ] Tests pass (`npm test`)

---

**Last Updated**: October 2025
**Version**: 2.5.4
**Status**: ✅ Active & Enforced
