/**
 * Analytics Service - PostHog Integration
 *
 * Provides centralized analytics tracking for user behavior and app events.
 * PostHog free tier: 1M events/month
 */

import posthog from 'posthog-js';

/**
 * Event properties interface for type safety
 */
export interface AnalyticsEventProperties {
  // Vocabulary events
  word?: string;
  phonetic?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  category?: string;
  dataset_id?: string;

  // Practice events
  mode?: 'vocabulary' | 'practice';
  practice_type?: 'rs' | 'asq' | 'wfd' | 'swt';
  items_completed?: number;
  items_correct?: number;
  accuracy?: number;
  duration_seconds?: number;

  // Audio/TTS events
  tts_engine?: 'browser' | 'azure';
  voice?: string;
  rate?: number;
  pitch?: number;

  // Settings events
  setting_key?: string;
  setting_value?: any;

  // Auth events
  auth_method?: 'email' | 'google' | 'github';

  // Navigation events
  from_page?: string;
  to_page?: string;

  // Error events
  error_message?: string;
  error_stack?: string;
  error_component?: string;

  // Generic properties
  [key: string]: any;
}

/**
 * User properties interface
 */
export interface AnalyticsUserProperties {
  email?: string;
  user_id?: string;
  signup_date?: string;
  total_words_studied?: number;
  total_practice_sessions?: number;
  current_streak?: number;
  premium?: boolean;
  [key: string]: any;
}

/**
 * Analytics Service Class
 *
 * Wraps PostHog with type-safe event tracking
 */
export class AnalyticsService {
  private initialized: boolean = false;
  private enabled: boolean = false;
  private apiHost: string = 'https://app.posthog.com';

