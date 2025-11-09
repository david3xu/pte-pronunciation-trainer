# Google Gemini AI Setup Guide

This guide shows you how to set up **Google Gemini AI** for AI-powered learning recommendations in the PTE Pronunciation Trainer.

## Why Gemini?

✅ **Completely FREE** - 1500 requests/day
✅ **No credit card required**
✅ **High quality** - Comparable to GPT-4
✅ **Fast** - Similar speed to OpenAI
✅ **Easy setup** - Just one API key

---

## Step 1: Get Your Free Gemini API Key

### 1.1 Visit Google AI Studio

Go to: **https://aistudio.google.com/app/apikey**

### 1.2 Sign in with Google

- Use any Google account (personal or work)
- No payment information needed

### 1.3 Create API Key

1. Click **"Get API key"** or **"Create API key"**
2. Select **"Create API key in new project"** (recommended)
3. Copy your API key (starts with `AI...`)

⚠️ **Important**: Save this key somewhere safe. You won't be able to see it again!

---

## Step 2: Add API Key to Your Project

### For Local Development

1. Open `.env` file in your project root (or create it from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=AIza...your-api-key-here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: Your Gemini API key (starts with `AIza...`)
   - **Environments**: Check all (Production, Preview, Development)
4. Click **Save**
5. Redeploy your project

---

## Step 3: Verify It Works

### Test Locally

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173 in your browser

3. Sign in to your account

4. Look for the **"AI Recommendations"** panel in the sidebar

5. You should see:
   - "Analyzing your progress with AI..." while loading
   - Personalized recommendations based on your practice data
   - "Powered by Google Gemini AI • Free Tier" at the bottom

### Test on Vercel

1. Deploy to Vercel (or wait for auto-deployment)

2. Visit your deployed site

3. Sign in and check the AI Recommendations panel

---

## Free Tier Limits

| Feature | Limit |
|---------|-------|
| Requests per Day | 1,500 |
| Requests per Minute | 60 |
| Max Tokens per Request | 30,000 |
| Cost | **FREE** |

**For most users**: These limits are more than enough! Each recommendation request uses ~500-1000 tokens.

**Example calculation**:
- Average user: 10 recommendation requests/day
- Token usage: 10 requests × 800 tokens = 8,000 tokens/day
- **Well within limits!** 🎉

---

## Troubleshooting

### Error: "API key not set"

**Solution**: Make sure `VITE_GEMINI_API_KEY` is in your `.env` file or Vercel environment variables.

### Error: "Invalid API key"

**Solution**:
1. Check your API key starts with `AIza`
2. Make sure you copied the entire key
3. Try generating a new API key

### Error: "Quota exceeded"

**Solution**:
- You've hit the free tier limit (1,500 requests/day or 60/minute)
- Wait a few hours or until tomorrow
- App will show fallback recommendations automatically

### Recommendations not showing

**Solution**:
1. Make sure you're signed in
2. Complete at least 5-10 practice items first
3. Check browser console (F12) for errors
4. Click the refresh button (↻) in the AI Recommendations panel

---

## Security Best Practices

### ✅ DO:
- Keep your API key private
- Add `.env` to `.gitignore` (already done)
- Use Vercel environment variables for production
- Rotate your key if it's exposed

### ❌ DON'T:
- Commit `.env` file to git
- Share your API key publicly
- Use the same key across multiple projects (create separate keys)

---

## Alternative: OpenAI (Optional)

If you prefer to use OpenAI instead of Gemini:

1. Get an OpenAI API key: https://platform.openai.com/api-keys
2. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Update `src/ts/ai/recommendationService.ts` to use OpenAI instead

**Note**: OpenAI is **not free** (paid tier required).

---

## Need Help?

- **Gemini Documentation**: https://ai.google.dev/docs
- **API Key Management**: https://aistudio.google.com/app/apikey
- **Issues**: Open an issue on GitHub

---

## Summary

1. ✅ Get free Gemini API key: https://aistudio.google.com/app/apikey
2. ✅ Add to `.env`: `VITE_GEMINI_API_KEY=your-key`
3. ✅ Add to Vercel environment variables
4. ✅ Test locally and on production
5. ✅ Enjoy AI-powered recommendations!

**Cost**: $0.00 forever (within free tier limits) 🎉
