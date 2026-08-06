/**
 * Stage three of the pre provision hook: validate quota and regional capacity.
 *
 * This is the last gate before paid provisioning, so it is deliberately
 * conservative. A probe that cannot establish capacity is recorded as
 * inconclusive rather than as a pass, and an Azure surface that reports no
 * numeric limit is not read as unlimited capacity.
 *
 * Providers are processed one at a time. Several of these reads are slow and
 * issuing them together produced throttled responses that were indistinguishable
 * from a genuine capacity refusal.
 *
 * The SKU and tier values probed here are read from infra/azure/main.bicepparam,
 * so the automation cannot check one tier while the deployment requests another.
 */

import { AZ_EXTENSIONS, azJson, ensureAzureCliExtension } from './lib/az.js';
import { loadBicepParameters } from './lib/bicep-params.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import {
  AZD_ENV_KEYS,
  CAPACITY_STRATEGY,
  EXIT_CODES,
  RESOURCE_PLAN,
  TIMEOUTS_MS,
} from './deployment-contract.js';

const STAGE_LABELS = Object.freeze({
  extensions: 'azure cli extensions',
  runtime: 'app service linux runtime',
  existingSpeech: 'existing speech account',
});

const FLAGS = Object.freeze({
  sku: '--sku',
  linuxWorkersEnabled: '--linux-workers-enabled',
  location: '--location',
  namespace: '--namespace',
  name: '--name',
  resourceGroup: '--resource-group',
  os: '--os',
  scope: '--scope',
  graphQuery: '--graph-query',
});

const LINUX_OS_NAME = 'linux';
const SPEECH_ACCOUNT_KIND = 'SpeechServices';

/**
 * Compare Azure region identifiers. Azure returns display names such as the
 * spaced form from some surfaces and short names from others.
 *
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
export function sameRegion(left, right) {
  const normalise = (value) => value.replaceAll(' ', '').toLowerCase();
  return normalise(left) === normalise(right);
}

/**
 * Normalise the runtime list returned by az webapp list-runtimes.
 *
 * The command has returned two shapes across CLI versions: a flat array of
 * runtime strings, and an array of objects carrying the runtime under one of
 * several property names. Filtering for strings alone silently produced an empty
 * list against the object shape, which reported the requested runtime as
 * unverified even when it was advertised.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normaliseRuntimeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const runtimes = [];

  for (const entry of value) {
    if (typeof entry === 'string') {
      runtimes.push(entry);
      continue;
    }
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = /** @type {Record<string, unknown>} */ (entry);
    for (const property of ['name', 'runtimeVersion', 'displayName', 'linuxFxVersion']) {
      const candidate = record[property];
      if (typeof candidate === 'string' && candidate !== '') {
        runtimes.push(candidate);
        break;
      }
    }
  }

  return runtimes;
}

/**
 * Run the capacity validation stage.
 *
 * @param {{
 *   report?: DeploymentReport,
 *   resolved?: Record<string, string>,
 *   dryRun?: boolean,
 * }} [options]
 * @returns {Promise<{ report: DeploymentReport }>}
 */
