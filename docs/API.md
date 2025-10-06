# PTE Pronunciation Trainer - API Reference

## 🎯 Core API Classes

### **AppConfig** - Configuration Management

#### Constructor
```javascript
const appConfig = new AppConfig();
```

#### Methods
```javascript
// Get configuration value by dot notation
appConfig.get('tts.voices.default')           // Returns: 'Google UK English Male'
appConfig.get('pipeline.dataSources.primary') // Returns: 'pte-fib-listening-with-ipa.md'

// Set configuration value
appConfig.set('ui.theme', 'dark')

// Get all configuration
appConfig.getAll() // Returns: Complete config object

// Merge new configuration
appConfig.merge({ custom: { setting: 'value' } })
```

#### Configuration Structure
```javascript
{
  pipeline: {
    inputDir: 'data/source/pte',
    outputDir: 'data',
    dataSources: {
      primary: 'pte-fib-listening-with-ipa.md',
      fallback: 'fib-listening-vocabulary.md'
    }
  },
  tts: {
    voices: { default: 'Google UK English Male' },
    speeds: { slow: 0.7, normal: 1.0, fast: 1.3 }
  },
  // ... more configuration
}
```

---

### **PTEVocabularyManager** - Vocabulary Management

#### Constructor
```javascript
const vocabManager = new PTEVocabularyManager();
```

#### Methods
```javascript
// Initialize vocabulary system
await vocabManager.initialize()

// Load PTE data
await vocabManager.loadPTEData()

// Set learning mode
vocabManager.setLearningMode('pte-fib-listening')

// Load category
vocabManager.loadCategory('all-categories')

// Set difficulty filter
vocabManager.setDifficulty('normal')

// Get current word
const word = vocabManager.getCurrentWord(0)

// Get all current words
const words = vocabManager.getCurrentWords()

// Get total word count
const count = vocabManager.getTotalWordCount()

// Get category counts
const counts = vocabManager.getCategoryCounts()
```

#### Word Object Structure
```javascript
{
  english: "obscure",
  pronunciation: {
    british: { ipa: "əbˈskjʊə", phonetic: "uhb-SKYOOR" },
    american: { ipa: "əbˈskjʊr", phonetic: "uhb-SKYOOR" }
  },
  difficulty: "normal",
  category: "pte-fib-listening",
  source: "pte-fib-listening-with-ipa"
}
```

---

### **SettingsManager** - Settings Management

#### Constructor
```javascript
const settingsManager = new SettingsManager();
```

#### Methods
```javascript
// Initialize settings system
settingsManager.initialize()

// Update a setting with validation
settingsManager.updateSetting('category', 'pte-fib-listening')

// Get current setting value
const category = settingsManager.getSetting('category')

// Get all current settings
const allSettings = settingsManager.getAllSettings()

// Get available options for a setting
const options = settingsManager.getAvailableOptions('difficulty')

// Check if setting value is valid
const isValid = settingsManager.isValidSetting('speed', '1.0')

// Apply setting dependencies
settingsManager.applyDependencies('learningMode', 'pte-fib-listening')
```

#### Settings Structure
```javascript
{
  category: 'all-categories',
  difficulty: 'normal',
  speed: '0.7',
  delay: '2000',
  repeat: 'once',
  voice: 'auto',
  learningMode: 'pte-fib-listening'
}
```

#### Available Options by Setting
```javascript
// Learning modes
settingsManager.getAvailableOptions('learningMode')
// Returns: [{ id: 'pte-fib-listening', label: '🎧 PTE FIB Listening' }]

// Categories
settingsManager.getAvailableOptions('category')
// Returns: [{ id: 'all-categories', label: '🌟 All Categories' }, ...]

// Difficulties
settingsManager.getAvailableOptions('difficulty')
// Returns: [{ id: 'normal', label: '🟡 Normal (All PTE Terms)' }]

// Speech speeds
settingsManager.getAvailableOptions('speed')
// Returns: [{ id: '0.7', label: 'Slow' }, { id: '1.0', label: 'Normal' }, ...]
```

---

### **UIController** - User Interface Management

#### Constructor
```javascript
const uiController = new UIController();
```

