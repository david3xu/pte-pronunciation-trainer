# CCL Pronunciation Trainer - Complete Project Structure

*Last Updated: August 2025*

## 📁 Directory Structure

```
ccl-pronunciation-trainer/
├── 📄 Core Documentation
│   ├── README.md                    # User documentation with feature overview
│   ├── CLAUDE.md                    # Claude Code development guidance  
│   ├── PROJECT-STRUCTURE.md         # This file - complete project organization
│   └── package.json                 # Node.js project configuration with all scripts
│
├── 🎯 Main Application
│   ├── index.html                   # Main app entry point with vocabulary selector UI
│   └── src/                         # Application source code
│       ├── js/                      # JavaScript modules (vanilla ES6+)
│       │   ├── core/               # Core business logic
│       │   │   ├── App.js          # Main app coordinator (< 250 lines)
│       │   │   ├── VocabularyManager.js  # Dual vocabulary system management
│       │   │   └── ProgressTracker.js    # Learning progress and statistics
│       │   ├── audio/              # Text-to-Speech functionality
│       │   │   ├── TTSEngine.js    # Speech synthesis (Australian English focus)
│       │   │   ├── VoiceSelector.js     # Voice management and selection
│       │   │   └── AudioControls.js     # Play/pause/repeat controls
│       │   ├── ui/                 # User interface components
│       │   │   ├── UIController.js # DOM manipulation and events
│       │   │   └── SettingsPanel.js     # Settings panel with vocabulary selector
│       │   └── utils/              # Shared utilities
│       │       ├── EventBus.js     # Inter-module communication
│       │       └── Storage.js      # LocalStorage persistence
│       └── css/                    # Stylesheets (modular CSS)
│           ├── style.css           # Main styles with vocabulary selector styling
│           ├── components.css      # Component-specific styles
│           └── responsive.css      # Mobile-responsive design
│
├── 🗂️ Data Management
│   └── data/
│       ├── vocabulary/             # Source vocabulary files (6 domains)
│       │   ├── ccl-social-welfare-vocabulary.md      # 201 terms
│       │   ├── ccl-education-vocabulary.md           # 308 terms  
│       │   ├── ccl-legal-government-vocabulary.md    # 300 terms
│       │   ├── ccl-business-finance-vocabulary.md    # 200 terms
│       │   ├── ccl-medical-healthcare-vocabulary.md  # 346 terms
│       │   └── ccl-travel-immigration-vocabulary.md  # 263 terms
│       ├── conversation/           # Real CCL exam conversation materials
│       │       ├── images/         # Page images (600+ JPEG files)
│       │       └── *.md           # 77 conversation markdown files
│       ├── features/              # Vocabulary classification rules
│       │   ├── difficulty.json    # Manual difficulty overrides
│       │   └── word-types.json    # Word type classification
│       └── generated/             # AUTO-GENERATED - Do not edit manually
│           ├── vocabulary-data.js          # Specialized vocabulary (1,618 terms)
│           ├── conversation-data.js        # Extracted conversations (2,018 sentences)
│           └── conversation-vocabulary-data.js  # Conversation-based vocab (1,600 terms)
│
├── 🔬 Advanced Data Processing
│   └── data-processing/           # Separate module for data analysis
│       ├── README.md             # Data processing documentation
│       ├── analyzers/            # Analysis and matching tools
│       │   └── vocabulary-conversation-analyzer.js  # Multi-strategy analysis
│       ├── extractors/           # Data extraction tools
│       │   └── conversation-vocabulary-extractor.js # Generate vocab from conversations
│       ├── matchers/             # Matching algorithms
│       │   └── vocabulary-matcher.js               # Advanced matching with confidence
│       ├── config/               # Configuration files
│       │   └── matching-config.js                 # Matching strategies and settings
│       └── utils/                # Processing utilities
│           └── text-utils.js                      # Text normalization and analysis
│
├── 🛠️ Build & Development Tools
│   └── scripts/
│       ├── build-vocabulary.js           # Generate specialized vocabulary data
│       ├── extract-conversations.js     # Extract conversation dialogues
│       ├── validate.js                  # Comprehensive data validation
│       └── build.js                     # Production build with minification
│
├── 📊 Generated Reports & Analysis
│   └── reports/                   # AUTO-GENERATED - Analysis outputs
│       ├── advanced-vocabulary-analysis.md     # Multi-strategy analysis results
│       ├── vocabulary-extraction-comparison.md # Vocabulary approach comparison
│       ├── conversation-extraction-report.md   # Conversation processing stats
│       ├── vocabulary-matches.csv              # Spreadsheet export
│       ├── validation-report.json             # Data integrity validation
│       └── *.json                             # Detailed analysis data files
│
├── 🎨 Assets & Demo
│   ├── assets/                   # Static assets (fonts, icons, images)
│   ├── docs/                     # Documentation and demo files
│   │   ├── DEVELOPMENT.md        # Development guide
│   │   └── demo-vocabulary-selector.html  # Interactive vocabulary selector demo
│   └── dist/                     # Production build output
│
└── 🧪 Testing & Configuration
    ├── tests/                    # Test files (future expansion)
    └── vercel.json              # Deployment configuration
```

