# Data Flow Diagram: Settings System

## Current State (Dual System - PROBLEMATIC)

```mermaid
graph TB
    %% User Input
    User[👤 User] -->|clicks dropdown| HTML[🌐 HTML Dropdown]
    
    %% Two parallel paths (PROBLEM!)
    HTML -->|OLD: direct call| OLD_UI[❌ OLD: UIController.handleSpeedChange]
    HTML -->|NEW: event| NEW_UI[✅ NEW: UIController.bindSettingControls]
    
    %% Old path (still exists)
    OLD_UI -->|window.ttsEngine.setSpeechRate| OLD_ENGINE[❌ TTSEngine.setSpeechRate]
    OLD_ENGINE -->|window.storage.setItem| OLD_STORAGE[💾 Storage.setItem]
    OLD_STORAGE -->|saves| LOCALSTORAGE[(🗄️ localStorage)]
    
    %% New path (only partial)
    NEW_UI -->|emit: setting:request-change| EVENTBUS[📡 EventBus]
    EVENTBUS -->|broadcast| SETTINGS_MODULE[⚙️ SettingsModule]
    SETTINGS_MODULE -->|1. validate| HANDLER[🔍 Handler.validate]
    HANDLER -->|2. if valid| APPLY[✅ Handler.apply]
    APPLY -->|3. persist| NEW_STORAGE[💾 Storage.setItem]
    NEW_STORAGE -->|saves| LOCALSTORAGE
    SETTINGS_MODULE -->|4. emit: setting:changed| EVENTBUS
    
    %% Problem: Engines don't listen yet!
    EVENTBUS -.->|⚠️ NO LISTENER!| ENGINE_PLACEHOLDER[❌ TTSEngine (not listening)]
    
    %% Visual styling
    classDef oldCode fill:#ffcccc,stroke:#cc0000,stroke-width:3px,stroke-dasharray: 5 5
    classDef newCode fill:#ccffcc,stroke:#00cc00,stroke-width:3px
    classDef problem fill:#ffeb99,stroke:#ff9900,stroke-width:3px
    
    class OLD_UI,OLD_ENGINE,OLD_STORAGE oldCode
    class NEW_UI,EVENTBUS,SETTINGS_MODULE,HANDLER,APPLY,NEW_STORAGE newCode
    class ENGINE_PLACEHOLDER problem
```

**Problem Summary**:
- 🔴 **Dual Paths**: Two ways to change settings (old direct calls + new events)
- 🔴 **Incomplete Loop**: SettingsModule emits events, but engines don't listen
- 🔴 **Dead Events**: `setting:changed` event emitted but no one receives it
- 🔴 **Inconsistency**: Some dropdowns use old path, some use new path

---

## Target State (Event-Driven - CLEAN)

```mermaid
graph TB
    %% User Input
    User[👤 User] -->|clicks dropdown| HTML[🌐 HTML Dropdown]
    
    %% Single unified path
    HTML -->|event: setting:request-change| EVENTBUS[📡 EventBus]
    
    %% SettingsModule orchestration
    EVENTBUS -->|broadcast| SETTINGS_MODULE[⚙️ SettingsModule]
    SETTINGS_MODULE -->|1. validate| HANDLER[🔍 Handler.validate]
    HANDLER -->|2. if valid| APPLY[✅ Handler.apply]
    APPLY -->|3. persist| STORAGE[💾 Storage.setItem]
    STORAGE -->|saves| LOCALSTORAGE[(🗄️ localStorage)]
    SETTINGS_MODULE -->|4. emit: setting:changed| EVENTBUS
    
    %% All engines listen
    EVENTBUS -->|speed changed| TTS_ENGINE[🎤 TTSEngine]
    EVENTBUS -->|delay changed| AUDIO_CONTROLS[🔊 AudioControls]
    EVENTBUS -->|voice changed| VOICE_SELECTOR[🗣️ VoiceSelector]
    EVENTBUS -->|difficulty changed| VOCAB_MANAGER[📚 VocabularyManager]
    
    %% Engines apply changes internally
    TTS_ENGINE -->|update internal state| TTS_STATE[🔧 TTS.speechRate]
    AUDIO_CONTROLS -->|update internal state| AUDIO_STATE[🔧 Audio.delay]
    VOICE_SELECTOR -->|update internal state| VOICE_STATE[🔧 Voice.preferred]
    VOCAB_MANAGER -->|update internal state| VOCAB_STATE[🔧 Vocab.difficulty]
    
    %% Visual styling
    classDef clean fill:#ccffcc,stroke:#00cc00,stroke-width:3px
    classDef data fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    
    class HTML,EVENTBUS,SETTINGS_MODULE,HANDLER,APPLY,STORAGE clean
    class TTS_ENGINE,AUDIO_CONTROLS,VOICE_SELECTOR,VOCAB_MANAGER clean
    class LOCALSTORAGE,TTS_STATE,AUDIO_STATE,VOICE_STATE,VOCAB_STATE data
```

