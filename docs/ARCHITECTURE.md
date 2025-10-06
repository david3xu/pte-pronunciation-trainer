````markdown````markdown

# PTE Pronunciation Trainer - Architecture & Workflow# PTE Pronunciation Trainer - Architecture & Workflow



## 🏗️ System Architecture Overview## 🏗️ System Architecture Overview



This document provides a comprehensive overview of the PTE Pronunciation Trainer's architecture, design patterns, and data flow.This document provides a comprehensive overview of the PTE Pronunciation Trainer's architecture, design patterns, and data flow.



## 📊 High-Level Architecture Diagram## 📊 High-Level Architecture Diagram



```mermaid```mermaid

graph TBgraph TB

    subgraph "🎯 Centralized Configuration"    subgraph "🎯 Centralized Configuration"

        CONFIG[Config.js<br/>ALL VALUES HERE]        CONFIG[Config.js<br/>ALL VALUES HERE]

    end    end



    subgraph "📊 Data Pipeline"    subgraph "📊 Data Pipeline"

        SOURCE[pte-fib-listening-with-ipa.md<br/>914 terms with IPA]        SOURCE[pte-fib-listening-with-ipa.md<br/>914 terms with IPA]

        PIPELINE[PTEDataPipeline.js<br/>Configurable Processing]        PIPELINE[PTEDataPipeline.js<br/>Configurable Processing]

        DATASET[pte-fib-listening-dataset.json<br/>Structured Data]        DATASET[pte-fib-listening-dataset.json<br/>Structured Data]

    end    end



    subgraph "🎨 Frontend Architecture"    subgraph "🎨 Frontend Architecture"

        NS[AppNamespace.js<br/>Module Registry]        NS[AppNamespace.js<br/>Module Registry]

        APP[PTEApp.js<br/>Main Coordinator & Initializer]        APP[PTEApp.js<br/>Main Coordinator & Initializer]

        SETTINGS[SettingsManager.js<br/>Settings Logic]        SETTINGS[SettingsManager.js<br/>Settings Logic]

        VOCAB[PTEVocabularyManager.js<br/>Data Management]        VOCAB[PTEVocabularyManager.js<br/>Data Management]

        UI[UIController.js<br/>Display Logic]        UI[UIController.js<br/>Display Logic]

        TTS[TTSEngine.js<br/>Speech Synthesis]        TTS[TTSEngine.js<br/>Speech Synthesis]

        AUDIO[AudioControls.js<br/>Playback Control]        AUDIO[AudioControls.js<br/>Playback Control]

    end    end



    subgraph "🔧 Build System"    subgraph "🔧 Build System"

        BUILD[build.js<br/>Configurable Bundling]        BUILD[build.js<br/>Configurable Bundling]

        VALIDATE[validate.js<br/>Data Validation]        VALIDATE[validate.js<br/>Data Validation]

        DIST[dist/<br/>Production Output]        DIST[dist/<br/>Production Output]

    end    end



    CONFIG --> PIPELINE    CONFIG --> PIPELINE

    CONFIG --> BUILD    CONFIG --> BUILD

    CONFIG --> VALIDATE    CONFIG --> VALIDATE

    CONFIG --> APP    CONFIG --> APP

    CONFIG --> SETTINGS    CONFIG --> SETTINGS



    SOURCE --> PIPELINE    SOURCE --> PIPELINE

    PIPELINE --> DATASET    PIPELINE --> DATASET

    DATASET --> VOCAB    DATASET --> VOCAB

        

    NS --> APP    NS --> APP

    APP --> VOCAB    APP --> VOCAB

    APP --> SETTINGS    APP --> SETTINGS

    APP --> UI    APP --> UI

    APP --> TTS    APP --> TTS

    APP --> AUDIO    APP --> AUDIO

        

    VOCAB --> UI    VOCAB --> UI

    UI --> SETTINGS    UI --> SETTINGS

    UI --> TTS    UI --> TTS

    TTS --> AUDIO    TTS --> AUDIO



    BUILD --> DIST    BUILD --> DIST

    VALIDATE --> DATASET    VALIDATE --> DATASET

``````



## 🔄 Data Flow Diagram## 🔄 Data Flow Diagram



```mermaid```mermaid

