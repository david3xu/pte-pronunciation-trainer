targetScope = 'resourceGroup'

// Existing Azure AI Speech account, updated in place.
//
// The account name is supplied by the caller and never generated. That is the
// single property preventing a repeated deployment from creating a second account
// alongside the one already serving traffic. Do not reintroduce a uniqueString
// default here.
//
// Local key authentication stays enabled for now. The deployed handlers still
// authenticate with a subscription key, so disabling it here would break live
// traffic before the App Service managed identity path exists. Disabling it is
// sequenced with the identity and role assignment work, once key free invocation
// has been shown to work.

@description('Azure region for the Speech resource.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Name of the Speech account that already exists in this resource group.')
param speechAccountName string

@description('Azure AI Speech SKU. F0 bills zero and cannot clear the daily spend floor.')
param speechSku string

resource speechAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: speechAccountName
  location: location
  tags: tags
  kind: 'SpeechServices'
  sku: {
    name: speechSku
  }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

output speechAccountName string = speechAccount.name
output speechAccountId string = speechAccount.id
output speechEndpoint string = speechAccount.properties.endpoint
