# 🏗️ Architecture Design

**PTE Pronunciation Trainer - System Architecture & Module Interactions**

This document details the complete system architecture, how modules interact, and how data flows through the application.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Layers](#system-layers)
- [Module Interactions](#module-interactions)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [API Architecture](#api-architecture)
- [Database Schema](#database-schema)
- [Component Hierarchy](#component-hierarchy)
- [Integration Patterns](#integration-patterns)

---

## 🎨 Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        USER BROWSER                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              REACT APPLICATION (SPA)                │  │
│  │                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │  │
│  │  │ Components   │  │ Zustand      │  │ TypeScript│ │  │
│  │  │ (React 19)   │◄─┤ State Store  │  │ Services  │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │  │
│  │         │                  │               │        │  │
│  │         └──────────────────┴───────────────┘        │  │
│  │                        │                            │  │
│  └────────────────────────┼────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────┼────────────────────────────┐  │
│  │       SERVICE WORKER (Offline Cache, v65)          │  │
│  └────────────────────────┼────────────────────────────┘  │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┼───────────────────────────────┐
│                   BACKEND SERVICES                        │
├───────────────────────────┼───────────────────────────────┤
│                           │                               │
│  ┌────────────────────────▼────────────────────────────┐  │
│  │       VERCEL SERVERLESS FUNCTIONS                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │
│  │  │ AI APIs    │  │ TTS APIs   │  │ Voice APIs   │  │  │
│  │  │ (Gemini)   │  │ (Polly)    │  │ (Polly)      │  │  │
│  │  └────────────┘  └────────────┘  └──────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────▼────────────────────────────┐  │
│  │              SUPABASE (BaaS)                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │
│  │  │ PostgreSQL │  │ Auth       │  │ Storage      │  │  │
│  │  │ (User Data)│  │ (Users)    │  │ (Audio Cache)│  │  │
│  │  └────────────┘  └────────────┘  └──────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────▼────────────────────────────┐  │
│  │           EXTERNAL SERVICES                         │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │
│  │  │ Google     │  │ AWS Polly  │  │ PostHog      │  │  │
│  │  │ Gemini AI  │  │ Neural TTS │  │ Analytics    │  │  │
│  │  └────────────┘  └────────────┘  └──────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns** - Frontend (React) ↔ Backend (Vercel Functions) ↔ Data (Supabase)
2. **API-First** - All backend logic exposed via RESTful APIs
3. **State-Driven** - Zustand manages all application state
4. **Type-Safe** - TypeScript 100% across frontend and backend
5. **Offline-Capable** - Service Worker caches assets and data
6. **Scalable** - Serverless architecture scales automatically

---

## 📚 System Layers

### Layer 1: Presentation (React Components)
**Location:** `src/components/`, `src/App.tsx`
**Responsibility:** User interface, user interactions
**Dependencies:** Zustand store, TypeScript services

**Key Components:**
- `App.tsx` - Root component, layout, tabs
- `WordCard.tsx` - Word display with IPA and phonetics
- `AudioControls.tsx` - Playback controls
- `AIRecommendations.tsx` - AI-powered suggestions
- `AITutorChat.tsx` - Chat interface (stub)
- `PronunciationScoring.tsx` - Scoring interface (stub)

### Layer 2: State Management (Zustand)
**Location:** `src/ts/stores/`
**Responsibility:** Application state, business logic
**Dependencies:** TypeScript services, API clients

**Store Slices:**
```typescript
useAppStore
  ├── audio         - Playback state (playing, paused, speed)
  ├── tts           - Text-to-speech state
  ├── settings      - User preferences
  ├── vocabulary    - Current dataset, filtered items
  ├── progress      - Learning progress, accuracy
  ├── ui            - UI state (modals, notifications)
  └── auth          - Authentication state (user, session)
```

### Layer 3: Business Logic (TypeScript Services)
**Location:** `src/ts/`
**Responsibility:** Core logic, data transformation
**Dependencies:** Configuration, data extractors

**Key Services:**
- `core/PTEApp.ts` - Application coordinator
- `core/PTEVocabularyManager.ts` - Dataset loading
- `core/SettingsModule.ts` - Settings management
- `audio/TTSEngine.ts` - Text-to-speech engine
- `audio/AudioControls.ts` - Audio playback logic
- `ai/recommendationService.ts` - AI recommendations
- `supabase/authService.ts` - Authentication
- `supabase/syncService.ts` - Data synchronization

### Layer 4: Data Access (API & Data Pipeline)
**Location:** `api/`, `src/ts/data/`
**Responsibility:** External API calls, data processing
**Dependencies:** External services (Gemini, Polly, Supabase)

**API Endpoints:**
- `api/ai-recommendations.ts` - AI learning recommendations
- `api/ai-tutor.ts` - AI tutor chat
- `api/ai/chat.ts` - Extended chat with history
- `api/pronunciation-score.ts` - Pronunciation feedback
- `api/premium-tts.ts` - AWS Polly TTS
- `api/audio/generate.ts` - Audio generation
- `api/voices.ts` - Voice list

**Data Pipeline:**
- `scripts/pte-data-pipeline.js` - Markdown → JSON processing
- `src/ts/data/extractors/` - Data extraction logic

### Layer 5: External Services
**Gemini AI:** AI recommendations, tutor chat, pronunciation scoring
**AWS Polly:** Premium neural text-to-speech
**Supabase:** Database, authentication, storage
**PostHog:** Analytics and event tracking

---

## 🔄 Module Interactions

### Primary Interaction Flow

```
User Action (Click/Type)
        ↓
React Component (e.g., WordCard)
        ↓
Zustand Action (e.g., audio.startAutoPlay())
        ↓
TypeScript Service (e.g., AudioControls)
        ↓
    ┌───┴───┐
    │       │
    ↓       ↓
API Call    State Update
(Backend)   (Zustand Store)
    │       │
    ↓       ↓
Response    Re-render
Handled     (React)
    │       │
    └───┬───┘
        ↓
UI Updated
```

### Example: Playing a Word

```
1. USER: Clicks "Speak" button in WordCard

2. COMPONENT (WordCard.tsx):
   onClick={() => handleSpeak(word)}

3. SERVICE (TTSEngine):
   pronounceWord(word)
   ├─→ Check if browser TTS or premium TTS
   ├─→ Build pronunciation text with IPA
   └─→ Call speak() or callPollyAPI()

4. STATE UPDATE (Zustand):
   tts.startSpeaking(word, phonetic, mode)
   ├─→ Updates: isSpeaking = true
   ├─→ Updates: currentWord = word
   └─→ Triggers re-render

5. ANALYTICS (PostHog):
   analyticsService.trackTTSUsed({
     word, phonetic, voice, rate
   })

6. UI RE-RENDER:
   WordCard shows "Speaking..." indicator

7. COMPLETION:
   tts.stopSpeaking()
   └─→ isSpeaking = false
```

### Example: Loading AI Recommendations

```
1. USER: Authenticated, views Practice tab

2. COMPONENT (AIRecommendations.tsx):
   useEffect(() => {
     fetchRecommendations();
   }, [isAuthenticated])

3. SERVICE (recommendationService.ts):
   getRecommendations(userProgress)
   ├─→ Prepare context from Zustand store
   ├─→ Call /api/ai-recommendations
   └─→ Parse response

4. API (api/ai-recommendations.ts):
   ├─→ Validate request
   ├─→ Call Google Gemini API
   ├─→ Parse AI response
   └─→ Return structured recommendations

5. STATE UPDATE:
   recommendations = [...parsed]

6. UI UPDATE:
   AIRecommendations displays list with:
   - Priority badges
   - Estimated time
   - Specific items to practice
```

---

## 🌊 Data Flow

### Data Flow: Vocabulary Loading

```
App Initialization
        ↓
PTEApp.ts (initialize)
        ↓
PTEVocabularyManager.loadDataset(mode)
        ↓
DatasetManager.loadData(path)
        ↓
fetch(`/data/processed/${mode}.json`)
        ↓
    ┌───┴───────┐
    │  JSON     │
    │  Response │
    └───┬───────┘
        ↓
Parse & Validate (DataSchema)
        ↓
Store in Zustand (vocabulary.setDataset)
        ↓
    ┌───┴──────────────────┐
    │                      │
    ↓                      ↓
VocabularyList       WordCard
(sidebar)            (main display)
```

### Data Flow: User Authentication

```
User Login (Email + Password)
        ↓
AuthUI.signIn()
        ↓
Supabase Auth API
        ↓
    ┌───┴─────────┐
    │ Success     │
    └───┬─────────┘
        ↓
authService.getUser()
        ↓
Zustand: auth.setUser(user)
        ↓
    ┌───┴───────────────────┐
    │                       │
    ↓                       ↓
PostHog: identify(user)   UI: Show username
                              Enable AI features
        ↓
syncService.initialize()
        ↓
Sync progress to Supabase
```

### Data Flow: Practice Session

```
User Starts Practice
        ↓
audio.startAutoPlay()
        ↓
┌───────────────────────────────────┐
│     PRACTICE LOOP                 │
│                                   │
│  1. Get current word/item         │
│     vocabulary.currentItem        │
│         ↓                         │
│  2. Display in WordCard           │
│     React re-render               │
│         ↓                         │
│  3. Pronounce with TTS            │
│     TTSEngine.speak()             │
│         ↓                         │
│  4. Wait for pause duration       │
│     setTimeout(pauseDuration)     │
│         ↓                         │
│  5. Navigate to next              │
│     audio.navigateNext()          │
│         ↓                         │
│  6. Update progress               │
│     progress.updateProgress()     │
│         ↓                         │
│  7. Check if complete             │
│     ├─ Yes → Stop autoplay        │
│     └─ No  → Loop to step 1       │
│                                   │
└───────────────────────────────────┘
        ↓
Session End
        ↓
progress.endSession()
        ↓
Analytics: trackPracticeSessionCompleted()
        ↓
Sync to Supabase (if authenticated)
```

---

## 🧠 State Management

### Zustand Store Architecture

```typescript
// Store Structure
interface AppState {
  audio: AudioState;        // Playback control
  tts: TTSState;            // TTS status
  settings: SettingsState;  // User preferences
  vocabulary: VocabularyState;  // Current dataset
  progress: ProgressState;  // Learning progress
  ui: UIState;              // UI state (modals, etc.)
  auth: AuthState;          // Authentication
}

// Each slice has:
// 1. State properties
// 2. Action methods (update state)
// 3. No business logic (delegated to services)
```

### State Update Patterns

#### Pattern 1: Simple Update
```typescript
// Direct state update
const { setPlaying } = useAppStore((state) => state.audio);
setPlaying(true);
```

#### Pattern 2: Complex Update with Side Effects
```typescript
// Service handles logic, updates state
const startAutoPlay = () => {
  // Service validates and prepares
  const canStart = AudioControls.validate();
  if (!canStart) return;

  // Update state
  useAppStore.getState().audio.startAutoPlay();

  // Side effect (analytics)
  analyticsService.track('autoplay_started');
};
```

#### Pattern 3: Multi-Store Update
```typescript
// Update multiple stores atomically
const loadVocabulary = async (mode: string) => {
  const store = useAppStore.getState();

  // Update UI state
  store.vocabulary.setLoading(true);
  store.ui.showNotification('Loading...', 'info');

  try {
    // Load data
    const data = await PTEVocabularyManager.loadDataset(mode);

    // Update vocabulary state
    store.vocabulary.setDataset(data, mode);

    // Update settings state
    store.settings.updateSetting('datasetId', mode);

    // Clear loading
    store.vocabulary.setLoading(false);
    store.ui.hideNotification();
  } catch (error) {
    // Error handling
    store.vocabulary.setError(error.message);
    store.ui.showNotification('Failed to load', 'error');
  }
};
```

### State Persistence

**LocalStorage Persistence:**
```typescript
persist(
  (set, get) => ({ /* state */ }),
  {
    name: 'pte-app-storage',
    partialize: (state) => ({
      // Only persist settings and progress
      settings: state.settings,
      progress: {
        completedItems: Array.from(state.progress.completedItems),
        currentIndex: state.progress.currentIndex,
        totalItems: state.progress.totalItems,
        accuracy: state.progress.accuracy,
      },
    }),
  }
)
```

**Supabase Sync (Authenticated Users):**
```typescript
// After state update, sync to cloud
const syncToCloud = async () => {
  if (!auth.isAuthenticated) return;

  await syncService.syncProgress({
    completedItems: Array.from(progress.completedItems),
    currentIndex: progress.currentIndex,
    accuracy: progress.accuracy,
  });
};
```

---

## 🌐 API Architecture

### API Design Principles

1. **RESTful** - Standard HTTP methods (GET, POST)
2. **Serverless** - Vercel Functions, auto-scaling
3. **Secure** - API keys in environment variables (server-side only)
4. **Type-Safe** - TypeScript for request/response types
5. **Error Handling** - Consistent error responses

### API Endpoints

#### AI Recommendations API
**Endpoint:** `POST /api/ai-recommendations`
**Purpose:** Get personalized learning recommendations
**Auth:** Optional (better recommendations if authenticated)

```typescript
// Request
{
  userProgress: {
    completedItems: string[],
    accuracy: number,
    weakAreas: string[]
  },
  currentMode: 'vocabulary' | 'rs' | 'asq' | 'wfd'
}

// Response
{
  recommendations: [
    {
      id: string,
      priority: 'high' | 'medium' | 'low',
      title: string,
      description: string,
      estimatedTime: number,
      items: string[]
    }
  ]
}
```

#### AI Tutor Chat API
**Endpoint:** `POST /api/ai/chat`
**Purpose:** Conversational AI tutor for pronunciation help
**Auth:** Optional

```typescript
// Request
{
  message: string,
  context: {
    currentWord?: string,
    currentMode?: string
  },
  conversationHistory?: Array<{
    role: 'user' | 'assistant',
    content: string
  }>
}

// Response
{
  response: string,  // Markdown formatted
  conversationId: string
}
```

#### Pronunciation Scoring API
**Endpoint:** `POST /api/pronunciation-score`
**Purpose:** Get AI feedback on pronunciation attempts
**Auth:** Optional

```typescript
// Request
{
  targetWord: string,
  targetIPA: string,
  userTranscript: string  // From Web Speech Recognition
}

// Response
{
  score: number,  // 0-100
  feedback: {
    strengths: string[],
    improvements: string[],
    phonemeAnalysis: Array<{
      phoneme: string,
      accuracy: 'good' | 'fair' | 'poor'
    }>
  }
}
```

#### Premium TTS API
**Endpoint:** `POST /api/audio/generate`
**Purpose:** Generate premium neural voice audio
**Auth:** Required

```typescript
// Request
{
  text: string,
  voiceId: string,  // e.g., 'Joanna', 'Matthew'
  engine: 'neural',
  rate: 'slow' | 'medium' | 'fast'
}

// Response
{
  audioUrl: string,  // Supabase Storage URL
  duration: number,
  cached: boolean
}
```

### API Error Handling

```typescript
// Consistent error response format
{
  error: string,        // Error message
  code: string,         // Error code (e.g., 'INVALID_REQUEST')
  status: number,       // HTTP status code
  details?: any         // Additional details
}

// Error codes:
// - INVALID_REQUEST (400)
// - UNAUTHORIZED (401)
// - NOT_FOUND (404)
// - RATE_LIMIT_EXCEEDED (429)
// - INTERNAL_ERROR (500)
// - SERVICE_UNAVAILABLE (503)
```

---

## 🗄️ Database Schema

### Supabase Tables

#### users (Managed by Supabase Auth)
```sql
users
├── id (UUID, PK)
├── email (TEXT, UNIQUE)
├── created_at (TIMESTAMP)
├── email_confirmed_at (TIMESTAMP)
└── user_metadata (JSONB)
    ├── full_name
    └── avatar_url
```

#### user_progress
```sql
user_progress
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── dataset_id (TEXT)
├── completed_items (TEXT[])
├── current_index (INTEGER)
├── accuracy (NUMERIC)
├── total_practice_time (INTEGER)  -- seconds
├── last_practiced_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

-- Row Level Security (RLS)
-- Users can only access their own progress
```

#### user_settings
```sql
user_settings
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── practice_mode (TEXT)
├── difficulty_filter (TEXT)
├── tts_voice (TEXT)
├── tts_rate (NUMERIC)
├── auto_play (BOOLEAN)
├── show_phonetic (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### audio_cache
```sql
audio_cache
├── id (UUID, PK)
├── text (TEXT)
├── voice_id (TEXT)
├── engine (TEXT)
├── rate (TEXT)
├── audio_url (TEXT)  -- Supabase Storage path
├── duration (INTEGER)  -- milliseconds
├── created_at (TIMESTAMP)
└── expires_at (TIMESTAMP)

-- Composite unique index on (text, voice_id, engine, rate)
```

#### practice_sessions
```sql
practice_sessions
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── mode (TEXT)
├── dataset_id (TEXT)
├── items_completed (INTEGER)
├── items_correct (INTEGER)
├── accuracy (NUMERIC)
├── duration_seconds (INTEGER)
├── started_at (TIMESTAMP)
└── ended_at (TIMESTAMP)
```

### Storage Buckets

#### audio-cache
**Purpose:** Store generated AWS Polly audio files
**Access:** Public read, authenticated write
**Path structure:** `{voiceId}/{hash(text)}.mp3`

---

## 🧩 Component Hierarchy

### React Component Tree

```
<App> (Root)
│
├─ <Theme> (Radix UI Provider)
│  │
│  ├─ Header
│  │  ├─ <h1> Title
│  │  ├─ <p> Subtitle / User email
│  │  └─ <Flex> Action Buttons
│  │     ├─ <Button> AI Tutor
│  │     ├─ <Button> Practice
│  │     └─ <Button> Settings
│  │
│  ├─ Practice Mode Controls
│  │  ├─ <PracticeModeSelector />
│  │  └─ <DifficultyFilter />
│  │
│  ├─ Modals (Conditional)
│  │  ├─ {showSettings && <SettingsPanel />}
│  │  ├─ {showAITutor && <AITutorChat />}
│  │  └─ {showPronunciationScoring && <PronunciationScoring />}
│  │
│  └─ <Tabs defaultValue="practice">
│     │
│     ├─ Practice Tab
│     │  ├─ <Flex> (2-column layout)
│     │  │  │
│     │  │  ├─ Left Sidebar (1/4 width)
│     │  │  │  ├─ <VocabularyList />
│     │  │  │  └─ {isAuthenticated && <AIRecommendations />}
│     │  │  │
│     │  │  └─ Main Content (3/4 width)
│     │  │     ├─ <WordCard item={currentItem} />
│     │  │     └─ <AudioControls />
│     │  │
│     │  └─ Footer
│     │
│     └─ Progress Tab
│        ├─ <ProgressTracker />
│        └─ <VocabularyList />
│
└─ (Global: Zustand useAppStore)
```

### Component Responsibilities

| Component | Responsibility | State Dependencies |
|-----------|----------------|-------------------|
| **App** | Layout, routing, modal management | ui, auth |
| **WordCard** | Display word, IPA, phonetics, speak buttons | vocabulary.currentItem, tts |
| **AudioControls** | Play/pause, navigation, speed, auto-play | audio, vocabulary |
| **AIRecommendations** | Show AI learning suggestions | auth, vocabulary, progress |
| **VocabularyList** | Sidebar list of items | vocabulary.filteredDataset |
| **ProgressTracker** | Progress visualization, stats | progress |
| **SettingsPanel** | Settings form | settings |
| **PracticeModeSelector** | Mode dropdown | settings.practiceMode |
| **DifficultyFilter** | Difficulty dropdown | settings.difficultyFilter |
| **AITutorChat** | Chat interface (stub) | - |
| **PronunciationScoring** | Scoring UI (stub) | - |

---

## 🔗 Integration Patterns

### Pattern 1: Component → Zustand → Service

```typescript
// Component (WordCard.tsx)
const WordCard: React.FC<Props> = ({ word }) => {
  const { startSpeaking } = useAppStore((state) => state.tts);

  const handleSpeak = () => {
    // Call service, service updates store
    TTSEngine.pronounceWord(word);
  };

  return <Button onClick={handleSpeak}>Speak</Button>;
};

// Service (TTSEngine.ts)
class TTSEngine {
  async pronounceWord(word: string) {
    const store = useAppStore.getState();

    // Update state
    store.tts.startSpeaking(word, word.ipa, 'word');

    // Perform action
    await this.speak(word.english);

    // Update state again
    store.tts.stopSpeaking();
  }
}
```

### Pattern 2: API Call with Loading State

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

const fetchData = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/ai-recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProgress })
    });

    if (!response.ok) throw new Error('API error');

    const result = await response.json();
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Pattern 3: Supabase Real-Time Sync

```typescript
// Subscribe to changes
const subscription = supabase
  .channel('user_progress')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_progress',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Update local state
      const store = useAppStore.getState();
      store.progress.updateProgress(
        payload.new.current_index,
        payload.new.total_items
      );
    }
  )
  .subscribe();
```

### Pattern 4: Error Boundary

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to analytics
    analyticsService.trackError('react_error', {
      error: error.message,
      stack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

## 📊 Architecture Decisions

### Why React?
- ✅ Component-based architecture
- ✅ Large ecosystem (Radix UI, Testing Library)
- ✅ TypeScript support
- ✅ Fast with Vite
- ❌ Larger bundle size than vanilla JS (acceptable tradeoff)

### Why Zustand over Redux?
- ✅ Simpler API, less boilerplate
- ✅ TypeScript-first design
- ✅ DevTools support
- ✅ Middleware support (persist, devtools)
- ✅ Better performance (granular subscriptions)

### Why Serverless (Vercel Functions)?
- ✅ Auto-scaling (0 → millions of requests)
- ✅ No server maintenance
- ✅ Pay-per-use (cost-effective)
- ✅ Global edge network (low latency)
- ❌ Cold start latency (acceptable for our use case)

### Why Supabase over Firebase?
- ✅ Open-source (can self-host)
- ✅ PostgreSQL (more powerful than Firestore)
- ✅ Better developer experience
- ✅ SQL queries vs document queries
- ✅ Built-in auth + storage + realtime

### Why Google Gemini over OpenAI?
- ✅ **FREE tier** (1,500 requests/day)
- ✅ No credit card required
- ✅ Good quality for our use case
- ✅ Lower costs at scale
- ❌ Slightly less capable than GPT-4 (acceptable tradeoff)

---

## 🔄 Next Steps

### Immediate Architecture Tasks
1. Implement AI Tutor Chat frontend (integrate with existing backend)
2. Implement Pronunciation Scoring frontend (integrate with existing backend)
3. Complete cloud sync UI integration (infrastructure ready)

### Future Architecture Improvements
1. Add GraphQL layer for complex queries
2. Implement caching strategy (Redis/Upstash)
3. Add WebSocket for real-time features
4. Optimize bundle size (code splitting, lazy loading)
5. Add service worker background sync for offline mutations

---

## 📚 Related Documents

- **[LIFECYCLE-OVERVIEW.md](./LIFECYCLE-OVERVIEW.md)** - High-level lifecycle phases
- **[DIRECTORY-STRUCTURE.md](./DIRECTORY-STRUCTURE.md)** - File organization
- **[TESTING-STRATEGY.md](./TESTING-STRATEGY.md)** - Testing approach
- **[WORKFLOW-DIAGRAMS.md](./WORKFLOW-DIAGRAMS.md)** - Visual workflows
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Detailed system architecture (2,230 lines)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** ✅ Complete
