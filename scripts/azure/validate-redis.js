/**
 * Managed Redis only ARM validation and what if.
 *
 * Retained because Redis availability can change. Classic Azure Cache for Redis
 * passed this same kind of preview and was then rejected at provisioning because the
 * product is retiring. The approved replacement therefore needs a reproducible
 * preview that asserts the complete Managed Redis cluster and database contract.
 *
 * Runs against infra/azure/redis.bicep alone. Two operations only, both non creating:
 * ARM validate, which checks the template without persisting a resource, and what if,
 * which predicts changes without applying them. Neither reserves capacity. This script
 * never deploys and has no code path that could.
 *
 * Fails closed. The predicted change set is asserted, not merely printed: exactly one
 * Managed Redis cluster, its required database and its diagnostic setting may be
 * created, unrelated existing resources may only be left unchanged, and anything
 * else is a violation that exits non zero.
 *
 * Scope comes from the selected AZD environment. The subscription identifier is
 * redacted from all output so a run can be pasted into a tracked document. No secret is
 * read or printed, and no file is written.
 */

import { formatCommand, runCommand } from './lib/exec.js';
import { loadBicepParameters } from './lib/bicep-params.js';
import { readAzdEnvironment } from './lib/azd-env.js';
import { REPO_PATHS } from './lib/paths.js';
import { AZD_ENV_KEYS, EXIT_CODES, TIMEOUTS_MS } from './deployment-contract.js';

const AZ = process.platform === 'win32' ? 'az.cmd' : 'az';

/** The only template this probe is permitted to touch. */
export const REDIS_TEMPLATE = 'infra/azure/redis.bicep';

/** Name for a cluster that does not exist, so what if predicts a create. */
export const PROBE_CACHE_NAME = 'ccl-managed-redis-whatif-probe';

/**
 * Resource types the probe permits to be created.
 *
 * The diagnostic setting is declared inside redis.bicep, so validating that module
 * as written necessarily predicts it. It is not an additional service.
 */
export const ALLOWED_CREATE_TYPES = Object.freeze([
  'Microsoft.Cache/redisEnterprise',
  'Microsoft.Cache/redisEnterprise/databases',
  'Microsoft.Insights/diagnosticSettings',
]);

/** Both resources are mandatory for a usable Managed Redis deployment. */
export const REQUIRED_CREATE_TYPES = Object.freeze([
  'Microsoft.Cache/redisEnterprise',
  'Microsoft.Cache/redisEnterprise/databases',
]);

/**
 * Change types that assert nothing is altered.
 *
 * ARM lists resource group resources the template does not manage. It reports those as
 * Ignore, and in some responses as NoChange. Both mean no alteration, so both are
 * accepted for unrelated resources and reported separately so they stay visible.
 */
export const NO_CHANGE_TYPES = Object.freeze(['Ignore', 'NoChange']);

/**
 * Assert a predicted change set.
 *
 * @param {unknown} changes
 * @param {{
 *   subscriptionId?: unknown,
 *   resourceGroup?: unknown,
 *   cacheName?: unknown,
 *   location?: unknown,
 *   skuName?: unknown,
 *   databaseName?: unknown,
 *   port?: unknown,
 *   minimumTlsVersion?: unknown,
 *   publicNetworkAccess?: unknown,
 *   accessKeysAuthentication?: unknown,
 *   clientProtocol?: unknown,
 *   clusteringPolicy?: unknown,
 *   evictionPolicy?: unknown,
 * }} [requested]
 * @returns {{ ok: boolean, violations: string[], created: string[], unchanged: string[] }}
 */
export function assessChangeSet(changes, requested = {}) {
  const violations = [];
  const created = [];
  const unchanged = [];
  const createCounts = new Map();

  if (!Array.isArray(changes)) {
    return {
      ok: false,
      violations: ['the what if response carried no change array, so nothing can be asserted'],
      created,
      unchanged,
    };
  }

  for (const entry of changes) {
    if (typeof entry !== 'object' || entry === null) {
      violations.push('a change entry was not an object');
      continue;
    }
    const change = /** @type {Record<string, any>} */ (entry);
    const changeType = typeof change.changeType === 'string' ? change.changeType : 'unknown';
    const reportedType = String(change?.after?.type ?? change?.before?.type ?? 'unknown type');
    const type =
      ALLOWED_CREATE_TYPES.find(
        (allowed) => allowed.toLowerCase() === reportedType.toLowerCase(),
      ) ?? reportedType;

    if (NO_CHANGE_TYPES.includes(changeType)) {
      unchanged.push(`${type} (${changeType})`);
      continue;
    }

    if (changeType !== 'Create') {
      violations.push(`${type} predicted ${changeType}, which this probe refuses`);
      continue;
    }

    if (!ALLOWED_CREATE_TYPES.includes(String(type))) {
      violations.push(`${type} predicted an unexpected Create`);
      continue;
    }

    created.push(String(type));
    createCounts.set(type, (createCounts.get(type) ?? 0) + 1);

    if (type === 'Microsoft.Cache/redisEnterprise') {
      assessCluster(change.after, requested, violations);
    }
    if (type === 'Microsoft.Cache/redisEnterprise/databases') {
      assessDatabase(change.after, requested, violations);
    }
  }

  for (const requiredType of REQUIRED_CREATE_TYPES) {
    if (!created.includes(requiredType)) {
      violations.push(
        `${requiredType} was not predicted as a Create, so the run does not prove the approved deployment is available`,
      );
    }
  }

  for (const [type, count] of createCounts) {
    if (count !== 1) {
      violations.push(`${type} was predicted as Create ${String(count)} times rather than exactly once`);
    }
  }

  return { ok: violations.length === 0, violations, created, unchanged };
}

