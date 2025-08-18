# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

CCL (NAATI Credentialed Community Language) pronunciation training web application with dual vocabulary system and Australian English text-to-speech focus.

## Essential Commands

```bash
# Data Generation (REQUIRED before running):
npm run convert                          # Generate specialized vocabulary (1,618 terms)
npm run extract-vocab-from-conversations # Generate conversation vocabulary (1,624 terms)

# Development:
npm run dev                   # Start server at http://localhost:3000
npm start                     # Alias: convert + dev

# Optional Data Processing:
npm run extract-conversations            # Extract conversation dialogues (legacy - raw data exists)

# Quality & Testing:
npm run lint                  # ESLint for JS + Stylelint for CSS
npm run test                  # Run Jest tests
npm run validate              # Validate all vocabulary data

# Production:
npm run build                 # Minify and build for production
npm run deploy                # Full pipeline: build + validate
npm run vercel-build          # Vercel deployment: convert + extract + build

# Cleanup:
npm run clean                 # Remove dist/ and data/generated/

# Analysis:
npm run analyze-vocabulary    # Advanced vocabulary-conversation analysis
npm run extract-smart-vocab   # Additional vocabulary processing script

# Single Test:
npm run test -- --testNamePattern="specific test"   # Run specific test
npm run test -- --watch       # Watch mode
npm run test -- --coverage    # Coverage report
```

## Architecture

### Data Pipeline (Critical)
```
data/vocabulary/*.md → scripts/build-vocabulary.js → data/generated/vocabulary-data.js → Browser
data-processing/extractors/merged-70241-70158.md (with _xxx_ highlights) → scripts/conversation-vocabulary-extractor.js → data/generated/conversation-vocabulary-data.js → Browser
```
**⚠️ App requires generated JS files. Run both `npm run convert` and `npm run extract-vocab-from-conversations` to enable dual vocabulary system.**

### Module Pattern
```javascript
// Vanilla JS with window exports (no bundler)
class VocabularyManager { ... }
window.vocabularyManager = new VocabularyManager();

// Event-driven communication
window.eventBus.emit('vocabulary:loaded', data);
window.eventBus.on('vocabulary:loaded', handler);
```

### Project Structure
```
src/js/
├── core/           # App.js coordinator, VocabularyManager, ProgressTracker
├── audio/          # TTSEngine (en-AU focus), VoiceSelector, AudioControls
├── ui/             # UIController, SettingsPanel (vocabulary switcher)
└── utils/          # EventBus, Storage (localStorage wrapper)

scripts/            # Build tools (5 files) 
├── build-vocabulary.js     # Generate specialized vocabulary from markdown
├── conversation-vocabulary-extractor.js # Extract _xxx_ highlighted terms from merged file
├── extract-conversations.js # Legacy: Process individual conversation files  
├── validate.js             # Data integrity validation
└── build.js               # Production build with minification
```

## Key Features

### Dual Vocabulary System
- **Specialized Terms**: 1,618 domain-specific terms from markdown files across 6 domains
- **Conversation-Based**: Terms extracted from manually highlighted (_xxx_) key phrases in real CCL conversations
- **Settings Toggle**: Users can switch between vocabulary sources in settings panel
- **Contextual Examples**: Conversation vocabulary includes bilingual example sentences from source dialogues
- **Persistent Choice**: Vocabulary source preference saved in localStorage

### Text-to-Speech
- Australian English (en-AU) voices prioritized for NAATI context
- Multiple playback speeds (slow → normal → fast progression)
- Repeat modes with configurable intervals (2-5 seconds)
- Auto-play functionality for hands-free practice

### Keyboard Shortcuts
- Space: Play/Pause pronunciation
- Arrow keys: Navigate between words
- R: Repeat current word
- Esc: Close settings panel

### Difficulty Classification
- Easy (55%): Single words, common terms
- Normal (31%): 2-3 word phrases, government terminology  
- Hard (14%): Complex multi-word terms, technical specialties

