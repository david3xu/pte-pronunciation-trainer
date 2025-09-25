# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

CCL (NAATI Credentialed Community Language) pronunciation training web application with conversation-based vocabulary system and Australian English text-to-speech focus.

**✅ FULLY REFACTORED (Dec 2024)**: Complete architectural improvements implemented with 100% backward compatibility.

## Essential Commands

```bash
# 🆕 UNIFIED COMMANDS (Recommended):
npm run data                  # Single data pipeline (replaces 11 scripts)
npm run start                 # Generate data + start server
npm run deploy                # Generate data + build + validate

# 📊 Data Generation:
npm run data                  # NEW: Unified pipeline (0.23s, all sources)
npm run data:legacy           # Legacy: Multiple scripts pipeline

# 🔧 Development:
npm run dev                   # Start server at http://localhost:3000
npm start                     # NEW: data + dev (recommended)
npm run start:legacy          # Legacy: process-all-data + dev

# 🧪 Quality & Testing:
npm run lint                  # ESLint for JS + Stylelint for CSS
npm run test                  # Run Jest tests (jsdom environment)
npm run validate              # Validate all vocabulary data

# 🚀 Production:
npm run build                 # Minify and build for production
npm run vercel-build          # Vercel: data + build (auto-deploy)

# 🧹 Cleanup:
npm run clean                 # Remove dist/ data/generated/ data/processed/

# 🔍 Testing:
npm run test -- --testNamePattern="specific test"
npm run test -- --watch
npm run test -- --coverage
```

## Architecture

### 🆕 Unified Data Pipeline
```
data-processing/extractors/*.md → scripts/unified-data-pipeline.js → data/processed/*.json → Browser
```
**✅ Single Command**: `npm run data` generates all datasets with validation and reporting
**🔄 Legacy Support**: Old pipeline available via `npm run data:legacy`
**⚡ Performance**: 0.23s processing time, 8,591+ items, 0 errors

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
├── shared/         # 🆕 Infrastructure modules
│   ├── AppNamespace.js      # Unified namespace (1 vs 15+ globals)
│   ├── Config.js            # Centralized configuration
│   ├── DataSchema.js        # Standardized data formats
│   └── LegacyCompatibility.js # 100% backward compatibility
├── core/           # App.js coordinator, VocabularyManager, ProgressTracker
├── audio/          # TTSEngine (en-AU focus), VoiceSelector, AudioControls
├── ui/             # UIController, SettingsPanel (vocabulary switcher)
└── utils/          # EventBus, Storage (localStorage wrapper)

scripts/            # Simplified build tools
├── unified-data-pipeline.js # 🆕 Single data pipeline (886 lines)
├── conversation-vocabulary-extractor.js # Legacy support
├── build.js               # Production build with minification
└── validate.js            # Data integrity validation

data/               # Organized data directories
├── processed/      # 🆕 Standardized JSON datasets (primary)
├── generated/      # Legacy JS data files (compatibility)
└── conversation/   # Raw conversation data
```

## Key Features

### Conversation-Based Vocabulary System
- **Comprehensive**: 2,831 terms from 96 real CCL conversations
- **Unfamiliar Words**: 2,360 curated challenging terms
- **Resume Terms**: 445 professional terms with IPA pronunciation guides
- **Words Dataset**: 2,955 terms from dialogue analysis
- **Contextual Examples**: Full bilingual example sentences
- **Category Organization**: Group-based (240s, 230s, etc.) + domain classification

### Learning Modes
- **📚 Vocabulary Focus**: Complete vocabulary from all dialogues
- **💬 Dialogue Practice**: Full conversation sentences with contextual flow
- **🔥 Unfamiliar Words**: Curated challenging vocabulary for advanced study
- **📝 Words Practice**: Dialogue-based word lists
- **💼 Resume Terms**: Professional pronunciation with IPA guides

### Text-to-Speech Engine
- **Australian English Priority**: en-AU voices for NAATI context
- **Voice Selection**: Google UK English Male (default) → Microsoft James (en-AU) → fallbacks
- **Multiple Speeds**: Slow (0.7) → Normal (1.0) → Fast (1.3)
- **Repeat Modes**: 1x, 2x (Slow+Normal), 3x (Slow+Normal+Fast), Loop
- **Configurable Delays**: 1-4 seconds between pronunciations

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
# Processed by unified pipeline:
data-processing/extractors/merged-conversations.md    # Highlighted _term_ extraction
data-processing/extractors/unfamilar-words.md       # Dialogue ID + term lists
data-processing/vocabulary-clean.md                 # Table format extraction
data-processing/words.md                            # Simple word lists
data-processing/english-chinese-word-pairs.md       # Bilingual pairs
data-processing/resume-terms.md                     # IPA pronunciation guides
```

### Output Formats
```javascript
// Standardized JSON (primary)
{
  "metadata": {
    "generated": "2024-12-25T19:52:00Z",
    "totalTerms": 2831,
    "source": "unified-pipeline-conversations",
    "version": "2.0"
  },
  "vocabulary": [
    {
      "english": "crew",
      "chinese": "施工队",
      "difficulty": "easy",
      "category": "business-finance",
      "example": "The crew has finished the walls, floors, and doors.",
      "exampleChinese": "施工队已经完成了墙壁、地板和门。",
      "conversationId": "70241",
      "sentenceId": "3",
      "source": "conversations",
      "id": "crew"
    }
  ]
}
```

## Development Workflow

### Data Processing
```bash
# Single command for all data sources
npm run data

# Pipeline stages:
# 1. Extract: Parse all markdown sources
# 2. Standardize: Convert to unified format
# 3. Generate: Create specialized datasets
# 4. Validate: Check data integrity
# 5. Legacy: Create JS compatibility files
```

### Development Server
```bash
npm run start    # Generate data + Python HTTP server on :3000
npm run dev      # Server only (requires existing data)
```

### Production Build
```bash
npm run build         # Minify JS/CSS/HTML
npm run deploy        # Data + build + validate
npm run vercel-build  # Optimized for Vercel deployment
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
| Data pipeline errors | Check input files in `data-processing/extractors/` |
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

**Architecture Status**: ✅ **FULLY REFACTORED**
**Backward Compatibility**: ✅ **100% GUARANTEED**
**Data Pipeline**: ✅ **UNIFIED & TESTED**
**Module Registration**: ✅ **ALL 18 MODULES UPDATED**