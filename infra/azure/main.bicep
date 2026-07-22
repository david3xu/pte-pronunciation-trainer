targetScope = 'subscription'

@description('Azure region for the resource group and Speech resource.')
param location string = 'australiaeast'

@description('Resource group that contains app Azure resources.')
param resourceGroupName string = 'ccl-pronunciation-trainer-rg'

@description('Globally unique Azure AI Speech account name.')
@minLength(3)
@maxLength(64)
param speechAccountName string = 'ccl-pronunciation-speech-${uniqueString(subscription().id)}'

@description('Azure AI Speech SKU. F0 is free tier; S0 is paid standard tier.')
@allowed([
  'F0'
  'S0'
])
param speechSku string = 'F0'

resource appResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module speech 'speech.bicep' = {
  name: 'speech-${uniqueString(resourceGroupName, speechAccountName)}'
  scope: appResourceGroup
  params: {
    location: location
    speechAccountName: speechAccountName
    speechSku: speechSku
  }
}

output resourceGroupName string = appResourceGroup.name
output speechAccountName string = speech.outputs.speechAccountName
output speechEndpoint string = speech.outputs.speechEndpoint
output speechRegion string = location
output speechSku string = speechSku
