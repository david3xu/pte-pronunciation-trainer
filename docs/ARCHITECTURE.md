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
    Client -->|TTS| Polly[AWS Polly]
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
- **AWS Polly**:
  - Provides high-quality Neural Text-to-Speech.
  - Audio is fetched and cached locally to reduce API costs.

### Data Pipeline
- **Source**: Markdown files in `data/source/pte`.
- **Processing**: Node.js scripts (`scripts/pte-data-pipeline.js`) convert Markdown to JSON.
- **Distribution**: JSON files are bundled with the app or served statically.

## 🔄 Key Workflows

### 1. Pronunciation Practice
1.  User selects a word/sentence.
2.  App plays reference audio (AWS Polly).
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
├── data/                    # Data sources (Markdown) and processed JSON
│   ├── source/              # Raw content (PTE vocabulary, templates)
│   └── processed/           # Generated JSON for the app
├── docs/                    # Project documentation
├── public/                  # Static assets (favicons, manifest)
├── scripts/                 # Build, validation, and data pipeline scripts
├── src/                     # Source code
│   ├── components/          # React UI components
│   │   ├── ui/              # Reusable primitives (buttons, inputs)
│   │   └── features/        # Feature-specific components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # External API integrations (Supabase, AI, AWS)
│   ├── stores/              # Global state management (Zustand)
│   ├── styles/              # Global styles and Tailwind configuration
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper functions
├── supabase/                # Supabase migrations and config
├── tests/                   # Test setup and integration tests
├── .env.example             # Environment variables template
├── package.json             # Project dependencies and scripts
└── vite.config.ts           # Vite bundler configuration
```

## 📂 Directory Structure Strategy

- **`src/components`**: Pure UI components. Logic should be minimal.
- **`src/features`**: (Recommended) Feature-based grouping (e.g., `features/chat`, `features/practice`).
- **`src/services`**: Singleton classes or functions for external API calls.
- **`src/stores`**: Global state definitions.
- **`src/hooks`**: Reusable logic (e.g., `useAudio`, `useAuth`).