export async function checkCapacity(options = {}) {
  const report = options.report ?? new DeploymentReport('Capacity validation');
  const resolved = options.resolved ?? {};
  const dryRun = options.dryRun ?? false;

  const subscriptionId = resolved[AZD_ENV_KEYS.subscriptionId];
  const location = resolved[AZD_ENV_KEYS.location];
  const resourceGroup = resolved[AZD_ENV_KEYS.resourceGroup];
  const speechAccountName = resolved[AZD_ENV_KEYS.speechAccountName];

  if (subscriptionId === undefined || location === undefined) {
    report.beginStage(STAGE_LABELS.extensions);
    report.record({
      name: 'target subscription and region resolved',
      status: CHECK_STATUS.fail,
      detail: 'capacity validation requires both the subscription and the region resolved by the environment stage',
    });
    return { report };
  }

  const parameters = await loadBicepParameters();

  report.beginStage(STAGE_LABELS.extensions);
  await ensureExtensions(report, dryRun);

  report.beginStage(STAGE_LABELS.runtime);
  await checkLinuxRuntime(report, { subscriptionId, parameters });

  report.beginStage(STAGE_LABELS.existingSpeech);
  const observedSpeechSku = await checkExistingSpeechAccount(report, {
    subscriptionId,
    location,
    resourceGroup,
    speechAccountName,
  });

  for (const resource of RESOURCE_PLAN) {
    report.beginStage(`${resource.providerNamespace} ${resource.displayName}`);

    const requestedSku = describeRequestedSku(resource, parameters);
    report.note(
      requestedSku === ''
        ? `quantity ${resource.quantity}`
        : `quantity ${resource.quantity}, requested ${requestedSku}`,
    );

    // Every strategy runs. Stopping at the first conclusive answer meant a
    // resource whose SKU probe passed never had its quota checked, so a SKU that
    // is offered but has no remaining quota read as available capacity.
    const statuses = [];

    for (const strategy of resource.capacityStrategies) {
      const outcome = await applyStrategy(strategy, {
        resource,
        parameters,
        subscriptionId,
        location,
        resourceGroup,
        speechAccountName,
      });

      report.record({
        name: `${resource.id} via ${strategy}`,
        status: outcome.status,
        detail: outcome.detail,
        evidence: outcome.evidence,
      });

      statuses.push(outcome.status);
    }

    const anyFailed = statuses.includes(CHECK_STATUS.fail);
    const anyPassed = statuses.includes(CHECK_STATUS.pass);

    if (anyFailed) {
      report.record({
        name: `${resource.id} capacity conclusion`,
        status: CHECK_STATUS.fail,
        detail: 'at least one probe refused this resource, so provisioning is blocked',
      });
    } else if (!anyPassed) {
      report.record({
        name: `${resource.id} capacity conclusion`,
        status: CHECK_STATUS.inconclusive,
        detail: `no probe established capacity. Documented limit reference: ${resource.documentedLimitReference}. ${
          resource.documentedLimit === null
            ? 'No limit figure is asserted here, so the operator must confirm headroom before provisioning.'
            : `Documented limit: ${resource.documentedLimit}.`
        }`,
      });
    }

    if (resource.note !== undefined) {
      report.note(resource.note);
    }
  }

  return { report, observedSpeechSku };
}

/**
 * @param {DeploymentReport} report
 * @param {boolean} dryRun
 */
async function ensureExtensions(report, dryRun) {
  for (const extensionName of [AZ_EXTENSIONS.quota, AZ_EXTENSIONS.resourceGraph]) {
    if (dryRun) {
      report.record({
        name: `extension ${extensionName}`,
        status: CHECK_STATUS.skip,
        detail: 'check mode does not install extensions',
      });
      continue;
    }

    const outcome = await ensureAzureCliExtension(extensionName, {
      timeoutMs: TIMEOUTS_MS.capacityProbe,
    });

    report.record({
      name: `extension ${extensionName}`,
      status: outcome.ok ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: outcome.ok
        ? outcome.alreadyPresent
          ? 'already installed'
          : 'installed for this run'
        : `could not be installed, so the probes that depend on it cannot run: ${firstLine(outcome.stderr)}`,
      evidence: [outcome.commandLine],
    });
  }
}

/**
 * Confirm the requested Linux runtime string appears in the advertised list. A
 * runtime that is merely plausible is rejected, because App Service accepts an
 * unknown value at deployment time and fails at container start.
 *
 * @param {DeploymentReport} report
 * @param {{ subscriptionId: string, parameters: import('./lib/bicep-params.js').BicepParameterFile }} context
 */
