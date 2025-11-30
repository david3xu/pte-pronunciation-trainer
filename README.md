# PTE Pronunciation Trainer

A specialized web-based pronunciation training application for **PTE exam preparation**, featuring comprehensive vocabulary (13,000+ words), practice modes for speaking/listening sections, DI shadowing practice, and cloud sync capabilities.

**✅ v3.0.1 - AI-POWERED (November 2025)**

**Latest Updates:**
- 🎤 **NEW:** DI Shadowing Practice - Practice Describe Image answers with continuous, fluent speech
- ⚙️ **NEW:** Smart defaults - Auto-selects appropriate content when switching study types
- 🎚️ **FIXED:** Playback speed slider now works (0.5x - 2.0x adjustable TTS speed)
- 🗣️ **IMPROVED:** All-caps words now pronounced naturally (e.g., "TOP" sounds like "Top" not "T-O-P")
- 🤖 **AI:** AI Tutor Chat with Google Gemini (100% FREE!)
- 🔊 **AI:** Premium TTS with AWS Polly (18 neural voices)
- 🎯 **AI:** AI-Powered Recommendations (FREE with Gemini)
- 🎨 **FIXED:** UI layout issues with Audio Controls and AI Sidebar (Tailwind JIT compatibility)
- ✅ React + TypeScript migration complete (100%)
- ✅ Supabase cloud sync ready

---

## 🎯 Key Features

### 📚 **16 Vocabulary Books (13,800+ Terms with IPA)**

- 🎧 **FIB Listening** - 990 fill-in-the-blank terms
- 📗 **Beginner** - 383 high-frequency terms
- 📘 **Intermediate** - 2,408 intermediate terms
- 📕 **Advanced** - 2,703 advanced terms
- 📚 **Read Aloud (RA)** - 788 RA-specific terms
- 🎯 **Repeat Sentence (RS)** - 887 RS-specific terms
- ⭐ **Must-Know** - 1,397 essential PTE terms
- ✍️ **WFD Vocabulary** - 1,318 Write From Dictation terms
- 📖 **Reading FIB** - 313 Reading fill-in-the-blanks vocabulary
- 🔀 **Reading FIB Drag** - 767 drag & drop vocabulary
- ❓ **ASQ Answers** - 627 Answer Short Question terms
- 🔊 **RS-WFD Combined** - Combined RS/WFD vocabulary
- 🌟 **High-Frequency** - Most commonly tested words
- 🎙️ **RS Core** - 222 core Repeat Sentence vocabulary
- 🗣️ **DI/RL Templates** - 106 Describe Image & Retell Lecture templates
- ✍️ **Essay Vocabulary** - 274 PTE Essay terms with IPA (organized by 16 topics)
- 📝 **SST Complete** - 368 Summarize Spoken Text vocabulary

### 🎤 **4 Study Types**

#### **📚 Vocabulary Learning** (16 books, 13,800+ terms)
- Study individual words with IPA pronunciation
- Dual format: British + American IPA
- Difficulty filtering (Easy, Normal, Hard)
- Smart defaults: Auto-loads "PTE FIB Listening" by default

#### **🎯 Task Practice** (2,507 sentences/questions)
- 🎤 **Repeat Sentence** - 620 practice sentences
- ❓ **Answer Short Question** - 692 questions with answers
- ✍️ **Write From Dictation** - 1,195 dictation sentences
- Smart defaults: Auto-loads "Repeat Sentence" by default

#### **🎤 DI Shadowing Practice** ✨ NEW (20 answers)
- 🖼️ **DI Images 1-10** - Practice Describe Image answers with continuous, fluent speech
- 🖼️ **DI Images 11-20** - Advanced DI answer shadowing
- **Continuous Speech** - Natural flow without artificial pauses
- **Real-Time Highlighting** - Follow along as phrases are spoken
- **Full Answer Display** - See complete answer while practicing
- **Adjustable Speed** - 0.5x to 2.0x playback control
- **Natural Pronunciation** - Auto-converts all-caps to natural speech
- Smart defaults: Auto-loads "DI Images 1-10" by default

### 🤖 **AI-Powered Features** ✨ NEW (100% FREE!)

