# 🚀 Quick Start - Lifecycle Planning

**For developers who want to get started quickly**

---

## ✅ Complete Lifecycle Documentation Created!

The following comprehensive planning documents have been created in `docs/lifecycle/`:

### 📚 Available Documents

1. **[README.md](./README.md)** - Index and navigation guide
2. **[LIFECYCLE-OVERVIEW.md](./LIFECYCLE-OVERVIEW.md)** - Complete project lifecycle (phases, status, roadmap)
3. **[ARCHITECTURE-DESIGN.md](./ARCHITECTURE-DESIGN.md)** - System architecture, module interactions, data flow

### 🎯 What You Have Now

**Complete Architecture Documentation:**
- ✅ High-level system architecture diagrams
- ✅ Layer-by-layer breakdown (5 layers)
- ✅ Module interaction flows with examples
- ✅ Data flow diagrams (vocabulary loading, auth, practice sessions)
- ✅ Zustand state management patterns
- ✅ API architecture and endpoints
- ✅ Database schema (Supabase)
- ✅ Component hierarchy (React)
- ✅ Integration patterns (4 key patterns)

**Lifecycle Planning:**
- ✅ Phase 1-3 status tracking (95% complete)
- ✅ Development stages (local → testing → staging → production)
- ✅ Quality gates (pre-commit, pre-PR, pre-merge, pre-release)
- ✅ Release strategy (SemVer, cadence)
- ✅ Success metrics (technical, user, business)

---

## 📂 Directory Structure Overview

```
ccl-pronunciation-trainer/
│
├── src/
│   ├── components/          # React components (13 files)
│   │   ├── WordCard.tsx
│   │   ├── AudioControls.tsx
│   │   ├── AIRecommendations.tsx
│   │   ├── AITutorChat.tsx  (stub)
│   │   └── ...
│   │
│   ├── ts/                  # TypeScript source (33 files)
│   │   ├── audio/           # Audio services (TTS, Polly, Controls)
│   │   ├── core/            # Core logic (App, VocabManager, Settings)
│   │   ├── data/            # Data pipeline (extractors, managers)
│   │   ├── stores/          # Zustand state management
│   │   ├── supabase/        # Supabase services (auth, sync)
│   │   ├── ai/              # AI services (Gemini recommendations)
│   │   ├── analytics/       # PostHog analytics
│   │   ├── ui/              # UI controllers
│   │   ├── utils/           # Utilities (EventBus, Storage)
│   │   └── shared/          # Shared types (Config, DataSchema)
│   │
│   ├── js/                  # Compiled JavaScript (from ts/)
│   ├── css/                 # Styles (Tailwind + custom)
│   └── App.tsx              # Root React component
│
├── api/                     # Vercel serverless functions (7 files)
│   ├── ai-recommendations.ts
│   ├── ai-tutor.ts
│   ├── ai/chat.ts
│   ├── pronunciation-score.ts
│   ├── premium-tts.ts
│   ├── audio/generate.ts
│   └── voices.ts
│
├── data/
│   ├── source/pte/          # Markdown source files
│   └── processed/           # JSON datasets (generated)
│
├── scripts/
│   └── pte-data-pipeline.js # Markdown → JSON processor
│
├── docs/                    # Documentation
│   ├── lifecycle/           # 🆕 Lifecycle planning docs
│   │   ├── README.md
│   │   ├── LIFECYCLE-OVERVIEW.md
│   │   └── ARCHITECTURE-DESIGN.md
│   │
│   ├── GUIDELINES.md        # Design principles
│   ├── ARCHITECTURE.md      # Detailed architecture (2,230 lines)
│   ├── API-REFERENCE.md     # API documentation
│   ├── CLAUDE.md            # AI assistant guide
│   └── ...
│
├── tests/                   # Test files
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🧪 Testing Quick Reference

### Run Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
```

### Current Status
- ✅ Test infrastructure: Complete (Vitest + React Testing Library)
- ⚠️ Test coverage: 65% (target: 80%)
- ✅ Tests written: WordCard.test.tsx, App.test.tsx

### Where to Add Tests
```
src/components/ComponentName.tsx
  → Create: src/components/ComponentName.test.tsx

src/ts/module/Service.ts
  → Create: src/ts/module/Service.test.ts
```

---

## 🔄 Development Workflow

### Daily Development

1. **Start Dev Server**
   ```bash
   npm run dev              # Vite dev server on port 3001
   ```

