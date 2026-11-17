# Sensitive Information & Privacy Audit — pte-vocabulary-trainer

**Date:** 2026-11-17
**Version audited:** 3.0.11 (`package.json`)
**Scope:** Full repository working tree (`src/`, `api/`, `server/`, `scripts/`, `infra/`, `docs/`, `.azure/`, `ios/`, `tests/`) and Git commit history.
**Overall Status:** **ALL ITEMS FINISHED (7 / 7 redacted & verified)**

---

## 1. Server-Side Secrets & Cryptographic Keys Baseline

| Check | Status | Result |
| --- | --- | --- |
| Google Gemini API keys (`AIza...`) | **[x] FINISHED** | `0` keys found in working tree or Git history. |
| Azure Speech API keys (`AZURE_SPEECH_KEY`) | **[x] FINISHED** | `0` keys found in working tree or Git history. |
| Supabase `service_role` keys & DB passwords | **[x] FINISHED** | `0` keys found in working tree or Git history. |
| Private keys (SSH / TLS / PEM / P12) & GitHub/PostHog tokens | **[x] FINISHED** | `0` keys/tokens found in working tree or Git history. |
| Real Azure Subscription / Tenant / Entra Object UUIDs | **[x] FINISHED** | `0` real UUIDs found (all docs use `<subscription-id>` / `<tenant-id>` placeholders; tests use synthetic UUIDs). |
| `.env` files | **[x] FINISHED** | No `.env` or `.azure/*/.env` files tracked or present on disk (only `.env.example`). |

---

## 2. Sensitive & Identifiable Information Remediation Checklist

| ID | Category | Files Updated | Action Taken | Status |
| --- | --- | --- | --- | --- |
| **S1** | Personal Email & Microsoft Entra Tenant Identifiers | `.azure/deployment-plan.md`, `docs/AZURE_WORKLOAD_PLAN.md`, `.gitignore` | Redacted personal Gmail / Entra guest admin UPN to `<entra-admin-principal>`, Entra External ID tenant domain to `<entra-external-id-tenant>.onmicrosoft.com`, and removed external resource group and companion repository references. | **[x] FINISHED** |
| **S2** | Internal Billing, Credit Balance & Startup Milestone Details | `docs/AZURE_WORKLOAD_PLAN.md`, `docs/AZURE_DEPLOYMENT_HANDOFF.md` | Removed internal credit balance figures, daily burn-rate tracking tables, and startup credit milestone strategy notes while preserving the technical Azure migration architecture and phase checklist. | **[x] FINISHED** |
| **S3** | Live Unauthenticated Azure Front Door Staging Hostname & WAF Policy | `package.json`, `.azure/deployment-plan.md`, `docs/AZURE_DEPLOYMENT_HANDOFF.md` | Replaced hardcoded live Front Door staging hostname (`*.z01.azurefd.net`), WAF policy name, and subscription deployment ID with `${VITE_API_BASE_URL:-https://your-staging-endpoint.z01.azurefd.net}` and `<front-door-endpoint>` / `<front-door-waf-policy>` / `<deployment-name>` placeholders. | **[x] FINISHED** |
| **S4** | Hardcoded Live Supabase Project URL & JWT `anon` Key | `tests/manual/test-supabase.html` | Replaced hardcoded live Supabase project URL (`https://<project-ref>.supabase.co`) and `anon` JWT token with placeholder values (`https://your-project.supabase.co` and `your-anon-key-here`). | **[x] FINISHED** |
| **S5** | Personal Name in Azure Speech Resource Identifier | `infra/azure/main.bicep`, `infra/azure/main.bicepparam`, `scripts/azure/verify-template-invariants.js`, `scripts/deploy-azure-speech.sh`, `docs/SETUP.md`, `docs/AZURE_DEPLOYMENT_HANDOFF.md`, `docs/AZURE_WORKLOAD_PLAN.md`, `.azure/deployment-plan.md` | Standardized the default/approved Speech account identifier to `ccl-pronunciation-speech` across Bicep templates, invariant checks, deployment scripts, and documentation. | **[x] FINISHED** |
| **S6** | Personal Apple Developer Team ID | `ios/App/App.xcodeproj/project.pbxproj` | Removed hardcoded `DEVELOPMENT_TEAM` identifier from Debug and Release Xcode build configurations. | **[x] FINISHED** |
| **S7** | Hardcoded Production Vercel Origin | `package.json`, `vite.config.ts` | Parameterized `cap:sync:ios:prod` (`${VITE_API_BASE_URL:-https://your-production-domain.example.com}`) and set `DEFAULT_API_PROXY_TARGET` in `vite.config.ts` to `http://localhost:3000`. | **[x] FINISHED** |

