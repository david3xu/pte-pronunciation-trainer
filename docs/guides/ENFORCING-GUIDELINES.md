# Enforcing Development Guidelines

**Comprehensive enforcement system for GUIDELINES.md compliance**

This document explains ALL enforcement mechanisms that ensure developers (human and AI) follow project guidelines:

1. **Automated Pre-Commit Validation** - Documentation & structure checks
2. **AI Assistant Enforcement** - Ensuring AI follows guidelines
3. **CI/CD Integration** - Continuous validation

---

## Part 1: Automated Pre-Commit Validation

### Overview

Every commit is validated for:
- ✅ Documentation structure (permanent vs temporary)
- ✅ Version consistency (5 locations)
- ✅ Directory organization
- ✅ No forbidden files
- ✅ No historical language in permanent docs

### Installation

```bash
# Install dependencies (includes Husky for Git hooks)
npm install

# Husky auto-installs hooks via "prepare" script
```

### What Runs on Every Commit

```bash
git commit -m "Feat: Add feature"

# Automatic validations:
# 1. Documentation validation (scripts/validate-docs.js)
# 2. Structure validation (scripts/validate-structure.js)
# 3. ESLint (code linting)
# 4. Jest tests
```

### Manual Validation Commands

```bash
# Run individual validators
npm run validate:docs        # Documentation only
npm run validate:structure   # Directory structure only
npm run validate            # Data integrity only
npm run validate:all        # All 3 validators

# Full deployment validation
npm run deploy              # Data + build + all validators
```

### Documentation Validation Rules

#### 1. Permanent Documentation Must Exist

**Required Files**:
- `README.md`, `CHANGELOG.md`, `CLAUDE.md`
- `docs/GUIDELINES.md`, `docs/ARCHITECTURE.md`, `docs/API-REFERENCE.md`
- `docs/DEPLOYMENT.md`, `docs/TROUBLESHOOTING.md`, `docs/README.md`

**Error**: `Missing permanent documentation: docs/ARCHITECTURE.md`

#### 2. Version Consistency (5 Locations)

**Checked Files**:
1. `package.json` → `"version": "2.5.4"`
2. `README.md` → `v2.5.4` badge
3. `docs/GUIDELINES.md` → `Version: 2.5.4` footer
4. `docs/README.md` → `Version: 2.5.4` footer
5. `CLAUDE.md` → `Current Version: v2.5.4` header

**Error if mismatch**:
```
Version mismatch detected:
  package.json: v2.5.4
  README.md: v2.5.3  ← MISMATCH
```

**Fix**: Update all 5 locations to same version.

#### 3. No Historical Language in Permanent Docs

**Forbidden Patterns** (detected by regex):
- `fixed bug`, `solved bug`, `resolved issue`
- `problem solved`, `critical bug fixed`
- `X violations fixed`, `eliminated X duplicates`
- `was: X, now: Y` (before/after comparisons)

**Why**: Per GUIDELINES.md, permanent docs show CURRENT STATE, not history. History belongs in `CHANGELOG.md`.

**Error Example**:
```
Historical language in docs/ARCHITECTURE.md:1392
  "Fixed critical bug where 3 different `@keyframes pulse`..."
```

**Fix**: Rewrite to show current capability:
```diff
- Fixed critical bug where 3 different `@keyframes pulse` definitions caused issues
+ Centralized animation definitions with unified keyframes
```

#### 4. Temporary Documentation Cleanup

**Directory**: `docs/investigations/`
**Max Files**: 5 temporary files

**Temporary File Types**:
- `BUGFIX-*.md` - Delete after bug fixed
- `AUDIT-*.md` - Delete after fixes committed
- `INVESTIGATION-*.md` - Delete after completion

**Error if > 5 files**:
```
Too many temporary files in docs/investigations/ (8, max: 5)
```

**Fix**: Delete completed investigations per GUIDELINES.md lines 660-664.

#### 5. CHANGELOG.md Updated

**Checks**:
- Has `## [Unreleased]` section
- Contains today's date (indicates recent update)

**Warning**: `CHANGELOG.md may need updating (no today's date found)`

### Structure Validation Rules

#### 1. Required Directory Structure

**Enforced Structure**:
```
project-root/
├── data/
│   ├── source/        (required)
│   ├── processed/     (required)
│   └── reports/       (required)
├── src/
│   ├── js/
│   │   ├── core/      (required)
│   │   ├── shared/    (required) ← Config.js must be here
│   │   ├── ui/        (required)
│   │   ├── audio/     (required)
│   │   ├── data/      (required)
│   │   └── utils/     (required)
│   └── css/           (required)
├── docs/              (required)
├── scripts/           (required)
└── tests/             (optional)
```

**Error**: `Missing required directory: src/js/core/`

**Why**: Prevents random file organization, ensures consistent structure across all development.

