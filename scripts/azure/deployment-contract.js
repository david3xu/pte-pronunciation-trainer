/**
 * The Azure deployment contract.
 *
 * This module is the single source of truth for everything the deployment
 * automation needs to know that is not already stated in Bicep. Provider
 * namespaces, required environment value names, capacity probe strategies and
 * the deployment stage order all live here, so no hook contains a literal that
 * another hook could contradict.
 *
 * Deployment specific values are deliberately absent. Subscription identifiers,
 * administrator object identifiers, publisher details, Foundry coordinates and
 * client origins are read from the selected AZD environment at run time. SKU and
 * tier values are read from infra/azure/main.bicepparam, because that file is
 * what the deployment actually consumes.
 */

/** Names of the values the automation reads from the AZD environment. */
export const AZD_ENV_KEYS = Object.freeze({
  environmentName: 'AZURE_ENV_NAME',
  subscriptionId: 'AZURE_SUBSCRIPTION_ID',
  tenantId: 'AZURE_TENANT_ID',
  location: 'AZURE_LOCATION',
  resourceGroup: 'AZURE_RESOURCE_GROUP',
  postgresEntraAdminObjectId: 'POSTGRES_ENTRA_ADMIN_OBJECT_ID',
  postgresEntraAdminPrincipalName: 'POSTGRES_ENTRA_ADMIN_PRINCIPAL_NAME',
  apimPublisherEmail: 'APIM_PUBLISHER_EMAIL',
  apimPublisherName: 'APIM_PUBLISHER_NAME',
  foundryResourceId: 'FOUNDRY_RESOURCE_ID',
  foundryEndpoint: 'FOUNDRY_ENDPOINT',
  foundryDeploymentName: 'FOUNDRY_DEPLOYMENT_NAME',
  capacitorAllowedOrigins: 'CAPACITOR_ALLOWED_ORIGINS',
  webAllowedOrigins: 'WEB_ALLOWED_ORIGINS',
  speechAccountName: 'SPEECH_ACCOUNT_NAME',
  deploymentStage: 'DEPLOYMENT_STAGE',
});

/** Value shapes the environment validator can enforce. */
export const VALUE_SHAPE = Object.freeze({
  guid: 'guid',
  email: 'email',
  nonEmptyText: 'nonEmptyText',
  httpsUrl: 'httpsUrl',
  originList: 'originList',
  azureResourceId: 'azureResourceId',
  azureRegion: 'azureRegion',
});

/**
 * When a required value is needed. Values needed at provision time gate
 * az deployment. Values needed at deploy time gate application configuration and
 * are checked separately so an infrastructure only run is not blocked by an
 * input that infrastructure does not consume.
 */
export const REQUIREMENT_GATE = Object.freeze({
  provision: 'provision',
  deploy: 'deploy',
});

/**
 * @typedef {object} RequiredEnvironmentValue
 * @property {string} key
 * @property {string} shape
 * @property {string} gate
 * @property {string} purpose
 * @property {string} howToObtain
 */

/**
 * Every deployment specific value the operator must supply through the AZD
 * environment. None of these may be inferred or defaulted: an inferred publisher
 * email would be attributed to a real mailbox, and an inferred origin list would
 * silently widen the CORS surface.
 *
 * @type {readonly RequiredEnvironmentValue[]}
 */
