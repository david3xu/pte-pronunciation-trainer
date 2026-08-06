# Azure deployment plan

Status: Deployed

The original foundation plan was approved and validated on 6 August 2026. The user then
approved paid staging provisioning and the Speech F0 to S0 upgrade. Provisioning created
the base estate but stopped when Classic Azure Cache for Redis was rejected by the live
service and PostgreSQL administrator creation raced the server readiness transition.

The user approved this recovery scope: replace Classic Redis with Azure Managed Redis
`Balanced_B3` in `australiacentral`, retain the rest of the estate in
`australiaeast`, and reconcile the PostgreSQL Entra administrator through bounded,
idempotent postprovision automation. The existing validation record is invalid for this
changed architecture and must not be reused.

Paid staging provisioning and the Speech F0 to S0 upgrade remain explicitly confirmed
in the selected AZD environment. Production promotion and destructive rollback are not
authorised. The fresh official validation completed against the recovery architecture,
and `azure-deploy` has since completed. The full estate is provisioned, the application
is deployed, and live traffic through App Service, API Management and Front Door has
been verified. See section 17 for the evidence. Only Cost Management reporting remains
outstanding, and that is expected lag rather than a defect.

## 1. Goal and scope

Complete and repair the partially provisioned Azure estate beside the running production
deployment so that the application can be migrated onto it incrementally. This remains
a side by side staging rollout, not a production cutover.

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
| Primary region | `australiaeast` |
| Managed Redis region | `australiacentral` |
| Resource group | `ccl-pronunciation-trainer-rg` |
| Existing Speech account | `ccl-pronunciation-speech-david` |
| Deployment stage | `staging` |

The subscription ID is recorded here even though AZD manages it, because the
preflight refuses to continue when the exported value and the stored AZD
environment disagree, and resolving that disagreement needs a written reference.

The primary region and resource group are pinned as parameter defaults. Managed Redis
has a separate committed `australiacentral` parameter. The Speech account name is
pinned as a single entry allowed list, so the template cannot compile against any
other name.

## 3. Resource inventory

All resources are managed in `ccl-pronunciation-trainer-rg` except Front Door, which is
global. Existing resources are reconciled in place. Every resource carries the tags
`product`, `azd-env-name`, `managedBy` and `deploymentStage`.

| Component | Resource type | SKU or tier | Quantity | Action |
| --- | --- | --- | --- | --- |
| Frontend and API host | `Microsoft.Web/serverfarms` | Standard S1, Linux | 1 | exists; reconcile |
| Production server site | `Microsoft.Web/sites` | `NODE|22-lts` | 1 | exists; reconcile and deploy |
| Database | `Microsoft.DBforPostgreSQL/flexibleServers` | Burstable `Standard_B2s`, PostgreSQL 16, 64 GB, 7 day backups | 1 | exists; reconcile |
| Inference cache cluster | `Microsoft.Cache/redisEnterprise` | `Balanced_B3` | 1 | create in `australiacentral` |
| Inference cache database | `Microsoft.Cache/redisEnterprise/databases` | `default`, encrypted, keyless, `OSSCluster`, `AllKeysLRU`, port 10000 | 1 | create |
| Generated audio | `Microsoft.Storage/storageAccounts` | StorageV2 Standard LRS | 1 | exists; reconcile |
| Public delivery | `Microsoft.Cdn/profiles` | Standard Azure Front Door | 1 | create |
| Web application firewall | `Microsoft.Network/FrontDoorWebApplicationFirewallPolicies` | Standard, prevention mode | 1 | create |
| API gateway | `Microsoft.ApiManagement/service` | Developer, 1 unit | 1 | create |
| Logs | `Microsoft.OperationalInsights/workspaces` | PerGB2018, 30 day retention | 1 | exists; reconcile |
| Application performance | `Microsoft.Insights/components` | workspace based | 1 | exists; reconcile |
| Speech | `Microsoft.CognitiveServices/accounts` | F0 to S0 | 1 | **update existing account in place** |

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
| Azure Managed Redis Balanced B3 | 59 |
| PostgreSQL B2s plus 64 GB | 40 |
| Front Door Standard | 35 |
| Storage Standard LRS | 5 |
| Fixed total | about 259 |

