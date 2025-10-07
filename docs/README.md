# Documentation# Documentation# 📚 PTE Pronunciation Trainer - Documentation# 📚 PTE Pronunciation Trainer - Documentation# 📚 PTE Pronunciation Trainer - Documentation# 📚 PTE Pronunciation Trainer - Documentation



Welcome to the PTE Pronunciation Trainer documentation! This guide will help you navigate the available documentation and find what you need.



---Welcome to the PTE Pronunciation Trainer documentation! This guide will help you navigate the available documentation and find what you need.



## 🎯 Documentation Philosophy: Permanent vs Temporary



### **The Core Principle**---## 📋 Documentation Overview



We maintain two types of documentation:



1. **📘 Permanent Files** - Stable, long-term reference documentation## 📚 Documentation Structure

2. **🚧 Temporary Files (WIP)** - Active planning/implementation guides



### **The Workflow**

All documentation follows industry best practices with clear, focused files:This directory contains comprehensive documentation for the PTE Pronunciation Trainer project, organized into **permanent** (stable), **work-in-progress** (evolving), and **archive** (historical) sections.## 📋 Documentation Overview

```mermaid

graph LR

    A[New Feature Idea] --> B[Create WIP Planning Doc]

    B --> C[Create WIP Implementation Doc]```

    C --> D[Build Feature]

    D --> E[Update Permanent Docs]docs/

    E --> F[Delete WIP Docs]

    ├── README.md            # This file - documentation index---

    style A fill:#e1f5ff

    style B fill:#fff4e6├── ARCHITECTURE.md      # Complete system architecture (~600 lines)

    style C fill:#fff4e6

    style D fill:#e8f5e9├── CONTRIBUTING.md      # Developer guide & workflows (~500 lines)

    style E fill:#f3e5f5

    style F fill:#ffebee├── API-REFERENCE.md     # Complete API documentation (~900 lines)

```

├── DEPLOYMENT.md        # Deployment guide (~480 lines)## 📁 Documentation StructureThis directory contains comprehensive documentation for the PTE Pronunciation Trainer project, organized into **permanent** (stable) and **work-in-progress** (evolving) sections.## 📋 Documentation Overview## 📋 Documentation Overview

### **When to Create WIP (Temporary) Docs**

├── TROUBLESHOOTING.md   # Issue resolution (~435 lines)

✅ **Create in `wip/`** when:

- Planning a new major feature├── wip/                 # Work-in-progress (active development)

- Designing system architecture changes

- Creating step-by-step implementation guides│   ├── planning/

- Documenting work-in-progress decisions

│   │   └── DATASET-DESIGN-STRATEGY.md### **Organization Philosophy**

### **When to Update Permanent Docs**

│   └── implementation/

✅ **Update permanent docs** when:

- Feature is complete and tested│       └── IMPLEMENTATION-QUICK-START.md- **Permanent Docs** 📘: Stable, finalized documentation (main reference)

- Architecture changes are finalized

- New APIs are stable and documented└── archive/             # Historical records

- Deployment process changes

    ├── design-decisions/- **WIP (Work-in-Progress)** 🚧: Active planning and implementation guides---

### **When to Delete WIP Docs**

    │   └── LEARNING-MODES.md

❌ **Delete WIP docs** when:

- All information is incorporated into permanent docs    └── refactoring/- **Archive** 📦: Historical documents and completed refactoring records

- Feature implementation is complete

- Planning decisions are now in ARCHITECTURE.md        └── REFACTORING-COMPLETE.md

- Implementation steps are now in CONTRIBUTING.md

```

### **Golden Rule**



> **WIP docs are TEMPORARY scaffolding. Once you build the permanent structure, remove the scaffolding!**

---```

---



## 📚 Documentation Structure

## 🎯 Quick Navigationdocs/## 📁 Documentation StructureThis directory contains comprehensive documentation for the PTE Pronunciation Trainer project, organized by purpose and audience.This directory contains comprehensive documentation for the PTE Pronunciation Trainer project.

```

docs/

├── README.md                    # This file - documentation index

├── ARCHITECTURE.md              # 📘 PERMANENT - System design### **For New Users**├── README.md                              # This file - documentation index

├── CONTRIBUTING.md              # 📘 PERMANENT - Developer guide

├── API-REFERENCE.md             # 📘 PERMANENT - API documentation1. Start with [Project README](../README.md) - Project overview and quick start

├── DEPLOYMENT.md                # 📘 PERMANENT - Deployment guide

├── TROUBLESHOOTING.md           # 📘 PERMANENT - Issue resolution2. Try the app at http://localhost:3000 after running `npm run dev`│

└── wip/                         # 🚧 TEMPORARY - Work-in-progress

    ├── planning/

    │   └── DATASET-DESIGN-STRATEGY.md     # 🚧 TEMP - Delete after implementing

    └── implementation/### **For Developers**├── architecture/                          # 📘 PERMANENT - Finalized Architecture

        └── IMPLEMENTATION-QUICK-START.md  # 🚧 TEMP - Delete after implementing

```1. **Getting Started** → [CONTRIBUTING.md](./CONTRIBUTING.md) - Setup, workflow, coding guidelines



---2. **System Design** → [ARCHITECTURE.md](./ARCHITECTURE.md) - How the system works│   ├── ARCHITECTURE.md                    # Overall system architecture (36K)### **Organization Philosophy**



## 🎯 Quick Navigation3. **API Docs** → [API-REFERENCE.md](./API-REFERENCE.md) - Complete API reference



### **For New Users**│   ├── SETTINGS-ARCHITECTURE.md           # Settings system design (8K)

1. Start with [Project README](../README.md) - Project overview and quick start

2. Try the app at http://localhost:3000 after running `npm run dev`### **For DevOps**



### **For Developers**1. **Deployment** → [DEPLOYMENT.md](./DEPLOYMENT.md) - How to deploy│   └── STATE-MANAGEMENT-CONSOLIDATION.md  # State management design (11K)- **Permanent Docs** 📘: Stable, finalized documentation (main reference)

1. **Getting Started** → [CONTRIBUTING.md](./CONTRIBUTING.md) - Setup, workflow, coding guidelines

2. **System Design** → [ARCHITECTURE.md](./ARCHITECTURE.md) - How the system works2. **Issues** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common problems & solutions

3. **API Docs** → [API-REFERENCE.md](./API-REFERENCE.md) - Complete API reference

│

### **For DevOps**

1. **Deployment** → [DEPLOYMENT.md](./DEPLOYMENT.md) - How to deploy### **For Contributors (Adding Datasets)**

2. **Issues** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common problems & solutions

1. **How to Add Data** → [CONTRIBUTING.md#adding-new-datasets](./CONTRIBUTING.md#adding-new-datasets)├── guides/                                # 📘 PERMANENT - Stable How-To Guides- **WIP (Work-in-Progress)** 🚧: Active planning and implementation guides---## 📖 Documentation Structure

### **For Contributors (Adding Datasets)**

1. **How to Add Data** → [CONTRIBUTING.md#adding-new-datasets](./CONTRIBUTING.md#adding-new-datasets)2. **Multi-Dataset Plan** → [wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md)

2. **Multi-Dataset Plan** → [wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md) 🚧 TEMPORARY

3. **Quick Start** → [wip/implementation/IMPLEMENTATION-QUICK-START.md](./wip/implementation/IMPLEMENTATION-QUICK-START.md) 🚧 TEMPORARY3. **Quick Start** → [wip/implementation/IMPLEMENTATION-QUICK-START.md](./wip/implementation/IMPLEMENTATION-QUICK-START.md)│   ├── DATA-INGESTION.md                  # How to add new datasets (7.2K)



---



## 📋 Documentation Index---│   ├── DEPLOYMENT.md                      # Deployment guide (9.1K)- **Archive** 📦: Historical documents and superseded plans



### **📘 Permanent Documentation** (Stable Reference)



#### **[ARCHITECTURE.md](./ARCHITECTURE.md)** 📐## 📋 Documentation Index│   ├── TROUBLESHOOTING.md                 # Common issues & solutions (11K)

**Complete system architecture and design**



- System overview and design principles

- Component architecture (PTEApp, VocabularyManager, SettingsManager, etc.)### **Permanent Documentation** (Stable Reference)│   └── WORKFLOW.md                        # Development workflow (10K)

- Data pipeline (Markdown → JSON transformation)

- State management architecture

- Settings system design

- Event-driven communication#### **[ARCHITECTURE.md](./ARCHITECTURE.md)** 📐│

- Build system architecture

- Design patterns used**Complete system architecture and design**

- Performance optimization

- Future considerations├── implementation/                        # 📘 PERMANENT - Completed Implementations```



