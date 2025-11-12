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
npm run build       # Create minified assets
npm run validate    # Validate data integrity
```

### **Build Output**
```
dist/
├── index.html              # Optimized HTML
├── js/
│   └── app.min.js         # Minified JavaScript bundle
├── css/
│   └── style.min.css      # Minified CSS bundle
└── data/
    └── processed/
        └── pte-fib-listening-dataset.json  # Vocabulary dataset
```

### **Build Configuration**
All build settings are configurable in `src/js/shared/Config.js`:
```javascript
build: {
  jsFiles: [...],           // Files to bundle
  output: {
    js: 'js/app.min.js',    // JS output path
    css: 'css/style.min.css' // CSS output path
  }
}
```

---

## 🌐 Web Deployment

### **Static Hosting (Recommended)**

#### **Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or use Vercel's automatic deployment
# Push to GitHub → Vercel auto-deploys
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

#### **GitHub Pages**
```bash
# Build for GitHub Pages
npm run deploy:pte

# Deploy dist/ folder to gh-pages branch
```

### **Custom Server Deployment**

#### **Apache Configuration**
```apache
# .htaccess
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/css application/javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

#### **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # Handle client-side routing
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

### **Development Environment**
```javascript
// Override default configuration for development
const devConfig = {
  development: {
    debug: true,
    verbose: true,
    mockData: false
  },
  tts: {
    voices: { default: 'Google UK English Male' }
  }
};
```

### **Production Environment**
```javascript
// Override default configuration for production
const prodConfig = {
  development: {
    debug: false,
    verbose: false
  },
  tts: {
    voices: { default: 'Google UK English Male' }
  },
  build: {
    output: {
      js: 'js/app.min.js',
      css: 'css/style.min.css'
    }
  }
};
```

### **Configuration Override Pattern**
```javascript
// In deployment script
const AppConfig = require('./src/js/shared/Config.js');
const appConfig = new AppConfig();

// Override for environment
if (process.env.NODE_ENV === 'production') {
  appConfig.merge(prodConfig);
} else {
  appConfig.merge(devConfig);
}
```

---

## 📊 Data Pipeline Deployment

### **Automated Data Processing**
```bash
# Production data pipeline
npm run data:pte

# Custom configuration
node scripts/pte-data-pipeline.js --config custom-config.json
```

### **Data Validation**
```bash
# Validate processed data
npm run validate

# Check specific files
node scripts/validate.js --file data/processed/pte-fib-listening-dataset.json
```

### **Data Source Configuration**
```javascript
// Custom data sources
const customPipeline = new PTEDataPipeline({
  inputDir: 'custom/data/source',
  dataSources: {
    primary: 'custom-vocabulary.md',
    fallback: 'backup-vocabulary.md'
  },
  outputFiles: {
    dataset: 'custom-dataset.json',
    report: 'custom-report.json'
  }
});
```

---

## 🔍 Monitoring & Analytics

### **Performance Monitoring**
```javascript
// Built-in performance tracking
window.progressTracker.getStats()

// Custom analytics
window.eventBus.on('vocabulary:loaded', (data) => {
  // Track vocabulary loading
  analytics.track('vocabulary_loaded', {
    total_terms: data.total,
    mode: data.mode
  });
});
```

### **Error Tracking**
```javascript
// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});

// TTS error handling
window.eventBus.on('tts:error', (data) => {
  console.error('TTS error:', data.error);
});
```

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

### **Automated Testing**
```yaml
# .github/workflows/test.yml
name: Test PTE Trainer

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Run tests
      run: npm test

    - name: Run linting
      run: npm run lint

    - name: Validate data
      run: npm run validate
```

---

## 🔧 Troubleshooting Deployment

### **Common Issues**

#### **Data Not Loading**
```bash
# Check if data was processed
ls -la data/processed/

# Re-process data
npm run data:pte

# Check data integrity
npm run validate
```

#### **Build Failures**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build

# Check Node.js version
node --version  # Should be >= 16.0.0
```

#### **TTS Not Working**
- Use Chrome or Edge browser
- Check browser audio permissions
- Verify microphone access
- Test with different voices

#### **Configuration Issues**
```javascript
// Debug configuration
console.log('Config:', window.appConfig.getAll());

// Check specific values
console.log('TTS Voice:', window.appConfig.get('tts.voices.default'));
console.log('Data Path:', window.appConfig.get('data.paths.dataset'));
```

### **Performance Optimization**

#### **Asset Optimization**
```bash
# Analyze bundle size
npm run build -- --analyze

# Optimize images
npm run optimize-images
```

#### **Caching Strategy**
```javascript
// Service Worker caching
const urlsToCache = [
  '/',
  '/index.html',
  '/js/app.min.js',
  '/css/style.min.css',
  '/data/processed/pte-fib-listening-dataset.json'
];
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
**Configuration**: ✅ **FULLY CONFIGURABLE**
**Scalability**: ✅ **HORIZONTAL SCALING SUPPORTED**
