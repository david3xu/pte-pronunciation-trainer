# PTE Pronunciation Trainer - Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying the PTE Pronunciation Trainer to various platforms with centralized configuration and scalable architecture.

## 📋 Pre-Deployment Checklist

### **✅ Requirements**
- Node.js >= 16.0.0
- Python 3.x (for development server)
- Modern browser (Chrome, Edge, Firefox, Safari)

### **✅ Configuration**
- All settings centralized in `src/js/shared/Config.js`
- No hardcoded values in codebase
- Configurable paths and data sources

## 🔧 Local Development Deployment

### **Quick Start**
```bash
# Clone repository
git clone <repository-url>
cd pte-vocabulary-trainer

# Install dependencies
npm install

# Process PTE vocabulary data
npm run data:pte

# Start development server
npm run dev
```

### **Development Server**
```bash
# Start server on port 3000
npm run dev

# Or with data processing
npm run start:pte
```

**Access**: http://localhost:3000

---

## 🏗️ Production Build

### **Build Process**
```bash
# Complete production build
npm run deploy:pte

# Or step by step:
npm run data:pte    # Process vocabulary data
npm run build       # Vite build (compile TS + bundle)
npm run validate    # Validate data integrity
```

### **Build Output**
```
dist/
├── index.html              # Optimized HTML
├── assets/                 # Hashed assets
│   ├── index-*.js         # Minified JavaScript bundle
│   └── index-*.css        # Minified CSS bundle
└── data/
    └── processed/
        └── pte-fib-listening-dataset.json  # Vocabulary dataset
```

### **Build Configuration**
Vite configuration is handled in `vite.config.ts`.
Application configuration is in `src/ts/shared/Config.ts`.

---

## 🌐 Web Deployment

### **Static Hosting (Recommended)**

#### **Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run vercel-build:pte",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

#### **Netlify Deployment**
```bash
# Build command
npm run deploy:pte

# Publish directory
dist

# Node version
18.x
```

### **Custom Server Deployment**

#### **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # Handle client-side routing (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript;
}
```

---

## 🔧 Environment-Specific Configuration

### **Environment Variables**
Use `.env` files for environment-specific configuration (Vite standard).

**`.env`**:
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
```

### **Configuration Logic**
`src/ts/shared/Config.ts` loads these variables:

```typescript
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY
  },
  // ...
};
```

---

## 📊 Data Pipeline Deployment

### **Automated Data Processing**
```bash
# Production data pipeline
npm run data:pte
```

### **Data Validation**
```bash
# Validate processed data
npm run validate
```

---

## 🔍 Monitoring & Analytics

### **Performance Monitoring**
- Use **Lighthouse** in Chrome DevTools
- React Profiler for component performance

### **Error Tracking**
- Console logging for development
- Supabase logging (optional) for production errors

---

## 🚀 CI/CD Pipeline

### **GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy PTE Trainer

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Process PTE data
      run: npm run data:pte

    - name: Build for production
      run: npm run build

    - name: Validate build
      run: npm run validate

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📋 Deployment Checklist

### **Pre-Deployment**
- [ ] All tests passing (`npm test`)
- [ ] Linting clean (`npm run lint`)
- [ ] Data processed (`npm run data:pte`)
- [ ] Build successful (`npm run build`)
- [ ] Validation passing (`npm run validate`)

### **Deployment**
- [ ] Environment variables configured
- [ ] Build artifacts generated
- [ ] Static files served correctly
- [ ] Data files accessible
- [ ] TTS functionality working

### **Post-Deployment**
- [ ] Application loads correctly
- [ ] Vocabulary data displays
- [ ] TTS pronunciation works
- [ ] Mobile responsiveness verified
- [ ] Performance metrics acceptable

---

**Deployment Status**: ✅ **PRODUCTION-READY**
**Configuration**: ✅ **VITE + TYPESCRIPT**
**Scalability**: ✅ **HORIZONTAL SCALING SUPPORTED**