Usage billed and excluded from that total: Log Analytics, Application Insights,
Azure AI Speech, and any Front Door egress or WAF request charges.

## 4. Identities and access

| Identity | Purpose | State |
| --- | --- | --- |
| App Service system assigned identity | Blob read for generated audio, Speech invocation, Foundry inference, PostgreSQL access | principal ID is an output; role assignments are **not yet defined** |
| API Management system assigned identity | Reserved for backend authentication | principal ID is an output; no assignments yet |
| PostgreSQL Entra administrator | Sole administrative path; password authentication is disabled | approved identity configured; live administrator absent; postprovision reconciliation required |

Least privilege role assignments are deliberately absent rather than stubbed. An
empty role assignment module reads as complete and is not. Until they exist, the
server reaches no data service, which is consistent with section 8.

The PostgreSQL server is live and `Ready`, with Entra authentication enabled, password
authentication disabled and the approved tenant configured. Bicep no longer creates the
administrator child during server provisioning. The postprovision hook waits through
only known transitional states, refuses conflicting administrators, creates only the
approved identity when absent, and re-reads the exact result before succeeding.

### 4.1 Role assignment verification

- **Status:** Verified for the approved foundation scope.
- **Identities checked:** App Service system assigned identity, API Management
  system assigned identity and the local Azure CLI identity.
- **Roles confirmed:** None. Neither deployed service identity is authorised to
  access another Azure resource in this stage.
- **Code cross-check:** The only registered handler, `/api/voices`, reads a
  compile-time constant. Static files are read from the application package, and
  API Management forwards to App Service over HTTPS without managed identity
  authentication. Local validation performs no Azure data-plane operation.
- **Issues:** None for this vertical slice. Any handler that reads Blob Storage,
  invokes Speech or Foundry, or connects to PostgreSQL must add and revalidate the
  matching least-privilege data-plane access before that handler is registered.

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
| `REDIS_CACHE_NAME`, `REDIS_CACHE_ID`, `REDIS_HOST_NAME`, `REDIS_PORT`, `REDIS_DATABASE_NAME` | Managed Redis identifiers |
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
| `AZURE_CONFIRM_PAID_PROVISIONING` | Exactly `yes`. See section 7. | **set from explicit user approval** |

The four operator inputs and the paid provisioning confirmation are configured.

### 6.2 Conditional. Required only when the condition holds.

| Key | Condition | Status |
| --- | --- | --- |
| `AZURE_CONFIRM_SPEECH_SKU_UPGRADE` | The deployed Speech SKU differs from the requested SKU | **set from explicit user approval; Speech remains F0 until recovery deployment** |
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
| `AZURE_CONFIRM_PAID_PROVISIONING` | Create or retain about 259 USD per month of fixed cost resources |
| `AZURE_CONFIRM_SPEECH_SKU_UPGRADE` | Move the account already serving production traffic from F0 to S0, which starts billing for synthesis that is currently free |
| `AZURE_CONFIRM_PRODUCTION_STAGE` | Declare this estate production while handler parity is incomplete |

The Speech guard applies only when the SKU would actually change. Confirming a no
operation trains an operator to confirm without reading.

### 7.1 Validation proof for the recovery

These commands validate only; none provisions a resource.

