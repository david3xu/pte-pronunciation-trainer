# Azure workload plan

Status: implementation plan. Infrastructure is deployed as of the recovery deployment; repository migration is in progress.
Scope: subscription `<subscription-id>`, `ccl-pronunciation-trainer`.

> **Implementation authority.** The target set, canonical implementation sequence and implementation todos in this document are authoritative. Historical alternatives have been removed so they cannot override the selected App Service S1 and handler-first path.

## Direction

The trainer consolidates onto Azure. The five confirmed third-party providers are retired and replaced with Azure equivalents; `resend` remains conditional until its production use is verified.

### Complete third party inventory

Audited across the repository excluding `node_modules`, `dist`, `ios` and `data`.

| Third party | Role | Azure replacement | New workload |
| --- | --- | --- | --- |
| Supabase | database, sync | Database for PostgreSQL | yes |
| Supabase | auth | Entra External ID | no, free MAU tier bills zero |
| Gemini | AI chat, recommendations, scoring | Foundry | no, already counted |
| Vercel | static `dist` build hosting | App Service S1 | yes |
| Vercel | the six `api/` HTTP handlers | App Service S1 | no, same App Service workload |
| PostHog | product analytics, optional per `src/env.d.ts` | Application Insights | no, same service as telemetry |
| Sentry | error tracking | Application Insights | no, same service |
| resend | transactional email, single reference only | Communication Services | conditional, verify first |

**One real benefit.** Application Insights becomes the common destination for server telemetry, product analytics and error reporting.

**resend needs verification.** It appears exactly once, so it may be aspirational rather than wired. If transactional email is genuinely in use, Communication Services becomes an additional Azure service. If not, do not provision it.

## Target set

Six primary services in the target architecture, estimated at roughly **US$296 a month** (approved ceiling: **US$400 a month**):

| # | Service | Tier | Est. USD/mo | Est. USD/day | Billing model |
| --- | --- | --- | --- | --- | --- |
| 1 | App Service | Standard S1 | 70 | 2.33 | fixed compute charge |
| 2 | Database for PostgreSQL | B2s plus 64GB | 40 | 1.33 | fixed vCore plus storage |
| 3 | Front Door | Standard | 35 | 1.17 | fixed base fee |
| 4 | Cache for Redis | Managed Redis Balanced_B3 | 59 | 1.97 | fixed tier charge |
| 5 | API Management | Developer | 50 | 1.67 | fixed instance charge |
| 6 | Foundry | throttled to a deliberate budget | 60 | 2.00 | directly controlled |

Estimates only, from Azure list prices. Price each in the calculator for `australiaeast` before provisioning. The API Management estimate assumes Developer; if IN-07 selects another tier, reprice the total and confirm it remains below the approved ceiling.

### Architectural roles

* **App Service S1** replaces Static Web Apps for the `dist` build and hosts the six `api/` HTTP handlers with deployment slots, autoscale and backups.
* **PostgreSQL B2s** replaces the Supabase database.
* **Front Door Standard** replaces the CDN slot for audio delivery and provides managed TLS, WAF and edge routing.
* **Azure Managed Redis** caches Foundry responses for repeated vocabulary items, session state and rate limiting.
* **API Management Developer** fronts the handlers during migration with policy enforcement and throttling. Developer has no SLA and is not an automatic production choice; production cutover requires an explicit decision to accept that risk temporarily or move to an available SLA-backed tier.
* **Foundry** replaces Gemini and is throttled to a controlled budget.

### Retained supporting services

Retain Blob Storage, AI Speech at `S0`, and Application Insights for their product roles:

* Entra External ID replaces Supabase auth on the free monthly active user tier.
* Communication Services replaces `resend`, conditional on verifying that transactional email is genuinely in use.
* Trainer resources use `australiaeast` (with Managed Redis in `australiacentral`) and global Front Door. Tag every resource by product.

## Migration inventory

Work required by the all-Azure direction, largest first.

### Auth, Supabase to Entra External ID. Largest item.

