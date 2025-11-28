# Development Guidelines

**High-level design principles and rules for developing the PTE Pronunciation Trainer.**

This document defines the **permanent design rules** that guide all development decisions. These principles ensure consistency, maintainability, and scalability across the entire codebase.

---

## Core Design Principles

### 1. Zero Hardcoded Values ⭐

**Rule**: ALL configuration values must be defined in `src/ts/shared/Config.ts`

**Why**: Single source of truth prevents inconsistencies and makes changes easy.

**Examples**:

✅ **Correct**:
```typescript
import { config } from '@/ts/shared/Config';
const speed = config.tts.speeds.normal;
```

❌ **Wrong**:
```typescript
const speed = 1.0;  // Hardcoded
```

---

### 2. React + Zustand Architecture ⭐

**Rule**: Use React for UI and Zustand for global state.

**Why**: React provides a declarative UI, while Zustand offers a simple, scalable state management solution without boilerplate.

**Pattern**:

```typescript
// ✅ CORRECT: Use Zustand hooks
const { isPlaying, togglePlay } = useAudioStore();
```

```typescript
// ❌ WRONG: Direct DOM manipulation or global variables
document.getElementById('play-btn').addEventListener('click', ...);
```

---

### 3. Component-Based Design

**Rule**: Build small, reusable components with Radix UI primitives.

**Why**: Promotes reusability, consistency, and accessibility.

**Structure**:
- `src/components/ui/`: Generic UI components (Button, Card, etc.)
- `src/components/practice/`: Feature-specific components (WordCard, etc.)

---

### 4. Tailwind CSS Styling

**Rule**: Use Tailwind utility classes and the `cn()` helper for conditional styling.

**Why**: Faster development, smaller bundle size, and consistent design system.

**Example**:
```tsx
<div className={cn("flex items-center gap-2", isActive && "text-primary")}>
  {children}
</div>
```

---

### 5. Type Safety (TypeScript)

**Rule**: All code must be strictly typed. No `any`.

**Why**: Prevents runtime errors and improves developer experience.

---

### 6. Data Management via Supabase

**Rule**: Use Supabase client for all data persistence and auth.

**Why**: robust backend-as-a-service with built-in security and realtime capabilities.

---

### 7. Error Handling

**Rule**: Use React Error Boundaries and try-catch blocks for async operations.

**Patterns**:
- Wrap API calls in try-catch.
- Display user-friendly error messages via toast notifications.
- Log errors to console (or monitoring service) for debugging.

---

## Terminology Standards

### "Category" Dual Meaning ⚠️

**Context 1: Filter Field** (✅ Current, keep):
```javascript
word.category = 'pte-beginner'  // Metadata for filtering
```

**Context 2: Navigation Sections** (❌ Legacy CCL, removed):
```javascript
// REMOVED: getPreviousCategory(), getNextCategory(), loadCategory()
```

**Current Model**: Users select **vocabulary books**, not categories.

---

## Code Quality Standards

### Naming Conventions

**Files**:
- PascalCase for classes: `PTEApp.js`, `SettingsModule.js`
- camelCase for utilities: `dataSchema.js`
- kebab-case for CSS: `practice-modes.css`

**Variables/Functions**:
- camelCase: `currentWord`, `loadDataset()`
- Private methods: `_validateSettings()`, `_getItemField()`
- Constants: `MAX_RETRIES`, `DEFAULT_SPEED`

**Events**:
- Namespace pattern: `domain:action[:modifier]`
- Examples: `settings:changed`, `audio:autoplay:started`

### Documentation

**Required Documentation**:
- JSDoc for all public methods
- Inline comments for complex logic
- Architecture diagrams for system design

**Example**:
```javascript
/**
 * Load vocabulary dataset from JSON file with retry logic
 * @param {string} mode - Learning mode ID (e.g., 'pte-fib-listening')
 * @returns {Promise<void>}
 * @throws {Error} If all retry attempts fail
 */
async loadDataset(mode) {
  // Implementation
}
```

### Testing

