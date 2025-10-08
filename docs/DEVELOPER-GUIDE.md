# Developer Guide - Working with Config.js

## 🎯 Quick Reference Guide

This guide shows you **exactly how** to use the Config.js architecture in common development scenarios.

---

## 📚 Table of Contents

1. [Adding a New Setting](#1-adding-a-new-setting)
2. [Adding a New Vocabulary Book](#2-adding-a-new-vocabulary-book)
3. [Changing Default Values](#3-changing-default-values)
4. [Adding a New UI Label](#4-adding-a-new-ui-label)
5. [Modifying TTS Behavior](#5-modifying-tts-behavior)
6. [Adding CSS Design Tokens](#6-adding-css-design-tokens)
7. [Reading Config Values](#7-reading-config-values)
8. [Common Patterns](#8-common-patterns)

---

## 1. Adding a New Setting

### Scenario: Add a "volume" setting for TTS

#### Step 1: Add to Config.js

```javascript
// src/js/shared/Config.js

// Add to TTS configuration section (around line 315)
tts: {
    voices: { /* ... */ },
    speeds: { /* ... */ },
    delays: { /* ... */ },
    
    // ✅ ADD THIS
    volumes: {
        quiet: 0.5,
        normal: 0.8,
        loud: 1.0
    },
    
    repeatModes: [ /* ... */ ]
}

// Add to settings defaults (around line 375)
settings: {
    defaults: {
        // ... existing defaults
        
        // ✅ ADD THIS
        volume: 'tts.volumes.normal'
    }
}
```

#### Step 2: Add Handler to SettingsModule.js

```javascript
// src/js/core/SettingsModule.js
// In initializeHandlers() method (around line 55)

handlers = {
    speed: { /* ... */ },
    delay: { /* ... */ },
    repeat: { /* ... */ },
    
    // ✅ ADD THIS
    volume: {
        validate: (value) => {
            const volumes = Object.values(this.config.get('tts.volumes'));
            return volumes.includes(parseFloat(value));
        },
        apply: (value) => {
            if (window.ttsEngine) {
                window.ttsEngine.volume = parseFloat(value);
                console.log(`[SettingsModule] Volume set to ${value}`);
            }
        },
        default: () => String(this.config.get('tts.volumes.normal')),
        storageKey: 'volume',
        description: 'TTS volume level (quiet/normal/loud)'
    },
    
    voice: { /* ... */ }
}
```

#### Step 3: Add to TTSEngine.js

```javascript
// src/js/audio/TTSEngine.js
// In constructor (around line 15)

constructor() {
    this.config = window.appConfig || new AppConfig();
    this.speechRate = null;
    this.volume = null;  // ✅ ADD THIS
    
    this._attachEventListeners();
}

// In _handleSettingChange method (around line 35)
_handleSettingChange({key, value}) {
    if (key === 'speed') {
        this.speechRate = parseFloat(value) || this.config.get('tts.speeds.normal');
    }
    // ✅ ADD THIS
    else if (key === 'volume') {
        this.volume = parseFloat(value) || this.config.get('tts.volumes.normal');
        console.log(`[TTSEngine] Volume changed to ${this.volume}`);
    }
    else if (key === 'voice') {
        this.resetVoiceCache();
    }
}

// In speak() method, use this.volume when creating utterance
async speak(text, lang = 'en-AU', rate = null) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate || this.speechRate;
    utterance.volume = this.volume || this.config.get('tts.volumes.normal');  // ✅ ADD THIS
    
    // ... rest of method
}
```

#### Step 4: Add to Settings UI (SettingsPanel.js)

```javascript
// src/js/ui/SettingsPanel.js
// In getAvailableOptions() method (around line 350)

getAvailableOptions(key) {
    const options = {
        speed: [ /* ... */ ],
        delay: [ /* ... */ ],
        
        // ✅ ADD THIS
        volume: [
            { id: '0.5', label: '🔇 Quiet (0.5x)' },
            { id: '0.8', label: '🔊 Normal (0.8x)' },
            { id: '1.0', label: '📢 Loud (1.0x)' }
        ],
        
        repeat: [ /* ... */ ]
    };
    
    return options[key] || [];
}
```

#### Step 5: Add to HTML (index.html)

```html
<!-- index.html -->
<!-- In settings panel (around line 120) -->

<div class="setting-item">
    <label for="delaySelect">Pause:</label>
    <select id="delaySelect">
        <!-- Options populated dynamically -->
    </select>
</div>

<!-- ✅ ADD THIS -->
<div class="setting-item">
    <label for="volumeSelect">Volume:</label>
    <select id="volumeSelect">
        <!-- Options populated dynamically from Config.js -->
    </select>
</div>

<div class="setting-item">
    <label for="repeatSelect">Repeat:</label>
    <select id="repeatSelect">
        <!-- Options populated dynamically -->
    </select>
</div>
```

### Done! ✅

The volume setting now:
- ✅ Validates against Config.js values
- ✅ Persists to localStorage
- ✅ Updates TTSEngine automatically
- ✅ Shows in settings panel
- ✅ Follows event-driven architecture

---

## 2. Adding a New Vocabulary Book

### Scenario: Add "PTE Writing Vocabulary"

#### Step 1: Add to pipeline registry in Config.js

```javascript
// src/js/shared/Config.js
// In pipeline.registry array (around line 35)

registry: [
    { id: 'pte-fib-listening', /* ... */ },
    { id: 'pte-beginner', /* ... */ },
    // ... other books
    
    // ✅ ADD THIS
    {
        id: 'pte-writing',
        input: 'pte-writing-vocabulary-with-ipa.md',
        output: 'pte-writing-vocabulary.json',
        category: 'pte-writing',
        description: 'PTE Writing Section Vocabulary',
        sourceType: 'pte-writing-vocabulary-with-ipa',
        dataType: 'vocabulary',
        extractorType: 'PTETermsExtractor',
        inputSubdir: 'vocabs',
        isDefault: false
    }
]
```

#### Step 2: Add to data paths in Config.js

```javascript
// src/js/shared/Config.js
// In data.paths.byMode (around line 235)

data: {
    paths: {
        byMode: {
            'pte-fib-listening': '/data/processed/pte-fib-listening-dataset.json',
            'pte-beginner': '/data/processed/pte-beginner-vocabulary.json',
            // ... other paths
            
            // ✅ ADD THIS
            'pte-writing': '/data/processed/pte-writing-vocabulary.json'
        }
    }
}
```

#### Step 3: Add to learning modes in Config.js

```javascript
// src/js/shared/Config.js
// In data.learningModes array (around line 255)

learningModes: [
    { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening', dataset: 'pte-fib-listening-with-ipa' },
    { id: 'pte-beginner', label: '📗 PTE Beginner Vocabulary', dataset: 'pte-beginner-vocabulary-with-ipa' },
    // ... other modes
    
    // ✅ ADD THIS
    { id: 'pte-writing', label: '✍️ PTE Writing Vocabulary', dataset: 'pte-writing-vocabulary-with-ipa' }
]
```

#### Step 4: Add to dataset files registry in Config.js

```javascript
// src/js/shared/Config.js
// In data.datasetFiles (around line 285)

datasetFiles: {
    'pte-fib-listening': { file: 'pte-fib-listening-dataset.json', type: 'vocabulary' },
    'pte-beginner': { file: 'pte-beginner-vocabulary.json', type: 'vocabulary' },
    // ... other datasets
    
    // ✅ ADD THIS
    'pte-writing': { file: 'pte-writing-vocabulary.json', type: 'vocabulary' }
}
```

#### Step 5: Create the source data file

```bash
# Create the source file
touch data/source/pte/vocabs/pte-writing-vocabulary-with-ipa.md
```

Add vocabulary entries in the standard format:

```markdown
# PTE Writing Vocabulary

1. **coherence** /kəʊˈhɪərəns/ 连贯性
2. **cohesion** /kəʊˈhiːʒən/ 凝聚力
3. **discourse** /ˈdɪskɔːs/ 话语
...
```

#### Step 6: Run the data pipeline

```bash
npm run data:pte
```

### Done! ✅

The new vocabulary book now:
- ✅ Appears in settings dropdown
- ✅ Loads automatically when selected
- ✅ Processes through data pipeline
- ✅ NO code changes to PTEVocabularyManager
- ✅ NO code changes to SettingsPanel
- ✅ NO code changes to UIController

**Total code changes**: 4 lines added to Config.js ✨

---

## 3. Changing Default Values

### Scenario: Change default speed from "Slow" to "Normal"

#### Option A: Change Config.js Default

```javascript
// src/js/shared/Config.js
// In settings.defaults (around line 375)

settings: {
    defaults: {
        category: 'all-categories',
        difficulty: 'all',
        
        // OLD
        speed: 'tts.speeds.slow',     // 0.7
        
        // ✅ NEW
        speed: 'tts.speeds.normal',   // 1.0
        
        delay: 'tts.delays.long',
        repeat: 'loop',
        voice: 'auto',
        learningMode: 'pte-fib-listening'
    }
}
```

**Effect**: All NEW users get normal speed (1.0x) by default

**Existing users**: Keep their saved preference

---

### Scenario: Change the actual speed values

```javascript
// src/js/shared/Config.js
// In tts.speeds (around line 315)

tts: {
    speeds: {
        slow: 0.7,      // ✅ Change to 0.8 if you want slower
        normal: 1.0,    // ✅ Keep at 1.0
        fast: 1.3       // ✅ Change to 1.5 if you want faster
    }
}
```

**Effect**: 
- Changes affect ALL users immediately
- No code changes needed elsewhere
- All validation automatically uses new values

---

## 4. Adding a New UI Label

### Scenario: Add export filename prefix

#### Step 1: Add to Config.js

```javascript
// src/js/shared/Config.js
// In ui.labels (around line 355)

ui: {
    labels: {
        version: '1.0',
        exportFilename: 'ccl-trainer-settings.json',
        
        // ✅ ADD THIS
        exportPrefix: 'pte-vocab-'  // Will be: pte-vocab-2025-10-08.json
    }
}
```

#### Step 2: Use in SettingsPanel.js

```javascript
// src/js/ui/SettingsPanel.js
// In exportSettings() method (around line 200)

exportSettings() {
    const settings = this.settingsModule.getAllSettings();
    settings.version = this.config.get('ui.labels.version');
    settings.exportedAt = new Date().toISOString();
    
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    // ✅ USE THE NEW CONFIG VALUE
    const prefix = this.config.get('ui.labels.exportPrefix');
    const date = new Date().toISOString().split('T')[0];  // 2025-10-08
    link.download = `${prefix}${date}.json`;  // pte-vocab-2025-10-08.json
    
    link.click();
    URL.revokeObjectURL(url);
}
```

### Done! ✅

Now the export filename includes the prefix from Config.js

---

## 5. Modifying TTS Behavior

### Scenario: Add a "pause before speaking" delay

#### Step 1: Add delay to Config.js

```javascript
// src/js/shared/Config.js
// In tts.delays (around line 318)

tts: {
    delays: {
        short: 1000,
        normal: 2000,
        long: 3000,
        voiceReady: 100,
        resetTimeout: 5000,
        
        // ✅ ADD THIS
        beforeSpeaking: 500  // 500ms pause before each word
    }
}
```

#### Step 2: Use in TTSEngine.js

```javascript
// src/js/audio/TTSEngine.js
// In pronounceWord() method (around line 120)

async pronounceWord(word, repeatCount = 0) {
    if (!word || !word.english) {
        window.progressTracker.showError('No word to pronounce');
        return;
    }

    try {
        // ✅ ADD THIS - Pause before speaking
        const pauseDelay = this.config.get('tts.delays.beforeSpeaking');
        await new Promise(resolve => setTimeout(resolve, pauseDelay));
        
        this.currentRepeatCount = repeatCount;
        const cleanText = this.cleanTextForTTS(word.english);
        
        // ... rest of method
    } catch (error) {
        console.warn('Speech error:', error);
    }
}
```

### Done! ✅

Now there's a 500ms pause before each word speaks

**Change the delay**: Edit ONE value in Config.js

---

## 6. Adding CSS Design Tokens

### Scenario: Add new color for "bookmark" feature

#### Step 1: Add token to variables.css

```css
/* src/css/variables.css */
/* In color section (around line 10) */

:root {
    /* Existing colors */
    --primary-color: #4f46e5;
    --success-color: #22c55e;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
    
    /* ✅ ADD THIS */
    --bookmark-color: #f59e0b;
    --bookmark-color-hover: #d97706;
}
```

#### Step 2: Use in components.css

```css
/* src/css/components.css */

.btn--bookmark {
    background: var(--bookmark-color);
    color: white;
}

.btn--bookmark:hover {
    background: var(--bookmark-color-hover);
}

.word-card.bookmarked {
    border-left: 4px solid var(--bookmark-color);
}
```

### Done! ✅

Now bookmark feature uses design tokens

**Change color**: Edit ONE line in variables.css, all instances update

---

## 7. Reading Config Values

### Common Patterns for Reading Config

#### Pattern 1: Direct Access

```javascript
// In any class with this.config reference
const speed = this.config.get('tts.speeds.slow');
const delay = this.config.get('tts.delays.long');
const path = this.config.get('data.paths.dataset');
```

#### Pattern 2: Get Array/Object

```javascript
// Get entire object
const speeds = this.config.get('tts.speeds');
// Result: { slow: 0.7, normal: 1.0, fast: 1.3 }

// Get array
const modes = this.config.get('data.learningModes');
// Result: [{ id: 'pte-fib-listening', label: '...' }, ...]
```

#### Pattern 3: Nested Resolution

```javascript
// Settings defaults reference other config paths
const defaultSpeed = this.config.get('settings.defaults.speed');
// Result: 'tts.speeds.slow'

// Resolve the actual value
const actualSpeed = this.config.get(defaultSpeed);
// Result: 0.7
```

#### Pattern 4: Conditional Config

```javascript
// Get value conditionally
const mode = getCurrentMode();
const paths = this.config.get('data.paths.byMode');
const dataPath = paths[mode];  // Get path for specific mode
```

#### Pattern 5: Iterate Registry

```javascript
// Process all datasets
const registry = this.config.get('pipeline.registry');
for (const dataset of registry) {
    console.log(`Processing ${dataset.id}...`);
    console.log(`  Input: ${dataset.input}`);
    console.log(`  Output: ${dataset.output}`);
}
```

---

## 8. Common Patterns

### Pattern 1: Adding Dropdown Options

```javascript
// SettingsPanel.js - Generic pattern
populateDropdown(selectId, configPath) {
    const select = document.getElementById(selectId);
    const options = this.config.get(configPath);
    
    select.innerHTML = '';  // Clear existing
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.id;
        optionElement.textContent = option.label;
        select.appendChild(optionElement);
    });
}

// Usage
this.populateDropdown('learningModeSelect', 'data.learningModes');
this.populateDropdown('practiceModeSelect', 'data.practiceModes');
```

### Pattern 2: Validating User Input

```javascript
// SettingsModule.js - Generic validation
validateSetting(key, value) {
    const handler = this.handlers[key];
    if (!handler || !handler.validate) {
        return false;
    }
    
    // Validation uses Config.get() internally
    return handler.validate(value);
}

// Example: Speed validation
speed: {
    validate: (value) => {
        const validSpeeds = Object.values(this.config.get('tts.speeds'));
        return validSpeeds.includes(parseFloat(value));
    }
}
```

### Pattern 3: Loading Dataset Dynamically

```javascript
// PTEVocabularyManager.js - Generic pattern
async loadDataset(mode) {
    // Get path from Config
    const paths = this.config.get('data.paths.byMode');
    const dataPath = paths[mode];
    
    if (!dataPath) {
        throw new Error(`No path configured for mode: ${mode}`);
    }
    
    // Load dataset
    const response = await fetch(dataPath);
    const data = await response.json();
    
    // Store in Map
    this.datasets.set(mode, data);
    
    return data;
}
```

### Pattern 4: Feature Toggle via Config

```javascript
// Config.js - Add feature flags
features: {
    enableBookmarks: true,
    enableDarkMode: true,
    enableOfflineMode: false,
    enableSpeechRecognition: false
}

// Usage in code
if (this.config.get('features.enableBookmarks')) {
    this.initializeBookmarks();
}

if (this.config.get('features.enableSpeechRecognition')) {
    this.initializeSpeechRecognition();
}
```

### Pattern 5: Environment-Specific Config

```javascript
// Config.js - Add environment settings
environment: {
    production: {
        apiUrl: 'https://api.production.com',
        debug: false,
        logLevel: 'error'
    },
    development: {
        apiUrl: 'http://localhost:3000',
        debug: true,
        logLevel: 'debug'
    }
}

// Usage
const env = process.env.NODE_ENV || 'production';
const config = this.config.get(`environment.${env}`);
console.log(`API URL: ${config.apiUrl}`);
```

---

## 🎯 Best Practices Checklist

When working with Config.js:

### ✅ DO

- ✅ Always use `this.config.get()` for reading values
- ✅ Add new values to Config.js before using them
- ✅ Use descriptive dot-notation paths (e.g., `'tts.speeds.slow'`)
- ✅ Group related settings together
- ✅ Document what each config value does
- ✅ Use semantic names (`speeds.slow` not `speeds.s1`)
- ✅ Define defaults in Config.js
- ✅ Use CSS tokens for styles

### ❌ DON'T

- ❌ Hardcode values in components
- ❌ Duplicate config values across files
- ❌ Use magic numbers without Config reference
- ❌ Create parallel config systems
- ❌ Skip validation when adding new settings
- ❌ Mix hardcoded values with Config values
- ❌ Forget to update Config when adding features

---

## 📊 Quick Reference Table

| Task | Config Section | Handler Needed? | UI Update? |
|------|---------------|-----------------|------------|
| Add vocabulary book | `pipeline.registry`, `data.learningModes`, `data.paths.byMode`, `data.datasetFiles` | No | No (auto) |
| Add setting | `settings.defaults`, Create handler in SettingsModule | Yes | Yes |
| Change default | `settings.defaults` | No | No |
| Add TTS voice | `tts.voices.fallbacks` | No | No |
| Add speed option | `tts.speeds` | No | No (auto) |
| Add UI label | `ui.labels` | No | Use in component |
| Add keyboard shortcut | `ui.shortcuts` | No | Bind in UIController |
| Add dataset type | `pipeline.registry` | No | Add to dropdown config |
| Change theme color | `variables.css` CSS token | No | No (auto) |

---

## 🔧 Troubleshooting

### Problem: Config value returns `undefined`

```javascript
// ❌ Wrong path
const speed = this.config.get('speed');  // undefined

// ✅ Correct path
const speed = this.config.get('tts.speeds.slow');  // 0.7
```

### Problem: Setting not validating

```javascript
// Check if handler exists
const handler = this.handlers[key];
if (!handler) {
    console.error(`No handler for setting: ${key}`);
}

// Check if validate function exists
if (!handler.validate) {
    console.error(`No validate function for: ${key}`);
}
```

### Problem: Default value not applying

```javascript
// Ensure default() returns string, not config path
// ❌ Wrong
default: () => 'tts.speeds.slow'  // Returns path, not value!

// ✅ Correct
default: () => String(this.config.get('tts.speeds.slow'))  // '0.7'
```

---

## 🎓 Summary

This architecture makes development:

1. ✅ **Faster** - Add features by editing Config.js
2. ✅ **Safer** - No hardcoded values to miss
3. ✅ **Cleaner** - Single source of truth
4. ✅ **Scalable** - Easy to add new options
5. ✅ **Testable** - Mock config easily
6. ✅ **Maintainable** - Change values in ONE place

> **"Config.js is your contract. Honor it, and your code will be clean."**

---

**Created**: October 8, 2025  
**For**: PTE Pronunciation Trainer v2.3  
**Purpose**: Practical developer reference
