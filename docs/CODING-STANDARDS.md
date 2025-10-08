# Coding Standards & Consistency Guide

## Purpose

Ensure all code follows the event-driven architecture pattern and maintains consistency across the codebase.

**Status**: 🚧 Active (enforced after SettingsModule migration complete)  
**Version**: 1.0  
**Last Updated**: 2025-10-08

---

## Core Principles

### 1. Event-Driven Architecture
✅ **DO**: Use EventBus for all inter-module communication  
❌ **DON'T**: Call other modules' methods directly

```javascript
// ✅ GOOD: Event-driven
window.eventBus.emit('setting:request-change', {key: 'speed', value: 0.8});

// ❌ BAD: Direct coupling
window.ttsEngine.setSpeechRate(0.8);
```

---

### 2. Single Source of Truth
✅ **DO**: Use SettingsModule for all settings  
❌ **DON'T**: Create separate setting storage

```javascript
// ✅ GOOD: Through SettingsModule
const speed = window.settingsModule.getSetting('speed');

// ❌ BAD: Direct Storage access
const speed = window.storage.getItem('speed'); // Only for initialization!
```

---

### 3. Loose Coupling
✅ **DO**: Modules listen to events, don't know who emits them  
❌ **DON'T**: Import/reference other modules directly

```javascript
// ✅ GOOD: Loose coupling via events
class TTSEngine {
    constructor() {
        window.eventBus.on('setting:changed', this.handleSettingChange.bind(this));
    }
    
    handleSettingChange({key, value}) {
        if (key === 'speed') {
            this.speechRate = value;
        }
    }
}

// ❌ BAD: Tight coupling
class TTSEngine {
    constructor() {
        this.settingsManager = window.settingsManager; // Direct reference!
    }
    
    updateSpeed() {
        this.speechRate = this.settingsManager.getSetting('speed');
    }
}
```

---

## JavaScript Standards

### ES6+ Features

✅ **USE**:
- `const`/`let` (no `var`)
- Arrow functions
- Template literals
- Destructuring
- Async/await
- Classes

```javascript
// ✅ GOOD: Modern ES6+
const handleChange = async ({key, value}) => {
    const result = await validateSetting(key, value);
    console.log(`Setting ${key} = ${value}`);
};

// ❌ BAD: Old ES5
var handleChange = function(event) {
    var key = event.key;
    var value = event.value;
    validateSetting(key, value).then(function(result) {
        console.log('Setting ' + key + ' = ' + value);
    });
};
```

---

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Variables | camelCase | `speechRate`, `userSettings` |
| Constants | UPPER_SNAKE_CASE | `MAX_SPEED`, `DEFAULT_DELAY` |
| Functions | camelCase | `validateSpeed()`, `applySetting()` |
| Classes | PascalCase | `SettingsModule`, `TTSEngine` |
| Private methods | _camelCase | `_validateInternal()` |
| Event names | kebab-case | `setting:changed`, `audio:play` |
| File names | PascalCase | `SettingsModule.js`, `TTSEngine.js` |

```javascript
// ✅ GOOD
const DEFAULT_SPEED = 1.0;
const speechRate = 0.8;

class TTSEngine {
    setSpeechRate(value) { ... }
    _validateVoice(voice) { ... }
}

window.eventBus.emit('setting:changed', {...});

// ❌ BAD
const default_speed = 1.0;  // Should be UPPER_SNAKE_CASE
const SpeechRate = 0.8;     // Should be camelCase

class ttsEngine {           // Should be PascalCase
    SetSpeechRate(value) { ... }  // Should be camelCase
    validateVoice(voice) { ... }  // Private should be _validateVoice
}

window.eventBus.emit('settingChanged', {...});  // Should be kebab-case
```

---

### Code Organization

#### File Structure

