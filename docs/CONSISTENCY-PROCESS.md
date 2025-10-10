# Code Consistency & Guidelines Enforcement Process

**Purpose**: Document the systematic approach used to maintain code consistency and follow GUIDELINES.md when making changes.

**Created**: October 10, 2025  
**Status**: ✅ Active Process

---

## 🎯 **The 3-Layer Validation Process**

This process ensures **100% compliance** with GUIDELINES.md for every code change.

---

## 📋 **Layer 1: Pre-Implementation Checks**

### **Purpose**: Understand existing patterns before making changes

### **Checklist**:

1. **Read Relevant Guidelines**
   ```bash
   # Open GUIDELINES.md and find relevant principle
   grep -n "Principle #1" docs/GUIDELINES.md
   ```
   - ✅ Understand WHY the principle exists
   - ✅ Read both ✅ CORRECT and ❌ WRONG examples
   - ✅ Note any exceptions mentioned

2. **Examine Existing Code Patterns**
   ```bash
   # Find similar existing implementations
   grep -r "similar_pattern" src/js/
   ```
   - ✅ How is this feature currently implemented?
   - ✅ What naming conventions are used?
   - ✅ Where should new code be placed?

3. **Verify Dependencies**
   ```bash
   # Check if referenced modules exist
   find src/js -name "ModuleName.js"
   ```
   - ✅ All referenced modules exist
   - ✅ Dependency order makes sense
   - ✅ No circular dependencies

4. **Check Config.js Structure**
   ```bash
   # Read relevant Config.js section
   grep -A 10 "section_name:" src/js/shared/Config.js
   ```
   - ✅ Understand Config.js organization
   - ✅ Find where to add new values
   - ✅ Follow existing nesting patterns

### **Example from Recent Implementation**:

```bash
# Step 1: Read guideline
# Found: Principle #1 - Zero Hardcoded Values

# Step 2: Examine existing patterns
grep -A 5 "debug:" src/js/shared/Config.js  # No results = need to create

# Step 3: Look at similar sections
grep -A 10 "tts:" src/js/shared/Config.js  # Found TTS config pattern

# Step 4: Understand placement
# Decided: Add debug section before TTS (logical ordering)
```

---

## 🔧 **Layer 2: Implementation Validation**

### **Purpose**: Ensure changes follow guidelines while implementing

### **Real-Time Checks**:

