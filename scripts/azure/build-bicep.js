/**
 * Compile the Bicep template and report diagnostics.
 *
 * Uses --stdout deliberately. The default behaviour of az bicep build is to write
 * a compiled template next to the source, which would recreate the stale
 * infra/azure/main.json that was removed precisely because a compiled artifact
 * drifts from its source and must never be deployed.
 *
 * This creates and modifies no Azure resource. It is a local compiler invocation.
 */

import { formatCommand, runCommand, succeeded } from './lib/exec.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { REPO_PATHS, toRepoRelative } from './lib/paths.js';
import { EXIT_CODES, TIMEOUTS_MS } from './deployment-contract.js';

const AZ_PROGRAM = process.platform === 'win32' ? 'az.cmd' : 'az';
const WARNING_MARKER = ': Warning ';
const ERROR_MARKER = ': Error ';

/**
 * Split compiler output into errors and warnings.
 *
 * @param {string} output
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function classifyDiagnostics(output) {
  const errors = [];
  const warnings = [];

  for (const line of output.split('\n')) {
    if (line.includes(ERROR_MARKER)) {
      errors.push(line.trim());
    } else if (line.includes(WARNING_MARKER)) {
      warnings.push(line.trim());
    }
  }

  return { errors, warnings };
}

export async function buildBicep() {
  const report = new DeploymentReport('Bicep compilation');
  const templatePath = toRepoRelative(REPO_PATHS.bicepTemplate);
  const args = ['bicep', 'build', '--file', templatePath, '--stdout'];

  report.beginStage('compile');
  report.note(`compiling ${templatePath} to stdout, leaving no compiled artifact on disk`);

  const result = await runCommand(AZ_PROGRAM, args, {
    cwd: REPO_PATHS.root,
    timeoutMs: TIMEOUTS_MS.capacityProbe,
  });

  if (result.launchFailed) {
    report.record({
      name: 'azure cli present',
      status: CHECK_STATUS.fail,
      detail: 'the azure cli is not callable, so the template cannot be compiled here',
      evidence: [formatCommand(AZ_PROGRAM, args)],
    });
    return { report };
  }

  const { errors, warnings } = classifyDiagnostics(`${result.stdout}\n${result.stderr}`);

  report.record({
    name: 'template compiles',
    status: succeeded(result) ? CHECK_STATUS.pass : CHECK_STATUS.fail,
    detail: succeeded(result)
      ? `compiled with ${errors.length} errors and ${warnings.length} warnings`
      : `compilation failed with ${errors.length} reported errors`,
    evidence: [formatCommand(AZ_PROGRAM, args)],
  });

  for (const diagnostic of errors) {
    report.note(`error: ${diagnostic}`);
  }
  for (const diagnostic of warnings) {
    report.note(`warning: ${diagnostic}`);
  }

  if (warnings.length > 0) {
    report.record({
      name: 'no unresolved warnings',
      status: CHECK_STATUS.warn,
      detail: `${warnings.length} compiler warning or warnings need a decision before deployment`,
    });
  }

  return { report };
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  const { report } = await buildBicep();
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
