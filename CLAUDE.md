# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Professional Vocabulary Pronunciation Trainer - A specialized web-based pronunciation training application for professional vocabulary and AI/ML terminology with IPA guides and text-to-speech with British/American pronunciation.

**✅ STREAMLINED (Oct 2025)**: Architecture optimized exclusively for professional vocabulary pronunciation training.

## Essential Commands

```bash
# 🆕 RESUME-SPECIFIC COMMANDS:
npm run data:resume           # Process only resume & AI/ML data
npm run start:resume          # Generate resume data + start server
npm run deploy:resume         # Generate data + build + validate

# 📊 Data Generation:
npm run data:resume           # Process only resume & AI/ML terms
npm run extract-vocab         # Legacy support for backward compatibility

# 🔧 Development:
npm run dev                   # Start server at http://localhost:3000
npm run start:resume          # Data + dev (recommended)

# 🧪 Quality & Testing:
npm run lint                  # ESLint for JS + Stylelint for CSS
npm run test                  # Run Jest tests (jsdom environment)
npm run validate              # Validate vocabulary data

# 🚀 Production:
npm run build                 # Minify and build for production
npm run vercel-build:resume   # Vercel: resume data + build (optimized)

# 🧹 Cleanup:
npm run clean                 # Remove dist/ data/generated/ data/processed/

# 🔍 Testing:
npm run test -- --testNamePattern="specific test"
npm run test -- --watch
npm run test -- --coverage
```

## Architecture

### 🆕 Resume Data Pipeline
```
data/source/resume-terms.md + temp.md → scripts/resume-data-pipeline.js → data/processed/*.json → Browser
```
**✅ Focused Processing**: `npm run data:resume` processes only professional vocabulary
**🔄 Professional Terms**: Resume terms with IPA + AI/ML technical terminology
**⚡ Performance**: Optimized pipeline for professional vocabulary only

### 🆕 Module Architecture
```javascript
// NEW: Unified namespace (recommended for new code)
const vocab = window.CCLApp.getModule('vocabularyManager');
const config = window.CCLApp.getModule('config').get('tts.defaultVoice');

// LEGACY: Direct window access (still works, 100% backward compatible)
window.vocabularyManager.getCurrentWords();
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
├── core/           # ResumeApp.js, ResumeVocabularyManager, ProgressTracker
├── audio/          # TTSEngine (British/American focus), VoiceSelector
├── ui/             # UIController, SettingsPanel (vocabulary switcher)
└── utils/          # EventBus, Storage (localStorage wrapper)

scripts/            # Build tools
├── resume-data-pipeline.js # Resume-specific data pipeline
├── build.js                # Production build with minification
└── validate.js             # Data integrity validation

data/               # Organized data directories
├── processed/      # Standardized JSON datasets (resume terms)
├── generated/      # JS data files (compatibility)
├── reports/        # Processing reports and validation results
└── source/         # Source data files
    ├── resume-terms.md # Professional terms with IPA guides
    └── temp.md         # AI/ML terminology by category
```

## Key Features

### Professional Vocabulary System
- **Resume Terms**: 445+ professional terms with IPA pronunciation guides
- **AI/ML Terminology**: 150+ technical terms organized by category
- **Phonetic Guides**: Intuitive pronunciation with "sounds like" descriptions
- **British/American Variants**: Side-by-side pronunciation comparison
- **Technical Focus**: Specialized vocabulary for professional settings
- **Category Organization**: Foundation Terms, MLOps, NLP, Computer Vision, etc.

### Learning Modes
- **💼 Resume Terms**: Professional vocabulary with IPA pronunciation guides
- **🤖 AI/ML Terms**: Cutting-edge technical terminology by category
- **🌟 All Professional Terms**: Complete professional vocabulary collection

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
# Processed by resume data pipeline:
data/source/resume-terms.md      # IPA pronunciation guides with British/American variants
data/source/temp.md              # AI/ML terminology by category with definitions
```

### Output Formats
```javascript
// Standardized JSON (primary)
{
  "metadata": {
    "generated": "2025-10-04T08:45:12Z",
    "totalTerms": 445,
    "source": "resume-data-pipeline",
    "version": "3.0"
  },
  "vocabulary": [
    {
      "english": "artificial intelligence",
      "ipa_uk": "/ˌɑːtɪˈfɪʃəl ɪnˈtelɪdʒəns/",
      "phonetic_uk": "AH-tih-FISH-uhl in-TELL-ih-juhns",
      "ipa_us": "/ˌɑːrtɪˈfɪʃəl ɪnˈtɛlɪdʒəns/",
      "phonetic_us": "AR-tih-FISH-uhl in-TELL-ih-juhns",
      "difficulty": "hard",
      "category": "foundation-terms",
      "definition": "Field enabling computers to perform tasks requiring human intelligence",
      "source": "resume-terms",
      "id": "artificial-intelligence"
    }
  ]
}
```

## Development Workflow

### Data Processing
```bash
# Process resume-specific data
npm run data:resume

# Pipeline stages:
# 1. Extract: Parse resume-terms.md and temp.md
# 2. Process: Convert to standardized format
# 3. Generate: Create resume-specific datasets
# 4. Validate: Check data integrity
# 5. Legacy: Create JS compatibility files
```

### Development Server
```bash
npm run start:resume  # Generate resume data + Python HTTP server on :3000
npm run dev           # Server only (requires existing data)
```

### Production Build
```bash
npm run build          # Minify JS/CSS/HTML
npm run deploy:resume  # Resume data + build + validate
npm run vercel-build:resume # Optimized for Vercel deployment
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
window.CCLApp.getModule('vocabularyManager')
window.CCLApp.getModule('progressTracker')
window.CCLApp.getModule('cclApp')

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
window.vocabularyManager.getCurrentWords();
window.eventBus.emit('vocabulary:loaded', data);

// Option 2: Gradually adopt new patterns (optional, when convenient)
const vocab = window.CCLApp.getModule('vocabularyManager');
const words = vocab.getCurrentWords();
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No vocabulary loaded" | Run `npm run data` (new) or `npm run extract-vocab` (legacy) |
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
npm run data    # Required - generates all datasets
npm run start   # Recommended - data + server
```

### Global Window Objects
Even with the new namespace, global references are maintained for compatibility:
```javascript
// Both patterns work:
window.CCLApp.getModule('vocabularyManager')  // New (recommended)
window.vocabularyManager                      // Legacy (still works)
```

---

**Architecture Status**: ✅ **STREAMLINED FOR PROFESSIONAL VOCABULARY**
**British/American Focus**: ✅ **DUAL PRONUNCIATION SUPPORT**
**Data Pipeline**: ✅ **RESUME-SPECIFIC & OPTIMIZED**
**Module Registration**: ✅ **PROFESSIONAL VOCABULARY MODULES READY**