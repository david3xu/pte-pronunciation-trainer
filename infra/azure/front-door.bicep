targetScope = 'resourceGroup'

// Azure Front Door, the public entry point.
//
// Routing:
//   /*        to the App Service frontend
//   /api/*    to API Management
//   /audio/*  to the App Service audio endpoint
//
// The audio path does not point at the Blob host. The container is private and
// shared key access is disabled, so Standard Front Door cannot read it, and making
// the container public to work around that is not an acceptable design. App
// Service reads the blob with its managed identity and streams the object.
//
// WAF constraint worth stating plainly: Microsoft managed rule sets require the
// Premium tier. The approved SKU is Standard, so this policy carries custom rules
// only. Managed rules are not silently omitted here, they are unavailable at the
// approved tier, and closing that gap means either accepting custom rules or
// approving a Premium upgrade. The decision is recorded in the deployment plan.

@description('Front Door profile name.')
param profileName string

@description('Front Door endpoint name. Forms part of the generated hostname.')
param endpointName string

@description('Tags applied to every resource in this module.')
param tags object

@description('Front Door SKU.')
@allowed([
  'Standard_AzureFrontDoor'
  'Premium_AzureFrontDoor'
])
param profileSku string

@description('App Service host name serving the frontend.')
param appOriginHostName string

@description('Host name serving generated audio. The App Service audio endpoint, not the blob host.')
param audioOriginHostName string

@description('API Management gateway host name serving the api path.')
param apimGatewayHostName string

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

@description('Requests permitted per minute per client address on the api path.')
@minValue(1)
param apiRateLimitPerMinute int = 300

var isPremium = profileSku == 'Premium_AzureFrontDoor'
var wafPolicyName = replace('${profileName}waf', '-', '')

resource profile 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: profileName
  location: 'global'
  tags: tags
  sku: {
    name: profileSku
  }
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: profile
  name: endpointName
  location: 'global'
  tags: tags
  properties: {
    enabledState: 'Enabled'
  }
}

resource appOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'app-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 100
    }
  }
}

resource appOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: appOriginGroup
  name: 'app-origin'
  properties: {
    hostName: appOriginHostName
    originHostHeader: appOriginHostName
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource apimOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'apim-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/status-0123456789abcdef'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 120
    }
  }
}

resource apimOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: apimOriginGroup
  name: 'apim-origin'
  properties: {
    hostName: apimGatewayHostName
    originHostHeader: apimGatewayHostName
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource audioOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: profile
  name: 'audio-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 100
    }
  }
}

resource audioOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: audioOriginGroup
  name: 'audio-origin'
  properties: {
    hostName: audioOriginHostName
    originHostHeader: audioOriginHostName
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// Frontend. Cached, because the Vite build is content hashed. The SPA entry
// document is revalidated by the origin cache headers the production server sets.
resource appRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: endpoint
  name: 'app-route'
  properties: {
    originGroup: {
      id: appOriginGroup.id
    }
    supportedProtocols: [
      'Http'
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'text/html'
          'text/css'
          'text/javascript'
          'application/javascript'
          'application/json'
          'image/svg+xml'
        ]
      }
    }
  }
  dependsOn: [
    appOrigin
  ]
}

// API. Never cached. A cached api response would serve one user another user's
// result, and the more specific pattern takes precedence over the frontend route.
resource apiRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: endpoint
  name: 'api-route'
  properties: {
    originGroup: {
      id: apimOriginGroup.id
    }
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/api/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
  }
  dependsOn: [
    apimOrigin
  ]
}

// Generated audio. Cached aggressively, because keys are deterministic and an
// object never changes once written.
resource audioRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: endpoint
  name: 'audio-route'
  properties: {
    originGroup: {
      id: audioOriginGroup.id
    }
    supportedProtocols: [
      'Https'
    ]
    patternsToMatch: [
      '/audio/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
    }
  }
  dependsOn: [
    audioOrigin
  ]
}

// WAF policy. Prevention mode, so a matched rule blocks rather than only logging.
// Managed rule sets are attached only on Premium, because Standard does not offer
// them; see the note at the top of this file.
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2024-02-01' = {
  name: wafPolicyName
  location: 'global'
  tags: tags
  sku: {
    name: profileSku
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
      requestBodyCheck: 'Enabled'
    }
    customRules: {
      rules: [
        {
          name: 'apiRateLimit'
          priority: 100
          enabledState: 'Enabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: apiRateLimitPerMinute
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RequestUri'
              operator: 'Contains'
              negateCondition: false
              matchValue: [
                '/api/'
              ]
            }
          ]
        }
      ]
    }
    managedRules: isPremium
      ? {
          managedRuleSets: [
            {
              ruleSetType: 'Microsoft_DefaultRuleSet'
              ruleSetVersion: '2.1'
              ruleSetAction: 'Block'
            }
            {
              ruleSetType: 'Microsoft_BotManagerRuleSet'
              ruleSetVersion: '1.0'
            }
          ]
        }
      : {
          managedRuleSets: []
        }
  }
}

// Association. A WAF policy that exists but is not associated protects nothing,
// which is the exact gap this replaces.
resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-02-01' = {
  parent: profile
  name: 'endpoint-waf-association'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicy.id
      }
      associations: [
        {
          domains: [
            {
              id: endpoint.id
            }
          ]
          patternsToMatch: [
            '/*'
          ]
        }
      ]
    }
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'front-door-diagnostics'
  scope: profile
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

output profileName string = profile.name
output endpointHostName string = endpoint.properties.hostName
output wafPolicyName string = wafPolicy.name
output managedRulesAttached bool = isPremium
