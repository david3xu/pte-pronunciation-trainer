/**
 * Post provision hook entry point.
 *
 * Confirms the deployment returned every output the application and the client
 * builds depend on, derives the public origins from those outputs so no build
 * embeds a hard coded production URL, and prints an endpoint summary.
 *
 * No secret is read, derived or printed here. Connection strings, access keys and
 * database credentials are obtained at run time by the application through its
 * managed identity or through an App Service reference, so the deployment has no
 * reason to surface them and this hook has no reason to see them.
 */

import { azJson, readAccount } from './lib/az.js';
import { setAzdEnvironmentValue } from './lib/azd-env.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import {
  AZD_ENV_KEYS,
  DEPLOYMENT_OUTPUTS,
  DERIVED_ENVIRONMENT_KEYS,
  EXIT_CODES,
  TIMEOUTS_MS,
} from './deployment-contract.js';

const HTTPS_PREFIX = 'https://';
const API_PATH_PREFIX = '/api';
const CHECK_FLAG = '--check';
const REPORT_TITLE = 'Azure post provision';
const POSTGRES_API_VERSION = '2024-08-01';
const POSTGRES_ADMIN_PRINCIPAL_TYPE = 'User';

const STAGE_LABELS = Object.freeze({
  outputs: 'deployment outputs',
  postgresAdministrator: 'postgres administrator reconciliation',
  derived: 'derived client configuration',
  endpoints: 'endpoint summary',
});

/** Bounded polling for the two asynchronous PostgreSQL control-plane transitions. */
export const POSTGRES_ADMIN_RETRY = Object.freeze({
  readinessAttempts: 30,
  createAttempts: 3,
  verificationAttempts: 30,
  pollIntervalMs: 10_000,
});

const POSTGRES_TRANSITIONAL_STATES = new Set(['starting', 'updating', 'restarting']);
const POSTGRES_TRANSIENT_ERROR_CODES = Object.freeze([
  'ServerNotReady',
  'OperationInProgress',
  'AnotherOperationInProgress',
  'ServiceBusy',
  'TooManyRequests',
]);

/**
 * Normalise a host name into an https origin. Front Door and App Service both
 * return a bare host, and a client that concatenates a host without a scheme
 * produces a request that silently fails at the browser rather than at build.
 *
 * @param {string} hostName
 * @returns {string}
 */
export function toHttpsOrigin(hostName) {
  const trimmed = hostName.trim().replace(/\/+$/, '');
  return trimmed.startsWith(HTTPS_PREFIX) ? trimmed : `${HTTPS_PREFIX}${trimmed}`;
}

/**
 * Choose the origin clients should call. Front Door is preferred because it is
 * the designed public entry point and it is what routes the api path prefix to
 * API Management. The App Service host is only a fallback for an infrastructure
 * run that has not yet deployed Front Door.
 *
 * @param {Record<string, string | undefined>} outputs
 * @returns {{ origin: string, source: string } | undefined}
 */
export function resolvePublicOrigin(outputs) {
  const frontDoorHost = outputs.FRONT_DOOR_ENDPOINT_HOST_NAME?.trim();
  if (frontDoorHost !== undefined && frontDoorHost !== '') {
    return { origin: toHttpsOrigin(frontDoorHost), source: 'FRONT_DOOR_ENDPOINT_HOST_NAME' };
  }

  const appServiceHost = outputs.WEB_APP_HOST_NAME?.trim();
  if (appServiceHost !== undefined && appServiceHost !== '') {
    return { origin: toHttpsOrigin(appServiceHost), source: 'WEB_APP_HOST_NAME' };
  }

  return undefined;
}

/**
 * Reconcile the sole approved PostgreSQL Entra administrator.
 *
 * The operation is deliberately idempotent. An exact existing administrator is
 * accepted, absence causes one PUT, and any different identity fails closed. The
 * server and administrator are re-read after the PUT so a successful command is
 * not mistaken for a completed asynchronous control-plane operation.
 *
 * @param {{
 *   subscriptionId: string,
 *   tenantId: string,
 *   resourceGroup: string,
 *   serverName: string,
 *   objectId: string,
 *   principalName: string,
 *   request?: (request: {
 *     method: 'GET' | 'PUT',
 *     url: string,
 *     body?: Record<string, unknown>,
 *     subscriptionId: string,
 *   }) => Promise<{
 *     ok: boolean,
 *     value?: unknown,
 *     stderr: string,
 *     commandLine?: string,
 *   }>,
 *   sleep?: (milliseconds: number) => Promise<void>,
 *   readinessAttempts?: number,
 *   createAttempts?: number,
 *   verificationAttempts?: number,
 *   pollIntervalMs?: number,
 * }} options
 * @returns {Promise<{
 *   ok: boolean,
 *   changed: boolean,
 *   detail: string,
 * }>}
 */
