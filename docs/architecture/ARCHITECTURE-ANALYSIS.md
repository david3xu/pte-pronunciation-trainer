# Architecture Analysis & Refactoring Plan

**Date**: 2025-11-08
**Status**: Analysis Complete - Action Required

---

## Current Architecture (Hybrid: Local + Cloud)

### ✅ CORRECT DESIGN: Two-Tier Data Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌────────────────────────┐  │
│  │   LOCAL JSON FILES   │      │   SUPABASE DATABASE    │  │
│  │  (Static Vocabulary) │      │  (User-Specific Data)  │  │
│  ├──────────────────────┤      ├────────────────────────┤  │
│  │                      │      │                        │  │
│  │ • 13,000+ words      │      │ • User profiles        │  │
│  │ • IPA pronunciation  │      │ • Progress tracking    │  │
│  │ • 2,507 sentences    │      │ • Settings sync        │  │
│  │ • 692 questions      │      │ • Study sessions       │  │
│  │                      │      │ • Word mastery         │  │
│  │ Same for ALL users   │      │ Unique per user        │  │
│  └──────────────────────┘      └────────────────────────┘  │
│           ▲                              ▲                   │
│           │                              │                   │
│           └──────────────┬───────────────┘                   │
│                          │                                   │
│                  ┌───────▼────────┐                          │
│                  │   WEB APP      │                          │
│                  │  (index.html)  │                          │
│                  └────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Why This Design is Correct

**Local JSON Files (data/processed/):**
- ✅ **Static content** - vocabulary doesn't change per user
- ✅ **Fast loading** - no database queries for 13,000 items
- ✅ **Offline-first** - works without internet
- ✅ **CDN-friendly** - can be cached globally
- ✅ **Cost-effective** - no database reads for vocabulary

**Supabase Database:**
- ✅ **User data only** - progress, settings, sessions
- ✅ **Cross-device sync** - study on phone, resume on laptop
- ✅ **Authentication** - secure user accounts
- ✅ **Analytics** - track learning patterns
- ✅ **Spaced repetition** - personal word mastery tracking

---

## Current Directory Structure

```
ccl-pronunciation-trainer/
├── 📁 data/                          # LOCAL VOCABULARY DATA
│   ├── processed/                    # ✅ KEEP (Runtime JSON files)
│   │   ├── pte-fib-listening-dataset.json
│   │   ├── pte-beginner-vocabulary.json
│   │   └── ... (13 vocab + 3 practice files)
│   │
│   ├── source/pte/                   # ❓ DEVELOPMENT ONLY
│   │   ├── vocabs/                   # 1.7 MB markdown files
│   │   ├── sentences/                # Practice sentences
│   │   └── questions/                # ASQ questions
│   │
│   └── reports/                      # ❌ REMOVE (Build artifacts)
│
├── 📁 src/
│   ├── ts/                           # ✅ KEEP (TypeScript source)
│   │   ├── supabase/                 # ✅ KEEP (Cloud sync)
│   │   │   ├── authService.ts
│   │   │   ├── syncService.ts
│   │   │   └── autoSyncManager.ts
│   │   ├── core/                     # App core
│   │   ├── data/                     # Data loaders
│   │   ├── audio/                    # TTS engine
│   │   └── ui/                       # UI controllers
│   │
│   ├── js/                           # ✅ KEEP (Compiled JS - runtime)
│   ├── css/                          # ✅ KEEP
│   ├── html/                         # ✅ KEEP
│   └── types/                        # ✅ KEEP (Type definitions)
│
├── 📁 supabase/                      # ✅ KEEP (Database schema)
│   └── migrations/
│       └── 20250108000000_initial_schema.sql
│
├── 📁 scripts/                       # ❓ DEVELOPMENT ONLY
│   ├── pte-data-pipeline.js          # Markdown → JSON converter
│   ├── build.js                      # Production build
│   └── validate.js                   # Validation scripts
│
├── 📁 docs/                          # ✅ KEEP (Documentation)
│   ├── ARCHITECTURE.md               # ✅ KEEP
│   ├── API-REFERENCE.md              # ✅ KEEP
│   ├── SUPABASE-SETUP-GUIDE.md       # ✅ KEEP
│   ├── FULLSTACK-IMPROVEMENT-PLAN.md # ✅ KEEP
│   └── investigations/               # ❌ ARCHIVE
│
├── 📁 dist/                          # ❌ REMOVE (Build output)
│   ├── compiled/                     # TypeScript compilation temp
│   ├── css/                          # Minified CSS
│   └── js/                           # Minified JS
│
├── index.html                        # ✅ KEEP
├── package.json                      # ✅ KEEP
├── tsconfig.json                     # ✅ KEEP
├── CLAUDE.md                         # ✅ KEEP
├── README.md                         # ✅ KEEP
└── .gitignore                        # ✅ KEEP
```