#### **AI Tutor Chat** 💬 (Google Gemini)
- **Conversational Help** - Ask any pronunciation question in natural language
- **Context-Aware** - AI knows what word you're currently practicing
- **Multi-Turn Dialogue** - Follow-up questions and detailed explanations
- **Markdown Support** - Rich formatted responses (bold, lists, code examples)
- **Quick Actions** - 4 pre-filled common questions for instant help
- **100% FREE** - No credit card required (1,500 requests/day)
- **How to use:** Click the 💬 AI Tutor button in the header
- **Setup:** See [GEMINI-SETUP.md](docs/GEMINI-SETUP.md)

#### **AI Recommendations** 🎯 (Google Gemini - FREE)
- **Personalized Learning** - Based on your practice history and progress
- **Smart Suggestions** - What to study next for maximum improvement
- **Difficulty Adaptation** - Automatically adjusts to your level
- **Weak Area Detection** - Identifies patterns in your mistakes
- **100% FREE** - Powered by Google Gemini (1,500 requests/day)
- **How to use:** Click "Get AI Recommendations" on practice page
- **Setup:** Add `VITE_GEMINI_API_KEY` to `.env` (free API key)

#### **Premium TTS** 🔊⭐ (AWS Polly Neural Voices)
- **18 Neural Voices** - Natural-sounding AI voices
  - **US English:** Joanna, Matthew, Ivy, Kendra, Kimberly, Salli, Joey, Justin, Kevin
  - **British English:** Amy, Emma, Brian, Arthur
  - **Australian English:** Nicole, Russell
  - **Indian English:** Aditi, Raveena
- **SSML Control** - Adjust speed, pitch, emphasis, and pauses
- **Voice Selection UI** - Filter by accent (US/UK/AU/IN) and gender
- **Audio Caching** - Supabase Storage caching (80-90% cost reduction)
- **Fallback Support** - Auto-switches to browser TTS if unavailable
- **How to use:** Toggle "Premium Neural" in WordCard header
- **Setup:** See [AWS-POLLY-SETUP.md](docs/AWS-POLLY-SETUP.md)
- **Cost:** $16 per 1M characters (~$10/mo for 1K active users)

### ✍️ **PTE Essay Resources** 📝 NEW (Template B + Quick-Fill Guide)

#### **Template B** - Optimized Essay Structure
- **260-290 words** - Perfect length for 200-300 word requirement
- **Flexible vocabulary** - Using "significant", "key", "meaningful", "essential" instead of repetitive academic jargon
- **Natural phrasing** - "resulting from" instead of "stemming from"
- **4-paragraph structure** - Introduction, Advantage, Challenge, Conclusion
- **Simple fills** - All placeholders designed for 1-3 word fills maximum
- **Location:** `data/source/pte/di/templates/pte_templates_custom_all.txt`

#### **QUICK-FILL-GUIDE** - 16 Common Topics ⚡
- **16 comprehensive topics** with complete fill tables
  - Formal Exams, Travel in Education, Work-Life Balance
  - Climate Change, Building Design, Overseas Study
  - Technology & Smartphones, Historic Preservation
  - Early Marriage, Tourism, Television Functions
  - Mark Deduction, Experiential Learning, International Organizations
  - Information Revolution, Learning & Employment
- **Simple strategy**: 60-70% topic keywords + 20-30% moderate vocabulary = 25-26/26 score
- **1-3 word fills** - All placeholder fills kept ultra-short for natural fluency
- **Word counts** - Every fill shows word count for easy tracking
- **Success formula** - Proven with 25-26/26 scored essays
- **Location:** `data/source/pte/essay-examples/QUICK-FILL-GUIDE.md`

#### **Essay Vocabulary** - 274 Actual Terms
- **Organized by topic** - Same 16 topics as Quick-Fill Guide
- **IPA pronunciation** - Full IPA with simplified phonetic guides
- **Actual fills** - These are the EXACT terms used in successful essays
- **Quick reference** - Find your topic and use the fills directly
- **No complex jargon** - Simple, natural, easy to remember
- **Location:** `data/source/pte/vocabs/pte-essay-topic-vocabulary-with-ipa.md`

#### **Essay Examples** - Real 25-26/26 Scored Essays
- Detailed breakdown showing:
  - Exact keyword extraction from prompt
  - Placeholder fill strategy (what to use for each `[keywords]`)
  - Topic keyword reuse tracking (60-70% density)
  - Vocabulary selection from the book
  - Why the essay scored 25-26/26