Touches `src/services/supabase/authService.ts`, `supabaseClient.ts`, and every call site that assumes a Supabase session. No drop-in equivalent exists. An Entra External ID tenant (`<entra-external-id-tenant>.onmicrosoft.com`) must have its suitability verified before reuse.

### Database, Supabase to Azure PostgreSQL

Touches `supabase/migrations/`, `src/types/database.ts`, `src/services/supabase/syncService.ts`, `autoSyncManager.ts`, `src/services/migration/migrationService.ts`. Schema translation is mechanical; the sync layer assumptions are not.

### Hosting and handlers, Vercel to App Service

App Service S1 is the single target for both the Vite `dist` build and all six `api/` HTTP handlers. Static Web Apps is not part of the selected design.

The first application deliverable is a Node 22 production runtime that serves `dist`, provides SPA fallback routing, exposes `/health`, and hosts `/api/*`. Handler business logic is extracted from `VercelRequest` and `VercelResponse` behind framework-neutral interfaces before the routes move.

Migrate `/api/voices` first to prove packaging, startup, routing, telemetry and APIM proxying. Then move the remaining handlers (`ai-recommendations.ts`, `ai/chat.ts`, `audio/generate.ts`, `premium-tts.ts`, and `pronunciation-score.ts`) as one compatibility-tested API surface. `config.ts` and `azureSpeech.ts` are shared modules, not HTTP handlers, and move with their consumers.

Vercel remains available only as a rollback target during cutover. It is not a PostgreSQL client: the browser never connects directly to PostgreSQL, and PostgreSQL networking permits the App Service backend rather than Vercel egress.

### Analytics and error tracking, PostHog and Sentry to Application Insights

Touches `src/services/analytics/analyticsService.ts` and the `VITE_POSTHOG_API_KEY` and `VITE_POSTHOG_HOST` declarations in `src/env.d.ts`, both currently optional. Sentry appears once and may not be wired; verify before planning removal work.

Small change that establishes one observability path. Baseline server telemetry lands with the App Service vertical slice; product analytics and error migration complete in Phase 5.

### Email, resend to Communication Services. Verify first.

Single reference in the repository. Establish whether transactional email is actually in use before provisioning anything.

### AI, Gemini to Foundry. Lowest priority.

Touches `src/services/ai/` throughout: `recommendationService.ts`, `recommendationEngine.ts`, `ratingService.ts`, `interventionEngine.ts`, `weakAreaDetector.ts`, `taskPersonas.ts`, plus `api/ai/chat.ts` and the `gemini.*` config keys (`defaultModel`, `maxTokens`, `temperature`, `topP`, `topK`), currently on `gemini-2.5-flash`.

### Audio, new work rather than migration

Blob becomes the server-side cache for generated TTS, touching `api/audio/generate.ts` and `src/services/audio/audioCache.ts`, with Front Door serving `/audio/*` and client URLs repointed.

## Explicitly rejected

Recorded so these are not re-litigated.

* **Provisioned but unused Redis.** Redis is not complete until an App Service handler uses it for rate limiting, session state or Foundry response caching. A cache with no local consumer does not satisfy the product design.
* **Service Bus or any broker.** Nothing in the trainer queues asynchronous background jobs.
* **AI Search.** pgvector in the PostgreSQL flexible server being provisioned covers vector needs.
* **Static Web Apps.** Duplicates the App Service host.
* **Container Apps.** App Service S1 is the selected host.

## Canonical implementation sequence

This sequence governs repository work.

### Phase 0, validate the deployment contract

Compile every Bicep module and correct unsupported API versions or properties. Remove the transitional `handlerBackendUrl` and Vercel firewall inputs: APIM derives its backend from the App Service output, and PostgreSQL permits the App Service backend.

Before deployment, verify every selected SKU is offered to this subscription in `australiaeast`, check quota and provider registration, and confirm the exact supported App Service Linux runtime string for Node 22. Define the startup command, deployment artifact, server-only settings, service permissions, APIM operations, CORS policy and production origins. Add and associate the Front Door WAF policy rather than treating WAF as an implicit Standard feature.

Exit criteria: selected SKUs and the Node runtime are available, `main.bicep` compiles, a deployment what-if succeeds, required human inputs are recorded, Front Door security is explicit, and no runtime URL or secret is hard-coded into client code.

