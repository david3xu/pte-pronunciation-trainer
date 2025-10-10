---
description: Remind AI to follow project guidelines strictly
---

# Enforce Project Guidelines

You MUST follow these rules for the PTE Pronunciation Trainer:

## Critical Rules (NEVER violate)

1. **Zero Hardcoded Values**
   - Get ALL values from `Config.js`: `window.appConfig.get('path.to.value')`
   - Never hardcode event names, paths, settings, CSS values

2. **Event-Driven Communication**
   - Use EventBus ONLY: `window.eventBus.emit('event:name', data)`
   - Never call methods directly between modules

3. **CSS Design Tokens**
   - Use variables: `var(--primary-color)`, `var(--space-lg)`
   - Never hardcode colors, spacing, transitions

4. **Settings Handler Registry**
   - Change via events: `emit('settings:request-change', {key, value})`
   - Never call `settingsModule.setSetting()` directly

## Before Making Changes

Read in order:
1. `CLAUDE.md` - AI guidance
2. `docs/GUIDELINES.md` - Design principles
3. Relevant `docs/ARCHITECTURE.md` sections

## Verification Checklist

Ask yourself before suggesting code:
- [ ] Are all values from Config.js?
- [ ] Is communication via EventBus?
- [ ] Are event names from Config.js?
- [ ] Does CSS use design tokens?
- [ ] Are dependencies injected?
- [ ] Is error handling present?

**If uncertain about any rule, ask the user before proceeding.**

Now proceed with the user's request while following these rules.