- **Location:** `data/source/pte/essay-examples/`

**How to use:**
1. Find your topic in QUICK-FILL-GUIDE.md
2. Extract 5-10 keywords from your prompt
3. Use the fill tables as reference (all fills are 1-3 words max)
4. Check vocabulary file for pronunciation if needed
5. Keep it simple - don't overcomplicate!

### ☁️ **Cloud Sync with Supabase** ✨

- 🔐 **User Authentication** - Secure sign up/in with email
- 📊 **Progress Sync** - Study progress across all devices
- ⚙️ **Settings Sync** - Preferences follow you everywhere
- 📈 **Study Analytics** - Track your learning journey
- 🧠 **Spaced Repetition** - Word mastery tracking
- 🔄 **Cross-Device** - Start on phone, continue on laptop

### 🔊 **Advanced Pronunciation**

- **Smart Voice Selection** - Auto-selects best voice
- **Browser TTS (Free)** - Google UK/US, Microsoft, Apple voices
- **Premium TTS (Paid)** - AWS Polly neural voices (18 options)
- **Variable Speed** - 0.5x to 2.0x (fully functional slider control)
- **Natural Speech** - Auto-converts all-caps (TOP → "Top" not "T-O-P")
- **Dual IPA Format** - British + American pronunciation
- **Smart Pauses** - Natural pauses based on | delimiters
- **Universal Control** - Playback speed applies to ALL study types

### 📱 **Modern UX**

- **Mobile-Responsive** - 320px to 1400px+
- **Keyboard Shortcuts** - Space, arrows, R, F
- **Dark/Light Mode** - Adaptive theming
- **Offline Support** - Service Worker PWA
- **Progress Tracking** - Local + cloud storage

---

## 🏗️ Architecture

### **React + TypeScript + Supabase Hybrid**

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (React 19 + TypeScript 5.9)               │
│  • Component-based architecture                     │
│  • Zustand state management                         │
│  • Feature-grouped components (ai/, audio/, etc.)   │
│  • Type-safe configuration                          │
│  • Offline-first design                             │
└─────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│  LOCAL JSON    │   │  SUPABASE      │   │  AI SERVICES   │
│  (Vocabulary)  │   │  (User Data)   │   │  (FREE)        │
│                │   │                │   │                │
│ • 13K words    │   │ • Profiles     │   │ • Gemini Chat  │
│ • 2.5K sents   │   │ • Progress     │   │ • AI Recs      │
│ • 10-20ms load │   │ • Settings     │   │ • TTS (Polly)  │
│ • Works offline│   │ • Analytics    │   │ • Audio Cache  │
└────────────────┘   └────────────────┘   └────────────────┘
```

**Why This Design?**
- ⚡ **Fast**: 10-20ms vocabulary load (local JSON)
- 💰 **Free**: $0/month static hosting (vs $25-50/month all-DB)
- 📴 **Offline**: Full functionality without internet
- 🌍 **CDN**: Global edge caching via Vercel
- 🤖 **AI-Powered**: FREE Gemini integration (1,500 req/day)
- 🎯 **Scalable**: React component architecture

**Component Architecture:**
- **Feature-based grouping** - `ai/`, `audio/`, `practice/`, `settings/`, `shared/`
- **Zustand store** - Centralized state (progress, settings, vocabulary)
- **Radix UI + Tailwind** - Accessible, responsive components
- **Service layer** - `services/ai/`, `services/tts/` for API calls

See [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for detailed analysis.

---

## 🚀 Quick Start

### **Development**

```bash
# Clone
git clone https://github.com/your-username/pte-vocabulary-trainer.git
cd pte-vocabulary-trainer

# Install
npm install

# Process data
npm run data:pte

# Start (port 3001)
npm run dev

# Open
http://localhost:3001
```

### **Test Supabase** ✨

```bash
# Start server
npm run dev

# Testing
# See docs/setup/SUPABASE-TESTING-GUIDE.md for integration testing
```

### **Production**

```bash
# Build
npm run build

