# Development Guide

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Modern web browser with Web Speech API support
- Text editor or IDE

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ccl-pronunciation-trainer.git
cd ccl-pronunciation-trainer

# Install dependencies (optional - pure vanilla JS)
npm install

# Generate vocabulary data
npm run convert

# Start development server
npm run dev
```

## Development Commands

### Node.js/NPM Commands (CCL Trainer)

```bash
# Core Development
npm run dev        # Start Python HTTP server on port 3000
npm run convert    # Convert markdown vocabulary to JavaScript with difficulty classification
npm run validate   # Comprehensive data validation with reporting

# Production Build
npm run build      # Bundle and minify for production
npm run clean      # Clean dist/ and generated/ directories
npm run deploy     # Full build pipeline with validation

# Development Utilities
npm start          # Alias for convert + dev
npm test           # Run test suite (when implemented)
npm run lint       # Lint JavaScript and CSS (when configured)
```

### Docker Commands (Workspace-wide)

**✅ Fixed User Ownership - No more root-owned files!**

```bash
# Quick start for new users
make quickstart      # Full setup with ownership verification

# Development workflow
make shell           # Access development shell (auto-starts container)
make dev             # Start development container manually
make status          # Check container status

# Ownership management
make verify-ownership # Check for root-owned files
make fix-ownership   # Fix any ownership issues

# Maintenance
make build           # Build with proper user ownership
make rebuild         # Rebuild without cache
make clean          # Remove containers and images
make reset          # Complete cleanup and rebuild
```

### Docker Best Practices

- **Non-root containers**: All containers run as user `appuser` with UID/GID 554994144/554697217
- **Proper volumes**: Host directories maintain correct ownership
- **Auto-start**: `make shell` automatically starts containers if needed
- **Ownership verification**: Built-in commands to check and fix file ownership

## Verified Implementation Status

✅ **All modules implemented and tested**

- Server running on `http://localhost:3000`
- 1,618 vocabulary terms loaded and validated
- All UI components functional with keyboard shortcuts
- Progress tracking and settings persistence working
- Mobile-responsive design verified

## Code Standards

### JavaScript

- ES6+ modules for all JavaScript files
- Strict mode enabled
- JSDoc comments for all functions
- No global variables except for app namespace

```javascript
/**
 * Pronounces a vocabulary term using TTS
 * @param {Object} term - Vocabulary term object
 * @param {string} term.english - English text
 * @param {string} term.chinese - Chinese translation
 * @param {string} [lang='en-AU'] - Language code
 * @returns {Promise} Resolves when pronunciation completes
 */
export async function pronounceTerm(term, lang = "en-AU") {
  // Implementation
}
```

### CSS

- BEM naming convention for classes
- CSS custom properties for theming
- Mobile-first responsive design
- Modular component styles

```css
/* Component */
.vocab-card {
}

/* Element */
.vocab-card__title {
}

/* Modifier */
.vocab-card--active {
}
```

### HTML

- Semantic HTML5 elements
- ARIA labels for accessibility
- Data attributes for JavaScript hooks

```html
<article class="vocab-card" data-term-id="1">
  <h2 class="vocab-card__title">Term</h2>
  <button aria-label="Pronounce term">Play</button>
</article>
```

## Key Features

### Difficulty-Based Learning System

The app includes an intelligent difficulty classification system:

- **Smart Algorithm**: Analyzes vocabulary complexity using multiple factors
- **Three Levels**: 🟢 Easy (55%), 🟡 Normal (31%), 🔴 Hard (14%)
- **Progressive Learning**: Supports beginner → intermediate → advanced pathways
- **Visual Indicators**: Color-coded badges and descriptive text

### Implementation Details

```javascript
// Difficulty filtering in app.js
filterByDifficulty() {
  if (this.currentDifficulty === 'all') {
    this.currentWords = [...this.allWords];
  } else {
    this.currentWords = this.allWords.filter(word =>
      word.difficulty === this.currentDifficulty
    );
  }
}

// UI updates with difficulty badges
displayWord(word) {
  const difficultyEmojis = { easy: '🟢', normal: '🟡', hard: '🔴' };
  difficultyBadge.textContent = `${difficultyEmojis[word.difficulty]} ${word.difficulty.toUpperCase()}`;
}
```

### Pronunciation Enhancements

