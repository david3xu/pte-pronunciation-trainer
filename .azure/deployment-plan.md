# Azure deployment plan

Status: Planning

This plan is under review. It is not approved and it is not validated. No
provisioning has occurred and no live Azure read has been performed to support it.

## 1. Goal and scope

Stand up an Azure estate beside the running production deployment so that the
application can be migrated onto it incrementally. This is a side by side staging
rollout. It is not a production cutover.

What this plan covers: provisioning the approved Azure services, upgrading the
existing Speech account in place, and deploying a Node production server that
serves the built client, the generated practice content, a health endpoint and one
verified API route.

What this plan does not cover: moving production traffic, retiring any third party,
migrating the database, migrating authentication, or replacing Gemini with Foundry.
Each is sequenced separately in section 9.

## 2. Confirmed deployment context

| Setting | Value |
| --- | --- |
| Subscription | Azure subscription 1 |
| Subscription ID | `<subscription-id>` |
| Tenant ID | `<tenant-id>` |
| Region | `australiaeast` |
| Resource group | `ccl-pronunciation-trainer-rg` |
| Existing Speech account | `ccl-pronunciation-speech-david` |
| Deployment stage | `staging` |

The subscription ID is recorded here even though AZD manages it, because the
preflight refuses to continue when the exported value and the stored AZD
environment disagree, and resolving that disagreement needs a written reference.

The region and the resource group are pinned as parameter defaults. The Speech
account name is pinned as a single entry allowed list, so the template cannot
compile against any other name.

## 3. Resource inventory

All resources are created in `ccl-pronunciation-trainer-rg` except Front Door,
which is global. Every resource carries the tags `product`, `azd-env-name`,
`managedBy` and `deploymentStage`.

| Component | Resource type | SKU or tier | Quantity | Action |
| --- | --- | --- | --- | --- |
| Frontend and API host | `Microsoft.Web/serverfarms` | Standard S1, Linux | 1 | create |
| Production server site | `Microsoft.Web/sites` | `NODE|22-lts` | 1 | create |
| Database | `Microsoft.DBforPostgreSQL/flexibleServers` | Burstable `Standard_B2s`, PostgreSQL 16, 64 GB, 7 day backups | 1 | create |
| Inference cache | `Microsoft.Cache/redis` | Basic C1 | 1 | create |
| Generated audio | `Microsoft.Storage/storageAccounts` | StorageV2 Standard LRS | 1 | create |
| Public delivery | `Microsoft.Cdn/profiles` | Standard Azure Front Door | 1 | create |
| Web application firewall | `Microsoft.Network/FrontDoorWebApplicationFirewallPolicies` | Standard, prevention mode | 1 | create |
| API gateway | `Microsoft.ApiManagement/service` | Developer, 1 unit | 1 | create |
| Logs | `Microsoft.OperationalInsights/workspaces` | PerGB2018, 30 day retention | 1 | create |
| Application performance | `Microsoft.Insights/components` | workspace based | 1 | create |
| Speech | `Microsoft.CognitiveServices/accounts` | F0 to S0 | 1 | **update in place** |

Reused and never created by this deployment: the shared Azure AI Foundry account.
No Foundry, OpenAI, model deployment or Machine Learning resource appears anywhere
in the template, and a compiled template check enforces that.

### 3.1 Estimated cost

Estimates only, from `docs/AZURE_WORKLOAD_PLAN.md`. Not priced in the Azure
calculator. Price each before accepting the provisioning gate.

| Resource | Estimated USD per month |
| --- | --- |
| App Service plan S1 | 70 |
| API Management Developer | 50 |
| Redis Basic C1 | 41 |
| PostgreSQL B2s plus 64 GB | 40 |
| Front Door Standard | 35 |
| Storage Standard LRS | 5 |
| Fixed total | about 241 |

Usage billed and excluded from that total: Log Analytics, Application Insights,
Azure AI Speech, and any Front Door egress or WAF request charges.

## 4. Identities and access

| Identity | Purpose | State |
| --- | --- | --- |
| App Service system assigned identity | Blob read for generated audio, Speech invocation, Foundry inference, PostgreSQL access | principal ID is an output; role assignments are **not yet defined** |
| API Management system assigned identity | Reserved for backend authentication | principal ID is an output; no assignments yet |
| PostgreSQL Entra administrator | Sole administrative path; password authentication is disabled | operator supplied, required |

Least privilege role assignments are deliberately absent rather than stubbed. An
empty role assignment module reads as complete and is not. Until they exist, the
server reaches no data service, which is consistent with section 8.

## 5. Deployment outputs

