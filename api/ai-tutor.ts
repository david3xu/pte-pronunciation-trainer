/**
 * AI Tutor Chatbot API Route (Vercel Serverless Function)
 *
 * Conversational AI assistant for pronunciation help and learning guidance.
 * Uses OpenAI GPT-4 for natural language understanding and responses.
 *
 * Endpoint: /api/ai-tutor
 * Method: POST
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface RequestBody {
  question: string;
  context?: {
    word?: string;
    difficulty?: string;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
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
    const { question, context, conversationHistory }: RequestBody = req.body;

    // Validate request
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question is required',
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured - returning mock response');
      return res.status(200).json({
        success: true,
        data: {
          answer: getMockResponse(question, context),
        },
      });
    }

    // Build system prompt
    const systemPrompt = `You are a friendly and knowledgeable PTE (Pearson Test of English) pronunciation tutor and language learning assistant.

Your role:
- Help users understand pronunciation (IPA, phonetics, stress patterns)
- Explain difficult vocabulary words
- Provide learning tips and strategies
- Give encouragement and motivation
- Answer questions about PTE exam preparation

Guidelines:
- Be conversational and friendly
- Use simple explanations
- Provide specific examples
- Include IPA notation when relevant
- Be encouraging and positive
- Keep responses concise (2-3 paragraphs max)

${context?.word ? `Current word context: "${context.word}" (${context.difficulty || 'normal'} difficulty)` : ''}`;

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      // Limit history to last 10 messages to avoid token limits
      const recentHistory = conversationHistory.slice(-10);
      messages.push(...recentHistory);
    }

    // Add current question
    messages.push({
      role: 'user',
      content: question,
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract response
    const answer = completion.choices[0].message.content || 'I apologize, but I couldn\'t generate a response. Please try again.';

    // Return successful response
    return res.status(200).json({
      success: true,
      data: {
        answer,
      },
    });
  } catch (error: any) {
    console.error('AI Tutor error:', error);

    // Fallback to mock response on error
    const mockAnswer = getMockResponse(
      req.body.question,
      req.body.context
    );

    return res.status(200).json({
      success: true,
      data: {
        answer: mockAnswer,
      },
      warning: 'Using fallback response due to API error',
    });
  }
}

/**
 * Generate mock response when OpenAI is unavailable
 */
function getMockResponse(question: string, context?: { word?: string; difficulty?: string }): string {
  const questionLower = question.toLowerCase();

  // Pronunciation questions
  if (questionLower.includes('pronounce') || questionLower.includes('pronunciation')) {
    if (context?.word) {
      return `Great question about pronouncing "${context.word}"!

Here are some tips:
1. Break it down into syllables and practice each part slowly
2. Pay attention to the stress pattern (which syllable is emphasized)
3. Listen to the audio multiple times before attempting
4. Record yourself and compare with the original

For ${context.difficulty || 'normal'} difficulty words like this, repetition is key. Try practicing 5-10 times until it feels natural.

Would you like specific guidance on any particular sound in this word?`;
    }

    return `Pronunciation tips:

1. **Listen first**: Always listen to the correct pronunciation multiple times before speaking
2. **Break it down**: Divide words into syllables and practice each separately
3. **Stress matters**: Pay attention to which syllable is stressed
4. **IPA is your friend**: Learn to read IPA notation for accurate pronunciation
5. **Record yourself**: Compare your pronunciation with the original

Practice regularly, and don't be afraid to repeat words many times. Muscle memory is important for pronunciation!`;
  }

  // Meaning/definition questions
  if (questionLower.includes('mean') || questionLower.includes('definition')) {
    if (context?.word) {
      return `I'd be happy to explain "${context.word}"!

This is a ${context.difficulty || 'normal'} difficulty word commonly used in academic English and the PTE exam.

To understand it better:
1. Look at the word in context
2. Break it down into root words or prefixes/suffixes
3. Practice using it in sentences

Would you like me to suggest some example sentences using this word?`;
    }

    return `Understanding vocabulary is crucial for PTE success!

Here's my approach:
1. **Context is key**: Always learn words in context, not isolation
2. **Use it**: Try to use new words in sentences
3. **Association**: Connect new words to words you already know
4. **Repetition**: Review words regularly (spaced repetition works!)

What specific word would you like help with?`;
  }

  // Improvement/tips questions
  if (questionLower.includes('improve') || questionLower.includes('better') || questionLower.includes('tips')) {
    return `Here are my top tips for improving your pronunciation:

**Practice Strategies:**
1. **Daily practice**: Even 10-15 minutes daily is better than occasional long sessions
2. **Active listening**: Listen carefully to native speakers and try to imitate
3. **Record yourself**: Compare your pronunciation with native speakers
4. **Focus on trouble sounds**: Identify your weak points and practice them specifically

**PTE-Specific Tips:**
1. **Clarity over perfection**: PTE values clear, understandable pronunciation
2. **Natural pace**: Don't speak too fast or too slow
3. **Stress patterns**: English relies heavily on word stress - practice this!
4. **Linking words**: Practice connecting words smoothly

Keep practicing consistently, and you'll see improvement! What specific aspect would you like to work on?`;
  }

  // Accent questions
  if (questionLower.includes('accent')) {
    return `Great question about accents!

**Key Points:**
1. **Accent is okay**: PTE doesn't require a specific accent (British, American, Australian all work)
2. **Clarity matters**: Focus on being clear and understandable
3. **Consistency**: Be consistent with your pronunciation choices
4. **Natural rhythm**: Practice the natural rhythm and intonation of English

**Tips for accent improvement:**
- Listen to different English accents
- Choose one accent to model (British or American)
- Practice with native content (podcasts, videos)
- Don't worry about perfect native-like accent - clear communication is the goal!

Remember: The goal is clear, confident communication, not perfect mimicry of a native accent.`;
  }

  // General/default response
  return `That's an interesting question about pronunciation and language learning!

I'm here to help you with:
- Understanding pronunciation (IPA, stress patterns, etc.)
- Explaining difficult vocabulary
- Providing learning strategies
- Answering PTE-specific questions
- Giving encouragement and tips

${context?.word ? `I notice you're currently working on "${context.word}". ` : ''}Could you be more specific about what you'd like to know? For example:
- How to pronounce a specific word or sound
- Meaning of a vocabulary term
- Tips for improving your accent
- Strategies for PTE preparation

I'm here to help!`;
}