---

## 3. Detailed Point-by-Point Summary

### Point 1 (S1): Personal Email, Entra Tenant & External Repo Identifiers — **[x] FINISHED**
- **Files:** `.azure/deployment-plan.md`, `docs/AZURE_WORKLOAD_PLAN.md`, `.gitignore`
- **Remediation:**
  - Replaced the PostgreSQL Entra administrator UPN in `.azure/deployment-plan.md` with `<entra-admin-principal>`.
  - Replaced the Entra External ID tenant domain in `docs/AZURE_WORKLOAD_PLAN.md` with `<entra-external-id-tenant>.onmicrosoft.com`.
  - Removed external resource group names, employer/personal entity notes, and companion repository references from `docs/AZURE_WORKLOAD_PLAN.md` and `.gitignore`.

### Point 2 (S2): Internal Billing, Credit Balance & Startup Milestone Strategy — **[x] FINISHED**
- **Files:** `docs/AZURE_WORKLOAD_PLAN.md`, `docs/AZURE_DEPLOYMENT_HANDOFF.md`
- **Remediation:**
  - Removed internal credit balance figures, daily spend tables, and startup program milestone strategy sections from `docs/AZURE_WORKLOAD_PLAN.md`.
  - Retained all technical migration phases (`Phase 0`–`Phase 6`), task tables (`IN-*`, `IAC-*`, `APP-*`, `API-*`, `DB-*`, `AUTH-*`, `AUD-*`, `OBS-*`, `AI-*`, `OPT-*`, `CUT-*`), and validation gates (`V0`–`V5`).

### Point 3 (S3): Live Azure Front Door Staging URL, WAF Policy & Deployment ID — **[x] FINISHED**
- **Files:** `package.json`, `.azure/deployment-plan.md`, `docs/AZURE_DEPLOYMENT_HANDOFF.md`
- **Remediation:**
  - Updated `cap:sync:ios:staging` in `package.json` to read `${VITE_API_BASE_URL:-https://your-staging-endpoint.z01.azurefd.net}`.
  - Redacted live Front Door endpoint hostname, generated hash segment, WAF policy identifier, and deployment run ID in `.azure/deployment-plan.md` and `docs/AZURE_DEPLOYMENT_HANDOFF.md`.

### Point 4 (S4): Hardcoded Live Supabase Project URL & `anon` JWT Key — **[x] FINISHED**
- **File:** `tests/manual/test-supabase.html`
- **Remediation:**
  - Replaced the live `SUPABASE_URL` and `SUPABASE_ANON_KEY` JWT in `tests/manual/test-supabase.html` with `'https://your-project.supabase.co'` and `'your-anon-key-here'`.

### Point 5 (S5): Personal Name in Azure Speech Account Identifier — **[x] FINISHED**
- **Files:** `infra/azure/main.bicep`, `infra/azure/main.bicepparam`, `scripts/azure/verify-template-invariants.js`, `scripts/deploy-azure-speech.sh`, `docs/SETUP.md`, `docs/AZURE_DEPLOYMENT_HANDOFF.md`, `docs/AZURE_WORKLOAD_PLAN.md`, `.azure/deployment-plan.md`
- **Remediation:**
  - Replaced `ccl-pronunciation-speech-<name>` with `ccl-pronunciation-speech` across Bicep templates, template invariant tests, shell scripts, and documentation.

### Point 6 (S6): Apple Developer Team ID — **[x] FINISHED**
- **File:** `ios/App/App.xcodeproj/project.pbxproj`
- **Remediation:**
  - Removed `DEVELOPMENT_TEAM` entries from both `Debug` and `Release` build configurations in `ios/App/App.xcodeproj/project.pbxproj`.

### Point 7 (S7): Hardcoded Production Vercel Origin — **[x] FINISHED**
- **Files:** `package.json`, `vite.config.ts`
- **Remediation:**
  - Updated `cap:sync:ios:prod` in `package.json` to use `${VITE_API_BASE_URL:-https://your-production-domain.example.com}`.
  - Updated `DEFAULT_API_PROXY_TARGET` in `vite.config.ts` to `'http://localhost:3000'`.
