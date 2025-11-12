# Development Proxy Server

This directory contains a local development proxy server that enables testing of Vercel serverless functions without running the full `vercel dev` build process.

## Quick Start

```bash
# Terminal 1: Start Vite dev server (if not already running)
npm run dev

# Terminal 2: Start the proxy server
npm run dev:proxy
```

Then open **http://localhost:3000** in your browser.

## What It Does

The development proxy (`dev-proxy.js`) provides:

1. **Frontend Proxying**: Forwards all non-API requests to Vite dev server (port 3001)
2. **API Handling**: Implements `/api/ai/chat` endpoint locally using the same logic as the Vercel function
3. **Environment Variables**: Loads `.env` file automatically for API keys
4. **Hot Reload**: Works with Vite's HMR for frontend changes

## Architecture

```
Browser Request → http://localhost:3000
                    ↓
            Development Proxy
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
    /api/chat             /assets/*
    (Local Handler)       (Proxy to Vite)
         ↓                     ↓
    Google Gemini         http://localhost:3001
```

## Endpoints

- **Frontend**: http://localhost:3000 → Proxied to Vite (port 3001)
- **AI Chat API**: http://localhost:3000/api/ai/chat → Local handler with Gemini API
- **Other APIs**: Not yet implemented (returns 501)

## Environment Variables

The proxy server reads from `.env` file and supports:

- `GEMINI_API` (recommended for Vercel compatibility)
- `GEMINI_API_KEY` (fallback)
- `VITE_GEMINI_API_KEY` (fallback)

## Testing AI Tutor Locally

1. Start both servers (see Quick Start above)
2. Open http://localhost:3000
3. Click "AI Tutor" button in the header
4. Type a message like "How do I pronounce 'obscure'?"
5. Get AI response from Gemini!

## Limitations

- Only `/api/ai/chat` is implemented
- Other API endpoints (pronunciation-score, ai-recommendations, etc.) return 501
- No TypeScript compilation (uses JavaScript implementation)
- Simpler error handling than production

## When to Use

**Use dev-proxy when:**
- You want to test AI Tutor features locally
- You don't want to wait for full `vercel dev` build
- You're iterating quickly on frontend + AI chat

**Use vercel dev when:**
- You need all API endpoints
- You're testing deployment configuration
- You want exact production behavior

**Use Vercel deployment when:**
- You want to share with others
- You need production performance
- You're testing with real users

## Troubleshooting

### "Port 3000 already in use"
```bash
# Kill processes on port 3000
lsof -ti :3000 | xargs kill -9

# Or change PORT in dev-proxy.js line 22
```

### "Cannot find module 'dotenv'"
```bash
npm install dotenv http-proxy
```

### "API key not configured"
Check that `.env` file exists and contains:
```env
GEMINI_API=your-api-key-here
```

### "Connection refused to localhost:3001"
Make sure Vite dev server is running:
```bash
npm run dev
```

## Files

- `dev-proxy.js` - Proxy server implementation
- `package.json` - Added `dev:proxy` script
- `.env` - Environment variables (not committed)

## Performance

- Startup: ~2 seconds
- AI Response: 1-3 seconds (depends on Gemini API)
- Frontend HMR: Instant (proxied from Vite)

## Future Enhancements

Potential improvements for the dev proxy:

- [ ] Implement other API endpoints (pronunciation-score, etc.)
- [ ] Add request logging/debugging
- [ ] Support WebSocket for real-time features
- [ ] Cache Gemini responses for faster iteration
- [ ] TypeScript support via tsx or esbuild

---

**Note**: This is a development tool only. Production deployments use Vercel's native serverless functions.