export const REQUIRED_ENVIRONMENT_VALUES = Object.freeze([
  {
    key: AZD_ENV_KEYS.subscriptionId,
    shape: VALUE_SHAPE.guid,
    gate: REQUIREMENT_GATE.provision,
    purpose: 'Target subscription for every resource in the plan.',
    howToObtain: 'azd env set together with the subscription chosen during azd init.',
  },
  {
    key: AZD_ENV_KEYS.location,
    shape: VALUE_SHAPE.azureRegion,
    gate: REQUIREMENT_GATE.provision,
    purpose: 'Region for the resource group and every regional resource.',
    howToObtain: 'azd env set, matching the region recorded in the deployment plan.',
  },
  {
    key: AZD_ENV_KEYS.resourceGroup,
    shape: VALUE_SHAPE.nonEmptyText,
    gate: REQUIREMENT_GATE.provision,
    purpose: 'Existing resource group that already holds the Speech account.',
    howToObtain: 'azd env set with the resource group named in the deployment plan.',
  },
  {
    key: AZD_ENV_KEYS.postgresEntraAdminObjectId,
    shape: VALUE_SHAPE.guid,
    gate: REQUIREMENT_GATE.provision,
    purpose:
      'PostgreSQL Entra administrator. Password authentication is disabled, so an incorrect value leaves the server unreachable.',
    howToObtain: 'az ad signed-in-user show --query id --output tsv',
  },
  {
    key: AZD_ENV_KEYS.postgresEntraAdminPrincipalName,
    shape: VALUE_SHAPE.nonEmptyText,
    gate: REQUIREMENT_GATE.provision,
    purpose: 'Principal name recorded alongside the PostgreSQL Entra administrator.',
    howToObtain: 'az ad signed-in-user show --query userPrincipalName --output tsv',
  },
  {
    key: AZD_ENV_KEYS.apimPublisherEmail,
    shape: VALUE_SHAPE.email,
    gate: REQUIREMENT_GATE.provision,
    purpose:
      'API Management notification recipient. API Management sends real mail to this address, so it is never inferred.',
    howToObtain: 'Supplied by the operator. No default exists.',
  },
  {
    key: AZD_ENV_KEYS.apimPublisherName,
    shape: VALUE_SHAPE.nonEmptyText,
    gate: REQUIREMENT_GATE.provision,
    purpose: 'API Management publisher organisation name shown in the developer portal.',
    howToObtain: 'Supplied by the operator. No default exists.',
  },
  {
    key: AZD_ENV_KEYS.speechAccountName,
    shape: VALUE_SHAPE.nonEmptyText,
    gate: REQUIREMENT_GATE.provision,
    purpose:
      'Name of the Speech account that already exists in the resource group. Supplying it explicitly is what prevents a second account being created.',
    howToObtain:
      'az cognitiveservices account list --resource-group <group> --query "[?kind==\'SpeechServices\'].name" --output tsv',
  },
  {
    key: AZD_ENV_KEYS.webAllowedOrigins,
    shape: VALUE_SHAPE.originList,
    gate: REQUIREMENT_GATE.deploy,
    purpose:
      'Browser origins permitted by App Service CORS and by the API Management CORS policy. Deferred during the foundation stage: no browser client points at this estate yet, and an empty allow list is the correct answer rather than a missing one. The parameter file defaults it to empty.',
    howToObtain: 'Supplied by the operator as a comma separated list of https origins.',
  },
  {
    key: AZD_ENV_KEYS.capacitorAllowedOrigins,
    shape: VALUE_SHAPE.originList,
    gate: REQUIREMENT_GATE.deploy,
    purpose:
      'Native application origins permitted by the API Management CORS policy. Deferred until a native build targets this estate.',
    howToObtain:
      'Supplied by the operator. Capacitor presents a scheme specific origin rather than an https origin.',
  },
  {
    key: AZD_ENV_KEYS.foundryResourceId,
    shape: VALUE_SHAPE.azureResourceId,
    gate: REQUIREMENT_GATE.deploy,
    purpose:
      'Shared Azure AI Foundry account. Used to scope the managed identity role assignment for inference.',
    howToObtain: 'az cognitiveservices account show --name <account> --resource-group <group> --query id --output tsv',
  },
  {
    key: AZD_ENV_KEYS.foundryEndpoint,
    shape: VALUE_SHAPE.httpsUrl,
    gate: REQUIREMENT_GATE.deploy,
    purpose: 'OpenAI compatible endpoint the server side inference client calls.',
    howToObtain: 'Read from the shared Foundry resource. Never exposed to the browser.',
  },
  {
    key: AZD_ENV_KEYS.foundryDeploymentName,
    shape: VALUE_SHAPE.nonEmptyText,
    gate: REQUIREMENT_GATE.deploy,
    purpose: 'Model deployment name used in Foundry requests and in the Redis cache key.',
    howToObtain: 'Supplied by the operator from the shared Foundry resource.',
  },
]);

/**
 * Resource providers the deployment requires. Registration is checked and only
 * missing namespaces are registered, because registering an already registered
 * provider is a needless subscription write.
 */
export const REQUIRED_RESOURCE_PROVIDERS = Object.freeze([
  'Microsoft.Web',
  'Microsoft.DBforPostgreSQL',
  'Microsoft.Cache',
  'Microsoft.Storage',
  'Microsoft.Cdn',
  'Microsoft.ApiManagement',
  'Microsoft.OperationalInsights',
  'Microsoft.Insights',
  'Microsoft.CognitiveServices',
  'Microsoft.Network',
  'Microsoft.Authorization',
  'Microsoft.Quota',
]);

