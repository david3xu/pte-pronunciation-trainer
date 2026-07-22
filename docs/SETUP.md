# Setup Guide

This guide covers the complete setup process for the PTE Pronunciation Trainer, including environment configuration and third-party service integration.

## 🔧 Environment Setup

### 1. Node.js
Ensure you have Node.js installed (Version 16 or higher).
```bash
node -v
```

### 2. Installation
Install project dependencies:
```bash
pnpm install
```

## 🔑 Configuration

The application relies on several environment variables. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key | Supabase Dashboard |
| `GEMINI_API_KEY` | Server-side Google Gemini API Key | Google AI Studio |
| `AZURE_SPEECH_KEY` | Server-side Azure AI Speech key | Azure Portal |
| `AZURE_SPEECH_REGION` | Azure AI Speech resource region | Azure Portal |
| `VITE_PREMIUM_TTS_ENABLED` | Enables premium TTS UI | Local/Vercel env |

> **Security Note**: Never commit your `.env` file to version control.

## ☁️ Service Setup

### Supabase
1.  Create a new project on [Supabase](https://supabase.com).
2.  Run the SQL initialization scripts found in `supabase/migrations` (if available) or check `docs/api/SUPABASE-SCHEMA.md` (if it existed, check `supabase/` dir for schema).
3.  Enable Email/Password authentication.

### Google Gemini
1.  Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey).
2.  The app uses the Gemini API via `@google/genai` package.

### Azure AI Speech
Use the Bicep-based setup instead of creating resources manually:

```bash
az login --use-device-code
pnpm run infra:azure:speech:deploy
```

Defaults:

- Resource group: `ccl-pronunciation-trainer-rg`
- Region: `australiaeast`
- Speech resource: `ccl-pronunciation-speech-david`
- SKU: `F0`

Override with environment variables when needed:

```bash
AZURE_LOCATION=southeastasia \
AZURE_RESOURCE_GROUP=my-rg \
AZURE_SPEECH_ACCOUNT_NAME=my-unique-speech-name \
AZURE_SPEECH_SKU=S0 \
pnpm run infra:azure:speech:deploy
```

The script deploys `infra/azure/main.bicep`, writes the Speech key and region to Vercel production, and redeploys the app. It does not print the Speech key.

## 🏃 Running the App

### Development
Starts the Vite development server with HMR.
```bash
pnpm run dev
```

### Production Build
Builds the app for production.
```bash
pnpm run build
```

### Preview
Preview the production build locally.
```bash
pnpm run preview
```

## 🔄 Reproducibility & Environment

To ensure a consistent development environment and reproducible builds:

### 1. Node Version
We strictly recommend using the Node.js version specified in `.nvmrc` (if present) or `package.json` engines.
- **Current Engine**: Node >= 16.0.0

### 2. Clean Install
If you encounter issues, perform a clean install to reset dependencies:
```bash
rm -rf node_modules package-lock.json
pnpm install
```

### 3. Database Schema
To reproduce the backend environment, ensure your Supabase project matches the schema.
- **Schema File**: Check `supabase/migrations/` or `docs/api/SUPABASE-SCHEMA.md` (if available).

### 4. Data Consistency
The application relies on processed data in `data/processed/`.
- **Regenerate Data**: Run the data pipeline to ensure your local JSON files match the source Markdown.
  ```bash
  pnpm run data:pte
  ```
