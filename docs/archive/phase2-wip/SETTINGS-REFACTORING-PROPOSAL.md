# Settings Refactoring Proposal
**Date**: 2025-10-08  
**Status**: 📋 Proposal

## Problem Analysis

### Current Implementation Issues

1. **Dual Update Pattern** (Anti-pattern):
```javascript
// UIController.js - CURRENT (BAD)
document.getElementById('speedSelect').addEventListener('change', (e) => {
    window.ttsEngine.setSpeechRate(parseFloat(e.target.value));  // ❌ Direct engine call
    if (window.settingsManager) {
        window.settingsManager.updateSetting('speed', e.target.value);  // ❌ Separate save
    }
});
```

**Problems:**
- Two separate calls for one action
- UIController knows about engine internals
- Settings Manager doesn't control application of settings
- No guarantee order is correct
- Hard to test, maintain, extend

2. **No Centralized Settings Module**:
- 6 different event listeners doing the same pattern
- Each duplicates the "update engine + save setting" logic
- No single place to intercept/validate/log settings changes

3. **Tight Coupling**:
- UIController depends on: `window.ttsEngine`, `window.audioControls`, `window.voiceSelector`, `window.settingsManager`
- Changes to any engine require UIController changes
- Can't swap implementations easily

4. **Missing Features**:
- No settings validation before application
- No undo/redo capability
- No settings change notifications
- No batch updates
- No migration strategy for setting changes

## Proposed Solution: Centralized Settings Module

### Architecture Pattern

```
┌─────────────┐
│ UIController│ (View Layer)
└──────┬──────┘
       │ emit('setting:change', {key, value})
       ↓
┌──────────────────┐
│  SettingsModule  │ (Controller/Mediator)
│  ───────────────│
│ • Validate       │
│ • Apply to       │
│   engines        │
│ • Persist        │
│ • Emit events    │
└──────┬───────────┘
       │
       ├──→ TTSEngine
       ├──→ AudioControls
       ├──→ VoiceSelector
       └──→ Storage
```

### Implementation

#### 1. Create Centralized SettingsModule

