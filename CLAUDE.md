# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

CCL (NAATI Credentialed Community Language) pronunciation training web application with dual vocabulary system and Australian English text-to-speech focus.

## Essential Commands

```bash
# Data Generation (REQUIRED before running):
npm run convert                          # Generate specialized vocabulary (1,618 terms)
npm run extract-conversations            # Extract conversation dialogues (2,018 sentences)
npm run extract-vocab-from-conversations # Generate conversation vocabulary (1,600 terms)
npm run extract-smart-vocab              # Smart vocabulary extraction algorithm

# Development:
npm run dev                   # Start server at http://localhost:3000
npm start                     # Alias: convert + dev

# Quality & Testing:
npm run lint                  # ESLint for JS + Stylelint for CSS
npm run test                  # Run Jest tests
npm run validate              # Validate all vocabulary data

# Production:
npm run build                 # Minify and build for production
npm run deploy                # Full pipeline: build + validate
npm run vercel-build          # Vercel deployment: convert + build

# Cleanup:
npm run clean                 # Remove dist/ and data/generated/

# Analysis:
npm run analyze-vocabulary    # Advanced vocabulary-conversation analysis
```

## Architecture

### Data Pipeline (Critical)
```
data/vocabulary/*.md → scripts/build-vocabulary.js → data/generated/vocabulary-data.js → Browser
data/conversation/*.md → scripts/extract-conversations.js → data/generated/conversation-data.js
```
**⚠️ App requires generated JS files. Always run `npm run convert` after markdown changes.**

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

scripts/            # Build tools (4 files)
├── build-vocabulary.js     # Generate specialized vocabulary
├── extract-conversations.js # Process conversation files
├── validate.js             # Data integrity checks
└── build.js               # Production build with minification
```

## Key Features

### Dual Vocabulary System
- **Specialized Terms**: 1,618 domain-specific terms from markdown files
- **Conversation-Based**: 1,600 terms extracted from 2,018 real CCL sentences
- **Settings Toggle**: Users switch between vocabularies in settings panel
- **Persistent Choice**: Saved in localStorage

### Text-to-Speech
- Australian English (en-AU) voices prioritized for NAATI context
- Multiple playback speeds and repeat modes
- Auto-play with configurable intervals (2-5 seconds)

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
| "No vocabulary loaded" | Run `npm run convert` to generate vocabulary-data.js |
| Server won't start | Ensure Python 3 installed, or use `python3 -m http.server 3000` |
| TTS not working | Use Chrome/Edge, check browser audio permissions |
| Build failures | Run `npm install`, ensure Node.js >= 16.0.0 |
| Lint errors | Run `npm run lint` to check, follow ESLint/Stylelint rules |

## Constraints

1. **No frameworks/bundlers**: Vanilla JS only, direct browser loading
2. **Australian context**: Medicare, NAATI, Australian government terminology
3. **Simplified Chinese**: All translations use Simplified characters
4. **Mobile-first**: 320px to 1400px+ responsive design
5. **Browser support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+