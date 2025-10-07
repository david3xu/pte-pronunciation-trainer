# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

PTE Pronunciation Trainer - A comprehensive web-based PTE exam preparation application with 4 practice modes: Vocabulary (914 FIB terms), Repeat Sentence (1,912 sentences), Answer Short Question (383 questions), and Write From Dictation (1,195 sentences). Features IPA pronunciation guides, text-to-speech with British/American voices, and interactive practice modes.

**✅ PHASE 2 COMPLETE (Oct 2025)**: Unified practice mode architecture with 4 PTE question types, 0% CSS duplication, and 5,687 total practice items across 6 datasets.

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

### 🆕 Module Architecture (Phase 2 Enhanced)
```javascript
// Unified namespace (recommended for new code)
const vocab = window.CCLApp.getModule('pteVocabularyManager');
const practiceModes = window.CCLApp.getModule('practiceModes'); // NEW: Phase 2
const datasetManager = window.CCLApp.getModule('datasetManager'); // NEW: Phase 2
const config = window.CCLApp.getModule('config').get('tts.defaultVoice');

// LEGACY: Direct window access (100% backward compatible)
window.pteVocabularyManager.getCurrentWords();
window.practiceModes.initializePracticeMode('repeat-sentence'); // NEW
window.datasetManager.loadDataset('answer-short-question'); // NEW
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
│   ├── Config.js            # Centralized configuration
│   ├── DataSchema.js        # Standardized data formats
│   └── LegacyCompatibility.js # Compatibility layer
├── core/           # PTEApp.js, PTEVocabularyManager, ProgressTracker
├── audio/          # TTSEngine (British/American), VoiceSelector, AudioControls
├── data/           # 🆕 DatasetManager (Phase 2) - Unified dataset loader
├── ui/             # UIController, SettingsPanel, 🆕 PracticeModes (Phase 2)
└── utils/          # EventBus, Storage, StateManager

src/css/            # 🆕 Phase 2: Modular CSS Architecture
├── variables.css       # 222 design tokens (colors, spacing, shadows)
├── animations.css      # Centralized keyframes (0 duplication)
├── components.css      # Reusable BEM components
├── style.css           # Main layout & structure
├── practice-modes.css  # RS/ASQ/WFD specific styles
└── responsive.css      # Media queries

scripts/            # Build tools
├── pte-data-pipeline.js    # PTE-specific data pipeline
├── build.js                # Production build with minification
└── validate.js             # Data integrity validation

data/               # Organized data directories
├── processed/      # Standardized JSON datasets (6 types)
│   ├── pte-fib-listening-dataset.json      # 914 vocabulary terms
│   ├── pte-beginner-vocabulary.json        # 620 beginner words
│   ├── pte-intermediate-vocabulary.json    # 692 intermediate words
│   ├── pte-repeat-sentence-dataset.json    # 🆕 1,912 RS sentences
│   ├── pte-answer-short-question-dataset.json # 🆕 383 ASQ questions
│   └── pte-write-from-dictation-dataset.json  # 🆕 1,195 WFD sentences
├── generated/      # JS data files (legacy compatibility)
├── reports/        # Processing reports and validation results
└── source/         # Source data files
    └── pte/         # PTE vocabulary & practice data
        ├── vocabs/  # Vocabulary markdown files
        ├── rs/      # 🆕 Repeat Sentence data
        ├── asq/     # 🆕 Answer Short Question data
        └── wfd/     # 🆕 Write From Dictation data
```

## Key Features

### PTE Vocabulary System
- **FIB Listening Terms**: 914 essential terms for PTE listening comprehension
- **IPA Pronunciation Guides**: British and American pronunciations with phonetic spellings
- **Smart Difficulty Classification**: Easy, Normal, Hard based on word complexity
- **Exam-Focused Content**: Curated specifically for PTE FIB questions
- **Comprehensive Coverage**: All essential vocabulary for PTE listening section

### Practice Modes (Phase 2)
- **📚 Vocabulary**: 914 FIB listening terms with IPA pronunciation (Beginner/Intermediate/Advanced)
- **🎤 Repeat Sentence (RS)**: 1,912 sentences - Record & compare your pronunciation
- **❓ Answer Short Question (ASQ)**: 383 questions - Quick answer validation with fuzzy matching
- **✍️ Write From Dictation (WFD)**: 1,195 sentences - Dictation practice with word-by-word feedback

**Total Practice Items**: 5,687 across 6 datasets

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

// Data modules (Phase 2)
window.CCLApp.getModule('datasetManager')      // 🆕 Unified dataset loader

// UI modules
window.CCLApp.getModule('uiController')
window.CCLApp.getModule('settingsPanel')
window.CCLApp.getModule('practiceModes')       // 🆕 RS/ASQ/WFD controller

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
| Practice mode not loading | Check DatasetManager initialized, datasets in `data/processed/` |
| Recording not working (RS) | Grant microphone permission, use HTTPS or localhost |
| WFD comparison incorrect | Check text normalization (case-insensitive, punctuation ignored) |

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

4. **Data** - DatasetManager (Phase 2), DialogueDataLoader, pronunciations

5. **Audio** - TTSEngine, VoiceSelector, AudioControls

6. **UI** - UIController, SettingsPanel, PracticeModes (Phase 2)

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

**Architecture Status**: ✅ **PHASE 2 COMPLETE - PRODUCTION READY**
**Practice Modes**: ✅ **4 MODES (Vocabulary + RS + ASQ + WFD)**
**CSS Architecture**: ✅ **0% DUPLICATION, 222 DESIGN TOKENS**
**Data Pipeline**: ✅ **6 DATASETS, 5,687 TOTAL ITEMS**
**Module Registration**: ✅ **ALL MODULES REGISTERED & TESTED**