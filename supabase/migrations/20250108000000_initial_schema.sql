-- ============================================================================
-- PTE Pronunciation Trainer - Initial Database Schema
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-01-08
-- Description: Creates all tables, RLS policies, and functions for user
--              accounts, progress tracking, and cloud sync.
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLE: profiles
-- Extends auth.users with application-specific data
-- ============================================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,

  -- Preferences
  preferred_voice text,
  preferred_language text default 'en-US',

  -- Statistics
  total_words_studied integer default 0,
  total_practice_sessions integer default 0,
  current_streak_days integer default 0,
  longest_streak_days integer default 0,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

comment on table public.profiles is 'User profile information extending auth.users';

-- ============================================================================
-- TABLE: user_progress
-- Tracks learning progress for each dataset
-- ============================================================================

create table public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Dataset identification
  dataset_type text not null check (dataset_type in ('vocabulary', 'practice')),
  dataset_id text not null,

  -- Progress tracking
  current_index integer default 0,
  total_items integer not null,
  completed_items integer default 0,

  -- Study session tracking
  last_studied_at timestamp with time zone,
  total_study_time_seconds integer default 0,

  -- Performance metrics
  correct_count integer default 0,
  incorrect_count integer default 0,
  skipped_count integer default 0,

  -- Difficulty filter
  difficulty_filter text check (difficulty_filter in ('all', 'easy', 'normal', 'hard')),

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Constraints
  constraint unique_user_dataset unique(user_id, dataset_id)
);

-- Enable Row Level Security
alter table public.user_progress enable row level security;

-- RLS Policies
create policy "Users can view their own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

create policy "Users can delete their own progress"
  on public.user_progress for delete
  using (auth.uid() = user_id);

-- Indexes
create index user_progress_user_id_idx on public.user_progress(user_id);
create index user_progress_dataset_id_idx on public.user_progress(dataset_id);
create index user_progress_last_studied_idx on public.user_progress(last_studied_at desc);

comment on table public.user_progress is 'User progress tracking for vocabulary books and practice modes';

-- ============================================================================
-- TABLE: user_settings
-- User-specific settings that sync across devices
-- ============================================================================

create table public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,

  -- Audio settings
  auto_play_next boolean default false,
  repeat_mode text default 'off' check (repeat_mode in ('off', 'one', 'all')),
  tts_rate real default 0.9 check (tts_rate >= 0.5 and tts_rate <= 2.0),
  tts_volume real default 1.0 check (tts_volume >= 0.0 and tts_volume <= 1.0),

  -- Display settings
  show_phonetic boolean default true,
  show_ipa boolean default true,
  theme text default 'auto' check (theme in ('light', 'dark', 'auto')),

  -- Practice settings
  current_practice_mode text check (current_practice_mode in ('rs', 'asq', 'wfd')),
  difficulty_filter text default 'all' check (difficulty_filter in ('all', 'easy', 'normal', 'hard')),

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.user_settings enable row level security;

-- RLS Policies
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Index
create index user_settings_user_id_idx on public.user_settings(user_id);

comment on table public.user_settings is 'User settings and preferences synced across devices';

-- ============================================================================
-- TABLE: study_sessions
-- Individual study session records for analytics
-- ============================================================================

create table public.study_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Session info
  dataset_id text not null,
  dataset_type text not null check (dataset_type in ('vocabulary', 'practice')),

  -- Session metrics
  duration_seconds integer not null check (duration_seconds >= 0),
  items_studied integer not null check (items_studied >= 0),
  items_correct integer default 0 check (items_correct >= 0),
  items_incorrect integer default 0 check (items_incorrect >= 0),
  items_skipped integer default 0 check (items_skipped >= 0),

  -- Session date
  session_date date not null default current_date,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Constraints
  constraint valid_session_time check (ended_at > started_at)
);

-- Enable Row Level Security
alter table public.study_sessions enable row level security;

-- RLS Policies
create policy "Users can view their own study sessions"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own study sessions"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

-- Indexes
create index study_sessions_user_id_idx on public.study_sessions(user_id);
create index study_sessions_session_date_idx on public.study_sessions(session_date desc);
create index study_sessions_dataset_id_idx on public.study_sessions(dataset_id);

comment on table public.study_sessions is 'Study session records for analytics and progress tracking';

-- ============================================================================
-- TABLE: word_mastery
-- Individual word mastery tracking for spaced repetition
-- ============================================================================

create table public.word_mastery (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Word identification
  word text not null,
  dataset_id text not null,

  -- Mastery metrics
  mastery_level integer default 0 check (mastery_level >= 0 and mastery_level <= 5),
  times_studied integer default 0 check (times_studied >= 0),
  times_correct integer default 0 check (times_correct >= 0),
  times_incorrect integer default 0 check (times_incorrect >= 0),

  -- Spaced repetition (SM-2 algorithm)
  next_review_date date,
  interval_days integer default 1 check (interval_days >= 1),
  ease_factor real default 2.5 check (ease_factor >= 1.3),

  -- Timestamps
  last_studied_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Constraints
  constraint unique_user_word unique(user_id, word, dataset_id)
);

-- Enable Row Level Security
alter table public.word_mastery enable row level security;

-- RLS Policies
create policy "Users can view their own word mastery"
  on public.word_mastery for select
  using (auth.uid() = user_id);

create policy "Users can insert their own word mastery"
  on public.word_mastery for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own word mastery"
  on public.word_mastery for update
  using (auth.uid() = user_id);

-- Indexes
create index word_mastery_user_id_idx on public.word_mastery(user_id);
create index word_mastery_next_review_idx on public.word_mastery(next_review_date);
create index word_mastery_word_idx on public.word_mastery(word);
create index word_mastery_dataset_idx on public.word_mastery(dataset_id);

comment on table public.word_mastery is 'Individual word mastery tracking for spaced repetition';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

comment on function public.handle_updated_at is 'Automatically updates the updated_at timestamp';

-- Apply triggers to all tables with updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger handle_user_progress_updated_at
  before update on public.user_progress
  for each row execute function public.handle_updated_at();

create trigger handle_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

create trigger handle_word_mastery_updated_at
  before update on public.word_mastery
  for each row execute function public.handle_updated_at();

-- Auto-create profile and settings on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

comment on function public.handle_new_user is 'Automatically creates profile and settings for new users';

-- Trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all functions in schema public to authenticated;

-- ============================================================================
-- COMPLETED
-- ============================================================================

-- Migration completed successfully
comment on schema public is 'PTE Pronunciation Trainer - Database Schema v1.0.0';
