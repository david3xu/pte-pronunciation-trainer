# Settings Panel Documentation

## Overview

The Settings Panel is a comprehensive configuration interface that allows users to customize their PTE vocabulary learning experience. It provides granular control over learning modes, audio settings, and user preferences.

## Settings Panel Structure

### Access & Navigation
- **Toggle Button**: ⚙️ Settings button in the top-right corner
- **Keyboard Shortcut**: `Escape` key to open/close
- **Auto-close**: Closes when clicking outside the panel
- **State Persistence**: All settings are automatically saved and restored

## Settings Categories

### 1. Learning Mode Selection

#### **Mode** (`learningModeSelect`)
Controls the primary learning dataset and methodology.

**Available Options:**
- `pte-fib-listening` - 🎧 PTE FIB Listening (Default)
- `pte-beginner` - 🔤 PTE Beginner
- `pte-intermediate` - 📚 PTE Intermediate

**Configuration:**
```javascript
learningModes: [
    { id: 'pte-fib-listening', label: '🎧 PTE FIB Listening', dataset: 'pte-fib-listening-with-ipa' },
    { id: 'pte-beginner', label: '🔤 PTE Beginner', dataset: 'pte-beginner-vocabulary-with-ipa' },
    { id: 'pte-intermediate', label: '📚 PTE Intermediate', dataset: 'pte-intermediate-vocabulary-with-ipa' }
]
```

**Impact:**
- Determines which vocabulary dataset is loaded
- Affects available categories and terms
- `pte-fib-listening`: 914 unique PTE FIB listening terms with IPA pronunciations
- `pte-beginner`: Beginner-level PTE vocabulary with IPA pronunciations
- `pte-intermediate`: Intermediate-level PTE vocabulary with IPA pronunciations
- All terms are classified as "normal" difficulty level

---

### 2. Content Filtering

#### **Category** (`categorySelect`)
Filters vocabulary by content category.

**Available Options:**
- `all-categories` - 🌟 All Categories (Default)
- `pte-fib-listening` - 🎧 FIB Listening

**Configuration:**
```javascript
categories: {
    'all-categories': '🌟 All Categories',
    'pte-fib-listening': '🎧 FIB Listening'
}
```

**Impact:**
- Filters the displayed vocabulary terms
- Updates the context bar display
- Affects word count and progression

#### **Level** (`difficultySelect`)
Filters vocabulary by difficulty level.

**Available Options:**
- `normal` - 🟡 Normal (All PTE Terms) (Default)

**Configuration:**
```javascript
difficulties: ['normal'] // All PTE terms are currently normal difficulty
```

**Impact:**
- All 885 PTE terms are classified as "normal" difficulty
- No filtering by difficulty level (all terms available)
- Consistent difficulty level for PTE exam preparation

---

### 3. Audio Settings

#### **Speed** (`speedSelect`)
Controls the speech synthesis rate for pronunciation.

**Available Options:**
- `0.7` - Slow (Default)
- `1.0` - Normal
- `1.3` - Fast

**Configuration:**
```javascript
speeds: {
    slow: 0.7,
    normal: 1.0,
    fast: 1.3
}
```

**Impact:**
- Affects how quickly words are pronounced
- Useful for different learning stages
- Slower speeds help with pronunciation accuracy

#### **Pause** (`delaySelect`)
Controls the delay between word pronunciations.

**Available Options:**
- `1000` - 1 sec
- `2000` - 2 sec (Default)
- `3000` - 3 sec
- `4000` - 4 sec

**Configuration:**
```javascript
delays: {
    short: 1000,
    normal: 2000,
    long: 3000,
    extended: 4000
}
```

**Impact:**
- Controls timing between repetitions
- Allows time for mental processing
- Longer pauses help with comprehension

#### **Repeat** (`repeatSelect`)
Controls the repetition pattern for vocabulary terms.

**Available Options:**
- `once` - 1x - Term Only (Default)
- `individual` - 2x - Slow+Normal
- `intensive` - 3x - Slow+Normal+Fast + Example
- `loop` - Loop + Examples

**Configuration:**
```javascript
repeatModes: ['once', 'individual', 'intensive', 'loop']
```

**Impact:**
- `once`: Single pronunciation of the term
- `individual`: Two pronunciations at different speeds
- `intensive`: Three pronunciations plus example sentence
- `loop`: Continuous loop with examples

#### **Voice** (`voiceSelect`)
Controls the text-to-speech voice selection.

**Available Options:**
- `auto` - 🎯 Auto (Best Match) (Default)

**Dynamic Voice Loading:**
The voice dropdown is populated dynamically based on available system voices, with priority given to:

**Configuration:**
```javascript
voices: {
    default: 'Google UK English Male',
    fallbacks: [
        'Microsoft James (en-AU)',
        'Google UK English Female',
        'Microsoft George (en-GB)',
        'Google US English Female'
    ]
}
```

**Impact:**
- Affects pronunciation accent and clarity
- Auto mode selects the best available voice
- Supports both British and American English variants

---

## Settings Persistence

### State Management
Settings are automatically saved and restored using multiple persistence layers:

1. **StateManager** (Primary)
   - Modern state management system
   - Stores settings in browser storage
   - Maintains session continuity

2. **Legacy Storage** (Fallback)
   - Direct localStorage access
   - Backward compatibility
   - Individual setting storage