### Phase 1, deliver an App Service vertical slice

Add the production server on the supported Node 22 App Service runtime selected in Phase 0, serve the Vite build with SPA fallback, expose `/health`, introduce framework-neutral handler contracts, and port one low-dependency API route. Add baseline Application Insights telemetry.

Exit criteria: App Service serves the application, a deep link, `/health`, and one API route; APIM proxies that route; browser and Capacitor builds can select the Azure API origin.

### Phase 2, move the complete API surface

Port the remaining Vercel handlers, centralize validation and error responses, define APIM operations and rate limits, and make Azure-target web and Capacitor builds use APIM without changing the production default yet. Do not put an APIM master subscription key in browser code.

Exit criteria: all six routes pass compatibility tests through APIM, Azure-target clients use APIM, direct App Service access is restricted as designed, and Vercel remains a tested production rollback path until Phase 6.

### Phase 3, move persistence to PostgreSQL

Translate the Supabase schema, introduce server-side repositories, move sync calls behind the API, migrate data, reconcile record counts and perform a controlled cutover. Preserve offline and guest behavior.

Exit criteria: production reads and writes use PostgreSQL through App Service, no browser has database credentials, reconciliation passes, and a rollback procedure has been exercised.

### Phase 4, move auth to Entra External ID

Replace Supabase types at the application boundary with provider-neutral auth contracts, implement Entra client flows, validate JWTs in the API, map existing user identities and preserve guest mode.

Exit criteria: sign-up, sign-in, refresh, sign-out, protected API access and account recovery work on web and Capacitor; existing progress remains attached to the correct user.

### Phase 5, complete Azure service integrations

Wire Blob and Front Door for audio, replace PostHog and Sentry with Application Insights, then replace Gemini with Foundry and add Redis caching. Cache keys include model, prompt version and generation settings; user-specific conversations are not shared-cache entries.

Exit criteria: audio is served through Front Door, telemetry and errors arrive in Application Insights, AI requests use Foundry, and Redis has a measured application consumer.

### Phase 6, cut over and retire third parties

Run regression and rollback checks, switch production traffic, observe the agreed rollback window, then remove Vercel, Supabase, Gemini, PostHog and Sentry configuration and dependencies. Handle `resend` only if its production use is confirmed.

Exit criteria: Azure serves all production paths, old-provider credentials are revoked, obsolete dependencies are removed, and deployment and recovery documentation describes the running system.

## Speech SKU gotcha

Deployed account is `ccl-pronunciation-speech`. The source Bicep now requires that explicit name, but the compiled template must be rebuilt before deployment. Do not deploy a stale `main.json` that still contains the former generated-name behavior.

```bash
az cognitiveservices account update \
  --name ccl-pronunciation-speech \
  --resource-group ccl-pronunciation-trainer-rg \
  --sku S0
```

After the SKU update, keep `main.bicepparam` and deployed reality aligned. The explicit account name is the single source of truth.

## Implementation todos

Work top to bottom unless a dependency explicitly permits parallel work. Check a row only when its acceptance condition is true.

Owner: **H** requires Azure access or a product decision; **A** is repository implementation; **A+H** requires both.

### Required human inputs

| Done | ID | Input | Needed by | Acceptance |
| --- | --- | --- | --- | --- |
| [ ] | IN-01 | PostgreSQL Entra administrator object ID and principal name | IaC deployment | Values identify a tested administrator; password auth remains disabled |
| [ ] | IN-02 | APIM publisher email and organisation name | IaC deployment | Non-empty values are stored in deployment parameters |
| [ ] | IN-03 | Production web origin, Capacitor API origin and any custom domains | App Service vertical slice | CORS and redirect origins are explicit for every client |
| [ ] | IN-04 | Shared Foundry endpoint, model deployment name and approved authentication method | AI migration | App Service can authenticate without a client-exposed secret |
| [ ] | IN-05 | Entra External ID tenant, client registrations, redirect URIs and account-recovery policy | Auth migration | Web and Capacitor registrations are ready |
| [ ] | IN-06 | Supabase export access and approved database/auth cutover window | Data migration | Export, rollback duration and maintenance expectations are recorded |
| [ ] | IN-07 | APIM production service-level decision | Production cutover | An SLA-backed available tier is selected, or temporary use of Developer with no SLA has explicit risk acceptance and an upgrade deadline |

