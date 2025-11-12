# 🔧 Development Process

**PTE Pronunciation Trainer - Day-to-Day Development Workflow**

This document provides detailed guidance for daily development activities, code standards, Git workflow, code review process, and release procedures.

---

## 📋 Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Daily Development Workflow](#daily-development-workflow)
- [Git Workflow](#git-workflow)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Release Process](#release-process)
- [Hotfix Process](#hotfix-process)
- [Common Development Tasks](#common-development-tasks)

---

## 💻 Development Environment Setup

### Prerequisites

**Required:**
- **Node.js** ≥ 16.0.0
- **npm** ≥ 8.0.0
- **Git** ≥ 2.30.0

**Recommended:**
- **VSCode** (or preferred IDE)
- **Chrome** (for testing)

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/ccl-pronunciation-trainer.git
cd ccl-pronunciation-trainer

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Process data
npm run data:pte

# 5. Compile TypeScript
npm run compile:ts

# 6. Start dev server
npm run dev

# 7. Open browser
# http://localhost:3001
```

### VSCode Extensions (Recommended)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "vitest.explorer"
  ]
}
```

### Environment Variables

**Required for Development:**
```bash
# Free - No credit card required
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional - Premium features
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Optional - Database
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

---

## 🔄 Daily Development Workflow

### Morning Routine

```bash
# 1. Update local repository
git checkout main
git pull origin main

# 2. Check for dependency updates
npm outdated

# 3. Create feature branch
git checkout -b feature/my-feature

# 4. Start dev server
npm run dev
```

### Development Loop

```
┌──────────────────────────────────────┐
│         DEVELOPMENT LOOP             │
└──────────────────────────────────────┘

1. Make changes to code
   ↓
2. Vite HMR auto-reloads (instant feedback)
   ↓
3. Test in browser
   ↓
4. [Satisfied?]
   ├─ No  → Go to step 1
   └─ Yes → Continue
            ↓
5. Compile TypeScript (if src/ts/ changed)
   npm run compile:ts
   ↓
6. Run tests
   npm test
   ↓
7. [Tests pass?]
   ├─ No  → Fix tests, go to step 1
   └─ Yes → Continue
            ↓
8. Lint code
   npm run lint
   ↓
9. [Lint pass?]
   ├─ No  → Fix lint errors, go to step 1
   └─ Yes → Continue
            ↓
10. Commit changes
    git add .
    git commit -m "feat: add feature"
    ↓
11. Push to remote
    git push -u origin feature/my-feature
    ↓
12. Create Pull Request
    ↓
13. Request code review
```

### Evening Routine

```bash
# 1. Ensure all work is committed
git status

# 2. Push any outstanding commits
git push

# 3. Create PR if ready
# (or mark as draft if WIP)

# 4. Stop dev server
# Ctrl+C
```

---

## 🌳 Git Workflow

### Branch Naming Convention

```
Format: <type>/<description>

Types:
- feature/   → New features
- fix/       → Bug fixes
- refactor/  → Code refactoring
- docs/      → Documentation
- test/      → Test additions
- chore/     → Maintenance tasks

Examples:
✅ feature/ai-tutor-chat
✅ fix/pronunciation-scoring-error
✅ refactor/zustand-store-optimization
✅ docs/api-reference-update
✅ test/add-component-tests
✅ chore/update-dependencies

❌ my-branch
❌ fix-bug
❌ update
```

### Commit Message Convention

**Format:** `<type>(<scope>): <subject>`

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance
- `style:` Formatting
- `perf:` Performance improvement

**Examples:**
```bash
✅ feat(ai): add pronunciation scoring with Gemini
✅ fix(audio): resolve TTS voice selection issue
✅ refactor(stores): optimize Zustand state updates
✅ docs(lifecycle): add comprehensive planning docs
✅ test(components): add WordCard integration tests
✅ chore(deps): upgrade React to 19.2.0
✅ style(components): format code with Prettier
✅ perf(bundle): reduce bundle size by 30%

❌ added feature
❌ fix bug
❌ updates
❌ WIP
```

### Git Commands Reference

#### Basic Workflow
```bash
# Check status
git status

# Stage changes
git add .                    # All changes
git add src/components/      # Specific directory
git add src/App.tsx          # Specific file

# Commit
git commit -m "feat: add feature"

# Push
git push                     # Current branch
git push -u origin branch    # First push with tracking

# Pull latest
git pull origin main
```

#### Branch Management
```bash
# Create and switch
git checkout -b feature/my-feature

# Switch branches
git checkout main
git checkout feature/my-feature

# List branches
git branch                   # Local
git branch -r                # Remote
git branch -a                # All

# Delete branch
git branch -d feature/my-feature    # Local (safe)
git branch -D feature/my-feature    # Local (force)
git push origin --delete feature/my-feature  # Remote
```

#### Sync with Main
```bash
# Update main
git checkout main
git pull origin main

# Rebase feature branch
git checkout feature/my-feature
git rebase main

# Or merge (less preferred)
git checkout feature/my-feature
git merge main
```

#### Undo Changes
```bash
# Discard unstaged changes
git checkout -- file.ts

# Unstage file
git reset HEAD file.ts

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert commit (create new commit)
git revert <commit-hash>
```

---

## 📏 Code Standards

### TypeScript Standards

**1. Type Safety**
```typescript
// ✅ CORRECT: Explicit types
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

function getUser(id: string): User | null {
  // ...
}

// ❌ WRONG: Any types
function getUser(id: any): any {
  // ...
}
```

**2. Naming Conventions**
```typescript
// Interfaces: PascalCase
interface UserProfile { }

// Types: PascalCase
type UserRole = 'admin' | 'user';

// Functions: camelCase
function getUserProfile() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Components: PascalCase
const WordCard: React.FC = () => { };

// Variables: camelCase
const currentUser = getUser();
```

**3. File Organization**
```typescript
// Order within file:
1. Imports (external)
2. Imports (internal)
3. Types/Interfaces
4. Constants
5. Main code
6. Exports

// Example:
import React from 'react';
import { useAppStore } from '../ts/stores';

interface Props {
  word: string;
}

const DEFAULT_SPEED = 1.0;

export const WordCard: React.FC<Props> = ({ word }) => {
  // Component code
};
```

### React Standards

**1. Functional Components**
```typescript
// ✅ CORRECT: Functional component with TypeScript
interface Props {
  word: string;
  onSpeak: (word: string) => void;
}

export const WordCard: React.FC<Props> = ({ word, onSpeak }) => {
  const handleClick = () => onSpeak(word);

  return (
    <div onClick={handleClick}>
      {word}
    </div>
  );
};

// ❌ WRONG: Class component
class WordCard extends React.Component { }
```

**2. Hooks Rules**
```typescript
// ✅ CORRECT: Hooks at top level
const MyComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  const { user } = useAppStore((state) => state.auth);

  useEffect(() => {
    // Effect logic
  }, []);

  return <div>{count}</div>;
};

// ❌ WRONG: Hooks in conditionals
const MyComponent: React.FC = () => {
  if (condition) {
    const [count, setCount] = useState(0);  // ❌
  }
};
```

**3. Component Size**
```typescript
// Keep components small (<300 lines)
// If larger, split into sub-components

// ✅ CORRECT: Split into smaller components
const WordCard = () => (
  <Card>
    <WordHeader />
    <WordBody />
    <WordFooter />
  </Card>
);

// ❌ WRONG: 500-line monolithic component
const WordCard = () => {
  // ... 500 lines of code
};
```

### CSS Standards

**1. Use Design Tokens**
```css
/* ✅ CORRECT: Use CSS variables */
.button {
  background: var(--primary-color);
  padding: var(--space-md);
  border-radius: var(--radius-sm);
}

/* ❌ WRONG: Hardcoded values */
.button {
  background: #7C3AED;
  padding: 16px;
  border-radius: 4px;
}
```

**2. Tailwind Utility Classes**
```typescript
// ✅ CORRECT: Tailwind utilities
<div className="p-4 bg-slate-900 rounded-md">

// ❌ WRONG: Inline styles
<div style={{ padding: '16px', background: '#0f172a' }}>
```

### Testing Standards

**1. Test Naming**
```typescript
// ✅ CORRECT: Descriptive test names
describe('WordCard', () => {
  it('should render word with IPA pronunciation', () => { });
  it('should call onSpeak when button clicked', () => { });
  it('should disable button when speaking', () => { });
});

// ❌ WRONG: Vague test names
describe('WordCard', () => {
  it('test1', () => { });
  it('works', () => { });
});
```

**2. AAA Pattern**
```typescript
it('should calculate accuracy correctly', () => {
  // Arrange
  const completed = 10;
  const correct = 8;

  // Act
  const result = calculateAccuracy(completed, correct);

  // Assert
  expect(result).toBe(80);
});
```

---

## 🔄 Pull Request Process

### Creating a PR

**1. Preparation**
```bash
# Ensure all tests pass
npm test

# Ensure lint passes
npm run lint

# Compile TypeScript
npm run compile:ts

# Ensure branch is up to date
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main
```

**2. Push to Remote**
```bash
git push -u origin feature/my-feature
```

**3. Create PR (GitHub UI)**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [x] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Added AI Tutor Chat UI component
- Integrated with /api/ai/chat endpoint
- Added markdown rendering with react-markdown
- Added quick action buttons

## Testing
- [x] Unit tests added/updated
- [x] Component tests added/updated
- [x] Manual testing completed
- [x] Browser compatibility tested

## Screenshots (if applicable)
[Attach screenshots]

## Checklist
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Comments added to complex code
- [x] Documentation updated
- [x] No console errors
- [x] Tests pass
- [x] Lint passes
```

### PR Title Format

```
Format: <type>(<scope>): <description>

Examples:
✅ feat(ai): add AI Tutor Chat UI component
✅ fix(audio): resolve TTS voice selection bug
✅ refactor(stores): optimize state management
✅ docs(lifecycle): add development process guide
```

---

## 👀 Code Review Guidelines

### For Authors

**Before Requesting Review:**
- [ ] Self-review completed
- [ ] All tests pass
- [ ] Code is well-commented
- [ ] Documentation updated
- [ ] No console logs/debuggers
- [ ] No hardcoded values
- [ ] Follows code standards

**During Review:**
- Respond to all comments
- Ask for clarification if needed
- Don't take feedback personally
- Be open to suggestions
- Make requested changes promptly

### For Reviewers

**What to Check:**

**1. Functionality**
- [ ] Code does what it claims
- [ ] Edge cases handled
- [ ] Error handling present

**2. Code Quality**
- [ ] Readable and maintainable
- [ ] No code duplication
- [ ] Appropriate abstractions
- [ ] Well-structured

**3. Testing**
- [ ] Tests present and meaningful
- [ ] Test coverage adequate
- [ ] Tests pass

**4. Standards**
- [ ] Follows TypeScript standards
- [ ] Follows React best practices
- [ ] Uses design tokens
- [ ] No hardcoded values

**5. Performance**
- [ ] No unnecessary re-renders
- [ ] Efficient algorithms
- [ ] No memory leaks

**6. Security**
- [ ] No XSS vulnerabilities
- [ ] No SQL injection risks
- [ ] API keys not exposed
- [ ] User input validated

**Review Comment Template:**
```markdown
## Issue: [Brief description]

**Current code:**
```typescript
// Problem code
```

**Suggested fix:**
```typescript
// Better approach
```

**Reason:**
[Why this is better]

**Priority:** [Low/Medium/High/Blocking]
```

---

## 🚀 Release Process

### Release Types

**1. Patch Release (v3.0.X)**
- Bug fixes
- Minor improvements
- No breaking changes

**2. Minor Release (v3.X.0)**
- New features
- Backward compatible
- No breaking changes

**3. Major Release (vX.0.0)**
- Breaking changes
- Major feature additions
- API changes

### Release Checklist

**Pre-Release:**
- [ ] All PRs merged to main
- [ ] All tests passing
- [ ] Coverage ≥ 80%
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json

**Release:**
```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Update CHANGELOG.md
# Add release notes

# 3. Commit changes
git add .
git commit -m "chore: release v3.0.1"

# 4. Tag release
git tag v3.0.1

# 5. Push to remote
git push origin main --tags

# 6. Deploy to production
# (Vercel auto-deploys on push to main)
```

**Post-Release:**
- [ ] Monitor error rates
- [ ] Check analytics
- [ ] Verify deployment
- [ ] Create GitHub release
- [ ] Announce release (if major)

---

## 🔥 Hotfix Process

**For Critical Production Bugs:**

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Make minimal fix
# Edit only necessary files

# 3. Test thoroughly
npm test
npm run lint

# 4. Commit
git commit -m "fix: critical bug description"

# 5. Push
git push -u origin hotfix/critical-bug-fix

# 6. Create PR with "HOTFIX" label
# Request immediate review

# 7. Fast-track review and merge

# 8. Deploy immediately

# 9. Monitor closely
```

---

## 🛠️ Common Development Tasks

### Add a New React Component

```bash
# 1. Create component file
touch src/components/MyComponent.tsx

# 2. Create test file
touch src/components/MyComponent.test.tsx

# 3. Implement component
# See code standards above

# 4. Write tests
npm test -- MyComponent

# 5. Import in parent component
# Add to src/App.tsx or other parent

# 6. Test in browser
npm run dev
```

### Add a New API Endpoint

```bash
# 1. Create API file
touch api/my-endpoint.ts

# 2. Implement handler
# See API patterns in ARCHITECTURE-DESIGN.md

# 3. Test locally
curl -X POST http://localhost:3001/api/my-endpoint

# 4. Add error handling
# See error handling patterns

# 5. Deploy
git add api/my-endpoint.ts
git commit -m "feat(api): add my-endpoint"
git push
```

### Add a New Zustand Store Slice

```bash
# 1. Update types
# Edit src/ts/stores/types.ts

# 2. Add slice to store
# Edit src/ts/stores/index.ts

# 3. Write tests
# Create src/ts/stores/mySlice.test.ts

# 4. Use in components
const { data } = useAppStore((state) => state.mySlice);

# 5. Test
npm test
```

### Update Dependencies

```bash
# 1. Check for updates
npm outdated

# 2. Update specific package
npm update package-name

# 3. Update all patch/minor
npm update

# 4. Update major (careful!)
npm install package-name@latest

# 5. Test thoroughly
npm test
npm run dev

# 6. Commit
git commit -m "chore(deps): update dependencies"
```

### Debug Production Issues

```bash
# 1. Check Vercel logs
# Visit Vercel dashboard

# 2. Check analytics
# Visit PostHog dashboard

# 3. Reproduce locally
npm run dev

# 4. Add logging
console.log('[DEBUG]', data);

# 5. Deploy debug version
git push

# 6. Monitor logs

# 7. Fix issue

# 8. Deploy fix

# 9. Remove debug logs
```

---

## 📚 Related Documents

- **[LIFECYCLE-OVERVIEW.md](./LIFECYCLE-OVERVIEW.md)** - Project lifecycle phases
- **[ARCHITECTURE-DESIGN.md](./ARCHITECTURE-DESIGN.md)** - System architecture
- **[TESTING-STRATEGY.md](./TESTING-STRATEGY.md)** - Testing approach
- **[WORKFLOW-DIAGRAMS.md](./WORKFLOW-DIAGRAMS.md)** - Visual workflows
- **[../GUIDELINES.md](../GUIDELINES.md)** - Design principles

---

## 💡 Tips & Best Practices

### Daily Tips

1. **Pull before you push** - Always `git pull` before starting work
2. **Commit often** - Small, focused commits are better
3. **Test locally** - Don't rely on CI to catch errors
4. **Read error messages** - They usually tell you what's wrong
5. **Ask for help** - Don't struggle alone for hours

### Code Quality Tips

1. **Keep functions small** - <50 lines ideally
2. **Use meaningful names** - `getUserProfile()` not `get()`
3. **Write comments for why, not what** - Code shows what, comments explain why
4. **Delete dead code** - Don't comment out, delete it (Git remembers)
5. **Refactor as you go** - Leave code better than you found it

### Performance Tips

1. **Measure before optimizing** - Profile first, optimize second
2. **Use React.memo wisely** - Only when proven necessary
3. **Lazy load routes** - Split code at route boundaries
4. **Debounce user input** - Especially for search/filter
5. **Monitor bundle size** - Keep it under 300KB

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** ✅ Complete