  /**
   * Initialize PostHog analytics
   *
   * @param apiKey - PostHog project API key (from env)
   * @param options - Optional PostHog configuration
   */
  initialize(apiKey: string | null, options: any = {}): void {
    if (this.initialized) {
      console.warn('[Analytics] Already initialized, skipping');
      return;
    }

    // If no API key, run in disabled mode (dev/test)
    if (!apiKey) {
      console.log('[Analytics] No API key provided, running in disabled mode');
      this.enabled = false;
      this.initialized = true;
      return;
    }

    try {
      // Initialize PostHog
      posthog.init(apiKey, {
        api_host: options.api_host || this.apiHost,
        autocapture: options.autocapture !== false, // Default: true
        capture_pageview: options.capture_pageview !== false, // Default: true
        capture_pageleave: options.capture_pageleave !== false, // Default: true
        loaded: (posthog) => {
          console.log('[Analytics] ✅ PostHog initialized successfully');

          // Debug mode in development
          if (import.meta.env.DEV) {
            posthog.debug(true);
          }
        },
        ...options
      });

      this.enabled = true;
      this.initialized = true;

      console.log('[Analytics] PostHog service initialized');
    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
      this.enabled = false;
      this.initialized = true;
    }
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Track a custom event
   *
   * @param eventName - Name of the event
   * @param properties - Event properties
   */
  track(eventName: string, properties?: AnalyticsEventProperties): void {
    if (!this.enabled) {
      console.log(`[Analytics] (disabled) ${eventName}`, properties);
      return;
    }

    try {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Analytics] 📊 ${eventName}`, properties);
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  /**
   * Identify a user
   *
   * @param userId - Unique user ID
   * @param properties - User properties
   */
  identify(userId: string, properties?: AnalyticsUserProperties): void {
    if (!this.enabled) {
      console.log(`[Analytics] (disabled) identify:`, userId, properties);
      return;
    }

    try {
      posthog.identify(userId, properties);
      console.log(`[Analytics] 👤 User identified:`, userId);
    } catch (error) {
      console.error('[Analytics] Failed to identify user:', error);
    }
  }

  /**
   * Reset user identity (on logout)
   */
  reset(): void {
    if (!this.enabled) {
      console.log('[Analytics] (disabled) reset');
      return;
    }

    try {
      posthog.reset();
      console.log('[Analytics] User identity reset');
    } catch (error) {
      console.error('[Analytics] Failed to reset:', error);
    }
  }

  /**
   * Set user properties
   *
   * @param properties - Properties to set
   */
  setUserProperties(properties: AnalyticsUserProperties): void {
    if (!this.enabled) {
      console.log('[Analytics] (disabled) setUserProperties:', properties);
      return;
    }

    try {
      posthog.people.set(properties);
      console.log('[Analytics] User properties updated');
    } catch (error) {
      console.error('[Analytics] Failed to set user properties:', error);
    }
  }

  /**
   * Track page view
   *
   * @param pageName - Optional page name
   */
  pageView(pageName?: string): void {
    if (!this.enabled) {
      console.log(`[Analytics] (disabled) pageview:`, pageName);
      return;
    }

    try {
      if (pageName) {
        posthog.capture('$pageview', { page_name: pageName });
      } else {
        posthog.capture('$pageview');
      }
      console.log('[Analytics] 📄 Page view tracked:', pageName || window.location.pathname);
    } catch (error) {
      console.error('[Analytics] Failed to track page view:', error);
    }
  }

  /**
   * Feature flag evaluation
   *
   * @param flagKey - Feature flag key
   * @param defaultValue - Default value if flag not found
   * @returns Flag value
   */
  isFeatureEnabled(flagKey: string, defaultValue: boolean = false): boolean {
    if (!this.enabled) {
      return defaultValue;
    }

    try {
      return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
    } catch (error) {
      console.error('[Analytics] Failed to check feature flag:', error);
      return defaultValue;
    }
  }

  /**
   * Get feature flag payload
   *
   * @param flagKey - Feature flag key
   * @returns Flag payload
   */
  getFeatureFlagPayload(flagKey: string): any {
    if (!this.enabled) {
      return null;
    }

    try {
      return posthog.getFeatureFlagPayload(flagKey);
    } catch (error) {
      console.error('[Analytics] Failed to get feature flag payload:', error);
      return null;
    }
  }

  /**
   * Opt user out of tracking
   */
  optOut(): void {
    if (!this.enabled) return;

    try {
      posthog.opt_out_capturing();
      console.log('[Analytics] User opted out of tracking');
    } catch (error) {
      console.error('[Analytics] Failed to opt out:', error);
    }
  }

  /**
   * Opt user in to tracking
   */
  optIn(): void {
    if (!this.enabled) return;

    try {
      posthog.opt_in_capturing();
      console.log('[Analytics] User opted in to tracking');
    } catch (error) {
      console.error('[Analytics] Failed to opt in:', error);
    }
  }

  // ========================================
  // Convenience Methods for Common Events
  // ========================================

  /**
   * Track vocabulary word practice
   */
  trackWordPractice(word: string, properties: AnalyticsEventProperties = {}): void {
    this.track('vocabulary_practiced', {
      word,
      ...properties
    });
  }

  /**
   * Track practice session completion
   */
  trackPracticeSessionCompleted(properties: AnalyticsEventProperties): void {
    this.track('practice_session_completed', properties);
  }

  /**
   * Track TTS usage
   */
  trackTTSUsed(properties: AnalyticsEventProperties): void {
    this.track('tts_used', properties);
  }

  /**
   * Track settings change
   */
  trackSettingChanged(key: string, value: any): void {
    this.track('setting_changed', {
      setting_key: key,
      setting_value: value
    });
  }

  /**
   * Track authentication events
   */
  trackAuth(action: 'signup' | 'signin' | 'signout', properties: AnalyticsEventProperties = {}): void {
    this.track(`auth_${action}`, properties);
  }

  /**
   * Track error
   */
  trackError(error: Error, component?: string): void {
    this.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_component: component
    });
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string): void {
    this.track('navigation', {
      from_page: from,
      to_page: to
    });
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).analyticsService = analyticsService;
}
