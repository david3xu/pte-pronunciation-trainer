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
npm install
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
| `VITE_GEMINI_API_KEY` | Google Gemini API Key | Google AI Studio |
| `VITE_AWS_REGION` | AWS Region (e.g., us-east-1) | AWS Console |
| `VITE_AWS_ACCESS_KEY_ID` | AWS Access Key | AWS IAM |
| `VITE_AWS_SECRET_ACCESS_KEY` | AWS Secret Key | AWS IAM |

> **Security Note**: Never commit your `.env` file to version control.

## ☁️ Service Setup

### Supabase
1.  Create a new project on [Supabase](https://supabase.com).
2.  Run the SQL initialization scripts found in `supabase/migrations` (if available) or check `docs/api/SUPABASE-SCHEMA.md` (if it existed, check `supabase/` dir for schema).
3.  Enable Email/Password authentication.

### Google Gemini
1.  Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey).
2.  Ensure the `gemini-2.5-flash` model is enabled for your key.

### AWS Polly
1.  Create an IAM user with `AmazonPollyReadOnlyAccess`.
2.  Generate Access Keys for this user.
3.  Add these keys to your `.env`.

## 🏃 Running the App

### Development
Starts the Vite development server with HMR.
```bash
npm run dev
```

### Production Build
Builds the app for production.
```bash
npm run build
```

### Preview
Preview the production build locally.
```bash
npm run preview
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
npm install
```

### 3. Database Schema
To reproduce the backend environment, ensure your Supabase project matches the schema.
- **Schema File**: Check `supabase/migrations/` or `docs/api/SUPABASE-SCHEMA.md` (if available).

### 4. Data Consistency
The application relies on processed data in `data/processed/`.
- **Regenerate Data**: Run the data pipeline to ensure your local JSON files match the source Markdown.
  ```bash
  npm run data:pte
  ```
