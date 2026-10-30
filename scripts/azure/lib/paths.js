/**
 * Repository path resolution for the Azure deployment automation.
 *
 * Every Azure script resolves filesystem locations through this module so that
 * no path literal is repeated across the hook implementations.
 */

import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

/** Absolute repository root, resolved from this file rather than the cwd. */
export const REPO_ROOT = resolve(currentDirectory, '..', '..', '..');

const INFRA_DIRECTORY_SEGMENTS = ['infra', 'azure'];
const AZURE_STATE_DIRECTORY_SEGMENT = '.azure';

export const REPO_PATHS = Object.freeze({
  root: REPO_ROOT,
  packageManifest: join(REPO_ROOT, 'package.json'),
  infraDirectory: join(REPO_ROOT, ...INFRA_DIRECTORY_SEGMENTS),
  bicepTemplate: join(REPO_ROOT, ...INFRA_DIRECTORY_SEGMENTS, 'main.bicep'),
  bicepParameters: join(REPO_ROOT, ...INFRA_DIRECTORY_SEGMENTS, 'main.bicepparam'),
  compiledTemplate: join(REPO_ROOT, ...INFRA_DIRECTORY_SEGMENTS, 'main.json'),
  azureStateDirectory: join(REPO_ROOT, AZURE_STATE_DIRECTORY_SEGMENT),
  deploymentPlan: join(REPO_ROOT, AZURE_STATE_DIRECTORY_SEGMENT, 'deployment-plan.md'),
  evidenceDirectory: join(REPO_ROOT, AZURE_STATE_DIRECTORY_SEGMENT, 'evidence'),
  distDirectory: join(REPO_ROOT, 'dist'),
  processedDataDirectory: join(REPO_ROOT, 'data', 'processed'),
});

/**
 * Render an absolute repository path as a repository relative path so console
 * output and generated evidence never leak an operator home directory.
 *
 * @param {string} absolutePath
 * @returns {string}
 */
export function toRepoRelative(absolutePath) {
  const relativePath = relative(REPO_ROOT, absolutePath);
  return relativePath === '' ? '.' : relativePath;
}
