# Supabase Setup Guide - Week 3-4

## 📋 Overview

This guide will walk you through setting up Supabase for PTE Pronunciation Trainer, including:
- ✅ Creating a Supabase project
- ✅ Running database migrations
- ✅ Configuring authentication
- ✅ Setting up the Supabase client
- ✅ Testing the integration

**Estimated Time:** 30-45 minutes

---

## Step 1: Create Supabase Project

### 1.1 Sign Up for Supabase

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email

### 1.2 Create New Project

1. Click "New Project"
2. Fill in project details:
   ```
   Name: pte-pronunciation-trainer
   Database Password: [Generate a strong password - SAVE THIS!]
   Region: Choose closest to your users (e.g., US West, Europe, Asia)
   Pricing Plan: Free (500MB database, 2GB bandwidth/month)
   ```
3. Click "Create new project"
4. Wait 2-3 minutes for project provisioning

### 1.3 Get Project Credentials

Once the project is ready, go to **Settings → API**:

```bash
# Save these values - you'll need them!
Project URL: https://your-project-id.supabase.co
anon (public) key: eyJhbG... (long string)
service_role key: eyJhbG... (long string - keep secret!)
```

**⚠️ Important:**
- Keep `service_role` key secret - NEVER commit to git
- The `anon` key is safe for client-side use

---

## Step 2: Run Database Migration

### 2.1 Access SQL Editor

1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"

### 2.2 Run the Migration

1. Open the migration file: `supabase/migrations/20250108000000_initial_schema.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)

**Expected Output:**
```
Success. No rows returned
```

### 2.3 Verify Tables Created

1. Click "Table Editor" in the left sidebar
2. You should see these tables:
   - ✅ profiles
   - ✅ user_progress
   - ✅ user_settings
   - ✅ study_sessions
   - ✅ word_mastery

---

## Step 3: Configure Authentication

### 3.1 Enable Email Authentication

1. Go to **Authentication → Providers**
2. Email provider should be **enabled** by default
3. Configure email settings:
   ```
   ✅ Enable email confirmations (recommended)
   ✅ Enable secure password hashing
   Minimum password length: 8
   ```

### 3.2 (Optional) Configure OAuth Providers

**Google OAuth:**
1. Go to **Authentication → Providers → Google**
2. Toggle "Enable Google provider"
3. Follow instructions to get Google OAuth credentials
4. Enter Client ID and Client Secret

**GitHub OAuth:**
1. Go to **Authentication → Providers → GitHub**
2. Toggle "Enable GitHub provider"
3. Follow instructions to get GitHub OAuth credentials
4. Enter Client ID and Client Secret

### 3.3 Configure Redirect URLs

Go to **Authentication → URL Configuration**:

```
Site URL: http://localhost:3001 (development)
Redirect URLs:
  - http://localhost:3001
  - http://localhost:3001/auth/callback
  - https://your-production-domain.com
  - https://your-production-domain.com/auth/callback
```

---

## Step 4: Test Row Level Security (RLS)

### 4.1 Verify RLS is Enabled

In SQL Editor, run:

```sql
-- Check RLS is enabled on all tables
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public';
```

**Expected:** All tables should show `rowsecurity = true`

### 4.2 Test Policies

Create a test user via **Authentication → Users → Add user**:
```
Email: test@example.com
Password: TestPassword123!
```

Then test access in SQL Editor:

```sql
-- This should return only the test user's data
set request.jwt.claim.sub = 'test-user-id';
select * from profiles;

-- This should work (users can view their own profile)
select * from profiles where id = auth.uid();

-- This should return empty (users can't see others' profiles)
select * from profiles where id != auth.uid();
```

---

## Step 5: Install Supabase Client

### 5.1 Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 5.2 Create Environment Variables

Create `.env.local` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# DO NOT COMMIT .env.local TO GIT!
```

Add to `.gitignore`:

```bash
# Environment variables
.env
.env.local
.env.production
```

### 5.3 Create Supabase Client (TypeScript)

Create `src/ts/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper functions
export const auth = supabase.auth;

// Get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Sign up
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign in
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get user profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## Step 6: Generate TypeScript Types

### 6.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 6.2 Login to Supabase

```bash
supabase login
```

### 6.3 Generate Types

```bash
# Generate TypeScript types from your database schema
supabase gen types typescript --project-id your-project-id > src/types/supabase.types.ts
```

This creates a `Database` type with full type safety for your tables!

---

## Step 7: Test the Integration

### 7.1 Test Authentication

Create a test file `tests/supabase-auth.test.ts`:

```typescript
import { signUp, signIn, signOut, getCurrentUser } from '../src/ts/lib/supabase';

async function testAuth() {
  try {
    // Test sign up
    console.log('Testing sign up...');
    const { user } = await signUp('test@example.com', 'TestPassword123!');
    console.log('✅ Sign up successful:', user?.email);

    // Test sign in
    console.log('Testing sign in...');
    const { user: signedInUser } = await signIn('test@example.com', 'TestPassword123!');
    console.log('✅ Sign in successful:', signedInUser?.email);

    // Test get current user
    console.log('Testing get current user...');
    const currentUser = await getCurrentUser();
    console.log('✅ Current user:', currentUser?.email);

    // Test sign out
    console.log('Testing sign out...');
    await signOut();
    console.log('✅ Sign out successful');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuth();
```

Run the test:

```bash
ts-node tests/supabase-auth.test.ts
```

### 7.2 Test Database Operations

```typescript
import { supabase } from '../src/ts/lib/supabase';

async function testDatabase() {
  try {
    // Sign in first
    await signIn('test@example.com', 'TestPassword123!');

    // Test create progress
    const { data: progress, error } = await supabase
      .from('user_progress')
      .insert({
        dataset_type: 'vocabulary',
        dataset_id: 'pte-beginner',
        total_items: 1234,
        current_index: 0
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Created progress:', progress);

    // Test read progress
    const { data: allProgress } = await supabase
      .from('user_progress')
      .select('*');

    console.log('✅ All progress:', allProgress);

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();
```

---

## Step 8: Set Up Realtime (Optional)

Enable realtime for progress sync across devices:

```typescript
import { supabase } from '../src/ts/lib/supabase';

// Subscribe to user_progress changes
const channel = supabase
  .channel('user-progress-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_progress'
    },
    (payload) => {
      console.log('Progress updated:', payload);
      // Update UI with new progress
    }
  )
  .subscribe();

// Unsubscribe when done
// channel.unsubscribe();
```

---

## Verification Checklist

Before proceeding, verify:

- ✅ Supabase project created
- ✅ Database migration run successfully
- ✅ All 5 tables created
- ✅ RLS policies enabled and tested
- ✅ Authentication configured (email + OAuth)
- ✅ Supabase client installed
- ✅ Environment variables set
- ✅ TypeScript types generated
- ✅ Test authentication works
- ✅ Test database operations work

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution:** Re-run the migration SQL in SQL Editor

### Issue: "JWT expired" or "Invalid JWT"
**Solution:** Call `supabase.auth.refreshSession()` or sign in again

### Issue: "new row violates row-level security policy"
**Solution:** Verify user is authenticated and RLS policies are correct

### Issue: "permission denied for table"
**Solution:** Check RLS policies with `select * from pg_policies;`

---

## Next Steps

After setup is complete:

1. ✅ Implement auth UI components
2. ✅ Sync localStorage progress to Supabase
3. ✅ Add cloud sync logic
4. ✅ Test multi-device sync
5. ✅ Deploy to production

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/typescript-support)

---

**Status:** Ready to implement! 🚀