/** Registration states reported by the Azure resource provider surface. */
export const PROVIDER_STATE = Object.freeze({
  registered: 'Registered',
  registering: 'Registering',
  notRegistered: 'NotRegistered',
  unregistering: 'Unregistering',
});

/** How a planned resource has its capacity established. */
export const CAPACITY_STRATEGY = Object.freeze({
  /** az appservice list-locations filtered by the planned plan SKU. */
  appServiceSkuLocations: 'appServiceSkuLocations',
  /** az postgres flexible-server list-skus for the target region. */
  postgresSkuList: 'postgresSkuList',
  /** az cognitiveservices account list-skus for the Speech kind. */
  cognitiveServicesSkuList: 'cognitiveServicesSkuList',
  /** Provider resource type location list. Establishes regional support only. */
  providerLocationSupport: 'providerLocationSupport',
  /** az quota list for providers that expose a quota surface. */
  quotaApi: 'quotaApi',
  /** Resource Graph count of existing resources of the type, for headroom. */
  resourceGraphCount: 'resourceGraphCount',
});

/**
 * @typedef {object} PlannedResource
 * @property {string} id
 * @property {string} displayName
 * @property {string} providerNamespace
 * @property {string} resourceType Fully qualified ARM type.
 * @property {number} quantity
 * @property {string[]} skuParameterNames Parameter names in main.bicepparam.
 * @property {string[]} capacityStrategies Applied in order until one is conclusive.
 * @property {string | null} documentedLimit Stated only where it is known with confidence.
 * @property {string} documentedLimitReference
 * @property {string} [note]
 */

/**
 * The resource inventory, ordered to match the required deployment sequence.
 *
 * @type {readonly PlannedResource[]}
 */
