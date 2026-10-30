using 'main.bicep'

// Tiers here are sized to clear the US$1 per day spend floor required by the
// credit milestone, not to fit application load. See docs/AZURE_WORKLOAD_PLAN.md.
// Do not reduce a tier without re-reading the floor interpretation section.
//
// Two kinds of value appear below.
//
// Committed values are architectural decisions that belong in version control:
// tiers, versions, retention and container names. They are identical for every
// operator and every environment.
//
// Environment values are deployment specific and are read from the selected AZD
// environment with readEnvironmentVariable. Subscription identifiers,
// administrator principals, publisher details and client origins are never
// committed. Each is read without a fallback, so a missing value fails the
// deployment rather than silently substituting something plausible. The
// preprovision hook checks the same set first and fails with a clearer message.
//
// Set them with azd env set, for example:
//   azd env set APIM_PUBLISHER_EMAIL <address>

// Pinned project values. These identify one specific deployment target that is
// not expected to change, so they carry defaults rather than forcing an operator
// to restate them. An environment value still overrides, which is what keeps a
// second environment possible without editing this file.
param location = readEnvironmentVariable('AZURE_LOCATION', 'australiaeast')
param resourceGroupName = readEnvironmentVariable('AZURE_RESOURCE_GROUP', 'ccl-pronunciation-trainer-rg')
param environmentName = readEnvironmentVariable('AZURE_ENV_NAME', 'staging')

// Deployment stage. Defaults to staging because this infrastructure runs beside
// production rather than replacing it, and handler parity is incomplete. Moving to
// production is a separate explicit approval, not a default.
param deploymentStage = readEnvironmentVariable('DEPLOYMENT_STAGE', 'staging')

// Speech. The account already exists and is updated in place. The name is pinned
// to the deployed account, because its accuracy is what decides between upgrading
// that account and creating a second one. S0, not F0. F0 bills zero and cannot
// clear the floor. The upgrade itself is gated on an explicit confirmation.
param speechAccountName = readEnvironmentVariable('SPEECH_ACCOUNT_NAME', 'ccl-pronunciation-speech-david')
param speechSku = 'S0'

// PostgreSQL. B2s rather than B1ms purely for the daily floor.
// B1ms would be adequate on load alone.
param postgresSkuName = 'Standard_B2s'
param postgresSkuTier = 'Burstable'
param postgresStorageSizeGB = 64
param postgresVersion = '16'
param postgresBackupRetentionDays = 7
param postgresDatabaseName = 'trainer'

// The former postgresAllowedClientRanges parameter is gone. It existed to admit
// Vercel egress, which is not a published stable set. Server access now comes
// from the App Service outbound addresses, which the deployment reads from the
// site itself. The browser has no database path at all.
//
// The Entra administrator is also no longer a Bicep child resource. Azure
// rejected that child while the new server was still becoming ready. The
// postprovision hook now waits for Ready, creates only the approved administrator
// if absent, and re-reads it before reporting success.

// App Service. S1 rather than B3: fifteen dollars more, and defensible on
// capability (slots, autoscale, backups) rather than on price alone.
param appServicePlanSkuName = 'S1'
param appServicePlanSkuTier = 'Standard'
param appServiceLinuxFxVersion = 'NODE|22-lts'

// Browser origins permitted by App Service CORS. Supplied as a comma separated
// list. Empty during the foundation stage, because no browser client points at the
// staging endpoint yet and an empty allow list is the correct answer rather than a
// missing one. Production client origins are unchanged and stay on Vercel.
param appServiceAllowedCorsOrigins = empty(readEnvironmentVariable('WEB_ALLOWED_ORIGINS', ''))
  ? []
  : split(readEnvironmentVariable('WEB_ALLOWED_ORIGINS', ''), ',')

// Azure Managed Redis. Classic Basic C1 was rejected at real provisioning because
// the product is retiring. Balanced_B3 in Australia Central is the approved
// replacement; the rest of the estate remains in Australia East.
param redisLocation = 'australiacentral'
param redisSkuName = 'Balanced_B3'
param redisDatabaseName = 'default'
param redisPort = 10000

// Storage. Uncounted extra under the daily reading, kept because it is cheap
// and counts for free if the floor turns out to be cumulative. The container is
// private and shared key access is disabled, so generated audio is delivered
// through the App Service audio endpoint rather than read directly by Front Door.
param storageSku = 'Standard_LRS'
param audioContainerName = 'generated-audio'

// Monitoring. Absorbs PostHog and Sentry.
param workspaceRetentionInDays = 30

// Front Door.
param frontDoorSku = 'Standard_AzureFrontDoor'

// API Management. Developer tier has no SLA and is not a production default.
// Provisioning takes 30 to 45 minutes. See the risk recorded in
// .azure/deployment-plan.md.
param apimSkuName = 'Developer'
param apimSkuCapacity = 1

// API Management sends real mail to the publisher address, so it is never
// inferred and never defaulted.
param apimPublisherEmail = readEnvironmentVariable('APIM_PUBLISHER_EMAIL')
param apimPublisherName = readEnvironmentVariable('APIM_PUBLISHER_NAME')

// Synthetic monitor. The SSH key is the operator's, never generated by this
// template, and there is no default: an unset key must fail before provisioning
// rather than deploy a VM no one can reach.
param monitorVmAdminSshPublicKey = readEnvironmentVariable('MONITOR_VM_SSH_PUBLIC_KEY')

// The former handlerBackendUrl parameter is gone. API Management now derives its
// backend from the App Service host name returned by the app-service module, so
// there is no manually supplied URL to drift from the deployed site.
