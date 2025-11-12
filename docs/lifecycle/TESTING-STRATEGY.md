# 🧪 Testing Strategy

**PTE Pronunciation Trainer - Comprehensive Testing Approach**

This document outlines the complete testing strategy, covering unit tests, integration tests, E2E tests, and manual testing procedures.

---

## 📋 Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Pyramid](#testing-pyramid)
- [Test Types](#test-types)
- [Testing Tools](#testing-tools)
- [Unit Testing](#unit-testing)
- [Component Testing](#component-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Manual Testing](#manual-testing)
- [Coverage Requirements](#coverage-requirements)
- [Mocking Strategies](#mocking-strategies)
- [Testing Workflows](#testing-workflows)
- [Continuous Integration](#continuous-integration)

---

## 🎯 Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**
   - Test what the code does, not how it does it
   - Tests should survive refactoring
   - Focus on user-facing behavior

2. **Fast Feedback**
   - Unit tests run in <1 second
   - Component tests run in <5 seconds
   - Full suite completes in <30 seconds

3. **Reliable Tests**
   - No flaky tests
   - No test interdependencies
   - Deterministic results

4. **Readable Tests**
   - Clear test names describing behavior
   - Arrange-Act-Assert pattern
   - Minimal setup, focused assertions

5. **Maintainable Tests**
   - DRY principle (shared test utilities)
   - Test factories for complex objects
   - Update tests with code changes

### Testing Goals

- ✅ **80% code coverage** (target)
- ✅ **100% critical path coverage** (auth, payment, data loss)
- ✅ **Zero flaky tests**
- ✅ **Sub-30-second test suite**
- ✅ **Tests as documentation**

---

## 🏗️ Testing Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲           ~5% (10 tests)
                 ╱──────╲          Critical user flows
                ╱        ╲
               ╱Integration╲       ~15% (30 tests)
              ╱────────────╲       Module interactions
             ╱              ╲
            ╱  Component     ╲     ~30% (60 tests)
           ╱────────────────╲     React components
          ╱                  ╲
         ╱      Unit          ╲    ~50% (100 tests)
        ╱────────────────────╲   Functions, services
       ────────────────────────
```

### Distribution Strategy

| Test Type | Count | Coverage | Execution Time | Purpose |
|-----------|-------|----------|----------------|---------|
| **Unit** | 100 | 50% | <1s | Business logic, utilities |
| **Component** | 60 | 30% | <5s | React components, UI |
| **Integration** | 30 | 15% | <10s | Module interactions |
| **E2E** | 10 | 5% | <30s | Critical user flows |
| **Total** | 200 | 100% | <30s | Full coverage |

---

## 🧩 Test Types

### 1. Unit Tests
**What:** Test individual functions and classes in isolation
**When:** For all business logic, utilities, and services
**Example:** Testing `TTSEngine.pronounceWord()`

### 2. Component Tests
**What:** Test React components with user interactions
**When:** For all UI components
**Example:** Testing `WordCard` renders correctly and responds to clicks

### 3. Integration Tests
**What:** Test multiple modules working together
**When:** For critical module interactions
**Example:** Testing `VocabularyManager` + `DatasetManager` loading flow

### 4. E2E Tests
**What:** Test complete user workflows in a browser
**When:** For critical user journeys
**Example:** Sign up → Practice 10 words → View progress

### 5. Manual Tests
**What:** Human testing of features that are hard to automate
**When:** AI features (Gemini), TTS quality, UI/UX review
**Example:** Testing AI Tutor conversation quality

---

## 🛠️ Testing Tools

### Primary Stack

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 4.0.8 | Test runner (fast, Vite-native) |
| **React Testing Library** | 16.3.0 | Component testing |
| **jsdom** | 27.1.0 | DOM simulation |
| **@testing-library/user-event** | 14.6.1 | User interaction simulation |
| **@testing-library/jest-dom** | 6.9.1 | DOM matchers |

### Why Vitest?

✅ **Faster than Jest** - Uses Vite's transformation pipeline
✅ **Vite-native** - Same config as dev environment
✅ **ESM support** - Modern JavaScript modules
✅ **Compatible with Jest** - Same API, easy migration
✅ **Built-in coverage** - No extra setup

### Configuration

**Location:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types.ts',
      ],
    },
  },
});
```

---

## 🔬 Unit Testing

### What to Unit Test

✅ **Business Logic**
- Data transformations
- Calculations (e.g., accuracy, progress)
- Validations
- Error handling

✅ **Utilities**
- String formatters
- Date/time utilities
- Storage wrappers

✅ **Services (Pure Functions)**
- API response parsers
- Data extractors
- Configuration loaders

❌ **Don't Unit Test**
- React components (use component tests instead)
- External libraries (trust them)
- Simple getters/setters

### Unit Test Structure

```typescript
// Arrange-Act-Assert pattern
import { describe, it, expect } from 'vitest';
import { calculateAccuracy } from './progressUtils';

describe('calculateAccuracy', () => {
  it('should calculate accuracy correctly with all correct', () => {
    // Arrange
    const itemsCompleted = 10;
    const itemsCorrect = 10;

    // Act
    const accuracy = calculateAccuracy(itemsCompleted, itemsCorrect);

    // Assert
    expect(accuracy).toBe(100);
  });

  it('should calculate accuracy correctly with some incorrect', () => {
    // Arrange
    const itemsCompleted = 10;
    const itemsCorrect = 8;

    // Act
    const accuracy = calculateAccuracy(itemsCompleted, itemsCorrect);

    // Assert
    expect(accuracy).toBe(80);
  });

  it('should return 0 when no items completed', () => {
    // Arrange
    const itemsCompleted = 0;
    const itemsCorrect = 0;

    // Act
    const accuracy = calculateAccuracy(itemsCompleted, itemsCorrect);

    // Assert
    expect(accuracy).toBe(0);
  });

  it('should handle edge case of more correct than completed', () => {
    // Arrange (invalid input)
    const itemsCompleted = 5;
    const itemsCorrect = 10;

    // Act & Assert
    expect(() => {
      calculateAccuracy(itemsCompleted, itemsCorrect);
    }).toThrow('itemsCorrect cannot exceed itemsCompleted');
  });
});
```

### Test Naming Convention

```
Format: should [expected behavior] when [condition]

Examples:
✅ should return empty array when no items match
✅ should throw error when input is invalid
✅ should call callback with correct arguments
✅ should update state when action is dispatched

❌ testCalculateAccuracy
❌ test1
❌ it works
```

---

## ⚛️ Component Testing

### What to Component Test

✅ **Rendering**
- Component renders without crashing
- Correct content displayed
- Conditional rendering works

✅ **User Interactions**
- Button clicks
- Form submissions
- Keyboard events

✅ **Props**
- Different prop values render correctly
- Optional props work
- Prop validation

✅ **State Updates**
- Component state changes correctly
- Zustand store updates trigger re-renders

### Component Test Structure

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { WordCard } from './WordCard';

describe('WordCard', () => {
  const mockWord = {
    word: 'ubiquitous',
    ipa: '/juːˈbɪkwɪtəs/',
    phonetic: 'yoo-BIK-wi-tuhs',
    difficulty: 'hard',
  };

  it('should render word with IPA and phonetic', () => {
    // Arrange & Act
    render(<WordCard word={mockWord} />);

    // Assert
    expect(screen.getByText('ubiquitous')).toBeInTheDocument();
    expect(screen.getByText('/juːˈbɪkwɪtəs/')).toBeInTheDocument();
    expect(screen.getByText('yoo-BIK-wi-tuhs')).toBeInTheDocument();
  });

  it('should show difficulty badge', () => {
    // Arrange & Act
    render(<WordCard word={mockWord} />);

    // Assert
    const badge = screen.getByText('HARD');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('difficulty-hard');
  });

  it('should call onSpeak when speak button clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const onSpeak = vi.fn();
    render(<WordCard word={mockWord} onSpeak={onSpeak} />);

    // Act
    const speakButton = screen.getByRole('button', { name: /speak/i });
    await user.click(speakButton);

    // Assert
    expect(onSpeak).toHaveBeenCalledTimes(1);
    expect(onSpeak).toHaveBeenCalledWith(mockWord);
  });

  it('should disable speak button when speaking', () => {
    // Arrange & Act
    render(<WordCard word={mockWord} isSpeaking={true} />);

    // Assert
    const speakButton = screen.getByRole('button', { name: /speaking/i });
    expect(speakButton).toBeDisabled();
  });
});
```

### Testing with Zustand

```typescript
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../ts/stores';

describe('Zustand Store', () => {
  it('should start autoplay', () => {
    // Arrange
    const { result } = renderHook(() => useAppStore());

    // Act
    act(() => {
      result.current.audio.startAutoPlay();
    });

    // Assert
    expect(result.current.audio.isAutoPlaying).toBe(true);
    expect(result.current.audio.autoPlayEnabled).toBe(true);
    expect(result.current.audio.isPaused).toBe(false);
  });
});
```

---

## 🔗 Integration Testing

### What to Integration Test

✅ **Module Interactions**
- Services calling other services
- Store updates triggering component re-renders
- API calls with state management

✅ **Data Flow**
- Loading data → storing in Zustand → displaying in component
- User action → API call → state update → UI update

✅ **Error Handling**
- API errors propagate correctly
- Error boundaries catch errors
- Fallback UI renders

### Integration Test Example

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './App';
import { useAppStore } from './ts/stores';

// Mock API
vi.mock('./ts/data/DatasetManager', () => ({
  loadData: vi.fn(() => Promise.resolve([
    { word: 'test', ipa: '/test/', difficulty: 'easy' }
  ])),
}));

describe('Vocabulary Loading Integration', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.getState().vocabulary.clearDataset();
  });

  it('should load vocabulary and display in WordCard', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    // Act - Select vocabulary mode
    const modeSelector = screen.getByLabelText(/practice mode/i);
    await user.selectOptions(modeSelector, 'pte-beginner');

    // Assert - Wait for data to load and display
    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('/test/')).toBeInTheDocument();
    });

    // Assert - Check store state
    const store = useAppStore.getState();
    expect(store.vocabulary.currentDataset).toHaveLength(1);
    expect(store.vocabulary.mode).toBe('pte-beginner');
  });

  it('should handle API error gracefully', async () => {
    // Arrange - Mock API error
    const DatasetManager = await import('./ts/data/DatasetManager');
    vi.mocked(DatasetManager.loadData).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<App />);
    const user = userEvent.setup();

    // Act
    const modeSelector = screen.getByLabelText(/practice mode/i);
    await user.selectOptions(modeSelector, 'pte-beginner');

    // Assert - Error message displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    // Assert - Store has error
    const store = useAppStore.getState();
    expect(store.vocabulary.error).toBe('Network error');
  });
});
```

---

## 🌐 E2E Testing

### E2E Test Scope

**Critical User Flows:**
1. Sign up → Verify email → First practice session
2. Practice 10 words → Complete session → View progress
3. Change settings → Resume practice → Settings persisted
4. AI recommendations → Click recommendation → Practice suggested items
5. Premium TTS → Select voice → Hear pronunciation

### E2E Testing Tools (Future)

**Recommended:** Playwright or Cypress
**Current:** Manual testing (E2E infra not set up yet)

### Example E2E Test (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('complete practice session flow', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('https://localhost:3001');

  // 2. Select vocabulary mode
  await page.selectOption('[aria-label="Practice mode"]', 'pte-beginner');

  // 3. Start autoplay
  await page.click('button:has-text("Play")');

  // 4. Wait for 10 words to complete
  await page.waitForSelector('text=/10 \\/ 383/', { timeout: 30000 });

  // 5. Navigate to Progress tab
  await page.click('button:has-text("Progress")');

  // 6. Verify progress tracker shows data
  await expect(page.locator('text=/Words Practiced: 10/i')).toBeVisible();
  await expect(page.locator('text=/Accuracy:/i')).toBeVisible();
});
```

---

## 🖐️ Manual Testing

### What Requires Manual Testing

1. **AI Quality** - Gemini responses, conversation quality
2. **TTS Quality** - Voice clarity, pronunciation accuracy
3. **UI/UX** - Visual design, user experience
4. **Cross-browser** - Chrome, Firefox, Safari, Edge
5. **Mobile** - Touch interactions, responsive layout
6. **Accessibility** - Screen readers, keyboard navigation

### Manual Testing Checklist

#### Before Each Release

**Functionality:**
- [ ] All practice modes work (Vocabulary, RS, ASQ, WFD)
- [ ] Audio playback works (browser TTS + premium)
- [ ] AI recommendations load and make sense
- [ ] AI Tutor chat responds appropriately
- [ ] Pronunciation scoring provides useful feedback
- [ ] Settings persist across page refreshes
- [ ] Progress tracking accurate
- [ ] Authentication works (sign up, sign in, sign out)

**Cross-Browser:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Responsive:**
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Touch targets ≥ 44x44px

**Performance:**
- [ ] First load < 3 seconds
- [ ] Subsequent loads < 1 second (cached)
- [ ] TTS latency < 500ms
- [ ] No memory leaks during practice session

---

## 📊 Coverage Requirements

### Overall Coverage Target: 80%

| Component Type | Coverage Target | Current | Priority |
|----------------|----------------|---------|----------|
| **Business Logic** (src/ts/core, utils) | 90% | 70% | HIGH |
| **React Components** (src/components) | 75% | 40% | HIGH |
| **Services** (src/ts/audio, ai, supabase) | 80% | 60% | MEDIUM |
| **API Endpoints** (api/) | 70% | 30% | MEDIUM |
| **Data Pipeline** (src/ts/data) | 80% | 50% | LOW |

### Critical Path Coverage: 100%

**Must have 100% coverage:**
- Authentication flow (sign up, sign in, sign out)
- Data loading (vocabulary, practice modes)
- Progress tracking (completedItems, accuracy)
- Payment flow (premium TTS subscription) - future
- Data synchronization (local ↔ Supabase)

### Coverage Report

**Generate:**
```bash
npm run test:coverage
```

**View:**
```bash
open coverage/index.html
```

**CI Integration:**
- Coverage report uploaded to CodeCov (future)
- PR fails if coverage drops below 80%

---

## 🎭 Mocking Strategies

### What to Mock

1. **External APIs**
   - Google Gemini API
   - AWS Polly API
   - Supabase API

2. **Browser APIs**
   - `speechSynthesis` (Web Speech API)
   - `localStorage`
   - `fetch`

3. **Time-dependent code**
   - `Date.now()`
   - `setTimeout`, `setInterval`

4. **Random values**
   - `Math.random()`
   - UUIDs

### Mock Examples

#### Mocking Fetch (API Calls)

```typescript
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Setup mock response
vi.mocked(fetch).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ recommendations: [...] }),
} as Response);

// Test code that uses fetch
const result = await getRecommendations();

// Assert
expect(fetch).toHaveBeenCalledWith('/api/ai-recommendations', {
  method: 'POST',
  body: JSON.stringify({ userProgress }),
});
expect(result).toEqual({ recommendations: [...] });
```

#### Mocking Browser TTS

```typescript
import { vi } from 'vitest';

// Mock speechSynthesis
global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [
    { name: 'Google UK English Female', lang: 'en-GB' },
  ]),
} as any;

