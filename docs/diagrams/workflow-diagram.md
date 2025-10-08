# Workflow Diagram: Settings System

## User Workflows

### 1. Change Speed Setting

```mermaid
sequenceDiagram
    actor User
    participant Dropdown as Speed Dropdown
    participant EventBus
    participant SettingsModule
    participant Handler as SpeedHandler
    participant Storage
    participant TTSEngine
    
    User->>Dropdown: Clicks "0.8x"
    Dropdown->>EventBus: emit('setting:request-change', {key:'speed', value:'0.8'})
    
    EventBus->>SettingsModule: Broadcast event
    SettingsModule->>Handler: validate('0.8')
    
    alt Valid Speed (0.5-2.0)
        Handler-->>SettingsModule: ✅ Valid (0.8)
        SettingsModule->>Handler: apply(0.8)
        Handler->>SettingsModule: ✅ Applied
        SettingsModule->>Storage: setItem('speed', '0.8')
        Storage-->>SettingsModule: ✅ Saved
        SettingsModule->>EventBus: emit('setting:changed', {key:'speed', value:0.8})
        EventBus->>TTSEngine: Broadcast event
        TTSEngine->>TTSEngine: this.speechRate = 0.8
        TTSEngine-->>User: 🔊 Speech now plays at 0.8x speed
    else Invalid Speed (e.g., 999)
        Handler-->>SettingsModule: ❌ Invalid (out of range)
        SettingsModule->>EventBus: emit('setting:error', {key:'speed', error:'...'})
        EventBus->>Dropdown: Broadcast error
        Dropdown-->>User: ⚠️ Show error message
    end
```

**Duration**: ~2ms  
**User Feedback**: Immediate (next speech plays at new speed)

---

### 2. Change Delay Setting

```mermaid
sequenceDiagram
    actor User
    participant Dropdown as Delay Dropdown
    participant EventBus
    participant SettingsModule
    participant Handler as DelayHandler
    participant Storage
    participant AudioControls
    
    User->>Dropdown: Selects "3 sec"
    Dropdown->>EventBus: emit('setting:request-change', {key:'delay', value:'3000'})
    
    EventBus->>SettingsModule: Broadcast event
    SettingsModule->>Handler: validate('3000')
    Handler-->>SettingsModule: ✅ Valid (3000)
    
    SettingsModule->>Handler: apply(3000)
    Handler->>SettingsModule: ✅ Applied
    
    SettingsModule->>Storage: setItem('delay', '3000')
    Storage-->>SettingsModule: ✅ Saved
    
    SettingsModule->>EventBus: emit('setting:changed', {key:'delay', value:3000})
    EventBus->>AudioControls: Broadcast event
    AudioControls->>AudioControls: this.delay = 3000
    AudioControls-->>User: ⏱️ Next pause will be 3 seconds
```

**Duration**: ~2ms  
**User Feedback**: Applied on next playback

---

### 3. Batch Update Settings (Import)

```mermaid
sequenceDiagram
    actor User
    participant UI as Settings Panel
    participant EventBus
    participant SettingsModule
    participant Storage
    participant Engines as All Engines
    
    User->>UI: Clicks "Import Settings"
    User->>UI: Uploads JSON file
    UI->>SettingsModule: importSettings({speed:0.8, delay:3000, ...})
    
    loop For each setting
        SettingsModule->>SettingsModule: validate(key, value)
        alt Valid
            SettingsModule->>SettingsModule: apply(key, value)
            SettingsModule->>Storage: setItem(key, value)
        else Invalid
            SettingsModule->>SettingsModule: Skip invalid setting
        end
    end
    
    SettingsModule->>EventBus: emit('settings:batch-updated', {updates:[...]})
    EventBus->>Engines: Broadcast to all engines
    
    loop For each engine
        Engines->>Engines: Update internal state
    end
    
    Engines-->>User: ✅ All settings applied
```

