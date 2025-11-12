# Supabase Integration Testing Guide

**Date**: 2025-11-08
**Status**: P2 Tasks - Ready for Testing

---

## Overview

This guide covers testing the Supabase integration for the PTE Pronunciation Trainer application. Supabase handles user authentication, progress tracking, settings sync, and study analytics.

---

## Quick Start - Test Page

### 🧪 Testing Supabase Integration

**Local Development:**
```bash
# Start development server
npm run dev

# Access main app
http://localhost:3001
```

**Features to Test:**
- ✅ Authentication (Sign Up, Sign In, Sign Out) - Use main app auth UI
- ✅ Progress Sync (Save/Load user progress) - Practice mode progress
- ✅ Settings Sync (Save/Load user preferences) - Settings panel
- ✅ Real-time activity logging - Check browser console
- ✅ Configuration validation - Verify .env variables loaded

**Note:** Supabase integration is built into the main React application. Test all features through the production UI rather than standalone test pages.

---

## Configuration Status

### Environment Variables

**Location**: `.env` (root directory)

```bash
VITE_SUPABASE_URL=https://kopzyjpniqqsxefteyfx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...  # Public anon key
```

**Status**: ✅ Configured and valid

### Database Schema

**Location**: `supabase/migrations/20250108000000_initial_schema.sql`

**Tables Created**:
1. ✅ `profiles` - User account info
2. ✅ `user_progress` - Learning progress tracking
3. ✅ `user_settings` - User preferences
4. ✅ `study_sessions` - Study analytics
5. ✅ `word_mastery` - Spaced repetition data

**Status**: ✅ Migrated to Supabase

---

## Testing Instructions

### Step 1: Validate Configuration

**Expected**: Green "✅ Configuration OK" message

**What it checks**:
- Supabase URL is set
- Anonymous key is valid
- Client initialized successfully

**Troubleshooting**:
```bash
# If configuration fails:
1. Check .env file exists
2. Verify VITE_SUPABASE_URL is correct
3. Verify VITE_SUPABASE_ANON_KEY is correct
4. Restart dev server: npm run dev
```

---

### Step 2: Test Authentication

#### A. Sign Up New User

**Test Data**:
```
Email: test@example.com
Password: testpassword123
```

**Expected Behavior**:
1. Click "Sign Up" button
2. See success message: "✅ Sign up successful! Check your email to confirm."
3. Check email inbox for confirmation link
4. Click confirmation link
5. User account activated

**Common Issues**:
- ❌ "User already registered" → Use different email or sign in instead
- ❌ "Invalid email" → Check email format
- ❌ "Password too short" → Use minimum 6 characters

#### B. Sign In Existing User

**Test Data**:
```
Email: test@example.com
Password: testpassword123
```

**Expected Behavior**:
1. Click "Sign In" button
2. See success message: "✅ Authenticated as test@example.com"
3. User Info section appears with:
   - Email address
   - User ID (UUID)
4. Progress and Settings sections become active

**Common Issues**:
- ❌ "Invalid login credentials" → Check email/password
- ❌ "Email not confirmed" → Check email for confirmation link

#### C. Sign Out

**Expected Behavior**:
1. Click "Sign Out" button
2. See message: "Not authenticated"
3. User Info section hidden
4. Progress and Settings sections disabled

---

### Step 3: Test Progress Sync

**Prerequisites**: Must be signed in

#### A. Save Progress

**Test Data**:
```
Dataset ID: pte-beginner
Current Index: 42
Completed Items: 35
```

**Steps**:
1. Fill in test data
2. Click "Save Progress"
3. Expected: "✅ Progress saved successfully"

**Verification**:
```sql
-- Check in Supabase dashboard
SELECT * FROM user_progress
WHERE dataset_id = 'pte-beginner';

-- Should see:
-- current_index: 42
-- completed_items: 35
-- total_items: 100
-- last_studied_at: [current timestamp]
```

#### B. Load Progress

**Steps**:
1. Keep same Dataset ID
2. Click "Load Progress"
3. Expected: "Loaded Progress" section appears with:
   - Dataset: pte-beginner
   - Current Index: 42
   - Completed: 35
   - Total: 100

**Test Cross-Device Sync**:
1. Save progress in one browser
2. Sign in with same account in different browser/device
3. Load progress
4. Expected: Same progress values

---

### Step 4: Test Settings Sync

**Prerequisites**: Must be signed in

#### A. Save Settings

