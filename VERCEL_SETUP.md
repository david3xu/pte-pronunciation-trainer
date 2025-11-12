# Vercel Deployment Setup

This guide explains how to deploy the PTE Pronunciation Trainer to Vercel with AI Tutor enabled.

## Prerequisites

- GitHub account
- Vercel account (free tier is fine)
- Google Gemini API key (get free at https://aistudio.google.com/apikey)

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Setup AI Tutor with Gemini API"
git push origin claude/incomplete-description-011CV35Zb4tySmnoS5mf2NyQ
```

## Step 2: Connect to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository: `david3xu/ccl-pronunciation-trainer`
3. Select the branch: `claude/incomplete-description-011CV35Zb4tySmnoS5mf2NyQ` (or merge to main first)

## Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

### Required for AI Tutor:
```
GEMINI_API_KEY=your-gemini-api-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

**Note**: Replace `your-gemini-api-key-here` with your actual API key from https://aistudio.google.com/apikey

### Optional (for other features):
```
VITE_APP_VERSION=3.0.0
VITE_APP_NAME=PTE Pronunciation Trainer
NODE_ENV=production
```

## Step 4: Deploy

Click "Deploy" - Vercel will:
1. Run `npm run vercel-build` (processes data + builds app)
2. Deploy the `dist/` folder
3. Set up the `/api/*` serverless functions

## Step 5: Test AI Tutor

After deployment:
1. Open your Vercel deployment URL
2. Click "AI Tutor" button in header
3. Type a message like "How do I pronounce 'obscure'?"
4. You should get an AI response!

## Troubleshooting

### AI Tutor returns error
- Check that `GEMINI_API_KEY` is set in Vercel environment variables
- Redeploy after adding env vars (Settings → Deployments → Redeploy)

### API endpoint not found
- Ensure `api/ai/chat.ts` exists in your repo
- Check Vercel Functions logs

### Quota exceeded
- Gemini free tier: 1,500 requests/day, 60 requests/minute
- Check usage at: https://aistudio.google.com/app/apikey

## API Endpoints

- **AI Tutor**: `/api/ai/chat` (POST)
- **Pronunciation Scoring**: `/api/pronunciation-score` (POST)
- **AI Recommendations**: `/api/ai-recommendations` (POST)

All AI endpoints use the same Gemini API key.

## Free Tier Limits

Google Gemini 1.5 Flash (100% FREE):
- ✅ 1,500 requests per day
- ✅ 60 requests per minute
- ✅ No credit card required
- ✅ Unlimited words/tokens per request

Perfect for personal use and small teams!
