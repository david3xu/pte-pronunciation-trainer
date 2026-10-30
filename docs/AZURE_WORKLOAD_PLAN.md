# Azure workload plan

Status: implementation plan. Infrastructure is deployed as of the 7-8 August recovery deployment; repository migration is not complete. Live spend and milestone-clock evidence are in "Current countable state" and "Dates", verified 21 August 2026.
Scope: subscription `<subscription-id>`, spanning ccl-pronunciation-trainer, datacore-platform and contextpatch.

Companion documents: `docs/operations/azure-workload-plan.md` in datacore-platform; `docs/azure-workload-position.md` in contextpatch.

> **Implementation authority.** The target set, canonical implementation sequence and implementation todos in this document are authoritative. Historical alternatives have been removed so they cannot override the selected App Service S1 and handler-first path.

## Direction

The trainer consolidates onto Azure. The five confirmed third-party providers are retired and replaced with Azure equivalents; `resend` remains conditional until its production use is verified.

### Complete third party inventory

Audited 6 August 2026 across the repository excluding `node_modules`, `dist`, `ios` and `data`.

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

Only two replacements add new service types to the target tally: App Service and Database for PostgreSQL. The other confirmed migrations consolidate onto services already in the set. That is expected: consolidation and the milestone are separate objectives that happen to overlap.

**One real benefit.** Application Insights becomes the common destination for server telemetry, product analytics and error reporting. It remains a retained, uncounted service rather than part of the six-service target.

**resend needs verification.** It appears exactly once, so it may be aspirational rather than wired. If transactional email is genuinely in use, Communication Services becomes an additional Azure service. If not, do not provision it to pad the count.

This is a product direction decision, not a milestone decision. The milestone benefits from it, but the reverse justification would be backwards and is not the reason recorded here.

## Objective

Reach the Microsoft for Startups $25,000 credit milestone. Requirement is five or more distinct Azure services, each above US$1 in spend, held for 60 continuous days. Six are targeted: five with fixed or base monthly floors, plus usage-controlled Foundry.

The milestone matters mainly for the one-time two year credit extension attached to it, not the headroom.

## Binding constraint

Spend and schedule, not architecture.

| Fact | Value |
| --- | --- |
| Consumed 1 to 6 August | A$986.15, almost entirely Foundry in `rg-openclaw-ai` |
| August forecast at unthrottled rate | A$2.58K |
| Credits remaining | US$3,633 as recorded 6 August; **not re-read**, the billing balance API rejects this profile |
| Planned steady rate after redesign | ~US$296/mo, about US$9.87/day |
| **Actual steady rate, 7-20 August** | **~US$38.83/day, about US$1,140/mo**, verified 21 August |
| Runway at planned rate | over twelve months |
| **Runway at actual rate** | **roughly three months from 6 August**, if the 6 August balance still held then |
| Credit expiry | 22 December 2026 |
| Milestone clock | **running since 7 August**, verified; see "Dates" |

**The exhaustion problem is not gone; it moved.** The 6 August draft of this section concluded that at roughly US$296 a month the US$3,633 balance outlives both the 60 day window and the 22 December expiry, making expiry the binding constraint. Verified spend is US$1,140 a month, close to four times that.

At the actual rate the balance funds roughly three months, not twelve. That is still enough to reach either candidate milestone date, 5 October or 11 October, but it does not reach 22 December. **Expiry is no longer the binding constraint; exhaustion is again**, and the margin is thinner than the earlier reasoning assumed rather than comfortable.

This inverts what the two year extension is for. It does not merely preserve an unused remainder, because on current numbers there will not be one. Confirm the live balance in the portal before relying on any of this arithmetic; the recorded US$3,633 is two weeks stale and the API route to re-read it is unavailable.

The largest single lever is PostgreSQL at US$467 a month across three servers, two of which bill identically. See `docs/operations/azure-workload-plan.md` in datacore-platform, which owns resource and credit tracking.

This only holds if Foundry is throttled. Left alone it consumes the entire balance by roughly 9 September and the redesign is moot.

Throttling Foundry to a deliberate floor near US$2 a day does double duty: it is the cost control, and it guarantees that workload stays above the daily threshold rather than drifting below it.

