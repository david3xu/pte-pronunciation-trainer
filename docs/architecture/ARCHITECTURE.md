# Architecture

## 🏗️ System Overview

The PTE Pronunciation Trainer (v2.5.4) is a client-side web application designed to help users practice pronunciation for the PTE (Pearson Test of English) exam. It features text-to-speech (TTS) capabilities, vocabulary management, progress tracking, and a zero-hardcoded-value configuration system.

### **Key Design Principles**

1. **Zero Hardcoded Values** - ALL configuration in `src/js/shared/Config.js`
2. **Event-Driven Architecture** - Complete decoupling via EventBus with standardized events
3. **Context-Aware Settings** - SettingsModule with proper `this` binding for handler functions
4. **Modular Components** - Independent, loosely-coupled modules with clear responsibilities
5. **Data-Driven Design** - Configurable data pipeline from Markdown → JSON
6. **Progressive Enhancement** - Core functionality works without advanced features
7. **Defensive Programming** - Comprehensive error handling and graceful degradation

---

## � **Important Terminology** (CCL → PTE Migration)

### **"Category" Has TWO Meanings**

⚠️ **IMPORTANT**: The word "category" appears in code with **two different contexts**:

1. **✅ CURRENT (PTE)**: Category as a **filter field** on vocabulary words
   - Each word has metadata: `{ english, ipa, difficulty, category }`
   - Example: `word.category = 'pte-beginner'`
   - Used for filtering: "Show only words where category='pte-intermediate'"
   - **This is legitimate and should be kept**

2. **❌ LEGACY (CCL)**: Category as **navigation between topic sections**
   - CCL app had: Health → Education → Travel → etc.
   - Methods like: `loadCategory()`, `getPreviousCategory()`, `advanceToNextCategory()`
   - **This concept was removed - PTE uses simple book-to-book navigation**

### **Current Navigation Model**

**PTE Architecture**:
- User selects a **vocabulary book** (e.g., "PTE Beginner")
- Each book is one complete dataset
- Manual navigation (PREV/NEXT buttons) loops within current book
- Auto-play can advance to next book when current book completes
- "Category" is only used for filtering words **within** a dataset

**NOT this** (CCL model):
- ~~Navigate between categories within a book~~
- ~~getPreviousCategory() / getNextCategory()~~
- ~~Category completion triggers category transition~~

### **Renamed Terminology for Clarity**

| Old Name (CCL) | New Name (PTE) | Purpose |
|----------------|----------------|---------|
| `updateCategoryDisplay()` | `updateBookDisplay()` | Shows current book name in UI |
| `categoryDisplay` element | `bookDisplay` element | HTML element showing book name |
| `current-category` class | `current-book` class | CSS class for book display |
| Category navigation | Book selection | User chooses which book to study |
| Category completion | Book completion | When finishing a vocabulary book |

---

## �📊 High-Level Architecture

```mermaid
graph TB
    subgraph "🎯 Configuration Layer"
        CONFIG[Config.js<br/>Centralized Settings]
    end

    subgraph "📊 Data Pipeline"
        SOURCE[Markdown Sources<br/>data/source/pte/vocabs/]
        PIPELINE[PTEDataPipeline.js<br/>Extract & Transform]
        DATASET[JSON Dataset<br/>data/processed/]
    end

    subgraph "🎨 Application Layer"
        APP[PTEApp.js<br/>Main Coordinator]
        VOCAB[PTEVocabularyManager.js<br/>Data Management]
        SETTINGS[SettingsModule.js<br/>Event-Driven Settings]
        UI[UIController.js<br/>Display & Interaction]
        TTS[TTSEngine.js<br/>Speech Synthesis]
        PROGRESS[ProgressTracker.js<br/>Learning Progress]
    end

    subgraph "🔧 Infrastructure"
        EVENTS[EventBus.js<br/>Pub/Sub System]
        STORAGE[Storage.js<br/>localStorage Wrapper]
    end

    CONFIG --> PIPELINE
    CONFIG --> APP
    SOURCE --> PIPELINE
    PIPELINE --> DATASET
    DATASET --> VOCAB

    APP --> VOCAB
    APP --> SETTINGS
    APP --> UI
    APP --> TTS
    APP --> PROGRESS

    VOCAB --> EVENTS
    SETTINGS --> EVENTS
    UI --> EVENTS
    TTS --> EVENTS
    PROGRESS --> EVENTS

    EVENTS --> STORAGE
```

---

## 🎯 Core Components

### 1. App.tsx - Application Root

**Purpose**: Main React component that orchestrates the application.

**Responsibilities**:
- Initialize application state
- Manage routing/view switching (Vocabulary vs Practice modes)
- Coordinate global modals (Settings, AI Tutor, Migration)
- Handle keyboard shortcuts
- Manage layout structure

### 2. Zustand Stores (`src/ts/stores/`)

**Purpose**: Centralized state management replacing the legacy EventBus architecture.

**Stores**:
- **`useAppStore`**: Main entry point combining all slices.
- **`vocabularySlice`**: Manages dataset loading, filtering, and current item.
- **`settingsSlice`**: Manages user preferences (speed, voice, difficulty).
- **`audioSlice`**: Manages playback state (playing, paused, auto-play).
- **`authSlice`**: Manages Supabase authentication state.
- **`progressSlice`**: Tracks learning progress and session stats.

### 3. Audio System (`src/components/audio/`, `src/ts/audio/`)

**Components**:
- **`AudioControls.tsx`**: UI for playback control (Play/Pause, Next/Prev, Speed).
- **`TTSEngine.ts`**: Singleton service managing Web Speech API and AWS Polly.
- **`VoiceSelector.tsx`**: UI for selecting browser voices.
- **`PremiumVoiceSelector.tsx`**: UI for selecting AWS Polly neural voices.

### 4. AI System (`src/components/ai/`, `src/services/ai/`)

**Components**:
- **`AISidebar.tsx`**: Always-visible assistant panel.
- **`AITutorChat.tsx`**: Chat interface with Google Gemini/OpenAI.
- **`AIRecommendations.tsx`**: Personalized learning suggestions.
- **`PronunciationScoring.tsx`**: Real-time pronunciation feedback.

**Services**:
- **`geminiService.ts`**: Client for Google Gemini API.
- **`chat.ts`**: Backend API for AI chat context.

### 5. Practice Interface (`src/components/practice/`)

**Components**:
- **`WordCard.tsx`**: Main display for vocabulary items.
- **`RSInterface.tsx`**: Repeat Sentence practice UI.
- **`ASQInterface.tsx`**: Answer Short Question practice UI.
- **`WFDInterface.tsx`**: Write From Dictation practice UI.

---

## 🔧 Infrastructure Components

### **Zustand State Management**

**Purpose**: Reactive state management for the React application.

**Pattern**: Slice pattern (combining multiple stores into one hook).