| Command or review | Result |
| --- | --- |
| `azd version`; `azd auth login --check-status` | AZD 1.23.13 installed; authenticated to the approved tenant and subscription |
| `azd env list`; redacted `azd env get-values --output json` review | `staging` selected; subscription, `australiaeast`, resource group and stage match this plan |
| `pnpm run azure:preflight:check` | pass: 34 pass, 6 expected deferred-value warnings, 4 skips and 21 capacity probes explicitly inconclusive |
| `pnpm run azure:validate:redis` | ARM validation and fail-closed what-if pass for the exact `Balanced_B3` cluster and `default` database in `australiacentral` |
| `pnpm run azure:bicep:build`; `pnpm run azure:verify:template` | compile passes with zero diagnostics; eight invariants pass |
| `pnpm test` | 456 tests pass across 31 files |
| `pnpm run build`; `pnpm run build:server` | client and production server build successfully |
| `azd provision --preview --no-prompt` | pass in 27 seconds; expected Managed Redis, API Management and Front Door creates, expected existing-resource reconciliations and Speech F0 to S0 update; no delete |
| `azd package --no-prompt` | application package succeeds |
| Azure Policy review | zero policy assignments on the target subscription |
| Static role review | no role assignment resource; the sole enabled API route performs no Azure data-plane operation |
| Aspire and Docker checks | not applicable; no AppHost, Aspire package, project file or Dockerfile |

## 8. Product continuity

Non negotiable for this stage.

1. No DNS change. No custom domain is bound and no production record is repointed.
2. No client origin change. The production web and Capacitor builds continue to
   call the existing production API origin.
3. No third party is disabled or removed. Vercel, Supabase, Gemini, PostHog and
   Sentry all remain in service and remain the production path.
4. PostgreSQL, Managed Redis and Foundry are not required for application startup. The
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

Assisted deployment runs in two steps, in this order:

```
azure-validate
azure-deploy
```

`azure-validate` gathers and reviews evidence. `azure-deploy` provisions and deploys
only after that evidence is accepted.

### 10.0 Direct azd up is prohibited

Do not run `azd up`. It collapses validation and provisioning into one action, which
removes the review point between them, and that review point is where the paid
provisioning and Speech upgrade decisions are actually made. The hooks still run under
`azd up`, so the guards would still fire, but the operator would be answering them mid
deployment rather than in advance.

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
8. Reconcile PostgreSQL and Storage, then create the Managed Redis cluster and
   database in `australiacentral`.
9. Update the existing Speech account in place.
10. Deploy API Management against the App Service backend.
11. Deploy Front Door and the WAF policy.
12. Reconcile the approved PostgreSQL Entra administrator through the postprovision
    hook.
13. Build and deploy the application package.
14. Verify the endpoints and print the deployment summary.

API Management provisioning commonly takes 30 to 45 minutes. That is expected and
is not a failure.

## 11. Known risks accepted for this stage

| Risk | Position |
| --- | --- |
| API Management Developer has no service level agreement | Accepted for staging. Production cutover requires a separate tier decision. |
| Managed WAF rule sets require Front Door Premium | The approved SKU is Standard, which offers custom rules only. An API path rate limit rule is deployed. Closing this gap means accepting custom rules or approving a Premium upgrade, which changes the cost model. |
| Managed Redis is in a second region | `Balanced_B3` is deployed in `australiacentral` because the approved tier is not available in `australiaeast`. The cross-region latency and transfer cost are accepted for staging. |
| Managed Redis what-if does not reserve capacity | ARM validation and what-if accept the exact cluster and database, but only live provisioning establishes capacity. Deployment must fail rather than substitute another tier or region. |
| PostgreSQL administrator creation follows server provisioning | The live server is Ready but has no administrator. The bounded postprovision repair refuses tenant, authentication or identity drift and fails closed on unrecognised conflicts. |
| App Service origin lock down is absent | Front Door serves the site, but API Management also calls it and its outbound address is unknown until it exists. Restricting inbound traffic to the Front Door service tag alone would break the API path. |
| Least privilege role assignments are absent | Deliberate. The server reaches no data service yet. |

## 12. Rollback

### 12.1 Rollback is trivial while this stage holds

Production does not depend on this estate. Nothing needs to be restored to recover
production, because production traffic never moves in this stage. Rollback means
removing what was created.

1. Application rollback: none required. The production deployment is untouched.
2. Infrastructure rollback: no deletion is authorised by this recovery. Any cleanup
   requires separate approval and must retain the resource group because it holds the
   pre existing Speech account and the already provisioned base estate.
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

