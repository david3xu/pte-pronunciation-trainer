# PTE Pronunciation Trainer - Complete Workflow

## 🔄 End-to-End System Workflow

### **1. Development Workflow**

```mermaid
graph TD
    A[Developer] --> B[Edit Source Files]
    B --> C[npm run data:pte]
    C --> D[PTEDataPipeline]
    D --> E[Load Config.js]
    E --> F[Extract from pte-fib-listening-with-ipa.md]
    F --> G[Generate pte-fib-listening-dataset.json]
    G --> H[npm run dev]
    H --> I[Browser Testing]
    I --> J[npm run build]
    J --> K[Production Build]
    K --> L[npm run validate]
    L --> M[Deploy]
```

### **2. Data Processing Workflow**

```mermaid
graph LR
    subgraph "📊 Source Data"
        A[pte-fib-listening-with-ipa.md<br/>914 terms with IPA]
        B[fib-listening-vocabulary.md<br/>Fallback terms]
    end

    subgraph "🔧 Processing Pipeline"
        C[PTETermsExtractor.js<br/>Parse IPA format]
        D[PTEDataPipeline.js<br/>Configurable processing]
        E[Data Validation<br/>Check integrity]
    end

    subgraph "📦 Output"
        F[pte-fib-listening-dataset.json<br/>Structured dataset]
        G[pte-processing-report.json<br/>Processing report]
    end

    A --> C
    B --> C
    C --> D
    D --> E
    E --> F
    E --> G
```

### **3. Application Runtime Workflow**

```mermaid
sequenceDiagram
    participant Browser
    participant PTEApp
    participant Config
    participant SettingsManager
    participant PTEVocabularyManager
    participant UIController
    participant TTSEngine
    participant Dataset

    Browser->>PTEApp: Load Application
    PTEApp->>Config: Initialize Configuration
    Config-->>PTEApp: Return All Settings

    PTEApp->>SettingsManager: Initialize Settings
    SettingsManager->>Config: Get Settings Configuration
    Config-->>SettingsManager: Return Settings Config
    SettingsManager-->>PTEApp: Settings Ready

    PTEApp->>PTEVocabularyManager: Initialize
    PTEVocabularyManager->>Config: Get Data Path
    Config-->>PTEVocabularyManager: Return Dataset Path
    PTEVocabularyManager->>Dataset: Load Vocabulary
    Dataset-->>PTEVocabularyManager: Return 914 Terms + IPA
    PTEVocabularyManager-->>PTEApp: Vocabulary Ready

    PTEApp->>UIController: Initialize UI
    UIController->>SettingsManager: Get Settings Options
    SettingsManager-->>UIController: Return Dropdown Options
    UIController->>Config: Get UI Settings
    Config-->>UIController: Return UI Configuration
    UIController-->>PTEApp: UI Ready

    Browser->>UIController: User Interaction
    UIController->>SettingsManager: Update Setting
    SettingsManager->>Config: Validate Setting
    Config-->>SettingsManager: Return Validation Result
    SettingsManager->>SettingsManager: Apply Dependencies
    SettingsManager-->>UIController: Setting Updated
    UIController->>PTEVocabularyManager: Get Word Data
    PTEVocabularyManager-->>UIController: Return Word + IPA
    UIController->>TTSEngine: Pronounce Word
    TTSEngine->>Config: Get TTS Settings
    Config-->>TTSEngine: Return Voice/Speed Config
    TTSEngine-->>Browser: Audio Output
```

## 🎯 Class Interaction Diagram

```mermaid
classDiagram
    class AppConfig {
        +config: Object
        +get(path: string): any
        +set(path: string, value: any): void
        +merge(newConfig: Object): void
    }

    class PTEDataPipeline {
        +config: Object
        +results: Map
        +stats: Object
        +run(): Promise
        +extractPTEVocabulary(): Promise
        +generatePTEDatasets(): Promise
        +validateData(): void
    }

    class PTEVocabularyManager {
        +currentCategory: string
        +currentDifficulty: string
        +currentWords: Array
        +allWords: Array
        +initialize(): Promise
        +loadPTEData(): Promise
        +setLearningMode(mode: string): void
        +getCurrentWord(index: number): Object
    }

    class SettingsManager {
        +config: Object
        +eventBus: Object
        +settings: Object
        +initialize(): void
        +updateSetting(key: string, value: any): void
        +getSetting(key: string): any
        +getAvailableOptions(key: string): Array
        +applyDependencies(changedKey: string, changedValue: any): void
    }

    class UIController {
        +pronunciationPreference: string
        +currentWordPronunciations: Object
        +settingsManager: Object
        +displayWord(word: Object, index: number): void
        +togglePronunciation(): string
        +updateCategoryDisplay(): void
        +populateDropdownsFromSettingsManager(): void
    }

    class TTSEngine {
        +speechRate: number
        +currentRepeatCount: number
        +pronounceWord(word: Object, repeatCount: number): Promise
        +speak(text: string, lang: string, customRate: number): Promise
        +setSpeechRate(rate: number): void
    }

    class PTETermsExtractor {
        +extract(filePath: string, fs: Object): Promise~Array~
        +parsePTETermLine(line: string): Object
        +inferDifficulty(word: string): string
    }

    AppConfig --> PTEDataPipeline : provides config
    AppConfig --> PTEVocabularyManager : provides config
    AppConfig --> SettingsManager : provides config
    AppConfig --> UIController : provides config
    AppConfig --> TTSEngine : provides config

    PTEDataPipeline --> PTETermsExtractor : uses for extraction
    PTEDataPipeline --> AppConfig : loads configuration

    PTEVocabularyManager --> AppConfig : loads data paths
    PTEVocabularyManager --> UIController : provides word data

    SettingsManager --> AppConfig : loads settings config
    SettingsManager --> UIController : provides settings options

    UIController --> PTEVocabularyManager : requests word data
    UIController --> SettingsManager : updates settings
    UIController --> TTSEngine : requests pronunciation

    TTSEngine --> AppConfig : loads TTS settings
```

