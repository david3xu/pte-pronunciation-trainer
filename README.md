# PTE Pronunciation Trainer

A specialized web-based pronunciation training application for **PTE exam preparation**, featuring comprehensive vocabulary and practice modes for all key PTE speaking and listening sections.

**✅ v2.5.4 - PRODUCTION READY (Oct 2025)** - Complete architecture overhaul with zero hardcoded values!

## 🎯 Key Features

### 📚 **Complete PTE Vocabulary Library (11 Books)**
- **🎧 FIB Listening** - 885 fill-in-the-blank terms with IPA pronunciation
- **📗 Beginner Vocabulary** - 383 high-frequency terms
- **📘 Intermediate Vocabulary** - 2,408 intermediate terms
- **📕 Advanced Vocabulary** - 2,703 advanced terms
- **📚 Read Aloud (RA) Vocabulary** - 788 RA-specific terms
- **🎯 Repeat Sentence (RS) Vocabulary** - 887 RS-specific terms
- **⭐ Must-Know Vocabulary** - 1,397 essential PTE terms
- **✍️ WFD Vocabulary** - 1,318 Write From Dictation specific terms
- **📖 Reading FIB** - 313 Reading fill-in-the-blanks vocabulary
- **🔀 Reading FIB Drag** - 767 Reading FIB drag & drop vocabulary
- **❓ ASQ Answers Vocabulary** - 627 Answer Short Question specific terms
- **Total**: 12,000+ vocabulary terms with IPA pronunciation

### 🎤 **PTE Practice Modes (Sentence Datasets)**
- **🎤 Repeat Sentence (RS)** - 620 practice sentences
- **❓ Answer Short Question (ASQ)** - 692 questions with answers
- **✍️ Write From Dictation (WFD)** - 1,195 dictation sentences
- **Total**: 2,507 practice sentences/questions

### 🔄 **Smart Learning System** ✨
- **Loop Mode (Default)** - Continuous cycling through entire vocabulary book
  - Each word plays once, automatically moves to next
  - Reaches end → automatically restarts from beginning
  - Perfect for passive learning and spaced repetition
- **Vocabulary Auto-Loop** - Cycles through all 10 books endlessly
- **Sentence Auto-Restart** - Continuous practice without intervention
- **Flexible Repeat Modes** - Once (1x), Twice (2x), Intensive (3x), Loop (Continuous)

### 🎓 **Unified Learning Interface**
- **Single UI for all modes** - Consistent, easy-to-use interface
- **Smart mode switching** - Seamless transition between practice types
- **Mode persistence** - Remembers your last selected mode
- **Comprehensive datasets** - Over 10,000 practice items total

### 🔊 **Advanced Pronunciation Training**
- **Smart Voice Selection** - Auto-selects best available male voice (Google UK English Male preferred)
- **4 Voice Options** - Microsoft James (AU), Google UK Male (GB), Alex/Daniel (US)
- **Multiple Speeds** - Slow (0.7x, default) → Normal (1.0x) → Fast (1.3x)
- **Repeat Modes** - Once (1x), Twice (2x), Intensive (3x), Loop (Continuous, default)
- **Configurable Pauses** - Short (1s), Normal (2s), Long (3s, default)
- **Professional pronunciation** - Clear, exam-appropriate speech patterns

### 📱 **Modern User Experience**
- **Mobile-Responsive Design** (320px to 1400px+) with touch optimization
- **Keyboard Shortcuts** - Space (play/pause), arrows (navigate), R (repeat), F (fullscreen)
- **Progress Tracking** - localStorage persistence with study statistics
- **Dark/Light Mode** - Adaptive theming for comfortable study sessions

### 🚀 **Production-Ready Architecture**
- **Event-Driven System** - Complete decoupling via EventBus (zero direct dependencies)
- **Centralized Configuration** - ALL values in `Config.js` - ZERO hardcoded values
- **Settings Module** - Event-driven settings with context-aware handlers
- **Dependency Graph Manager** - InitializationManager with topological sort
- **Global Error Handling** - Centralized error events with fail-fast for critical modules
- **Network Resilience** - Retry logic with exponential backoff (1s, 2s, 4s)
- **Health Checks** - Module validation with critical/non-critical distinction
- **Dynamic Dataset Loading** - Lazy loading for all 11 vocabulary books + 3 practice modes
- **Service Worker** - v64 with optimized offline caching and progressive enhancement

### 🏗️ **Architecture Quality (Current State)**

✅ **Zero Hardcoded Values** - 100% Config.js compliance, all values centralized
✅ **Event-Driven Architecture** - Complete module decoupling via EventBus
✅ **CSS Design Tokens** - All styles use centralized variables from variables.css
✅ **Type-Safe Configuration** - Validated settings with proper error handling
✅ **Production Quality** - Comprehensive testing and validation pipeline

**See [CHANGELOG.md](CHANGELOG.md) for complete version history**

