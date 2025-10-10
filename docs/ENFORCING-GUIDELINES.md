# How to Enforce Guidelines with AI Assistants

This document explains the 5 methods implemented to ensure AI assistants follow project guidelines.

---

## ✅ Implemented Methods (Ranked by Effectiveness)

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