## 🔧 Configuration Flow

```mermaid
graph TD
    subgraph "🎯 Centralized Configuration"
        CONFIG[Config.js<br/>Single Source of Truth]
    end

    subgraph "📊 Data Layer"
        PIPELINE[PTEDataPipeline]
        EXTRACTOR[PTETermsExtractor]
        VALIDATOR[DataValidator]
    end

    subgraph "🎨 Application Layer"
        APP[PTEApp]
        SETTINGS[SettingsManager]
        VOCAB[PTEVocabularyManager]
        UI[UIController]
        TTS[TTSEngine]
    end

    subgraph "🔧 Build Layer"
        BUILD[build.js]
        VALIDATE[validate.js]
    end

    CONFIG --> PIPELINE
    CONFIG --> EXTRACTOR
    CONFIG --> VALIDATOR
    CONFIG --> APP
    CONFIG --> SETTINGS
    CONFIG --> VOCAB
    CONFIG --> UI
    CONFIG --> TTS
    CONFIG --> BUILD
    CONFIG --> VALIDATE
```

## 🎯 Key Design Patterns

### **1. Configuration-Driven Pattern**
```javascript
// All components load configuration from centralized source
const appConfig = new AppConfig();
const config = appConfig.get('category.setting');
```

### **2. Event-Driven Communication**
```javascript
// Loose coupling via EventBus
window.eventBus.emit('event:name', data);
window.eventBus.on('event:name', handler);
```

### **3. Dependency Injection Pattern**
```javascript
// Configuration injected into constructors
const pipeline = new PTEDataPipeline(customConfig);
```

### **4. Factory Pattern**
```javascript
// Configurable object creation
const extractor = PTETermsExtractor.extract(filePath, fs);
```

## 🚀 Deployment Pipeline

```mermaid
graph LR
    A[Source Code] --> B[Config.js<br/>Centralized Settings]
    B --> C[npm run data:pte<br/>Process Data]
    C --> D[Generate Dataset<br/>914 terms + IPA]
    D --> E[npm run build<br/>Create Production Build]
    E --> F[Minified Assets<br/>Optimized for Production]
    F --> G[npm run validate<br/>Verify Data Integrity]
    G --> H[Deploy<br/>Production Ready]

    style B fill:#e1f5fe
    style D fill:#f3e5f5
    style H fill:#e8f5e8
```

## 📋 Component Responsibilities

| Component | Primary Responsibility | Key Functions |
|-----------|----------------------|---------------|
| **AppConfig** | Configuration Management | `get()`, `set()`, `merge()` |
| **PTEDataPipeline** | Data Processing | `run()`, `extractPTEVocabulary()` |
| **PTETermsExtractor** | Markdown Parsing | `extract()`, `parsePTETermLine()` |
| **PTEVocabularyManager** | Vocabulary Management | `initialize()`, `loadPTEData()` |
| **SettingsManager** | Settings Management | `updateSetting()`, `getAvailableOptions()` |
| **UIController** | User Interface | `displayWord()`, `togglePronunciation()` |
| **TTSEngine** | Speech Synthesis | `pronounceWord()`, `speak()` |
| **PTEApp** | Application Coordination | `init()`, `initializeModules()` |

## 🎯 Data Flow Summary

1. **Configuration Loading**: All components load settings from `Config.js`
2. **Data Processing**: Pipeline processes markdown → JSON dataset
3. **Application Initialization**: App loads vocabulary and initializes UI
4. **User Interaction**: UI displays words with IPA pronunciation
5. **Audio Output**: TTS engine pronounces words with configurable settings
6. **Progress Tracking**: System tracks user progress and preferences

## 🔧 Extension Workflow

### **Adding New Data Source**
```mermaid
graph LR
    A[Add to Config.js] --> B[Create Extractor]
    B --> C[Update Pipeline]
    C --> D[Test Processing]
    D --> E[Deploy]
```

### **Adding New Learning Mode**
```mermaid
graph LR
    A[Add to Config.js] --> B[Update VocabularyManager]
    B --> C[Update UI]
    C --> D[Test Mode]
    D --> E[Deploy]
```

---

**Workflow Status**: ✅ **COMPLETE & DOCUMENTED**
**Architecture**: ✅ **CLEAR & MAINTAINABLE**
**Extensibility**: ✅ **WELL-DEFINED PATTERNS**