sequenceDiagramsequenceDiagram

    participant User    participant User

    participant UI as UIController    participant UI as UIController

    participant VM as PTEVocabularyManager    participant VM as PTEVocabularyManager

    participant TTS as TTSEngine    participant TTS as TTSEngine

    participant Config as Config.js    participant Config as Config.js

    participant Data as Dataset    participant Data as Dataset



    User->>UI: Load Application    User->>UI: Load Application

    UI->>Config: Get UI Configuration    UI->>Config: Get UI Configuration

    Config-->>UI: Return UI Settings    Config-->>UI: Return UI Settings



    UI->>VM: Initialize Vocabulary    UI->>VM: Initialize Vocabulary

    VM->>Config: Get Data Paths    VM->>Config: Get Data Paths

    Config-->>VM: Return Dataset Path    Config-->>VM: Return Dataset Path

    VM->>Data: Load PTE Dataset    VM->>Data: Load PTE Dataset

    Data-->>VM: Return 914 Terms with IPA    Data-->>VM: Return 914 Terms with IPA

    VM-->>UI: Vocabulary Ready    VM-->>UI: Vocabulary Ready



    User->>UI: Select Word    User->>UI: Select Word

    UI->>VM: Get Word Data    UI->>VM: Get Word Data

    VM-->>UI: Return Word + IPA    VM-->>UI: Return Word + IPA

    UI->>TTS: Pronounce Word    UI->>TTS: Pronounce Word

    TTS->>Config: Get TTS Settings    TTS->>Config: Get TTS Settings

    Config-->>TTS: Return Voice/Speed Config    Config-->>TTS: Return Voice/Speed Config

    TTS-->>User: Audio Output    TTS-->>User: Audio Output

``````



## 🎯 Core Classes & Functions## 🎯 Core Classes & Functions



### **1. Configuration Management**### **1. Configuration Management**



#### `AppConfig` (src/js/shared/Config.js)#### `AppConfig` (src/js/shared/Config.js)

```javascript```javascript

class AppConfig {class AppConfig {

    constructor() {    constructor() {

        this.config = {        this.config = {

            pipeline: { /* Data pipeline settings */ },            pipeline: { /* Data pipeline settings */ },

            data: { /* Data source configuration */ },            data: { /* Data source configuration */ },

            tts: { /* Text-to-speech settings */ },            tts: { /* Text-to-speech settings */ },

            ui: { /* Unified user interface settings */ },            ui: { /* Unified user interface settings */ },

            build: { /* Build system configuration */ }            build: { /* Build system configuration */ }

        };        };

    }    }



    get(path) { /* Get config value by dot notation */ }    get(path) { /* Get config value by dot notation */ }

    set(path, value) { /* Set config value */ }    set(path, value) { /* Set config value */ }

    merge(newConfig) { /* Merge configuration */ }    merge(newConfig) { /* Merge configuration */ }

}}

``````



**Key Functions:****Key Functions:**

- `get('pipeline.inputDir')` - Get data pipeline input directory- `get('pipeline.inputDir')` - Get data pipeline input directory

- `get('tts.voices.default')` - Get default TTS voice- `get('tts.voices.default')` - Get default TTS voice

- `get('build.jsFiles')` - Get list of JS files to bundle- `get('build.jsFiles')` - Get list of JS files to bundle



### **2. Module Registration**### **2. Module Registration**



#### `AppNamespace` (src/js/shared/AppNamespace.js)#### `AppNamespace` (src/js/shared/AppNamespace.js)

```javascript```javascript

class AppNamespace {class AppNamespace {

    constructor() {    constructor() {

        this.modules = {};        this.modules = {};

    }    }



    registerModule(name, instance) { /* Register a module in the namespace */ }    registerModule(name, instance) { /* Register a module in the namespace */ }

    getModule(name) { /* Get a module instance */ }    getModule(name) { /* Get a module instance */ }

}}

``````



**Standardized Registration Pattern:****Standardized Registration Pattern:**

```javascript```javascript

// Create module instance// Create module instance

const moduleInstance = new ModuleClass();const moduleInstance = new ModuleClass();



// Register with CCLApp namespace// Register with CCLApp namespace

if (window.CCLApp) {if (window.CCLApp) {

  window.CCLApp.registerModule('moduleName', moduleInstance);  window.CCLApp.registerModule('moduleName', moduleInstance);

}}



