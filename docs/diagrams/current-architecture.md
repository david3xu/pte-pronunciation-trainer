# Current Architecture (Before SettingsModule Migration Complete)

```mermaid
graph TB
    subgraph "🎨 View Layer"
        HTML[index.html<br/>Dropdowns & Buttons]
        UI[UIController.js<br/>⚠️ MIXED OLD+NEW]
        SP[SettingsPanel.js<br/>❌ OLD - Not Updated]
    end
    
    subgraph "🎯 Controller Layer - DUAL SYSTEM!"
        SM_NEW[SettingsModule.js<br/>✅ NEW Event-Driven<br/>Validates, Routes, Persists]
        SM_OLD[SettingsManager.js<br/>❌ OLD Direct Calls<br/>No Validation]
        EB[EventBus.js<br/>Message Bus]
    end
    
    subgraph "⚙️ Model Layer - Engines"
        TTS[TTSEngine.js<br/>❌ Exposes setSpeechRate()]
        AC[AudioControls.js<br/>❌ Exposes setDelay(), setRepeatMode()]
        VS[VoiceSelector.js<br/>❌ Exposes setPreferredVoice()]
        VM[PTEVocabularyManager.js<br/>❌ Exposes setDifficulty()]
    end
    
    subgraph "💾 Persistence Layer"
        STORE[Storage.js<br/>⚠️ Has redundant getSetting()]
        STATE[StateManager.js<br/>⚠️ Overlaps with SettingsModule?]
    end
    
    subgraph "🔧 Utils"
        CACHE[CacheMigration.js<br/>❌ Uses old SettingsManager]
    end
    
    %% NEW PATH (Partial)
    UI -->|bindSettingControls<br/>emit events| EB
    EB -->|setting:request-change| SM_NEW
    SM_NEW -->|validate| SM_NEW
    SM_NEW -->|apply via<br/>direct calls| TTS
    SM_NEW -->|apply via<br/>direct calls| AC
    SM_NEW -->|apply via<br/>direct calls| VS
    SM_NEW -->|apply via<br/>direct calls| VM
    SM_NEW -->|persist| STORE
    SM_NEW -->|emit success| EB
    EB -->|setting:changed| UI
    
    %% OLD PATH (Still exists!)
    SP -.->|updateSetting| SM_OLD
    CACHE -.->|updateSetting| SM_OLD
    SM_OLD -.->|setItem| STORE
    
    %% Direct calls from UI (old code paths)
    UI -.->|some methods still<br/>call directly| TTS
    UI -.->|some methods still<br/>call directly| AC
    
    %% State overlap
    STATE -.->|unclear overlap| SM_NEW
    STATE -.->|unclear overlap| STORE
    
    style SM_NEW fill:#90EE90,stroke:#2d5016,stroke-width:3px
    style SM_OLD fill:#FFB6C1,stroke:#8b0000,stroke-width:2px,stroke-dasharray: 5 5
    style UI fill:#FFE4B5
    style SP fill:#FFB6C1,stroke-dasharray: 5 5
    style TTS fill:#FFE4B5
    style AC fill:#FFE4B5
    style VS fill:#FFE4B5
    style VM fill:#FFE4B5
    style CACHE fill:#FFB6C1,stroke-dasharray: 5 5
    style STORE fill:#FFE4B5
    style STATE fill:#FFE4B5
```

## Legend
- 🟢 **Green (Solid)**: NEW - SettingsModule (Event-Driven)
- 🔴 **Pink (Dashed)**: OLD - To be removed/updated
- 🟡 **Beige (Solid)**: MIXED - Partially updated or needs review
- **Solid Lines**: NEW event-driven flow
- **Dashed Lines**: OLD direct call flow (still exists)

## Problems with Current State

1. **Dual System**: Both SettingsModule and old SettingsManager exist
2. **Inconsistent**: Some code uses events, some uses direct calls
3. **No Enforcement**: Engines still expose setter methods
4. **Redundancy**: Storage.getSetting() overlaps with SettingsModule.getSetting()
5. **Unclear Boundaries**: StateManager vs SettingsModule responsibilities unclear
6. **Partial Migration**: UIController uses events for dropdowns but may have old code elsewhere
7. **Not Updated**: SettingsPanel, CacheMigration still use old pattern
