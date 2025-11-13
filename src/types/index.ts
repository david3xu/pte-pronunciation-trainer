/**
 * Type Definitions - Central Export
 *
 * All TypeScript types for the PTE Pronunciation Trainer application.
 */

// Dataset types
export type {
  IPA,
  Phonetic,
  Difficulty,
  VocabularyCategory,
  PracticeCategory,
  PracticeMode,
  VocabularyTerm,
  PracticeMetadata,
  RepeatSentenceItem,
  AnswerShortQuestionItem,
  WriteFromDictationItem,
  PracticeItem,
  DatasetType,
  DatasetMode,
  Dataset,
  VocabularyDataset,
  PracticeDataset,
  DatasetRegistryEntry,
  DataLoadOptions,
  DataLoadResult
} from './dataset.types';

// Config types
export type {
  EventPayloads,
  EventName,
  EventsConfig,
  DataPathsConfig,
  LearningMode,
  DataConfig,
  AIConfig,
  APIConfig,
  DelaysConfig,
  LimitsConfig,
  VoicePreference,
  TTSConfig,
  VoiceConfig,
  UIConfig,
  SettingsDefaults,
  PipelineConfig,
  BuildConfig,
  AppConfig,
  DeepPartial,
  ConfigPath,
  ConfigGetter,
  ConfigSetter
} from './config.types';
