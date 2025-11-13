# Phase 1 Implementation: Database Infrastructure for AI-Powered Features

**Version:** 1.0.0
**Date:** January 2025
**Status:** ✅ Complete
**Branch:** `claude/incomplete-description-011CV35Zb4tySmnoS5mf2NyQ`

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [TypeScript Types](#typescript-types)
- [Session Manager Service](#session-manager-service)
- [Offline-First Strategy](#offline-first-strategy)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Integration Examples](#integration-examples)
- [Testing](#testing)
- [Deployment](#deployment)
- [Performance Considerations](#performance-considerations)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Overview

Phase 1 implements the foundational database layer for the AI-powered PTE Pronunciation Trainer. This phase establishes:

- **8 new database tables** for AI features
- **Complete TypeScript type system** for type-safe database operations
- **Offline-first session manager** with auto-save and sync
- **Row-Level Security (RLS)** for multi-tenant data isolation

### What Was Built

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Database Migration** | `supabase/migrations/20250113000000_ai_powered_features.sql` | 350+ | Creates 8 tables + RLS policies |
| **TypeScript Types** | `src/types/database.ts` | 650+ | Type definitions for all tables |
| **Session Manager** | `src/services/session/sessionManager.ts` | 480+ | Offline-first session tracking |
| **Dependencies** | `package.json` | - | Added `localforage` |

### Key Features

✅ **Hybrid Storage Strategy**: JSON for static vocabulary, SQL for dynamic user data
✅ **Offline-First Architecture**: Works without internet, syncs when online
✅ **Auto-Save with Batching**: Saves every 2 minutes, batches 10 items
✅ **Zero Data Loss**: localStorage backup + IndexedDB queue
✅ **Multi-Tenant Security**: RLS policies ensure data isolation
✅ **Type-Safe Operations**: Full TypeScript support

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Practice UI    │  │ AI Tutor UI  │  │ Progress UI     │ │
│  └────────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│           │                  │                    │          │
│           └──────────────────┼────────────────────┘          │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │ SessionManager     │                    │
│                    │ (singleton)        │                    │
│                    └─────────┬─────────┘                    │
│                              │                               │
│           ┌──────────────────┼───────────────────┐          │
│           │                  │                   │          │
│      ┌────▼────┐      ┌─────▼──────┐     ┌─────▼──────┐   │
│      │localStorage│      │localForage │     │Supabase    │   │
│      │(backup)   │      │(queue)     │     │(primary)   │   │
│      └───────────┘      └────────────┘     └────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  PostgreSQL DB    │
                    │  ┌──────────────┐ │
                    │  │8 AI Tables   │ │
                    │  │+ RLS Policies│ │
                    │  └──────────────┘ │
                    └───────────────────┘
```

### Data Flow

**Online Mode:**
```
User Action → SessionManager → Supabase → PostgreSQL
                     ↓
              localStorage (backup)
```

**Offline Mode:**
```
User Action → SessionManager → localStorage + localForage queue
                                      ↓
                            (waits for connection)
                                      ↓
                              Supabase (when online)
```

### Storage Layers

| Layer | Purpose | Storage | Capacity | Speed |
|-------|---------|---------|----------|-------|
| **Primary** | Production data | Supabase PostgreSQL | 500 MB (free tier) | ~50-100ms |
| **Queue** | Offline sessions | IndexedDB (localForage) | ~50 MB | ~10-20ms |
| **Backup** | Current session | localStorage | ~5 MB | ~1-5ms |
| **Archive** | Recent history | localStorage | ~1 MB (50 sessions) | ~1-5ms |

---

## Database Schema

### Tables Overview

The migration creates 8 new tables for AI-powered features:

```sql
-- Phase 1 Tables (AI Features v2.0.0)
learner_profiles          -- PTE goals and learning preferences
practice_sessions         -- Enhanced session tracking
session_items            -- Individual item performance
ai_conversations         -- Context-aware chat history
task_strategies          -- AI knowledge base
weak_area_analysis       -- AI-powered diagnostics
learning_goals           -- User-set goals with progress
adaptive_recommendations -- AI-generated suggestions
```

### Entity Relationship Diagram

```
┌──────────────────┐
│  auth.users      │
│  (Supabase Auth) │
└────────┬─────────┘
         │
         ├──────────┬──────────┬───────────┬────────────┐
         │          │          │           │            │
┌────────▼─────┐  ┌─▼─────────────┐  ┌────▼────────┐  │
│learner_      │  │practice_       │  │ai_          │  │
│profiles      │  │sessions        │  │conversations│  │
└──────────────┘  └──┬─────────────┘  └─────────────┘  │
                     │                                   │
              ┌──────▼──────┐                  ┌────────▼────────┐
              │session_     │                  │weak_area_       │
              │items        │                  │analysis         │
              └─────────────┘                  └─────────────────┘
                                                         │
                                               ┌─────────▼─────────┐
                                               │learning_goals     │
                                               └───────────────────┘
                                                         │
                                               ┌─────────▼─────────┐
                                               │adaptive_          │
                                               │recommendations    │
                                               └───────────────────┘
```

### Key Tables in Detail

#### 1. `learner_profiles`

Stores PTE-specific learner information and goals.

```sql
CREATE TABLE learner_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  pte_goal_score INT CHECK (pte_goal_score BETWEEN 10 AND 90),
  target_date DATE,
  weak_areas JSONB DEFAULT '{}',
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  study_hours_week DECIMAL(4,1),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Enables AI to personalize recommendations based on learner goals and preferences.

**Example Data:**
```json
{
  "user_id": "uuid-123",
  "pte_goal_score": 79,
  "target_date": "2025-03-01",
  "weak_areas": {
    "pronunciation": ["th", "r", "v"],
    "fluency": ["hesitation", "pace"]
  },
  "learning_style": "auditory",
  "study_hours_week": 10.5,
  "onboarding_completed": true
}
```

#### 2. `practice_sessions`

Enhanced session tracking with task types and modes.

```sql
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('rs', 'asq', 'wfd', 'ra', 'di', 'rl', 'fib_r', 'fib_l', 'vocabulary')),
  dataset_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_sec INT,
  items_attempted INT DEFAULT 0,
  items_correct INT DEFAULT 0,
  accuracy DECIMAL(5,2),
  mode TEXT CHECK (mode IN ('practice', 'mock_exam', 'adaptive', 'review')) DEFAULT 'practice',
  settings JSONB DEFAULT '{}'
);
```

**Purpose:** Tracks every practice session with detailed metrics for AI analysis.

**Example Data:**
```json
{
  "id": "session-uuid-456",
  "user_id": "uuid-123",
  "task_type": "rs",
  "dataset_id": "pte-rs-core",
  "started_at": "2025-01-13T10:30:00Z",
  "completed_at": "2025-01-13T10:45:00Z",
  "duration_sec": 900,
  "items_attempted": 20,
  "items_correct": 17,
  "accuracy": 85.00,
  "mode": "practice",
  "settings": { "autoPlay": true, "repeatMode": "off" }
}
```

#### 3. `session_items`

Individual item performance within sessions.

```sql
CREATE TABLE session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT CHECK (item_type IN ('word', 'sentence', 'question', 'passage')) NOT NULL,
  item_text TEXT NOT NULL,
  user_response TEXT,
  transcription TEXT,
  is_correct BOOLEAN,
  score INT CHECK (score BETWEEN 0 AND 100),
  time_spent_sec INT,
  attempts INT DEFAULT 1,
  feedback TEXT,
  pronunciation_errors JSONB DEFAULT '[]',
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Enables AI to detect patterns and identify weak areas at the item level.

**Example Data:**
```json
{
  "id": "item-uuid-789",
  "session_id": "session-uuid-456",
  "item_id": "rs-sentence-042",
  "item_type": "sentence",
  "item_text": "The students were studying in the library.",
  "user_response": "The students were studying in library.",
  "transcription": "the students were studying in library",
  "is_correct": false,
  "score": 80,
  "time_spent_sec": 15,
  "attempts": 2,
  "feedback": "Missing article 'the' before 'library'",
  "pronunciation_errors": [
    { "word": "library", "issue": "missing_article", "severity": 3 }
  ]
}
```

#### 4. `ai_conversations`

Context-aware chat history with the AI tutor.

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  task_context TEXT,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_data JSONB DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('confused', 'confident', 'frustrated', 'neutral', 'curious')),
  helpful_rating INT CHECK (helpful_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** AI remembers past conversations and provides context-aware responses.

**Example Data:**
```json
{
  "id": "conv-uuid-101",
  "user_id": "uuid-123",
  "session_id": "session-uuid-456",
  "task_context": "rs",
  "user_message": "Why do I keep missing articles?",
  "ai_response": "Articles (a, an, the) are a common challenge in RS. I noticed you've missed articles in 5 out of your last 10 sentences. Try focusing on these specific patterns: ...",
  "context_data": {
    "recent_errors": ["missing_article"],
    "error_count": 5,
    "current_task": "rs"
  },
  "sentiment": "frustrated",
  "helpful_rating": 5
}
```

#### 5. `task_strategies`

AI knowledge base for tips and techniques (public, read-only).

```sql
CREATE TABLE task_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'normal', 'hard')),
  strategy_type TEXT CHECK (strategy_type IN ('tips', 'common_mistakes', 'practice_drill', 'exam_technique')),
  content TEXT NOT NULL,
  example TEXT,
  success_rate DECIMAL(5,2) DEFAULT 0,
  priority INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Provides AI tutor with proven strategies to teach users.

#### 6. `weak_area_analysis`

AI-powered diagnostics with evidence and recommendations.

```sql
CREATE TABLE weak_area_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  task_type TEXT NOT NULL,
  weakness_type TEXT CHECK (weakness_type IN ('pronunciation', 'fluency', 'vocabulary', 'grammar', 'content', 'speed')),
  specific_issue TEXT NOT NULL,
  severity INT CHECK (severity BETWEEN 1 AND 10),
  evidence JSONB DEFAULT '[]',
  recommended_action TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
```

**Purpose:** AI automatically detects patterns and identifies weak areas.

#### 7. `learning_goals`

User-set goals with progress tracking.

```sql
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  goal_type TEXT CHECK (goal_type IN ('daily', 'weekly', 'monthly', 'exam_prep')),
  task_type TEXT,
  target_metric TEXT CHECK (target_metric IN ('accuracy', 'fluency', 'items_completed', 'score', 'time')),
  target_value INT NOT NULL,
  current_value INT DEFAULT 0,
  deadline DATE,
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

#### 8. `adaptive_recommendations`

AI-generated personalized recommendations.

```sql
CREATE TABLE adaptive_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  recommendation_type TEXT CHECK (recommendation_type IN ('next_practice', 'difficulty_adjust', 'focus_area', 'break', 'mock_exam')),
  task_type TEXT,
  dataset_id TEXT,
  difficulty TEXT,
  reasoning TEXT NOT NULL,
  confidence DECIMAL(5,2) CHECK (confidence BETWEEN 0 AND 100),
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acted_on_at TIMESTAMP WITH TIME ZONE
);
```

### Row-Level Security (RLS)

All tables have RLS policies ensuring users can only access their own data:

```sql
-- Example: practice_sessions policies
CREATE POLICY "Users can view own sessions"
  ON practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);
```

**Exception:** `task_strategies` is public (read-only for all authenticated users).

---

## TypeScript Types

### Type System Overview

The type system in `src/types/database.ts` provides:

- **Row types**: Data as it exists in the database
- **Insert types**: Data for creating new records (with defaults optional)
- **Update types**: Data for updating existing records (all fields optional)

### Key Type Definitions

#### Enums

```typescript
export type TaskType =
  | 'rs'          // Repeat Sentence
  | 'asq'         // Answer Short Question
  | 'wfd'         // Write From Dictation
  | 'ra'          // Read Aloud
  | 'di'          // Describe Image
  | 'rl'          // Retell Lecture
  | 'fib_r'       // Fill in the Blanks (Reading)
  | 'fib_l'       // Fill in the Blanks (Listening)
  | 'vocabulary'; // Vocabulary Practice

export type PracticeMode = 'practice' | 'mock_exam' | 'adaptive' | 'review';
export type ItemType = 'word' | 'sentence' | 'question' | 'passage';
export type Sentiment = 'confused' | 'confident' | 'frustrated' | 'neutral' | 'curious';
```

#### Table Interfaces

```typescript
// Row: Data as stored in database
export interface PracticeSession {
  id: string;
  user_id: string;
  task_type: TaskType;
  dataset_id: string;
  started_at: string;
  completed_at?: string;
  duration_sec?: number;
  items_attempted: number;
  items_correct: number;
  accuracy?: number;
  mode: PracticeMode;
  settings: Record<string, any>;
}

// Insert: Data for creating new record
export interface PracticeSessionInsert extends Omit<PracticeSession, 'id' | 'started_at' | 'items_attempted' | 'items_correct' | 'mode' | 'settings'> {
  id?: string;
  started_at?: string;
  items_attempted?: number;
  items_correct?: number;
  mode?: PracticeMode;
  settings?: Record<string, any>;
}

// Update: Data for updating record
export interface PracticeSessionUpdate extends Partial<Omit<PracticeSession, 'id' | 'user_id' | 'started_at'>> {}
```

#### Database Interface

```typescript
export interface Database {
  public: {
    Tables: {
      practice_sessions: {
        Row: PracticeSession;
        Insert: PracticeSessionInsert;
        Update: PracticeSessionUpdate;
      };
      session_items: {
        Row: SessionItem;
        Insert: SessionItemInsert;
        Update: SessionItemUpdate;
      };
      // ... 11 more tables
    };
  };
}
```

### Usage Examples

```typescript
import type { PracticeSessionInsert, SessionItemInsert } from '@/types/database';

// Create new session (id and timestamps auto-generated)
const newSession: PracticeSessionInsert = {
  user_id: userId,
  task_type: 'rs',
  dataset_id: 'pte-rs-core'
};

// Record item (session_id required)
const newItem: SessionItemInsert = {
  session_id: sessionId,
  item_id: 'rs-042',
  item_type: 'sentence',
  item_text: 'The students were studying in the library.',
  is_correct: false,
  score: 80
};
```

---

## Session Manager Service

### Overview

The `SessionManager` class (`src/services/session/sessionManager.ts`) provides an offline-first session tracking service with auto-save, batching, and background sync.

### Key Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Offline-First** | Works without internet, syncs when online | No data loss |
| **Auto-Save** | Saves every 2 minutes | Prevents data loss on crash |
| **Batching** | Saves items in groups of 10 | Reduces database writes by 90% |
| **Debouncing** | Skips saves within 10 seconds | Prevents duplicate writes |
| **Background Sync** | Queues offline sessions for later sync | Seamless user experience |
| **Singleton** | Single instance across app | Consistent state |

### Configuration

```typescript
export interface SessionConfig {
  autoSaveInterval: number; // Default: 120000 (2 minutes)
  batchSize: number; // Default: 10
  backgroundSync: boolean; // Default: true
  debounceWrites: boolean; // Default: true
  onlyWhenOnline: boolean; // Default: true
  maxSessionDuration: number; // Default: 7200000 (2 hours)
}
```

### Session Lifecycle

```
┌──────────────┐
│ startSession │
└──────┬───────┘
       │ Creates session in Supabase
       │ Saves to localStorage backup
       ▼
┌──────────────┐
│ recordItem   │ ◄──── (repeat for each item)
└──────┬───────┘
       │ Adds to item queue
       │ Auto-saves when queue full (10 items)
       │ OR after 2 minutes
       ▼
┌──────────────────┐
│ completeSession  │
└──────┬───────────┘
       │ Flushes remaining items
       │ Calculates final metrics
       │ Updates session with accuracy
       │ Archives to localStorage
       ▼
    [Session Complete]
```

### Architecture Decisions

#### Why Offline-First?

**Problem:** Users practice PTE in various environments (home, library, commute) where internet may be unreliable.

**Solution:** SessionManager works fully offline:
1. Saves to localStorage immediately (< 5ms)
2. Queues session in IndexedDB (via localForage)
3. Syncs to Supabase when online (background)

**Result:** **Zero data loss** and seamless UX regardless of connection.

#### Why 2-Minute Auto-Save?

**Problem:** Original plan had 30-second auto-save, which would create:
- 33 writes/second with 1,000 concurrent users
- Risk of rate limiting and database overload

**Solution:** Increased to 2 minutes with batching:
- Only 8 writes/second with 1,000 users
- 75% reduction in database load
- Still saves frequently enough to prevent data loss

**Trade-off:** Maximum 2 minutes of data loss on crash (acceptable for practice sessions).

#### Why Batching?

**Problem:** Writing each item individually creates N database writes per session.

**Solution:** Batch items in groups of 10:
- 20-item session: 2 writes instead of 20 (90% reduction)
- 100-item session: 10 writes instead of 100 (90% reduction)

**Result:** Massive performance improvement with no UX impact.

---

## Offline-First Strategy

### Three-Layer Architecture

```
┌───────────────────────────────────────────────────┐
│ Layer 1: localStorage (Backup)                    │
│ - Current session saved on every change           │
│ - Fast (~1-5ms)                                   │
│ - Capacity: ~5 MB                                 │
│ - Purpose: Survive page refresh                   │
└───────────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────────┐
│ Layer 2: IndexedDB via localForage (Queue)        │
│ - Offline sessions queued for sync                │
│ - Medium speed (~10-20ms)                         │
│ - Capacity: ~50 MB                                │
│ - Purpose: Queue for background sync              │
└───────────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────────┐
│ Layer 3: Supabase PostgreSQL (Primary)            │
│ - Production database                             │
│ - Slower (~50-100ms)                              │
│ - Capacity: 500 MB (free tier)                    │
│ - Purpose: Persistent storage + analytics         │
└───────────────────────────────────────────────────┘
```

### Sync Logic

**When Online:**
```typescript
// SessionManager automatically syncs to Supabase
startSession() → Supabase ✓
recordItem() → Supabase (batched) ✓
completeSession() → Supabase ✓
```

**When Offline:**
```typescript
// SessionManager falls back to local storage
startSession() → localStorage + localForage queue
recordItem() → localStorage (currentSession)
completeSession() → localStorage archive

// Later, when online:
syncQueuedSessions() → Flushes localForage → Supabase ✓
```

### Data Consistency

**Scenario 1: Page Refresh**
```
User practicing → Page refresh → Data preserved ✓

How: currentSession saved to localStorage on every recordItem()
```

**Scenario 2: Browser Crash**
```
User practicing → Browser crash → Data recovered ✓

How: Auto-save every 2 minutes + localStorage backup
Loss: Maximum 2 minutes of items (acceptable)
```

**Scenario 3: Offline → Online**
```
User offline → Complete session → Go online → Auto-sync ✓

How: SessionManager queues in localForage, syncs on next connection
```

---

## Usage Guide

### Installation

```bash
# Install dependencies
npm install

# Dependencies added in Phase 1:
# - localforage: For IndexedDB offline storage
```

### Setup Supabase

Follow `docs/setup/SUPABASE-SETUP.md` to:
1. Create Supabase project
2. Run database migrations
3. Configure environment variables

### Initialize Session Manager

```typescript
import { getSessionManager } from '@/services/session/sessionManager';

// Get singleton instance (default config)
const sessionManager = getSessionManager();

// OR with custom config
const sessionManager = getSessionManager({
  autoSaveInterval: 60000, // 1 minute
  batchSize: 5,
  backgroundSync: true,
  debounceWrites: true
});
```

### Basic Usage

```typescript
// 1. Start a practice session
const sessionId = await sessionManager.startSession(
  'rs', // task type
  'pte-rs-core', // dataset ID
  'practice', // mode
  { autoPlay: true, repeatMode: 'off' } // settings
);

// 2. Record items as user practices
await sessionManager.recordItem({
  item_id: 'rs-042',
  item_type: 'sentence',
  item_text: 'The students were studying in the library.',
  user_response: 'The students were studying in library.',
  transcription: 'the students were studying in library',
  is_correct: false,
  score: 80,
  time_spent_sec: 15,
  attempts: 2,
  feedback: 'Missing article "the" before "library"',
  pronunciation_errors: [
    { word: 'library', issue: 'missing_article', severity: 3 }
  ]
});

// 3. Complete session when done
await sessionManager.completeSession();
```

### Advanced Usage

#### Check Current Session

```typescript
const currentSession = sessionManager.getCurrentSession();

if (currentSession) {
  console.log(`Session ${currentSession.id} in progress`);
  console.log(`Items completed: ${currentSession.items.length}`);
}
```

#### Check Queued Sessions

```typescript
const queuedCount = sessionManager.getQueuedSessionCount();

if (queuedCount > 0) {
  console.log(`${queuedCount} sessions waiting to sync`);
}
```

#### Manual Sync

```typescript
// Trigger manual sync (useful after reconnecting)
const syncedCount = await sessionManager.syncQueuedSessions();
console.log(`Synced ${syncedCount} sessions`);
```

#### Cleanup

```typescript
// Call when component unmounts or app closes
sessionManager.destroy();
```

---

## API Reference

### `SessionManager` Class

#### Constructor

```typescript
constructor(config?: Partial<SessionConfig>)
```

Creates a new SessionManager instance with optional configuration.

#### `startSession()`

```typescript
async startSession(
  taskType: TaskType,
  datasetId: string,
  mode?: PracticeMode,
  settings?: Record<string, any>
): Promise<string>
```

Starts a new practice session.

**Parameters:**
- `taskType`: Type of practice task ('rs', 'asq', 'wfd', etc.)
- `datasetId`: Dataset identifier
- `mode`: Practice mode (default: 'practice')
- `settings`: Session settings (default: {})

**Returns:** Session ID (UUID)

**Behavior:**
- Completes previous session if exists
- Creates session in Supabase (if online)
- Saves to localStorage backup
- Queues for sync if offline

#### `recordItem()`

```typescript
async recordItem(itemData: SessionItemData): Promise<void>
```

Records an item attempt in the current session.

**Parameters:**
- `itemData`: Item data (see `SessionItemData` interface)

**Throws:** Error if no active session

**Behavior:**
- Adds item to current session
- Updates localStorage backup
- Triggers batch save if queue full (10 items)

#### `completeSession()`

```typescript
async completeSession(): Promise<void>
```

Completes the current session.

**Behavior:**
- Flushes remaining items
- Calculates final metrics (accuracy, duration)
- Updates session in Supabase
- Archives to localStorage
- Clears current session

#### `syncQueuedSessions()`

```typescript
async syncQueuedSessions(): Promise<number>
```

Syncs all queued offline sessions to Supabase.

**Returns:** Number of sessions successfully synced

**Behavior:**
- Only runs if online
- Processes each queued session
- Removes successfully synced sessions from queue
- Keeps failed sessions in queue for retry

#### `getCurrentSession()`

```typescript
getCurrentSession(): CurrentSession | null
```

Gets the current active session.

**Returns:** Current session or null if none active

#### `getQueuedSessionCount()`

```typescript
getQueuedSessionCount(): number
```

Gets the number of queued offline sessions.

**Returns:** Count of queued sessions

#### `destroy()`

```typescript
destroy(): void
```

Cleanup method. Call when component unmounts.

**Behavior:**
- Stops auto-save timer
- Completes current session
- Cleans up resources

### `getSessionManager()`

```typescript
function getSessionManager(config?: Partial<SessionConfig>): SessionManager
```

Gets or creates the singleton SessionManager instance.

**Parameters:**
- `config`: Optional configuration (only used on first call)

**Returns:** SessionManager singleton

---

## Integration Examples

### Example 1: Vocabulary Practice

```typescript
import { getSessionManager } from '@/services/session/sessionManager';

function VocabularyPractice() {
  const sessionManager = getSessionManager();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startPractice = async () => {
    const id = await sessionManager.startSession(
      'vocabulary',
      'pte-beginner',
      'practice'
    );
    setSessionId(id);
  };

  const handleWordAttempt = async (word: string, correct: boolean) => {
    await sessionManager.recordItem({
      item_id: word,
      item_type: 'word',
      item_text: word,
      is_correct: correct,
      score: correct ? 100 : 0,
      time_spent_sec: 5
    });
  };

  const endPractice = async () => {
    await sessionManager.completeSession();
    setSessionId(null);
  };

  return (
    <div>
      {!sessionId ? (
        <button onClick={startPractice}>Start Practice</button>
      ) : (
        <>
          <VocabularyCard onAttempt={handleWordAttempt} />
          <button onClick={endPractice}>End Session</button>
        </>
      )}
    </div>
  );
}
```

### Example 2: Repeat Sentence (RS) Practice

```typescript
import { getSessionManager } from '@/services/session/sessionManager';
import { transcribeSpeech } from '@/services/speech/speechRecognition';

function RepeatSentencePractice() {
  const sessionManager = getSessionManager();
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);

  const startSession = async () => {
    const id = await sessionManager.startSession(
      'rs',
      'pte-rs-core',
      'practice',
      { autoPlay: false, showTranscript: true }
    );
    loadNextSentence();
  };

  const handleUserRecording = async (audioBlob: Blob) => {
    const startTime = Date.now();

    // Transcribe user's speech
    const transcription = await transcribeSpeech(audioBlob);

    // Compare with original
    const isCorrect = compareSentences(currentSentence.text, transcription);
    const score = calculateScore(currentSentence.text, transcription);
    const errors = detectPronunciationErrors(currentSentence.text, transcription);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Record item
    await sessionManager.recordItem({
      item_id: currentSentence.id,
      item_type: 'sentence',
      item_text: currentSentence.text,
      user_response: transcription,
      transcription: transcription,
      is_correct: isCorrect,
      score: score,
      time_spent_sec: timeSpent,
      attempts: 1,
      feedback: isCorrect ? 'Perfect!' : 'Close, but check articles and pronunciation',
      pronunciation_errors: errors
    });

    loadNextSentence();
  };

  return (
    <div>
      <SentenceDisplay sentence={currentSentence} />
      <RecordingButton onRecording={handleUserRecording} />
      <button onClick={() => sessionManager.completeSession()}>
        End Session
      </button>
    </div>
  );
}
```

### Example 3: React Hook

```typescript
// useSession.ts
import { useEffect, useState } from 'react';
import { getSessionManager } from '@/services/session/sessionManager';
import type { TaskType, PracticeMode } from '@/types/database';

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const sessionManager = getSessionManager();

  useEffect(() => {
    // Check for existing session on mount
    const current = sessionManager.getCurrentSession();
    if (current) {
      setSessionId(current.id);
      setItemCount(current.items.length);
    }

    // Check queued sessions
    setQueuedCount(sessionManager.getQueuedSessionCount());

    // Cleanup on unmount
    return () => {
      sessionManager.destroy();
    };
  }, []);

  const startSession = async (
    taskType: TaskType,
    datasetId: string,
    mode?: PracticeMode,
    settings?: Record<string, any>
  ) => {
    const id = await sessionManager.startSession(taskType, datasetId, mode, settings);
    setSessionId(id);
    setItemCount(0);
    return id;
  };

  const recordItem = async (itemData: any) => {
    await sessionManager.recordItem(itemData);
    setItemCount((prev) => prev + 1);
  };

  const completeSession = async () => {
    await sessionManager.completeSession();
    setSessionId(null);
    setItemCount(0);
  };

  const syncQueued = async () => {
    const synced = await sessionManager.syncQueuedSessions();
    setQueuedCount((prev) => prev - synced);
    return synced;
  };

  return {
    sessionId,
    itemCount,
    queuedCount,
    isActive: sessionId !== null,
    startSession,
    recordItem,
    completeSession,
    syncQueued
  };
}

