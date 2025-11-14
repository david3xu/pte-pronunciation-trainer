# TypeScript Legacy Modules Archive

**Archived Date**: 2025-11-14
**Archive Reason**: React migration complete - these modules have been replaced by React components

## What Was Archived

This directory contains TypeScript modules that were part of the vanilla JavaScript to TypeScript migration (Phase 1), but have since been replaced by React components (Phase 5).

### `core/` - Legacy Application Core (5 modules)

**Replaced by**: `src/components/` + `src/ts/stores/` (Zustand)

- **`PTEApp.ts`** - Main application coordinator
  - **Replaced by**: `src/App.tsx` (React component)

- **`PTEVocabularyManager.ts`** - Vocabulary loading and management
  - **Replaced by**: `src/ts/stores/index.ts` vocabulary slice (Zustand)

- **`SettingsModule.ts`** - Settings management with event handlers
  - **Replaced by**: `src/ts/stores/index.ts` settings slice + `src/components/settings/SettingsPanel.tsx`

- **`ProgressTracker.ts`** - Progress tracking and statistics
  - **Replaced by**: `src/ts/stores/index.ts` progress slice

- **`InitializationManager.ts`** - Dependency management and initialization order
  - **Replaced by**: React's declarative rendering + `useEffect` hooks in `src/App.tsx`

### `ui/` - Legacy UI Controllers (4 modules)

**Replaced by**: `src/components/` (React components)

- **`UIController.ts`** - DOM manipulation and UI updates
  - **Replaced by**: React's declarative rendering

- **`SettingsPanel.ts`** - Settings UI management
  - **Replaced by**: `src/components/settings/SettingsPanel.tsx` (React component)

- **`AnalyticsDashboard.ts`** - Analytics display
  - **Replaced by**: `src/components/analytics/` components (if implemented)

- **`AuthUI.ts`** - Authentication UI
  - **Replaced by**: Supabase Auth UI components

### `audio/` - Legacy Audio Controllers (1 module)

**Still Active** (in `src/ts/audio/`):
- ✅ `TTSEngine.ts` - Core TTS functionality (actively used)
- ✅ `pollyService.ts` - Amazon Polly integration (actively used)
- ✅ `VoiceSelector.ts` - Voice matching logic (used by TTSEngine via window.voiceSelector)

**Archived**:
- **`AudioControls.ts`** - Audio playback controls
  - **Replaced by**: `src/components/audio/AudioControls.tsx` (React component)

## Architecture Evolution

### Phase 1: Vanilla JS → TypeScript (October 2025)
- Converted 35 vanilla JavaScript modules to TypeScript
- Maintained EventBus architecture
- Introduced type safety with strict mode

### Phase 2-4: Gradual React Migration (November 2025)
- Created React components alongside vanilla TS modules
- Both systems coexisted during transition
- Zustand replaced EventBus for state management

### Phase 5: Complete React Migration (November 2025)
- All UI moved to React components
- Zustand handles all state management
- Legacy modules archived (this directory)

## Key Differences: Legacy vs React

| Aspect | Legacy (Archived) | React (Current) |
|--------|------------------|-----------------|
| **State Management** | EventBus + manual sync | Zustand (reactive) |
| **UI Updates** | Imperative DOM manipulation | Declarative rendering |
| **Data Flow** | Event-driven (emit/on) | Props + hooks |
| **Initialization** | Topological sort (InitializationManager) | React lifecycle (useEffect) |
| **Settings** | Handler registry pattern | Zustand actions |
| **Type Safety** | Manual type guards | React + Zustand types |

## Why This Migration Happened

1. **Reactivity**: React components automatically re-render on state changes
2. **Maintainability**: Declarative code is easier to reason about
3. **Ecosystem**: Access to React component libraries (Radix UI)
4. **Performance**: React's reconciliation is more efficient than manual DOM updates
5. **Developer Experience**: Better debugging tools (React DevTools)

## Can These Be Deleted?

**Not yet recommended.** Keep archived for:

1. **Reference**: Understanding legacy patterns and migration decisions
2. **Rollback**: In case critical functionality was missed during migration
3. **Documentation**: Shows evolution of architecture over time
4. **Learning**: Examples of different architectural patterns

**Consider deletion after**: 3-6 months of stable production use of React version (target: May 2026)

## Related Documentation

- **Migration History**: See `CHANGELOG.md` for detailed migration timeline
- **Current Architecture**: See `docs/architecture/ARCHITECTURE.md`
- **Component Docs**: See `src/components/README.md` (if exists)
- **Vanilla JS Archive**: See `archive/vanilla-js-legacy/` for pre-TypeScript code

## Verification

To verify these modules are truly unused:

```bash
# Search for imports from archived modules (should find 0 results)
grep -r "from.*ts/core" src/components/ src/App.tsx
grep -r "from.*ts/ui" src/components/ src/App.tsx
grep -r "from.*ts/audio/AudioControls" src/components/
grep -r "from.*ts/audio/VoiceSelector" src/components/

# Verify build succeeds without these modules
npm run build
```

Last verified: 2025-11-14 ✅

---

**Archive Maintainer**: Claude Code
**Review Date**: 2026-05-14 (suggested deletion review date)