---

## Supabase Role (User Data ONLY)

### What Supabase Stores (Per User)

#### 1. **profiles** (User Account)
```sql
- id, email, full_name, avatar_url
- preferred_voice, preferred_language
- total_words_studied, total_practice_sessions
- current_streak_days, longest_streak_days
```

#### 2. **user_progress** (Learning Progress)
```sql
- dataset_id: "pte-beginner", "rs", "asq", etc.
- current_index: which word/sentence user is on
- completed_items: how many finished
- total_study_time_seconds
- correct_count, incorrect_count, skipped_count
```

#### 3. **user_settings** (Preferences Sync)
```sql
- auto_play_next, repeat_mode, tts_rate, tts_volume
- show_phonetic, show_ipa, theme
- current_practice_mode, difficulty_filter
```

#### 4. **study_sessions** (Analytics)
```sql
- session_date, duration_seconds, items_studied
- items_correct, items_incorrect, items_skipped
```

#### 5. **word_mastery** (Spaced Repetition)
```sql
- word: "ubiquitous"
- mastery_level: 0-5
- next_review_date: when to review again
- ease_factor: SM-2 algorithm
```

### What Supabase DOES NOT Store
- ❌ Vocabulary words (13,000+ items)
- ❌ IPA pronunciation
- ❌ Practice sentences
- ❌ ASQ questions

**Why?** Static content should be in JSON files, not duplicated per user in database.

---

## Problems Identified

### 1. ❌ **Still Using Local Data Pipeline**
**Current**: pte-data-pipeline.js processes markdown → JSON on every build
**Problem**: In production, vocabulary data should be pre-built, not rebuilt
**Impact**: Slower deployments, unnecessary processing

### 2. ❌ **Source Markdown in Production**
**Current**: `data/source/` (1.7 MB markdown) deployed to production
**Problem**: Only needed for development, wastes bandwidth
**Impact**: Larger deploy size, slower edge caching

### 3. ❌ **Development Files in Production**
**Current**: `scripts/`, `dist/compiled/`, build tools deployed
**Problem**: Not needed at runtime
**Impact**: Larger bundle, potential security issues

### 4. ❌ **Investigation Docs in Main Repo**
**Current**: `docs/investigations/` with 18 temporary files
**Problem**: Clutters documentation
**Impact**: Confusing for new developers

### 5. ⚠️ **Validation Scripts Use CommonJS**
**Current**: After adding `"type": "module"` to package.json, validate scripts break
**Problem**: Pre-commit hooks fail
**Impact**: Can't commit without --no-verify

---

## Recommended Refactoring

### Phase 1: Separate Development from Production

#### Production Files (Deploy to Vercel)
```
ccl-pronunciation-trainer/
├── public/                           # NEW: Static assets
│   ├── data/                         # JSON datasets only
│   │   ├── pte-fib-listening-dataset.json
│   │   └── ... (16 total datasets)
│   ├── css/
│   ├── js/
│   └── assets/
│
├── src/                              # TypeScript source
│   ├── ts/
│   ├── types/
│   └── ... (kept as-is)
│
├── supabase/                         # Database schema
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json                       # NEW: Deployment config
├── README.md
└── CLAUDE.md
```

#### Development Files (Separate Repo or Archive)
```
pte-data-sources/                     # NEW REPO
├── source/                           # Markdown source files
│   ├── vocabs/                       # 1.7 MB markdown
│   ├── sentences/
│   └── questions/
│
├── scripts/                          # Data pipeline
│   └── pte-data-pipeline.js
│
└── README.md                         # How to rebuild datasets
```

### Phase 2: Clean Up Project

#### Files to Delete
```bash
# Build artifacts
rm -rf dist/
rm -rf data/reports/

# Investigation docs (archive first)
mkdir -p archive/investigations/
mv docs/investigations/* archive/investigations/
rm -rf docs/investigations/

# Temporary files
rm data/source/pte/vocabs/temp.md
rm data/source/pte/vocabs/sst.md
```

#### Files to Move
```bash
# Move source data to separate repo
mkdir -p ../pte-data-sources/
mv data/source/ ../pte-data-sources/
mv scripts/pte-data-pipeline.js ../pte-data-sources/scripts/
```

#### Files to Keep
```bash
# Essential runtime files
data/processed/*.json          # ✅ 16 JSON datasets
src/                           # ✅ All source code
supabase/                      # ✅ Database migrations
index.html                     # ✅ Entry point
package.json                   # ✅ Dependencies
tsconfig.json                  # ✅ TypeScript config
```

