targetScope = 'resourceGroup'

// Storage account holding generated TTS audio.
//
// The container is private and shared key access is disabled, so the only way in
// is a caller holding a data plane role on this account. That is the App Service
// managed identity. Standard Front Door cannot read a private Blob origin, which
// is why the audio path is served by the App Service audio endpoint rather than
// pointed straight at the blob host. Making the container public to satisfy Front
// Door is not an acceptable alternative.

@description('Storage account name. Lowercase alphanumeric only, three to twenty four characters.')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('Azure region for the storage account.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Replication SKU.')
param storageSku string

@description('Blob container holding generated TTS audio.')
param audioContainerName string

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: storageSku
  }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Enabled'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    // No CORS rules. Browsers never read the container directly; they request the
    // App Service audio endpoint, which reads the blob with its managed identity.
    cors: {
      corsRules: []
    }
  }
}

resource audioContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: audioContainerName
  properties: {
    publicAccess: 'None'
  }
}

// Blob data plane diagnostics. Account level metrics only at this scope; read and
// write request logs are captured on the blob service.
resource blobDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'blob-diagnostics'
  scope: blobService
  properties: {
    workspaceId: workspaceId
    logs: [
      {
        category: 'StorageRead'
        enabled: true
      }
      {
        category: 'StorageWrite'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'Transaction'
        enabled: true
      }
    ]
  }
}

output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
output audioContainerName string = audioContainer.name
