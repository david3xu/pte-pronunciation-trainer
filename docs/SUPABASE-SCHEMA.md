# Supabase Database Schema Design

## Overview

Database schema for PTE Pronunciation Trainer user accounts, progress tracking, and cloud sync.

**Database:** PostgreSQL (via Supabase)
**Features:** User authentication, progress tracking, settings sync, multi-device support

---

## Tables

### 1. `users` (Managed by Supabase Auth)

This table is automatically created by Supabase Auth. We'll extend it with a profile table.

**Note:** Supabase creates `auth.users` automatically. We create `public.profiles` for additional user data.

---

### 2. `profiles` - User Profile Information

Extends Supabase auth.users with application-specific data.

```sql
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

-- Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
```

---

### 3. `user_progress` - Learning Progress Tracking

Tracks user progress for each vocabulary book and practice mode.

```sql
create table public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Dataset identification
  dataset_type text not null, -- 'vocabulary' or 'practice'
  dataset_id text not null,   -- 'pte-beginner', 'rs', 'asq', etc.

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
  difficulty_filter text, -- 'all', 'easy', 'normal', 'hard'

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Constraints
  unique(user_id, dataset_id)
);

-- Enable Row Level Security
alter table public.user_progress enable row level security;

-- Policies
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
```

---

### 4. `user_settings` - User Settings & Preferences

Stores user-specific settings that sync across devices.

```sql
create table public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,

  -- Audio settings
  auto_play_next boolean default false,
  repeat_mode text default 'off', -- 'off', 'one', 'all'
  tts_rate real default 0.9,
  tts_volume real default 1.0,

  -- Display settings
  show_phonetic boolean default true,
  show_ipa boolean default true,
  theme text default 'auto', -- 'light', 'dark', 'auto'

  -- Practice settings
  current_practice_mode text, -- 'rs', 'asq', 'wfd'
  difficulty_filter text default 'all',

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.user_settings enable row level security;

-- Policies
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
```

---

### 5. `study_sessions` - Individual Study Session Records

Tracks each study session for analytics and spaced repetition.

```sql
create table public.study_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Session info
  dataset_id text not null,
  dataset_type text not null,

  -- Session metrics
  duration_seconds integer not null,
  items_studied integer not null,
  items_correct integer default 0,
  items_incorrect integer default 0,
  items_skipped integer default 0,

  -- Session date
  session_date date not null default current_date,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone not null,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.study_sessions enable row level security;

-- Policies
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
```

---

### 6. `word_mastery` - Individual Word Mastery Tracking

Tracks mastery level for individual vocabulary words (for spaced repetition).

```sql
create table public.word_mastery (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Word identification
  word text not null,
  dataset_id text not null,

  -- Mastery metrics
  mastery_level integer default 0, -- 0-5 scale
  times_studied integer default 0,
  times_correct integer default 0,
  times_incorrect integer default 0,

  -- Spaced repetition
  next_review_date date,
  interval_days integer default 1,
  ease_factor real default 2.5,

  -- Timestamps
  last_studied_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Constraints
  unique(user_id, word, dataset_id)
);

-- Enable Row Level Security
alter table public.word_mastery enable row level security;

-- Policies
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
```

---

## Database Functions

### Auto-update `updated_at` timestamp

```sql
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
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
```

### Auto-create profile on user signup

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## Indexes Summary

All tables have indexes on:
- Primary keys (automatic)
- Foreign keys (user_id)
- Commonly queried fields (dataset_id, dates)

---

## Row Level Security (RLS)

**All tables have RLS enabled** with policies ensuring:
- ✅ Users can only access their own data
- ✅ Users cannot access other users' data
- ✅ All CRUD operations are restricted to the authenticated user

---

## Data Flow

```
User Signs Up
    ↓
auth.users created (Supabase)
    ↓
Trigger creates profiles + user_settings
    ↓
User studies vocabulary
    ↓
user_progress + word_mastery updated
    ↓
study_sessions recorded
    ↓
Sync to all user devices via Supabase Realtime
```

---

## Storage Requirements Estimate

**Per User:**
- profiles: ~500 bytes
- user_settings: ~300 bytes
- user_progress: ~2KB (15 datasets × ~130 bytes)
- word_mastery: ~50KB (1,000 words × 50 bytes)
- study_sessions: ~10KB (100 sessions × 100 bytes)

**Total per user:** ~63KB

**For 1,000 users:** ~63MB
**For 10,000 users:** ~630MB

Supabase free tier: 500MB database - sufficient for 7,000+ users

---

## Next Steps

1. Create Supabase project
2. Run SQL migrations to create tables
3. Test RLS policies
4. Integrate with TypeScript client
5. Implement sync logic
