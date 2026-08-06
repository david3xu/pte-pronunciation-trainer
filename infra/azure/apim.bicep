targetScope = 'resourceGroup'

// API Management fronting the migrated api handlers.
//
// The backend is derived from the App Service host name the caller passes in.
// There is no manually supplied backend URL, so the gateway cannot drift from the
// site actually serving the handlers.
//
// Concrete operations, policies, rate limits and CORS are added with the handler
// migration, once each route and its methods are verified from source. Defining
// operations before the routes exist would encode a guess.

@description('Azure region for the API Management instance.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Globally unique API Management service name.')
param serviceName string

@description('API Management SKU. Developer has no SLA and is not a production default.')
@allowed([
  'Developer'
  'Basic'
  'Standard'
  'Premium'
])
param skuName string

@description('Scale units.')
@minValue(1)
param skuCapacity int

@description('Publisher email shown on the developer portal and in notifications.')
param publisherEmail string

@description('Publisher organisation name.')
param publisherName string

@description('App Service host name serving the api handlers. The backend URL is derived from this.')
param backendHostName string

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

var backendUrl = 'https://${backendHostName}'

resource apim 'Microsoft.ApiManagement/service@2024-05-01' = {
  name: serviceName
  location: location
  tags: tags
  sku: {
    name: skuName
    capacity: skuCapacity
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
  }
}

resource handlerBackend 'Microsoft.ApiManagement/service/backends@2024-05-01' = {
  parent: apim
  name: 'handler-backend'
  properties: {
    protocol: 'http'
    url: backendUrl
    title: 'Trainer api handlers on App Service'
    tls: {
      validateCertificateChain: true
      validateCertificateName: true
    }
  }
}

resource handlerApi 'Microsoft.ApiManagement/service/apis@2024-05-01' = {
  parent: apim
  name: 'trainer-api'
  properties: {
    displayName: 'Trainer API'
    path: 'api'
    protocols: [
      'https'
    ]
    // Browser and native bundles must not carry a subscription key, so the API is
    // not subscription gated. Abuse protection for the expensive Speech and
    // inference operations comes from per operation rate limiting and from
    // identity checks, added with the handler migration.
    subscriptionRequired: false
    serviceUrl: backendUrl
  }
  dependsOn: [
    handlerBackend
  ]
}

// Gateway diagnostics to Log Analytics. Request and response bodies are not
// captured, so no user content or authentication header reaches the workspace.
resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'apim-diagnostics'
  scope: apim
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

output serviceName string = apim.name
output gatewayUrl string = apim.properties.gatewayUrl
output gatewayHostName string = replace(apim.properties.gatewayUrl, 'https://', '')
output principalId string = apim.identity.principalId
