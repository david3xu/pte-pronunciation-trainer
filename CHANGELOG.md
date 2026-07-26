# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.4] - 2026-07-26

### Automated
- Version bump to 3.0.4

## [3.0.3] - 2026-07-25

### Automated
- Version bump to 3.0.3

### Changed
- **Documentation**: Refreshed all docs to match current codebase structure (December 2025)
  - Updated `docs/ARCHITECTURE.md` with accurate `src/` directory structure
  - Updated `docs/MODULES.md` mermaid diagrams with all 9 service groups
  - Updated `docs/DIAGNOSTICS.md` with correct 80% test coverage threshold
  - Updated `docs/TESTING.md` to reference package.json coverage config
  - Updated `docs/SETUP.md` with current Gemini API reference

## [3.0.2] - 2025-12-28

### Changed
- **DI Templates**: Standardized all templates to use "picture" instead of "chart/graph/diagram"
- **Template 2**: Added "multiple groups" structure with "Looking at group [X]" and "the top value is in"
- **Template 3**: Added comparison sentence option with "has a different" and "compared to"
- **Vocabulary**: Synced vocabulary file with template updates (122 total terms)
- **Map Terms**: Added 9 map-related terms (coastal/central areas, directions, density)
- **TTS**: Set Browser Default as default TTS voice

## [3.0.1] - 2025-11-30

### Added
- **Automation**: Automated versioning workflow with GitHub Actions.
- **UI**: Dynamic version display in Settings and Footer.

### Fixed
- **Docs**: Updated documentation versions to match package.json.

### Added
- **Documentation**: Complete overhaul of project documentation.
  - Added `docs/ARCHITECTURE.md` with system design and directory structure.
  - Added `docs/SETUP.md` for installation and configuration.
  - Added `docs/CONTRIBUTING.md` for development guidelines.
  - Added `docs/DIAGNOSTICS.md` identifying technical debt and improvements.
  - Added `docs/TESTING.md` (Planned) for testing strategy.
  - Added `docs/DEPLOYMENT.md` (Planned) for CI/CD and release process.
  - Added `docs/SECURITY.md` (Planned) for security policy.

### Changed
- **Structure**: Moved all documentation to `docs/` directory.
- **Cleanup**: Removed outdated `README.md`, `CLAUDE.md`, and `CHANGELOG.md`.

## [3.0.0] - 2025-11-29

### Added
- **AI Tutor**: Integrated Google Gemini AI for personalized pronunciation coaching.
- **TTS**: Integrated AWS Polly for high-quality reference audio.
- **Analytics**: Added PostHog analytics tracking.
- **UI**: Migrated to Radix UI Themes and Tailwind CSS v4.

### Changed
- **Build**: Upgraded to Vite 7 and React 19.
- **Data**: Refactored data pipeline to process Markdown sources.