**Audience**: Developers, Architects  - System overview and design principles

**When to read**: Understanding system design, modifying core components  

**Status**: ✅ PERMANENT - Keep forever- Component architecture (PTEApp, VocabularyManager, SettingsManager, etc.)│   └── LEARNING-MODE-VS-CATEGORY.md       # Learning mode concepts (6.6K)



---- Data pipeline (Markdown → JSON transformation)



#### **[CONTRIBUTING.md](./CONTRIBUTING.md)** 🤝- State management architecture│docs/## 📁 Documentation Structure### **🏠 Main Documentation**

**Developer onboarding and contribution guide**

- Settings system design

- Quick start setup

- Project structure explanation- Event-driven communication├── reference/                             # 📘 PERMANENT - API & Technical Reference

- Development workflow

- Adding new datasets- Build system architecture

- Adding new features

- Testing guidelines- Design patterns used│   ├── API.md                             # API documentation (14K)├── README.md                              # This file - documentation index

- Code style conventions

- Configuration management- Performance optimization

- Pull request guidelines

- Bug reporting- Future considerations│   └── SETTINGS.md                        # Settings reference (11K)

- Feature requests



**Audience**: Contributors, New Developers  

**When to read**: Before making your first contribution, adding features  **Audience**: Developers, Architects  ││- **[README.md](../README.md)** - Main project documentation, quick start, and overview

**Status**: ✅ PERMANENT - Keep forever

**When to read**: Understanding system design, modifying core components

---

├── wip/                                   # 🚧 WORK-IN-PROGRESS (Temporary)

#### **[API-REFERENCE.md](./API-REFERENCE.md)** 📚

**Complete API documentation**---



- Core classes (AppConfig, PTEApp, PTEVocabularyManager, SettingsManager, ProgressTracker)│   ├── planning/                          # Active planning documents├── architecture/                          # 📘 PERMANENT - Finalized Architecture

- UI classes (UIController, SettingsPanel)

- Audio classes (TTSEngine, VoiceSelector, AudioControls)#### **[CONTRIBUTING.md](./CONTRIBUTING.md)** 🤝

- Utility classes (EventBus, Storage, StateManager)

- Event system documentation**Developer onboarding and contribution guide**│   │   └── DATASET-DESIGN-STRATEGY.md     # Multi-dataset architecture (35K) ⭐

- Settings reference

- Data schemas



**Audience**: Developers  - Quick start setup│   └── implementation/                    # Active implementation guides│   ├── ARCHITECTURE.md                    # Overall system architecture (36K)```- **[CLAUDE.md](../CLAUDE.md)** - AI assistant guidance and development context

**When to read**: Using APIs, integrating components, understanding interfaces  

**Status**: ✅ PERMANENT - Keep forever- Project structure explanation



---- Development workflow│       └── IMPLEMENTATION-QUICK-START.md  # Phase 1 quick start (6.3K) ⭐



#### **[DEPLOYMENT.md](./DEPLOYMENT.md)** 🚀- Adding new datasets

**Production deployment guide**

- Adding new features││   ├── SETTINGS-ARCHITECTURE.md           # Settings system design (8K)

- Pre-deployment checklist

- Local development deployment- Testing guidelines

- Production build process

- Web deployment (Vercel, Netlify, GitHub Pages)- Code style conventions└── archive/                               # 📦 ARCHIVE - Historical Documents

- Custom server deployment (Apache, Nginx)

- Environment-specific configuration- Configuration management

- Data pipeline deployment

- CI/CD pipeline setup- Pull request guidelines    └── refactoring/                       # Past refactoring records│   └── STATE-MANAGEMENT-CONSOLIDATION.md  # State management design (11K)docs/

- Troubleshooting deployment

- Performance optimization- Bug reporting



**Audience**: DevOps, System Administrators  - Feature requests        └── REFACTORING-COMPLETE.md        # Oct 7, 2025 refactoring (8.4K)

**When to read**: Deploying the application, setting up CI/CD  

**Status**: ✅ PERMANENT - Keep forever



---**Audience**: Contributors, New Developers  ```│



#### **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** 🔧**When to read**: Before making your first contribution, adding features

**Common issues and solutions**



- Data loading issues

- TTS problems---

- Browser compatibility

- Performance issues---├── guides/                                # 📘 PERMANENT - Stable How-To Guides├── README.md                              # This file - documentation index### **🏗️ Technical Documentation**

- Configuration errors

- Build failures#### **[API-REFERENCE.md](./API-REFERENCE.md)** 📚

- Deployment problems

- Debug techniques**Complete API documentation**



**Audience**: Users, Developers, Support  

**When to read**: When something isn't working, debugging issues  

**Status**: ✅ PERMANENT - Keep forever- Core classes (AppConfig, PTEApp, PTEVocabularyManager, SettingsManager, ProgressTracker)## 🎯 Quick Navigation│   ├── DATA-INGESTION.md                  # How to add new datasets (7.2K)



---- UI classes (UIController, SettingsPanel)



### **🚧 Work-in-Progress (TEMPORARY - Will Be Deleted)**- Audio classes (TTSEngine, VoiceSelector, AudioControls)



#### **[wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md)** 🚧- Utility classes (EventBus, Storage, StateManager)

**Multi-dataset architecture planning**

- Event system documentation### **For New Users**│   ├── DEPLOYMENT.md                      # Deployment guide (9.1K)│- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, design patterns, and component interactions (36K)

- Architecture for supporting multiple PTE question types

- 15 system-wide considerations- Settings reference

- 6 implementation phases

- Complete design strategy- Data schemas1. Start with [Project README](../README.md) for project overview



**Status**: 🚧 TEMPORARY - Planning phase  

**Audience**: Architects, Lead Developers  

**Delete when**: Multi-dataset feature complete, info moved to ARCHITECTURE.md**Audience**: Developers  2. Read [Quick Start Guide](../README.md#-quick-start) for setup│   ├── TROUBLESHOOTING.md                 # Common issues & solutions (11K)



---**When to read**: Using APIs, integrating components, understanding interfaces



#### **[wip/implementation/IMPLEMENTATION-QUICK-START.md](./wip/implementation/IMPLEMENTATION-QUICK-START.md)** 🚧

**Phase 1 implementation guide**

---

- Step-by-step Phase 1 instructions

- Quick start for multi-dataset implementation### **For Developers**│   └── WORKFLOW.md                        # Development workflow (10K)├── architecture/                          # System Design & Architecture- **[REFACTORING-COMPLETE.md](REFACTORING-COMPLETE.md)** - Complete refactoring summary and achievements (8.4K)



**Status**: 🚧 TEMPORARY - Implementation phase  #### **[DEPLOYMENT.md](./DEPLOYMENT.md)** 🚀

**Audience**: Developers implementing multi-dataset support  

**Delete when**: Implementation complete, steps moved to CONTRIBUTING.md**Production deployment guide**1. Review [ARCHITECTURE.md](architecture/ARCHITECTURE.md) for system design



---



## 🔄 Documentation Lifecycle- Pre-deployment checklist2. Check [WORKFLOW.md](guides/WORKFLOW.md) for development process│



### **Example: Multi-Dataset Feature**- Local development deployment



#### **Phase 1: Planning (Current)**- Production build process3. Reference [API.md](reference/API.md) for detailed API documentation

```