#### 2. Required Root Files

**Files**: `package.json`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `index.html`

**Error**: `Missing required root file: package.json`

#### 3. CSS File Organization (Enforced Order)

**Required Files** in `src/css/`:
1. `variables.css` - Design tokens (load first!)
2. `animations.css` - Keyframes (load second!)
3. `components.css` - Reusable components
4. `style.css` - Main layout
5. `practice-modes.css` - Practice styles
6. `responsive.css` - Media queries

**Error**: `Missing required CSS file: src/css/variables.css`
**Warning**: `Unexpected CSS file: src/css/old-styles.css`

**Why**: CSS load order matters for cascade. Prevents duplicate/conflicting styles.

#### 4. JavaScript Module Organization

**Required Modules**: `core/`, `shared/`, `ui/`, `audio/`, `data/`, `utils/`

**Critical File Check**: `src/js/shared/Config.js` MUST exist

**Error**: `CRITICAL: Config.js not found at src/js/shared/Config.js`

**Why**: Config.js is the single source of truth. App cannot function without it.

#### 5. No Forbidden Files

**Forbidden**:
- `.DS_Store`, `Thumbs.db` (OS artifacts)
- `.env` (secrets - should NOT be committed!)
- `node_modules/` (dependencies)
- `.idea/`, `.vscode/*` (IDE configs, except `extensions.json`)

**Error**: `Forbidden file found: .env`

**Fix**: Delete + add to `.gitignore`

**Why**: Prevents accidental commits of secrets, keeps repo clean.

### Example: Pre-Commit Success

```bash
git commit -m "Feat: Add new feature"

========================================
  Pre-Commit Validation
========================================

📚 Running documentation validation...
✓ Found: README.md
✓ Found: CHANGELOG.md
✓ All versions consistent: v2.5.4
✓ Clean: README.md (no historical language)
✓ Temporary documentation directory is clean

📁 Running structure validation...
✓ Found: data/
✓ Found: src/js/core/
✓ Config.js found (critical file)
✓ CSS file: variables.css
✓ No forbidden files found

🔍 Running ESLint...
✓ PASS

🧪 Running tests...
✓ PASS

========================================
  Validation Summary
========================================
Documentation:  ✓ PASS
Structure:      ✓ PASS
Linting:        ✓ PASS
Tests:          ✓ PASS
========================================

✅ All pre-commit checks PASSED!
```

### Example: Pre-Commit Failure

```bash
git commit -m "Fix: Update docs"

========================================
  Pre-Commit Validation
========================================

📚 Running documentation validation...
✗ Version mismatch: README.md has v2.5.3, package.json has v2.5.4
✗ Historical language in docs/ARCHITECTURE.md:1392
  "Fixed critical bug where 3 different @keyframes..."

📁 Running structure validation...
✗ Missing required directory: data/processed/
✗ Forbidden file found: .env

========================================
  Validation Summary
========================================
Documentation:  ✗ FAIL (2 errors)
Structure:      ✗ FAIL (2 errors)
Linting:        ✓ PASS
Tests:          ✓ PASS
========================================

❌ Pre-commit checks FAILED. Fix issues before committing.

Fix these issues:
1. Update README.md version to 2.5.4
2. Remove historical language from ARCHITECTURE.md line 1392
3. Create missing directory: mkdir -p data/processed
4. Delete .env and add to .gitignore
```

### Bypassing Validation (Emergency Only)

```bash
# NOT RECOMMENDED
git commit --no-verify -m "WIP: Temporary work"
```

**When to use**: ONLY for temporary checkpoints during refactoring

**NEVER use when**:
- Merging to main/production
- Creating releases
- Sharing with team

---

## Part 2: AI Assistant Enforcement

### ✅ Implemented Methods (Ranked by Effectiveness)

### 1. **`.clauderules` File** (Automatic, Most Effective) 🌟

**Location**: `/.clauderules`

**How it works**: Claude Code automatically reads this file at the start of every conversation.

**Contains**:
- Critical rules (zero hardcoded values, event-driven, CSS tokens, settings handlers)
- Pre-commit checklist
- Common mistakes to avoid
- Key file references

**Usage**: Automatic - no action needed from you.

**Effectiveness**: ⭐⭐⭐⭐⭐ (Always enforced)

---

### 2. **Custom Slash Command** (On-Demand)

**Location**: `/.claude/commands/enforce-rules.md`

**How it works**: Type `/enforce-rules` in any conversation to remind the AI of guidelines.

**Usage**:
```
/enforce-rules
```

**When to use**:
- Starting a new feature
- After switching contexts
- When you notice guideline violations

**Effectiveness**: ⭐⭐⭐⭐ (Manual trigger required)

---

### 3. **Pre-Commit Git Hook** (Automated Validation)

**Location**: `/.git/hooks/pre-commit`