// Test TTS
TTSEngine.speak('test');

// Assert
expect(speechSynthesis.speak).toHaveBeenCalled();
```

#### Mocking Zustand Store

```typescript
import { vi } from 'vitest';
import { useAppStore } from '../ts/stores';

// Mock specific store slice
vi.mock('../ts/stores', () => ({
  useAppStore: () => ({
    audio: {
      isAutoPlaying: false,
      startAutoPlay: vi.fn(),
    },
    vocabulary: {
      currentItem: { word: 'test' },
    },
  }),
}));
```

#### Mocking Supabase

```typescript
// tests/__mocks__/supabaseServices.js
export const authService = {
  signIn: vi.fn(() => Promise.resolve({ success: true })),
  signOut: vi.fn(() => Promise.resolve({ success: true })),
  getUser: vi.fn(() => Promise.resolve(null)),
};

export const syncService = {
  syncProgress: vi.fn(() => Promise.resolve({ success: true })),
};
```

---

## 🔄 Testing Workflows

### TDD Workflow (Recommended)

```
1. Write Failing Test
   └─→ RED: Test fails (expected)

2. Write Minimal Code
   └─→ GREEN: Test passes

3. Refactor
   └─→ REFACTOR: Improve code, tests still pass

4. Repeat
   └─→ Next feature