### Persistence Flow
```javascript
// Settings are saved when changed
window.storage.setItem('category', selectedCategory);
window.storage.setItem('difficulty', selectedDifficulty);
window.storage.setItem('speechRate', selectedSpeed);
window.storage.setItem('delay', selectedDelay);
window.storage.setItem('repeatMode', selectedRepeat);
window.storage.setItem('preferredVoice', selectedVoice);
window.storage.setItem('learningMode', selectedMode);
```

### Settings Loading
```javascript
// Settings are loaded on initialization
const savedSettings = {
    category: window.storage.getItem('category') || 'all-categories',
    difficulty: window.storage.getItem('difficulty') || 'all',
    speed: window.storage.getItem('speechRate') || '0.7',
    delay: window.storage.getItem('delay') || '2000',
    repeat: window.storage.getItem('repeatMode') || 'once',
    voice: window.storage.getItem('preferredVoice') || 'auto',
    learningMode: window.storage.getItem('learningMode') || 'pte-fib-listening'
};
```

---

## Settings Integration

### Module Communication
Settings changes are communicated across modules through:

1. **Event Bus System**
   ```javascript
   window.eventBus.emit('settings:changed', {
       category: newCategory,
       difficulty: newDifficulty,
       // ... other settings
   });
   ```

2. **Direct Module Updates**
   ```javascript
   // Update vocabulary manager (legacy approach)
   window.pteVocabularyManager.setCategory(newCategory);
   window.pteVocabularyManager.setDifficulty(newDifficulty);
   window.pteVocabularyManager.setLearningMode(newMode);
   
   // Update vocabulary manager (recommended approach)
   const vocabManager = window.CCLApp.getModule('pteVocabularyManager');
   vocabManager.setCategory(newCategory);
   vocabManager.setDifficulty(newDifficulty);
   vocabManager.setLearningMode(newMode);
   ```

3. **Audio System Updates**
   ```javascript
   // Update TTS engine
   window.ttsEngine.setSpeechRate(newSpeed);
   window.audioControls.setDelay(newDelay);
   ```

### Real-time Updates
- Settings changes take effect immediately
- No page refresh required
- All modules are notified of changes
- UI updates reflect new settings instantly

---

## Advanced Features

### Pronunciation Toggle
- **British/American Toggle**: 🇬🇧/🇺🇸 button in context bar
- **Dynamic IPA Display**: Shows both British and American pronunciations
- **Phonetic Spellings**: Provides pronunciation guides
- **Real-time Switching**: Instant pronunciation change

### Keyboard Shortcuts
- `Space` - Play/Pause
- `Arrow Left` - Previous word
- `Arrow Right` - Next word
- `R` - Repeat current word
- `Escape` - Open/Close settings

### Accessibility Features
- **Screen Reader Support**: ARIA labels and live regions
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Supports system theme preferences
- **Focus Management**: Proper focus handling

---

## Configuration Management

### Centralized Configuration
All settings are managed through the centralized `AppConfig` system:

```javascript
// Access configuration (legacy approach)
const config = window.appConfig || new AppConfig();

// Access configuration (recommended approach)
const config = window.CCLApp.getModule('config');

// Get setting values
const defaultSpeed = config.get('tts.speeds.slow');
const availableVoices = config.get('tts.voices.fallbacks');
const repeatModes = config.get('tts.repeatModes');
const uiElements = config.get('ui.element');
```

### Dynamic Configuration
- Settings are loaded from configuration files
- No hardcoded values in the interface
- Easy to extend with new options
- Scalable architecture

---

## Troubleshooting

### Common Issues

1. **Settings Not Saving**
   - Check browser storage permissions
   - Verify StateManager initialization
   - Check console for errors

2. **Voice Not Working**
   - Verify TTS engine initialization
   - Check available system voices
   - Try different voice options

3. **Settings Not Applying**
   - Check module communication
   - Verify event bus functionality
   - Check for JavaScript errors

### Debug Tools
```javascript
// Check current settings
window.debugVocab.checkSettings();

// Reset all settings
window.debugVocab.resetSettings();

// Check module status
window.debugVocab.checkModules();
```

---

## Future Enhancements

### Planned Features
- **Custom Voice Upload**: Support for custom voice files
- **Advanced Filtering**: More granular content filtering
- **Learning Analytics**: Progress tracking and statistics
- **Export Settings**: Save/load settings profiles
- **Theme Customization**: User-defined color schemes

### Extensibility
The settings system is designed to be easily extensible:
- New settings can be added to `AppConfig`
- UI elements are dynamically generated
- Module communication is event-driven
- Persistence is handled automatically

---

## Technical Implementation

### Settings Panel Class
```javascript
class SettingsPanel {
    constructor() {
        this.isOpen = false;
        this.stateManager = null;
        this.setupSettingsPanel();
    }

    setupSettingsPersistence() {
        // Handle settings loading and saving
    }

    togglePanel() {
        // Open/close settings panel
    }

    applySettings() {
        // Apply settings to all modules
    }
}
```

### Event Handling
```javascript
// Settings change events
window.eventBus.on('settings:changed', (data) => {
    // Handle settings updates
});

// Voice preference changes
window.eventBus.on('voice:preferenceChanged', (data) => {
    // Update voice selection
});
```

This comprehensive settings system provides users with full control over their PTE vocabulary learning experience while maintaining a clean, accessible, and extensible architecture.