## 🚀 Quick Start

### **Simple Setup**
```bash
# Clone repository
git clone https://github.com/your-username/pte-vocabulary-trainer.git
cd pte-vocabulary-trainer

# Install dependencies
npm install

# Process PTE vocabulary data
npm run data:pte

# Start development server
npm run dev
```

### **Production Build**
```bash
# Build for production
npm run build

# Deploy (includes data processing, build, and validation)
npm run deploy
```

## 📁 Project Structure

```
pte-vocabulary-trainer/
├── data/
│   ├── processed/      # Standardized JSON datasets (PTE terms)
│   ├── generated/      # JS data files (compatibility)
│   ├── reports/        # Processing reports and validation results
│   └── source/         # Source data files
│       └── pte/         # PTE vocabulary data
│           └── vocabs/
│               └── fib-listening-vocabulary.md  # PTE FIB listening terms
├── src/
│   ├── js/
│   │   ├── core/       # Core application logic
│   │   │   ├── PTEApp.js              # Main application coordinator
│   │   │   ├── PTEVocabularyManager.js # PTE vocabulary management
│   │   │   └── ProgressTracker.js     # Progress tracking
│   │   ├── shared/     # Shared utilities and configuration
│   │   │   ├── AppNamespace.js        # Module namespace system
│   │   │   ├── Config.js              # 🎯 CENTRALIZED CONFIGURATION (ALL VALUES HERE)
│   │   │   ├── DataSchema.js          # Data format schemas
│   │   │   └── LegacyCompatibility.js # Backward compatibility
│   │   ├── ui/         # User interface controllers
│   │   │   ├── UIController.js        # Main UI controller
│   │   │   └── SettingsPanel.js       # Settings panel
│   │   ├── audio/      # Text-to-speech and audio controls
│   │   │   ├── TTSEngine.js           # Text-to-speech engine
│   │   │   ├── VoiceSelector.js       # Voice selection
│   │   │   └── AudioControls.js       # Audio playback controls
│   │   ├── data/       # Data management
│   │   │   └── extractors/            # Data extractors
│   │   │       └── PTETermsExtractor.js # PTE vocabulary extractor
│   │   └── utils/      # Utility functions
│   │       ├── EventBus.js            # Event system
│   │       ├── Storage.js             # Local storage
│   │       ├── StateManager.js        # State management
│   │       ├── CacheMigration.js      # Cache migration
│   │       └── StateTest.js           # State testing
│   └── css/            # Styling and responsive design
│       ├── style.css                  # Main styles
│       ├── components.css             # Component styles
│       └── responsive.css             # Responsive design
├── data/
│   ├── source/pte/     # PTE source data
│   │   └── vocabs/     # Vocabulary files
│   │       ├── pte-fib-listening-with-ipa.md  # 🎯 PRIMARY: 914 terms with IPA
│   │       └── fib-listening-vocabulary.md    # Fallback: Original terms
│   ├── processed/      # Generated datasets
│   │   └── pte-fib-listening-dataset.json     # 🎯 MAIN DATASET
│   └── reports/        # Processing reports
│       ├── pte-processing-report.json
│       └── validation-report.json
├── scripts/
│   ├── pte-data-pipeline.js  # 🎯 PTE vocabulary processing (configurable)
│   ├── validate.js           # Data validation (configurable)
│   └── build.js              # Production build (configurable)
├── docs/               # 📚 Documentation
│   ├── README.md             # 📋 Documentation index & navigation
│   ├── ARCHITECTURE.md       # 🏗️ System architecture & design patterns
│   ├── WORKFLOW.md           # 🔄 Complete workflow & class interactions
│   ├── API.md                # 📖 Complete API reference
│   ├── DEPLOYMENT.md         # 🚀 Deployment guide & CI/CD
│   └── TROUBLESHOOTING.md    # 🔍 Common issues & solutions
└── dist/               # Production build output
```

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run data:pte` | Process PTE vocabulary data |
| `npm run build` | Create production build |
| `npm run validate` | Validate data integrity |
| `npm run test` | Run Jest tests |
| `npm run lint` | ESLint + Stylelint |
| `npm run clean` | Clean build artifacts |
| `npm run deploy` | Full deployment pipeline |

## 📚 Documentation

**For Developers** (start here):
- **[📐 Development Guidelines](docs/GUIDELINES.md)** ⭐ - Design principles and development rules (START HERE)
- **[🤖 AI Assistant Guide](CLAUDE.md)** - Guidance for AI assistants working on this codebase
- **[🔒 Enforcing Guidelines](docs/ENFORCING-GUIDELINES.md)** - 5 methods to enforce guidelines with AI
- **[🏗️ Architecture & Workflow](docs/ARCHITECTURE.md)** - Technical system design and data flow
- **[📖 API Reference](docs/API-REFERENCE.md)** - Complete API documentation for all classes and methods

**For Operations**:
- **[🚀 Deployment Guide](docs/DEPLOYMENT.md)** - Platform deployment and CI/CD pipeline
- **[🔍 Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[⚙️ Configuration Guide](#-centralized-configuration)** - Centralized configuration management

**Project Documentation**:
- **[📋 Documentation Index](docs/README.md)** - Complete documentation overview and navigation
- **[📝 Changelog](CHANGELOG.md)** - Version history and release notes

## ⚙️ Centralized Configuration

### **🎯 Single Source of Truth**
ALL configuration values are centralized in `src/js/shared/Config.js`:

```javascript
// Data Pipeline Configuration
pipeline: {
    inputDir: 'data/source/pte',
    outputDir: 'data',
    dataSources: {
        primary: 'pte-fib-listening-with-ipa.md',
        fallback: 'fib-listening-vocabulary.md'
    }
}