**How it works**: Runs before every commit to check for violations.

**Checks for**:
- ❌ Hardcoded event names (should use Config.js)
- ⚠️ Direct module method calls (should use EventBus)
- ⚠️ Hardcoded colors in CSS (should use design tokens)
- ⚠️ Hardcoded spacing in CSS (should use design tokens)

**Usage**: Automatic on `git commit`

**Example output**:
```bash
🔍 Checking for guideline violations...
❌ ERROR: Hardcoded event names found (should use Config.js):
src/js/ui/UIController.js:45: emit('settings:changed', data)

Fix: Use window.appConfig.get('events.settings.changed')
```

**Effectiveness**: ⭐⭐⭐⭐⭐ (Catches violations before commit)

---

### 4. **ESLint Custom Rules** (IDE Integration)

**Location**: `/.eslintrc.js`

**How it works**: ESLint checks code as you type (if IDE integration enabled).

**Rules**:
- Forbids direct module method calls
- Forbids `settingsModule.setSetting()` direct calls
- Suggests EventBus alternatives

**Usage**:
```bash
npm run lint
```

**IDE Setup** (VS Code):
1. Install ESLint extension
2. Rules show inline errors/warnings

**Effectiveness**: ⭐⭐⭐⭐ (Real-time feedback in IDE)

---

### 5. **Documentation Structure** (Reference)

**Files**:
- `CLAUDE.md` - AI-specific guidance
- `docs/GUIDELINES.md` - Human/AI design principles
- `docs/README.md` - Documentation index

**How it works**: AI reads these files when needed for context.

**Usage**: Referenced automatically by AI when:
- Starting new sessions
- Answering architecture questions
- Making design decisions

**Effectiveness**: ⭐⭐⭐ (Background reference)

---

## 🎯 Recommended Workflow

### For You (Developer)

**Starting a new feature**:
1. AI automatically reads `.clauderules` ✅
2. Optionally run `/enforce-rules` for emphasis
3. Code as usual
4. `git commit` → pre-commit hook validates
5. `npm run lint` → ESLint validates

**If AI violates a guideline**:
1. Point it out immediately
2. Run `/enforce-rules` to remind
3. Reference specific section in `docs/GUIDELINES.md`
4. Add new rule to `.clauderules` if needed

**Adding new rules**:
1. Update `docs/GUIDELINES.md` (permanent reference)
2. Update `.clauderules` (AI enforcement)
3. Update pre-commit hook if automatable
4. Update ESLint if JavaScript-specific

---

## 📊 Violation Detection Matrix

| Violation Type | Detected By |
|----------------|-------------|
| Hardcoded event names | `.clauderules`, Pre-commit hook |
| Direct module calls | `.clauderules`, ESLint, Pre-commit hook |
| Hardcoded CSS colors | Pre-commit hook |
| Hardcoded CSS spacing | Pre-commit hook |
| Missing Config.js reference | `.clauderules`, Manual review |
| Wrong settings API | `.clauderules`, ESLint |

---

## 🛠️ Maintenance

### Update `.clauderules` when:
- New critical pattern established
- Common violations observed
- Architecture changes

### Update pre-commit hook when:
- New regex patterns needed
- False positives occur
- New violation types identified

### Update ESLint when:
- New JavaScript patterns forbidden
- IDE integration needed
- Syntax-level violations occur

---

## 🔍 Testing Enforcement

**Test the pre-commit hook**:
```bash
# Create a test file with violation
echo "window.eventBus.emit('settings:changed', data)" > test.js
git add test.js
git commit -m "Test"  # Should fail with error
```

**Test ESLint**:
```bash
npm run lint  # Should show violations
```

**Test slash command**:
```
/enforce-rules  # In Claude Code conversation
```

---

## 📈 Effectiveness Summary

| Method | Auto | Real-time | IDE | Blocking | Score |
|--------|------|-----------|-----|----------|-------|
| `.clauderules` | ✅ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| `/enforce-rules` | ❌ | ✅ | ❌ | ❌ | ⭐⭐⭐⭐ |
| Pre-commit hook | ✅ | ❌ | ❌ | ✅ | ⭐⭐⭐⭐⭐ |
| ESLint | ✅ | ✅ | ✅ | ❌ | ⭐⭐⭐⭐ |
| Documentation | ✅ | ❌ | ❌ | ❌ | ⭐⭐⭐ |

**Best combination**: `.clauderules` + Pre-commit hook + ESLint = 95% coverage

---

## 🚨 Known Limitations

1. **AI can still violate** if it misunderstands context
2. **Regex can have false positives** (edge cases)
3. **Some violations require human review** (architectural decisions)
4. **AI may rationalize violations** (ask for clarification if uncertain)

**Solution**: Always manually review AI-generated code before committing.

---

**Last Updated**: October 2025
**Maintained By**: Project Team