// Legacy compatibility - maintain existing global reference// Legacy compatibility - maintain existing global reference

window.moduleName = moduleInstance;window.moduleName = moduleInstance;

``````



### **3. Data Pipeline**### **3. Data Pipeline**



#### `PTEDataPipeline` (scripts/pte-data-pipeline.js)#### `PTEDataPipeline` (scripts/pte-data-pipeline.js)

```javascript```javascript

class PTEDataPipeline {class PTEDataPipeline {

    constructor(config = {}) {    constructor(config = {}) {

        // Load centralized configuration        // Load centralized configuration

        const appConfig = new AppConfig();        const appConfig = new AppConfig();

        this.config = {        this.config = {

            inputDir: config.inputDir || appConfig.get('pipeline.inputDir'),            inputDir: config.inputDir || appConfig.get('pipeline.inputDir'),

            dataSources: config.dataSources || appConfig.get('pipeline.dataSources')            dataSources: config.dataSources || appConfig.get('pipeline.dataSources')

        };        };

    }    }



    async run() { /* Main pipeline execution */ }    async run() { /* Main pipeline execution */ }

    async extractPTEVocabulary() { /* Extract terms from markdown */ }    async extractPTEVocabulary() { /* Extract terms from markdown */ }

    async generatePTEDatasets() { /* Create JSON datasets */ }    async generatePTEDatasets() { /* Create JSON datasets */ }

    validateData() { /* Validate extracted data */ }    validateData() { /* Validate extracted data */ }

}}

``````



**Key Functions:****Key Functions:**

- `run()` - Execute complete data processing pipeline- `run()` - Execute complete data processing pipeline

- `extractPTEVocabulary()` - Parse markdown files for terms- `extractPTEVocabulary()` - Parse markdown files for terms

- `generatePTEDatasets()` - Create structured JSON output- `generatePTEDatasets()` - Create structured JSON output



### **4. Vocabulary Management**### **4. Vocabulary Management**



#### `PTEVocabularyManager` (src/js/core/PTEVocabularyManager.js)#### `PTEVocabularyManager` (src/js/core/PTEVocabularyManager.js)

```javascript```javascript

class PTEVocabularyManager {class PTEVocabularyManager {

    constructor() {    constructor() {

        this.currentCategory = 'all-categories';        this.currentCategory = 'all-categories';

        this.currentDifficulty = 'all';        this.currentDifficulty = 'all';

        this.currentWords = [];        this.currentWords = [];

        this.allWords = [];        this.allWords = [];

    }    }



    async initialize() { /* Load PTE dataset */ }    async initialize() { /* Load PTE dataset */ }

    async loadPTEData() { /* Fetch vocabulary data */ }    async loadPTEData() { /* Fetch vocabulary data */ }

    setLearningMode(mode) { /* Set learning mode */ }    setLearningMode(mode) { /* Set learning mode */ }

    loadCategory(category) { /* Filter by category */ }    loadCategory(category) { /* Filter by category */ }

    setDifficulty(difficulty) { /* Filter by difficulty */ }    setDifficulty(difficulty) { /* Filter by difficulty */ }

    getCurrentWord(index) { /* Get word at index */ }    getCurrentWord(index) { /* Get word at index */ }

}}

``````



**Key Functions:****Key Functions:**

- `initialize()` - Load and initialize vocabulary data- `initialize()` - Load and initialize vocabulary data

- `loadPTEData()` - Fetch dataset from configured path- `loadPTEData()` - Fetch dataset from configured path

- `getCurrentWord(index)` - Get word with IPA pronunciation data- `getCurrentWord(index)` - Get word with IPA pronunciation data



### **5. Settings Management**### **5. Settings Management**



#### `SettingsManager` (src/js/core/SettingsManager.js)#### `SettingsManager` (src/js/core/SettingsManager.js)

```javascript```javascript

class SettingsManager {class SettingsManager {

    constructor() {    constructor() {

        this.config = window.appConfig || new AppConfig();        this.config = window.appConfig || new AppConfig();

        this.eventBus = window.eventBus || new EventBus();        this.eventBus = window.eventBus || new EventBus();

        this.settings = {};        this.settings = {};

    }    }



    initialize() { /* Load and validate settings */ }    initialize() { /* Load and validate settings */ }

    updateSetting(key, value) { /* Update setting with validation */ }    updateSetting(key, value) { /* Update setting with validation */ }

