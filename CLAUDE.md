# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

PTE Pronunciation Trainer - A specialized web-based pronunciation training application for PTE exam preparation with 914 FIB listening vocabulary terms, IPA guides, and text-to-speech with British/American pronunciation.

**✅ PTE-FOCUSED (Dec 2024)**: Architecture optimized exclusively for PTE vocabulary pronunciation training with centralized configuration and scalable design.

## Essential Commands

```bash
# 🎧 PTE-SPECIFIC COMMANDS:
npm run data:pte              # Process PTE FIB listening vocabulary
npm run start:pte             # Generate PTE data + start server
npm run deploy:pte            # Generate data + build + validate

# 📊 Data Generation:
npm run data:pte              # Process PTE FIB listening vocabulary
npm run data                  # Alias for data:pte

# 🔧 Development:
npm run dev                   # Start server at http://localhost:3000
npm run start:pte             # Data + dev (recommended)

# 🧪 Quality & Testing:
npm run lint                  # ESLint for JS + Stylelint for CSS
npm run test                  # Run Jest tests (jsdom environment)
npm run validate              # Validate vocabulary data

# 🚀 Production:
npm run build                 # Minify and build for production
npm run vercel-build:pte      # Vercel: PTE data + build (optimized)

# 🧹 Cleanup:
npm run clean                 # Remove dist/ data/generated/ data/processed/

# 🔍 Testing:
npm run test -- --testNamePattern="specific test"
npm run test -- --watch
npm run test -- --coverage
```

## Architecture

### 🎧 PTE Data Pipeline
```
data/source/pte/vocabs/pte-fib-listening-with-ipa.md → scripts/pte-data-pipeline.js → data/processed/pte-fib-listening-dataset.json → Browser
```
**✅ Focused Processing**: `npm run data:pte` processes only PTE vocabulary
**🔄 PTE Terms**: 914 FIB listening terms with British/American IPA pronunciations
**⚡ Performance**: Optimized pipeline for PTE vocabulary only

### 🆕 Module Architecture
```javascript
// NEW: Unified namespace (recommended for new code)
const vocab = window.CCLApp.getModule('pteVocabularyManager');
const config = window.CCLApp.getModule('config').get('tts.defaultVoice');

// LEGACY: Direct window access (still works, 100% backward compatible)
window.pteVocabularyManager.getCurrentWords();
window.eventBus.emit('vocabulary:loaded', data);
```

### 🆕 Centralized Configuration
```javascript
// All settings in one place with dot-notation access
window.CCLApp.getModule('config').get('tts.speeds.normal'); // 1.0
window.CCLApp.getModule('config').set('ui.theme', 'dark');
window.CCLApp.getModule('config').merge({ custom: { setting: 'value' } });
```

### Project Structure
```
src/js/
├── shared/         # Infrastructure modules
│   ├── AppNamespace.js      # Unified namespace
│   ├── Config.js            # Centralized configuration with inline constants
│   ├── DataSchema.js        # Standardized data formats
│   └── LegacyCompatibility.js # Compatibility layer
├── core/           # PTEApp.js, PTEVocabularyManager, ProgressTracker
├── audio/          # TTSEngine (British/American focus), VoiceSelector
├── ui/             # UIController, SettingsPanel (vocabulary switcher)
└── utils/          # EventBus, Storage (localStorage wrapper)

scripts/            # Build tools
├── pte-data-pipeline.js    # PTE-specific data pipeline
├── build.js                # Production build with minification
└── validate.js             # Data integrity validation

data/               # Organized data directories
├── processed/      # Standardized JSON datasets (PTE terms)
├── generated/      # JS data files (compatibility)
├── reports/        # Processing reports and validation results
└── source/         # Source data files
    └── pte/         # PTE vocabulary data
        └── vocabs/
            ├── pte-fib-listening-with-ipa.md  # 914 terms with IPA
            └── fib-listening-vocabulary.md    # Fallback terms
```

