# CCL Pronunciation Trainer

A comprehensive web-based pronunciation training application for NAATI CCL (Credentialed Community Language) exam preparation, featuring conversation-based vocabulary with real-world context.

**✅ FULLY REFACTORED (Dec 2024)** - Complete architectural improvements with 100% backward compatibility.

## 🎯 Key Features

### 📚 **Comprehensive Vocabulary System**
- **2,831 terms** from 96 real CCL conversations with full context
- **2,360 unfamiliar words** curated for advanced learners
- **2,955 words** from dialogue analysis
- **445 resume terms** with IPA pronunciation guides
- **Contextual examples** - Every term includes bilingual sentence context

### 🎓 **Five Learning Modes**
- **📚 Vocabulary Focus** - Complete vocabulary from all dialogues
- **💬 Dialogue Practice** - Full conversation sentences with contextual flow
- **🔥 Unfamiliar Words** - Curated challenging vocabulary for advanced study
- **📝 Words Practice** - Dialogue-based word lists
- **💼 Resume Terms** - Professional vocabulary with IPA pronunciation guides

### 🔊 **Advanced Pronunciation Training**
- **Australian English Priority** - en-AU voices optimized for NAATI CCL context
- **Smart Voice Selection** - Google UK English Male → Microsoft James (en-AU) → fallbacks
- **Multiple Speeds** - Slow (0.7x) → Normal (1.0x) → Fast (1.3x) progression
- **Repeat Modes** - 1x, 2x (Slow+Normal), 3x (Slow+Normal+Fast), Loop
- **Configurable Delays** - 1-4 second intervals between pronunciations

### 📱 **Modern User Experience**
- **Mobile-Responsive Design** (320px to 1400px+) with touch optimization
- **Keyboard Shortcuts** - Space (play/pause), arrows (navigate), R (repeat), F (fullscreen)
- **Smart Categorization** - Group-based (70240s, 70230s, etc.) + domain classification
- **Progress Tracking** - localStorage persistence with study statistics

### 🚀 **Unified Architecture (New)**
- **Single Data Pipeline** - `npm run data` processes all sources in 0.23s
- **Centralized Configuration** - All settings in one organized location
- **Module Namespace** - Clean architecture with backward compatibility
- **Comprehensive Validation** - Data integrity checks and error reporting

## 🚀 Quick Start

### **Simple Setup**
```bash
# Clone repository
git clone https://github.com/david3xu/ccl-pronunciation-trainer.git
cd ccl-pronunciation-trainer

# Install dependencies
npm install

# Generate all data and start (recommended)
npm run start

# Open in browser
http://localhost:3000
```

**That's it!** The app is ready to use with all features implemented and tested.

## 💻 **New Development Commands**

### **🆕 Unified Commands (Recommended)**
```bash
npm run data                    # Single data pipeline (0.23s, all sources)
npm run start                   # Generate data + start server
npm run deploy                  # Generate data + build + validate
```

### **📊 Data Generation**
```bash
npm run data                    # NEW: Unified pipeline (replaces 11 scripts)
npm run data:legacy             # Legacy: Multiple scripts (still works)
```

### **🔧 Development**
```bash
npm run dev                     # Development server only
npm start                       # NEW: data + dev (recommended)
npm run start:legacy            # Legacy workflow (still works)
```

### **🚀 Production**
```bash
npm run build                   # Production build with minification
npm run vercel-build            # Optimized for Vercel deployment
npm run validate                # Data validation and integrity checks
```

## 📊 **Vocabulary Statistics**

| **Dataset** | **Terms** | **Source** | **Focus** |
|-------------|-----------|------------|-----------|
| **Complete Conversations** | 2,831 | 96 CCL dialogues | Comprehensive vocabulary with context |
| **Unfamiliar Words** | 2,360 | Curated challenging terms | Advanced learners |
| **Words Dataset** | 2,955 | Dialogue analysis | Word-focused practice |
| **Resume Terms** | 445 | Professional vocabulary | IPA pronunciation guides |
| **Total Unique** | 8,000+ | Multiple sources | Complete CCL preparation |

## 🎯 **Learning Modes Explained**

### **📚 Vocabulary Focus Mode**
Perfect for comprehensive CCL vocabulary building:
- Terms extracted from real NAATI conversations
- Full sentence context for every term
- Group-based organization (70240s-70150s)
- Difficulty progression (Easy → Normal → Hard)

### **🔥 Unfamiliar Words Mode**
Designed for advanced learners:
- Hand-curated challenging vocabulary
- Terms selected from actual CCL conversations
- Focus on complex multi-word phrases
- Advanced difficulty terms prioritized

### **💼 Resume Terms Mode**
Professional pronunciation training:
- Technical vocabulary with IPA transcriptions
- Phonetic spelling guides
- British and American pronunciations
- Career-focused terminology

## ⌨️ **Keyboard Shortcuts**

| **Key** | **Action** | **Context** |
|---------|------------|-------------|
| `Space` | Play/Pause pronunciation | Any time |
| `← →` | Navigate between words | During study |
| `R` | Repeat current word | During study |
| `F` | Toggle fullscreen | Any time |
| `Esc` | Close settings panel | When panel open |