**The consolidation must not gate the clock.** Auth migration alone is multi-week work. Resource provisioning and cost verification may run in parallel with repository implementation, but they do not change the code dependency order below. A service counts as genuinely in use from the point it becomes a live migration target, not merely when it is provisioned.

## Current countable state

**Verified live 21 August 2026** against Cost Management, subscription `<subscription-id>`, `CostUSD`, daily granularity. Last settled day is 20 August; 21 August had not closed. Supersedes the 6 August "one workload" reading, which is retained only in git history.

Eight services cleared US$1 per day on every day from 7 August through 20 August without a break.

| Service | USD/day, 14-20 Aug mean | In the counted target set |
| --- | --- | --- |
| Azure Database for PostgreSQL | 15.35 | yes |
| Azure Bastion | 4.53 | **no, unplanned** |
| Redis Cache | 3.84 | yes |
| Azure Container Apps | 3.83 | yes, datacore |
| Azure App Service | 2.85 | yes |
| Virtual Machines | 1.99 | **no, unplanned** |
| API Management | 1.56 | yes |
| Azure Front Door | 1.12 | yes |

Below the floor, consistent with being retained rather than counted: Speech at 0.43-0.78 per day for the six days to 20 August (it bills under service name `Foundry Tools`, not a separate Speech meter), Load Balancer 0.68, Virtual Network 0.36, Container Registry 0.16, Storage 0.16, DNS 0.02. Key Vault, Bandwidth, Log Analytics and Entra bill zero.

**Foundry Models is US$0.00 per day** and has been since 6 August. Before the throttle it was the entire subscription: US$437.79 on 4 August, US$140.51 on 31 July. The throttle is confirmed effective; see the Foundry band note in `docs/operations/azure-workload-plan.md` in datacore-platform, which owns that control.

**Bastion and Virtual Machines are doing tally work by accident.** Both belong to the synthetic monitor VM added 7 August. Together they cost roughly US$198 a month, more than App Service and API Management combined, and neither appears in any counted service table in this plan or datacore's. If they qualify, the subscription is at eight workloads, which is exactly the condition open question four asks about. That should be a decision, not drift.

**Run rate is roughly US$38.83 per day, about US$1,140 a month**, measured over the fourteen settled days from 7 August. The target set in this document estimates US$296 a month and the approved ceiling is US$400. Actual trainer-plus-datacore spend is over the combined budget of both products. Sixty-day spend to 20 August is US$2,514.93; August month to date through 20 August is US$1,305.52.

The credit balance could not be read: the billing `availableBalance` API returns Bad Request on this MicrosoftCustomerAgreement profile. Remaining balance against the recorded US$3,633 needs the portal.

## Counting rule, and why distinct types

The published definition says each unique service counts as one workload. It does not document whether Microsoft counts by service name, product, meter category, or deployed resource. The ambiguity is open on Microsoft Q&A without a definitive answer.

Distinct service types satisfy both readings. Multiple resources inside one service only satisfy the permissive one. The plan uses distinct types throughout.

Spend margin is not the safety mechanism; billing model is. A service averaging US$2 a month sits at seven cents a day and fails a daily reading regardless. Fixed monthly floors cannot drop. Consumption services clear the floor only if real traffic passes through them.

## Spend floor interpretation, decided

**Every counted service must clear US$1 per day, not US$1 per month.** Approved 6 August 2026 as the design assumption.

This is the strict reading of an ambiguous rule and it inverts the whole design. A service must cost roughly US$30 a month or more to qualify, which disqualifies every cheap tier. Optimising for low cost, which the earlier drafts of this plan did, actively defeats the requirement.

Disqualified by this decision, all of them previously in the target set:

| Service | Previously chosen tier | Per day | Result |
| --- | --- | --- | --- |
| Static Web Apps | Standard, $9/mo | $0.30 | fails |
| Container Registry | Basic, $5/mo | $0.17 | fails |
| Blob Storage | Hot, ~$5/mo | $0.17 | fails, would need roughly 1.6TB stored |
| Database for PostgreSQL | B1ms, ~$15/mo | $0.50 | fails, needs sizing up |
| Application Insights | usage | marginal | needs roughly 360MB/day ingestion |
| AI Speech | S0 usage | marginal | needs roughly 65k characters/day |