**Benefits**:
- ✅ **Single Path**: Only one way to change settings (events)
- ✅ **Complete Loop**: All engines listen and respond
- ✅ **Loose Coupling**: Modules don't know about each other
- ✅ **Testable**: Can test each part independently
- ✅ **Extensible**: New engines just add listeners

---

## Detailed Flow: Speed Setting Example

### Current State (Mixed)

```mermaid
sequenceDiagram
    participant User
    participant Dropdown
    participant UIController
    participant TTSEngine
    participant SettingsModule
    participant EventBus
    participant Storage
    
    User->>Dropdown: selects "0.8x"
    
    alt OLD PATH (still exists)
        Dropdown->>UIController: onChange handler
        UIController->>TTSEngine: window.ttsEngine.setSpeechRate(0.8)
        TTSEngine->>Storage: storage.setItem('speed', '0.8')
        Note over TTSEngine,Storage: ❌ Direct coupling
    end
    
    alt NEW PATH (only in refactored files)
        Dropdown->>EventBus: emit('setting:request-change', {key:'speed', value:'0.8'})
        EventBus->>SettingsModule: broadcast event
        SettingsModule->>SettingsModule: validate(0.8)
        SettingsModule->>Storage: storage.setItem('speed', '0.8')
        SettingsModule->>EventBus: emit('setting:changed', {key:'speed', value:0.8})
        Note over EventBus: ⚠️ Event emitted but no one listens!
    end
```

### Target State (Clean)

```mermaid
sequenceDiagram
    participant User
    participant Dropdown
    participant EventBus
    participant SettingsModule
    participant Storage
    participant TTSEngine
    
    User->>Dropdown: selects "0.8x"
    Dropdown->>EventBus: emit('setting:request-change', {key:'speed', value:'0.8'})
    EventBus->>SettingsModule: broadcast to listener
    
    Note over SettingsModule: Validation layer
    SettingsModule->>SettingsModule: handlers.speed.validate('0.8')
    alt valid
        SettingsModule->>SettingsModule: handlers.speed.apply(0.8)
        SettingsModule->>Storage: setItem('speed', '0.8')
        SettingsModule->>EventBus: emit('setting:changed', {key:'speed', value:0.8})
        EventBus->>TTSEngine: broadcast to listener
        TTSEngine->>TTSEngine: this.speechRate = 0.8
        Note over TTSEngine: ✅ Engine updates internally
    else invalid
        SettingsModule->>EventBus: emit('setting:error', {key:'speed', error:'...'})
        Note over SettingsModule: ❌ Reject invalid value
    end
```

---

## Data Flow Layers

### Layer 1: Presentation (UI)
```mermaid
graph LR
    HTML[🌐 HTML] -->|events only| UI[🎨 UIController]
    UI -->|emit events| EB[📡 EventBus]
    
    classDef layer1 fill:#e6f3ff,stroke:#0066cc
    class HTML,UI layer1
```

**Responsibility**: User interaction, display updates  
**Pattern**: Emit events, never call modules directly  
**Files**: `index.html`, `UIController.js`, `SettingsPanel.js`

---

### Layer 2: Business Logic (Core)
```mermaid
graph TB
    EB[📡 EventBus] -->|setting:request-change| SM[⚙️ SettingsModule]
    SM -->|validate & apply| H[🔍 Handlers]
    SM -->|setting:changed| EB
    EB -->|broadcast| ENGINES[🎤🔊🗣️📚 Engines]
    
    classDef layer2 fill:#e6ffe6,stroke:#00cc00
    class SM,H,ENGINES layer2
```

**Responsibility**: Validation, orchestration, state management  
**Pattern**: Listen to events, emit events, never access DOM  
**Files**: `SettingsModule.js`, `TTSEngine.js`, `AudioControls.js`, etc.

---

### Layer 3: Data Persistence (Storage)
```mermaid
graph LR
    SM[⚙️ SettingsModule] -->|persist| ST[💾 Storage]
    ST -->|save| LS[(🗄️ localStorage)]
    
    classDef layer3 fill:#fff4e6,stroke:#ff9900
    class ST,LS layer3
```

**Responsibility**: Persistence, caching  
**Pattern**: Provide utility methods, no business logic  
**Files**: `Storage.js`, `CacheMigration.js`

---

## Event Catalog

### Events Emitted by SettingsModule

| Event | Payload | When | Listeners |
|-------|---------|------|-----------|
| `setting:changed` | `{key, value, previousValue}` | After successful setting change | All engines |
| `setting:error` | `{key, error, value}` | When validation fails | UIController (show error) |
| `settings:batch-updated` | `{updates: [{key,value}...]}` | After batch update | All engines |
| `settings:reset` | `{}` | After settings reset | All engines |
| `settings:imported` | `{settings: {...}}` | After import | All engines |

### Events Listened by SettingsModule

| Event | Payload | Emitted By | Action |
|-------|---------|------------|--------|
| `setting:request-change` | `{key, value}` | UIController, SettingsPanel | Validate → Apply → Persist → Emit |

### Events Listened by Engines

