# AI Tutor Chat Setup Guide

This guide walks you through setting up the AI Tutor Chat feature powered by OpenAI GPT-4. The AI Tutor provides conversational pronunciation help, vocabulary explanations, and learning strategies.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [OpenAI Account Setup](#openai-account-setup)
4. [Environment Configuration](#environment-configuration)
5. [Testing the Setup](#testing-the-setup)
6. [Usage Guide](#usage-guide)
7. [Pricing & Cost Management](#pricing--cost-management)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## Overview

### What is AI Tutor Chat?

The AI Tutor Chat is an interactive chatbot that helps users with:
- **Pronunciation guidance** - How to pronounce specific words
- **Vocabulary explanations** - Word meanings and usage
- **IPA notation help** - Understanding phonetic symbols
- **Accent improvement tips** - Strategies for better pronunciation
- **Learning strategies** - Effective practice methods

### Technical Architecture

```
┌─────────────────┐
│  AITutorChat    │  (React Component)
│   Component     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   /api/ai/chat  │  (Vercel Serverless Function)
│    Endpoint     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OpenAI GPT-4   │  (External API)
│      API        │
└─────────────────┘
```

**Key Features:**
- ✅ **Context-aware** - Knows what word you're currently practicing
- ✅ **Conversation history** - Maintains multi-turn dialogue context
- ✅ **Markdown formatting** - Rich text responses with bold, italics, lists
- ✅ **Quick action buttons** - Pre-filled common questions
- ✅ **Session persistence** - Saves conversations for logged-in users
- ✅ **Secure architecture** - API keys never exposed to client

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 16+** installed
- ✅ **npm or yarn** package manager
- ✅ **Active internet connection**
- ✅ **Valid email address** (for OpenAI account)
- ✅ **Payment method** (credit/debit card for OpenAI)

---

## OpenAI Account Setup

### Step 1: Create OpenAI Account

1. Go to [OpenAI Platform](https://platform.openai.com/signup)
2. Click **Sign up** (or **Log in** if you already have an account)
3. Register using:
   - Email + password
   - Google account
   - Microsoft account
4. Verify your email address

### Step 2: Add Payment Method

⚠️ **Important**: OpenAI requires a payment method even for the free tier.

1. Navigate to [Billing Settings](https://platform.openai.com/account/billing/overview)
2. Click **Add payment method**
3. Enter your credit/debit card details
4. Set spending limits (recommended: $10-20/month for moderate usage)

**Recommended Billing Settings:**
```
Monthly spending limit: $20
Email notifications: ON (at 50%, 75%, 90% of limit)
Usage alerts: Enabled
```

### Step 3: Generate API Key

1. Go to [API Keys page](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Give it a descriptive name: `PTE-Pronunciation-Trainer-AI-Tutor`
4. **Copy the key immediately** - You won't be able to see it again!
   - Format: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. Store it securely (we'll add it to `.env` in the next section)

⚠️ **Security Warning**: Never share your API key or commit it to Git!

---

## Environment Configuration

### Step 1: Create `.env` File

If you don't already have a `.env` file in your project root:

```bash
cp .env.example .env
```

### Step 2: Add OpenAI API Key

Open `.env` and update the OpenAI configuration:

```bash
# ============================================
# OpenAI API (for AI Tutor Chat) 🤖 GPT-4
# ============================================
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

**Example:**
```bash
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

### Step 3: Verify Configuration

The AI Tutor Chat API endpoint (`/api/ai/chat.ts`) will automatically:
- ✅ Check for `OPENAI_API_KEY` environment variable
- ✅ Return error if missing: `"OpenAI API key not configured"`
- ✅ Use GPT-4 model for high-quality responses

**No additional configuration needed!** The system uses sensible defaults:
- Model: `gpt-4`
- Temperature: `0.7` (balanced creativity/accuracy)
- Max tokens: `500` (concise responses)
- Conversation history: Last 10 messages

---

## Testing the Setup

### Method 1: Local Development Server

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the app:** Navigate to `http://localhost:5173` (or the port shown in terminal)

3. **Access AI Tutor:**
   - Click the **💬 AI Tutor** button in the header (or bottom-right floating button)
   - The chat dialog should open

4. **Send a test message:**
   ```
   How do I pronounce "ubiquitous"?
   ```

5. **Verify response:**
   - ✅ Should receive a detailed pronunciation guide within 2-5 seconds
   - ✅ Response should include IPA notation and tips
   - ✅ Should be formatted with markdown (bold, italics, etc.)

**Expected Response Format:**
```markdown
Great question! **"Ubiquitous"** is pronounced:

- **British IPA:** /juːˈbɪkwɪtəs/
- **American IPA:** /juːˈbɪkwɪtəs/

**Breakdown:**
1. *ubi-* sounds like "you-bee"
2. *-qui-* sounds like "kwi" (rhymes with "key")
3. *-tous* sounds like "tus"

**Tips:**
- Stress the second syllable: you-**BIK**-wi-tus
- The 'qu' makes a 'kw' sound
- Practice slowly at first, then speed up

Try saying it 5 times slowly!
```

### Method 2: Quick Action Buttons

1. Open AI Tutor Chat
2. You should see 4 quick action buttons:
   - "How do I pronounce this word?"
   - "What does this word mean?"
   - "Give me pronunciation tips"
   - "How can I improve my accent?"
3. Click any button - it should auto-fill and send the question
4. Verify you get a relevant response

### Method 3: Context Awareness Test

1. **Navigate to a vocabulary word** (e.g., from PTE Beginner book)
2. **Click AI Tutor button**
3. **Ask:** "How do I pronounce this word?"
4. **Verify:** The AI should reference the specific word you're viewing

**Example Context-Aware Response:**
```
For the word **"ubiquitous"** that you're currently practicing, here's how to pronounce it...
```

---

## Usage Guide

### Opening AI Tutor Chat

**Two ways to access:**

1. **Header button:** Click 💬 **AI Tutor** in the app header (desktop)
2. **Floating button:** Click the chat bubble icon (bottom-right, mobile)

### Quick Questions (Recommended for Beginners)

When you first open the chat, you'll see 4 quick action buttons:

| Button | Use Case | Example Response |
|--------|----------|------------------|
| **How do I pronounce this word?** | Get IPA breakdown + tips | Syllable-by-syllable guide |
| **What does this word mean?** | Understand vocabulary | Definition + usage examples |
| **Give me pronunciation tips** | Improve accent | Mouth position, common mistakes |
| **How can I improve my accent?** | General strategies | Practice routines, resources |

### Custom Questions

You can ask anything related to pronunciation or vocabulary:

**Good examples:**
- "What's the difference between British and American pronunciation?"
- "How do I make the 'th' sound?"
- "Why is 'ubiquitous' difficult to pronounce?"
- "Can you break down this IPA: /juːˈbɪkwɪtəs/?"
- "How do I practice word stress?"

**What NOT to ask:**
- ❌ Unrelated topics (politics, news, math problems)
- ❌ Very long texts (>500 words)
- ❌ Personal information requests

### Conversation History

**How it works:**
- The last **10 messages** are sent with each new question
- This allows the AI to reference previous answers
- Context is maintained during your session

**Example multi-turn conversation:**
```
You: How do I pronounce "ubiquitous"?
AI: [Detailed pronunciation guide]

You: Can you explain the 'qu' sound more?
AI: [Builds on previous answer about 'qu' specifically]

You: What are other words with the same 'qu' sound?
AI: [Provides related vocabulary like "question", "quiet", etc.]
```

### Best Practices

1. **Be specific:** Instead of "help me", ask "how do I pronounce the 'th' sound?"
2. **One concept per message:** Don't ask 5 questions at once
3. **Use context:** If you're on a word page, just ask "how do I pronounce this?"
4. **Follow up:** Ask for clarification if you don't understand
5. **Practice after:** Don't just read - actually practice what the AI suggests!

---

## Pricing & Cost Management

### OpenAI Pricing (GPT-4)

**Current rates (as of 2025):**
- Input tokens: ~$0.03 per 1,000 tokens
- Output tokens: ~$0.06 per 1,000 tokens

**What's a token?**
- ~1 token = ~4 characters
- "Hello, how are you?" = ~6 tokens
- Average chat message: ~100-200 tokens

### Cost Estimation

**Typical AI Tutor Chat conversation:**
- User question: ~100 tokens ($0.003)
- AI response: ~300 tokens ($0.018)
- **Total per exchange: ~$0.021**

**Monthly usage examples:**

| Usage Level | Conversations/Day | Cost/Day | Cost/Month |
|-------------|-------------------|----------|------------|
| Light       | 3                 | $0.06    | $1.80      |
| Moderate    | 10                | $0.21    | $6.30      |
| Heavy       | 30                | $0.63    | $18.90     |
| Power User  | 100               | $2.10    | $63.00     |

### Cost Optimization Tips

1. **Set spending limits** in OpenAI dashboard ($10-20/month recommended)
2. **Enable usage alerts** (email at 50%, 75%, 90% of limit)
3. **Review usage weekly:** [OpenAI Usage Dashboard](https://platform.openai.com/usage)
4. **Clear conversation history** when starting new topics (reduces context tokens)
5. **Use quick questions** instead of long-form messages when possible
6. **Be concise** in your questions

### Free Tier

⚠️ **Important**: OpenAI **discontinued the free trial** in 2024. You must add a payment method to use the API.

**First-time users** typically get:
- $5-10 free credits (varies by promotion)
- Valid for 3 months
- Perfect for testing the AI Tutor feature

---

## Troubleshooting

### 1. "OpenAI API key not configured"

**Error message:**
```
Sorry, I'm having trouble connecting right now. Please try again later.
```

**Solution:**
1. Check `.env` file exists in project root
2. Verify `OPENAI_API_KEY=sk-proj-...` is set (no quotes, no spaces)
3. Restart development server: `npm run dev`
4. Check browser console for specific error

### 2. "Insufficient quota" or "Rate limit exceeded"

**Error message:**
```
You exceeded your current quota, please check your plan and billing details.
```

**Solutions:**
- **Add payment method** in [OpenAI Billing Settings](https://platform.openai.com/account/billing/overview)
- **Check spending limit** - Increase if needed
- **Review usage** - You may have hit the monthly cap
- **Wait 1 minute** if rate-limited (60 requests/minute default)

### 3. AI Responses are slow (>10 seconds)

**Possible causes:**
- OpenAI API is experiencing high load (check [status.openai.com](https://status.openai.com))
- Long conversation history (system sends last 10 messages for context)
- Network issues

**Solutions:**
1. **Reduce context:** Close and reopen AI Tutor to clear history
2. **Use GPT-3.5-turbo** instead of GPT-4 (edit `/api/ai/chat.ts` line 112):
   ```typescript
   model: 'gpt-3.5-turbo',  // Faster, cheaper ($0.002/1K tokens)
   ```
3. **Check network:** Test with `curl https://api.openai.com/v1/models -H "Authorization: Bearer sk-..."`

### 4. "API returned 401" (Unauthorized)

**Solution:**
- Verify API key is correct (check for typos)
- Ensure key starts with `sk-proj-` or `sk-`
- Regenerate key in [OpenAI API Keys page](https://platform.openai.com/api-keys) if needed

### 5. Conversation history not working

**Symptoms:**
- AI doesn't remember previous messages
- Each response treats question as new conversation

**Solution:**
- This is **normal behavior for non-authenticated users**
- Conversation history is stored in component state (lasts during session only)
- For persistent history, implement Supabase storage (see roadmap)

### 6. "Model not found" error

**Error message:**
```
The model 'gpt-4' does not exist or you do not have access to it.
```

**Solutions:**
1. **Check account type:** GPT-4 requires **paid account** with usage history
2. **Use GPT-3.5-turbo** temporarily (edit `/api/ai/chat.ts`):
   ```typescript
   model: 'gpt-3.5-turbo',
   ```
3. **Wait for access:** New accounts may need $1+ in successful payments before GPT-4 access

---

## Security Best Practices

### 🔒 Protecting Your API Key

**DO:**
- ✅ Store API key in `.env` file (never in source code)
- ✅ Add `.env` to `.gitignore` (should already be there)
- ✅ Use environment variables on hosting platforms (Vercel, Netlify, etc.)
- ✅ Rotate keys periodically (every 3-6 months)
- ✅ Use separate keys for dev/staging/production

**DON'T:**
- ❌ Commit `.env` to Git
- ❌ Share API keys in screenshots, videos, or docs
- ❌ Use same key across multiple projects
- ❌ Expose keys in client-side JavaScript
- ❌ Store keys in browser localStorage or cookies

### Server-Side Only Architecture

Our implementation is **secure by default**:

```typescript
// ✅ CORRECT: API key on server only
// /api/ai/chat.ts (Vercel serverless function)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // Server environment variable
});

// ❌ WRONG: Never do this in client-side code
// src/components/AITutorChat.tsx
const openai = new OpenAI({
  apiKey: 'sk-proj-...'  // EXPOSED TO BROWSER!
});
```

**Why this matters:**
- Client-side code can be inspected in browser DevTools
- Anyone could steal your key and rack up charges
- Server-side code runs on Vercel infrastructure (secure)

### Monitoring & Alerts

**Set up monitoring in OpenAI dashboard:**

1. **Usage alerts:**
   - 50% of monthly limit
   - 75% of monthly limit
   - 90% of monthly limit

2. **Spending limit:**
   - Hard cap (e.g., $20/month)
   - Automatic shutoff when reached

3. **Weekly email reports:**
   - Usage summary
   - Cost breakdown by model
   - Top endpoints

### Incident Response

**If your key is compromised:**

1. **Immediately revoke** the key in [OpenAI API Keys](https://platform.openai.com/api-keys)
2. **Generate a new key**
3. **Update `.env` file** on all environments (dev, staging, prod)
4. **Review usage** in OpenAI dashboard for unauthorized charges
5. **Contact OpenAI support** if you see fraudulent usage
6. **Update billing limits** to prevent future overages

---

## Advanced Configuration

### Customizing AI Behavior

Edit `/api/ai/chat.ts` to customize the AI Tutor:

**1. Change the model:**
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',  // Faster GPT-4 variant
  // OR
  model: 'gpt-3.5-turbo',  // Cheaper, faster, less detailed
  ...
});
```

**2. Adjust response length:**
```typescript
const completion = await openai.chat.completions.create({
  max_tokens: 800,  // Default: 500 (increase for longer responses)
  ...
});
```

**3. Modify creativity:**
```typescript
const completion = await openai.chat.completions.create({
  temperature: 0.5,  // Default: 0.7 (lower = more consistent, higher = more creative)
  ...
});
```

**4. Edit system prompt:**
```typescript
const SYSTEM_PROMPT = `You are an expert PTE pronunciation tutor...
[Add your customizations here]
`;
```

### Adding Features

**Save conversation history to Supabase:**

1. Create a `conversations` table in Supabase:
   ```sql
   CREATE TABLE conversations (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users,
     message TEXT NOT NULL,
     response TEXT NOT NULL,
     context JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. Uncomment the `saveConversation()` function in `/api/ai/chat.ts`

3. Update `AITutorChat.tsx` to pass `userId` from Zustand auth store

---

## Deployment

### Vercel (Recommended)

1. **Add environment variable** in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add `OPENAI_API_KEY` = `sk-proj-your-key-here`
   - Save

2. **Deploy:**
   ```bash
   npm run vercel-build
   vercel --prod
   ```

3. **Verify:** Open your production URL and test AI Tutor Chat

### Netlify

1. **Add environment variable:**
   - Site Settings > Environment Variables
   - `OPENAI_API_KEY` = `sk-proj-your-key-here`

2. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

### Other Platforms

Ensure your hosting platform:
- ✅ Supports **serverless functions** (required for `/api/ai/chat.ts`)
- ✅ Allows **environment variables** (for API key)
- ✅ Has **Node.js 16+** runtime

---

## FAQ

### Q: Is GPT-4 required, or can I use GPT-3.5?

**A:** You can use GPT-3.5-turbo, but responses will be less detailed. GPT-4 provides:
- Better pronunciation explanations
- More accurate IPA breakdowns
- Contextual understanding of PTE exam needs

To switch, edit `/api/ai/chat.ts` line 112: `model: 'gpt-3.5-turbo'`

### Q: How much does this cost per month?

**A:** Depends on usage:
- **Light (3 chats/day):** ~$2-3/month
- **Moderate (10 chats/day):** ~$6-8/month
- **Heavy (30+ chats/day):** ~$20-30/month

Set a spending limit to control costs!

### Q: Can I self-host to avoid OpenAI costs?

**A:** Yes, you can use **open-source LLMs** like:
- **Llama 3** (Meta) - Self-hosted via Ollama
- **Mistral** - Free API or self-hosted
- **GPT4All** - Fully local

This requires significant setup (GPU server, model hosting). For most users, OpenAI is more cost-effective.

### Q: Does conversation history work offline?

**A:** No, the AI Tutor requires an internet connection to call OpenAI API. However:
- Conversation history is stored in React state (works during session)
- For logged-in users, we can add Supabase persistence (see roadmap)

### Q: Can I limit AI responses to pronunciation only?

**A:** Yes! Edit the system prompt in `/api/ai/chat.ts`:

```typescript
const SYSTEM_PROMPT = `You are a pronunciation-focused assistant.

STRICT RULES:
- ONLY answer questions about pronunciation, IPA, and phonetics
- If asked about other topics, respond: "I can only help with pronunciation. Please ask about how to pronounce words or understand IPA notation."
- Keep responses under 200 words

...
`;
```

### Q: How do I disable AI Tutor Chat completely?

**Option 1:** Remove the button from UI:
- Edit `src/App.tsx` or relevant component
- Comment out `<AITutorChat />` component

**Option 2:** Add feature flag:
```typescript
// .env
VITE_AI_TUTOR_ENABLED=false

// src/components/AITutorChat.tsx
const isEnabled = import.meta.env.VITE_AI_TUTOR_ENABLED === 'true';
if (!isEnabled) return null;
```

---

## Resources

### Official Documentation
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [GPT-4 Model Details](https://platform.openai.com/docs/models/gpt-4)
- [OpenAI Pricing](https://openai.com/pricing)
- [OpenAI Status Page](https://status.openai.com)

### Learning Resources
- [OpenAI Cookbook](https://cookbook.openai.com) - Code examples
- [Prompt Engineering Guide](https://www.promptingguide.ai) - Writing better prompts
- [LangChain](https://www.langchain.com) - Advanced AI app framework

### Community
- [OpenAI Community Forum](https://community.openai.com)
- [r/OpenAI](https://reddit.com/r/OpenAI) - Reddit community
- [OpenAI Discord](https://discord.gg/openai) - Real-time help

---

## Changelog

- **v1.0.0** (2025-11-10) - Initial AI Tutor Chat implementation
  - GPT-4 integration
  - Context-aware prompts
  - Conversation history support
  - Markdown rendering
  - Quick action buttons

---

## Support

Need help? Try these resources:

1. **Troubleshooting section** in this guide (most common issues)
2. **Check OpenAI status:** [status.openai.com](https://status.openai.com)
3. **GitHub Issues:** Report bugs at [github.com/your-repo/issues](https://github.com)
4. **OpenAI Support:** [help.openai.com](https://help.openai.com)

---

**🎉 Congratulations!** You've successfully set up AI Tutor Chat. Start asking pronunciation questions and improve your English skills!