```javascript
/**
 * ModuleName.js
 * 
 * Description of module responsibility
 * 
 * Events emitted:
 * - event:name - Description
 * 
 * Events listened:
 * - event:name - Description
 * 
 * Dependencies: EventBus, Storage, etc.
 */

// 1. Constants
const DEFAULT_VALUE = 100;
const MAX_RETRIES = 3;

// 2. Class definition
class ModuleName {
    // 3. Constructor
    constructor() {
        this._initializeState();
        this._attachEventListeners();
    }
    
    // 4. Public methods (alphabetical)
    publicMethodA() { ... }
    publicMethodB() { ... }
    
    // 5. Private methods (alphabetical)
    _privateMethodA() { ... }
    _privateMethodB() { ... }
    
    // 6. Event handlers
    _handleEventA(data) { ... }
    _handleEventB(data) { ... }
}

// 7. Export (if module)
// export default ModuleName;

// 8. Global initialization (if standalone)
// window.moduleName = new ModuleName();
```

---

### Comments & Documentation

✅ **DO**: Add JSDoc comments for public APIs

```javascript
/**
 * Validate a setting value
 * 
 * @param {string} key - Setting key (e.g., 'speed', 'delay')
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid, false otherwise
 * 
 * @example
 * const isValid = validateSetting('speed', 0.8);
 * // Returns: true
 */
function validateSetting(key, value) {
    // Implementation
}
```

❌ **DON'T**: Add obvious comments

```javascript
// ❌ BAD: Obvious
let x = 5; // Set x to 5

// ✅ GOOD: Explain why, not what
let defaultRetries = 5; // Match AWS Lambda retry limit
```

---

## Settings Module Patterns

### Adding a New Setting

**Checklist**:
1. Add to `Config.js` (data)
2. Add handler in `SettingsModule.js` (logic)
3. Add dropdown in `index.html` (UI)
4. Add listener in target engine (response)
5. Test thoroughly

**Example**: Add "Volume" setting

```javascript
// 1. Config.js
const CONFIG = {
    settings: {
        volumes: [0, 0.25, 0.5, 0.75, 1.0]  // Add volume options
    }
};

// 2. SettingsModule.js
handlers: {
    volume: {
        validate: (value) => {
            const v = parseFloat(value);
            return !isNaN(v) && v >= 0 && v <= 1.0;
        },
        apply: (value) => {
            // No-op: Engine handles it
        },
        default: 1.0
    }
}

// 3. index.html
<select id="volume-select">
    <option value="0">Mute</option>
    <option value="0.5">50%</option>
    <option value="1.0">100%</option>
</select>

// 4. TTSEngine.js
window.eventBus.on('setting:changed', ({key, value}) => {
    if (key === 'volume') {
        this.volume = value;
        // Apply to all future utterances
    }
});

// 5. Test
// - Change dropdown → verify volume updates
// - Reload page → verify persists
// - Import/export → verify included
```

---

### Event Naming Conventions

| Pattern | Example | Usage |
|---------|---------|-------|
| `module:action` | `setting:changed` | Module-specific actions |
| `module:request-action` | `setting:request-change` | Request to perform action |
| `module:state` | `audio:playing` | State changes |
| `module:error` | `setting:error` | Error notifications |

✅ **DO**: Use consistent event naming

```javascript
// ✅ GOOD: Consistent pattern
emit('setting:request-change', {...})
emit('setting:changed', {...})
emit('setting:error', {...})

// ❌ BAD: Inconsistent
emit('changeSetting', {...})
emit('setting-changed', {...})
emit('errorInSetting', {...})
```

---

### Event Payload Standards

✅ **DO**: Use consistent payload structure

```javascript
// ✅ GOOD: Consistent structure
{
    key: 'speed',           // Setting identifier
    value: 0.8,             // New value
    previousValue: 1.0,     // Old value (optional)
    timestamp: Date.now()   // When changed (optional)
}

// ❌ BAD: Inconsistent
{
    settingName: 'speed',   // Inconsistent key names
    newValue: 0.8,
    old: 1.0
}
```