## 13. Historical foundation evidence (superseded)

**Status: superseded by the partial deployment and approved recovery architecture.**

This section is retained as an audit record of the original Classic Redis design. It
is not current validation evidence and must not be used to authorise the recovery
deployment. In particular, the successful Classic Redis what-if did not predict the
subsequent live service-retirement rejection.

Gathered by `pnpm run azure:preflight:check`. That run performs Azure reads only. It
installed no CLI extension, registered no provider, set no confirmation and modified
no resource. Values below are what the run actually returned. Anything it could not
establish is recorded as such and is not inferred.

Overall conclusion returned: no blocking finding, and 22 probes could not establish
capacity.

### 13.1 Provider registration, returned

| Namespace | State |
| --- | --- |
| `Microsoft.Web` | Registered |
| `Microsoft.DBforPostgreSQL` | Registered |
| `Microsoft.Storage` | Registered |
| `Microsoft.OperationalInsights` | Registered |
| `Microsoft.Insights` | Registered |
| `Microsoft.CognitiveServices` | Registered |
| `Microsoft.Network` | Registered |
| `Microsoft.Authorization` | Registered |
| `Microsoft.Cache` | Registered, by authorised registration |
| `Microsoft.Cdn` | Registered, by authorised registration |
| `Microsoft.ApiManagement` | Registered, by authorised registration |
| `Microsoft.Quota` | Registered, by authorised registration |

All twelve namespaces are registered. Confirmed by a read at 2026-08-06T13:00Z.

Registration was performed by `pnpm run azure:prepare:subscription --confirm-registration`,
which installs the quota and resource-graph CLI extensions and registers only
namespaces reporting `NotRegistered`. It created no resource, changed no SKU, set no
confirmation and deployed nothing. It did modify subscription state: four namespaces
were registered that were not before.

One operational note. The registration command exceeded the four minute ceiling of the
tooling that invoked it and returned no result, so its outcome was unknown until a
subsequent read confirmed it. Because already registered namespaces receive no write,
the command is safe to repeat, which is what makes recovery from an ambiguous result
straightforward.

### 13.2 Capacity, returned

| Check | Result |
| --- | --- |
| Subscription and region match | verified. Exported and stored values agree, region is `australiaeast` |
| Azure CLI authenticated for the target subscription | verified |
| App Service S1 with Linux workers offered in `australiaeast` | **verified, offered** |
| PostgreSQL Burstable `Standard_B2s` on version 16 offered | **verified, offered** |
| Existing Speech account | **verified. Exists in `australiaeast`, kind `SpeechServices`, current SKU `F0`** |
| Speech `S0` offered for that account | **verified, offered. The in place upgrade is valid** |
| Advertised Linux runtime contains `NODE|22-lts` | **verified, offered.** The reader defect is fixed; the value is carried in the `config` field of the returned objects. |
| PostgreSQL quota and remaining headroom | **inconclusive.** The quota surface still did not answer for `Microsoft.DBforPostgreSQL` after `Microsoft.Cache`, `Microsoft.Cdn` and `Microsoft.ApiManagement` were registered. `Microsoft.Quota` was still `Registering` at the time of the read, so this may resolve once it settles. Not read as unlimited. |
| Redis Basic C1 provisionable | **verified as creatable by ARM.** See 13.5. |
| Storage capacity | **inconclusive.** Regional support confirmed, which is not a capacity statement. Zero existing accounts. Documented limit 250 per region per subscription, unconfirmed. |
| API Management capacity | **inconclusive.** Regional support confirmed. Zero existing services. Developer tier supports exactly one unit, unconfirmed. |
| Front Door capacity | **inconclusive.** Global resource, so regional probes do not apply. Zero existing profiles. No limit figure asserted. |
| Log Analytics and Application Insights capacity | **inconclusive.** Neither regional support nor headroom established. |

No probe reported insufficient capacity. Every unresolved row above is unverified
rather than negative, and no absent or unsupported quota answer has been read as
unlimited capacity.

### 13.3 Historical unresolved capacity