/**
 * @param {unknown} after
 * @param {Record<string, unknown>} requested
 * @param {string[]} violations
 */
function assessCluster(after, requested, violations) {
  if (typeof after !== 'object' || after === null) {
    violations.push('the predicted Managed Redis cluster has no after state');
    return;
  }

  const resource = /** @type {Record<string, any>} */ (after);
  const mismatches = [];
  compareValue(mismatches, 'name', resource.name, requested.cacheName);
  compareValue(mismatches, 'location', resource.location, requested.location);
  compareValue(mismatches, 'sku.name', resource?.sku?.name, requested.skuName);
  compareValue(
    mismatches,
    'properties.minimumTlsVersion',
    resource?.properties?.minimumTlsVersion,
    requested.minimumTlsVersion,
  );
  compareValue(
    mismatches,
    'properties.publicNetworkAccess',
    resource?.properties?.publicNetworkAccess,
    requested.publicNetworkAccess,
  );

  if (mismatches.length > 0) {
    violations.push(`the predicted Managed Redis cluster differs from the request: ${mismatches.join(', ')}`);
  }
}

/**
 * @param {unknown} after
 * @param {Record<string, unknown>} requested
 * @param {string[]} violations
 */
function assessDatabase(after, requested, violations) {
  if (typeof after !== 'object' || after === null) {
    violations.push('the predicted Managed Redis database has no after state');
    return;
  }

  const resource = /** @type {Record<string, any>} */ (after);
  const mismatches = [];
  const expectedId =
    requested.subscriptionId === undefined ||
    requested.resourceGroup === undefined ||
    requested.cacheName === undefined ||
    requested.databaseName === undefined
      ? undefined
      : `/subscriptions/${String(requested.subscriptionId)}/resourceGroups/${String(requested.resourceGroup)}/providers/Microsoft.Cache/redisEnterprise/${String(requested.cacheName)}/databases/${String(requested.databaseName)}`;

  compareValue(mismatches, 'name', resource.name, requested.databaseName);
  compareResourceId(mismatches, 'id', resource.id, expectedId);
  compareValue(
    mismatches,
    'properties.accessKeysAuthentication',
    resource?.properties?.accessKeysAuthentication,
    requested.accessKeysAuthentication,
  );
  compareValue(
    mismatches,
    'properties.clientProtocol',
    resource?.properties?.clientProtocol,
    requested.clientProtocol,
  );
  compareValue(
    mismatches,
    'properties.clusteringPolicy',
    resource?.properties?.clusteringPolicy,
    requested.clusteringPolicy,
  );
  compareValue(
    mismatches,
    'properties.evictionPolicy',
    resource?.properties?.evictionPolicy,
    requested.evictionPolicy,
  );
  compareValue(mismatches, 'properties.port', resource?.properties?.port, requested.port);

  if (mismatches.length > 0) {
    violations.push(`the predicted Managed Redis database differs from the request: ${mismatches.join(', ')}`);
  }
}

/**
 * @param {string[]} mismatches
 * @param {string} label
 * @param {unknown} actual
 * @param {unknown} expected
 */
function compareValue(mismatches, label, actual, expected) {
  if (expected !== undefined && actual !== expected) {
    mismatches.push(`${label} is ${String(actual)} rather than ${String(expected)}`);
  }
}

/**
 * Azure resource IDs are case insensitive even though their returned casing varies.
 *
 * @param {string[]} mismatches
 * @param {string} label
 * @param {unknown} actual
 * @param {unknown} expected
 */
function compareResourceId(mismatches, label, actual, expected) {
  if (
    expected !== undefined &&
    (typeof actual !== 'string' ||
      actual.toLowerCase() !== String(expected).toLowerCase())
  ) {
    mismatches.push(`${label} is ${String(actual)} rather than ${String(expected)}`);
  }
}

/**
 * Entry point. Kept separate from the assertion logic so the logic is testable without
 * contacting Azure.
 */
