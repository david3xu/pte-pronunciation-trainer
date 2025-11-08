/**
 * Pronunciation Scoring API Route (Vercel Serverless Function)
 *
 * Analyzes pronunciation attempts using AI to provide detailed feedback.
 * Compares transcribed speech with target text for accuracy scoring.
 *
 * Endpoint: /api/pronunciation-score
 * Method: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface RequestBody {
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
    const { targetText, transcribedText, difficulty = 'normal' }: RequestBody = req.body;

    // Validate request
    if (!targetText || !targetText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Target text is required',
      });
    }

    if (!transcribedText || !transcribedText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Transcribed text is required',
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured - returning mock response');
      return res.status(200).json({
        success: true,
        data: getMockScoringResult(targetText, transcribedText, difficulty),
      });
    }

    // Build prompt for pronunciation analysis
    const systemPrompt = `You are an expert pronunciation coach for the PTE (Pearson Test of English) exam.

Your task is to analyze pronunciation attempts by comparing the target text with what the student actually said (transcribed via speech recognition).

Provide a detailed analysis in JSON format with:
1. score (0-100): Overall pronunciation accuracy
2. feedback (string): 2-3 sentence summary of performance
3. strengths (array): List 1-3 specific things done well
4. improvements (array): List 1-3 specific areas to improve

Scoring criteria:
- 90-100: Excellent - near-perfect pronunciation, all words clear and accurate
- 70-89: Good - mostly accurate with minor errors
- 50-69: Fair - understandable but with noticeable errors
- 0-49: Needs improvement - significant pronunciation issues

Focus on:
- Word accuracy (did they say the right words?)
- Clarity (how understandable was the speech?)
- Stress patterns (for multi-word phrases)
- Common pronunciation mistakes

Be encouraging and constructive. Always include specific, actionable feedback.`;

    const userPrompt = `Target text: "${targetText}"
What student said: "${transcribedText}"
Difficulty level: ${difficulty}

Please analyze the pronunciation and provide your assessment in JSON format.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent scoring
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    // Parse response
    const responseContent = completion.choices[0].message.content || '{}';
    const analysis = JSON.parse(responseContent);

    // Build result
    const result: ScoringResult = {
      score: analysis.score || calculateSimpleScore(targetText, transcribedText),
      feedback: analysis.feedback || 'Good effort! Keep practicing.',
      strengths: analysis.strengths || [],
      improvements: analysis.improvements || [],
      transcription: transcribedText,
      targetText: targetText,
    };

    // Return successful response
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Pronunciation scoring error:', error);

    // Fallback to mock response on error
    const mockResult = getMockScoringResult(
      req.body.targetText,
      req.body.transcribedText,
      req.body.difficulty
    );

    return res.status(200).json({
      success: true,
      data: mockResult,
      warning: 'Using fallback scoring due to API error',
    });
  }
}

/**
 * Calculate simple similarity score between target and transcribed text
 */
function calculateSimpleScore(target: string, transcribed: string): number {
  const targetWords = target.toLowerCase().split(/\s+/);
  const transcribedWords = transcribed.toLowerCase().split(/\s+/);

  // Perfect match
  if (target.toLowerCase() === transcribed.toLowerCase()) {
    return 100;
  }

  // Word-by-word comparison
  let matchCount = 0;
  const maxLength = Math.max(targetWords.length, transcribedWords.length);

  for (let i = 0; i < targetWords.length; i++) {
    if (transcribedWords[i] === targetWords[i]) {
      matchCount++;
    } else if (transcribedWords.includes(targetWords[i])) {
      matchCount += 0.5; // Partial credit for word appearing elsewhere
    }
  }

  const score = (matchCount / maxLength) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Generate mock scoring result when OpenAI is unavailable
 */
function getMockScoringResult(
  targetText: string,
  transcribedText: string,
  difficulty: string
): ScoringResult {
  const score = calculateSimpleScore(targetText, transcribedText);

  const result: ScoringResult = {
    score,
    feedback: '',
    strengths: [],
    improvements: [],
    transcription: transcribedText,
    targetText,
  };

  // Generate feedback based on score
  if (score >= 90) {
    result.feedback = 'Excellent pronunciation! Your speech was clear and accurate. Keep up the great work!';
    result.strengths = [
      'Clear articulation of all words',
      'Correct word stress and rhythm',
      'Confident delivery',
    ];
    result.improvements = [
      'Try to maintain this consistency across longer passages',
    ];
  } else if (score >= 70) {
    result.feedback = 'Good job! Your pronunciation is mostly accurate with only minor variations. A bit more practice will make it perfect.';
    result.strengths = [
      'Most words pronounced correctly',
      'Good overall clarity',
    ];
    result.improvements = [
      'Pay attention to word endings',
      'Practice stress patterns in longer words',
    ];
  } else if (score >= 50) {
    result.feedback = 'Fair effort. Your speech was understandable but there were some noticeable differences. Focus on listening carefully and repeating slowly.';
    result.strengths = [
      'You made a good attempt',
      'Some words were clear',
    ];
    result.improvements = [
      'Listen to the target pronunciation multiple times',
      'Break down difficult words into syllables',
      'Practice at a slower pace first',
    ];
  } else {
    result.feedback = 'Keep practicing! There were significant differences from the target. Try breaking the text into smaller parts and practice each part separately.';
    result.strengths = [
      'You\'re making an effort to improve',
    ];
    result.improvements = [
      'Listen carefully to the target pronunciation',
      'Practice one word at a time',
      'Record yourself and compare with the target',
      'Consider using phonetic transcription to guide you',
    ];
  }

  // Add difficulty-specific feedback
  if (difficulty === 'hard') {
    result.improvements.push('This is an advanced word - don\'t be discouraged, it takes time!');
  }

  return result;
}
