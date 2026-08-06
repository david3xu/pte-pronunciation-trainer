targetScope = 'resourceGroup'

// App Service plan and Linux web app hosting the production server.
//
// The site serves the Vite build, the generated content and every migrated api
// handler from one Node process. Server only configuration is set here as app
// settings with no VITE_ prefix, so nothing in this module can reach a browser
// bundle.
//
// The Application Insights connection string is resolved from an existing
// resource reference rather than accepted as a parameter. Passing it in would put
// the ingestion key into a nested deployment output, where it stays readable in
// deployment history.

@description('Azure region for the App Service plan and web app.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('AZD service name. Must match the service key under services in azure.yaml, because that tag is how azd discovers which site to deploy the packaged application to. Without it, azd provisions successfully and then reports no matching service.')
param azdServiceName string

@description('App Service plan name.')
param planName string

@description('Globally unique web app name.')
param webAppName string

@description('App Service plan SKU. Sized to clear the daily spend floor and to absorb the api handlers.')
param planSkuName string

@description('App Service plan tier matching planSkuName.')
param planSkuTier string

@description('Node runtime stack. Must match an advertised App Service Linux runtime.')
param linuxFxVersion string

@description('Browser origins permitted to call this app.')
param allowedCorsOrigins array

@description('Application Insights component name. The connection string is resolved from it here.')
param appInsightsName string

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

@description('PostgreSQL server host. Server side use only; the browser never connects to the database.')
param postgresServerFqdn string

@description('Application database name.')
param postgresDatabaseName string

@description('Redis cache host name.')
param redisHostName string

@description('Storage account holding generated audio.')
param storageAccountName string

@description('Blob container holding generated audio.')
param audioContainerName string

@description('Speech account name invoked by the server side handlers.')
param speechAccountName string

@description('Speech region.')
param speechRegion string

// Startup command. Must stay identical to APPLICATION_PACKAGE.startCommand in
// scripts/azure/deployment-contract.js, which is what the packaged manifest uses.
// Bicep cannot read that file, so this is the one place the value is restated.
@description('App Service startup command for the production server.')
param startupCommand string = 'node server/index.js'

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  tags: tags
  sku: {
    name: planSkuName
    tier: planSkuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  tags: union(tags, {
    'azd-service-name': azdServiceName
  })
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    // Origin lock down is not applied here. Front Door serves the site and the
    // audio path, but API Management also calls this site for the api path, and
    // its outbound address is not known until it exists. Restricting inbound
    // traffic to the Front Door service tag alone would break the api path.
    // Access restrictions are sequenced with the API Management operations work.
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      appCommandLine: startupCommand
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      healthCheckPath: '/health'
      cors: {
        allowedOrigins: allowedCorsOrigins
        supportCredentials: false
      }
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'POSTGRES_HOST'
          value: postgresServerFqdn
        }
        {
          name: 'POSTGRES_DATABASE'
          value: postgresDatabaseName
        }
        {
          name: 'REDIS_HOST'
          value: redisHostName
        }
        {
          name: 'STORAGE_ACCOUNT_NAME'
          value: storageAccountName
        }
        {
          name: 'AUDIO_CONTAINER_NAME'
          value: audioContainerName
        }
        {
          name: 'SPEECH_ACCOUNT_NAME'
          value: speechAccountName
        }
        {
          name: 'SPEECH_REGION'
          value: speechRegion
        }
      ]
      // Foundry settings are deliberately absent. The endpoint and deployment
      // name are deploy time operator inputs, so azd sets them on the site after
      // provisioning rather than this template inventing placeholder values.
    }
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'app-service-diagnostics'
  scope: webApp
  properties: {
    workspaceId: workspaceId
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output webAppName string = webApp.name
output webAppId string = webApp.id
output defaultHostName string = webApp.properties.defaultHostName
output principalId string = webApp.identity.principalId
output planName string = plan.name

// Every address the site can egress from. PostgreSQL admits exactly these rather
// than a broad public range.
output possibleOutboundIpAddresses array = split(webApp.properties.possibleOutboundIpAddresses, ',')