The cost of the strict reading is roughly six times the lenient one. See open question three: the documentation does not state which applies, and confirming it before committing is worth about US$300 over the window.

## Target set

Six services, roughly **US$296 a month**, each with a floor that clears US$1 per day. Five are required for the $25,000 milestone, so this carries one workload of buffer.

**Approved ceiling: US$400 a month.** The margin above US$296 is not slack. Foundry is entirely usage billed and Front Door can add usage and WAF charges above its base fee. Speech is also usage billed but is outside the six-service target. Every figure below is estimated from memory of list prices, so overshoot is likely rather than possible.

| # | Service | Tier | Est. USD/mo | Est. USD/day | Floor holds because |
| --- | --- | --- | --- | --- | --- |
| 1 | App Service | Standard S1 | 70 | 2.33 | fixed compute charge |
| 2 | Database for PostgreSQL | B2s plus 64GB | 40 | 1.33 | fixed vCore plus storage |
| 3 | Front Door | Standard | 35 | 1.17 | fixed base fee |
| 4 | Cache for Redis | Basic C1 | 41 | 1.37 | fixed tier charge |
| 5 | API Management | Developer | 50 | 1.67 | fixed instance charge |
| 6 | Foundry | throttled to a deliberate floor | 60 | 2.00 | directly controlled |

Estimate only, from memory of Azure list prices. Price each in the calculator for `australiaeast` before provisioning. The API Management estimate assumes Developer; if IN-07 selects another tier, reprice the total and confirm it remains below the approved ceiling.

### Justification, not just price

A price tag is not a reason. Each entry has to survive the program's genuine use condition.

* **App Service S1** replaces Static Web Apps for the `dist` build. Chosen over Basic B3 at US$55 deliberately: four cores serving static files invites the charge of being contrived, whereas deployment slots, autoscale and backups are defensible on capability. It also absorbs the six `api/` HTTP handlers.
* **PostgreSQL B2s** replaces the Supabase database. Sized up from B1ms purely to clear the daily floor; B1ms would be adequate on load alone.
* **Front Door Standard** replaces the CDN slot for audio delivery and provides managed TLS and edge routing. WAF is intended but is not present in `infra/azure/front-door.bicep`; a policy and endpoint association must be added before public cutover, and its separate charges must be included in the calculator estimate.
* **Cache for Redis C1** caches Foundry responses for repeated vocabulary items. In a study app many users hit the same words, so this genuinely reduces inference cost. Also carries session state and rate limiting.
* **API Management Developer** fronts the handlers during migration with policy enforcement and throttling. Developer has no SLA and is not an automatic production choice; production cutover requires an explicit decision to accept that risk temporarily or move to an available SLA-backed tier.
* **Foundry** replaces Gemini and is throttled to a deliberate floor rather than left to run.

Redis and API Management are the two most vulnerable to a charge of being contrived. Removing Redis leaves five target services at roughly US$255 a month; removing API Management leaves five at roughly US$246. Removing both leaves four at roughly US$205 and no longer satisfies the five-service objective without a justified replacement.

### Retained but not counted

Retain Blob Storage, AI Speech at `S0`, Application Insights and datacore's Container Registry only for their product roles. They are not part of the six-service target. If Microsoft confirms a cumulative floor, count one only after Cost Management shows that service has actually crossed the required spend; do not assume that a provisioned low-cost resource qualifies.

Entra External ID replaces Supabase auth and bills zero on the free monthly active user tier. Consolidation only.

Communication Services replaces `resend`, conditional on verifying that transactional email is genuinely in use.

Trainer resources use `australiaeast` except global Front Door. Tag every resource by product; two products share this subscription.

## Consequence for datacore

The trainer now needs Postgres for its own reasons, which resolves the open decision in `docs/operations/azure-workload-plan.md` in datacore-platform. datacore keeps its compose Postgres and its local-first property. It contributes Container Registry and Foundry only.

Sharing one Postgres server between an event-sourced write path and a consumer app is still not advisable. The trainer uses its own B2s server; sharing would count once either way.

## Migration inventory

Work required by the all-Azure direction, largest first.

### Auth, Supabase to Entra External ID. Largest item.

