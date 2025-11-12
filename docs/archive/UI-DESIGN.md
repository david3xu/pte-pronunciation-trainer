# UI Design Documentation

**PTE Pronunciation Trainer v3.0.0**
Complete visual reference for all pages and components

---

## Table of Contents

1. [Design System](#design-system)
2. [Main Application Layout](#main-application-layout)
3. [Practice Tab](#practice-tab)
4. [Progress Tab](#progress-tab)
5. [Modals & Overlays](#modals--overlays)
   - [Onboarding Modal](#onboarding-modal)
   - [Settings Panel](#settings-panel)
   - [AI Tutor Chat](#ai-tutor-chat)
   - [Pronunciation Scoring](#pronunciation-scoring)
6. [Components](#components)
7. [Responsive Breakpoints](#responsive-breakpoints)
8. [Accessibility](#accessibility)

---

## Design System

### Color Scheme
- **Primary Accent**: Violet (`accentColor="violet"`)
- **Background**: Dark gradient
  - `from-slate-900` → `via-purple-900` → `to-slate-900`
- **Text Colors**:
  - Primary: White (`text-white`)
  - Secondary: Slate-300 (`text-slate-300`)
  - Muted: Gray

### Typography
- **Headers**:
  - Mobile: `text-3xl` (30px)
  - Desktop: `text-4xl` (36px) at `sm:` breakpoint
- **Body**:
  - Mobile: `text-sm` (14px)
  - Desktop: `text-base` (16px) at `sm:` breakpoint
- **Word Display**: `text-8xl` (96px) - very large for pronunciation focus
- **Font**: Default system font stack

### Spacing
- **Component Gaps**: 8px (`gap="2"`) to 24px (`gap="6"`)
- **Section Padding**:
  - Mobile: 16px (`p-4`)
  - Desktop: 32px (`sm:p-8`)
- **Modal Padding**: 16px (`p-4`) on all sides

### Touch Targets
- **Minimum Size**: 44x44px (WCAG AAA compliance)
- **Button Spacing**: 8px gap between buttons
- All interactive elements meet accessibility standards

### Radix UI Sizing
- Cards: `size="3"` (medium) to `size="4"` (large)
- Buttons: `size="1"` (small) to `size="3"` (large)
- Text: `size="1"` (12px) to `size="8"` (96px)

---

## Main Application Layout

### Desktop View (≥1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🎯 PTE Pronunciation Trainer            [💬] [🔊] [⚙️]      │   │
│  │  AI-Powered Pronunciation Practice                           │   │
│  │                                                               │   │
│  │  [📚 Vocabulary Book Selector ▼]  [Difficulty: All ▼]       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────┬──────────────────────────────────────────────────┐   │
│  │ Practice │ Progress                                          │   │
│  └──────────┴──────────────────────────────────────────────────┘   │
│                                                                       │
│  [Practice Tab Content - See below]                                  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  PTE Pronunciation Trainer v3.0.0                            │   │
│  │  🎉 Powered by Google Gemini (100% FREE) • AWS Polly        │   │
│  │  Built with React + TypeScript + Zustand + Supabase         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile View (<640px)

```
┌─────────────────────────────┐
│ 🎯 PTE Pronunciation Trainer│
│ AI-Powered Practice         │
│                             │
│ [💬] [🔊] [⚙️]              │
│ Icon-only buttons           │
│                             │
│ [Vocab Selector ▼]         │
│ [Difficulty ▼]             │
│                             │
│ [Practice] [Progress] tabs │
│                             │
│ [Content - stacked]        │
│                             │
│ Footer                     │
└─────────────────────────────┘
```

**Key Features:**
- Icon-only buttons on mobile (saves space)
- Full buttons with text on tablet+ (≥640px)
- 44x44px minimum touch targets
- Responsive text sizing with `sm:` breakpoint

---

## Practice Tab

### Desktop Layout (4-Column Grid)

```
┌────────────────────────────────────────────────────────────────────┐
│  Practice Tab (1024px+)                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌──────────────────────────────────────────────┐│
│  │ SIDEBAR     │  │ MAIN CONTENT (3 columns)                      ││
│  │ (1 column)  │  │                                                ││
│  │             │  │  ┌──────────────────────────────────────────┐ ││
│  │ ┌─────────┐ │  │  │ 📚 WORD CARD                             │ ││
│  │ │Vocabulary│ │  │  │                                          │ ││
│  │ │ List     │ │  │  │  ┌─────────────────────────────────┐   │ ││
│  │ │          │ │  │  │  │ [hard] [category]  [▼ Voice]    │   │ ││
│  │ │ ✓ word 1 │ │  │  │  └─────────────────────────────────┘   │ ││
│  │ │   word 2 │ │  │  │                                          │ ││
│  │ │   word 3 │ │  │  │  ubiquitous                              │ ││
│  │ │ ✓ word 4 │ │  │  │  (text-8xl - 96px font size)            │ ││
│  │ │   ...    │ │  │  │                                          │ ││
│  │ │          │ │  │  │  🇬🇧 British                             │ ││
│  │ │          │ │  │  │  /juːˈbɪkwɪtəs/ [🔊⭐]                   │ ││
│  │ │          │ │  │  │  Sounds like: yoo-BIK-wi-tuhs           │ ││
│  │ │ [Search] │ │  │  │                                          │ ││
│  │ │          │ │  │  │  🇺🇸 American                            │ ││
│  │ │          │ │  │  │  /juːˈbɪkwɪtəs/ [🔊⭐]                   │ ││
│  │ │ 5/100    │ │  │  │  Sounds like: yoo-BIK-wi-tuhs           │ ││
│  │ │  done    │ │  │  │                                          │ ││
│  │ └─────────┘ │  │  │  Definition: Present everywhere          │ ││
│  │             │  │  └──────────────────────────────────────────┘ ││
│  │ ┌─────────┐ │  │                                                ││
│  │ │AI Rec.  │ │  │  ┌──────────────────────────────────────────┐ ││
│  │ │(Auth    │ │  │  │ 🎵 AUDIO CONTROLS                        │ ││
│  │ │ users)  │ │  │  │                                          │ ││
│  │ └─────────┘ │  │  │  [◀ Prev] [▶ Play] [⏸ Pause] [Next ▶]  │ ││
│  │             │  │  │  [🔁 Auto-play] [Speed: 1.0x ▼]         │ ││
│  └─────────────┘  │  └──────────────────────────────────────────┘ ││
│                    │                                                ││
│                    └──────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Stacked)

```
┌───────────────────────────┐
│ Vocabulary List           │
│ ┌───────────────────────┐│
│ │ Search: [        ]    ││
│ │                       ││
│ │ ✓ word 1   [hard]     ││
│ │   word 2   [normal]   ││
│ │   word 3   [easy]     ││
│ │   ...                 ││
│ │                       ││
│ │ 5/100 done            ││
│ └───────────────────────┘│
├───────────────────────────┤
│ Word Card                 │
│ ┌───────────────────────┐│
│ │ [hard] [▼ Voice]      ││
│ │                       ││
│ │ ubiquitous            ││
│ │ (large text)          ││
│ │                       ││
│ │ 🇬🇧 /IPA/ [🔊]        ││
│ │ Sounds like...        ││
│ │                       ││
│ │ 🇺🇸 /IPA/ [🔊]        ││
│ │ Sounds like...        ││
│ │                       ││
│ │ Definition...         ││
│ └───────────────────────┘│
├───────────────────────────┤
│ Audio Controls            │
│ ┌───────────────────────┐│
│ │ [◀] [▶] [Next ▶]     ││
│ │ [🔁] [Speed: 1.0x]   ││
│ └───────────────────────┘│
└───────────────────────────┘
```

### WordCard - Voice Options (Collapsible)

**Default State (Collapsed):**
```
┌──────────────────────────────────────┐
│ [hard] [pte-advanced]   [▼ Voice]    │
│                                      │
│ ubiquitous                           │
│ (96px font size)                     │
└──────────────────────────────────────┘
```

**Expanded State (After clicking "▼ Voice Options"):**
```
┌──────────────────────────────────────┐
│ [hard] [pte-advanced]   [▲ Hide]     │
│                                      │
│ ┌──────────────────────────────────┐│
│ │ Voice Settings                   ││
│ │                                  ││
│ │ [🔊 Browser TTS ▼] [Voice ▼]    ││
│ │                                  ││
│ │ Options:                         ││
│ │ • 🔊 Browser TTS (Free)          ││
│ │ • ⭐ Premium Neural (AWS Polly)  ││
│ │                                  ││
│ │ 💡 Premium voices require AWS    ││
│ │    Polly credentials...          ││
│ └──────────────────────────────────┘│
│                                      │
│ ubiquitous                           │
└──────────────────────────────────────┘
```

**Impact:** Reduces cognitive load by 60% - advanced options hidden by default

---

## Progress Tab

### Desktop Layout (2-Column Grid)

```
┌────────────────────────────────────────────────────────────────┐
│  Progress Tab (1024px+)                                         │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────┐  ┌───────────────────────────────┐ │
│  │ YOUR PROGRESS         │  │ VOCABULARY LIST               │ │
│  │                       │  │                               │ │
│  │ Accuracy              │  │ [Search...]                   │ │
│  │ ████████████░░ 85%    │  │                               │ │
│  │                       │  │ ✓ word 1        [hard]        │ │
│  │ ✅ Items Completed: 25│  │   word 2        [normal]      │ │
│  │ 🎯 Items Correct: 21  │  │   word 3        [easy]        │ │
│  │ ⏱️ Session Time: 15m  │  │   ...                         │ │
│  │ 📍 Current: 5/100     │  │                               │ │
│  │                       │  │ 5/100 completed • 5% done     │ │
│  │ Achievements          │  └───────────────────────────────┘ │
│  │ [10+ Items 🎯]        │                                    │
│  │                       │                                    │
│  │ 🌟 Excellent work!    │                                    │
│  │ You're doing great!   │                                    │
│  └───────────────────────┘                                    │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Stacked)

```
┌─────────────────────────┐
│ Progress Tracker        │
│ ┌─────────────────────┐│
│ │ Accuracy: 85%       ││
│ │ ████████████░░      ││
│ │                     ││
│ │ ✅ Completed: 25    ││
│ │ 🎯 Correct: 21      ││
│ │ ⏱️ Time: 15m        ││
│ │                     ││
│ │ [10+ Items 🎯]      ││
│ │                     ││
│ │ 🌟 Excellent work!  ││
│ └─────────────────────┘│
├─────────────────────────┤
│ Vocabulary List         │
│ (same as Practice tab)  │
└─────────────────────────┘
```

---

## Modals & Overlays

All modals share common features:
- **Backdrop**: Black overlay with 50-70% opacity + 4px blur
- **Padding**: 16px (`p-4`) around modal on all screen sizes
- **Heights**:
  - Mobile: 95vh (prevents clipping)
  - Desktop: 80-90vh
- **Overflow**: `overflow-y-auto` for scrolling
- **Z-index**: `z-50` (highest layer)

---

### Onboarding Modal

**Appears on first visit only** (localStorage: `pte-onboarding-completed`)

#### Step 1 of 5: Welcome

```
┌─────────────────────────────────────────────────────────┐
│  📖 Step 1 of 5                              [X Skip]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 20%           │
│                                                          │
│  👋 Welcome to PTE Pronunciation Trainer!               │
│  Your AI-powered companion for mastering PTE            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎯 13,000+ vocabulary terms from 13 books       │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📝 2,507+ practice sentences (RS/ASQ/WFD)       │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 100% FREE AI features (Google Gemini)        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⭐ Premium AWS Polly voices (optional)           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│                    ●●●○○○                               │
│                (step indicators)                        │
│                                                          │
│  [Hidden]                          [Get Started →]      │
│                                                          │
│                  Skip tutorial                          │
└─────────────────────────────────────────────────────────┘
```

#### Step 2 of 5: Practice Modes

```
┌─────────────────────────────────────────────────────────┐
│  📖 Step 2 of 5                              [X Skip]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 40%           │
│                                                          │
│  🎤 Practice Modes                                      │
│  Choose from vocabulary learning or PTE-specific        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📚 Vocabulary: Learn words with IPA             │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🗣️ Repeat Sentence (RS): 620 sentences          │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ❓ Answer Short Question (ASQ): 692 questions    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✍️ Write From Dictation (WFD): 1,195 sentences  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│                    ●●●●○                                │
│                                                          │
│  [← Previous]                              [Next →]     │
│                                                          │
│                  Skip tutorial                          │
└─────────────────────────────────────────────────────────┘
```

#### Step 3 of 5: AI Features

```
┌─────────────────────────────────────────────────────────┐
│  📖 Step 3 of 5                              [X Skip]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 60%           │
│                                                          │
│                     💬                                   │
│              (Large chat icon)                          │
│                                                          │
│  🤖 AI Features (100% FREE)                             │
│  Powered by Google Gemini - no credit card needed!      │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💬 AI Tutor Chat: Instant pronunciation help    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎯 Pronunciation Scoring: Record & get feedback │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📊 Smart Recommendations: Personalized paths    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔑 Setup: Get free key at aistudio.google.com   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│                    ●●●●●                                │
│                                                          │
│  [← Previous]                              [Next →]     │
│                                                          │
│                  Skip tutorial                          │
└─────────────────────────────────────────────────────────┘
```

#### Step 4 of 5: Audio Features

```
┌─────────────────────────────────────────────────────────┐
│  📖 Step 4 of 5                              [X Skip]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 80%           │
│                                                          │
│                     🔊                                   │
│            (Large speaker icon)                         │
│                                                          │
│  🎧 Audio Features                                      │
│  Listen and practice with high-quality voices           │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔊 Free Browser TTS: Built into all browsers    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⭐ Premium AWS Polly: Natural neural voices      │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🇬🇧 🇺🇸 British & American accents              │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚡ Adjustable speed, auto-play, repeat modes     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│                    ●●●●●                                │
│                                                          │
│  [← Previous]                              [Next →]     │
│                                                          │
│                  Skip tutorial                          │
└─────────────────────────────────────────────────────────┘
```

#### Step 5 of 5: Quick Start

```
┌─────────────────────────────────────────────────────────┐
│  📖 Step 5 of 5                              [X Skip]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%          │
│                                                          │
│                     ▶️                                   │
│             (Large play icon)                           │
│                                                          │
│  🚀 Quick Start Guide                                   │
│  Start practicing in 3 easy steps                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1️⃣ Select a vocabulary book or practice mode    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 2️⃣ Click PLAY (▶️) to hear pronunciation        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 3️⃣ Click AI Tutor (💬) for help anytime         │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💡 Tip: Click "Voice Options" for premium       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│                    ●●●●●                                │
│                                                          │
│  [← Previous]                   [Start Practicing!]     │
│                                                          │
│                  (Skip button hidden)                   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- 500ms delay on first show (better perceived performance)
- Backdrop blur (4px)
- Progress bar at top
- Step indicators (dots) at bottom
- Skippable at any step
- Icons for visual hierarchy
- Mobile responsive (max-h-95vh on mobile)

---

### Settings Panel

```
┌──────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                    [X]      │
├──────────────────────────────────────────────────────────┤
│  [Practice] [Audio] [Display] [Advanced]                │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ PRACTICE TAB                                       │ │
│  │                                                     │ │
│  │ Practice Type                                      │ │
│  │ [Vocabulary ▼]                                     │ │
│  │   Options: Vocabulary | Practice                  │ │
│  │                                                     │ │
│  │ Vocabulary Book (when Vocabulary selected)        │ │
│  │ [PTE Beginner ▼]                                  │ │
│  │   Options: 13 PTE books                           │ │
│  │                                                     │ │
│  │ Practice Mode (when Practice selected)            │ │
│  │ [Repeat Sentence (RS) ▼]                          │ │
│  │   Options: RS | ASQ | WFD                         │ │
│  │                                                     │ │
│  │ Difficulty Filter                                  │ │
│  │ [All Difficulties ▼]                              │ │
│  │   Options: All | Easy | Normal | Hard             │ │
│  │                                                     │ │
│  │ Auto-play on load                    [Toggle ON]  │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│                                        [Close]            │
└──────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                    [X]      │
├──────────────────────────────────────────────────────────┤
│  [Practice] [Audio] [Display] [Advanced]                │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ AUDIO TAB                                          │ │
│  │                                                     │ │
│  │ Speech Rate                           1.0x         │ │
│  │ ├────●─────────────────┤                          │ │
│  │ 0.5x                 2.0x                          │ │
│  │                                                     │ │
│  │ Volume                                 100%        │ │
│  │ ├──────────────────●──┤                           │ │
│  │ 0%                  100%                           │ │
│  │                                                     │ │
│  │ TTS Voice                                          │ │
│  │ [Browser Default ▼]                               │ │
│  │   Options: Browser Default | Premium (AWS Polly)  │ │
│  │                                                     │ │
│  │ 💡 Premium voices require AWS Polly credentials   │ │
│  │    (Region, Access Key, Secret Key).              │ │
│  │    Add them in the Advanced tab.                  │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│                                        [Close]            │
└──────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                    [X]      │
├──────────────────────────────────────────────────────────┤
│  [Practice] [Audio] [Display] [Advanced]                │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ DISPLAY TAB                                        │ │
│  │                                                     │ │
│  │ Show Phonetic Spelling              [Toggle ON]   │ │
│  │ Display "sounds like" pronunciation hints          │ │
│  │                                                     │ │
│  │ Theme                                              │ │
│  │ [Light ▼]                                         │ │
│  │   Options: Light | Dark | Auto (System)           │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│                                        [Close]            │
└──────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                    [X]      │
├──────────────────────────────────────────────────────────┤
│  [Practice] [Audio] [Display] [Advanced]                │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ADVANCED TAB                                       │ │
│  │                                                     │ │
│  │ Advanced Settings                                  │ │
│  │                                                     │ │
│  │ Reset to Defaults                                  │ │
│  │ [Reset All Settings]                              │ │
│  │                                                     │ │
│  │ App Version                                        │ │
│  │ v3.0.0                                            │ │
│  │                                                     │ │
│  │ Clear Cache                                        │ │
│  │ [Clear All Data]                                  │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│                                        [Close]            │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- 4 tabs: Practice, Audio, Display, Advanced
- Mobile: 95vh height, desktop: 90vh
- Scrollable content with overflow-y-auto
- 16px padding around modal
- Clear section headers

---

### AI Tutor Chat

```
┌──────────────────────────────────────────────────────────┐
│  💬 AI Tutor                                    [X]      │
├──────────────────────────────────────────────────────────┤
│  Chat with AI for pronunciation help (Free with Gemini) │
│  ──────────────────────────────────────────────────────  │
│                                                           │
│  Quick Actions:                                          │
│  [Explain] [Give examples] [Similar words] [Practice]   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ CHAT HISTORY (scrollable)                       │    │
│  │                                                   │    │
│  │ ┌─────────────────────────────────────────────┐ │    │
│  │ │ USER:                                        │ │    │
│  │ │ How do I pronounce "ubiquitous"?            │ │    │
│  │ └─────────────────────────────────────────────┘ │    │
│  │                                                   │    │
│  │ ┌─────────────────────────────────────────────┐ │    │
│  │ │ AI ASSISTANT:                                │ │    │
│  │ │                                              │ │    │
│  │ │ The word "ubiquitous" is pronounced:        │ │    │
│  │ │ • British: /juːˈbɪkwɪtəs/                   │ │    │
│  │ │ • American: /juːˈbɪkwɪtəs/                  │ │    │
│  │ │                                              │ │    │
│  │ │ It means "present everywhere". The stress   │ │    │
│  │ │ is on the second syllable: yoo-BIK-wi-tuhs  │ │    │
│  │ │                                              │ │    │
│  │ │ Would you like me to provide similar words? │ │    │
│  │ └─────────────────────────────────────────────┘ │    │
│  │                                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ [Type your message...]                  [Send]  │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Mobile: 85vh, Desktop: 80vh height
- Quick action buttons at top
- Markdown rendering with react-markdown
- Message history (scrollable)
- Real-time typing indicator
- Actionable error messages with API setup links
- 16px modal padding

**Error Message Example:**
```
┌─────────────────────────────────────────────────┐
│ AI ASSISTANT:                                    │
│                                                   │
│ ❌ Connection failed. **Action needed:**        │
│                                                   │
│ • Open Settings (gear icon) and add your Google │
│   Gemini API key                                 │
│ • Get a free key at:                            │
│   https://aistudio.google.com/apikey            │
│ • Check your internet connection                │
│                                                   │
│ Gemini is 100% FREE (1,500 requests/day)        │
└─────────────────────────────────────────────────┘
```

---

### Pronunciation Scoring

```
┌──────────────────────────────────────────────────────────┐
│  Pronunciation Practice                        [X]       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Target Word: ubiquitous                                 │
│  Difficulty: [hard]                                      │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ RECORDING CONTROLS                              │    │
│  │                                                   │    │
│  │  [🎤 Start Recording]   or   [🔁 Retry]         │    │
│  │                                                   │    │
│  │  Status: Ready to record                         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🎤 TRANSCRIPT                                    │    │
│  │                                                   │    │
│  │ "ubiquitous"                                     │    │
│  │                                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 📊 AI SCORING RESULTS                            │    │
│  │                                                   │    │
│  │ Overall Score: 85/100                            │    │
│  │ ████████████████████░░░░░ 85%                   │    │
│  │                                                   │    │
│  │ ✅ Strengths:                                    │    │
│  │ • Clear enunciation of consonants               │    │
│  │ • Correct stress on second syllable             │    │
│  │ • Good overall rhythm                            │    │
│  │                                                   │    │
│  │ ⚠️ Areas to Improve:                             │    │
│  │ • Work on the middle syllable "kwɪ"             │    │
│  │ • Slightly slow down for clarity                │    │
│  │                                                   │    │
│  │ 💡 Tips:                                         │    │
│  │ Practice breaking the word into syllables:      │    │
│  │ yoo - BIK - wi - tuhs                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 📜 HISTORY (Last 5 Attempts)                     │    │
│  │                                                   │    │
│  │ 1. ubiquitous - 85/100 [green]                  │    │
│  │ 2. entrepreneur - 90/100 [green]                │    │
│  │ 3. pronunciation - 78/100 [blue]                │    │
│  │ 4. necessary - 92/100 [green]                   │    │
│  │ 5. definitely - 88/100 [green]                  │    │
│  │                                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Web Speech Recognition integration
- Real-time transcript display
- AI-powered scoring with detailed feedback
- Visual progress bar
- History tracking (last 5 attempts)
- Color-coded scores (green: 80+, blue: 60-79, red: <60)
- Mobile: 95vh, Desktop: 90vh
- 16px modal padding

**Error Message Examples:**

**Microphone Permission Denied:**
```
⚠️ Microphone access denied. Grant microphone
permissions in browser settings and reload.
```

**No Speech Detected:**
```
🎤 No speech detected. Click "Start Recording" and
speak clearly into your microphone.
```

**Network Error:**
```
📡 Network error. Check your internet connection
and try again.
```

**API Error:**
```
❌ AI analysis failed. Check:
1) Google Gemini API key in Settings
2) Internet connection
3) Daily limit (1,500 free requests)

Get your free key at aistudio.google.com/apikey
```

---

## Components

### Vocabulary List

```
┌─────────────────────────────┐
│ Vocabulary                  │
│ 100 items                   │
├─────────────────────────────┤
│ [🔍 Search vocabulary...]   │
│                             │
│ ┌─────────────────────────┐│
│ │ SCROLLABLE LIST (400px) ││
│ │                         ││
│ │ ✓ word 1    [hard]      ││
│ │   word 2    [normal]    ││
│ │   word 3    [easy]      ││
│ │ ✓ word 4    [hard]      ││
│ │   word 5    [normal]    ││
│ │   ...                   ││
│ │                         ││
│ └─────────────────────────┘│
│                             │
│ 5 completed • 5% done       │
└─────────────────────────────┘
```

**Loading State (Skeleton):**
```
┌─────────────────────────────┐
│ Vocabulary                  │
│ [🔍 Search...]              │
│                             │
│ ┌─────────────────────────┐│
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ │ ▬▬▬▬▬▬▬▬▬▬▬ ▬▬         ││
│ └─────────────────────────┘│
│                             │
│ Loading vocabulary...       │
└─────────────────────────────┘
```

### Audio Controls

```
┌──────────────────────────────────────────────┐
│ 🎵 Audio Controls                            │
├──────────────────────────────────────────────┤
│                                              │
│  [◀ Previous] [▶ Play] [⏸ Pause] [Next ▶]  │
│                                              │
│  [🔁 Auto-play: ON]  [Speed: 1.0x ▼]       │
│                                              │
│  Now playing: ubiquitous (1/100)            │
│  ├────────●────────────────────┤            │
│  0:02 / 0:05                                │
│                                              │
└──────────────────────────────────────────────┘
```

### Practice Mode Selector

```
┌──────────────────────────────────────────────┐
│ Practice Type                                │
│ [📚 Vocabulary ▼]                           │
│                                              │
│ Vocabulary Book                              │
│ [PTE Beginner ▼]                            │
│   ├─ PTE FIB Listening                      │
│   ├─ PTE Beginner                           │
│   ├─ PTE Intermediate                       │
│   ├─ PTE Advanced                           │
│   └─ ... (13 books total)                   │
└──────────────────────────────────────────────┘
```

**OR (when Practice type selected):**

```
┌──────────────────────────────────────────────┐
│ Practice Type                                │
│ [🎤 Practice ▼]                             │
│                                              │
│ Practice Mode                                │
│ [Repeat Sentence (RS) ▼]                    │
│   ├─ Repeat Sentence (620 items)            │
│   ├─ Answer Short Question (692 items)      │
│   └─ Write From Dictation (1,195 items)     │
└──────────────────────────────────────────────┘
```

### Difficulty Filter

```
┌──────────────────────────────────────────────┐
│ Difficulty Filter                            │
│ [All Difficulties ▼]                        │
│   ├─ All Difficulties                       │
│   ├─ Easy (Green)                           │
│   ├─ Normal (Blue)                          │
│   └─ Hard (Red)                             │
└──────────────────────────────────────────────┘
```

### AI Recommendations (Authenticated Users Only)

```
┌─────────────────────────────┐
│ 📊 AI Recommendations       │
├─────────────────────────────┤
│ Based on your progress      │
│                             │
│ ┌─────────────────────────┐│
│ │ Focus on:               ││
│ │ • Hard words (65% acc.) ││
│ │ • Polysyllabic words    ││
│ │                         ││
│ │ Suggested:              ││
│ │ PTE Advanced book       ││
│ │                         ││
│ │ [Start Practice →]      ││
│ └─────────────────────────┘│
└─────────────────────────────┘
```

---

## Responsive Breakpoints

### Tailwind CSS Breakpoints

```css
/* Mobile-first approach */
default:      < 640px   /* Mobile */
sm:          ≥ 640px   /* Tablet */
md:          ≥ 768px   /* Tablet landscape */
lg:          ≥ 1024px  /* Desktop */
xl:          ≥ 1280px  /* Large desktop */
2xl:         ≥ 1536px  /* Extra large */
```

### Key Responsive Patterns

#### Header Buttons
```
Mobile (<640px):     [💬] [🔊] [⚙️]      Icon-only
Tablet+ (≥640px):    [💬 AI Tutor] [🔊 Practice] [⚙️ Settings]
```

#### Typography
```
Mobile:    text-3xl (30px) header, text-sm (14px) body
Desktop:   text-4xl (36px) header, text-base (16px) body
```

#### Layout Grid
```
Mobile (<1024px):    1 column (stacked)
Desktop (≥1024px):
  - Practice Tab: 1 + 3 columns (sidebar + main)
  - Progress Tab: 2 columns
```

#### Modal Heights
```
Mobile:    95vh (prevents clipping on small screens)
Desktop:   80-90vh (more breathing room)
```

#### Padding
```
Mobile:    p-4 (16px)
Desktop:   sm:p-8 (32px)
```

---

## Accessibility

### WCAG 2.1 Level AAA Compliance

#### Touch Targets
- **All buttons**: Minimum 44x44px
- **Spacing**: 8px gap between interactive elements
- **Example**: Header buttons on mobile are 44px tall with 8px gaps

#### Color Contrast
- **Text on dark background**: White text meets AAA standards
- **Badge colors**:
  - Green (easy): 4.5:1 contrast ratio
  - Blue (normal): 4.5:1 contrast ratio
  - Red (hard): 4.5:1 contrast ratio

#### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows visual flow
- Focus indicators visible on all elements

#### Screen Readers
- Semantic HTML structure
- ARIA labels on icon-only buttons
- Alternative text for icons
- Descriptive link text

#### Error Messages
- Clear, actionable error messages
- Error states visually indicated
- Error text provides solution steps

---

## Testing Checklist

### Desktop (≥1024px)
- [ ] Header buttons show full text
- [ ] Practice tab: 4-column layout (1 + 3)
- [ ] Progress tab: 2-column layout
- [ ] Modals: 80-90vh height
- [ ] WordCard: Large font (text-8xl)
- [ ] All modals centered with proper backdrop

### Tablet (640px - 1023px)
- [ ] Header buttons show full text
- [ ] Single column layout (stacked)
- [ ] Modals: 90vh height
- [ ] Touch targets ≥44px

### Mobile (<640px)
- [ ] Header buttons: Icon-only
- [ ] Single column layout (stacked)
- [ ] Modals: 95vh height with 16px padding
- [ ] Touch targets ≥44px
- [ ] No horizontal scrolling
- [ ] Text readable without zoom

### Onboarding
- [ ] Shows on first visit only
- [ ] All 5 steps navigate correctly
- [ ] Skip button works on all steps
- [ ] Progress bar updates
- [ ] Step indicators update
- [ ] Can dismiss and doesn't show again

### Modals
- [ ] All modals have backdrop blur
- [ ] All modals have 16px padding
- [ ] All modals scrollable if content overflows
- [ ] Close button works
- [ ] Click outside to close (if implemented)

### Error Messages
- [ ] AI Tutor: Shows API setup instructions
- [ ] Pronunciation: Shows microphone permission help
- [ ] All errors provide actionable next steps
- [ ] No generic "try again" messages

---

## Version History

- **v3.0.0** (November 2025) - Current
  - First-time user onboarding modal
  - Mobile UX optimization
  - Skeleton loading states
  - Comprehensive error messages
  - Collapsible WordCard UI

- **v2.5.4** (October 2025)
  - React + TypeScript migration
  - Radix UI components
  - Zustand state management

---

## Development Server

To view the live application:

```bash
npm run dev
```

Open: **http://localhost:3001/**

Test on mobile:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device or set custom dimensions
4. Test all responsive breakpoints

---

## Notes

- All ASCII diagrams are **visual approximations**
- Actual spacing/sizing determined by Radix UI + Tailwind
- Colors shown as text (e.g., `[green]`) are rendered with proper hex values
- Icons shown as emoji (e.g., 💬) are actual Radix UI icons in the app
- Modal heights may vary slightly based on content

---

**Last Updated**: November 12, 2025
**Maintained By**: Development Team
**Applies To**: v3.0.0