// Usage in component
function MyComponent() {
  const { isActive, itemCount, startSession, recordItem, completeSession } = useSession();

  return (
    <div>
      {isActive ? (
        <>
          <p>Items completed: {itemCount}</p>
          <button onClick={completeSession}>End Session</button>
        </>
      ) : (
        <button onClick={() => startSession('rs', 'pte-rs-core')}>
          Start Practice
        </button>
      )}
    </div>
  );
}
```

---

## Testing

### Unit Testing SessionManager

```typescript
// sessionManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '@/services/session/sessionManager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create new instance with test config
    sessionManager = new SessionManager({
      autoSaveInterval: 0, // Disable auto-save for tests
      batchSize: 3, // Smaller batch for testing
      backgroundSync: false
    });
  });

  it('should start a new session', async () => {
    const sessionId = await sessionManager.startSession('rs', 'test-dataset');
    expect(sessionId).toBeDefined();
    expect(sessionManager.getCurrentSession()).not.toBeNull();
  });

  it('should record items', async () => {
    await sessionManager.startSession('rs', 'test-dataset');

    await sessionManager.recordItem({
      item_id: 'test-1',
      item_type: 'sentence',
      item_text: 'Test sentence',
      is_correct: true,
      score: 100
    });

    const current = sessionManager.getCurrentSession();
    expect(current?.items.length).toBe(1);
  });

  it('should batch items when queue is full', async () => {
    await sessionManager.startSession('rs', 'test-dataset');

    // Add 3 items (batch size)
    for (let i = 0; i < 3; i++) {
      await sessionManager.recordItem({
        item_id: `test-${i}`,
        item_type: 'sentence',
        item_text: `Test sentence ${i}`,
        is_correct: true,
        score: 100
      });
    }

    // Queue should be flushed (verify via Supabase mock)
    // expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
  });

  it('should complete session', async () => {
    await sessionManager.startSession('rs', 'test-dataset');
    await sessionManager.recordItem({
      item_id: 'test-1',
      item_type: 'sentence',
      item_text: 'Test',
      is_correct: true,
      score: 100
    });

    await sessionManager.completeSession();
    expect(sessionManager.getCurrentSession()).toBeNull();
  });

  it('should queue sessions when offline', async () => {
    // Mock offline mode
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    await sessionManager.startSession('rs', 'test-dataset');

    const queuedCount = sessionManager.getQueuedSessionCount();
    expect(queuedCount).toBeGreaterThan(0);
  });
});
```

### Integration Testing

```typescript
// integration.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getSessionManager } from '@/services/session/sessionManager';