wip/planning/DATASET-DESIGN-STRATEGY.md  🚧 CREATED (temporary)- Web deployment (Vercel, Netlify, GitHub Pages)

```

- Custom server deployment (Apache, Nginx)├── implementation/                        # 📘 PERMANENT - Completed Implementations│   ├── ARCHITECTURE.md                    # Overall system architecture (36K)- **[WORKFLOW.md](WORKFLOW.md)** - Complete workflow diagrams, data flow, and class interactions (10K)

#### **Phase 2: Implementation**

```- Environment-specific configuration

wip/implementation/IMPLEMENTATION-QUICK-START.md  🚧 CREATED (temporary)

```- Data pipeline deployment### **For Current Implementation (Multi-Dataset)**



#### **Phase 3: Completion**- CI/CD pipeline setup

```

ARCHITECTURE.md                          ✅ UPDATED (permanent)- Troubleshooting deployment1. **Planning** → [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) ⭐│   ├── LEARNING-MODE-VS-CATEGORY.md       # Learning mode concepts (6.6K)

CONTRIBUTING.md                          ✅ UPDATED (permanent)

wip/planning/DATASET-DESIGN-STRATEGY.md  ❌ DELETED (temporary)- Performance optimization

wip/implementation/IMPLEMENTATION-QUICK-START.md  ❌ DELETED (temporary)