1. Quota headroom remains unanswered for every service even with `Microsoft.Quota`
   registered. The quota surface returns nothing for these resource types rather than
   returning a limit. Recorded as unverified. An empty response is not unlimited
   capacity.
2. Capacity headroom for Log Analytics, Application Insights, App Service, Storage,
   API Management and Front Door. Regional support is confirmed for each type and zero
   resources of each type exist in the subscription, but no numeric limit has been
   established against documented service limits.

The Redis blocker is resolved. See 13.5.

### 13.4 Historical status

At the time, evidence gathering was complete to the extent read-only and non-creating
operations allowed. That conclusion is now superseded.

The two items above are known unverified capacity, not blockers. Neither probe reported
insufficient capacity; both are absent answers, and an absent answer is recorded as
unverified rather than read as headroom.

### 13.5 Redis Basic C1, historical ARM validation and what-if

Run at 2026-08-06T13:06Z against `infra/azure/redis.bicep` alone. Neither operation
creates a resource and neither reserves capacity.

Redacted commands:

```
az deployment group validate --resource-group ccl-pronunciation-trainer-rg \
  --template-file infra/azure/redis.bicep \
  --parameters location=australiaeast cacheName=<probe-name> \
  --parameters skuFamily=C skuName=Basic skuCapacity=1 \
  --parameters workspaceId=<non-existent-workspace-id> tags={} \
  --subscription <subscription-id>

az deployment group what-if --resource-group ccl-pronunciation-trainer-rg \
  --template-file infra/azure/redis.bicep \
  --parameters location=australiaeast cacheName=<probe-name> \
  --parameters skuFamily=C skuName=Basic skuCapacity=1 \
  --parameters workspaceId=<non-existent-workspace-id> tags={} \
  --subscription <subscription-id> --no-pretty-print
```

Results:

| Operation | Result |
| --- | --- |
| validate | `provisioningState: Succeeded`, `error: null`. ARM reported `Microsoft.Cache` resource type `redis` with `locations: [australiaeast]`. |
| what if | `Microsoft.Cache/redis` returned `changeType: Create` with `sku: {name: Basic, family: C, capacity: 1}` at `location: australiaeast`. |

ARM accepted Basic C1 in the target region and predicted a successful create. That is
positive, non creating evidence that the SKU is offered and the template is valid.

The later live provisioning attempt was rejected because the Classic service is
retiring. This is why the original validation is invalid for recovery and why the
approved architecture now uses Azure Managed Redis.

**Capacity is not reserved.** A successful what if predicts a create against current
conditions. It does not hold quota, does not guarantee a later create will succeed, and
says nothing about the retirement timeline of the classic product. It answers the
availability question that regional provider support could not.

Two deviations from a strictly Redis only what if, both recorded rather than suppressed:

1. `Microsoft.Insights/diagnosticSettings` also returned `Create`. That resource is
   declared inside `redis.bicep` itself, so it is unavoidable when validating that
   module as written. It is not an additional service.
2. `Microsoft.CognitiveServices/accounts` for the existing Speech account returned
   `changeType: Ignore`, with identical before and after state at SKU `F0`. ARM lists
   existing resource group resources that the template does not manage. `Ignore` means
   no change was predicted, and it independently confirms the Speech account is still
   `F0` and untouched.

Subscription side effects of this run: ARM returned a deployment object named `redis`
from the validate call, so a validation entry may appear in the resource group
deployment history. No resource was created, no SKU changed and no capacity reserved.

The raw run output is written to `.azure/evidence/preprovision-evidence.md`, which is
not tracked.

Run `pnpm run azure:preflight` to gather these. It performs live reads and, in live
mode, registers missing providers. Paste its evidence output into section 14.

One caveat about check mode, recorded because the naming invites the wrong
assumption. `pnpm run azure:preflight:check` is write free: it installs no CLI
extension and registers no provider. It is **not** query free. It still calls
`az account show`, the runtime and SKU listings, the quota surface and Resource
Graph. So check mode is not a way to satisfy an instruction that prohibits querying
Azure, and it was deliberately not run while gathering the configuration status in
section 6.

