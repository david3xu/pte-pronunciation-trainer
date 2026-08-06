/**
 * Compiled template invariant checker.
 *
 * Reading the Bicep sources is not enough. Modules nest, so a resource can be
 * declared two levels down inside a nested deployment, and a source level grep for
 * a resource type misses it. This compiles the template and walks the emitted ARM
 * JSON recursively, including the templates embedded inside nested deployments.
 *
 * The invariants exist because each of them is a mistake that costs real money or
 * leaks real credentials, and none of them is visible in a diff:
 *
 *   A second Cognitive Services account means a duplicate Speech resource beside
 *   the one already serving traffic, billing separately.
 *
 *   A Foundry, OpenAI, model deployment or Machine Learning workspace would be a
 *   new inference resource when the plan reuses a shared one.
 *
 *   A secret in the output set stays readable in deployment history to anyone with
 *   reader access, indefinitely.
 *
 * Compiles only. Creates and modifies nothing.
 */

import { formatCommand, runCommand, succeeded } from './lib/exec.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { REPO_PATHS, toRepoRelative } from './lib/paths.js';
import { EXIT_CODES, TIMEOUTS_MS } from './deployment-contract.js';

const AZ_PROGRAM = process.platform === 'win32' ? 'az.cmd' : 'az';

/** The single approved Cognitive Services account. */
export const APPROVED_SPEECH = Object.freeze({
  name: 'ccl-pronunciation-speech-david',
  kind: 'SpeechServices',
  type: 'Microsoft.CognitiveServices/accounts',
});

/**
 * Resource types that must never appear. Matched case insensitively on a prefix, so
 * a child type such as accounts/deployments is caught by its parent entry.
 */
export const FORBIDDEN_RESOURCE_TYPES = Object.freeze([
  'Microsoft.CognitiveServices/accounts/deployments',
  'Microsoft.MachineLearningServices',
  'Microsoft.MachineLearning',
]);

/**
 * Output name fragments that indicate secret material. Matched case insensitively.
 * A deployment output is the wrong place for any of these regardless of intent.
 */
export const SECRET_OUTPUT_FRAGMENTS = Object.freeze([
  'connectionstring',
  'instrumentationkey',
  'accesskey',
  'primarykey',
  'secondarykey',
  'password',
  'secret',
  'token',
  'credential',
  'sastoken',
  'apikey',
]);

/** Kinds that indicate an inference account rather than a speech account. */
export const FORBIDDEN_ACCOUNT_KINDS = Object.freeze([
  'openai',
  'aiservices',
  'cognitiveservices',
]);

/**
 * Recursively collect every resource declaration, descending into the templates
 * embedded inside nested deployments.
 *
 * @param {unknown} template
 * @param {string} path Location description used in findings.
 * @returns {Array<{ type: string, name: string, kind: string | undefined, at: string }>}
 */
export function collectResources(template, path = 'main') {
  if (typeof template !== 'object' || template === null) {
    return [];
  }

  const resources = /** @type {Record<string, any>} */ (template).resources;
  if (resources === undefined) {
    return [];
  }

  // ARM emits resources as an array, and newer language versions may emit an object
  // keyed by symbolic name. Both shapes are handled.
  const entries = Array.isArray(resources) ? resources : Object.values(resources);
  const collected = [];

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const resource = /** @type {Record<string, any>} */ (entry);
    const type = typeof resource.type === 'string' ? resource.type : '';
    const name = typeof resource.name === 'string' ? resource.name : '';
    const kind = typeof resource.kind === 'string' ? resource.kind : undefined;

    collected.push({ type, name, kind, at: path });

    const nested = resource?.properties?.template;
    if (nested !== undefined) {
      collected.push(...collectResources(nested, `${path} > ${name || type}`));
    }
  }

  return collected;
}

/**
 * Collect output names from a template and every nested template.
 *
 * @param {unknown} template
 * @returns {string[]}
 */
export function collectOutputNames(template) {
  if (typeof template !== 'object' || template === null) {
    return [];
  }

  const node = /** @type {Record<string, any>} */ (template);
  const names = Object.keys(node.outputs ?? {});
  const resources = node.resources;
  const entries = Array.isArray(resources) ? resources : Object.values(resources ?? {});

  for (const entry of entries) {
    const nested = /** @type {Record<string, any>} */ (entry)?.properties?.template;
    if (nested !== undefined) {
      names.push(...collectOutputNames(nested));
    }
  }

  return names;
}

/**
 * Decide whether a resource name resolves to the approved Speech account.
 *
 * The compiled name is usually an ARM parameter expression rather than a literal,
 * so comparing strings would always fail. A parameterised name is approved only
 * when that parameter constrains its allowed values to exactly the approved name.
 * That is a stronger guarantee than a literal: the template cannot be deployed with
 * any other value, whatever the parameter file says.
 *
 * @param {unknown} template
 * @param {string | undefined} nameExpression
 * @returns {{ approved: boolean, detail: string }}
 */