No output carries secret material. Connection strings, access keys, the Application
Insights ingestion key and the database credential are all absent by design,
because deployment outputs remain readable in deployment history to any principal
with reader access. A compiled template check enforces this.

| Output | Content |
| --- | --- |
| `DEPLOYMENT_STAGE` | `staging` or `production` |
| `AZURE_RESOURCE_GROUP_NAME` | resource group name |
| `PUBLIC_URL`, `FRONT_DOOR_URL` | Front Door endpoint URL |
| `APP_SERVICE_URL`, `HEALTH_URL` | App Service URL and health endpoint |
| `WEB_APP_NAME`, `WEB_APP_ID`, `WEB_APP_HOST_NAME`, `WEB_APP_PRINCIPAL_ID`, `APP_SERVICE_PLAN_NAME` | App Service identifiers |
| `FRONT_DOOR_PROFILE_NAME`, `FRONT_DOOR_ENDPOINT_HOST_NAME`, `FRONT_DOOR_WAF_POLICY_NAME`, `FRONT_DOOR_MANAGED_RULES_ATTACHED` | Front Door and WAF identifiers |
| `APIM_SERVICE_NAME`, `APIM_GATEWAY_URL`, `APIM_PRINCIPAL_ID` | API Management identifiers |
| `POSTGRES_SERVER_NAME`, `POSTGRES_SERVER_ID`, `POSTGRES_SERVER_FQDN`, `POSTGRES_DATABASE_NAME` | PostgreSQL identifiers |
| `REDIS_CACHE_NAME`, `REDIS_CACHE_ID`, `REDIS_HOST_NAME` | Redis identifiers |
| `STORAGE_ACCOUNT_NAME`, `STORAGE_ACCOUNT_ID`, `BLOB_ENDPOINT`, `AUDIO_CONTAINER_NAME` | Storage identifiers |
| `LOG_ANALYTICS_WORKSPACE_NAME`, `LOG_ANALYTICS_WORKSPACE_ID`, `APP_INSIGHTS_NAME`, `APP_INSIGHTS_ID` | Monitoring identifiers |
| `SPEECH_ACCOUNT_NAME`, `SPEECH_ACCOUNT_ID`, `SPEECH_ENDPOINT`, `SPEECH_SKU` | Speech identifiers |

Output names are neutral rather than stage prefixed. A name encoding the
environment would require renaming to promote, and a rename breaks consumers. The
stage is reported separately.

## 6. AZD environment values

### 6.0 Where values live

The selected AZD environment is `staging`. Its values are stored in
`.azure/staging/.env`, which is ignored by `.azure/.gitignore` and is not committed.
No value from that file is reproduced in this document or anywhere else under
version control. Only configuration status is recorded here.

To inspect the configured values, run `azd env get-values` locally. To change one,
use `azd env set`.

### 6.1 Required. Provisioning is refused without these.

| Key | Purpose | Status |
| --- | --- | --- |
| `APIM_PUBLISHER_EMAIL` | API Management notification recipient. Real mail is delivered there, so it is never inferred. | configured locally |
| `APIM_PUBLISHER_NAME` | Publisher organisation shown in the developer portal | configured locally |
| `POSTGRES_ENTRA_ADMIN_OBJECT_ID` | Sole administrative path. Password authentication is disabled, so a wrong value leaves the server unreachable. | configured locally |
| `POSTGRES_ENTRA_ADMIN_PRINCIPAL_NAME` | Recorded with the administrator | configured locally |
| `AZURE_CONFIRM_PAID_PROVISIONING` | Exactly `yes`. See section 7. | **not set, deliberately** |

The four operator inputs are configured. The paid provisioning confirmation is not,
and is now the only value in this table blocking a provisioning attempt.

### 6.2 Conditional. Required only when the condition holds.

| Key | Condition | Status |
| --- | --- | --- |
| `AZURE_CONFIRM_SPEECH_SKU_UPGRADE` | The deployed Speech SKU differs from the requested SKU | **not set, deliberately** |
| `AZURE_CONFIRM_PRODUCTION_STAGE` | `DEPLOYMENT_STAGE` is `production` | not set, and not applicable while the stage is `staging` |

### 6.3 Defaulted. Override only to target a different environment.

All five are also set explicitly in the local environment, so the effective value
matches the default rather than relying on it.

