# Professional Vocabulary Pronunciation Trainer

A specialized web-based pronunciation training application for professional vocabulary and AI/ML terminology, featuring IPA guides and text-to-speech with British and American pronunciation variants.

**✅ FULLY REFACTORED (Oct 2025)** - Streamlined architecture focused exclusively on professional vocabulary.

## 🎯 Key Features

### 📚 **Professional Vocabulary System**
- **445+ professional terms** with detailed IPA pronunciation guides
- **150+ AI/ML terms** organized by category (Foundation, MLOps, NLP, etc.)
- **Phonetic spelling** for intuitive pronunciation practice
- **British and American variants** with side-by-side comparison
- **Technical terminology** focused on modern professional environments

### 🎓 **Specialized Learning Modes**
- **💼 Resume Terms** - Professional vocabulary with IPA pronunciation guides
- **🤖 AI/ML Terms** - Cutting-edge technical terminology by category
- **🌟 All Professional Terms** - Complete professional vocabulary collection

### 🔊 **Advanced Pronunciation Training**
- **British/American Priority** - UK and US voice options for professional settings
- **Smart Voice Selection** - Google UK English Male (primary) with multiple fallbacks
- **Multiple Speeds** - Slow (0.7x) → Normal (1.0x) → Fast (1.3x) progression
- **Repeat Modes** - 1x, 2x (Slow+Normal), 3x (Slow+Normal+Fast), Loop
- **Configurable Delays** - 1-4 second intervals between pronunciations
- **IPA Visualization** - International Phonetic Alphabet notation for precise pronunciation

### 📱 **Modern User Experience**
- **Mobile-Responsive Design** (320px to 1400px+) with touch optimization
- **Keyboard Shortcuts** - Space (play/pause), arrows (navigate), R (repeat), F (fullscreen)
- **Category-Based Organization** - Foundation Terms, Production Terms, MLOps, NLP, etc.
- **Progress Tracking** - localStorage persistence with study statistics
- **Dark/Light Mode** - Adaptive theming for comfortable study sessions

### 🚀 **Streamlined Architecture**
- **Focused Data Pipeline** - `npm run data` processes resume-specific data
- **Centralized Configuration** - All settings in one organized location
- **Module Namespace** - Clean architecture with optimized code structure
- **Built-in Validation** - Data integrity checks and error reporting
- **Smaller Footprint** - Reduced codebase focused on professional vocabulary

## 🚀 Quick Start

### **Simple Setup**
```bash
# Clone repository
git clone https://github.com/your-username/professional-vocabulary-trainer.git
cd professional-vocabulary-trainer

# Install dependencies
npm install

# Generate resume data and start (recommended)
npm run start:resume

# Open in browser
http://localhost:3000
```

**That's it!** The app is ready to use with professional vocabulary training features.

## 💻 **Development Commands**

### **🆕 Resume-Specific Commands**
```bash
npm run data:resume            # Process resume data only
npm run start:resume           # Generate resume data + start server
npm run deploy:resume          # Generate data + build + validate
```

### **📊 Data Generation**
```bash
npm run data:resume            # Process only resume & AI/ML terms
npm run extract-vocab          # Legacy support for backward compatibility
```

### **🔧 Development**
```bash
npm run dev                    # Development server only
npm run start:resume           # Generate resume data + start (recommended)
```

### **🚀 Production**
```bash
npm run build                  # Production build with minification
npm run vercel-build:resume    # Optimized for Vercel deployment
npm run validate               # Data validation and integrity checks
```

## 📊 **Vocabulary Statistics**

| **Dataset** | **Terms** | **Source** | **Focus** |
|-------------|-----------|------------|-----------|
| **Resume Terms** | 445+ | Professional vocabulary | IPA pronunciation guides with British/American variants |
| **AI/ML Terms** | 150+ | Technical terminology | Organized by category with definitions |
| **Total Unique** | 595+ | Professional sources | Complete professional vocabulary |