### Phase 3: Update Build Process

#### vercel.json (NEW)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "framework": null,
  "routes": [
    {
      "src": "/data/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }
  ]
}
```

#### package.json (UPDATED)
```json
{
  "scripts": {
    "dev": "vite",                    // NEW: Use Vite dev server
    "build": "tsc && vite build",     // NEW: TypeScript + Vite
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",

    // REMOVE these (move to pte-data-sources repo)
    // "data:pte": "node scripts/pte-data-pipeline.js",
    // "vercel-build": "npm run data:pte && npm run build"
  }
}
```

### Phase 4: Document Architecture

#### docs/ARCHITECTURE-FINAL.md (NEW)
```markdown
# Final Architecture

## Data Flow
1. **Development**: Markdown → Pipeline → JSON (separate repo)
2. **Production**: JSON files served as static assets
3. **User Data**: Supabase for progress, settings, sessions

## Deployment
- **Vercel**: Hosts web app + JSON files
- **Supabase**: Hosts user database
- **No build-time data processing**

## Local Development
1. Clone main repo
2. JSON datasets included (no pipeline needed)
3. `npm install && npm run dev`
```

---

## Migration Steps

### Step 1: Create Data Source Repository
```bash
# Create separate repo for source data
cd ..
mkdir pte-data-sources
cd pte-data-sources
git init

# Move source files
cp -r ../ccl-pronunciation-trainer/data/source/ ./
cp ../ccl-pronunciation-trainer/scripts/pte-data-pipeline.js ./scripts/
cp ../ccl-pronunciation-trainer/scripts/build.js ./scripts/

# Document usage
cat > README.md << 'EOF'
# PTE Data Sources

Markdown source files for PTE vocabulary, sentences, and questions.

## Rebuild Datasets
```bash
node scripts/pte-data-pipeline.js
```

Outputs JSON files to copy to main repo's `public/data/` directory.
EOF

git add -A
git commit -m "Initial commit: PTE data sources"
```

### Step 2: Clean Main Repository
```bash
cd ccl-pronunciation-trainer

# Archive investigations
mkdir -p archive/
mv docs/investigations/ archive/

# Remove build artifacts
rm -rf dist/
rm -rf data/reports/
rm -rf data/source/

# Remove data pipeline (moved to separate repo)
rm scripts/pte-data-pipeline.js

# Update .gitignore
cat >> .gitignore << 'EOF'
# Build artifacts
dist/
data/reports/

# Data source (managed in separate repo)
data/source/
EOF

git add -A
git commit -m "Clean: Remove development files from production repo"
```

### Step 3: Restructure for Production
```bash
# Create public directory
mkdir -p public/data
mv data/processed/*.json public/data/

# Update package.json (remove data pipeline scripts)
# Update index.html (update data paths to /data/*.json)

git add -A
git commit -m "Refactor: Production-ready structure"
```

---

## Benefits of Refactoring

### Before (Current)
- ❌ 1.7 MB markdown source in production
- ❌ Data pipeline runs on every deploy
- ❌ Build artifacts committed to git
- ❌ Mixed development/production files
- ❌ Confusing directory structure

### After (Proposed)
- ✅ Only 200KB JSON in production
- ✅ Pre-built datasets (no pipeline)
- ✅ Clean git history (no artifacts)
- ✅ Separate repos for dev/prod
- ✅ Clear architecture

---

## Questions & Answers

### Q: Do we still need local data?
**A**: YES, but only processed JSON files (data/processed/).

- ✅ **KEEP**: JSON datasets for runtime
- ❌ **REMOVE**: Markdown source files (development only)

### Q: What does Supabase store?
**A**: User-specific data ONLY:
- User profiles, settings, progress
- Study sessions, word mastery
- Authentication tokens

### Q: Can the app work offline?
**A**: YES
- Vocabulary JSON files cached by service worker
- User data syncs when online
- Progressive Web App (PWA) ready

### Q: Do we need the data pipeline?
**A**: Only for DEVELOPMENT
- Move to separate `pte-data-sources` repository
- Pre-build datasets, copy to main repo
- No pipeline in production builds

---

## Next Steps

1. **Immediate**: Fix validation scripts (convert to ES modules)
2. **Phase 1**: Create `pte-data-sources` repository
3. **Phase 2**: Clean main repository
4. **Phase 3**: Update build process
5. **Phase 4**: Document final architecture
6. **Phase 5**: Deploy and test

---

## Approval Required

**Before proceeding, please confirm:**
- [ ] Approve separation of data source files
- [ ] Approve removal of pipeline from production
- [ ] Approve public/ directory structure
- [ ] Approve Vite build system (or keep current?)

**Current Status**: ⏸️ Waiting for user approval