export const RESOURCE_PLAN = Object.freeze([
  {
    id: 'logAnalytics',
    displayName: 'Log Analytics workspace',
    providerNamespace: 'Microsoft.OperationalInsights',
    resourceType: 'Microsoft.OperationalInsights/workspaces',
    quantity: 1,
    skuParameterNames: ['workspaceRetentionInDays'],
    capacityStrategies: [CAPACITY_STRATEGY.providerLocationSupport, CAPACITY_STRATEGY.resourceGraphCount],
    documentedLimit: null,
    documentedLimitReference: 'Azure Monitor service limits',
  },
  {
    id: 'applicationInsights',
    displayName: 'Application Insights component',
    providerNamespace: 'Microsoft.Insights',
    resourceType: 'Microsoft.Insights/components',
    quantity: 1,
    skuParameterNames: [],
    capacityStrategies: [CAPACITY_STRATEGY.providerLocationSupport, CAPACITY_STRATEGY.resourceGraphCount],
    documentedLimit: null,
    documentedLimitReference: 'Azure Monitor service limits',
    note: 'Workspace based component. Requires the Log Analytics workspace to exist first.',
  },
  {
    id: 'appServicePlan',
    displayName: 'App Service plan',
    providerNamespace: 'Microsoft.Web',
    resourceType: 'Microsoft.Web/serverfarms',
    quantity: 1,
    skuParameterNames: ['appServicePlanSkuName', 'appServicePlanSkuTier'],
    capacityStrategies: [CAPACITY_STRATEGY.appServiceSkuLocations, CAPACITY_STRATEGY.resourceGraphCount],
    documentedLimit: '100 App Service plans per resource group',
    documentedLimitReference: 'App Service limits in Azure subscription and service limits',
  },
  {
    id: 'webApp',
    displayName: 'Linux web app',
    providerNamespace: 'Microsoft.Web',
    resourceType: 'Microsoft.Web/sites',
    quantity: 1,
    skuParameterNames: ['appServiceLinuxFxVersion'],
    capacityStrategies: [CAPACITY_STRATEGY.providerLocationSupport],
    documentedLimit: null,
    documentedLimitReference: 'App Service limits in Azure subscription and service limits',
    note: 'The Linux runtime string is verified separately against the advertised runtime list.',
  },
  {
    id: 'postgres',
    displayName: 'PostgreSQL flexible server',
    providerNamespace: 'Microsoft.DBforPostgreSQL',
    resourceType: 'Microsoft.DBforPostgreSQL/flexibleServers',
    quantity: 1,
    skuParameterNames: [
      'postgresSkuName',
      'postgresSkuTier',
      'postgresStorageSizeGB',
      'postgresVersion',
      'postgresBackupRetentionDays',
    ],
    capacityStrategies: [CAPACITY_STRATEGY.postgresSkuList, CAPACITY_STRATEGY.quotaApi],
    documentedLimit: null,
    documentedLimitReference: 'Azure Database for PostgreSQL flexible server limits',
  },
  {
    id: 'redis',
    displayName: 'Azure Cache for Redis',
    providerNamespace: 'Microsoft.Cache',
    resourceType: 'Microsoft.Cache/redis',
    quantity: 1,
    skuParameterNames: ['redisSkuFamily', 'redisSkuName', 'redisSkuCapacity'],
    capacityStrategies: [CAPACITY_STRATEGY.providerLocationSupport, CAPACITY_STRATEGY.resourceGraphCount],
    documentedLimit: null,
    documentedLimitReference: 'Azure Cache for Redis planning and retirement guidance',
    note:
      'Classic Azure Cache for Redis is a retiring product. Regional provider support is not the same statement as continued availability of the Basic C1 offer, so this resource is reported as inconclusive until an operator preview confirms it. Substituting Azure Managed Redis is a plan change, not an automation fallback.',
  },
  {
    id: 'storage',
    displayName: 'StorageV2 account',
    providerNamespace: 'Microsoft.Storage',
    resourceType: 'Microsoft.Storage/storageAccounts',
    quantity: 1,
    skuParameterNames: ['storageSku'],
    capacityStrategies: [CAPACITY_STRATEGY.providerLocationSupport, CAPACITY_STRATEGY.resourceGraphCount],
    documentedLimit: '250 storage accounts per region per subscription',
    documentedLimitReference: 'Storage account limits in Azure subscription and service limits',
  },
  {
    id: 'speech',
    displayName: 'Azure AI Speech account',
    providerNamespace: 'Microsoft.CognitiveServices',
    resourceType: 'Microsoft.CognitiveServices/accounts',
    quantity: 1,
    skuParameterNames: ['speechSku'],
    capacityStrategies: [CAPACITY_STRATEGY.cognitiveServicesSkuList],
    documentedLimit: null,
    documentedLimitReference: 'Azure AI services quotas and limits',
    note:
      'Updated in place. This resource already exists, so the capacity question is whether the target SKU is offered rather than whether a new account can be created.',
  },
  {
    id: 'apiManagement',
    displayName: 'API Management service',
    providerNamespace: 'Microsoft.ApiManagement',
    resourceType: 'Microsoft.ApiManagement/service',
    quantity: 1,
    skuParameterNames: ['apimSkuName', 'apimSkuCapacity'],
    capacityStrategies: [CAPACITY_STRATEGY.providerLocationSupport, CAPACITY_STRATEGY.resourceGraphCount],
    documentedLimit: 'Developer tier supports exactly one scale unit',
    documentedLimitReference: 'API Management limits in Azure subscription and service limits',
    note: 'Provisioning commonly takes 30 to 45 minutes and must not be treated as a failure.',
  },
  {
    id: 'frontDoor',
    displayName: 'Azure Front Door profile',
    providerNamespace: 'Microsoft.Cdn',
    resourceType: 'Microsoft.Cdn/profiles',
    quantity: 1,
    skuParameterNames: ['frontDoorSku'],
    capacityStrategies: [CAPACITY_STRATEGY.resourceGraphCount],
    documentedLimit: null,
    documentedLimitReference: 'Azure Front Door Standard and Premium limits',
    note: 'Global resource. Regional location probes do not apply.',
  },
]);

/**
 * Parameters in main.bicepparam that must never be committed blank, because a
 * blank value either fails the deployment or produces an unintended resource.
 */
export const REQUIRED_BICEP_PARAMETERS = Object.freeze([
  'speechAccountName',
  'speechSku',
  'postgresSkuName',
  'postgresSkuTier',
  'postgresVersion',
  'postgresDatabaseName',
  'entraAdminObjectId',
  'entraAdminPrincipalName',
  'entraAdminPrincipalType',
  'appServicePlanSkuName',
  'appServicePlanSkuTier',
  'appServiceLinuxFxVersion',
  'appServiceAllowedCorsOrigins',
  'redisSkuFamily',
  'redisSkuName',
  'storageSku',
  'audioContainerName',
  'frontDoorSku',
  'apimSkuName',
  'apimPublisherEmail',
  'apimPublisherName',
]);

/**
 * Parameters that must no longer exist in the committed parameter file, because
 * the value is now derived during deployment rather than supplied by hand.
 */
export const RETIRED_BICEP_PARAMETERS = Object.freeze([
  'handlerBackendUrl',
  'postgresAllowedClientRanges',
]);