    getSetting(key) { /* Get current setting value */ }    getSetting(key) { /* Get current setting value */ }

    getAllSettings() { /* Get all current settings */ }    getAllSettings() { /* Get all current settings */ }

    getAvailableOptions(key) { /* Get valid options for setting */ }    getAvailableOptions(key) { /* Get valid options for setting */ }

    handleDependencies(changedKey, newValue) { /* Handle setting dependencies */ }    handleDependencies(changedKey, newValue) { /* Handle setting dependencies */ }

}}

``````



**Key Functions:****Key Functions:**

- `updateSetting(key, value)` - Update setting with validation and dependencies- `updateSetting(key, value)` - Update setting with validation and dependencies

- `getAvailableOptions(key)` - Get valid options based on PTE data structure- `getAvailableOptions(key)` - Get valid options based on PTE data structure

- `handleDependencies(changedKey, newValue)` - Handle automatic dropdown updates- `handleDependencies(changedKey, newValue)` - Handle automatic dropdown updates



### **6. User Interface Controller**### **6. User Interface Controller**



#### `UIController` (src/js/ui/UIController.js)#### `UIController` (src/js/ui/UIController.js)

```javascript```javascript

class UIController {class UIController {

    constructor() {    constructor() {

        this.pronunciationPreference = 'british';        this.pronunciationPreference = 'british';

        this.currentWordPronunciations = null;        this.currentWordPronunciations = null;

        this.settingsManager = window.settingsManager;        this.settingsManager = window.settingsManager;

    }    }



    displayWord(word, index) { /* Display word with IPA */ }    displayWord(word, index) { /* Display word with IPA */ }

    togglePronunciation() { /* Switch British/American */ }    togglePronunciation() { /* Switch British/American */ }

    updateCategoryDisplay() { /* Update category info */ }    updateCategoryDisplay() { /* Update category info */ }

    updateButtons() { /* Update navigation buttons */ }    updateButtons() { /* Update navigation buttons */ }

    populateAllDropdownsFromSettingsManager() { /* Use SettingsManager for all dropdowns */ }    populateAllDropdownsFromSettingsManager() { /* Use SettingsManager for all dropdowns */ }

}}

``````



**Key Functions:****Key Functions:**

- `displayWord(word, index)` - Show word with IPA pronunciation- `displayWord(word, index)` - Show word with IPA pronunciation

- `togglePronunciation()` - Switch between British/American- `togglePronunciation()` - Switch between British/American

- `updateCategoryDisplay()` - Update category and progress info- `updateCategoryDisplay()` - Update category and progress info

- `populateAllDropdownsFromSettingsManager()` - Use centralized settings for all dropdowns- `populateAllDropdownsFromSettingsManager()` - Use centralized settings for all dropdowns



### **7. Initialization & Coordination**### **7. Initialization & Coordination**



#### `PTEVocabularyTrainer` (src/js/core/PTEApp.js)#### `PTEVocabularyTrainer` (src/js/core/PTEApp.js)

```javascript```javascript

class PTEVocabularyTrainer {class PTEVocabularyTrainer {

    constructor() {    constructor() {

        this.initialized = false;        this.initialized = false;

        this.init();        this.init();

    }    }



    init() { /* Initialize app components */ }    init() { /* Initialize app components */ }

    async initializeModules() { /* Initialize modules in proper order */ }    async initializeModules() { /* Initialize modules in proper order */ }

    initializeStateManager() { /* Set up state persistence */ }    initializeStateManager() { /* Set up state persistence */ }

    initializeSettingsManager() { /* Set up settings system */ }    initializeSettingsManager() { /* Set up settings system */ }

    setupKeyboardShortcuts() { /* Set up keyboard controls */ }    setupKeyboardShortcuts() { /* Set up keyboard controls */ }

    restoreUIState() { /* Restore previous session state */ }    restoreUIState() { /* Restore previous session state */ }

}}

``````



**Key Functions:****Key Functions:**

- `initializeModules()` - Primary initializer for all components- `initializeModules()` - Primary initializer for all components

- `restoreUIState()` - Restore user preferences from previous session- `restoreUIState()` - Restore user preferences from previous session



## 🔄 Interaction Patterns## 🔄 Interaction Patterns