---

## Module-Specific Standards

### UI Layer (`src/js/ui/`)

✅ **DO**:
- Emit events for all user actions
- Handle only UI logic (show/hide, enable/disable)
- Use semantic HTML

❌ **DON'T**:
- Call other modules directly
- Perform business logic
- Access Storage directly

```javascript
// ✅ GOOD: UI layer
class UIController {
    bindSpeedDropdown() {
        const select = document.getElementById('speed-select');
        select.addEventListener('change', (e) => {
            window.eventBus.emit('setting:request-change', {
                key: 'speed',
                value: e.target.value
            });
        });
    }
}

// ❌ BAD: UI layer doing too much
class UIController {
    handleSpeedChange(e) {
        const value = parseFloat(e.target.value); // Validation (business logic!)
        window.ttsEngine.setSpeechRate(value);    // Direct call!
        window.storage.setItem('speed', value);   // Direct storage!
    }
}
```

---

### Core Layer (`src/js/core/`)

✅ **DO**:
- Implement business logic
- Listen to events
- Emit events for state changes
- Validate all inputs

❌ **DON'T**:
- Access DOM directly
- Hard-code configuration
- Use `alert()` or `console.log()` for user feedback

```javascript
// ✅ GOOD: Core layer
class SettingsModule {
    handleSettingChange({key, value}) {
        // 1. Validate (business logic)
        if (!this.handlers[key].validate(value)) {
            this._emitError(key, 'Invalid value');
            return;
        }
        
        // 2. Apply
        this.handlers[key].apply(value);
        
        // 3. Persist
        window.storage.setItem(key, value);
        
        // 4. Notify
        window.eventBus.emit('setting:changed', {key, value});
    }
}

// ❌ BAD: Core layer accessing DOM
class SettingsModule {
    handleSettingChange({key, value}) {
        document.getElementById('error-msg').innerText = 'Invalid!'; // NO!
    }
}
```

---

### Audio Layer (`src/js/audio/`)

✅ **DO**:
- Encapsulate Web APIs (Speech Synthesis, Audio)
- Listen to `setting:changed` events
- Emit playback events

❌ **DON'T**:
- Expose internal state via getters/setters
- Access Storage directly (use events)

```javascript
// ✅ GOOD: Audio layer
class TTSEngine {
    constructor() {
        this.speechRate = 1.0;
        window.eventBus.on('setting:changed', this._handleSettingChange.bind(this));
    }
    
    _handleSettingChange({key, value}) {
        if (key === 'speed') {
            this.speechRate = value;  // Update internal state
        }
    }
    
    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.speechRate;  // Use internal state
        speechSynthesis.speak(utterance);
    }
}

// ❌ BAD: Exposing setters
class TTSEngine {
    setSpeechRate(value) {  // Public setter = bad!
        this.speechRate = value;
    }
}
```

---

### Utils Layer (`src/js/utils/`)

✅ **DO**:
- Pure functions (no side effects)
- Stateless where possible
- Minimal dependencies

❌ **DON'T**:
- Implement business logic
- Access DOM or Storage directly

```javascript
// ✅ GOOD: Utility function
function parseSpeed(value) {
    const speed = parseFloat(value);
    return isNaN(speed) ? null : speed;
}

// ❌ BAD: Utility with side effects
function parseSpeed(value) {
    const speed = parseFloat(value);
    if (isNaN(speed)) {
        alert('Invalid speed!');  // Side effect!
        return null;
    }
    window.storage.setItem('lastSpeed', speed);  // Side effect!
    return speed;
}
```

---

## Error Handling

### Try-Catch Guidelines

✅ **DO**: Catch errors at boundaries (API calls, user input)