### Phase 0, infrastructure and deployment contract

| Done | ID | Task | Owner | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| [ ] | IAC-00 | Verify provider registration, quota, regional SKU availability and the exact supported Node 22 Linux runtime | H | - | Every selected SKU is deployable in the target subscription and region; `linuxFxVersion` matches an advertised runtime |
| [ ] | IAC-01 | Run `az bicep build --file infra/azure/main.bicep` | H | - | All module diagnostics are captured |
| [ ] | IAC-02 | Correct rejected API versions, properties and module contracts | A | IAC-00, IAC-01 | The same build exits successfully |
| [ ] | IAC-03 | Derive APIM backend URL from `appService.outputs.defaultHostName`; remove `handlerBackendUrl` | A | IAC-02 | No manually supplied backend URL remains |
| [ ] | IAC-04 | Allow all declared App Service outbound IPs through the PostgreSQL firewall; remove the Vercel egress requirement | A | IAC-02 | PostgreSQL is reachable from App Service, no broad public range is allowed, and the browser has no database path |
| [ ] | IAC-05 | Add App Service settings, outputs and least-privilege access for PostgreSQL, Storage, Speech, Redis and Application Insights; reserve late-bound Foundry settings | A | IAC-02 | Server settings are complete; no server credential uses a `VITE_` variable |
| [ ] | IAC-06 | Define APIM policy defaults and the `/api/voices` vertical-slice operation | A | IAC-02, IN-03 | CORS, request limits, errors and rate limiting are explicit; browser code needs no master subscription key |
| [ ] | IAC-07 | Add a Front Door WAF policy, endpoint association and explicit origin-access design | A | IAC-02, IN-03 | WAF is deployed and associated; public origin bypass and WAF cost are documented |
| [ ] | IAC-08 | Parameterize the APIM tier and document that Developer has no SLA | A | IAC-02 | Migration can use Developer without presenting it as the permanent production default |
| [ ] | IAC-09 | Populate deployment parameters and run an Azure what-if | H | IAC-00, IAC-03 through IAC-08, IN-01 through IN-03 | What-if contains only intended resources and updates |
| [ ] | IAC-10 | Rebuild and retain the current compiled template if deployment uses it | H | IAC-09 | No stale Speech account name or old resource set remains |

### Phase 1, App Service vertical slice

| Done | ID | Task | Owner | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| [ ] | APP-01 | Add a Node 22 production server and package start command | A | - | App Service has an explicit, reproducible startup contract |
| [ ] | APP-02 | Serve `dist`, SPA fallback, static cache headers and `/health` | A | APP-01 | Root, a deep link and health endpoint return expected responses |
| [ ] | APP-03 | Define framework-neutral API request, response and error contracts with a Vercel compatibility adapter | A | APP-01 | New handler cores do not import Vercel types; platform types stay in adapters |
| [ ] | APP-04 | Port `/api/voices` through the new contract | A | APP-03 | GET and method-not-allowed responses match the existing route |
| [ ] | APP-05 | Add baseline server telemetry and correlation IDs | A | APP-01 | Health and API requests can be correlated in Application Insights |
| [ ] | APP-06 | Make browser and Capacitor API origins configurable without embedding secrets | A | APP-02, IN-03 | Each target resolves the intended Azure API URL |
| [ ] | APP-07 | Deploy the vertical slice to App Service and connect one APIM operation | A+H | IAC-09, APP-04 through APP-06 | App, deep link, health and API route work through Azure |

### Phase 2, complete handler and APIM migration