Touches `src/services/supabase/authService.ts`, `supabaseClient.ts`, and every call site that assumes a Supabase session. No drop-in equivalent exists. An Entra External ID tenant already exists at `syntiondevdavidxu.onmicrosoft.com`, though it was provisioned for a different purpose and its suitability needs checking before reuse.

Expect this to dominate the schedule. It does not block the clock.

### Database, Supabase to Azure PostgreSQL

Touches `supabase/migrations/`, `src/types/database.ts`, `src/services/supabase/syncService.ts`, `autoSyncManager.ts`, `src/services/migration/migrationService.ts`. Schema translation is mechanical; the sync layer assumptions are not.

Provision early. Postgres has a fixed floor and begins counting immediately.

### Hosting and handlers, Vercel to App Service

App Service S1 is the single target for both the Vite `dist` build and all six `api/` HTTP handlers. Static Web Apps is not part of the selected design.

The first application deliverable is a Node 22 production runtime that serves `dist`, provides SPA fallback routing, exposes `/health`, and hosts `/api/*`. Handler business logic is extracted from `VercelRequest` and `VercelResponse` behind framework-neutral interfaces before the routes move.

Migrate `/api/voices` first to prove packaging, startup, routing, telemetry and APIM proxying. Then move the remaining handlers (`ai-recommendations.ts`, `ai/chat.ts`, `audio/generate.ts`, `premium-tts.ts`, and `pronunciation-score.ts`) as one compatibility-tested API surface. `config.ts` and `azureSpeech.ts` are shared modules, not HTTP handlers, and move with their consumers.

Vercel remains available only as a rollback target during cutover. It is not a PostgreSQL client: the browser never connects directly to PostgreSQL, and PostgreSQL networking permits the App Service backend rather than Vercel egress.

### Analytics and error tracking, PostHog and Sentry to Application Insights

Touches `src/services/analytics/analyticsService.ts` and the `VITE_POSTHOG_API_KEY` and `VITE_POSTHOG_HOST` declarations in `src/env.d.ts`, both currently optional. Sentry appears once and may not be wired; verify before planning removal work.

Small change that establishes one observability path. Baseline server telemetry lands with the App Service vertical slice; product analytics and error migration complete in Phase 5.

### Email, resend to Communication Services. Verify first.

Single reference in the repository. Establish whether transactional email is actually in use before provisioning anything. If it is, Communication Services is an additional Azure service. If it is not, skip it; provisioning an unused service to raise the count is the exact case the program's genuine use condition excludes.

### AI, Gemini to Foundry. Lowest priority.

Touches `src/services/ai/` throughout: `recommendationService.ts`, `recommendationEngine.ts`, `ratingService.ts`, `interventionEngine.ts`, `weakAreaDetector.ts`, `taskPersonas.ts`, plus `api/ai/chat.ts` and the `gemini.*` config keys (`defaultModel`, `maxTokens`, `temperature`, `topP`, `topK`), currently on `gemini-2.5-flash`.

**Sequence this last.** Foundry is already counted, so this yields zero additional workloads while adding inference load to a service controlled by the separate operations throttle. It is a consolidation goal, not a milestone contributor.

### Audio, new work rather than migration

Blob becomes the server-side cache for generated TTS, touching `api/audio/generate.ts` and `src/services/audio/audioCache.ts`, with Front Door serving `/audio/*` and client URLs repointed. Blob is retained but not counted; Front Door is in the target set.

## Explicitly rejected

Recorded so these are not re-litigated.

* **contextpatch gets nothing.** Six dependencies, no HTTP client, no async runtime, no network stack. That hermeticism is the security posture of a binary that mutates the source tree behind an allowlist. See `docs/azure-workload-position.md` in that repository. The all-Azure direction does not extend to it.
* **No datacore cloud migration.** Ruled out by `vision.md`, `v1-scope.md` and `plan.md`, the last of which requires a superseding ADR. Workers bind to local git worktrees, so a full move is a different product.
* **Provisioned but unused Redis.** Redis is not complete until an App Service handler uses it for rate limiting, session state or Foundry response caching. A cache with no local consumer does not satisfy the product design.
* **Service Bus or any broker.** `manager-sdk/src/fanout.ts` is `Promise.all`. Nothing queues.
* **Blob for datacore `artifact_paths`.** That field holds references to local worktree paths in the event envelope schema, not upload targets. Off-host backup of the event store is the real datacore Blob case.
* **AI Search.** Basic tier around US$75, free tier bills zero, and pgvector in the Postgres being provisioned covers vector needs.
* **Key Vault as a counted workload.** Genuinely useful, but standard tier needs roughly 330,000 operations to reach a dollar. Adopt it if wanted; do not count it.
* **Static Web Apps.** Standard fails the selected daily floor and duplicates the App Service host.
* **Container Apps as a counted workload.** The monthly free vCPU and memory grant can absorb a small always-on replica entirely. App Service S1 is the selected host.
* **Counting Entra External ID.** Free monthly active user tier means it bills zero at current scale.
* **Sharing the datacore Postgres with the trainer.** Counts once either way.