```2. **Quick Start** → [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) ⭐



### **Result****Audience**: DevOps, System Administrators  

- ✅ Permanent docs contain all essential information

- ✅ No temporary scaffolding left behind**When to read**: Deploying the application, setting up CI/CD3. **Data Ingestion** → [DATA-INGESTION.md](guides/DATA-INGESTION.md)│   └── REFACTORING-COMPLETE.md            # Refactoring history (8.4K)│   ├── DATASET-DESIGN-STRATEGY.md         # Multi-dataset architecture plan (35K) ⭐ NEW- **[API.md](API.md)** - Complete API reference for all classes and methods (14K)

- ✅ Clean, maintainable documentation



---

---

## 🔍 Finding What You Need



### **"How do I..."**

#### **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** 🔧### **For DevOps/Deployment**│

| Question | Document | Section |

|----------|----------|---------|**Common issues and solutions**

| ...set up the project? | [CONTRIBUTING.md](./CONTRIBUTING.md) | Quick Start |

| ...add a new dataset? | [CONTRIBUTING.md](./CONTRIBUTING.md) | Adding New Datasets |1. Check [DEPLOYMENT.md](guides/DEPLOYMENT.md) for deployment instructions

| ...understand the architecture? | [ARCHITECTURE.md](./ARCHITECTURE.md) | System Overview |

| ...use an API? | [API-REFERENCE.md](./API-REFERENCE.md) | Core Classes |- Data loading issues

| ...deploy the app? | [DEPLOYMENT.md](./DEPLOYMENT.md) | Web Deployment |

| ...fix an issue? | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common Issues |- TTS problems2. Review [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md) for common issues├── reference/                             # 📘 PERMANENT - API & Technical Reference│   ├── SETTINGS-ARCHITECTURE.md           # Settings system design (8K)- **[SETTINGS.md](SETTINGS.md)** - Settings panel guide and configuration options (11K)

| ...contribute code? | [CONTRIBUTING.md](./CONTRIBUTING.md) | Development Workflow |

| ...implement multi-dataset? | [wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md) 🚧 | Phase 1 |- Browser compatibility



### **"I want to understand..."**- Performance issues



| Topic | Document | Section |- Configuration errors

|-------|----------|---------|

| ...overall system design | [ARCHITECTURE.md](./ARCHITECTURE.md) | High-Level Architecture |- Build failures---│   ├── API.md                             # API documentation (14K)

| ...data flow | [ARCHITECTURE.md](./ARCHITECTURE.md) | Data Pipeline Architecture |

| ...component interactions | [ARCHITECTURE.md](./ARCHITECTURE.md) | Core Components |- Deployment problems

| ...settings system | [ARCHITECTURE.md](./ARCHITECTURE.md) | Settings System Architecture |

| ...state management | [ARCHITECTURE.md](./ARCHITECTURE.md) | State Management Architecture |- Debug techniques

| ...event system | [API-REFERENCE.md](./API-REFERENCE.md) | Event System |

| ...available APIs | [API-REFERENCE.md](./API-REFERENCE.md) | Table of Contents |



---**Audience**: Users, Developers, Support  ## 📂 Documentation by Category│   └── SETTINGS.md                        # Settings reference (11K)│   └── STATE-MANAGEMENT-CONSOLIDATION.md  # State management design (11K)- **[SETTINGS-ARCHITECTURE.md](SETTINGS-ARCHITECTURE.md)** - Settings system design and dependencies (8K)



## 📊 Documentation Stats**When to read**: When something isn't working, debugging issues



| Category | Files | Purpose | Lifecycle |

|----------|-------|---------|-----------|

| **Permanent** | 5 | Stable reference documentation | ♾️ Forever |---

| **WIP** | 2 | Active development docs | ⏳ Delete after feature complete |

| **Total** | **7** | Complete documentation set | - |### **📘 Permanent Documentation**│



---### **Work-in-Progress** (Active Development)



## 🎯 Documentation Principles



Our documentation follows industry best practices:#### **[wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md)** 🚧



1. **📘 Clear Purpose** - Each file has a distinct, focused purpose**Multi-dataset architecture planning**#### **🏗️ Architecture** (3 documents, ~55K)├── wip/                                   # 🚧 WORK-IN-PROGRESS (Temporary)│- **[STATE-MANAGEMENT-CONSOLIDATION.md](STATE-MANAGEMENT-CONSOLIDATION.md)** - State management architecture (11K)

2. **🎯 Action-Oriented** - CONTRIBUTING, DEPLOYMENT (tells you HOW)

3. **📚 Reference-Focused** - ARCHITECTURE, API-REFERENCE (tells you WHAT)

4. **🔍 Searchable** - Clear headings, tables of contents

5. **✅ Current** - Actively maintained, dated when needed- Architecture for supporting multiple PTE question types| Document | Purpose | Audience |

6. **🔗 Cross-Referenced** - Links between related topics

7. **♻️ Clean Lifecycle** - WIP docs are temporary, deleted when done- 15 system-wide considerations



---- 6 implementation phases|----------|---------|----------|│   ├── planning/                          # Active planning documents



## 📝 Maintaining Documentation- Complete design strategy



### **When to Update Permanent Docs**| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Complete system architecture | Developers, Architects |



- **ARCHITECTURE.md**: When changing system design, adding major components**Status**: 📝 Active Planning  

- **CONTRIBUTING.md**: When changing workflow, adding guidelines

- **API-REFERENCE.md**: When adding/changing public APIs**Audience**: Architects, Lead Developers| [SETTINGS-ARCHITECTURE.md](architecture/SETTINGS-ARCHITECTURE.md) | Settings system design | Developers |│   │   └── DATASET-DESIGN-STRATEGY.md     # Multi-dataset architecture (35K) ⭐├── guides/                                # User & Developer Guides- **[LEARNING-MODE-VS-CATEGORY.md](LEARNING-MODE-VS-CATEGORY.md)** - Learning mode system design (6.6K)

- **DEPLOYMENT.md**: When adding deployment targets, changing build process

- **TROUBLESHOOTING.md**: When discovering new issues/solutions



### **When to Create WIP Docs**---| [STATE-MANAGEMENT-CONSOLIDATION.md](architecture/STATE-MANAGEMENT-CONSOLIDATION.md) | State management | Developers |



- Planning a new major feature (→ `wip/planning/`)

- Writing implementation guides (→ `wip/implementation/`)

- Documenting design decisions before finalizing#### **[wip/implementation/IMPLEMENTATION-QUICK-START.md](./wip/implementation/IMPLEMENTATION-QUICK-START.md)** 🚧│   └── implementation/                    # Active implementation guides



### **When to Delete WIP Docs****Phase 1 implementation guide**



✅ **Delete WIP docs when:**#### **📖 Guides** (4 documents, ~37K)

1. ✅ All useful information is moved to permanent docs

2. ✅ Feature implementation is complete- Step-by-step Phase 1 instructions

3. ✅ The planning/guide is no longer needed

4. ✅ Information is outdated or superseded- Quick start for multi-dataset implementation| Document | Purpose | Audience |│       └── IMPLEMENTATION-QUICK-START.md  # Phase 1 quick start (6.3K) ⭐│   ├── DATA-INGESTION.md                  # How to add new datasets (7.2K)- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide for various platforms (9.1K)



⚠️ **Never delete permanent docs!**



### **WIP Cleanup Checklist****Status**: 🔨 In Progress  |----------|---------|----------|



Before deleting a WIP doc, ensure:**Audience**: Developers implementing multi-dataset support

- [ ] Key architecture decisions → Updated in ARCHITECTURE.md

- [ ] Implementation steps → Updated in CONTRIBUTING.md| [DATA-INGESTION.md](guides/DATA-INGESTION.md) | Add new datasets | Content Creators |│

- [ ] API changes → Updated in API-REFERENCE.md

- [ ] No valuable information lost---

- [ ] README.md updated to remove WIP references

| [DEPLOYMENT.md](guides/DEPLOYMENT.md) | Deploy the app | DevOps |

---

### **Archive** (Historical Records)

## 🚀 Current Focus

| [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md) | Fix common issues | Users, Developers |└── archive/                               # 📦 ARCHIVE - Historical Documents│   ├── DEPLOYMENT.md                      # Deployment guide (9.1K)- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions (11K)

The project is expanding to support multiple PTE question types:

#### **[archive/design-decisions/LEARNING-MODES.md](./archive/design-decisions/LEARNING-MODES.md)** 📦

- ✅ **Vocabulary** (914 terms with IPA) - COMPLETE

- 🚧 **Repeat Sentence** (620 sentences) - Phase 1 (WIP)**Learning mode system design rationale**| [WORKFLOW.md](guides/WORKFLOW.md) | Development workflow | Developers |

- 🚧 **Answer Short Question** (692 questions) - Phase 1 (WIP)

- 🚧 **Write From Dictation** (1,195 sentences) - Phase 1 (WIP)



**Current WIP Docs** (TEMPORARY - will be deleted):- Historical design decision documentation    └── (Old planning docs moved here after completion)

- [wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md) 🚧

- [wip/implementation/IMPLEMENTATION-QUICK-START.md](./wip/implementation/IMPLEMENTATION-QUICK-START.md) 🚧- Learning mode vs category distinction



**When multi-dataset is complete:**#### **🔨 Implementation** (1 document, ~6.6K)

1. Update ARCHITECTURE.md with final design

2. Update CONTRIBUTING.md with dataset addition steps**Date**: October 7, 2025  

3. Delete both WIP docs

4. Update this README to remove WIP references**Audience**: Historians, Architects (understanding past decisions)| Document | Purpose | Audience |```│   ├── TROUBLESHOOTING.md                 # Common issues & solutions (11K)- **[DATA-INGESTION.md](DATA-INGESTION.md)** - How to add new datasets (sources, config, pipeline) (7.2K)



---



## 📖 Documentation Best Practices---|----------|---------|----------|



### **For Contributors**



When adding new documentation:#### **[archive/refactoring/REFACTORING-COMPLETE.md](./archive/refactoring/REFACTORING-COMPLETE.md)** 📦| [LEARNING-MODE-VS-CATEGORY.md](implementation/LEARNING-MODE-VS-CATEGORY.md) | Learning mode concepts | Developers |



1. **Ask yourself**: Is this permanent or temporary?**Complete refactoring summary**

   - **Permanent** → Reference material that will always be useful

   - **Temporary** → Planning/implementation guide for a specific feature



2. **Choose the right location**:- October 7, 2025 refactoring achievements

   - Permanent → Root `docs/` directory

   - Temporary → `docs/wip/planning/` or `docs/wip/implementation/`- 821 lines removed#### **📚 Reference** (2 documents, ~25K)---│   └── WORKFLOW.md                        # Development workflow (10K)



3. **Name clearly**:- Architecture improvements

   - Use `UPPERCASE-WITH-DASHES.md`

   - Be descriptive: `MULTI-DATASET-ARCHITECTURE.md` not `NEW-FEATURE.md`| Document | Purpose | Audience |



4. **Update this README**:**Date**: October 7, 2025  

   - Add to appropriate section (Permanent or WIP)

   - Include "Delete when" criteria for WIP docs**Audience**: Historians, understanding project evolution|----------|---------|----------|



5. **When feature is done**:

   - Move info to permanent docs

   - Delete WIP docs---| [API.md](reference/API.md) | API documentation | Developers |

   - Update README to remove WIP references



---

## 🔍 Finding What You Need| [SETTINGS.md](reference/SETTINGS.md) | Settings reference | Users, Developers |## 🎯 Quick Navigation│### **📊 Data Documentation**

**Documentation Status**: ✅ **PROFESSIONAL & INDUSTRY-STANDARD**  

