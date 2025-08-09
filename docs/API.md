# API Documentation

## Implementation Status
✅ **All APIs implemented and tested** - Classes are globally available as `window.*`

## Core Classes

### CCLPronunciationTrainer

Main application class that orchestrates all functionality.

#### Constructor

```javascript
const app = new CCLPronunciationTrainer();
```

#### Key Properties

```javascript
{
  currentCategory: string,        // Current vocabulary category
  currentDifficulty: string,      // Current difficulty filter ('all', 'easy', 'normal', 'hard')
  currentIndex: number,           // Current term index
  allWords: Array,               // Unfiltered vocabulary terms
  currentWords: Array,           // Filtered vocabulary terms
  isPlaying: boolean,            // Auto-play state
  targetRepeats: number          // Repetitions per term
}
```

#### Methods

##### `filterByDifficulty()`
Filters vocabulary terms based on current difficulty setting.

```javascript
app.currentDifficulty = 'easy';
app.filterByDifficulty();
```

**Returns:** `void`

##### `displayWord(word)`
Updates UI with term information including difficulty badge.

```javascript
const word = { english: "card", chinese: "卡", difficulty: "easy" };
app.displayWord(word);
```

**Parameters:**
- `word` (Object): Vocabulary term with difficulty property

**Returns:** `void`

---

### PronunciationEngine

Text-to-speech engine for pronouncing vocabulary terms.

#### Constructor

```javascript
const engine = new PronunciationEngine();
```

#### Methods

##### `async init()`
Initializes the pronunciation engine and loads available voices.

```javascript
const engine = new PronunciationEngine();
await engine.init();
```

**Returns:** `Promise<void>`

---

##### `async speak(text, lang)`
Pronounces the given text using Web Speech API.

```javascript
const engine = new PronunciationEngine();
await engine.speak('Hello world', 'en-AU');
```

**Parameters:**
- `text` (string): Text to pronounce
- `lang` (string): Language code (default: 'en-AU')

**Returns:** `Promise<void>` - Resolves when speech completes

---

##### `getVoiceForLanguage(lang)`
Gets the preferred voice for a language.

```javascript
const voice = engine.getVoiceForLanguage('en-AU');
```

**Parameters:**
- `lang` (string): Language code

**Returns:** `SpeechSynthesisVoice|null` - Voice object or null

##### `updateSettings(settings)`
Updates speech settings.

```javascript
engine.updateSettings({ rate: 1.5, pitch: 1.2, volume: 0.8 });
```

##### `stop()`, `pause()`, `resume()`
Control speech playback.

---

### VocabularyManager

Manages vocabulary data loading and access.

#### Constructor & Methods

```javascript
const vocab = new VocabularyManager();
```

##### `async loadVocabularyData()`
Loads vocabulary data from global vocabularyData object.

##### `getTermsByCategory(category)`
Gets terms for a specific category.

```javascript
const terms = vocab.getTermsByCategory('medical-healthcare');
```

**Parameters:**
- `category` (string): Category name ('social-welfare', 'education', 'legal-government', etc.)

**Returns:** `Array<Term>` - Filtered vocabulary terms

##### Navigation Methods
- `nextTerm(loop = true)` - Move to next term
- `previousTerm(loop = true)` - Move to previous term  
- `setCurrentIndex(index)` - Set current term index
- `getCurrentTerm()` - Get current term object

##### Data Methods
- `getStats()` - Get vocabulary statistics
- `searchTerms(query)` - Search across all categories
- `getProgress()` - Get current progress information

---

### StorageManager

Handles local storage for progress and settings.

#### Constructor & Methods

```javascript
const storage = new StorageManager();
```

##### Storage Methods
- `saveProgress(progress)` - Save user progress
- `loadProgress()` - Load saved progress  
- `saveSettings(settings)` - Save user settings
- `loadSettings()` - Load saved settings
- `saveSession(session)` - Save study session
- `loadSession()` - Load last session
- `saveStatistics(stats)` - Save study statistics
- `loadStatistics()` - Load statistics

##### Utility Methods  
- `clearAll()` - Clear all stored data
- `getStorageInfo()` - Get storage usage info
- `exportData()` - Export all data for backup
- `importData(data)` - Import data from backup

---

## UI Components

### PlayerComponent

Audio player controls with keyboard shortcuts.

```javascript  
const player = new PlayerComponent(container, {
  autoPlay: false,
  showProgress: true,
  showControls: true  
});
```