## Canonical implementation sequence

This sequence governs repository work. Cost controls and milestone verification run as a separate operations track and do not change code dependencies.

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

Deployed account is `ccl-pronunciation-speech-david`. The source Bicep now requires that explicit name, but the compiled template must be rebuilt before deployment. Do not deploy a stale `main.json` that still contains the former generated-name behavior.

```
az cognitiveservices account update \
  --name ccl-pronunciation-speech-david \
  --resource-group ccl-pronunciation-trainer-rg \
  --sku S0
```

After the SKU update, keep `main.bicepparam` and deployed reality aligned. The explicit account name is the single source of truth.

## Capability boundary

Which work can be done through the contextpatch MCP servers and which requires a human at a terminal or a browser. Recorded because misjudging this wastes a session.

### Can be done through MCP

The contextpatch servers are repo-confined edit engines with an allowlist of `git`, `cargo`, `bun`, `npm`, `pnpm`, `python3`, `pytest`, `rg`, and one exact bash script.

* Read, write and edit any file in ccl-pronunciation-trainer, datacore-platform and contextpatch
* Author and revise Bicep, TypeScript, SQL and documentation
* Search either codebase to ground a claim in what the code says
* Run the test suites, typecheck and lint
* Stage, commit, push, open pull requests

### Cannot be done through MCP

`az` is not on the allowlist and no cloud API is reachable from any of the 52 actions. Everything below needs a human.

| Blocked | Why |
| --- | --- |
| `az bicep build` | requires `az` |
| Any deployment | requires `az` and interactive authentication |
| Speech `F0` to `S0` | requires `az` |
| Reading Cost Management | requires portal or `az`, and is the only way to verify the daily floor |
| Confirming resource state | same |
| Anything needing credentials | no secret material is reachable, by design |

### Optional improvement

Microsoft ships an official Azure MCP Server covering 40 or more services, installable with `npx -y @azure/mcp@latest server start`, authenticating through Entra ID. A separate Resource Graph server handles subscription queries and ARM deployment management.

That would close the read gap: resource state, Cost Management queries, daily floor verification. It would not help with initial deployment, since authentication happens before the server starts and the raw `az deployment` output is worth seeing directly.

If adopted, scope it to a service principal with Contributor on `ccl-pronunciation-trainer-rg` rather than attaching the Owner identity. Owner can delete resource groups, read Key Vault secrets and create role assignments; nothing in this plan needs that.

Not a prerequisite. Set it up after the clock is running.

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

### Current state

Infrastructure is deployed. The 7-8 August recovery deployment provisioned App Service, PostgreSQL, Redis, Storage, Application Insights, Log Analytics, API Management, Front Door with WAF, Speech, and a synthetic monitor VM with Bastion; datacore's Container Apps environment is also live. Cost Management confirms all of it billing. No application migration task above is complete. The trainer still runs on Supabase, Gemini, Vercel and PostHog, and nothing in `src/` or `api/` consumes the planned PostgreSQL, Redis, Front Door or APIM resources.

The immediate blocking evidence is IAC-00 and IAC-01, plus IN-01 through IN-03 before what-if. While a human obtains those results, repository work can begin on the V0 baseline, APP-01/APP-03, DB-01, AUTH-01 and OPT-01 because none depends on an Azure deployment.

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

Billing qualification is a separate operations acceptance criterion. It neither substitutes for these engineering conditions nor makes an unused service complete.

## Dates

