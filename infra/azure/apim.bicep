targetScope = 'resourceGroup'

// API Management fronting the migrated api handlers.
//
// The backend is derived from the App Service host name the caller passes in.
// There is no manually supplied backend URL, so the gateway cannot drift from the
// site actually serving the handlers.
//
// Operations, policies and rate limits arrive with each ported route, once that
// route and its methods are verified from source. Defining them ahead of the
// routes would encode a guess. Voices and premium text to speech are present.
//
// CORS is not set here for either. Both handlers answer the preflight and set
// their own headers, and the deployment plan records that the remaining handlers
// each need a different CORS surface, so a gateway wide policy would flatten a
// difference that matters.

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

@description('Calls per window allowed to one caller against each synthesis operation. Adjustable. Sized at roughly three times a heavy practice session, which requests a word every few seconds against a client side cache that suppresses repeats.')
@minValue(1)
param synthesisRateLimitCalls int = 60

@description('Length of the synthesis rate limit window in seconds.')
@minValue(1)
param synthesisRateLimitWindowSeconds int = 60

@description('Total calls one caller may make against each synthesis operation per quota window. This is the only provable spend bound available here; the ceiling it yields is stated in the derivation below.')
@minValue(1)
param synthesisQuotaCalls int = 500

@description('Length of the synthesis quota window in seconds. One day, so the ceiling is expressed per day and resets predictably. The policy requires at least 300.')
@minValue(300)
param synthesisQuotaWindowSeconds int = 86400

var backendOrigin = 'https://${backendHostName}'

// Forwarding arithmetic, stated because getting it wrong is silent.
//
// A gateway request to /api/voices has the api path segment stripped, leaving
// /voices, which matches the operation url template below. That remainder is
// appended to the service url. So the service url must itself end in the same
// segment, or the backend receives /voices and the production server answers not
// found for a route it does have.
var backendServiceUrl = '${backendOrigin}/${apiPathSegment}'

// Throttle applied to the two synthesis operations.
//
// Written on one line because a Bicep multi line string cannot interpolate, and
// the call and window values are parameters rather than literals. The effective
// document is:
//
//   <policies>
//     <inbound>
//       <base />
//       <rate-limit-by-key calls="..." renewal-period="..."
//                          counter-key="@(context.Request.IpAddress)" />
//       <quota-by-key calls="..." renewal-period="..."
//                     counter-key="@(context.Request.IpAddress)" />
//     </inbound>
//     <backend><base /></backend>
//     <outbound><base /></outbound>
//     <on-error><base /></on-error>
//   </policies>
//
// Keyed by caller address because the api is not subscription gated, so there is
// no subscription key to count against. The documentation names the caller address
// as the best available key for an api that allows unauthenticated access.
//
// Every section carries `<base />`. No policy exists at api, product or global
// scope today, so each is a no op now, and their absence is what would silently
// skip an inherited policy added at one of those scopes later.
//
// No `increment-condition`, so a refused request counts too. A flood of malformed
// requests synthesises nothing but still consumes gateway and site capacity.
//
// Quota derivation, because the numbers are not obvious and the obvious ones are
// wrong.
//
// The rate limit above bounds burst, not total. At its default one address may
// make 60 calls every 60 seconds, which is 86400 calls a day, each carrying the
// enforced 3000 character maximum from PREMIUM_TTS_MAX_TEXT_LENGTH. Priced against
// the live retail meter that standard neural synthesis actually bills to, that is
// a theoretical 3888 US dollars a day from one caller. The gateway hostname is
// reachable without passing Front Door, so its WAF rate limit does not cover this.
//
// Price comes from the Azure Retail Prices API, not an estimate: product
// `Azure Speech`, meter `S1 Neural Text To Speech Characters`, 15.00 USD per
// 1,000,000 characters in australiaeast, effective 2024-02-01. Note the meter is
// named S1 while the account SKU is S0; there is no S0 meter for Azure Speech in
// any region, so S0 consumption bills against the S1 character meter. Every voice
// in the premium table is a standard neural voice, so none of them reach the more
// expensive HD synthesis meter.
//
// Worst case per call is therefore 3000 * 0.000015 = 0.045 USD.
//
// Why the ceiling is not expressed as a bandwidth value, which was the first
// attempt and was wrong. Bandwidth appears to track spend, because billing is per
// character and a kilobyte budget looks like a character budget. It does not,
// because the caller chooses the ratio. Measured against this deployment at the
// 3000 character maximum: ordinary prose returns about 149 bytes per character,
// long vocabulary items about 171, but one word followed by whitespace padding
// returns 3168 bytes for 3000 billed characters, or 1.06 bytes per character. That
// is a 162 times spread across content this endpoint already accepts. A 9300 KB
// daily budget sized from prose density admits 9,018,182 characters at padding
// density, which is 135 USD a day rather than the 1 USD it was sized for. There is
// no safe density to size from, because the density is an attacker input. So
// bandwidth is not a spend control for a per-character-billed backend, and it is
// deliberately not set. The policy reference also declines to say whether the
// attribute counts request bytes, response bytes or both, which would matter if it
// were load bearing.
//
// What a calls quota therefore guarantees, stated plainly rather than
// optimistically: synthesisQuotaCalls * 0.045 USD per window. At the defaults that
// is 500 * 0.045 = 22.50 USD a day per address. It is a real bound where none
// existed, and 172 times tighter than the rate limit alone, but it is not a 1 USD
// ceiling and must not be described as one.
//
// Closing the rest of the gap needs the worst case per call reduced, because a
// calls quota cannot see request size. Capping the request body at the gateway
// would do it: at a 300 character cap the worst case per call becomes 0.0045 USD,
// and 222 calls a day would then be a genuine 1 USD ceiling. That changes what the
// endpoint accepts, so it is a product decision and is not taken here.
var synthesisThrottlePolicyXml = '<policies><inbound><base /><rate-limit-by-key calls="${synthesisRateLimitCalls}" renewal-period="${synthesisRateLimitWindowSeconds}" counter-key="@(context.Request.IpAddress)" /><quota-by-key calls="${synthesisQuotaCalls}" renewal-period="${synthesisQuotaWindowSeconds}" counter-key="@(context.Request.IpAddress)" /></inbound><backend><base /></backend><outbound><base /></outbound><on-error><base /></on-error></policies>'

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

