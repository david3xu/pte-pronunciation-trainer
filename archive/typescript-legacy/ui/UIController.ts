/**
 * UIController - Type-safe DOM manipulation and display updates
 * Handles all UI interactions, content display, and event orchestration
 *
 * This is the TypeScript version of src/js/ui/UIController.js
 * Provides type-safe DOM manipulation for both vocabulary and practice modes
 *
 * ARCHITECTURE: Zustand state management
 * - Replaced EventBus with Zustand store subscriptions
 * - Reactive UI updates based on store changes
 * - Direct store actions for user interactions
 */

import type {
  VocabularyTerm,
  PracticeMode,
  PracticeDataset,
  PracticeItem
} from '../../types';
import { useAppStore } from '../stores';

/**
 * UI Controller state
 */
interface UIState {
  currentDatasetIndex: number;
  currentPracticeMode: PracticeMode;
  currentDataset: PracticeDataset | null;
  currentItem: PracticeItem | null;
}

/**
 * Setting control configuration
 */
interface SettingControl {
  elementId: string;
  settingKey: string;
  afterChange?: () => void | Promise<void>;
}

/**
 * Pronunciation types
 */
interface Pronunciations {
  british?: {
    ipa?: string;
    phonetic?: string;
  };
  american?: {
    ipa?: string;
    phonetic?: string;
  };
}

/**
 * Log level type
 */
type LogLevel = 'error' | 'warn' | 'info';

/**
 * Type-safe UI Controller with Zustand integration
 * Manages DOM updates, content display, and user interactions
 */
export class UIController {
  // Configuration
  private config: any;

  // State
  private pronunciationPreference: string;
  private currentWordPronunciations: Pronunciations | null = null;
  private state: UIState;

  // Current word tracking (for pronunciation toggle)
  private currentWord: VocabularyTerm | null = null;
  private currentIndex: number = 0;

  // Store subscriptions (for cleanup)
  private unsubscribers: Array<() => void> = [];

