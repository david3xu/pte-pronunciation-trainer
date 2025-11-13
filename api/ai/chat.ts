/**
 * Vercel Serverless Function: AI Tutor Chat with Google Gemini (FREE)
 *
 * Phase 2 Enhanced: Context-aware AI with task-specific personas
 *
 * This endpoint provides conversational AI tutoring with:
 * - Task-specific personas (RS/ASQ/WFD/RA/Vocabulary)
 * - Rich context from learner profile and practice history
 * - Conversation history tracking
 *
 * POST /api/ai/chat
 *
 * Request body (Phase 1 - Legacy):
 * {
 *   message: string;
 *   context?: { word: string; difficulty?: string; ipa?: {...} };
 *   conversationHistory?: [...];
 *   userId?: string;
 * }
 *
 * Request body (Phase 2 - Enhanced):
 * {
 *   message: string;
 *   taskType: 'rs' | 'asq' | 'wfd' | 'ra' | 'vocabulary';
 *   userId: string;
 *   sessionId?: string;
 *   currentItem?: { text, userResponse, score, ... };
 *   useEnhancedContext: true;
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
 * - SUPABASE_URL (for Phase 2 context)
 * - SUPABASE_SERVICE_ROLE_KEY (for Phase 2 context)
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
  // Phase 2: Enhanced context
  taskType?: 'rs' | 'asq' | 'wfd' | 'ra' | 'di' | 'rl' | 'fib_r' | 'fib_l' | 'vocabulary';
  sessionId?: string;
  currentItem?: {
    text: string;
    userResponse?: string;
    transcription?: string;
    score?: number;
    attempts?: number;
  };
  useEnhancedContext?: boolean; // Flag to use Phase 2 context building
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
// Phase 2: Build Enhanced Context
// ============================================

async function buildEnhancedContext(
  userId: string,
  taskType: string,
  sessionId?: string,
  currentItem?: ChatRequest['currentItem']
): Promise<string> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return ''; // Skip if Supabase not configured
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch learner profile
    const { data: profile } = await supabase
      .from('learner_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch current session
    const { data: session } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId || '')
      .single();

    // Fetch recent errors (last 5 items with low scores)
    const { data: recentSessions } = await supabase
      .from('practice_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('task_type', taskType)
      .order('started_at', { ascending: false })
      .limit(5);

    const sessionIds = recentSessions?.map(s => s.id) || [];
    const { data: errors } = sessionIds.length > 0
      ? await supabase
          .from('session_items')
          .select('item_text, user_response, score, attempted_at')
          .in('session_id', sessionIds)
          .lt('score', 70)
          .order('attempted_at', { ascending: false })
          .limit(5)
      : { data: null };

    // Build context string
    let contextStr = '\n## Learner Context\n\n';

    if (profile) {
      contextStr += `**Goal Score:** ${profile.pte_goal_score || 65}\n`;
      contextStr += `**Learning Style:** ${profile.learning_style || 'mixed'}\n`;
      if (profile.target_date) {
        contextStr += `**Target Date:** ${profile.target_date}\n`;
      }
    }

    if (session) {
      contextStr += `\n## Current Session Stats\n\n`;
      contextStr += `**Items Attempted:** ${session.items_attempted}\n`;
      contextStr += `**Items Correct:** ${session.items_correct}\n`;
      contextStr += `**Accuracy:** ${(session.accuracy || 0).toFixed(1)}%\n`;
    }

    if (errors && errors.length > 0) {
      contextStr += `\n## Recent Mistakes\n\n`;
      errors.forEach((err, idx) => {
        contextStr += `${idx + 1}. Expected: "${err.item_text}", Got: "${err.user_response || 'no response'}", Score: ${err.score}\n`;
      });
    }

    if (currentItem) {
      contextStr += `\n## Current Item\n\n`;
      contextStr += `**Text:** "${currentItem.text}"\n`;
      if (currentItem.userResponse) {
        contextStr += `**User Response:** "${currentItem.userResponse}"\n`;
      }
      if (currentItem.score !== undefined) {
        contextStr += `**Score:** ${currentItem.score}/100\n`;
      }
      if (currentItem.attempts !== undefined) {
        contextStr += `**Attempts:** ${currentItem.attempts}\n`;
      }
    }

    return contextStr;
  } catch (error) {
    console.error('Failed to build enhanced context:', error);
    return '';
  }
}

// ============================================
// Phase 2: Generate System Prompt with Persona
// ============================================

function generatePersonaPrompt(taskType: string, goalScore?: number): string {
  const personas: Record<string, any> = {
    rs: {
      name: 'RS Specialist',
      role: 'Expert in Repeat Sentence for PTE',
      focus: ['Exact repetition', 'Natural intonation', 'Clear articulation', 'Appropriate pacing'],
      mistakes: ['Missing articles', 'Incorrect tenses', 'Skipping short words', 'Hesitation'],
      strategies: ['Listen for content words', 'Chunk sentences', 'Practice shadowing'],
    },
    asq: {
      name: 'ASQ Specialist',
      role: 'Expert in Answer Short Question for PTE',
      focus: ['Question word recognition', 'Concise answering (1-3 words)', 'General knowledge'],
      mistakes: ['Answering too long', 'Missing question type', 'Overthinking'],
      strategies: ['Focus on first word', 'Answer with expected term', 'Use 1-2 words max'],
    },
    wfd: {
      name: 'WFD Specialist',
      role: 'Expert in Write From Dictation for PTE',
      focus: ['Spelling accuracy', 'Grammar rules', 'Article usage', 'Word-for-word transcription'],
      mistakes: ['Spelling errors', 'Missing articles', 'Wrong verb forms', 'Missing words'],
      strategies: ['Listen for complete sentence', 'Write as you hear', 'Check grammar'],
    },
    ra: {
      name: 'RA Specialist',
      role: 'Expert in Read Aloud for PTE',
      focus: ['Clear pronunciation', 'Natural fluency', 'Appropriate pacing', 'Natural intonation'],
      mistakes: ['Reading too fast', 'Flat intonation', 'Mispronunciation', 'Hesitation'],
      strategies: ['Read silently first', 'Identify difficult words', 'Pause at punctuation'],
    },
    vocabulary: {
      name: 'Vocabulary Specialist',
      role: 'Expert in PTE Vocabulary',
      focus: ['Word meanings', 'Pronunciation', 'Usage in context', 'Memory techniques'],
      mistakes: ['Confusing similar words', 'Incorrect stress', 'Wrong context'],
      strategies: ['Learn in context', 'Use spaced repetition', 'Practice with IPA'],
    },
  };

  const persona = personas[taskType] || personas.vocabulary;

  let prompt = `You are **${persona.name}**, ${persona.role}.\n\n`;
  prompt += `## Your Focus Areas\n${persona.focus.map((f: string) => `- ${f}`).join('\n')}\n\n`;
  prompt += `## Common Mistakes to Watch\n${persona.mistakes.map((m: string) => `- ${m}`).join('\n')}\n\n`;
  prompt += `## Teaching Strategies\n${persona.strategies.map((s: string) => `- ${s}`).join('\n')}\n\n`;

  if (goalScore) {
    prompt += `**Learner Goal:** Achieve PTE score of ${goalScore}\n\n`;
  }

  prompt += `**Your Style:** Be supportive, specific, and actionable. Reference the learner's actual performance.\n`;

  return prompt;
}

// ============================================
// Save Conversation to Database (Phase 2)
// ============================================

async function saveConversationToDb(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  taskType?: string,
  sessionId?: string,
  context?: ChatRequest['context']
): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return; // Skip saving if Supabase not configured
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Phase 2: Save to ai_conversations table
    if (taskType) {
      await supabase.from('ai_conversations').insert({
        user_id: userId,
        session_id: sessionId || null,
        task_context: taskType,
        user_message: userMessage,
        ai_response: assistantResponse,
        context_data: context || {},
        created_at: new Date().toISOString(),
      });
    } else {
      // Phase 1: Legacy chat_history (if table exists)
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
    }
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
    const {
      message,
      context,
      conversationHistory,
      userId,
      taskType,
      sessionId,
      currentItem,
      useEnhancedContext
    } = req.body as ChatRequest;

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

    // Initialize Gemini with official SDK (from docs.google.com/gemini-api)
    const ai = new GoogleGenAI({ apiKey });

    let fullPrompt: string;

    // ============================================
    // Phase 2: Enhanced Context Mode
    // ============================================
    if (useEnhancedContext && taskType && userId) {
      // Get learner profile goal score
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      let goalScore: number | undefined;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: profile } = await supabase
          .from('learner_profiles')
          .select('pte_goal_score')
          .eq('user_id', userId)
          .single();
        goalScore = profile?.pte_goal_score;
      }

      // Build persona system prompt
      fullPrompt = generatePersonaPrompt(taskType, goalScore);

      // Add enhanced context
      const enhancedContext = await buildEnhancedContext(
        userId,
        taskType,
        sessionId,
        currentItem
      );
      fullPrompt += enhancedContext;

      // Add conversation history if available
      if (conversationHistory && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6); // Last 6 messages
        fullPrompt += '\n\n## Recent Conversation\n\n';
        recentHistory.forEach(msg => {
          fullPrompt += `**${msg.role === 'user' ? 'Learner' : 'You'}:** ${msg.content}\n\n`;
        });
      }

      // Add current user message
      fullPrompt += `\n**Learner:** ${message}\n\n**You:**`;
    }
    // ============================================
    // Phase 1: Legacy Mode
    // ============================================
    else {
      // Build comprehensive prompt with system instructions and conversation history
      fullPrompt = SYSTEM_PROMPT + buildContextPrompt(context);

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
    }

    // Call Gemini API with official SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    const answer = response.text ||
      'I apologize, but I couldn\'t generate a response. Please try again.';

    // Save conversation if userId provided
    if (userId) {
      saveConversationToDb(userId, message, answer, taskType, sessionId, context).catch(err =>
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