// Premium text to speech, one operation per method.
//
// Three operations rather than one wildcard. A `*` method is accepted by ARM,
// because the schema types `method` as a free form string to allow uncommon verbs,
// so the deployment succeeds and the operation appears in the portal with no
// method shown. It then answers every request with 404 Operation Not Found. That
// failure mode is a green provision followed by a dead gateway path, which is
// worse than the verbosity it would save. The wildcard support APIM does document
// is for the url template, as in a GET against `/*`, and always alongside an
// explicit method.
//
// OPTIONS is a real operation for the same reason. No CORS policy is attached
// here, so the preflight has to reach App Service, where the handler answers it
// and sets its own CORS headers. Without this operation the gateway would refuse
// the preflight before the backend ever saw it, and a browser would report a CORS
// failure on a route that works.
//
// Both 200 entries cover success and graceful failure. On a synthesis failure the
// handler deliberately answers 200 with `fallback: true` rather than a 5xx,
// because the client treats a non ok status as a transport fault worth retrying.
resource premiumTtsGetOperation 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: handlerApi
  name: 'get-premium-tts'
  properties: {
    displayName: 'Synthesize premium speech (query)'
    method: 'GET'
    urlTemplate: '/premium-tts'
    responses: [
      {
        statusCode: 200
        description: 'Synthesized audio or JSON envelope'
      }
      {
        statusCode: 400
        description: 'Missing or invalid text'
      }
    ]
  }
}

resource premiumTtsPostOperation 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: handlerApi
  name: 'post-premium-tts'
  properties: {
    displayName: 'Synthesize premium speech (body)'
    method: 'POST'
    urlTemplate: '/premium-tts'
    responses: [
      {
        statusCode: 200
        description: 'JSON envelope carrying base64 audio'
      }
      {
        statusCode: 400
        description: 'Missing or invalid text'
      }
    ]
  }
}

resource premiumTtsOptionsOperation 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: handlerApi
  name: 'options-premium-tts'
  properties: {
    displayName: 'Premium speech preflight'
    method: 'OPTIONS'
    urlTemplate: '/premium-tts'
    responses: [
      {
        statusCode: 200
        description: 'Preflight acknowledgement with an empty body'
      }
    ]
  }
}

// Throttles on the two operations that can reach Azure Speech, which bills per
// character. The gateway host name is a template output, the api is not
// subscription gated, and a caller can reach the gateway without passing through
// the Front Door rate limit rule, so without these the synthesis path is open and
// unbounded from the moment it provisions.
//
// OPTIONS is deliberately excluded. A preflight synthesises nothing, and
// throttling it would break the browser handshake for a caller whose actual
// synthesis requests are still within budget.
//
// A limit on calls bounds burst without making it cheap: at the default, one
// address can still submit the maximum text length on every call. The control that
// caps a total over a longer window is the `quota-by-key` in the same inbound
// section, derived above.
resource premiumTtsGetPolicy 'Microsoft.ApiManagement/service/apis/operations/policies@2024-05-01' = {
  parent: premiumTtsGetOperation
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: synthesisThrottlePolicyXml
  }
}

resource premiumTtsPostPolicy 'Microsoft.ApiManagement/service/apis/operations/policies@2024-05-01' = {
  parent: premiumTtsPostOperation
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: synthesisThrottlePolicyXml
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
