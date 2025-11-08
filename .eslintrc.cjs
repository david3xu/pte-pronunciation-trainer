module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'semi': ['error', 'always'],

    // Custom rules to enforce project guidelines
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='window'][callee.property.name=/^(audioControls|settingsModule|ttsEngine|vocabularyManager)$/][callee.parent.parent.type!='IfStatement']",
        message: 'Direct module method calls are forbidden. Use EventBus instead: window.eventBus.emit("event:name", data)'
      }
    ],

    'no-restricted-properties': [
      'error',
      {
        object: 'settingsModule',
        property: 'setSetting',
        message: 'Direct setSetting() calls are forbidden. Use: window.eventBus.emit("settings:request-change", {key, value})'
      }
    ]
  },

  // Globals to prevent undefined variable errors
  globals: {
    window: 'readonly',
    appConfig: 'readonly',
    eventBus: 'readonly',
    AppConfig: 'readonly',
    EventBus: 'readonly',
    Storage: 'readonly',
    UIController: 'readonly',
    PTEApp: 'readonly',
    AudioControls: 'readonly',
    TTSEngine: 'readonly',
    VoiceSelector: 'readonly',
    PTEVocabularyManager: 'readonly',
    DatasetManager: 'readonly',
    SettingsModule: 'readonly',
    ProgressTracker: 'readonly',
    InitializationManager: 'readonly',
    DataSchema: 'readonly',
    webkitAudioContext: 'readonly',
    module: 'readonly',
    process: 'readonly'
  }
};