export async function reconcilePostgresAdministrator(options) {
  const request = options.request ?? requestPostgresArm;
  const sleep = options.sleep ?? defaultSleep;
  const readinessAttempts =
    options.readinessAttempts ?? POSTGRES_ADMIN_RETRY.readinessAttempts;
  const createAttempts = options.createAttempts ?? POSTGRES_ADMIN_RETRY.createAttempts;
  const verificationAttempts =
    options.verificationAttempts ?? POSTGRES_ADMIN_RETRY.verificationAttempts;
  const pollIntervalMs = options.pollIntervalMs ?? POSTGRES_ADMIN_RETRY.pollIntervalMs;

  const serverResourceUrl = buildPostgresUrl(
    options.subscriptionId,
    options.resourceGroup,
    options.serverName,
  );
  const serverUrl = `${serverResourceUrl}?api-version=${POSTGRES_API_VERSION}`;
  const administratorsResourceUrl = `${serverResourceUrl}/administrators`;
  const administratorsUrl = `${administratorsResourceUrl}?api-version=${POSTGRES_API_VERSION}`;
  const approved = {
    objectId: options.objectId,
    tenantId: options.tenantId,
    principalType: POSTGRES_ADMIN_PRINCIPAL_TYPE,
    principalName: options.principalName,
  };

  let serverReady = false;

  for (let attempt = 1; attempt <= readinessAttempts; attempt += 1) {
    const read = await request({
      method: 'GET',
      url: serverUrl,
      subscriptionId: options.subscriptionId,
    });

    if (!read.ok) {
      if (
        isRecognizedPostgresTransient(read.stderr) &&
        attempt < readinessAttempts
      ) {
        await sleep(pollIntervalMs);
        continue;
      }
      return {
        ok: false,
        changed: false,
        detail: `PostgreSQL server state could not be read: ${firstLine(read.stderr) || 'no detail reported'}`,
      };
    }

    const server = asRecord(read.value);
    const properties = asRecord(server?.properties);
    const state = typeof properties?.state === 'string' ? properties.state : undefined;

    if (state === 'Ready') {
      const authConfig = asRecord(properties?.authConfig);
      const authenticationProblems = [];

      if (authConfig?.activeDirectoryAuth !== 'Enabled') {
        authenticationProblems.push('Entra authentication is not Enabled');
      }
      if (authConfig?.passwordAuth !== 'Disabled') {
        authenticationProblems.push('password authentication is not Disabled');
      }
      if (authConfig?.tenantId !== options.tenantId) {
        authenticationProblems.push(
          `server tenant ${String(authConfig?.tenantId)} does not match the subscription tenant`,
        );
      }

      if (authenticationProblems.length > 0) {
        return {
          ok: false,
          changed: false,
          detail: `PostgreSQL authentication contract mismatch: ${authenticationProblems.join('; ')}`,
        };
      }

      serverReady = true;
      break;
    }

    if (
      state !== undefined &&
      POSTGRES_TRANSITIONAL_STATES.has(state.toLowerCase()) &&
      attempt < readinessAttempts
    ) {
      await sleep(pollIntervalMs);
      continue;
    }

    return {
      ok: false,
      changed: false,
      detail:
        state === undefined
          ? 'PostgreSQL server response did not include properties.state'
          : `PostgreSQL server is ${state}, which is not a recognized readiness transition`,
    };
  }

  if (!serverReady) {
    return {
      ok: false,
      changed: false,
      detail: `PostgreSQL server did not reach Ready after ${String(readinessAttempts)} reads`,
    };
  }

  let existing;
  for (let attempt = 1; attempt <= verificationAttempts; attempt += 1) {
    existing = await readPostgresAdministrators({
      request,
      url: administratorsUrl,
      subscriptionId: options.subscriptionId,
      approved,
    });

    if (existing.ok || !isRecognizedPostgresTransient(existing.detail)) {
      break;
    }
    if (attempt < verificationAttempts) {
      await sleep(pollIntervalMs);
    }
  }

  if (existing === undefined || !existing.ok || existing.outcome === 'conflict') {
    return {
      ok: false,
      changed: false,
      detail: existing?.detail ?? 'PostgreSQL administrators could not be read',
    };
  }
  if (existing.outcome === 'exact') {
    return {
      ok: true,
      changed: false,
      detail: `approved Entra administrator ${options.principalName} already exists exactly`,
    };
  }

  const administratorUrl = `${administratorsResourceUrl}/${encodeURIComponent(options.objectId)}?api-version=${POSTGRES_API_VERSION}`;
  const body = {
    properties: {
      tenantId: options.tenantId,
      principalType: POSTGRES_ADMIN_PRINCIPAL_TYPE,
      principalName: options.principalName,
    },
  };
  let submitted = false;

  for (let attempt = 1; attempt <= createAttempts; attempt += 1) {
    const create = await request({
      method: 'PUT',
      url: administratorUrl,
      body,
      subscriptionId: options.subscriptionId,
    });

    if (create.ok) {
      submitted = true;
      break;
    }

    if (!isRecognizedPostgresTransient(create.stderr) || attempt === createAttempts) {
      return {
        ok: false,
        changed: false,
        detail: `PostgreSQL administrator creation was rejected: ${firstLine(create.stderr) || 'no detail reported'}`,
      };
    }

    await sleep(pollIntervalMs);
    const observed = await readPostgresAdministrators({
      request,
      url: administratorsUrl,
      subscriptionId: options.subscriptionId,
      approved,
    });

    if (observed.ok && observed.outcome === 'exact') {
      return {
        ok: true,
        changed: true,
        detail: `approved Entra administrator ${options.principalName} was created and verified after a transient response`,
      };
    }
    if (observed.outcome === 'conflict') {
      return {
        ok: false,
        changed: false,
        detail: observed.detail,
      };
    }
    if (!observed.ok && !isRecognizedPostgresTransient(observed.detail)) {
      return {
        ok: false,
        changed: false,
        detail: observed.detail,
      };
    }
  }

  if (!submitted) {
    return {
      ok: false,
      changed: false,
      detail: 'PostgreSQL administrator creation did not reach a submitted state',
    };
  }

  for (let attempt = 1; attempt <= verificationAttempts; attempt += 1) {
    const observed = await readPostgresAdministrators({
      request,
      url: administratorsUrl,
      subscriptionId: options.subscriptionId,
      approved,
    });

    if (observed.ok && observed.outcome === 'exact') {
      return {
        ok: true,
        changed: true,
        detail: `approved Entra administrator ${options.principalName} was created and verified`,
      };
    }
    if (observed.outcome === 'conflict') {
      return {
        ok: false,
        changed: false,
        detail: observed.detail,
      };
    }
    if (!observed.ok && !isRecognizedPostgresTransient(observed.detail)) {
      return {
        ok: false,
        changed: false,
        detail: observed.detail,
      };
    }
    if (attempt < verificationAttempts) {
      await sleep(pollIntervalMs);
    }
  }

  return {
    ok: false,
    changed: false,
    detail: `approved PostgreSQL administrator was not observable after ${String(verificationAttempts)} verification reads`,
  };
}

