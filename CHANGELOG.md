# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
