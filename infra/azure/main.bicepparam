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

param location = readEnvironmentVariable('AZURE_LOCATION')
param resourceGroupName = readEnvironmentVariable('AZURE_RESOURCE_GROUP')
param environmentName = readEnvironmentVariable('AZURE_ENV_NAME')

// Speech. The account already exists and is updated in place. The name is read
// from the environment rather than committed, because it is the one value whose
// accuracy decides between upgrading the deployed account and creating a second
// one. S0, not F0. F0 bills zero and cannot clear the floor.
param speechAccountName = readEnvironmentVariable('SPEECH_ACCOUNT_NAME')
param speechSku = 'S0'

// PostgreSQL. B2s rather than B1ms purely for the daily floor.
// B1ms would be adequate on load alone.
param postgresSkuName = 'Standard_B2s'
param postgresSkuTier = 'Burstable'
param postgresStorageSizeGB = 64
param postgresVersion = '16'
param postgresBackupRetentionDays = 7
param postgresDatabaseName = 'trainer'

// Password authentication is disabled on the server, so without a valid Entra
// administrator the database is unreachable. Retrieve the values with:
//   az ad signed-in-user show --query id --output tsv
//   az ad signed-in-user show --query userPrincipalName --output tsv
param entraAdminObjectId = readEnvironmentVariable('POSTGRES_ENTRA_ADMIN_OBJECT_ID')
param entraAdminPrincipalName = readEnvironmentVariable('POSTGRES_ENTRA_ADMIN_PRINCIPAL_NAME')
param entraAdminPrincipalType = 'User'

// The former postgresAllowedClientRanges parameter is gone. It existed to admit
// Vercel egress, which is not a published stable set. Server access now comes
// from the App Service outbound addresses, which the deployment reads from the
// site itself. The browser has no database path at all.

// App Service. S1 rather than B3: fifteen dollars more, and defensible on
// capability (slots, autoscale, backups) rather than on price alone.
param appServicePlanSkuName = 'S1'
param appServicePlanSkuTier = 'Standard'
param appServiceLinuxFxVersion = 'NODE|22-lts'

// Browser origins permitted by App Service CORS. Supplied as a comma separated
// list and split here, so the environment holds one readable value rather than a
// JSON array an operator has to quote correctly.
param appServiceAllowedCorsOrigins = split(readEnvironmentVariable('WEB_ALLOWED_ORIGINS'), ',')

// Redis. Basic C1 clears the floor; C0 does not. Classic Azure Cache for Redis
// is a retiring product. If Basic C1 stops being provisionable in the target
// region, that is a plan change requiring an approved substitution, not a silent
// move to Azure Managed Redis.
param redisSkuFamily = 'C'
param redisSkuName = 'Basic'
param redisSkuCapacity = 1

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

// The former handlerBackendUrl parameter is gone. API Management now derives its
// backend from the App Service host name returned by the app-service module, so
// there is no manually supplied URL to drift from the deployed site.