/**
 * Run the post provision hook.
 *
 * @param {{
 *   processEnvironment?: Record<string, string | undefined>,
 *   dryRun?: boolean,
 *   accountReader?: typeof readAccount,
 *   postgresReconciler?: typeof reconcilePostgresAdministrator,
 * }} [options]
 * @returns {Promise<{ report: DeploymentReport }>}
 */
export async function runPostprovision(options = {}) {
  const environment = options.processEnvironment ?? process.env;
  const dryRun = options.dryRun ?? false;
  const report = new DeploymentReport(REPORT_TITLE);

  report.beginStage(STAGE_LABELS.outputs);

  /** @type {Record<string, string | undefined>} */
  const outputs = {};

  for (const output of DEPLOYMENT_OUTPUTS) {
    const value = environment[output.key]?.trim();
    outputs[output.key] = value;

    report.record({
      name: output.key,
      status: value === undefined || value === '' ? CHECK_STATUS.fail : CHECK_STATUS.pass,
      detail:
        value === undefined || value === ''
          ? `${output.label} was not returned by the deployment. The infrastructure must publish this output before the application can be configured.`
          : `${output.label} returned`,
    });
  }

  if (report.blocked) {
    report.note('postprovision stopped before any Azure write because deployment outputs are incomplete');
    return { report };
  }

  report.beginStage(STAGE_LABELS.postgresAdministrator);

  const postgresInputs = {
    subscriptionId: environment[AZD_ENV_KEYS.subscriptionId]?.trim(),
    resourceGroup: environment[AZD_ENV_KEYS.resourceGroup]?.trim(),
    serverName: outputs.POSTGRES_SERVER_NAME,
    objectId: environment[AZD_ENV_KEYS.postgresEntraAdminObjectId]?.trim(),
    principalName: environment[AZD_ENV_KEYS.postgresEntraAdminPrincipalName]?.trim(),
  };
  const missingPostgresInputs = Object.entries(postgresInputs)
    .filter(([, value]) => value === undefined || value === '')
    .map(([key]) => key);

  if (missingPostgresInputs.length > 0) {
    report.record({
      name: 'approved administrator inputs',
      status: CHECK_STATUS.fail,
      detail: `missing ${missingPostgresInputs.join(', ')}; administrator reconciliation cannot be safely scoped`,
    });
    return { report };
  }

  if (dryRun) {
    report.record({
      name: 'approved PostgreSQL Entra administrator',
      status: CHECK_STATUS.skip,
      detail:
        'check mode. A live run would read the server and administrator collection, create the approved identity only if absent, and re-read the exact result.',
    });
  } else {
    const accountReader = options.accountReader ?? readAccount;
    const account = await accountReader({
      subscriptionId: postgresInputs.subscriptionId,
      timeoutMs: TIMEOUTS_MS.cliProbe,
    });

    if (account === undefined || account.id !== postgresInputs.subscriptionId) {
      report.record({
        name: 'target subscription tenant',
        status: CHECK_STATUS.fail,
        detail:
          'the Azure CLI could not resolve the target subscription tenant, so the administrator tenant cannot be asserted',
      });
      return { report };
    }

    const reconciler = options.postgresReconciler ?? reconcilePostgresAdministrator;
    const reconciled = await reconciler({
      subscriptionId: postgresInputs.subscriptionId,
      tenantId: account.tenantId,
      resourceGroup: postgresInputs.resourceGroup,
      serverName: postgresInputs.serverName,
      objectId: postgresInputs.objectId,
      principalName: postgresInputs.principalName,
    });

    report.record({
      name: 'approved PostgreSQL Entra administrator',
      status: reconciled.ok ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: reconciled.detail,
    });

    if (!reconciled.ok) {
      return { report };
    }
  }

  report.beginStage(STAGE_LABELS.derived);

  const publicOrigin = resolvePublicOrigin(outputs);

  if (publicOrigin === undefined) {
    report.record({
      name: DERIVED_ENVIRONMENT_KEYS.publicBaseUrl,
      status: CHECK_STATUS.fail,
      detail:
        'neither the Front Door endpoint nor the App Service host was returned, so no public origin can be derived. A client build would fall back to a compiled in default, which is exactly what this hook exists to prevent.',
    });
    return { report };
  }

  const derived = [
    { key: DERIVED_ENVIRONMENT_KEYS.publicBaseUrl, value: publicOrigin.origin },
    { key: DERIVED_ENVIRONMENT_KEYS.apiBaseUrl, value: publicOrigin.origin },
  ];

  for (const entry of derived) {
    if (dryRun) {
      report.record({
        name: entry.key,
        status: CHECK_STATUS.skip,
        detail: `check mode. A live run would set this from ${publicOrigin.source}.`,
      });
      continue;
    }

    const written = await setAzdEnvironmentValue(entry.key, entry.value, {
      timeoutMs: TIMEOUTS_MS.cliProbe,
    });

    report.record({
      name: entry.key,
      status: written.ok ? CHECK_STATUS.pass : CHECK_STATUS.fail,
      detail: written.ok
        ? `derived from ${publicOrigin.source} and stored in the azd environment`
        : `could not be stored in the azd environment: ${firstLine(written.stderr)}`,
      evidence: [written.commandLine],
    });
  }

  report.beginStage(STAGE_LABELS.endpoints);

  report.note(`public origin ${publicOrigin.origin}`);
  report.note(`api path prefix ${API_PATH_PREFIX} is routed to api management by front door`);

  for (const output of DEPLOYMENT_OUTPUTS.filter((entry) => entry.endpoint)) {
    const value = outputs[output.key];
    if (value !== undefined && value !== '') {
      report.note(`${output.label}: ${value}`);
    }
  }

  report.note(
    `postgres administrator remains the entra principal supplied as ${AZD_ENV_KEYS.postgresEntraAdminObjectId}. Password authentication is disabled on the server.`,
  );
  report.note('no connection string, access key or database credential is printed by this hook');

  return { report };
}

