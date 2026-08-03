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
  ShadowingCategory,
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
  APIConfig,
  DelaysConfig,
  VoicePreference,
  TTSConfig,
  VoiceConfig,
  UIConfig,
  SettingsDefaults,
  PipelineConfig,
  AppConfig,
  DeepPartial,
  ConfigPath,
  ConfigGetter,
  ConfigSetter
} from './config.types';