# Deploy to Vercel
npm run deploy
```

---

## 📖 Documentation

### **Start Here**
- 📘 **[CLAUDE.md](CLAUDE.md)** - AI assistant guide (START HERE)
- 📗 **[docs/README.md](docs/README.md)** - Documentation index
- 📕 **[GUIDELINES.md](docs/architecture/GUIDELINES.md)** - Design principles
- 🏗️ **[ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)** - System design (2,230 lines)

### **Setup Guides** (`docs/setup/`)
- 🚀 **[DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)** - Deployment guide
- ☁️ **[SUPABASE-SETUP-GUIDE.md](docs/setup/SUPABASE-SETUP-GUIDE.md)** - Supabase config
- 🧪 **[SUPABASE-TESTING-GUIDE.md](docs/setup/SUPABASE-TESTING-GUIDE.md)** - Testing guide
- 🤖 **[GEMINI-SETUP.md](docs/setup/GEMINI-SETUP.md)** - Google Gemini FREE AI setup (NEW)
- 🔊 **[AWS-POLLY-SETUP.md](docs/setup/AWS-POLLY-SETUP.md)** - Premium TTS setup (NEW)

### **Architecture** (`docs/architecture/`)
- 🏗️ **[ARCHITECTURE-ANALYSIS.md](docs/architecture/ARCHITECTURE-ANALYSIS.md)** - Architecture analysis
- 💾 **[VOCABULARY-STORAGE-DECISION.md](docs/archive/VOCABULARY-STORAGE-DECISION.md)** - Data design decisions

### **Guides** (`docs/guides/`)
- 📙 **[API-REFERENCE.md](docs/api/API-REFERENCE.md)** - Complete API reference
- 🔧 **[TROUBLESHOOTING.md](docs/guides/TROUBLESHOOTING.md)** - Common issues
- 📋 **[ENFORCING-GUIDELINES.md](docs/guides/ENFORCING-GUIDELINES.md)** - Development rules

### **Archive** (`docs/archive/`)
- 🎨 **[UI-DESIGN.md](docs/archive/UI-DESIGN.md)** - UI design documentation
- 📋 **[FINALIZATION-CHECKLIST.md](docs/archive/FINALIZATION-CHECKLIST.md)** - Project status
- 🗺️ **[REFACTORING-TODOS.md](docs/archive/REFACTORING-TODOS.md)** - Historical roadmap

---

## 🗂️ Project Structure

### **Root Directory**
```
ccl-pronunciation-trainer/
├── index.html                 # Main React app entry
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite build config
├── .env                       # API keys (Supabase, Gemini, AWS)
└── README.md                  # This file
```

### **Source Code** (`src/`)
```
src/
├── App.tsx                    # Root React component
├── main.tsx                   # React entry point
│
├── components/                # React UI Components (grouped by feature)
│   ├── ai/                    # AI Features
│   │   ├── AITutorChat.tsx            # Gemini chat interface
│   │   ├── PronunciationScoring.tsx   # AI scoring
│   │   └── AIRecommendations.tsx      # AI suggestions
│   ├── audio/                 # Audio Controls
│   │   ├── AudioControls.tsx          # Playback controls
│   │   ├── VoiceSelector.tsx          # Browser TTS selector
│   │   └── PremiumVoiceSelector.tsx   # AWS Polly selector
│   ├── practice/              # Practice Features
│   │   ├── WordCard.tsx               # Main word display
│   │   ├── VocabularyList.tsx         # Word list sidebar
│   │   ├── ProgressTracker.tsx        # Progress display
│   │   ├── PracticeModeSelector.tsx   # Mode switcher
│   │   └── DifficultyFilter.tsx       # Difficulty filter
│   ├── settings/              # Settings
│   │   └── SettingsPanel.tsx          # Settings UI
│   └── shared/                # Shared Components
│       ├── OnboardingModal.tsx        # First-time guide
│       └── Skeleton.tsx               # Loading states
│
├── config/                    # Configuration
│   └── AppConfig.ts               # App configuration
│
├── stores/                    # State Management
│   ├── index.ts                   # Main Zustand store
│   └── types.ts                   # Store types
│
├── services/                  # Business Logic & API Clients
│   ├── ai/                    # AI Services
│   │   ├── geminiService.ts           # Google Gemini API
│   │   ├── recommendationService.ts   # AI recommendations
│   │   └── ...
│   ├── audio/                 # Audio Services
│   │   ├── TTSEngine.ts               # Web Speech API wrapper
│   │   └── pollyService.ts            # AWS Polly integration
│   ├── analytics/             # Analytics
│   │   └── analyticsService.ts        # PostHog tracking
│   ├── supabase/              # Supabase Integration
│   │   ├── supabaseClient.ts          # Client setup
│   │   └── authService.ts             # Authentication
│   └── session/               # Session Management
│       └── sessionManager.ts          # Practice tracking
│
├── data/                      # Data Management
│   ├── DatasetManager.ts          # Dataset loader
│   ├── DataSchema.ts              # Data validation
│   └── extractors/                # Data extractors
│
├── utils/                     # Utilities
│   ├── textUtils.ts               # Text processing
│   └── validation/                # Validation schemas
│
├── types/                     # TypeScript Type Definitions
│   ├── config.types.ts        # Config types
│   ├── dataset.types.ts       # Dataset types
│   └── index.ts               # Type exports
│
└── css/                       # Modular CSS (Tailwind + Custom)
    ├── variables.css          # Design tokens (222 vars)
    ├── animations.css         # Keyframe animations
    ├── components.css         # BEM components
    ├── style.css              # Main layout
    ├── responsive.css         # Media queries
    └── tailwind.css           # Tailwind directives
