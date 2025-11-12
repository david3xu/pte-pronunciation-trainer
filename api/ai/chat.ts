/**
 * Vercel Serverless Function: AI Tutor Chat with Google Gemini (FREE)
 *
 * This endpoint provides conversational AI tutoring for pronunciation and vocabulary learning.
 * It uses Google Gemini 1.5 Flash for intelligent, context-aware responses.
 *
 * POST /api/ai/chat
 *
 * Request body:
 * {
 *   message: string;                // User's question
 *   context?: {                     // Current word/practice item context
 *     word: string;
 *     difficulty?: string;
 *     ipa?: { british?: string; american?: string };
 *   };
 *   conversationHistory?: {         // Previous messages (optional)
 *     role: 'user' | 'assistant';
 *     content: string;
 *   }[];
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   data?: { answer: string; };
 *   error?: string;
 * }
 *
 * Environment variables required:
 * - GEMINI_API (recommended for Vercel)
 * - OR GEMINI_API_KEY
 * - OR VITE_GEMINI_API_KEY (for client-side)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

interface ChatRequest {
  message: string;
  context?: {
    word: string;
    difficulty?: string;
    ipa?: {
      british?: string;
      american?: string;
    };
  };
  conversationHistory?: {
    role: 'user' | 'assistant';
    content: string;
  }[];
  userId?: string; // For saving history
}

interface ChatResponse {
  success: boolean;
  data?: {
    answer: string;
  };
  error?: string;
}

// ============================================
// System Prompt for AI Tutor
// ============================================

const SYSTEM_PROMPT = `You are an expert PTE (Pearson Test of English) pronunciation tutor and language coach.

Your role is to help students:
- Master pronunciation of English words and sentences
- Understand IPA (International Phonetic Alphabet) notation
- Improve their accent for the PTE exam
- Learn vocabulary effectively
- Build confidence in speaking English

Guidelines:
1. Be encouraging and supportive
2. Explain pronunciation using simple, clear language
3. Break down complex words into syllables
4. Provide helpful mnemonics and memory tricks
5. Give specific, actionable tips
6. Use examples and analogies when helpful
7. Keep responses concise but thorough (2-4 paragraphs max)
8. If asked about a specific word, focus on that word's pronunciation
9. Reference IPA notation when relevant
10. Adapt to the student's level (beginner/intermediate/advanced)

Format your responses clearly with:
- Short paragraphs
- Bullet points when listing tips
- **Bold** for emphasis on key sounds
- *Italics* for phonetic approximations

Remember: Your goal is to make pronunciation learning easy and enjoyable!`;

// ============================================
// Build Context-Aware Prompt
// ============================================

function buildContextPrompt(context?: ChatRequest['context']): string {
  if (!context) {
    return '';
  }

  let contextInfo = `\n\nCurrent practice context:\n`;
  contextInfo += `- Word/Phrase: "${context.word}"\n`;

  if (context.difficulty) {
    contextInfo += `- Difficulty: ${context.difficulty}\n`;
  }

  if (context.ipa) {
    if (context.ipa.british) {
      contextInfo += `- British IPA: ${context.ipa.british}\n`;
    }
    if (context.ipa.american) {
      contextInfo += `- American IPA: ${context.ipa.american}\n`;
    }
  }

  contextInfo += `\nWhen relevant, reference this word in your answer. If the user asks "How do I pronounce this?" or similar, they're asking about "${context.word}".`;

  return contextInfo;
}

// ============================================
// Save Conversation to Database (Optional)
// ============================================

async function saveConversation(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  context?: ChatRequest['context']
): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return; // Skip saving if Supabase not configured
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save both messages
    await supabase.from('chat_history').insert([
      {
        user_id: userId,
        role: 'user',
        content: userMessage,
        context: context || null,
        created_at: new Date().toISOString()
      },
      {
        user_id: userId,
        role: 'assistant',
        content: assistantResponse,
        context: context || null,
        created_at: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Failed to save conversation:', error);
    // Don't throw - saving is optional
  }
}

// ============================================
// Main Handler
// ============================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<ChatResponse>
): Promise<void> {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    return;
  }

  try {
    // Parse request
    const { message, context, conversationHistory, userId } = req.body as ChatRequest;

    // Validate
    if (!message || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    // Check API key - supports multiple env var names for flexibility
    const apiKey = process.env.GEMINI_API || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        success: false,
        error: 'AI Tutor is not configured. Please contact support.'
      });
      return;
    }

    // Initialize Gemini with new SDK
    const ai = new GoogleGenAI({ apiKey });

    // Build comprehensive prompt with system instructions and conversation history
    let fullPrompt = SYSTEM_PROMPT + buildContextPrompt(context);

    // Add conversation history (last 10 messages)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      fullPrompt += '\n\nConversation history:\n';
      recentHistory.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}\n`;
      });
      fullPrompt += '\n';
    }

    // Add current user message
    fullPrompt += `\nStudent: ${message}\n\nTutor:`;

    // Call Gemini API with new SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    const answer = response.text ||
      'I apologize, but I couldn\'t generate a response. Please try again.';

    // Save conversation if userId provided
    if (userId) {
      saveConversation(userId, message, answer, context).catch(err =>
        console.error('Background save failed:', err)
      );
    }

    // Return response
    res.status(200).json({
      success: true,
      data: {
        answer: answer.trim()
      }
    });

  } catch (error) {
    console.error('AI Tutor error:', error);

    // Check for specific Gemini API errors
    if (error instanceof Error) {
      // Rate limit errors
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again in a moment.'
        });
        return;
      }

      // Authentication errors
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        res.status(500).json({
          success: false,
          error: 'API authentication failed. Please contact support.'
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