## 🔧 **Technical Architecture**

### **🆕 Unified Data Pipeline**
```
Input Sources → Unified Processor → Standardized Output → Browser
```

**Sources Processed:**
- Conversation files with highlighted terms (`_term_`)
- Unfamiliar words lists with dialogue IDs
- Vocabulary tables (markdown format)
- Word lists by dialogue
- Chinese-English pairs
- Resume terms with IPA guides

**Output Generated:**
- Standardized JSON datasets
- Legacy JS files (compatibility)
- Validation reports
- Processing statistics

### **Module Architecture**
```javascript
// NEW: Organized namespace
const vocab = window.CCLApp.getModule('vocabularyManager');
const config = window.CCLApp.getModule('config');

// LEGACY: Still works (100% backward compatible)
window.vocabularyManager.getCurrentWords();
window.eventBus.emit('vocabulary:loaded', data);
```

### **Browser Support**
- **Chrome 90+** (recommended for TTS)
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**
- Requires Web Speech API for pronunciation features

## 📱 **Usage**

### **Getting Started**
1. **Run the app**: `npm run start`
2. **Select learning mode** in settings
3. **Choose category** and difficulty level
4. **Press PLAY** to start pronunciation training
5. **Use shortcuts** for efficient navigation

### **Study Tips**
- Start with **Vocabulary Focus** for comprehensive learning
- Use **Unfamiliar Words** for advanced challenge
- Practice with **different speeds** (slow → normal → fast)
- Enable **repeat modes** for intensive training
- Track progress with built-in statistics

### **Voice Configuration**
- App automatically selects best Australian English voice
- **Google UK English Male** prioritized for consistency
- **Microsoft James (en-AU)** as fallback option
- Configure manually in Settings if needed

## 🔄 **Data Updates**

### **Adding New Vocabulary**
When you have new CCL conversation data:

```bash
# 1. Update source files in data-processing/extractors/
# 2. Run unified pipeline
npm run data

# 3. Verify and deploy
npm run validate
npm run deploy
```

**Source File Formats:**
- **Conversations**: Use `_term_` to highlight vocabulary
- **Unfamiliar Words**: List dialogue ID + terms
- **Resume Terms**: Include IPA notation `| /aɪˈpiːeɪ/ — sounds like **EYE-pee-ay**`

## 🚀 **Deployment**

### **Vercel (Recommended)**
```bash
# Automatic deployment
git push origin main
# Vercel runs: npm run vercel-build
```

### **Manual Deployment**
```bash
npm run deploy        # Generate data + build + validate
# Deploy dist/ folder to your hosting service
```

### **Development Server**
```bash
npm run dev           # Python HTTP server on :3000
# Alternative: python3 -m http.server 3000
```

## 🏗️ **Project Structure**

```
ccl-pronunciation-trainer/
├── src/js/
│   ├── shared/              # 🆕 Infrastructure
│   │   ├── AppNamespace.js  # Unified namespace
│   │   ├── Config.js        # Centralized configuration
│   │   └── ...              # Data schema, compatibility
│   ├── core/                # Vocabulary, progress, app coordinator
│   ├── audio/               # TTS engine, voice selection, controls
│   └── ui/                  # Interface, settings panels
├── scripts/
│   ├── unified-data-pipeline.js  # 🆕 Single data processor
│   ├── build.js                  # Production builds
│   └── validate.js               # Data validation
├── data/
│   ├── processed/                # 🆕 Standardized JSON datasets
│   └── generated/                # Legacy JS files (compatibility)
└── data-processing/
    └── extractors/               # Source markdown files
```

## 🤝 **Contributing**

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature-name`
3. **Run data pipeline**: `npm run data`
4. **Test changes**: `npm run start`
5. **Validate**: `npm run validate && npm run lint`
6. **Submit pull request**

## 🔧 **Development Setup**

### **Requirements**
- **Node.js** >= 16.0.0
- **Python 3** (for development server)
- **Modern browser** with Web Speech API

### **First Time Setup**
```bash
git clone <repository-url>
cd ccl-pronunciation-trainer
npm install
npm run start           # Generates data and starts server
```

### **Development Workflow**
```bash
# Make changes to source files
npm run data            # Regenerate data if needed
npm run dev             # Start development server
npm run lint            # Check code quality
npm run test            # Run tests
```

## ❓ **Troubleshooting**

| **Issue** | **Solution** |
|-----------|--------------|
| "No vocabulary loaded" | Run `npm run data` to generate datasets |
| Server won't start | Ensure Python 3: `python3 -m http.server 3000` |
| TTS not working | Use Chrome/Edge, check audio permissions |
| Build failures | Run `npm install`, check Node.js version >= 16 |
| Data errors | Check `reports/` directory for validation details |

## 📄 **License**

This project is open source and available under the [MIT License](LICENSE).

---

**🎯 Status**: ✅ **Production Ready**
**🏗️ Architecture**: ✅ **Fully Refactored**
**🔄 Compatibility**: ✅ **100% Backward Compatible**
**🚀 Performance**: ✅ **Optimized (0.23s data processing)**