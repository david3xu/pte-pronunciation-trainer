// State Persistence Test & Debug Utilities
// This file provides debugging functions to test and verify state persistence

const stateTest = {
    // Test state saving
    testSave: function() {
        console.log('🧪 Testing state persistence...');
        
        // Simulate user actions
        const testState = {
            currentWordIndex: 42,
            currentCategory: 'education',
            currentDifficulty: 'hard',
            speed: '1.0',
            delay: '3000',
            repeat: 'intensive',
            voice: 'Google UK English Female'
        };
        
        // Save learning state
        if (window.stateManager) {
            window.stateManager.saveLearningState(
                testState.currentWordIndex,
                testState.currentCategory,
                testState.currentDifficulty
            );
            
            // Save user preferences
            window.stateManager.saveUserPreferences({
                speed: testState.speed,
                delay: testState.delay,
                repeat: testState.repeat,
                voice: testState.voice
            });
            
            console.log('✅ Test state saved:', testState);
            return true;
        }
        
        console.log('❌ StateManager not available');
        return false;
    },
    
    // Test state loading
    testLoad: function() {
        console.log('🔍 Testing state loading...');
        
        if (window.stateManager) {
            const learningState = window.stateManager.getLearningState();
            const userPrefs = window.stateManager.getUserPreferences();
            
            console.log('📂 Loaded learning state:', learningState);
            console.log('📂 Loaded user preferences:', userPrefs);
            
            return {
                learningState,
                userPrefs,
                hasPreviousSession: window.stateManager.hasPreviousSession()
            };
        }
        
        console.log('❌ StateManager not available');
        return null;
    },
    
    // Show current app state
    showCurrentState: function() {
        console.log('📊 Current App State:');
        console.log('─'.repeat(50));
        
        if (window.vocabularyManager) {
            console.log('Current Word Index:', window.vocabularyManager.currentIndex);
            console.log('Current Category:', window.vocabularyManager.currentCategory);
            console.log('Current Difficulty:', window.vocabularyManager.currentDifficulty);
            console.log('Total Words:', window.vocabularyManager.getTotalWords());
        }
        
        if (window.stateManager) {
            console.log('Has Previous Session:', window.stateManager.hasPreviousSession());
            console.log('Last Saved:', new Date(window.stateManager.get('lastSaved')).toLocaleString());
        }
        
        // Show UI settings
        const uiSettings = {
            category: document.getElementById('categorySelect')?.value,
            difficulty: document.getElementById('difficultySelect')?.value,
            speed: document.getElementById('speedSelect')?.value,
            delay: document.getElementById('delaySelect')?.value,
            repeat: document.getElementById('repeatSelect')?.value,
            voice: document.getElementById('voiceSelect')?.value
        };
        
        console.log('UI Settings:', uiSettings);
        console.log('─'.repeat(50));
    },
    
    // Simulate page refresh test
    simulateRefresh: function() {
        console.log('🔄 Simulating page refresh test...');
        console.log('1. Saving current state...');
        
        // Save current actual state
        if (window.vocabularyManager && window.stateManager) {
            window.stateManager.saveLearningState(
                window.vocabularyManager.currentIndex,
                window.vocabularyManager.currentCategory,
                window.vocabularyManager.currentDifficulty
            );
            
            console.log('✅ Current state saved');
            console.log('2. To test refresh: Press F5 or reload the page');
            console.log('3. After reload, run: stateTest.verifyRestore()');
            
            return true;
        }
        
        console.log('❌ Cannot save state - modules not ready');
        return false;
    },
    
    // Verify state restoration after refresh
    verifyRestore: function() {
        console.log('✅ Verifying state restoration after refresh...');
        
        setTimeout(() => {
            this.showCurrentState();
            
            if (window.stateManager && window.stateManager.hasPreviousSession()) {
                console.log('🎉 SUCCESS: Previous session state was restored!');
            } else {
                console.log('⚠️ No previous session found or state not restored');
            }
        }, 2000); // Wait for full initialization
    },
    
    // Clear all state (reset)
    clearState: function() {
        console.log('🗑️ Clearing all saved state...');
        
        if (window.stateManager) {
            window.stateManager.clearState();
            console.log('✅ State cleared - refresh page to see default state');
        } else {
            console.log('❌ StateManager not available');
        }
    }
};

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('stateTest', stateTest);
}

// Legacy compatibility - maintain existing global reference
window.stateTest = stateTest;

// Automatically show state on load for debugging
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.stateTest) {
            console.log('🔧 State persistence debugging available:');
            console.log('  stateTest.showCurrentState() - Show current state');
            console.log('  stateTest.testSave() - Test saving state');
            console.log('  stateTest.testLoad() - Test loading state');
            console.log('  stateTest.simulateRefresh() - Prepare for refresh test');
            console.log('  stateTest.verifyRestore() - Verify after refresh');
            console.log('  stateTest.clearState() - Clear all saved state');
        }
    }, 3000);
});