/**
 * @param {string} text
 * @returns {string}
 */
function firstLine(text) {
  const [line] = text.split('\n');
  return line ?? '';
}

/**
 * @param {unknown} value
 * @returns {Record<string, any> | undefined}
 */
function asRecord(value) {
  return typeof value === 'object' && value !== null
    ? /** @type {Record<string, any>} */ (value)
    : undefined;
}

/**
 * @param {string} subscriptionId
 * @param {string} resourceGroup
 * @param {string} serverName
 * @returns {string}
 */
function buildPostgresUrl(subscriptionId, resourceGroup, serverName) {
  return `https://management.azure.com/subscriptions/${encodeURIComponent(subscriptionId)}/resourceGroups/${encodeURIComponent(resourceGroup)}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${encodeURIComponent(serverName)}`;
}

/**
 * @param {{
 *   method: 'GET' | 'PUT',
 *   url: string,
 *   body?: Record<string, unknown>,
 *   subscriptionId: string,
 * }} request
 */
async function requestPostgresArm(request) {
  const args = ['rest', '--method', request.method.toLowerCase(), '--url', request.url];
  if (request.body !== undefined) {
    args.push('--body', JSON.stringify(request.body));
  }
  return azJson(args, {
    subscriptionId: request.subscriptionId,
    timeoutMs: TIMEOUTS_MS.providerRead,
  });
}