2. **Make Changes**
   - Edit React components in `src/components/`
   - Edit TypeScript services in `src/ts/`
   - Vite HMR will auto-reload

3. **Compile TypeScript** (if editing `src/ts/`)
   ```bash
   npm run compile:ts       # Compile TS → JS
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Lint & Type Check**
   ```bash
   npm run lint             # ESLint + TypeScript check
   ```

### Adding New Features

1. **Plan** - Review ARCHITECTURE-DESIGN.md for patterns
2. **Create** - Add files in appropriate directories
3. **Test** - Write tests (TDD approach recommended)
4. **Document** - Update relevant docs
5. **Review** - Create PR for review

---

## 🎯 Current Focus Areas

### Immediate Priorities (Next 2 Weeks)

1. **Complete AI Tutor Chat UI** 
   - File: `src/components/AITutorChat.tsx`
   - Backend: ✅ Done (`api/ai/chat.ts`)
   - Frontend: ❌ Stub only
   - Estimate: 2 days

2. **Complete Pronunciation Scoring UI**
   - File: `src/components/PronunciationScoring.tsx`
   - Backend: ✅ Done (`api/pronunciation-score.ts`)
   - Frontend: ❌ Stub only
   - Estimate: 3 days

3. **Increase Test Coverage**
   - Current: 65%
   - Target: 80%
   - Estimate: 1 week

---

## 📊 Architecture at a Glance

### Key Principles
1. **Configuration-driven** - All config in `Config.ts`
2. **State-driven** - Zustand manages all state
3. **Component-based** - React functional components
4. **Type-safe** - TypeScript 100%
5. **API-first** - Backend via Vercel Functions
6. **Offline-capable** - Service Worker caching

### Data Flow Pattern
```
User Action → Component → Zustand Action → Service → API/State Update → Re-render
```

### State Management
```
useAppStore (Zustand)
  ├── audio         (playback state)
  ├── tts           (text-to-speech)
  ├── settings      (user preferences)
  ├── vocabulary    (current dataset)
  ├── progress      (learning progress)
  ├── ui            (modals, notifications)
  └── auth          (user session)
```

---

## 🛠️ Common Tasks

### Add a New React Component

1. Create file: `src/components/MyComponent.tsx`
   ```typescript
   import React from 'react';
   import { useAppStore } from '../ts/stores';

   export const MyComponent: React.FC = () => {
     const { data } = useAppStore((state) => state.mySlice);
     return <div>{data}</div>;
   };
   ```

2. Create test: `src/components/MyComponent.test.tsx`
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { MyComponent } from './MyComponent';

   test('renders correctly', () => {
     render(<MyComponent />);
     expect(screen.getByText(/expected/i)).toBeInTheDocument();
   });
   ```

3. Import in `App.tsx` or parent component

### Add a New API Endpoint

1. Create file: `api/my-endpoint.ts`
   ```typescript
   import { VercelRequest, VercelResponse } from '@vercel/node';

   export default async function handler(
     req: VercelRequest,
     res: VercelResponse
   ) {
     if (req.method !== 'POST') {
       return res.status(405).json({ error: 'Method not allowed' });
     }

     try {
       // Your logic here
       const result = await processRequest(req.body);
       return res.status(200).json(result);
     } catch (error) {
       return res.status(500).json({ error: error.message });
     }
   }
   ```

2. Test locally: `http://localhost:3001/api/my-endpoint`

### Add a New Zustand Store Slice

1. Update `src/ts/stores/types.ts`:
   ```typescript
   export interface MySliceState {
     data: string;
     setData: (data: string) => void;
   }
   ```

2. Add slice to `src/ts/stores/index.ts`:
   ```typescript
   mySlice: {
     data: '',
     setData: (data) => set((state) => ({
       mySlice: { ...state.mySlice, data }
     })),
   }
   ```

---

## 📖 Further Reading

- **[LIFECYCLE-OVERVIEW.md](./LIFECYCLE-OVERVIEW.md)** - Complete lifecycle details
- **[ARCHITECTURE-DESIGN.md](./ARCHITECTURE-DESIGN.md)** - Architecture deep dive
- **[../GUIDELINES.md](../GUIDELINES.md)** - Design principles
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Detailed technical architecture

---

## 🤝 Need Help?

1. Check the relevant lifecycle document
2. Review existing code patterns
3. Check ARCHITECTURE.md for detailed explanations
4. Ask in team chat/create issue

---

**Last Updated:** 2025-11-12
**Quick Start Version:** 1.0
