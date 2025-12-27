# Testing Strategy

This document outlines the testing strategy for the PTE Pronunciation Trainer to ensure high quality and reliability.

## 🎯 Testing Levels

### 1. Unit Testing
- **Tool**: Vitest
- **Scope**: Individual functions, hooks, and isolated components.
- **Goal**: Verify logic correctness and edge cases.
- **Location**: `src/**/*.test.ts` or `tests/unit/`

```bash
# Run unit tests
npm test
```

### 2. Integration Testing
- **Tool**: Vitest + React Testing Library
- **Scope**: Component interactions, data flow, and service integration.
- **Goal**: Ensure components work together as expected.
- **Location**: `tests/integration/`

### 3. End-to-End (E2E) Testing (Recommended)
- **Tool**: Playwright or Cypress (To be implemented)
- **Scope**: Critical user flows (Login, Practice, Chat).
- **Goal**: Validate the application from a user's perspective.

## 🧪 Test Coverage

We aim for a minimum of **80%** code coverage for critical paths (configured in `package.json`).

- **Critical Paths**:
  - `src/services/`: API interactions (Supabase, Gemini, AWS).
  - `src/utils/`: Core logic and helpers.
  - `src/stores/`: State management.

```bash
# Check coverage
npm run test:coverage
```

## 🔍 Manual Verification

Before merging PRs, perform the following manual checks:

1.  **Audio Playback**: Verify AWS Polly audio plays correctly.
2.  **Recording**: specific browser permissions for microphone are handled.
3.  **AI Chat**: Test a conversation flow with the AI Tutor.
4.  **Offline Mode**: Test PWA functionality by going offline.
5.  **Responsiveness**: Check UI on mobile and desktop viewports.

## 🛠️ Mocks & Stubs

- **Supabase**: Mocked in `tests/__mocks__/supabaseServices.js`.
- **AWS Polly**: Mocked to prevent actual API calls during tests.
- **Gemini AI**: Mocked to simulate AI responses.