## 🎯 **Learning Modes Explained**

### **💼 Resume Terms Mode**
Professional pronunciation training:
- Technical vocabulary with IPA transcriptions
- Phonetic spelling guides
- Side-by-side British and American pronunciations
- Career-focused terminology
- Difficulty levels from easy to advanced

### **🤖 AI/ML Terms Mode**
Technical terminology for artificial intelligence and machine learning:
- Organized by functional categories
- Foundation terms to advanced concepts
- Current terminology (2025 updates)
- Clear definitions for each term
- Essential for technical interviews

### **🌟 All Professional Terms Mode**
Complete professional vocabulary collection:
- Combined resume terms and AI/ML terminology
- Categorized by professional domain
- Progress tracking across all terms
- Comprehensive pronunciation practice

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
When you have new professional terms to add:

```bash
# 1. Update source files in data-processing/
# 2. Run resume data pipeline
npm run data:resume

# 3. Verify and deploy
npm run validate
npm run deploy:resume
```

**Source File Formats:**
- **Resume Terms**: Include IPA notation `term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**`
- **AI/ML Terms**: Use format `**Term**: Definition`

## 🚀 **Deployment**

### **Vercel (Recommended)**
```bash
# Automatic deployment
git push origin resume
# Vercel runs: npm run vercel-build:resume
```

### **Manual Deployment**
```bash
npm run deploy:resume        # Generate resume data + build + validate
# Deploy dist/ folder to your hosting service
```

### **Development Server**
```bash
npm run dev                  # Python HTTP server on :3000
# Alternative: python3 -m http.server 3000
```

## 🏗️ **Project Structure**

```
professional-vocabulary-trainer/
├── src/js/
│   ├── shared/                 # Infrastructure modules
│   │   ├── AppNamespace.js     # Unified namespace
│   │   ├── Config.js           # Centralized configuration with inline constants
│   │   └── ...                 # Data schema, compatibility
│   ├── core/                   # ResumeApp.js, ResumeVocabularyManager
│   ├── audio/                  # TTS engine, voice selection, controls
│   └── ui/                     # Interface, settings panels
├── scripts/
│   ├── resume-data-pipeline.js # Resume-specific data processor
│   ├── build.js                # Production builds
│   └── validate.js             # Data validation
├── data/
│   ├── processed/              # Standardized JSON datasets (resume terms)
│   └── generated/              # Legacy JS files (compatibility)
└── data-processing/
    ├── resume-terms.md         # Professional terms with IPA guides
    └── temp.md                 # AI/ML terminology by category
```

## 🤝 **Contributing**

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature-name`
3. **Run data pipeline**: `npm run data:resume`
4. **Test changes**: `npm run start:resume`
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
cd professional-vocabulary-trainer
npm install
npm run start:resume    # Generates resume data and starts server
```

### **Development Workflow**
```bash
# Make changes to source files
npm run data:resume     # Regenerate resume data if needed
npm run dev             # Start development server
npm run lint            # Check code quality
npm run test            # Run tests
```

## ❓ **Troubleshooting**

| **Issue** | **Solution** |
|-----------|--------------|
| "No vocabulary loaded" | Run `npm run data:resume` to generate datasets |
| Server won't start | Ensure Python 3: `python3 -m http.server 3000` |
| TTS not working | Use Chrome/Edge, check audio permissions |
| Build failures | Run `npm install`, check Node.js version >= 16 |
| Data errors | Check `reports/` directory for validation details |

## 📄 **License**

This project is open source and available under the [MIT License](LICENSE).

---

**🎯 Status**: ✅ **Production Ready**
**🏗️ Architecture**: ✅ **Streamlined for Professional Vocabulary**
**🔄 Data Pipeline**: ✅ **Resume-Specific Processing**
**🚀 Performance**: ✅ **Optimized for Professional Terms**