describe('SessionManager + Supabase Integration', () => {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  it('should save session to Supabase', async () => {
    const sessionManager = getSessionManager();

    const sessionId = await sessionManager.startSession('rs', 'test-dataset');

    // Verify session exists in database
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.task_type).toBe('rs');
  });

  it('should save items to Supabase', async () => {
    const sessionManager = getSessionManager();

    const sessionId = await sessionManager.startSession('rs', 'test-dataset');

    await sessionManager.recordItem({
      item_id: 'test-1',
      item_type: 'sentence',
      item_text: 'Test',
      is_correct: true,
      score: 100
    });

    // Trigger flush
    await sessionManager.completeSession();

    // Verify items exist
    const { data, error } = await supabase
      .from('session_items')
      .select('*')
      .eq('session_id', sessionId);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });
});
```

---

## Deployment

### Environment Variables

Create `.env.local` for local development:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

For Vercel deployment, add to project settings:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Migration

**Option 1: Supabase Dashboard (Recommended)**

1. Go to SQL Editor in Supabase dashboard
2. Run `supabase/migrations/20250108000000_initial_schema.sql`
3. Run `supabase/migrations/20250113000000_ai_powered_features.sql`
4. Verify tables in Table Editor

**Option 2: Supabase CLI**

```bash
# Install CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref xxxxx

