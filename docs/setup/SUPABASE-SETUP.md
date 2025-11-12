# Supabase Backend Setup Guide

**Version:** 1.0.0
**Last Updated:** January 2025

This guide explains how to set up and deploy the Supabase backend for the PTE Pronunciation Trainer.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Database Schema](#database-schema)
6. [Testing Authentication](#testing-authentication)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The PTE Pronunciation Trainer uses Supabase for:
- **User Authentication** - Email/password + OAuth (Google, GitHub, etc.)
- **Cloud Sync** - Progress synced across devices
- **Analytics** - Study sessions and performance tracking
- **Spaced Repetition** - Word mastery with SM-2 algorithm

### Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Vanilla JS + TypeScript)     │
│  ├── Zustand Auth Store                 │
│  ├── authService.ts                     │
│  ├── syncService.ts                     │
│  └── autoSyncManager.ts                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Supabase Backend                       │
│  ├── PostgreSQL Database                │
│  ├── Row Level Security (RLS)           │
│  ├── Auth (Email + OAuth)               │
│  └── Realtime (optional)                │
└─────────────────────────────────────────┘
```

---

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] A Supabase account (free tier works)
- [ ] Basic understanding of SQL and environment variables

---

## 🚀 Quick Start

### 1. Supabase Project Already Created!

**Your project is already set up:**
- **Project URL:** `https://kopzyjpniqqsxefteyfx.supabase.co`
- **Status:** ✅ Active
- **Region:** US East (recommended for North America)

### 2. Environment Variables

The `.env` file is already configured with your credentials:

```bash
# .env (already exists)
VITE_SUPABASE_URL=https://kopzyjpniqqsxefteyfx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Apply Database Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project: `kopzyjpniqqsxefteyfx`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/20250108000000_initial_schema.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl/Cmd + Enter)
8. Verify: You should see "Success. No rows returned" message

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref kopzyjpniqqsxefteyfx

# Apply migrations
supabase db push
```

### 4. Verify Setup

**Quick Verification (Local)**

Run the automated verification script:

```bash
npm run validate:supabase
```

This checks:
- Environment variables configured
- Migration file exists
- All Supabase services present
- Zustand auth store integrated
- App initialization configured
- Dependencies installed

**Database Verification (Supabase Dashboard)**

Check that tables were created:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `user_progress`
   - ✅ `user_settings`
   - ✅ `study_sessions`
   - ✅ `word_mastery`

### 5. Test Authentication

**Authentication is automatically initialized on app startup!**

The auth store checks for an existing Supabase session in localStorage when the app loads. If a user was previously logged in, they'll be automatically authenticated.

```bash
# Start dev server
npm run dev

# Open browser at http://localhost:3001
# Open browser console to see auth initialization:
#   ✅ PTEApp: User authenticated - user@example.com (if logged in)
#   ℹ️ PTEApp: No authenticated user (guest mode) (if not logged in)

# Click "Login" button (top right)
# Sign up with test account:
#   Email: test@example.com
#   Password: test123456
```

**Note:** Auth initialization is non-critical. If Supabase is unavailable or not configured, the app will continue in guest mode without authentication features.

---

## 📊 Database Schema

### Tables Overview

```sql
profiles           -- User info + stats
  ├── id (UUID)
  ├── email (TEXT)
  ├── full_name (TEXT)
  ├── total_words_studied (INT)
  ├── current_streak_days (INT)
  └── ... (9 columns total)

user_progress      -- Dataset progress
  ├── user_id (UUID) → profiles(id)
  ├── dataset_type ('vocabulary' | 'practice')
  ├── dataset_id (TEXT)
  ├── current_index (INT)
  ├── total_items (INT)
  └── ... (12 columns total)

user_settings      -- Synced preferences
  ├── user_id (UUID) → profiles(id)
  ├── auto_play_next (BOOLEAN)
  ├── tts_rate (REAL)
  ├── theme ('light' | 'dark' | 'auto')
  └── ... (11 columns total)

study_sessions     -- Analytics
  ├── user_id (UUID) → profiles(id)
  ├── dataset_id (TEXT)
  ├── duration_seconds (INT)
  ├── items_studied (INT)
  ├── items_correct (INT)
  └── ... (12 columns total)

word_mastery       -- Spaced repetition
  ├── user_id (UUID) → profiles(id)
  ├── word (TEXT)
  ├── mastery_level (INT 0-5)
  ├── next_review_date (DATE)
  ├── ease_factor (REAL)
  └── ... (13 columns total)
```

### Row Level Security (RLS)

All tables have RLS enabled. Users can only:
- ✅ View their own data
- ✅ Insert their own data
- ✅ Update their own data
- ❌ Access other users' data

Example policy:
```sql
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);
```

---

## 🔐 Authentication Flow

### 1. Sign Up

```typescript
import { authService } from './supabase/authService';

const result = await authService.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  fullName: 'John Doe',
});

if (result.success) {
  console.log('Account created!', result.user);
  // Profile and settings automatically created (via trigger)
} else {
  console.error('Error:', result.message);
}
```

### 2. Sign In

```typescript
const result = await authService.signIn({
  email: 'user@example.com',
  password: 'secure-password',
});

if (result.success) {
  console.log('Logged in!', result.session);
  // Zustand auth store automatically updated
  // Sync service initialized for cloud sync
} else {
  console.error('Error:', result.message);
}
```

### 3. Check Auth State (Zustand)

```typescript
import { useAppStore } from './stores';

// Get current auth state
const auth = useAppStore.getState().auth;

console.log('User:', auth.user);
console.log('Is authenticated:', auth.isAuthenticated);

// Subscribe to auth changes
useAppStore.subscribe(
  (state) => state.auth.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      console.log('User logged in');
    } else {
      console.log('User logged out');
    }
  }
);
```

### 4. Sign Out

```typescript
import { useAppStore } from './stores';

await useAppStore.getState().auth.signOut();
// User state cleared
// Sync service disconnected
```

---

## ☁️ Cloud Sync

### Progress Sync

Progress automatically syncs when:
- User completes a word/item
- User changes dataset
- User changes settings
- User closes the app (on beforeunload)

```typescript
import { syncService } from './supabase/syncService';

// Manual sync (usually automatic via autoSyncManager)
await syncService.syncProgress(
  'vocabulary',              // dataset type
  'pte-beginner',            // dataset ID
  42,                        // current index
  1000,                      // total items
  30                         // completed items
);
```

### Settings Sync

Settings sync across devices:

```typescript
// Update setting (syncs to cloud automatically)
useAppStore.getState().settings.updateSetting('ttsRate', 1.2);

// Load settings from cloud
const settings = await syncService.loadSettings();
console.log('Cloud settings:', settings);
```

### Study Sessions

Sessions are logged for analytics:

```typescript
await syncService.saveStudySession(
  'vocabulary',     // session type
  'pte-advanced',   // dataset ID
  50,               // words studied
  1800,             // duration (30 minutes)
  85                // accuracy (85%)
);
```

---

## 🚀 Deployment

### Vercel Deployment

1. **Add Environment Variables to Vercel:**

   ```bash
   # Via Vercel Dashboard:
   # 1. Go to https://vercel.com/your-project
   # 2. Settings → Environment Variables
   # 3. Add these variables:

   VITE_SUPABASE_URL=https://kopzyjpniqqsxefteyfx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Deploy:**

   ```bash
   git push origin main
   # Vercel automatically deploys
   ```

3. **Configure Auth Redirect URLs:**

   In Supabase Dashboard:
   1. Go to **Authentication** → **URL Configuration**
   2. Add your production URL to **Site URL**:
      ```
      https://your-app.vercel.app
      ```
   3. Add to **Redirect URLs**:
      ```
      https://your-app.vercel.app/auth/callback
      https://your-app.vercel.app
      ```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Sign up with new account
- [ ] Verify email confirmation (check spam folder)
- [ ] Sign in with credentials
- [ ] Check profile created in database
- [ ] Study some vocabulary words
- [ ] Verify progress synced to `user_progress` table
- [ ] Change a setting
- [ ] Verify setting synced to `user_settings` table
- [ ] Sign out
- [ ] Sign in from different device/browser
- [ ] Verify progress restored

### Automated Testing

```bash
# Run integration tests (future)
npm run test:integration
```

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase configuration"

**Solution:** Verify `.env` file exists and contains valid credentials:

```bash
cat .env
# Should show VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Issue: "Error 404: relation does not exist"

**Solution:** Database migration wasn't applied. Follow [Step 3](#3-apply-database-migration).

### Issue: "Row Level Security policy violation"

**Solution:** User isn't authenticated. Check auth state:

```typescript
const auth = useAppStore.getState().auth;
console.log('Authenticated:', auth.isAuthenticated);
```

### Issue: Settings not syncing

**Solution:** Initialize sync service after login:

```typescript
import { syncService } from './supabase/syncService';
await syncService.initialize();
```

### Issue: CORS errors in production

**Solution:** Add your domain to Supabase **API Settings**:
1. Go to **Settings** → **API**
2. Scroll to **CORS Allowed Origins**
3. Add: `https://your-app.vercel.app`

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)

---

## ✅ Next Steps

After Supabase is set up:

1. **Add OAuth Providers** (Google, GitHub, etc.)
   - Go to **Authentication** → **Providers**
   - Enable desired providers
   - Add credentials

2. **Enable Realtime** (optional)
   - For live leaderboards
   - For multiplayer practice rooms

3. **Set up Email Templates**
   - Customize confirmation emails
   - Password reset emails

4. **Monitor Usage**
   - Check **Database** → **Usage**
   - Free tier: 500MB DB, 1GB storage, 2GB bandwidth

5. **Backup Strategy**
   - Enable automatic backups (Pro plan)
   - Or manual exports via Dashboard

---

**Questions?** Open an issue on GitHub or check the [troubleshooting](#troubleshooting) section.

**Ready to code?** Start with the [Testing Authentication](#testing-authentication) section! 🚀
