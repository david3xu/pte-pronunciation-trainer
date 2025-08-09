# CCL Pronunciation Trainer - UX-Focused Design Prototype

## Minimalist Learning-First Design

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           16:9 VIEWPORT (NO SCROLLING)                              │
│                                                                                     │
│                     ┌─ MINIMAL HEADER (Hidden on Mobile) ─┐                        │
│                     │        🎧 CCL Trainer               │                        │
│                     └─────────────────────────────────────┘                        │
│                                                                                     │
│    ┌─────────────────── MAIN LEARNING AREA (80% HEIGHT) ───────────────────┐      │
│    │                                                                        │      │
│    │                                                                        │      │
│    │                      Be entitled for sth.                             │      │
│    │                         有权获得                                        │      │
│    │                                                                        │      │
│    │                         5 of 20                                       │      │
│    │                                                                        │      │
│    │                      🔴 Hard Level                                     │      │
│    │                                                                        │      │
│    └────────────────────────────────────────────────────────────────────────┘      │
│                                                                                     │
│    ┌───────────────── ESSENTIAL CONTROLS (20% HEIGHT) ─────────────────────┐      │
│    │                                                                        │      │
│    │     [    ▶️ PLAY    ]    [⏮️ PREV]    [⏭️ NEXT]                       │      │
│    │                                                                        │      │
│    │              Social Welfare  •  [⚙️ Settings]                         │      │
│    │                                                                        │      │
│    └────────────────────────────────────────────────────────────────────────┘      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## UX Design Principles Applied

### Core Learning Focus
```
80% WORD LEARNING ────── 20% ESSENTIAL CONTROLS
├── Large, clear text     ├── Play button (primary action)
├── High contrast         ├── Navigation (prev/next)
├── Minimal distractions  └── Context (category + settings)
└── Simple progress
```

### Visual Hierarchy (User-Centered)
```
1. ENGLISH WORD     (Largest, center, high contrast)
2. CHINESE WORD     (Large, center, accent color)  
3. SIMPLE PROGRESS  (Small, clear: "5 of 20")
4. PLAY BUTTON      (Primary action, blue)
5. NAVIGATION       (Secondary, smaller)
6. CONTEXT INFO     (Smallest, subtle)
```

### Touch-Friendly Mobile Design
```
📱 MOBILE OPTIMIZATION (Portrait & Landscape)
├── 44px minimum tap targets
├── One-handed use friendly
├── Large text (minimum 18px)
├── No tiny UI elements
└── Swipe gestures for navigation
```

### Problem: Current UI vs UX Solution

#### ❌ DEVELOPER-FOCUSED (Too Complex):
```
┌─ Header + Category + Difficulty + Progress Bar ─┐  ← Information overload
├─ Large word display (good) ─────────────────────┤  ← Only good part
├─ 4 buttons + auto-play controls ────────────────┤  ← Too many options  
└─ Settings panel with 3+ dropdowns ──────────────┘  ← Feature creep
```

#### ✅ USER-FOCUSED (Minimal & Clear):
```
┌─ WORD LEARNING AREA (80% of screen) ─────────────┐  ← Single focus
│  • Large English/Chinese words                  │  ← Clear hierarchy
│  • Simple progress: "5 of 20"                   │  ← Easy to understand
│  • Difficulty badge when helpful                │  ← Contextual info
└──────────────────────────────────────────────────┘

┌─ ESSENTIAL ACTIONS (20% of screen) ──────────────┐  ← Only what's needed
│  • PLAY button (primary)                        │  ← One main action
│  • Prev/Next (navigation)                       │  ← Essential controls
│  • Category name + Settings (collapsed)         │  ← Context, not clutter
└──────────────────────────────────────────────────┘
```

## Simplified Control Layout

### UX-Focused Button Design:

```
┌───────────── ESSENTIAL CONTROLS (Touch-Friendly) ─────────────┐
│                                                               │
│         [     ▶️ PLAY     ]                                   │  ← Primary action (large)
│                                                               │
│    [⏮️ PREV]              [⏭️ NEXT]                          │  ← Navigation (balanced)
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Mobile-First Approach:
```
📱 PORTRAIT MODE:
┌───────────────────┐
│    ▶️ PLAY        │  ← Full width, thumb-friendly
├───────────────────┤
│ ⏮️ PREV │ ⏭️ NEXT │  ← Split row, easy reach
└───────────────────┘

📱 LANDSCAPE MODE:
┌─────────────────────────────────────┐
│  [▶️ PLAY]  [⏮️ PREV]  [⏭️ NEXT]   │  ← Single row
└─────────────────────────────────────┘
```

## Typography (Accessibility-First)

### Reading Hierarchy:
```
📖 English Word:    40px (desktop) / 28px (mobile)  ← Largest, easiest to read
🈯 Chinese Word:    32px (desktop) / 24px (mobile)  ← Clear secondary focus
📊 Progress:        18px (desktop) / 16px (mobile)  ← Readable but subtle
🏷️ Context:        16px (desktop) / 14px (mobile)  ← Supporting info
🔘 Buttons:        16px (both)                     ← Touch-friendly labels
```

### Contrast Requirements (WCAG AA):
```
🎯 Primary Text:    #000000 on #FFFFFF (21:1 ratio)   ← Maximum readability
🔴 Chinese Text:    #C53030 on #FFFFFF (7.2:1 ratio)  ← High contrast red
📊 Secondary:       #4A5568 on #FFFFFF (9.6:1 ratio)  ← Readable but subtle
🔘 Button Text:     #FFFFFF on #3182CE (6.3:1 ratio)  ← Clear action labels
```

## Layout Mathematics (16:9 Optimized)

### Screen Real Estate Usage:
```
VIEWPORT HEIGHT ALLOCATION:
├── 80% Word Learning Area
│   ├── 40% English word
│   ├── 30% Chinese word  
│   ├── 10% Progress/context
│   └── (Empty space for breathing room)
└── 20% Essential Controls
    ├── 60% Primary action (PLAY)
    ├── 40% Navigation (PREV/NEXT)
    └── (Collapsed settings)

VIEWPORT WIDTH USAGE:
├── Mobile:     95% content, 5% margins
├── Tablet:     85% content, 15% margins
└── Desktop:    70% content, 30% margins
```

### Key UX Metrics:
```
✅ No scrolling required (fits 100vh)
✅ 44px minimum touch targets (iOS guidelines)
✅ Maximum 3-4 UI elements visible at once
✅ Single primary action per screen
✅ 0.3 second max for any interaction response
✅ Works one-handed on mobile (thumb zone optimized)
```

This **user-centered design** prioritizes learning over features, readability over decoration, and simplicity over complexity.