#### Methods
```javascript
// Display word with IPA
uiController.displayWord(word, index)

// Toggle pronunciation (British/American)
const newPreference = uiController.togglePronunciation()

// Get pronunciation preference
const preference = uiController.getPronunciationPreference() // 'british' or 'american'

// Set pronunciation preference
uiController.setPronunciationPreference('american')

// Update category display
uiController.updateCategoryDisplay()

// Update navigation buttons
uiController.updateButtons()

// Display first word
uiController.displayFirstWord()

// Use SettingsManager for dropdowns
uiController.populateDropdownsFromSettingsManager()

// Update dropdowns based on learning mode
uiController.updateDropdownsForLearningMode('pte-fib-listening')

// Update dropdowns based on category
uiController.updateDropdownsForCategory('all-categories')

// Handle settings changes
uiController.handleSettingsChange('category', 'pte-fib-listening')
```

---

### **TTSEngine** - Text-to-Speech Engine

#### Constructor
```javascript
const ttsEngine = new TTSEngine();
```

#### Methods
```javascript
// Pronounce word with progressive speeds
await ttsEngine.pronounceWord(word, repeatCount)

// Core speech synthesis
await ttsEngine.speak(text, lang, customRate)

// Set speech rate
ttsEngine.setSpeechRate(0.8)

// Enable background audio (iOS)
ttsEngine.enableBackgroundAudio()

// Clean text for TTS
const cleanText = ttsEngine.cleanTextForTTS("Hello, world!")
```

#### Speech Rates
- `config.get('tts.speeds.slow')` (0.7)
- `config.get('tts.speeds.normal')` (1.0)
- `config.get('tts.speeds.fast')` (1.3)

---

### **PTEDataPipeline** - Data Processing

#### Constructor
```javascript
const pipeline = new PTEDataPipeline(customConfig);
```

#### Methods
```javascript
// Run complete data processing pipeline
await pipeline.run()

// Extract PTE vocabulary from markdown
await pipeline.extractPTEVocabulary()

// Generate PTE datasets
await pipeline.generatePTEDatasets()

// Validate processed data
pipeline.validateData()

// Generate processing report
pipeline.generateReport()
```

---

## 🔄 Event System API

### **EventBus** - Event Communication

#### Emit Events
```javascript
// Vocabulary events
window.eventBus.emit('vocabulary:loaded', { mode: 'pte-fib-listening', total: 914 })
window.eventBus.emit('vocabulary:categoryLoaded', { category: 'all-categories' })
window.eventBus.emit('vocabulary:difficultyFiltered', { difficulty: 'normal' })
window.eventBus.emit('vocabulary:learningModeChanged', { mode: 'pte-fib-listening' })

// Word events
window.eventBus.emit('word:display', { word: wordObject, index: 0 })

// TTS events
window.eventBus.emit('tts:speakingStarted', { word: 'obscure', repeatCount: 0 })
window.eventBus.emit('tts:speakingEnded', { word: 'obscure' })
window.eventBus.emit('tts:rateChanged', { rate: 1.0 })

// App events
window.eventBus.emit('app:initialized', { timestamp: '2024-12-XX', version: '1.0' })
```

#### Listen to Events
```javascript
// Vocabulary events
window.eventBus.on('vocabulary:loaded', (data) => {
  console.log('Vocabulary loaded:', data.total, 'terms')
})

// Word events
window.eventBus.on('word:display', (data) => {
  console.log('Displaying word:', data.word.english)
})

// TTS events
window.eventBus.on('tts:speakingStarted', (data) => {
  console.log('TTS started:', data.word)
})
```

---

## 🎯 Global Window Objects

### **Module Access**
```javascript
// New namespace pattern (recommended)
const vocab = window.CCLApp.getModule('pteVocabularyManager')
const config = window.CCLApp.getModule('config')
const tts = window.CCLApp.getModule('ttsEngine')

// Legacy direct access (still works)
window.pteVocabularyManager
window.appConfig
window.ttsEngine
```

### **Available Modules**
```javascript
// Core modules
window.CCLApp.getModule('pteVocabularyManager')
window.CCLApp.getModule('progressTracker')
window.CCLApp.getModule('pteApp')

// Audio modules
window.CCLApp.getModule('ttsEngine')
window.CCLApp.getModule('voiceSelector')
window.CCLApp.getModule('audioControls')

// UI modules
window.CCLApp.getModule('uiController')
window.CCLApp.getModule('settingsPanel')

// Settings modules
window.CCLApp.getModule('settingsManager')

// Utility modules
window.CCLApp.getModule('eventBus')
window.CCLApp.getModule('storage')
window.CCLApp.getModule('stateManager')
```

---

## 🔧 Configuration API