**Permanent Docs**: ✅ **5 focused, comprehensive files**  

**WIP Docs**: 🚧 **2 temporary (will be deleted when multi-dataset complete)**  

**Structure**: ✅ **Follows open-source best practices**  ### **"How do I..."**

**Lifecycle**: ✅ **Clear permanent vs temporary separation**



---

| Question | Document | Section |### **🚧 Work-in-Progress (WIP)**

Need help? Start with the **Quick Navigation** section above! 🎯

|----------|----------|---------|

| ...set up the project? | [CONTRIBUTING.md](./CONTRIBUTING.md) | Quick Start |

| ...add a new dataset? | [CONTRIBUTING.md](./CONTRIBUTING.md) | Adding New Datasets |

| ...understand the architecture? | [ARCHITECTURE.md](./ARCHITECTURE.md) | System Overview |#### **Planning** (1 document, ~35K)### **For New Users**├── implementation/                        # Implementation Details- **[pte-fib-listening-with-ipa.md](../data/source/pte/vocabs/pte-fib-listening-with-ipa.md)** - Primary data source (914 terms with IPA)

| ...use an API? | [API-REFERENCE.md](./API-REFERENCE.md) | Core Classes |

| ...deploy the app? | [DEPLOYMENT.md](./DEPLOYMENT.md) | Web Deployment || Document | Purpose | Status |

| ...fix an issue? | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common Issues |

| ...contribute code? | [CONTRIBUTING.md](./CONTRIBUTING.md) | Development Workflow ||----------|---------|--------|1. Start with [Project README](../README.md) for project overview

| ...implement multi-dataset? | [wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md) | Phase 1 |

| [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) ⭐ | Multi-dataset architecture plan | 📝 Active Planning |

### **"I want to understand..."**