**Test Data**:
```
☑ Auto-play next: Checked
☑ Show phonetic: Checked
TTS Rate: 0.9
```

**Steps**:
1. Toggle checkboxes
2. Adjust TTS rate slider
3. Click "Save Settings"
4. Expected: "✅ Settings saved successfully"

**Verification**:
```sql
-- Check in Supabase dashboard
SELECT * FROM user_settings
WHERE user_id = '[your-user-id]';

-- Should see:
-- auto_play_next: true
-- show_phonetic: true
-- tts_rate: 0.9
```

#### B. Load Settings

**Steps**:
1. Change settings locally (uncheck boxes, change rate)
2. Click "Load Settings"
3. Expected: "Loaded Settings" section appears
4. Form inputs updated to saved values

**Test Cross-Device Sync**:
1. Save settings in one browser
2. Sign in with same account in different browser/device
3. Load settings
4. Expected: Same settings values

---

## Integration Code Examples

### TypeScript Services (Already Created)

#### 1. Authentication Service

**File**: `src/ts/supabase/authService.ts`

```typescript
import { authService } from './src/ts/supabase/index.ts';

// Sign up
const result = await authService.signUp(email, password);

// Sign in
const result = await authService.signIn(email, password);

// Sign out
await authService.signOut();

// Check auth status
const isAuth = await authService.isAuthenticated();
```

#### 2. Sync Service

**File**: `src/ts/supabase/syncService.ts`

```typescript
import { syncService } from './src/ts/supabase/index.ts';

// Initialize
await syncService.initialize();

// Sync progress
const result = await syncService.syncProgress(
  'vocabulary',
  'pte-beginner',
  42,  // currentIndex
  100, // totalItems
  35   // completedItems
);

// Load progress
const progress = await syncService.loadProgress('pte-beginner');

// Sync settings
const result = await syncService.syncSettings({
  auto_play_next: true,
  show_phonetic: true,
  tts_rate: 0.9
});

// Load settings
const settings = await syncService.loadSettings();
```

#### 3. Auto-Sync Manager

**File**: `src/ts/supabase/autoSyncManager.ts`

```typescript
import { autoSyncManager } from './src/ts/supabase/index.ts';

// Start auto-sync (every 30 seconds)
autoSyncManager.start();

// Stop auto-sync
autoSyncManager.stop();

// Force immediate sync
await autoSyncManager.syncNow();
```

---

## Integration with Main App

### Current Status

**Compiled**: ✅ TypeScript services compiled to JavaScript
**Available**: ✅ Services ready in `src/js/supabase/`
**Integrated**: ⏳ Not yet integrated into main app

### Integration Steps (TODO)

#### 1. Add Supabase to index.html

```html
<!-- Before closing </body> -->
<!-- Supabase SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Supabase Services (after SDK) -->
<script type="module">
  import { supabase, authService, syncService, autoSyncManager }
    from './src/js/supabase/index.js';

  // Expose to window for other scripts
  window.supabase = supabase;
  window.authService = authService;
  window.syncService = syncService;
  window.autoSyncManager = autoSyncManager;
</script>
```

#### 2. Initialize in PTEApp

**File**: `src/ts/core/PTEApp.ts`

```typescript
async initializeModules(): Promise<void> {
  // ... existing initialization ...

  // NEW: Initialize Supabase services
  await this.initializeSupabase();

  // ... rest of initialization ...
}

async initializeSupabase(): Promise<void> {
  console.log('Initializing Supabase...');

  // Initialize sync service
  if (window.syncService) {
    await window.syncService.initialize();
    console.log('✅ Sync service initialized');
  }

  // Check auth status
  if (window.authService) {
    const isAuth = await window.authService.isAuthenticated();
    console.log(`Auth status: ${isAuth ? 'Authenticated' : 'Not authenticated'}`);

    // If authenticated, load user data
    if (isAuth) {
      await this.loadUserData();
    }
  }

  // Start auto-sync if authenticated
  if (window.autoSyncManager && await window.authService.isAuthenticated()) {
    window.autoSyncManager.start();
    console.log('✅ Auto-sync started');
  }
}

async loadUserData(): Promise<void> {
  // Load user progress
  const progress = await window.syncService.loadProgress(currentDatasetId);
  if (progress) {
    // Restore progress in app
    window.pteVocabularyManager.setCurrentIndex(progress.current_index);
  }

  // Load user settings
  const settings = await window.syncService.loadSettings();
  if (settings) {
    // Apply settings to app
    window.settingsModule.applySettings(settings);
  }
}
```

