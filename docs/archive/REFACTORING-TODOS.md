# Project Refactoring TODO List

**Created**: 2025-11-08
**Based on**: Best practices analysis & architecture review

---

## 🎯 Goals

1. **Clean production build** - Remove development files from production
2. **Maintain current architecture** - Keep local JSON + Supabase hybrid (proven optimal)
3. **Fix immediate issues** - Validation scripts, build process
4. **Prepare for scale** - Clean structure for future growth

---

## 📋 TODO List

### Phase 1: Immediate Fixes (Critical) 🔴

#### 1.1 Fix Validation Scripts (ES Module Compatibility)
**Priority**: P0 - Blocking commits
**Status**: ⏳ TODO

Current problem: Pre-commit hooks fail after adding `"type": "module"` to package.json

**Tasks:**
- [ ] Convert `scripts/validate-docs.js` to ES modules
- [ ] Convert `scripts/validate-structure.js` to ES modules
- [ ] Convert `scripts/validate.js` to ES modules
- [ ] Test pre-commit hooks work
- [ ] Verify `npm run validate:all` passes

**Files to update:**
```javascript
// OLD (CommonJS)
const fs = require('fs');
const path = require('path');

// NEW (ES modules)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Acceptance criteria:**
- ✅ All validation scripts run without errors
- ✅ Pre-commit hooks pass
- ✅ Can commit without `--no-verify`

---

#### 1.2 Fix Build Scripts (ES Module Compatibility)
**Priority**: P0 - Blocking builds
**Status**: ⏳ TODO

**Tasks:**
- [ ] Convert `scripts/build.js` to ES modules
- [ ] Test `npm run build` works
- [ ] Verify minified output is correct
- [ ] Update build documentation

**Acceptance criteria:**
- ✅ `npm run build` succeeds
- ✅ Minified JS/CSS output correct
- ✅ Production build ready for deploy

---

#### 1.3 Verify Vercel Build Success
**Priority**: P0 - Deployment blocked
**Status**: ⏳ PENDING (waiting for build to complete)

**Tasks:**
- [ ] Monitor Vercel build logs
- [ ] Verify data pipeline runs successfully
- [ ] Test deployed application works
- [ ] Check all datasets load correctly

**Acceptance criteria:**
- ✅ Vercel build passes
- ✅ Application loads in production
- ✅ All 16 datasets accessible
- ✅ No console errors

---

### Phase 2: Repository Cleanup (High Priority) 🟡

#### 2.1 Remove Build Artifacts from Git
**Priority**: P1 - Pollutes git history
**Status**: ⏳ TODO

**Tasks:**
- [ ] Add `dist/` to .gitignore (if not already)
- [ ] Add `data/reports/` to .gitignore
- [ ] Remove `dist/compiled/` from git tracking
- [ ] Clean up existing commits (optional: git filter-branch)

**Commands:**
```bash
# Add to .gitignore
echo "dist/" >> .gitignore
echo "data/reports/" >> .gitignore

# Remove from git but keep locally
git rm -r --cached dist/
git rm -r --cached data/reports/

