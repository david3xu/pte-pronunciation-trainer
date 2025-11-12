# 📋 Lifecycle Planning Documentation

**PTE Pronunciation Trainer - Complete Development Lifecycle**

This directory contains comprehensive planning documentation covering the entire application lifecycle from design to deployment.

---

## 📚 Documentation Index

### 🎯 Core Planning Documents

1. **[LIFECYCLE-OVERVIEW.md](./LIFECYCLE-OVERVIEW.md)**
   - Application lifecycle phases
   - Development principles
   - Project goals and milestones
   - **READ THIS FIRST** - Provides the big picture

2. **[ARCHITECTURE-DESIGN.md](./ARCHITECTURE-DESIGN.md)**
   - System architecture overview
   - Module interactions and dependencies
   - Data flow diagrams
   - State management architecture
   - API design patterns

3. **[DIRECTORY-STRUCTURE.md](./DIRECTORY-STRUCTURE.md)**
   - Complete file organization
   - Naming conventions
   - Where to put new code
   - Module boundaries

4. **[TESTING-STRATEGY.md](./TESTING-STRATEGY.md)**
   - Testing philosophy
   - Unit, integration, E2E testing
   - Test coverage requirements
   - Mocking strategies
   - Testing workflows

5. **[WORKFLOW-DIAGRAMS.md](./WORKFLOW-DIAGRAMS.md)**
   - Development workflows
   - User interaction flows
   - Data flow diagrams
   - Build and deployment pipelines
   - Feature development lifecycle

6. **[DEVELOPMENT-PROCESS.md](./DEVELOPMENT-PROCESS.md)**
   - Day-to-day development workflow
   - Git branching strategy
   - Code review process
   - Pull request guidelines
   - Release process

---

## 🚀 Quick Start Guide

### For New Developers

1. Read **LIFECYCLE-OVERVIEW.md** to understand the project structure
2. Study **ARCHITECTURE-DESIGN.md** to see how modules interact
3. Review **DIRECTORY-STRUCTURE.md** to know where to put code
4. Check **DEVELOPMENT-PROCESS.md** for your daily workflow

### For Adding New Features

1. Review **ARCHITECTURE-DESIGN.md** to understand existing patterns
2. Check **DIRECTORY-STRUCTURE.md** to place files correctly
3. Follow **TESTING-STRATEGY.md** to write tests
4. Use **WORKFLOW-DIAGRAMS.md** to visualize feature flow
5. Follow **DEVELOPMENT-PROCESS.md** for PR and review

### For Testing

1. Read **TESTING-STRATEGY.md** for complete testing approach
2. Check test coverage requirements
3. Follow testing patterns and examples

---

## 🎨 Document Structure

Each document follows this structure:

```markdown
# Document Title

## Overview
- What this document covers
- Who should read it
- Related documents

## Table of Contents
- Quick navigation

## Main Content
- Detailed explanations
- Diagrams (ASCII art for text-based)
- Code examples
- Best practices

## Examples
- Practical examples
- Common patterns
- Anti-patterns to avoid

## Quick Reference
- Checklists
- Commands
- Common tasks

## References
- Related documents
- External resources
```

---

## 🔄 Document Versioning

| Document | Version | Last Updated | Status |
|----------|---------|--------------|--------|
| LIFECYCLE-OVERVIEW.md | 1.0 | 2025-11-12 | ✅ Complete |
| ARCHITECTURE-DESIGN.md | 1.0 | 2025-11-12 | ✅ Complete |
| DIRECTORY-STRUCTURE.md | 1.0 | 2025-11-12 | ✅ Complete |
| TESTING-STRATEGY.md | 1.0 | 2025-11-12 | ✅ Complete |
| WORKFLOW-DIAGRAMS.md | 1.0 | 2025-11-12 | ✅ Complete |
| DEVELOPMENT-PROCESS.md | 1.0 | 2025-11-12 | ✅ Complete |

---

## 📊 How These Documents Relate