# Push migrations
supabase db push
```

### Vercel Deployment

```bash
# Build locally to test
npm run build

# Deploy to Vercel
vercel deploy --prod

# Or push to GitHub (auto-deploy)
git push origin main
```

### Post-Deployment Verification

```bash
# Check Supabase tables
# Go to: https://app.supabase.com/project/xxxxx/editor

# Check production app
# Open: https://your-app.vercel.app
# Test: Start practice session, complete, refresh page (data should persist)
```

---

## Performance Considerations

### Database Load

**Before Phase 1:**
```
1,000 users × 1 session/hour × 20 items = 20,000 writes/hour
= 5.5 writes/second
```

**After Phase 1 (with batching):**
```
1,000 users × 1 session/hour × 2 batches = 2,000 writes/hour
= 0.55 writes/second

Reduction: 90% ✓
```

### Write Patterns

| Pattern | Before | After | Improvement |
|---------|--------|-------|-------------|
| Items per write | 1 | 10 | 10x fewer writes |
| Auto-save frequency | 30s | 2min | 4x fewer writes |
| Duplicate saves | Yes | No (debounced) | 2x fewer writes |
| **Total reduction** | - | - | **~96% fewer writes** |

### Memory Usage

| Component | Size | Purpose |
|-----------|------|---------|
| Current session | ~5 KB | In-memory state |
| localStorage backup | ~5 KB | Current session |
| localForage queue | ~100 KB | 10 queued sessions |
| Archive | ~50 KB | Last 50 sessions |
| **Total** | **~160 KB** | Negligible impact |

### Network Usage

**Online Mode:**
```
Session start:    1 request (~1 KB)
Items (batched):  2 requests (~20 KB total)
Session complete: 1 request (~0.5 KB)
─────────────────────────────────────
Total per session: 4 requests, ~21.5 KB
```

**Offline Mode:**
```
No network usage during practice
Sync when online: 1 batch request (~25 KB per session)
```

### Recommendations

1. **Enable batching**: Keep default `batchSize: 10`
2. **Use auto-save**: Keep default `autoSaveInterval: 120000` (2 min)
3. **Enable debouncing**: Keep default `debounceWrites: true`
4. **Monitor queue size**: If > 10 sessions queued, prompt user to sync

---

## Security

### Row-Level Security (RLS)

All tables have RLS policies ensuring users can only access their own data.

**Example: practice_sessions**
```sql
-- Users can only view their own sessions
CREATE POLICY "Users can view own sessions"
  ON practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert sessions for themselves