**Usage**:
```typescript
// Select state
const currentItem = useAppStore((state) => state.vocabulary.currentItem);
const settings = useAppStore((state) => state.settings);

// Update state
const setSpeed = useAppStore((state) => state.audio.setSpeed);
setSpeed(1.5);
```

### **Supabase Client**

**Purpose**: Cloud persistence and authentication.

**Features**:
- **Auth**: Email/Password login, session management.
- **Database**: PostgreSQL for user data (profiles, progress).
- **Realtime**: Sync updates across devices.
- **Storage**: Caching generated audio files.

---

## 📊 Data Pipeline Architecture

### **Data Flow**

```mermaid
graph LR
    A[Markdown Source<br/>pte-fib-listening-with-ipa.md] --> B[PTEDataPipeline.js]
    B --> C[Parse & Extract]
    C --> D[Validate & Transform]
    D --> E[JSON Dataset<br/>pte-fib-listening-dataset.json]
    E --> F[PTEVocabularyManager]
    F --> G[Application]
```

### **Data Pipeline (PTEDataPipeline.js)**

**Purpose**: Transform Markdown vocabulary into structured JSON

**Process**:
1. **Read** Markdown source files
2. **Parse** vocabulary entries (English, IPA, phonetic, Chinese)
3. **Extract** metadata (difficulty, category)
4. **Validate** data integrity
5. **Transform** into standardized JSON schema
6. **Write** to processed dataset file

**Configuration**:
```javascript
{
  inputDir: 'data/source/pte/vocabs/',
  outputDir: 'data/processed/',
  dataSources: {
    primary: 'pte-fib-listening-with-ipa.md',
    fallback: 'fib-listening-vocabulary.md'
  },
  outputFiles: {
    dataset: 'pte-fib-listening-dataset.json',
    report: 'pte-processing-report.json'
  }
}
```

### **Data Schema**

**Vocabulary Item**:
```javascript
{
  id: string,                   // Unique identifier
  english: string,              // English term/phrase
  chinese: string,              // Chinese translation
  pronunciation: {
    british: {
      ipa: string,              // IPA notation
      phonetic: string          // Phonetic description
    },
    american: {
      ipa: string,
      phonetic: string
    }
  },
  category: string,             // Category (e.g., "pte-fib-listening")
  difficulty: string,           // "beginner", "intermediate", "advanced"
  metadata: {
    source: string,             // Source file
    lineNumber: number          // Line in source
  }
}
```

---

## ⚙️ Settings System Architecture

### **Settings Hierarchy**

```
Config.js (Static Configuration)
    ↓
Storage (localStorage Persistence)
    ↓
SettingsModule (Event-Driven Runtime)
    ↓
EventBus (Publish/Subscribe)
    ↓
Engines (Listen & Update)
```

### **Setting Categories**

1. **Learning Settings**
   - `learningMode`: Which vocabulary book to use
   - `difficulty`: Filter by difficulty level (all/easy/medium/hard/advanced)
   - `practiceMode`: Practice type (vocabulary/rs/asq/wfd)
   - `practiceDataset`: Dataset selection (2024/2025/combined)

2. **Audio Settings**
   - `speed`: Speech rate (0.6 - 1.2)
   - `delay`: Pause between words (1000 - 5000ms, default: 3000ms)
   - `repeat`: Repeat count (0 - Infinity)
   - `voice`: TTS voice selection (auto/specific voice)

### **Event-Driven Setting Changes**

**Example**: Change speed setting via events
```javascript
// ✅ CORRECT: Request setting change via event
window.eventBus.emit('setting:request-change', {
    key: 'speed',
    value: 0.8
});

// SettingsModule automatically:
// 1. Validates value (0.6 - 1.2)
// 2. Applies value (logs change)
// 3. Persists to localStorage
// 4. Emits 'setting:changed' event

// ✅ Engines listen and react
class TTSEngine {
    constructor() {
        window.eventBus.on('setting:changed', this._handleSettingChange.bind(this));
    }

    _handleSettingChange({key, value}) {
        if (key === 'speed') {
            console.log('[TTSEngine] Speed changed to', value);
            this._setSpeechRate(value);
        }
    }
}
```

**Example**: Change difficulty setting
```javascript
// Request difficulty change
window.eventBus.emit('setting:request-change', {
    key: 'difficulty',
    value: 'advanced'
});

// PTEVocabularyManager listens and filters words
// UI updates to show only advanced words
1. Validates voice exists
2. Resets speechRate to safe default for that voice
3. Emits 'settings:voice-changed' event
4. Persists updated settings
```

---

## 🔄 State Management Architecture

### **State Flow**

```mermaid
graph TD
    A[User Action] --> B[Component]
    B --> C[EventBus]
    C --> D[StateManager]
    D --> E[localStorage]
    C --> F[Other Components]
    F --> G[UI Update]
```

### **State Categories**

1. **Application State** (transient, not persisted)
   - Current UI mode (settings panel open/closed)
   - Loading indicators
   - Error messages

2. **Session State** (persisted per session)
   - Current word index
   - Active filters
   - Temporary bookmarks

3. **Persistent State** (persisted long-term)
   - User settings
   - Learning progress
   - Permanent bookmarks

### **State Synchronization**

- **On Change**: State immediately persisted to localStorage
- **On Load**: State restored from localStorage
- **On Error**: Fallback to default state
- **On Upgrade**: State migrated to new schema version

---

## 🏗️ Build System Architecture

### **Build Process**

```bash
npm run build
```

**Steps**:
1. Read `Config.js` for build configuration
2. Concatenate JavaScript files (in order from config)
3. Minify JavaScript with Terser
4. Concatenate CSS files
5. Minify CSS
6. Copy assets to `dist/`
7. Generate source maps (optional)

### **Build Configuration**

```javascript
// In Config.js
build: {
  jsFiles: [
    'src/js/shared/Config.js',
    'src/js/utils/EventBus.js',
    'src/js/utils/Storage.js',
    'src/js/utils/StateManager.js',
    'src/js/core/PTEApp.js',
    'src/js/core/PTEVocabularyManager.js',
    'src/js/core/SettingsModule.js',
    'src/js/core/ProgressTracker.js',
    'src/js/ui/UIController.js',
    'src/js/ui/SettingsPanel.js',
    'src/js/audio/TTSEngine.js',
    'src/js/audio/VoiceSelector.js',
    'src/js/audio/AudioControls.js'
  ],
  output: {
    js: 'js/app.min.js',
    css: 'css/style.min.css'
  }
}
```

---

## 🔒 Error Handling Architecture

### **Error Handling Strategy**

1. **Graceful Degradation**
   - App works with core features if advanced features fail
   - TTS failure doesn't prevent vocabulary display

2. **Error Boundary Pattern**
   - Try-catch blocks around critical operations
   - Errors logged and reported to EventBus

3. **User Communication**
   - User-friendly error messages
   - Actionable suggestions for resolution

### **Error Categories**