| Engine | Events | Actions |
|--------|--------|---------|
| TTSEngine | `setting:changed` (speed, voice) | Update `this.speechRate`, `this.selectedVoice` |
| AudioControls | `setting:changed` (delay, repeat) | Update `this.delay`, `this.repeatMode` |
| VoiceSelector | `setting:changed` (voice) | Update `this.preferredVoice`, refresh dropdown |
| VocabularyManager | `setting:changed` (difficulty, learningMode) | Filter words, switch books |

---

## Data Transformation Pipeline

```mermaid
graph LR
    A[🌐 HTML Value<br/>string: '0.8'] -->|emit event| B[📡 EventBus<br/>string: '0.8']
    B --> C[⚙️ SettingsModule<br/>string: '0.8']
    C -->|validate| D[🔍 Handler<br/>parse: 0.8]
    D -->|apply| E[✅ Validated<br/>number: 0.8]
    E -->|persist| F[💾 Storage<br/>string: '0.8']
    F -->|save| G[(🗄️ localStorage<br/>string: '0.8')]
    C -->|emit| H[📡 EventBus<br/>number: 0.8]
    H -->|broadcast| I[🎤 TTSEngine<br/>number: 0.8]
    
    classDef transform fill:#f9f,stroke:#333,stroke-width:2px
    class D,E transform
```

**Key Transformations**:
1. HTML → Event: String (e.g., `"0.8"`)
2. Event → Handler: Still string
3. Handler validate: String → Number (e.g., `0.8`)
4. Storage persist: Number → String (e.g., `"0.8"`)
5. Event broadcast: Number (e.g., `0.8`)
6. Engine apply: Number (e.g., `0.8`)

---

## Error Handling Flow

```mermaid
graph TB
    User[👤 User] -->|invalid value| Dropdown[🌐 Dropdown]
    Dropdown -->|emit event| EventBus[📡 EventBus]
    EventBus --> SettingsModule[⚙️ SettingsModule]
    
    SettingsModule -->|validate| Handler[🔍 Handler]
    Handler -->|check| Decision{Valid?}
    
    Decision -->|✅ YES| Apply[✅ Apply]
    Apply --> Persist[💾 Persist]
    Persist --> Success[📡 Emit: setting:changed]
    Success --> Engines[🎤 Engines Update]
    
    Decision -->|❌ NO| Error[📡 Emit: setting:error]
    Error --> UIController[🎨 UIController]
    UIController -->|show toast| UserFeedback[⚠️ Error Message]
    
    classDef success fill:#ccffcc,stroke:#00cc00
    classDef error fill:#ffcccc,stroke:#cc0000
    
    class Apply,Persist,Success,Engines success
    class Error,UserFeedback error
```

**Error Scenarios**:
- Invalid speed (e.g., `999`)
- Invalid delay (e.g., `-1`)
- Invalid difficulty (e.g., `"ultra-hard"`)
- Invalid dataset (e.g., `"non-existent.json"`)

---

## Performance Characteristics

### Event Overhead

```
User clicks dropdown
└─ ~1ms: DOM event
   └─ ~0.1ms: EventBus emit
      └─ ~0.5ms: SettingsModule validate
         └─ ~0.1ms: Storage persist
            └─ ~0.1ms: EventBus emit
               └─ ~0.2ms: Engine update
                  
Total: ~2ms (imperceptible to user)
```

**Benchmarks** (hypothetical, need real measurement):
- Old pattern (direct call): ~1ms
- New pattern (event-driven): ~2ms
- Overhead: +1ms (acceptable)

---

## Migration Data Flow

### Before Migration (File A uses old, File B uses new)

```mermaid
graph TB
    Dropdown1[Speed Dropdown] -->|OLD| Old[UIController.handleSpeedChange]
    Dropdown2[Delay Dropdown] -->|NEW| New[EventBus]
    
    Old -->|direct call| Engine1[TTSEngine.setSpeechRate]
    New --> SettingsModule[SettingsModule]
    SettingsModule -->|emit| EventBus[EventBus]
    EventBus -.->|NO LISTENER| Engine2[AudioControls]
    
    classDef problem fill:#ffeb99,stroke:#ff9900
    class Old,Engine2 problem
```

### After Migration (All files use events)

```mermaid
graph TB
    Dropdown1[Speed Dropdown] -->|NEW| EventBus[EventBus]
    Dropdown2[Delay Dropdown] -->|NEW| EventBus
    
    EventBus --> SettingsModule[SettingsModule]
    SettingsModule -->|emit| EventBus
    EventBus --> Engine1[TTSEngine]
    EventBus --> Engine2[AudioControls]
    
    classDef clean fill:#ccffcc,stroke:#00cc00
    class EventBus,SettingsModule,Engine1,Engine2 clean
```

---

## Conclusion

**Current Issue**: Dual system with incomplete event loop  
**Target**: Single event-driven architecture with all components listening  
**Key Insight**: SettingsModule is ready, but engines need event listeners added!

**Next Steps**:
1. Add event listeners to all engines
2. Privatize or remove old setter methods
3. Delete old SettingsManager
4. Verify data flows correctly end-to-end