```

### **Data** (`data/`)
```
data/
├── source/pte/                # Source Markdown Files
│   ├── vocabs/                # 13 vocabulary books
│   │   ├── pte-fib-listening-with-ipa.md
│   │   ├── pte-beginner.md
│   │   ├── pte-intermediate.md
│   │   └── ... (10 more books)
│   └── practices/             # Practice sentences
│       ├── rs-sentences.md            # Repeat Sentence
│       ├── asq-questions.md           # Answer Short Question
│       └── wfd-sentences.md           # Write From Dictation
│
├── processed/                 # Generated JSON Datasets
│   ├── pte-fib-listening-dataset.json
│   ├── pte-beginner-dataset.json
│   └── ... (13 total datasets)
│
└── reports/                   # Build Reports
    └── pte-processing-report.json
```

### **Documentation** (`docs/`)
```
docs/
├── README.md                  # Documentation index
│
├── setup/                     # Setup Guides
│   ├── AWS-POLLY-SETUP.md             # AWS Polly TTS setup
│   ├── GEMINI-SETUP.md                # Google Gemini AI setup
│   ├── SUPABASE-SETUP-GUIDE.md        # Supabase config
│   └── SUPABASE-TESTING-GUIDE.md      # Testing guide
│
├── api/                       # API Reference
│   ├── API-REFERENCE.md               # Complete API docs
│   └── DATASET-SCHEMA.md              # Data schemas
│
├── architecture/              # System Design
│   ├── ARCHITECTURE.md                # System architecture
│   ├── GUIDELINES.md                  # Design principles
│   └── ARCHITECTURE-ANALYSIS.md       # Architecture analysis
│
├── guides/                    # How-To Guides
│   ├── DEPLOYMENT.md                  # Deploy to Vercel
│   ├── TROUBLESHOOTING.md             # Common issues
│   └── ENFORCING-GUIDELINES.md        # Development rules
│
└── archive/                   # Historical Documentation
    ├── UI-DESIGN.md                   # UI design history
    ├── UI-DESIGN-EVOLUTION.md         # Design evolution
    ├── REFACTORING-TODOS.md           # Project roadmap
    └── FINALIZATION-CHECKLIST.md      # Project status
```

### **Build & Deploy** (`scripts/`, `archive/`)
```
scripts/
├── pte-data-pipeline.js       # Markdown → JSON processor
├── validate.js                # Pre-commit validation
├── validate-docs.js           # Documentation checks
├── validate-structure.js      # Structure validation
└── build.js                   # Production build

archive/vanilla-js-legacy/     # Legacy Code (Build Only)
├── shared/
│   └── Config.js              # Pipeline configuration
└── data/extractors/           # Data Extractors (5 files)
    ├── PTETermsExtractor.js           # Dual IPA extractor
    ├── SingleIPATermsExtractor.js     # Single IPA extractor
    ├── PTESentenceExtractor.js        # Sentence extractor
    └── PTEQuestionExtractor.js        # Question extractor
```

### **Cloud Infrastructure** (`supabase/`, `api/`)
```
supabase/
└── migrations/                # Database Schema
    ├── 20241101000000_initial_schema.sql
    └── 20241101000001_add_analytics.sql

