targetScope = 'resourceGroup'

@description('Azure region for the Speech resource.')
param location string

@description('Globally unique Azure AI Speech account name.')
param speechAccountName string

@description('Azure AI Speech SKU.')
param speechSku string

resource speechAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: speechAccountName
  location: location
  kind: 'SpeechServices'
  sku: {
    name: speechSku
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

output speechAccountName string = speechAccount.name
output speechEndpoint string = speechAccount.properties.endpoint