2. Read [Quick Start Guide](../README.md#-quick-start) for setup│   ├── IMPLEMENTATION-QUICK-START.md      # Quick start for Phase 1 (6.3K) ⭐ NEW- **[fib-listening-vocabulary.md](../data/source/pte/vocabs/fib-listening-vocabulary.md)** - Fallback data source (original terms)

| Topic | Document | Section |

|-------|----------|---------|#### **Implementation** (1 document, ~6K)

| ...overall system design | [ARCHITECTURE.md](./ARCHITECTURE.md) | High-Level Architecture |

| ...data flow | [ARCHITECTURE.md](./ARCHITECTURE.md) | Data Pipeline Architecture || Document | Purpose | Status |

| ...component interactions | [ARCHITECTURE.md](./ARCHITECTURE.md) | Core Components |

| ...settings system | [ARCHITECTURE.md](./ARCHITECTURE.md) | Settings System Architecture ||----------|---------|--------|

| ...state management | [ARCHITECTURE.md](./ARCHITECTURE.md) | State Management Architecture |

| ...event system | [API-REFERENCE.md](./API-REFERENCE.md) | Event System || [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) ⭐ | Phase 1 quick start guide | 🔨 In Progress |### **For Developers**│   ├── LEARNING-MODE-VS-CATEGORY.md       # Learning mode concepts (6.6K)

| ...available APIs | [API-REFERENCE.md](./API-REFERENCE.md) | Table of Contents |



---

### **📦 Archive**1. Review [ARCHITECTURE.md](architecture/ARCHITECTURE.md) for system design

## 📊 Documentation Stats



| Category | Files | Purpose |

|----------|-------|---------|#### **Refactoring History** (1 document, ~8.4K)2. Check [WORKFLOW.md](guides/WORKFLOW.md) for development process│   └── REFACTORING-COMPLETE.md            # Refactoring history (8.4K)## 🎯 Documentation Purposes

| **Permanent** | 5 | Stable reference documentation |

| **WIP** | 2 | Active development docs || Document | Purpose | Date |

| **Archive** | 2 | Historical records |

| **Total** | **9** | Complete documentation set ||----------|---------|------|3. Reference [API.md](reference/API.md) for detailed API documentation



---| [REFACTORING-COMPLETE.md](archive/refactoring/REFACTORING-COMPLETE.md) | Complete refactoring summary & achievements | Oct 7, 2025 |



## 🎯 Documentation Principles│



Our documentation follows industry best practices:---



1. **📘 Clear Purpose** - Each file has a distinct, focused purpose### **For Current Implementation (Multi-Dataset)**

2. **🎯 Action-Oriented** - CONTRIBUTING, DEPLOYMENT (tells you HOW)

3. **📚 Reference-Focused** - ARCHITECTURE, API-REFERENCE (tells you WHAT)## 🔄 Documentation Workflow

4. **🔍 Searchable** - Clear headings, tables of contents

5. **✅ Current** - Actively maintained, dated when needed1. **Planning** → [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) ⭐├── planning/                              # Planning & Strategy| Document | Purpose | Audience | Content |

6. **🔗 Cross-Referenced** - Links between related topics

### **1. New Feature Planning**

---

```2. **Quick Start** → [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) ⭐

## 📝 Maintaining Documentation

Create → wip/planning/feature-name.md

### **When to Update**

```3. **Data Ingestion** → [DATA-INGESTION.md](guides/DATA-INGESTION.md)│   └── (Future planning documents)|----------|---------|----------|---------|

- **ARCHITECTURE.md**: When changing system design, adding major components

- **CONTRIBUTING.md**: When changing workflow, adding guidelines

- **API-REFERENCE.md**: When adding/changing public APIs

- **DEPLOYMENT.md**: When adding deployment targets, changing build process### **2. Active Implementation**

- **TROUBLESHOOTING.md**: When discovering new issues/solutions

```

### **For WIP Documents**

Create → wip/implementation/feature-implementation.md### **For DevOps/Deployment**│| **README.md** | Project overview & quick start | Users, developers | Features, setup, commands |

- Active development docs stay in `wip/`

- When complete → Update permanent docs → Archive or delete WIP```

- Keep `wip/` clean - only active work

1. Check [DEPLOYMENT.md](guides/DEPLOYMENT.md) for deployment instructions

### **For Archive**

### **3. Feature Completion**

- Move historical docs to `archive/`

- Keep for reference but clearly marked as historical```2. Review [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md) for common issues└── reference/                             # API & Technical Reference| **CLAUDE.md** | AI development guidance | AI assistants | Architecture context, commands |

- Don't delete - valuable for understanding decisions

wip/planning/* → Update permanent architecture docs

---

wip/implementation/* → Move to implementation/ or archive/

## 🧹 Recent Changes

```

### **October 7, 2025 - Documentation Refactoring**

- ✅ Consolidated 10 scattered files into 5 focused permanent docs---    ├── API.md                             # API documentation (14K)| **ARCHITECTURE.md** | System design | Developers, architects | Design patterns, components, improvements |

- ✅ Removed duplicate content and corrupted files

- ✅ Applied industry best practices (inspired by React, Vue, Next.js)### **4. Keep Clean**

- ✅ Created clear ARCHITECTURE, CONTRIBUTING, API-REFERENCE, DEPLOYMENT, TROUBLESHOOTING structure

- ✅ Archived historical design decisions- Only current work stays in `wip/`

- ✅ Updated this README with comprehensive navigation

- Completed features update permanent docs

**Result**: Clean, professional, industry-standard documentation! 🎉

- Old plans move to `archive/`## 📂 Documentation by Category    └── SETTINGS.md                        # Settings reference (11K)| **WORKFLOW.md** | Process flows | Developers, DevOps | Data flow, class interactions |

---



## 🚀 Current Focus

---

The project is expanding to support multiple PTE question types:



- ✅ **Vocabulary** (914 terms with IPA) - COMPLETE

- 🚧 **Repeat Sentence** (620 sentences) - Phase 1 Ready## 🚀 Current Focus: Multi-Dataset Implementation### **📘 Permanent Documentation**```| **API.md** | API reference | Developers | Class methods, usage examples |

- 🚧 **Answer Short Question** (692 questions) - Phase 1 Ready

- 🚧 **Write From Dictation** (1,195 sentences) - Phase 1 Ready



**See**: [wip/planning/DATASET-DESIGN-STRATEGY.md](./wip/planning/DATASET-DESIGN-STRATEGY.md)The project is expanding beyond vocabulary to support all PTE question types:



---



**Documentation Status**: ✅ **PROFESSIONAL & INDUSTRY-STANDARD**  - ✅ **Vocabulary** (914 terms with IPA) - COMPLETE & PERMANENT#### **🏗️ Architecture** (3 documents, ~55K)| **SETTINGS.md** | Settings panel guide | Users, developers | Configuration options, features |

**Permanent Docs**: ✅ **5 focused, comprehensive files**  

**Structure**: ✅ **Follows open-source best practices**  - 🚧 **Repeat Sentence (RS)** (620 sentences) - Phase 1 (WIP)

**Maintainability**: ✅ **Clear, organized, scalable**

- 🚧 **Answer Short Question (ASQ)** (692 questions) - Phase 1 (WIP)| Document | Purpose | Audience |

---

- 🚧 **Write From Dictation (WFD)** (1,195 sentences) - Phase 1 (WIP)

Need help? Start with the **Quick Navigation** section above! 🎯

|----------|---------|----------|---| **SETTINGS-ARCHITECTURE.md** | Settings system design | Developers, architects | Architecture, dependencies, API |

**Current WIP Documents**:

1. [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) - Complete architecture & 15 system considerations| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Complete system architecture | Developers, Architects |

2. [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) - Phase 1 step-by-step guide

| [SETTINGS-ARCHITECTURE.md](architecture/SETTINGS-ARCHITECTURE.md) | Settings system design | Developers || **STATE-MANAGEMENT-CONSOLIDATION.md** | State management | Developers, architects | State architecture, data flow |

**When Complete**:

- Update [ARCHITECTURE.md](architecture/ARCHITECTURE.md) with multi-dataset design| [STATE-MANAGEMENT-CONSOLIDATION.md](architecture/STATE-MANAGEMENT-CONSOLIDATION.md) | State management | Developers |

- Update [DATA-INGESTION.md](guides/DATA-INGESTION.md) with new dataset types

- Move WIP implementation guide to [implementation/](implementation/) or [archive/](archive/)## 🎯 Quick Navigation| **LEARNING-MODE-VS-CATEGORY.md** | Learning mode system | Developers, architects | Mode design, implementation |

- Update [WORKFLOW.md](guides/WORKFLOW.md) with new processes

#### **📖 Guides** (4 documents, ~37K)

---

| Document | Purpose | Audience || **DEPLOYMENT.md** | Deployment guide | DevOps, developers | Platform deployment, CI/CD |

## 🔍 Finding What You Need

|----------|---------|----------|

### **"How do I..."**

- **...set up the project?** → [Project README](../README.md)| [DATA-INGESTION.md](guides/DATA-INGESTION.md) | Add new datasets | Content Creators |### **For New Users**| **TROUBLESHOOTING.md** | Issue resolution | Users, developers | Common problems, solutions |

- **...add a new dataset?** → [DATA-INGESTION.md](guides/DATA-INGESTION.md)

- **...implement multi-dataset support?** → [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) 🚧| [DEPLOYMENT.md](guides/DEPLOYMENT.md) | Deploy the app | DevOps |

- **...start Phase 1?** → [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) 🚧

- **...deploy the app?** → [DEPLOYMENT.md](guides/DEPLOYMENT.md)| [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md) | Fix common issues | Users, Developers |1. Start with [Project README](../README.md) for project overview| **Data files** | Vocabulary content | Content creators | IPA pronunciations, terms |

- **...fix an issue?** → [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)

- **...use an API?** → [API.md](reference/API.md)| [WORKFLOW.md](guides/WORKFLOW.md) | Development workflow | Developers |



### **"I want to understand..."**2. Read [Quick Start Guide](../README.md#-quick-start) for setup

- **...the overall system** → [ARCHITECTURE.md](architecture/ARCHITECTURE.md) 📘

- **...data flow** → [WORKFLOW.md](guides/WORKFLOW.md) 📘#### **🔨 Implementation** (2 documents, ~15K)

- **...settings** → [SETTINGS-ARCHITECTURE.md](architecture/SETTINGS-ARCHITECTURE.md) 📘

- **...state management** → [STATE-MANAGEMENT-CONSOLIDATION.md](architecture/STATE-MANAGEMENT-CONSOLIDATION.md) 📘| Document | Purpose | Audience |## 🔄 Documentation Relationships

- **...learning modes** → [LEARNING-MODE-VS-CATEGORY.md](implementation/LEARNING-MODE-VS-CATEGORY.md) 📘

|----------|---------|----------|

### **"What happened in the past?"**

- **...refactoring history** → [REFACTORING-COMPLETE.md](archive/refactoring/REFACTORING-COMPLETE.md) 📦| [LEARNING-MODE-VS-CATEGORY.md](implementation/LEARNING-MODE-VS-CATEGORY.md) | Learning mode concepts | Developers |### **For Developers**



---| [REFACTORING-COMPLETE.md](implementation/REFACTORING-COMPLETE.md) | Refactoring history | Developers |



## 📝 Contributing to Documentation1. Review [ARCHITECTURE.md](architecture/ARCHITECTURE.md) for system design```mermaid



### **When adding new documentation:**#### **📚 Reference** (2 documents, ~25K)



1. **Choose the right location**:| Document | Purpose | Audience |2. Check [WORKFLOW.md](guides/WORKFLOW.md) for development processgraph TD

   - **Active planning/design** → `wip/planning/`

   - **Active implementation guide** → `wip/implementation/`|----------|---------|----------|

   - **Completed architecture** → `architecture/`

   - **Stable how-to guide** → `guides/`| [API.md](reference/API.md) | API documentation | Developers |3. Reference [API.md](reference/API.md) for detailed API documentation    A[README.md<br/>Main Entry Point] --> B[ARCHITECTURE.md<br/>System Design]

   - **Completed feature notes** → `implementation/`

   - **API/technical specs** → `reference/`| [SETTINGS.md](reference/SETTINGS.md) | Settings reference | Users, Developers |

   - **Old/superseded docs** → `archive/`

    A --> C[WORKFLOW.md<br/>Process Flows]

2. **Update this README** in the appropriate section

### **🚧 Work-in-Progress (WIP)**

3. **When feature completes**:

   - Update relevant permanent docs### **For Contributors (Adding Datasets)**    A --> D[CLAUDE.md<br/>AI Guidance]

   - Move or archive WIP docs

   - Keep `wip/` clean and current#### **Planning** (1 document, ~35K)



4. **Naming conventions**:| Document | Purpose | Status |1. Read [DATA-INGESTION.md](guides/DATA-INGESTION.md) for dataset guidelines    A --> E[API.md<br/>API Reference]

   - Use `UPPERCASE-WITH-DASHES.md`

   - Be descriptive: `MULTI-DATASET-IMPLEMENTATION.md` not `IMPL.md`|----------|---------|--------|



---| [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) ⭐ | Multi-dataset architecture plan | 📝 Active Planning |2. Review [DATASET-DESIGN-STRATEGY.md](architecture/DATASET-DESIGN-STRATEGY.md) for multi-dataset architecture ⭐    A --> F[SETTINGS.md<br/>Settings Guide]



## 📊 Documentation Stats



| Category | Files | Total Size | Status |#### **Implementation** (1 document, ~6K)3. Follow [IMPLEMENTATION-QUICK-START.md](implementation/IMPLEMENTATION-QUICK-START.md) for Phase 1 ⭐    A --> G[SETTINGS-ARCHITECTURE.md<br/>Settings Design]

|----------|-------|------------|--------|

| **Permanent** | 10 | ~124K | ✅ Stable || Document | Purpose | Status |

| **WIP** | 2 | ~41K | 🚧 Active |

| **Archive** | 1 | ~8.4K | 📦 Historical ||----------|---------|--------|    A --> H[DEPLOYMENT.md<br/>Deployment Guide]

| **Total** | **13** | **~173K** | Complete |

| [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) ⭐ | Phase 1 quick start guide | 🔨 In Progress |

---

### **For DevOps/Deployment**    A --> I[TROUBLESHOOTING.md<br/>Issue Resolution]

## 🎯 Documentation Principles

---

1. **📘 Permanent = Stable**: Main docs are reliable reference

2. **🚧 WIP = Active**: Work-in-progress clearly separated1. Check [DEPLOYMENT.md](guides/DEPLOYMENT.md) for deployment instructions

3. **📦 Archive = History**: Old docs preserved but out of the way

4. **🔄 Clean Flow**: WIP → Permanent → Archive## 🔄 Documentation Workflow

5. **✅ Always Updated**: README reflects current structure

2. Review [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md) for common issues    C --> I[Class Interactions]

---

### **1. New Feature Planning**

## 🧹 Cleanup History

```    D --> J[Development Context]

### **October 7, 2025**

- ✅ Deleted 4 temporary files from `docs/` (.restructure-plan.txt, restructure-wip.sh, README-old.md, README.md.backup)Create → wip/planning/feature-name.md

- ✅ Moved REFACTORING-COMPLETE.md to `archive/refactoring/`

- ✅ Deleted 3 deployment trigger files from project root```---    E --> K[Usage Examples]

- ✅ Renamed `data/source/pte/vocabs/temp.md` → `pte-ra-vocabulary.md` (795 RA terms)

- ✅ Cleaned project to pristine state - zero temporary files remaining



---### **2. Active Implementation**    F --> L[Platform Guides]



**Status**: ✅ **CLEAN & ORGANIZED**  ```

**Permanent Docs**: ✅ **10 stable reference documents**  

**WIP Docs**: 🚧 **2 active planning/implementation guides**  Create → wip/implementation/feature-implementation.md## 📂 Documentation by Category    G --> M[Common Solutions]

**Archive**: 📦 **1 historical refactoring record**  

**Current Focus**: 🔨 **Multi-Dataset Implementation (Phase 1 Ready)**```



📘 = Permanent (stable reference)  

🚧 = Work-in-Progress (active development)  

📦 = Archive (historical record)  ### **3. Feature Completion**

⭐ = New for multi-dataset feature (October 2025)

```### **🏗️ Architecture** (4 documents, ~90K)    N[Data Files] --> O[Vocabulary Content]

wip/planning/* → Update permanent architecture docs

wip/implementation/* → Move to implementation/ or archive/    O --> A

```

| Document | Purpose | Audience |```

### **4. Keep Clean**

- Only current work stays in `wip/`|----------|---------|----------|

- Completed features update permanent docs

- Old plans move to `archive/`| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Complete system architecture | Developers, Architects |## 📋 Documentation Standards



---| [DATASET-DESIGN-STRATEGY.md](architecture/DATASET-DESIGN-STRATEGY.md) ⭐ | Multi-dataset architecture plan | Developers, Architects |



## 🚀 Current Focus: Multi-Dataset Implementation| [SETTINGS-ARCHITECTURE.md](architecture/SETTINGS-ARCHITECTURE.md) | Settings system design | Developers |### **Consistency Rules**



The project is expanding beyond vocabulary to support all PTE question types:| [STATE-MANAGEMENT-CONSOLIDATION.md](architecture/STATE-MANAGEMENT-CONSOLIDATION.md) | State management | Developers |- ✅ All documents reference PTE-focused architecture



- ✅ **Vocabulary** (914 terms with IPA) - COMPLETE & PERMANENT- ✅ All commands use `npm run data:pte` (not old resume commands)

- 🚧 **Repeat Sentence (RS)** (620 sentences) - Phase 1 (WIP)

- 🚧 **Answer Short Question (ASQ)** (692 questions) - Phase 1 (WIP)### **📖 Guides** (4 documents, ~37K)- ✅ All data references point to 914 PTE terms

- 🚧 **Write From Dictation (WFD)** (1,195 sentences) - Phase 1 (WIP)

- ✅ All architecture references centralized configuration

**Current WIP Documents**:

1. [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) - Complete architecture & 15 system considerations| Document | Purpose | Audience |

2. [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) - Phase 1 step-by-step guide

|----------|---------|----------|### **Cross-References**

**When Complete**:

- Update [ARCHITECTURE.md](architecture/ARCHITECTURE.md) with multi-dataset design| [DATA-INGESTION.md](guides/DATA-INGESTION.md) | Add new datasets | Content Creators |- Each document links to related documentation

- Update [DATA-INGESTION.md](guides/DATA-INGESTION.md) with new dataset types

- Move WIP implementation guide to [implementation/](implementation/) or [archive/](archive/)| [DEPLOYMENT.md](guides/DEPLOYMENT.md) | Deploy the app | DevOps |- README.md serves as the main entry point

- Update [WORKFLOW.md](guides/WORKFLOW.md) with new processes

| [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md) | Fix common issues | Users, Developers |- Technical docs reference each other appropriately

---

| [WORKFLOW.md](guides/WORKFLOW.md) | Development workflow | Developers |- Data files are referenced from main documentation

## 🔍 Finding What You Need



### **"How do I..."**

- **...set up the project?** → [Project README](../README.md)### **🔨 Implementation** (3 documents, ~21K)## 🎯 Key Documentation Principles

- **...add a new dataset?** → [DATA-INGESTION.md](guides/DATA-INGESTION.md)

- **...implement multi-dataset support?** → [DATASET-DESIGN-STRATEGY.md](wip/planning/DATASET-DESIGN-STRATEGY.md) 🚧

- **...start Phase 1?** → [IMPLEMENTATION-QUICK-START.md](wip/implementation/IMPLEMENTATION-QUICK-START.md) 🚧

- **...deploy the app?** → [DEPLOYMENT.md](guides/DEPLOYMENT.md)| Document | Purpose | Audience |1. **Single Source of Truth**: Each topic documented in one primary location

- **...fix an issue?** → [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)

- **...use an API?** → [API.md](reference/API.md)|----------|---------|----------|2. **Clear Hierarchy**: README → Technical Docs → Data Files



### **"I want to understand..."**| [IMPLEMENTATION-QUICK-START.md](implementation/IMPLEMENTATION-QUICK-START.md) ⭐ | Phase 1 quick start | Developers |3. **Consistent Terminology**: PTE-focused throughout

- **...the overall system** → [ARCHITECTURE.md](architecture/ARCHITECTURE.md) 📘

- **...data flow** → [WORKFLOW.md](guides/WORKFLOW.md) 📘| [LEARNING-MODE-VS-CATEGORY.md](implementation/LEARNING-MODE-VS-CATEGORY.md) | Learning mode concepts | Developers |4. **Cross-Referenced**: Documents link to related content

- **...settings** → [SETTINGS-ARCHITECTURE.md](architecture/SETTINGS-ARCHITECTURE.md) 📘

- **...state management** → [STATE-MANAGEMENT-CONSOLIDATION.md](architecture/STATE-MANAGEMENT-CONSOLIDATION.md) 📘| [REFACTORING-COMPLETE.md](implementation/REFACTORING-COMPLETE.md) | Refactoring history | Developers |5. **Up-to-Date**: All documentation reflects current architecture

- **...learning modes** → [LEARNING-MODE-VS-CATEGORY.md](implementation/LEARNING-MODE-VS-CATEGORY.md) 📘



---

### **📚 Reference** (2 documents, ~25K)## 🚀 Quick Navigation

## 📝 Contributing to Documentation



### **When adding new documentation:**

| Document | Purpose | Audience |### **For Users**

1. **Choose the right location**:

   - **Active planning/design** → `wip/planning/`|----------|---------|----------|- Start with [README.md](../README.md) for project overview

   - **Active implementation guide** → `wip/implementation/`

   - **Completed architecture** → `architecture/`| [API.md](reference/API.md) | API documentation | Developers |- Use [Quick Start](../README.md#-quick-start) for setup

   - **Stable how-to guide** → `guides/`

   - **Completed feature notes** → `implementation/`| [SETTINGS.md](reference/SETTINGS.md) | Settings reference | Users, Developers |

   - **API/technical specs** → `reference/`

   - **Old/superseded docs** → `archive/`### **For Developers**



2. **Update this README** in the appropriate section**Total**: 13 documents, ~173K- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design



3. **When feature completes**:- Check [WORKFLOW.md](WORKFLOW.md) for process flows

   - Update relevant permanent docs

   - Move or archive WIP docs---- Reference [CLAUDE.md](../CLAUDE.md) for development context

   - Keep `wip/` clean and current



4. **Naming conventions**:

   - Use `UPPERCASE-WITH-DASHES.md`## 🔍 Finding What You Need### **For Content Creators**

   - Be descriptive: `MULTI-DATASET-IMPLEMENTATION.md` not `IMPL.md`

- Review [pte-fib-listening-with-ipa.md](../data/source/pte/vocabs/pte-fib-listening-with-ipa.md) for data format

---

### **"How do I..."**- Check [ARCHITECTURE.md](ARCHITECTURE.md) for data pipeline

## 📊 Documentation Stats

- **...set up the project?** → [Project README](../README.md)

| Category | Files | Total Size | Status |

|----------|-------|------------|--------|- **...add a new dataset?** → [DATA-INGESTION.md](guides/DATA-INGESTION.md)---

| **Permanent** | 11 | ~132K | ✅ Stable |

| **WIP** | 2 | ~41K | 🚧 Active |- **...implement multi-dataset support?** → [DATASET-DESIGN-STRATEGY.md](architecture/DATASET-DESIGN-STRATEGY.md) ⭐

| **Archive** | 0 | 0 | 📦 Empty |

| **Total** | **13** | **~173K** | Complete |- **...start Phase 1?** → [IMPLEMENTATION-QUICK-START.md](implementation/IMPLEMENTATION-QUICK-START.md) ⭐**Documentation Status**: ✅ **COMPLETE & CONSISTENT**



---- **...deploy the app?** → [DEPLOYMENT.md](guides/DEPLOYMENT.md)**PTE Focus**: ✅ **ALL DOCUMENTS ALIGNED**



## 🎯 Documentation Principles- **...fix an issue?** → [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md)**Cross-References**: ✅ **PROPERLY LINKED**



1. **📘 Permanent = Stable**: Main docs are reliable reference- **...use an API?** → [API.md](reference/API.md)

2. **🚧 WIP = Active**: Work-in-progress clearly separated

3. **📦 Archive = History**: Old docs preserved but out of the way### **"I want to understand..."**

4. **🔄 Clean Flow**: WIP → Permanent → Archive- **...the overall system** → [ARCHITECTURE.md](architecture/ARCHITECTURE.md)

5. **✅ Always Updated**: README reflects current structure- **...data flow** → [WORKFLOW.md](guides/WORKFLOW.md)

- **...settings** → [SETTINGS-ARCHITECTURE.md](architecture/SETTINGS-ARCHITECTURE.md)

---- **...state management** → [STATE-MANAGEMENT-CONSOLIDATION.md](architecture/STATE-MANAGEMENT-CONSOLIDATION.md)

- **...learning modes** → [LEARNING-MODE-VS-CATEGORY.md](implementation/LEARNING-MODE-VS-CATEGORY.md)

**Status**: ✅ **ORGANIZED WITH PERMANENT/WIP SEPARATION**  

**Permanent Docs**: ✅ **11 stable reference documents**  ---

**WIP Docs**: 🚧 **2 active planning/implementation guides**  

**Current Focus**: 🔨 **Multi-Dataset Implementation (Phase 1)**## 🚀 Current Focus: Multi-Dataset Implementation



📘 = Permanent (stable reference)  The project is expanding beyond vocabulary to support all PTE question types:

🚧 = Work-in-Progress (active development)  

⭐ = New for multi-dataset feature (October 2025)- ✅ **Vocabulary** (914 terms with IPA) - COMPLETE

- 🔨 **Repeat Sentence (RS)** (620 sentences) - Phase 1
- 🔨 **Answer Short Question (ASQ)** (692 questions) - Phase 1
- 🔨 **Write From Dictation (WFD)** (1,195 sentences) - Phase 1

**Start Here**:
1. [DATASET-DESIGN-STRATEGY.md](architecture/DATASET-DESIGN-STRATEGY.md) - Complete architecture
2. [IMPLEMENTATION-QUICK-START.md](implementation/IMPLEMENTATION-QUICK-START.md) - Phase 1 guide

---

## 📝 Contributing to Documentation

When adding new documentation:

1. **Choose the right category**:
   - System design → `architecture/`
   - How-to guides → `guides/`
   - Implementation → `implementation/`
   - API/specs → `reference/`
   - Planning → `planning/`

2. **Update this README** in the appropriate section
3. **Cross-reference** related documents
4. **Use naming**: `UPPERCASE-WITH-DASHES.md`

---

**Status**: ✅ **ORGANIZED & CURRENT**  
**Focus**: 🔨 **Multi-Dataset (Phase 1)**

⭐ = New (October 2025)
