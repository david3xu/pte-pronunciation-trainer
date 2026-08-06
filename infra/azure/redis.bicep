targetScope = 'resourceGroup'

// Azure Cache for Redis.
//
// Classic Azure Cache for Redis is a retiring product. Basic C1 is the approved
// tier and it clears the daily spend floor where C0 does not. If Basic C1 stops
// being provisionable in the target region, that is a blocker requiring an
// approved substitution recorded in the deployment plan, not a silent move to
// Azure Managed Redis.
//
// Basic tier has no Entra authentication and no replica, so the cache is reached
// with an access key held as an App Service reference rather than by managed
// identity. That is a property of the tier, not a design preference, and it is why
// only safe deterministic inference results are cached here.

@description('Azure region for the Redis cache.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Globally unique Redis cache name.')
param cacheName string

@description('Redis SKU family. C is Basic and Standard.')
@allowed([
  'C'
  'P'
])
param skuFamily string

@description('Redis SKU name.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param skuName string

@description('Redis capacity index. Sized to clear the daily spend floor.')
@minValue(0)
@maxValue(6)
param skuCapacity int

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

resource cache 'Microsoft.Cache/redis@2024-03-01' = {
  name: cacheName
  location: location
  tags: tags
  properties: {
    sku: {
      family: skuFamily
      name: skuName
      capacity: skuCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// Basic tier exposes connection metrics only. No log categories are available, so
// requesting a log category group here would fail the deployment.
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'redis-diagnostics'
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
output cacheSslPort int = cache.properties.sslPort