### **1. Configuration-Driven Architecture**### **1. Configuration-Driven Architecture**

```javascript```javascript

// All components get configuration from centralized source// All components get configuration from centralized source

const appConfig = new AppConfig();const appConfig = new AppConfig();

const ttsConfig = appConfig.get('tts');const ttsConfig = appConfig.get('tts');

const dataConfig = appConfig.get('data');const dataConfig = appConfig.get('data');

``````



### **2. Event-Driven Communication**### **2. Event-Driven Communication**

```javascript```javascript

// Components communicate via EventBus// Components communicate via EventBus

window.eventBus.emit('vocabulary:loaded', data);window.eventBus.emit('vocabulary:loaded', data);

window.eventBus.on('word:display', (data) => {window.eventBus.on('word:display', (data) => {

    this.displayWord(data.word, data.index);    this.displayWord(data.word, data.index);

});});

``````



### **3. Data Flow Pattern**### **3. Data Flow Pattern**

``````

Markdown File → Pipeline → JSON Dataset → VocabularyManager → UI → TTS → AudioMarkdown File → Pipeline → JSON Dataset → VocabularyManager → UI → TTS → Audio

``````



### **4. Module Registration Pattern**### **4. Module Registration Pattern**

```javascript```javascript

// Create module instance// Create module instance

const moduleInstance = new ModuleClass();const moduleInstance = new ModuleClass();



// Register with CCLApp namespace// Register with CCLApp namespace

if (window.CCLApp) {if (window.CCLApp) {

  window.CCLApp.registerModule('moduleName', moduleInstance);  window.CCLApp.registerModule('moduleName', moduleInstance);

}}



// Legacy compatibility// Legacy compatibility

window.moduleName = moduleInstance;window.moduleName = moduleInstance;

``````



## 🎯 Key Design Principles## 🎯 Key Design Principles



### **1. Single Source of Truth**### **1. Single Source of Truth**

- ALL configuration in `Config.js`- ALL configuration in `Config.js`

- NO hardcoded values anywhere- NO hardcoded values anywhere

- Centralized data paths and settings- Centralized data paths and settings

- Unified UI configuration section- Unified UI configuration section



### **2. Standardized Module Registration**### **2. Standardized Module Registration**

- Consistent module registration with CCLApp namespace- Consistent module registration with CCLApp namespace

- Legacy global references maintained for backward compatibility- Legacy global references maintained for backward compatibility

- Clear initialization precedence (PTEApp.js is the primary initializer)- Clear initialization precedence (PTEApp.js is the primary initializer)



### **3. Configurable Everything**### **3. Configurable Everything**

- Data sources configurable- Data sources configurable

- File paths configurable- File paths configurable

- Build process configurable- Build process configurable

- UI settings configurable- UI settings configurable



### **4. Clean Separation of Concerns**### **4. Clean Separation of Concerns**

- **Data Layer**: Pipeline, Extractors, Validation- **Data Layer**: Pipeline, Extractors, Validation

- **Business Logic**: Vocabulary Management, Progress Tracking, Settings Management- **Business Logic**: Vocabulary Management, Progress Tracking, Settings Management

- **Presentation Layer**: UI Controller, Settings Panel- **Presentation Layer**: UI Controller, Settings Panel

- **Audio Layer**: TTS Engine, Voice Selection, Audio Controls- **Audio Layer**: TTS Engine, Voice Selection, Audio Controls



## 🚀 Deployment Workflow## 🚀 Deployment Workflow



```mermaid```mermaid

graph LRgraph LR

    A[Source Code] --> B[npm run data:pte]    A[Source Code] --> B[npm run data:pte]

    B --> C[Generate Dataset]    B --> C[Generate Dataset]

    C --> D[npm run build]    C --> D[npm run build]

    D --> E[Minified Assets]    D --> E[Minified Assets]

    E --> F[npm run validate]    E --> F[npm run validate]

    F --> G[Production Ready]    F --> G[Production Ready]



    H[Config.js] --> B    H[Config.js] --> B

    H --> D    H --> D

    H --> F    H --> F

``````



## 📋 Configuration Categories## 📋 Configuration Categories



| Category | Purpose | Key Settings || Category | Purpose | Key Settings |

|----------|---------|--------------||----------|---------|--------------|

| **Pipeline** | Data processing | Input/output paths, file names || **Pipeline** | Data processing | Input/output paths, file names |