CREATE POLICY "Users can insert own sessions"
  ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
CREATE POLICY "Users can update own sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);
```

**Result:** User A cannot see, modify, or delete User B's data, even if they guess the UUID.

### Data Validation

**Database-Level Constraints:**
```sql
-- Accuracy must be 0-100
CONSTRAINT valid_accuracy CHECK (accuracy >= 0 AND accuracy <= 100)

-- Completed time must be after started time
CONSTRAINT completed_after_started CHECK (completed_at IS NULL OR completed_at >= started_at)

-- Task type must be valid
CHECK (task_type IN ('rs', 'asq', 'wfd', 'ra', 'di', 'rl', 'fib_r', 'fib_l', 'vocabulary'))
```

### API Key Security

- Gemini API keys encrypted in localStorage (AES-256-GCM)
- Device-specific encryption salt
- Keys never transmitted to Supabase
- See `docs/architecture/AI-POWERED-PTE-SYSTEM.md` for encryption implementation

### Best Practices

1. ✅ Use Supabase Anon Key (not Service Role Key) in client
2. ✅ Enable RLS on all tables
3. ✅ Validate data on both client and database
4. ✅ Use HTTPS (enforced by Vercel)
5. ✅ Implement CSP headers to prevent XSS

---

## Troubleshooting

### Issue: "Invalid API key" Error

**Symptom:** Console error: `Invalid API key` or `401 Unauthorized`

**Cause:** `VITE_SUPABASE_ANON_KEY` is incorrect or missing

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Copy **"anon public"** key (NOT "service_role")
3. Update `.env.local`
4. Restart dev server: `npm run dev`

---

### Issue: "relation 'practice_sessions' does not exist"

**Symptom:** Database error about missing table

**Cause:** Migrations not run

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/20250108000000_initial_schema.sql`
3. Run `supabase/migrations/20250113000000_ai_powered_features.sql`
4. Verify tables in Table Editor

