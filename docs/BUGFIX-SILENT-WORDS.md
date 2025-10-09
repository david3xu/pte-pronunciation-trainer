# Bug Fix: Silent Words in Word Book Mode

## Issue Description
When using **word book mode** (vocabulary mode), pressing the PLAY button would not produce any audio. However, **sentence mode** (RS/ASQ/WFD) worked correctly.

## Root Cause
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

## Why Sentence Mode Worked
Sentence mode uses a different method (`pronounceText()`) which doesn't check the `isSpeaking` flag, so it was unaffected by this bug.

## The Fix
Added proper flag management in two places:

### 1. `pronounceWord()` method
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
```

### 2. `stopSpeaking()` method
```javascript
stopSpeaking() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
    
    this.isSpeaking = false; // ✅ Clear flag when manually stopped
    
    // ... rest of cleanup ...
}
```

## Files Modified
- `/src/js/audio/TTSEngine.js`
  - Added `this.isSpeaking = true` at the start of `pronounceWord()`
  - Added `finally` block with `this.isSpeaking = false` to always clear the flag
  - Added `this.isSpeaking = false` in `stopSpeaking()` method

## Testing
After this fix:
1. ✅ Word book mode audio works correctly
2. ✅ Sentence mode continues to work
3. ✅ Repeated clicks don't cause overlapping audio (flag still prevents this)
4. ✅ Pausing/stopping properly resets the flag
5. ✅ Auto-play mode works with proper flag management

## Related Code Pattern
This is a classic **resource lock** pattern where:
- Lock acquisition: `this.isSpeaking = true`
- Critical section: speech synthesis
- Lock release: `this.isSpeaking = false` (must be in `finally` block)

The `finally` block ensures the lock is always released, even if errors occur during speech.

## Date Fixed
October 9, 2025