/**
 * The required deployment ordering. The hooks enforce the preflight portion and
 * the Bicep dependency graph enforces the provisioning portion. Recording the
 * whole order in one place is what allows the deployment plan and the automation
 * to be checked against each other.
 */
export const DEPLOYMENT_STAGES = Object.freeze([
  { order: 1, id: 'validateEnvironment', description: 'Validate the selected AZD environment.', owner: 'preprovision' },
  { order: 2, id: 'registerProviders', description: 'Register missing resource providers.', owner: 'preprovision' },
  { order: 3, id: 'validateCapacity', description: 'Validate quota and regional capacity.', owner: 'preprovision' },
  { order: 4, id: 'resourceGroup', description: 'Create or update the resource group.', owner: 'bicep' },
  { order: 5, id: 'monitoring', description: 'Deploy Log Analytics and Application Insights.', owner: 'bicep' },
  { order: 6, id: 'appService', description: 'Deploy App Service and its managed identity.', owner: 'bicep' },
  { order: 7, id: 'dataServices', description: 'Deploy PostgreSQL, Redis and Storage.', owner: 'bicep' },
  { order: 8, id: 'speechUpgrade', description: 'Update the existing Speech account in place.', owner: 'bicep' },
  { order: 9, id: 'roleAssignments', description: 'Configure identity and role assignments.', owner: 'bicep' },
  { order: 10, id: 'apiManagement', description: 'Deploy API Management against the App Service backend.', owner: 'bicep' },
  { order: 11, id: 'frontDoor', description: 'Deploy Front Door and the WAF policy.', owner: 'bicep' },
  { order: 12, id: 'applicationDeploy', description: 'Build and deploy the application package.', owner: 'azd' },
  { order: 13, id: 'schemaBootstrap', description: 'Run controlled schema and identity bootstrap tasks.', owner: 'postprovision' },
  { order: 14, id: 'healthChecks', description: 'Execute health checks.', owner: 'postdeploy' },
  { order: 15, id: 'summary', description: 'Print endpoints and the deployment summary.', owner: 'postdeploy' },
]);

/** Wall clock allowances, in milliseconds, for the slower external calls. */
export const TIMEOUTS_MS = Object.freeze({
  cliProbe: 60_000,
  providerRead: 90_000,
  providerRegistration: 600_000,
  providerRegistrationPollInterval: 10_000,
  capacityProbe: 120_000,
  healthCheck: 30_000,
});

/**
 * Guidance the deployment plan records rather than the automation enforcing.
 * API Management provisioning is slow by design and a short timeout would turn
 * a normal deployment into a reported failure.
 */
export const PROVISIONING_EXPECTATIONS = Object.freeze({
  apiManagementMinutesTypicalLow: 30,
  apiManagementMinutesTypicalHigh: 45,
});

/** Names of the hooks declared in azure.yaml, used for consistent output. */
export const HOOK_NAMES = Object.freeze({
  preprovision: 'preprovision',
  postprovision: 'postprovision',
  predeploy: 'predeploy',
  postdeploy: 'postdeploy',
});

/**
 * Infrastructure outputs the deployment publishes into the AZD environment.
 *
 * Every entry names an output that main.bicep must return. Nothing here carries
 * secret material: connection strings, access keys and passwords are read at run
 * time by the application through its managed identity or through an App Service
 * reference, never surfaced as a deployment output and never printed.
 */
export const DEPLOYMENT_OUTPUTS = Object.freeze([
  { key: 'AZURE_RESOURCE_GROUP_NAME', label: 'Resource group', endpoint: false },
  { key: 'WEB_APP_HOST_NAME', label: 'App Service host', endpoint: true },
  { key: 'WEB_APP_PRINCIPAL_ID', label: 'App Service managed identity principal', endpoint: false },
  { key: 'FRONT_DOOR_ENDPOINT_HOST_NAME', label: 'Front Door endpoint', endpoint: true },
  { key: 'APIM_GATEWAY_URL', label: 'API Management gateway', endpoint: true },
  { key: 'POSTGRES_SERVER_FQDN', label: 'PostgreSQL server', endpoint: false },
  { key: 'POSTGRES_DATABASE_NAME', label: 'PostgreSQL database', endpoint: false },
  { key: 'REDIS_HOST_NAME', label: 'Redis host', endpoint: false },
  { key: 'BLOB_ENDPOINT', label: 'Blob endpoint', endpoint: false },
  { key: 'AUDIO_CONTAINER_NAME', label: 'Generated audio container', endpoint: false },
  { key: 'SPEECH_ENDPOINT', label: 'Speech endpoint', endpoint: false },
  { key: 'SPEECH_SKU', label: 'Speech sku after deployment', endpoint: false },
]);

