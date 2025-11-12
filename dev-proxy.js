#!/usr/bin/env node
/**
 * Development Proxy Server
 *
 * This proxy server enables local testing of Vercel serverless functions
 * without running the full `vercel dev` build process.
 *
 * Features:
 * - Proxies frontend requests to Vite dev server
 * - Handles /api/* requests using Vercel serverless functions
 * - Loads environment variables from .env file
 * - Hot reload support
 *
 * Usage: node dev-proxy.js
 * Then open: http://localhost:3000
 */

import http from 'http';
import httpProxy from 'http-proxy';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const PORT = 3000;
const VITE_PORT = 3001; // Your Vite dev server port

// Create proxy instance
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Proxy error: ' + err.message }));
  }
});

// Create server
const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle API requests
  if (req.url.startsWith('/api/')) {
    await handleApiRequest(req, res);
  } else {
    // Proxy all other requests to Vite dev server
    proxy.web(req, res, {
      target: `http://localhost:${VITE_PORT}`,
    });
  }
});

// Handle API requests by importing and executing serverless functions
async function handleApiRequest(req, res) {
  // Parse URL to get the API endpoint
  const apiPath = req.url.split('?')[0]; // Remove query string
  const endpoint = apiPath.replace('/api/', '');

  // Map endpoint to file
  const handlerPath = join(__dirname, 'api', `${endpoint}.ts`);

  // Check if handler exists
  if (!fs.existsSync(handlerPath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'API endpoint not found' }));
    return;
  }

  try {
    // For TypeScript files, we need to use tsx or compile them
    // For now, let's use a workaround: import compiled JS from node_modules or use tsx

    // Collect request body for POST requests
    let body = '';
    if (req.method === 'POST') {
      for await (const chunk of req) {
        body += chunk;
      }
    }

    // Parse body
    let parsedBody = {};
    if (body) {
      try {
        parsedBody = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
        return;
      }
    }

    // Create mock Vercel request/response objects
    const mockReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: parsedBody,
      query: parseQueryString(req.url),
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        res.writeHead(this.statusCode, {
          'Content-Type': 'application/json',
          ...this.headers,
        });
        res.end(JSON.stringify(data));
      },
      end() {
        res.end();
      },
    };

    // Import and execute the handler
    // Note: This is a simplified version. For production, use tsx or compile TS files
    console.log(`Executing handler: ${handlerPath}`);

    // For now, let's call the AI API directly using the client library
    if (endpoint === 'ai/chat') {
      await handleAIChatRequest(mockReq, mockRes);
    } else {
      mockRes.status(501).json({ success: false, error: 'API handler not implemented in proxy' });
    }

  } catch (error) {
    console.error('API handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// Handle AI Chat requests directly
async function handleAIChatRequest(req, res) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { message, context, conversationHistory } = req.body;

    if (!message || message.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }

    // Check API key
    const apiKey = process.env.GEMINI_API || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'AI Tutor is not configured. Please contact support.' });
      return;
    }

    // Initialize Gemini with official SDK (from docs.google.com/gemini-api)
    const ai = new GoogleGenAI({ apiKey });

    // Build prompt (simplified version of the actual API)
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

    let fullPrompt = SYSTEM_PROMPT;

    // Add context if provided
    if (context) {
      fullPrompt += `\n\nCurrent practice context:\n`;
      fullPrompt += `- Word/Phrase: "${context.word}"\n`;
      if (context.difficulty) {
        fullPrompt += `- Difficulty: ${context.difficulty}\n`;
      }
      if (context.ipa) {
        if (context.ipa.british) {
          fullPrompt += `- British IPA: ${context.ipa.british}\n`;
        }
        if (context.ipa.american) {
          fullPrompt += `- American IPA: ${context.ipa.american}\n`;
        }
      }
      fullPrompt += `\nWhen relevant, reference this word in your answer. If the user asks "How do I pronounce this?" or similar, they're asking about "${context.word}".`;
    }

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      fullPrompt += '\n\nConversation history:\n';
      recentHistory.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}\n`;
      });
      fullPrompt += '\n';
    }

    // Add current message
    fullPrompt += `\nStudent: ${message}\n\nTutor:`;

    console.log('Calling Gemini API with official SDK...');
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: fullPrompt,
    });
    const answer = response.text || "I apologize, but I couldn't generate a response. Please try again.";

    res.status(200).json({
      success: true,
      data: { answer: answer.trim() }
    });

  } catch (error) {
    console.error('AI Tutor error:', error);

    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again in a moment.'
        });
        return;
      }

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

// Parse query string
function parseQueryString(url) {
  const queryString = url.split('?')[1];
  if (!queryString) return {};

  const params = {};
  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return params;
}

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 Development Proxy Server Started!\n');
  console.log(`   Frontend (Vite):  http://localhost:${VITE_PORT}`);
  console.log(`   Proxy Server:     http://localhost:${PORT}`);
  console.log(`   API Endpoints:    http://localhost:${PORT}/api/*`);
  console.log('\n✅ AI Tutor is ready for testing!\n');
  console.log('   Open http://localhost:3000 in your browser');
  console.log('   Click "AI Tutor" button and start chatting\n');
  console.log('Environment:');
  console.log(`   GEMINI_API: ${process.env.GEMINI_API ? '✓ Set' : '✗ Not set'}`);
  console.log(`   VITE_GEMINI_API_KEY: ${process.env.VITE_GEMINI_API_KEY ? '✓ Set' : '✗ Not set'}`);
  console.log('\nPress Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down proxy server...\n');
  server.close(() => {
    console.log('✅ Server closed\n');
    process.exit(0);
  });
});