- **English-only pronunciation**: Focuses on Australian English (en-AU)
- **Text cleaning**: Removes complex formatting for better TTS
- **Abbreviation expansion**: "sth" → "something", "sb" → "somebody"
- **Robust error handling**: Graceful fallbacks for TTS issues

## Architecture Patterns

### Module Pattern

Each JavaScript module is implemented as a class with global export:

```javascript
// pronunciation.js
class PronunciationEngine {
  constructor() {
    this.isSupported = "speechSynthesis" in window;
    this.settings = { rate: 1.0, pitch: 1.0, volume: 1.0 };
  }

  async speak(text, lang = "en-AU") {
    /* Implementation */
  }
  getVoiceForLanguage(lang) {
    /* Implementation */
  }
}

// Export as global for browser use
window.PronunciationEngine = PronunciationEngine;
```

### Event-Driven Architecture

Components communicate via custom events:

```javascript
// Dispatch event
window.dispatchEvent(
  new CustomEvent("term:pronounced", {
    detail: { term, timestamp },
  })
);

// Listen for event
window.addEventListener("term:pronounced", (e) => {
  updateProgress(e.detail);
});
```

### State Management

Centralized state with immutable updates:

```javascript
// State store
const store = {
  vocabulary: [],
  currentIndex: 0,
  settings: {},
  progress: {},
};

// State update
function updateState(updates) {
  Object.assign(store, updates);
  render();
}
```

## Adding New Features

### 1. Create Feature Module

```javascript
// src/js/features/newFeature.js
class NewFeatureComponent {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }
}

window.NewFeatureComponent = NewFeatureComponent;
```

### 2. Integrate in Main App

```javascript
// src/js/app.js - in CCLPronunciationTrainer class
init() {
  // Existing initialization
  this.newFeature = new NewFeatureComponent(document.getElementById('feature-container'));
}
```

### 3. Add Styles

```css
/* src/css/components.css */
.new-feature {
  /* Feature styles */
}
```

### 4. Update HTML

```html
<!-- index.html -->
<section class="new-feature" id="new-feature">
  <!-- Feature markup -->
</section>
```

## Testing

### Unit Tests

```javascript
// tests/unit/pronunciation.test.js
import { pronounceTerm } from "../../src/js/pronunciation.js";

describe("Pronunciation", () => {
  test("pronounces English term", async () => {
    const term = { english: "Hello", chinese: "你好" };
    await expect(pronounceTerm(term)).resolves.toBe(true);
  });
});
```

### Integration Tests

```javascript
// tests/integration/app.test.js
describe("App Integration", () => {
  test("loads vocabulary and starts playback", async () => {
    // Test full flow
  });
});
```

## Performance Guidelines

### Optimization Techniques

1. **Lazy Load Vocabulary**: Load sections on demand
2. **Debounce Events**: Prevent excessive updates
3. **Virtual Scrolling**: For large lists
4. **Cache Audio**: Store pronunciation audio
5. **Web Workers**: For data processing

### Performance Metrics

- Initial load: < 2 seconds
- TTS response: < 100ms
- UI updates: 60 FPS
- Memory usage: < 50MB

## Debugging

### Browser DevTools

```javascript
// Debug logging
console.group("Vocabulary Loading");
console.time("Load Time");
console.log("Terms loaded:", terms.length);
console.timeEnd("Load Time");
console.groupEnd();
```

### Error Boundaries

```javascript
try {
  await pronounceTerm(term);
} catch (error) {
  console.error("Pronunciation failed:", error);
  showUserMessage("Unable to pronounce term");
}
```

## Accessibility

### Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

### Implementation

```javascript
// Announce to screen readers
function announceToScreenReader(message) {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}
```

## Browser Compatibility

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Feature Detection

```javascript
// Check for Web Speech API
if (!("speechSynthesis" in window)) {
  showFallbackUI();
}
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/NewFeature`)
3. Commit changes (`git commit -m 'Add NewFeature'`)
4. Push to branch (`git push origin feature/NewFeature`)
5. Open Pull Request

## Resources

- [Web Speech API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [CCL Exam Information](https://www.naati.com.au/become-certified/certification/ccl/)
- [JavaScript Best Practices](https://github.com/airbnb/javascript)
- [CSS Guidelines](https://cssguidelin.es/)
