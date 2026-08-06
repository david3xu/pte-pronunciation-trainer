/**
 * Redis only ARM validation and what if.
 *
 * Retained because Redis availability can change. Classic Azure Cache for Redis is a
 * retiring product, so evidence that Basic C1 is creatable has a shelf life and needs
 * to be reproducible rather than quoted from a past run.
 *
 * Runs against infra/azure/redis.bicep alone. Two operations only, both non creating:
 * ARM validate, which checks the template without persisting a resource, and what if,
 * which predicts changes without applying them. Neither reserves capacity. This script
 * never deploys and has no code path that could.
 *
 * Fails closed. The predicted change set is asserted, not merely printed: the Redis
 * cache and its diagnostic setting may be created, unrelated existing resources may
 * only be left unchanged, and anything else is a violation that exits non zero.
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

/** Name for a cache that does not exist, so what if predicts a create. */
export const PROBE_CACHE_NAME = 'ccl-redis-whatif-probe';

/**
 * Resource types the probe expects to be created.
 *
 * The diagnostic setting is declared inside redis.bicep, so validating that module as
 * written necessarily predicts it. It is not an additional service.
 */
export const ALLOWED_CREATE_TYPES = Object.freeze([
  'Microsoft.Cache/redis',
  'Microsoft.Insights/diagnosticSettings',
]);

/** The one type whose creation must actually be predicted for the run to mean anything. */
export const REQUIRED_CREATE_TYPE = 'Microsoft.Cache/redis';

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
 * @param {{ skuName?: unknown, skuFamily?: unknown, skuCapacity?: unknown }} [requestedSku]
 * @returns {{ ok: boolean, violations: string[], created: string[], unchanged: string[] }}
 */
export function assessChangeSet(changes, requestedSku = {}) {
  const violations = [];
  const created = [];
  const unchanged = [];

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
    const type = change?.after?.type ?? change?.before?.type ?? 'unknown type';

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

    if (type === REQUIRED_CREATE_TYPE) {
      const sku = change?.after?.properties?.sku ?? {};
      const mismatches = [];
      if (requestedSku.skuName !== undefined && sku.name !== requestedSku.skuName) {
        mismatches.push(`name ${String(sku.name)} rather than ${String(requestedSku.skuName)}`);
      }
      if (requestedSku.skuFamily !== undefined && sku.family !== requestedSku.skuFamily) {
        mismatches.push(`family ${String(sku.family)} rather than ${String(requestedSku.skuFamily)}`);
      }
      if (requestedSku.skuCapacity !== undefined && sku.capacity !== requestedSku.skuCapacity) {
        mismatches.push(
          `capacity ${String(sku.capacity)} rather than ${String(requestedSku.skuCapacity)}`,
        );
      }
      if (mismatches.length > 0) {
        violations.push(`the predicted cache sku does not match the request: ${mismatches.join(', ')}`);
      }
    }
  }

  if (!created.includes(REQUIRED_CREATE_TYPE)) {
    violations.push(
      `${REQUIRED_CREATE_TYPE} was not predicted as a Create, so the run proves nothing about its availability`,
    );
  }

  return { ok: violations.length === 0, violations, created, unchanged };
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
  const requestedSku = {
    skuName: parameters.values.redisSkuName,
    skuFamily: parameters.values.redisSkuFamily,
    skuCapacity: parameters.values.redisSkuCapacity,
  };

  const redact = (text) => text.replaceAll(subscriptionId, '<subscription-id>');

  process.stdout.write(
    `template ${REDIS_TEMPLATE}\nrequested sku ${String(requestedSku.skuName)} family ${String(requestedSku.skuFamily)} capacity ${String(requestedSku.skuCapacity)}\nregion ${location}\n\n`,
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
    `location=${location}`,
    '--parameters',
    `cacheName=${PROBE_CACHE_NAME}`,
    '--parameters',
    `skuFamily=${String(requestedSku.skuFamily)}`,
    '--parameters',
    `skuName=${String(requestedSku.skuName)}`,
    '--parameters',
    `skuCapacity=${String(requestedSku.skuCapacity)}`,
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

  const assessment = assessChangeSet(parsed?.changes, requestedSku);

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
    '\nPASS the predicted change set contains only the redis cache and its diagnostic setting\n',
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
