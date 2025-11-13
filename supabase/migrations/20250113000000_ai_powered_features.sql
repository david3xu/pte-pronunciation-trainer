-- ============================================================================
-- PTE Pronunciation Trainer - AI-Powered Features
-- ============================================================================
-- Version: 2.0.0
-- Date: 2025-01-13
-- Description: Adds AI tutor features including context-aware chat, weak area
--              detection, adaptive recommendations, and advanced session tracking.
--              Extends existing schema from 20250108000000_initial_schema.sql
-- ============================================================================

-- Enable UUID extension (idempotent)
create extension if not exists "uuid-ossp";

-- ================================================================
-- LEARNER PROFILES (Enhanced)
-- Extends the basic profiles table with PTE-specific learning data
-- ================================================================
CREATE TABLE IF NOT EXISTS public.learner_profiles (
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

CREATE INDEX IF NOT EXISTS idx_learner_profiles_user_id ON learner_profiles(user_id);

COMMENT ON TABLE public.learner_profiles IS 'PTE-specific learner profiles with goals and preferences';

-- ================================================================
-- PRACTICE SESSIONS (Enhanced)
-- Replaces study_sessions with more detailed session tracking
-- ================================================================
CREATE TABLE IF NOT EXISTS public.practice_sessions (
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_task ON practice_sessions(user_id, task_type);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON practice_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON practice_sessions(mode);

COMMENT ON TABLE public.practice_sessions IS 'Detailed practice session tracking with task types and modes';

-- ================================================================
-- SESSION ITEMS (Individual performance tracking)
-- Tracks performance for each individual item in a session
-- ================================================================
CREATE TABLE IF NOT EXISTS public.session_items (
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

CREATE INDEX IF NOT EXISTS idx_session_items_session ON session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_session_items_item_id ON session_items(item_id);
CREATE INDEX IF NOT EXISTS idx_session_items_correct ON session_items(is_correct);

COMMENT ON TABLE public.session_items IS 'Individual item performance tracking within practice sessions';

-- ================================================================
-- AI CONVERSATIONS (Context-aware chat history)
-- Stores AI tutor conversations with context
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
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

CREATE INDEX IF NOT EXISTS idx_conversations_user ON ai_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_context ON ai_conversations(task_context);

COMMENT ON TABLE public.ai_conversations IS 'AI tutor conversation history with context and sentiment';

-- ================================================================
-- TASK STRATEGIES (AI knowledge base)
-- Stores proven strategies and tips for different tasks
-- ================================================================
CREATE TABLE IF NOT EXISTS public.task_strategies (
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

CREATE INDEX IF NOT EXISTS idx_strategies_task ON task_strategies(task_type, difficulty);

COMMENT ON TABLE public.task_strategies IS 'AI knowledge base of task-specific strategies and tips';

-- ================================================================
-- WEAK AREA ANALYSIS (AI-powered diagnostics)
-- AI-detected weak areas with evidence and recommendations
-- ================================================================
CREATE TABLE IF NOT EXISTS public.weak_area_analysis (
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

CREATE INDEX IF NOT EXISTS idx_weak_areas_user ON weak_area_analysis(user_id, severity DESC);
CREATE INDEX IF NOT EXISTS idx_weak_areas_task ON weak_area_analysis(task_type);
CREATE INDEX IF NOT EXISTS idx_weak_areas_active ON weak_area_analysis(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE public.weak_area_analysis IS 'AI-powered weak area detection and diagnostics';

-- ================================================================
-- LEARNING GOALS
-- User-set goals with progress tracking
-- ================================================================
CREATE TABLE IF NOT EXISTS public.learning_goals (
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

CREATE INDEX IF NOT EXISTS idx_goals_user_active ON learning_goals(user_id, status) WHERE status = 'active';

COMMENT ON TABLE public.learning_goals IS 'User learning goals with progress tracking';

-- ================================================================
-- ADAPTIVE RECOMMENDATIONS
-- AI-generated personalized recommendations
-- ================================================================
CREATE TABLE IF NOT EXISTS public.adaptive_recommendations (
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

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON adaptive_recommendations(user_id, status, created_at DESC);

COMMENT ON TABLE public.adaptive_recommendations IS 'AI-generated adaptive learning recommendations';

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS on all new tables
ALTER TABLE learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weak_area_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data

-- learner_profiles policies
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON learner_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON learner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile"
  ON learner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- practice_sessions policies
CREATE POLICY IF NOT EXISTS "Users can view own sessions"
  ON practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own sessions"
  ON practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own sessions"
  ON practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- session_items policies
CREATE POLICY IF NOT EXISTS "Users can view own session items"
  ON session_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM practice_sessions WHERE id = session_id AND user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Users can insert own session items"
  ON session_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM practice_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- ai_conversations policies
CREATE POLICY IF NOT EXISTS "Users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- weak_area_analysis policies
CREATE POLICY IF NOT EXISTS "Users can view own weak areas"
  ON weak_area_analysis FOR SELECT
  USING (auth.uid() = user_id);

-- learning_goals policies
CREATE POLICY IF NOT EXISTS "Users can view own goals"
  ON learning_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own goals"
  ON learning_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own goals"
  ON learning_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- adaptive_recommendations policies
CREATE POLICY IF NOT EXISTS "Users can view own recommendations"
  ON adaptive_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own recommendations"
  ON adaptive_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- task_strategies is public (read-only for all authenticated users)
ALTER TABLE task_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users can view strategies"
  ON task_strategies FOR SELECT
  TO authenticated
  USING (true);

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Auto-update updated_at timestamp for learner_profiles
CREATE TRIGGER IF NOT EXISTS handle_learner_profiles_updated_at
  BEFORE UPDATE ON public.learner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================================
-- GRANTS
-- ================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ================================================================
-- COMPLETED
-- ================================================================

COMMENT ON SCHEMA public IS 'PTE Pronunciation Trainer - AI-Powered Features v2.0.0';