async function checkLinuxRuntime(report, context) {
  const requested = context.parameters.values.appServiceLinuxFxVersion;

  if (typeof requested !== 'string' || requested.trim() === '') {
    report.record({
      name: 'linux runtime declared',
      status: CHECK_STATUS.fail,
      detail: 'appServiceLinuxFxVersion is missing from the committed parameter file',
    });
    return;
  }

  const result = await azJson(['webapp', 'list-runtimes', FLAGS.os, LINUX_OS_NAME], {
    subscriptionId: context.subscriptionId,
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!result.ok || !Array.isArray(result.value)) {
    report.record({
      name: 'linux runtime advertised',
      status: CHECK_STATUS.inconclusive,
      detail: `the advertised runtime list could not be read, so ${requested} is unverified: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    });
    return;
  }

  const advertised = normaliseRuntimeList(result.value);

  if (advertised.length === 0) {
    report.record({
      name: 'linux runtime advertised',
      status: CHECK_STATUS.inconclusive,
      detail: `the runtime list was returned in an unrecognised shape, so ${requested} is unverified`,
      evidence: [result.commandLine],
    });
    return;
  }

  const matched = advertised.some((entry) => entry.toLowerCase() === requested.toLowerCase());

  report.record({
    name: 'linux runtime advertised',
    status: matched ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: matched
      ? `${requested} appears in the advertised linux runtime list`
      : `${requested} does not appear in the advertised linux runtime list. Record an approved substitution in the deployment plan rather than changing the runtime silently.`,
    evidence: [result.commandLine],
  });
}

/**
 * Confirm the Speech account named in the environment already exists. This is
 * the check that makes a repeated provision safe: the deployment updates that
 * account in place, and a missing or mistyped name is what would create a second
 * one.
 *
 * @param {DeploymentReport} report
 * @param {{ subscriptionId: string, location: string, resourceGroup: string | undefined, speechAccountName: string | undefined }} context
 */
async function checkExistingSpeechAccount(report, context) {
  if (context.resourceGroup === undefined || context.speechAccountName === undefined) {
    report.record({
      name: 'speech account identified',
      status: CHECK_STATUS.fail,
      detail: `both ${AZD_ENV_KEYS.resourceGroup} and ${AZD_ENV_KEYS.speechAccountName} are required, because an unidentified account is what leads to a duplicate being created`,
    });
    return;
  }

  const result = await azJson(
    [
      'cognitiveservices',
      'account',
      'show',
      FLAGS.name,
      context.speechAccountName,
      FLAGS.resourceGroup,
      context.resourceGroup,
    ],
    {
      subscriptionId: context.subscriptionId,
      query: '{kind:kind, sku:sku.name, location:location}',
      timeoutMs: TIMEOUTS_MS.capacityProbe,
    },
  );

  if (!result.ok || typeof result.value !== 'object' || result.value === null) {
    report.record({
      name: 'speech account identified',
      status: CHECK_STATUS.fail,
      detail: `the named speech account could not be read. Provisioning would create a second account rather than upgrading the existing one: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    });
    return;
  }

  const account = /** @type {Record<string, unknown>} */ (result.value);
  const mismatches = [];

  if (account.kind !== SPEECH_ACCOUNT_KIND) {
    mismatches.push(
      `kind is ${String(account.kind)} rather than ${SPEECH_ACCOUNT_KIND}, so this is not a speech account`,
    );
  }

  // A region mismatch is a blocker rather than a warning. The deployment declares
  // the account at the target region, so applying it against an account in another
  // region either fails or, worse, is accepted as an unintended move.
  if (typeof account.location === 'string' && !sameRegion(account.location, context.location)) {
    mismatches.push(
      `region is ${account.location} but the deployment targets ${context.location}, which the in place update cannot reconcile`,
    );
  }

  report.record({
    name: 'speech account identified',
    status: mismatches.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      mismatches.length === 0
        ? `exists in ${String(account.location)} with current sku ${String(account.sku)}, so the deployment updates it in place`
        : `the named account does not match the requested deployment: ${mismatches.join('; ')}`,
    evidence: [result.commandLine],
  });

  // Returned so the confirmation gate can tell whether the deployment would
  // actually change the sku, rather than asking for agreement to a no op.
  return typeof account.sku === 'string' ? account.sku : undefined;
}

/**
 * @typedef {{ status: string, detail: string, evidence: string[] }} StrategyOutcome
 */

/**
 * @param {string} strategy
 * @param {{
 *   resource: import('./deployment-contract.js').PlannedResource,
 *   parameters: import('./lib/bicep-params.js').BicepParameterFile,
 *   subscriptionId: string,
 *   location: string,
 *   resourceGroup: string | undefined,
 *   speechAccountName: string | undefined,
 * }} context
 * @returns {Promise<StrategyOutcome>}
 */
async function applyStrategy(strategy, context) {
  switch (strategy) {
    case CAPACITY_STRATEGY.appServiceSkuLocations:
      return probeAppServiceSku(context);
    case CAPACITY_STRATEGY.postgresSkuList:
      return probePostgresSku(context);
    case CAPACITY_STRATEGY.cognitiveServicesSkuList:
      return probeSpeechSku(context);
    case CAPACITY_STRATEGY.providerLocationSupport:
      return probeProviderLocation(context);
    case CAPACITY_STRATEGY.quotaApi:
      return probeQuota(context);
    case CAPACITY_STRATEGY.resourceGraphCount:
      return probeResourceGraphCount(context);
    default:
      return {
        status: CHECK_STATUS.inconclusive,
        detail: `no probe is implemented for strategy ${strategy}`,
        evidence: [],
      };
  }
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeAppServiceSku(context) {
  const sku = context.parameters.values.appServicePlanSkuName;
  if (typeof sku !== 'string') {
    return { status: CHECK_STATUS.fail, detail: 'appServicePlanSkuName is not a string value', evidence: [] };
  }

  const result = await azJson(
    ['appservice', 'list-locations', FLAGS.sku, sku, FLAGS.linuxWorkersEnabled],
    { subscriptionId: context.subscriptionId, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the location list for sku ${sku} could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const offered = result.value
    .map((entry) => (typeof entry === 'object' && entry !== null ? /** @type {Record<string, unknown>} */ (entry).name : undefined))
    .filter((name) => typeof name === 'string');

  const available = offered.some((name) => sameRegion(String(name), context.location));

  return {
    status: available ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: available
      ? `sku ${sku} with linux workers is offered in ${context.location}`
      : `sku ${sku} with linux workers is not offered in ${context.location}. This is a blocker, not a reason to select a cheaper tier.`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probePostgresSku(context) {
  const skuName = context.parameters.values.postgresSkuName;
  const skuTier = context.parameters.values.postgresSkuTier;
  const version = context.parameters.values.postgresVersion;

  const result = await azJson(
    ['postgres', 'flexible-server', 'list-skus', FLAGS.location, context.location],
    { subscriptionId: context.subscriptionId, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the flexible server sku list could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const serialised = JSON.stringify(result.value);
  const skuOffered = typeof skuName === 'string' && serialised.includes(skuName);
  const tierOffered = typeof skuTier === 'string' && serialised.includes(skuTier);
  const versionOffered = typeof version === 'string' && serialised.includes(`"${version}"`);

  const missing = [];
  if (!skuOffered) {
    missing.push(`compute sku ${String(skuName)}`);
  }
  if (!tierOffered) {
    missing.push(`tier ${String(skuTier)}`);
  }
  if (!versionOffered) {
    missing.push(`major version ${String(version)}`);
  }

  return {
    status: missing.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      missing.length === 0
        ? `${String(skuTier)} ${String(skuName)} on major version ${String(version)} is offered in ${context.location}`
        : `not offered in ${context.location}: ${missing.join(', ')}`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeSpeechSku(context) {
  if (context.resourceGroup === undefined || context.speechAccountName === undefined) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: 'the existing account name and resource group are required to list the skus it can move to',
      evidence: [],
    };
  }

  const requestedSku = context.parameters.values.speechSku;
  const result = await azJson(
    [
      'cognitiveservices',
      'account',
      'list-skus',
      FLAGS.name,
      context.speechAccountName,
      FLAGS.resourceGroup,
      context.resourceGroup,
    ],
    { subscriptionId: context.subscriptionId, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the sku list for the existing speech account could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const offered = JSON.stringify(result.value ?? []);
  const available = typeof requestedSku === 'string' && offered.includes(`"${requestedSku}"`);

  return {
    status: available ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: available
      ? `sku ${String(requestedSku)} is offered for the existing account, so the in place upgrade is valid`
      : `sku ${String(requestedSku)} is not offered for the existing account in ${context.location}`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeProviderLocation(context) {
  const shortType = context.resource.resourceType.split('/').slice(1).join('/');
  const query = `resourceTypes[?resourceType=='${shortType}'].locations | [0]`;

  const result = await azJson(
    ['provider', 'show', FLAGS.namespace, context.resource.providerNamespace],
    { subscriptionId: context.subscriptionId, query, timeoutMs: TIMEOUTS_MS.capacityProbe },
  );

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `supported locations for ${context.resource.resourceType} could not be read: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const supported = result.value
    .filter((entry) => typeof entry === 'string')
    .some((entry) => sameRegion(String(entry), context.location));

  if (!supported) {
    return {
      status: CHECK_STATUS.fail,
      detail: `${context.resource.resourceType} is not offered in ${context.location}`,
      evidence: [result.commandLine],
    };
  }

  return {
    status: CHECK_STATUS.inconclusive,
    detail: `${context.resource.resourceType} is offered in ${context.location}. Regional support is not a capacity statement, so this probe alone does not clear the resource.`,
    evidence: [result.commandLine],
  };
}

/**
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeQuota(context) {
  const scope = `/subscriptions/${context.subscriptionId}/providers/${context.resource.providerNamespace}/locations/${context.location}`;
  const result = await azJson(['quota', 'list', FLAGS.scope, scope], {
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!result.ok || !Array.isArray(result.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the quota surface did not answer for ${context.resource.providerNamespace} in ${context.location}. Fall back to the documented limit: ${context.resource.documentedLimitReference}.`,
      evidence: [result.commandLine],
    };
  }

  const entries = result.value
    .filter((entry) => typeof entry === 'object' && entry !== null)
    .map((entry) => /** @type {Record<string, any>} */ (entry));

  if (entries.length === 0) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `the quota surface returned no entries for ${context.resource.providerNamespace}. An empty response is not a statement of available capacity.`,
      evidence: [result.commandLine],
    };
  }

  const numeric = entries.filter((entry) => typeof entry?.properties?.limit?.value === 'number');

  if (numeric.length === 0) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `${entries.length} quota entries were returned but none carried a numeric limit. A missing or unlimited limit value is recorded as unverified rather than as available capacity.`,
      evidence: [result.commandLine],
    };
  }

  // A limit alone is not headroom. Current usage has to be subtracted, or a fully
  // consumed quota reads as available because its limit is larger than the one
  // resource being requested.
  const usageResult = await azJson(['quota', 'usage', 'list', FLAGS.scope, scope], {
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!usageResult.ok || !Array.isArray(usageResult.value)) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `${numeric.length} quota limits were read but current usage could not be, so remaining headroom is unknown. A limit without usage is not a capacity statement.`,
      evidence: [result.commandLine, usageResult.commandLine],
    };
  }

  const assessed = assessQuotaHeadroom(numeric, usageResult.value, context.resource.quantity);

  if (assessed.unmatched.length > 0 && assessed.exhausted.length === 0) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `usage could not be matched to ${assessed.unmatched.length} quota entry or entries (${assessed.unmatched.join(', ')}), so remaining headroom is unconfirmed for those`,
      evidence: [result.commandLine, usageResult.commandLine],
    };
  }

  return {
    status: assessed.exhausted.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      assessed.exhausted.length === 0
        ? `${assessed.checked} quota entries have at least ${context.resource.quantity} remaining after current usage`
        : `insufficient remaining quota on ${assessed.exhausted.join(', ')}`,
    evidence: [result.commandLine, usageResult.commandLine],
  };
}

/**
 * Compare quota limits against current usage.
 *
 * Entries are matched on the quota name, which both surfaces report. An entry
 * whose usage cannot be found is reported as unmatched rather than assumed to be
 * unused.
 *
 * @param {Array<Record<string, any>>} limitEntries
 * @param {unknown[]} usageEntries
 * @param {number} requiredQuantity
 * @returns {{ checked: number, exhausted: string[], unmatched: string[] }}
 */
export function assessQuotaHeadroom(limitEntries, usageEntries, requiredQuantity) {
  /** @type {Map<string, number>} */
  const usageByName = new Map();

  for (const entry of usageEntries) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = /** @type {Record<string, any>} */ (entry);
    const name = quotaEntryName(record);
    const used = record?.properties?.usages?.value ?? record?.properties?.usages;
    if (name !== undefined && typeof used === 'number') {
      usageByName.set(name, used);
    }
  }

  const exhausted = [];
  const unmatched = [];
  let checked = 0;

  for (const entry of limitEntries) {
    const name = quotaEntryName(entry) ?? 'unnamed quota';
    const limit = entry.properties.limit.value;
    const used = usageByName.get(name);

    if (used === undefined) {
      unmatched.push(name);
      continue;
    }

    checked += 1;
    if (limit - used < requiredQuantity) {
      exhausted.push(`${name} (limit ${limit}, used ${used})`);
    }
  }

  return { checked, exhausted, unmatched };
}

/**
 * Quota name, which appears either at the top level or under the properties.
 *
 * @param {Record<string, any>} entry
 * @returns {string | undefined}
 */
function quotaEntryName(entry) {
  const candidates = [entry?.name?.value, entry?.name, entry?.properties?.name?.value];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate !== '') {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Count existing resources of the planned type. This does not establish a limit,
 * but it records the headroom evidence the deployment plan needs and it detects
 * the case where a resource the plan expects to create already exists.
 *
 * @param {Parameters<typeof applyStrategy>[1]} context
 * @returns {Promise<StrategyOutcome>}
 */
async function probeResourceGraphCount(context) {
  const query = `Resources | where type =~ '${context.resource.resourceType}' | summarize existing = count()`;
  const result = await azJson(['graph', 'query', FLAGS.graphQuery, query], {
    subscriptionId: context.subscriptionId,
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!result.ok) {
    return {
      status: CHECK_STATUS.inconclusive,
      detail: `resource graph did not answer for ${context.resource.resourceType}: ${firstLine(result.stderr)}`,
      evidence: [result.commandLine],
    };
  }

  const payload = /** @type {Record<string, any> | undefined} */ (result.value);
  const existing = payload?.data?.[0]?.existing;

  return {
    status: CHECK_STATUS.inconclusive,
    detail:
      typeof existing === 'number'
        ? `${existing} resource or resources of this type already exist in the subscription. Headroom against the documented limit (${context.resource.documentedLimit ?? 'figure not asserted here'}) is for the operator to confirm.`
        : 'resource graph answered without a countable result',
    evidence: [result.commandLine],
  };
}

/**
 * @param {import('./deployment-contract.js').PlannedResource} resource
 * @param {import('./lib/bicep-params.js').BicepParameterFile} parameters
 * @returns {string}
 */
function describeRequestedSku(resource, parameters) {
  return resource.skuParameterNames
    .map((name) => `${name}=${String(parameters.values[name] ?? 'unset')}`)
    .join(', ');
}

/**
 * @param {string} text
 * @returns {string}
 */
function firstLine(text) {
  const [line] = text.split('\n');
  return line ?? '';
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  /** @type {Record<string, string>} */
  const fromProcess = {};
  for (const key of Object.values(AZD_ENV_KEYS)) {
    const value = process.env[key];
    if (value !== undefined && value.trim() !== '') {
      fromProcess[key] = value.trim();
    }
  }

  const { report } = await checkCapacity({
    resolved: fromProcess,
    dryRun: process.argv.includes('--check'),
  });
  report.writeSummary();
  process.exit(report.blocked ? EXIT_CODES.blocked : EXIT_CODES.success);
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
