/**
 * Pronunciation Scoring API Route (Vercel Serverless Function)
 *
 * Analyzes pronunciation attempts using Google Gemini (FREE) to provide detailed feedback.
 * Compares transcribed speech with target text for accuracy scoring.
 *
 * Endpoint: /api/pronunciation-score
 * Method: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { AI_CONFIG, getGeminiApiKey } from './config.js';

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

    // Check if Gemini API key is configured using centralized config
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.warn('Gemini API key not configured - returning mock response');
      return res.status(200).json({
        success: true,
        data: getMockScoringResult(targetText, transcribedText, difficulty),
      });
    }

    // Initialize Gemini with official SDK
    const genAI = new GoogleGenAI({ apiKey });

    // Build prompt for pronunciation analysis
    const prompt = `You are an expert pronunciation coach for the PTE (Pearson Test of English) exam.

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

Be encouraging and constructive. Always include specific, actionable feedback.

Target text: "${targetText}"
What student said: "${transcribedText}"
Difficulty level: ${difficulty}

Please analyze the pronunciation and provide your assessment in JSON format.
Return ONLY valid JSON, no additional text.`;

    // Call Gemini API with official SDK using centralized config
    const response = await genAI.models.generateContent({
      model: AI_CONFIG.gemini.defaultModel,
      contents: prompt,
      config: {
        maxOutputTokens: AI_CONFIG.gemini.maxTokens,
        temperature: AI_CONFIG.gemini.temperature,
        topP: AI_CONFIG.gemini.topP,
        topK: AI_CONFIG.gemini.topK,
      },
    });
    const responseContent = response.text;

    // Check if response is valid
    if (!responseContent) {
      console.error('Empty response from Gemini API');
      const mockResult = getMockScoringResult(targetText, transcribedText, difficulty);
      return res.status(200).json({
        success: true,
        data: mockResult,
        warning: 'Using fallback scoring due to empty API response',
      });
    }

    // Parse response (extract JSON from possible markdown wrapping)
    let analysis;
    try {
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || responseContent.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseContent;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseContent);
      analysis = {};
    }

    // Build result
    const scoringResult: ScoringResult = {
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
      data: scoringResult,
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
    const targetWord = targetWords[i];
    if (targetWord === undefined) {
      continue;
    }
    if (transcribedWords[i] === targetWord) {
      matchCount++;
    } else if (transcribedWords.includes(targetWord)) {
      matchCount += 0.5; // Partial credit for word appearing elsewhere
    }
  }

  const score = (matchCount / maxLength) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Generate mock scoring result when Gemini is unavailable
 */
function getMockScoringResult(
  targetText: string,
  transcribedText: string,
  difficulty?: string
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
