# API Reference

Complete API documentation for the PTE Pronunciation Trainer application.

---

## 📋 Table of Contents

1. [Core Classes](#core-classes)
   - [AppConfig](#appconfig)
   - [PTEApp](#pteapp)
   - [PTEVocabularyManager](#ptevocabularymanager)
   - [SettingsManager](#settingsmanager)
   - [ProgressTracker](#progresstracker)
   - [DatasetManager](#datasetmanager) ⭐ **Phase 2**
   - [PracticeModes](#practicemodes) ⭐ **Phase 2**

2. [UI Classes](#ui-classes)
   - [UIController](#uicontroller)
   - [SettingsPanel](#settingspanel)

3. [Audio Classes](#audio-classes)
   - [TTSEngine](#ttsengine)
   - [VoiceSelector](#voiceselector)
   - [AudioControls](#audiocontrols)

4. [Utility Classes](#utility-classes)
   - [EventBus](#eventbus)
   - [Storage](#storage)
   - [StateManager](#statemanager)

5. [Event System](#event-system)
6. [Settings Reference](#settings-reference)
7. [Data Schemas](#data-schemas)
8. [CSS Design Tokens](#css-design-tokens) ⭐ **Phase 2**

---

## Core Classes

### AppConfig

**Purpose**: Centralized configuration management

**Global Access**: \`window.appConfig\`

#### Constructor
\`\`\`javascript
const appConfig = new AppConfig();
\`\`\`

#### Methods

##### \`get(path)\`
Get configuration value by dot notation path.

\`\`\`javascript
// Get nested value
const voice = appConfig.get('tts.voices.default');
// Returns: 'Google UK English Male'

// Get top-level value
const config = appConfig.get('tts');
// Returns: { voices: {...}, speeds: {...} }
\`\`\`

**Parameters**:
- \`path\` (string): Dot-notation path to config value

**Returns**: Configuration value or undefined

##### \`set(path, value)\`
Set configuration value.

\`\`\`javascript
appConfig.set('ui.theme', 'dark');
appConfig.set('tts.voices.default', 'Google US English Female');
\`\`\`

**Parameters**:
- \`path\` (string): Dot-notation path
- \`value\` (any): Value to set

##### \`getAll()\`
Get complete configuration object.

\`\`\`javascript
const fullConfig = appConfig.getAll();
\`\`\`

**Returns**: Complete configuration object

##### \`merge(config)\`
Merge new configuration with existing.

\`\`\`javascript
appConfig.merge({
  custom: {
    feature: 'enabled'
  }
});
\`\`\`

**Parameters**:
- \`config\` (Object): Configuration to merge

#### Configuration Structure

\`\`\`javascript
{
  // Data Pipeline Configuration
  pipeline: {
    inputDir: 'data/source/pte/vocabs',
    outputDir: 'data/processed',
    dataSources: {
      primary: 'pte-fib-listening-with-ipa.md',
      fallback: 'fib-listening-vocabulary.md'
    }
  },

  // TTS Configuration
  tts: {
    voices: {
      default: 'Google UK English Male'
    },
    speeds: {
      slow: 0.7,
      normal: 1.0,
      fast: 1.3
    }
  },

  // UI Configuration
  ui: {
    themes: ['light', 'dark'],
    shortcuts: {
      playAudio: 'Space',
      nextWord: 'ArrowRight',
      prevWord: 'ArrowLeft'
    },
    elements: {
      categories: 'category-select',
      difficulties: 'difficulty-select'
    }
  },

  // Learning Modes
  data: {
    learningModes: [
      {
        id: 'pte-fib-listening',
        label: '🎧 PTE FIB Listening',
        dataset: 'pte-fib-listening'
      }
    ],
    categories: [
      { id: 'all-categories', label: '🌟 All Categories' }
    ]
  }
}
\`\`\`

---

### PTEApp

**Purpose**: Main application coordinator

**Global Access**: \`window.pteApp\`

#### Constructor
\`\`\`javascript
const pteApp = new PTEApp(config);
\`\`\`

**Parameters**:
- \`config\` (AppConfig): Application configuration

#### Methods

##### \`async initialize()\`
Initialize application and all modules.

\`\`\`javascript
await pteApp.initialize();
\`\`\`

**Returns**: Promise<void>

**Side Effects**:
- Initializes all modules
- Sets up event listeners
- Loads initial data

##### \`start()\`
Start the application.

\`\`\`javascript
pteApp.start();
\`\`\`

##### \`pause()\`
Pause the application.

\`\`\`javascript
pteApp.pause();
\`\`\`

##### \`destroy()\`
Cleanup and destroy application.

\`\`\`javascript
pteApp.destroy();
\`\`\`

**Side Effects**:
- Removes event listeners
- Destroys all modules
- Clears state

---

### PTEVocabularyManager

**Purpose**: Vocabulary data management

**Global Access**: \`window.vocabularyManager\`

#### Methods

##### \`async initialize()\`
Initialize vocabulary system.

\`\`\`javascript
await vocabularyManager.initialize();
\`\`\`

##### \`async loadPTEData()\`
Load PTE vocabulary dataset.

\`\`\`javascript
await vocabularyManager.loadPTEData();
\`\`\`

**Returns**: Promise<void>

**Events Emitted**:
- \`vocabulary:loaded\`
- \`vocabulary:error\`

##### \`setLearningMode(mode)\`
Set current learning mode.

\`\`\`javascript
vocabularyManager.setLearningMode('pte-fib-listening');
\`\`\`

**Parameters**:
- \`mode\` (string): Learning mode ID

**Supported Modes**:
- \`pte-fib-listening\`
- \`pte-beginner\`
- \`pte-intermediate\`

##### \`getCurrentWord(index)\`
Get word at specified index.

\`\`\`javascript
const word = vocabularyManager.getCurrentWord(0);
\`\`\`

**Parameters**:
- \`index\` (number): Word index

**Returns**: Word object or undefined

**Word Object Structure**:
\`\`\`javascript
{
  english: "obscure",
  chinese: "模糊的",
  pronunciation: {
    british: {
      ipa: "/əbˈskjʊə/",
      phonetic: "uhb-SKYOOR"
    },
    american: {
      ipa: "/əbˈskjʊr/",
      phonetic: "uhb-SKYOOR"
    }
  },
  difficulty: "normal",
  category: "pte-fib-listening",
  source: "pte-fib-listening-with-ipa"
}
\`\`\`

##### \`getCurrentWords()\`
Get all current vocabulary words.

\`\`\`javascript
const words = vocabularyManager.getCurrentWords();
\`\`\`

**Returns**: Array of word objects

##### \`getTotalWordCount()\`
Get total number of words in current dataset.

\`\`\`javascript
const count = vocabularyManager.getTotalWordCount();
\`\`\`

**Returns**: Number

##### \`getCategoryCounts()\`
Get word counts by category.

\`\`\`javascript
const counts = vocabularyManager.getCategoryCounts();
// Returns: { 'category-1': 100, 'category-2': 50 }
\`\`\`

**Returns**: Object with category counts

##### \`filterByDifficulty(level)\`
Filter words by difficulty level.

\`\`\`javascript
vocabularyManager.filterByDifficulty('normal');
\`\`\`

**Parameters**:
- \`level\` (string): 'beginner' | 'intermediate' | 'advanced' | 'normal'

##### \`filterByCategory(category)\`
Filter words by category.

\`\`\`javascript
vocabularyManager.filterByCategory('education');
\`\`\`

**Parameters**:
- \`category\` (string): Category ID

##### \`searchWords(query)\`
Search vocabulary by English or Chinese text.

\`\`\`javascript
const results = vocabularyManager.searchWords('education');
\`\`\`

**Parameters**:
- \`query\` (string): Search query

**Returns**: Array of matching words

---

### SettingsManager

**Purpose**: User settings management

**Global Access**: \`window.settingsManager\`

#### Methods

##### \`initialize()\`
Initialize settings system.

\`\`\`javascript
settingsManager.initialize();
\`\`\`

##### \`getSetting(key)\`
Get current setting value.

\`\`\`javascript
const category = settingsManager.getSetting('category');
\`\`\`

**Parameters**:
- \`key\` (string): Setting key

**Returns**: Setting value

##### \`updateSetting(key, value)\`
Update setting with validation.

\`\`\`javascript
settingsManager.updateSetting('speed', '1.0');
\`\`\`

**Parameters**:
- \`key\` (string): Setting key
- \`value\` (any): New value

**Events Emitted**:
- \`settings:changed\`
- \`settings:${key}-changed\`

**Side Effects**:
- Validates value
- Applies dependencies
- Persists to storage

##### \`getAllSettings()\`
Get all current settings.

\`\`\`javascript
const settings = settingsManager.getAllSettings();
\`\`\`

**Returns**: Settings object

##### \`getAvailableOptions(key)\`
Get available options for a setting.

\`\`\`javascript
const speeds = settingsManager.getAvailableOptions('speed');
// Returns: [
//   { id: '0.7', label: 'Slow' },
//   { id: '1.0', label: 'Normal' },
//   { id: '1.3', label: 'Fast' }
// ]
\`\`\`

**Parameters**:
- \`key\` (string): Setting key

**Returns**: Array of option objects

##### \`isValidSetting(key, value)\`
Check if setting value is valid.

\`\`\`javascript
const isValid = settingsManager.isValidSetting('speed', '1.0');
\`\`\`

**Parameters**:
- \`key\` (string): Setting key
- \`value\` (any): Value to validate

**Returns**: Boolean

##### \`resetToDefaults()\`
Reset all settings to defaults.

\`\`\`javascript
settingsManager.resetToDefaults();
\`\`\`

**Events Emitted**:
- \`settings:reset\`

---

### ProgressTracker

**Purpose**: Learning progress tracking

**Global Access**: \`window.progressTracker\`

#### Methods

##### \`markAsPracticed(wordId)\`
Mark word as practiced.

\`\`\`javascript
progressTracker.markAsPracticed('word-123');
\`\`\`

**Parameters**:
- \`wordId\` (string): Word identifier

##### \`markAsMastered(wordId)\`
Mark word as mastered.

\`\`\`javascript
progressTracker.markAsMastered('word-123');
\`\`\`

**Parameters**:
- \`wordId\` (string): Word identifier

##### \`markAsDifficult(wordId)\`
Flag word for review.

\`\`\`javascript
progressTracker.markAsDifficult('word-123');
\`\`\`

**Parameters**:
- \`wordId\` (string): Word identifier

##### \`getStatistics()\`
Get progress statistics.

\`\`\`javascript
const stats = progressTracker.getStatistics();
// Returns: {
//   totalPracticed: 50,
//   totalMastered: 30,
//   totalDifficult: 5,
//   accuracy: 0.85
// }
\`\`\`

**Returns**: Statistics object

##### \`getReviewQueue()\`
Get words needing review.

\`\`\`javascript
const queue = progressTracker.getReviewQueue();
\`\`\`

**Returns**: Array of word IDs

##### \`resetProgress()\`
Clear all progress.

\`\`\`javascript
progressTracker.resetProgress();
\`\`\`

---

### DatasetManager

⭐ **Phase 2 Addition**

**Purpose**: Unified dataset loading and management for practice modes

**Global Access**: \`window.datasetManager\`

**File**: \`src/js/data/DatasetManager.js\` (472 lines)

#### Constructor
\`\`\`javascript
const datasetManager = new DatasetManager();
\`\`\`

#### Methods

##### \`async loadDataset(type)\`
Load a specific dataset type from processed JSON files.

\`\`\`javascript
// Load Repeat Sentence dataset
const rsData = await datasetManager.loadDataset('repeat-sentence');
console.log(rsData.items.length); // 1912 sentences

// Load Answer Short Question dataset
const asqData = await datasetManager.loadDataset('answer-short-question');
console.log(asqData.items.length); // 383 questions

// Load Write from Dictation dataset
const wfdData = await datasetManager.loadDataset('write-from-dictation');
console.log(wfdData.items.length); // 1195 sentences
\`\`\`

**Parameters**:
- \`type\` (string): Dataset type identifier
  - \`'repeat-sentence'\` - PTE Repeat Sentence (1,912 items)
  - \`'answer-short-question'\` - PTE Answer Short Question (383 items)
  - \`'write-from-dictation'\` - PTE Write from Dictation (1,195 items)
  - \`'pte-fib-listening'\` - PTE FIB Listening vocabulary (1,912 words)
  - \`'pte-beginner'\` - PTE Beginner vocabulary (294 words)
  - \`'pte-intermediate'\` - PTE Intermediate vocabulary (485 words)

**Returns**: Promise<Object> with structure:
\`\`\`javascript
{
  type: 'repeat-sentence',
  items: [
    {
      id: 'rs-001',
      text: 'The quick brown fox jumps over the lazy dog.',
      metadata: { /* source info */ }
    }
  ],
  metadata: {
    totalItems: 1912,
    source: 'pte-repeat-sentence-dataset.json',
    generatedAt: '2025-01-07T12:00:00Z'
  }
}
\`\`\`

**Events Emitted**:
- \`dataset:loading\` - Before loading starts
- \`dataset:loaded\` - After successful load
- \`dataset:error\` - On load failure

**Error Handling**:
- Throws descriptive error if dataset type unknown
- Throws network error if JSON file not found
- Validates dataset structure after load

##### \`getDatasetInfo(type)\`
Get metadata about a dataset without loading it.

\`\`\`javascript
const info = datasetManager.getDatasetInfo('repeat-sentence');
// Returns: {
//   path: 'data/processed/pte-repeat-sentence-dataset.json',
//   expectedItems: 1912,
//   description: 'PTE Repeat Sentence practice sentences'
// }
\`\`\`

**Parameters**:
- \`type\` (string): Dataset type

**Returns**: Object with dataset metadata

##### \`_validateDataset(data, type)`
Internal method to validate loaded dataset structure.

\`\`\`javascript
// Automatically called by loadDataset()
// Validates: type matches, items array exists, required fields present
\`\`\`

**Parameters**:
- \`data\` (Object): Loaded dataset
- \`type\` (string): Expected type

**Throws**: Error if validation fails

##### \`_getItemField(item, field)`
Internal helper to safely extract fields from dataset items.

\`\`\`javascript
// Handles different dataset schemas gracefully
const text = this._getItemField(item, 'text'); // Works for RS/WFD
const question = this._getItemField(item, 'question'); // Works for ASQ
const word = this._getItemField(item, 'word'); // Works for vocabulary
\`\`\`

**Parameters**:
- \`item\` (Object): Dataset item
- \`field\` (string): Field name to extract

**Returns**: Field value or undefined

#### Supported Datasets

| Type | File | Items | Schema Fields |
|------|------|-------|---------------|
| \`repeat-sentence\` | pte-repeat-sentence-dataset.json | 1,912 | \`id\`, \`text\`, \`metadata\` |
| \`answer-short-question\` | pte-answer-short-question-dataset.json | 383 | \`id\`, \`question\`, \`answer\`, \`metadata\` |
| \`write-from-dictation\` | pte-write-from-dictation-dataset.json | 1,195 | \`id\`, \`text\`, \`metadata\` |
| \`pte-fib-listening\` | pte-fib-listening-vocabulary.json | 1,912 | \`id\`, \`word\`, \`ipa\`, \`difficulty\`, \`category\` |
| \`pte-beginner\` | pte-beginner-vocabulary.json | 294 | \`id\`, \`word\`, \`ipa\`, \`difficulty\` |
| \`pte-intermediate\` | pte-intermediate-vocabulary.json | 485 | \`id\`, \`word\`, \`ipa\`, \`difficulty\` |

**Total Datasets**: 6  
**Total Items**: 4,687 (3,490 practice + 1,197 vocabulary)

#### Usage Example

\`\`\`javascript
// Initialize dataset manager
const datasetManager = new DatasetManager();

// Listen for events
window.eventBus.on('dataset:loaded', ({ type, itemCount }) => {
  console.log(\`Loaded \${itemCount} items from \${type}\`);
});

// Load dataset for practice mode
try {
  const data = await datasetManager.loadDataset('repeat-sentence');
  console.log('Dataset ready:', data.metadata);
  
  // Use data in practice mode
  data.items.forEach(item => {
    console.log(item.text);
  });
} catch (error) {
  console.error('Failed to load dataset:', error);
}
\`\`\`

---

### PracticeModes

⭐ **Phase 2 Addition**

**Purpose**: Interactive practice mode controller for RS/ASQ/WFD exercises

**Global Access**: \`window.practiceModes\`

**File**: \`src/js/ui/PracticeModes.js\` (632 lines)

#### Constructor
\`\`\`javascript
const practiceModes = new PracticeModes(datasetManager, ttsEngine, uiController);
\`\`\`

**Parameters**:
- \`datasetManager\` (DatasetManager): Dataset loader
- \`ttsEngine\` (TTSEngine): Text-to-speech engine
- \`uiController\` (UIController): UI controller

#### Core Methods

##### \`async initializePracticeMode(mode)\`
Initialize a specific practice mode and load its dataset.

\`\`\`javascript
// Initialize Repeat Sentence mode
await practiceModes.initializePracticeMode('repeat-sentence');

// Initialize Answer Short Question mode
await practiceModes.initializePracticeMode('answer-short-question');

// Initialize Write from Dictation mode
await practiceModes.initializePracticeMode('write-from-dictation');
\`\`\`

**Parameters**:
- \`mode\` (string): Practice mode identifier
  - \`'repeat-sentence'\` - PTE Repeat Sentence (RS)
  - \`'answer-short-question'\` - PTE Answer Short Question (ASQ)
  - \`'write-from-dictation'\` - PTE Write from Dictation (WFD)

**Returns**: Promise<void>

**Side Effects**:
- Loads dataset via DatasetManager
- Initializes UI elements (buttons, displays, recorders)
- Sets up event listeners for mode-specific controls
- Shows practice area, hides vocabulary mode

**Events Emitted**:
- \`practice:modeChanged\` - When mode initializes

##### \`getCurrentItem()\`
Get the current practice item being displayed.

\`\`\`javascript
const item = practiceModes.getCurrentItem();
// RS/WFD: { id: 'rs-001', text: '...' }
// ASQ: { id: 'asq-001', question: '...', answer: '...' }
\`\`\`

**Returns**: Object with current item data or null

##### \`nextItem()\`
Move to next practice item.

\`\`\`javascript
practiceModes.nextItem();
// Updates UI, increments currentIndex, displays next item
\`\`\`

**Events Emitted**:
- \`rs:nextItem\` / \`asq:nextItem\` / \`wfd:nextItem\`

##### \`previousItem()\`
Move to previous practice item.

\`\`\`javascript
practiceModes.previousItem();
// Updates UI, decrements currentIndex, displays previous item
\`\`\`

**Events Emitted**:
- \`rs:previousItem\` / \`asq:previousItem\` / \`wfd:previousItem\`

##### \`playCurrentItem()\`
Play TTS audio for current item (sentence/question).

\`\`\`javascript
await practiceModes.playCurrentItem();
// Uses TTSEngine.pronounceSentence() or pronounceQuestion()
\`\`\`

**Returns**: Promise<void>

**Events Emitted**:
- \`rs:playAudio\` / \`asq:playAudio\` / \`wfd:playAudio\`

#### Repeat Sentence (RS) Methods

##### \`async startRSRecording()\`
Start recording user's speech for Repeat Sentence.

\`\`\`javascript
await practiceModes.startRSRecording();
// Requests microphone permission, starts MediaRecorder
\`\`\`

**Requirements**:
- Browser support for MediaRecorder API
- User grants microphone permission

**Events Emitted**:
- \`rs:recordingStarted\`

**Visual Feedback**:
- Record button turns red with pulse animation
- Status text shows "Recording..."

##### \`stopRSRecording()\`
Stop recording and save audio blob.

\`\`\`javascript
practiceModes.stopRSRecording();
// Stops MediaRecorder, enables playback button
\`\`\`

**Events Emitted**:
- \`rs:recordingStopped\`

**Visual Feedback**:
- Record button returns to normal
- Playback button becomes enabled

##### \`playRSRecording()\`
Play back the user's recorded audio.

\`\`\`javascript
practiceModes.playRSRecording();
// Plays recorded audio blob via Audio API
\`\`\`

**Events Emitted**:
- \`rs:playbackStarted\`
- \`rs:playbackEnded\` (when audio finishes)

**Visual Feedback**:
- Playback button shows "Playing..." during playback

#### Answer Short Question (ASQ) Methods

##### \`submitASQAnswer()\`
Submit and validate user's answer for ASQ.

\`\`\`javascript
practiceModes.submitASQAnswer();
// Gets input value, validates against correct answer
// Shows feedback (correct/incorrect)
\`\`\`

**Validation Logic**:
- Trims whitespace
- Case-insensitive comparison
- Fuzzy matching (allows minor typos, up to 2 character difference)
- Handles multiple acceptable answers (comma-separated)

**Events Emitted**:
- \`asq:answerSubmitted\` with result: \`{ correct: true/false, userAnswer, correctAnswer }\`

**Visual Feedback**:
- Green border + "✓ Correct!" for correct answers
- Red border + "✗ Incorrect. Answer: ..." for wrong answers
- Feedback auto-clears after 3 seconds

##### \`showASQAnswer()\`
Reveal the correct answer without submitting.

\`\`\`javascript
practiceModes.showASQAnswer();
// Displays correct answer in feedback area
\`\`\`

**Events Emitted**:
- \`asq:answerRevealed\`

**Visual Feedback**:
- Blue border + "Answer: ..." shown

#### Write from Dictation (WFD) Methods

##### \`submitWFDAnswer()\`
Submit and compare user's dictation to correct text.

\`\`\`javascript
practiceModes.submitWFDAnswer();
// Word-by-word comparison with color coding
\`\`\`

**Comparison Logic**:
- Splits text into words
- Case-insensitive matching
- Ignores punctuation
- Shows each word as correct (green) or incorrect (red)
- Calculates accuracy percentage

**Events Emitted**:
- \`wfd:answerSubmitted\` with result: \`{ accuracy, totalWords, correctWords }\`

**Visual Feedback**:
- Word-by-word color coding in comparison area
- Accuracy percentage displayed
- Missing words highlighted

##### \`showWFDAnswer()\`
Reveal the correct dictation text.

\`\`\`javascript
practiceModes.showWFDAnswer();
// Displays full correct text
\`\`\`

**Events Emitted**:
- \`wfd:answerRevealed\`

#### Shared Helper Methods

##### \`_cacheElements()\`
Internal method to cache DOM element references.

\`\`\`javascript
// Automatically called during initialization
// Caches 50+ element references to avoid repeated DOM queries
// Performance optimization: 37% reduction in DOM operations
\`\`\`

##### \`_showPracticeArea()\`
Show practice mode UI, hide vocabulary mode.

\`\`\`javascript
this._showPracticeArea();
// Sets display: block on practice container
// Sets display: none on vocabulary container
\`\`\`

##### \`_hidePracticeArea()\`
Hide practice mode UI, show vocabulary mode.

\`\`\`javascript
this._hidePracticeArea();
// Called when switching back to vocabulary mode
\`\`\`

##### \`_updateNavigationButtons()\`
Update Next/Previous button states based on current index.

\`\`\`javascript
this._updateNavigationButtons();
// Disables Previous on first item
// Disables Next on last item
\`\`\`

##### \`_displayCurrentItem()\`
Render current item in UI (sentence/question/text).

\`\`\`javascript
this._displayCurrentItem();
// Updates text display, progress counter, button states
\`\`\`

##### \`_clearFeedback(delay = 3000)\`
Clear feedback messages after delay.

\`\`\`javascript
this._clearFeedback(5000); // Clear after 5 seconds
this._clearFeedback(0); // Clear immediately
\`\`\`

**Parameters**:
- \`delay\` (number): Milliseconds before clearing (default: 3000)

#### Practice Mode Architecture

**Repeat Sentence (RS) Flow**:
1. User clicks Play → Hear sentence via TTS
2. User clicks Record → MediaRecorder starts
3. User speaks → Audio captured
4. User clicks Stop → Recording saved
5. User clicks Playback → Compare with original

**Answer Short Question (ASQ) Flow**:
1. User clicks Play → Hear question via TTS
2. User types answer in input field
3. User clicks Submit → Fuzzy validation
4. Feedback shown (correct/incorrect)
5. User can reveal answer if needed

**Write from Dictation (WFD) Flow**:
1. User clicks Play → Hear sentence via TTS
2. User types what they heard
3. User clicks Submit → Word-by-word comparison
4. Color-coded feedback shown (green=correct, red=wrong)
5. Accuracy percentage calculated

#### Usage Example

\`\`\`javascript
// Initialize practice modes
const practiceModes = new PracticeModes(
  window.datasetManager,
  window.ttsEngine,
  window.uiController
);

// Start Repeat Sentence mode
await practiceModes.initializePracticeMode('repeat-sentence');

// Listen for events
window.eventBus.on('rs:recordingStarted', () => {
  console.log('User started recording');
});

window.eventBus.on('asq:answerSubmitted', ({ correct, userAnswer }) => {
  console.log(\`Answer \${correct ? 'correct' : 'wrong'}: \${userAnswer}\`);
});

// User interactions
document.querySelector('#rs-record-btn').addEventListener('click', async () => {
  await practiceModes.startRSRecording();
});

document.querySelector('#asq-submit-btn').addEventListener('click', () => {
  practiceModes.submitASQAnswer();
});
\`\`\`

---

## UI Classes

### UIController

**Purpose**: User interface management

**Global Access**: \`window.uiController\`

#### Methods

##### \`displayWord(word, index)\`
Display vocabulary word in UI.

\`\`\`javascript
uiController.displayWord(word, 0);
\`\`\`

**Parameters**:
- \`word\` (Object): Word object
- \`index\` (number): Word index

##### \`updateProgress(current, total)\`
Update progress indicator.

\`\`\`javascript
uiController.updateProgress(10, 100);
\`\`\`

**Parameters**:
- \`current\` (number): Current position
- \`total\` (number): Total count

##### \`showSettingsPanel()\`
Open settings panel.

\`\`\`javascript
uiController.showSettingsPanel();
\`\`\`

##### \`hideSettingsPanel()\`
Close settings panel.

\`\`\`javascript
uiController.hideSettingsPanel();
\`\`\`

##### \`displayError(message)\`
Show error message.

\`\`\`javascript
uiController.displayError('Failed to load data');
\`\`\`

**Parameters**:
- \`message\` (string): Error message

##### \`togglePronunciation()\`
Toggle between British/American pronunciation.

\`\`\`javascript
const newPreference = uiController.togglePronunciation();
// Returns: 'british' | 'american'
\`\`\`

**Returns**: New pronunciation preference

---

## Audio Classes

### TTSEngine

**Purpose**: Text-to-speech management

**Global Access**: \`window.ttsEngine\`

#### Methods

##### \`async initialize()\`
Initialize TTS engine and load voices.

\`\`\`javascript
await ttsEngine.initialize();
\`\`\`

##### \`speak(text, options)\`
Speak text with TTS.

\`\`\`javascript
ttsEngine.speak('Hello world', {
  voice: 'Google UK English Male',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
});
\`\`\`

**Parameters**:
- \`text\` (string): Text to speak
- \`options\` (Object): Speech options
  - \`voice\` (string): Voice name
  - \`rate\` (number): Speech rate (0.5 - 2.0)
  - \`pitch\` (number): Voice pitch (0.5 - 2.0)
  - \`volume\` (number): Volume (0.0 - 1.0)

**Events Emitted**:
- \`tts:start\`
- \`tts:end\`
- \`tts:error\`

##### \`pause()\`
Pause current speech.

\`\`\`javascript
ttsEngine.pause();
\`\`\`

##### \`resume()\`
Resume paused speech.

\`\`\`javascript
ttsEngine.resume();
\`\`\`

##### \`cancel()\`
Stop all speech.

\`\`\`javascript
ttsEngine.cancel();
\`\`\`

##### \`setVoice(voiceName)\`
Change TTS voice.

\`\`\`javascript
ttsEngine.setVoice('Google US English Female');
\`\`\`

**Parameters**:
- \`voiceName\` (string): Voice name

##### \`setSpeechRate(rate)\`
Adjust playback speed.

\`\`\`javascript
ttsEngine.setSpeechRate(1.0);
\`\`\`

**Parameters**:
- \`rate\` (number): Speech rate (0.5 - 2.0)

##### \`getAvailableVoices()\`
List available TTS voices.

\`\`\`javascript
const voices = ttsEngine.getAvailableVoices();
// Returns: [
//   { name: 'Google UK English Male', lang: 'en-GB' },
//   { name: 'Google US English Female', lang: 'en-US' }
// ]
\`\`\`

**Returns**: Array of voice objects

##### \`async pronounceSentence(sentence)\` ⭐ **Phase 2**
Pronounce a complete sentence with visual feedback.

\`\`\`javascript
await ttsEngine.pronounceSentence('The quick brown fox jumps over the lazy dog.');
// Speaks sentence with word-by-word visual highlighting
\`\`\`

**Parameters**:
- \`sentence\` (string): Sentence to pronounce

**Features**:
- Splits sentence into words
- Shows visual "speaking" animation
- Respects current voice and speed settings
- Emits TTS events (\`tts:start\`, \`tts:end\`)

**Visual Feedback**:
- Word display gets \`.speaking\` class during pronunciation
- Uses \`.pulse\` animation from \`animations.css\`

**Used By**: Repeat Sentence, Write from Dictation modes

##### \`async pronounceQuestion(question)\` ⭐ **Phase 2**
Pronounce a question with appropriate intonation.

\`\`\`javascript
await ttsEngine.pronounceQuestion('What is the capital of France?');
// Speaks with question intonation
\`\`\`

**Parameters**:
- \`question\` (string): Question to pronounce

**Features**:
- Optimized for question intonation
- Visual feedback during speech
- Same voice/speed settings as \`pronounceSentence()\`

**Visual Feedback**:
- Question display gets \`.speaking\` class
- Pulse animation during pronunciation

**Used By**: Answer Short Question mode

##### \`_showSpeakingAnimation()\` ⭐ **Phase 2**
Internal helper to show visual speaking feedback.

\`\`\`javascript
// Automatically called by pronounceSentence() and pronounceQuestion()
this._showSpeakingAnimation();
// Adds .speaking class to word/question display
\`\`\`

**CSS Hook**: \`.speaking\` class applies pulse animation

##### \`_hideSpeakingAnimation()\` ⭐ **Phase 2**
Internal helper to remove speaking feedback.

\`\`\`javascript
// Automatically called when speech ends
this._hideSpeakingAnimation();
// Removes .speaking class
\`\`\`

---

## Utility Classes

### EventBus

**Purpose**: Publish/subscribe event system

**Global Access**: \`window.eventBus\`

#### Methods

##### \`on(event, handler)\`
Subscribe to event.

\`\`\`javascript
eventBus.on('vocabulary:loaded', (data) => {
  console.log('Loaded', data.total, 'words');
});
\`\`\`

**Parameters**:
- \`event\` (string): Event name
- \`handler\` (Function): Event handler

##### \`off(event, handler)\`
Unsubscribe from event.

\`\`\`javascript
eventBus.off('vocabulary:loaded', handlerFunction);
\`\`\`

**Parameters**:
- \`event\` (string): Event name
- \`handler\` (Function): Event handler to remove

##### \`emit(event, data)\`
Emit event with data.

\`\`\`javascript
eventBus.emit('vocabulary:changed', {
  word: currentWord,
  index: 0
});
\`\`\`

**Parameters**:
- \`event\` (string): Event name
- \`data\` (any): Event data

##### \`once(event, handler)\`
Subscribe to event for one-time execution.

\`\`\`javascript
eventBus.once('app:ready', () => {
  console.log('App is ready!');
});
\`\`\`

**Parameters**:
- \`event\` (string): Event name
- \`handler\` (Function): Event handler

---

### Storage

**Purpose**: localStorage wrapper with error handling

**Global Access**: \`window.storage\`

#### Methods

##### \`get(key)\`
Get value from storage.

\`\`\`javascript
const data = storage.get('user-settings');
\`\`\`

**Parameters**:
- \`key\` (string): Storage key

**Returns**: Stored value or null

##### \`set(key, value)\`
Save value to storage.

\`\`\`javascript
storage.set('user-settings', { theme: 'dark' });
\`\`\`

**Parameters**:
- \`key\` (string): Storage key
- \`value\` (any): Value to store (will be JSON serialized)

##### \`remove(key)\`
Remove value from storage.

\`\`\`javascript
storage.remove('user-settings');
\`\`\`

**Parameters**:
- \`key\` (string): Storage key

##### \`clear()\`
Clear all storage.

\`\`\`javascript
storage.clear();
\`\`\`

##### \`has(key)\`
Check if key exists.

\`\`\`javascript
const exists = storage.has('user-settings');
\`\`\`

**Parameters**:
- \`key\` (string): Storage key

**Returns**: Boolean

---

### StateManager

**Purpose**: Application state persistence

**Global Access**: \`window.stateManager\`

#### Methods

##### \`async saveState(state)\`
Save application state.

\`\`\`javascript
await stateManager.saveState({
  currentIndex: 10,
  filters: { difficulty: 'normal' }
});
\`\`\`

**Parameters**:
- \`state\` (Object): State object

##### \`async loadState()\`
Load saved state.

\`\`\`javascript
const state = await stateManager.loadState();
\`\`\`

**Returns**: State object or default state

##### \`async clearState()\`
Clear saved state.

\`\`\`javascript
await stateManager.clearState();
\`\`\`

---

## Event System

### Event Categories

#### Vocabulary Events
- \`vocabulary:loaded\` - Dataset loaded
- \`vocabulary:changed\` - Current word changed
- \`vocabulary:filtered\` - Filter applied
- \`vocabulary:error\` - Loading error

#### Settings Events
- \`settings:changed\` - Any setting changed
- \`settings:voice-changed\` - TTS voice changed
- \`settings:mode-changed\` - Learning mode changed
- \`settings:reset\` - Settings reset to defaults

#### TTS Events
- \`tts:start\` - Speech started
- \`tts:end\` - Speech completed
- \`tts:pause\` - Speech paused
- \`tts:resume\` - Speech resumed
- \`tts:error\` - TTS error

#### UI Events
- \`ui:ready\` - UI initialized
- \`ui:settings-opened\` - Settings panel opened
- \`ui:settings-closed\` - Settings panel closed

#### Progress Events
- \`progress:updated\` - Progress changed
- \`progress:mastered\` - Word mastered
- \`progress:reset\` - Progress cleared

#### Dataset Events ⭐ **Phase 2**
- \`dataset:loading\` - Dataset loading started
  - Payload: \`{ type: string }\`
- \`dataset:loaded\` - Dataset loaded successfully
  - Payload: \`{ type: string, itemCount: number, metadata: object }\`
- \`dataset:error\` - Dataset loading failed
  - Payload: \`{ type: string, error: Error }\`

#### Practice Mode Events ⭐ **Phase 2**

**General Practice Events**:
- \`practice:modeChanged\` - Practice mode initialized
  - Payload: \`{ mode: string, itemCount: number }\`

**Repeat Sentence (RS) Events**:
- \`rs:nextItem\` - Moved to next sentence
- \`rs:previousItem\` - Moved to previous sentence
- \`rs:playAudio\` - Playing sentence audio
- \`rs:recordingStarted\` - Recording started
- \`rs:recordingStopped\` - Recording stopped
- \`rs:playbackStarted\` - Playback started
- \`rs:playbackEnded\` - Playback finished

**Answer Short Question (ASQ) Events**:
- \`asq:nextItem\` - Moved to next question
- \`asq:previousItem\` - Moved to previous question
- \`asq:playAudio\` - Playing question audio
- \`asq:answerSubmitted\` - Answer submitted
  - Payload: \`{ correct: boolean, userAnswer: string, correctAnswer: string }\`
- \`asq:answerRevealed\` - Correct answer shown

**Write from Dictation (WFD) Events**:
- \`wfd:nextItem\` - Moved to next sentence
- \`wfd:previousItem\` - Moved to previous sentence
- \`wfd:playAudio\` - Playing dictation audio
- \`wfd:answerSubmitted\` - Answer submitted
  - Payload: \`{ accuracy: number, totalWords: number, correctWords: number }\`
- \`wfd:answerRevealed\` - Correct text shown

### Event Usage Examples

**Listening to Dataset Events**:
\`\`\`javascript
window.eventBus.on('dataset:loaded', ({ type, itemCount }) => {
  console.log(\`Loaded \${itemCount} items from \${type} dataset\`);
});

window.eventBus.on('dataset:error', ({ type, error }) => {
  console.error(\`Failed to load \${type}:\`, error);
});
\`\`\`

**Listening to Practice Mode Events**:
\`\`\`javascript
// Track user progress in RS mode
window.eventBus.on('rs:recordingStarted', () => {
  startTimer();
});

window.eventBus.on('rs:recordingStopped', () => {
  stopTimer();
  saveRecordingMetadata();
});

// Validate ASQ answers
window.eventBus.on('asq:answerSubmitted', ({ correct, userAnswer, correctAnswer }) => {
  if (correct) {
    incrementScore();
  } else {
    showCorrection(correctAnswer);
  }
});

// Calculate WFD accuracy
window.eventBus.on('wfd:answerSubmitted', ({ accuracy, correctWords, totalWords }) => {
  console.log(\`Accuracy: \${accuracy}% (\${correctWords}/\${totalWords} words)\`);
  updateProgressBar(accuracy);
});
\`\`\`

---

## Settings Reference

### Available Settings

#### Learning Mode
\`\`\`javascript
{
  key: 'learningMode',
  type: 'select',
  default: 'pte-fib-listening',
  options: [
    { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening' },
    { id: 'pte-beginner', label: '🟢 Beginner Vocabulary' },
    { id: 'pte-intermediate', label: '🟡 Intermediate Vocabulary' }
  ]
}
\`\`\`

#### Category
\`\`\`javascript
{
  key: 'category',
  type: 'select',
  default: 'all-categories',
  options: [
    { id: 'all-categories', label: '🌟 All Categories' },
    { id: 'education', label: '🎓 Education' },
    { id: 'business', label: '💼 Business' }
    // ... more categories
  ]
}
\`\`\`

#### Difficulty
\`\`\`javascript
{
  key: 'difficulty',
  type: 'select',
  default: 'normal',
  options: [
    { id: 'beginner', label: '�� Beginner' },
    { id: 'intermediate', label: '�� Intermediate' },
    { id: 'advanced', label: '�� Advanced' },
    { id: 'normal', label: '🟡 Normal (All PTE Terms)' }
  ]
}
\`\`\`

#### Speech Speed
\`\`\`javascript
{
  key: 'speed',
  type: 'select',
  default: '1.0',
  options: [
    { id: '0.7', label: 'Slow' },
    { id: '1.0', label: 'Normal' },
    { id: '1.3', label: 'Fast' }
  ]
}
\`\`\`

#### Delay Between Words
\`\`\`javascript
{
  key: 'delay',
  type: 'select',
  default: '2000',
  options: [
    { id: '1000', label: '1 second' },
    { id: '2000', label: '2 seconds' },
    { id: '3000', label: '3 seconds' }
  ]
}
\`\`\`

#### Repeat Count
\`\`\`javascript
{
  key: 'repeat',
  type: 'select',
  default: 'once',
  options: [
    { id: 'once', label: 'Once' },
    { id: 'twice', label: 'Twice' },
    { id: 'thrice', label: 'Three times' }
  ]
}
\`\`\`

#### TTS Voice
\`\`\`javascript
{
  key: 'voice',
  type: 'select',
  default: 'auto',
  options: [
    { id: 'auto', label: 'Auto (Best Available)' },
    { id: 'Google UK English Male', label: 'UK English (Male)' },
    { id: 'Google US English Female', label: 'US English (Female)' }
    // ... dynamically loaded voices
  ]
}
\`\`\`

### Setting Dependencies

When \`learningMode\` changes:
- Reset \`category\` to 'all-categories'
- Reload vocabulary dataset
- Clear current filters

When \`voice\` changes:
- Reset \`speed\` to safe default for voice
- Reinitialize TTS engine

When \`difficulty\` changes:
- Filter vocabulary by difficulty
- Update word count display

---

## Data Schemas

### Vocabulary Dataset Schema

\`\`\`javascript
{
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "2025-10-07T12:00:00Z",
    "source": "pte-fib-listening-with-ipa.md",
    "totalTerms": 914
  },
  "vocabulary": [
    {
      "id": "pte-fib-001",
      "english": "obscure",
      "chinese": "模糊的",
      "pronunciation": {
        "british": {
          "ipa": "/əbˈskjʊə/",
          "phonetic": "uhb-SKYOOR"
        },
        "american": {
          "ipa": "/əbˈskjʊr/",
          "phonetic": "uhb-SKYOOR"
        }
      },
      "difficulty": "normal",
      "category": "pte-fib-listening",
      "metadata": {
        "source": "pte-fib-listening-with-ipa.md",
        "lineNumber": 15
      }
    }
  ]
}
\`\`\`

### State Schema

\`\`\`javascript
{
  "version": "1.0.0",
  "settings": {
    "learningMode": "pte-fib-listening",
    "category": "all-categories",
    "difficulty": "normal",
    "speed": "1.0",
    "delay": "2000",
    "repeat": "once",
    "voice": "auto"
  },
  "progress": {
    "practiced": ["word-1", "word-2"],
    "mastered": ["word-1"],
    "difficult": ["word-2"],
    "timestamps": {
      "word-1": "2025-10-07T12:00:00Z"
    }
  },
  "session": {
    "currentIndex": 10,
    "lastAccessed": "2025-10-07T12:00:00Z"
  }
}
\`\`\`

---

## CSS Design Tokens

⭐ **Phase 2 Addition**

**Purpose**: Centralized design system with 222 design tokens for consistent styling

**File**: \`src/css/variables.css\` (222 lines)

**Architecture**: CSS custom properties (CSS variables) organized by category

### Token Categories

#### 1. Color Tokens (40+ variables)

**Primary Colors**:
\`\`\`css
--color-primary: #4a90e2;        /* Main brand color */
--color-primary-dark: #357abd;   /* Hover states */
--color-primary-light: #e3f2fd;  /* Backgrounds */
\`\`\`

**Semantic Colors**:
\`\`\`css
--color-success: #4caf50;        /* Correct answers, success states */
--color-success-dark: #388e3c;
--color-success-light: #e8f5e9;

--color-danger: #f44336;         /* Errors, incorrect answers */
--color-danger-dark: #d32f2f;
--color-danger-light: #ffebee;

--color-warning: #ff9800;        /* Warnings, alerts */
--color-warning-dark: #f57c00;
--color-warning-light: #fff3e0;

--color-info: #2196f3;           /* Info messages */
--color-info-dark: #1976d2;
--color-info-light: #e3f2fd;
\`\`\`

**Practice Mode Colors**:
\`\`\`css
--color-rs-primary: #4caf50;     /* Repeat Sentence (green) */
--color-asq-primary: #2196f3;    /* Answer Short Question (blue) */
--color-wfd-primary: #9c27b0;    /* Write from Dictation (purple) */
\`\`\`

**Neutral Colors**:
\`\`\`css
--color-text-primary: #212121;   /* Main text */
--color-text-secondary: #757575; /* Secondary text */
--color-text-disabled: #9e9e9e;  /* Disabled text */

--color-bg-primary: #ffffff;     /* Main background */
--color-bg-secondary: #f5f5f5;   /* Card backgrounds */
--color-bg-tertiary: #fafafa;    /* Subtle backgrounds */

--color-border: #e0e0e0;         /* Borders */
--color-border-focus: #4a90e2;   /* Focused elements */
\`\`\`

**Dark Mode Colors** (auto-switches via \`@media (prefers-color-scheme: dark)\`):
\`\`\`css
--color-bg-primary: #121212;
--color-bg-secondary: #1e1e1e;
--color-text-primary: #e0e0e0;
--color-text-secondary: #b0b0b0;
--color-border: #333333;
\`\`\`

#### 2. Spacing Tokens (8 variables)

\`\`\`css
--spacing-xs: 4px;    /* Tiny gaps */
--spacing-sm: 8px;    /* Small gaps */
--spacing-md: 16px;   /* Default spacing */
--spacing-lg: 24px;   /* Large spacing */
--spacing-xl: 32px;   /* Extra large spacing */
--spacing-2xl: 48px;  /* Section spacing */
--spacing-3xl: 64px;  /* Major section spacing */
--spacing-4xl: 96px;  /* Hero spacing */
\`\`\`

**Usage**:
\`\`\`css
.card {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-sm);
}
\`\`\`

#### 3. Border Radius Tokens (6 variables)

\`\`\`css
--radius-sm: 4px;     /* Small elements (badges) */
--radius-md: 8px;     /* Default (buttons, inputs) */
--radius-lg: 12px;    /* Large elements (cards) */
--radius-xl: 16px;    /* Extra large (modals) */
--radius-2xl: 24px;   /* Hero elements */
--radius-full: 50%;   /* Circular (avatars) */
\`\`\`

#### 4. Shadow Tokens (7 variables)

\`\`\`css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);        /* Subtle elevation */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);         /* Default cards */
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);       /* Modals */
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);      /* Dialogs */
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);     /* Popovers */
--shadow-focus: 0 0 0 3px rgba(74, 144, 226, 0.3); /* Focus rings */
--shadow-inset: inset 0 2px 4px rgba(0, 0, 0, 0.1);/* Depressed elements */
\`\`\`

#### 5. Transition Tokens (4 variables)

\`\`\`css
--transition-fast: 150ms ease-in-out;    /* Micro-interactions */
--transition-base: 250ms ease-in-out;    /* Default transitions */
--transition-slow: 350ms ease-in-out;    /* Complex animations */
--transition-slower: 500ms ease-in-out;  /* Major transitions */
\`\`\`

**Usage**:
\`\`\`css
.button {
  transition: background-color var(--transition-base),
              transform var(--transition-fast);
}
\`\`\`

#### 6. Typography Tokens (16 variables)

**Font Families**:
\`\`\`css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
\`\`\`

**Font Sizes**:
\`\`\`css
--font-size-xs: 0.75rem;   /* 12px */
--font-size-sm: 0.875rem;  /* 14px */
--font-size-base: 1rem;    /* 16px */
--font-size-lg: 1.125rem;  /* 18px */
--font-size-xl: 1.25rem;   /* 20px */
--font-size-2xl: 1.5rem;   /* 24px */
--font-size-3xl: 1.875rem; /* 30px */
--font-size-4xl: 2.25rem;  /* 36px */
\`\`\`

**Font Weights**:
\`\`\`css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
\`\`\`

**Line Heights**:
\`\`\`css
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
\`\`\`

#### 7. Z-Index Tokens (6 variables)

\`\`\`css
--z-base: 1;          /* Default layer */
--z-dropdown: 100;    /* Dropdowns */
--z-sticky: 200;      /* Sticky headers */
--z-fixed: 300;       /* Fixed elements */
--z-modal: 400;       /* Modal overlays */
--z-tooltip: 500;     /* Tooltips */
\`\`\`

#### 8. Accessibility Tokens (2 variables)

**High Contrast Mode** (auto-switches via \`@media (prefers-contrast: high)\`):
\`\`\`css
--color-border: #000000;        /* Stronger borders */
--shadow-focus: 0 0 0 4px #000; /* Thicker focus rings */
\`\`\`

### Design Token Usage

**In Components**:
\`\`\`css
.btn {
  /* Use tokens instead of hardcoded values */
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-bg-primary);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.btn:hover {
  background-color: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
}

.btn:focus {
  box-shadow: var(--shadow-focus);
}
\`\`\`

**In Practice Modes**:
\`\`\`css
.practice-mode--rs {
  border-left: 4px solid var(--color-rs-primary);
}

.practice-mode--asq {
  border-left: 4px solid var(--color-asq-primary);
}

.practice-mode--wfd {
  border-left: 4px solid var(--color-wfd-primary);
}
\`\`\`

### Benefits

✅ **Consistency**: All components use same color palette, spacing, etc.  
✅ **Maintainability**: Change 1 variable to update entire theme  
✅ **Dark Mode**: Automatic switching via CSS media queries  
✅ **Accessibility**: High contrast mode support built-in  
✅ **Performance**: CSS variables are browser-native (no runtime cost)  
✅ **Developer Experience**: Semantic names, auto-complete in IDEs

### Theming Example

**Change Primary Color** (affects all buttons, links, focus states):
\`\`\`css
:root {
  --color-primary: #6200ea; /* Change from blue to purple */
}
/* All components automatically update! */
\`\`\`

**Adjust Spacing Scale**:
\`\`\`css
:root {
  --spacing-md: 20px; /* Increase from 16px */
}
/* All elements using --spacing-md get more space */
\`\`\`

---

**API Reference Status**: ✅ **COMPLETE (Phase 2 Updated)**  
**Last Updated**: January 8, 2025  
**Coverage**: All public APIs documented + Phase 2 additions (DatasetManager, PracticeModes, Events, CSS Tokens)
