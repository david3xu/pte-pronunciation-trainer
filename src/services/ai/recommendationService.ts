/**
 * AI Recommendation Service
 *
 * Provides personalized learning recommendations based on user progress.
 * All AI (Gemini) access is server-side only: this module calls the
 * /api/ai-recommendations serverless function and never reads an API key in
 * the browser. When there is no authenticated user, or the request fails, it
 * falls back to local rule-based recommendations.
 */

import { appConfig } from '../../config/AppConfig';
import { useAppStore } from '../../stores';

/** Shape returned by the /api/ai-recommendations serverless function. */
interface ServerRecommendation {
  word: string;
  reason: string;
  difficulty: 'easy' | 'normal' | 'hard';
  category: string;
}

/** Maps a server difficulty to the client recommendation priority. */
const PRIORITY_BY_DIFFICULTY: Record<ServerRecommendation['difficulty'], AIRecommendation['priority']> = {
  hard: 'high',
  normal: 'medium',
  easy: 'low',
};

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

export interface AIRecommendation {
  type: 'vocabulary' | 'practice';
  priority: 'high' | 'medium' | 'low';
  category: string;
  practiceMode?: string;
  reason: string;
  specificItems?: string[];
  estimatedTime?: string;
}

/**
 * Request transient AI generated study suggestions.
 *
 * Deliberately named apart from recommendationEngine.generateRecommendations,
 * which is a different feature: that one derives weak areas from Supabase
 * session history and persists rows with a status the user can accept or
 * decline. This one is stateless, asks the Gemini backed
 * /api/ai-recommendations endpoint (which holds the key), keeps nothing, and
 * falls back to rule based suggestions for guests or on any error so the UI
 * always receives a usable result. The two are not interchangeable.
 */
export async function requestAIRecommendations(
  userProgress: UserProgress
): Promise<AIRecommendation[]> {
  const state = useAppStore.getState();
  const userId = state.auth.user?.id;

  // Server scopes recommendations to a user; without one, use local fallback.
  if (!userId) {
    return getFallbackRecommendations(userProgress);
  }

  try {
    const baseUrl = appConfig.get<string>('api.baseUrl');
    const endpoint = appConfig.get<string>('api.endpoints.aiRecommendations');

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        currentAccuracy: userProgress.accuracy,
        completedCount: userProgress.completedItems,
        totalItems: userProgress.totalItems,
        currentMode: state.settings.practiceType,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI recommendations request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { data?: ServerRecommendation[] };
    const serverItems = payload.data ?? [];

    if (serverItems.length === 0) {
      return getFallbackRecommendations(userProgress);
    }

    return serverItems.map((item) => ({
      type: 'vocabulary',
      priority: PRIORITY_BY_DIFFICULTY[item.difficulty],
      category: item.category,
      reason: item.reason,
      specificItems: [item.word],
    }));
  } catch (error) {
    console.error('Error fetching server AI recommendations:', error);
    return getFallbackRecommendations(userProgress);
  }
}

/**
 * Fallback recommendations if the server is unavailable or the user is a guest
 */
function getFallbackRecommendations(userProgress: UserProgress): AIRecommendation[] {
  const { accuracy, weakAreas, completedItems, totalItems } = userProgress;

  const recommendations: AIRecommendation[] = [];

  // If accuracy is low, suggest beginner content
  if (accuracy < 60) {
    recommendations.push({
      type: 'vocabulary',
      priority: 'high',
      category: 'pte-beginner',
      reason: 'Your current accuracy is below 60%. Let\'s build a strong foundation with beginner vocabulary.',
      estimatedTime: '10-15 minutes'
    });
  }

  // If there are weak areas, target them
  if (weakAreas.length > 0) {
    const difficultWords = weakAreas.filter(w => w.difficulty === 'hard');
    if (difficultWords.length > 0) {
      recommendations.push({
        type: 'vocabulary',
        priority: 'high',
        category: 'pte-advanced',
        reason: `You're struggling with ${difficultWords.length} difficult words. Let's practice these challenging terms.`,
        specificItems: difficultWords.slice(0, 5).map(w => w.word),
        estimatedTime: '15-20 minutes'
      });
    }
  }

  // If completion is low, suggest diverse practice
  if (completedItems / totalItems < 0.3) {
    recommendations.push({
      type: 'practice',
      priority: 'medium',
      category: 'pte-rs',
      practiceMode: 'rs',
      reason: 'Try Repeat Sentence practice to improve your listening and speaking skills.',
      estimatedTime: '10 minutes'
    });
  }

  // Always suggest a mixed practice
  recommendations.push({
    type: 'vocabulary',
    priority: 'medium',
    category: 'pte-intermediate',
    reason: 'Continue building your vocabulary with intermediate-level words.',
    estimatedTime: '10 minutes'
  });

  return recommendations.slice(0, 5);
}