```javascript
// src/js/core/SettingsModule.js
class SettingsModule {
    constructor() {
        this.config = window.appConfig;
        this.storage = window.storage;
        this.eventBus = window.eventBus;
        
        // Current settings (in-memory cache)
        this.settings = this.loadSettings();
        
        // Setting handlers - maps setting keys to application logic
        this.handlers = this.initializeHandlers();
        
        // Listen for setting change requests
        this.eventBus.on('setting:request-change', this.handleSettingChange.bind(this));
    }
    
    /**
     * Initialize setting handlers - centralized application logic
     */
    initializeHandlers() {
        return {
            speed: {
                validate: (value) => {
                    const speeds = Object.values(this.config.get('tts.speeds'));
                    return speeds.includes(parseFloat(value));
                },
                apply: (value) => {
                    window.ttsEngine?.setSpeechRate(parseFloat(value));
                },
                default: () => String(this.config.get('tts.speeds.slow'))
            },
            
            delay: {
                validate: (value) => {
                    const delays = { short: 1000, normal: 2000, long: 3000 };
                    return Object.values(delays).includes(parseInt(value));
                },
                apply: (value) => {
                    window.audioControls?.setDelay(parseInt(value));
                },
                default: () => String(this.config.get('tts.delays.long'))
            },
            
            repeat: {
                validate: (value) => {
                    return this.config.get('tts.repeatModes').includes(value);
                },
                apply: (value) => {
                    window.audioControls?.setRepeatMode(value);
                    if (window.ttsEngine) {
                        window.ttsEngine.currentRepeatCount = 0;
                    }
                },
                default: () => 'once'
            },
            
            voice: {
                validate: (value) => {
                    return value === 'auto' || this.isValidVoice(value);
                },
                apply: (value) => {
                    window.voiceSelector?.setPreferredVoice(value);
                },
                default: () => 'auto'
            },
            
            difficulty: {
                validate: (value) => {
                    return this.config.get('data.difficulties').includes(value);
                },
                apply: (value) => {
                    window.pteVocabularyManager?.setDifficulty(value);
                },
                default: () => 'all'
            },
            
            learningMode: {
                validate: (value) => {
                    const modes = this.config.get('data.learningModes');
                    return modes.some(m => m.id === value);
                },
                apply: async (value) => {
                    await window.pteVocabularyManager?.setLearningMode(value);
                },
                default: () => 'pte-fib-listening'
            },
            
            practiceMode: {
                validate: (value) => {
                    const modes = this.config.get('data.practiceModes');
                    return modes.some(m => m.id === value);
                },
                apply: (value) => {
                    // Practice mode switching logic
                    window.currentPracticeMode = value;
                    this.eventBus.emit('practiceMode:changed', { mode: value });
                },
                default: () => 'vocabulary'
            },
            
            practiceDataset: {
                validate: (value) => {
                    const datasets = this.config.get('data.practiceDatasets');
                    return datasets.some(d => d.id === value);
                },
                apply: async (value) => {
                    // Dataset loading logic
                    this.eventBus.emit('practiceDataset:changed', { dataset: value });
                },
                default: () => 'pte-repeat-sentence'
            }
        };
    }
    
    /**
     * Handle setting change request
     */
    async handleSettingChange({ key, value }) {
        try {
            // 1. Validate
            const handler = this.handlers[key];
            if (!handler) {
                console.warn(`Unknown setting: ${key}`);
                return { success: false, error: 'Unknown setting' };
            }
            
            if (handler.validate && !handler.validate(value)) {
                console.warn(`Invalid value for ${key}: ${value}`);
                return { success: false, error: 'Invalid value' };
            }
            
            // 2. Apply to engine/manager
            if (handler.apply) {
                await handler.apply(value);
            }
            
            // 3. Update in-memory cache
            this.settings[key] = value;
            
            // 4. Persist to storage
            const storageKey = this.config.get(`settings.storageKeys.${key}`);
            if (storageKey) {
                this.storage.setItem(storageKey, value);
            }
            
            // 5. Emit success event
            this.eventBus.emit('setting:changed', { key, value });
            
            return { success: true };
            
        } catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            this.eventBus.emit('setting:error', { key, value, error });
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get current setting value
     */
    getSetting(key) {
        return this.settings[key] ?? this.handlers[key]?.default?.();
    }
    
    /**
     * Get all settings
     */
    getAllSettings() {
        return { ...this.settings };
    }
    
    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        const defaultSettings = {};
        
        for (const [key, handler] of Object.entries(this.handlers)) {
            const defaultValue = handler.default?.();
            if (defaultValue !== undefined) {
                defaultSettings[key] = defaultValue;
                await this.handleSettingChange({ key, value: defaultValue });
            }
        }
        
        this.eventBus.emit('settings:reset');
    }
    
    /**
     * Load settings from storage
     */
    loadSettings() {
        const settings = {};
        const storageKeys = this.config.get('settings.storageKeys');
        
        for (const [key, storageKey] of Object.entries(storageKeys)) {
            const value = this.storage.getItem(storageKey);
            if (value !== null) {
                settings[key] = value;
            }
        }
        
        return settings;
    }
    
    /**
     * Batch update multiple settings
     */
    async batchUpdate(settingsObject) {
        const results = {};
        
        for (const [key, value] of Object.entries(settingsObject)) {
            results[key] = await this.handleSettingChange({ key, value });
        }
        
        this.eventBus.emit('settings:batch-updated', results);
        return results;
    }
    
    /**
     * Get available options for a setting (for dropdown population)
     */
    getAvailableOptions(key) {
        // Delegate to SettingsManager for now (or merge logic here)
        return window.settingsManager?.getAvailableOptions(key) || [];
    }
    
    isValidVoice(voiceName) {
        // Voice validation logic
        return true; // Simplified
    }
}
```

#### 2. Simplify UIController

```javascript
// src/js/ui/UIController.js - REFACTORED
bindEventListeners() {
    // Speed setting
    document.getElementById('speedSelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'speed',
            value: e.target.value
        });
    });
    
    // Delay setting
    document.getElementById('delaySelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'delay',
            value: e.target.value
        });
    });
    
    // Repeat setting
    document.getElementById('repeatSelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'repeat',
            value: e.target.value
        });
    });
    
    // Voice setting
    document.getElementById('voiceSelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'voice',
            value: e.target.value
        });
    });
    
    // Difficulty setting
    document.getElementById('difficultySelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'difficulty',
            value: e.target.value
        });
        this.updateCategoryDisplay();
    });
    
    // Learning mode setting
    document.getElementById('learningModeSelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'learningMode',
            value: e.target.value
        });
        this.updateCategoryDisplay();
    });
    
    // Practice mode setting
    document.getElementById('practiceModeSelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'practiceMode',
            value: e.target.value
        });
    });
    
    // Practice dataset setting
    document.getElementById('practiceDatasetSelect').addEventListener('change', (e) => {
        window.eventBus.emit('setting:request-change', {
            key: 'practiceDataset',
            value: e.target.value
        });
    });
}
```