```javascript
// ✅ GOOD: Catch at boundary
async function loadDataset(file) {
    try {
        const response = await fetch(file);
        return await response.json();
    } catch (error) {
        window.eventBus.emit('dataset:error', {file, error: error.message});
        return null;
    }
}

// ❌ BAD: Swallow errors silently
async function loadDataset(file) {
    try {
        const response = await fetch(file);
        return await response.json();
    } catch (error) {
        return null;  // Silent failure!
    }
}
```

### Error Events

✅ **DO**: Emit error events for user-facing issues

```javascript
// ✅ GOOD: Emit error event
if (!this.handlers[key].validate(value)) {
    window.eventBus.emit('setting:error', {
        key,
        value,
        error: 'Value out of range'
    });
    return;
}

// ❌ BAD: Throw exception for user errors
if (!this.handlers[key].validate(value)) {
    throw new Error('Invalid value!');  // Too harsh!
}
```

---

## Testing Standards

### Unit Tests

✅ **DO**: Test each function independently

```javascript
// ✅ GOOD: Unit test
describe('SettingsModule.validateSpeed', () => {
    it('should accept valid speeds', () => {
        expect(validateSpeed(0.5)).toBe(true);
        expect(validateSpeed(1.0)).toBe(true);
        expect(validateSpeed(2.0)).toBe(true);
    });
    
    it('should reject invalid speeds', () => {
        expect(validateSpeed(-1)).toBe(false);
        expect(validateSpeed(999)).toBe(false);
        expect(validateSpeed('abc')).toBe(false);
    });
});

// ❌ BAD: Testing multiple things
describe('Settings', () => {
    it('should work', () => {
        // Tests validation, persistence, events, UI... too much!
    });
});
```

---

## Performance Standards

### Event Handling

✅ **DO**: Debounce rapid events (sliders, typing)

```javascript
// ✅ GOOD: Debounced
let debounceTimer;
slider.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        window.eventBus.emit('setting:request-change', {
            key: 'speed',
            value: e.target.value
        });
    }, 300); // Wait 300ms after last input
});

// ❌ BAD: Emit on every input (100+ events/sec)
slider.addEventListener('input', (e) => {
    window.eventBus.emit('setting:request-change', {
        key: 'speed',
        value: e.target.value
    });
});
```

### Memory Management

✅ **DO**: Remove event listeners when done

```javascript
// ✅ GOOD: Cleanup
class MyModule {
    constructor() {
        this._handler = this.handleEvent.bind(this);
        window.eventBus.on('some:event', this._handler);
    }
    
    destroy() {
        window.eventBus.off('some:event', this._handler);
    }
}

// ❌ BAD: Memory leak (listener never removed)
class MyModule {
    constructor() {
        window.eventBus.on('some:event', (data) => {
            // Anonymous function can't be removed!
        });
    }
}
```

---

## Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `test`: Test additions/changes
- `chore`: Build, dependencies, etc.

**Examples**:

```bash
# ✅ GOOD: Clear and specific
feat(settings): Add volume control setting
fix(audio): Prevent TTS crash on empty text
refactor(ui): Migrate SettingsPanel to events
docs(architecture): Add data flow diagram
test(settings): Add validation unit tests
chore(deps): Update dependencies to latest

# ❌ BAD: Vague
update stuff
fixed bug
changes
```

---

## Code Review Checklist

Before committing, verify:

- [ ] ✅ All settings use SettingsModule (no direct calls)
- [ ] ✅ All inter-module communication uses EventBus
- [ ] ✅ No direct DOM access in core/audio/data layers
- [ ] ✅ No direct Storage access in engines (except init)
- [ ] ✅ Event names follow `module:action` pattern
- [ ] ✅ Event payloads have consistent structure
- [ ] ✅ Error handling for all user inputs
- [ ] ✅ JSDoc comments for public methods
- [ ] ✅ Meaningful variable/function names
- [ ] ✅ No console.log() left in code
- [ ] ✅ No commented-out code (delete it!)
- [ ] ✅ Follows file structure template
- [ ] ✅ Unit tests added/updated
- [ ] ✅ Manual browser testing done
- [ ] ✅ No errors in console
- [ ] ✅ Commit message follows format

