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

// Phase 2: Enhanced AI Tutor Request Interface
interface EnhancedAITutorOptions {
  // Phase 1 (legacy) parameters
  context?: { word?: string; difficulty?: string; ipa?: { british?: string; american?: string } };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  // Phase 2 parameters
  userId?: string;
  taskType?: 'rs' | 'asq' | 'wfd' | 'ra' | 'di' | 'rl' | 'fib_r' | 'fib_l' | 'vocabulary';
  sessionId?: string;
  currentItem?: {
    text: string;
    userResponse?: string;
    transcription?: string;
    score?: number;
    attempts?: number;
  };
  useEnhancedContext?: boolean; // Enable Phase 2 context-aware AI
}

/**
 * Ask AI tutor a question about pronunciation/vocabulary
 *
 * Phase 1 (Legacy): Basic context with word/difficulty
 * Phase 2 (Enhanced): Task-specific personas with learner context
 *
 * @param question - User's question
 * @param options - Configuration options (Phase 1 + Phase 2)
 */
export async function askAITutor(
  question: string,
  options?: EnhancedAITutorOptions
): Promise<AIResponse<{ answer: string }>> {
  try {
    const request = {
      message: question,
      context: options?.context,
      conversationHistory: options?.conversationHistory,
      // Phase 2 parameters
      userId: options?.userId,
      taskType: options?.taskType,
      sessionId: options?.sessionId,
      currentItem: options?.currentItem,
      useEnhancedContext: options?.useEnhancedContext || false,
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
 *
 * Provides targeted pronunciation advice for a specific word,
 * optionally taking into account the user's previous attempt.
 */
export async function getPronunciationTips(
  word: string,
  userAttempt?: string
): Promise<AIResponse<{ tips: string[] }>> {
  try {
    const prompt = userAttempt
      ? `You are an expert pronunciation coach. A student is practicing the word "${word}" and their attempt sounded like "${userAttempt}".

Provide 3-5 specific, actionable pronunciation tips to help them improve. Focus on:
- Syllable breakdown
- Stress patterns
- Common mistakes for this word
- Practical techniques (mouth position, breath control, etc.)

Return ONLY a JSON array of tip strings:
["tip 1", "tip 2", "tip 3"]`
      : `You are an expert pronunciation coach. A student wants to learn how to pronounce the word "${word}".

Provide 3-5 specific, actionable pronunciation tips. Focus on:
- Syllable breakdown and stress patterns
- Difficult sounds in this word
- Common mistakes to avoid
- Memory aids or mnemonics
- Practical techniques

Return ONLY a JSON array of tip strings:
["tip 1", "tip 2", "tip 3"]`;

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        context: { word },
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get pronunciation tips');
    }

    // Parse tips from AI response
    const aiAnswer = result.data.answer;
    let tips: string[];

    try {
      // Try to extract JSON array from response
      const jsonMatch = aiAnswer.match(/\[([\s\S]*?)\]/);
      if (jsonMatch) {
        tips = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by newlines and filter
        tips = aiAnswer
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0 && !line.startsWith('#'))
          .slice(0, 5);
      }
    } catch {
      // If parsing fails, return the raw response as a single tip
      tips = [aiAnswer];
    }

    return {
      success: true,
      data: { tips },
    };
  } catch (error: any) {
    console.error('Pronunciation tips error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get pronunciation tips',
    };
  }
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