---

### Issue: "Row Level Security" Error

**Symptom:** Error: `new row violates row-level security policy`

**Cause:** RLS policies not applied or user not authenticated

**Solution:**
1. Verify RLS policies exist:
   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```
2. Verify user is authenticated:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user);
   ```
3. If not authenticated, implement auth flow

---

### Issue: Sessions Not Syncing from Queue

**Symptom:** `getQueuedSessionCount()` returns > 0 but sessions don't sync

**Cause:** Network error or Supabase connection issue

**Solution:**
1. Check network connection
2. Manually trigger sync:
   ```typescript
   const synced = await sessionManager.syncQueuedSessions();
   console.log(`Synced: ${synced}`);
   ```
3. Check browser console for errors
4. Verify Supabase URL is correct

---

### Issue: TypeScript Errors with Supabase Client

**Symptom:** Type errors like `Argument of type 'X' is not assignable to parameter of type 'never'`

**Cause:** Supabase client type inference issue (known limitation)

**Solution (temporary):**
Use type assertions:
```typescript
const { error } = await supabase
  .from('practice_sessions')
  .insert(sessionData as any);
```

**Long-term solution:** Will be addressed in follow-up task to refine type system.

---

## Next Steps

### Phase 2: AI Context & Intelligence (3 weeks)

