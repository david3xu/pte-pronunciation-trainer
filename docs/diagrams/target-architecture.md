# Target Architecture (After Complete Migration)

```mermaid
graph TB
    subgraph "🎨 View Layer - No Business Logic"
        HTML[index.html<br/>Dropdowns & Buttons]
        UI[UIController.js<br/>✅ Only emits events<br/>No engine knowledge]
        SP[SettingsPanel.js<br/>✅ Uses events]
    end
    
    subgraph "🎯 Controller Layer - Single System"
        SM[SettingsModule.js<br/>✅ Single Source of Truth<br/>Validates → Routes → Persists]
        EB[EventBus.js<br/>Central Message Bus]
    end
    
    subgraph "⚙️ Model Layer - Event Listeners"
        TTS[TTSEngine.js<br/>✅ Listens to events<br/>No exposed setters]
        AC[AudioControls.js<br/>✅ Listens to events<br/>No exposed setters]
        VS[VoiceSelector.js<br/>✅ Listens to events<br/>No exposed setters]
        VM[PTEVocabularyManager.js<br/>✅ Listens to events<br/>No exposed setters]
    end
    
    subgraph "💾 Persistence Layer - Clean"
        STORE[Storage.js<br/>✅ Simple get/set only<br/>No redundant methods]
    end
    
    subgraph "🔧 Utils"
        CACHE[CacheMigration.js<br/>✅ Uses SettingsModule]
    end
    
    %% Clean event-driven flow
    HTML -->|user input| UI
    UI -->|emit events| EB
    SP -->|emit events| EB
    CACHE -->|emit events| EB
    
    EB -->|setting:request-change| SM
    
    SM -->|1. validate| SM
    SM -->|2. persist| STORE
    SM -->|3. emit| EB
    
    EB -->|setting:changed| TTS
    EB -->|setting:changed| AC
    EB -->|setting:changed| VS
    EB -->|setting:changed| VM
    EB -->|setting:changed| UI
    
    %% All engines listen to events
    TTS -->|internal update| TTS
    AC -->|internal update| AC
    VS -->|internal update| VS
    VM -->|internal update| VM
    
    style SM fill:#90EE90,stroke:#2d5016,stroke-width:4px
    style EB fill:#87CEEB,stroke:#104e8b,stroke-width:3px
    style UI fill:#90EE90
    style SP fill:#90EE90
    style TTS fill:#90EE90
    style AC fill:#90EE90
    style VS fill:#90EE90
    style VM fill:#90EE90
    style STORE fill:#90EE90
    style CACHE fill:#90EE90
```

## Legend
- 🟢 **All Green**: Clean, consistent, event-driven architecture
- **All Solid Lines**: Event-driven communication only
- **No Dashed Lines**: No direct calls (removed)

## Benefits of Target State

1. ✅ **Single System**: Only SettingsModule exists
2. ✅ **Consistent**: All code uses events
3. ✅ **Enforced**: Engines only listen to events (no setters)
4. ✅ **Clean**: No redundant code
5. ✅ **Clear Boundaries**: SettingsModule handles ALL settings logic
6. ✅ **Complete Migration**: All files updated
7. ✅ **Loose Coupling**: View → EventBus → Controller → EventBus → Model
8. ✅ **Easy Testing**: Mock EventBus only
9. ✅ **Scalable**: Add setting by adding handler + HTML
10. ✅ **Maintainable**: Single place for settings logic

## Comparison Table

| Aspect | Current (Partial) | Target (Complete) |
|--------|------------------|-------------------|
| **Settings Systems** | 2 (SM + Old) | 1 (SM only) |
| **Communication** | Mixed | Events only |
| **Engine Setters** | Exposed | Hidden (private) |
| **Code Patterns** | Inconsistent | Consistent |
| **Files to Edit (new setting)** | Unclear | 2 files |
| **Dependencies (UIController)** | 5+ modules | 1 (EventBus) |
| **Validation** | Partial | 100% |
| **Testability** | Hard | Easy |
| **Redundant Code** | Yes | None |
| **Maintainability** | Medium | High |