  constructor(config?: any) {
    this.config = config || (window as any).appConfig || null;
    this.pronunciationPreference = this.config.get('modes.pronunciation.british');

    // Initialize local state
    this.state = {
      currentDatasetIndex: 0,
      currentPracticeMode: this.config.get('modes.practice.vocabulary'),
      currentDataset: null,
      currentItem: null
    };

    // Setup Zustand store subscriptions (replaces EventBus listeners)
    this._setupStoreSubscriptions();
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /**
   * Get module instance with error handling
   */
  getModule<T = any>(moduleName: string, required: boolean = false, defaultValue: T | null = null): T | null {
    const module = (window as any)[moduleName];

    if (!module && required) {
      const error = new Error(`Required module '${moduleName}' not found`);
      this.handleError(`Missing required module: ${moduleName}`, error);
      throw error;
    }

    return module || defaultValue;
  }

  /**
   * Centralized error handling (Zustand version)
   */
  handleError(message: string, error?: Error | string, showToUser: boolean = true, level: LogLevel = 'error'): void {
    const details = error instanceof Error ? error.message : error;
    const logMessage = details ? `${message}: ${details}` : message;

    // Log to console
    if (level === 'warn') {
      console.warn(`[UIController] ⚠️ ${logMessage}`);
    } else if (level === 'info') {
      console.info(`[UIController] ℹ️ ${logMessage}`);
    } else {
      console.error(`[UIController] ❌ ${logMessage}`);
    }

    // Show to user via Zustand store (replaces progressTracker.showError)
    if (showToUser) {
      useAppStore.getState().ui.showNotification(message, 'error');
    }
  }

  /**
   * Get current practice mode from Zustand Settings store
   */
  getPracticeMode(): PracticeMode {
    const practiceMode = useAppStore.getState().settings.practiceMode;
    return practiceMode || this.config.get('data.defaults.practiceMode');
  }

  /**
   * Setup Zustand store subscriptions (replaces EventBus listeners)
   */
  private _setupStoreSubscriptions(): void {
    // Subscribe to vocabulary dataset changes (replaces vocabulary:loaded)
    const unsubDataset = useAppStore.subscribe(
      (state) => state.vocabulary.currentDataset,
      (dataset, prevDataset) => {
        if (dataset.length > 0 && dataset !== prevDataset) {
          this.updateUI();
        }
      }
    );
    this.unsubscribers.push(unsubDataset);

    // Subscribe to filtered dataset changes (replaces vocabulary:difficulty:filtered)
    const unsubFiltered = useAppStore.subscribe(
      (state) => state.vocabulary.filteredDataset,
      (filtered, prevFiltered) => {
        if (filtered !== prevFiltered) {
          this.updateBookDisplay();
          this.updateButtons();
        }
      }
    );
    this.unsubscribers.push(unsubFiltered);

    // Subscribe to vocabulary book changes (replaces mode:learning:changed)
    const unsubVocabBook = useAppStore.subscribe(
      (state) => state.settings.vocabularyBook,
      (vocabularyBook, prevVocabBook) => {
        if (vocabularyBook && vocabularyBook !== prevVocabBook) {
          const audioControls = (window as any).audioControls;
          if (audioControls) {
            audioControls.setCurrentIndex(0);
          }
          this.updateBookDisplay();
          this.updateButtons();
          this.displayFirstWord();
        }
      }
    );
    this.unsubscribers.push(unsubVocabBook);

    // Subscribe to practice mode changes (replaces mode:practice:changed)
    const unsubPracticeMode = useAppStore.subscribe(
      (state) => state.settings.practiceMode,
      (practiceMode, prevPracticeMode) => {
        if (practiceMode !== prevPracticeMode) {
          const mode = practiceMode || this.config.get('modes.practice.vocabulary');
          console.log(`[UIController] 🔄 Practice mode changed - Switching to: ${mode}`);

          // Prevent excessive event handling during initialization
          if ((window as any).initializing) {
            console.log(`[UIController] Skipping mode change during initialization`);
            return;
          }

          this.handlePracticeModeChange(mode);
        }
      }
    );
    this.unsubscribers.push(unsubPracticeMode);

    // Subscribe to current item changes (replaces content:display + tts:speaking:started)
    const unsubCurrentItem = useAppStore.subscribe(
      (state) => state.vocabulary.currentItem,
      (currentItem, prevCurrentItem) => {
        if (currentItem && currentItem !== prevCurrentItem) {
          // Display the current item (handles both vocabulary words and practice items)
          this.displayCurrent({ word: currentItem, item: currentItem });
        }
      }
    );
    this.unsubscribers.push(unsubCurrentItem);

    console.log('[UIController] Zustand store subscriptions setup complete');
  }

  /**
   * Bind event listeners to DOM elements (Zustand version)
   */
  bindEventListeners(): void {
    // Bind all settings controls
    this.bindSettingControls();

    // Control buttons - use Zustand store actions instead of EventBus
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        // Trigger audio auto-play via Zustand store
        useAppStore.getState().audio.startAutoPlay();
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        // Pause audio via Zustand store
        useAppStore.getState().audio.pauseAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const practiceMode = useAppStore.getState().settings.practiceMode;
        // Navigate to next item via AudioControls
        // Note: practiceMode === null means vocabulary mode
        const audioControls = (window as any).audioControls;
        if (audioControls) {
          if (practiceMode !== null) {
            // Practice mode (RS/ASQ/WFD)
            audioControls.nextItem();
          } else {
            // Vocabulary mode
            audioControls.nextWord();
          }
        }
        useAppStore.getState().audio.navigateNext();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const practiceMode = useAppStore.getState().settings.practiceMode;
        // Navigate to previous item via AudioControls
        const audioControls = (window as any).audioControls;
        if (audioControls) {
          if (practiceMode !== null) {
            // Practice mode (RS/ASQ/WFD)
            audioControls.prevItem();
          } else {
            // Vocabulary mode
            audioControls.previousWord();
          }
        }
        useAppStore.getState().audio.navigatePrev();
      });
    }

    // Pronunciation toggle button
    const pronunciationToggleBtn = document.getElementById('pronunciationToggleBtn');
    if (pronunciationToggleBtn) {
      pronunciationToggleBtn.addEventListener('click', () => {
        const newPreference = this.togglePronunciation();
        const britishFlag = this.config.get('ui.elements.pronunciationToggle.british');
        const americanFlag = this.config.get('ui.elements.pronunciationToggle.american');
        const british = this.config.get('modes.pronunciation.british');

        pronunciationToggleBtn.textContent = newPreference === british ? britishFlag : americanFlag;
        pronunciationToggleBtn.title = `Current: ${newPreference === british ? 'British' : 'American'} pronunciation`;
      });
    }

    // Initialize dropdowns
    this.initializeDropdowns();
    this.updateBookDisplay();
  }

  /**
   * Unified display orchestrator
   */
  displayCurrent(data: any = {}, mode: PracticeMode | null = null): void {
    const currentMode = mode || this.getPracticeMode();

    // Use Config.js mapping to determine mode type
    const modeMapping = this.config.get('data.practiceModeMapping');
    const mapping = modeMapping && modeMapping[currentMode];
    const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');

    console.log(`[UIController] displayCurrent - Mode: ${currentMode}, isVocabularyMode: ${isVocabularyMode}`);

    if (isVocabularyMode) {
      // Vocabulary mode - use displayWord()
      const word = data.word || data.item;
      const index = data.index !== undefined ? data.index : ((window as any).audioControls?.getCurrentIndex() || 0);

      const pteVocabularyManager = (window as any).pteVocabularyManager;
      if (!word && pteVocabularyManager) {
        console.log('[UIController] No word in event data, using current index from vocabulary manager');
        const currentIndex = (window as any).audioControls?.getCurrentIndex() || 0;
        const currentWord = pteVocabularyManager.getCurrentWord(currentIndex);
        if (currentWord) {
          this.displayWord(currentWord, currentIndex);
          return;
        }
      }

      this.displayWord(word, index);
    } else {
      // Practice modes (RS/ASQ/WFD) - use displayContent()
      let item = data.item || data.word;

      if (!item && (window as any).currentItem) {
        console.log('[UIController] No item in event data, using window.currentItem');
        item = (window as any).currentItem;
      }

      if (item) {
        this.displayContent(item, currentMode);
      } else {
        console.warn(`[UIController] No valid item to display for mode: ${currentMode}`);
      }
    }
  }

  /**
   * Bind all setting controls using generic event-driven pattern
   */
  bindSettingControls(): void {
    const settingControls: SettingControl[] = [
      { elementId: 'practiceModeSelect', settingKey: 'practiceMode' },
      { elementId: 'learningModeSelect', settingKey: 'learningMode', afterChange: () => this.updateBookDisplay() },
      { elementId: 'practiceDatasetSelect', settingKey: 'practiceDataset', afterChange: () => this.handlePracticeDatasetChange() },
      { elementId: 'difficultySelect', settingKey: 'difficulty', afterChange: () => this.updateBookDisplay() },
      { elementId: 'speedSelect', settingKey: 'speed' },
      { elementId: 'delaySelect', settingKey: 'delay' },
      { elementId: 'repeatSelect', settingKey: 'repeat' },
      { elementId: 'voiceSelect', settingKey: 'voice' }
    ];

    settingControls.forEach(({ elementId, settingKey, afterChange }) => {
      const element = document.getElementById(elementId) as HTMLSelectElement;
      if (element) {
        element.addEventListener('change', async (e: Event) => {
          const target = e.target as HTMLSelectElement;

          // Update settings via Zustand store (replaces EventBus emission)
          useAppStore.getState().settings.updateSetting(settingKey as any, target.value);

          // Call afterChange callback if provided
          if (afterChange) {
            await new Promise(resolve => setTimeout(resolve, 50));
            afterChange();
          }
        });
      }
    });

    console.log('✅ UIController: Bound', settingControls.length, 'setting controls using Zustand store');
  }

  /**
   * Initialize dropdowns based on current configuration
   */
  initializeDropdowns(): void {
    const settingsModule = (window as any).settingsModule;
    if (settingsModule) {
      this.populateAllDropdownsFromSettingsModule();
    } else {
      console.warn('⚠️ SettingsModule not available - dropdowns may not work properly');
    }
  }

  /**
   * Populate all dropdowns using SettingsModule
   */
  populateAllDropdownsFromSettingsModule(): void {
    const settingsModule = (window as any).settingsModule;
    if (!settingsModule) return;

    // Practice mode dropdown
    this.populateDropdown('practiceModeSelect', 'practiceMode', this.config.get('data.defaults.practiceMode'));

    // Vocabulary book dropdown
    this.populateDropdown('learningModeSelect', 'learningMode', this.config.get('data.defaults.learningMode'));

    // Practice dataset dropdown
    this.populateDropdown('practiceDatasetSelect', 'practiceDataset', this.config.get('data.defaults.practiceDataset'));

    // Difficulty dropdown
    this.populateDropdown('difficultySelect', 'difficulty', this.config.get('data.defaults.difficulty'));

    // Audio dropdowns
    this.populateDropdown('speedSelect', 'speed', String(this.config.get('data.defaults.speed')));
    const defaultDelay = this.config.get('tts.delays.long');
    this.populateDropdown('delaySelect', 'delay', String(defaultDelay));
    this.populateDropdown('repeatSelect', 'repeat', this.config.get('data.defaults.repeat'));

    // Voice dropdown is populated separately by VoiceSelector
    const voiceSelector = (window as any).voiceSelector;
    if (voiceSelector) {
      voiceSelector.populateVoiceOptions();
    }
  }

  /**
   * Generic dropdown population method
   */
  populateDropdown(elementId: string, settingKey: string, defaultValue: string, filterType: string | null = null): void {
    const element = document.getElementById(elementId) as HTMLSelectElement;
    if (!element) return;

    const settingsModule = (window as any).settingsModule;
    if (!settingsModule || typeof settingsModule.getAvailableOptions !== 'function') {
      console.warn(`[UIController] SettingsModule not available or getAvailableOptions not found`);
      return;
    }

    const options = settingsModule.getAvailableOptions(settingKey, filterType);

    element.innerHTML = '';
    options.forEach((option: { id: string; label: string }) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.id;
      optionElement.textContent = option.label;
      if (option.id === defaultValue) optionElement.selected = true;
      element.appendChild(optionElement);
    });
  }

  /**
   * Update book display with current mode and word count
   */
  updateBookDisplay(): void {
    const bookDisplay = document.getElementById('bookDisplay');
    const pteVocabularyManager = (window as any).pteVocabularyManager;

    if (!pteVocabularyManager) return;

    const currentWords = pteVocabularyManager.getCurrentWords();
    const totalWords = pteVocabularyManager.getAllWords().length;
    const defaultLearningMode = this.config.get('data.defaults.learningMode') || 'pte-fib-listening';
    const currentMode = pteVocabularyManager.currentLearningMode || defaultLearningMode;

    // Get learning mode labels from Config.js
    const learningModes = this.config.get('data.learningModes') || [];
    const modeLabels: Record<string, string> = {};
    learningModes.forEach((mode: any) => {
      modeLabels[mode.id] = mode.label;
    });

    // Update display
    if (bookDisplay) {
      const modeName = modeLabels[currentMode] || currentMode;
      let displayText = `${modeName} (${currentWords.length}/${totalWords})`;

      // Add difficulty indicator if filtered
      const defaultDifficulty = this.config.get('data.defaults.difficulty') || 'all';
      if (pteVocabularyManager.getCurrentDifficulty() !== defaultDifficulty) {
        const emoji: Record<string, string> = {
          easy: '🟢',
          normal: '🟡',
          hard: '🔴'
        };
        displayText += ` ${emoji[pteVocabularyManager.getCurrentDifficulty()] || ''}`;
      }

      bookDisplay.textContent = displayText;
    }
  }

  /**
   * Display a vocabulary word
   */
  displayWord(word: VocabularyTerm | null, index: number): void {
    // Safety check
    if (!word || !(word as any).english) {
      console.error('[UIController] ❌ Invalid word object received:', word);

      const currentMode = this.getPracticeMode();
      const modeMapping = this.config.get('data.practiceModeMapping');
      const mapping = modeMapping && modeMapping[currentMode];
      const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');

      if (!isVocabularyMode && (window as any).currentItem) {
        console.log('[UIController] In practice mode, ignoring invalid word object');
        return;
      }

      // Show error in vocabulary mode
      const phoneticElement = document.getElementById('phoneticSpelling');
      const englishElement = document.getElementById('englishWord');
      const chineseElement = document.getElementById('chineseTranslation');

      if (phoneticElement) phoneticElement.textContent = 'Error: No Data';
      if (englishElement) englishElement.textContent = 'Please refresh the page';
      if (chineseElement) chineseElement.textContent = '';
      return;
    }

    // Extract pronunciation data
    let phoneticPlain = '';
    let ipaOnly = '';

    const wordAny = word as any;

    // Standard PTE format: pronunciation.british / pronunciation.american
    if (wordAny.pronunciation?.british && wordAny.pronunciation?.american) {
      const useAmerican = this.getPronunciationPreference() === 'american';
      const selected = useAmerican ? wordAny.pronunciation.american : wordAny.pronunciation.british;

      phoneticPlain = selected.phonetic || '';
      ipaOnly = selected.ipa ? `/${selected.ipa}/` : '';

      this.currentWordPronunciations = {
        british: wordAny.pronunciation.british,
        american: wordAny.pronunciation.american
      };
    }
    // Fallback: pronunciation.british only
    else if (wordAny.pronunciation?.british) {
      phoneticPlain = wordAny.pronunciation.british.phonetic || '';
      ipaOnly = wordAny.pronunciation.british.ipa ? `/${wordAny.pronunciation.british.ipa}/` : '';
      this.currentWordPronunciations = { british: wordAny.pronunciation.british };
    }
    // Single IPA format
    else if (wordAny.pronunciation?.ipa) {
      phoneticPlain = wordAny.pronunciation.phonetic || '';
      ipaOnly = wordAny.pronunciation.ipa ? `/${wordAny.pronunciation.ipa}/` : '';
      this.currentWordPronunciations = null;
    }
    // Legacy fallback
    else {
      console.warn('Word missing standard pronunciation data:', wordAny.english);
    }

    // Update phonetic (top)
    const phoneticElement = document.getElementById('phoneticSpelling');
    if (phoneticElement) {
      if (phoneticPlain) {
        phoneticElement.textContent = phoneticPlain;
        phoneticElement.style.display = 'block';
      } else {
        phoneticElement.style.display = 'none';
      }
      phoneticElement.classList.add('word-change');
      setTimeout(() => phoneticElement.classList.remove('word-change'), 500);
    }

    // Update English word (middle)
    const englishElement = document.getElementById('englishWord');
    if (englishElement) {
      let displayText = wordAny.english;
      if (wordAny.source === 'vocabulary-clean' && wordAny.english.includes('/')) {
        displayText = wordAny.english.split('/')[0].trim();
      }

      englishElement.textContent = displayText;

      // Add word-length based sizing
      const wordLength = displayText.length;
      englishElement.classList.remove('word-short', 'word-medium', 'word-long');
      if (wordLength > 12) {
        englishElement.classList.add('word-long');
      } else if (wordLength > 7) {
        englishElement.classList.add('word-medium');
      } else {
        englishElement.classList.add('word-short');
      }

      englishElement.classList.add('word-change');
      setTimeout(() => englishElement.classList.remove('word-change'), 500);
    }

    // Update word type badge (vocabulary mode only)
    const wordTypeBadge = document.getElementById('wordTypeBadge');
    const currentMode = this.getPracticeMode();

    if (wordTypeBadge) {
      const modeMapping = this.config.get('data.practiceModeMapping');
      const mapping = modeMapping && modeMapping[currentMode];
      const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');

      if (isVocabularyMode && wordAny.wordType) {
        wordTypeBadge.textContent = `[${wordAny.wordType}]`;
        wordTypeBadge.style.display = 'inline-block';
        wordTypeBadge.classList.add('word-change');
        setTimeout(() => wordTypeBadge.classList.remove('word-change'), 500);
      } else {
        wordTypeBadge.style.display = 'none';
      }
    }

    // Update IPA (bottom)
    const ipaElement = document.getElementById('ipaNotation');
    if (ipaElement) {
      if (ipaOnly) {
        ipaElement.textContent = ipaOnly;
        ipaElement.style.display = 'block';
      } else {
        ipaElement.style.display = 'none';
      }
      ipaElement.classList.add('word-change');
      setTimeout(() => ipaElement.classList.remove('word-change'), 500);
    }

    // Hide old combined pronunciation
    const pronunciationElement = document.getElementById('pronunciationText');
    if (pronunciationElement) {
      pronunciationElement.style.display = 'none';
    }

    // Update example sentence
    const exampleElement = document.getElementById('exampleSentence');

    // Special handling for definitions
    if (exampleElement && wordAny.definition) {
      if (wordAny.definition && wordAny.definition.trim()) {
        const displayContent = `<div class="example-english definition"><strong>Definition:</strong> ${wordAny.definition}</div>`;
        exampleElement.innerHTML = displayContent;
        exampleElement.style.display = 'block';
        exampleElement.classList.add('word-change');
        setTimeout(() => exampleElement.classList.remove('word-change'), 500);
      } else {
        exampleElement.style.display = 'none';
      }
    }
    // Standard example sentence
    else if (exampleElement && wordAny.example) {
      const cleanExample = this.cleanExampleSentence(wordAny.example);
      const displayContent = `<div class="example-english">${cleanExample}</div>`;

      exampleElement.innerHTML = displayContent;
      exampleElement.style.display = 'block';
      exampleElement.classList.add('word-change');
      setTimeout(() => exampleElement.classList.remove('word-change'), 500);
    } else if (exampleElement) {
      exampleElement.style.display = 'none';
    }

    // Update progress display
    const pteVocabularyManager = (window as any).pteVocabularyManager;
    const progressTracker = (window as any).progressTracker;
    const totalWords = pteVocabularyManager.getTotalWordCount();
    progressTracker.updateProgress(index, totalWords, word);
  }

  /**
   * Display first word when vocabulary source changes
   */
  displayFirstWord(): void {
    const pteVocabularyManager = (window as any).pteVocabularyManager;
    const firstWord = pteVocabularyManager.getCurrentWord(0);
    if (firstWord) {
      this.displayWord(firstWord, 0);
    }
  }

  /**
   * Clean example sentence by removing speaker prefixes and metadata
   */
  cleanExampleSentence(rawSentence: string): string {
    let cleaned = rawSentence
      .replace(/^[A-Z][a-z]*\s*[：:]\s*/g, '')
      .replace(/^\d+\.\s*/g, '')
      .replace(/（[^）]*）/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\\n!\[Image\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const pteVocabularyManager = (window as any).pteVocabularyManager;
    const currentWords = pteVocabularyManager?.getCurrentWords();
    const currentWord = currentWords?.[pteVocabularyManager?.currentIndex]?.english;
    const maxLength = this.config.get('ui.text.maxLength');

    if (cleaned.length > maxLength) {
      const sentences = cleaned.split(/[.!?]+/);

      if (sentences.length > 1) {
        let selectedSentence = sentences[0];
        let bestSentence = null;
        let shortestLength = Infinity;

        if (currentWord) {
          for (let i = 0; i < sentences.length; i++) {
            const sentenceRaw = sentences[i];
            if (!sentenceRaw) continue;
            const sentence = sentenceRaw.trim();
            if (sentence.toLowerCase().includes(currentWord.toLowerCase())) {
              if (sentence.length < shortestLength) {
                bestSentence = sentence;
                shortestLength = sentence.length;
              }
            }
          }

          if (bestSentence) {
            selectedSentence = bestSentence;
          }
        }

        if (selectedSentence) {
          selectedSentence = selectedSentence.trim();
          if (selectedSentence.length > 15) {
            if (!/[.!?]$/.test(selectedSentence)) {
              cleaned = selectedSentence + '.';
            } else {
              cleaned = selectedSentence;
            }
          } else {
            cleaned = (sentences[0] + '. ' + sentences[1]).trim() + '.';
          }
        }
      } else {
        cleaned = cleaned.substring(0, 80).replace(/\s+\w+$/, '') + '...';
      }
    }

    return cleaned;
  }

  /**
   * Update UI with current vocabulary
   */
  updateUI(): void {
    const audioControls = (window as any).audioControls;
    const pteVocabularyManager = (window as any).pteVocabularyManager;
    const progressTracker = (window as any).progressTracker;

    const currentIndex = audioControls.getCurrentIndex();
    const currentWord = pteVocabularyManager.getCurrentWord(currentIndex);

    if (currentWord) {
      this.displayWord(currentWord, currentIndex);
    } else if (pteVocabularyManager.getTotalWordCount() === 0) {
      progressTracker.updateStatus('No words available');
    }

    this.updateBookDisplay();
    audioControls.showPausedUI();
    this.updateButtons();
  }

  /**
   * Sync repeat mode from HTML (kept for backward compatibility)
   */
  syncRepeatModeFromHTML(): void {
    console.log('[UIController] syncRepeatModeFromHTML: Using event-driven settings (no-op)');
  }

  /**
   * Update button states
   */
  updateButtons(): void {
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextBtn') as HTMLButtonElement;
    const prevBtn = document.getElementById('prevBtn') as HTMLButtonElement;

    const pteVocabularyManager = (window as any).pteVocabularyManager;
    const hasVocabulary = pteVocabularyManager.getTotalWordCount() > 0;

    const enabledOpacity = this.config.get('ui.opacity.enabled');
    const disabledOpacity = this.config.get('ui.opacity.disabled');

    if (nextBtn) {
      nextBtn.style.display = 'inline-block';
      nextBtn.disabled = !hasVocabulary;
      nextBtn.style.opacity = hasVocabulary ? enabledOpacity : disabledOpacity;
    }

    if (prevBtn) {
      prevBtn.style.display = 'inline-block';
      prevBtn.disabled = !hasVocabulary;
      prevBtn.style.opacity = hasVocabulary ? enabledOpacity : disabledOpacity;
    }

    const audioControls = (window as any).audioControls;
    if (audioControls.isPlaying && hasVocabulary) {
      if (startBtn) startBtn.style.display = 'none';
      if (pauseBtn) pauseBtn.style.display = 'inline-block';
    } else {
      if (startBtn) startBtn.style.display = 'inline-block';
      if (pauseBtn) pauseBtn.style.display = 'none';

      if (startBtn) {
        startBtn.disabled = !hasVocabulary;
        startBtn.style.opacity = hasVocabulary ? enabledOpacity : disabledOpacity;
        startBtn.textContent = hasVocabulary ? '▶️ PLAY' : '❌ NO DATA';
        startBtn.title = hasVocabulary ? 'Play vocabulary' : 'No vocabulary loaded';
      }
    }

    // Keep navigation buttons enabled when vocabulary is loaded
    if (hasVocabulary) {
      if (prevBtn) {
        prevBtn.disabled = false;
        prevBtn.style.opacity = enabledOpacity;
      }
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = enabledOpacity;
      }
    }
  }

  /**
   * Show loading state
   */
  showLoadingState(): void {
    const progressTracker = (window as any).progressTracker;
    progressTracker.updateStatus('Loading...');
  }

  /**
   * Hide loading state
   */
  hideLoadingState(): void {
    const progressTracker = (window as any).progressTracker;
    progressTracker.updateStatus('Ready');
  }

  /**
   * Get pronunciation preference
   */
  getPronunciationPreference(): string {
    return this.pronunciationPreference || this.config.get('modes.pronunciation.british');
  }

  /**
   * Set pronunciation preference
   */
  setPronunciationPreference(preference: string): void {
    this.pronunciationPreference = preference;
    if (this.currentWordPronunciations && this.currentWord) {
      this.displayWord(this.currentWord, this.currentIndex);
    }
  }

  /**
   * Toggle between British and American pronunciation
   */
  togglePronunciation(): string {
    const current = this.getPronunciationPreference();
    const british = this.config.get('modes.pronunciation.british');
    const american = this.config.get('modes.pronunciation.american');
    const newPreference = current === british ? american : british;
    this.setPronunciationPreference(newPreference);
    return newPreference;
  }

  /**
   * Handle settings changes
   */
  handleSettingsChange(key: string, _value: any): void {
    switch (key) {
      case 'category':
      case 'difficulty':
      case 'learningMode':
        this.updateBookDisplay();
        break;
      case 'speed':
      case 'delay':
      case 'repeat':
      case 'voice':
        // Handled by respective modules
        break;
    }
  }

  /**
   * Handle practice mode changes
   */
  async handlePracticeModeChange(mode: PracticeMode): Promise<boolean> {
    if (!mode) {
      this.handleError('Invalid practice mode', 'No mode provided to handlePracticeModeChange', true);
      return false;
    }

    const progressTracker = (window as any).progressTracker;
    progressTracker?.updateStatus(`Changing to ${mode.toUpperCase()} mode...`);

    (window as any).currentPracticeMode = mode;

    const modeMapping = this.config.get('data.practiceModeMapping');

    if (!modeMapping || Object.keys(modeMapping).length === 0) {
      this.handleError(
        'Mode configuration not loaded',
        'Mode mappings not yet available, this is expected during initialization',
        false,
        'warn'
      );
      return false;
    }

    const mapping = modeMapping[mode];

    if (!mapping) {
      this.handleError(
        `Invalid practice mode: ${mode}`,
        `No mapping found for mode ${mode} in config.data.practiceModeMapping`,
        true
      );
      return false;
    }

    const isVocabularyMode = mapping.type === this.config.get('modes.practice.vocabulary');

    let success = false;

    // Ensure dataset settings are synchronized
    if (!isVocabularyMode) {
      const settingsModule = (window as any).settingsModule;
      if (settingsModule) {
        const practiceDataset = settingsModule.get('practiceDataset');
        if (!practiceDataset && mapping.defaultPracticeDataset) {
          try {
            await settingsModule.updateSetting('practiceDataset', mapping.defaultPracticeDataset);
            console.log(`[UIController] ✅ Set practiceDataset to ${mapping.defaultPracticeDataset}`);
          } catch (error: any) {
            console.error(`[UIController] ❌ Failed to set practiceDataset: ${error.message}`);
          }
        }
      }
    }

    if (isVocabularyMode) {
      console.log('[UIController] Switching to vocabulary mode...');
      this.updateBookDisplay();
      this.displayFirstWord();
      success = true;
    } else {
      console.log(`[UIController] Switching to practice mode: ${mode}...`);

      const datasetLoaded = await this.loadPracticeDataset(mode);

      if (datasetLoaded) {
        const bookDisplay = document.getElementById('bookDisplay');
        if (bookDisplay) {
          const modeLabels: Record<string, string> = {};
          const practiceModes = this.config.get('data.practiceModes') || [];
          practiceModes.forEach((modeObj: any) => {
            modeLabels[modeObj.id] = modeObj.label;
          });

          bookDisplay.textContent = modeLabels[mode] || mode.toUpperCase();
          console.log(`[UIController] Updated book display to: ${modeLabels[mode]}`);
        }

        success = true;
      } else {
        console.error(`[UIController] ❌ Failed to load dataset for mode: ${mode}`);
        progressTracker?.showError(`Failed to load dataset for ${mode} mode`);
        success = false;
      }
    }

    return success;
  }

  /**
   * Handle practice dataset change
   */
  async handlePracticeDatasetChange(): Promise<void> {
    const settingsModule = (window as any).settingsModule;
    const currentMode = (window as any).currentPracticeMode || settingsModule?.get('practiceMode');

    if (!currentMode) {
      console.warn('[UIController] ⚠️ No practice mode set, cannot reload dataset');
      return;
    }

    const modeMapping = this.config.get('data.practiceModeMapping');
    const mapping = modeMapping?.[currentMode];
    const isVocabularyMode = mapping?.type === this.config.get('modes.practice.vocabulary');

    if (isVocabularyMode) {
      console.log('[UIController] In vocabulary mode, ignoring dataset change');
      return;
    }

    const newDatasetId = settingsModule?.get('practiceDataset');
    console.log(`[UIController] 🔄 Practice dataset changed to: ${newDatasetId}, reloading ${currentMode} mode...`);

    const datasetManager = (window as any).datasetManager;
    if (datasetManager && newDatasetId) {
      console.log(`[UIController] 🗑️ Clearing cache for fresh reload...`);
      datasetManager.clearCache(newDatasetId);
    }

    await this.loadPracticeDataset(currentMode);
  }

  /**
   * Load dataset for practice mode
   */
  async loadPracticeDataset(mode: PracticeMode): Promise<boolean> {
    console.log(`[UIController] 📥 loadPracticeDataset() called with mode: ${mode}`);

    // Enhanced error handling for DatasetManager
    let datasetManager = (window as any).datasetManager;

    if (!datasetManager) {
      console.error('❌ DatasetManager not available');

      if (typeof (window as any).DatasetManager === 'function') {
        console.log('🔄 Creating new DatasetManager instance...');
        try {
          const DatasetManagerClass = (window as any).DatasetManager;
          datasetManager = new DatasetManagerClass();
          const config = (window as any).appConfig || { get: () => undefined };
          await datasetManager.initialize(config);

          (window as any).datasetManager = datasetManager;
          console.log('✅ Successfully created DatasetManager instance');
        } catch (error) {
          console.error('❌ Failed to create DatasetManager instance:', error);
          (window as any).progressTracker?.showError('Practice dataset feature not available');
          return false;
        }
      } else {
        (window as any).progressTracker?.showError('Practice dataset feature not available');
        return false;
      }
    }

    if (!mode) {
      console.error('❌ No practice mode provided to loadPracticeDataset()');
      return false;
    }

    try {
      const progressTracker = this.getModule('progressTracker');
      progressTracker?.updateStatus(`Loading ${mode.toUpperCase()} dataset...`);

      // Get dataset ID
      let datasetId: string | null = null;

      const settingsModule = this.getModule('settingsModule');
      if (settingsModule && typeof settingsModule.get === 'function') {
        datasetId = settingsModule.get('practiceDataset');
        console.log(`[UIController] 📝 Got practiceDataset from settings: ${datasetId}`);
      }

      if (!datasetId) {
        const modeMapping = this.config.get('data.practiceModeMapping');
        const mapping = modeMapping && modeMapping[mode];
        if (mapping && mapping.defaultPracticeDataset) {
          datasetId = mapping.defaultPracticeDataset;

          if (settingsModule && typeof settingsModule.updateSetting === 'function') {
            try {
              await settingsModule.updateSetting('practiceDataset', datasetId);
            } catch (err) {
              this.handleError('Failed to update settings', err as Error, false, 'warn');
            }
          }
        }
      }

      if (!datasetId) {
        this.handleError(
          `Could not determine dataset ID for mode: ${mode}`,
          `No datasetId available in settings or config mapping. Please check Config.js data.practiceModeMapping`,
          true
        );
        return false;
      }

      // Load dataset with retry
      let dataset: any = null;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          dataset = await datasetManager.loadDataset(datasetId);
          break;
        } catch (loadError) {
          retryCount++;
          if (retryCount <= maxRetries) {
            const retryDelay = this.config.get('ui.delays.retry') || 500;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            throw loadError;
          }
        }
      }

      if (!dataset) {
        throw new Error(`Dataset ${datasetId} could not be loaded after ${maxRetries} retries`);
      }

      if (!dataset.items || !Array.isArray(dataset.items) || dataset.items.length === 0) {
        throw new Error(`Dataset ${datasetId} is empty or has invalid structure`);
      }

      // Store in local state
      this.state.currentDataset = dataset;
      this.state.currentDatasetIndex = 0;
      this.state.currentItem = dataset.items[0];

      // Update global references for backward compatibility
      (window as any).currentDataset = dataset;
      // Update Zustand store instead of window globals
      useAppStore.getState().vocabulary.setDataset(dataset.items, mode);
      useAppStore.getState().vocabulary.setCurrentItem(dataset.items[0]);
      useAppStore.getState().audio.setCurrentIndex(0);

      // Display first item
      this.displayContent(dataset.items[0], mode);

      // Update progress
      (window as any).progressTracker?.updateStatus(`${mode.toUpperCase()} Mode - ${dataset.items.length} items loaded`);

      return true;
    } catch (error: any) {
      let errorDetails = error.message || 'Unknown error';
      let userMessage = `Failed to load dataset for ${mode}`;

      const settingsModule = this.getModule('settingsModule');
      const datasetId = settingsModule?.get('practiceDataset') || mode;

      if (errorDetails.includes('fetch') || errorDetails.includes('HTTP')) {
        let diagnosticInfo = '';
        if (error.details) {
          diagnosticInfo = `\nDiagnostic details: ${JSON.stringify(error.details, null, 2)}`;
        }

        errorDetails = `Network error: ${errorDetails}. Dataset ID: ${datasetId}${diagnosticInfo}`;
        userMessage = `Dataset file not found for ${mode} mode. Please check the data directory.`;
      } else if (errorDetails.includes('Dataset type not found')) {
        errorDetails = `Dataset type error: ${errorDetails}. Dataset ID: ${datasetId}`;
        userMessage = `Invalid dataset type for ${mode} mode. Configuration issue detected.`;
      } else if (errorDetails.includes('invalid structure') || errorDetails.includes('empty')) {
        errorDetails = `Dataset validation error: ${errorDetails}. Dataset ID: ${datasetId}`;
        userMessage = `The ${mode} dataset has an invalid structure or is empty.`;
      }

      this.handleError(userMessage, errorDetails, true, 'error');

      // Clear partial state
      this.state.currentDataset = null;
      this.state.currentDatasetIndex = 0;
      this.state.currentItem = null;

      (window as any).currentDataset = null;
      (window as any).currentDatasetIndex = 0;
      (window as any).currentItem = null;

      return false;
    }
  }

  /**
   * Unified display method for all modes
   */
  displayContent(item: PracticeItem | null, mode: PracticeMode): void {
    // Enhanced null checking
    if (!item) {
      item = {} as any;
    }

    // Get DOM elements
    const phoneticSpelling = document.getElementById('phoneticSpelling');
    const englishWord = document.getElementById('englishWord');
    const ipaNotation = document.getElementById('ipaNotation');
    const pronunciationText = document.getElementById('pronunciationText');
    const exampleSentence = document.getElementById('exampleSentence');
    const progressText = document.getElementById('progressText');
    const difficultyBadge = document.getElementById('difficultyBadge');
    const wordTypeBadge = document.getElementById('wordTypeBadge');

    // Clear content elements
    [phoneticSpelling, englishWord, ipaNotation, pronunciationText, exampleSentence].forEach(el => {
      if (el) el.textContent = '';
    });

    // Hide word type badge for practice modes
    const modeMapping = this.config.get('data.practiceModeMapping');
    const mapping = modeMapping && modeMapping[mode];
    const isVocabularyMode = mapping && mapping.type === this.config.get('modes.practice.vocabulary');

    if (wordTypeBadge && !isVocabularyMode) {
      wordTypeBadge.style.display = 'none';
    }

    const itemAny = item as any;

    // Display based on mode
    if (mode === this.config.get('modes.practice.vocabulary')) {
      // Vocabulary mode
      if (itemAny.content) {
        if (englishWord) englishWord.textContent = itemAny.content.word || '';
        if (phoneticSpelling) {
          phoneticSpelling.textContent = itemAny.content.phoneticSpelling || '';
          phoneticSpelling.style.display = itemAny.content.phoneticSpelling ? '' : 'none';
        }
        if (ipaNotation) {
          ipaNotation.textContent = itemAny.content.ipa || '';
          ipaNotation.style.display = itemAny.content.ipa ? '' : 'none';
        }
        if (pronunciationText) {
          pronunciationText.textContent = itemAny.content.pronunciation || '';
          pronunciationText.style.display = itemAny.content.pronunciation ? '' : 'none';
        }
        if (exampleSentence) {
          exampleSentence.textContent = itemAny.content.example || '';
          exampleSentence.style.display = itemAny.content.example ? '' : 'none';
        }
      }
    } else if (mode === this.config.get('modes.practice.repeatSentence')) {
      // Repeat Sentence
      if (itemAny.content && englishWord) {
        englishWord.textContent = itemAny.content.sentence || '';
      }
      if (phoneticSpelling) phoneticSpelling.style.display = 'none';
      if (ipaNotation) ipaNotation.style.display = 'none';
      if (pronunciationText) pronunciationText.style.display = 'none';
      if (exampleSentence && itemAny.content?.translation) {
        exampleSentence.textContent = itemAny.content.translation;
        exampleSentence.style.display = '';
      } else if (exampleSentence) {
        exampleSentence.style.display = 'none';
      }
    } else if (mode === this.config.get('modes.practice.answerShortQuestion')) {
      // Answer Short Question
      if (itemAny.content && englishWord) {
        englishWord.textContent = itemAny.content?.question || '';
      }
      if (phoneticSpelling) phoneticSpelling.style.display = 'none';
      if (ipaNotation) ipaNotation.style.display = 'none';
      if (pronunciationText) pronunciationText.style.display = 'none';
      if (exampleSentence && itemAny.content?.answer) {
        exampleSentence.innerHTML = `<div class="example-english"><strong>Answer:</strong> ${itemAny.content.answer}</div>`;
        exampleSentence.style.display = '';
      } else if (exampleSentence) {
        exampleSentence.style.display = 'none';
      }
    } else if (mode === this.config.get('modes.practice.writeFromDictation')) {
      // Write From Dictation
      if (itemAny.content && englishWord) {
        englishWord.textContent = itemAny.content?.sentence || '';
      }
      if (phoneticSpelling) phoneticSpelling.style.display = 'none';
      if (ipaNotation) ipaNotation.style.display = 'none';
      if (pronunciationText) pronunciationText.style.display = 'none';
      if (exampleSentence && itemAny.content?.translation) {
        exampleSentence.textContent = itemAny.content.translation;
        exampleSentence.style.display = '';
      } else if (exampleSentence) {
        exampleSentence.style.display = 'none';
      }
    }

    // Show difficulty badge
    if (difficultyBadge && itemAny.metadata?.difficulty) {
      difficultyBadge.textContent = `${this.getDifficultyEmoji(itemAny.metadata.difficulty)} ${itemAny.metadata.difficulty}`;
      difficultyBadge.style.display = '';
    } else if (difficultyBadge) {
      difficultyBadge.style.display = 'none';
    }

    // Update progress text
    const currentDataset = (window as any).currentDataset;
    if (progressText && currentDataset) {
      const current = ((window as any).currentDatasetIndex || 0) + 1;
      const total = currentDataset.items.length;
      progressText.textContent = `${current} / ${total}`;
    }

    // Store current item globally
    (window as any).currentItem = item;
  }

  /**
   * Get emoji for difficulty level
   */
  getDifficultyEmoji(difficulty: string): string {
    const emojiMap: Record<string, string> = {
      'easy': '🟢',
      'medium': '🟡',
      'hard': '🔴'
    };
    return emojiMap[difficulty.toLowerCase()] || '⚪';
  }
}

// Export singleton instance
export const uiController = new UIController();

// Default export
export default uiController;

/**
 * Global type declarations
 */
declare global {
  interface Window {
    uiController: UIController;
  }
}

// Expose as global reference
if (typeof window !== 'undefined') {
  (window as any).uiController = uiController;
}
