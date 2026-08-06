targetScope = 'resourceGroup'

// PostgreSQL flexible server.
//
// Password authentication is disabled and Entra authentication is the only path
// in, so the administrator values the caller supplies decide whether the server is
// reachable at all.
//
// The firewall admits exactly the App Service outbound addresses. The former
// Vercel egress ranges are gone: they were never a published stable set, and the
// handlers now run on App Service. No browser has a database path, by design and
// by firewall.

@description('Azure region for the PostgreSQL flexible server.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Globally unique PostgreSQL flexible server name.')
@minLength(3)
@maxLength(63)
param serverName string

@description('Compute SKU name. Sized to clear the daily spend floor, not to fit load.')
param skuName string

@description('Compute tier matching skuName.')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param skuTier string

@description('Provisioned storage in GB.')
param storageSizeGB int

@description('PostgreSQL major version.')
param postgresVersion string

@description('Backup retention in days.')
@minValue(7)
@maxValue(35)
param backupRetentionDays int

@description('Application database name created on the server.')
param databaseName string

@description('Object ID of the Entra principal granted server administrator.')
param entraAdminObjectId string

@description('UPN or display name of the Entra administrator principal.')
param entraAdminPrincipalName string

@description('Entra principal type of the administrator.')
@allowed([
  'User'
  'Group'
  'ServicePrincipal'
])
param entraAdminPrincipalType string

@description('App Service outbound addresses permitted to reach the server. Each becomes a single address firewall rule.')
param allowedOutboundIpAddresses array

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: postgresVersion
    createMode: 'Default'
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Disabled'
      tenantId: subscription().tenantId
    }
    storage: {
      storageSizeGB: storageSizeGB
      autoGrow: 'Disabled'
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

resource administrator 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2024-08-01' = {
  parent: server
  name: entraAdminObjectId
  properties: {
    principalName: entraAdminPrincipalName
    principalType: entraAdminPrincipalType
    tenantId: subscription().tenantId
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
  dependsOn: [
    administrator
  ]
}

// One rule per declared App Service outbound address. Single address ranges
// rather than a CIDR block, so the permitted set is exactly what the site reports.
resource appServiceFirewallRules 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = [
  for (ipAddress, index) in allowedOutboundIpAddresses: {
    parent: server
    name: 'app-service-outbound-${index}'
    properties: {
      startIpAddress: trim(ipAddress)
      endIpAddress: trim(ipAddress)
    }
  }
]

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'postgres-diagnostics'
  scope: server
  properties: {
    workspaceId: workspaceId
    logs: [
      {
        categoryGroup: 'allLogs'
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

output serverName string = server.name
output serverId string = server.id
output serverFqdn string = server.properties.fullyQualifiedDomainName
output databaseName string = database.name
