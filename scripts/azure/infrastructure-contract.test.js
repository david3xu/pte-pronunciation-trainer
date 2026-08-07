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

import {
  APPLICATION_PACKAGE,
  DEPLOYMENT_OUTPUTS,
  ESTIMATED_MONTHLY_USD,
  REQUIRED_BICEP_PARAMETERS,
  RESOURCE_PLAN,
} from './deployment-contract.js';
import { REPO_PATHS } from './lib/paths.js';
import { API_ROUTES } from '../../server/routes.js';

const AZURE_YAML = join(REPO_PATHS.root, 'azure.yaml');
const APP_SERVICE_MODULE = join(REPO_PATHS.infraDirectory, 'app-service.bicep');
const APIM_MODULE = join(REPO_PATHS.infraDirectory, 'apim.bicep');
const REDIS_MODULE = join(REPO_PATHS.infraDirectory, 'redis.bicep');
const POSTGRES_MODULE = join(REPO_PATHS.infraDirectory, 'postgres.bicep');
const MONITOR_VM_MODULE = join(REPO_PATHS.infraDirectory, 'monitor-vm.bicep');

const MONITOR_VM_RESOURCE_ID = 'monitorVm';
const BASTION_RESOURCE_ID = 'bastion';
const MONITOR_VM_SSH_KEY_PARAMETER = 'monitorVmAdminSshPublicKey';

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

describe('monitor vm and bastion registration', () => {
  it('registers both resources against the arm types the module actually declares', async () => {
    const monitorVmBicep = await read(MONITOR_VM_MODULE);

    const vm = RESOURCE_PLAN.find((entry) => entry.id === MONITOR_VM_RESOURCE_ID);
    const bastion = RESOURCE_PLAN.find((entry) => entry.id === BASTION_RESOURCE_ID);

    expect(vm).toBeDefined();
    expect(bastion).toBeDefined();

    // A registration naming a type the module does not create probes the wrong
    // surface and passes while the real resource goes unchecked.
    expect(monitorVmBicep).toContain(`${String(vm?.resourceType)}@`);
    expect(monitorVmBicep).toContain(`${String(bastion?.resourceType)}@`);
  });

  it('names a size parameter that main.bicep declares', async () => {
    const mainBicep = await read(REPO_PATHS.bicepTemplate);
    const vm = RESOURCE_PLAN.find((entry) => entry.id === MONITOR_VM_RESOURCE_ID);

    expect(vm?.skuParameterNames).toHaveLength(1);

    for (const name of vm?.skuParameterNames ?? []) {
      expect(mainBicep).toMatch(new RegExp(`param ${name}\\s`));
    }
  });

  it('registers no sku parameter for bastion, because the module fixes the sku', async () => {
    const monitorVmBicep = await read(MONITOR_VM_MODULE);
    const bastion = RESOURCE_PLAN.find((entry) => entry.id === BASTION_RESOURCE_ID);

    // The empty list is only correct while the sku stays hardcoded. If it is ever
    // parameterised, this fails and the registration has to name the parameter.
    expect(bastion?.skuParameterNames).toEqual([]);
    expect(monitorVmBicep).toMatch(/name: 'Basic'/);
  });

  it('requires the ssh key parameter, which main.bicep deliberately leaves without a default', async () => {
    const mainBicep = await read(REPO_PATHS.bicepTemplate);

    expect(REQUIRED_BICEP_PARAMETERS).toContain(MONITOR_VM_SSH_KEY_PARAMETER);

    // Declared with no assignment. A default here would hand out a machine
    // authorised for a key the operator never chose, so the preflight check is the
    // only thing standing between a blank value and a live provision.
    expect(mainBicep).toMatch(new RegExp(`param ${MONITOR_VM_SSH_KEY_PARAMETER} string\\s*\\n`));
    expect(mainBicep).not.toMatch(new RegExp(`param ${MONITOR_VM_SSH_KEY_PARAMETER} string =`));
  });

  it('prices both resources, so neither is reported as carrying no fixed cost', () => {
    // An unpriced id falls into the usage billed bucket of the confirmation gate.
    // A Bastion host and a running vm are hourly fixed charges, so landing there
    // would understate the monthly total the operator is agreeing to.
    expect(ESTIMATED_MONTHLY_USD[MONITOR_VM_RESOURCE_ID]).toBeGreaterThan(0);
    expect(ESTIMATED_MONTHLY_USD[BASTION_RESOURCE_ID]).toBeGreaterThan(0);
  });
});

describe('managed redis recovery contract', () => {
  it('pins the approved cluster, database, region and cost across the deployment surfaces', async () => {
    const [mainBicep, parameters, redisBicep, appServiceBicep] = await Promise.all([
      read(REPO_PATHS.bicepTemplate),
      read(REPO_PATHS.bicepParameters),
      read(REDIS_MODULE),
      read(APP_SERVICE_MODULE),
    ]);
    const redisPlan = RESOURCE_PLAN.find((resource) => resource.id === 'redis');

    expect(redisPlan?.resourceType).toBe('Microsoft.Cache/redisEnterprise');
    expect(redisPlan?.locationParameterName).toBe('redisLocation');
    expect(ESTIMATED_MONTHLY_USD.redis).toBe(59);

    expect(parameters).toContain("param redisLocation = 'australiacentral'");
    expect(parameters).toContain("param redisSkuName = 'Balanced_B3'");
    expect(parameters).toContain("param redisDatabaseName = 'default'");
    expect(parameters).toContain('param redisPort = 10000');

    expect(redisBicep).toContain("resource cache 'Microsoft.Cache/redisEnterprise@");
    expect(redisBicep).toContain(
      "resource database 'Microsoft.Cache/redisEnterprise/databases@",
    );
    expect(redisBicep).not.toMatch(/Microsoft\.Cache\/redis@/);
    expect(mainBicep).toContain(
      "redisHostName: '${redisCacheName}.${redisLocation}.redis.azure.net'",
    );
    expect(mainBicep).toContain('redisPort: redisPort');
    expect(appServiceBicep).toContain("name: 'REDIS_PORT'");
  });

  it('requires every non-secret Managed Redis connection coordinate as an output', () => {
    const outputKeys = DEPLOYMENT_OUTPUTS.map((output) => output.key);

    expect(outputKeys).toEqual(
      expect.arrayContaining([
        'REDIS_CACHE_NAME',
        'REDIS_HOST_NAME',
        'REDIS_PORT',
        'REDIS_DATABASE_NAME',
      ]),
    );
  });
});

describe('postgres administrator recovery contract', () => {
  it('leaves administrator creation to postprovision and requires the server name output', async () => {
    const postgresBicep = await read(POSTGRES_MODULE);
    const outputKeys = DEPLOYMENT_OUTPUTS.map((output) => output.key);

    expect(postgresBicep).not.toContain('flexibleServers/administrators');
    expect(outputKeys).toContain('POSTGRES_SERVER_NAME');
  });
});
