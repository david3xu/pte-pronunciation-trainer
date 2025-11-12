# PTE Pronunciation Trainer - Troubleshooting Guide

## 🔍 Common Issues & Solutions

### **📊 Data Issues**

#### **"No vocabulary loaded" Error**
**Symptoms**: Empty vocabulary list, no words displayed
**Solutions**:
```bash
# 1. Process PTE vocabulary data
npm run data:pte

# 2. Check if dataset exists
ls -la data/processed/pte-fib-listening-dataset.json

# 3. Validate data integrity
npm run validate

# 4. Check browser console for errors
# Open DevTools → Console tab
```

#### **"PTE vocabulary data file not found" Error**
**Symptoms**: Error message about missing dataset
**Solutions**:
```bash
# 1. Ensure data processing completed
npm run data:pte

# 2. Check file exists
cat data/processed/pte-fib-listening-dataset.json

# 3. Check file permissions
chmod 644 data/processed/pte-fib-listening-dataset.json

# 4. Re-run validation
npm run validate
```

#### **"No terms found in dataset" Error**
**Symptoms**: Dataset exists but contains no vocabulary
**Solutions**:
```bash
# 1. Check source data
ls -la data/source/pte/vocabs/

# 2. Verify source file format
head -10 data/source/pte/vocabs/pte-fib-listening-with-ipa.md

# 3. Re-process with verbose output
node scripts/pte-data-pipeline.js --verbose

# 4. Check processing report
cat data/reports/pte-processing-report.json
```

---

### **🔊 Audio/TTS Issues**

#### **TTS Not Working**
**Symptoms**: No audio output, silent pronunciation
**Solutions**:
1. **Browser Compatibility**:
   - Use Chrome, Edge, or Firefox
   - Avoid Safari (limited TTS support)
   - Check browser console for errors

2. **Audio Permissions**:
   ```javascript
   // Check audio context
   console.log('Audio Context:', window.AudioContext || window.webkitAudioContext);

   // Test TTS directly
   const utterance = new SpeechSynthesisUtterance('test');
   speechSynthesis.speak(utterance);
   ```

3. **Voice Selection**:
   ```javascript
   // Check available voices
   console.log('Available voices:', speechSynthesis.getVoices());

   // Test specific voice
   const utterance = new SpeechSynthesisUtterance('test');
   utterance.voice = speechSynthesis.getVoices().find(v => v.name.includes('Google UK English Male'));
   speechSynthesis.speak(utterance);
   ```

#### **TTS Voice Not Found**
**Symptoms**: Default voice not available, fallback voices used
**Solutions**:
```javascript
// Check voice availability
const voices = speechSynthesis.getVoices();
const defaultVoice = voices.find(v => v.name === 'Google UK English Male');
console.log('Default voice available:', !!defaultVoice);

// List all available voices
voices.forEach(voice => console.log(voice.name, voice.lang));
```

#### **Audio Context Issues (iOS)**
**Symptoms**: TTS works on desktop but not mobile
**Solutions**:
```javascript
// Enable background audio for iOS
window.ttsEngine.enableBackgroundAudio();

// Check audio context state
console.log('Audio Context State:', window.ttsEngine.audioContext?.state);

// Resume suspended audio context
if (window.ttsEngine.audioContext?.state === 'suspended') {
  window.ttsEngine.audioContext.resume();
}
```

---

### **🎨 UI/Display Issues**

#### **IPA Pronunciation Not Displaying**
**Symptoms**: Words show but no IPA symbols
**Solutions**:
```javascript
// Check word object structure
const word = window.pteVocabularyManager.getCurrentWord(0);
console.log('Word structure:', word);

// Check pronunciation data
console.log('Pronunciation:', word.pronunciation);

// Test IPA display
window.uiController.displayWord(word, 0);
```

#### **Pronunciation Toggle Not Working**
**Symptoms**: British/American toggle button doesn't switch
**Solutions**:
```javascript
// Check pronunciation preference
console.log('Current preference:', window.uiController.getPronunciationPreference());

// Test toggle
const newPreference = window.uiController.togglePronunciation();
console.log('New preference:', newPreference);

// Check current word pronunciations
console.log('Current pronunciations:', window.uiController.currentWordPronunciations);
```

#### **Mobile Responsiveness Issues**
**Symptoms**: UI broken on mobile devices
**Solutions**:
1. **Check viewport meta tag**:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. **Test responsive breakpoints**:
   ```css
   /* Check CSS media queries */
   @media (max-width: 768px) { /* Mobile styles */ }
   @media (max-width: 480px) { /* Small mobile styles */ }
   ```

3. **Test touch interactions**:
   ```javascript
   // Check touch support
   console.log('Touch support:', 'ontouchstart' in window);
   ```

---

### **⚙️ Configuration Issues**

#### **Configuration Not Loading**
**Symptoms**: Default values used instead of config
**Solutions**:
```javascript
// Check if config is loaded
console.log('Config loaded:', !!window.appConfig);

// Check config structure
console.log('Config structure:', window.appConfig.getAll());

// Test specific config values
console.log('TTS Voice:', window.appConfig.get('tts.voices.default'));
console.log('Data Path:', window.appConfig.get('data.paths.dataset'));
```