// TTS Configuration
tts: {
    voices: { default: 'Google UK English Male' },
    speeds: { slow: 0.7, normal: 1.0, fast: 1.3 }
}

// Build Configuration
build: {
    jsFiles: [...], // All JS files to bundle
    output: { js: 'js/app.min.js', css: 'css/style.min.css' }
}
```

### **🔧 Benefits**
- **NO hardcoded values** anywhere in the codebase
- **Easy customization** - change paths, settings, or data sources in one place
- **Scalable architecture** - add new data sources or features without code changes
- **Environment-specific configs** - override defaults for different deployments

## 🎧 PTE Vocabulary Data

### **FIB Listening Vocabulary**
- **914 essential terms** with IPA pronunciation guides for PTE listening comprehension
- **Smart difficulty classification** based on word complexity
- **British & American pronunciations** with IPA notation
- **Exam-focused selection** - curated from actual PTE materials
- **Comprehensive coverage** - all essential vocabulary for success

### **Data Processing**
```bash
npm run data:pte    # Process PTE vocabulary data
```

## 🔧 Configuration

### **Learning Modes**
- **🎧 PTE FIB Listening** - Complete vocabulary set for listening section

### **Categories**
- **All Categories** - Complete vocabulary collection
- **PTE FIB Listening** - FIB-specific vocabulary

### **Difficulty Levels**
- **Easy** - Simple, common words
- **Normal** - Standard vocabulary
- **Hard** - Complex, advanced terms

### **Settings Panel**
- **Comprehensive Configuration** - Full control over learning experience
- **Audio Settings** - Speed, pause, repeat modes, voice selection
- **Content Filtering** - Category and difficulty level selection
- **State Persistence** - Automatic saving and restoration of preferences
- **[📖 Complete Settings Guide](docs/SETTINGS.md)** - Detailed documentation of all features

## 🎯 Usage Tips

### **Practice Mode Guide**

#### **📚 Vocabulary Training**
- 914 FIB listening terms with phonetics and IPA
- Best for: Building foundational vocabulary
- Features: Phonetic spelling, IPA notation, example sentences

#### **🎤 Repeat Sentence (RS)**
- 628 complete sentences for pronunciation practice
- Best for: Improving sentence fluency and intonation
- Features: Full sentences with translations

#### **❓ Answer Short Question (ASQ)**
- 692 questions with correct answers
- Best for: Quick response and comprehension practice
- Features: Questions displayed with answers for learning

#### **✍️ Write From Dictation (WFD)**
- 1,195 sentences for dictation practice
- Best for: Spelling accuracy and listening comprehension
- Features: Full sentences for dictation training

### **For PTE Exam Preparation**
1. **Start with Vocabulary** - Build confidence with word pronunciation
2. **Practice RS mode** - Improve sentence fluency and rhythm
3. **Use ASQ mode** - Develop quick comprehension and response
4. **Master WFD mode** - Perfect spelling and listening skills
5. **Regular practice** - Consistent daily practice for best results

### **Keyboard Shortcuts**
- **Space** - Play/pause current word
- **←/→** - Navigate between words
- **R** - Repeat current word
- **F** - Toggle fullscreen mode

## 🚀 Deployment

### **Vercel (Recommended)**
```bash
# Automatic deployment via Vercel
npm run vercel-build
```

### **Manual Deployment**
```bash
# Build and validate
npm run deploy

# Upload dist/ folder to your hosting provider
```

## 📊 Performance

- **Lightweight** - Optimized for fast loading
- **Offline-capable** - Service worker for offline access
- **Mobile-optimized** - Responsive design for all devices
- **Fast TTS** - Efficient text-to-speech implementation

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| TTS not working | Use Chrome/Edge, check audio permissions |
| Build failures | Run `npm install`, check Node.js version >= 16 |
| Data errors | Check `data/reports/` directory for validation details |

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 **Support**

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review validation reports in `data/reports/`

---

**🎧 Master PTE pronunciation with confidence!**