## 14. Historical validation proof (superseded)

**Status: invalidated by the partial deployment and recovery architecture change.**

The original official validation workflow authorised the reads, builds, ARM validation
and what-if operations recorded here. These results apply only to the former Classic
Redis template. They are preserved for audit and cannot authorise the recovery.

| Evidence | Status |
| --- | --- |
| Preflight evidence block | pass; 34 pass, 6 warn, 4 skip and 21 inconclusive capacity probes already bounded by section 13 |
| Deployment what if review | pass; approved creates, resource-group tags and the existing Speech F0 to S0 update, with no deletes |
| Provisioning result | later ran partially; this pre-provision record is superseded |
| Live health endpoint response | not yet run |
| Live `/api/voices` response through App Service | not yet run |
| Live `/api/voices` response through API Management | not yet run |
| Front Door routing and WAF verification | not yet run |
| Cost Management daily reading per service | not yet run |

### All validation checks pass

#### AZD validation

- [x] 1. AZD Installation
- [x] 2. Schema Validation
- [x] 3. Environment Setup
- [x] 4. Authentication Check
- [x] 5. Subscription/Location Check
- [x] 6. Aspire Pre-Provisioning Checks
- [x] 7. Provision Preview
- [x] 8. Build Verification
- [x] 9. Docker Build Context Validation
- [x] 10. Package Validation
- [x] 11. Azure Policy Validation
- [x] 12. Aspire Post-Provisioning Checks

#### Bicep validation

- [x] 1. Core Validation (CLI, auth, build, validate, what-if)
- [x] 2. Linting (optional)
- [x] 3. Azure Policy Validation

The Aspire and Docker checks are not applicable: the repository contains no
AppHost, Aspire package reference, project file or Dockerfile. The subscription
has no Azure Policy assignments. Both previews completed without applying
resources and reported no deletes.

### 14.1 Commands and results

These checks are validation evidence, not provisioning evidence.

| Command | Result |
| --- | --- |
| `azd version` | 1.23.13 installed |
| `azd auth login --check-status` | authenticated |
| `azd env list` and redacted `azd env get-values --output json` review | default environment `staging`; subscription and `australiaeast` match section 2; required operator values present; all three confirmation values unset |
| `pnpm run azure:preflight:check` | pass; read-only mode, no provider registration or extension installation |
| `pnpm test` | 416 passing across 30 files |
| `pnpm run build` | success, 647 modules, service worker generated |
| `pnpm run build:server` | success |
| `pnpm run azure:package:check` | all three required inputs present |
| `pnpm run azure:smoke:server` | 8 checks passing against the compiled server |
| `azd provision --preview --no-prompt` | success in 28 seconds; no resources applied |
| `azd package --no-prompt` | success in 20 seconds |
| `az bicep lint --file infra/azure/main.bicep` | success, no diagnostics |
| `az bicep build --file infra/azure/main.bicep --stdout` | success, no diagnostics |
| Azure Bicep core validation helper with the selected AZD values injected in-memory | `OVERALL: PASS`; CLI, authentication, build, ARM validate and what-if all passed |
| Structured subscription what-if review with `ResourceIdOnly` | 30 creates, 2 deploy/update entries and no deletes; the two existing targets are the resource group and approved Speech account |
| `az policy assignment list --subscription <target>` | zero assignments |
| `pnpm run azure:verify:template` | 6 invariants passing, 45 resources and 72 outputs walked |

## 15. Recovery preparation evidence

### 15.1 Live partial estate

Read-only checks immediately before revalidation returned:

| Resource or state | Result |
| --- | --- |
| App Service plan and site | exist in `australiaeast` |
| PostgreSQL | `Standard_B2s`, PostgreSQL 16, state `Ready`, Entra auth enabled, password auth disabled, approved tenant configured |
| PostgreSQL Entra administrator | absent; the postprovision reconciliation must create and verify the approved identity |
| Storage, Log Analytics and Application Insights | exist in `australiaeast` |
| Application Insights Smart Detection action group | exists |
| Speech | exactly the approved account, kind `SpeechServices`, in `australiaeast`, still `F0` |
| Managed Redis | not yet created |
| API Management, Front Door and WAF | not yet created |

