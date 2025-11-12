/**
 * AI Recommendation Service using Google Gemini API
 *
 * Provides personalized learning recommendations based on user progress.
 * Uses Gemini 1.5 Flash (free tier) for intelligent analysis.
 */
export interface UserProgress {
    completedItems: number;
    totalItems: number;
    accuracy: number;
    weakAreas: {
        word: string;
        attempts: number;
        correctAttempts: number;
        difficulty: string;
        category: string;
    }[];
    recentActivity: {
        practiceMode: string;
        itemsCompleted: number;
        date: string;
    }[];
}
export interface Recommendation {
    type: 'vocabulary' | 'practice';
    priority: 'high' | 'medium' | 'low';
    category: string;
    practiceMode?: string;
    reason: string;
    specificItems?: string[];
    estimatedTime?: string;
}
/**
 * Generate personalized recommendations using Gemini AI
 */
export declare function generateRecommendations(userProgress: UserProgress): Promise<Recommendation[]>;
/**
 * Get quick recommendation summary for a specific item
 */
export declare function getItemFeedback(word: string, userAttempts: number, userCorrect: number): Promise<string>;
//# sourceMappingURL=recommendationService.d.ts.map