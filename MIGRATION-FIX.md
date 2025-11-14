# 🔧 Fix: Missing `session_items` Table

## Error
```
Could not find the table 'public.session_items' in the schema cache
```

## Root Cause
The AI-powered features migration (`20250113000000_ai_powered_features.sql`) hasn't been applied to your Supabase database yet.

## Solution: Apply Missing Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your PTE Trainer project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run Migration**
   - Open file: `supabase/migrations/20250113000000_ai_powered_features.sql`
   - Copy entire contents (470 lines)
   - Paste into SQL Editor
   - Click "Run" (or Cmd/Ctrl + Enter)

4. **Verify Success**
   - Expected output: `Success. No rows returned`
   - Go to "Table Editor"
   - Verify these new tables exist:
     - ✅ `learner_profiles`
     - ✅ `practice_sessions`
     - ✅ `session_items` ← **This fixes the error!**
     - ✅ `ai_conversations`
     - ✅ `weak_areas`
     - ✅ `ai_interventions`

### Option 2: Via Supabase CLI (Alternative)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Apply pending migrations
supabase db push
```

## Tables Created by This Migration

| Table | Purpose |
|-------|---------|
| `learner_profiles` | PTE goals, learning style, onboarding status |
| `practice_sessions` | Session tracking (RS/ASQ/WFD/vocabulary) |
| `session_items` | Individual item attempts within sessions |
| `ai_conversations` | AI tutor chat history |
| `weak_areas` | Detected weak areas for personalized recommendations |
| `ai_interventions` | Proactive AI suggestions (difficulty, breaks, etc.) |

## After Migration

The error will disappear and you'll have:
- ✅ Session tracking working
- ✅ AI tutor context-aware chat
- ✅ Weak area detection
- ✅ Adaptive recommendations
- ✅ Intervention system

## Temporary Workaround (If Can't Apply Migration)

If you need the app to work immediately without the AI features, you can disable session tracking in `.env`:

```bash
# Add this to .env
VITE_ENABLE_SESSION_TRACKING=false
```

This will make the app work but disable:
- ❌ Session analytics
- ❌ Progress tracking in database
- ❌ AI-powered recommendations

---

**Created:** 2025-11-14  
**Status:** Migration required for full AI features