/**
 * Environment values the post provision hook derives from deployment outputs so
 * that no client build embeds a hard coded production origin.
 */
export const DERIVED_ENVIRONMENT_KEYS = Object.freeze({
  publicBaseUrl: 'PUBLIC_BASE_URL',
  apiBaseUrl: 'VITE_API_BASE_URL',
});

/**
 * The deployable application package.
 *
 * App Service receives a staging directory rather than the repository root, so
 * the deployed artifact contains exactly the production server, the built client
 * assets and the generated content, with no source, tests or development
 * dependencies. Assembly is driven from this declaration so azure.yaml, the
 * package script and the startup command cannot describe different things.
 */
export const APPLICATION_PACKAGE = Object.freeze({
  /** Staging directory name, created beneath the azure state directory. */
  stagingDirectoryName: 'package',
  /** Entry point path inside the staging directory. */
  serverEntryPoint: 'server/index.js',
  /** App Service startup command. Set on the site configuration by Bicep. */
  startCommand: 'node server/index.js',
  /** Name of the script the production manifest exposes for local parity. */
  startScriptName: 'start:server',
  /**
   * Inputs copied into the staging directory. A required input that is absent
   * fails the package step, because a silently incomplete package deploys an
   * application that serves nothing.
   */
  contents: Object.freeze([
    {
      id: 'clientAssets',
      source: 'dist',
      target: 'dist',
      required: true,
      producedBy: 'vite build',
    },
    {
      id: 'generatedContent',
      source: 'data/processed',
      target: 'data/processed',
      required: true,
      producedBy: 'the pte data pipeline',
    },
    {
      id: 'productionServer',
      source: 'dist-server',
      target: '.',
      required: true,
      producedBy: 'the server typescript build',
    },
  ]),
});

/**
 * Explicit confirmations required before anything is billed.
 *
 * The preflight is otherwise read only, so nothing in it warns an operator that
 * the next step creates fixed monthly charges against a credit balance, or that
 * the Speech account is about to move off a free tier. Both are one way in
 * practice: a provisioned App Service plan bills from the hour it exists, and
 * moving Speech from F0 to S0 starts charging for synthesis that used to be free.
 *
 * Each confirmation is a separate value, because they are separate decisions. An
 * operator provisioning staging infrastructure has not necessarily agreed to
 * change the SKU of an account already serving production traffic.
 */
export const CONFIRMATION_KEYS = Object.freeze({
  paidProvisioning: 'AZURE_CONFIRM_PAID_PROVISIONING',
  speechSkuUpgrade: 'AZURE_CONFIRM_SPEECH_SKU_UPGRADE',
  productionStage: 'AZURE_CONFIRM_PRODUCTION_STAGE',
});

/** The only accepted confirmation value. Anything else is treated as absent. */
export const CONFIRMATION_VALUE = 'yes';

/**
 * Estimated fixed monthly cost in US dollars, by resource plan id.
 *
 * Estimates only, from the figures recorded in docs/AZURE_WORKLOAD_PLAN.md. Price
 * each in the Azure calculator for the target region before accepting the
 * provisioning step. A null value means the resource is usage billed and has no
 * fixed floor, so it cannot be totalled here and is reported separately rather
 * than silently counted as zero.
 */
export const ESTIMATED_MONTHLY_USD = Object.freeze({
  appServicePlan: 70,
  webApp: 0,
  postgres: 40,
  redis: 41,
  apiManagement: 50,
  frontDoor: 35,
  storage: 5,
  logAnalytics: null,
  applicationInsights: null,
  speech: null,
});

/**
 * Deployment stage label.
 *
 * The Azure environment runs beside production rather than replacing it. Handler
 * parity is incomplete, so the App Service endpoint must not be presented as a
 * production URL. This value is set as an app setting and reported by the health
 * endpoint so the distinction is visible from the outside rather than only in a
 * document.
 */
export const DEPLOYMENT_STAGE = Object.freeze({
  key: 'DEPLOYMENT_STAGE',
  stagingIncomplete: 'staging-incomplete',
});

/** Exit codes returned by the hook entry points. */
export const EXIT_CODES = Object.freeze({
  success: 0,
  blocked: 1,
  usage: 2,
});