1. **Zero Hardcoded Values** (Principle #1)
   ```javascript
   // ❌ WRONG:
   const speed = 1.0;
   const event = 'settings:changed';
   
   // ✅ CORRECT:
   const speed = window.appConfig.get('tts.speeds.normal');
   const event = window.appConfig.get('events.settings.changed');
   ```
   - ✅ Every literal value traced to Config.js
   - ✅ No magic numbers in code
   - ✅ All strings referenced from Config

2. **Event-Driven Architecture** (Principle #2)
   ```javascript
   // ❌ WRONG:
   window.audioControls.startAutoPlay();
   
   // ✅ CORRECT:
   const event = window.appConfig.get('events.audio.autoplay.start');
   window.eventBus.emit(event);
   ```
   - ✅ No direct module method calls
   - ✅ All communication via EventBus
   - ✅ Event names from Config.js

3. **Consistent Naming** (Code Quality Standards)
   ```javascript
   // Files: PascalCase for classes, camelCase for utilities
   PTEApp.js        // ✅ Class
   dataSchema.js    // ✅ Utility
   
   // CSS: kebab-case
   practice-modes.css  // ✅
   
   // Variables: camelCase
   currentWord      // ✅
   _privateMethod   // ✅ Private with underscore prefix
   
   // Events: domain:action[:modifier]
   'settings:changed'           // ✅
   'audio:autoplay:started'     // ✅
   ```

4. **Dependency Injection** (Principle #10)
   ```javascript
   // ✅ CORRECT:
   constructor(config, eventBus, storage) {
     this.config = config;
     this.eventBus = eventBus;
     this.storage = storage;
   }
   
   // ❌ WRONG:
   playAudio() {
     window.ttsEngine.speak(text);  // Accessing global
   }
   ```

5. **Error Handling** (Principle #8)
   ```javascript
   // ✅ CORRECT:
   try {
     const data = await fetch(url);
     return await data.json();
   } catch (error) {
     const errorEvent = window.appConfig.get('events.system.error');
     window.eventBus.emit(errorEvent, { error: error.message });
     throw error;
   }
   ```

### **Example from Recent Implementation**:

```javascript
// Adding debug config to Config.js

// ✅ Check 1: Zero hardcoded values
debug: {
    enabled: false,  // Literal in Config.js ✅ (only place allowed)
    verbose: false,
    // ...
}

// ✅ Check 2: Consistent naming
debug: {  // camelCase ✅
    logEvents: false,  // camelCase ✅
    // ...
}

// ✅ Check 3: Follows existing patterns
tts: {  // Existing section
    voices: { ... }
},
debug: {  // New section - same structure ✅
    enabled: false
}
```

---

## ✅ **Layer 3: Post-Implementation Verification**

### **Purpose**: Catch any violations that slipped through

### **Automated Checks**:

1. **Grep for Hardcoded Values**
   ```bash
   # Check for hardcoded event strings
   grep -rn "'.*:.*'" src/js/ | grep -v Config.js | grep -v "\.get("
   
   # Check for magic numbers
   grep -rn "\\(0\\|1\\|2\\|3\\)" src/js/ | grep -v Config.js
   
   # Check for hardcoded paths
   grep -rn "'data/.*'" src/js/ | grep -v Config.js
   ```

2. **Verify Config.js References**
   ```bash
   # Ensure new Config.js entries are used
   grep -rn "appConfig.get('debug" src/js/
   grep -rn "appConfig.get('events.system" src/js/
   ```

3. **Check Event Flow**
   ```bash
   # Find event emission
   grep -rn "eventBus.emit('dataset:loading'" src/js/
   
   # Find event listeners
   grep -rn "eventBus.on('dataset:loading'" src/js/
   ```

4. **Validate Error Handling**
   ```bash
   # Check for unhandled async functions
   grep -rn "async.*{" src/js/ | grep -v "try"
   
   # Check for bare throw statements
   grep -rn "throw new Error" src/js/ | grep -v "catch"
   ```

5. **Review Documentation**
   ```bash
   # Ensure documentation updated
   git diff CHANGELOG.md
   git diff docs/
   ```

### **Manual Code Review**:

- [ ] **Read full diff** - Review every change line-by-line
- [ ] **Check context** - Ensure changes don't break surrounding code
- [ ] **Verify comments** - Inline documentation added where needed
- [ ] **Test coverage** - Identify areas needing tests
- [ ] **Breaking changes** - Document any API changes

### **Example from Recent Implementation**:

```bash
# Step 1: Grep validation
$ grep -rn "appConfig.get('debug" src/js/
# Result: No usage yet (expected - Config.js just added)

$ grep -rn "dataset:loading" src/js/shared/Config.js
# Result: Line 488 - ✅ Found in events taxonomy

$ grep -rn "loadOrder:" src/js/shared/Config.js  
# Result: Line 610 - ✅ Found in build config

# Step 2: Check for duplicates
$ grep -c "system:error" src/js/shared/Config.js
# Result: 2 (found duplicate!) - Fixed immediately

# Step 3: Validate structure
$ node -c src/js/shared/Config.js
# Result: No syntax errors ✅

# Step 4: Create documentation
$ ls docs/IMPLEMENTATION-SUMMARY.md
# Result: File created ✅
```

---

## 📊 **Compliance Scorecard**

### **Use After Every Implementation**

| Principle | Check | Status |
|-----------|-------|--------|
| #1: Zero Hardcoded Values | All literals in Config.js? | ✅/❌ |
| #2: Event-Driven | No direct module calls? | ✅/❌ |
| #3: Handler Registry | Settings use handlers? | ✅/❌/N/A |
| #4: Dependency Injection | Dependencies via constructor? | ✅/❌/N/A |
| #7: CSS Tokens | No hardcoded CSS values? | ✅/❌/N/A |
| #8: Error Handling | Try-catch + event emission? | ✅/❌/N/A |
| #10: SOLID | Single responsibility? | ✅/❌ |
| **Naming** | Follows conventions? | ✅/❌ |
| **Documentation** | CHANGELOG.md updated? | ✅/❌ |
| **Tests** | Tests added/updated? | ✅/❌/N/A |

**Minimum Passing Score**: 8/10 ✅ marks (excluding N/A)

---

## 🚨 **Common Pitfalls to Avoid**

### **1. Hardcoding Event Names**
```javascript
// ❌ WRONG:
window.eventBus.emit('settings:changed', data);

// ✅ CORRECT:
const event = window.appConfig.get('events.settings.changed');
window.eventBus.emit(event, data);
```

### **2. Direct Module Calls**
```javascript
// ❌ WRONG:
window.audioControls.play();

// ✅ CORRECT:
window.eventBus.emit('audio:play');
```

### **3. Hardcoded CSS Values**
```javascript
// ❌ WRONG in CSS:
.button { padding: 12px 24px; }

// ✅ CORRECT:
.button { padding: var(--space-md) var(--space-xl); }
```

### **4. Bypassing Settings Validation**
```javascript
// ❌ WRONG:
window.settingsModule.settings.speed = 0.8;

// ✅ CORRECT:
window.eventBus.emit('setting:request-change', { key: 'speed', value: 0.8 });
```

### **5. Forgetting Documentation**
```javascript
// ❌ WRONG: Code changes without docs

// ✅ CORRECT: Update these files
- CHANGELOG.md  (always)
- docs/API-REFERENCE.md  (if API changed)
- docs/ARCHITECTURE.md  (if design changed)
- docs/GUIDELINES.md  (if principle changed)
```

---

## 🔄 **Continuous Improvement Process**

### **After Each Implementation**:

1. **Review Compliance Scorecard** - Did we pass?
2. **Document Lessons Learned** - What went well? What didn't?
3. **Update Process** - How can we improve validation?
4. **Share Knowledge** - Add to GUIDELINES.md if new pattern discovered

### **Quarterly Review**:

1. **Audit Codebase** - Run all grep checks across entire codebase
2. **Update Validation Tools** - Add new ESLint rules if needed
3. **Review Guidelines** - Are principles still relevant?
4. **Training** - Share best practices with team

---

## 🎓 **Learning from Recent Implementation**

### **What Worked**:

1. **3-Layer Process** - Caught duplicate system events before commit
2. **Grep Validation** - Quickly verified all additions
3. **Following Patterns** - Config.js structure made it easy
4. **Documentation First** - Clear plan before coding

### **What Could Improve**:

1. **Automated Tests** - Need tests for Config.js structure
2. **Build Validation** - Add pre-commit hook to check guidelines
3. **ESLint Rules** - Auto-detect hardcoded values
4. **Templates** - Create implementation checklist template

---

## 📝 **Quick Reference: Implementation Workflow**

```bash
# BEFORE making changes:
1. Read relevant GUIDELINES.md section
2. Examine existing code patterns (grep)
3. Verify dependencies exist
4. Check Config.js structure

# WHILE making changes:
5. Add values to Config.js first
6. Reference via appConfig.get()
7. Use EventBus for communication
8. Follow naming conventions
9. Add error handling
10. Write inline comments

# AFTER making changes:
11. Grep for hardcoded values
12. Verify Config.js references
13. Check event flow (emit → on)
14. Review full diff
15. Update CHANGELOG.md
16. Create implementation summary
17. Run compliance scorecard
18. Commit with descriptive message
```

---

## ✅ **Success Criteria**

An implementation is **ready to commit** when:

- ✅ Compliance scorecard shows 8/10 or better
- ✅ All 3 validation layers passed
- ✅ CHANGELOG.md updated
- ✅ No grep violations found
- ✅ Documentation created/updated
- ✅ Code review completed
- ✅ Implementation summary written

---

## 🎯 **Enforcement Tools**

### **Available Now**:
- ✅ `.clauderules` - AI auto-enforcement
- ✅ `GUIDELINES.md` - Manual reference
- ✅ This process document - Systematic approach

### **To Be Implemented** (Phase 2):
- ⏳ Pre-commit hooks - Automated validation
- ⏳ ESLint rules - Real-time checking
- ⏳ Build validation - Config.js structure tests
- ⏳ CI/CD checks - GitHub Actions integration

---

**Process Status**: ✅ **Active and Enforced**  
**Last Updated**: October 10, 2025  
**Next Review**: January 2026