---

## Anti-Patterns to Avoid

### ❌ Direct Module Calls

```javascript
// ❌ BAD
window.ttsEngine.setSpeechRate(0.8);
window.audioControls.setDelay(3000);

// ✅ GOOD
window.eventBus.emit('setting:request-change', {key: 'speed', value: 0.8});
window.eventBus.emit('setting:request-change', {key: 'delay', value: 3000});
```

---

### ❌ Global State Mutation

```javascript
// ❌ BAD: Mutating global state directly
window.appState.settings.speed = 0.8;

// ✅ GOOD: Through proper channels
window.settingsModule.setSetting('speed', 0.8);
```

---

### ❌ Mixed Concerns

```javascript
// ❌ BAD: UI doing business logic
class UIController {
    handleSpeedChange(e) {
        const value = parseFloat(e.target.value);
        if (value >= 0.5 && value <= 2.0) {  // Validation (business logic!)
            window.storage.setItem('speed', value);  // Persistence (data layer!)
            window.ttsEngine.speechRate = value;     // Application (core layer!)
        }
    }
}

// ✅ GOOD: UI only emits events
class UIController {
    handleSpeedChange(e) {
        window.eventBus.emit('setting:request-change', {
            key: 'speed',
            value: e.target.value  // Just pass the raw value
        });
    }
}
```

---

### ❌ Silent Failures

```javascript
// ❌ BAD: Fail silently
try {
    await fetch(url);
} catch {
    // Nothing!
}

// ✅ GOOD: Emit error event
try {
    await fetch(url);
} catch (error) {
    window.eventBus.emit('fetch:error', {url, error: error.message});
}
```

---

## Migration Pattern

When refactoring old code to new pattern:

```javascript
// BEFORE (old pattern)
class OldModule {
    updateSpeed(value) {
        this.speed = value;
        window.storage.setItem('speed', value);
        window.ttsEngine.setSpeechRate(value);
    }
}

// AFTER (new pattern)
class NewModule {
    constructor() {
        // Listen to events
        window.eventBus.on('setting:changed', this._handleSettingChange.bind(this));
    }
    
    _handleSettingChange({key, value}) {
        if (key === 'speed') {
            this.speed = value;
            // SettingsModule already persisted, just apply locally
        }
    }
}
```

**Steps**:
1. Add event listener in constructor
2. Handle event in private method
3. Remove old setter method (or make private)
4. Update all callers to emit events instead
5. Test thoroughly
6. Delete old code

---

## Enforcement

### Automated (Future)

```json
// .eslintrc.json
{
    "rules": {
        "no-restricted-syntax": [
            "error",
            {
                "selector": "CallExpression[callee.object.name='window'][callee.property.name=/^(ttsEngine|audioControls|settingsManager)$/][callee.property.property.name!='on']",
                "message": "Use EventBus instead of direct module calls"
            }
        ]
    }
}
```

### Manual (Current)

- Code reviews check for anti-patterns
- This document is reference during PRs
- Migration checklist tracks progress

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) - High-level architecture
- [SETTINGS-MODULE-IMPLEMENTATION.md](./SETTINGS-MODULE-IMPLEMENTATION.md) - Settings guide
- [complete-migration-plan.md](./migration/complete-migration-plan.md) - Migration steps
- [BEST-PRACTICES-REFACTORING.md](./BEST-PRACTICES-REFACTORING.md) - General best practices

---

## Conclusion

**Philosophy**: Write code that is:
- 🔍 **Understandable**: Clear intent, good names
- 🔧 **Maintainable**: Loose coupling, single responsibility
- 🧪 **Testable**: Pure functions, event-driven
- 📈 **Scalable**: Easy to add features

**Remember**: Code is read 10x more than written. Optimize for readability!
