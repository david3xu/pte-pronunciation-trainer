/**
 * Analytics Service - PostHog Integration
 *
 * Provides centralized analytics tracking for user behavior and app events.
 * PostHog free tier: 1M events/month
 */
/**
 * Event properties interface for type safety
 */
export interface AnalyticsEventProperties {
    word?: string;
    phonetic?: string;
    difficulty?: 'easy' | 'normal' | 'hard';
    category?: string;
    dataset_id?: string;
    mode?: 'vocabulary' | 'practice';
    practice_type?: 'rs' | 'asq' | 'wfd';
    items_completed?: number;
    items_correct?: number;
    accuracy?: number;
    duration_seconds?: number;
    tts_engine?: 'browser' | 'polly';
    voice?: string;
    rate?: number;
    pitch?: number;
    setting_key?: string;
    setting_value?: any;
    auth_method?: 'email' | 'google' | 'github';
    from_page?: string;
    to_page?: string;
    error_message?: string;
    error_stack?: string;
    error_component?: string;
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
export declare class AnalyticsService {
    private initialized;
    private enabled;
    private apiHost;
    /**
     * Initialize PostHog analytics
     *
     * @param apiKey - PostHog project API key (from env)
     * @param options - Optional PostHog configuration
     */
    initialize(apiKey: string | null, options?: any): void;
    /**
     * Check if analytics is enabled
     */
    isEnabled(): boolean;
    /**
     * Track a custom event
     *
     * @param eventName - Name of the event
     * @param properties - Event properties
     */
    track(eventName: string, properties?: AnalyticsEventProperties): void;
    /**
     * Identify a user
     *
     * @param userId - Unique user ID
     * @param properties - User properties
     */
    identify(userId: string, properties?: AnalyticsUserProperties): void;
    /**
     * Reset user identity (on logout)
     */
    reset(): void;
    /**
     * Set user properties
     *
     * @param properties - Properties to set
     */
    setUserProperties(properties: AnalyticsUserProperties): void;
    /**
     * Track page view
     *
     * @param pageName - Optional page name
     */
    pageView(pageName?: string): void;
    /**
     * Feature flag evaluation
     *
     * @param flagKey - Feature flag key
     * @param defaultValue - Default value if flag not found
     * @returns Flag value
     */
    isFeatureEnabled(flagKey: string, defaultValue?: boolean): boolean;
    /**
     * Get feature flag payload
     *
     * @param flagKey - Feature flag key
     * @returns Flag payload
     */
    getFeatureFlagPayload(flagKey: string): any;
    /**
     * Opt user out of tracking
     */
    optOut(): void;
    /**
     * Opt user in to tracking
     */
    optIn(): void;
    /**
     * Track vocabulary word practice
     */
    trackWordPractice(word: string, properties?: AnalyticsEventProperties): void;
    /**
     * Track practice session completion
     */
    trackPracticeSessionCompleted(properties: AnalyticsEventProperties): void;
    /**
     * Track TTS usage
     */
    trackTTSUsed(properties: AnalyticsEventProperties): void;
    /**
     * Track settings change
     */
    trackSettingChanged(key: string, value: any): void;
    /**
     * Track authentication events
     */
    trackAuth(action: 'signup' | 'signin' | 'signout', properties?: AnalyticsEventProperties): void;
    /**
     * Track error
     */
    trackError(error: Error, component?: string): void;
    /**
     * Track navigation
     */
    trackNavigation(from: string, to: string): void;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=analyticsService.d.ts.map