api/                           # Vercel Serverless Functions
└── polly-tts.ts               # AWS Polly proxy endpoint
```

---

## 🛠️ Tech Stack

### **Frontend**
- **React 19.2.0** - UI framework
- **TypeScript 5.9.3** - Type safety (100% coverage)
- **Zustand** - State management
- **Radix UI** - Accessible component primitives
- **Tailwind CSS 3.4** - Utility-first styling
- **Vite 7.2.2** - Build tool & dev server

### **Backend & Cloud**
- **Supabase** - PostgreSQL + Auth + Storage
- **AWS Polly** - Premium neural TTS (18 voices)
- **Google Gemini** - FREE AI chat & recommendations
- **Vercel** - Serverless deployment

### **Audio**
- **Web Speech API** - Browser TTS (free)
- **AWS Polly** - Premium neural voices (paid)
- **Audio Caching** - Supabase Storage

### **Build & DevOps**
- **Vite** - Fast HMR development
- **TypeScript Compiler** - Type checking
- **ESLint** - Code linting
- **Vitest** - Unit testing
- **Husky** - Git hooks (pre-commit validation)
- **Service Worker** - Offline PWA support

---

## 🌟 What's New (v3.0.1 - November 2025)

### ✅ TypeScript Migration (100%)
- All 35 modules migrated
- Full type safety (strict mode)
- Zero compilation errors
- Automatic JS generation

### ✅ Supabase Integration
- User authentication ready
- Progress sync across devices
- Settings sync implemented
- Study analytics infrastructure
- Interactive test page created

### ✅ Repository Cleanup
- Removed build artifacts
- Archived outdated docs
- Clean production structure
- ES module conversion

### ✅ Documentation Overhaul
- 4 new guides (1,900+ lines)
- Architecture decisions documented
- Step-by-step testing guides
- Integration examples

---

## 🧪 Testing

### Unit Tests
```bash
npm test              # Jest tests
npm run test:ts       # TypeScript + tests
```

### Supabase Testing
```bash
npm run dev
# Open: http://localhost:3001/test-supabase.html
# Guide: docs/SUPABASE-TESTING-GUIDE.md
```

### Validation
```bash
npm run validate      # Validate datasets
npm run lint          # Code quality
```

---

## 📊 Data Overview

### Vocabulary
- **16 books** with IPA pronunciation
- **13,800+ terms** across all difficulty levels
- **Dual IPA format** (British + American)
- **Category-based** filtering
- **3 specialized books** (RS Core, DI/RL Templates, SST Complete)

### Practice
- **620 RS sentences** for pronunciation
- **692 ASQ questions** with answers
- **1,195 WFD sentences** for dictation
- **20 DI answers** for shadowing practice

### User Data (Supabase)
- **Profiles** - User accounts
- **Progress** - Learning progress per dataset
- **Settings** - User preferences
- **Sessions** - Study analytics
- **Mastery** - Spaced repetition data

---

## 🎯 Roadmap

### ✅ Completed (Nov 2025)
- TypeScript 100%
- Supabase infrastructure
- Testing suite
- Documentation
- **DI Shadowing Practice mode**
- **Smart defaults for all study types**
- **Playback speed control (0.5x - 2.0x)**
- **Natural all-caps pronunciation**
- **16 vocabulary books (13,800+ terms)**

### 🔄 In Progress
- Manual Supabase testing
- Main app integration
- UI sync indicators

### 📅 Upcoming
- Spaced repetition algorithm
- Analytics dashboard
- Community word lists
- Mobile app (PWA)
- More DI shadowing content (Images 21-30, 31-40, etc.)

---

## 🤝 Contributing

See:
- [CLAUDE.md](CLAUDE.md) - Start here for AI-assisted development
- [GUIDELINES.md](docs/architecture/GUIDELINES.md) - Coding standards & design principles
- [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) - System design & architecture

---

## 📜 License

MIT License

---

## 📞 Support

- 📖 **Docs**: [docs/](docs/) directory
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions

---

## 🙏 Acknowledgments

- PTE Community for vocabulary
- Supabase for cloud infrastructure
- Vercel for hosting
- Claude AI for development assistance

---

**Built with ❤️ for PTE learners worldwide**

**Current Version**: 3.0.1 (November 2025)
**Status**: Production Ready ✅
**TypeScript**: 100% Migrated ✅
**Cloud Sync**: Ready for Testing ✅
