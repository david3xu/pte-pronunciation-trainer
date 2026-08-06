targetScope = 'subscription'

// Trainer infrastructure orchestration.
//
// Module ordering follows the required deployment sequence. Where a real data
// dependency exists, the reference itself creates the edge. Where the sequence is
// required but no value flows, an explicit dependsOn creates it, so the order is
// enforced by the template rather than by convention.
//
//   monitoring, then App Service, then PostgreSQL and Redis and Storage, then the
//   in place Speech upgrade, then API Management against the App Service backend,
//   then Front Door.
//
// No secret is emitted as an output. The Application Insights connection string
// is passed module to module for the site configuration and is deliberately
// absent from the outputs below, because deployment outputs are recorded in
// deployment history and readable by anyone with reader access.

@description('Azure region for the resource group and all regional resources. Constrained to the approved region, so a mistyped or copied value fails at validation rather than provisioning a parallel estate somewhere else.')
@allowed([
  'australiaeast'
])
param location string

@description('Resource group that contains app Azure resources.')
param resourceGroupName string

@description('AZD environment name. Recorded as a tag so resources are attributable to a deployment.')
param environmentName string

@description('Deployment stage. Staging runs beside production rather than replacing it. Production requires separate explicit approval.')
@allowed([
  'staging'
  'production'
])
param deploymentStage string = 'staging'

@description('Short suffix distinguishing globally unique resource names. Derived from the subscription and environment so repeated deployments of the same environment reuse the same names.')
param nameSuffix string = uniqueString(subscription().id, environmentName)

// Speech. Existing deployed account, name pinned to reality rather than generated.
// Do not reintroduce a uniqueString default here; it drifted from what is running.
//
// The allowed list has exactly one entry deliberately. The deployment updates this
// account in place, so any other name would create a second Speech account rather
// than upgrading the one already serving traffic. Constraining it here means that
// mistake fails at template validation, before the preflight and before ARM.

@description('Deployed Azure AI Speech account name. Exactly one approved value.')
@allowed([
  'ccl-pronunciation-speech-david'
])
param speechAccountName string

@description('Azure AI Speech SKU. F0 bills zero and cannot satisfy the daily spend floor.')
@allowed([
  'F0'
  'S0'
])
param speechSku string

// PostgreSQL. Tiers are sized to clear the US$1 per day floor, not to fit load.

@description('PostgreSQL flexible server name.')
param postgresServerName string = 'ccl-pg-${nameSuffix}'

@description('PostgreSQL compute SKU name.')
param postgresSkuName string

@description('PostgreSQL compute tier.')
param postgresSkuTier string

@description('PostgreSQL provisioned storage in GB.')
param postgresStorageSizeGB int

@description('PostgreSQL major version.')
param postgresVersion string

@description('PostgreSQL backup retention in days.')
param postgresBackupRetentionDays int

@description('Application database name.')
param postgresDatabaseName string

@description('Object ID of the Entra principal granted PostgreSQL administrator.')
param entraAdminObjectId string

@description('UPN or display name of the Entra administrator principal.')
param entraAdminPrincipalName string

@description('Entra principal type of the administrator.')
param entraAdminPrincipalType string

// App Service. Hosts the Vite dist build and the migrated api handlers.

@description('App Service plan name.')
param appServicePlanName string = 'ccl-plan-${nameSuffix}'

@description('Web app name.')
param webAppName string = 'ccl-web-${nameSuffix}'

@description('App Service plan SKU name.')
param appServicePlanSkuName string

@description('App Service plan tier.')
param appServicePlanSkuTier string

@description('Linux runtime stack for the production server.')
param appServiceLinuxFxVersion string

@description('Origins permitted to call the web app.')
param appServiceAllowedCorsOrigins array

@description('AZD service name for the web app. Must match the service key under services in azure.yaml.')
param webAppAzdServiceName string = 'web'

// Redis. Caches Foundry responses for repeated vocabulary items, plus session state.

@description('Redis cache name.')
param redisCacheName string = 'ccl-redis-${nameSuffix}'

@description('Redis SKU family.')
param redisSkuFamily string

@description('Redis SKU name.')
param redisSkuName string

@description('Redis capacity index.')
param redisSkuCapacity int

// Storage. Generated TTS audio. Private container, shared key access disabled.

@description('Storage account name.')
@minLength(3)
@maxLength(24)
param storageAccountName string = 'cclaudio${nameSuffix}'

@description('Storage replication SKU.')
param storageSku string

@description('Blob container holding generated audio.')
param audioContainerName string

// Monitoring. Absorbs PostHog analytics and Sentry error tracking.

@description('Log Analytics workspace name.')
param workspaceName string = 'ccl-logs-${nameSuffix}'

@description('Application Insights component name.')
param appInsightsName string = 'ccl-insights-${nameSuffix}'

@description('Log Analytics retention in days.')
param workspaceRetentionInDays int

// Front Door. Audio and static delivery, replaces the CDN slot.

@description('Front Door profile name.')
param frontDoorProfileName string = 'ccl-fd-${nameSuffix}'

