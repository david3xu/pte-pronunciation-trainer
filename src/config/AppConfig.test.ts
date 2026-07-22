/**
 * Configuration Tests
 *
 * Validates that Config.ts contains all required configuration sections
 * and values are properly typed.
 */

import { describe, expect, it } from 'vitest';
import { appConfig } from './AppConfig';

describe('Config Validation', () => {
  describe('AI Configuration', () => {
    it('should have Gemini model configuration', () => {
      expect(appConfig.get('ai.gemini.defaultModel')).toBe('gemini-2.5-flash');
      expect(appConfig.get('ai.gemini.fallbackModel')).toBe('gemini-1.5-flash');
      expect(appConfig.get('ai.gemini.conversationHistoryLimit')).toBe(10);
      expect(appConfig.get('ai.gemini.maxTokens')).toBe(2048);
      expect(appConfig.get('ai.gemini.temperature')).toBe(0.7);
    });
  });

  describe('API Endpoints', () => {
    it('should have all API endpoints defined', () => {
      expect(appConfig.get('api.endpoints.aiChat')).toBe('/api/ai/chat');
      expect(appConfig.get('api.endpoints.aiTutor')).toBe('/api/ai-tutor');
      expect(appConfig.get('api.endpoints.aiRecommendations')).toBe('/api/ai-recommendations');
      expect(appConfig.get('api.endpoints.pronunciationScore')).toBe('/api/pronunciation-score');
    });
  });

  describe('Delays & Timeouts', () => {
    it('should have all delays defined', () => {
      expect(appConfig.get('delays.autoPlayBetweenWords')).toBe(500);
      expect(appConfig.get('delays.autoPlayRestartPause')).toBe(1000);
      expect(appConfig.get('delays.recordingTimeout')).toBe(10000);
      expect(appConfig.get('delays.onboardingDelay')).toBe(500);
    });

    it('should have positive delay values', () => {
      expect(appConfig.get('delays.autoPlayBetweenWords')).toBeGreaterThan(0);
      expect(appConfig.get('delays.recordingTimeout')).toBeGreaterThan(0);
    });
  });

  describe('Request Limits', () => {
    it('should have conversation history limit', () => {
      expect(appConfig.get('limits.conversationHistory')).toBe(10);
      expect(appConfig.get('limits.recommendations')).toBe(5);
    });

    it('should have positive limit values', () => {
      expect(appConfig.get('limits.conversationHistory')).toBeGreaterThan(0);
      expect(appConfig.get('limits.recommendations')).toBeGreaterThan(0);
    });
  });

  describe('Voice Configuration', () => {
    it('should have voice settings', () => {
      expect(appConfig.get('voice.defaultVoiceId')).toBe('en-AU-WilliamNeural');
      expect(appConfig.get('voice.defaultEngine')).toBe('neural');
      expect(appConfig.get('voice.defaultLanguage')).toBe('en-AU');
    });
  });

  describe('Build Configuration', () => {
    it('should have server ports defined', () => {
      expect(appConfig.get('build.devServerPort')).toBe(3001);
      expect(appConfig.get('build.previewServerPort')).toBe(3002);
    });
  });

  describe('Config Getter Method', () => {
    it('should return value for valid path', () => {
      expect(appConfig.get('app.name')).toBe('PTE Pronunciation Trainer');
    });

    it('should return default value for missing path', () => {
      expect(appConfig.get('nonexistent.path', 'default')).toBe('default');
    });

    it('should handle nested paths correctly', () => {
      const geminiConfig = appConfig.get('ai.gemini');
      expect(geminiConfig).toHaveProperty('defaultModel');
      expect(geminiConfig).toHaveProperty('temperature');
    });
  });

  describe('Vocabulary Book Configuration', () => {
    it('should include the custom RA vocabulary book', () => {
      const learningModes = appConfig.get('data.learningModes');
      const vocabularyModes = learningModes.filter((mode: any) => mode.category === 'vocabulary');

      expect(learningModes).toContainEqual(
        expect.objectContaining({
          id: 'pte-my-ra',
          name: 'My RA PTE Words',
          category: 'vocabulary',
        })
      );
      expect(vocabularyModes[0]).toEqual(
        expect.objectContaining({
          id: 'pte-my-ra',
        })
      );
      expect(appConfig.get('data.paths.byMode.pte-my-ra')).toBe('data/processed/pte-my-ra.json');
    });

    it('should include the custom RS/WFD vocabulary book', () => {
      const learningModes = appConfig.get('data.learningModes');

      expect(learningModes).toContainEqual(
        expect.objectContaining({
          id: 'pte-my-rs-wfd',
          name: 'My RS & WFD PTE Words',
          category: 'vocabulary',
        })
      );
      expect(appConfig.get('data.paths.byMode.pte-my-rs-wfd')).toBe('data/processed/pte-my-rs-wfd.json');
    });
  });

  describe('Default Vocabulary Book (single source of truth)', () => {
    it('derives vocabulary book ids from learningModes', () => {
      const ids = appConfig.getVocabularyBookIds();
      const expected = (appConfig.get('data.learningModes') as Array<{ id: string; category: string }>)
        .filter((mode) => mode.category === 'vocabulary')
        .map((mode) => mode.id);
      expect(ids).toEqual(expected);
      expect(ids.length).toBeGreaterThan(0);
    });

    it('returns the first enabled vocabulary book as the default', () => {
      const defaultId = appConfig.getDefaultVocabularyBookId();
      const ids = appConfig.getVocabularyBookIds();
      expect(defaultId).toBe(ids[0]);
      // The default must be a member of the enabled list so auto-switch (indexOf)
      // never fails on a fresh install (the H3 regression this guards against).
      expect(ids).toContain(defaultId);
    });
  });

  describe('No Hardcoded Values Validation', () => {
    it('should not have magic number delays in config', () => {
      // Ensure delays are configured, not hardcoded
      const delays = appConfig.get('delays');
      expect(delays).toBeDefined();
      expect(Object.keys(delays).length).toBeGreaterThanOrEqual(4);
    });

    it('should not have hardcoded model versions', () => {
      const model = appConfig.get('ai.gemini.defaultModel');
      expect(model).toBeDefined();
      expect(model).toContain('gemini');
    });
  });
});
