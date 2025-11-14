/**
 * Database Types for AI-Powered PTE Trainer
 *
 * Generated from Supabase schema:
 * - 20250108000000_initial_schema.sql
 * - 20250113000000_ai_powered_features.sql
 *
 * These types match the PostgreSQL schema exactly to ensure type safety
 * when interacting with the database via Supabase client.
 */

// ============================================================================
// Enums
// ============================================================================

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'mixed';

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

export type StrategyType = 'tips' | 'common_mistakes' | 'practice_drill' | 'exam_technique';

export type WeaknessType = 'pronunciation' | 'fluency' | 'vocabulary' | 'grammar' | 'content' | 'speed';

export type GoalType = 'daily' | 'weekly' | 'monthly' | 'exam_prep';

export type TargetMetric = 'accuracy' | 'fluency' | 'items_completed' | 'score' | 'time';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export type RecommendationType = 'next_practice' | 'difficulty_adjust' | 'focus_area' | 'break' | 'mock_exam';

export type RecommendationStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type RepeatMode = 'off' | 'one' | 'all';

export type Theme = 'light' | 'dark' | 'auto';

export type DatasetType = 'vocabulary' | 'practice';

// ============================================================================
// Table Types
// ============================================================================

// ----------------------------------------------------------------
// profiles (from initial schema)
// ----------------------------------------------------------------
export interface Profile {
  id: string; // UUID
  email: string;
  full_name?: string;
  avatar_url?: string;

  // Preferences
  preferred_voice?: string;
  preferred_language: string; // Default: 'en-US'

