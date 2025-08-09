# CCL Pronunciation Trainer - Vercel Deployment

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free) - sign up at [vercel.com](https://vercel.com)

### Step-by-Step Deployment

#### 1. Push to GitHub
```bash
# In your local ccl-pronunciation-trainer directory:
git init
git add .
git commit -m "Initial commit: CCL Pronunciation Trainer with Previous button"
git branch -M main

# Create repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/ccl-pronunciation-trainer.git
git push -u origin main
```

#### 2. Deploy to Vercel
1. **Go to [vercel.com](https://vercel.com)** and sign up/login with GitHub
2. **Click "New Project"**
3. **Import your GitHub repository**: `ccl-pronunciation-trainer`
4. **Vercel will auto-detect settings** from `vercel.json`
5. **Click "Deploy"** 

That's it! ✅ Vercel will:
- Run `npm run convert` (generate vocabulary data)
- Run `npm run build` (create optimized production files)
- Deploy to a live URL like: `https://ccl-pronunciation-trainer.vercel.app`

#### 3. Your Live App
- **Main URL**: `https://YOUR_PROJECT_NAME.vercel.app`
- **Auto-deployments**: Every GitHub push triggers new deployment
- **HTTPS enabled**: Secure by default
- **Global CDN**: Fast loading worldwide

### Build Process
The deployment automatically runs:
```bash
npm install                    # Install dependencies
npm run convert               # Generate vocabulary data (1,618 terms)
npm run build                 # Create optimized production build
```

### Features Included ✅
- 🎯 **1,618 CCL vocabulary terms** across 6 domains
- 🔊 **Australian English pronunciation** (en-AU TTS)
- 🎓 **Difficulty-based learning** (Easy/Normal/Hard)
- ⚡ **2x repeat mode** (fixed - no more 4x bug!)
- 📱 **Mobile responsive** design
- ⏮️ **Previous/Next navigation** buttons
- 🎨 **Clean, professional interface**

### Troubleshooting

**If build fails:**
```bash
# Test locally first:
npm run convert
npm run validate
npm run build
```

**If vocabulary data missing:**
- Check that `scripts/build-vocabulary.js` runs successfully
- Verify `data/generated/vocabulary-data.js` exists after build

### Updates
To update your live app:
```bash
# Make changes locally, then:
git add .
git commit -m "Update: description of changes"
git push
```
Vercel automatically redeploys within 1-2 minutes! 🚀

---

## Configuration Files

### `vercel.json`
```json
{
  "buildCommand": "npm run convert && npm run build",
  "outputDirectory": "dist"
}
```

### Production Build Output
- **dist/index.html** - Optimized main page
- **dist/js/** - Minified JavaScript 
- **dist/css/** - Minified CSS
- **dist/data/** - Vocabulary data
- **Total size**: ~175KB (fast loading!)