### 15.2 Managed Redis recovery preview

`pnpm run azure:validate:redis` completed both ARM group validation and what-if for
`infra/azure/redis.bicep`.

| Predicted change | Review |
| --- | --- |
| Create `Microsoft.Cache/redisEnterprise` | exact `Balanced_B3` cluster in `australiacentral` |
| Create `Microsoft.Cache/redisEnterprise/databases` | exact `default` database, encrypted protocol, disabled access keys, `OSSCluster`, `AllKeysLRU`, port 10000 |
| Create `Microsoft.Insights/diagnosticSettings` | allowed child of the Redis module |
| Existing resource entries | `Ignore`; no modify or delete |

The fail-closed reviewer requires exactly one cluster and one database, validates the
database's full parent resource ID, and rejects tier, region, security, name, port,
duplicate, unexpected create, modify or delete drift. Validation and what-if created no
resource and reserve no capacity.

### 15.3 Local preparation checks

| Check | Result |
| --- | --- |
| Vitest suite | pass, 456 tests across 31 files |
| Bicep compile | pass, zero errors and zero warnings |
| Compiled template invariants | pass, including prohibition of Classic Redis and exact Managed Redis configuration |
| Client and server build | pass |
| Azure application package | assembled from fresh client, generated content and server output |
| Repository structure and generated data validation | pass |
| PostgreSQL repair tests | pass, including idempotence and fail-closed conflict handling |
| Managed Redis preview tests | pass against a sanitized excerpt of the live ARM child-resource shape |
| `azd provision --preview --no-prompt` | pass; create Managed Redis, API Management and Front Door; reconcile existing resources; update the approved Speech account F0 to S0; no delete |
| Azure Policy assignments | none assigned to the target subscription |
| Static role review | no role assignment resource declared; the only enabled API route reads a compile-time constant and performs no Azure data-plane operation |

### 15.4 Revalidation boundary

The former `.azure/validate-status.json` record belonged to the Classic Redis design
and was reset. The fresh official `azure-validate` workflow completed against this
recovery plan. Preparation evidence did not substitute for that workflow; its completed
status is what authorises handoff to `azure-deploy`.

### All validation checks pass

- [x] 1. AZD Installation
- [x] 2. Schema Validation
- [x] 3. Environment Setup
- [x] 4. Authentication Check
- [x] 5. Subscription/Location Check
- [x] 6. Aspire Pre-Provisioning Checks (not applicable)
- [x] 7. Provision Preview
- [x] 8. Build Verification
- [x] 9. Docker Build Context Validation (not applicable)
- [x] 10. Package Validation
- [x] 11. Azure Policy Validation
- [x] 12. Aspire Post-Provisioning Checks (not applicable)

## 16. Exit criteria for this stage

This recovery stage is complete only when all of the following hold:

1. [x] The approved recovery architecture and partial estate are recorded.
2. [x] Local build, tests, package checks and exact Managed Redis ARM preview pass.
3. [x] The official `azure-validate` workflow records fresh validation evidence.
4. [x] The official `azure-deploy` workflow completes without a tier, region or
   identity substitution.
5. [x] Managed Redis and its `default` database exist at the exact approved settings.
6. [x] PostgreSQL has exactly the approved Entra administrator and remains
   Entra-only.
7. [x] API Management, Front Door and WAF are provisioned; Speech is the same single
   account at S0.
8. [x] The application package is live, `/health` reports `staging`, and
   `/api/voices` answers through App Service, API Management and Front Door as
   designed.
9. [x] No Foundry, OpenAI, model deployment or Machine Learning resource was created.
10. [x] Production traffic and third-party production services remain unchanged.
11. [ ] Cost Management begins reporting the intended services; absent or delayed
    billing data is recorded as unverified rather than treated as zero.