##### Methods
- `play()`, `pause()`, `stop()` - Control playback
- `setCallbacks(callbacks)` - Set event callbacks
- `updateProgress(currentTime, duration)` - Update progress display

### ProgressComponent  

Progress tracking with celebration effects.

```javascript
const progress = new ProgressComponent(container, {
  showPercentage: true,
  showStats: true,
  animated: true
});
```

##### Methods
- `updateProgress(current, total, category)` - Update progress
- `startSession()` - Start timing study session
- `updateSessionStats(termsStudied, accuracy)` - Update session stats

### SettingsComponent

Comprehensive settings panel with import/export.

```javascript
const settings = new SettingsComponent(container, {
  collapsible: true,
  saveAutomatically: true
});
```

##### Methods  
- `getSettings()` - Get current settings object
- `setSetting(name, value)` - Update specific setting
- `resetSettings()` - Reset to defaults
- `exportSettings()`, `importSettings(file)` - Backup/restore

---

##### `showTerm(term)`
Displays a vocabulary term.

```javascript
ui.showTerm({
  english: 'Social welfare',
  chinese: '社会福利',
  id: 'sw-1'
});
```

**Parameters:**
- `term` (Term): Term object to display

**Returns:** `void`

---

##### `updateProgress(percent)`
Updates progress indicator.

```javascript
ui.updateProgress(75); // 75% complete
```

**Parameters:**
- `percent` (number): Progress percentage (0-100)

**Returns:** `void`

---

##### `showMessage(message, type)`
Displays user message/notification.

```javascript
ui.showMessage('Term pronounced successfully', 'success');
```

**Parameters:**
- `message` (string): Message text
- `type` (string): Message type ('info', 'success', 'warning', 'error')

**Returns:** `void`

---

## Data Types

### Term
Vocabulary term object structure.

```typescript
interface Term {
  english: string;     // English text
  chinese: string;     // Chinese translation
  difficulty: string;  // Difficulty level ('easy', 'normal', 'hard')
}
```

### Voice
TTS voice object structure.

```typescript
interface Voice {
  name: string;        // Voice name
  lang: string;        // Language code
  default: boolean;    // Is default voice
  localService: boolean; // Is local voice
}
```

### Progress
User progress object structure.

```typescript
interface Progress {
  completed: string[]; // Completed term IDs
  current: string;     // Current term ID
  timestamp: number;   // Last update timestamp
  statistics: {
    totalStudied: number;
    studyTime: number;
    accuracy: number;
  };
}
```

### Settings
Application settings structure.

```typescript
interface Settings {
  autoPlayDelay: number;  // Delay between terms (ms)
  voice: string;          // Selected voice name
  speechRate: number;     // TTS rate (0.1-10)
  speechPitch: number;    // TTS pitch (0-2)
  theme: string;          // UI theme ('light'|'dark')
  repeatCount: number;    // Times to repeat each term
  shuffleMode: boolean;   // Randomize order
}
```

## Events

Custom events dispatched by the application.

### term:pronounced
Fired when a term is pronounced.

```javascript
window.addEventListener('term:pronounced', (e) => {
  console.log('Pronounced:', e.detail.term);
});
```

**Detail:**
- `term` (Term): The pronounced term
- `timestamp` (number): Event timestamp

### progress:updated
Fired when progress is updated.

```javascript
window.addEventListener('progress:updated', (e) => {
  console.log('Progress:', e.detail.percent);
});
```

**Detail:**
- `percent` (number): Progress percentage
- `completed` (number): Completed terms count
- `total` (number): Total terms count

### settings:changed
Fired when settings are modified.

```javascript
window.addEventListener('settings:changed', (e) => {
  console.log('New settings:', e.detail.settings);
});
```

**Detail:**
- `settings` (Settings): Updated settings object
- `changed` (string[]): Changed setting keys

## Error Codes

Standard error codes used throughout the application.

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `E001` | Web Speech API not supported | Show fallback UI |
| `E002` | No voices available | Use default system voice |
| `E003` | Vocabulary data load failed | Retry with cache |
| `E004` | LocalStorage not available | Continue without saving |
| `E005` | Term not found | Skip to next term |
| `E006` | Network error | Use offline mode |
| `E007` | Invalid settings | Reset to defaults |

## Rate Limits

- TTS requests: Max 10 per second
- Storage writes: Max 1 per second
- API calls: Max 100 per minute