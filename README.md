# CCL Pronunciation Trainer

A comprehensive web-based pronunciation training application for NAATI CCL (Credentialed Community Language) exam preparation. Choose between two powerful vocabulary sets:

- **📚 Specialized Terms (1,618)** - Domain-specific CCL vocabulary  
- **💬 Conversation-Based (1,600)** - Practical terms from real CCL exam dialogues with 100% sentence examples

## Features ✅ Fully Implemented

### 🎯 Dual Vocabulary System (NEW!)
- **📚 Specialized Terms (1,618)** - Domain-specific CCL vocabulary across 6 domains
- **💬 Conversation-Based (1,600)** - Practical terms extracted from real CCL conversations
- **🔄 Instant Switching** - Toggle between vocabulary sets in settings
- **📊 Smart Statistics** - Real-time coverage and example availability stats

### 🔊 Advanced Pronunciation Training
- **Australian English (en-AU) TTS** - Optimized for CCL exam context  
- **🎓 Difficulty-Based Learning** - Easy (55%), Normal (31%), Hard (14%) classification
- **⚡ Auto-Play Mode** with configurable timing (2-5 second intervals, 2s default)
- **🔄 Repeat Modes** - 1x, 2x (Slow+Normal), 3x (Slow+Normal+Fast), Loop

### 📱 Modern User Experience
- **Mobile-Responsive Design** (320px to 1400px+) with optimized touch interface
- **⌨️ Keyboard Shortcuts** - Space (play/pause), arrows (navigate), R (repeat), Esc (settings)
- **🎨 Enhanced Interface** - Better typography, spacing, and visual hierarchy
- **🌙 Theme Support** - Light, dark, and auto themes with system preference detection

### 💾 Smart Progress & Data Management  
- **Progress Tracking** with localStorage persistence and study streaks
- **📊 Study Statistics** - Session time, terms studied, accuracy tracking
- **🔄 Settings Import/Export** for backup and device sync
- **🎉 Celebration Effects** for completed categories with confetti animations
- **📝 Comprehensive Data Validation** with detailed error reporting

### 🚀 Production Features
- **Custom Build Pipeline** with minification (~175KB total)
- **Advanced Data Processing** - Multiple vocabulary extraction algorithms
- **Comprehensive Analytics** - Usage statistics and vocabulary analysis tools
- **Demo Mode** - Interactive vocabulary selector demonstration

## Quick Start ✅ Tested

```bash
# Clone repository
git clone https://github.com/your-username/ccl-pronunciation-trainer.git
cd ccl-pronunciation-trainer

# Install dependencies
npm install

# Generate vocabulary data (1,618 specialized terms)
npm run convert

# Extract conversation-based vocabulary (1,600 practical terms)
npm run extract-vocab-from-conversations

# Start development server (Python HTTP server)
npm run dev

# Open in browser (tested and working)
http://localhost:3000
```

**Ready to use!** All features are implemented and tested.

## Available Commands

### Core Development
```bash
npm start                     # Convert + Dev (full setup)
npm run dev                   # Start development server
npm run convert               # Generate specialized vocabulary
npm run validate              # Validate all data integrity
```

### Advanced Data Processing
```bash
npm run extract-conversations        # Extract conversation dialogues (2,018 sentences)
npm run extract-vocab-from-conversations  # Generate conversation-based vocabulary
npm run analyze-vocabulary          # Advanced vocabulary-conversation analysis
```

### Production & Build
```bash
npm run build                # Production build with minification
npm run deploy               # Full deployment pipeline
npm run clean                # Clean generated files
```

## Vocabulary Domains

| Domain                   | Terms | Focus Areas                                           |
| ------------------------ | ----- | ----------------------------------------------------- |
| **Social Welfare**       | 201   | Government services, benefits, employment support     |
| **Education**            | 308   | School systems, student behavior, academic assessment |
| **Legal & Government**   | 300   | Court systems, legal procedures, criminal law         |
| **Business & Finance**   | 200   | Banking, financial services, business operations      |
| **Medical & Healthcare** | 346   | Medical specialties, procedures, healthcare systems   |
| **Travel & Immigration** | 263   | Travel procedures, immigration, customs               |

## Usage

### Difficulty-Based Learning

**🟢 Easy Level (897 terms)**
- Basic vocabulary: "card", "form", "help", "aged"
- Single words and common phrases
- Perfect for beginners building confidence

**🟡 Normal Level (500 terms)**
- Intermediate terms: "eligibility", "assessment", "allowance"
- 2-3 word phrases and government terminology
- Standard CCL vocabulary complexity

**🔴 Hard Level (227 terms)**
- Advanced terms: "anaesthetist", "social security appeals tribunal"
- Technical specialties and complex multi-word phrases
- Challenge mode for advanced learners

### Auto-Play Mode

1. Select a vocabulary domain and difficulty level
2. Click "Start Auto-Play"
3. Listen to automatic pronunciation with clear English pronunciation
4. Use spacebar to pause/resume, arrow keys to navigate

### Manual Study Mode

1. Browse vocabulary by domain or use search
2. Click any term to hear pronunciation
3. Track your progress automatically
4. Review completed terms anytime

### Keyboard Shortcuts

- `Space`: Play/Pause auto-play
- `←/→`: Navigate between terms
- `R`: Repeat current term
- `S`: Toggle shuffle mode

## Project Structure

```
ccl-pronunciation-trainer/
├── src/                    # Source code
│   ├── js/                # Refactored modular JavaScript
│   │   ├── core/          # App coordinator & data management
│   │   ├── audio/         # TTS & voice functionality  
│   │   ├── ui/            # Interface & settings
│   │   └── utils/         # EventBus & storage utilities
│   └── css/               # Modular stylesheets
├── data/                  # Vocabulary data (1,618 terms)
│   └── vocabulary/        # Markdown source files
├── scripts/               # Build & validation scripts
├── docs/                  # Documentation
└── dist/                  # Production build
```

## Development ✅ Complete Implementation

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed instructions.

```bash
# Core Commands (all tested and working)
npm run dev        # Start development server on port 3000
npm run convert    # Generate vocabulary data from markdown
npm run validate   # Comprehensive data validation
npm run build      # Production build with minification
npm run deploy     # Full deployment pipeline

# Additional Commands
npm start          # Convert + dev server
npm run clean      # Clean dist/ and generated/ directories
```

**Implementation Status:** All modules completed and tested ✅

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires Web Speech API support for pronunciation features.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for coding standards and guidelines.

## License

This project is open source and available under the [MIT License](LICENSE).