@description('Front Door endpoint name.')
param frontDoorEndpointName string = 'ccl-endpoint-${nameSuffix}'

@description('Front Door SKU.')
param frontDoorSku string

// API Management. Fronts the api handlers with policy enforcement and throttling.
// Provisioning takes 30 to 45 minutes. Do not treat a slow run as a failure.

@description('API Management service name.')
param apimServiceName string = 'ccl-apim-${nameSuffix}'

@description('API Management SKU.')
param apimSkuName string

@description('API Management scale units.')
param apimSkuCapacity int

@description('Publisher email for API Management notifications.')
param apimPublisherEmail string

@description('Publisher organisation name for API Management.')
param apimPublisherName string

// Tags. Two products share this subscription, so every resource is attributable to
// a product, a deployment and a stage. The stage tag is what distinguishes this
// parallel staging estate from anything that later serves production.
var commonTags = {
  product: 'ccl-pronunciation-trainer'
  'azd-env-name': environmentName
  managedBy: 'azd'
  deploymentStage: deploymentStage
}

resource appResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: commonTags
}

// Step five. Monitoring first so every later module can attach diagnostics.
module monitoring 'monitoring.bicep' = {
  name: 'monitoring-${uniqueString(resourceGroupName, appInsightsName)}'
  scope: appResourceGroup
  params: {
    location: location
    tags: commonTags
    workspaceName: workspaceName
    componentName: appInsightsName
    retentionInDays: workspaceRetentionInDays
  }
}

// Step six. App Service and its system assigned identity. Every later access
// grant is scoped to the principal this module returns.
module appService 'app-service.bicep' = {
  name: 'app-service-${uniqueString(resourceGroupName, webAppName)}'
  scope: appResourceGroup
  params: {
    location: location
    tags: commonTags
    planName: appServicePlanName
    webAppName: webAppName
    azdServiceName: webAppAzdServiceName
    deploymentStage: deploymentStage
    planSkuName: appServicePlanSkuName
    planSkuTier: appServicePlanSkuTier
    linuxFxVersion: appServiceLinuxFxVersion
    allowedCorsOrigins: appServiceAllowedCorsOrigins
    appInsightsName: monitoring.outputs.componentName
    workspaceId: monitoring.outputs.workspaceId
    postgresServerFqdn: '${postgresServerName}.postgres.database.azure.com'
    postgresDatabaseName: postgresDatabaseName
    redisHostName: '${redisCacheName}.redis.cache.windows.net'
    storageAccountName: storageAccountName
    audioContainerName: audioContainerName
    speechAccountName: speechAccountName
    speechRegion: location
  }
}

// Step seven. PostgreSQL, Redis and Storage.
//
// The PostgreSQL firewall admits the App Service outbound addresses reported by
// the deployed site. The former Vercel egress ranges are gone: they were never a
// published stable set, and the handlers now run on App Service.
module postgres 'postgres.bicep' = {
  name: 'postgres-${uniqueString(resourceGroupName, postgresServerName)}'
  scope: appResourceGroup
  params: {
    location: location
    tags: commonTags
    serverName: postgresServerName
    skuName: postgresSkuName
    skuTier: postgresSkuTier
    storageSizeGB: postgresStorageSizeGB
    postgresVersion: postgresVersion
    backupRetentionDays: postgresBackupRetentionDays
    databaseName: postgresDatabaseName
    entraAdminObjectId: entraAdminObjectId
    entraAdminPrincipalName: entraAdminPrincipalName
    entraAdminPrincipalType: entraAdminPrincipalType
    allowedOutboundIpAddresses: appService.outputs.possibleOutboundIpAddresses
    workspaceId: monitoring.outputs.workspaceId
  }
}

module redis 'redis.bicep' = {
  name: 'redis-${uniqueString(resourceGroupName, redisCacheName)}'
  scope: appResourceGroup
  params: {
    location: location
    tags: commonTags
    cacheName: redisCacheName
    skuFamily: redisSkuFamily
    skuName: redisSkuName
    skuCapacity: redisSkuCapacity
    workspaceId: monitoring.outputs.workspaceId
  }
}

module storage 'storage.bicep' = {
  name: 'storage-${uniqueString(resourceGroupName, storageAccountName)}'
  scope: appResourceGroup
  params: {
    location: location
    tags: commonTags
    storageAccountName: storageAccountName
    storageSku: storageSku
    audioContainerName: audioContainerName
    workspaceId: monitoring.outputs.workspaceId
  }
}

// Step eight. The existing Speech account is updated in place. The name is
// supplied rather than generated, which is what makes a repeated deployment
// upgrade the deployed account instead of creating a second one.
module speech 'speech.bicep' = {
  name: 'speech-${uniqueString(resourceGroupName, speechAccountName)}'
  scope: appResourceGroup
  params: {
    location: location
    tags: commonTags
    speechAccountName: speechAccountName
    speechSku: speechSku
  }
  dependsOn: [
    postgres
    redis
    storage
  ]
}

// Step nine, identity and role assignments, is added with the least privilege
// access module. It is deliberately absent rather than stubbed, because an empty
// role assignment module reads as complete and is not.

