/**
 * AI API Client
 *
 * Client-side wrapper for AI-powered features (recommendations, tutoring, etc.)
 */

interface AIRecommendationRequest {
  userId: string;
  currentAccuracy: number;
  completedItems: string[];
  currentMode: string;
}

interface AIRecommendation {
  word: string;
  reason: string;
  difficulty: 'easy' | 'normal' | 'hard';
  category: string;
}

interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
}

/**
 * Get AI-powered learning recommendations
 */
export async function getAIRecommendations(
  request: AIRecommendationRequest
): Promise<AIResponse<AIRecommendation[]>> {
  try {
    const response = await fetch('/api/ai-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('AI Recommendations API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch AI recommendations',
    };
  }
}

// Removed unused AITutorRequest interface - request structure is passed directly to askAITutor()

/**
 * Ask AI tutor a question about pronunciation/vocabulary
 */
export async function askAITutor(
  question: string,
  context?: { word?: string; difficulty?: string; ipa?: { british?: string; american?: string } },
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AIResponse<{ answer: string }>> {
  try {
    const request = {
      message: question,
      context,
      conversationHistory,
    };

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      // Try to parse error message
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `API returned ${response.status}`,
        };
      } catch {
        return {
          success: false,
          error: `API returned ${response.status}`,
        };
      }
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('AI Tutor API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get AI tutor response',
    };
  }
}

/**
 * Get pronunciation tips from AI
 * (Placeholder for future implementation)
 */
export async function getPronunciationTips(
  _word: string,
  _userAttempt?: string
): Promise<AIResponse<{ tips: string[] }>> {
  // TODO: Implement pronunciation tips endpoint
  return {
    success: false,
    error: 'Pronunciation tips not yet implemented',
  };
}

interface PronunciationScoringRequest {
  targetText: string;
  transcribedText: string;
  difficulty?: string;
}

interface ScoringResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  transcription: string;
  targetText: string;
}

/**
 * Get AI-powered pronunciation scoring
 */
export async function getPronunciationScore(
  targetText: string,
  transcribedText: string,
  difficulty: string = 'normal'
): Promise<ScoringResult> {
  try {
    const request: PronunciationScoringRequest = {
      targetText,
      transcribedText,
      difficulty,
    };

    const response = await fetch('/api/pronunciation-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to score pronunciation');
    }

    return result.data;
  } catch (error: any) {
    console.error('Pronunciation scoring API error:', error);

    // Return fallback result
    return {
      score: 0,
      feedback: 'Unable to analyze pronunciation at this time. Please try again.',
      strengths: [],
      improvements: ['Try again when the service is available'],
      transcription: transcribedText,
      targetText,
    };
  }
}
