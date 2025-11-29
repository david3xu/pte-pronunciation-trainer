/**
 * AI Recommendation Service using Google Gemini API
 *
 * Provides personalized learning recommendations based on user progress.
 * Uses Gemini 1.5 Flash (free tier) for intelligent analysis.
 */

import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API
const getGeminiClient = () => {
  const apiKey = import.meta.env['VITE_GEMINI_API_KEY'];

  if (!apiKey) {
    console.warn('⚠️ VITE_GEMINI_API_KEY not set. AI recommendations will be disabled.');
    return null;
  }

  return new GoogleGenAI({ apiKey });
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
export async function generateRecommendations(
  userProgress: UserProgress
): Promise<Recommendation[]> {
  const genAI = getGeminiClient();

  if (!genAI) {
    // Return fallback recommendations if API key not configured
    return getFallbackRecommendations(userProgress);
  }

  try {
    const prompt = buildRecommendationPrompt(userProgress);

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text || '';

    // Parse AI response into structured recommendations
    const recommendations = parseAIResponse(text);

    return recommendations;
  } catch (error) {
    console.error('❌ Error generating AI recommendations:', error);
    // Fallback to rule-based recommendations
    return getFallbackRecommendations(userProgress);
  }
}

/**
 * Build prompt for Gemini AI
 */
function buildRecommendationPrompt(userProgress: UserProgress): string {
  const { completedItems, totalItems, accuracy, weakAreas, recentActivity } = userProgress;

  const weakAreasText = weakAreas.length > 0
    ? weakAreas.map(area =>
        `- "${area.word}" (${area.difficulty}): ${area.correctAttempts}/${area.attempts} correct (${Math.round(area.correctAttempts / area.attempts * 100)}%)`
      ).join('\n')
    : 'No weak areas identified yet.';

  const recentActivityText = recentActivity.length > 0
    ? recentActivity.map(activity =>
        `- ${activity.practiceMode}: ${activity.itemsCompleted} items (${activity.date})`
      ).join('\n')
    : 'No recent activity.';

  return `You are an expert English pronunciation tutor for PTE (Pearson Test of English) exam preparation.

Analyze this student's progress and provide 3-5 personalized learning recommendations:

**Student Progress:**
- Completed: ${completedItems}/${totalItems} items (${Math.round(completedItems / totalItems * 100)}%)
- Overall Accuracy: ${Math.round(accuracy * 100)}%

**Weak Areas (words with low accuracy):**
${weakAreasText}

**Recent Activity:**
${recentActivityText}

**Available Practice Modes:**
1. Vocabulary Books (13 books: Beginner, Intermediate, Advanced, FIB Listening, etc.)
2. Repeat Sentence (RS) - Listen and repeat sentences
3. Answer Short Question (ASQ) - Quick factual questions
4. Write From Dictation (WFD) - Listen and type sentences

**Instructions:**
1. Prioritize the student's weak areas
2. Suggest specific vocabulary books or practice modes
3. Balance difficulty - don't overwhelm with only hard content
4. Consider their recent activity to provide variety
5. Each recommendation should be actionable and specific

**Output Format (JSON array):**
[
  {
    "type": "vocabulary" | "practice",
    "priority": "high" | "medium" | "low",
    "category": "pte-beginner" | "pte-advanced" | "pte-rs" | etc.,
    "practiceMode": "rs" | "asq" | "wfd" (only for practice type),
    "reason": "Clear explanation why this is recommended",
    "specificItems": ["word1", "word2"] (optional, for targeted practice),
    "estimatedTime": "5-10 minutes" (optional)
  }
]

Respond with ONLY the JSON array, no additional text.`;
}

/**
 * Parse AI response into structured recommendations
 */
function parseAIResponse(aiResponse: string): Recommendation[] {
  try {
    // Extract JSON from response (AI might wrap it in markdown code blocks)
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\[([\s\S]*?)\]/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;

    const recommendations = JSON.parse(jsonText) as Recommendation[];

    // Validate and sanitize
    return recommendations.filter(rec =>
      rec.type && rec.priority && rec.category && rec.reason
    ).slice(0, 5); // Max 5 recommendations

  } catch (error) {
    console.error('❌ Error parsing AI response:', error);
    console.log('Raw AI response:', aiResponse);
    throw error;
  }
}

/**
 * Fallback recommendations if AI fails or is unavailable
 */
function getFallbackRecommendations(userProgress: UserProgress): Recommendation[] {
  const { accuracy, weakAreas, completedItems, totalItems } = userProgress;

  const recommendations: Recommendation[] = [];

  // If accuracy is low, suggest beginner content
  if (accuracy < 0.6) {
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


