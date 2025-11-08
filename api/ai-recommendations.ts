/**
 * AI Recommendations API Route (Vercel Serverless Function)
 *
 * Uses OpenAI GPT-4 to analyze user progress and generate
 * personalized learning recommendations.
 *
 * Endpoint: /api/ai-recommendations
 * Method: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured - returning mock recommendations');
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

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful PTE pronunciation coach. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    // Parse OpenAI response
    const responseText = completion.choices[0].message.content || '[]';
    let recommendations: Recommendation[];

    try {
      // Try to parse as direct array
      recommendations = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract array from object response
      try {
        const parsed = JSON.parse(responseText);
        recommendations = parsed.recommendations || parsed.data || [];
      } catch {
        console.error('Failed to parse OpenAI response:', responseText);
        recommendations = getMockRecommendations(currentAccuracy);
      }
    }

    // Ensure we have valid recommendations
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      recommendations = getMockRecommendations(currentAccuracy);
    }

    // Return recommendations
    return res.status(200).json({
      success: true,
      data: recommendations.slice(0, 5), // Limit to 5 recommendations
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
 * Generate mock recommendations (fallback when OpenAI is unavailable)
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