## Key Features

### PTE Vocabulary System
- **FIB Listening Terms**: 914 essential terms for PTE listening comprehension
- **IPA Pronunciation Guides**: British and American pronunciations with phonetic spellings
- **Smart Difficulty Classification**: Easy, Normal, Hard based on word complexity
- **Exam-Focused Content**: Curated specifically for PTE FIB questions
- **Comprehensive Coverage**: All essential vocabulary for PTE listening section

### Learning Modes
- **🎧 PTE FIB Listening**: Complete vocabulary set for listening comprehension
- **🌟 All Categories**: Complete PTE vocabulary collection

### Text-to-Speech Engine
- **British/American Focus**: UK and US voice options for professional settings
- **Voice Selection**: Google UK English Male (primary) with multiple fallbacks
- **Multiple Speeds**: Slow (0.7) → Normal (1.0) → Fast (1.3)
- **Repeat Modes**: 1x, 2x (Slow+Normal), 3x (Slow+Normal+Fast), Loop
- **Configurable Delays**: 1-4 seconds between pronunciations
- **IPA Visualization**: International Phonetic Alphabet notation for precise pronunciation

### Keyboard Shortcuts
- **Space**: Play/Pause pronunciation
- **Arrow Keys**: Navigate between words (← →)
- **R**: Repeat current word
- **F**: Toggle fullscreen
- **Esc**: Close settings panel

### Difficulty Classification
- **Easy (55%)**: Single words, common terms
- **Normal (31%)**: 2-3 word phrases, government terminology
- **Hard (14%)**: Complex multi-word terms, technical specialties

## Data Pipeline

### Input Sources
```markdown
# Processed by PTE data pipeline:
data/source/pte/vocabs/pte-fib-listening-with-ipa.md  # 914 terms with British/American IPA
data/source/pte/vocabs/fib-listening-vocabulary.md    # Fallback: Original terms
```

### Output Formats
```javascript
// Standardized JSON (primary)
{
  "metadata": {
    "generated": "2024-12-XX",
    "totalTerms": 914,
    "source": "pte-data-pipeline",
    "version": "1.0",
    "hasIPA": true
  },
  "vocabulary": [
    {
      "english": "obscure",
      "pronunciation": {
        "british": { "ipa": "əbˈskjʊə", "phonetic": "uhb-SKYOOR" },
        "american": { "ipa": "əbˈskjʊr", "phonetic": "uhb-SKYOOR" }
      },
      "difficulty": "normal",
      "category": "pte-fib-listening",
      "source": "pte-fib-listening-with-ipa"
    }
  ]
}
```

## Development Workflow

### Data Processing
```bash
# Process PTE-specific data
npm run data:pte

# Pipeline stages:
# 1. Extract: Parse pte-fib-listening-with-ipa.md
# 2. Process: Convert to standardized format with IPA
# 3. Generate: Create PTE-specific datasets
# 4. Validate: Check data integrity
# 5. Report: Generate processing reports
```

### Development Server
```bash
npm run start:pte      # Generate PTE data + Python HTTP server on :3000
npm run dev           # Server only (requires existing data)
```

### Production Build
```bash
npm run build          # Minify JS/CSS/HTML
npm run deploy:pte     # PTE data + build + validate
npm run vercel-build:pte # Optimized for Vercel deployment
```

## Testing

```bash
npm run test              # All Jest tests (jsdom environment)
npm run test -- --watch   # Watch mode for development
npm run test -- --coverage # Coverage report
npm run validate          # Data integrity validation
npm run lint             # ESLint (JS) + Stylelint (CSS)
```

**Test Configuration**:
- Environment: jsdom (browser simulation)
- Pattern: `**/tests/**/*.test.js`
- Coverage: `src/**/*.js`

## Module Registration

### New Architecture Pattern
All modules register with the unified namespace while maintaining backward compatibility:

