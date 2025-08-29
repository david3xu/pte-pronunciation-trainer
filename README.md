# CCL Pronunciation Trainer

A comprehensive web-based pronunciation training application for NAATI CCL (Credentialed Community Language) exam preparation, featuring conversation-based vocabulary with real-world context.

- **💬 Conversation-Based (937 terms)** - Practical terms from real CCL exam dialogues with 100% contextual examples

## Features ✅ Fully Implemented

### 🎯 Conversation-Based Vocabulary System
- **💬 Real CCL Terms (937)** - Practical vocabulary extracted from actual NAATI CCL test conversations
- **📝 100% Contextual Examples** - Every term includes bilingual example sentences from source dialogues
- **🏷️ Smart Categorization** - Organized across 6 domains (social-welfare, education, legal-government, business-finance, medical-healthcare, travel-immigration)
- **📊 Intelligent Classification** - Difficulty-based learning with Easy/Normal/Hard progression

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
- **Custom Build Pipeline** with minification (~120KB total)
- **Conversation Data Processing** - Advanced vocabulary extraction from highlighted conversation terms
- **Comprehensive Analytics** - Usage statistics and vocabulary analysis tools

## Quick Start ✅ Tested

```bash
# Clone repository
git clone https://github.com/your-username/ccl-pronunciation-trainer.git
cd ccl-pronunciation-trainer

# Install dependencies
npm install

# Generate conversation-based vocabulary (937 practical terms)
npm run extract-vocab

# Start development server (Python HTTP server)
npm run dev

# Open in browser (tested and working)
http://localhost:3000
```

**Ready to use!** All features are implemented and tested.

## Updating Vocabulary Data

### 📝 Adding New Terms from Conversations

When you have new CCL conversation data to add:

```bash
# 1. Update the main conversation file with highlighted terms
# Edit: data-processing/extractors/merged-conversations.md
# Use _term_ syntax to highlight new vocabulary (e.g., _insurance claim_)

# 2. Test locally - regenerate vocabulary from updated conversations
npm run extract-vocab

# 3. Test in development server
npm run dev

# 4. Deploy to production - commit and push ONLY the raw data
git add data-processing/extractors/merged-70245-70158.md
git commit -m "Add new CCL vocabulary terms from conversations"
git push origin main

# Note: Generated files (data/generated/, reports/) are automatically 
# created by Vercel during build - no need to commit them!
```

### 🔍 Highlighting Syntax

In `data-processing/extractors/merged-70245-70158.md`, mark important terms with underscores:

```markdown
Speaker: The _insurance claim_ was processed quickly, and the _settlement amount_ was fair.
翻译：保险理赔处理得很快，理赔金额也很公平。
```

The extraction script will automatically:
- Extract highlighted terms: "insurance claim", "settlement amount" 
- Include bilingual context sentences
- Categorize by conversation domain (business-finance in this case)
- Assign difficulty levels based on term complexity

### 🚀 Deployment Considerations

**For Vercel/Production deployments:**
- **Only commit raw conversation data** (`merged-70245-70158.md`)
- **Generated files are ignored by Git** (`data/generated/`, `reports/`)
- **Vercel automatically runs** `npm run extract-vocab && npm run build` during deployment
- **Fresh vocabulary is generated** from source conversations on each deploy

**For manual deployments:**
```bash
npm run vercel-build    # Runs extract-vocab + build for production
```

## Available Commands

### Core Development
```bash
npm start                     # Extract vocabulary + Dev server (full setup)
npm run dev                   # Start development server
npm run extract-vocab         # Generate conversation-based vocabulary (937 terms)
npm run validate              # Validate all data integrity
```

### Production & Build
```bash
npm run build                # Production build with minification
npm run deploy               # Full deployment pipeline
npm run clean                # Clean generated files
```

## Vocabulary Domains (Conversation-Based)

| Domain                   | Terms | Focus Areas                                           |
| ------------------------ | ----- | ----------------------------------------------------- |
| **Business & Finance**   | 712   | Banking, financial services, business operations      |
| **Social Welfare**       | 95    | Government services, benefits, employment support     |
| **Legal & Government**   | 93    | Court systems, legal procedures, criminal law         |
| **Medical & Healthcare** | 19    | Medical specialties, procedures, healthcare systems   |
| **Education**            | 18    | School systems, student behavior, academic assessment |

*All terms extracted from real CCL conversation scenarios with contextual examples.*

## Usage

### Difficulty-Based Learning

**🟢 Easy Level**
- Basic vocabulary from conversations: "crew", "payment", "appointment"
- Single words and common phrases from real dialogues
- Perfect for beginners building confidence

**🟡 Normal Level**
- Intermediate terms: "be pleased with the progress", "insurance claim"
- 2-3 word phrases from actual CCL conversations
- Standard CCL vocabulary complexity

**🔴 Hard Level**
- Advanced terms: "drop by to visit the site", "comprehensive report"
- Complex multi-word phrases from professional conversations
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
│   ├── js/                # Modular JavaScript
│   │   ├── core/          # App coordinator & vocabulary management
│   │   ├── audio/         # TTS & voice functionality  
│   │   ├── ui/            # Interface & settings
│   │   └── utils/         # EventBus & storage utilities
│   └── css/               # Modular stylesheets
├── data/                  # Conversation vocabulary data (937 terms)
│   ├── conversation/      # Raw conversation data
│   └── generated/         # Generated vocabulary files
├── data-processing/       # Source conversation files (117 conversations)
├── scripts/               # Build & validation scripts (3 files)
├── docs/                  # Documentation
└── dist/                  # Production build
```

## Development ✅ Complete Implementation

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed instructions.

```bash
# Core Commands (all tested and working)
npm run dev          # Start development server on port 3000
npm run extract-vocab # Generate conversation vocabulary (937 terms)
npm run validate     # Comprehensive data validation
npm run build        # Production build with minification
npm run deploy       # Full deployment pipeline

# Additional Commands
npm start            # Extract vocabulary + dev server
npm run clean        # Clean dist/ and generated/ directories
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
