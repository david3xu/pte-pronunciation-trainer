# PTE Pronunciation Trainer

A comprehensive web-based application designed to help students master PTE (Pearson Test of English) vocabulary and pronunciation. This application leverages advanced AI and Text-to-Speech technologies to provide real-time feedback and interactive learning experiences.

## 🚀 Features

- **AI-Powered Tutoring**: Integrated with Google Gemini AI for personalized pronunciation coaching and vocabulary explanations.
- **Real-time Feedback**: Instant feedback on pronunciation using browser APIs and AI analysis.
- **High-Quality Audio**: Utilizes AWS Polly for natural-sounding reference audio.
- **Comprehensive Vocabulary**: Structured learning paths for PTE Academic vocabulary.
- **Progress Tracking**: Analytics powered by PostHog to track learning progress.
- **Offline Capable**: Progressive Web App (PWA) support for offline learning.
- **Modern UI**: Built with Radix UI and Tailwind CSS for a accessible and responsive design.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript 5.9, Vite 7
- **Styling**: Tailwind CSS 4, Radix UI Themes
- **State Management**: Zustand
- **Backend/Services**:
  - Supabase (Database & Auth)
  - Google Gemini AI (Tutor Intelligence)
  - AWS Polly (Text-to-Speech)
- **Testing**: Vitest, React Testing Library
- **Analytics**: PostHog

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0

## ⚡ Quick Start

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd ccl-pronunciation-trainer
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Copy `.env.example` to `.env` and fill in the required API keys.
    ```bash
    cp .env.example .env
    ```
    > **Note**: You will need API keys for Supabase, Google Gemini, and AWS Polly.

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3001`.

## 🏗️ Build & Deploy

To build the application for production:

```bash
npm run build
```

This command compiles the TypeScript code, optimizes assets, and generates the production build in the `dist` directory.

## 🧪 Testing

Run the test suite using Vitest:

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Check coverage
npm run test:coverage
```

## 📂 Project Structure

- `src/components`: Reusable UI components.
- `src/services`: API integrations (Supabase, AI, AWS).
- `src/stores`: Global state management (Zustand).
- `src/hooks`: Custom React hooks.
- `src/utils`: Helper functions and utilities.
- `data/`: Source data for PTE vocabulary and exercises.
- `scripts/`: Data processing and validation scripts.

## 📖 Documentation

For more detailed information, please refer to the documentation in the `docs/` directory:

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Setup Guide](docs/SETUP.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)
- [Diagnostics & Improvements](docs/DIAGNOSTICS.md)

## 📄 License

MIT
