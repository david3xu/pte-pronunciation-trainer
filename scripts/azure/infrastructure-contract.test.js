/**
 * Regression tests for agreements that span files.
 *
 * Bicep cannot read azure.yaml, and neither can read the javascript deployment
 * contract, so several values are necessarily restated. Each of these tests pins
 * one of those restatements, because every one of them was an audit finding or is
 * a silent failure waiting to happen.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { APPLICATION_PACKAGE } from './deployment-contract.js';
import { REPO_PATHS } from './lib/paths.js';
import { API_ROUTES } from '../../server/routes.js';

const AZURE_YAML = join(REPO_PATHS.root, 'azure.yaml');
const APP_SERVICE_MODULE = join(REPO_PATHS.infraDirectory, 'app-service.bicep');
const APIM_MODULE = join(REPO_PATHS.infraDirectory, 'apim.bicep');

async function read(path) {
  return readFile(path, 'utf8');
}

/**
 * First capture group of a pattern, or undefined.
 */
function capture(source, pattern) {
  const match = source.match(pattern);
  return match?.[1];
}

describe('azd service discovery', () => {
  it('tags the site with the service name azure.yaml declares', async () => {
    const [azureYaml, mainBicep, appServiceBicep] = await Promise.all([
      read(AZURE_YAML),
      read(REPO_PATHS.bicepTemplate),
      read(APP_SERVICE_MODULE),
    ]);

    // The first key nested under `services` is the service azd deploys.
    const declaredService = capture(azureYaml, /\nservices:\s*\n\s{2}([A-Za-z0-9_-]+):/);
    const bicepDefault = capture(mainBicep, /param webAppAzdServiceName string = '([^']+)'/);

    expect(declaredService).toBeDefined();
    expect(bicepDefault).toBe(declaredService);

    // Without this tag azd provisions successfully and then reports no matching
    // service for the packaged application.
    expect(appServiceBicep).toContain("'azd-service-name': azdServiceName");
  });
});

describe('app service startup command', () => {
  it('matches the command the packaged manifest declares', async () => {
    const appServiceBicep = await read(APP_SERVICE_MODULE);
    const bicepDefault = capture(appServiceBicep, /param startupCommand string = '([^']+)'/);

    expect(bicepDefault).toBe(APPLICATION_PACKAGE.startCommand);
  });

  it('starts the entry point the package actually contains', () => {
    expect(APPLICATION_PACKAGE.startCommand).toContain(APPLICATION_PACKAGE.serverEntryPoint);
  });
});

describe('api management forwarding', () => {
  it('forwards a gateway voices request to the app service voices route', async () => {
    const apimBicep = await read(APIM_MODULE);

    const pathSegment = capture(apimBicep, /param apiPathSegment string = '([^']+)'/);
    const serviceUrlExpression = capture(apimBicep, /var backendServiceUrl = '([^']+)'/);
    const urlTemplate = capture(apimBicep, /urlTemplate: '([^']+)'/);

    expect(pathSegment).toBeDefined();
    expect(urlTemplate).toBe('/voices');

    // The service url must end in the same segment the gateway strips, or the
    // remainder is appended to the bare origin and the backend receives /voices.
    expect(serviceUrlExpression).toBe('${backendOrigin}/${apiPathSegment}');

    // Effective forwarded path: the gateway strips the api segment, matches the
    // operation template, and appends the remainder to the service url.
    const forwardedPath = `/${pathSegment}${urlTemplate}`;

    expect(forwardedPath).toBe('/api/voices');
    expect(Object.keys(API_ROUTES)).toContain(forwardedPath);
  });

  it('declares an operation for the vertical slice route', async () => {
    const apimBicep = await read(APIM_MODULE);

    expect(apimBicep).toContain('service/apis/operations@');
    expect(apimBicep).toMatch(/method: 'GET'/);
  });
});