#### 3. Add Sync on Progress Change

**File**: `src/ts/core/PTEVocabularyManager.ts`

```typescript
async setCurrentIndex(index: number): Promise<void> {
  this.currentIndex = index;

  // Sync to Supabase if authenticated
  if (window.syncService && await window.authService.isAuthenticated()) {
    await window.syncService.syncProgress(
      'vocabulary',
      this.currentDatasetId,
      index,
      this.vocabulary.length,
      this.completedCount
    );
  }
}
```

#### 4. Add Sync on Settings Change

**File**: `src/ts/core/SettingsModule.ts`

```typescript
async saveSetting(key: string, value: any): Promise<void> {
  // Save locally
  this.settings[key] = value;
  localStorage.setItem(`setting_${key}`, JSON.stringify(value));

  // Sync to Supabase if authenticated
  if (window.syncService && await window.authService.isAuthenticated()) {
    await window.syncService.syncSettings(this.settings);
  }
}
```

---

## Testing Checklist

### ✅ Configuration Tests
- [x] Environment variables set
- [x] Supabase client initializes
- [x] Database schema migrated

### ⏳ Authentication Tests
- [ ] Sign up new user
- [ ] Email confirmation
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Session persistence (refresh page)
- [ ] Password reset (if needed)

### ⏳ Progress Sync Tests
- [ ] Save progress to database
- [ ] Load progress from database
- [ ] Update existing progress
- [ ] Cross-device sync
- [ ] Offline → Online sync

### ⏳ Settings Sync Tests
- [ ] Save settings to database
- [ ] Load settings from database
- [ ] Update existing settings
- [ ] Cross-device sync
- [ ] Default settings for new users

### ⏳ Integration Tests
- [ ] Auto-sync on progress change
- [ ] Auto-sync on settings change
- [ ] Graceful degradation (offline mode)
- [ ] Error handling
- [ ] Performance (sync speed)

---

## Common Issues & Solutions

### Issue 1: "Configuration missing"

**Cause**: Missing .env file or environment variables

**Solution**:
```bash
1. Check .env file exists in root directory
2. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
3. Restart dev server: npm run dev
```

### Issue 2: "User already registered"

**Cause**: Email already used for sign up

**Solution**:
```bash
1. Use different email address
2. OR sign in with existing credentials
3. OR delete user from Supabase dashboard
```

### Issue 3: "Email not confirmed"

**Cause**: User didn't click confirmation link

**Solution**:
```bash
1. Check email inbox (and spam folder)
2. Click confirmation link
3. OR disable email confirmation in Supabase dashboard:
   Authentication → Settings → Disable Email Confirmations
```

### Issue 4: "Failed to fetch"

**Cause**: Network error or invalid Supabase URL

**Solution**:
```bash
1. Check internet connection
2. Verify VITE_SUPABASE_URL is correct
3. Check Supabase project status
```

### Issue 5: "RLS policy violation"

**Cause**: Row Level Security blocking access

**Solution**:
```bash
1. Check RLS policies in Supabase dashboard
2. Verify user is authenticated
3. Check user_id matches in database
```

---

## Next Steps

1. **Test Authentication** (15 min)
   - Open test page
   - Sign up new user
   - Verify email
   - Sign in/out

2. **Test Progress Sync** (15 min)
   - Save progress
   - Load progress
   - Test cross-device

3. **Test Settings Sync** (15 min)
   - Save settings
   - Load settings
   - Test cross-device

4. **Integrate into Main App** (2-3 hours)
   - Add Supabase to index.html
   - Initialize in PTEApp
   - Add sync on changes
   - Test full integration

5. **Add UI Indicators** (1-2 hours)
   - Sync status indicator
   - Loading states
   - Error messages
   - Success notifications

---

## Documentation Links

- **Setup Guide**: `docs/SUPABASE-SETUP-GUIDE.md`
- **Database Schema**: `docs/SUPABASE-SCHEMA.md`
- **API Reference**: `docs/API-REFERENCE.md`
- **Architecture**: `docs/ARCHITECTURE-ANALYSIS.md`

---

## Support

**Issues?** Check the activity log in test page for detailed error messages.

**Questions?** See `docs/TROUBLESHOOTING.md` or contact the development team.

---

**Status**: Ready for P2 testing ✅
**Last Updated**: 2025-11-08