async function main() {
  const stored = await readAzdEnvironment({ timeoutMs: TIMEOUTS_MS.cliProbe });
  const env = stored.ok ? stored.values : {};
  const subscriptionId = env[AZD_ENV_KEYS.subscriptionId];
  const resourceGroup = env[AZD_ENV_KEYS.resourceGroup];
  const location = env[AZD_ENV_KEYS.location];

  if (subscriptionId === undefined || resourceGroup === undefined || location === undefined) {
    process.stdout.write(
      'cannot proceed: subscription, resource group or region unresolved from the selected azd environment\n',
    );
    return EXIT_CODES.blocked;
  }

  const parameters = await loadBicepParameters();
  const requested = {
    subscriptionId,
    resourceGroup,
    cacheName: PROBE_CACHE_NAME,
    location: parameters.values.redisLocation,
    skuName: parameters.values.redisSkuName,
    databaseName: parameters.values.redisDatabaseName,
    port: parameters.values.redisPort,
    minimumTlsVersion: '1.2',
    publicNetworkAccess: 'Enabled',
    accessKeysAuthentication: 'Disabled',
    clientProtocol: 'Encrypted',
    clusteringPolicy: 'OSSCluster',
    evictionPolicy: 'AllKeysLRU',
  };

  const redact = (text) => text.replaceAll(subscriptionId, '<subscription-id>');

  process.stdout.write(
    `template ${REDIS_TEMPLATE}\nrequested sku ${String(requested.skuName)}, database ${String(requested.databaseName)}, port ${String(requested.port)}\nregion ${String(requested.location)}\n\n`,
  );

  // No workspace exists yet. A syntactically valid identifier for one that does not
  // exist satisfies the module's diagnostic setting without creating anything.
  const workspaceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/ccl-whatif-probe-workspace`;

  const commonArgs = [
    '--resource-group',
    resourceGroup,
    '--template-file',
    REDIS_TEMPLATE,
    '--parameters',
    `location=${String(requested.location)}`,
    '--parameters',
    `cacheName=${PROBE_CACHE_NAME}`,
    '--parameters',
    `skuName=${String(requested.skuName)}`,
    '--parameters',
    `databaseName=${String(requested.databaseName)}`,
    '--parameters',
    `port=${String(requested.port)}`,
    '--parameters',
    `workspaceId=${workspaceId}`,
    '--parameters',
    'tags={}',
    '--subscription',
    subscriptionId,
    '--only-show-errors',
  ];

  const validateArgs = ['deployment', 'group', 'validate', ...commonArgs, '--output', 'json'];
  const whatIfArgs = ['deployment', 'group', 'what-if', ...commonArgs, '--no-pretty-print'];

  process.stdout.write(`=== validate ===\n${redact(formatCommand(AZ, validateArgs))}\n`);
  const validated = await runCommand(AZ, validateArgs, {
    cwd: REPO_PATHS.root,
    timeoutMs: 180_000,
  });

  if (validated.exitCode !== 0) {
    process.stdout.write(`FAIL validate exited ${String(validated.exitCode)}\n`);
    process.stdout.write(`${redact(validated.stderr).slice(0, 2500)}\n`);
    return EXIT_CODES.blocked;
  }
  process.stdout.write('PASS validate accepted the template\n\n');

  process.stdout.write(`=== what if ===\n${redact(formatCommand(AZ, whatIfArgs))}\n`);
  const previewed = await runCommand(AZ, whatIfArgs, {
    cwd: REPO_PATHS.root,
    timeoutMs: 180_000,
  });

  if (previewed.exitCode !== 0) {
    process.stdout.write(`FAIL what if exited ${String(previewed.exitCode)}\n`);
    process.stdout.write(`${redact(previewed.stderr).slice(0, 2500)}\n`);
    return EXIT_CODES.blocked;
  }

  let parsed;
  try {
    parsed = JSON.parse(previewed.stdout);
  } catch (error) {
    process.stdout.write(
      `FAIL what if output is not valid JSON: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return EXIT_CODES.blocked;
  }

  const assessment = assessChangeSet(parsed?.changes, requested);

  for (const type of assessment.created) {
    process.stdout.write(`     Create ${type}\n`);
  }
  for (const entry of assessment.unchanged) {
    process.stdout.write(`     unchanged ${entry}\n`);
  }

  if (!assessment.ok) {
    process.stdout.write('\nFAIL the predicted change set was refused\n');
    for (const violation of assessment.violations) {
      process.stdout.write(`     ${redact(violation)}\n`);
    }
    return EXIT_CODES.blocked;
  }

  process.stdout.write(
    '\nPASS the predicted change set contains exactly the approved Managed Redis cluster, database and diagnostic setting\n',
  );
  process.stdout.write(
    'capacity is not reserved. A what if predicts a create against current conditions only.\n',
  );
  process.stdout.write('no resource created, no sku changed, no file written\n');

  return EXIT_CODES.success;
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  process.exit(await main());
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function baseName(filePath) {
  const normalised = filePath.replaceAll('\\', '/');
  const index = normalised.lastIndexOf('/');
  return index === -1 ? normalised : normalised.slice(index + 1);
}