**Benefits:**
- ✅ UIController only emits events - no engine knowledge
- ✅ All event listeners follow same pattern
- ✅ Easy to add new settings - just emit event
- ✅ No tight coupling

#### 3. Generic Setting Binder (DRY)

```javascript
// Even better - make it COMPLETELY generic
bindSettingControls() {
    const settingControls = [
        { elementId: 'speedSelect', settingKey: 'speed' },
        { elementId: 'delaySelect', settingKey: 'delay' },
        { elementId: 'repeatSelect', settingKey: 'repeat' },
        { elementId: 'voiceSelect', settingKey: 'voice' },
        { elementId: 'difficultySelect', settingKey: 'difficulty', afterChange: () => this.updateCategoryDisplay() },
        { elementId: 'learningModeSelect', settingKey: 'learningMode', afterChange: () => this.updateCategoryDisplay() },
        { elementId: 'practiceModeSelect', settingKey: 'practiceMode' },
        { elementId: 'practiceDatasetSelect', settingKey: 'practiceDataset' }
    ];
    
    settingControls.forEach(({ elementId, settingKey, afterChange }) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('change', (e) => {
                window.eventBus.emit('setting:request-change', {
                    key: settingKey,
                    value: e.target.value
                });
                
                if (afterChange) {
                    afterChange();
                }
            });
        }
    });
}
```

**Benefits:**
- ✅ One loop to bind all settings
- ✅ Easy to add new settings - just add to array
- ✅ No code duplication
- ✅ Configuration-driven

## Migration Strategy

### Phase 1: Create SettingsModule (Non-Breaking)
1. Create `SettingsModule.js` with centralized handlers
2. Keep existing code working
3. Test module independently

### Phase 2: Dual Implementation
1. Make engines listen to `setting:changed` events
2. Keep direct calls as fallback
3. Verify both paths work

### Phase 3: Cut Over
1. Update UIController to emit events only
2. Remove direct engine calls
3. Verify all settings work through events

### Phase 4: Deprecate Old SettingsManager
1. Merge SettingsManager functionality into SettingsModule
2. Remove redundant code
3. Update documentation

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Lines of code** | ~80 (8 listeners × 10 lines) | ~20 (1 loop) |
| **Coupling** | High (UIController → 5 modules) | Low (UIController → EventBus) |
| **Testability** | Hard (need all engines) | Easy (mock EventBus) |
| **Maintainability** | Edit 2+ files per setting | Edit 1 handler |
| **Validation** | None | Centralized |
| **Logging** | None | Centralized |
| **Undo/Redo** | Not possible | Easy to add |
| **Batch updates** | Not possible | Built-in |

## Backwards Compatibility

To maintain backwards compatibility:

```javascript
// Legacy support wrapper
class SettingsManager {
    updateSetting(key, value) {
        // Delegate to new module
        window.eventBus.emit('setting:request-change', { key, value });
    }
    
    getSetting(key) {
        return window.settingsModule?.getSetting(key);
    }
    
    // ... other legacy methods
}
```

## Testing Strategy

```javascript
// Easy to test with event-driven architecture
describe('SettingsModule', () => {
    it('should validate setting before applying', async () => {
        const eventBus = new EventBus();
        const module = new SettingsModule({ eventBus });
        
        const result = await module.handleSettingChange({
            key: 'speed',
            value: '999' // Invalid
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid value');
    });
    
    it('should emit event after successful change', async () => {
        const events = [];
        eventBus.on('setting:changed', (e) => events.push(e));
        
        await module.handleSettingChange({
            key: 'speed',
            value: '0.7'
        });
        
        expect(events).toHaveLength(1);
        expect(events[0].key).toBe('speed');
    });
});
```

## Recommendation

**Should we implement this refactoring?**

**Pros:**
- ✅ Much cleaner architecture
- ✅ Easier to maintain and extend
- ✅ Better testability
- ✅ Follows best practices (Single Responsibility, Event-Driven, DRY)
- ✅ Enables future features (undo, batch updates, validation)

**Cons:**
- ⚠️ Requires significant refactoring (~200 lines changed)
- ⚠️ Need thorough testing
- ⚠️ Learning curve for event-driven pattern

**Verdict:** **YES** - The benefits far outweigh the costs. This is the proper way to centralize and modularize settings.

---

**Next Steps if Approved:**
1. Create `SettingsModule.js` skeleton
2. Implement handlers one by one
3. Add unit tests
4. Update UIController
5. Test thoroughly
6. Document new pattern
