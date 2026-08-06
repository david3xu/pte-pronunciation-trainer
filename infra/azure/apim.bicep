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

@description('Path segment the gateway exposes the api under. Also the path the backend serves it on.')
param apiPathSegment string = 'api'

var backendOrigin = 'https://${backendHostName}'

// Forwarding arithmetic, stated because getting it wrong is silent.
//
// A gateway request to /api/voices has the api path segment stripped, leaving
// /voices, which matches the operation url template below. That remainder is
// appended to the service url. So the service url must itself end in the same
// segment, or the backend receives /voices and the production server answers not
// found for a route it does have.
var backendServiceUrl = '${backendOrigin}/${apiPathSegment}'

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
    url: backendServiceUrl
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
    path: apiPathSegment
    protocols: [
      'https'
    ]
    // Browser and native bundles must not carry a subscription key, so the API is
    // not subscription gated. Abuse protection for the expensive Speech and
    // inference operations comes from per operation rate limiting and from
    // identity checks, added with the handler migration.
    subscriptionRequired: false
    serviceUrl: backendServiceUrl
  }
  dependsOn: [
    handlerBackend
  ]
}

// Vertical slice operation. Gateway /api/voices forwards to App Service
// /api/voices, which is the route the production server registers.
resource voicesOperation 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: handlerApi
  name: 'get-voices'
  properties: {
    displayName: 'List premium voices'
    method: 'GET'
    urlTemplate: '/voices'
    responses: [
      {
        statusCode: 200
        description: 'Premium voice table'
      }
      {
        statusCode: 405
        description: 'Method not allowed'
      }
    ]
  }
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
output backendServiceUrl string = backendServiceUrl
output voicesOperationName string = voicesOperation.name
