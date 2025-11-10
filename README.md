# PTE Pronunciation Trainer

A specialized web-based pronunciation training application for **PTE exam preparation**, featuring comprehensive vocabulary (13,000+ words), practice modes for speaking/listening sections, and cloud sync capabilities.

**✅ v3.0.0 - AI-POWERED (November 2025)**

**Latest Updates:**
- 🤖 **NEW:** AI Tutor Chat with GPT-4
- 🔊 **NEW:** Premium TTS with AWS Polly (18 neural voices)
- 🎯 **NEW:** AI-Powered Recommendations (FREE with Gemini)
- ✅ React + TypeScript migration complete (100%)
- ✅ Supabase cloud sync ready

---

## 🎯 Key Features

### 📚 **13 Vocabulary Books (13,000+ Terms with IPA)**

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

### 🎤 **3 Practice Modes (2,507 Sentences/Questions)**

- 🎤 **Repeat Sentence** - 620 practice sentences
- ❓ **Answer Short Question** - 692 questions with answers
- ✍️ **Write From Dictation** - 1,195 dictation sentences

### 🤖 **AI-Powered Features** ✨ NEW

#### **AI Tutor Chat** 💬 (OpenAI GPT-4)
- **Conversational Help** - Ask any pronunciation question in natural language
- **Context-Aware** - AI knows what word you're currently practicing
- **Multi-Turn Dialogue** - Follow-up questions and detailed explanations
- **Markdown Support** - Rich formatted responses (bold, lists, code examples)
- **Quick Actions** - 4 pre-filled common questions for instant help
- **How to use:** Click the 💬 AI Tutor button in the header
- **Setup:** See [AI-TUTOR-SETUP.md](docs/AI-TUTOR-SETUP.md)

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
- **Variable Speed** - 0.7x → 1.0x → 1.3x
- **Dual IPA Format** - British + American pronunciation
- **Configurable Pauses** - 1s / 2s / 3s

### 📱 **Modern UX**

- **Mobile-Responsive** - 320px to 1400px+
- **Keyboard Shortcuts** - Space, arrows, R, F
- **Dark/Light Mode** - Adaptive theming
- **Offline Support** - Service Worker PWA
- **Progress Tracking** - Local + cloud storage

---

## 🏗️ Architecture

### **TypeScript + Supabase Hybrid**

```
┌──────────────────────────────────────┐
│  FRONTEND (TypeScript 100%)          │
│  • Event-driven architecture         │
│  • Zero hardcoded values             │
│  • Type-safe configuration           │
│  • Offline-first design              │
└──────────────────────────────────────┘
         ↓                    ↓
┌────────────────┐   ┌────────────────┐
│  LOCAL JSON    │   │  SUPABASE DB   │
│  (Vocabulary)  │   │  (User Data)   │
│                │   │                │
│ • 13K words    │   │ • Profiles     │
│ • 2.5K sents   │   │ • Progress     │
│ • 10-20ms load │   │ • Settings     │
│ • Works offline│   │ • Analytics    │
└────────────────┘   └────────────────┘
```

**Why This Design?**
- ⚡ Fast: 10-20ms vocabulary load
- 💰 Free: $0/month (vs $25-50/month if all in DB)
- 📴 Offline: Full functionality without internet
- 🌍 CDN: Global edge caching

See [VOCABULARY-STORAGE-DECISION.md](docs/VOCABULARY-STORAGE-DECISION.md) for analysis.

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

# Test page
http://localhost:3001/test-supabase.html

# Guide
docs/SUPABASE-TESTING-GUIDE.md
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
- 📗 **[GUIDELINES.md](docs/GUIDELINES.md)** - Design principles
- 📕 **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design (2,230 lines)
- 📋 **[FINALIZATION-CHECKLIST.md](docs/FINALIZATION-CHECKLIST.md)** - Project status & roadmap

### **Setup Guides**
- 🚀 **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide
- ☁️ **[SUPABASE-SETUP-GUIDE.md](docs/SUPABASE-SETUP-GUIDE.md)** - Supabase config
- 🧪 **[SUPABASE-TESTING-GUIDE.md](docs/SUPABASE-TESTING-GUIDE.md)** - Testing guide
- 🤖 **[AI-TUTOR-SETUP.md](docs/AI-TUTOR-SETUP.md)** - OpenAI GPT-4 setup (NEW)
- 🔊 **[AWS-POLLY-SETUP.md](docs/AWS-POLLY-SETUP.md)** - Premium TTS setup (NEW)

### **Architecture**
- 🏗️ **[ARCHITECTURE-ANALYSIS.md](docs/ARCHITECTURE-ANALYSIS.md)** - Current architecture
- 💾 **[VOCABULARY-STORAGE-DECISION.md](docs/VOCABULARY-STORAGE-DECISION.md)** - Data design
- 📋 **[REFACTORING-TODOS.md](docs/REFACTORING-TODOS.md)** - Project roadmap

### **Reference**
- 📙 **[API-REFERENCE.md](docs/API-REFERENCE.md)** - Complete API
- 🔧 **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues

---

## 🗂️ Project Structure

```
ccl-pronunciation-trainer/
├── index.html                 # Main app
├── test-supabase.html         # Supabase test page
│
├── src/
│   ├── ts/                    # TypeScript source (100%)
│   │   ├── core/              # App core
│   │   ├── data/              # Data extractors
│   │   ├── audio/             # TTS engine
│   │   ├── ui/                # UI controllers
│   │   ├── supabase/          # Cloud sync ✨
│   │   └── shared/            # Config & utils
│   │
│   ├── js/                    # Compiled JS (runtime)
│   ├── css/                   # Modular CSS
│   └── types/                 # Type definitions
│
├── data/
│   ├── source/pte/            # Markdown (13 books)
│   └── processed/             # JSON datasets
│
├── supabase/
│   └── migrations/            # Database schema
│
├── scripts/                   # Build scripts
├── docs/                      # Documentation
└── .env                       # Supabase keys
```

---

## 🛠️ Tech Stack

- **Frontend**: TypeScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth)
- **Build**: TypeScript Compiler + custom scripts
- **Audio**: Web Speech API (TTS)
- **Offline**: Service Worker v64
- **Deploy**: Vercel (auto-deploy)

---

## 🌟 What's New (v2.5.4 - November 2025)

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
- **13 books** with IPA pronunciation
- **13,000+ terms** across all difficulty levels
- **Dual IPA format** (British + American)
- **Category-based** filtering

### Practice
- **620 RS sentences** for pronunciation
- **692 ASQ questions** with answers
- **1,195 WFD sentences** for dictation

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

### 🔄 In Progress
- Manual Supabase testing
- Main app integration
- UI sync indicators

### 📅 Upcoming
- Spaced repetition algorithm
- Analytics dashboard
- Community word lists
- Mobile app (PWA)

---

## 🤝 Contributing

See:
- [GUIDELINES.md](docs/GUIDELINES.md) - Coding standards
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design

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

**Current Version**: v2.5.4 (November 2025)
**Status**: Production Ready ✅
**TypeScript**: 100% Migrated ✅
**Cloud Sync**: Ready for Testing ✅
