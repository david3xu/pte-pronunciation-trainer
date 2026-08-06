/**
 * Production server configuration.
 *
 * Read once at startup so a missing value fails immediately with a message naming
 * the variable, rather than surfacing as a confusing request failure later.
 *
 * Nothing here is logged. Several of these values are hosts and account names that
 * are harmless individually, but the habit of printing whatever configuration was
 * read is how connection strings end up in log aggregation.
 */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Environment variable names the server reads. */
export const ENV_KEYS = {
  port: 'PORT',
  nodeEnv: 'NODE_ENV',
  distDirectory: 'DIST_DIRECTORY',
  processedDataDirectory: 'PROCESSED_DATA_DIRECTORY',
} as const;

/**
 * App Service supplies the listening port. The fallback exists only for local
 * runs and is deliberately not a port the Vite dev server or preview uses, so a
 * local production check cannot silently talk to the dev server instead.
 */
export const DEFAULT_PORT = 8080;

/** Directory names inside the deployed package. */
const PACKAGE_LAYOUT = {
  clientAssets: 'dist',
  processedData: join('data', 'processed'),
} as const;

export interface ServerConfig {
  readonly port: number;
  readonly isProduction: boolean;
  /** Absolute path to the built client assets. */
  readonly distDirectory: string;
  /** Absolute path to the generated practice content. */
  readonly processedDataDirectory: string;
}

/**
 * Resolve the package root from this module rather than the working directory.
 *
 * App Service does not guarantee the working directory, and a relative path that
 * happens to work locally is the classic reason a deployment serves nothing.
 * Compiled layout is <root>/server/serverConfig.js, so the root is one level up.
 */
export function resolvePackageRoot(moduleUrl: string): string {
  return resolve(dirname(fileURLToPath(moduleUrl)), '..');
}

/**
 * Build the configuration from an environment.
 *
 * @param environment Defaults to the process environment.
 * @param packageRoot Defaults to the root resolved from this module.
 */
export function loadServerConfig(
  environment: NodeJS.ProcessEnv = process.env,
  packageRoot: string = resolvePackageRoot(import.meta.url),
): ServerConfig {
  const rawPort = environment[ENV_KEYS.port];
  const parsedPort = rawPort === undefined ? DEFAULT_PORT : Number.parseInt(rawPort, 10);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(
      `${ENV_KEYS.port} must be an integer between 1 and 65535 when set. Received: ${String(rawPort)}`,
    );
  }

  return {
    port: parsedPort,
    isProduction: environment[ENV_KEYS.nodeEnv] === 'production',
    distDirectory:
      environment[ENV_KEYS.distDirectory] ?? join(packageRoot, PACKAGE_LAYOUT.clientAssets),
    processedDataDirectory:
      environment[ENV_KEYS.processedDataDirectory] ??
      join(packageRoot, PACKAGE_LAYOUT.processedData),
  };
}