All exit criteria except Cost Management reporting are met. See section 17 for the
evidence behind items 4 through 10. Item 11 is recorded as unverified, not zero,
per the standing instruction in section "Required live verification" of the handoff
doc — a same-day cost query for every resource in the group returned no usage row at
all, which is consistent with Cost Management's normal reporting lag and is not
treated as proof of zero cost.

## 17. Deployment and live verification evidence (recovery, completed)

`azd provision --no-prompt` and `azd deploy --no-prompt` both ran against the
`staging` environment and completed. `azd deploy`'s own status poll hit its 1200
second timeout waiting for App Service to report a successful tracking status
("Starting runtime process ... 0 successful instances") and exited with a non-zero
code; this is a known azd limitation in how it watches Kudu deployment status, not
evidence of a failed deployment. The application had in fact started successfully
on Azure by the time the live checks below were run.

### 17.1 Provisioning and postprovision

| Check | Result |
| --- | --- |
| `az deployment sub show --name staging-1786030380` | `provisioningState: Succeeded`, no error |
| `az group show` for `ccl-pronunciation-trainer-rg` | `provisioningState: Succeeded` |
| `pnpm run azure:preflight` (live, via `azd provision`) | PASS 37, WARN 6, SKIP 2, INCONCLUSIVE 21; zero blocking findings |
| `pnpm run azure:postprovision` (live, via `azd provision`) | PASS 19; all 15 deployment outputs returned, Postgres Entra administrator reconciled, `PUBLIC_BASE_URL` and `VITE_API_BASE_URL` derived and stored |
| Duplicate-deployment check: running processes, subscription deployment history, resource group list, resource count per type | exactly one `azd deploy` process, exactly one resource group for this project, exactly one resource of each expected type, no other `Running` deployment at the subscription level |

### 17.2 Resource-level verification against the approved recovery architecture

| Resource | Check | Result |
| --- | --- | --- |
| Managed Redis cluster | SKU and region | `Balanced_B3` in `Australia Central` |
| Managed Redis `default` database | port, protocol, access keys, clustering, eviction | port `10000`, `clientProtocol: Encrypted`, `accessKeysAuthentication: Disabled`, `clusteringPolicy: OSSCluster`, `evictionPolicy: AllKeysLRU`, exactly one database |
| PostgreSQL flexible server | state and auth config | `state: Ready`, `activeDirectoryAuth: Enabled`, `passwordAuth: Disabled` |
| PostgreSQL administrators | count and identity | exactly one administrator, `david03.xu_gmail.com#EXT#@david03xugmail.onmicrosoft.com`, matching the approved `POSTGRES_ENTRA_ADMIN_OBJECT_ID` |
| API Management | provisioning state | `Succeeded` |
| Front Door security policy | WAF association | `provisioningState: Succeeded`, WAF policy `cclfdp52j26ruujb6qwaf` associated with the `ccl-endpoint-p52j26ruujb6q` endpoint on `/*` |
| Speech account | identity and SKU | still `ccl-pronunciation-speech-david` in `australiaeast`, now `S0` (in-place upgrade, no new account) |
| Foundry / OpenAI / Machine Learning | resource scan | none exist in the resource group; the only `Microsoft.CognitiveServices` account is the approved Speech resource |
| Role assignments | scoped to the resource group | none, matching the plan's static role review — the only enabled API route has no Azure data-plane dependency |

### 17.3 Live traffic verification

| Path | Result |
| --- | --- |
| `App Service /health` | `200 {"status":"ok","stage":"staging"}` |
| `App Service /api/voices` | `200` |
| `API Management gateway /api/voices` | `200` |
| `Front Door /health` | `200 {"status":"ok","stage":"staging"}` |
| `Front Door /api/voices` | `200` |

### 17.4 Cost Management

`az consumption usage list` for the last two days, filtered to every resource in
`ccl-pronunciation-trainer-rg`, returned rows with `cost: None` for each resource.
Recorded as unverified/pending per the plan's standing instruction, not as zero
spend.
