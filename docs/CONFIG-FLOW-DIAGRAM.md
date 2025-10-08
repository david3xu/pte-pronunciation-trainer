# Configuration Flow - Visual Reference

## 🎯 Complete Data Flow Diagram

This document visualizes how configuration values flow through the entire application.

---

## 📊 Master Flow: Config.js → Runtime

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CONFIG.JS (526 lines)                        │
│                      Single Source of Truth                          │
│                                                                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐             │
│  │ Data Pipeline  │  │  TTS Config  │  │  UI Config  │             │
│  │  - 14 datasets │  │  - 3 speeds  │  │  - Shortcuts│             │
│  │  - 11 modes    │  │  - 5 delays  │  │  - Labels   │             │
│  │  - Paths       │  │  - 4 repeats │  │  - Emojis   │             │
│  └────────────────┘  └──────────────┘  └─────────────┘             │
│                                                                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐             │
│  │   Settings     │  │    Build     │  │  Validation │             │
│  │  - Defaults    │  │  - JS files  │  │  - Required │             │
│  │  - Keys        │  │  - Outputs   │  │  - Errors   │             │
│  └────────────────┘  └──────────────┘  └─────────────┘             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ window.appConfig = new AppConfig()
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         RUNTIME (Browser)                            │
│                                                                       │
│  Global Reference: window.appConfig.get('path.to.value')            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   SettingsModule                              │  │
│  │                                                                │  │
│  │  1. Reads defaults from Config                                │  │
│  │     ↓                                                          │  │
│  │  2. Validates values using Config                             │  │
│  │     ↓                                                          │  │
│  │  3. Applies to engines (event-driven)                         │  │
│  │     ↓                                                          │  │
│  │  4. Persists to localStorage                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐         │
│  │ TTSEngine   │ UIController│ DataManager │ AudioCtrl   │         │
│  │             │             │             │             │         │
│  │ config.get( │ config.get( │ config.get( │ config.get( │         │
│  │  'tts.     │  'ui.      │  'data.    │  'audio.   │         │
│  │   speeds') │   labels') │   paths')  │   delays') │         │
│  └─────────────┴─────────────┴─────────────┴─────────────┘         │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Example 1: Speed Setting Flow

### User Changes Speed from "Slow" to "Normal"

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: UI Interaction                                           │
│                                                                   │
│ User selects "Normal (1.0x)" from dropdown                       │
│                                                                   │
│ SettingsPanel.js:                                                │
│   speedSelect.addEventListener('change', (e) => {                │
│       window.eventBus.emit('setting:request-change', {           │
│           key: 'speed',                                          │
│           value: e.target.value  // "1.0"                        │
│       });                                                        │
│   });                                                            │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: SettingsModule Handles Request                          │
│                                                                   │
│ SettingsModule.handleSettingChange({ key: 'speed', value: '1.0' })│
│                                                                   │
│   1. GET HANDLER:                                                │
│      handler = this.handlers['speed']                            │
│                                                                   │
│   2. VALIDATE:                                                   │
│      validate: (value) => {                                      │
│          const speeds = Object.values(                           │
│              this.config.get('tts.speeds')  // ✅ From Config!   │
│          );                                                      │
│          return speeds.includes(parseFloat(value));  // true    │
│      }                                                           │
│                                                                   │
│   3. APPLY:                                                      │
│      apply: (value) => {                                         │
│          if (window.ttsEngine) {                                 │
│              window.ttsEngine.speechRate = parseFloat(value);    │
│              console.log('Speed set to', value);                 │
│          }                                                       │
│      }                                                           │
│                                                                   │
│   4. PERSIST:                                                    │
│      this.storage.setItem('speed', '1.0');                       │
│                                                                   │
│   5. EMIT EVENT:                                                 │
│      window.eventBus.emit('setting:changed', {                   │
│          key: 'speed',                                           │
│          value: '1.0',                                           │
│          previous: '0.7'                                         │
│      });                                                         │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Engines React to Event                                   │
│                                                                   │
│ TTSEngine (already updated by apply()):                          │
│   this.speechRate = 1.0  ✅                                      │
│                                                                   │
│ UIController (updates display):                                  │
│   speedDisplay.textContent = '1.0x'                              │
│                                                                   │
│ AudioControls (no action needed):                                │
│   // Speed is handled by TTSEngine                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Example 2: Loading a Vocabulary Book

### User Selects "PTE Beginner" from Dropdown

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Config.js Provides Data Structure                       │
│                                                                   │
│ data: {                                                          │
│     learningModes: [                                             │
│         {                                                        │
│             id: 'pte-beginner',                                  │
│             label: '📗 PTE Beginner Vocabulary',                 │
│             dataset: 'pte-beginner-vocabulary-with-ipa'          │
│         }                                                        │
│     ],                                                           │
│                                                                   │
│     paths: {                                                     │
│         byMode: {                                                │
│             'pte-beginner': '/data/processed/pte-beginner-...'  │
│         }                                                        │
│     },                                                           │
│                                                                   │
│     datasetFiles: {                                              │
│         'pte-beginner': {                                        │
│             file: 'pte-beginner-vocabulary.json',                │
│             type: 'vocabulary'                                   │
│         }                                                        │
│     }                                                            │
│ }                                                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: SettingsPanel Populates Dropdown                        │
│                                                                   │
│ SettingsPanel.populateLearningModeOptions():                    │
│   const modes = this.config.get('data.learningModes');          │
│                                                                   │
│   modes.forEach(mode => {                                        │
│       const option = document.createElement('option');           │
│       option.value = mode.id;        // ✅ 'pte-beginner'        │
│       option.textContent = mode.label; // ✅ '📗 PTE Beginner...' │
│       select.appendChild(option);                                │
│   });                                                            │
│                                                                   │
│ Result: Dropdown has all 11 vocabulary books                     │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: User Selects "PTE Beginner"                             │
│                                                                   │
│ SettingsPanel.js:                                                │
│   learningModeSelect.addEventListener('change', (e) => {         │
│       window.eventBus.emit('setting:request-change', {           │
│           key: 'learningMode',                                   │
│           value: 'pte-beginner'  // ✅ From Config               │
│       });                                                        │
│   });                                                            │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: SettingsModule Validates & Applies                      │
│                                                                   │
│ SettingsModule.handlers.learningMode:                           │
│                                                                   │
│   validate: (value) => {                                         │
│       const modes = this.config.get('data.learningModes');       │
│       return modes.some(m => m.id === value);  // ✅ true        │
│   },                                                             │
│                                                                   │
│   apply: async (value) => {                                      │
│       if (window.pteVocabularyManager) {                         │
│           await window.pteVocabularyManager.setLearningMode(     │
│               value  // 'pte-beginner'                           │
│           );                                                     │
│       }                                                          │
│   }                                                              │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: PTEVocabularyManager Loads Dataset                      │
│                                                                   │
│ PTEVocabularyManager.setLearningMode('pte-beginner'):           │
│                                                                   │
│   1. Get path from Config:                                       │
│      const paths = this.config.get('data.paths.byMode');         │
│      const dataPath = paths['pte-beginner'];  // ✅ From Config  │
│                                                                   │
│   2. Load dataset:                                               │
│      const response = await fetch(dataPath);                     │
│      const data = await response.json();                         │
│                                                                   │
│   3. Store in Map:                                               │
│      this.datasets.set('pte-beginner', data);                    │
│                                                                   │
│   4. Filter words:                                               │
│      this.currentWords = this.filterWords(data);                 │
│                                                                   │
│   5. Emit event:                                                 │
│      window.eventBus.emit('vocabulary:learningModeChanged', {    │
│          mode: 'pte-beginner',                                   │
│          count: data.length                                      │
│      });                                                         │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: UIController Updates Display                            │
│                                                                   │
│ UIController listens to 'vocabulary:learningModeChanged':       │
│                                                                   │
│   1. Get book label from Config:                                 │
│      const modes = this.config.get('data.learningModes');        │
│      const mode = modes.find(m => m.id === 'pte-beginner');      │
│                                                                   │
│   2. Update display:                                             │
│      bookDisplay.textContent = mode.label;  // '📗 PTE Beginner' │
│                                                                   │
│   3. Reset to first word:                                        │
│      this.currentIndex = 0;                                      │
│      this.displayWord(words[0], 0);                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Example 3: Data Pipeline Processing

### Running `npm run data:pte`

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Config.js Defines Pipeline Registry                     │
│                                                                   │
│ pipeline: {                                                      │
│     inputDir: 'data/source/pte',       // ✅ Source dir          │
│     outputDir: 'data',                  // ✅ Output dir         │
│     reportsDir: 'data/reports',         // ✅ Reports dir        │
│                                                                   │
│     registry: [                                                  │
│         {                                                        │
│             id: 'pte-fib-listening',                             │
│             input: 'pte-fib-listening-with-ipa.md',  // ✅ Input │
│             output: 'pte-fib-listening-dataset.json', // ✅ Output│
│             category: 'pte-fib-listening',           // ✅ Metadata│
│             extractorType: 'PTETermsExtractor',      // ✅ Parser│
│             inputSubdir: 'vocabs',                   // ✅ Subdir│
│             isDefault: true                          // ✅ Flag  │
│         },                                                       │
│         // ... 13 more datasets                                  │
│     ]                                                            │
│ }                                                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Pipeline Script Reads Config                            │
│                                                                   │
│ scripts/pte-data-pipeline.js:                                    │
│                                                                   │
│   const AppConfig = require('../src/js/shared/Config.js');       │
│   const config = new AppConfig();                                │
│                                                                   │
│   const registry = config.get('pipeline.registry');  // ✅ Array │
│   const inputDir = config.get('pipeline.inputDir');              │
│   const outputDir = config.get('pipeline.outputDir');            │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Process Each Dataset in Registry                        │
│                                                                   │
│ for (const dataset of registry) {                                │
│     console.log(`Processing ${dataset.id}...`);                  │
│                                                                   │
│     // Build paths from Config values                            │
│     const inputPath = path.join(                                 │
│         inputDir,                    // ✅ 'data/source/pte'     │
│         dataset.inputSubdir,         // ✅ 'vocabs'              │
│         dataset.input                // ✅ 'pte-fib-listening...' │
│     );                                                           │
│                                                                   │
│     const outputPath = path.join(                                │
│         outputDir,                   // ✅ 'data'                │
│         'processed',                                             │
│         dataset.output               // ✅ 'pte-fib-listening...'│
│     );                                                           │
│                                                                   │
│     // Select extractor based on Config                          │
│     let extractor;                                               │
│     if (dataset.extractorType === 'PTETermsExtractor') {         │
│         extractor = new PTETermsExtractor();                     │
│     } else if (dataset.extractorType === 'PTESentenceExtractor') {│
│         extractor = new PTESentenceExtractor();                  │
│     }                                                            │
│                                                                   │
│     // Extract and transform                                     │
│     const data = await extractor.extract(inputPath);             │
│                                                                   │
│     // Assign category from Config                               │
│     data.forEach(item => {                                       │
│         item.category = dataset.category;  // ✅ From Config     │
│     });                                                          │
│                                                                   │
│     // Write output                                              │
│     fs.writeFileSync(outputPath, JSON.stringify(data, null, 2)); │
│                                                                   │
│     console.log(`✅ Processed ${data.length} items`);            │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

**Result**: All 14 datasets processed automatically!

---

## 🔄 Example 4: CSS Design Tokens

### Using Design Tokens Instead of Hardcoded Values

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: variables.css Defines Tokens                            │
│                                                                   │
│ :root {                                                          │
│     /* Colors */                                                 │
│     --primary-color: #4f46e5;          // ✅ Token               │
│     --success-color: #22c55e;                                    │
│     --danger-color: #ef4444;                                     │
│                                                                   │
│     /* Spacing */                                                │
│     --space-xs: 0.25rem;  /* 4px */    // ✅ Token               │
│     --space-sm: 0.5rem;   /* 8px */                              │
│     --space-md: 0.75rem;  /* 12px */                             │
│     --space-lg: 1rem;     /* 16px */                             │
│                                                                   │
│     /* Border Radius */                                          │
│     --radius-sm: 4px;                  // ✅ Token               │
│     --radius-md: 8px;                                            │
│     --radius-lg: 12px;                                           │
│                                                                   │
│     /* Transitions */                                            │
│     --transition-fast: 0.2s ease;      // ✅ Token               │
│     --transition-base: 0.3s ease;                                │
│ }                                                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Components Use Tokens                                   │
│                                                                   │
│ components.css:                                                  │
│                                                                   │
│ .btn {                                                           │
│     padding: var(--space-md) var(--space-xl);  // ✅ Tokens      │
│     border-radius: var(--radius-md);           // ✅ Token       │
│     background: var(--primary-color);          // ✅ Token       │
│     transition: all var(--transition-fast);    // ✅ Token       │
│     box-shadow: var(--shadow-sm);              // ✅ Token       │
│ }                                                                │
│                                                                   │
│ .btn:hover {                                                     │
│     background: var(--primary-dark);           // ✅ Token       │
│     box-shadow: var(--shadow-md);              // ✅ Token       │
│ }                                                                │
│                                                                   │
│ .btn--success {                                                  │
│     background: var(--success-color);          // ✅ Token       │
│ }                                                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Change Theme in ONE Place                               │
│                                                                   │
│ Want to change primary color from indigo to blue?               │
│                                                                   │
│ OLD WAY (Hardcoded):                                             │
│   ❌ Edit 50+ CSS files                                          │
│   ❌ Find all instances of #4f46e5                               │
│   ❌ Risk missing some instances                                 │
│                                                                   │
│ NEW WAY (Tokens):                                                │
│   ✅ Edit 1 line in variables.css:                               │
│      --primary-color: #3b82f6;  /* Changed! */                   │
│   ✅ All 50+ components update automatically                     │
│   ✅ Consistent across entire app                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📈 Benefits Visualization

### Before: Hardcoded Values Everywhere

```
┌─────────────────┐
│    File A       │
│  delay = 3000   │  ❌ Change requires editing 5 files
└─────────────────┘  ❌ Easy to have inconsistent values
                     ❌ No single source of truth
┌─────────────────┐
│    File B       │
│  delay = 3000   │
└─────────────────┘

┌─────────────────┐
│    File C       │
│  pause = 3000   │  ⚠️  Different name, same value!
└─────────────────┘

┌─────────────────┐
│    File D       │
│  delay = 2000   │  ❌ Inconsistent! Bug!
└─────────────────┘

┌─────────────────┐
│    File E       │
│  wait = 3000    │  ⚠️  Another name!
└─────────────────┘
```

### After: Config.js as Single Source

```
                  ┌─────────────────────────┐
                  │      Config.js          │
                  │                         │
                  │  tts: {                 │
                  │    delays: {            │
                  │      long: 3000  ✅     │
                  │    }                    │
                  │  }                      │
                  └────────────┬────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
        ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼────────┐
        │   File A     │ │  File B  │ │    File C     │
        │              │ │          │ │               │
        │ delay =      │ │ delay =  │ │ delay =       │
        │ config.get(  │ │ config.  │ │ this.config.  │
        │  'tts.delays │ │  get(... │ │  get(...      │
        │   .long')    │ │          │ │               │
        │              │ │          │ │               │
        │ = 3000 ✅    │ │ = 3000 ✅│ │ = 3000 ✅     │
        └──────────────┘ └──────────┘ └───────────────┘

Benefits:
✅ Change in 1 place → Updates everywhere
✅ Consistent values guaranteed
✅ Self-documenting code
✅ Easy to test with mocks
```

---

## 🎯 Key Takeaways

### **1. Everything Flows from Config.js**

```javascript
// ❌ NEVER
const delay = 3000;
const path = '/data/processed/vocabulary.json';

// ✅ ALWAYS
const delay = this.config.get('tts.delays.long');
const path = this.config.get('data.paths.dataset');
```

### **2. Handlers Validate & Apply**

```javascript
handlers = {
    speed: {
        validate: (value) => /* Uses Config.get() */,
        apply: (value) => /* Direct engine update */,
        default: () => this.config.get('tts.speeds.slow')
    }
}
```

### **3. Events Drive Everything**

```
User Action → EventBus.emit('setting:request-change')
           → SettingsModule validates & applies
           → EventBus.emit('setting:changed')
           → Engines react
```

### **4. CSS Tokens Mirror JS Config**

```css
/* variables.css = Config.js for CSS */
:root {
    --primary-color: #4f46e5;  /* Like Config.get('colors.primary') */
    --space-md: 0.75rem;       /* Like Config.get('spacing.md') */
}
```

---

## 📝 Summary

This architecture ensures:

1. ✅ **Zero Hardcoded Values** - Everything from Config.js or variables.css
2. ✅ **Single Source of Truth** - Change in ONE place
3. ✅ **Event-Driven** - Loose coupling via EventBus
4. ✅ **Declarative** - Handler registry pattern
5. ✅ **Scalable** - Add features by adding config entries
6. ✅ **Maintainable** - Clear data flow
7. ✅ **Testable** - Easy to mock

> **"If it's a value, it's in Config.js. If it's a style, it's a CSS token."**

---

**Created**: October 8, 2025  
**Version**: v2.3 Production Ready  
**Status**: ✅ Complete Reference