1. **Data Errors**
   - Dataset not found → Use fallback or show error
   - Invalid JSON → Log error, use default data

2. **TTS Errors**
   - Voice not available → Fallback to default voice
   - Browser doesn't support TTS → Show warning message

3. **Storage Errors**
   - localStorage full → Clear old data or warn user
   - localStorage disabled → Warn user, use session-only state

---

## 📈 Performance Optimization

### **Loading Performance**

1. **Lazy Loading**
   - Load vocabulary data only when needed
   - Load TTS voices on demand

2. **Caching**
   - Cache dataset in memory after first load
   - Cache TTS voices list

3. **Minification**
   - JavaScript bundled and minified (~40% size reduction)
   - CSS minified

### **Runtime Performance**

1. **Event Throttling**
   - Keyboard events throttled to prevent spam
   - UI updates debounced

2. **Memory Management**
   - Clean up event listeners on component destroy
   - Clear unused data from memory

---

## 🧪 Testing Architecture

### **Test Categories**

1. **Unit Tests**
   - Individual component methods
   - Data pipeline transformations
   - Utility functions

2. **Integration Tests**
   - Component interactions via EventBus
   - State persistence and restoration

3. **End-to-End Tests**
   - Complete user workflows
   - TTS playback functionality

### **Testing Tools**

- **Jest**: Unit and integration testing
- **jsdom**: DOM testing in Node.js
- **Manual testing**: TTS and browser-specific features

---

## 📦 Deployment Architecture

### **Deployment Targets**

1. **Static Hosting** (Vercel, Netlify, GitHub Pages)
   - No server-side code required
   - CDN-based distribution

2. **Custom Server** (Apache, Nginx)
   - Serve static files
   - Enable compression and caching

### **Build Artifacts**

```
dist/
├── index.html           # Entry point
├── js/
│   └── app.min.js      # Bundled JavaScript
├── css/
│   └── style.min.css   # Bundled CSS
├── data/
│   └── processed/
│       └── pte-fib-listening-dataset.json
└── manifest.json       # PWA manifest
```

---

## 🎯 Design Patterns Used

### **1. Coordinator Pattern**
- **PTEApp** coordinates all modules
- Centralizes initialization and lifecycle

### **2. Observer Pattern**
- **EventBus** for pub/sub communication
- Loose coupling between components

### **3. Strategy Pattern**
- Different learning modes use same interface
- Swappable TTS voices

### **4. Singleton Pattern**
- **Config.js** - single configuration instance
- **EventBus** - single event bus instance

### **5. Factory Pattern**
- Creating vocabulary items from data
- Creating UI elements dynamically

---

## 🔮 Future Architecture Considerations

### **Planned Enhancements**

1. **Multi-Dataset Support**
   - Support for Repeat Sentence, Answer Short Question, Write From Dictation
   - Dynamic dataset switching
   - Unified data schema

2. **Spaced Repetition**
   - Algorithm to schedule vocabulary review
   - Adaptive difficulty adjustment

3. **PWA Features**
   - Offline support with Service Worker
   - Install as app on mobile devices

4. **Analytics Integration**
   - Learning analytics dashboard
   - Progress visualization

---

**Architecture Status**: ✅ **STABLE & SCALABLE**
**Design Principles**: ✅ **SOLID PRINCIPLES APPLIED**
**Code Quality**: ✅ **MODULAR & MAINTAINABLE**

---

## 🆕 Phase 2: Practice Modes & CSS Architecture (October 2025)

### **Overview**

Phase 2 introduces three PTE practice modes (Repeat Sentence, Answer Short Question, Write From Dictation) and a comprehensive CSS refactoring with a design system.

### **Phase 2 Components**

```mermaid
graph TB
    subgraph "Phase 2 Data Layer"
        DM[DatasetManager.js<br/>Unified Dataset Loader]
        RS_DATA[RS Dataset<br/>1,912 sentences]
        ASQ_DATA[ASQ Dataset<br/>383 questions]
        WFD_DATA[WFD Dataset<br/>1,195 sentences]
    end

    subgraph "Phase 2 UI Layer"
        PM[PracticeModes.js<br/>RS/ASQ/WFD UI Components]
        PM_RS[RS Mode<br/>Record & Compare]
        PM_ASQ[ASQ Mode<br/>Answer Checking]
        PM_WFD[WFD Mode<br/>Dictation Practice]
    end

    subgraph "Enhanced Components"
        TTS_ENH[TTSEngine.js<br/>+ Sentence/Question Support]
        SETTINGS_ENH[SettingsPanel.js<br/>+ Mode Switching]
        UI_ENH[UIController.js<br/>+ Practice Mode Handling]
    end

    subgraph "CSS Architecture"
        VARS[variables.css<br/>222 Design Tokens]
        ANIM[animations.css<br/>Centralized Keyframes]
        COMP[components.css<br/>Reusable Components]
        PM_CSS[practice-modes.css<br/>Practice-Specific Styles]
    end

    DM --> RS_DATA
    DM --> ASQ_DATA
    DM --> WFD_DATA

    DM --> PM
    PM --> PM_RS
    PM --> PM_ASQ
    PM --> PM_WFD

    PM --> TTS_ENH
    PM --> UI_ENH
    SETTINGS_ENH --> PM

    VARS --> ANIM
    ANIM --> COMP
    COMP --> PM_CSS
```

---

### **1. DatasetManager.js - Unified Dataset Management**

**Purpose**: Single interface for loading and managing all 6 dataset types

**File**: `src/js/data/DatasetManager.js` (472 lines)

**Responsibilities**:
- Load vocabulary datasets (FIB Listening, Beginner, Intermediate)
- Load practice datasets (RS, ASQ, WFD)
- Provide unified API for filtering and retrieval
- Cache datasets for performance
- Handle dataset-specific metadata

**Key Methods**:
```javascript
class DatasetManager {
  async loadDataset(type)           // Load specific dataset
  async loadAllDatasets()           // Preload all datasets
  getItems(type, filters)           // Get filtered items
  getRandomItems(type, count)       // Get random items
  getStatistics(type)               // Get dataset stats
  getAllCategories(type)            // Get unique categories
  clearCache(type)                  // Clear cached data

  // Private helpers
  _getItemField(item, field, type)  // Unified field access
}
```

**Dataset Types**:
```javascript
{
  'fib-listening': 'pte-fib-listening-dataset.json',       // 885 items
  'beginner': 'pte-beginner-vocabulary.json',              // 620 items
  'intermediate': 'pte-intermediate-vocabulary.json',      // 692 items
  'rs': 'pte-repeat-sentence-dataset.json',               // 1,912 items
  'asq': 'pte-answer-short-question-dataset.json',        // 383 items
  'wfd': 'pte-write-from-dictation-dataset.json'          // 1,195 items
}
```

**Data Schema Handling**:
- **Vocabulary**: Direct properties (`word`, `difficulty`, `category`)
- **Practice**: Nested in `metadata` (`metadata.difficulty`, `metadata.category`)
- **Unified Access**: `_getItemField()` method handles both schemas transparently