| Done | ID | Task | Owner | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| [ ] | API-01 | Extract shared validation, authentication context, error mapping and service boundaries from all six handlers | A | APP-03 | Handlers share one typed execution contract |
| [ ] | API-02 | Port the remaining five handlers and their shared modules to the App Service runtime | A | API-01 | All six routes have compatibility coverage |
| [ ] | API-03 | Publish concrete APIM operations and policies for every route | A | API-02, IAC-06 | Every supported route works through APIM with expected limits and CORS |
| [ ] | API-04 | Make the APIM origin selectable and switch Azure-target web and Capacitor builds | A | API-03 | Azure-target builds call APIM; the production default is unchanged until Phase 6 |
| [ ] | API-05 | Exercise the Vercel rollback path and freeze it during migration | A+H | API-04 | A documented rollback can restore the prior API without data loss |

### Phase 3, PostgreSQL migration

| Done | ID | Task | Owner | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| [ ] | DB-01 | Inventory Supabase tables, RLS, triggers, functions, RPCs and auth-coupled columns | A | - | Every migration object is classified as portable, translated or retired |
| [ ] | DB-02 | Create Azure PostgreSQL schema migrations and migration verification queries | A | DB-01 | A clean database reaches the expected schema deterministically |
| [ ] | DB-03 | Add server-side repositories and API operations for progress, settings and sync | A | API-02, DB-02 | Only App Service opens PostgreSQL connections |
| [ ] | DB-04 | Replace browser Supabase persistence calls with the server API while preserving offline and guest behavior | A | DB-03 | Existing sync scenarios pass without a browser database credential |
| [ ] | DB-05 | Export, transform and import production data | A+H | DB-04, IN-01, IN-06 | Record counts, ownership mappings and sampled checksums reconcile |
| [ ] | DB-06 | Perform controlled database cutover and rollback rehearsal | A+H | DB-05 | PostgreSQL handles production reads and writes; rollback steps are timed and documented |

### Phase 4, Entra External ID migration

| Done | ID | Task | Owner | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| [ ] | AUTH-01 | Introduce provider-neutral `AppUser`, `AuthSession` and auth-error contracts | A | - | UI and stores no longer expose Supabase auth types |
| [ ] | AUTH-02 | Configure web and Capacitor Entra applications and user flows | H | IN-05 | Redirect, logout and recovery flows are enabled for both clients |
| [ ] | AUTH-03 | Implement the Entra client provider and token lifecycle | A | AUTH-01, AUTH-02 | Sign-up, sign-in, refresh and sign-out work on web and Capacitor |
| [ ] | AUTH-04 | Validate Entra JWTs in App Service and enforce identity in APIM/API operations | A | AUTH-03, API-03 | Protected routes reject invalid tokens and accept intended users |
| [ ] | AUTH-05 | Map existing Supabase users to Entra identities and preserve guest conversion | A+H | AUTH-04, DB-06 | Existing progress remains attached to the correct account |
| [ ] | AUTH-06 | Cut over authentication and rehearse rollback | A+H | AUTH-05 | Production sessions use Entra; account recovery and rollback are verified |

### Phase 5, remaining Azure integrations

| Done | ID | Task | Owner | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| [ ] | AUD-01 | Store generated TTS audio in Blob with deterministic keys, content types and cache headers | A | API-02 | Repeated generation returns the cached object |
| [ ] | AUD-02 | Serve `/audio/*` through Front Door and repoint Azure-target clients | A+H | AUD-01, IAC-07 | Web and Capacitor audio works through Front Door with correct CORS, WAF and caching |
| [ ] | OBS-01 | Map product events and exceptions from PostHog/Sentry to Application Insights | A | APP-05 | Required events, failures and performance traces appear in Application Insights |
| [ ] | AI-01 | Add a provider-neutral AI interface and Foundry implementation | A | API-02, IN-04 | Existing AI scenarios pass against Foundry with bounded timeouts and errors |
| [ ] | AI-02 | Add Redis caching for stable, non-user-specific Foundry requests | A | AI-01 | Versioned keys include model, prompt and settings; TTL and hit metrics are defined |
| [ ] | AI-03 | Switch AI traffic to Foundry and remove Gemini runtime configuration | A+H | AI-02 | Production has no Gemini requests and rollback remains available |
| [ ] | OPT-01 | Verify whether `resend`, PostHog and Sentry are active in production | A+H | - | Each is marked migrate, remove or not used; Communication Services remains conditional |

