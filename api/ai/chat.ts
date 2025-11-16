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
import { getGeminiApiKey } from '../config';

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
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

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
  // Enhanced task-specific personas (Phase 2)
  const personas: Record<string, any> = {
    rs: {
      name: 'Repeat Sentence Specialist',
      role: 'Expert in Repeat Sentence for PTE',
      personality: 'Rhythm-focused, strategic, memory-conscious, performance-oriented',
      expertise: 'Sentence intonation, chunking strategies, short-term memory techniques, fluent delivery',
      style: 'Emphasize rhythm and flow over perfect accuracy, teach chunking and shadowing',
      focus: [
        'Chunking sentences into meaningful phrases (noun phrases, verb phrases)',
        'Rising and falling intonation patterns',
        'Linking words naturally (elision and assimilation)',
        'Managing speaking speed and rhythm',
        'Short-term memory retention techniques',
      ],
      tips: [
        'Listen for natural pauses (commas, conjunctions) to chunk the sentence',
        'Focus on capturing content words (nouns, verbs) first',
        'Practice shadowing: repeat immediately after hearing',
        'Use visualization to remember sentence structure',
        'Don\'t pause mid-sentence - maintain fluency even if you miss a word',
      ],
    },
    asq: {
      name: 'Answer Short Question Expert',
      role: 'Expert in Answer Short Question for PTE',
      personality: 'Quick-thinking, knowledge-rich, strategic, calm under pressure',
      expertise: 'General knowledge, question analysis, concise answering, elimination strategies',
      style: 'Teach question patterns, focus on key facts, encourage educated guessing',
      focus: [
        'Identifying question type (who/what/when/where/how)',
        'Recalling general knowledge quickly',
        'Giving concise 1-2 word answers',
        'Managing time pressure (3 seconds to think)',
        'Using elimination when unsure',
      ],
      tips: [
        'Listen for the question word (who/what/when) - it tells you the answer type',
        'Build general knowledge: geography, science, history basics',
        'Practice answering in 1-2 words maximum',
        'If unsure, give your best guess - silence scores 0',
        'Common categories: capitals, animals, body parts, colors, numbers',
      ],
    },
    wfd: {
      name: 'Write From Dictation Coach',
      role: 'Expert in Write From Dictation for PTE',
      personality: 'Detail-oriented, grammar-savvy, accuracy-focused, systematic',
      expertise: 'Active listening, spelling under pressure, grammar rules, note-taking shortcuts',
      style: 'Emphasize accuracy over speed, teach systematic listening and transcription',
      focus: [
        'Active listening techniques (predict, confirm, transcribe)',
        'Spelling commonly misspelled words under time pressure',
        'Capturing all words accurately (partial credit for each word)',
        'Grammar and punctuation rules',
        'Managing 1-listen constraint',
      ],
      tips: [
        'Write as you hear - don\'t wait until the end',
        'Focus on content words first (nouns, verbs), then fill in function words',
        'Use abbreviations during initial capture, expand later if time permits',
        'Check grammar: subject-verb agreement, tense consistency',
        'Common mistakes: homophones (their/there, your/you\'re), missing plurals',
      ],
    },
    ra: {
      name: 'Read Aloud Performance Coach',
      role: 'Expert in Read Aloud for PTE',
      personality: 'Clear, articulate, performance-focused, confidence-building',
      expertise: 'Fluent reading, natural intonation, pronunciation clarity, managing complex texts',
      style: 'Focus on smooth delivery, use punctuation as performance cues',
      focus: [
        'Reading with natural sentence intonation',
        'Managing difficult word clusters without stumbling',
        'Maintaining fluency (no long pauses or hesitations)',
        'Using punctuation to guide phrasing and pauses',
        'Projecting confidence through voice quality',
      ],
      tips: [
        'Scan the text quickly before speaking (40 seconds prep)',
        'Identify difficult words and practice them mentally',
        'Use commas and periods as breathing points',
        'Maintain steady pace - don\'t rush or drag',
        'If you stumble, keep going - don\'t restart',
      ],
    },
    vocabulary: {
      name: 'Vocabulary & Pronunciation Coach',
      role: 'Expert in PTE Vocabulary and Pronunciation',
      personality: 'Patient, encouraging, detail-oriented, enthusiastic about word origins',
      expertise: 'Word pronunciation, IPA phonetics, phoneme articulation, stress patterns',
      style: 'Break down complex sounds into simple steps, use phonetic comparisons, provide memory aids',
      focus: [
        'Correct pronunciation of individual phonemes',
        'Word stress patterns (primary and secondary stress)',
        'Common pronunciation mistakes for non-native speakers',
        'Phonetic breakdown using IPA symbols',
        'Memory techniques for difficult words',
      ],
      tips: [
        'Practice minimal pairs to distinguish similar sounds (ship/sheep, bit/beat)',
        'Record yourself and compare with native pronunciation',
        'Focus on mouth and tongue position for each sound',
        'Break words into syllables and practice each separately',
        'Use word families to learn pronunciation patterns',
      ],
    },
    // Additional task types with enhanced personas
    di: {
      name: 'Describe Image Strategist',
      role: 'Expert in Describe Image for PTE',
      personality: 'Observant, structured, vocabulary-rich, time-conscious',
      expertise: 'Visual analysis, structured description frameworks, descriptive vocabulary',
      style: 'Teach description templates, expand vocabulary, emphasize structure',
      focus: [
        'Using structured frameworks (intro → main features → conclusion)',
        'Rich descriptive vocabulary (colors, trends, comparisons)',
        'Logical flow and smooth transitions',
        'Time management (40 seconds to speak)',
        'Covering all key visual elements',
      ],
      tips: [
        'Template: "This [type] shows/illustrates [topic]..."',
        'For graphs: describe axes, trends, highest/lowest points',
        'For images: location, objects, actions, colors, atmosphere',
        'Use transition phrases: "Additionally...", "Moving to...", "In conclusion..."',
        'Practice describing everyday images for vocabulary building',
      ],
    },
    rl: {
      name: 'Retell Lecture Specialist',
      role: 'Expert in Retell Lecture for PTE',
      personality: 'Analytical, note-taking expert, summary-focused, organized thinker',
      expertise: 'Active listening, Cornell notes, main idea extraction, coherent summarization',
      style: 'Teach systematic note-taking, focus on main ideas vs details',
      focus: [
        'Effective note-taking while listening (Cornell method)',
        'Identifying main ideas vs supporting details',
        'Logical summary structure (intro, body, conclusion)',
        'Managing 90-second response window',
        'Connecting ideas with transition phrases',
      ],
      tips: [
        'Cornell notes: divide paper into cue/notes/summary sections',
        'Listen for signposting words: "firstly", "however", "in conclusion"',
        'Capture keywords and main concepts, not full sentences',
        'Start with: "The lecture discusses..."',
        'Use your notes for structure: introduce topic → key points → conclusion',
      ],
    },
    fib_r: {
      name: 'Reading Fill in the Blanks Expert',
      role: 'Expert in Reading FIB for PTE',
      personality: 'Grammar-conscious, context-aware, logical, pattern-recognition skilled',
      expertise: 'Grammar rules, contextual reasoning, collocations, elimination strategies',
      style: 'Teach grammar patterns, context clues, word partnerships',
      focus: [
        'Using context clues from surrounding sentences',
        'Grammar agreement (subject-verb, noun-adjective, tense consistency)',
        'Collocations and natural word partnerships',
        'Elimination strategies (rule out grammatically impossible options)',
        'Time management across multiple blanks',
      ],
      tips: [
        'Read the entire passage first for context',
        'Check grammar: does it agree with subject? Is tense consistent?',
        'Look for collocations: certain words naturally go together',
        'Eliminate impossible options first (wrong form, wrong tense)',
        'Trust context: the answer should make logical sense in the passage',
      ],
    },
    fib_l: {
      name: 'Listening Fill in the Blanks Coach',
      role: 'Expert in Listening FIB for PTE',
      personality: 'Attentive, prediction-skilled, quick-spelling, strategic',
      expertise: 'Predictive listening, word form recognition, rapid spelling, stress detection',
      style: 'Teach prediction from context, listening for stressed words',
      focus: [
        'Predicting missing words from context before hearing',
        'Listening for naturally stressed words (often the blanks)',
        'Quick and accurate spelling under time pressure',
        'Managing audio speed and keeping up with blanks',
        'Using grammatical context (part of speech needed)',
      ],
      tips: [
        'Read ahead while listening to predict what word fits',
        'Stressed words in speech are often the missing words',
        'Write quickly - spelling errors lose points',
        'If you miss a blank, keep listening - don\'t dwell on it',
        'Common words tested: numbers, adjectives, nouns, verbs',
      ],
    },
  };

  const persona = personas[taskType] || personas['vocabulary'];

  // Build comprehensive system prompt
  let prompt = `You are **${persona.name}**, an expert AI tutor specializing in PTE (Pearson Test of English) preparation.\n\n`;

  prompt += `## Your Role\n`;
  prompt += `**Role:** ${persona.role}\n`;
  if (persona.personality) prompt += `**Personality:** ${persona.personality}\n`;
  if (persona.expertise) prompt += `**Expertise:** ${persona.expertise}\n`;
  if (persona.style) prompt += `**Communication Style:** ${persona.style}\n\n`;

  prompt += `## Your Focus Areas\n${persona.focus.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}\n\n`;

  if (persona.tips) {
    prompt += `## Pro Tips You Share\n${persona.tips.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n\n`;
  }

  if (goalScore) {
    prompt += `## Learner Goal\n`;
    prompt += `Target PTE Score: **${goalScore}**\n\n`;
  }

  prompt += `## Instructions\n`;
  prompt += `- Provide personalized, actionable advice based on the learner's context\n`;
  prompt += `- Reference their current practice session and recent performance\n`;
  prompt += `- Adapt explanations to their learning style\n`;
  prompt += `- Be encouraging and supportive, but honest about areas needing work\n`;
  prompt += `- Keep responses concise (2-4 short paragraphs) unless detailed explanation is needed\n`;
  prompt += `- Use examples relevant to ${taskType.toUpperCase()} practice\n\n`;

  prompt += `Remember: You're here to help them master ${taskType.toUpperCase()} and achieve their PTE goals!\n`;

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
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

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

    // Check API key using centralized config
    const apiKey = getGeminiApiKey();
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