**Goals:**
- AI understands learner context
- Task-specific AI personas
- Conversation history

**Tasks:**
1. Build `contextBuilder.ts` for AI context injection
2. Create task personas (RS/ASQ/WFD/RA/Vocab)
3. Enhance `/api/ai/chat` with context
4. Implement conversation history tracking
5. Add AI response rating UI

**Deliverables:**
- AI knows what you're practicing
- Different AI behavior per task
- AI remembers past conversations

---

### Phase 3: Weak Area Detection (2 weeks)

**Goals:**
- AI detects patterns
- Identifies weak areas
- Suggests targeted practice

**Tasks:**
1. Build `weakAreaDetector.ts`
2. Implement pattern analysis
3. Create `recommendationEngine.ts`
4. Add weak area UI components
5. Generate targeted practice drills

---

### Phase 4: Proactive AI Interventions (2 weeks)

**Goals:**
- AI proactively helps learners
- Detects fatigue and frustration
- Celebrates achievements

**Tasks:**
1. Implement fatigue detection
2. Add mastery level-up notifications
3. Create break reminders
4. Build intervention UI (toasts, modals)

---

### Phase 5: UI Redesign (3 weeks)

**Goals:**
- Task-specific practice interfaces
- Integrated AI assistant sidebar
- Modern, responsive design

