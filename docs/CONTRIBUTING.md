# Contributing

## 👋 Welcome Contributors!

Thank you for your interest in contributing to the PTE Pronunciation Trainer! This guide will help you get started with development, understand our workflow, and make meaningful contributions.

---

## 🚀 Quick Start

### **Prerequisites**

- **Node.js** >= 16.0.0
- **Python** 3.x (for development server)
- **Git** for version control
- **Modern browser** (Chrome, Edge, Firefox, Safari)

### **Setup Development Environment**

```bash
# 1. Clone the repository
git clone https://github.com/your-org/pte-pronunciation-trainer.git
cd pte-pronunciation-trainer

# 2. Install dependencies
npm install

# 3. Process vocabulary data
npm run data:pte

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### **Verify Installation**

```bash
# Run tests
npm test

# Run linting
npm run lint

# Validate data
npm run validate
```

---

## 📁 Project Structure

```
pte-pronunciation-trainer/
├── src/
│   ├── js/
│   │   ├── shared/          # Configuration and schemas
│   │   │   ├── Config.js           # Centralized configuration
│   │   │   └── DataSchema.js       # Data structure definitions
│   │   ├── core/            # Core application logic
│   │   │   ├── PTEApp.js           # Main application coordinator
│   │   │   ├── PTEVocabularyManager.js  # Vocabulary management
│   │   │   ├── SettingsManager.js  # Settings management
│   │   │   └── ProgressTracker.js  # Learning progress tracking
│   │   ├── ui/              # User interface
│   │   │   ├── UIController.js     # UI management
│   │   │   └── SettingsPanel.js    # Settings UI
│   │   ├── audio/           # Text-to-speech
│   │   │   ├── TTSEngine.js        # TTS engine
│   │   │   ├── VoiceSelector.js    # Voice management
│   │   │   └── AudioControls.js    # Playback controls
│   │   └── utils/           # Utilities
│   │       ├── EventBus.js         # Event system
│   │       ├── Storage.js          # localStorage wrapper
│   │       └── StateManager.js     # State persistence
│   └── css/
│       ├── style.css        # Main styles
│       ├── components.css   # Component styles
│       └── responsive.css   # Mobile responsiveness
├── scripts/
│   ├── pte-data-pipeline.js  # Data processing pipeline
│   ├── build.js              # Production build script
│   └── validate.js           # Data validation
├── data/
│   ├── source/               # Source vocabulary files (Markdown)
│   │   └── pte/
│   │       └── vocabs/
│   │           ├── pte-fib-listening-with-ipa.md
│   │           ├── pte-repeat-sentence.md
│   │           ├── pte-answer-short-question.md
│   │           └── pte-write-from-dictation.md
│   └── processed/            # Processed JSON datasets
│       ├── pte-fib-listening-dataset.json
│       └── pte-processing-report.json
├── docs/                     # Documentation
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md       # This file
│   ├── API-REFERENCE.md
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
├── index.html               # Main HTML file
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker
├── package.json             # Dependencies and scripts
└── vercel.json              # Vercel deployment config
```

---

## 🔄 Development Workflow

### **1. Development Commands**

```bash
# Data Processing
npm run data:pte              # Process PTE vocabulary data
npm run data                  # Alias for data:pte

# Development Server
npm run dev                   # Start dev server (port 3000)
npm run start                 # Process data + start server

# Building
npm run build                 # Create production build
npm run deploy                # Build + validate

# Testing & Quality
npm test                      # Run tests
npm run lint                  # Run ESLint + Stylelint
npm run validate              # Validate vocabulary data

# Cleanup
npm run clean                 # Remove build artifacts
```

### **2. Typical Development Cycle**

```bash
# 1. Create a new branch
git checkout -b feature/your-feature-name

# 2. Make changes to code

# 3. Process data (if data changes)
npm run data:pte

# 4. Test changes
npm run dev
# Test in browser at http://localhost:3000

# 5. Run tests and linting
npm test
npm run lint

# 6. Commit changes
git add .
git commit -m "feat: add your feature description"

# 7. Push and create pull request
git push origin feature/your-feature-name
```

### **3. Hot Reload Development**

For rapid development, use watch mode:

```bash
# In terminal 1: Run dev server
npm run dev

# In terminal 2: Watch and rebuild
npm run watch  # (if available)