**Test Coverage Requirements**:
- Unit tests for utility functions
- Integration tests for module interactions
- Manual testing for browser-specific features (TTS)

**Test Organization**:
- Test files mirror source structure
- `src/js/utils/EventBus.js` → `tests/utils/EventBus.test.js`

---

## Data Pipeline Standards

### Data Source Requirements

**Markdown Format**:
- Must follow defined schema (`DataSchema.js`)
- Must include IPA pronunciation for vocabulary
- Must include metadata (difficulty, category)

**Processing Steps**:
1. Read Markdown source
2. Extract terms/sentences via extractor
3. Validate schema compliance
4. Transform to JSON
5. Write to `data/processed/`
6. Generate processing report

**Adding New Data Sources**:
1. Create Markdown file in `data/source/pte/`
2. Add to `Config.js` → `pipeline.registry[]`
3. Create/reuse extractor in `src/js/data/extractors/`
4. Run `npm run data:pte`
5. Validate with `npm run validate`

---

## Performance Guidelines

### Loading Optimization

- **Lazy load** datasets (load on-demand, not upfront)
- **Cache** datasets in memory after first load
- **Minify** JavaScript/CSS in production
- **Use Service Worker** for offline caching

### Runtime Optimization

- **Throttle** keyboard events (prevent spam)
- **Debounce** UI updates (batch changes)
- **Clean up** event listeners on module destroy
- **Limit** DOM queries (cache element references)

---

## Security Guidelines

### Data Validation

- ✅ Validate all user input
- ✅ Sanitize HTML before rendering
- ✅ Validate JSON schema on load
- ❌ Never use `eval()` or `innerHTML` with user data

### Storage Security

- ✅ Only store non-sensitive data in localStorage
- ✅ Validate data on restore (prevent corruption)
- ❌ Never store credentials or API keys

---

## Accessibility Guidelines

### CSS Accessibility

- Use `--touch-target-min: 44px` for buttons
- Support `prefers-color-scheme: dark`
- Support `prefers-contrast: high`
- Provide focus indicators for keyboard navigation

### Keyboard Shortcuts

All features accessible via keyboard:
- Space: Play/Pause
- Arrow keys: Navigation
- Escape: Close panels
- R: Repeat

---

## Version Control Standards

### Commit Messages

Format: `Type: Brief description`

**Types**:
- `Feat:` New feature
- `Fix:` Bug fix
- `Refactor:` Code restructuring
- `Docs:` Documentation changes
- `Style:` CSS/formatting changes
- `Test:` Test additions/changes

**Examples**:
- `Feat: Add WFD practice mode`
- `Fix: Progress counter now updates during playback`
- `Refactor: Extract duplicate TTS feedback code`

### Branch Strategy

- `main` - Production-ready code
- `dev` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

---

## Documentation Maintenance

### When to Update Documentation

Documentation must be updated whenever:

1. **Code Changes**
   - New modules/classes → Update `docs/API-REFERENCE.md` and `docs/ARCHITECTURE.md`
   - New features → Update `README.md` and `CHANGELOG.md`
   - Bug fixes → Update `CHANGELOG.md`
   - Configuration changes → Update `docs/GUIDELINES.md` if patterns change

2. **Architectural Changes**
   - New design patterns → Update `docs/GUIDELINES.md`
   - Module dependencies change → Update `docs/ARCHITECTURE.md`
   - Event system changes → Update `CLAUDE.md` event reference

3. **Version Releases**
   - Every release → Update `CHANGELOG.md` with version entry
   - Major versions → Update `README.md` version badge
   - Breaking changes → Update `docs/GUIDELINES.md` and migration guide

### Documentation Update Checklist

When making code changes, update these files:

**Always Update:**
- [ ] `CHANGELOG.md` - Add entry for every commit/PR
- [ ] Version number in `package.json`
- [ ] Version references in affected documentation

**Update If Applicable:**
- [ ] `README.md` - If user-facing features/setup changed
- [ ] `docs/GUIDELINES.md` - If design principles/patterns changed
- [ ] `docs/ARCHITECTURE.md` - If system design/modules changed
- [ ] `docs/API-REFERENCE.md` - If public APIs changed
- [ ] `CLAUDE.md` - If AI guidance/critical files changed
- [ ] `docs/DEPLOYMENT.md` - If build/deploy process changed