#### **Hardcoded Values Still Present**
**Symptoms**: Changes to config don't take effect
**Solutions**:
```bash
# 1. Search for hardcoded values
grep -r "Google UK English Male" src/
grep -r "0.7" src/
grep -r "pte-fib-listening-dataset.json" src/

# 2. Check if files use config
grep -r "appConfig.get" src/

# 3. Rebuild after config changes
npm run build
```

---

### **🔧 Build & Development Issues**

#### **Build Failures**
**Symptoms**: `npm run build` fails
**Solutions**:
```bash
# 1. Check Node.js version
node --version  # Should be >= 16.0.0

# 2. Clean and reinstall
npm run clean
rm -rf node_modules
npm install

# 3. Check for syntax errors
npm run lint

# 4. Test individual build steps
npm run data:pte
npm run validate
```

#### **Module Loading Errors**
**Symptoms**: "Module not found" errors
**Solutions**:
```javascript
// Check module loading order in index.html
// Ensure proper script tag sequence:
// 1. Shared infrastructure first
// 2. Core modules
// 3. UI modules
// 4. Main app coordinator last

// Check if modules are registered
console.log('Available modules:', Object.keys(window.CCLApp.modules));
```

#### **Development Server Issues**
**Symptoms**: Server won't start or crashes
**Solutions**:
```bash
# 1. Check Python installation
python3 --version

# 2. Check port availability
lsof -i :3000

# 3. Use different port
python3 -m http.server 3001

# 4. Check file permissions
chmod +x scripts/*.js
```

---

### **📱 Mobile-Specific Issues**

#### **iOS Safari Issues**
**Symptoms**: TTS not working, audio issues
**Solutions**:
```javascript
// Enable background audio
window.ttsEngine.enableBackgroundAudio();

// Handle iOS audio context
if (window.AudioContext || window.webkitAudioContext) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}
```

#### **Android Chrome Issues**
**Symptoms**: TTS delayed or not working
**Solutions**:
```javascript
// Preload voices
speechSynthesis.getVoices();

// Wait for voices to load
window.addEventListener('voiceschanged', () => {
  console.log('Voices loaded:', speechSynthesis.getVoices().length);
});
```

---

### **🔍 Debugging Tools**

#### **Browser DevTools**
```javascript
// Enable verbose logging
window.appConfig.set('development.debug', true);
window.appConfig.set('development.verbose', true);

// Check vocabulary state
console.log('Vocabulary state:', {
  totalWords: window.pteVocabularyManager.getTotalWordCount(),
  currentWords: window.pteVocabularyManager.getCurrentWords().length,
  currentCategory: window.pteVocabularyManager.getCurrentCategory()
});

// Check TTS state
console.log('TTS state:', {
  speechRate: window.ttsEngine.speechRate,
  availableVoices: speechSynthesis.getVoices().length
});
```

#### **Event Monitoring**
```javascript
// Monitor all events
window.eventBus.on('*', (eventName, data) => {
  console.log('Event:', eventName, data);
});

// Monitor specific events
window.eventBus.on('vocabulary:loaded', (data) => {
  console.log('Vocabulary loaded:', data);
});

window.eventBus.on('tts:error', (data) => {
  console.error('TTS error:', data);
});
```

#### **Performance Monitoring**
```javascript
// Check loading performance
console.time('Vocabulary Load');
await window.pteVocabularyManager.initialize();
console.timeEnd('Vocabulary Load');

// Check TTS performance
console.time('TTS Speak');
await window.ttsEngine.speak('test');
console.timeEnd('TTS Speak');
```

---

### **🚨 Emergency Recovery**

#### **Complete Reset**
```bash
# 1. Clean everything
npm run clean
rm -rf node_modules
rm -rf data/processed/
rm -rf data/reports/

# 2. Fresh install
npm install

# 3. Rebuild everything
npm run data:pte
npm run build
npm run validate
```

#### **Configuration Reset**
```javascript
// Reset to default configuration
const defaultConfig = new AppConfig();
window.appConfig = defaultConfig;

// Or reload page
location.reload();
```

#### **Data Recovery**
```bash
# 1. Check source data
ls -la data/source/pte/vocabs/

# 2. Re-process from source
npm run data:pte

# 3. Validate results
npm run validate

# 4. Check processing report
cat data/reports/pte-processing-report.json
```

---

## 📞 Getting Help

### **Debug Information to Collect**
```javascript
// System information
console.log('System Info:', {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  cookieEnabled: navigator.cookieEnabled,
  onLine: navigator.onLine
});

// Application state
console.log('App State:', {
  config: window.appConfig.getAll(),
  vocabulary: window.pteVocabularyManager.getTotalWordCount(),
  tts: {
    available: !!window.speechSynthesis,
    voices: speechSynthesis.getVoices().length
  }
});
```

### **Log Files to Check**
- Browser Console (F12 → Console)
- Processing Report: `data/reports/pte-processing-report.json`
- Validation Report: `data/reports/validation-report.json`
- Build Logs: Check terminal output during `npm run build`

---

**Troubleshooting Status**: ✅ **COMPREHENSIVE COVERAGE**
**Common Issues**: ✅ **ALL MAJOR ISSUES DOCUMENTED**
**Recovery Procedures**: ✅ **STEP-BY-STEP SOLUTIONS**