# Make changes → Save → Browser auto-refreshes
```

---

## 📊 Adding New Datasets

### **Step 1: Create Source File**

Create a Markdown file in `data/source/pte/vocabs/`:

```markdown
# Example: pte-repeat-sentence.md

1. The university offers a wide range of courses.
2. The library is located on the second floor.
3. Please submit your assignment by Friday.
```

For vocabulary with IPA pronunciation:

```markdown
# Example: pte-advanced-vocabulary-with-ipa.md

1. obscure | /əbˈskjʊə/ — sounds like **uhb-SKYOOR** | /əbˈskjʊr/ — sounds like **uhb-SKYOOR**
2. phenomenon | /fəˈnɒm.ɪ.nən/ — sounds like **fuh-NOM-ih-nun** | /fəˈnɑː.mə.nɑːn/ — sounds like **fuh-NAH-muh-nahn**
```

**Format**:
- `english` | `british_ipa` — sounds like **british_phonetic** | `american_ipa` — sounds like **american_phonetic**

### **Step 2: Configure Data Source**

Update `src/js/shared/Config.js`:

```javascript
data: {
  learningModes: [
    // Existing modes...
    {
      id: 'repeat-sentence',
      label: 'Repeat Sentence',
      dataset: 'pte-repeat-sentence'  // Matches filename without .md
    }
  ]
}
```

### **Step 3: Process Data**

```bash
# Run data pipeline
npm run data:pte

# Verify output
ls -la data/processed/pte-repeat-sentence-dataset.json

# Validate data
npm run validate
```

### **Step 4: Test in Application**

```bash
# Start dev server
npm run dev

# Test in browser:
# 1. Open settings
# 2. Switch to your new learning mode
# 3. Verify data loads correctly
```

---

## 🎨 Adding New Features

### **1. Create a New Component**

```bash
# Example: Adding a new UI component
touch src/js/ui/YourComponent.js
```

**Component Template**:
```javascript
/**
 * YourComponent - Brief description
 */
class YourComponent {
  constructor(config, eventBus) {
    this.config = config;
    this.eventBus = eventBus;
    
    this.initialize();
  }

  initialize() {
    // Setup component
    this.bindEvents();
  }

  bindEvents() {
    // Subscribe to events
    this.eventBus.on('some:event', this.handleEvent.bind(this));
  }

  handleEvent(data) {
    // Handle event
  }

  destroy() {
    // Cleanup
    this.eventBus.off('some:event', this.handleEvent);
  }
}

// Export for use in other files
window.YourComponent = YourComponent;
```

### **2. Register Component in PTEApp**

Update `src/js/core/PTEApp.js`:

```javascript
async initialize() {
  // Existing initialization...
  
  // Add your component
  this.yourComponent = new YourComponent(this.config, this.eventBus);
  await this.yourComponent.initialize();
}
```

### **3. Update Build Configuration**

Update `src/js/shared/Config.js`:

```javascript
build: {
  jsFiles: [
    // Existing files...
    'src/js/ui/YourComponent.js'  // Add your file
  ]
}
```

### **4. Test Your Feature**

```bash
# Build and test
npm run build
npm run dev

# Run tests
npm test
```

---

## 🧪 Testing Guidelines

### **Writing Tests**

Create test files with `.test.js` suffix:

```javascript
// src/js/utils/Storage.test.js
describe('Storage', () => {
  let storage;

  beforeEach(() => {
    storage = new Storage();
    localStorage.clear();
  });

  test('should save and retrieve data', () => {
    storage.set('testKey', { value: 'test' });
    const result = storage.get('testKey');
    expect(result.value).toBe('test');
  });

  test('should handle non-existent keys', () => {
    const result = storage.get('nonExistent');
    expect(result).toBeNull();
  });
});
```

### **Running Tests**

```bash
# Run all tests
npm test

# Run specific test file
npm test -- Storage.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## 📝 Code Style Guidelines

### **JavaScript Conventions**

1. **Use ES6+ Features**
   ```javascript
   // ✅ Good
   const items = [...array];
   const { setting } = config;
   
   // ❌ Avoid
   var items = array.slice();
   var setting = config.setting;
   ```

