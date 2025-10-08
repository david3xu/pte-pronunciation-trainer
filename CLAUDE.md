# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Start development server on port 3001
npm run dev

# Process PTE vocabulary data
npm run data:pte

# Build for production
npm run build

# Validate data integrity
npm run validate

# Run all tests
npm run test

# Run linting
npm run lint

# Clean build artifacts and processed data
npm run clean

# Full deployment pipeline (process data + build + validate)
npm run deploy
```

## Architecture Overview

The CCL Pronunciation Trainer is a web-based application designed to help users practice pronunciation for PTE (Pearson Test of English) exams. The application features:

### Core Architecture Patterns

1. **Event-Driven Architecture**
   - Uses an `EventBus` for communication between modules
   - All components communicate via events, creating a decoupled system
   - Event taxonomy is centralized in `Config.js` for consistency

2. **Dependency Management**
   - `InitializationManager` handles module initialization in the correct order
   - Topological sort ensures modules load based on their dependencies
   - Provides retry logic with exponential backoff for reliability

3. **Centralized Configuration**
   - All configuration values are stored in `Config.js`
   - No hardcoded values elsewhere in the codebase
   - Single source of truth for settings, event names, and constants

4. **Service Worker Support**
   - Progressive Web App (PWA) with offline capabilities
   - Background audio playback support
   - Cache management for vocabulary datasets

### Main Components

1. **Core Modules**
   - `PTEApp.js`: Main application coordinator that initializes all modules
   - `PTEVocabularyManager.js`: Manages vocabulary datasets and filtering
   - `SettingsModule.js`: Event-driven settings management
   - `ProgressTracker.js`: Tracks learning progress

2. **Audio System**
   - `TTSEngine.js`: Text-to-speech engine with voice selection
   - `VoiceSelector.js`: Intelligent voice selection based on browser capabilities
   - `AudioControls.js`: Manages playback, repeat modes, and speed

3. **Data Management**
   - `DatasetManager.js`: Loads and manages multiple dataset types
   - Various extractors (`PTETermsExtractor.js`, etc.) for processing data

4. **UI Components**
   - `UIController.js`: Manages user interface and interactions
   - `SettingsPanel.js`: Settings UI and preference management

## Data Structure

The application works with several types of data:

1. **Vocabulary Datasets**:
   - Words with English text, IPA notation, pronunciation guides
   - Multiple vocabulary books (10 total) for different exam sections
   - Located in `data/processed/*.json`

2. **Practice Datasets**:
   - Repeat Sentence (RS): 620 practice sentences
   - Answer Short Question (ASQ): 692 questions with answers
   - Write From Dictation (WFD): 1,195 dictation sentences
   - Located in `data/processed/*.json`

3. **Settings**:
   - User preferences stored in localStorage
   - Learning modes, voice preferences, difficulty levels
   - Managed through `SettingsModule`

## Development Workflow

When implementing new features:

1. **Extend Configuration**: Add new constants/settings to `Config.js` first
2. **Add Events**: Register new event types in the events section of `Config.js`
3. **Modify Modules**: Update the relevant modules to emit/listen for events
4. **Update UI**: Make corresponding UI changes in `UIController.js` or `SettingsPanel.js`
5. **Process Data**: If needed, update data processing in the pipeline
6. **Test**: Validate the feature works across browsers
7. **Build**: Run the build pipeline with `npm run deploy`

## Important Implementation Details

1. **Voice Selection Logic**:
   - The system automatically selects the best available voice
   - Preference order: Google UK English Male → Microsoft James (AU) → fallbacks
   - Voice selection can be overridden in settings

2. **TTS Engine**:
   - Uses Web Speech API with fallbacks for iOS
   - Multiple pronunciation speeds (0.7x, 1.0x, 1.3x)
   - Special handling for background audio on mobile devices

3. **Error Handling**:
   - Centralized error handling via EventBus
   - Critical vs. non-critical module distinction
   - Validation checks during initialization

4. **Caching Strategy**:
   - Service worker caches vocabulary data
   - Migration system for version updates
   - Defensive cache clearing when issues arise