| Key | Default | Status |
| --- | --- | --- |
| `AZURE_LOCATION` | `australiaeast` | set locally, matches default |
| `AZURE_RESOURCE_GROUP` | `ccl-pronunciation-trainer-rg` | set locally, matches default |
| `SPEECH_ACCOUNT_NAME` | `ccl-pronunciation-speech-david` | set locally, matches default |
| `AZURE_ENV_NAME` | `staging` | set locally, matches default |
| `DEPLOYMENT_STAGE` | `staging` | set locally, matches default |

`AZURE_SUBSCRIPTION_ID` is also configured locally. It has no template default,
because the preflight compares the exported value against the stored environment and
a default would mask a disagreement rather than surface it.

### 6.4 Deferred. Absent is correct during the foundation stage.

| Key | Deferred until |
| --- | --- |
| `FOUNDRY_RESOURCE_ID` | AI migration. Needed to scope the inference role assignment. |
| `FOUNDRY_ENDPOINT` | AI migration. Server side only, never exposed to a browser. |
| `FOUNDRY_DEPLOYMENT_NAME` | AI migration. Also part of any cache key. |
| `WEB_ALLOWED_ORIGINS` | A browser client points at this estate. Empty is correct until then. |
| `CAPACITOR_ALLOWED_ORIGINS` | A native build points at this estate |

The preflight reports deferred values as warnings, not failures, so their absence
cannot block the foundation deployment.

## 7. Guards before anything bills

Three independent confirmations, each requiring the exact value `yes`. Anything
else, including other truthy strings, counts as absent. Each refuses by default so
an unattended run cannot proceed by omission.

| Guard | Question it asks |
| --- | --- |
| `AZURE_CONFIRM_PAID_PROVISIONING` | Create about 241 USD per month of fixed cost resources |
| `AZURE_CONFIRM_SPEECH_SKU_UPGRADE` | Move the account already serving production traffic from F0 to S0, which starts billing for synthesis that is currently free |
| `AZURE_CONFIRM_PRODUCTION_STAGE` | Declare this estate production while handler parity is incomplete |

The Speech guard applies only when the SKU would actually change. Confirming a no
operation trains an operator to confirm without reading.

## 8. Product continuity

Non negotiable for this stage.

1. No DNS change. No custom domain is bound and no production record is repointed.
2. No client origin change. The production web and Capacitor builds continue to
   call the existing production API origin.
3. No third party is disabled or removed. Vercel, Supabase, Gemini, PostHog and
   Sentry all remain in service and remain the production path.
4. PostgreSQL, Redis and Foundry are not required for application startup. The
   production server reads none of them. Their host names are present as app
   settings only.
5. API Management exposes only the verified `/api/voices` operation.
6. The endpoint is not production. The health endpoint reports
   `{"status":"ok","stage":"staging"}`, and the server defaults to `staging` when
   the setting is absent, so an unset value cannot misrepresent a partial estate.

## 9. Deferred application migration

### 9.1 Handler contract matrix

Evidence for the deferred migration. Five of six handlers remain on Vercel. Each
Vercel entry point stays in place as a thin adapter so rollback parity is retained.