git commit -m "Clean: Remove build artifacts from git tracking"
```

**Acceptance criteria:**
- ✅ `dist/` not tracked by git
- ✅ `data/reports/` not tracked by git
- ✅ Files still exist locally for builds

---

#### 2.2 Archive Investigation Documents
**Priority**: P1 - Reduces clutter
**Status**: ⏳ TODO

Current: 18 investigation markdown files in `docs/investigations/`

**Tasks:**
- [ ] Create `archive/investigations/` directory
- [ ] Move all investigation files to archive
- [ ] Update `docs/README.md` to reference archive
- [ ] Keep only essential docs in `docs/`

**Commands:**
```bash
mkdir -p archive/investigations/
mv docs/investigations/* archive/investigations/
rmdir docs/investigations/

# Update .gitignore
echo "archive/" >> .gitignore
```

**Essential docs to keep:**
- ✅ `ARCHITECTURE.md`
- ✅ `API-REFERENCE.md`
- ✅ `SUPABASE-SETUP-GUIDE.md`
- ✅ `FULLSTACK-IMPROVEMENT-PLAN.md`
- ✅ `TYPESCRIPT-MIGRATION-PROGRESS.md`
- ✅ `GUIDELINES.md`
- ✅ `DEPLOYMENT.md`

**Acceptance criteria:**
- ✅ Only 7-10 essential docs in `docs/`
- ✅ Investigation files archived locally
- ✅ Cleaner documentation structure

---

#### 2.3 Clean Temporary Source Files
**Priority**: P2 - Minor cleanup
**Status**: ⏳ TODO

**Tasks:**
- [ ] Remove `data/source/pte/vocabs/temp.md`
- [ ] Remove `data/source/pte/vocabs/sst.md` (if not needed)
- [ ] Document any essential test files

**Acceptance criteria:**
- ✅ No temporary files in source directory

---

### Phase 3: Project Structure Optimization (Medium Priority) 🟢

#### 3.1 Reorganize for Production/Development Split
**Priority**: P2 - Improves structure
**Status**: ⏳ TODO

**Option A: Keep current structure** (Recommended for now)
```
Current structure works well, only needs cleanup:
- Keep data/source/ (for rebuilding datasets)
- Keep scripts/ (for development)
- Add better .gitignore for build artifacts
```

**Option B: Separate data sources repo** (Future enhancement)
```
Move to separate repository if team grows:
- Main repo: Production code only
- pte-data-sources: Markdown sources + pipeline
```

**Decision**: Start with Option A, migrate to Option B if needed

**Tasks for Option A:**
- [ ] Document build process clearly in README
- [ ] Add `npm run build:data` script for rebuilding datasets
- [ ] Ensure .gitignore excludes all build artifacts
- [ ] Add developer setup guide

**Acceptance criteria:**
- ✅ Clear separation between source and build
- ✅ New developers can rebuild datasets
- ✅ Production deploys don't include unnecessary files

---

#### 3.2 Update Build Process Documentation
**Priority**: P2 - Developer experience
**Status**: ⏳ TODO

**Tasks:**
- [ ] Update README.md with clear build instructions
- [ ] Document data pipeline workflow
- [ ] Add troubleshooting section for common build issues
- [ ] Create CONTRIBUTING.md for new developers

**Acceptance criteria:**
- ✅ New developer can set up project in <10 minutes
- ✅ Build process clearly documented
- ✅ Common issues have solutions

---

### Phase 4: Supabase Integration Completion (Medium Priority) 🟢

#### 4.1 Test Supabase Authentication
**Priority**: P2 - Core feature
**Status**: ⏳ TODO (code exists, needs testing)

Current: Supabase auth service created in TypeScript migration

**Tasks:**
- [ ] Create test user account
- [ ] Test sign up flow
- [ ] Test sign in flow
- [ ] Test sign out flow
- [ ] Test session persistence
- [ ] Add error handling UI

**Acceptance criteria:**
- ✅ Users can sign up
- ✅ Users can sign in
- ✅ Sessions persist across refreshes
- ✅ Error messages clear and helpful

---

#### 4.2 Test Progress Sync
**Priority**: P2 - Core feature
**Status**: ⏳ TODO (code exists, needs testing)

**Tasks:**
- [ ] Test progress saves to Supabase
- [ ] Test progress loads on page refresh
- [ ] Test cross-device sync (same user, different browser)
- [ ] Test offline → online sync
- [ ] Add sync status indicator to UI

**Acceptance criteria:**
- ✅ Progress saved automatically
- ✅ Progress persists across devices
- ✅ Offline changes sync when online
- ✅ User sees sync status

---

#### 4.3 Test Settings Sync
**Priority**: P3 - Nice to have
**Status**: ⏳ TODO (code exists, needs testing)

**Tasks:**
- [ ] Test settings save to Supabase
- [ ] Test settings load on page refresh
- [ ] Test cross-device sync
- [ ] Test default settings for new users

**Acceptance criteria:**
- ✅ Settings sync across devices
- ✅ New users get sensible defaults
- ✅ Settings persist after logout/login

---

#### 4.4 Add Auto-Sync Manager
**Priority**: P3 - Enhancement
**Status**: ⏳ TODO (code exists, needs integration)

Current: `autoSyncManager.ts` created but not integrated

**Tasks:**
- [ ] Integrate auto-sync manager into PTEApp
- [ ] Configure sync intervals (e.g., every 30 seconds)
- [ ] Add debouncing for rapid changes
- [ ] Add retry logic for failed syncs
- [ ] Add UI indicator for sync status

**Acceptance criteria:**
- ✅ Progress auto-syncs every 30s
- ✅ Immediate sync on major actions (complete word, etc.)
- ✅ Failed syncs retry automatically
- ✅ User sees sync status

---

### Phase 5: TypeScript Migration Completion (Low Priority) 🔵

#### 5.1 Migrate Remaining JavaScript Files
**Priority**: P3 - Consistency
**Status**: ⏳ TODO

Current: 48.6% migrated (17/35 files)

**Remaining files:**
- [ ] `src/js/utils/EventBus.js`
- [ ] `src/js/core/DatasetManager.js`
- [ ] `src/js/core/PTEVocabularyManager.js`
- [ ] `src/js/ui/UIController.js`
- [ ] `src/js/audio/AudioControls.js`
- [ ] ... (13 more files)

**Priority order:**
1. Core modules (EventBus, DatasetManager, PTEVocabularyManager)
2. UI modules (UIController)
3. Audio modules (AudioControls, VoiceSelector)
4. Utility modules (remaining)

**Acceptance criteria:**
- ✅ 100% TypeScript coverage
- ✅ No type errors
- ✅ All files use strict mode

---

#### 5.2 Add Type Tests
**Priority**: P4 - Quality assurance
**Status**: ⏳ TODO

**Tasks:**
- [ ] Add type-only test files
- [ ] Test complex type inference
- [ ] Test generic types
- [ ] Add to CI/CD pipeline

**Acceptance criteria:**
- ✅ Type tests pass
- ✅ No type regressions in CI

---

### Phase 6: Performance Optimization (Future) 🔵

#### 6.1 Add Service Worker Caching
**Priority**: P3 - Offline capability
**Status**: ⏳ TODO (partially implemented)

**Tasks:**
- [ ] Update Service Worker to cache all datasets
- [ ] Implement cache-first strategy for vocabulary
- [ ] Add network-first for user data
- [ ] Test offline functionality
- [ ] Add cache invalidation strategy

**Acceptance criteria:**
- ✅ App works fully offline after first load
- ✅ Vocabulary loads from cache (<50ms)
- ✅ User data syncs when online

---

#### 6.2 Implement Lazy Loading
**Priority**: P4 - Performance
**Status**: ⏳ TODO

**Tasks:**
- [ ] Lazy load vocabulary datasets (load on demand)
- [ ] Lazy load practice mode datasets
- [ ] Add loading indicators
- [ ] Implement prefetching for likely next dataset

**Acceptance criteria:**
- ✅ Initial page load <1s
- ✅ Only active dataset loaded
- ✅ Smooth transitions between datasets

---

#### 6.3 Add Bundle Splitting
**Priority**: P4 - Performance
**Status**: ⏳ TODO

**Tasks:**
- [ ] Split vendor code (Supabase, etc.)
- [ ] Split feature modules (audio, UI, etc.)
- [ ] Implement dynamic imports
- [ ] Measure bundle size improvements

**Acceptance criteria:**
- ✅ Main bundle <100KB
- ✅ Vendor bundle cached separately
- ✅ Features load on demand

---

### Phase 7: Testing & Quality (Future) 🔵

#### 7.1 Add Integration Tests
**Priority**: P3 - Quality
**Status**: ⏳ TODO

**Tasks:**
- [ ] Test full user flow (load → study → progress)
- [ ] Test Supabase integration
- [ ] Test offline → online sync
- [ ] Add E2E tests (Playwright/Cypress)

**Acceptance criteria:**
- ✅ Critical paths covered by tests
- ✅ Tests run in CI/CD

---

#### 7.2 Add Performance Monitoring
**Priority**: P4 - Observability
**Status**: ⏳ TODO

**Tasks:**
- [ ] Add Web Vitals tracking
- [ ] Monitor TTS performance
- [ ] Track dataset load times
- [ ] Set up error tracking (Sentry?)

**Acceptance criteria:**
- ✅ Performance metrics visible
- ✅ Errors tracked and alerted

---

## 📊 Summary by Priority

### P0 - Critical (Blocking) 🔴
- [ ] Fix validation scripts (ES modules)
- [ ] Fix build scripts (ES modules)
- [ ] Verify Vercel build success

**Timeline**: 1-2 hours
**Blockers**: Can't commit/deploy without these

---

### P1 - High Priority 🟡
- [ ] Remove build artifacts from git
- [ ] Archive investigation docs
- [ ] Clean temporary source files

**Timeline**: 1 hour
**Impact**: Cleaner repo, better git history

---

### P2 - Medium Priority 🟢
- [ ] Reorganize project structure
- [ ] Update build documentation
- [ ] Test Supabase authentication
- [ ] Test progress sync
- [ ] Test settings sync

**Timeline**: 4-6 hours
**Impact**: Better DX, complete features

---

### P3 - Low Priority 🔵
- [ ] Add auto-sync manager
- [ ] Migrate remaining JS files
- [ ] Add Service Worker caching
- [ ] Add integration tests

**Timeline**: 8-12 hours
**Impact**: Polish, future-proofing

---

### P4 - Nice to Have 💙
- [ ] Add type tests
- [ ] Implement lazy loading
- [ ] Add bundle splitting
- [ ] Add performance monitoring

**Timeline**: 12-16 hours
**Impact**: Optimization, advanced features

---

## 🎯 Recommended Action Plan

### Week 1: Fix Critical Issues
**Day 1-2:**
- ✅ Fix validation scripts (P0)
- ✅ Fix build scripts (P0)
- ✅ Verify Vercel deployment (P0)
- ✅ Remove build artifacts (P1)

**Day 3-4:**
- ✅ Archive investigation docs (P1)
- ✅ Clean temporary files (P1)
- ✅ Update documentation (P2)

**Day 5:**
- ✅ Test Supabase features (P2)
- ✅ Create todo list for next week

---

### Week 2: Complete Core Features
- Test authentication flow
- Test progress/settings sync
- Integrate auto-sync manager
- Add user-facing sync indicators

---

### Week 3+: Polish & Optimize
- Complete TypeScript migration
- Add comprehensive testing
- Implement performance optimizations
- Monitor and iterate

---

## ✅ Success Criteria

### Short-term (Week 1)
- ✅ Can commit without `--no-verify`
- ✅ Vercel builds successfully
- ✅ Repository is clean (no build artifacts)
- ✅ Documentation is clear

### Medium-term (Month 1)
- ✅ Supabase features fully tested
- ✅ Users can sign up and sync progress
- ✅ App works offline
- ✅ 100% TypeScript coverage

### Long-term (Month 3)
- ✅ Performance optimized (<1s load)
- ✅ Comprehensive test coverage
- ✅ Production-ready for scale
- ✅ Happy users! 🎉

---

## 📝 Notes

**Current Architecture Decision**: ✅ KEEP local JSON + Supabase hybrid
- This is the correct approach (see VOCABULARY-STORAGE-DECISION.md)
- No need to move vocabulary to database
- Focus on completing user data sync features

**Next Session Priorities**:
1. Fix validation scripts (P0)
2. Verify Vercel build (P0)
3. Clean up repository (P1)
4. Test Supabase features (P2)