| **Data** | Data sources | Dataset paths, categories, learning modes || **Data** | Data sources | Dataset paths, categories, learning modes |

| **TTS** | Speech synthesis | Voices, speeds, delays, repeat modes || **TTS** | Speech synthesis | Voices, speeds, delays, repeat modes |

| **UI** | User interface | Themes, shortcuts, animations || **UI** | User interface | Themes, shortcuts, animations |

| **Build** | Production build | File lists, output paths, minification || **Build** | Production build | File lists, output paths, minification |

| **Validation** | Data integrity | Required files, error messages || **Validation** | Data integrity | Required files, error messages |



## 🔧 Extension Points## 🔧 Extension Points



### **Adding New Data Sources**### **Adding New Data Sources**

1. Add to `Config.js` → `pipeline.dataSources`1. Add to `Config.js` → `pipeline.dataSources`

2. Create new extractor in `src/js/data/extractors/`2. Create new extractor in `src/js/data/extractors/`

3. Update pipeline to use new extractor3. Update pipeline to use new extractor

4. No other code changes needed4. No other code changes needed



### **Adding New Learning Modes**### **Adding New Learning Modes**

1. Add to `Config.js` → `data.learningModes`1. Add to `Config.js` → `data.learningModes`

2. Update vocabulary manager to handle new mode2. Update vocabulary manager to handle new mode

3. UI automatically adapts to new modes3. UI automatically adapts to new modes



### **Customizing Build Process**### **Customizing Build Process**

1. Modify `Config.js` → `build.jsFiles`1. Modify `Config.js` → `build.jsFiles`

2. Update `Config.js` → `build.output`2. Update `Config.js` → `build.output`

3. Build script automatically uses new configuration3. Build script automatically uses new configuration



## 🎯 Target Architecture Benefits## 🎯 Target Architecture Benefits



- **🔧 Zero Hardcoding**: All values configurable- **🔧 Zero Hardcoding**: All values configurable

- **📈 Highly Scalable**: Easy to extend and modify- **📈 Highly Scalable**: Easy to extend and modify

- **🎯 PTE-Focused**: Optimized for PTE vocabulary training- **🎯 PTE-Focused**: Optimized for PTE vocabulary training

- **🚀 Production-Ready**: Clean, maintainable codebase- **🚀 Production-Ready**: Clean, maintainable codebase

- **📱 Modern UX**: Responsive design with advanced TTS- **📱 Modern UX**: Responsive design with advanced TTS

- **🔍 Quality Assured**: Built-in validation and error handling- **🔍 Quality Assured**: Built-in validation and error handling



## 📝 Recent Code Improvements---



### **1. Learning Mode Enhancements****Architecture Status**: ✅ **COMPLETE & PRODUCTION-READY**

- Added support for `pte-intermediate` learning mode**Configuration**: ✅ **100% CENTRALIZED**

- Added `loadIntermediateDataset()` method to PTEVocabularyManager**Module Registration**: ✅ **STANDARDIZED PATTERN**

- Ensures all learning modes are properly handled**Scalability**: ✅ **FULLY CONFIGURABLE**

**PTE Focus**: ✅ **OPTIMIZED FOR PTE EXAM PREPARATION**

### **2. Module Registration Standardization**````
- Implemented consistent pattern across all modules
- Updated all modules to register with CCLApp namespace
- Maintained legacy global references for backwards compatibility

### **3. Configuration Consolidation**
- Merged duplicate UI configuration sections in Config.js
- Created a unified UI configuration structure
- Eliminated redundant configuration objects

### **4. Code Cleanup**
- Removed duplicate event handlers in UIController.js
- Eliminated deprecated methods no longer in use
- Removed unused code in CacheMigration.js

### **5. Initialization Improvements**
- Fixed initialization order between PTEApp.js and AppNamespace.js
- Ensured proper module registration sequence
- Resolved potential race conditions in initialization

---

**Architecture Status**: ✅ **COMPLETE & PRODUCTION-READY**
**Configuration**: ✅ **100% CENTRALIZED**
**Module Registration**: ✅ **STANDARDIZED PATTERN**
**Scalability**: ✅ **FULLY CONFIGURABLE**
**PTE Focus**: ✅ **OPTIMIZED FOR PTE EXAM PREPARATION**
````