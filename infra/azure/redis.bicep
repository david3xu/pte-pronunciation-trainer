targetScope = 'resourceGroup'

// Azure Managed Redis.
//
// Classic Azure Cache for Redis rejected the approved deployment because that
// product is retiring. Balanced_B3 is the approved replacement. It is deployed
// in Australia Central because the approved SKU is available there while the
// rest of the estate stays in Australia East.
//
// Access keys are disabled. The application does not consume this cache yet, so
// the host and port settings are preparatory and no credential is generated or
// surfaced by this module.

@description('Azure region for the Managed Redis cluster.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Globally unique Managed Redis cluster name.')
@minLength(1)
@maxLength(60)
param cacheName string

@description('Approved Azure Managed Redis SKU.')
@allowed([
  'Balanced_B3'
])
param skuName string

@description('Name of the required Redis database child.')
@allowed([
  'default'
])
param databaseName string

@description('TLS database endpoint port.')
@minValue(10000)
@maxValue(10000)
param port int

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

resource cache 'Microsoft.Cache/redisEnterprise@2025-07-01' = {
  name: cacheName
  location: location
  tags: tags
  sku: {
    name: skuName
  }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource database 'Microsoft.Cache/redisEnterprise/databases@2025-07-01' = {
  parent: cache
  name: databaseName
  properties: {
    accessKeysAuthentication: 'Disabled'
    clientProtocol: 'Encrypted'
    clusteringPolicy: 'OSSCluster'
    evictionPolicy: 'AllKeysLRU'
    port: port
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'managed-redis-diagnostics'
  scope: cache
  properties: {
    workspaceId: workspaceId
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output cacheName string = cache.name
output cacheId string = cache.id
output cacheHostName string = cache.properties.hostName
output cachePort int = database.properties.port
output databaseName string = database.name
