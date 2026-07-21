# Deployment Guide

This guide describes the build and deployment process for the PTE Pronunciation Trainer.

## 📦 Build Process

The application is built using Vite, which bundles the React application and optimizes assets.

```bash
pnpm run build
```

**Artifacts**:
- `dist/index.html`: Entry point.
- `dist/assets/`: JS, CSS, and images.
- `dist/data/`: Processed JSON data files.

## 🚀 Continuous Integration / Continuous Deployment (CI/CD)

### GitHub Actions (Recommended)
We recommend setting up GitHub Actions for automated testing and deployment.

**Workflow Example (`.github/workflows/ci.yml`)**:
1.  **Trigger**: Push to `main` or Pull Request.
2.  **Jobs**:
    - `lint`: Run ESLint.
    - `test`: Run Vitest.
    - `build`: Run `pnpm run build`.

### Vercel Deployment
The project is optimized for deployment on Vercel.

1.  **Connect Repository**: Link your GitHub repo to Vercel.
2.  **Build Settings**:
    - Framework Preset: Vite
    - Build Command: `pnpm run vercel-build` (or `pnpm run build`)
    - Output Directory: `dist`
3.  **Environment Variables**:
    - Add all variables from `.env` to Vercel Project Settings.

## 🌐 Environment Promotion

- **Development**: Localhost or feature branch deployments.
- **Staging**: `develop` branch deployed to a staging URL.
- **Production**: `main` branch deployed to the live URL.

## 🛡️ Security Checks

Before deployment:
1.  **Audit Dependencies**: Run `npm audit`.
2.  **Secrets**: Ensure no secrets are committed to git.
3.  **Headers**: Configure security headers (CSP, HSTS) in `vercel.json`.