**T0 is verified. The clock is running.** Cost Management, read 21 August 2026 at daily granularity, shows an unbroken qualifying run beginning 7 August. See "Current countable state" for the per-service evidence.

| Date | Event | Status |
| --- | --- | --- |
| 6 Aug 2026 | Plan baseline; not a qualifying clock start | historical |
| **7 Aug 2026** | **T0 for the five-service $25,000 milestone.** First day at least five distinct service types each cleared US$1, unbroken since | **verified** |
| 13 Aug 2026 | First day all six services in this plan's target set cleared US$1 together; Container Apps came up last | verified |
| 21 Aug 2026 | Day 15 of 60 on the 7 August clock | current |
| **5 Oct 2026** | **Day 60 on the 7 August clock.** Candidate $25,000 milestone completion | projected |
| 11 Oct 2026 | Day 60 on the stricter 13 August all-six clock | projected |
| 22 Dec 2026 | Current credit expiry | fixed |

Both completion dates fall well before credit expiry.

The previously stated 5 October date turns out to be correct, but by coincidence and for a different reason than the earlier draft assumed. It is valid because 7 August is the verified T0, not because 6 August was. Do not restate the derivation from the plan baseline.

Any non-qualifying day resets the clock. The two most fragile entries are Front Door at US$1.08 to US$1.13 per day and API Management at US$1.45 to US$1.58, both within a small margin of the floor. Verify at daily granularity before treating either projected date as firm.

## Open questions

For Microsoft support or Q&A, with specifics rather than in the abstract.

1. Do two Cognitive Services accounts of different kinds count as two workloads, or one?
2. Do multiple resources inside one service, for example several container apps in one environment, count once or severally?
3. Is the US$1 floor cumulative across the window, or per day?
4. If retained or conditional services eventually bring the total to eight workloads and qualify directly for the $50,000 milestone, does the two year credit extension documented at $25,000 still trigger? Fifty thousand expiring 22 December would be worse than twenty five thousand that does not.

   **No longer hypothetical.** As of the 21 August verification the subscription has been at eight qualifying services since 7 August, because the monitor VM's Bastion and Virtual Machines meters both clear the floor. This question now needs an answer from support rather than a decision later, and the alternative lever is to stop the monitor VM, which drops the count to six and costs roughly US$198 a month less.
5. Is progression genuinely automatic? The portal shows no upgrade affordance, matching the documentation, but multiple reports describe weeks of silence after apparently qualifying.

## Unresolved, non-technical

`rg-syntion-dev` runs employer development inside a subscription verified against a personal entity. Worth a deliberate decision rather than drift.

## Risk register

| Risk | Mitigation |
| --- | --- |
| Daily floor is the wrong reading and the higher fixed tiers were unnecessary | confirm open question three before committing to the 60-day operating window |
| A service provisioned at too small a tier reads compliant monthly but fails daily | verify per service in Cost Management at daily granularity before assuming the clock started |
| Selected SKU, quota or Node 22 runtime is unavailable in `australiaeast` | verify subscription-specific availability before what-if and record an approved substitution before changing Bicep |
| Redis or API Management judged contrived under the genuine use condition | remove one and retain five services at roughly US$255 or US$246; removing both leaves four and requires a justified replacement |
| Front Door is described as WAF-protected but no policy is associated | make WAF policy deployment, endpoint association and origin-bypass verification a Phase 0 gate |
| APIM Developer carries production traffic despite having no SLA | require IN-07 and CUT-00 before production cutover; select an available SLA-backed tier or time-box explicit risk acceptance |
| Auth migration overruns the window | it does not block the App Service/API vertical slice or the separate resource-provisioning track |
| Foundry left unthrottled | consumes the balance by roughly 9 September and the redesign is moot; keep the operations throttle independent of implementation phases |
| Program terms change | portal shows PREVIEW, initial grant already moved from $1,000 to $200 in under two months. Avoid large architectural commitments justified only by credits |
| Provider lock-in after credits expire | acknowledged cost of the all-Azure direction. Foundry replaces a portable inference layer, so post-credit routing to a cheaper host becomes a project rather than a config change. At roughly US$296/mo this is a real recurring bill once credits end |
| A calendar estimate is mistaken for T0 | derive the milestone date only from the first verified qualifying day and reset it after any non-qualifying day |
