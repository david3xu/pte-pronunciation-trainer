# Gemini Code Assistant Context

This document provides a comprehensive overview of the PTE Pronunciation Trainer project, its architecture, and development conventions to guide the Gemini code assistant.

## Project Overview

The **PTE Pronunciation Trainer** is a web-based application designed for students preparing for the Pearson Test of English (PTE) Academic exam. It provides a comprehensive library of vocabulary and practice materials for key sections of the exam, including "Repeat Sentence," "Answer Short Question," and "Write From Dictation."

The application is built with **vanilla JavaScript (ES6 Modules), HTML5, and CSS3**. It does not use any front-end frameworks like React or Vue. The architecture is designed to be modular, event-driven, and highly configurable.

### Core Features:

*   **Extensive Content:** Includes over 12,000 vocabulary terms and 2,500 practice sentences across 11 vocabulary "books" and 3 practice modes.
*   **Advanced Audio:** Features a Text-to-Speech (TTS) engine with multiple voice options, playback speeds, and configurable pauses.
*   **Smart Learning System:** Offers various repeat and loop modes for effective practice.
*   **Modern UX:** A mobile-responsive design with light/dark themes and keyboard shortcuts.
*   **Offline Support:** A service worker enables offline access to the application.

## Building and Running

The project uses Node.js and npm for dependency management, running scripts, and building.

### Key Commands:

*   **Install Dependencies:**
    ```bash
    npm install
    ```
*   **Process Data:** The application relies on JSON datasets generated from Markdown files. This command must be run before starting the development server.
    ```bash
    npm run data:pte
    ```
*   **Run Development Server:** Starts a local server to run the application.
    ```bash
    npm run dev
    ```
*   **Run Tests:** Executes the test suite using Jest.
    ```bash
    npm run test
    ```
*   **Lint Files:** Checks code quality using ESLint for JavaScript and Stylelint for CSS.
    ```bash
    npm run lint
    ```
*   **Create Production Build:** Bundles and minifies assets for deployment into the `dist/` directory.
    ```bash
    npm run build
    ```

## Development Conventions

The project follows a strict set of development guidelines to ensure code quality, maintainability, and scalability. These are documented in detail in `docs/GUIDELINES.md`.

### 1. Zero Hardcoded Values

**All** configuration values, including event names, file paths, UI settings, and API endpoints, **must** be defined in the central configuration file: `src/js/shared/Config.js`. No hardcoded string literals or numbers are allowed in other modules.

### 2. Event-Driven Architecture

Modules **must not** communicate directly with each other. All cross-module communication is handled through a global `EventBus`. A module emits an event, and other modules subscribe to that event to react accordingly. This creates a decoupled and modular system.

### 3. Centralized Configuration

The `src/js/shared/Config.js` file is the single source of truth for all application settings. This includes:
*   Data pipeline paths
*   TTS settings (voices, speeds)
*   UI settings (themes, shortcuts)
*   A complete taxonomy of all event names used in the application.

### 4. CSS Design System

The project uses a design token system for styling. All colors, spacing, fonts, and other visual properties are defined as CSS variables in `src/css/variables.css`. Component styles should use these variables instead of hardcoded values.

### 5. Initialization

Module initialization is handled by the `InitializationManager` which ensures modules are loaded in the correct order based on their dependencies.

### 6. Commit Messages

Commit messages should follow the "Conventional Commits" format (e.g., `Feat: Add new practice mode`, `Fix: Correct TTS playback issue`).