**Events Emitted**:
- `dataset:loaded` - Dataset loaded successfully
- `dataset:error` - Loading failed

**Integration**:
```javascript
// PTEApp.js initialization
async initializeDatasetManager() {
  if (window.DatasetManager) {
    window.datasetManager = new window.DatasetManager();
    await window.datasetManager.loadAllDatasets();
  }
}
```

---

### **2. PracticeModes.js - Practice Mode UI Components**

**Purpose**: Render and manage RS/ASQ/WFD practice mode interfaces

**File**: `src/js/ui/PracticeModes.js` (632 lines, 37% reduced from initial)

**Responsibilities**:
- Render mode-specific UI (RS, ASQ, WFD)
- Handle user interactions (record, check answer, submit)
- Integrate with TTSEngine for audio playback
- Provide visual feedback (correct/incorrect)
- Manage practice flow (next item, show/hide text)

**Architecture Pattern**: Single class with mode-specific methods

```javascript
class PracticeModes {
  constructor(datasetManager, ttsEngine, eventBus)

  // Mode Rendering
  renderRS(container)               // Render Repeat Sentence UI
  renderASQ(container)              // Render Answer Short Question UI
  renderWFD(container)              // Render Write From Dictation UI

  // RS Mode Methods
  loadRSItem()                      // Load next RS sentence
  handleRSListen()                  // Play sentence audio
  handleRSRecord()                  // Record user speech
  handleRSPlayback()                // Play recorded audio
  handleRSShowText()                // Toggle text visibility

  // ASQ Mode Methods
  loadASQItem()                     // Load next ASQ question
  handleASQListen()                 // Play question audio
  handleASQSubmit()                 // Check user answer
  calculateSimilarity(str1, str2)   // Levenshtein distance

  // WFD Mode Methods
  loadWFDItem()                     // Load next WFD sentence
  handleWFDListen()                 // Play sentence audio
  handleWFDCheck()                  // Check typed sentence
  compareWords(user, correct)       // Word-by-word comparison

  // Shared Helpers (Refactored)
  getElement(id)                    // Cached DOM lookup
  toggleTextVisibility(...)         // Generic show/hide
  handleListen(btnId, method, ...)  // Generic TTS handler
}
```

**Refactoring Highlights**:
- **Element Caching**: `getElement()` caches DOM queries (76+ duplicates eliminated)
- **Helper Methods**: Extracted 5+ common patterns
- **Code Reduction**: 1,000 lines → 632 lines (37% reduction)

**RS Mode Features**:
- Display sentence with metadata
- Audio playback with TTS
- Voice recording (MediaRecorder API)
- Recording playback
- Show/hide text toggle

**ASQ Mode Features**:
- Display question with metadata
- Audio playback
- Answer input field
- Fuzzy matching (Levenshtein distance, 20% threshold)
- Feedback: Correct (green), Close (yellow), Wrong (red)

**WFD Mode Features**:
- Display sentence (hidden by default)
- Audio playback
- Multi-line textarea for dictation
- Word-by-word comparison
- Visual feedback:
  - **Correct** words: Green
  - **Wrong** words: Red underline
  - **Missing** words: Orange italic
  - **Extra** words: Gray strikethrough
- Accuracy percentage calculation

**MediaRecorder Integration** (RS Mode):
```javascript
handleRSRecord() {
  if (!this.isRecording) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks);
          this.recordedAudioURL = URL.createObjectURL(audioBlob);
          // Show playback controls
        };

        this.mediaRecorder.start();
        this.isRecording = true;
      });
  } else {
    this.mediaRecorder.stop();
    this.isRecording = false;
  }
}
```

---

### **3. Enhanced TTSEngine.js**

**Purpose**: Extended TTS support for sentences and questions

**File**: `src/js/audio/TTSEngine.js` (532 lines total, +120 lines added)

**New Methods**:
```javascript
class TTSEngine {
  // Existing word pronunciation
  async pronounceWord(word, repeatIndex)

  // NEW: Sentence pronunciation
  async pronounceSentence(sentenceItem, repeatIndex) {
    const sentence = sentenceItem.sentence || sentenceItem.text;
    const rate = this.getPronunciationRate(sentenceItem);

    // Visual feedback
    const element = this._addSpeakingFeedback('sentenceText', {
      sentence, type: sentenceItem.type, repeatCount, rate
    });

    await this._speak(sentence, rate);

    this._removeSpeakingFeedback(element, {
      sentence, type: sentenceItem.type, repeatCount
    });
  }

  // NEW: Question pronunciation
  async pronounceQuestion(questionItem, repeatIndex) {
    const question = questionItem.question;
    const answer = questionItem.answer;
    // Similar to pronounceSentence, optionally speaks answer
  }

  // NEW: Refactored helpers
  _addSpeakingFeedback(elementId, eventData)
  _removeSpeakingFeedback(element, eventData)
}
```

**Refactoring**:
- Extracted `_addSpeakingFeedback()` and `_removeSpeakingFeedback()` helpers
- Eliminates 3 duplicate visual feedback blocks
- Consistent event emission

---

### **4. Enhanced SettingsPanel.js**

**Purpose**: Added practice mode switching UI

**File**: `src/js/ui/SettingsPanel.js` (+45 lines)

**New Method**:
```javascript
class SettingsPanel {
  // NEW: Setup practice mode switching
  setupPracticeModeSwitch() {
    const practiceModeSelect = document.getElementById('practiceModeSelect');
    const vocabularyBookSetting = document.getElementById('vocabularyBookSetting');
    const practiceDatasetSetting = document.getElementById('practiceDatasetSetting');

    if (practiceModeSelect) {
      practiceModeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;

        // Show/hide appropriate selectors
        if (mode === 'vocabulary') {
          vocabularyBookSetting.style.display = 'flex';
          practiceDatasetSetting.style.display = 'none';
        } else {
          vocabularyBookSetting.style.display = 'none';
          practiceDatasetSetting.style.display = 'flex';

          // Auto-select matching dataset
          const datasetSelect = document.getElementById('practiceDatasetSelect');
          datasetSelect.value = mode; // 'rs', 'asq', or 'wfd'
        }

        // Save via event (event-driven architecture)
        window.eventBus.emit('setting:request-change', {
            key: 'practiceMode',
            value: mode
        });
        window.eventBus.emit('practice:modeChanged', { mode });
      });
    }
  }
}
```

**UI Changes**:
- Added practice mode dropdown (Vocabulary / RS / ASQ / WFD)
- Conditional display of vocabulary vs practice dataset selectors
- Automatic dataset selection based on mode

---

### **5. Enhanced UIController.js**

**Purpose**: Handle practice mode display switching

**File**: `src/js/ui/UIController.js` (+65 lines)

