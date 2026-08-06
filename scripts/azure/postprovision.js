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

const STAGE_LABELS = Object.freeze({
  outputs: 'deployment outputs',
  derived: 'derived client configuration',
  endpoints: 'endpoint summary',
});

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
 * Run the post provision hook.
 *
 * @param {{
 *   processEnvironment?: Record<string, string | undefined>,
 *   dryRun?: boolean,
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
