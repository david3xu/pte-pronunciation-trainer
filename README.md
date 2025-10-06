# PTE Pronunciation Trainer

A specialized web-based pronunciation training application for **PTE exam preparation**, featuring 914 essential FIB (Fill-in-the-Blank) listening vocabulary terms with text-to-speech pronunciation practice.

**✅ PTE-FOCUSED (Dec 2024)** - Streamlined architecture focused exclusively on PTE vocabulary.

## 🎯 Key Features

### 📚 **PTE Vocabulary System**
- **914 FIB listening terms** essential for PTE exam success
- **Smart difficulty classification** - Easy, Normal, Hard based on word complexity
- **Comprehensive coverage** - All essential vocabulary for PTE listening section
- **Exam-focused content** - Curated specifically for PTE FIB questions

### 🎓 **Specialized Learning Mode**
- **🎧 PTE FIB Listening** - Complete vocabulary set for listening comprehension
- **Category-based organization** - Organized by PTE exam requirements
- **Difficulty filtering** - Practice by difficulty level

### 🔊 **Advanced Pronunciation Training**
- **Smart Voice Selection** - Google UK English Male (primary) with multiple fallbacks
- **Multiple Speeds** - Slow (0.7x) → Normal (1.0x) → Fast (1.3x) progression
- **Repeat Modes** - 1x, 2x (Slow+Normal), 3x (Slow+Normal+Fast), Loop
- **Configurable Delays** - 1-4 second intervals between pronunciations
- **Professional pronunciation** - Clear, exam-appropriate speech patterns

### 📱 **Modern User Experience**
- **Mobile-Responsive Design** (320px to 1400px+) with touch optimization
- **Keyboard Shortcuts** - Space (play/pause), arrows (navigate), R (repeat), F (fullscreen)
- **Progress Tracking** - localStorage persistence with study statistics
- **Dark/Light Mode** - Adaptive theming for comfortable study sessions

### 🚀 **Streamlined Architecture**
- **PTE Data Pipeline** - `npm run data:pte` processes PTE-specific data
- **Centralized Configuration** - ALL configuration values in `src/js/shared/Config.js` - NO hardcoded values
- **SettingsManager Module** - Centralized settings logic with dependency management
- **Configurable Paths** - All file paths, data sources, and settings are configurable
- **Module Namespace** - Clean architecture with optimized code structure
- **Built-in Validation** - Data integrity checks and error reporting
- **PTE-Focused** - Specialized for PTE FIB listening vocabulary

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

- **[📋 Documentation Index](docs/README.md)** - Complete documentation overview and navigation
- **[🏗️ Architecture & Workflow](docs/ARCHITECTURE.md)** - System design, data flow, and interaction patterns
- **[ System Workflow](docs/WORKFLOW.md)** - End-to-end workflow diagrams and class interactions
- **[📖 API Reference](docs/API.md)** - Complete API documentation for all classes and methods
- **[🚀 Deployment Guide](docs/DEPLOYMENT.md)** - Platform deployment and CI/CD pipeline
- **[🔍 Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[⚙️ Configuration Guide](#-centralized-configuration)** - Centralized configuration management

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

### **For PTE Exam Preparation**
1. **Start with Easy terms** - Build confidence with simpler vocabulary
2. **Practice pronunciation** - Use multiple speeds and repeat modes
3. **Focus on spelling** - PTE FIB requires accurate spelling
4. **Regular practice** - Consistent daily practice for best results

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