**New Method**:
```javascript
class UIController {
  // NEW: Handle practice mode changes
  handlePracticeModeChange(mode) {
    const learningArea = document.querySelector('.learning-area');
    const categoryDisplay = document.getElementById('categoryDisplay');

    if (mode === 'vocabulary') {
      // Show vocabulary display
      learningArea.innerHTML = `<!-- Vocabulary UI -->`;
      categoryDisplay.textContent = 'Vocabulary Practice';
    } else {
      // Show practice mode UI
      if (window.PracticeModes && window.datasetManager) {
        if (!window.practiceModes) {
          window.practiceModes = new window.PracticeModes(
            window.datasetManager,
            window.ttsEngine,
            window.eventBus
          );
        }

        // Render appropriate mode
        switch (mode) {
          case 'rs':
            window.practiceModes.renderRS(learningArea);
            categoryDisplay.textContent = 'Repeat Sentence';
            break;
          case 'asq':
            window.practiceModes.renderASQ(learningArea);
            categoryDisplay.textContent = 'Answer Short Question';
            break;
          case 'wfd':
            window.practiceModes.renderWFD(learningArea);
            categoryDisplay.textContent = 'Write From Dictation';
            break;
        }
      }
    }
  }
}
```

**Event Listeners**:
```javascript
// Listen for mode changes
window.eventBus.on('practice:modeChanged', ({ mode }) => {
  this.handlePracticeModeChange(mode);
});
```

---

## 🎨 Phase 2: CSS Architecture Refactoring

### **Overview**

Complete CSS refactoring to eliminate duplication, establish design system, and create modular architecture.

### **Problem Statement**

**Before Refactoring**:
- 4 CSS files with 15% code duplication (~270 lines)
- 3 different `@keyframes pulse` definitions (name collision bug)
- 3 button style systems (inconsistent appearance)
- 2 input/select styling approaches (conflicts)
- Magic numbers throughout (no design tokens)
- 1 critical animation bug

**Metrics**:
- Total: ~1,815 lines
- Duplication: 270 lines (15%)
- Animation collisions: 3
- Button systems: 3
- Maintainability: Low (edit 3 files for one change)

### **Solution: Modular CSS Architecture**

Created 6-file modular architecture with design system:

```
src/css/
├── variables.css (222 lines)      - Design system tokens
├── animations.css (95 lines)      - Centralized keyframes
├── components.css (331 lines)     - Reusable components
├── style.css (479 lines)          - Main layout
├── practice-modes.css (552 lines) - Practice-specific
└── responsive.css (367 lines)     - Media queries

Total: 2,046 lines (0% duplication)
```

**Load Order** (Critical for Cascading):
```html
<link rel="stylesheet" href="src/css/variables.css">    <!-- 1. Tokens -->
<link rel="stylesheet" href="src/css/animations.css">   <!-- 2. Animations -->
<link rel="stylesheet" href="src/css/components.css">   <!-- 3. Components -->
<link rel="stylesheet" href="src/css/style.css">        <!-- 4. Layout -->
<link rel="stylesheet" href="src/css/practice-modes.css"> <!-- 5. Practice -->
```

---

### **1. variables.css - Design System Foundation**

**Purpose**: Single source of truth for all design values

**File**: `src/css/variables.css` (222 lines)

**Design Tokens** (100+ variables):

```css
:root {
  /* Colors (40+ tokens) */
  --primary-color: #4f46e5;
  --primary-light: #818cf8;
  --primary-dark: #4338ca;
  --success-color: #22c55e;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
  /* ... */

  /* Spacing (8 tokens) */
  --space-xs: 0.25rem;    /* 4px */
  --space-sm: 0.5rem;     /* 8px */
  --space-md: 0.75rem;    /* 12px */
  --space-lg: 1rem;       /* 16px */
  --space-xl: 1.5rem;     /* 24px */
  /* ... */

  /* Border Radius (6 tokens) */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 20px;
  --radius-2xl: 25px;
  --radius-full: 9999px;

  /* Shadows (7 tokens) */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  /* ... */

  /* Transitions (4 tokens) */
  --transition-fast: 0.2s ease;
  --transition-base: 0.3s ease;
  --transition-slow: 0.5s ease;
  --transition-bounce: 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Typography (16 tokens) */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  /* ... */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Z-Index Layers (6 tokens) */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 500;
  --z-overlay: 1000;
  --z-modal: 2000;
  --z-toast: 3000;

  /* Accessibility (2 tokens) */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
}
```

**Dark Mode Support**:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #2d3748;
    --bg-secondary: #1a202c;
    --text-primary: #e2e8f0;
    /* Automatic theme switching */
  }
}
```

**High Contrast Support**:
```css
@media (prefers-contrast: high) {
  :root {
    --text-primary: #000000;
    --border-light: #000000;
    /* Accessibility enhancement */
  }
}
```

**Usage Example**:
```css
.btn {
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
}
```

**Benefits**:
- Change design values in ONE place
- Automatic dark mode switching
- Consistent spacing/sizing across app
- Easy theming and customization
- Accessibility built-in

---

### **2. animations.css - Centralized Animations**

**Purpose**: Single source for all @keyframes to prevent collisions

**File**: `src/css/animations.css` (95 lines)

**Purpose**: Centralized animation definitions with unified keyframes

**Keyframe Definitions**:
```css
/* Unified pulse animation (opacity + transform) */
@keyframes pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.02);
    }
}

/* Fade in up for content reveals */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Spinner rotation */
@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Progress bar pulse */
@keyframes progress-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
```

**Utility Classes**:
```css
.pulse { animation: pulse 2s ease-in-out infinite; }
.fade-in-up { animation: fadeInUp 0.5s ease-out; }
.speaking { animation: pulse 1.5s ease-in-out infinite; }
.word-change { animation: fadeInUp 0.5s ease; }
.loading-spinner { animation: spin 1s ease-in-out infinite; }
```

**Before vs After**:
- **Before**: 3 `pulse` definitions → Last one wins (unpredictable)
- **After**: 1 `pulse` definition → Consistent behavior

**Eliminated**:
- `components.css`: Removed duplicate animations (-30 lines)
- `style.css`: Removed duplicate animations (-40 lines)
- `practice-modes.css`: Uses centralized animations

---

### **3. components.css - Reusable Components**

**Purpose**: BEM-based reusable component library

**File**: `src/css/components.css` (331 lines, reduced from 370)

**Button System** (Single Source of Truth):
```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: var(--touch-target-min);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Variants */
.btn--primary {
  background: var(--primary-color);
  color: white;
}

.btn--secondary {
  background: var(--secondary-color);
  color: white;
}

.btn--success { background: var(--success-color); }
.btn--danger { background: var(--danger-color); }

/* Sizes */
.btn--large {
  padding: 1rem 2rem;
  font-size: var(--text-lg);
  min-height: 52px;
}