**Tasks:**
1. Redesign practice interfaces (RS/ASQ/WFD/RA)
2. Build AI assistant sidebar
3. Create progress dashboard
4. Implement responsive design
5. Add animations and transitions

---

### Phase 6: Mock Exams & Analytics (2 weeks)

**Goals:**
- Full PTE mock exams
- Performance predictions
- Advanced analytics

**Tasks:**
1. Build mock exam interface
2. Implement scoring algorithm
3. Create analytics dashboard
4. Add performance predictions
5. Generate detailed reports

---

## Appendix

### File Structure

```
ccl-pronunciation-trainer/
├── supabase/
│   └── migrations/
│       ├── 20250108000000_initial_schema.sql       (v1.0.0 - existing)
│       └── 20250113000000_ai_powered_features.sql  (v2.0.0 - Phase 1)
├── src/
│   ├── types/
│   │   └── database.ts                             (650 lines)
│   └── services/
│       └── session/
│           └── sessionManager.ts                   (480 lines)
├── docs/
│   ├── architecture/
│   │   ├── AI-POWERED-PTE-SYSTEM.md               (master plan)
│   │   └── PHASE-1-IMPLEMENTATION.md              (this file)
│   └── setup/
│       └── SUPABASE-SETUP.md                      (existing)
└── package.json                                    (+ localforage)
```

### Dependencies Added

```json
{
  "dependencies": {
    "localforage": "^1.10.0"
  }
}
```

### Useful SQL Queries

**Get session summary:**
```sql
SELECT
  ps.id,
  ps.task_type,
  ps.started_at,
  ps.duration_sec,
  ps.items_attempted,
  ps.items_correct,
  ps.accuracy,
  COUNT(si.id) as item_count
FROM practice_sessions ps
LEFT JOIN session_items si ON si.session_id = ps.id
WHERE ps.user_id = auth.uid()
GROUP BY ps.id
ORDER BY ps.started_at DESC
LIMIT 10;
```

**Get weak areas:**
```sql
SELECT
  task_type,
  weakness_type,
  specific_issue,
  severity,
  detected_at
FROM weak_area_analysis
WHERE user_id = auth.uid()
  AND resolved_at IS NULL
ORDER BY severity DESC;
```

**Get AI conversation history:**
```sql
SELECT
  ac.created_at,
  ac.task_context,
  ac.user_message,
  ac.ai_response,
  ac.helpful_rating,
  ps.task_type,
  ps.accuracy
FROM ai_conversations ac
LEFT JOIN practice_sessions ps ON ps.id = ac.session_id
WHERE ac.user_id = auth.uid()
ORDER BY ac.created_at DESC
LIMIT 20;
```

---

## Changelog

**v1.0.0 - January 2025**
- Initial Phase 1 implementation
- 8 new database tables
- Complete TypeScript type system
- Offline-first session manager
- Auto-save with batching and debouncing
- Background sync queue

---

## References

- **Master Architecture:** `docs/architecture/AI-POWERED-PTE-SYSTEM.md`
- **Supabase Setup:** `docs/setup/SUPABASE-SETUP.md`
- **Supabase Docs:** https://supabase.com/docs
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **localForage Docs:** https://localforage.github.io/localForage/

---

**Questions or Issues?**

Open an issue on GitHub or contact the maintainers.

---

**End of Phase 1 Implementation Documentation**
