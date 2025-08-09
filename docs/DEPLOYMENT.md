# Deployment Guide

## Production Build

### Tested Build Process ✅

```bash
# 1. Convert vocabulary data (tested - 1,618 terms)
npm run convert

# 2. Validate data integrity (tested - all pass)
npm run validate  

# 3. Build for production (tested - bundles & minifies)
npm run build

# 4. Full deployment pipeline
npm run deploy
```

### Verified Build Output

The `dist/` directory contains:
- `index.html` - Minified HTML with optimized resource links
- `js/app.min.js` - Bundled and minified JavaScript (~25KB)
- `css/app.min.css` - Minified CSS with all modules (~15KB)
- `data/vocabulary-data.min.js` - Optimized vocabulary data (~135KB)
- `build-info.json` - Build metadata and file sizes

**Total Size:** ~175KB (production-ready)

## Hosting Options

### GitHub Pages

1. Build the project locally
2. Push `dist/` contents to `gh-pages` branch
3. Enable GitHub Pages in repository settings

```bash
# Deploy to GitHub Pages
git subtree push --prefix dist origin gh-pages
```

### Netlify

1. Connect repository to Netlify
2. Set build command: `npm run deploy`
3. Set publish directory: `dist`

### Vercel

1. Import project from GitHub
2. Configure build settings:
   - Build command: `npm run deploy`
   - Output directory: `dist`

### Traditional Web Hosting

Upload `dist/` contents to your web server's public directory.

## Environment Configuration

### Production Settings

Create `.env.production`:
```
NODE_ENV=production
ANALYTICS_ID=your-analytics-id
```

### CDN Integration

For faster loading, host assets on CDN:
```javascript
const CDN_BASE = 'https://cdn.yoursite.com/';
```

## Performance Optimization

### Caching Headers

Configure server to cache static assets:
```
# .htaccess for Apache
<filesMatch "\.(css|js|png|jpg|gif|ico|woff|woff2)$">
  ExpiresActive On
  ExpiresDefault "access plus 1 year"
</filesMatch>
```

### Service Worker

Enable offline functionality by adding a service worker:
```javascript
// sw.js
const CACHE_NAME = 'ccl-pronunciation-trainer-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/data/vocabulary-data.js'
];
```

## Monitoring

### Analytics

Add Google Analytics or similar:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
```

### Error Tracking

Implement error monitoring:
```javascript
window.onerror = function(msg, url, line, col, error) {
  // Send error to monitoring service
};
```

### Performance Monitoring

Monitor Core Web Vitals:
```javascript
// Measure performance metrics
new PerformanceObserver((entryList) => {
  // Report metrics
}).observe({ entryTypes: ['paint', 'layout-shift', 'first-input'] });
```

## Security

### Content Security Policy

Add CSP headers:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
```

### HTTPS

Ensure HTTPS is enabled:
- Use Let's Encrypt for free certificates
- Configure HTTP to HTTPS redirects
- Enable HSTS headers

## Backup and Recovery

### Data Backup

Vocabulary data is version-controlled in Git:
- Original markdown files in `data/vocabulary/`
- Generated data can be recreated with `npm run convert`

### Deployment Rollback

Maintain deployment history:
```bash
# Tag releases
git tag v1.0.0
git push origin v1.0.0

# Rollback if needed
git checkout v1.0.0
npm run deploy
```

## Troubleshooting

### Build Failures ✅ Tested Solutions

**Issue**: Vocabulary data not found
```bash
# Solution: Generate data first
npm run convert
```

**Issue**: Build script fails
```bash  
# Solution: Clean and rebuild
npm run clean
npm run convert
npm run build
```

### Speech API Issues ✅ Implemented

Browser compatibility handled in PronunciationEngine:
```javascript
// Automatic fallback implemented
if (!this.isSupported) {
  console.warn('Web Speech API not supported');
  // Graceful degradation continues
}
```

### Performance Verified ✅

Optimizations implemented:
1. ✅ Efficient rendering with minimal DOM updates  
2. ✅ Mobile-first responsive design (320px to 1400px+)
3. ✅ Minified production build (~175KB total)
4. ✅ Local storage for offline progress tracking

## Maintenance

### Updates

Regular maintenance tasks:
1. Update vocabulary data
2. Update browser compatibility
3. Security updates for dependencies
4. Performance monitoring

### Version Management

Use semantic versioning:
- Patch: Bug fixes (1.0.1)
- Minor: New features (1.1.0)  
- Major: Breaking changes (2.0.0)

### Documentation

Keep documentation updated:
- API changes
- New features
- Deployment procedures
- Troubleshooting guides