# Azure staging deployment handoff

## Current status

The approved Azure recovery deployment is in progress.

- Plan: `.azure/deployment-plan.md`
- Plan status: `Validated`
- Workflow: `azure-prepare -> azure-validate -> azure-deploy`
- AZD environment: `staging`
- Subscription: `Azure subscription 1`
- Subscription ID: `<subscription-id>`
- Tenant ID: `<tenant-id>`
- Resource group: `ccl-pronunciation-trainer-rg`
- Primary region: `australiaeast`
- Managed Redis region: `australiacentral`
- Stage: `staging`
- Fixed monthly estimate: about USD 259, plus variable Speech, monitoring,
  networking, WAF request, and egress charges

The user confirmed the subscription and the two-region placement. The selected AZD
environment has both required confirmations set to `yes`:

- `AZURE_CONFIRM_PAID_PROVISIONING`
- `AZURE_CONFIRM_SPEECH_SKU_UPGRADE`

`AZURE_CONFIRM_PRODUCTION_STAGE` is intentionally unset. This is not a production
cutover.

## Active deployment

The following command was started and was still running at handoff:

```bash
azd provision --no-prompt
```

In the current Copilot session it is Bash shell ID `252`. If that shell is still
available, read it rather than starting another provisioning command.

Azure subscription deployment:

```text
staging-1786030380
```

Portal:

https://portal.azure.com/#view/HubsExtension/DeploymentDetailsBlade/~/overview/id/%2Fsubscriptions%2F<subscription-id>%2Fproviders%2FMicrosoft.Resources%2Fdeployments%2Fstaging-1786030380

The last direct Azure read returned:

```json
{
  "name": "staging-1786030380",
  "state": "Running",
  "error": null
}
```

The preprovision hook passed with no blocking finding. All required providers were
already registered, so this run submitted no provider-registration write.

AZD had reported these resources complete:

- Resource group
- Application Insights
- Log Analytics
- Storage account
- App Service plan
- App Service
- PostgreSQL Flexible Server
- Azure Managed Redis

The last operation read still showed the enclosing PostgreSQL nested deployment as
`Running`. API Management, Front Door/WAF, and Speech had not yet appeared as
completed in the AZD output. API Management commonly takes 30 to 45 minutes.

## First action for the next developer

Invoke the `azure-deploy` skill and continue the existing governed deployment. Do
not invoke `azure-prepare` or `azure-validate` again unless a scope or
infrastructure change becomes necessary.

If shell ID `252` remains available, read it. Otherwise query Azure:

```bash
az deployment sub show \
  --name staging-1786030380 \
  --subscription <subscription-id> \
  --query '{name:name,state:properties.provisioningState,error:properties.error}' \
  -o json

az deployment operation sub list \
  --name staging-1786030380 \
  --subscription <subscription-id> \
  --query "[].{resource:properties.targetResource.resourceName,type:properties.targetResource.resourceType,state:properties.provisioningState,status:properties.statusCode}" \
  -o table
```

### If the deployment is still Running

Wait and read again. Do not start a second `azd provision`, `azd deploy`, or
`azd up`.

### If the deployment Failed

Capture the failed operation and exact Azure error. Do not delete, roll back, or
substitute a service or SKU. Destructive rollback and production changes are not
authorised.

If the fix changes infrastructure or approved scope, return through
`azure-prepare` and `azure-validate`. If it is only a transient Azure operation,
resume through the `azure-deploy` workflow after confirming no deployment remains
Running.

### If the deployment Succeeded

Allow the original `azd provision` process to finish. Its `postprovision` hook must:

1. Reconcile exactly one approved PostgreSQL Entra administrator.
2. Keep PostgreSQL Entra-only with password authentication disabled.
3. Store `PUBLIC_BASE_URL` and `VITE_API_BASE_URL` from the Front Door output.
4. Print the App Service, Front Door, and API Management endpoints.

If Azure succeeded but the local AZD process disappeared before outputs and the
postprovision hook completed, do not invent or manually hard-code outputs. Confirm
that no deployment is Running, then rerun the idempotent governed command:

```bash
azd provision --no-prompt
```

## Application deployment

Only after infrastructure provisioning and postprovision both pass:

```bash
azd deploy --no-prompt
azd show
```

`azd deploy` runs the package hook, which regenerates PTE data, builds the client
and production server, and assembles `.azure/package`.

Always run `azd show` after deployment and report every endpoint as a fully
qualified `https://` URL.

## Required live verification

Load the selected AZD environment values without printing secrets:

```bash
set -a
. .azure/staging/.env
set +a
```

Verify all three paths:

```bash
curl -fsS "$APP_SERVICE_URL/health"
curl -fsS "$APP_SERVICE_URL/api/voices"

curl -fsS "$APIM_GATEWAY_URL/api/voices"

curl -fsS "$FRONT_DOOR_URL/health"
curl -fsS "$FRONT_DOOR_URL/api/voices"
```

Expected health body:

```json
{"status":"ok","stage":"staging"}
```

Front Door propagation can take several minutes. Retry for a bounded period and
record delayed propagation rather than treating the first non-200 response as
proof of a permanent failure.

Also verify:

- Managed Redis is `Balanced_B3` in `australiacentral`.
- Its database is exactly `default`, port `10000`, encrypted, access keys
  disabled, `OSSCluster`, and `AllKeysLRU`.
- PostgreSQL is `Ready`, Entra authentication is enabled, password
  authentication is disabled, and exactly the approved Entra administrator
  exists.
- API Management provisioning state is `Succeeded`.
- Front Door and its WAF policy exist and the WAF is attached.
- The existing Speech account `ccl-pronunciation-speech-david` is still the same
  account and is now `S0`.
- No Foundry, OpenAI, model deployment, or Machine Learning resource was created.
- No production traffic or third-party production service changed.

The plan declares no Azure role-assignment resource because the only enabled API
route has no Azure data-plane dependency. Complete the `azure-deploy` live-role
verification by checking the App Service and API Management principal IDs and
confirming no unexpected role assignment was introduced.

Cost Management data may lag. Record missing daily cost data as pending or
unverified, never as zero.

## Safety boundaries

- Do not run `azd up`.
- Do not run direct ARM/Bicep deployment commands.
- Do not start another deployment while `staging-1786030380` is `Running`.
- Do not change regions, SKUs, names, or identities.
- Do not promote to production.
- Do not delete resources or perform destructive rollback.
- Do not create Foundry or OpenAI resources in this deployment.
- Do not print credentials, connection strings, access keys, or `.env` contents.

## Worktree

The recovery implementation is still uncommitted. Do not reset or clean the
worktree.

Preserve these unrelated user-owned changes:

- `.github/copilot-instructions.md`
- `docs/AZURE_WORKLOAD_PLAN.md`

The generated files under `data/processed/` were refreshed by the Azure packaging
workflow. Review them separately from the infrastructure recovery rather than
silently reverting them.

After live verification, add factual deployment evidence to
`.azure/deployment-plan.md`, mark exit criteria only when proven, and commit only
the recovery-related files. Include the required Copilot co-author trailer.
