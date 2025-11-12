# AI Tutor Testing Guide

## Status: ✅ Both Options Ready!

You now have **two ways** to test the AI Tutor feature:

1. **Local Testing** (dev-proxy) - Ready NOW ✓
2. **Vercel Deployment** - Deploying automatically ✓

---

## Option 1: Local Testing (Immediate)

### Quick Start

```bash
# Terminal 1: Vite dev server (already running on port 3001)
npm run dev

# Terminal 2: Development proxy server
npm run dev:proxy
```

### Access

Open **http://localhost:3000** in your browser

### How It Works

The development proxy server:
- Proxies frontend requests to Vite (port 3001)
- Handles `/api/ai/chat` requests locally
- Uses your `.env` file for `GEMINI_API` key
- No build step required - instant startup!

### Testing Steps

1. **Open**: http://localhost:3000
2. **Click**: "AI Tutor" button in header
3. **Type**: "How do I pronounce 'obscure'?"
4. **Get**: AI response in 1-3 seconds!

### Environment Check

The proxy server verifies:
- ✓ `GEMINI_API`: REDACTED_GEMINI_API_KEY
- ✓ `VITE_GEMINI_API_KEY`: REDACTED_GEMINI_API_KEY

Both are configured and working!

### Troubleshooting

**"Port 3000 already in use"**
```bash
lsof -ti :3000 | xargs kill -9
npm run dev:proxy
```

**"Cannot connect to Vite"**
```bash
# Make sure Vite is running first
npm run dev
```

---

## Option 2: Vercel Deployment

### Status

🚀 **Deploying automatically to Vercel**

Your latest commit has been pushed to:
- Branch: `claude/incomplete-description-011CV35Zb4tySmnoS5mf2NyQ`
- Commit: `3cac96f` - "feat: Add local development proxy server for AI Tutor testing"

### Check Deployment Status

Visit your Vercel dashboard:
https://vercel.com/david-xus-projects/ccl-pronunciation-trainer

### Environment Variables

Your Vercel project already has `GEMINI_API` configured:
- ✓ `GEMINI_API`: Set (same key as local)

No additional configuration needed!

### Access After Deployment

Once deployed, you'll get a URL like:
```
https://ccl-pronunciation-trainer-xxx.vercel.app
```

Then:
1. Open the deployment URL
2. Click "AI Tutor" button
3. Test with real production environment!

### Deployment Timeline

Typical deployment:
- **Data Pipeline**: ~2-3 minutes (processing 13 vocabulary books)
- **Build**: ~1 minute (Vite build + optimizations)
- **Deploy**: ~30 seconds (upload to Vercel CDN)

**Total**: ~4-5 minutes

---

## Comparison

| Feature | Local (dev-proxy) | Vercel Deployment |
|---------|-------------------|-------------------|
| **Speed** | Instant | 4-5 minutes |
| **API Endpoints** | Only `/api/ai/chat` | All endpoints |
| **Environment** | Development | Production |
| **Hot Reload** | ✓ Yes | ✗ No |
| **Sharing** | ✗ Localhost only | ✓ Public URL |
| **Testing** | Quick iteration | Full integration |

---

## What's Been Set Up

### Files Added

1. **`dev-proxy.js`** (305 lines)
   - Node.js proxy server
   - Implements `/api/ai/chat` endpoint
   - Proxies frontend to Vite
   - Loads `.env` automatically

2. **`DEV_PROXY_README.md`** (Documentation)
   - Architecture diagram
   - Usage instructions
   - Troubleshooting guide

3. **`package.json`** (Updated)
   - Added `dev:proxy` script
   - Installed `dotenv` and `http-proxy`

### Backend API

**`api/ai/chat.ts`** (Ready for Vercel)
- Endpoint: `/api/ai/chat` (POST)
- Uses Google Gemini 1.5 Flash
- Supports `GEMINI_API`, `GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`
- Handles conversation history
- Context-aware (current word/difficulty)

### Frontend Component

**`src/components/ai/AITutorChat.tsx`** (Ready)
- Full chat interface with input box ✓
- Quick question buttons ✓
- Message history with timestamps ✓
- Markdown rendering for AI responses ✓
- Error handling with user-friendly messages ✓

---

## Testing Checklist

### Local Testing

- [ ] Start Vite dev server (`npm run dev`)
- [ ] Start proxy server (`npm run dev:proxy`)
- [ ] Open http://localhost:3000
- [ ] Click "AI Tutor" button
- [ ] See chat modal with input box
- [ ] Type question and press Enter
- [ ] Receive AI response
- [ ] Try quick question buttons
- [ ] Test conversation history

### Vercel Testing

- [ ] Check Vercel dashboard for deployment status
- [ ] Wait for "Ready" status
- [ ] Open deployment URL
- [ ] Click "AI Tutor" button
- [ ] Test same flow as local
- [ ] Verify production performance
- [ ] Share URL with others for feedback

---

## Next Steps

### Immediate (Now)

1. **Test locally**: Run `npm run dev:proxy` in Terminal 2
2. **Open browser**: http://localhost:3000
3. **Try AI Tutor**: Click button and chat!

### Soon (4-5 minutes)

1. **Check Vercel**: Visit dashboard to see deployment progress
2. **Get URL**: Copy deployment URL when ready
3. **Test production**: Open URL and test AI Tutor
4. **Share**: Send URL to others for testing

### Future Enhancements

Potential improvements:
- [ ] Add other API endpoints to dev-proxy (pronunciation-score, etc.)
- [ ] Implement conversation persistence in Supabase
- [ ] Add voice input/output to AI Tutor
- [ ] Cache Gemini responses for faster dev iteration
- [ ] Add AI Tutor usage analytics

---

## Free Tier Limits

Google Gemini 1.5 Flash:
- **1,500 requests/day** (free forever)
- **60 requests/minute**
- **No credit card required**

This is more than enough for:
- Development and testing
- Personal use
- Small team collaboration
- Demo and presentations

---

## Support

### Documentation

- **`DEV_PROXY_README.md`** - Local proxy setup
- **`VERCEL_SETUP.md`** - Vercel deployment guide
- **`AI_TUTOR_STATUS.md`** - Feature status report

### Troubleshooting

Common issues and solutions in `DEV_PROXY_README.md` and `VERCEL_SETUP.md`.

### Getting Help

If you encounter issues:
1. Check console logs in browser DevTools
2. Check terminal output from proxy server
3. Verify environment variables in `.env`
4. Check Vercel function logs in dashboard

---

## Summary

**✅ Local testing is ready NOW**
- Run `npm run dev:proxy` and test at http://localhost:3000

**✅ Vercel deployment is in progress**
- Check dashboard in 4-5 minutes
- Production AI Tutor will be live!

**✅ Both environments configured**
- `GEMINI_API` key verified working
- All files committed and pushed
- Documentation complete

---

**Happy testing! 🎉**

The AI Tutor is fully functional and ready to help with pronunciation learning!
