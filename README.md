# CCL Pronunciation Trainer

A comprehensive web-based pronunciation training application for NAATI CCL (Credentialed Community Language) exam preparation, featuring conversation-based vocabulary with real-world context.

- **💬 Conversation-Based (7,072 terms)** - Comprehensive vocabulary from 91 real CCL exam dialogues with contextual examples and dialogue structure

## Features ✅ Fully Implemented

### 🎯 Complete Dialogue-Based Vocabulary System
- **💬 Comprehensive CCL Terms (7,072)** - Extensive vocabulary extracted from 91 complete NAATI CCL conversations  
- **📝 Full Contextual Learning** - Every term includes original sentence context, dialogue flow, and conversation structure
- **🏷️ Smart Categorization** - Organized across 9 domains with conversation-aware classification
- **📊 Enhanced Metadata** - Difficulty levels, phonetic transcriptions, and dialogue relationships

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

# Generate complete dialogue dataset (7,072 comprehensive terms)
npm run process-data

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
# Use _term_ syntax to highlight vocabulary (e.g., _insurance claim_)

# 2. Regenerate complete dataset and vocabulary 
npm run process-data                   # Generate structured dataset (primary)
npm run extract-vocab                  # Generate vocabulary for backward compatibility

# 3. Test in development server
npm run dev

# 4. Deploy to production - commit and push conversation data
git add data-processing/extractors/merged-conversations.md
git commit -m "Add new CCL vocabulary terms from conversations"  
git push origin main

# Note: Generated files (data/generated/, data/processed/) are automatically 
# created by Vercel during build from the complete dataset!
```

### 🔍 Highlighting Syntax

In `data-processing/extractors/merged-conversations.md`, mark important terms with underscores:

```markdown
Speaker: The _insurance claim_ was processed quickly, and the _settlement amount_ was fair.
翻译：保险理赔处理得很快，理赔金额也很公平。
```

The processing scripts will automatically:
- Extract highlighted terms: "insurance claim", "settlement amount"  
- Include full sentence context and dialogue structure
- Generate phonetic transcriptions and difficulty classifications
- Create structured dataset with conversation relationships
- Maintain dialogue flow for conversation-based learning

### 🚀 Deployment Considerations

**For Vercel/Production deployments:**
- **Only commit raw conversation data** (`merged-conversations.md`)
- **Generated files are ignored by Git** (`data/generated/`, `data/processed/`)
- **Vercel automatically runs** `npm run vercel-build` during deployment
- **Frontend loads complete dataset directly** from `/data/processed/complete-dataset.json` (91 dialogues → 7,072 terms)

**For manual deployments:**
```bash
npm run vercel-build    # Runs extract-vocab + build for production
```

## Available Commands

### Core Development
```bash
npm start                     # Process complete dataset + Dev server (full setup)
npm run dev                   # Start development server  
npm run process-data          # Generate complete dataset (7,072 terms - primary)
npm run extract-vocab         # Generate vocabulary files (for backward compatibility)
npm run validate              # Validate all data integrity
```

### Data Processing
```bash
npm run process-data                     # Generate complete dataset (primary data source)
npm run extract-vocab                    # Generate simple vocabulary (legacy support)
```

### Production & Build
```bash
npm run build                # Production build with minification
npm run deploy               # Full deployment pipeline
npm run clean                # Clean generated files
```

## Vocabulary Domains (Complete Dialogue Dataset)

| Domain                   | Terms | Focus Areas                                           |
| ------------------------ | ----- | ----------------------------------------------------- |
| **Business & Finance**   | 3,286 | Banking, financial services, business operations, employment |
| **Social Welfare**       | 2,676 | Government services, community support, social interactions |
| **Legal & Government**   | 610   | Court systems, legal procedures, regulatory compliance |
| **Education**            | 210   | School systems, academic programs, educational support |
| **Medical & Healthcare** | 191   | Medical consultations, healthcare services, treatments |
| **Immigration**          | 99    | Visa processes, residency, citizenship applications |

*All terms extracted from 91 complete CCL conversation scenarios with full dialogue context.*

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
├── data/                  # Complete dialogue dataset (7,072 terms)
│   ├── conversation/      # Raw conversation data  
│   ├── generated/         # Generated vocabulary files
│   └── processed/         # Structured dialogue dataset
├── data-processing/       # Source conversation files (91 dialogues)
├── scripts/               # Build & validation scripts
├── docs/                  # Documentation
└── dist/                  # Production build
```

## Development ✅ Complete Implementation

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed instructions.

```bash
# Core Commands (all tested and working)
npm run dev          # Start development server on port 3000
npm run process-data # Generate complete dataset (7,072 terms - primary)  
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