/**
 * @param {{
 *   request: NonNullable<Parameters<typeof reconcilePostgresAdministrator>[0]['request']>,
 *   url: string,
 *   subscriptionId: string,
 *   approved: {
 *     objectId: string,
 *     tenantId: string,
 *     principalType: string,
 *     principalName: string,
 *   },
 * }} options
 * @returns {Promise<{
 *   ok: boolean,
 *   outcome: 'absent' | 'exact' | 'conflict' | 'unreadable',
 *   detail: string,
 * }>}
 */
async function readPostgresAdministrators(options) {
  const read = await options.request({
    method: 'GET',
    url: options.url,
    subscriptionId: options.subscriptionId,
  });

  if (!read.ok) {
    return {
      ok: false,
      outcome: 'unreadable',
      detail: `PostgreSQL administrators could not be read: ${firstLine(read.stderr) || 'no detail reported'}`,
    };
  }

  const response = asRecord(read.value);
  const entries = Array.isArray(read.value)
    ? read.value
    : Array.isArray(response?.value)
      ? response.value
      : undefined;

  if (entries === undefined) {
    return {
      ok: false,
      outcome: 'unreadable',
      detail: 'PostgreSQL administrator response did not contain an array',
    };
  }

  if (entries.length === 0) {
    return {
      ok: true,
      outcome: 'absent',
      detail: 'no PostgreSQL Entra administrator exists',
    };
  }

  const administrators = entries.map((entry) => {
    const resource = asRecord(entry);
    const properties = asRecord(resource?.properties);
    return {
      objectId:
        typeof properties?.objectId === 'string'
          ? properties.objectId
          : typeof resource?.name === 'string'
            ? resource.name
            : undefined,
      tenantId: properties?.tenantId,
      principalType: properties?.principalType,
      principalName: properties?.principalName,
    };
  });

  const exact = administrators.filter(
    (administrator) =>
      administrator.objectId === options.approved.objectId &&
      administrator.tenantId === options.approved.tenantId &&
      administrator.principalType === options.approved.principalType &&
      administrator.principalName === options.approved.principalName,
  );

  if (entries.length === 1 && exact.length === 1) {
    return {
      ok: true,
      outcome: 'exact',
      detail: 'the approved PostgreSQL Entra administrator exists exactly',
    };
  }

  return {
    ok: true,
    outcome: 'conflict',
    detail:
      'a different or additional PostgreSQL Entra administrator exists; refusing to overwrite or broaden database administration',
  };
}

/**
 * @param {string} detail
 * @returns {boolean}
 */
export function isRecognizedPostgresTransient(detail) {
  return POSTGRES_TRANSIENT_ERROR_CODES.some((code) =>
    detail.toLowerCase().includes(code.toLowerCase()),
  );
}

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function defaultSleep(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  const { report } = await runPostprovision({ dryRun: process.argv.includes(CHECK_FLAG) });
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
