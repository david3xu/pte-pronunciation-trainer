# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

CCL (NAATI Credentialed Community Language) pronunciation training web application with dual vocabulary system and Australian English text-to-speech focus.

## Essential Commands

```bash
# Data Generation (REQUIRED before running):
npm run extract-vocab                    # Generate conversation vocabulary (937 terms)

# Development:
npm run dev                   # Start server at http://localhost:3000
npm start                     # Alias: extract-vocab + dev

# Quality & Testing:
npm run lint                  # ESLint for JS + Stylelint for CSS
npm run test                  # Run Jest tests
npm run validate              # Validate all vocabulary data

# Production:
npm run build                 # Minify and build for production
npm run deploy                # Full pipeline: build + validate
npm run vercel-build          # Vercel deployment: extract-vocab + build

# Cleanup:
npm run clean                 # Remove dist/ and data/generated/

# Single Test:
npm run test -- --testNamePattern="specific test"   # Run specific test
npm run test -- --watch       # Watch mode
npm run test -- --coverage    # Coverage report
```

## Architecture

### Data Pipeline (Critical)
```
data-processing/extractors/merged-70241-70158.md (with _xxx_ highlights) → scripts/conversation-vocabulary-extractor.js → data/generated/conversation-vocabulary-data.js → Browser
```
**⚠️ App requires generated JS files. Run `npm run extract-vocab` before starting.**

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

scripts/            # Build tools (3 files) 
├── conversation-vocabulary-extractor.js # Extract _xxx_ highlighted terms from merged file
├── validate.js             # Data integrity validation
└── build.js               # Production build with minification
```

## Key Features

### Conversation-Based Vocabulary
- **Practical Terms**: 937 terms extracted from manually highlighted (_xxx_) key phrases in real CCL conversations
- **Contextual Examples**: All vocabulary includes bilingual example sentences from source dialogues  
- **Real-world Usage**: Terms selected from actual NAATI CCL test scenarios
- **Category Organization**: Organized across 6 domains (social-welfare, education, legal-government, business-finance, medical-healthcare, travel-immigration)

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
| "No vocabulary loaded" | Run `npm run extract-vocab` |
| Server won't start | Ensure Python 3 installed, or use `python3 -m http.server 3000` |
| TTS not working | Use Chrome/Edge, check browser audio permissions |
| Build failures | Run `npm install`, ensure Node.js >= 16.0.0 |
| Lint errors | Run `npm run lint` to check, follow ESLint/Stylelint rules |

## Deployment Configuration

### Vercel Deployment
The project includes `vercel.json` configuration:
- Build command: `npm run extract-vocab && npm run build`
- Uses `@vercel/static-build` buildpack
- Output directory: `dist/`
- Static site deployment with pre-generated vocabulary data
- Production build pipeline: `npm run vercel-build` (extract-vocab + build)

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
The app will NOT work without this file in data/generated/:
- `conversation-vocabulary-data.js` (from `npm run extract-vocab`)

### Testing Setup
- Tests use jsdom environment (configured in package.json)
- Test directory: `/tests/` (currently empty - no test files exist yet)
- Coverage collection from `src/**/*.js`
- Jest configuration includes test pattern matching for `**/tests/**/*.test.js`
- ESLint configuration: ES2021, browser environment, semicolons required
- Stylelint configuration: Standard config, 2-space indentation, single quotes