## 🚀 Key File Relationships

### Data Pipeline Flow
```
1. Source Data:
   data/vocabulary/*.md (6 files, 1,618 terms)
   data/conversation/*.md (77 files, 2,018 sentences)
   
2. Processing Scripts:
   scripts/build-vocabulary.js → data/generated/vocabulary-data.js
   scripts/extract-conversations.js → data/generated/conversation-data.js
   data-processing/extractors/conversation-vocabulary-extractor.js → data/generated/conversation-vocabulary-data.js
   
3. Web Application:
   index.html loads both vocabulary-data.js AND conversation-vocabulary-data.js
   src/js/core/VocabularyManager.js handles switching between vocabulary sources
   
4. Analysis Pipeline:
   data-processing/analyzers/vocabulary-conversation-analyzer.js → reports/*.md
```

### UI Component Integration
```
index.html (vocabulary selector UI)
    ↓
src/js/ui/SettingsPanel.js (vocabulary switching logic)
    ↓  
src/js/core/VocabularyManager.js (dual vocabulary management)
    ↓
src/js/core/App.js (coordination and event handling)
```

## 📋 Important Files for Development

### Essential Configuration
- `package.json` - All npm scripts and dependencies
- `CLAUDE.md` - Development guidance for Claude Code
- `data-processing/config/matching-config.js` - Analysis configuration

### Core App Files (Most Frequently Modified)
- `src/js/core/VocabularyManager.js` - Vocabulary switching and management
- `src/js/ui/SettingsPanel.js` - Settings UI and vocabulary selector
- `index.html` - Main app interface with vocabulary selector UI
- `src/css/style.css` - Styling including vocabulary selector

### Data Generation (Run When Data Changes)
- `scripts/build-vocabulary.js` - Generate specialized vocabulary
- `scripts/extract-conversations.js` - Process conversation files  
- `data-processing/extractors/conversation-vocabulary-extractor.js` - Extract conversation vocabulary

### Analysis Tools (For Research & Optimization)
- `data-processing/analyzers/vocabulary-conversation-analyzer.js` - Advanced analysis
- `reports/` directory - Generated analysis reports

## 🔄 Development Workflow

### Initial Setup
```bash
npm install                              # Install dependencies
npm run convert                          # Generate specialized vocabulary
npm run extract-conversations            # Extract conversation dialogues  
npm run extract-vocab-from-conversations # Generate conversation vocabulary
npm run dev                             # Start development server
```

### Regular Development
```bash
npm run dev                    # Start server (most common)
npm run validate               # Check data integrity
npm run analyze-vocabulary     # Run analysis when needed
```

### Production Deployment  
```bash
npm run build                 # Production build
npm run deploy               # Full deployment pipeline
```

## 📊 Generated Files to Monitor

### Never Edit Manually (Auto-Generated)
- `data/generated/*.js` - Generated by processing scripts
- `reports/*.md` - Generated by analysis tools
- `reports/*.json` - Analysis data files
- `reports/*.csv` - Spreadsheet exports

### Safe to Edit
- `src/**/*.js` - Application source code
- `src/**/*.css` - Stylesheets  
- `index.html` - Main app interface
- `data/vocabulary/*.md` - Source vocabulary files
- `data-processing/**/*.js` - Processing tools and configuration

## 🎯 Architecture Highlights

### Separation of Concerns
- **Main App** (`src/`) - User interface and pronunciation training logic
- **Data Processing** (`data-processing/`) - Analysis tools and vocabulary extraction
- **Raw Data** (`data/`) - Source files and generated data
- **Build Tools** (`scripts/`) - Basic data conversion and build processes

### Modular Design
- **Vocabulary Management** - Handles both specialized and conversation-based vocabularies
- **Event-Driven Communication** - Components communicate via EventBus
- **Progressive Enhancement** - Core features work without advanced processing
- **Mobile-First Responsive** - Optimized for all screen sizes

This structure ensures maintainability, clear separation of concerns, and easy expansion for future features.