```javascript
// Module pattern (all 18 modules follow this)
const moduleInstance = new ModuleClass();

// Register with new namespace
if (window.CCLApp) {
    window.CCLApp.registerModule('moduleName', moduleInstance);
}

// Legacy compatibility - maintain existing global reference
window.moduleName = moduleInstance;
```

### Available Modules
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

// Infrastructure
window.CCLApp.getModule('eventBus')
window.CCLApp.getModule('storage')
window.CCLApp.getModule('config')
window.CCLApp.getModule('dataSchema')
```

## Configuration Management

### Centralized Settings
```javascript
const config = window.CCLApp.getModule('config');

// TTS configuration
config.get('tts.defaultVoice')      // 'Google UK English Male'
config.get('tts.speeds.normal')     // 1.0
config.get('tts.delays.normal')     // 2000

// Vocabulary configuration
config.get('vocabulary.learningModes')  // Array of learning modes
config.get('vocabulary.categories')     // Category mappings

// UI configuration
config.get('ui.themes')             // ['light', 'dark', 'auto']
config.get('ui.shortcuts.playPause') // ' ' (space)
```

## Legacy Compatibility

### Guaranteed Backward Compatibility
- ✅ All existing `window.moduleName` references work unchanged
- ✅ All existing method calls work unchanged
- ✅ All existing event names work unchanged
- ✅ All existing npm commands work unchanged
- ✅ All existing data paths work unchanged
- ✅ All existing localStorage keys migrated automatically

### Migration Strategy
```javascript
// Option 1: Keep using existing patterns (no changes required)
window.pteVocabularyManager.getCurrentWords();
window.eventBus.emit('vocabulary:loaded', data);

// Option 2: Gradually adopt new patterns (optional, when convenient)
const vocab = window.CCLApp.getModule('pteVocabularyManager');
const words = vocab.getCurrentWords();
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No vocabulary loaded" | Run `npm run data:pte` to generate datasets |
| Server won't start | Ensure Python 3 installed: `python3 -m http.server 3000` |
| TTS not working | Use Chrome/Edge, check browser audio permissions |
| Build failures | Run `npm install`, ensure Node.js >= 16.0.0 |
| Data pipeline errors | Check input files in `data/source/` |
| Module not found | Verify module loading order in `index.html` |

## Deployment

### Vercel Configuration (`vercel.json`)
- Build: `npm run vercel-build` (data + build)
- Output: Static files from project root
- Caching: Smart cache headers for data vs code files

### Browser Support
- Chrome 90+ (recommended for TTS)
- Firefox 88+
- Safari 14+
- Edge 90+
- Requires Web Speech API for pronunciation features

## Important Development Notes

### Module Loading Order (Critical)
Modules must load in this specific order in `index.html`:

1. **Shared Infrastructure** (must load first)
   - AppNamespace.js, Config.js, DataSchema.js, LegacyCompatibility.js

2. **Utils** - EventBus, Storage, StateManager, CacheMigration

3. **Core** - VocabularyManager, ProgressTracker

4. **Data** - DialogueDataLoader, pronunciations

5. **Audio** - TTSEngine, VoiceSelector, AudioControls

6. **UI** - UIController, SettingsPanel

7. **App Coordinator** - App.js (must be last)

### Required Data Generation
The app requires data generation before first run:
```bash
npm run data:pte       # Required - generates all datasets
npm run start:pte      # Recommended - data + server
```

### Global Window Objects
Even with the new namespace, global references are maintained for compatibility:
```javascript
// Both patterns work:
window.CCLApp.getModule('pteVocabularyManager')  // New (recommended)
window.pteVocabularyManager                      // Legacy (still works)
```

---

**Architecture Status**: ✅ **STREAMLINED FOR PTE VOCABULARY**
**British/American Focus**: ✅ **DUAL PRONUNCIATION SUPPORT**
**Data Pipeline**: ✅ **PTE-SPECIFIC & OPTIMIZED**
**Module Registration**: ✅ **PTE VOCABULARY MODULES READY**