# AWS Polly Setup Guide

**Premium Text-to-Speech with Neural Voices**

This guide explains how to set up AWS Polly for premium neural voice synthesis in the PTE Pronunciation Trainer.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create AWS Account](#step-1-create-aws-account)
4. [Step 2: Create IAM User](#step-2-create-iam-user)
5. [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
6. [Step 4: Verify Setup](#step-4-verify-setup)
7. [Pricing & Usage](#pricing--usage)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### What is AWS Polly?

AWS Polly is a cloud service that converts text into lifelike speech using deep learning. It offers high-quality neural voices that sound natural and realistic.

### Benefits

- ✅ **Better Quality** - Neural voices sound like real humans
- ✅ **SSML Support** - Control emphasis, pauses, pitch, and rate
- ✅ **Consistent** - Same quality across all browsers and devices
- ✅ **Multiple Accents** - US, UK, Australian, Indian English
- ✅ **Caching** - Generated audio is cached in Supabase Storage
- ✅ **Reliable** - 99.9% uptime SLA from AWS

### Pricing

| Tier | Price | Free Tier |
|------|-------|-----------|
| **Neural Voices** | $16.00 per 1 million characters | 1M chars/month (first 12 months) |
| **Standard Voices** | $4.00 per 1 million characters | 5M chars/month (first 12 months) |

**Estimated costs for this app:**
- 1,000 users practicing 50 words/day = ~$10-20/month
- Free tier covers: ~20,000 words/day
- Caching reduces actual API calls by 80-90%

---

## 📝 Prerequisites

Before starting, ensure you have:

1. ✅ An email address
2. ✅ A payment method (credit card) - Required even for free tier
3. ✅ Access to your project's environment variables
4. ✅ Supabase project (for audio caching - optional but recommended)

---

## 🔑 Step 1: Create AWS Account

### 1.1 Sign Up for AWS

1. Go to [https://aws.amazon.com](https://aws.amazon.com)
2. Click **Create an AWS Account**
3. Enter your email and choose a password
4. Select **Personal** account type
5. Enter your contact information
6. **Add payment method** (credit card required)
7. Verify your identity (phone verification)
8. Choose **Free tier** support plan
9. Complete registration

**Note:** Even with free tier, AWS requires a payment method for verification.

### 1.2 Sign In to AWS Console

1. Go to [https://console.aws.amazon.com](https://console.aws.amazon.com)
2. Sign in with your new credentials
3. You should see the AWS Management Console

---

## 👤 Step 2: Create IAM User

**Why?** Never use root account credentials in your application. IAM users provide secure, limited access.

### 2.1 Open IAM Console

1. In AWS Console, search for **IAM** in the top search bar
2. Click **IAM** (Identity and Access Management)

### 2.2 Create New User

1. Click **Users** in the left sidebar
2. Click **Create user** button
3. Enter username: `pte-polly-user` (or any name you prefer)
4. Check **Provide user access to the AWS Management Console - optional** (only if you want console access)
5. Click **Next**

### 2.3 Set Permissions

**Option A: Attach Policy Directly (Recommended)**

1. Select **Attach policies directly**
2. Search for `Polly`
3. Check **AmazonPollyFullAccess**
4. Click **Next**
5. Review and click **Create user**

**Option B: Custom Policy (More Secure)**

1. Click **Create policy**
2. Select **JSON** tab
3. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech",
        "polly:DescribeVoices"
      ],
      "Resource": "*"
    }
  ]
}
```

4. Click **Next**, name it `PTEPollyPolicy`
5. Click **Create policy**
6. Go back to user creation, select this policy

### 2.4 Create Access Keys

1. After creating the user, click on the user name
2. Go to **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next**
7. (Optional) Add description: "PTE Pronunciation Trainer"
8. Click **Create access key**

**⚠️ IMPORTANT:** You'll see two values:
- **Access Key ID**: `AKIA...` (20 characters)
- **Secret Access Key**: `wJalrXUtn...` (40 characters)

**Save these immediately!** You won't be able to see the secret key again.

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1 Local Development

1. Open your project's `.env` file (create if it doesn't exist)
2. Add the following variables:

```bash
# ============================================
# AWS Polly Configuration
# ============================================
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1

# Enable premium TTS UI (client-side)
VITE_PREMIUM_TTS_ENABLED=true
```

3. **Replace** `AKIAIOSFODNN7EXAMPLE` with your actual Access Key ID
4. **Replace** `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` with your actual Secret Access Key

### 3.2 Vercel Production

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` (your key) | Production, Preview, Development |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXU...` (your secret) | Production, Preview, Development |
| `AWS_REGION` | `us-east-1` | Production, Preview, Development |
| `VITE_PREMIUM_TTS_ENABLED` | `true` | Production, Preview, Development |

5. Click **Save**
6. Redeploy your project

### 3.3 Supabase Storage (Optional - for Caching)

If you want audio caching:

1. In Vercel environment variables, add:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

2. In Supabase dashboard, create a storage bucket:
   - Name: `audio-cache`
   - Public: Yes
   - Set CORS policy to allow your domain

---

## ✅ Step 4: Verify Setup

### 4.1 Test Locally

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser: `http://localhost:3001`

3. Click on any vocabulary word

4. You should see:
   - A dropdown showing **Browser TTS (Free)** and **Premium Neural ⭐**
   - If you select **Premium Neural**, you should see voice options

5. Click the speak button - you should hear high-quality neural voice

### 4.2 Test API Endpoint

1. Test the API endpoint directly:

```bash
curl -X POST http://localhost:3001/api/audio/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test",
    "voiceId": "Joanna",
    "speed": "100%"
  }' \
  --output test-audio.mp3
```

2. Play the `test-audio.mp3` file

3. You should hear "Hello, this is a test" in Joanna's voice

### 4.3 Check Vercel Deployment

1. Deploy to Vercel:
   ```bash
   git push origin your-branch
   ```

2. Wait for deployment to complete

3. Visit your deployed URL

4. Test premium TTS on the deployed site

5. Check Vercel logs for any errors:
   - Go to Vercel dashboard → Your project → Functions
   - Click on `/api/audio/generate`
   - Check recent invocations for errors

---

## 💰 Pricing & Usage

### Understanding Costs

| Usage Scenario | Characters/Month | Cost |
|----------------|------------------|------|
| **Personal use** (50 words/day) | ~150,000 | **FREE** (under 1M) |
| **100 users** (50 words/day each) | ~15,000,000 | **~$240/month** |
| **With 90% cache hit rate** | ~1,500,000 | **~$24/month** |
| **1,000 users** (50 words/day) | ~150,000,000 | **~$2,400/month** |
| **With caching** | ~15,000,000 | **~$240/month** |

### Cost Optimization Tips

1. ✅ **Enable Caching** - Reduces API calls by 80-90%
   - Supabase Storage is free for first 1GB
   - Audio files are small (~50KB per word)

2. ✅ **Use Free Tier First**
   - 1 million characters/month free for 12 months
   - After 12 months, consider migrating heavy users to paid tier only

3. ✅ **Monitor Usage**
   - AWS CloudWatch shows real-time usage
   - Set billing alarms (explained below)

4. ✅ **Hybrid Approach**
   - Free users: Browser TTS
   - Premium users: Polly TTS
   - Cost per premium user: ~$2-5/month

### Set Billing Alerts

1. Go to AWS Console → **Billing and Cost Management**
2. Click **Budgets** in left sidebar
3. Click **Create budget**
4. Select **Zero spend budget** or **Monthly cost budget**
5. Set threshold (e.g., $10/month)
6. Add email notification
7. Click **Create budget**

---

## 🔧 Troubleshooting

### Issue 1: "Premium TTS Not Configured" Message

**Symptoms:**
- Premium TTS option is disabled
- Shows lock icon instead of ⭐

**Solutions:**

1. **Check environment variables**:
   ```bash
   # In .env file
   AWS_ACCESS_KEY_ID=... # Must be set
   AWS_SECRET_ACCESS_KEY=... # Must be set
   VITE_PREMIUM_TTS_ENABLED=true # Must be 'true'
   ```

2. **Restart development server**:
   ```bash
   npm run dev
   ```

3. **Check Vercel environment variables** (for production):
   - Ensure all 4 variables are set
   - Verify no typos in variable names
   - Redeploy after adding variables

### Issue 2: "Failed to Generate Premium Audio"

**Symptoms:**
- Error in browser console
- Falls back to browser TTS

**Solutions:**

1. **Check AWS credentials are correct**:
   ```bash
   # Test AWS CLI (optional)
   aws polly synthesize-speech \
     --text "test" \
     --voice-id Joanna \
     --output-format mp3 \
     test.mp3
   ```

2. **Check IAM permissions**:
   - User must have `polly:SynthesizeSpeech` permission
   - Verify policy is attached to user

3. **Check API endpoint logs** (Vercel):
   - Go to Vercel Functions tab
   - Check `/api/audio/generate` invocations
   - Look for specific error messages

### Issue 3: High AWS Bills

**Symptoms:**
- Unexpected charges
- Usage exceeds free tier

**Solutions:**

1. **Check usage in AWS Console**:
   - Go to Billing Dashboard
   - Click on "Bills" to see detailed breakdown

2. **Enable caching** if not already:
   - Supabase Storage caching reduces costs by 80-90%

3. **Implement rate limiting**:
   - Limit users to X requests per day
   - Add cooldown between requests

4. **Disable for non-premium users**:
   - Keep Premium TTS for paid users only
   - Free users use browser TTS

### Issue 4: CORS Errors

**Symptoms:**
- Browser blocks API requests
- "CORS policy" error in console

**Solutions:**

1. **Check Vercel configuration**:
   - API endpoint should return proper CORS headers
   - Already implemented in `/api/audio/generate`

2. **Check Supabase CORS** (if using caching):
   - Go to Storage → audio-cache bucket
   - Configuration → CORS
   - Add your domain

### Issue 5: Audio Quality Issues

**Symptoms:**
- Audio sounds robotic
- Audio cuts off

**Solutions:**

1. **Verify using neural voices**:
   - Engine must be set to `'neural'`
   - Voice ID must be a neural voice (Joanna, Matthew, Amy, Brian, etc.)

2. **Check SSML formatting**:
   - Ensure SSML is valid
   - Test with plain text first

3. **Test with different voices**:
   - Try multiple voices to compare quality

---

## 📚 Additional Resources

### AWS Documentation
- [AWS Polly Documentation](https://docs.aws.amazon.com/polly/)
- [AWS Polly Pricing](https://aws.amazon.com/polly/pricing/)
- [Neural Voices List](https://docs.aws.amazon.com/polly/latest/dg/ntts-voices-main.html)
- [SSML Reference](https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html)

### IAM Best Practices
- [IAM Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Creating IAM Users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)

### Project Documentation
- [GEMINI-SETUP.md](./GEMINI-SETUP.md) - AI Recommendations setup
- [SUPABASE-SETUP-GUIDE.md](./SUPABASE-SETUP-GUIDE.md) - Database setup
- [UI-DESIGN-EVOLUTION.md](./UI-DESIGN-EVOLUTION.md) - UI architecture

---

## 🆘 Support

If you encounter issues not covered in this guide:

1. Check Vercel function logs for detailed error messages
2. Review AWS CloudWatch logs for API errors
3. Consult [AWS Polly Troubleshooting Guide](https://docs.aws.amazon.com/polly/latest/dg/troubleshooting.html)
4. Open an issue on GitHub with:
   - Error messages from console
   - Vercel function logs
   - Steps to reproduce

---

## 🎯 Summary Checklist

- [ ] Created AWS account
- [ ] Created IAM user with Polly permissions
- [ ] Generated access keys
- [ ] Added environment variables to `.env`
- [ ] Added environment variables to Vercel
- [ ] Enabled `VITE_PREMIUM_TTS_ENABLED=true`
- [ ] Tested locally - premium TTS works
- [ ] Deployed to Vercel
- [ ] Tested on production - premium TTS works
- [ ] Set up billing alerts in AWS
- [ ] (Optional) Configured Supabase caching

---

**🎉 Congratulations!** You've successfully set up AWS Polly Premium TTS.

Your users can now enjoy high-quality neural voices for pronunciation practice!
