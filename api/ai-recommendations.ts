/**
 * AI Recommendations API Route (Vercel Serverless Function)
 *
 * Uses Google Gemini (FREE) to analyze user progress and generate
 * personalized learning recommendations.
 *
 * Endpoint: /api/ai-recommendations
 * Method: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG, LIMITS, getGeminiApiKey } from './config';

// Initialize Gemini client using centralized config
const getGeminiClient = () => {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

interface RequestBody {
  userId: string;
  currentAccuracy: number;
  completedItems: string[];
  currentMode: string;
}

interface Recommendation {
  word: string;
  reason: string;
  difficulty: 'easy' | 'normal' | 'hard';
  category: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { userId, currentAccuracy, completedItems, currentMode }: RequestBody = req.body;

    // Validate request
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // Check if Gemini API key is configured
    const genAI = getGeminiClient();
    if (!genAI) {
      console.warn('Gemini API key not configured - returning mock recommendations');
      return res.status(200).json({
        success: true,
        data: getMockRecommendations(currentAccuracy),
      });
    }

    // Build AI prompt
    const prompt = `You are a PTE pronunciation coach. Analyze the user's learning progress and recommend 5 vocabulary words they should practice next.

User Progress:
- Current Accuracy: ${currentAccuracy}%
- Completed Items: ${completedItems.length} words
- Current Mode: ${currentMode}
- Recent Practice: ${completedItems.slice(-10).join(', ') || 'None'}

Based on this progress:
1. Identify weak areas (low accuracy suggests need for easier words)
2. Recommend appropriate difficulty level
3. Suggest specific words with reasoning
4. Provide category information

Return ONLY a JSON array of 5 recommendations in this exact format:
[
  {
    "word": "ubiquitous",
    "reason": "Common PTE word with challenging pronunciation",
    "difficulty": "hard",
    "category": "pte-advanced"
  }
]

Return only valid JSON array, no additional text.`;

    // Call Gemini API using centralized config
    const response = await genAI.models.generateContent({
      model: AI_CONFIG.gemini.defaultModel,
      contents: prompt,
    });
    const responseText = response.text;

    // Check if response is valid
    if (!responseText) {
      console.error('Empty response from Gemini API');
      res.status(200).json({
        recommendations: getMockRecommendations(currentAccuracy),
      });
      return;
    }

    // Parse Gemini response
    let recommendations: Recommendation[];

    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\[([\s\S]*?)\]/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;

      // Try to parse as direct array
      recommendations = JSON.parse(jsonText);
    } catch (parseError) {
      // Try to extract array from object response
      try {
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\[([\s\S]*?)\]/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
        const parsed = JSON.parse(jsonText);
        recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendations || parsed.data || []);
      } catch {
        console.error('Failed to parse Gemini response:', responseText);
        recommendations = getMockRecommendations(currentAccuracy);
      }
    }

    // Ensure we have valid recommendations
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      recommendations = getMockRecommendations(currentAccuracy);
    }

    // Return recommendations using centralized limit
    return res.status(200).json({
      success: true,
      data: recommendations.slice(0, LIMITS.recommendations),
    });
  } catch (error: any) {
    console.error('AI Recommendations error:', error);

    // Fallback to mock recommendations on error
    const mockRecommendations = getMockRecommendations(req.body.currentAccuracy || 70);

    return res.status(200).json({
      success: true,
      data: mockRecommendations,
      warning: 'Using fallback recommendations due to API error',
    });
  }
}

/**
 * Generate mock recommendations (fallback when Gemini is unavailable)
 */
function getMockRecommendations(accuracy: number): Recommendation[] {
  // Determine difficulty based on accuracy
  const difficulty: 'easy' | 'normal' | 'hard' =
    accuracy >= 80 ? 'hard' : accuracy >= 60 ? 'normal' : 'easy';

  const recommendations = {
    easy: [
      {
        word: 'happy',
        reason: 'Basic word to build confidence',
        difficulty: 'easy' as const,
        category: 'pte-beginner',
      },
      {
        word: 'student',
        reason: 'Common PTE topic word',
        difficulty: 'easy' as const,
        category: 'pte-beginner',
      },
      {
        word: 'education',
        reason: 'Frequently appears in PTE',
        difficulty: 'easy' as const,
        category: 'pte-beginner',
      },
      {
        word: 'practice',
        reason: 'Essential for improvement',
        difficulty: 'easy' as const,
        category: 'pte-beginner',
      },
      {
        word: 'important',
        reason: 'Common adjective in academic contexts',
        difficulty: 'easy' as const,
        category: 'pte-beginner',
      },
    ],
    normal: [
      {
        word: 'analyze',
        reason: 'Common academic verb',
        difficulty: 'normal' as const,
        category: 'pte-intermediate',
      },
      {
        word: 'significant',
        reason: 'Frequently used in PTE reading',
        difficulty: 'normal' as const,
        category: 'pte-intermediate',
      },
      {
        word: 'demonstrate',
        reason: 'Important for academic writing',
        difficulty: 'normal' as const,
        category: 'pte-intermediate',
      },
      {
        word: 'perspective',
        reason: 'Useful for opinion expression',
        difficulty: 'normal' as const,
        category: 'pte-intermediate',
      },
      {
        word: 'essential',
        reason: 'Common in PTE essays',
        difficulty: 'normal' as const,
        category: 'pte-intermediate',
      },
    ],
    hard: [
      {
        word: 'ubiquitous',
        reason: 'Advanced vocabulary with complex pronunciation',
        difficulty: 'hard' as const,
        category: 'pte-advanced',
      },
      {
        word: 'phenomenon',
        reason: 'Challenging pronunciation patterns',
        difficulty: 'hard' as const,
        category: 'pte-advanced',
      },
      {
        word: 'methodology',
        reason: 'Academic term with multiple syllables',
        difficulty: 'hard' as const,
        category: 'pte-advanced',
      },
      {
        word: 'contemporary',
        reason: 'Complex stress patterns',
        difficulty: 'hard' as const,
        category: 'pte-advanced',
      },
      {
        word: 'infrastructure',
        reason: 'Long word with varying stress',
        difficulty: 'hard' as const,
        category: 'pte-advanced',
      },
    ],
  };

  return recommendations[difficulty];
}
