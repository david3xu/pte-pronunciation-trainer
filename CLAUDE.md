# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

✅ **FULLY IMPLEMENTED** - Advanced CCL (NAATI Credentialed Community Language) pronunciation training web application with:

### 🎯 Dual Vocabulary System
- **📚 Specialized Terms (1,618)** - Domain-specific CCL vocabulary across 6 domains  
- **💬 Conversation-Based (1,600)** - Practical terms from 2,018 real CCL exam sentences
- **🔄 Instant Switching** - Users can toggle between vocabulary sets in settings
- **📊 Advanced Analytics** - Multi-strategy matching and comprehensive reporting

### 🏗️ Architecture & Technology
- **Text-to-Speech pronunciation** with Australian English (en-AU) focus
- **Modular vanilla JavaScript** architecture - no bundlers, direct browser loading
- **Advanced data processing** - Separate data-processing module with multiple algorithms
- **Production-ready** with build system, validation, and deployment pipeline

## Critical Commands

```bash
# ALWAYS run these first when working with vocabulary:
npm run convert                        # Generate specialized vocabulary (1,618 terms)
npm run extract-conversations          # Extract conversation dialogues (2,018 sentences)
npm run extract-vocab-from-conversations  # Generate conversation vocabulary (1,600 terms)

# Development:
npm run dev                # Start server at http://localhost:3000
npm start                  # Alias: convert + dev

# Advanced Analysis:
npm run analyze-vocabulary    # Advanced vocabulary-conversation analysis with multiple strategies

# Build & Deploy:
npm run build      # Production build with minification
npm run validate   # Validate all vocabulary data
npm run deploy     # Full pipeline: build + validate

# Direct Script Access:
node scripts/validate.js                    # Data validation only
node data-processing/analyzers/vocabulary-conversation-analyzer.js  # Advanced analysis
node data-processing/extractors/conversation-vocabulary-extractor.js # Extract vocabulary
python3 -m http.server 3000 --directory .   # Start server manually
```

## High-Level Architecture

### Data Pipeline (Critical Path)
```
data/vocabulary/*.md → scripts/build-vocabulary.js → data/generated/vocabulary-data.js → Browser
```
**⚠️ The app CANNOT function without generated JS. Always run `npm run convert` after markdown changes.**

### Module Architecture Pattern
```javascript
// Vanilla JS with global exports for browser compatibility
class VocabularyManager { ... }
window.vocabularyManager = new VocabularyManager();

// Event-driven communication between modules
window.eventBus.emit('vocabulary:loaded', data);
window.eventBus.on('vocabulary:loaded', handler);
```

### Key Architectural Decisions
1. **No bundler** - Direct browser loading via `<script>` tags in index.html
2. **Coordinator pattern** - App.js orchestrates but doesn't contain business logic
3. **Event-driven** - Modules communicate via EventBus, not direct references
4. **Feature-based difficulty** - JSON rules in data/features/ classify vocabulary complexity
5. **Australian English focus** - en-AU TTS voices prioritized for NAATI CCL context

## Project Structure

### Main Application
```
src/js/
├── core/           # Business logic
│   ├── App.js             # Main coordinator (< 250 lines)
│   ├── VocabularyManager.js  # Dual vocabulary system (specialized + conversation)
│   └── ProgressTracker.js    # Learning progress and statistics
├── audio/          # TTS functionality  
│   ├── TTSEngine.js       # Speech synthesis with en-AU focus
│   ├── VoiceSelector.js   # Voice management
│   └── AudioControls.js   # Play/pause/repeat controls
├── ui/             # User interface
│   ├── UIController.js    # DOM manipulation and events
│   └── SettingsPanel.js   # Settings with vocabulary selector
└── utils/          # Shared utilities
    ├── EventBus.js        # Inter-module communication
    └── Storage.js         # LocalStorage wrapper
```

### Clean Directory Structure ✅
**Essential Build Tools** (`scripts/`) - 4 core files only:
- `build-vocabulary.js` - Generate specialized vocabulary data
- `extract-conversations.js` - Process conversation files
- `validate.js` - Data integrity validation  
- `build.js` - Production build system
  
**Current Analysis Reports** (`reports/`) - 7 active files:
- `advanced-vocabulary-analysis.*` - Latest multi-strategy analysis
- `vocabulary-extraction-comparison.md` - Approach comparison
- `conversation-extraction-report.*` - Processing statistics
- `validation-report.json` - Data validation results