**Duration**: ~10-50ms (depends on # of settings)  
**User Feedback**: Toast notification "Settings imported"

---

### 4. Reset Settings to Default

```mermaid
sequenceDiagram
    actor User
    participant UI as Settings Panel
    participant EventBus
    participant SettingsModule
    participant Handler as All Handlers
    participant Storage
    participant Engines as All Engines
    
    User->>UI: Clicks "Reset to Default"
    UI->>EventBus: emit('settings:reset')
    EventBus->>SettingsModule: Broadcast event
    
    SettingsModule->>Handler: Get all defaults
    Handler-->>SettingsModule: {speed:1.0, delay:3000, ...}
    
    loop For each default setting
        SettingsModule->>Storage: setItem(key, value)
    end
    
    SettingsModule->>EventBus: emit('settings:reset', {defaults:{...}})
    EventBus->>Engines: Broadcast to all engines
    
    loop For each engine
        Engines->>Engines: Apply default values
    end
    
    Engines-->>User: ✅ Settings reset
```

**Duration**: ~5-20ms  
**User Feedback**: All dropdowns reset, toast notification

---

## Developer Workflows

### 1. Add New Setting

```mermaid
flowchart TD
    Start([👨‍💻 Developer wants new setting]) --> Define[Define in Config.js]
    Define --> Handler[Create handler in SettingsModule]
    Handler --> Validate[Write validate function]
    Validate --> Apply[Write apply function]
    Apply --> Default[Define default value]
    Default --> HTML[Add dropdown in HTML]
    HTML --> Listen[Add listener in target engine]
    Listen --> Test[Test in browser]
    Test --> Done([✅ New setting works])
    
    classDef dev fill:#e6f3ff,stroke:#0066cc
    class Start,Define,Handler,Validate,Apply,Default,HTML,Listen,Test,Done dev
```

**Example**: Adding "Theme" setting

```javascript
// 1. Config.js
const CONFIG = {
    settings: {
        themes: ['light', 'dark', 'auto']
    }
};

// 2. SettingsModule.js
handlers: {
    theme: {
        validate: (value) => CONFIG.settings.themes.includes(value),
        apply: (value) => { /* no-op, UI handles */ },
        default: 'auto'
    }
}

// 3. index.html
<select id="theme-select">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="auto">Auto</option>
</select>

// 4. ThemeManager.js (new engine)
window.eventBus.on('setting:changed', ({key, value}) => {
    if (key === 'theme') {
        document.body.className = `theme-${value}`;
    }
});
```

**Time**: ~30 minutes

---

### 2. Debug Invalid Setting

```mermaid
flowchart TD
    Start([🐛 User reports setting not working]) --> Console[Check console for errors]
    Console --> Error{Error type?}
    
    Error -->|Validation Failed| Check1[Check handler.validate]
    Check1 --> Fix1[Fix validation logic]
    
    Error -->|Not Persisting| Check2[Check Storage.setItem]
    Check2 --> Fix2[Fix storage key]
    
    Error -->|Engine Not Updating| Check3[Check event listener]
    Check3 --> Fix3[Add/fix listener]
    
    Error -->|Value Incorrect| Check4[Check handler.apply]
    Check4 --> Fix4[Fix apply logic]
    
    Fix1 --> Test[Test fix]
    Fix2 --> Test
    Fix3 --> Test
    Fix4 --> Test
    
    Test --> Done([✅ Fixed])
    
    classDef debug fill:#ffcccc,stroke:#cc0000
    class Start,Console,Error debug
```

**Common Issues**:
- Missing event listener in engine
- Wrong validation range
- Typo in storage key
- Event not emitted

**Time**: 10-30 minutes

---

### 3. Refactor Old Code to New Pattern

```mermaid
flowchart TD
    Start([🔧 Migrate file to events]) --> Find[Find all direct calls]
    Find --> Replace[Replace with emit()]
    Replace --> Add[Add event listener in engine]
    Add --> Remove[Remove old setter method]
    Remove --> Test[Test thoroughly]
    Test --> Pass{All tests pass?}
    
    Pass -->|Yes| Commit[Commit changes]
    Pass -->|No| Debug[Debug issues]
    Debug --> Test
    
    Commit --> Done([✅ File migrated])
    
    classDef refactor fill:#ccffcc,stroke:#00cc00
    class Start,Find,Replace,Add,Remove,Test,Commit,Done refactor
```

**Example**: Migrating `SettingsPanel.js`

```javascript
// BEFORE
updateSetting(key, value) {
    window.settingsManager.updateSetting(key, value);
}

// AFTER
updateSetting(key, value) {
    window.eventBus.emit('setting:request-change', {key, value});
}
```

**Time**: 15-60 minutes per file

---

## System Workflows

### 1. Application Startup

```mermaid
sequenceDiagram
    participant HTML
    participant PTEApp
    participant EventBus
    participant SettingsModule
    participant Storage
    participant Engines
    participant UIController
    
    Note over HTML: Scripts loaded
    HTML->>PTEApp: DOMContentLoaded
    
    PTEApp->>EventBus: Initialize EventBus
    EventBus-->>PTEApp: ✅ Ready
    
    PTEApp->>SettingsModule: initializeSettingsModule()
    SettingsModule->>Storage: Load saved settings
    Storage-->>SettingsModule: {speed:'0.8', delay:'3000', ...}
    
    SettingsModule->>SettingsModule: Validate all loaded settings
    SettingsModule->>SettingsModule: Apply defaults for missing
    SettingsModule-->>PTEApp: ✅ Ready
    
    PTEApp->>Engines: Initialize all engines
    
    loop For each engine
        Engines->>EventBus: Add event listeners
    end
    
    Engines-->>PTEApp: ✅ Ready
    
    PTEApp->>UIController: Initialize UI
    UIController->>SettingsModule: Get current settings
    SettingsModule-->>UIController: {speed:0.8, ...}
    UIController->>UIController: Populate dropdowns
    UIController-->>PTEApp: ✅ Ready
    
    PTEApp-->>HTML: ✅ App ready
```

**Duration**: ~100-200ms  
**Critical Path**: EventBus → SettingsModule → Engines → UI

---

### 2. Setting Change Propagation

```mermaid
flowchart TB
    UI[🌐 UI Layer] -->|emit event| EB[📡 EventBus]
    EB -->|broadcast| SM[⚙️ SettingsModule]
    
    SM --> V{Validate}
    V -->|✅ Valid| A[Apply]
    V -->|❌ Invalid| E[Emit error]
    
    A --> P[Persist]
    P --> EC[Emit changed]
    EC --> EB
    
    E --> EB
    
    EB --> ENG1[🎤 TTSEngine]
    EB --> ENG2[🔊 AudioControls]
    EB --> ENG3[🗣️ VoiceSelector]
    EB --> ENG4[📚 VocabularyManager]
    
    ENG1 --> U1[Update state]
    ENG2 --> U2[Update state]
    ENG3 --> U3[Update state]
    ENG4 --> U4[Update state]
    
    classDef ui fill:#e6f3ff
    classDef core fill:#e6ffe6
    classDef error fill:#ffcccc
    
    class UI ui
    class EB,SM,V,A,P,EC core
    class E error
    class ENG1,ENG2,ENG3,ENG4,U1,U2,U3,U4 core
```

**Steps**:
1. UI emits `setting:request-change`
2. EventBus broadcasts to SettingsModule
3. SettingsModule validates
4. If valid: apply → persist → emit `setting:changed`
5. If invalid: emit `setting:error`
6. EventBus broadcasts `setting:changed` to all engines
7. Each engine updates its internal state

**Duration**: ~2ms end-to-end

---

### 3. Error Handling Flow

```mermaid
flowchart TD
    Start[User enters invalid value] --> Emit[UI emits event]
    Emit --> Validate{SettingsModule<br/>validates}
    
    Validate -->|❌ Invalid| Error[Emit setting:error]
    Validate -->|✅ Valid| Success[Emit setting:changed]
    
    Error --> UI1[UIController receives error]
    UI1 --> Toast1[Show error toast]
    UI1 --> Revert[Revert dropdown to previous value]
    Toast1 --> End1([User sees error])
    Revert --> End1
    
    Success --> Engine[Engines receive change]
    Engine --> Apply[Apply new value]
    Apply --> End2([Setting updated])
    
    classDef error fill:#ffcccc,stroke:#cc0000
    classDef success fill:#ccffcc,stroke:#00cc00
    
    class Error,UI1,Toast1,Revert,End1 error
    class Success,Engine,Apply,End2 success
```

**Error Types**:
- **Validation Error**: Value out of range (e.g., speed = 999)
- **Type Error**: Wrong type (e.g., delay = "abc")
- **Missing Handler**: Unknown setting key
- **Storage Error**: localStorage full

---

## Integration Workflows

### 1. Third-Party API Call (TTS)

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant EventBus
    participant SettingsModule
    participant TTSEngine
    participant SpeechAPI as Web Speech API
    
    User->>UI: Changes speed to 0.8x
    UI->>EventBus: emit('setting:request-change', {key:'speed', value:'0.8'})
    EventBus->>SettingsModule: Broadcast
    SettingsModule->>SettingsModule: Validate & persist
    SettingsModule->>EventBus: emit('setting:changed', {key:'speed', value:0.8})
    EventBus->>TTSEngine: Broadcast
    TTSEngine->>TTSEngine: this.speechRate = 0.8
    
    Note over User: Later...
    User->>UI: Clicks "Play"
    UI->>TTSEngine: speak(text)
    TTSEngine->>SpeechAPI: speechSynthesis.speak(utterance)
    Note over TTSEngine: utterance.rate = this.speechRate (0.8)
    SpeechAPI-->>User: 🔊 Speech at 0.8x speed
```

**Key Points**:
- Settings change is decoupled from API call
- Engine stores setting internally
- API call uses stored setting when needed

---

### 2. Cross-Module Communication

```mermaid
sequenceDiagram
    participant SettingsPanel
    participant EventBus
    participant SettingsModule
    participant VocabularyManager
    participant UIController
    
    Note over SettingsPanel: User changes difficulty to "advanced"
    SettingsPanel->>EventBus: emit('setting:request-change', {key:'difficulty', value:'advanced'})
    EventBus->>SettingsModule: Broadcast
    SettingsModule->>SettingsModule: Validate & persist
    SettingsModule->>EventBus: emit('setting:changed', {key:'difficulty', value:'advanced'})
    
    EventBus->>VocabularyManager: Broadcast
    VocabularyManager->>VocabularyManager: Filter words by difficulty
    VocabularyManager->>EventBus: emit('vocabulary:updated', {count:500})
    
    EventBus->>UIController: Broadcast
    UIController->>UIController: Update word count display
    UIController-->>SettingsPanel: ✅ UI updated
```

**Pattern**: Settings change triggers cascade of events across modules

---

## State Diagram

### Setting Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Default: App starts
    Default --> Loaded: Load from storage
    Loaded --> Valid: Validate
    
    Valid --> Requested: User changes
    Requested --> Validating: SettingsModule validates
    
    Validating --> Applied: ✅ Valid
    Validating --> Rejected: ❌ Invalid
    
    Applied --> Persisted: Save to storage
    Persisted --> Emitted: Emit event
    Emitted --> Valid: Engines updated
    
    Rejected --> Valid: Keep previous value
    
    Valid --> [*]: App closes
```

**States**:
- **Default**: Built-in default value
- **Loaded**: Restored from localStorage
- **Valid**: Currently active valid value
- **Requested**: User wants to change
- **Validating**: Checking if valid
- **Applied**: Handler applied change
- **Persisted**: Saved to localStorage
- **Emitted**: Event broadcasted
- **Rejected**: Invalid, stay in previous state

---

## Timing Diagram

### Critical Path Analysis

```
User Click (t=0ms)
    |
    ├─ DOM Event (t=1ms)
    |
    ├─ EventBus emit (t=1.1ms)
    |
    ├─ SettingsModule validate (t=1.2ms)
    |   └─ Handler.validate() (t=1.7ms)
    |
    ├─ SettingsModule apply (t=1.8ms)
    |   └─ Handler.apply() (t=1.9ms)
    |
    ├─ Storage persist (t=2.0ms)
    |   └─ localStorage.setItem() (t=2.1ms)
    |
    ├─ EventBus emit (t=2.2ms)
    |
    └─ Engine update (t=2.4ms)
        └─ Internal state change (t=2.5ms)

Total: ~2.5ms (imperceptible)
```

**Bottlenecks**:
- localStorage write (~0.1ms) - acceptable
- Handler validation (~0.5ms) - could optimize complex validations
- EventBus broadcast (~0.1ms) - acceptable

**Optimization Opportunities**:
- Cache validation results for repeated values
- Debounce rapid changes (e.g., slider)
- Batch multiple setting changes

---

## Rollback Workflow

### Handle Failed Setting Change

```mermaid
flowchart TD
    Start[User changes setting] --> Validate{Valid?}
    
    Validate -->|Yes| Apply[Apply change]
    Apply --> Persist{Persist OK?}
    
    Persist -->|Yes| Success[✅ Change applied]
    Persist -->|No| StorageError[localStorage full]
    
    StorageError --> Rollback1[Rollback in-memory state]
    Rollback1 --> Error1[Show error toast]
    Error1 --> End1[Setting not changed]
    
    Validate -->|No| ValidationError[Validation failed]
    ValidationError --> Error2[Show error toast]
    Error2 --> End2[Setting not changed]
    
    classDef error fill:#ffcccc
    class StorageError,Rollback1,Error1,ValidationError,Error2,End1,End2 error
```

**Recovery Strategies**:
- **Validation Error**: Keep previous value, show message
- **Storage Error**: Rollback in-memory, show warning
- **Apply Error**: Rollback both memory and storage

---

## Conclusion

The workflow system follows a consistent pattern:

1. **User Action** → UI emits event
2. **Validation** → SettingsModule checks
3. **Application** → Handler applies logic
4. **Persistence** → Storage saves
5. **Propagation** → EventBus broadcasts
6. **Response** → Engines update

**Key Benefits**:
- ✅ Predictable flow (always same steps)
- ✅ Error handling at every step
- ✅ Rollback on failure
- ✅ Async-safe (events don't block)
- ✅ Testable (can mock each step)

**Next Steps**:
1. Implement remaining event listeners in engines
2. Add comprehensive error handling
3. Add performance monitoring
4. Write integration tests for workflows