2. **Naming Conventions**
   ```javascript
   // Classes: PascalCase
   class VocabularyManager {}
   
   // Methods/Variables: camelCase
   getCurrentWord() {}
   const wordCount = 100;
   
   // Constants: UPPER_SNAKE_CASE
   const MAX_RETRIES = 3;
   
   // Private: prefix with _
   _privateMethod() {}
   ```

3. **Documentation**
   ```javascript
   /**
    * Load vocabulary dataset
    * @param {string} mode - Learning mode (e.g., 'vocabulary')
    * @param {Object} options - Loading options
    * @returns {Promise<Object>} Loaded dataset
    */
   async loadVocabulary(mode, options = {}) {
     // Implementation
   }
   ```

4. **Error Handling**
   ```javascript
   // ✅ Good - Always handle errors
   try {
     const data = await loadData();
   } catch (error) {
     console.error('Failed to load data:', error);
     this.eventBus.emit('data:error', { error });
   }
   ```

### **CSS Conventions**

1. **BEM Naming**
   ```css
   /* Block */
   .vocabulary-card {}
   
   /* Element */
   .vocabulary-card__title {}
   
   /* Modifier */
   .vocabulary-card--highlighted {}
   ```

2. **Mobile-First**
   ```css
   /* Mobile styles first */
   .container {
     width: 100%;
   }
   
   /* Desktop overrides */
   @media (min-width: 768px) {
     .container {
       width: 750px;
     }
   }
   ```

### **Linting**

```bash
# Fix auto-fixable issues
npm run lint -- --fix

# Check specific files
npm run lint -- src/js/core/PTEApp.js
```

**ESLint Configuration** (`.eslintrc.js`):
```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'eslint:recommended',
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};
```

---

## 🔧 Configuration Management

### **Centralized Configuration**

All configuration in `src/js/shared/Config.js`:

```javascript
class AppConfig {
  constructor() {
    this.defaults = {
      // Add new configuration here
      yourFeature: {
        enabled: true,
        setting1: 'value1',
        setting2: 42
      }
    };
  }
}
```

### **Accessing Configuration**

```javascript
// In your component
const config = window.appConfig; // Global config instance

// Get setting
const value = config.get('yourFeature.setting1');

// Set setting
config.set('yourFeature.enabled', false);

// Get all settings in category
const featureConfig = config.get('yourFeature');
```

### **Environment-Specific Configuration**

```javascript
// Override defaults for production
if (process.env.NODE_ENV === 'production') {
  config.merge({
    development: {
      debug: false,
      verbose: false
    }
  });
}
```

---

## 🎯 Pull Request Guidelines

### **Before Submitting PR**

- [ ] Code passes linting (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Data validation passes (`npm run validate`)
- [ ] Tested in browser (Chrome, Firefox, Safari)
- [ ] Documentation updated (if applicable)
- [ ] No console errors or warnings

### **PR Title Format**

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add repeat sentence learning mode
fix: correct TTS voice selection bug
docs: update API documentation
style: format code according to style guide
refactor: simplify vocabulary filtering logic
test: add tests for ProgressTracker
chore: update dependencies
```

### **PR Description Template**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How to Test
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
```

---

## 🐛 Reporting Bugs

### **Bug Report Template**

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: Chrome 120
- OS: Windows 11
- Version: 1.0.0

## Additional Context
Any other relevant information
```

### **Where to Report**

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas

---

## 💡 Feature Requests

We welcome feature suggestions! Please include:

1. **Use Case**: Why is this feature needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives Considered**: Other approaches you've thought about
4. **Additional Context**: Screenshots, examples, etc.

---

## 📚 Learning Resources

### **Project-Specific**

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Reference](./API-REFERENCE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### **External Resources**

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [ES6+ Features](https://github.com/lukehoban/es6features)
- [PTE Exam Information](https://www.naati.com.au/become-certified/certification/ccl/)

---

## 🤝 Code of Conduct

### **Our Standards**

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### **Unacceptable Behavior**

- Harassment or discriminatory language
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information

---

## 📞 Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community support
- **Email**: [maintainer-email@example.com]

---

## 🎉 Recognition

Contributors will be:
- Listed in README.md
- Credited in release notes
- Thanked in commits

Thank you for contributing to PTE Pronunciation Trainer! 🚀

---

**Contributing Guide Status**: ✅ **COMPLETE**  
**Last Updated**: October 7, 2025