## Data Formats

### Input (Markdown)
```markdown
# CCL-[Domain] 词汇表 (CCL-[Domain] Vocabulary)
| English                | Chinese      |
| ---------------------- | ------------ |
| Social welfare payment | 社会福利金    |
```

### Output (JavaScript)

Specialized Vocabulary:
```javascript
window.vocabularyData = {
  categories: {
    "social-welfare": {
      name: "Social Welfare",
      words: [
        { english: "Social welfare payment", chinese: "社会福利金", difficulty: "easy" }
      ]
    }
  }
}
```

Conversation Vocabulary:
```javascript
window.conversationVocabularyData = {
  vocabulary: [
    {
      english: "crew",
      chinese: "施工队",
      difficulty: "easy",
      example: "The crew has now finished the walls, floors, and doors.",
      exampleChinese: "施工队/工人们现在已经做完墙壁、地板和门了。",
      category: "business-finance",
      conversationId: "70241"
    }
  ]
}
```

## Testing

```bash
npm run test              # Run all Jest tests
npm run test -- --watch   # Watch mode
npm run test -- --coverage # Coverage report
```

Tests located in `tests/` directory, using jsdom environment.

## Common Issues

| Issue | Solution |
|-------|----------|
| "No vocabulary loaded" | Run `npm run convert` and `npm run extract-vocab-from-conversations` |
| Server won't start | Ensure Python 3 installed, or use `python3 -m http.server 3000` |
| TTS not working | Use Chrome/Edge, check browser audio permissions |
| Build failures | Run `npm install`, ensure Node.js >= 16.0.0 |
| Lint errors | Run `npm run lint` to check, follow ESLint/Stylelint rules |

## Deployment Configuration

### Vercel Deployment
The project includes `vercel.json` configuration:
- Build command: `npm run convert && npm run build` (automatically runs both data generation steps)
- Uses `@vercel/static-build` buildpack
- Output directory: `dist/`
- Static site deployment with pre-generated vocabulary data
- Production build pipeline: `npm run vercel-build` (convert + extract + build)

### Local Development Server
- Default: Python 3 HTTP server on port 3000
- Alternative: `python3 -m http.server 3000` if npm script fails
- All assets served from project root

## Constraints

1. **No frameworks/bundlers**: Vanilla JS only, direct browser loading
2. **Australian context**: Medicare, NAATI, Australian government terminology
3. **Simplified Chinese**: All translations use Simplified characters
4. **Mobile-first**: 320px to 1400px+ responsive design
5. **Browser support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
6. **Web Speech API required**: TTS functionality depends on browser support

## Important Development Notes

### Module Loading Order
Modules must be loaded in this specific order in index.html:
1. EventBus and Storage (utils)
2. Core modules (VocabularyManager, ProgressTracker) 
3. Audio modules (TTSEngine, VoiceSelector, AudioControls)
4. UI modules (UIController, SettingsPanel)
5. App coordinator (App.js) - must be last

### Global Window Objects
All modules attach to window for cross-module communication:
- `window.eventBus` - Central event system
- `window.vocabularyManager` - Data management
- `window.audioControls` - Playback control
- `window.ttsEngine` - Speech synthesis
- `window.cclApp` - Main app instance

### Required Data Generation
The app will NOT work without these files in data/generated/:
- `vocabulary-data.js` (from `npm run convert`)
- `conversation-vocabulary-data.js` (from `npm run extract-vocab-from-conversations`)

### Testing Setup
- Tests use jsdom environment (configured in package.json)
- Test directory: `/tests/` (currently empty - no test files exist yet)
- Coverage collection from `src/**/*.js`
- Jest configuration includes test pattern matching for `**/tests/**/*.test.js`
- ESLint configuration: ES2021, browser environment, semicolons required
- Stylelint configuration: Standard config, 2-space indentation, single quotes