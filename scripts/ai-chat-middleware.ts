import { IncomingMessage, ServerResponse } from 'http';

/**
 * Helper to handle AI Chat requests in Vite Dev Server
 *
 * This middleware mimics the production serverless function behavior
 * for local development.
 */
export function aiChatMiddleware(req: IncomingMessage, res: ServerResponse, next: (err?: any) => void, env: Record<string, string>) {
  if (req.url !== '/api/ai/chat' || req.method !== 'POST') {
    return next();
  }

  let body = '';
  req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { message, context, conversationHistory } = JSON.parse(body);

      // Dynamic import to avoid build issues if package is missing
      const { GoogleGenAI } = await import('@google/genai');

      // Get API key from env object passed from loadEnv (server-side only)
      const apiKey = env['GEMINI_API_KEY'];

      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'AI Tutor is not configured. Missing API Key.' }));
        return;
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
        fullPrompt += '\n\nHistory:\n' + conversationHistory.slice(-5).map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
        ).join('\n');
      }

      fullPrompt += `\n\nStudent: ${message}\n\nTutor:`;

      // Use streaming API
      const result = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        // @ts-ignore - The SDK types might be mismatching with the dynamic import
        for await (const chunk of result) {
          // @ts-ignore - Handling potential property vs method mismatch
          const chunkText = typeof chunk.text === 'function' ? chunk.text() : chunk.text;
          if (chunkText) {
            // Send chunk as SSE data
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
        }
        // Signal end of stream
        res.write('data: [DONE]\n\n');
      } catch (streamError) {
        console.error('Error during streaming:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      } finally {
        res.end();
      }

    } catch (error: any) {
      console.error('AI Middleware Error:', error);
      // If headers haven't been sent, send JSON error
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: error.message }));
      } else {
        // If streaming started, send error event
        res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
        res.end();
      }
    }
  });
}