.btn--small {
  padding: 0.5rem 1rem;
  font-size: var(--text-sm);
  min-height: 36px;
}
```

**Other Components**:
- Vocabulary cards (`.vocab-card`)
- Progress bars (`.progress-bar`)
- Status indicators (`.status-display`)
- Loading spinners (`.loading-spinner`)

**Removed Duplicates**:
- Duplicate animations (moved to animations.css)
- `.select` class (conflicts with element selector)

---

### **4. practice-modes.css - Practice-Specific Styles**

**Purpose**: Styles for RS/ASQ/WFD practice modes

**File**: `src/css/practice-modes.css` (552 lines, reduced from 605)

**Mode-Specific Colors**:
```css
.rs-mode { border-top: 4px solid #4CAF50; }   /* Green */
.asq-mode { border-top: 4px solid #2196F3; }  /* Blue */
.wfd-mode { border-top: 4px solid #9C27B0; }  /* Purple */
```

**Feedback Styles**:
```css
/* Correct answer */
.answer-feedback.correct {
    background: #E8F5E9;
    color: #2E7D32;
    border: 2px solid #4CAF50;
}

/* Wrong answer */
.answer-feedback.incorrect {
    background: #FFEBEE;
    color: #C62828;
    border: 2px solid #f44336;
}

/* WFD word comparison */
.word-correct { color: #4CAF50; font-weight: 500; }
.word-wrong { color: #f44336; text-decoration: underline wavy; }
.word-missing { color: #FF9800; font-style: italic; }
.word-extra { color: #9E9E9E; text-decoration: line-through; }
```

**Removed Duplicates**:
- Duplicate button styles (uses `.btn` from components.css)
- Updated responsive media queries to use `.btn` class

---

### **5. style.css - Main Layout**

**Purpose**: Application layout and structure

**File**: `src/css/style.css` (479 lines, reduced from 560)

**Removed Duplicates**:
- `.btn-play`, `.btn-nav` (replaced with `.btn .btn--primary`)
- Duplicate animations (uses animations.css)
- Responsive button styles (uses components.css modifiers)

**Keeps**:
- App grid layout
- Learning area styles
- Control area
- Settings panel
- Form element selectors (`select`, `input`)

---

### **CSS Refactoring Results**

**Metrics**:

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Total Lines** | 1,815 | 2,046 | +231 |
| **Duplicate Lines** | 270 | 0 | -270 |
| **Unique Code** | 1,545 | 2,046 | +501 |
| **Duplication %** | 15% | 0% | -15% |
| **CSS Files** | 4 | 6 | +2 |
| **Design Tokens** | 0 | 222 | +222 |
| **Critical Bugs** | 1 | 0 | -1 |

**Duplication Eliminated**:

| Type | Before | After | Reduction |
|------|--------|-------|-----------|
| @keyframes pulse | 3 | 1 | 67% |
| @keyframes fadeInUp | 2 | 1 | 50% |
| Button styles | 3 | 1 | 67% |
| Disabled states | 4 | 1 | 75% |

**Maintainability**:
- Change button color → Edit 1 variable in variables.css
- Change animation → Edit 1 file (animations.css)
- Update design token → Automatic propagation across all components
- **Result**: 75% reduction in change locations

---

## 📊 Phase 2 Data Pipeline

### **Dataset Statistics**

**Total Items**: 5,687 items across 6 datasets

| Dataset | Items | Type | Status |
|---------|-------|------|--------|
| PTE FIB Listening | 885 | Vocabulary | ✅ Existing |
| PTE Beginner | 620 | Vocabulary | ✅ Existing |
| PTE Intermediate | 692 | Vocabulary | ✅ Existing |
| **Repeat Sentence** | **1,912** | **Practice** | **🆕 Phase 2** |
| **Answer Short Question** | **383** | **Practice** | **🆕 Phase 2** |
| **Write From Dictation** | **1,195** | **Practice** | **🆕 Phase 2** |

**Data Schema**:

**Vocabulary Schema**:
```json
{
  "word": "ubiquitous",
  "difficulty": "hard",
  "category": "General Academic",
  "pronunciation": { "british": "/juːˈbɪkwɪtəs/", "american": "/juːˈbɪkwɪtəs/" },
  "example": "Smartphones have become ubiquitous in modern society."
}
```

**Practice Schema** (RS/ASQ/WFD):
```json
{
  "sentence": "The research methodology was comprehensive and well-documented.",
  "type": "rs",
  "metadata": {
    "difficulty": "normal",
    "category": "Academic Discourse",
    "tags": ["research", "academic"],
    "wordCount": 7,
    "source": "PTE Official Practice"
  }
}
```

**ASQ Schema** (Additional field):
```json
{
  "question": "What is the capital of France?",
  "answer": "Paris",
  "type": "asq",
  "metadata": { /* ... */ }
}
```

---

## 🔄 Phase 2 Event System

### **New Events**

**Dataset Management**:
```javascript
// DatasetManager events
'dataset:loaded' → { type, itemCount }
'dataset:error' → { type, error }

// Practice mode events
'practice:modeChanged' → { mode }  // 'vocabulary', 'rs', 'asq', 'wfd'
```

**Practice Modes**:
```javascript
// RS mode
'rs:itemLoaded' → { item, index }
'rs:recordingStarted' → { }
'rs:recordingStopped' → { audioURL }

// ASQ mode
'asq:itemLoaded' → { item, index }
'asq:answerChecked' → { correct, similarity }

// WFD mode
'wfd:itemLoaded' → { item, index }
'wfd:sentenceChecked' → { accuracy, errors }
```

---

## 🏗️ Phase 2 Integration Pattern

### **Graceful Degradation**

Phase 2 components are **optional**. App works without them:

```javascript
// PTEApp.js - Optional initialization
async initialize() {
  // ... existing initialization ...

  // Phase 2: Optional DatasetManager
  await this.initializeDatasetManager();  // Gracefully fails if not available

  // ... rest of initialization ...
}

async initializeDatasetManager() {
  if (window.DatasetManager) {
    window.datasetManager = new window.DatasetManager();
    await window.datasetManager.loadAllDatasets();
  } else {
    console.log('DatasetManager not available (Phase 2 not loaded)');
  }
}
```

**Benefits**:
- Backward compatible
- Progressive enhancement
- Modular loading
- Easy rollback if needed

---

## 📈 Phase 2 Impact

### **Code Metrics**

| Component | Lines | Purpose |
|-----------|-------|---------|
| DatasetManager.js | 472 | Unified dataset loading |
| PracticeModes.js | 632 | RS/ASQ/WFD UI |
| TTSEngine.js (enhanced) | +120 | Sentence/question TTS |
| SettingsPanel.js (enhanced) | +45 | Mode switching UI |
| UIController.js (enhanced) | +65 | Mode display handling |
| **Total Phase 2 Code** | **~1,334** | **New functionality** |

### **CSS Metrics**

| Component | Lines | Purpose |
|-----------|-------|---------|
| variables.css | 222 | Design tokens |
| animations.css | 95 | Centralized keyframes |
| practice-modes.css | 552 | Practice mode styles |
| **Total New CSS** | **869** | **New architecture** |

### **Quality Achievements**

- ✅ **0% Code Duplication** (modular architecture)
- ✅ **222 Design Tokens** (consistent theming system)
- ✅ **75% Maintenance Reduction** (single source of truth)
- ✅ **Unified Animations** (centralized keyframes in animations.css)
- ✅ **Modular Architecture** (6 focused CSS files)
- ✅ **Dark Mode Support** (automatic theme switching)
- ✅ **Accessibility** (touch targets, contrast, WCAG compliance)

---

## 🚀 Phase 2 Deployment

### **Service Worker Updates**

**Cache Version**: `v22` → `v23`

**New Cached Files**:
```javascript
// CSS files
'/src/css/variables.css',
'/src/css/animations.css',
'/src/css/components.css',

// JS files
'/src/js/data/DatasetManager.js',
'/src/js/ui/PracticeModes.js',

// Datasets
'/data/processed/pte-repeat-sentence-dataset.json',
'/data/processed/pte-answer-short-question-dataset.json',
'/data/processed/pte-write-from-dictation-dataset.json',
```

**Cache Strategy**: Cache-first with network fallback

---

## 🔮 Phase 2 Future Enhancements

### **Potential Improvements**

1. **Speech Recognition** (RS/WFD modes)
   - Auto-transcribe user recordings
   - Compare with correct text
   - Provide pronunciation feedback

2. **Progress Tracking** (Practice modes)
   - Track accuracy per mode
   - Spaced repetition scheduling
   - Personalized difficulty adjustment

3. **Advanced Feedback**
   - Detailed error analysis
   - Common mistake patterns
   - Improvement suggestions

4. **Batch Practice**
   - Practice sets (e.g., 10 questions)
   - Timed practice sessions
   - Mock exams

5. **Export/Import**
   - Export practice results
   - Share custom datasets
   - Import user-created content

---

**Phase 2 Status**: ✅ **COMPLETE & PRODUCTION READY**
**Code Quality**: ✅ **0% DUPLICATION, FULLY REFACTORED**
**Testing**: ⏳ **READY FOR BROWSER TESTING**

```

---

## 🔄 Initialization & Error Handling Architecture (October 2025)

### **Overview**

The application uses a sophisticated initialization system with dependency management, health checks, and comprehensive error handling to ensure reliable startup and graceful failure recovery.

### **Initialization Flow**

```mermaid
graph TD
    A[App Start] --> B[InitializationManager]
    B --> C[Compute Dependency Order]
    C --> D[Topological Sort]
    D --> E{Dependencies Satisfied?}
    E -->|Yes| F[Initialize Module]
    E -->|No| G{Critical?}
    G -->|Yes| H[Throw Error]
    G -->|No| I[Skip Module]
    F --> J{Validation Passed?}
    J -->|Yes| K[Mark Initialized]
    J -->|No| L{Retry Available?}
    L -->|Yes| M[Exponential Backoff]
    M --> F
    L -->|No| G
    K --> N{More Modules?}
    N -->|Yes| E
    N -->|No| O[App Ready]
```

---

### **InitializationManager.js - Dependency-Ordered Initialization**

**Purpose**: Manages module initialization with automatic dependency resolution

**File**: `src/js/core/InitializationManager.js` (328 lines)

**Features**:
- **Dependency Graph**: Define module dependencies (DAG - Directed Acyclic Graph)
- **Topological Sort**: Kahn's algorithm for initialization order
- **Retry Logic**: Exponential backoff for transient failures
- **Timeout Protection**: Prevent hung initialization
- **Validation**: Post-initialization health checks
- **Critical vs Non-Critical**: Fail fast for critical modules, continue for optional

**Dependency Graph**:
```javascript
{
  'EventBus': [],                    // No dependencies
  'Storage': [],                     // No dependencies
  'Config': [],                      // No dependencies
  'CacheMigration': [],              // No dependencies
  'ServiceWorker': [],               // No dependencies

  'SettingsModule': ['Config', 'EventBus', 'Storage'],
  'DatasetManager': ['Config', 'EventBus'],
  'PTEVocabularyManager': ['Config', 'EventBus', 'DatasetManager'],
  'TTSEngine': ['Config', 'EventBus'],
  'AudioControls': ['Config', 'EventBus', 'TTSEngine'],
  'VoiceSelector': ['TTSEngine', 'EventBus'],
  'ProgressTracker': ['Storage', 'EventBus'],
  'UIController': ['Config', 'EventBus', 'SettingsModule'],
  'SettingsPanel': ['SettingsModule', 'UIController', 'EventBus'],
  'PracticeModes': ['DatasetManager', 'TTSEngine', 'EventBus']
}
```

**Initialization Order** (Computed Automatically):
```
1. EventBus, Storage, Config, CacheMigration, ServiceWorker (parallel)
2. SettingsModule, DatasetManager, TTSEngine
3. PTEVocabularyManager, AudioControls, ProgressTracker, UIController
4. VoiceSelector, SettingsPanel
5. PracticeModes
```

---

### **Error Handling Strategy**

#### **1. Fail-Fast for Critical Modules**

**Critical Modules**:
- `SettingsModule` - App unusable without settings
- `PTEVocabularyManager` - No vocabulary = no app
- `UIController` - No UI = no app

**Behavior**:
```javascript
// SettingsModule fails
if (!window.settingsModule.settings) {
  throw new Error('SettingsModule: Missing dependencies: config, eventBus');
  // App stops, shows error to user
}
```

**Non-Critical Modules**:
- `DatasetManager` - PTEVocabularyManager can work alone
- `PracticeModes` - Vocabulary mode works without practice modes

**Behavior**:
```javascript
// PracticeModes fails
if (!window.DatasetManager) {
  console.warn('PracticeModes skipped: DatasetManager not available');
  results.skipped.push('PracticeModes');
  // App continues, practice modes disabled
}
```

#### **2. Event-Driven Error Notification**

**System-Wide Error Events**:
```javascript
// EventBus.js - Global error handler
emit(event, data) {
  this.events[event].forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`EventBus error in ${event} handler:`, error);

      // Emit global error event (prevent infinite loop)
      if (event !== 'system:error') {
        setTimeout(() => {
          this.emit('system:error', {
            event,
            error: error.message,
            stack: error.stack,
            data,
            timestamp: new Date().toISOString()
          });
        }, 0);
      }
    }
  });
}
```

**Module-Specific Error Events**:
- `system:error` - Global event handler errors
- `vocabulary:load-error` - Dataset loading failures
- `tts:error` - TTS engine failures
- `settings:error` - Settings validation failures

#### **3. Health Checks**

**Module Validation**:
```javascript
// PTEApp.js
validateModule(moduleName, moduleInstance, options) {
  const {
    requiredProperties = [],
    critical = false,
    customCheck = null,
    customCheckMessage = ''
  } = options;

  // Check existence
  if (!moduleInstance) {
    const error = `${moduleName} is not available`;
    if (critical) throw new Error(error);
    console.warn(error);
    return false;
  }

  // Check required properties
  for (const prop of requiredProperties) {
    if (!(prop in moduleInstance)) {
      const error = `${moduleName} missing property: ${prop}`;
      if (critical) throw new Error(error);
      console.warn(error);
      return false;
    }
  }

  // Custom validation
  if (customCheck && !customCheck()) {
    const error = `${moduleName} validation failed: ${customCheckMessage}`;
    if (critical) throw new Error(error);
    console.warn(error);
    return false;
  }

  console.log(`✅ ${moduleName} validated successfully`);
  return true;
}
```

#### **4. Retry Logic with Exponential Backoff**

**Network Failures**:
```javascript
// PTEVocabularyManager.js
async loadDataset(mode) {
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const dataset = await response.json();
      this.datasets.set(mode, dataset);
      console.log(`✅ Loaded ${mode}: ${dataset.vocabulary.length} words${attempt > 0 ? ` (retry ${attempt})` : ''}`);
      return; // Success

    } catch (fetchError) {
      lastError = fetchError;

      if (attempt < maxRetries) {
        const delay = retryDelays[attempt];
        console.warn(`⚠️  Attempt ${attempt + 1}/${maxRetries + 1} failed: ${fetchError.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to fetch ${mode} dataset after ${maxRetries + 1} attempts: ${lastError.message}`);
}
```

---

### **Event-Driven Architecture**

#### **Complete Decoupling Pattern**

**Before (Tight Coupling)**:
```javascript
// UIController.js
document.getElementById('startBtn').addEventListener('click', () => {
  window.audioControls.startAutoPlay();  // Direct method call
});
```

**After (Event-Driven)**:
```javascript
// UIController.js
document.getElementById('startBtn').addEventListener('click', () => {
  window.eventBus.emit('audio:start');  // Event emission
});

// AudioControls.js
window.eventBus.on('audio:start', () => {
  this.startAutoPlay();  // Subscribes to event
});
```

**Benefits**:
- **Loose Coupling**: UIController doesn't know about AudioControls
- **Testability**: Can test modules in isolation
- **Extensibility**: Multiple modules can subscribe to same event
- **Error Isolation**: Errors in handlers don't affect emitters

#### **Audio Control Events**

**Events Emitted** (UIController):
- `audio:start` - Start auto-play
- `audio:pause` - Pause auto-play
- `audio:next` - Next word/item
- `audio:prev` - Previous word/item

**Events Subscribed** (AudioControls):
```javascript
_attachEventListeners() {
  window.eventBus.on('setting:changed', this._handleSettingChange.bind(this));

  // Audio control events
  window.eventBus.on('audio:start', () => this.startAutoPlay());
  window.eventBus.on('audio:pause', () => this.pauseAutoPlay());
  window.eventBus.on('audio:next', ({ mode }) => {
    if (mode && mode !== 'vocabulary') {
      this.nextItem();
    } else {
      this.nextWord();
    }
  });
  window.eventBus.on('audio:prev', ({ mode }) => {
    if (mode && mode !== 'vocabulary') {
      this.prevItem();
    } else {
      this.previousWord();
    }
  });
}
```

---

### **Best Practices**

#### **1. Module Design**
- ✅ Single Responsibility Principle
- ✅ Dependency Injection (via constructor)
- ✅ Event-driven communication (not direct calls)
- ✅ Fail-fast for critical issues
- ✅ Graceful degradation for optional features

#### **2. Error Handling**
- ✅ Always throw errors in constructors if dependencies missing
- ✅ Use try-catch for network operations
- ✅ Emit error events for UI notification
- ✅ Log detailed error context (stack traces, timestamps)
- ✅ Provide user-friendly error messages

#### **3. Initialization**
- ✅ Define clear dependencies
- ✅ Use InitializationManager for complex apps
- ✅ Add health checks after initialization
- ✅ Validate critical modules
- ✅ Track initialization timing

#### **4. Event System**
- ✅ Use namespaced events (e.g., `audio:autoplay:start`, `settings:changed`)
- ✅ Include detailed event payloads with timestamps
- ✅ Handle errors in event handlers
- ✅ Emit global `system:error` for centralized tracking
- ✅ Prevent infinite loops in error handlers
- ✅ ALL event names defined in Config.js (zero hardcoded values)

---

## 📡 Event System Reference

### **Event Naming Convention**

Pattern: `domain:action[:modifier]`

**Examples:**
- `content:display` - Display content (unified for word/practice)
- `audio:autoplay:started` - Autoplay started (past tense for completed actions)
- `settings:changed` - Setting value changed
- `tts:speaking:started` - TTS started speaking

### **Core Events by Domain**

#### **Audio Events** (`events.audio.*`)
- `audio:autoplay:start` - Start autoplay mode
- `audio:autoplay:pause` - Pause autoplay mode
- `audio:autoplay:started` - Autoplay started (notification)
- `audio:autoplay:paused` - Autoplay paused (notification)
- `audio:navigate:next` - Navigate to next item
- `audio:navigate:prev` - Navigate to previous item

#### **Settings Events** (`events.settings.*`)
- `settings:changed` - Setting value changed `{key, value, timestamp}`
- `settings:error` - Setting update failed `{key, value, error}`

#### **TTS Events** (`events.tts.*`)
- `tts:speaking:started` - TTS started speaking `{word, phonetic, mode}`
- `tts:speaking:completed` - TTS finished speaking `{word}`

#### **Content Events** (`events.content.*`)
- `content:display` - Display content (unified) `{word/item, index}`

#### **Mode Events** (`events.mode.*`)
- `mode:practice:changing` - Practice mode about to change `{oldMode, newMode}`
- `mode:practice:changed` - Practice mode changed `{mode, timestamp}`

#### **Vocabulary Events**
- `vocabulary:loaded` - Dataset loaded `{mode, wordCount}`
- `vocabulary:difficultyFiltered` - Difficulty filter applied `{difficulty, count}`

### **Event Usage Example**

```javascript
// Emitting events (from Config.js)
const settingsChangedEvent = window.appConfig.get('events.settings.changed');
window.eventBus.emit(settingsChangedEvent, {
  key: 'speed',
  value: 0.7,
  timestamp: Date.now()
});

// Listening to events
const audioStartEvent = window.appConfig.get('events.audio.autoplay.start');
window.eventBus.on(audioStartEvent, () => {
  this.startAutoPlay();
});
```

**See `src/js/shared/Config.js` lines 450-530 for complete event registry.**

---

**Initialization Architecture Status**: ✅ **PRODUCTION READY**
**Error Handling**: ✅ **COMPREHENSIVE & RESILIENT**
**Event System**: ✅ **FULLY DECOUPLED**
