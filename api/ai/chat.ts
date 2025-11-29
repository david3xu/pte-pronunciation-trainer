import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, context, conversationHistory } = await req.json();

    const apiKey = process.env.GEMINI_API || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'AI Tutor is not configured. Missing API Key.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // System prompt
    const SYSTEM_PROMPT = `You are an expert PTE pronunciation tutor.
Your role is to help students with pronunciation, IPA, and vocabulary.
Be encouraging, clear, and concise. Use bold for key terms.`;

    let fullPrompt = SYSTEM_PROMPT;

    if (context) {
      fullPrompt += `\n\nContext: Word "${context.word}"`;
      if (context.difficulty) fullPrompt += `, Difficulty: ${context.difficulty}`;
    }

    if (conversationHistory?.length) {
      fullPrompt += '\n\nHistory:\n' + conversationHistory.slice(-5).map((m: any) =>
        `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
      ).join('\n');
    }

    fullPrompt += `\n\nStudent: ${message}\n\nTutor:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    const answer = response.text || "I couldn't generate a response.";

    return new Response(JSON.stringify({ success: true, data: { answer } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
