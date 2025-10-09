# Bug Fix: Silent Words in Word Book Mode

## Issue Description
When using **word book mode** (vocabulary mode), pressing the PLAY button would not produce any audio. However, **sentence mode** (RS/ASQ/WFD) worked correctly.

## Root Causes
There were **TWO critical bugs** causing this issue:

### Bug #1: `isSpeaking` Flag Not Cleared
The `TTSEngine.js` class had a flag `isSpeaking` that was used to prevent overlapping speech. However, this flag had a critical bug:

1. The flag was **set to `true`** when `pronounceWord()` was called
2. The flag was **never reset to `false`** after speech completed
3. This caused subsequent calls to be blocked by the check:
   ```javascript
   if (this.isSpeaking) {
       console.warn('[TTSEngine] ⚠️ Already speaking, skipping...');
       return; // BLOCKED HERE!
   }
   ```

### Bug #2: `targetRepeats` Never Initialized
Even if the `isSpeaking` flag was fixed, the `targetRepeats` property was never properly initialized:

1. `targetRepeats` was initialized to `null` in constructor
2. Settings emitted `repeat` mode as a string ('once', 'twice', 'intensive', 'loop')
3. **No code converted** the string mode to a numeric `targetRepeats` value
4. The loop `for (let i = 0; i < targetRepeats; i++)` would fail with `null`
5. Result: **zero iterations, no audio playback**

## Why Sentence Mode Worked
Sentence mode uses a different method (`pronounceText()`) which:
- Doesn't check the `isSpeaking` flag
- Doesn't use `targetRepeats` (no repetition logic)
- Calls `speak()` directly once

This is why sentence mode was unaffected by both bugs.

## The Fixes

### Fix #1: Proper `isSpeaking` Flag Management
**File: `/src/js/audio/TTSEngine.js`**

```javascript
async pronounceWord(word, repeatIndex = 0) {
    // ... validation ...
    
    try {
        this.isSpeaking = true; // ✅ Set flag at start
        
        // ... speak the word ...
        
    } catch (error) {
        // ... error handling ...
    } finally {
        this.isSpeaking = false; // ✅ Always clear flag when done
    }
}

stopSpeaking() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
    
    this.isSpeaking = false; // ✅ Clear flag when manually stopped
    
    // ... rest of cleanup ...
}
```

### Fix #2: Convert Repeat Mode to Target Count
**File: `/src/js/audio/AudioControls.js`**

Added logic to convert string repeat modes to numeric values and initialize `TTSEngine`:

```javascript
_setRepeatMode(mode) {
    this.repeatMode = validModes.includes(mode) ? mode : 'once';

    // ✅ Convert repeat mode to target number of repetitions
    const repeatModeToCount = {
        'once': 1,
        'twice': 2,
        'intensive': 3,
        'loop': 1  // Loop plays each word once, then advances
    };

    const targetRepeats = repeatModeToCount[this.repeatMode] || 1;

    // ✅ Set target repeats in TTSEngine
    if (window.ttsEngine && typeof window.ttsEngine.setRepeatMode === 'function') {
        window.ttsEngine.setRepeatMode(targetRepeats);
    }
    
    // ... emit event ...
}
```

### Fix #3: Safe Default for `getTargetRepeats()`
**File: `/src/js/audio/TTSEngine.js`**

Added fallback to prevent `null` returns:

```javascript
getTargetRepeats() {
    // ✅ Return targetRepeats if set, otherwise default to 1
    return this.targetRepeats || 1;
}
```

## Files Modified
1. `/src/js/audio/TTSEngine.js`
   - Added `this.isSpeaking = true` at the start of `pronounceWord()`
   - Added `finally` block with `this.isSpeaking = false`
   - Added `this.isSpeaking = false` in `stopSpeaking()` method
   - Added fallback in `getTargetRepeats()` to return `1` if `null`

2. `/src/js/audio/AudioControls.js`
   - Added `repeatModeToCount` mapping object
   - Added call to `ttsEngine.setRepeatMode(targetRepeats)`
   - Added logging for debugging

## Testing
After these fixes:
1. ✅ Word book mode audio works correctly
2. ✅ Sentence mode continues to work
3. ✅ Repeated clicks don't cause overlapping audio
4. ✅ Pause/stop buttons work correctly
5. ✅ Auto-play mode works properly
6. ✅ Repeat modes (once/twice/intensive/loop) work as expected

## Technical Details

### The Initialization Chain
The proper initialization flow is now:
1. **SettingsModule** loads `repeat` setting (e.g., 'twice')
2. **SettingsModule** emits `setting:changed` event
3. **AudioControls** receives event and calls `_setRepeatMode('twice')`
4. **AudioControls** converts 'twice' → `2` and calls `ttsEngine.setRepeatMode(2)`
5. **TTSEngine** stores `this.targetRepeats = 2`
6. **Playback** uses `getTargetRepeats()` which returns `2`
7. **Loop** executes 2 times: `for (let i = 0; i < 2; i++)`

### Resource Lock Pattern
The `isSpeaking` flag follows a classic **resource lock pattern**:
- **Lock acquisition:** `this.isSpeaking = true`
- **Critical section:** speech synthesis
- **Lock release:** `this.isSpeaking = false` (must be in `finally` block)

The `finally` block ensures the lock is always released, even if errors occur during speech.

## Date Fixed
October 9, 2025 (Second fix)