  // Statistics
  total_words_studied: number;
  total_practice_sessions: number;
  current_streak_days: number;
  longest_streak_days: number;

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface ProfileInsert extends Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'total_words_studied' | 'total_practice_sessions' | 'current_streak_days' | 'longest_streak_days'> {
  id: string; // Required for insert (matches auth.users.id)
}

export interface ProfileUpdate extends Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> {}

// ----------------------------------------------------------------
// learner_profiles (from AI features)
// ----------------------------------------------------------------
export interface LearnerProfile {
  user_id: string; // UUID
  pte_goal_score?: number; // 10-90
  target_date?: string; // ISO date
  weak_areas: Record<string, any>; // JSONB
  learning_style?: LearningStyle;
  study_hours_week?: number;
  onboarding_completed: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface LearnerProfileInsert extends Omit<LearnerProfile, 'created_at' | 'updated_at' | 'weak_areas' | 'onboarding_completed'> {
  weak_areas?: Record<string, any>;
  onboarding_completed?: boolean;
}

export interface LearnerProfileUpdate extends Partial<Omit<LearnerProfile, 'user_id' | 'created_at' | 'updated_at'>> {}

// ----------------------------------------------------------------
// practice_sessions
// ----------------------------------------------------------------
export interface PracticeSession {
  id: string; // UUID
  user_id: string; // UUID
  task_type: TaskType;
  dataset_id: string;
  started_at: string; // ISO timestamp
  completed_at?: string; // ISO timestamp
  duration_sec?: number;
  items_attempted: number;
  items_correct: number;
  accuracy?: number; // 0-100
  mode: PracticeMode;
  settings: Record<string, any>; // JSONB
}

export interface PracticeSessionInsert extends Omit<PracticeSession, 'id' | 'started_at' | 'items_attempted' | 'items_correct' | 'mode' | 'settings'> {
  id?: string;
  started_at?: string;
  items_attempted?: number;
  items_correct?: number;
  mode?: PracticeMode;
  settings?: Record<string, any>;
}

export interface PracticeSessionUpdate extends Partial<Omit<PracticeSession, 'id' | 'user_id' | 'started_at'>> {}

// ----------------------------------------------------------------
// session_items
// ----------------------------------------------------------------
export interface SessionItem {
  id: string; // UUID
  session_id: string; // UUID
  item_id: string;
  item_type: ItemType;
  item_text: string;
  user_response?: string;
  transcription?: string;
  is_correct?: boolean;
  score?: number; // 0-100
  time_spent_sec?: number;
  attempts: number;
  feedback?: string;
  pronunciation_errors: any[]; // JSONB array
  attempted_at: string; // ISO timestamp
}

export interface SessionItemInsert extends Omit<SessionItem, 'id' | 'attempts' | 'pronunciation_errors' | 'attempted_at'> {
  id?: string;
  attempts?: number;
  pronunciation_errors?: any[];
  attempted_at?: string;
}

export interface SessionItemUpdate extends Partial<Omit<SessionItem, 'id' | 'session_id' | 'attempted_at'>> {}

// ----------------------------------------------------------------
// ai_conversations
// ----------------------------------------------------------------
export interface AIConversation {
  id: string; // UUID
  user_id: string; // UUID
  session_id?: string; // UUID
  task_context?: string;
  user_message: string;
  ai_response: string;
  context_data: Record<string, any>; // JSONB
  sentiment?: Sentiment;
  helpful_rating?: number; // 1-5
  created_at: string; // ISO timestamp
}

export interface AIConversationInsert extends Omit<AIConversation, 'id' | 'context_data' | 'created_at'> {
  id?: string;
  context_data?: Record<string, any>;
  created_at?: string;
}

export interface AIConversationUpdate extends Partial<Omit<AIConversation, 'id' | 'user_id' | 'created_at'>> {}

// ----------------------------------------------------------------
// task_strategies
// ----------------------------------------------------------------
export interface TaskStrategy {
  id: string; // UUID
  task_type: string;
  difficulty?: Difficulty;
  strategy_type?: StrategyType;
  content: string;
  example?: string;
  success_rate: number;
  priority: number;
  created_at: string; // ISO timestamp
}

export interface TaskStrategyInsert extends Omit<TaskStrategy, 'id' | 'success_rate' | 'priority' | 'created_at'> {
  id?: string;
  success_rate?: number;
  priority?: number;
  created_at?: string;
}

export interface TaskStrategyUpdate extends Partial<Omit<TaskStrategy, 'id' | 'created_at'>> {}

// ----------------------------------------------------------------
// weak_area_analysis
// ----------------------------------------------------------------
export interface WeakAreaAnalysis {
  id: string; // UUID
  user_id: string; // UUID
  task_type: string;
  weakness_type?: WeaknessType;
  specific_issue: string;
  severity?: number; // 1-10
  evidence: any[]; // JSONB array of session_ids
  recommended_action: string;
  detected_at: string; // ISO timestamp
  resolved_at?: string; // ISO timestamp
}

export interface WeakAreaAnalysisInsert extends Omit<WeakAreaAnalysis, 'id' | 'evidence' | 'detected_at'> {
  id?: string;
  evidence?: any[];
  detected_at?: string;
}

export interface WeakAreaAnalysisUpdate extends Partial<Omit<WeakAreaAnalysis, 'id' | 'user_id' | 'detected_at'>> {}

// ----------------------------------------------------------------
// learning_goals
// ----------------------------------------------------------------
export interface LearningGoal {
  id: string; // UUID
  user_id: string; // UUID
  goal_type?: GoalType;
  task_type?: string;
  target_metric?: TargetMetric;
  target_value: number;
  current_value: number;
  deadline?: string; // ISO date
  status: GoalStatus;
  created_at: string; // ISO timestamp
  completed_at?: string; // ISO timestamp
}

export interface LearningGoalInsert extends Omit<LearningGoal, 'id' | 'current_value' | 'status' | 'created_at'> {
  id?: string;
  current_value?: number;
  status?: GoalStatus;
  created_at?: string;
}

export interface LearningGoalUpdate extends Partial<Omit<LearningGoal, 'id' | 'user_id' | 'created_at'>> {}

// ----------------------------------------------------------------
// adaptive_recommendations
// ----------------------------------------------------------------
export interface AdaptiveRecommendation {
  id: string; // UUID
  user_id: string; // UUID
  recommendation_type?: RecommendationType;
  task_type?: string;
  dataset_id?: string;
  difficulty?: string;
  reasoning: string;
  confidence?: number; // 0-100
  status: RecommendationStatus;
  created_at: string; // ISO timestamp
  acted_on_at?: string; // ISO timestamp
}

export interface AdaptiveRecommendationInsert extends Omit<AdaptiveRecommendation, 'id' | 'status' | 'created_at'> {
  id?: string;
  status?: RecommendationStatus;
  created_at?: string;
}

export interface AdaptiveRecommendationUpdate extends Partial<Omit<AdaptiveRecommendation, 'id' | 'user_id' | 'created_at'>> {}

// ----------------------------------------------------------------
// user_settings (from initial schema)
// ----------------------------------------------------------------
export interface UserSettings {
  id: string; // UUID
  user_id: string; // UUID

  // Audio settings
  auto_play_next: boolean;
  repeat_mode: RepeatMode;
  tts_rate: number; // 0.5 - 2.0
  tts_volume: number; // 0.0 - 1.0

  // Display settings
  show_phonetic: boolean;
  show_ipa: boolean;
  theme: Theme;

  // Practice settings
  current_practice_mode?: TaskType;
  difficulty_filter: Difficulty | 'all';

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface UserSettingsInsert extends Omit<UserSettings, 'id' | 'auto_play_next' | 'repeat_mode' | 'tts_rate' | 'tts_volume' | 'show_phonetic' | 'show_ipa' | 'theme' | 'difficulty_filter' | 'created_at' | 'updated_at'> {
  id?: string;
  auto_play_next?: boolean;
  repeat_mode?: RepeatMode;
  tts_rate?: number;
  tts_volume?: number;
  show_phonetic?: boolean;
  show_ipa?: boolean;
  theme?: Theme;
  difficulty_filter?: Difficulty | 'all';
}

export interface UserSettingsUpdate extends Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {}

// ----------------------------------------------------------------
// user_progress (from initial schema)
// ----------------------------------------------------------------
export interface UserProgress {
  id: string; // UUID
  user_id: string; // UUID

