# CCL Pronunciation Trainer

A comprehensive web-based pronunciation training application for NAATI CCL (Credentialed Community Language) exam preparation, featuring conversation-based vocabulary with real-world context.

- **💬 Conversation-Based (5,695 terms)** - Comprehensive vocabulary from 91 real CCL exam dialogues with contextual examples and dialogue structure
- **🔥 Unfamiliar Words (944 terms)** - Curated challenging vocabulary for advanced learners

## Features ✅ Fully Implemented

### 🎯 Complete Dialogue-Based Vocabulary System
- **💬 Comprehensive CCL Terms (5,695)** - Extensive vocabulary extracted from 91 complete NAATI CCL conversations
- **� Unfamiliar Words Focus (944 terms)** - Curated challenging vocabulary from actual CCL conversations for targeted practice
- **�📝 Full Contextual Learning** - Every term includes original sentence context, dialogue flow, and conversation structure
- **🏷️ Smart Categorization** - Organized across 9 domains with conversation-aware classification
- **📊 Enhanced Metadata** - Difficulty levels, phonetic transcriptions, and dialogue relationships

### 🎓 Four Learning Modes
- **📚 Vocabulary Focus** - Complete vocabulary from all 91 dialogues (5,695 terms)
- **💬 Dialogue Practice** - Full conversation sentences with contextual flow
- **🔥 Unfamiliar Words** - Curated challenging terms for advanced study (944 terms)
- **💼 Resume Terms Practice** - Technical terms from resume, job descriptions, and interview preparation (456 terms)

### 🔊 Advanced Pronunciation Training
- **Australian English (en-AU) TTS** - Optimized for CCL exam context
- **Default Voice**: Google UK English Male (configurable in Settings)
- **Voice Priority**: Google UK English Male → Microsoft James (en‑AU) → other available English voices exposed by the browser/OS
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
git clone https://github.com/david3xu/ccl-pronunciation-trainer.git
cd ccl-pronunciation-trainer

# Install dependencies
npm install

# Generate complete dialogue dataset (5,695 comprehensive terms)
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

# 2. Update unfamiliar words for challenging vocabulary
# Edit: data-processing/extractors/unfamilar-words.md
# Add dialogue numbers and challenging terms (line-separated)

# 3. Regenerate complete dataset and vocabulary
npm run process-all-data              # Generate ALL datasets (complete, vocabulary, unfamiliar words, words, resume-terms)

# 4. Test in development server
npm run dev

# 5. Deploy to production - commit and push all changes
git add data-processing/extractors/ data/processed/
git add .
git commit -m "Add new CCL vocabulary terms and unfamiliar words"
git push origin main

# Note: Both source data and processed files are committed for reliable deployment
```

### 🔥 Unfamiliar Words Format

Add challenging vocabulary to `data-processing/extractors/unfamilar-words.md`:

```
70248
community center
diverse
older people
new migrants
variety
come up

70247
drop by
swing by
delayed
nowadays
```

**Format Rules:**
- Dialogue number on its own line (e.g., `70248`)
- One challenging term per line
- Terms will be matched with complete dataset for context
- Unmatched terms will be logged as warnings

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
- **Commit both source data and processed files** for immediate deployment
- **Vercel automatically runs** `npm run vercel-build` during deployment
- **Frontend loads complete dataset directly** from `/data/processed/complete-dataset.json` (91 dialogues → 5,695 terms)

**For manual deployments:**
```bash
npm run vercel-build    # Runs extract-vocab + build for production
```

## Available Commands

### Core Development
```bash
npm start                     # Process complete dataset + Dev server (full setup)
npm run dev                   # Start development server
npm run process-all-data      # Generate ALL datasets (complete, vocabulary, unfamiliar words, words)
npm run process-data          # Generate complete dataset (5,695 terms - primary)
npm run extract-vocab         # Generate vocabulary files (for backward compatibility)
npm run generate-words-dataset # Generate words dataset from words.md (2,524 terms)
npm run validate              # Validate all data integrity




# 1. Update unfamiliar words file ✅ (you've done this)
# Edit: data-processing/extractors/unfamilar-words.md

# 2. Process the data - ONLY need these two:
npm run process-data                     # Generate complete-dataset.json (primary)
node scripts/process-unfamiliar-words.js # Generate unfamiliar words dataset

# 3. Test and deploy
npm run dev                              # Test locally
git add . && git commit && git push     # Deploy
```

### Data Processing
```bash
npm run process-all-data               # Generate ALL datasets (recommended)
npm run process-data                   # Generate complete dataset (primary data source)
npm run extract-vocab                  # Generate simple vocabulary (legacy support)
npm run generate-words-dataset        # Generate words dataset from words.md (2,524 terms)
node scripts/process-unfamiliar-words.js # Generate unfamiliar words dataset (944 terms)
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
| **Social Welfare**       | 2,575 | Government services, community support, social interactions |
| **Legal & Government**   | 601   | Court systems, legal procedures, regulatory compliance |
| **Education**            | 210   | School systems, academic programs, educational support |
| **Medical & Healthcare** | 196   | Medical consultations, healthcare services, treatments |
| **Immigration**          | 99    | Visa processes, residency, citizenship applications |

*All terms extracted from 91 complete CCL conversation scenarios with full dialogue context.*

## Usage

### Learning Modes

**📚 Vocabulary Focus**
- Complete vocabulary from all 91 dialogues (5,695 terms)
- Individual word and phrase pronunciation practice
- Organized by dialogue groups (Groups 1-10, latest to earliest)
- Full difficulty filtering (Easy/Normal/Hard)

**💬 Dialogue Practice**
- Full conversation sentences with contextual flow
- Focus on conversational patterns and dialogue structure
- Practice natural speech rhythm and intonation
- Coming soon: Enhanced dialogue features

**🔥 Unfamiliar Words**
- Curated challenging vocabulary (944 terms)
- Hand-selected difficult terms from actual CCL conversations
- Perfect for advanced learners and exam preparation
- Organized by dialogue groups with full context

**💼 Resume Terms Practice**
- Technical terms from resume, job descriptions, and interview preparation (456 terms)
- Includes pronunciation guides with IPA transcriptions and phonetic spellings
- Organized by sections: CV Technical Background, Job Requirements, Cover Letter, Interview Prep
- Perfect for professional English pronunciation practice

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
├── data/                  # Complete dialogue dataset (5,695 terms)
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

### Notes on Voices (Platform Differences)
- Browsers expose system voices via the Web Speech API. Availability and names vary by device.
- Windows typically provides Microsoft voices (e.g., "Microsoft James – English (Australia)").
- Chrome/Android exposes Google voices (e.g., "Google UK English Male").
- iOS (all browsers) exposes Apple voices only; select a comparable Apple English voice in Settings if Google/Microsoft names are not shown.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for coding standards and guidelines.

## License

This project is open source and available under the [MIT License](LICENSE).