// Step ten. API Management derives its backend from the deployed App Service host
// name. There is no manually supplied backend URL to drift from reality.
module apim 'apim.bicep' = {
  name: 'apim-${uniqueString(resourceGroupName, apimServiceName)}'
  scope: appResourceGroup
  params: {
    location: location
    tags: commonTags
    serviceName: apimServiceName
    skuName: apimSkuName
    skuCapacity: apimSkuCapacity
    publisherEmail: apimPublisherEmail
    publisherName: apimPublisherName
    backendHostName: appService.outputs.defaultHostName
    workspaceId: monitoring.outputs.workspaceId
  }
  dependsOn: [
    speech
  ]
}

// Step eleven. Front Door.
//
// The audio origin is the App Service audio endpoint rather than the Blob host.
// The container is private and shared key access is disabled, so Standard Front
// Door cannot read the Blob origin directly, and making the container public to
// work around that is not an acceptable design. App Service reads the blob with
// its managed identity and streams it.
module frontDoor 'front-door.bicep' = {
  name: 'front-door-${uniqueString(resourceGroupName, frontDoorProfileName)}'
  scope: appResourceGroup
  params: {
    tags: commonTags
    profileName: frontDoorProfileName
    endpointName: frontDoorEndpointName
    profileSku: frontDoorSku
    appOriginHostName: appService.outputs.defaultHostName
    audioOriginHostName: appService.outputs.defaultHostName
    apimGatewayHostName: apim.outputs.gatewayHostName
    workspaceId: monitoring.outputs.workspaceId
  }
}

// Outputs are named exactly as the AZD environment keys the hooks expect, so the
// deployment contract in scripts/azure and this template cannot disagree about
// what a value is called.
//
// Nothing secret appears here. Connection strings, access keys, the Application
// Insights ingestion key and the database credential are all absent by design,
// because deployment outputs stay readable in deployment history to anyone holding
// reader access. Identifiers and host names only.
output DEPLOYMENT_STAGE string = deploymentStage
output AZURE_RESOURCE_GROUP_NAME string = appResourceGroup.name

// Public entry points. Named neutrally rather than by stage, because an output name
// that encodes the environment has to be renamed to promote it, and a rename is a
// consumer breaking change. The stage is reported separately above.
output PUBLIC_URL string = 'https://${frontDoor.outputs.endpointHostName}'
output FRONT_DOOR_URL string = 'https://${frontDoor.outputs.endpointHostName}'
output APP_SERVICE_URL string = 'https://${appService.outputs.defaultHostName}'
output HEALTH_URL string = 'https://${appService.outputs.defaultHostName}/health'

output WEB_APP_NAME string = appService.outputs.webAppName
output WEB_APP_ID string = appService.outputs.webAppId
output WEB_APP_HOST_NAME string = appService.outputs.defaultHostName
output WEB_APP_PRINCIPAL_ID string = appService.outputs.principalId
output APP_SERVICE_PLAN_NAME string = appService.outputs.planName

output FRONT_DOOR_PROFILE_NAME string = frontDoor.outputs.profileName
output FRONT_DOOR_ENDPOINT_HOST_NAME string = frontDoor.outputs.endpointHostName
output FRONT_DOOR_WAF_POLICY_NAME string = frontDoor.outputs.wafPolicyName
output FRONT_DOOR_MANAGED_RULES_ATTACHED bool = frontDoor.outputs.managedRulesAttached

output APIM_SERVICE_NAME string = apim.outputs.serviceName
output APIM_GATEWAY_URL string = apim.outputs.gatewayUrl
output APIM_PRINCIPAL_ID string = apim.outputs.principalId

output POSTGRES_SERVER_NAME string = postgres.outputs.serverName
output POSTGRES_SERVER_ID string = postgres.outputs.serverId
output POSTGRES_SERVER_FQDN string = postgres.outputs.serverFqdn
output POSTGRES_DATABASE_NAME string = postgres.outputs.databaseName

output REDIS_CACHE_NAME string = redis.outputs.cacheName
output REDIS_CACHE_ID string = redis.outputs.cacheId
output REDIS_HOST_NAME string = redis.outputs.cacheHostName

output STORAGE_ACCOUNT_NAME string = storage.outputs.storageAccountName
output STORAGE_ACCOUNT_ID string = storage.outputs.storageAccountId
output BLOB_ENDPOINT string = storage.outputs.blobEndpoint
output AUDIO_CONTAINER_NAME string = storage.outputs.audioContainerName

output LOG_ANALYTICS_WORKSPACE_NAME string = monitoring.outputs.workspaceName
output LOG_ANALYTICS_WORKSPACE_ID string = monitoring.outputs.workspaceId
output APP_INSIGHTS_NAME string = monitoring.outputs.componentName
output APP_INSIGHTS_ID string = monitoring.outputs.componentId

output SPEECH_ACCOUNT_NAME string = speech.outputs.speechAccountName
output SPEECH_ACCOUNT_ID string = speech.outputs.speechAccountId
output SPEECH_ENDPOINT string = speech.outputs.speechEndpoint
output SPEECH_SKU string = speechSku
