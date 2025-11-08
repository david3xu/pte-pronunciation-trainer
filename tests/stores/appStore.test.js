/**
 * Zustand App Store Tests
 *
 * Tests for the main application store (audio, tts, settings, vocabulary, progress, UI, auth)
 */

describe('AppStore', () => {
  let useAppStore;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock analyticsService on window (not global.window)
    window.analyticsService = {
      trackTTSUsed: jest.fn(),
      track: jest.fn(),
      trackSettingChanged: jest.fn(),
      trackWordPractice: jest.fn(),
      trackPracticeSessionCompleted: jest.fn(),
      identify: jest.fn(),
      trackAuth: jest.fn(),
      reset: jest.fn(),
    };

    // Dynamic import to get fresh store for each test
    const module = await import('../../src/js/stores/index.js');
    useAppStore = module.useAppStore;

    // Reset store state
    useAppStore.setState({
      audio: {
        isPlaying: false,
        autoPlayEnabled: false,
        playbackSpeed: 1.0,
        volume: 1.0,
        currentIndex: 0,
        setPlaying: useAppStore.getState().audio.setPlaying,
        setAutoPlay: useAppStore.getState().audio.setAutoPlay,
        setSpeed: useAppStore.getState().audio.setSpeed,
        setVolume: useAppStore.getState().audio.setVolume,
        setCurrentIndex: useAppStore.getState().audio.setCurrentIndex,
      },
      tts: {
        isSpeaking: false,
        currentWord: null,
        currentPhonetic: null,
        speakingMode: null,
        selectedVoice: null,
        availableVoices: [],
        error: null,
        startSpeaking: useAppStore.getState().tts.startSpeaking,
        stopSpeaking: useAppStore.getState().tts.stopSpeaking,
        setVoice: useAppStore.getState().tts.setVoice,
        setAvailableVoices: useAppStore.getState().tts.setAvailableVoices,
        setError: useAppStore.getState().tts.setError,
      },
      settings: {
        practiceType: 'vocabulary',
        practiceMode: null,
        vocabularyBook: 'pte-fib-listening',
        datasetId: 'pte-fib-listening',
        autoPlay: false,
        showPhonetic: true,
        ttsRate: 1.0,
        ttsVoice: null,
        difficultyFilter: 'all',
        isPanelOpen: false,
        updateSetting: useAppStore.getState().settings.updateSetting,
        resetSettings: useAppStore.getState().settings.resetSettings,
        togglePanel: useAppStore.getState().settings.togglePanel,
      },
      progress: {
        completedItems: new Set(),
        currentIndex: 0,
        totalItems: 0,
        accuracy: 0,
        sessionStartTime: null,
        sessionDuration: 0,
        itemsCompleted: 0,
        itemsCorrect: 0,
        markItemCompleted: useAppStore.getState().progress.markItemCompleted,
        updateProgress: useAppStore.getState().progress.updateProgress,
        startSession: useAppStore.getState().progress.startSession,
        endSession: useAppStore.getState().progress.endSession,
        resetProgress: useAppStore.getState().progress.resetProgress,
        calculateAccuracy: useAppStore.getState().progress.calculateAccuracy,
      },
    });
  });

  describe('Audio Slice', () => {
    test('should set playing state', () => {
      const { setPlaying } = useAppStore.getState().audio;
      setPlaying(true);
      expect(useAppStore.getState().audio.isPlaying).toBe(true);
    });

    test('should set auto-play enabled', () => {
      const { setAutoPlay } = useAppStore.getState().audio;
      setAutoPlay(true);
      expect(useAppStore.getState().audio.autoPlayEnabled).toBe(true);
    });

    test('should set playback speed', () => {
      const { setSpeed } = useAppStore.getState().audio;
      setSpeed(1.5);
      expect(useAppStore.getState().audio.playbackSpeed).toBe(1.5);
    });

    test('should set volume', () => {
      const { setVolume } = useAppStore.getState().audio;
      setVolume(0.5);
      expect(useAppStore.getState().audio.volume).toBe(0.5);
    });

    test('should clamp volume between 0 and 1', () => {
      const { setVolume } = useAppStore.getState().audio;

      setVolume(1.5);
      expect(useAppStore.getState().audio.volume).toBe(1);

      setVolume(-0.5);
      expect(useAppStore.getState().audio.volume).toBe(0);
    });
  });

  describe('TTS Slice', () => {
    test('should start speaking and track analytics', () => {
      const { startSpeaking } = useAppStore.getState().tts;

      startSpeaking('hello', '/həˈloʊ/', 'word');

      const state = useAppStore.getState().tts;
      expect(state.isSpeaking).toBe(true);
      expect(state.currentWord).toBe('hello');
      expect(state.currentPhonetic).toBe('/həˈloʊ/');
      expect(state.speakingMode).toBe('word');

      // Check analytics tracking
      expect(window.analyticsService.trackTTSUsed).toHaveBeenCalledWith({
        word: 'hello',
        phonetic: '/həˈloʊ/',
        mode: 'word',
        voice: 'browser-default',
        rate: 1.0,
        tts_engine: 'browser',
      });
    });

    test('should stop speaking', () => {
      const { startSpeaking, stopSpeaking } = useAppStore.getState().tts;

      startSpeaking('hello', '/həˈloʊ/', 'word');
      stopSpeaking();

      const state = useAppStore.getState().tts;
      expect(state.isSpeaking).toBe(false);
      expect(state.currentWord).toBe(null);
      expect(state.currentPhonetic).toBe(null);
      expect(state.speakingMode).toBe(null);
    });

    test('should set voice and track analytics', () => {
      const { setVoice } = useAppStore.getState().tts;

      setVoice('Google US English');

      expect(useAppStore.getState().tts.selectedVoice).toBe('Google US English');
      expect(window.analyticsService.track).toHaveBeenCalledWith(
        'tts_voice_changed',
        { voice: 'Google US English' }
      );
    });
  });

  describe('Settings Slice', () => {
    test('should update setting and track analytics', () => {
      const { updateSetting } = useAppStore.getState().settings;

      updateSetting('autoPlay', true);

      expect(useAppStore.getState().settings.autoPlay).toBe(true);
      expect(window.analyticsService.trackSettingChanged).toHaveBeenCalledWith(
        'autoPlay',
        true
      );
    });

    test('should reset settings', () => {
      const { updateSetting, resetSettings } = useAppStore.getState().settings;

      updateSetting('autoPlay', true);
      updateSetting('ttsRate', 1.5);

      resetSettings();

      const state = useAppStore.getState().settings;
      expect(state.autoPlay).toBe(false);
      expect(state.ttsRate).toBe(1.0);
    });

    test('should toggle panel', () => {
      const { togglePanel } = useAppStore.getState().settings;

      togglePanel();
      expect(useAppStore.getState().settings.isPanelOpen).toBe(true);

      togglePanel();
      expect(useAppStore.getState().settings.isPanelOpen).toBe(false);
    });
  });

  describe('Progress Slice', () => {
    test('should start session', () => {
      const { startSession } = useAppStore.getState().progress;

      startSession();

      const state = useAppStore.getState().progress;
      expect(state.sessionStartTime).not.toBe(null);
      expect(state.itemsCompleted).toBe(0);
      expect(state.itemsCorrect).toBe(0);
      expect(state.completedItems.size).toBe(0);
    });

    test('should mark item completed correctly', () => {
      const { markItemCompleted } = useAppStore.getState().progress;

      markItemCompleted('word1', true);

      const state = useAppStore.getState().progress;
      expect(state.completedItems.has('word1')).toBe(true);
      expect(state.itemsCompleted).toBe(1);
      expect(state.itemsCorrect).toBe(1);
      expect(state.accuracy).toBe(100);
    });

    test('should mark item completed incorrectly', () => {
      const { markItemCompleted } = useAppStore.getState().progress;

      markItemCompleted('word1', false);

      const state = useAppStore.getState().progress;
      expect(state.completedItems.has('word1')).toBe(true);
      expect(state.itemsCompleted).toBe(1);
      expect(state.itemsCorrect).toBe(0);
      expect(state.accuracy).toBe(0);
    });

    test('should calculate accuracy correctly', () => {
      const { markItemCompleted } = useAppStore.getState().progress;

      markItemCompleted('word1', true);
      markItemCompleted('word2', true);
      markItemCompleted('word3', false);

      const state = useAppStore.getState().progress;
      expect(state.accuracy).toBe(66.67); // 2/3 * 100, rounded to 2 decimals
    });

    test('should end session and track analytics', () => {
      const { startSession, markItemCompleted, endSession } = useAppStore.getState().progress;

      // Mock Date.now to simulate time passing
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      startSession();
      markItemCompleted('word1', true);
      markItemCompleted('word2', true);
      markItemCompleted('word3', false);

      // Simulate 5 seconds passing
      currentTime += 5000;

      endSession();

      // Restore Date.now
      Date.now = originalDateNow;

      const state = useAppStore.getState().progress;
      expect(state.sessionStartTime).toBe(null);
      expect(state.sessionDuration).toBeGreaterThan(0);

      // Check analytics tracking
      expect(window.analyticsService.trackPracticeSessionCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'vocabulary',
          dataset_id: 'pte-fib-listening',
          items_completed: 3,
          items_correct: 2,
          accuracy: expect.any(Number),
          duration_seconds: expect.any(Number),
        })
      );
    });

    test('should reset progress', () => {
      const { markItemCompleted, resetProgress } = useAppStore.getState().progress;

      markItemCompleted('word1', true);
      markItemCompleted('word2', false);

      resetProgress();

      const state = useAppStore.getState().progress;
      expect(state.completedItems.size).toBe(0);
      expect(state.itemsCompleted).toBe(0);
      expect(state.itemsCorrect).toBe(0);
      expect(state.accuracy).toBe(0);
    });
  });

  describe('Vocabulary Slice', () => {
    test('should set current item and track analytics', async () => {
      // We need to dynamically import to get the vocabulary slice methods
      const module = await import('../../src/js/stores/index.js');
      const store = module.useAppStore;

      const testWord = {
        word: 'ubiquitous',
        difficulty: 'hard',
        category: 'pte-advanced',
      };

      store.getState().vocabulary.setCurrentItem(testWord);

      expect(store.getState().vocabulary.currentItem).toEqual(testWord);
      expect(window.analyticsService.trackWordPractice).toHaveBeenCalledWith(
        'ubiquitous',
        expect.objectContaining({
          difficulty: 'hard',
          category: 'pte-advanced',
        })
      );
    });
  });
});