```
LIFECYCLE-OVERVIEW.md (Big Picture)
        ↓
        ├─→ ARCHITECTURE-DESIGN.md (System Design)
        │   └─→ Module interactions, data flow
        │
        ├─→ DIRECTORY-STRUCTURE.md (Organization)
        │   └─→ Where files go, naming rules
        │
        ├─→ TESTING-STRATEGY.md (Quality Assurance)
        │   └─→ How to test everything
        │
        ├─→ WORKFLOW-DIAGRAMS.md (Visual Guides)
        │   └─→ Flows, processes, pipelines
        │
        └─→ DEVELOPMENT-PROCESS.md (Daily Work)
            └─→ Git, PRs, reviews, releases
```

---

## 🎯 Key Principles (Quick Reference)

### Architecture
- **Event-driven** → Zustand state management
- **Component-based** → React functional components
- **Type-safe** → TypeScript 100%
- **Configuration-driven** → Single source of truth (Config.ts)

### Code Organization
- **Feature-based** → Group by feature, not by type
- **Modular** → Small, focused files (<300 lines)
- **Documented** → JSDoc for all public APIs
- **Tested** → 80% coverage target

### Development
- **Trunk-based** → Short-lived feature branches
- **Test-first** → Write tests before/with implementation
- **Review-required** → All code reviewed before merge
- **CI/CD** → Automated testing and deployment

### Testing
- **Unit tests** → Individual functions and components
- **Integration tests** → Module interactions
- **E2E tests** → Critical user flows
- **Manual testing** → AI features (TTS, Gemini)

---

## 🔧 Tools & Technologies

| Category | Tools |
|----------|-------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7 |
| **State** | Zustand 5, Immer 10 |
| **UI** | Radix UI, Tailwind CSS 4 |
| **Backend** | Vercel Functions, Node.js 16+ |
| **Database** | Supabase (PostgreSQL + Storage) |
| **AI** | Google Gemini 1.5 Flash (FREE) |
| **TTS** | AWS Polly Neural + Browser TTS |
| **Testing** | Vitest 4, React Testing Library, jsdom |
| **CI/CD** | Vercel, GitHub Actions |
| **Analytics** | PostHog |

---

## 📖 Related Documentation

### Existing Documentation
- **[../GUIDELINES.md](../GUIDELINES.md)** - Design principles and rules
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Detailed system architecture (2,230 lines)
- **[../API-REFERENCE.md](../API-REFERENCE.md)** - Complete API documentation
- **[../CLAUDE.md](../CLAUDE.md)** - AI assistant guide
- **[../UI-DESIGN-EVOLUTION.md](../UI-DESIGN-EVOLUTION.md)** - UI design documentation

### How Lifecycle Docs Differ
- **GUIDELINES.md** = Design principles (the "what" and "why")
- **ARCHITECTURE.md** = Technical details (the "how it works")
- **Lifecycle docs** = Complete process (the "how to build")

**Lifecycle docs** provide the **end-to-end process** that connects all existing documentation into a **practical development workflow**.

---

## 🚦 Getting Started Checklist

- [ ] Read LIFECYCLE-OVERVIEW.md (15 min)
- [ ] Study ARCHITECTURE-DESIGN.md (30 min)
- [ ] Review DIRECTORY-STRUCTURE.md (15 min)
- [ ] Skim TESTING-STRATEGY.md (20 min)
- [ ] Look at WORKFLOW-DIAGRAMS.md (15 min)
- [ ] Check DEVELOPMENT-PROCESS.md (20 min)
- [ ] Set up development environment
- [ ] Run `npm test` and `npm run dev`
- [ ] Make a small test change
- [ ] Follow the full PR process

**Total time:** ~2 hours to fully onboard

---

## 💡 Tips for Using These Docs

1. **Don't read everything at once** - Use the index above to find what you need
2. **Start with the overview** - LIFECYCLE-OVERVIEW.md gives you context
3. **Refer back often** - These are reference docs, not tutorials
4. **Keep them updated** - If you find issues, update the docs
5. **Use diagrams** - WORKFLOW-DIAGRAMS.md has visual guides

---

## 🤝 Contributing to These Docs

If you find:
- ❌ Outdated information → Update the document
- ❓ Confusing explanations → Clarify with examples
- 🕳️ Missing information → Add the missing section
- 💡 Better approaches → Propose improvements

**All lifecycle docs are living documents** - they should evolve with the project.

---

**Last Updated:** 2025-11-12
**Maintained By:** Development Team
**Version:** 1.0