export function resolveApprovedName(template, nameExpression) {
  if (nameExpression === undefined) {
    return { approved: false, detail: 'no name expression was found.' };
  }

  if (nameExpression === APPROVED_SPEECH.name) {
    return { approved: true, detail: 'name is the approved literal.' };
  }

  const parameterMatch = nameExpression.match(/^\[parameters\('([^']+)'\)\]$/);

  if (parameterMatch === null) {
    return {
      approved: false,
      detail: `name expression ${nameExpression} is neither the approved literal nor a single parameter reference.`,
    };
  }

  const parameterName = parameterMatch[1];
  const declared = /** @type {Record<string, any>} */ (template)?.parameters?.[parameterName];
  const allowed = declared?.allowedValues;

  if (!Array.isArray(allowed)) {
    return {
      approved: false,
      detail: `name comes from parameter ${parameterName}, which declares no allowed values, so any account name could be deployed.`,
    };
  }

  const approved = allowed.length === 1 && allowed[0] === APPROVED_SPEECH.name;

  return {
    approved,
    detail: approved
      ? `name comes from parameter ${parameterName}, constrained to exactly ${APPROVED_SPEECH.name}.`
      : `parameter ${parameterName} allows ${allowed.length} values (${allowed.join(', ')}), so a name other than ${APPROVED_SPEECH.name} could be deployed.`,
  };
}

/**
 * Apply every invariant to a parsed template.
 *
 * @param {unknown} template
 * @param {DeploymentReport} report
 */
export function verifyInvariants(template, report) {
  const resources = collectResources(template);
  const outputs = collectOutputNames(template);

  report.note(`walked ${resources.length} resource declarations including nested deployments`);

  const cognitiveAccounts = resources.filter(
    (resource) => resource.type.toLowerCase() === APPROVED_SPEECH.type.toLowerCase(),
  );

  report.record({
    name: 'exactly one cognitive services account',
    status: cognitiveAccounts.length === 1 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      cognitiveAccounts.length === 1
        ? 'one account is referenced, so no duplicate can be created'
        : `${cognitiveAccounts.length} accounts referenced: ${cognitiveAccounts
            .map((resource) => `${resource.name} at ${resource.at}`)
            .join(', ')}`,
  });

  const account = cognitiveAccounts[0];
  const approval = resolveApprovedName(template, account?.name);

  report.record({
    name: 'the account is the approved speech account',
    status:
      account !== undefined && approval.approved && account.kind === APPROVED_SPEECH.kind
        ? CHECK_STATUS.pass
        : CHECK_STATUS.fail,
    detail:
      account === undefined
        ? 'no cognitive services account was found to check'
        : `${approval.detail} Kind is ${String(account.kind)}, approved kind is ${APPROVED_SPEECH.kind}.`,
  });

  const forbiddenKinds = cognitiveAccounts.filter(
    (resource) =>
      resource.kind !== undefined &&
      FORBIDDEN_ACCOUNT_KINDS.includes(resource.kind.toLowerCase()),
  );

  report.record({
    name: 'no inference account kind',
    status: forbiddenKinds.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      forbiddenKinds.length === 0
        ? 'no account declares an OpenAI or AIServices kind, so the shared Foundry resource is reused rather than replaced'
        : `forbidden kinds declared: ${forbiddenKinds.map((entry) => String(entry.kind)).join(', ')}`,
  });

  const forbidden = resources.filter((resource) =>
    FORBIDDEN_RESOURCE_TYPES.some((prefix) =>
      resource.type.toLowerCase().startsWith(prefix.toLowerCase()),
    ),
  );

  report.record({
    name: 'no model deployment or machine learning resource',
    status: forbidden.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      forbidden.length === 0
        ? 'no model deployment, Foundry project or Machine Learning workspace is created'
        : `forbidden types declared: ${forbidden.map((entry) => `${entry.type} at ${entry.at}`).join(', ')}`,
  });

  const secretOutputs = outputs.filter((name) =>
    SECRET_OUTPUT_FRAGMENTS.some((fragment) => name.toLowerCase().includes(fragment)),
  );

  report.record({
    name: 'no secret in the output set',
    status: secretOutputs.length === 0 ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail:
      secretOutputs.length === 0
        ? `${outputs.length} outputs checked across all templates, none named as secret material`
        : `outputs that appear to carry secrets: ${secretOutputs.join(', ')}`,
  });
}

/**
 * Compile the template and verify the invariants against the emitted ARM JSON.
 */
export async function verifyTemplate() {
  const report = new DeploymentReport('Compiled template invariants');
  const templatePath = toRepoRelative(REPO_PATHS.bicepTemplate);
  const args = ['bicep', 'build', '--file', templatePath, '--stdout'];

  report.beginStage('compile and walk');

  const result = await runCommand(AZ_PROGRAM, args, {
    cwd: REPO_PATHS.root,
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (!succeeded(result)) {
    report.record({
      name: 'template compiles',
      status: CHECK_STATUS.fail,
      detail: result.launchFailed
        ? 'the azure cli is not callable, so the invariants cannot be verified against the compiled template'
        : `compilation failed: ${result.stderr.split('\n')[0] ?? 'no detail'}`,
      evidence: [formatCommand(AZ_PROGRAM, args)],
    });
    return { report };
  }

  let template;
  try {
    template = JSON.parse(result.stdout);
  } catch (error) {
    report.record({
      name: 'compiled template parses',
      status: CHECK_STATUS.fail,
      detail: `the compiler output is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return { report };
  }

  report.record({
    name: 'template compiles',
    status: CHECK_STATUS.pass,
    detail: 'compiled to stdout, leaving no artifact on disk',
    evidence: [formatCommand(AZ_PROGRAM, args)],
  });

  verifyInvariants(template, report);

  return { report };
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  const { report } = await verifyTemplate();
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
