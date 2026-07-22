# System Architecture

## Overview

The PTE Pronunciation Trainer is a client-side heavy web application built with React, leveraging serverless technologies for backend functionality. It follows a modern Single Page Application (SPA) architecture.

> **Detailed Modules**: For a deep dive into internal module interactions and data flow, see [MODULES.md](MODULES.md).

## 🏗️ High-Level Architecture

```mermaid
graph TD
    User[User] -->|Interacts| Client[React Client (Vite)]
    Client -->|Auth & Data| Supabase[Supabase (Auth & DB)]
    Client -->|AI Chat| Gemini[Google Gemini AI]
    Client -->|TTS| AzureSpeech[Azure AI Speech]
    Client -->|Analytics| PostHog[PostHog]

    subgraph "Frontend Layer"
        Client
        Store[Zustand Store]
        Router[React Router]
        UI[Radix UI + Tailwind]
    end

    subgraph "Data Layer"
        Supabase
        LocalDB[LocalForage (Offline Cache)]
    end
```

## 🧩 Core Components

### Frontend (Client)
- **Framework**: React 19 with TypeScript.
- **Build Tool**: Vite 7 for fast development and optimized production builds.
- **State Management**: `zustand` is used for global state (user session, settings, audio player state).
- **Routing**: Client-side routing (likely `react-router` or similar).
- **UI Library**: `radix-ui` primitives for accessibility, styled with `tailwindcss`.

### Backend Services
- **Supabase**:
  - **Authentication**: Manages user sign-up/login.
  - **Database**: Stores user progress, saved words, and custom settings.
- **Google Gemini AI**:
  - Acts as the "AI Tutor".
  - Accessed via a proxy/middleware to protect API keys and manage context.
- **Azure AI Speech**:
  - Provides high-quality Neural Text-to-Speech.
  - Audio is fetched through serverless API routes and falls back to browser speech if unavailable.

### Data Pipeline
- **Source**: Markdown files in `data/source/pte`.
- **Processing**: Node.js scripts (`scripts/pte-data-pipeline.js`) convert Markdown to JSON.
- **Distribution**: JSON files are bundled with the app or served statically.

## 🔄 Key Workflows

### 1. Pronunciation Practice
1.  User selects a word/sentence.
2.  App plays reference audio (Azure AI Speech or browser fallback).
3.  User records audio (Browser MediaRecorder API).
4.  App analyzes audio (SpeechRecognition API or AI) and gives feedback.

### 2. AI Tutor Chat
1.  User sends a message.
2.  Request goes to `aiChatMiddleware` (in dev) or Serverless Function (in prod).
3.  Middleware augments prompt with context (current word, history).
4.  Gemini streams response back to client.

## 📂 Directory Structure

```
ccl-pronunciation-trainer/
├── .github/                 # CI/CD workflows and templates
├── api/                     # Vercel serverless functions
├── data/                    # Data sources (Markdown) and processed JSON
│   ├── source/              # Raw content (PTE vocabulary, templates)
│   └── processed/           # Generated JSON for the app
├── docs/                    # Project documentation
├── public/                  # Static assets (favicons, manifest)
├── scripts/                 # Build, validation, and data pipeline scripts (11 files)
├── src/                     # Source code
│   ├── components/          # React UI components (7 feature groups)
│   │   ├── ai/              # AI features (7 files): AITutorChat, AIRecommendations, etc.
│   │   ├── audio/           # Audio controls (4 files): AudioControls, VoiceSelector
│   │   ├── migration/       # Data migration UI (1 file)
│   │   ├── practice/        # Practice interfaces (12 files): WordCard, RSInterface, WFDInterface, etc.
│   │   ├── profile/         # User profile UI (1 file)
│   │   ├── settings/        # Settings UI (2 files)
│   │   └── shared/          # Shared components (7 files): Skeleton, ErrorBoundary, ToastProvider
│   ├── config/              # App configuration (AppConfig.ts)
│   ├── css/                 # Styles (Tailwind + custom CSS)
│   ├── hooks/               # Custom React hooks (5 files): useBreakpoint, useOnboarding, etc.
│   ├── services/            # Business logic & API clients (9 groups)
│   │   ├── ai/              # AI services (6 files): interventionEngine, recommendationEngine
│   │   ├── analytics/       # Analytics (1 file): analyticsService
│   │   ├── audio/           # Audio/TTS: TTSEngine, background audio, voice selection
│   │   ├── device/          # Device detection (1 file)
│   │   ├── migration/       # Data migration (1 file)
│   │   ├── profile/         # User profiles (1 file): learnerProfileService
│   │   ├── session/         # Session tracking (1 file): sessionManager
│   │   ├── supabase/        # Supabase integration (5 files): authService, syncService
│   │   └── tts/             # TTS caching (1 file)
│   ├── stores/              # Zustand state management (2 files)
│   ├── types/               # TypeScript definitions (4 files)
│   └── utils/               # Helper functions (6 files + validation/)
├── supabase/                # Supabase migrations and config
├── tests/                   # Test setup and integration tests
├── .env.example             # Environment variables template
├── package.json             # Project dependencies and scripts
└── vite.config.ts           # Vite bundler configuration
```

## 📂 Directory Structure Strategy

- **`src/components`**: Feature-grouped UI components (ai/, audio/, practice/, settings/, shared/).
- **`src/services`**: Singleton services for external APIs (Supabase, Gemini, Azure Speech).
- **`src/stores`**: Zustand global state (7 slices: audio, tts, vocabulary, progress, auth, settings, ui).
- **`src/hooks`**: Reusable React hooks (useBreakpoint, useOnboarding, useMigration, useSwipeGesture).
