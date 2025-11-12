# AI-Powered PTE Learning System Architecture

**Document Version:** 1.0
**Created:** 2025-01-13
**Status:** Proposed Architecture for Future Implementation
**Target:** Intelligent, scalable PTE exam preparation system

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [SQL Database Design](#sql-database-design)
4. [AI-Learner Interaction Architecture](#ai-learner-interaction-architecture)
5. [UI/UX Redesign](#uiux-redesign)
6. [Project Structure Impact](#project-structure-impact)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Cost & Performance Analysis](#cost--performance-analysis)

---

## Executive Summary

### Vision
Transform the PTE Pronunciation Trainer from a **vocabulary tool** into an **intelligent AI tutor** that:
- ✅ Understands individual learner needs
- ✅ Adapts to learning patterns
- ✅ Provides personalized practice sessions
- ✅ Tracks progress across all PTE tasks
- ✅ Gives contextual, actionable feedback
- ✅ Simulates real PTE exam conditions

### Key Problems to Solve

**Current Limitations:**
1. ❌ **AI is disconnected**: Tutor doesn't know what you're practicing
2. ❌ **No session tracking**: Can't track practice sessions over time
3. ❌ **Generic responses**: AI doesn't personalize to learner's weak areas
4. ❌ **No task-specific guidance**: Same AI for RS/ASQ/WFD/RA (all different!)
5. ❌ **Limited interaction**: One-off Q&A, no continuous learning loop
6. ❌ **No exam simulation**: Doesn't replicate real PTE test experience

**Proposed Solution:**
```
Intelligent AI Tutor = Context-Aware + Adaptive + Task-Specific + Continuous
```

---

## Current State Analysis

### What We Have (v3.0.0)

#### Data Layer ✅
- **Vocabulary**: 14 books, 14,300+ terms (JSON)
- **Practice**: RS/ASQ/WFD datasets (JSON)
- **User Progress**: localStorage (basic)
- **Analytics**: PostHog (events)

#### AI Layer ⚠️
- **AI Tutor Chat**: Generic Q&A (via `/api/ai/chat`)
- **Pronunciation Scoring**: Speech recognition feedback (via `/api/pronunciation-score`)
- **No context**: AI doesn't know:
  - What the learner just practiced
  - Their weak areas
  - Their learning history
  - Their PTE goals

#### Database Layer ✅ (Partial)
- **Supabase**: Auth, basic progress tracking
- **Tables**: `users`, `user_progress`, `analytics_events`
- **Missing**: Practice sessions, AI conversations, task-specific metrics

### What's Missing for Intelligent AI Tutor

1. **Session Tracking**
   - Practice sessions not stored
   - Can't analyze learning patterns
   - Can't track improvement over time

2. **Learner Profile**
   - No weak area identification
   - No learning style adaptation
   - No goal tracking

3. **AI Context**
   - AI doesn't remember past interactions
   - No conversation history
   - No personalized recommendations

4. **Task-Specific Intelligence**
   - Same AI prompt for all PTE tasks
   - Doesn't understand RS vs ASQ vs WFD differences
   - Generic feedback instead of task-specific strategies

---

## SQL Database Design

### Core Principle: Hybrid Storage Strategy

**Keep:**
- ✅ Vocabulary datasets in JSON (static content)
- ✅ Practice items in JSON (static content)

**Add to Database:**
- ✅ Practice sessions (dynamic user data)
- ✅ AI conversations (context + history)
- ✅ Learner profiles (personalization)
- ✅ Task-specific metrics (analytics)

### Entity-Relationship Diagram

```
┌────────────────────┐
│    auth.users      │  (Supabase built-in)
│  - id (UUID)       │
│  - email           │
│  - created_at      │
└─────────┬──────────┘
          │
          │ 1:1
          ▼
┌────────────────────┐
│  learner_profiles  │  NEW - Core learner data
│  - user_id (FK)    │
│  - pte_goal_score  │
│  - target_date     │
│  - weak_areas      │  JSONB: {speaking: 45, listening: 60}
│  - learning_style  │  TEXT: visual/auditory/kinesthetic
│  - study_hours_week│
│  - created_at      │
│  - updated_at      │
└─────────┬──────────┘
          │
          │ 1:N
          ▼
┌────────────────────┐
│  practice_sessions │  NEW - Core session tracking
│  - id (UUID)       │
│  - user_id (FK)    │
│  - task_type       │  TEXT: 'rs'|'asq'|'wfd'|'ra'|'di'|'rl'|'vocabulary'
│  - dataset_id      │  TEXT: 'pte-rs-vocabulary'
│  - started_at      │  TIMESTAMP
│  - completed_at    │  TIMESTAMP
│  - duration_sec    │  INT
│  - items_attempted │  INT
│  - items_correct   │  INT
│  - accuracy        │  DECIMAL(5,2)
│  - mode            │  TEXT: 'practice'|'mock_exam'|'adaptive'
│  - settings        │  JSONB: {voice, speed, auto_play}
└─────────┬──────────┘
          │
          │ 1:N
          ▼
┌────────────────────┐
│  session_items     │  NEW - Individual item performance
│  - id (UUID)       │
│  - session_id (FK) │
│  - item_id         │  TEXT: word/sentence from JSON dataset
│  - item_type       │  TEXT: 'word'|'sentence'|'question'
│  - item_text       │  TEXT: actual content
│  - user_response   │  TEXT: what user said/wrote
│  - transcription   │  TEXT: speech-to-text result
│  - is_correct      │  BOOLEAN
│  - score           │  INT (0-100)
│  - time_spent_sec  │  INT
│  - attempts        │  INT: how many tries
│  - feedback        │  TEXT: AI-generated feedback
│  - pronunciation_errors │ JSONB: [{word, expected, actual}]
│  - attempted_at    │  TIMESTAMP
└────────────────────┘

┌────────────────────┐
│  ai_conversations  │  NEW - AI chat history with context
│  - id (UUID)       │
│  - user_id (FK)    │
│  - session_id (FK) │  NULLABLE: link to practice session if applicable
│  - task_context    │  TEXT: 'rs'|'asq'|'wfd'|'general'
│  - user_message    │  TEXT
│  - ai_response     │  TEXT
│  - context_data    │  JSONB: {current_word, difficulty, recent_errors}
│  - sentiment       │  TEXT: 'confused'|'confident'|'frustrated'
│  - helpful_rating  │  INT: user feedback (1-5)
│  - created_at      │  TIMESTAMP
└────────────────────┘

┌────────────────────┐
│  task_strategies   │  NEW - Task-specific AI strategies
│  - id (UUID)       │
│  - task_type       │  TEXT: 'rs'|'asq'|'wfd'|'ra'|'di'|'rl'
│  - difficulty      │  TEXT: 'easy'|'normal'|'hard'
│  - strategy_type   │  TEXT: 'tips'|'common_mistakes'|'practice_drill'
│  - content         │  TEXT: strategy description
│  - example         │  TEXT: example usage
│  - success_rate    │  DECIMAL: % of learners who improved
│  - priority        │  INT: order to suggest
│  - created_at      │  TIMESTAMP
└────────────────────┘

┌────────────────────┐
│  weak_area_analysis│  NEW - AI-powered weakness detection
│  - id (UUID)       │
│  - user_id (FK)    │
│  - task_type       │  TEXT
│  - weakness_type   │  TEXT: 'pronunciation'|'fluency'|'vocab'|'grammar'
│  - specific_issue  │  TEXT: 'word_stress'|'vowel_sounds'|'speed'
│  - severity        │  INT (1-10)
│  - evidence        │  JSONB: [session_ids with errors]
│  - recommended_action│ TEXT: AI suggestion
│  - detected_at     │  TIMESTAMP
│  - resolved_at     │  TIMESTAMP (nullable)
└────────────────────┘

┌────────────────────┐
│  learning_goals    │  NEW - Goal tracking
│  - id (UUID)       │
│  - user_id (FK)    │
│  - goal_type       │  TEXT: 'daily'|'weekly'|'exam_prep'
│  - task_type       │  TEXT: which PTE task
│  - target_metric   │  TEXT: 'accuracy'|'fluency'|'items_completed'
│  - target_value    │  INT
│  - current_value   │  INT
│  - deadline        │  DATE
│  - status          │  TEXT: 'active'|'completed'|'abandoned'
│  - created_at      │  TIMESTAMP
│  - completed_at    │  TIMESTAMP
└────────────────────┘

┌────────────────────┐
│  adaptive_recommendations │ NEW - AI learning path
│  - id (UUID)       │
│  - user_id (FK)    │
│  - recommendation_type │ TEXT: 'next_practice'|'difficulty_adjust'|'focus_area'
│  - task_type       │  TEXT
│  - dataset_id      │  TEXT: suggested dataset
│  - difficulty      │  TEXT: suggested difficulty
│  - reasoning       │  TEXT: why AI recommends this
│  - confidence      │  DECIMAL: AI confidence score
│  - status          │  TEXT: 'pending'|'accepted'|'declined'|'completed'
│  - created_at      │  TIMESTAMP
│  - acted_on_at     │  TIMESTAMP
└────────────────────┘
```

### SQL Schema (PostgreSQL / Supabase)

```sql
-- ================================================================
-- LEARNER PROFILES
-- ================================================================
CREATE TABLE learner_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pte_goal_score INT CHECK (pte_goal_score BETWEEN 10 AND 90),
  target_date DATE,
  weak_areas JSONB DEFAULT '{}',
  learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  study_hours_week DECIMAL(4,1),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_learner_profiles_user_id ON learner_profiles(user_id);

-- ================================================================
-- PRACTICE SESSIONS
-- ================================================================
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('rs', 'asq', 'wfd', 'ra', 'di', 'rl', 'fib_r', 'fib_l', 'vocabulary')),
  dataset_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_sec INT,
  items_attempted INT DEFAULT 0,
  items_correct INT DEFAULT 0,
  accuracy DECIMAL(5,2),
  mode TEXT CHECK (mode IN ('practice', 'mock_exam', 'adaptive', 'review')) DEFAULT 'practice',
  settings JSONB DEFAULT '{}',

  CONSTRAINT valid_accuracy CHECK (accuracy >= 0 AND accuracy <= 100),
  CONSTRAINT completed_after_started CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX idx_sessions_user_task ON practice_sessions(user_id, task_type);
CREATE INDEX idx_sessions_started ON practice_sessions(started_at DESC);
CREATE INDEX idx_sessions_mode ON practice_sessions(mode);

-- ================================================================
-- SESSION ITEMS (Individual performance tracking)
-- ================================================================
CREATE TABLE session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL, -- Reference to JSON dataset item
  item_type TEXT CHECK (item_type IN ('word', 'sentence', 'question', 'passage')) NOT NULL,
  item_text TEXT NOT NULL,
  user_response TEXT,
  transcription TEXT, -- Speech-to-text output
  is_correct BOOLEAN,
  score INT CHECK (score BETWEEN 0 AND 100),
  time_spent_sec INT,
  attempts INT DEFAULT 1,
  feedback TEXT,
  pronunciation_errors JSONB DEFAULT '[]',
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_session_items_session ON session_items(session_id);
CREATE INDEX idx_session_items_item_id ON session_items(item_id);
CREATE INDEX idx_session_items_correct ON session_items(is_correct);

-- ================================================================
-- AI CONVERSATIONS (Context-aware chat history)
-- ================================================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  task_context TEXT,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_data JSONB DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('confused', 'confident', 'frustrated', 'neutral', 'curious')),
  helpful_rating INT CHECK (helpful_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON ai_conversations(user_id, created_at DESC);
CREATE INDEX idx_conversations_session ON ai_conversations(session_id);
CREATE INDEX idx_conversations_context ON ai_conversations(task_context);

-- ================================================================
-- TASK STRATEGIES (AI knowledge base)
-- ================================================================
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

CREATE INDEX idx_strategies_task ON task_strategies(task_type, difficulty);

-- ================================================================
-- WEAK AREA ANALYSIS (AI-powered diagnostics)
-- ================================================================
CREATE TABLE weak_area_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  weakness_type TEXT CHECK (weakness_type IN ('pronunciation', 'fluency', 'vocabulary', 'grammar', 'content', 'speed')),
  specific_issue TEXT NOT NULL,
  severity INT CHECK (severity BETWEEN 1 AND 10),
  evidence JSONB DEFAULT '[]', -- Array of session_ids
  recommended_action TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_weak_areas_user ON weak_area_analysis(user_id, severity DESC);
CREATE INDEX idx_weak_areas_task ON weak_area_analysis(task_type);
CREATE INDEX idx_weak_areas_active ON weak_area_analysis(resolved_at) WHERE resolved_at IS NULL;

-- ================================================================
-- LEARNING GOALS
-- ================================================================
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_goals_user_active ON learning_goals(user_id, status) WHERE status = 'active';

-- ================================================================
-- ADAPTIVE RECOMMENDATIONS
-- ================================================================
CREATE TABLE adaptive_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_recommendations_user ON adaptive_recommendations(user_id, status, created_at DESC);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weak_area_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON learner_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON learner_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON learner_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON practice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON practice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON practice_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own session items" ON session_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM practice_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own session items" ON session_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM practice_sessions WHERE id = session_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own weak areas" ON weak_area_analysis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own goals" ON learning_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON learning_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON learning_goals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations" ON adaptive_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON adaptive_recommendations FOR UPDATE USING (auth.uid() = user_id);

-- Task strategies are public (read-only for all authenticated users)
ALTER TABLE task_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view strategies" ON task_strategies FOR SELECT TO authenticated USING (true);
```

### Key Design Decisions

1. **Hybrid Storage**: JSON for static content, SQL for dynamic user data
2. **Session Tracking**: Every practice session stored with detailed metrics
3. **Item-Level Data**: Track individual word/sentence performance
4. **AI Context**: Conversation history linked to practice sessions
5. **Weak Area Detection**: AI analyzes patterns to identify issues
6. **Adaptive Learning**: System recommends personalized next steps
7. **RLS**: User data isolation for security

---

## AI-Learner Interaction Architecture

### Problem: Current AI is "Dumb"

**Current State:**
```
User: "How do I pronounce 'discussion'?"
AI: "The word 'discussion' is pronounced /dɪˈskʌʃ.ən/..."
```

**What AI DOESN'T know:**
- ❌ User just failed "discussion" 5 times
- ❌ User struggles with /ʌ/ sound consistently
- ❌ User is practicing for RS (Repeat Sentence) task
- ❌ User's goal is PTE score 65 in 2 months
- ❌ User learns best with visual aids

### Solution: Context-Aware AI Tutor

#### Architecture: AI with Memory & Context

```
┌──────────────────────────────────────────────────────────┐
│                 INTELLIGENT AI TUTOR                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. CONTEXT GATHERING                                    │
│  ┌────────────────────────────────────────────────┐     │
│  │ • Current practice session                     │     │
│  │ • Recent errors (last 10 items)                │     │
│  │ • Learner profile (goals, weak areas)          │     │
│  │ • Conversation history (last 20 messages)      │     │
│  │ • Task type (RS/ASQ/WFD/...)                   │     │
│  └────────────────────────────────────────────────┘     │
│                         ▼                                │
│  2. AI PROCESSING (Google Gemini)                        │
│  ┌────────────────────────────────────────────────┐     │
│  │ Task-Specific Prompt:                          │     │
│  │ "You are a PTE Speaking expert. The learner   │     │
│  │  is practicing REPEAT SENTENCE. They just      │     │
│  │  scored 45% on 'discussion' (target: 'The     │     │
│  │  discussion focused on...').                   │     │
│  │                                                │     │
│  │  Their weak areas: /ʌ/ sound, sentence stress │     │
│  │  Goal: 65+ score by Feb 2025                  │     │
│  │  Learning style: Visual + practice drills     │     │
│  │                                                │     │
│  │  Provide: 1) Specific feedback on their error │     │
│  │           2) Tip for /ʌ/ sound mastery        │     │
│  │           3) Practice drill (3 similar words) │     │
│  │           4) Encouragement with progress note"│     │
│  └────────────────────────────────────────────────┘     │
│                         ▼                                │
│  3. PERSONALIZED RESPONSE                                │
│  ┌────────────────────────────────────────────────┐     │
│  │ "I see you're working on 'discussion' for RS. │     │
│  │  You scored 45% - you said 'diskushon' but    │     │
│  │  the correct pronunciation is /dɪˈskʌʃ.ən/.   │     │
│  │                                                │     │
│  │  💡 TIP: Focus on the /ʌ/ sound (like 'up').  │     │
│  │  Your tongue should be relaxed in the middle  │     │
│  │  of your mouth.                               │     │
│  │                                                │     │
│  │  🎯 PRACTICE DRILL:                            │     │
│  │  1. discussion → di-SCUSS-ion                 │     │
│  │  2. percussion → per-CUSS-ion                 │     │
│  │  3. concussion → con-CUSS-ion                 │     │
│  │                                                │     │
│  │  ⭐ PROGRESS: You've improved from 30% to 45%  │     │
│  │  on /ʌ/ words this week! Keep going!"         │     │
│  └────────────────────────────────────────────────┘     │
│                         ▼                                │
│  4. LEARNING LOOP                                        │
│  ┌────────────────────────────────────────────────┐     │
│  │ • Save conversation to ai_conversations        │     │
│  │ • Update weak_area_analysis (/ʌ/ severity -1) │     │
│  │ • Generate new adaptive_recommendation         │     │
│  │ • Track if feedback was helpful (rating)       │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Task-Specific AI Personas

Instead of one generic AI, create specialized AI tutors:

```typescript
// Task-specific AI system prompts
const AI_PERSONAS = {
  rs: {
    name: "RS Coach",
    role: "Repeat Sentence expert",
    systemPrompt: `You are a PTE Repeat Sentence coach. Focus on:
      - Short-term memory techniques
      - Chunking long sentences
      - Stress and intonation patterns
      - Common sentence structures in PTE RS

      Always:
      - Break sentences into chunks
      - Highlight stress patterns with CAPS
      - Give memory tricks
      - Provide similar practice sentences`,

    contextNeeded: ['current_sentence', 'user_transcription', 'accuracy', 'previous_rs_scores'],
  },

  asq: {
    name: "ASQ Tutor",
    role: "Answer Short Question specialist",
    systemPrompt: `You are a PTE Answer Short Question tutor. Focus on:
      - Quick thinking and response speed
      - Common question patterns
      - Subject-specific vocabulary
      - Concise answer formulation

      Always:
      - Identify question type (who/what/when/where)
      - Suggest answer format (noun/date/name)
      - Give 3 similar practice questions
      - Teach elimination strategies`,

    contextNeeded: ['question', 'user_answer', 'correct_answer', 'response_time', 'category'],
  },

  wfd: {
    name: "WFD Master",
    role: "Write From Dictation expert",
    systemPrompt: `You are a PTE Write From Dictation master. Focus on:
      - Listening for key words
      - Grammar and spelling accuracy
      - Common WFD sentence patterns
      - Typing speed optimization

      Always:
      - Show which words were missed
      - Explain spelling rules
      - Give similar sentences for practice
      - Teach note-taking strategies`,

    contextNeeded: ['target_sentence', 'user_typed', 'missed_words', 'spelling_errors'],
  },

  ra: {
    name: "RA Specialist",
    role: "Read Aloud pronunciation expert",
    systemPrompt: `You are a PTE Read Aloud specialist. Focus on:
      - Clear pronunciation
      - Natural reading pace
      - Punctuation awareness
      - Stress and intonation

      Always:
      - Mark stress patterns
      - Identify mispronounced words
      - Suggest breathing points
      - Practice difficult word combinations`,

    contextNeeded: ['passage', 'pronunciation_errors', 'reading_speed', 'fluency_score'],
  },

  vocabulary: {
    name: "Vocab Builder",
    role: "Vocabulary learning expert",
    systemPrompt: `You are a vocabulary learning expert. Focus on:
      - Word families and roots
      - Memory techniques (mnemonics)
      - Usage in context
      - IPA pronunciation guide

      Always:
      - Break down word components
      - Give real-life examples
      - Suggest similar words
      - Teach pronunciation tricks`,

    contextNeeded: ['word', 'difficulty', 'category', 'user_history_with_word'],
  },
};
```

### AI Context Injection (Implementation)

```typescript
// src/services/ai/contextBuilder.ts
interface AIContext {
  // Session context
  sessionId?: string;
  taskType: 'rs' | 'asq' | 'wfd' | 'ra' | 'vocabulary';

  // Current item context
  currentItem: {
    text: string;
    userResponse?: string;
    transcription?: string;
    score?: number;
    attempts?: number;
  };

  // Learner context (from database)
  learnerProfile: {
    goalScore: number;
    weakAreas: string[];
    learningStyle: string;
    targetDate: string;
  };

  // Historical context
  recentErrors: {
    item: string;
    error: string;
    timestamp: string;
  }[];

  // Conversation history
  previousMessages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
}

export async function buildAIContext(userId: string, taskType: string): Promise<AIContext> {
  // 1. Get learner profile
  const profile = await supabase
    .from('learner_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // 2. Get current practice session
  const currentSession = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('task_type', taskType)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  // 3. Get recent errors (last 10 items with low scores)
  const recentErrors = await supabase
    .from('session_items')
    .select('item_text, user_response, score, attempted_at')
    .eq('session_id', currentSession?.id)
    .lt('score', 70)
    .order('attempted_at', { ascending: false })
    .limit(10);

  // 4. Get conversation history (last 20 messages)
  const conversationHistory = await supabase
    .from('ai_conversations')
    .select('user_message, ai_response, created_at')
    .eq('user_id', userId)
    .eq('task_context', taskType)
    .order('created_at', { ascending: false })
    .limit(10); // Last 10 exchanges = 20 messages

  // 5. Build context object
  return {
    taskType,
    sessionId: currentSession?.id,
    currentItem: {
      text: '', // Will be filled by caller
    },
    learnerProfile: {
      goalScore: profile?.pte_goal_score || 65,
      weakAreas: profile?.weak_areas || {},
      learningStyle: profile?.learning_style || 'mixed',
      targetDate: profile?.target_date || 'not set',
    },
    recentErrors: recentErrors?.data?.map(e => ({
      item: e.item_text,
      error: `Expected: ${e.item_text}, Got: ${e.user_response}, Score: ${e.score}`,
      timestamp: e.attempted_at,
    })) || [],
    previousMessages: conversationHistory?.data?.flatMap(c => [
      { role: 'user', content: c.user_message, timestamp: c.created_at },
      { role: 'assistant', content: c.ai_response, timestamp: c.created_at },
    ]) || [],
  };
}

// Enhanced AI chat endpoint
export async function askIntelligentAITutor(
  userId: string,
  message: string,
  taskType: string,
  currentItem?: any
): Promise<string> {
  // 1. Build comprehensive context
  const context = await buildAIContext(userId, taskType);
  context.currentItem = currentItem;

  // 2. Get task-specific AI persona
  const persona = AI_PERSONAS[taskType];

  // 3. Build enhanced prompt
  const systemPrompt = `${persona.systemPrompt}

  LEARNER PROFILE:
  - Goal: ${context.learnerProfile.goalScore}+ by ${context.learnerProfile.targetDate}
  - Weak areas: ${context.learnerProfile.weakAreas.join(', ')}
  - Learning style: ${context.learnerProfile.learningStyle}

  CURRENT SESSION:
  - Task: ${taskType.toUpperCase()}
  - Current item: ${context.currentItem.text}
  - User response: ${context.currentItem.userResponse || 'N/A'}
  - Score: ${context.currentItem.score || 'N/A'}

  RECENT ERRORS (patterns to address):
  ${context.recentErrors.slice(0, 3).map((e, i) => `${i+1}. ${e.error}`).join('\n')}

  CONVERSATION HISTORY (last 5 exchanges):
  ${context.previousMessages.slice(0, 10).map(m =>
    `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content.substring(0, 100)}...`
  ).join('\n')}

  Now respond to the student's question: "${message}"

  Your response should be:
  1. Context-aware (reference their current practice)
  2. Encouraging (acknowledge progress)
  3. Actionable (give specific next steps)
  4. Personalized (address their weak areas)`;

  // 4. Call Gemini API with enhanced context
  const response = await callGeminiAPI(systemPrompt, message);

  // 5. Save conversation with context
  await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      session_id: context.sessionId,
      task_context: taskType,
      user_message: message,
      ai_response: response,
      context_data: {
        current_item: context.currentItem,
        recent_errors_count: context.recentErrors.length,
      },
    });

  return response;
}
```

### Continuous Learning Loop

```
┌─────────────────────────────────────────────────────┐
│         CONTINUOUS LEARNING CYCLE                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. PRACTICE                                        │
│     User practices RS/ASQ/WFD                       │
│              ▼                                      │
│  2. TRACK                                           │
│     System saves: item, response, score, time       │
│              ▼                                      │
│  3. ANALYZE                                         │
│     AI detects patterns: "User struggles with /ʌ/" │
│              ▼                                      │
│  4. RECOMMEND                                       │
│     AI suggests: "Practice /ʌ/ words for 10 min"   │
│              ▼                                      │
│  5. INTERVENE                                       │
│     AI proactively asks: "Need help with /ʌ/?"     │
│              ▼                                      │
│  6. ADAPT                                           │
│     System adjusts difficulty, content, pace        │
│              ▼                                      │
│  7. MEASURE                                         │
│     Track improvement: /ʌ/ accuracy 30% → 60%      │
│              ▼                                      │
│     [Loop back to step 1 with personalized content] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## UI/UX Redesign

### Current UI Problems

1. **AI Chat is isolated**: Separate panel, no integration with practice
2. **No visual feedback**: Text-only responses
3. **Generic interface**: Same UI for all PTE tasks
4. **No progress visibility**: Can't see improvement over time
5. **No proactive guidance**: AI waits for questions

### Proposed UI Architecture

#### 1. Task-Specific Practice Interfaces

Instead of one generic practice screen, create specialized UIs:

```
┌──────────────────────────────────────────────────────┐
│  REPEAT SENTENCE (RS) INTERFACE                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  🎧 Listen (Click to play)                     │ │
│  │  [▶️ Play Audio] [🔁 Replay] [⏸️ Pause]        │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  🎤 Record Your Response                       │ │
│  │                                                │ │
│  │  [⏺️ Start Recording]  ⏱️ 0:00 / 0:40          │ │
│  │                                                │ │
│  │  Waveform: ▂▃▅▇█▇▅▃▂ (real-time visualization)│ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  📊 AI Feedback                                │ │
│  │                                                │ │
│  │  Score: 75/100  ⭐⭐⭐                          │ │
│  │                                                │ │
│  │  ✅ Correct: "The discussion focused on"      │ │
│  │  ❌ Missed: "climate change" (you said "cli-  │ │
│  │             mat change")                       │ │
│  │                                                │ │
│  │  💡 Tip: Stress the first syllable "CLI-mate" │ │
│  │                                                │ │
│  │  🎯 Practice: [climate] [private] [delicate]  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [⏭️ Next Sentence]  [💬 Ask AI]  [📈 Progress]    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 2. Integrated AI Assistant (Sidebar)

```
┌──────────────────────────────────────────────────────┐
│  🤖 AI TUTOR (RS Coach)                 [Minimize ▼] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  💬 Chat                                             │
│  ┌────────────────────────────────────────────────┐ │
│  │ Tutor: I noticed you're struggling with word  │ │
│  │        stress. Let's practice "cli-MAT-ic"    │ │
│  │        vs "CLI-mate". Try saying both!        │ │
│  │                                 [👍] [👎]      │ │
│  ├────────────────────────────────────────────────┤ │
│  │ You: How do I improve my fluency?             │ │
│  ├────────────────────────────────────────────────┤ │
│  │ Tutor: Great question! For RS, focus on:     │ │
│  │        1. Chunking (break into 3-4 word      │ │
│  │           groups)                             │ │
│  │        2. Shadowing (repeat after audio)     │ │
│  │        3. Practice these 5 sentences:        │ │
│  │           [Show sentences]                   │ │
│  │                                 [👍] [👎]      │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Type your question...]                [Send →]    │
│                                                      │
│  ───────────────────────────────────────────────────│
│                                                      │
│  📊 Quick Stats                                      │
│  • Today: 12/15 correct (80%)                       │
│  • This week: 78% avg                               │
│  • Goal: 65+ ✅ (On track!)                         │
│                                                      │
│  ───────────────────────────────────────────────────│
│                                                      │
│  🎯 Recommended Next                                 │
│  ┌────────────────────────────────────────────────┐ │
│  │ Practice /ʌ/ sounds (10 min)                  │ │
│  │ Difficulty: Medium                             │ │
│  │ Why: 3 errors in last session                  │ │
│  │               [Start Practice →]                │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 3. Proactive AI Interventions

AI should interrupt (gently) when needed:

```typescript
// Trigger conditions for AI intervention
const INTERVENTION_TRIGGERS = {
  // Struggling: 3 consecutive failures
  consecutive_failures: {
    condition: (session) => session.recentScores.filter(s => s < 50).length >= 3,
    message: "I notice you're having trouble. Let's take a different approach! 💡",
    action: "suggest_strategy",
  },

  // Fatigue: 30+ minutes, accuracy dropping
  fatigue_detected: {
    condition: (session) => session.duration > 1800 && session.recentAccuracy < session.avgAccuracy - 15,
    message: "Your accuracy is dropping. Time for a 5-minute break? ☕",
    action: "suggest_break",
  },

  // Mastery: 10 consecutive correct
  mastery_achieved: {
    condition: (session) => session.recentScores.filter(s => s >= 85).length >= 10,
    message: "Wow! 🎉 10 correct in a row! Ready to level up to harder content?",
    action: "suggest_difficulty_increase",
  },

  // Weak area recurring
  weak_area_recurring: {
    condition: (session) => session.errorPattern.includes('/ʌ/') && session.errorCount['/ʌ/'] >= 5,
    message: "I see /ʌ/ sound is tricky. Let's do a 2-minute drill on this! 🎯",
    action: "launch_targeted_drill",
  },
};
```

#### 4. Progress Dashboard

```
┌──────────────────────────────────────────────────────┐
│  📈 YOUR PTE JOURNEY                                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🎯 Goal: 65+ by Feb 15, 2025  [23 days left]       │
│                                                      │
│  ───────────────────────────────────────────────────│
│                                                      │
│  📊 Overall Progress                                 │
│  ┌────────────────────────────────────────────────┐ │
│  │  Speaking:  ▓▓▓▓▓▓▓▓▒▒  62/90  (Target: 65)    │ │
│  │  Listening: ▓▓▓▓▓▓▓▓▓▒  68/90  ✅              │ │
│  │  Reading:   ▓▓▓▓▓▒▒▒▒▒  55/90  (Target: 60)    │ │
│  │  Writing:   ▓▓▓▓▓▓▒▒▒▒  60/90  (Target: 60)    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ───────────────────────────────────────────────────│
│                                                      │
│  🔥 Streak: 7 days  |  ⏱️ This week: 4.5 hours     │
│                                                      │
│  ───────────────────────────────────────────────────│
│                                                      │
│  📈 Task Breakdown (Last 7 days)                     │
│  ┌────────────────────────────────────────────────┐ │
│  │  RS  (Repeat Sentence)                         │ │
│  │  45 items | 78% accuracy | 2.1 hrs             │ │
│  │  Trend: ↗️ +5% from last week                  │ │
│  ├────────────────────────────────────────────────┤ │
│  │  ASQ (Answer Short Question)                   │ │
│  │  32 items | 82% accuracy | 1.3 hrs             │ │
│  │  Trend: ↗️ +8% from last week                  │ │
│  ├────────────────────────────────────────────────┤ │
│  │  WFD (Write From Dictation)                    │ │
│  │  28 items | 65% accuracy | 1.1 hrs             │ │
│  │  Trend: ↔️ Stable (needs focus!)               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ───────────────────────────────────────────────────│
│                                                      │
│  ⚠️ Weak Areas (AI-Detected)                        │
│  ┌────────────────────────────────────────────────┐ │
│  │  1. /ʌ/ sound in vocabulary      [Drill →]     │ │
│  │     Severity: Medium | 12 errors this week     │ │
│  ├────────────────────────────────────────────────┤ │
│  │  2. WFD spelling accuracy        [Practice →]  │ │
│  │     Severity: High | Missing 35% of words      │ │
│  ├────────────────────────────────────────────────┤ │
│  │  3. RS sentence stress           [Tutorial →]  │ │
│  │     Severity: Low | Improving!                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ───────────────────────────────────────────────────│
│                                                      │
│  💡 AI Recommendations                               │
│  "Focus on WFD this week - it's your lowest area.  │
│   Practice 20 minutes daily, aiming for 75%+        │
│   accuracy. I'll send targeted exercises!"          │
│                                  [Start Now →]      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 5. Component Structure

```
src/components/
├── ai/
│   ├── AITutorSidebar.tsx          (Persistent AI chat)
│   ├── AIInterventionModal.tsx     (Proactive pop-ups)
│   ├── AIRecommendationCard.tsx    (Next steps suggestions)
│   ├── PronunciationScoring.tsx    (Existing - enhanced)
│   └── TaskSpecificPrompts.ts      (AI persona configs)
│
├── practice/
│   ├── RepeatSentence/
│   │   ├── RSInterface.tsx         (Task-specific UI)
│   │   ├── RSRecorder.tsx          (Audio recording)
│   │   ├── RSFeedback.tsx          (AI feedback display)
│   │   └── RSProgress.tsx          (RS-specific progress)
│   │
│   ├── AnswerShortQuestion/
│   │   ├── ASQInterface.tsx
│   │   ├── ASQTimer.tsx
│   │   └── ASQFeedback.tsx
│   │
│   ├── WriteFromDictation/
│   │   ├── WFDInterface.tsx
│   │   ├── WFDEditor.tsx
│   │   └── WFDHighlighter.tsx      (Highlight errors)
│   │
│   └── shared/
│       ├── PracticeSession.tsx     (Session wrapper)
│       └── FeedbackCard.tsx        (Generic feedback)
│
├── progress/
│   ├── ProgressDashboard.tsx       (Main dashboard)
│   ├── TaskProgressChart.tsx       (Per-task charts)
│   ├── WeakAreasList.tsx           (AI-detected issues)
│   └── GoalTracker.tsx             (Goal progress)
│
└── onboarding/
    ├── LearnerProfileSetup.tsx     (Goal, target date)
    ├── PTEGoalSelector.tsx         (Score target)
    └── LearningStyleQuiz.tsx       (Personalization)
```

---

## Project Structure Impact

### New Directories to Add

```
src/
├── services/
│   ├── ai/
│   │   ├── contextBuilder.ts       (NEW - Build AI context)
│   │   ├── intelligentTutor.ts     (NEW - Enhanced AI chat)
│   │   ├── taskPersonas.ts         (NEW - Task-specific prompts)
│   │   └── interventionEngine.ts   (NEW - Proactive AI)
│   │
│   ├── session/
│   │   ├── sessionManager.ts       (NEW - Track practice sessions)
│   │   ├── sessionAnalyzer.ts      (NEW - Analyze patterns)
│   │   └── recommendationEngine.ts (NEW - Adaptive suggestions)
│   │
│   └── analytics/
│       ├── weakAreaDetector.ts     (NEW - AI pattern detection)
│       └── progressCalculator.ts   (NEW - Progress metrics)
│
├── types/
│   ├── session.types.ts            (NEW - Session data types)
│   ├── ai.types.ts                 (NEW - AI context types)
│   └── learner.types.ts            (NEW - Learner profile types)
│
└── hooks/
    ├── usePracticeSession.ts       (NEW - Session management)
    ├── useAITutor.ts               (NEW - AI interaction)
    ├── useTaskContext.ts           (NEW - Task-specific context)
    └── useWeakAreas.ts             (NEW - Weak area tracking)
```

### API Routes to Add

```
api/
├── ai/
│   ├── chat.ts                     (EXISTING - enhance with context)
│   ├── intervention.ts             (NEW - Proactive AI)
│   └── recommendation.ts           (NEW - Adaptive suggestions)
│
├── session/
│   ├── start.ts                    (NEW - Start practice session)
│   ├── update.ts                   (NEW - Save session item)
│   ├── complete.ts                 (NEW - End session)
│   └── analyze.ts                  (NEW - Session analysis)
│
├── profile/
│   ├── get.ts                      (NEW - Get learner profile)
│   └── update.ts                   (NEW - Update profile/goals)
│
└── analytics/
    ├── weak-areas.ts               (NEW - Get weak areas)
    └── progress.ts                 (NEW - Get progress metrics)
```

### Database Migrations

```
supabase/migrations/
├── 20250113000001_create_learner_profiles.sql
├── 20250113000002_create_practice_sessions.sql
├── 20250113000003_create_session_items.sql
├── 20250113000004_create_ai_conversations.sql
├── 20250113000005_create_weak_area_analysis.sql
├── 20250113000006_create_learning_goals.sql
├── 20250113000007_create_adaptive_recommendations.sql
└── 20250113000008_create_task_strategies.sql
```

### Configuration Changes

```typescript
// src/ts/shared/Config.ts (ADD)
export const AI_CONFIG = {
  // Task-specific personas
  personas: AI_PERSONAS,

  // Context limits
  maxConversationHistory: 10,
  maxRecentErrors: 10,
  maxContextItems: 5,

  // Intervention thresholds
  interventionThresholds: {
    consecutiveFailures: 3,
    fatigueMinutes: 30,
    masteryStreak: 10,
    weakAreaRecurrence: 5,
  },

  // Session tracking
  sessionSettings: {
    autoSaveInterval: 30000, // 30 seconds
    maxSessionDuration: 7200000, // 2 hours
  },
};

// Zustand store updates
export interface AIState {
  // Current AI context
  currentContext: AIContext | null;
  currentPersona: string;

  // AI responses
  isProcessing: boolean;
  lastResponse: string | null;

  // Interventions
  pendingIntervention: Intervention | null;

  // Actions
  setContext: (context: AIContext) => void;
  askAI: (message: string) => Promise<string>;
  dismissIntervention: () => void;
}

export interface SessionState {
  // Current session
  currentSession: PracticeSession | null;
  sessionItems: SessionItem[];

  // Metrics
  accuracy: number;
  itemsAttempted: number;
  itemsCorrect: number;

  // Actions
  startSession: (taskType: string, datasetId: string) => Promise<void>;
  recordItem: (item: SessionItem) => Promise<void>;
  completeSession: () => Promise<void>;
}
```

---

## Implementation Roadmap

### Phase 1: Database & Session Tracking (2 weeks)

**Goals:**
- ✅ Set up database schema
- ✅ Implement session tracking
- ✅ Basic learner profiles

**Tasks:**
1. Create Supabase migrations (all 8 tables)
2. Set up RLS policies
3. Create `sessionManager.ts`
4. Update practice components to track sessions
5. Create learner profile onboarding flow

**Deliverables:**
- Database tables live
- Practice sessions saved to Supabase
- Learner profiles created on signup

---

### Phase 2: AI Context & Intelligence (3 weeks)

**Goals:**
- ✅ AI understands learner context
- ✅ Task-specific AI personas
- ✅ Conversation history

**Tasks:**
1. Build `contextBuilder.ts`
2. Create task personas (RS/ASQ/WFD/RA/Vocab)
3. Enhance `/api/ai/chat` with context
4. Implement conversation history
5. Add AI response rating

**Deliverables:**
- AI knows what you're practicing
- Different AI behavior per task
- AI remembers past conversations

---

### Phase 3: Weak Area Detection (2 weeks)

**Goals:**
- ✅ AI detects patterns
- ✅ Identifies weak areas
- ✅ Suggests targeted practice

**Tasks:**
1. Build `weakAreaDetector.ts`
2. Implement pattern analysis
3. Create `recommendationEngine.ts`
4. Add weak area UI components
5. Generate targeted practice drills

**Deliverables:**
- AI identifies pronunciation issues
- Weak areas displayed in dashboard
- Personalized recommendations

---

### Phase 4: Proactive AI (2 weeks)

**Goals:**
- ✅ AI intervenes when needed
- ✅ Adaptive difficulty
- ✅ Break reminders

**Tasks:**
1. Build `interventionEngine.ts`
2. Add intervention UI (modals)
3. Implement fatigue detection
4. Add mastery level-up prompts
5. Create break reminders

**Deliverables:**
- AI asks "Need help?" proactively
- Suggests difficulty changes
- Reminds to take breaks

---

### Phase 5: UI Redesign (3 weeks)

**Goals:**
- ✅ Task-specific interfaces
- ✅ Integrated AI sidebar
- ✅ Progress dashboard

**Tasks:**
1. Redesign RS interface
2. Redesign ASQ interface
3. Redesign WFD interface
4. Create AI sidebar component
5. Build progress dashboard
6. Add weak area visualizations

**Deliverables:**
- New task-specific UIs
- Always-visible AI tutor
- Comprehensive progress tracking

---

### Phase 6: Mock Exams & Analytics (2 weeks)

**Goals:**
- ✅ Full mock PTE exams
- ✅ Detailed analytics
- ✅ Performance predictions

**Tasks:**
1. Create mock exam mode
2. Implement timer & scoring
3. Build analytics dashboard
4. Add performance predictions
5. Export progress reports

**Deliverables:**
- Realistic mock exams
- Detailed performance analytics
- Score predictions

---

**Total Timeline: 14 weeks (3.5 months)**

---

## Cost & Performance Analysis

### Database Costs (Supabase)

#### Free Tier Limits
- Database size: 500 MB
- Bandwidth: 5 GB/month
- Storage: 1 GB
- API requests: Unlimited

#### Estimated Usage (1,000 users)

**Storage:**
```
- learner_profiles:     1 KB × 1000  = 1 MB
- practice_sessions:    2 KB × 50K   = 100 MB
- session_items:        1 KB × 500K  = 500 MB (exceeds free tier!)
- ai_conversations:     1 KB × 100K  = 100 MB
- weak_area_analysis:   1 KB × 10K   = 10 MB
- learning_goals:       500B × 5K    = 2.5 MB
- adaptive_recommendations: 1 KB × 20K = 20 MB
─────────────────────────────────────────────
TOTAL:                                 733.5 MB
```

**⚠️ Will exceed free tier at ~700 users**

**Solution: Data Retention Policy**
```sql
-- Delete session_items older than 90 days
DELETE FROM session_items
WHERE attempted_at < NOW() - INTERVAL '90 days';

-- Archive old conversations
DELETE FROM ai_conversations
WHERE created_at < NOW() - INTERVAL '180 days';
```

**With retention: ~200 MB for 1,000 users ✅**

---

#### Bandwidth (Estimated)

```
Average session:
- Start session: 1 KB
- Record 20 items: 20 KB
- AI chat (5 messages): 10 KB
- Complete session: 2 KB
─────────────────────────
Total: ~35 KB per session

1,000 users × 10 sessions/month × 35 KB = 350 MB/month ✅
(Well within 5 GB free tier)
```

---

#### API Requests

Supabase free tier: Unlimited ✅

---

### Performance Impact

#### Database Queries Per Session

```
1. Start session: 1 INSERT (practice_sessions)
2. Record items: 20 INSERTs (session_items)
3. AI chat context: 5 SELECTs (profile, sessions, items, conversations)
4. AI chat save: 1 INSERT (ai_conversations)
5. Weak area update: 1 UPSERT (weak_area_analysis)
6. Complete session: 1 UPDATE (practice_sessions)
─────────────────────────────────────────────
Total: 29 queries per session
```

**With caching:** 10-15 queries per session

**Response times:**
- Session start: 50-100ms
- Item recording: 30-50ms (background)
- AI chat: 300-500ms (Gemini API)
- Session complete: 50-100ms

---

### Comparison: JSON vs Database

| Metric | Current (JSON Only) | With Database |
|--------|---------------------|---------------|
| **Vocabulary load** | 10-20ms | 10-20ms (still JSON) |
| **Session tracking** | localStorage only | Supabase (synced) |
| **AI context** | None | Full history |
| **Progress tracking** | Limited | Comprehensive |
| **Cost** | $0 | $0 (with retention) |
| **Offline** | ✅ Works | ⚠️ Read-only |
| **Multi-device sync** | ❌ No | ✅ Yes |
| **Analytics** | Basic | Advanced |

**Result:** Database adds features without sacrificing performance ✅

---

## Migration Strategy

### Step 1: Parallel Implementation
- Keep current JSON system
- Add database tracking alongside
- No breaking changes

### Step 2: Gradual Rollout
1. Enable for opt-in beta users (10%)
2. Monitor performance & costs
3. Fix issues
4. Roll out to 50%
5. Full rollout

### Step 3: Feature Flags
```typescript
// Feature toggle
const FEATURES = {
  sessionTracking: process.env.VITE_ENABLE_SESSION_TRACKING === 'true',
  aiContext: process.env.VITE_ENABLE_AI_CONTEXT === 'true',
  weakAreaDetection: process.env.VITE_ENABLE_WEAK_AREA === 'true',
  proactiveAI: process.env.VITE_ENABLE_PROACTIVE_AI === 'true',
};

// Gradual enable
if (FEATURES.sessionTracking) {
  await sessionManager.start();
}
```

---

## Conclusion

### Summary

**What we're building:**
- 🎯 Intelligent AI tutor that understands context
- 📊 Comprehensive session & progress tracking
- 🔍 AI-powered weak area detection
- 💡 Proactive, adaptive learning recommendations
- 🎨 Task-specific practice interfaces
- 📈 Real-time progress dashboard

**Why it's worth it:**
- ✅ Transforms app from tool → intelligent tutor
- ✅ Personalized learning experience
- ✅ Better learning outcomes
- ✅ Competitive advantage
- ✅ Scalable architecture
- ✅ Cost-effective (mostly free tier)

**Risks mitigated:**
- ✅ Hybrid storage (JSON + DB)
- ✅ Data retention policies
- ✅ Feature flags for gradual rollout
- ✅ Offline-first still works
- ✅ Performance maintained

**Next steps:**
1. Review & approve architecture
2. Create Supabase migrations
3. Start Phase 1: Database setup
4. Iterate with user feedback

---

**Ready to build an AI-powered PTE learning system? 🚀**
