#!/usr/bin/env node

/**
 * Supabase Setup Verification Script
 *
 * Checks that all Supabase configuration is correct:
 * - Environment variables
 * - Migration file exists
 * - Services are properly configured
 * - Dependencies are installed
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark(passed) {
  return passed ? '✅' : '❌';
}

let allPassed = true;

// ============================================
// 1. Check .env file
// ============================================
log('\n📋 Checking Environment Configuration...', 'cyan');

const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

if (existsSync(envPath)) {
  log(`${checkmark(true)} .env file exists`, 'green');

  try {
    const envContent = readFileSync(envPath, 'utf-8');

    const hasUrl = envContent.includes('VITE_SUPABASE_URL=');
    const hasKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');
    const urlConfigured = /VITE_SUPABASE_URL=https:\/\/[a-z0-9]+\.supabase\.co/.test(envContent);
    const keyConfigured = /VITE_SUPABASE_ANON_KEY=eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(envContent);

    log(`${checkmark(hasUrl)} VITE_SUPABASE_URL is defined`, hasUrl ? 'green' : 'red');
    log(`${checkmark(hasKey)} VITE_SUPABASE_ANON_KEY is defined`, hasKey ? 'green' : 'red');
    log(`${checkmark(urlConfigured)} Supabase URL is properly formatted`, urlConfigured ? 'green' : 'yellow');
    log(`${checkmark(keyConfigured)} Anon key is properly formatted (JWT)`, keyConfigured ? 'green' : 'yellow');

    if (!hasUrl || !hasKey) {
      allPassed = false;
      log('\n⚠️  Missing environment variables. Copy from .env.example:', 'yellow');
      if (existsSync(envExamplePath)) {
        const exampleContent = readFileSync(envExamplePath, 'utf-8');
        console.log(exampleContent);
      }
    }
  } catch (error) {
    log(`${checkmark(false)} Failed to read .env file: ${error.message}`, 'red');
    allPassed = false;
  }
} else {
  log(`${checkmark(false)} .env file not found`, 'red');
  allPassed = false;

  if (existsSync(envExamplePath)) {
    log('\n⚠️  Create .env file by copying .env.example:', 'yellow');
    log(`   cp .env.example .env`, 'cyan');
    log(`   Then fill in your Supabase credentials`, 'cyan');
  }
}

// ============================================
// 2. Check Migration File
// ============================================
log('\n📋 Checking Database Migration...', 'cyan');

const migrationPath = join(rootDir, 'supabase/migrations/20250108000000_initial_schema.sql');

if (existsSync(migrationPath)) {
  log(`${checkmark(true)} Migration file exists`, 'green');

  try {
    const migrationContent = readFileSync(migrationPath, 'utf-8');

    const hasTables = migrationContent.includes('create table public.profiles');
    const hasRLS = migrationContent.includes('alter table public.profiles enable row level security');
    const hasPolicies = migrationContent.includes('create policy');
    const hasTriggers = migrationContent.includes('create trigger on_auth_user_created');

    log(`${checkmark(hasTables)} Contains table definitions`, hasTables ? 'green' : 'red');
    log(`${checkmark(hasRLS)} Row Level Security enabled`, hasRLS ? 'green' : 'red');
    log(`${checkmark(hasPolicies)} Security policies defined`, hasPolicies ? 'green' : 'red');
    log(`${checkmark(hasTriggers)} Auto-create triggers defined`, hasTriggers ? 'green' : 'red');

    if (!hasTables || !hasRLS || !hasPolicies || !hasTriggers) {
      allPassed = false;
    }
  } catch (error) {
    log(`${checkmark(false)} Failed to read migration file: ${error.message}`, 'red');
    allPassed = false;
  }
} else {
  log(`${checkmark(false)} Migration file not found`, 'red');
  allPassed = false;
}

// ============================================
// 3. Check Supabase Services
// ============================================
log('\n📋 Checking Supabase Services...', 'cyan');

const services = [
  'src/ts/supabase/supabaseClient.ts',
  'src/ts/supabase/authService.ts',
  'src/ts/supabase/syncService.ts',
  'src/ts/supabase/autoSyncManager.ts',
];

for (const servicePath of services) {
  const fullPath = join(rootDir, servicePath);
  const exists = existsSync(fullPath);
  log(`${checkmark(exists)} ${servicePath}`, exists ? 'green' : 'red');
  if (!exists) allPassed = false;
}

// ============================================
// 4. Check Zustand Auth Store
// ============================================
log('\n📋 Checking Zustand Auth Store...', 'cyan');

const storeTypesPath = join(rootDir, 'src/ts/stores/types.ts');
const storeIndexPath = join(rootDir, 'src/ts/stores/index.ts');

if (existsSync(storeTypesPath)) {
  log(`${checkmark(true)} Store types exist`, 'green');

  try {
    const typesContent = readFileSync(storeTypesPath, 'utf-8');
    const hasAuthState = typesContent.includes('export interface AuthState');
    const hasUser = typesContent.includes('export interface User');

    log(`${checkmark(hasAuthState)} AuthState interface defined`, hasAuthState ? 'green' : 'red');
    log(`${checkmark(hasUser)} User interface defined`, hasUser ? 'green' : 'red');

    if (!hasAuthState || !hasUser) allPassed = false;
  } catch (error) {
    log(`${checkmark(false)} Failed to read types: ${error.message}`, 'red');
    allPassed = false;
  }
} else {
  log(`${checkmark(false)} Store types file not found`, 'red');
  allPassed = false;
}

if (existsSync(storeIndexPath)) {
  log(`${checkmark(true)} Main store exists`, 'green');

  try {
    const indexContent = readFileSync(storeIndexPath, 'utf-8');
    const hasAuthSlice = indexContent.includes('auth: {');
    const hasInitialize = indexContent.includes('initialize: async ()');
    const hasSignOut = indexContent.includes('signOut: async ()');

    log(`${checkmark(hasAuthSlice)} Auth slice implemented`, hasAuthSlice ? 'green' : 'red');
    log(`${checkmark(hasInitialize)} Auth initialize method`, hasInitialize ? 'green' : 'red');
    log(`${checkmark(hasSignOut)} Auth signOut method`, hasSignOut ? 'green' : 'red');

    if (!hasAuthSlice || !hasInitialize || !hasSignOut) allPassed = false;
  } catch (error) {
    log(`${checkmark(false)} Failed to read store: ${error.message}`, 'red');
    allPassed = false;
  }
} else {
  log(`${checkmark(false)} Main store file not found`, 'red');
  allPassed = false;
}

// ============================================
// 5. Check App Integration
// ============================================
log('\n📋 Checking App Integration...', 'cyan');

const pteAppPath = join(rootDir, 'src/ts/core/PTEApp.ts');

if (existsSync(pteAppPath)) {
  log(`${checkmark(true)} PTEApp exists`, 'green');

  try {
    const appContent = readFileSync(pteAppPath, 'utf-8');
    const hasInitAuth = appContent.includes('initializeAuth()');
    const callsInitAuth = appContent.includes('await this.initializeAuth()');

    log(`${checkmark(hasInitAuth)} initializeAuth method defined`, hasInitAuth ? 'green' : 'red');
    log(`${checkmark(callsInitAuth)} Auth initialized on startup`, callsInitAuth ? 'green' : 'red');

    if (!hasInitAuth || !callsInitAuth) {
      allPassed = false;
      log('\n⚠️  Auth is not being initialized during app startup!', 'yellow');
    }
  } catch (error) {
    log(`${checkmark(false)} Failed to read PTEApp: ${error.message}`, 'red');
    allPassed = false;
  }
} else {
  log(`${checkmark(false)} PTEApp file not found`, 'red');
  allPassed = false;
}

// ============================================
// 6. Check Dependencies
// ============================================
log('\n📋 Checking Dependencies...', 'cyan');

const packageJsonPath = join(rootDir, 'package.json');

if (existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const hasSupabase = '@supabase/supabase-js' in deps;
    const hasZustand = 'zustand' in deps;

    log(`${checkmark(hasSupabase)} @supabase/supabase-js installed (${deps['@supabase/supabase-js'] || 'N/A'})`, hasSupabase ? 'green' : 'red');
    log(`${checkmark(hasZustand)} zustand installed (${deps['zustand'] || 'N/A'})`, hasZustand ? 'green' : 'red');

    if (!hasSupabase || !hasZustand) {
      allPassed = false;
      log('\n⚠️  Missing dependencies. Run:', 'yellow');
      log('   npm install', 'cyan');
    }
  } catch (error) {
    log(`${checkmark(false)} Failed to read package.json: ${error.message}`, 'red');
    allPassed = false;
  }
} else {
  log(`${checkmark(false)} package.json not found`, 'red');
  allPassed = false;
}

// ============================================
// 7. Summary
// ============================================
log('\n' + '='.repeat(60), 'cyan');

if (allPassed) {
  log('\n🎉 All checks passed! Supabase integration is ready.', 'green');
  log('\n📚 Next steps:', 'cyan');
  log('   1. Apply the database migration (see docs/SUPABASE-SETUP.md)', 'blue');
  log('   2. Run: npm run dev', 'blue');
  log('   3. Open browser and sign up/sign in', 'blue');
  log('   4. Check browser console for auth messages', 'blue');
} else {
  log('\n❌ Some checks failed. Please fix the issues above.', 'red');
  log('\n📚 See docs/SUPABASE-SETUP.md for detailed setup instructions.', 'cyan');
  process.exit(1);
}

log('='.repeat(60) + '\n', 'cyan');