| Route | Methods | Limits | Output | Notable headers | Environment | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/voices` | GET | none | JSON envelope | `cache-control: public, max-age=3600` | none | 405 with `Allow` |
| `/api/premium-tts` | POST, GET, OPTIONS | text required, 3000 character maximum | binary MP3 when GET and `format=audio`, otherwise JSON with base64 | CORS on every response, `private, max-age=86400`, `X-Voice-Id`, `X-Language-Code` | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | 400 twice, and **HTTP 200 with `success:false` and `fallback:true` on provider failure** |
| `/api/audio/generate` | POST, OPTIONS | text required, 3000 character maximum | redirect on cache hit, binary MP3 on miss | `X-Cache-Status`, `X-Character-Count`, `X-Voice-Id`, CORS on preflight only | Speech, optional Supabase | **bare `{error}`**, not the envelope |
| `/api/ai/chat` | POST, OPTIONS | not yet characterised | **server sent event stream** | `text/event-stream`, `no-cache`, `keep-alive`, CORS including `Authorization` | `GEMINI_API_KEY`, optional Supabase | 400, 500, 429, and an in stream error frame after headers are sent |
| `/api/pronunciation-score` | POST | not yet characterised | JSON envelope | not yet characterised | Gemini | 405, 400 twice |
| `/api/ai-recommendations` | POST | not yet characterised | JSON envelope | not yet characterised | Gemini | 405, 400 |

Three properties must be preserved rather than normalised during migration.

1. Error envelopes are not uniform. `/api/audio/generate` returns a bare error
   object; the others use the success and error envelope.
2. `/api/premium-tts` returns HTTP 200 on provider failure. The background audio
   service depends on that and has a test asserting it.
3. CORS differs per handler in three distinct ways.

One handler genuinely streams, so the shared response contract must gain a stream
form preserving backpressure and abort. That is required rather than speculative,
and it is scoped to `/api/ai/chat` alone.

Call site note: no client code reads `api.endpoints.audioGenerate`. That route has
a real handler and is retained, but it is dormant and receives no traffic. Any
argument depending on it generating load is unsupported.

### 9.2 Migration sequence

1. Extend the response contract for server sent events.
2. Port `/api/ai-recommendations`.
3. Port `/api/ai/chat` in a dedicated change.
4. Port `/api/pronunciation-score` and `/api/premium-tts`.
5. Port dormant `/api/audio/generate`.
6. Add an API Management operation alongside each ported route.
7. Define least privilege role assignments.
8. Then, and only then, consider database, authentication and AI provider
   migration, each with its own plan.

## 10. Deployment method

The only supported command is:

```
azd up
```

### 10.1 Direct Bicep deployment is prohibited

Do not run `az deployment sub create`, `az deployment group create`, or any
equivalent direct invocation of `infra/azure/main.bicep`.

The reason is specific rather than stylistic. The Speech account is a Bicep
resource declaration, and ARM treats a declaration as an upsert. The template
cannot by itself refuse to create an account that does not exist. What prevents a
duplicate is the AZD preflight, which reads the named account and fails when it is
absent, when its kind is not `SpeechServices`, or when its region differs from the
target. A direct Bicep deployment skips the preflight entirely and therefore skips
that check.

The compiled template is not tracked. `infra/azure/main.json` was removed because a
compiled artifact drifts from its source, and the removed copy still carried the
former generated Speech account name. Compilation for review uses
`az bicep build --file infra/azure/main.bicep --stdout`, which writes nothing to
disk.

### 10.2 Layered Speech guarantee

Two layers, and both are required. Neither is sufficient alone.

| Layer | Guarantee | Limitation |
| --- | --- | --- |
| Pinned template | `speechAccountName` is a single entry allowed list, so the template cannot compile or deploy against any other name. A compiled template check verifies exactly one Cognitive Services account exists, that it resolves to the approved name through that constraint, and that no inference resource is created. | Cannot detect whether the account already exists. A declaration is an upsert. |
| Mandatory AZD preflight | Reads the named account and refuses when it is missing, when its kind differs, or when its region differs from the target. | Bypassed by any direct Bicep deployment, hence section 10.1. |

### 10.3 Ordering

Enforced by the preflight for steps 1 through 3 and by the Bicep dependency graph
thereafter.

1. Validate the AZD environment, including agreement between exported and stored
   values.
2. Register only resource providers that are not already registered.
3. Validate quota and regional capacity, one provider at a time.
4. Confirm paid provisioning, and the Speech and production guards where they apply.
5. Create or update the resource group.
6. Deploy Log Analytics and Application Insights.
7. Deploy App Service and its managed identity.
8. Deploy PostgreSQL, Redis and Storage.
9. Update the existing Speech account in place.
10. Deploy API Management against the App Service backend.
11. Deploy Front Door and the WAF policy.
12. Build and deploy the application package.
13. Print endpoints and the deployment summary.

API Management provisioning commonly takes 30 to 45 minutes. That is expected and
is not a failure.

## 11. Known risks accepted for this stage

| Risk | Position |
| --- | --- |
| API Management Developer has no service level agreement | Accepted for staging. Production cutover requires a separate tier decision. |
| Managed WAF rule sets require Front Door Premium | The approved SKU is Standard, which offers custom rules only. An API path rate limit rule is deployed. Closing this gap means accepting custom rules or approving a Premium upgrade, which changes the cost model. |
| Classic Azure Cache for Redis is a retiring product | Basic C1 availability is unverified. If it is unavailable that is a blocker requiring an approved substitution, not a silent move to Azure Managed Redis. |
| App Service origin lock down is absent | Front Door serves the site, but API Management also calls it and its outbound address is unknown until it exists. Restricting inbound traffic to the Front Door service tag alone would break the API path. |
| Least privilege role assignments are absent | Deliberate. The server reaches no data service yet. |

## 12. Rollback

### 12.1 Rollback is trivial while this stage holds

Production does not depend on this estate. Nothing needs to be restored to recover
production, because production traffic never moves in this stage. Rollback means
removing what was created.

1. Application rollback: none required. The production deployment is untouched.
2. Infrastructure rollback: delete the created resources. The resource group itself
   must be retained, because it holds the pre existing Speech account.
3. Speech rollback: return the account to `F0` if the S0 upgrade is not wanted.
   This is the only change that touches a resource production depends on, which is
   why it has a dedicated guard.

### 12.2 Conditions that trigger rollback

1. Any resource provisions at an unintended SKU or in an unintended region.
2. A second Speech account appears in the resource group.
3. Any Foundry, OpenAI, model deployment or Machine Learning resource appears.
4. Cost Management shows spend materially above the estimate in section 3.1.
5. The Speech upgrade degrades production synthesis.

### 12.3 Boundaries

Database, authentication and audio cache migrations are not in this stage, so they
have no rollback procedure here. Each requires its own plan with a rehearsed and
timed rollback before it proceeds.

## 13. Provider registration and quota evidence

**Status: blocked. Not executed.**

No live Azure read has been performed for this plan. Nothing in this section is
evidence and nothing in it may be treated as verified. The automation to gather it
exists and has been exercised in check mode only.

Providers requiring a registration check: `Microsoft.Web`,
`Microsoft.DBforPostgreSQL`, `Microsoft.Cache`, `Microsoft.Storage`,
`Microsoft.Cdn`, `Microsoft.ApiManagement`, `Microsoft.OperationalInsights`,
`Microsoft.Insights`, `Microsoft.CognitiveServices`, `Microsoft.Network`,
`Microsoft.Authorization`, `Microsoft.Quota`.

Previously reported as unregistered, unverified here: `Microsoft.Quota`,
`Microsoft.Cache`, `Microsoft.Cdn`, `Microsoft.ApiManagement`.

Checks that remain outstanding, each requiring authorised live execution:

| Check | Status |
| --- | --- |
| Resource provider registration states | not executed |
| App Service S1 with Linux workers offered in `australiaeast` | not executed |
| Advertised Linux runtime list contains `NODE|22-lts` | not executed |
| PostgreSQL `Standard_B2s`, Burstable, version 16 offered | not executed |
| Redis Basic C1 still provisionable | not executed, and not establishable by regional support alone |
| Front Door and API Management regional support and headroom | not executed |
| Quota limits and remaining headroom after current usage | not executed |
| Existing Speech account name, kind, region and current SKU | not executed |
| Speech S0 offered for the existing account | not executed |

Run `pnpm run azure:preflight` to gather these. It performs live reads and, in live
mode, registers missing providers. Paste its evidence output into section 14.

One caveat about check mode, recorded because the naming invites the wrong
assumption. `pnpm run azure:preflight:check` is write free: it installs no CLI
extension and registers no provider. It is **not** query free. It still calls
`az account show`, the runtime and SKU listings, the quota surface and Resource
Graph. So check mode is not a way to satisfy an instruction that prohibits querying
Azure, and it was deliberately not run while gathering the configuration status in
section 6.

## 14. Validation proof

**Status: not yet run.**

This section is intentionally empty. It is populated only from the output of an
authorised preflight run and an authorised deployment. Do not fill it from local
checks, and do not fill it by hand.

| Evidence | Status |
| --- | --- |
| Preflight evidence block | not yet run |
| Deployment what if review | not yet run |
| Provisioning result | not yet run |
| Live health endpoint response | not yet run |
| Live `/api/voices` response through App Service | not yet run |
| Live `/api/voices` response through API Management | not yet run |
| Front Door routing and WAF verification | not yet run |
| Cost Management daily reading per service | not yet run |

### 14.1 Local checks, recorded separately

Local checks are not deployment evidence. They are recorded here only to show the
repository state the plan describes.

| Command | Result |
| --- | --- |
| `pnpm test` | 378 passing across 27 files |
| `pnpm run build` | success, 647 modules, service worker generated |
| `pnpm run build:server` | success |
| `pnpm run azure:package:check` | all three required inputs present |
| `pnpm run azure:smoke:server` | 8 checks passing against the compiled server |
| `az bicep build --file infra/azure/main.bicep --stdout` | 0 errors, 0 warnings |
| `pnpm run azure:verify:template` | 6 invariants passing, 45 resources and 72 outputs walked |

## 15. Exit criteria for this stage

This stage is complete when all of the following hold. None hold today.

1. Section 13 contains real gathered evidence.
2. A reviewed what if shows only intended resources and updates.
3. Provisioning succeeds and section 14 is populated.
4. The health endpoint reports the staging stage from the deployed site.
5. `/api/voices` answers identically through App Service and through API
   Management.
6. Exactly one Speech account exists in the resource group, at S0.
7. No Foundry or Machine Learning resource exists in the resource group.
8. Production remains served by the existing deployment, unchanged.