  // Dataset identification
  dataset_type: DatasetType;
  dataset_id: string;

  // Progress tracking
  current_index: number;
  total_items: number;
  completed_items: number;

  // Study session tracking
  last_studied_at?: string; // ISO timestamp
  total_study_time_seconds: number;

  // Performance metrics
  correct_count: number;
  incorrect_count: number;
  skipped_count: number;

  // Difficulty filter
  difficulty_filter?: Difficulty | 'all';

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface UserProgressInsert extends Omit<UserProgress, 'id' | 'current_index' | 'completed_items' | 'total_study_time_seconds' | 'correct_count' | 'incorrect_count' | 'skipped_count' | 'created_at' | 'updated_at'> {
  id?: string;
  current_index?: number;
  completed_items?: number;
  total_study_time_seconds?: number;
  correct_count?: number;
  incorrect_count?: number;
  skipped_count?: number;
}

export interface UserProgressUpdate extends Partial<Omit<UserProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {}

// ----------------------------------------------------------------
// study_sessions (active table in Supabase)
// ----------------------------------------------------------------
export interface StudySession {
  id: string; // UUID
  user_id: string; // UUID

  // Session info
  dataset_id: string;
  dataset_type: DatasetType;

  // Session metrics
  duration_seconds: number;
  items_studied: number;
  items_correct: number;
  items_incorrect: number;
  items_skipped: number;

  // Session date
  session_date: string; // ISO date
  started_at: string; // ISO timestamp
  ended_at: string; // ISO timestamp

  // Timestamps
  created_at: string; // ISO timestamp
}

export interface StudySessionInsert extends Omit<StudySession, 'id' | 'items_correct' | 'items_incorrect' | 'items_skipped' | 'session_date' | 'created_at'> {
  id?: string;
  items_correct?: number;
  items_incorrect?: number;
  items_skipped?: number;
  session_date?: string;
  created_at?: string;
}

// ----------------------------------------------------------------
// word_mastery (from initial schema)
// ----------------------------------------------------------------
export interface WordMastery {
  id: string; // UUID
  user_id: string; // UUID

  // Word identification
  word: string;
  dataset_id: string;

  // Mastery metrics
  mastery_level: number; // 0-5
  times_studied: number;
  times_correct: number;
  times_incorrect: number;

  // Spaced repetition (SM-2 algorithm)
  next_review_date?: string; // ISO date
  interval_days: number;
  ease_factor: number; // >= 1.3

  // Timestamps
  last_studied_at?: string; // ISO timestamp
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface WordMasteryInsert extends Omit<WordMastery, 'id' | 'mastery_level' | 'times_studied' | 'times_correct' | 'times_incorrect' | 'interval_days' | 'ease_factor' | 'created_at' | 'updated_at'> {
  id?: string;
  mastery_level?: number;
  times_studied?: number;
  times_correct?: number;
  times_incorrect?: number;
  interval_days?: number;
  ease_factor?: number;
}

export interface WordMasteryUpdate extends Partial<Omit<WordMastery, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {}

// ============================================================================
// Database Schema Type
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      learner_profiles: {
        Row: LearnerProfile;
        Insert: LearnerProfileInsert;
        Update: LearnerProfileUpdate;
      };
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
      ai_conversations: {
        Row: AIConversation;
        Insert: AIConversationInsert;
        Update: AIConversationUpdate;
      };
      task_strategies: {
        Row: TaskStrategy;
        Insert: TaskStrategyInsert;
        Update: TaskStrategyUpdate;
      };
      weak_area_analysis: {
        Row: WeakAreaAnalysis;
        Insert: WeakAreaAnalysisInsert;
        Update: WeakAreaAnalysisUpdate;
      };
      learning_goals: {
        Row: LearningGoal;
        Insert: LearningGoalInsert;
        Update: LearningGoalUpdate;
      };
      adaptive_recommendations: {
        Row: AdaptiveRecommendation;
        Insert: AdaptiveRecommendationInsert;
        Update: AdaptiveRecommendationUpdate;
      };
      user_settings: {
        Row: UserSettings;
        Insert: UserSettingsInsert;
        Update: UserSettingsUpdate;
      };
      user_progress: {
        Row: UserProgress;
        Insert: UserProgressInsert;
        Update: UserProgressUpdate;
      };
      study_sessions: {
        Row: StudySession;
        Insert: StudySessionInsert;
        Update: never; // Read-only after creation
      };
      word_mastery: {
        Row: WordMastery;
        Insert: WordMasteryInsert;
        Update: WordMasteryUpdate;
      };
    };
  };
}
