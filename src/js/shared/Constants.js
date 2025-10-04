/**
 * Constants.js - Global constants for the application
 * Provides backward compatibility for files that reference Constants.*
 */

// Define constants that match the expected API
const Constants = {
  SPEEDS: {
    SLOW: 0.7,
    NORMAL: 1.0,
    FAST: 1.3
  },

  DELAYS: {
    SHORT_PAUSE: 1000,
    NORMAL_PAUSE: 2000,
    DEFAULT_PAUSE: 2000,
    LONG_PAUSE: 3000,
    EXTENDED_PAUSE: 4000,
    TTS_VOICE_READY_DELAY: 100,
    TTS_RESET_TIMEOUT: 5000
  },

  VOICES: {
    DEFAULT: 'Google UK English Male',
    PRIORITY_LIST: [
      'Google UK English Male',
      'Microsoft James (en-AU)',
      'Google UK English Female',
      'Microsoft George (en-GB)',
      'Google US English Female'
    ],
    FALLBACK_VOICES: [
      'Microsoft James (en-AU)',
      'Google UK English Female',
      'Microsoft George (en-GB)',
      'Google US English Female'
    ]
  },

  REPEAT_MODES: {
    ONCE: 'once',
    INDIVIDUAL: 'individual',
    INTENSIVE: 'intensive',
    LOOP: 'loop'
  },

  MODES: {
    VOCABULARY_CLEAN: 'resume-terms',
    AIML_TERMS: 'aiml-terms',
    PROFESSIONAL_TERMS: 'professional-terms'
  },

  DIALOGUE_GROUPS: {
    CATEGORY_KEYS: {
      ALL: 'all-categories'
    }
  },

  // Helper function for category mapping
  getCategoryFromDialogueId: function (conversationId) {
    // Map conversation IDs to categories
    const categoryMap = {
      'social-welfare': 'social-welfare',
      'healthcare': 'healthcare',
      'education': 'education',
      'employment': 'employment',
      'housing': 'housing',
      'legal': 'legal',
      'community': 'community',
      'family': 'family',
      'finance': 'finance',
      'transport': 'transport'
    };

    return categoryMap[conversationId] || 'all-categories';
  }
};

// Make Constants available globally
if (typeof window !== 'undefined') {
  window.Constants = Constants;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Constants;
}
