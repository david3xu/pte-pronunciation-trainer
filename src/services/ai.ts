/**
 * AI API Client
 *
 * Client-side wrapper for AI-powered features (recommendations, tutoring, etc.)
 */



interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
}

import { appConfig } from '../config/AppConfig';



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
/**
 * Ask AI tutor a question with streaming response
 *
 * @param question - User's question
 * @param onToken - Callback for each new token received
 * @param options - Configuration options
 */
export async function askAITutorStream(
  question: string,
  onToken: (token: string) => void,
  options?: EnhancedAITutorOptions
): Promise<AIResponse<{ answer: string }>> {
  try {
    const request = {
      message: question,
      context: options?.context,
      conversationHistory: options?.conversationHistory,
      userId: options?.userId,
      taskType: options?.taskType,
      sessionId: options?.sessionId,
      currentItem: options?.currentItem,
      useEnhancedContext: options?.useEnhancedContext || false,
    };

    const response = await fetch(appConfig.get('api.endpoints.aiChat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
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

    if (!response.body) {
      return { success: false, error: 'No response body' };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              onToken(parsed.text);
              fullAnswer += parsed.text;
            } else if (parsed.error) {
              console.error('Stream error:', parsed.error);
              // Don't throw, just log - we might have partial answer
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
    }

    return {
      success: true,
      data: { answer: fullAnswer },
    };
  } catch (error: any) {
    console.error('AI Tutor Stream error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get AI tutor response',
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

    const response = await fetch(appConfig.get('api.endpoints.pronunciationScore'), {
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
