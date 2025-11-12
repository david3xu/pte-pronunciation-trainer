# 🔄 Workflow Diagrams

**PTE Pronunciation Trainer - Visual Workflows & Data Flows**

This document provides comprehensive visual diagrams (ASCII art) for understanding application workflows, user journeys, data flows, and development processes.

---

## 📋 Table of Contents

- [User Workflows](#user-workflows)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Development Workflows](#development-workflows)
- [Build & Deployment](#build--deployment)
- [Feature Development Lifecycle](#feature-development-lifecycle)
- [State Management Flow](#state-management-flow)
- [API Request Flow](#api-request-flow)
- [Error Handling Flow](#error-handling-flow)

---

## 👤 User Workflows

### 1. New User Onboarding (Future)

```
┌─────────────────────────────────────────────────────────┐
│                  NEW USER JOURNEY                        │
└─────────────────────────────────────────────────────────┘

START: User visits app
        ↓
┌───────────────────┐
│ Landing Page      │
│ - "Start Practice"│
│ - "Sign Up"       │
└───────┬───────────┘
        │
        ├──→ [Guest Mode] ──→ Practice without account
        │                    (localStorage only)
        │
        └──→ [Sign Up]
                ↓
        ┌────────────────┐
        │ Sign Up Form   │
        │ - Email        │
        │ - Password     │
        └────────┬───────┘
                 ↓
        ┌────────────────┐
        │ Email Verify   │
        │ (Supabase)     │
        └────────┬───────┘
                 ↓
        ┌────────────────────┐
        │ Onboarding Survey  │ (Future)
        │ - PTE exam date?   │
        │ - Current level?   │
        │ - Daily goal?      │
        └────────┬───────────┘
                 ↓
        ┌────────────────────┐
        │ Practice Dashboard │
        │ - Welcome message  │
        │ - First session    │
        └────────┬───────────┘
                 ↓
            Practice Loop
                 ↓
            END: Regular User
```

### 2. Daily Practice Session (Current)

```
┌─────────────────────────────────────────────────────────┐
│              DAILY PRACTICE WORKFLOW                     │
└─────────────────────────────────────────────────────────┘

START: User opens app
        ↓
┌────────────────────────┐
│ Practice Dashboard     │
│ [Shows last session]   │
└──────────┬─────────────┘
           │
           ├──→ [Continue Last] → Resume from last word/sentence
           │
           ├──→ [New Session] → Select mode/difficulty
           │
           └──→ [AI Recommendations] → Get AI suggestions
                      ↓
              ┌──────────────────┐
              │ Select Practice  │
              │ Mode:            │
              │ • Vocabulary     │
              │ • RS             │
              │ • ASQ            │
              │ • WFD            │
              └────────┬─────────┘
                       ↓
              ┌──────────────────┐
              │ Select Difficulty│
              │ • All            │
              │ • Easy           │
              │ • Normal         │
              │ • Hard           │
              └────────┬─────────┘
                       ↓
          ┌────────────────────────┐
          │   PRACTICE LOOP        │
          │                        │
          │  1. Display word/item  │
          │         ↓              │
          │  2. Auto-play TTS      │
          │     (if enabled)       │
          │         ↓              │
          │  3. User interactions: │
          │     • Listen again     │
          │     • Next/Previous    │
          │     • Pause            │
          │         ↓              │
          │  4. Track progress     │
          │     • Items practiced  │
          │     • Time spent       │
          │         ↓              │
          │  5. Next item or end   │
          │         ↓              │
          └────────┬───────────────┘
                   │
            [Complete Session]
                   ↓
          ┌────────────────────┐
          │ Session Summary    │
          │ • Items practiced  │
          │ • Time spent       │
          │ • Accuracy (future)│
          │ • Next steps       │
          └────────┬───────────┘
                   ↓
          ┌────────────────────┐
          │ Sync to Cloud      │
          │ (if authenticated) │
          └────────┬───────────┘
                   ↓
          ┌────────────────────┐
          │ View Progress Tab  │
          │ • Charts           │
          │ • Stats            │
          │ • Streaks          │
          └────────────────────┘
                   ↓
              END: Session complete
```

### 3. AI Tutor Chat Workflow (Planned)

```
┌─────────────────────────────────────────────────────────┐
│              AI TUTOR CHAT WORKFLOW                      │
└─────────────────────────────────────────────────────────┘

START: User clicks "💬 AI Tutor" button
        ↓
┌────────────────────────┐
│ AI Tutor Chat Modal    │
│ Opens with context     │
│ - Current word         │
│ - Practice mode        │
│ - User progress        │
└──────────┬─────────────┘
           │
    [User has 3 options]
           │
           ├──→ [Quick Action Buttons]
           │         ↓
           │    • "Explain this word"
           │    • "Give me examples"
           │    • "Pronunciation tips"
           │    • "Similar words"
           │         ↓
           │    API call with pre-filled prompt
           │         ↓
           │    AI response displayed
           │
           ├──→ [Type Custom Question]
           │         ↓
           │    User types in text area
           │         ↓
           │    Click "Send"
           │         ↓
           │    ┌──────────────────┐
           │    │ API Request      │
           │    │ POST /api/ai/chat│
           │    │ {                │
           │    │   message,       │
           │    │   context,       │
           │    │   history        │
           │    │ }                │
           │    └────────┬─────────┘
           │             ↓
           │    ┌──────────────────┐
           │    │ Gemini API       │
           │    │ (Free tier)      │
           │    └────────┬─────────┘
           │             ↓
           │    ┌──────────────────┐
           │    │ AI Response      │
           │    │ (Markdown)       │
           │    └────────┬─────────┘
           │             ↓
           │    Display in chat bubble
           │         ↓
           │    Conversation history updated
           │
           └──→ [View Conversation History]
                     ↓
                Scroll through past messages
                     ↓
                Continue conversation or close
                     ↓
               END: Return to practice
```

### 4. Pronunciation Scoring Workflow (Planned)

```
┌─────────────────────────────────────────────────────────┐
│          PRONUNCIATION SCORING WORKFLOW                  │
└─────────────────────────────────────────────────────────┘

START: User clicks "🔊 Practice" button
        ↓
┌────────────────────────┐
│ Scoring Modal Opens    │
│ Shows current word     │
│ + Target IPA           │
└──────────┬─────────────┘
           ↓
    [Grant Mic Permission]
           ↓
        Granted?
         ├─ No  → Show error, use fallback
         └─ Yes → Continue
                    ↓
            ┌─────────────────┐
            │ Ready to Record │
            │ [🎙️ Press to    │
            │   Record]       │
            └────────┬────────┘
                     ↓
              [User presses]
                     ↓
            ┌─────────────────┐
            │ Recording...    │
            │ 🔴 00:03        │
            │ [Waveform]      │
            └────────┬────────┘
                     ↓
              [Auto-stop or
               user clicks again]
                     ↓
            ┌─────────────────┐
            │ Processing...   │
            │ (Web Speech     │
            │  Recognition)   │
            └────────┬────────┘
                     ↓
        Transcription: "ubiquitous"
                     ↓
            ┌─────────────────┐
            │ API Request     │
            │ POST /api/      │
            │ pronunciation-  │
            │ score           │
            │ {               │
            │   targetWord,   │
            │   targetIPA,    │
            │   userTranscript│
            │ }               │
            └────────┬────────┘
                     ↓
            ┌─────────────────┐
            │ Gemini API      │
            │ Analyzes attempt│
            └────────┬────────┘
                     ↓
            ┌─────────────────┐
            │ Score: 85/100   │
            │                 │
            │ ✅ Strengths:   │
            │  • Good stress  │
            │  • Clear ending │
            │                 │
            │ ⚠️ Improve:     │
            │  • "oo" sound   │
            │  • Pace faster  │
            │                 │
            │ Phoneme Analysis│
            │ /juː/ ✅ Good   │
            │ /ˈbɪk/ ⚠️ Fair  │
            │ /wɪ/ ✅ Good    │
            │ /təs/ ✅ Good   │
            │                 │
            │ [🔊 Your Try]   │
            │ [🔊 Target]     │
            └────────┬────────┘
                     ↓
          [User can]
           ├─→ Try Again (new attempt)
           ├─→ Compare Audio (play both)
           └─→ Close (return to practice)
                     ↓
         History saved (attempts + scores)
                     ↓
              END: Return to practice
```

---

## 📊 Data Flow Diagrams

### 1. Application Initialization

```
┌─────────────────────────────────────────────────────────┐
│           APPLICATION INITIALIZATION FLOW                │
└─────────────────────────────────────────────────────────┘

Browser loads index.html
        ↓
┌───────────────────┐
│ Load CSS          │
│ (Tailwind,        │
│  custom styles)   │
└─────────┬─────────┘
          ↓
┌───────────────────┐
│ Load React        │
│ - React 19        │
│ - ReactDOM        │
└─────────┬─────────┘
          ↓
┌───────────────────┐
│ Load main.tsx     │
│ (Vite entry)      │
└─────────┬─────────┘
          ↓
┌───────────────────────────┐
│ Initialize Zustand Store  │
│ - Load from localStorage  │
│ - Rehydrate state         │
│ - Connect DevTools        │
└─────────┬─────────────────┘
          ↓
┌───────────────────┐
│ Render <App/>     │
│ (src/App.tsx)     │
└─────────┬─────────┘
          ↓
┌───────────────────────────┐
│ Initialize Auth (Supabase)│
│ - Check session           │
│ - Load user               │
└─────────┬─────────────────┘
          │
   [User authenticated?]
          │
     ├─ Yes → Load user data
     │         ├→ User progress
     │         ├→ User settings
     │         └→ Start sync service
     │
     └─ No  → Guest mode
               └→ Use localStorage only
                     ↓
┌───────────────────────────┐
│ Load Default Dataset      │
│ (pte-fib-listening)       │
└─────────┬─────────────────┘
          ↓
┌───────────────────┐
│ Render UI         │
│ - WordCard        │
│ - AudioControls   │
│ - Modals (hidden) │
└─────────┬─────────┘
          ↓
┌───────────────────┐
│ Register Service  │
│ Worker (v65)      │
└─────────┬─────────┘
          ↓
┌───────────────────┐
│ Track Analytics   │
│ (PostHog)         │
└─────────┬─────────┘
          ↓
    App Ready ✅
```

### 2. Dataset Loading Flow

```
┌─────────────────────────────────────────────────────────┐
│              DATASET LOADING FLOW                        │
└─────────────────────────────────────────────────────────┘

User selects mode (e.g., "PTE Beginner")
        ↓
┌─────────────────────────┐
│ PracticeModeSelector    │
│ onChange event          │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ Zustand Action          │
│ settings.updateSetting  │
│ ('practiceMode',        │
│  'pte-beginner')        │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ PTEVocabularyManager    │
│ .loadDataset(mode)      │
└──────────┬──────────────┘
           ↓
    [Check if cached?]
         ├─ Yes → Return from memory
         │         (skip fetch)
         │
         └─ No  → Fetch from server
                     ↓
            ┌────────────────────┐
            │ DatasetManager     │
            │ .loadData(path)    │
            └─────────┬──────────┘
                      ↓
            ┌────────────────────┐
            │ fetch(             │
            │  '/data/processed/ │
            │   pte-beginner.json'│
            │ )                  │
            └─────────┬──────────┘
                      ↓
              [Network response]
                 ├─ Success (200)
                 │      ↓
                 │  Parse JSON
                 │      ↓
                 │  Validate schema
                 │   (DataSchema)
                 │      ↓
                 │  Cache in memory
                 │      ↓
                 │  Update Zustand:
                 │  vocabulary.setDataset(data, mode)
                 │      ↓
                 │  vocabulary.setLoading(false)
                 │      ↓
                 │  React re-renders:
                 │  - VocabularyList
                 │  - WordCard
                 │      ↓
                 │  Display first item
                 │      ↓
                 │  Emit analytics event:
                 │  'dataset_loaded'
                 │
                 └─ Error (4xx, 5xx, network)
                        ↓
                   Retry logic:
                   - Attempt 1: Wait 1s
                   - Attempt 2: Wait 2s
                   - Attempt 3: Wait 4s
                        ↓
                   [Still failing?]
                        ↓
                   Update Zustand:
                   vocabulary.setError(message)
                        ↓
                   Display error in UI
                        ↓
                   Fallback: Show cached data
                   (if available)
                        ↓
                   END: User sees error or cached data
```

### 3. TTS Pronunciation Flow

```
┌─────────────────────────────────────────────────────────┐
│             TTS PRONUNCIATION FLOW                       │
└─────────────────────────────────────────────────────────┘

User clicks "Speak" button
        ↓
┌────────────────────────┐
│ WordCard.tsx           │
│ onClick={handleSpeak}  │
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ Update Zustand State   │
│ tts.startSpeaking(word)│
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ TTSEngine.speak(text)  │
└──────────┬─────────────┘
           ↓
    [Premium TTS enabled?]
         │
         ├─ Yes → Premium Flow
         │         ↓
         │  ┌──────────────────┐
         │  │ Check cache:     │
         │  │ audio_cache table│
         │  └────────┬─────────┘
         │           │
         │    [Cached?]
         │      ├─ Yes → Fetch from Supabase Storage
         │      │         ↓
         │      │    Play audio URL
         │      │         ↓
         │      │    tts.stopSpeaking()
         │      │         ↓
         │      │    END: Done (fast!)
         │      │
         │      └─ No  → Generate new
         │              ↓
         │         ┌──────────────────┐
         │         │ API Request      │
         │         │ POST /api/audio/ │
         │         │ generate         │
         │         │ {                │
         │         │   text,          │
         │         │   voiceId,       │
         │         │   engine,        │
         │         │   rate           │
         │         │ }                │
         │         └────────┬─────────┘
         │                  ↓
         │         ┌──────────────────┐
         │         │ AWS Polly API    │
         │         │ synthesizeSpeech │
         │         └────────┬─────────┘
         │                  ↓
         │         Audio stream (MP3)
         │                  ↓
         │         ┌──────────────────┐
         │         │ Upload to        │
         │         │ Supabase Storage │
         │         │ /audio-cache/    │
         │         └────────┬─────────┘
         │                  ↓
         │         ┌──────────────────┐
         │         │ Save metadata    │
         │         │ to audio_cache   │
         │         │ table            │
         │         └────────┬─────────┘
         │                  ↓
         │         Return audio URL
         │                  ↓
         │         Play audio
         │                  ↓
         │         tts.stopSpeaking()
         │                  ↓
         │         END: Done (cached for next time)
         │
         └─ No  → Browser TTS (Free)
                   ↓
            ┌──────────────────┐
            │ Get browser voices│
            │ speechSynthesis   │
            │ .getVoices()      │
            └────────┬──────────┘
                     ↓
            Select best voice:
            1. Google UK English Female
            2. Microsoft Zira (UK)
            3. Any en-GB voice
            4. Fallback: first en-* voice
                     ↓
            ┌──────────────────┐
            │ Create utterance │
            │ new SpeechSynthesis│
            │ Utterance(text)  │
            │ - voice          │
            │ - rate (0.7-1.3) │
            │ - volume (1.0)   │
            └────────┬──────────┘
                     ↓
            ┌──────────────────┐
            │ speechSynthesis  │
            │ .speak(utterance)│
            └────────┬──────────┘
                     ↓
            Browser speaks text
                     ↓
            ┌──────────────────┐
            │ onend event      │
            │ triggers         │
            └────────┬──────────┘
                     ↓
            tts.stopSpeaking()
                     ↓
            END: Done
```

---

## 🛠️ Development Workflows

### 1. Daily Development Workflow

```
┌─────────────────────────────────────────────────────────┐
│           DAILY DEVELOPMENT WORKFLOW                     │
└─────────────────────────────────────────────────────────┘

START: Begin work day
        ↓
┌────────────────────┐
│ 1. Pull latest     │
│ git pull origin    │
│ main               │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ 2. Create branch   │
│ git checkout -b    │
│ feature/my-feature │
└─────────┬──────────┘
          ↓
┌────────────────────────┐
│ 3. Start dev server    │
│ npm run dev            │
│ (localhost:3001)       │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 4. Make changes        │
│ - Edit files           │
│ - Hot reload (Vite HMR)│
│ - Test in browser      │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 5. Compile TypeScript  │
│ npm run compile:ts     │
│ (if edited src/ts/)    │
└─────────┬──────────────┘
          ↓
┌────────────────────┐
│ 6. Run tests       │
│ npm test           │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ 7. Lint & type-check│
│ npm run lint       │
└─────────┬──────────┘
          ↓
     [All pass?]
        ├─ No  → Fix issues, go back to step 4
        │
        └─ Yes → Continue
                  ↓
            ┌────────────────────┐
            │ 8. Commit changes  │
            │ git add .          │
            │ git commit -m      │
            │ "feat: add feature"│
            └─────────┬──────────┘
                      ↓
            ┌────────────────────┐
            │ 9. Push to remote  │
            │ git push -u origin │
            │ feature/my-feature │
            └─────────┬──────────┘
                      ↓
            ┌────────────────────┐
            │ 10. Create PR      │
            │ (GitHub UI)        │
            └─────────┬──────────┘
                      ↓
                 Code Review
                      ↓
                 Merge to main
                      ↓
              END: Feature deployed
```

### 2. Feature Development Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│         FEATURE DEVELOPMENT LIFECYCLE                    │
└─────────────────────────────────────────────────────────┘

START: New feature request
        ↓
┌────────────────────────┐
│ 1. PLANNING            │
│ - Review requirements  │
│ - Check architecture   │
│ - Estimate effort      │
│ - Break into tasks     │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 2. DESIGN              │
│ - Component design     │
│ - API design           │
│ - State management     │
│ - Test strategy        │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 3. IMPLEMENTATION      │
│ ┌──────────────────┐   │
│ │ TDD Approach:    │   │
│ │                  │   │
│ │ Write Test (RED) │   │
│ │      ↓           │   │
│ │ Write Code (GREEN)│  │
│ │      ↓           │   │
│ │ Refactor         │   │
│ │      ↓           │   │
│ │ Repeat           │   │
│ └──────────────────┘   │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 4. TESTING             │
│ - Unit tests ✅        │
│ - Component tests ✅   │
│ - Integration tests ✅ │
│ - Manual testing ✅    │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 5. CODE REVIEW         │
│ - Create PR            │
│ - Request reviewers    │
│ - Address feedback     │
│ - Approve              │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 6. QA                  │
│ - Deploy to staging    │
│ - QA testing           │
│ - Bug fixes            │
│ - Re-test              │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 7. DEPLOYMENT          │
│ - Merge to main        │
│ - Deploy to production │
│ - Monitor              │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 8. MONITORING          │
│ - Error tracking       │
│ - Analytics            │
│ - User feedback        │
│ - Performance          │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 9. DOCUMENTATION       │
│ - Update docs          │
│ - Changelog            │
│ - Release notes        │
└──────────────────────┘
          ↓
    END: Feature complete
```

---

## 🚀 Build & Deployment

### 1. Build Pipeline

```
┌─────────────────────────────────────────────────────────┐
│               BUILD PIPELINE                             │
└─────────────────────────────────────────────────────────┘

git push origin main
        ↓
┌────────────────────────┐
│ GitHub Actions (CI)    │
│ [Trigger: push to main]│
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 1. Install Dependencies│
│ npm ci                 │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 2. Lint Code           │
│ npm run lint           │
└─────────┬──────────────┘
          ↓
     [Pass?]
       ├─ No  → FAIL (exit)
       └─ Yes → Continue
                  ↓
            ┌────────────────────┐
            │ 3. Type Check      │
            │ npm run lint:ts    │
            └─────────┬──────────┘
                      ↓
                 [Pass?]
                   ├─ No  → FAIL (exit)
                   └─ Yes → Continue
                              ↓
                        ┌────────────────────┐
                        │ 4. Run Tests       │
                        │ npm run test       │
                        │ --coverage         │
                        └─────────┬──────────┘
                                  ↓
                             [Pass + Coverage ≥ 80%?]
                               ├─ No  → FAIL (exit)
                               └─ Yes → Continue
                                          ↓
                                    ┌─────────────────┐
                                    │ 5. Compile TS   │
                                    │ npm run         │
                                    │ compile:ts      │
                                    └────────┬────────┘
                                             ↓
                                    ┌─────────────────┐
                                    │ 6. Process Data │
                                    │ npm run         │
                                    │ data:pte        │
                                    └────────┬────────┘
                                             ↓
                                    ┌─────────────────┐
                                    │ 7. Build App    │
                                    │ vite build      │
                                    │ (minify, tree-  │
                                    │  shake, bundle) │
                                    └────────┬────────┘
                                             ↓
                                        dist/ folder
                                             ↓
                                    ┌─────────────────┐
                                    │ 8. Upload Artifacts│
                                    │ - coverage/     │
                                    │ - dist/         │
                                    └────────┬────────┘
                                             ↓
                                    ┌─────────────────┐
                                    │ 9. Deploy       │
                                    │ (Vercel)        │
                                    └────────┬────────┘
                                             ↓
                                        Production ✅
```

### 2. Vercel Deployment Flow

```
┌─────────────────────────────────────────────────────────┐
│           VERCEL DEPLOYMENT FLOW                         │
└─────────────────────────────────────────────────────────┘

GitHub: Merge to main
        ↓
┌────────────────────────┐
│ Vercel Webhook         │
│ (Auto-triggered)       │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 1. Clone Repository    │
│ git clone              │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 2. Install Dependencies│
│ npm ci                 │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 3. Run Build Command   │
│ npm run vercel-build   │
│ ├─ compile:ts          │
│ ├─ data:pte            │
│ └─ vite build          │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 4. Deploy Static Assets│
│ (dist/ folder)         │
│ → Vercel CDN (Global)  │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 5. Deploy Serverless   │
│ Functions (api/ folder)│
│ → Vercel Edge Network  │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 6. Set Environment Vars│
│ - GEMINI_API_KEY       │
│ - AWS_ACCESS_KEY_ID    │
│ - SUPABASE_URL         │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ 7. Run Health Checks   │
│ - Smoke tests          │
│ - API endpoint tests   │
└─────────┬──────────────┘
          ↓
     [All pass?]
       ├─ No  → Rollback
       │         ↓
       │    Keep previous version
       │         ↓
       │    Alert team
       │
       └─ Yes → Go Live
                  ↓
            ┌────────────────────┐
            │ 8. Update DNS      │
            │ Point to new deploy│
            └─────────┬──────────┘
                      ↓
            ┌────────────────────┐
            │ 9. Monitor         │
            │ - Error rates      │
            │ - Response times   │
            │ - User traffic     │
            └─────────┬──────────┘
                      ↓
                Production Live ✅
```

---

## 🔐 State Management Flow

### Zustand Store Update Pattern

```
┌─────────────────────────────────────────────────────────┐
│           ZUSTAND STATE UPDATE FLOW                      │
└─────────────────────────────────────────────────────────┘

User Action (e.g., click button)
        ↓
┌────────────────────────┐
│ React Component        │
│ const { action } =     │
│   useAppStore((state)  │
│   => state.slice)      │
│                        │
│ onClick={() => action()}│
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ Zustand Action         │
│ (defined in stores/)   │
│                        │
│ action: () => set(     │
│   (state) => ({        │
│     slice: {           │
│       ...state.slice,  │
│       property: newValue│
│     }                  │
│   })                   │
│ )                      │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ State Updated          │
│ (immutable update)     │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ Subscribers Notified   │
│ (React components using│
│  this state slice)     │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ Components Re-render   │
│ (only affected ones)   │
└─────────┬──────────────┘
          ↓
┌────────────────────────┐
│ UI Updated             │
│ (new state displayed)  │
└────────────────────────┘
          ↓
┌────────────────────────┐
│ Optional: Side Effects │
│ - Analytics tracking   │
│ - localStorage persist │
│ - Supabase sync        │
└────────────────────────┘
```

---

## 📚 Related Documents

- **[LIFECYCLE-OVERVIEW.md](./LIFECYCLE-OVERVIEW.md)** - Project lifecycle phases
- **[ARCHITECTURE-DESIGN.md](./ARCHITECTURE-DESIGN.md)** - System architecture
- **[TESTING-STRATEGY.md](./TESTING-STRATEGY.md)** - Testing approach
- **[DEVELOPMENT-PROCESS.md](./DEVELOPMENT-PROCESS.md)** - Daily development process

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** ✅ Complete
