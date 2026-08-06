targetScope = 'resourceGroup'

// Log Analytics and workspace based Application Insights.
//
// This module deliberately returns no connection string and no instrumentation
// key. Both are secret enough to matter: a connection string carries the
// ingestion key, and a module output is recorded in deployment history where any
// reader can retrieve it. Consumers take the component name and resolve the
// connection string themselves from an existing resource reference.

@description('Azure region for the monitoring resources.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Log Analytics workspace name backing Application Insights.')
param workspaceName string

@description('Application Insights component name.')
param componentName string

@description('Workspace retention in days.')
@minValue(30)
@maxValue(730)
param retentionInDays int

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource component 'Microsoft.Insights/components@2020-02-02' = {
  name: componentName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    DisableLocalAuth: false
  }
}

output workspaceName string = workspace.name
output workspaceId string = workspace.id
output componentName string = component.name
output componentId string = component.id