### **Accessing Configuration**
```javascript
// Get TTS configuration
const ttsConfig = appConfig.get('tts')
const defaultVoice = appConfig.get('tts.voices.default')
const speeds = appConfig.get('tts.speeds')

// Get data pipeline configuration
const pipelineConfig = appConfig.get('pipeline')
const inputDir = appConfig.get('pipeline.inputDir')
const dataSources = appConfig.get('pipeline.dataSources')

// Get UI configuration
const uiConfig = appConfig.get('ui')
const shortcuts = appConfig.get('ui.shortcuts')
const themes = appConfig.get('ui.themes')
```

### **Modifying Configuration**
```javascript
// Set individual values
appConfig.set('tts.voices.default', 'Microsoft James (en-AU)')
appConfig.set('ui.theme', 'dark')

// Merge configuration objects
appConfig.merge({
  tts: {
    voices: { default: 'Custom Voice' }
  },
  ui: {
    theme: 'custom'
  }
})
```

---

## 📊 Data Pipeline API

### **PTETermsExtractor** - Markdown Parsing

#### Static Methods
```javascript
// Extract terms from markdown file
const terms = await PTETermsExtractor.extract(filePath, fs)

// Parse single term line
const termData = PTETermsExtractor.parsePTETermLine(line)

// Infer difficulty from word
const difficulty = PTETermsExtractor.inferDifficulty('obscure')
```

#### Input Format
```markdown
1. obscure | /əbˈskjʊə/ — sounds like **uhb-SKYOOR** | /əbˈskjʊr/ — sounds like **uhb-SKYOOR**
2. clusters | /ˈklʌstəz/ — sounds like **KLUS-turz** | /ˈklʌstərz/ — sounds like **KLUS-turz**
```

#### Output Format
```javascript
[
  {
    english: "obscure",
    pronunciation: {
      british: { ipa: "əbˈskjʊə", phonetic: "uhb-SKYOOR" },
      american: { ipa: "əbˈskjʊr", phonetic: "uhb-SKYOOR" }
    },
    difficulty: "normal",
    category: "pte-fib-listening",
    source: "pte-fib-listening-with-ipa"
  }
]
```

---

## 🎯 Usage Examples

### **Basic Vocabulary Access**
```javascript
// Initialize vocabulary
await window.pteVocabularyManager.initialize()

// Get current words
const words = window.pteVocabularyManager.getCurrentWords()
console.log(`Loaded ${words.length} words`)

// Get first word
const firstWord = window.pteVocabularyManager.getCurrentWord(0)
console.log('First word:', firstWord.english)
console.log('British IPA:', firstWord.pronunciation.british.ipa)
console.log('American IPA:', firstWord.pronunciation.american.ipa)
```

### **TTS Integration**
```javascript
// Pronounce word
const word = window.pteVocabularyManager.getCurrentWord(0)
await window.ttsEngine.pronounceWord(word, 0)

// Set custom speech rate
window.ttsEngine.setSpeechRate(0.8)
```

### **Configuration Management**
```javascript
// Get current TTS voice
const currentVoice = window.appConfig.get('tts.voices.default')
console.log('Current voice:', currentVoice)

// Change default voice
window.appConfig.set('tts.voices.default', 'Microsoft James (en-AU)')
```

### **Settings Management**
```javascript
// Update setting through SettingsManager
window.settingsManager.updateSetting('category', 'pte-fib-listening')

// Get current settings
const settings = window.settingsManager.getAllSettings()
console.log('Current settings:', settings)

// Get available options for dropdown
const difficultyOptions = window.settingsManager.getAvailableOptions('difficulty')
console.log('Difficulty options:', difficultyOptions)
```

### **Event Handling**
```javascript
// Listen for vocabulary loaded
window.eventBus.on('vocabulary:loaded', (data) => {
  console.log(`Vocabulary loaded: ${data.total} terms in mode: ${data.mode}`)
})

// Listen for word display
window.eventBus.on('word:display', (data) => {
  console.log(`Displaying: ${data.word.english} (${data.index + 1}/${totalWords})`)
})

// Listen for settings changes
window.eventBus.on('settings:changed', (data) => {
  console.log(`Setting changed: ${data.key} = ${data.value}`)
})
```

---

**API Status**: ✅ **COMPLETE & DOCUMENTED**
**PTE Focus**: ✅ **ALL APIS PTE-SPECIFIC**
**Backward Compatibility**: ✅ **LEGACY PATTERNS SUPPORTED**