### Documentation File Organization

**Permanent Documentation** (keep updated):
```
Root:
  README.md              - Main entry point, features, quick start
  CHANGELOG.md           - Version history (update every release)
  CLAUDE.md              - AI assistant guidance

docs/:
  GUIDELINES.md          - Design principles and development rules
  ENFORCING-GUIDELINES.md - Enforcement methods (pre-commit, ESLint)
  ARCHITECTURE.md        - Technical architecture and system design
  API-REFERENCE.md       - Complete API documentation
  DEPLOYMENT.md          - Deployment and production setup
  TROUBLESHOOTING.md     - Common issues and solutions
  README.md              - Documentation index
```

**Temporary Documentation** (delete after completion):
```
docs/investigations/:
  BUGFIX-*.md            - Bug investigation logs (delete when fixed)
  FEATURE-*.md           - Feature exploration (delete when merged)
  AUDIT-*.md             - Audit reports (archive after release)
```

**Cleanup Rules:**
- Delete investigation logs after bug is fixed and changes are committed
- Archive audit reports to `docs/investigations/` after release
- Move completed feature docs to permanent locations or delete
- Keep `docs/investigations/` clean - max 3-5 temporary files

### Version Number Updates

Update version numbers in these locations:

1. **package.json** - `"version": "2.5.4"`
2. **README.md** - Version badge in header
3. **docs/GUIDELINES.md** - Footer version
4. **docs/README.md** - Footer version
5. **CLAUDE.md** - "Current Version" in header
6. **CHANGELOG.md** - New version entry header

**Version Numbering**: Follow [Semantic Versioning](https://semver.org/)
- **Major** (3.0.0): Breaking changes
- **Minor** (2.6.0): New features, backward compatible
- **Patch** (2.5.5): Bug fixes, backward compatible

### Documentation Update Process

**For Every Commit:**
1. Make code changes
2. Update `CHANGELOG.md` with brief description
3. Update relevant technical docs (API, Architecture)
4. Run pre-commit hook (checks for violations)
5. Commit with descriptive message

**For Version Releases:**
1. Finalize all code changes
2. Update version in all 6 locations (see above)
3. Write comprehensive `CHANGELOG.md` entry
4. Update `README.md` if user-facing changes
5. Review and update all affected documentation
6. Create git tag: `git tag v2.5.4`
7. Clean up `docs/investigations/` (archive or delete)

**For Major Changes:**
1. Create investigation document in `docs/investigations/`
2. Document current state and proposed changes
3. Update `GUIDELINES.md` with new patterns
4. Update `ARCHITECTURE.md` with design changes
5. Update `CLAUDE.md` with AI guidance changes
6. After completion, archive investigation doc or delete

### When to Update Guidelines

This document (GUIDELINES.md) should be updated when:

1. **New architectural patterns** are introduced
2. **Design principles change** (rare, requires team discussion)
3. **Best practices evolve** based on lessons learned
4. **New standards** are adopted (e.g., new CSS methodology)

**Process**:
1. Propose change in team discussion
2. Update `docs/GUIDELINES.md`
3. Update `CLAUDE.md` if AI guidance changes
4. Update `docs/README.md` to reflect new documentation
5. Notify team of guideline changes
6. Update version and "Last Updated" date

---

## Quick Reference Checklist

Before committing code, verify:

- [ ] No hardcoded values (check Config.js)
- [ ] All inter-module communication via EventBus
- [ ] Event names defined in Config.js
- [ ] CSS uses design tokens (no magic numbers)
- [ ] Dependencies injected via constructor
- [ ] Error handling in place (try-catch, validation)
- [ ] State persisted appropriately
- [ ] JSDoc for public methods
- [ ] Tests pass (`npm test`)

---

**Last Updated**: October 2025
**Version**: 2.5.4
**Status**: ✅ Active & Enforced
