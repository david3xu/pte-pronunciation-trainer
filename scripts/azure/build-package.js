/**
 * Assemble the App Service deployment package.
 *
 * Runs as the azd prepackage hook. Everything App Service needs is copied into a
 * staging directory declared by the deployment contract, and a production only
 * manifest is derived from the repository manifest so the deployed artifact
 * carries no development dependency and no build tooling.
 *
 * A missing required input fails the step with the command that produces it.
 * Deploying a package that is quietly incomplete is worse than not deploying,
 * because App Service starts, answers the health probe and serves nothing.
 */

import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { REPO_PATHS, toRepoRelative } from './lib/paths.js';
import { APPLICATION_PACKAGE, EXIT_CODES } from './deployment-contract.js';

const CHECK_FLAG = '--check';
const REPORT_TITLE = 'Application package assembly';
const MANIFEST_FILE_NAME = 'package.json';
const MANIFEST_INDENT = 2;

const STAGE_LABELS = Object.freeze({
  inputs: 'required inputs',
  staging: 'staging directory',
  manifest: 'production manifest',
});

/** Absolute path of the staging directory. */
export const STAGING_DIRECTORY = join(
  REPO_PATHS.azureStateDirectory,
  APPLICATION_PACKAGE.stagingDirectoryName,
);

/**
 * @param {string} absolutePath
 * @returns {Promise<boolean>}
 */
async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Derive the manifest that ships with the package. Runtime dependencies are
 * carried across verbatim rather than restated, so a dependency added to the
 * application cannot be forgotten here.
 *
 * @param {Record<string, unknown>} repositoryManifest
 * @returns {Record<string, unknown>}
 */
export function deriveProductionManifest(repositoryManifest) {
  return {
    name: repositoryManifest.name,
    version: repositoryManifest.version,
    description: repositoryManifest.description,
    private: true,
    type: repositoryManifest.type,
    main: APPLICATION_PACKAGE.serverEntryPoint,
    engines: repositoryManifest.engines,
    scripts: {
      start: APPLICATION_PACKAGE.startCommand,
      [APPLICATION_PACKAGE.startScriptName]: APPLICATION_PACKAGE.startCommand,
    },
    dependencies: repositoryManifest.dependencies ?? {},
  };
}

/**
 * Assemble the package.
 *
 * @param {{ dryRun?: boolean, report?: DeploymentReport }} [options]
 * @returns {Promise<{ report: DeploymentReport, stagingDirectory: string }>}
 */
export async function buildPackage(options = {}) {
  const dryRun = options.dryRun ?? false;
  const report = options.report ?? new DeploymentReport(REPORT_TITLE);

  report.beginStage(STAGE_LABELS.inputs);

  /** @type {Array<{ entry: typeof APPLICATION_PACKAGE.contents[number], absoluteSource: string }>} */
  const present = [];

  for (const entry of APPLICATION_PACKAGE.contents) {
    const absoluteSource = join(REPO_PATHS.root, entry.source);
    const found = await exists(absoluteSource);

    if (found) {
      present.push({ entry, absoluteSource });
    }

    report.record({
      name: entry.id,
      status: found ? CHECK_STATUS.pass : entry.required ? CHECK_STATUS.fail : CHECK_STATUS.warn,
      detail: found
        ? `${entry.source} is present and will be packaged as ${entry.target}`
        : `${entry.source} is absent. Produce it with ${entry.producedBy} before packaging.`,
    });
  }

  if (report.blocked) {
    report.beginStage(STAGE_LABELS.staging);
    report.record({
      name: 'staging skipped',
      status: CHECK_STATUS.skip,
      detail: 'a required input is missing, so no package is assembled',
    });
    return { report, stagingDirectory: STAGING_DIRECTORY };
  }

  report.beginStage(STAGE_LABELS.staging);

  if (dryRun) {
    report.record({
      name: 'staging directory',
      status: CHECK_STATUS.skip,
      detail: `check mode. A live run would rebuild ${toRepoRelative(STAGING_DIRECTORY)} from ${present.length} inputs.`,
    });
    return { report, stagingDirectory: STAGING_DIRECTORY };
  }

  await rm(STAGING_DIRECTORY, { recursive: true, force: true });
  await mkdir(STAGING_DIRECTORY, { recursive: true });

  report.record({
    name: 'staging directory',
    status: CHECK_STATUS.pass,
    detail: `rebuilt ${toRepoRelative(STAGING_DIRECTORY)} so a stale artifact cannot be redeployed`,
  });

  for (const { entry, absoluteSource } of present) {
    const absoluteTarget = join(STAGING_DIRECTORY, entry.target);
    await cp(absoluteSource, absoluteTarget, { recursive: true });
    report.record({
      name: `copied ${entry.id}`,
      status: CHECK_STATUS.pass,
      detail: `${entry.source} to ${entry.target}`,
    });
  }

  report.beginStage(STAGE_LABELS.manifest);

  const repositoryManifest = JSON.parse(await readFile(REPO_PATHS.packageManifest, 'utf8'));
  const productionManifest = deriveProductionManifest(repositoryManifest);

  await writeFile(
    join(STAGING_DIRECTORY, MANIFEST_FILE_NAME),
    `${JSON.stringify(productionManifest, null, MANIFEST_INDENT)}\n`,
    'utf8',
  );

  const dependencyCount = Object.keys(
    /** @type {Record<string, string>} */ (productionManifest.dependencies),
  ).length;

  report.record({
    name: 'production manifest',
    status: CHECK_STATUS.pass,
    detail: `written with ${dependencyCount} runtime dependencies, no development dependency and start command ${APPLICATION_PACKAGE.startCommand}`,
  });

  return { report, stagingDirectory: STAGING_DIRECTORY };
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(baseName(process.argv[1]))) {
  const { report } = await buildPackage({ dryRun: process.argv.includes(CHECK_FLAG) });
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