**Outdated Files Removed** ❌:
- Legacy analysis scripts moved to `data-processing/`
- Duplicate/outdated reports cleaned up
- Demo file moved to `docs/` directory

### Advanced Data Processing
```
data-processing/
├── analyzers/      # Analysis tools
│   └── vocabulary-conversation-analyzer.js  # Multi-strategy matching analysis
├── extractors/     # Data extraction
│   └── conversation-vocabulary-extractor.js # Generate vocabulary from conversations
├── matchers/       # Matching algorithms
│   └── vocabulary-matcher.js               # Advanced matching with confidence scoring
├── config/         # Configuration
│   └── matching-config.js                  # Matching strategies and thresholds
└── utils/          # Processing utilities
    └── text-utils.js                       # Text normalization and analysis
```

## Vocabulary Data Structure

### Source Format (Markdown)
```markdown
# CCL-[Domain] 词汇表 (CCL-[Domain] Vocabulary)
## Terms in this set ([number])

| English                    | Chinese          |
| -------------------------- | ---------------- |
| Social welfare payment     | 社会福利金        |
```

### Generated Format (JavaScript)
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

### Difficulty Classification
- **🟢 Easy (55%)**: Single words, common terms
- **🟡 Normal (31%)**: 2-3 word phrases, government terminology
- **🔴 Hard (14%)**: Complex multi-word terms, technical specialties

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No vocabulary loaded" | Run `npm run convert` to generate data/generated/vocabulary-data.js |
| Server won't start | Ensure Python 3 installed, or use `python3 -m http.server 3000` |
| TTS not working | Use Chrome/Edge for best support, check browser audio permissions |
| Build failures | Run `npm install`, ensure Node.js >= 16.0.0 |
| File:// protocol errors | Must use HTTP server, not direct file opening |

## Key Features Implementation

### 🎯 Dual Vocabulary System
- **Settings Panel Integration**: Vocabulary selector in main settings UI
- **Dynamic Category Updates**: Categories change automatically when switching vocabulary sources
- **Real-time Statistics**: Shows coverage percentages and example availability
- **Persistent Settings**: User choice saved and restored across sessions

### 📊 Advanced Analytics
- **Multi-strategy Matching**: Exact phrase, keyword overlap, partial match, semantic similarity
- **Confidence Scoring**: Each match gets quality assessment (0.0-1.0)
- **Comprehensive Reporting**: JSON, Markdown, and CSV outputs for analysis
- **Performance Metrics**: Processing time and match quality statistics

### 🔧 Data Processing Pipeline
```
Specialized Path:    data/vocabulary/*.md → scripts/build-vocabulary.js → vocabulary-data.js
Conversation Path:   data/conversation/*.md → scripts/extract-conversations.js → conversation-data.js
                     → data-processing/extractors/conversation-vocabulary-extractor.js → conversation-vocabulary-data.js
Analysis Pipeline:   Both vocabularies → data-processing/analyzers/vocabulary-conversation-analyzer.js → comprehensive reports
```

## Generated Files Organization

### Core Data Files
- `data/generated/vocabulary-data.js` - Specialized vocabulary (1,618 terms)
- `data/generated/conversation-data.js` - Extracted conversations (126 conversations, 2,018 sentences)  
- `data/generated/conversation-vocabulary-data.js` - Conversation-based vocabulary (1,600 terms)

### Analysis Reports
- `reports/advanced-vocabulary-analysis.md` - Multi-strategy analysis results
- `reports/vocabulary-extraction-comparison.md` - Comparison between vocabulary approaches
- `reports/conversation-extraction-report.md` - Conversation processing statistics
- `reports/vocabulary-matches.csv` - Spreadsheet export for detailed analysis

## Important Constraints

1. **Australian Context**: All vocabulary targets Australian institutional contexts (Medicare, NAATI, Australian government)
2. **Simplified Chinese Only**: All Chinese translations must use Simplified characters
3. **No External Dependencies**: Vanilla JS only, no frameworks or bundlers in runtime
4. **Mobile-First**: Must work on devices 320px to 1400px+ width
5. **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
6. **Data Processing Separation**: Keep data processing tools in separate directory from main app