```

### Test-After Workflow

```
1. Implement Feature
   └─→ Write production code

2. Write Tests
   └─→ Ensure feature works as expected

3. Verify Coverage
   └─→ Check coverage report

4. Add Missing Tests
   └─→ Fill gaps
```

### Bug-Fix Workflow

```
1. Reproduce Bug
   └─→ Write failing test that demonstrates bug

2. Fix Bug
   └─→ Make test pass

3. Verify Fix
   └─→ All tests pass

4. Commit
   └─→ Test + fix together
```

---

## 🚀 Continuous Integration

### CI Pipeline (GitHub Actions - Future)

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hooks (Husky)

**Location:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm test
```

### Quality Gates

**Pre-commit:**
- ✅ Linting passes
- ✅ Unit tests pass

**Pre-PR:**
- ✅ All tests pass
- ✅ Coverage ≥ 80%
- ✅ No TypeScript errors

**Pre-merge:**
- ✅ Code review approved
- ✅ CI pipeline green
- ✅ Manual testing completed

---

## 📚 Testing Best Practices

### Do's ✅

1. **Test user behavior**, not implementation
2. **Use descriptive test names** (should... when...)
3. **Keep tests simple** (one concept per test)
4. **Use AAA pattern** (Arrange, Act, Assert)
5. **Mock external dependencies**
6. **Test edge cases** (null, undefined, empty, max values)
7. **Keep tests fast** (<1s for unit, <5s for component)
8. **Update tests with code** (don't skip test updates)

### Don'ts ❌

1. **Don't test implementation details** (internal state, private methods)
2. **Don't write flaky tests** (tests that randomly fail)
3. **Don't test third-party libraries** (trust them)
4. **Don't share state between tests** (no test interdependencies)
5. **Don't skip tests** (fix or delete, don't `.skip()`)
6. **Don't over-mock** (mock external deps only)
7. **Don't test everything** (focus on critical paths)
8. **Don't write tests just for coverage** (write meaningful tests)

---

## 📖 Further Reading

- **[React Testing Library Docs](https://testing-library.com/react)**
- **[Vitest Docs](https://vitest.dev/)**
- **[Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)**

---

## 📚 Related Documents

- **[LIFECYCLE-OVERVIEW.md](./LIFECYCLE-OVERVIEW.md)** - Project lifecycle phases
- **[ARCHITECTURE-DESIGN.md](./ARCHITECTURE-DESIGN.md)** - System architecture
- **[WORKFLOW-DIAGRAMS.md](./WORKFLOW-DIAGRAMS.md)** - Development workflows
- **[DEVELOPMENT-PROCESS.md](./DEVELOPMENT-PROCESS.md)** - Daily development process

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** ✅ Complete