### Phase 6, production cutover and cleanup

| Done | ID | Task | Owner | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- |
| [ ] | CUT-00 | Apply the APIM production service-level decision | A+H | API-03, IN-07 | The approved tier is deployed and its availability, policy behavior and rollback path are verified |
| [ ] | CUT-01 | Run application, API, auth, sync, audio and Capacitor regression coverage | A | CUT-00, DB-06, AUTH-06, AUD-02, OBS-01, AI-03 | Required automated and manual scenarios pass |
| [ ] | CUT-02 | Switch production web, API and audio traffic to Azure | A+H | CUT-01 | Front Door, APIM and App Service serve all production paths |
| [ ] | CUT-03 | Observe the agreed rollback window and resolve migration errors | A+H | CUT-02 | Error, latency and data-integrity thresholds remain acceptable |
| [ ] | CUT-04 | Remove Vercel, Supabase, Gemini, PostHog and Sentry dependencies, variables and credentials | A+H | CUT-03 | No runtime reference or active credential remains |
| [ ] | CUT-05 | Update setup, deployment, recovery and architecture documentation | A | CUT-04 | Documentation describes the deployed Azure system and rollback boundaries |

## Validation gates

Passing a phase means retaining evidence for its gate, not only completing the code edits.

| Gate | Required evidence |
| --- | --- |
| V0, baseline | Record the existing results of `pnpm run build`, `pnpm test` and `pnpm run validate:all` before migration code changes, separating pre-existing failures from regressions |
| V1, infrastructure | Successful Bicep build; SKU, quota and runtime availability evidence; reviewed what-if; no unexpected replacement or duplicate Speech account |
| V2, App Service and API | Production-package build; server and route tests; live smoke tests for root, deep link, `/health` and all six routes both directly where allowed and through APIM; CORS, method, auth, throttling and error cases exercised |
| V3, data and auth | Repeatable migration dry run; schema and record-count reconciliation; sampled checksums and ownership mappings; timed database and auth rollback rehearsals; web and Capacitor sign-in/recovery coverage |
| V4, service integrations | Front Door cache/CORS/WAF checks; Blob cache-hit proof; Application Insights event and exception traces; Foundry timeout/error tests; Redis hit, miss, TTL and key-isolation metrics |
| V5, cutover | `pnpm run build`, `pnpm test`, `pnpm run validate:all` and the applicable Playwright suite pass; production smoke tests pass on web and Capacitor; restore and rollback instructions have named owners |

## Migration definition of done

The repository migration is complete only when:

* Front Door, APIM and App Service serve every production web, API and audio path on an explicitly supported runtime and approved production tiers.
* PostgreSQL is reachable only through the server API, Entra External ID owns production authentication, existing identities and progress reconcile, and guest/offline behavior is preserved.
* Foundry handles production AI traffic, Redis has a measured genuine consumer, and Application Insights receives the required telemetry and errors.
* WAF and origin-bypass controls are deployed, no browser bundle contains server credentials or APIM master keys, and least-privilege identities are documented.
* IaC builds reproducibly, deployment what-if is reviewed, any retained compiled template matches source, and restore plus rollback rehearsals have succeeded.
* The rollback window has closed, retired-provider credentials and runtime dependencies are removed, and setup, deployment, recovery and architecture documentation matches production.

## Risk register

| Risk | Mitigation |
| --- | --- |
| Selected SKU, quota or Node 22 runtime is unavailable in `australiaeast` | verify subscription-specific availability before what-if and record an approved substitution before changing Bicep |
| Front Door is described as WAF-protected but no policy is associated | make WAF policy deployment, endpoint association and origin-bypass verification a Phase 0 gate |
| APIM Developer carries production traffic despite having no SLA | require IN-07 and CUT-00 before production cutover; select an available SLA-backed tier or time-box explicit risk acceptance |
| Auth migration overruns the schedule | it does not block the App Service/API vertical slice or the separate resource-provisioning track |
| Foundry left unthrottled | keep the operations budget throttle independent of implementation phases |
