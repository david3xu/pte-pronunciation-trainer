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

const SYNTHESIS_QUOTA_PARAMETERS = Object.freeze([
  'synthesisQuotaCalls',
  'synthesisQuotaWindowSeconds',
]);

// Azure Retail Prices API, product `Azure Speech`, meter
// `S1 Neural Text To Speech Characters`, australiaeast, effective 2024-02-01.
// There is no S0 meter for Azure Speech in any region, so an S0 account's
// standard neural synthesis bills against this S1 character meter.
const SPEECH_NEURAL_TTS_USD_PER_MILLION_CHARACTERS = 15;

// Mirrors PREMIUM_TTS_MAX_TEXT_LENGTH in api/handlers/premiumTts.ts, restated
// because Bicep cannot read it. If the handler's limit moves, the ceiling this
// quota guarantees moves with it and this test is where that surfaces.
const PREMIUM_TTS_MAX_TEXT_LENGTH = 3000;

// The ceiling the derivation comment in apim.bicep commits to, in USD per window.
// Asserted rather than recomputed loosely, so the comment and the parameter cannot
// drift apart silently.
const SYNTHESIS_QUOTA_STATED_CEILING_USD = 22.5;
const SECONDS_PER_DAY = 86400;

// Hard floor the quota-by-key policy reference places on renewal-period.
const QUOTA_MINIMUM_RENEWAL_SECONDS = 300;

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

describe('premium tts spend quota', () => {
  it('applies both a burst limit and a longer window quota to each synthesis operation', async () => {
    const apimBicep = await read(APIM_MODULE);
    const policy = capture(apimBicep, /var synthesisThrottlePolicyXml = '([^']+)'/);

    // Both controls, in the one inbound section, on the one document both
    // synthesis operations attach. The burst limit is asserted too because it had
    // no test before this one and nothing else pins its presence.
    expect(policy).toContain('<rate-limit-by-key');
    expect(policy).toContain('<quota-by-key');
    expect(policy).toMatch(/<inbound><base \/><rate-limit-by-key[^>]*\/><quota-by-key[^>]*\/><\/inbound>/);

    // Same caller-address counter as the burst limit, because the api is still not
    // subscription gated and there is no subscription key to count against.
    const quota = policy.match(/<quota-by-key[^>]*\/>/)?.[0];
    expect(quota).toContain('counter-key="@(context.Request.IpAddress)"');

    // Parameterised, not literal, matching the burst limit's shape.
    expect(quota).toContain('calls="${synthesisQuotaCalls}"');
    expect(quota).toContain('renewal-period="${synthesisQuotaWindowSeconds}"');

    // Both operation policies reuse the one document, so neither can drift.
    expect(apimBicep).toMatch(
      /resource premiumTtsGetPolicy[\s\S]*?value: synthesisThrottlePolicyXml/,
    );
    expect(apimBicep).toMatch(
      /resource premiumTtsPostPolicy[\s\S]*?value: synthesisThrottlePolicyXml/,
    );
  });

  it('declares every quota value as a bounded parameter', async () => {
    const apimBicep = await read(APIM_MODULE);

    for (const parameter of SYNTHESIS_QUOTA_PARAMETERS) {
      // Every quota value must carry a lower bound: a zero calls quota would
      // deploy and then refuse every request.
      expect(apimBicep).toMatch(
        new RegExp(`@minValue\\(\\d+\\)\\nparam ${parameter} int = \\d+`),
      );
    }

    // The policy reference sets a hard floor of 300 seconds on renewal-period, so
    // the parameter's own bound must not permit a window the platform rejects.
    expect(apimBicep).toMatch(
      /@minValue\((\d+)\)\nparam synthesisQuotaWindowSeconds int/,
    );
    const windowMinimum = Number(
      capture(apimBicep, /@minValue\((\d+)\)\nparam synthesisQuotaWindowSeconds int/),
    );
    expect(windowMinimum).toBeGreaterThanOrEqual(QUOTA_MINIMUM_RENEWAL_SECONDS);
  });

  it('sets no bandwidth attribute, because request density is an attacker input', async () => {
    const apimBicep = await read(APIM_MODULE);
    const policy = capture(apimBicep, /var synthesisThrottlePolicyXml = '([^']+)'/);

    // Measured against the live endpoint at the 3000 character maximum: prose
    // returns about 149 bytes per billed character, but one word padded with
    // whitespace returns 1.06. A kilobyte budget sized from prose admits about 135
    // USD a day of characters at padding density. Bandwidth cannot bound spend when
    // the caller picks the ratio, so its absence is the correctness property here,
    // not an omission.
    expect(policy).not.toContain('bandwidth=');
    expect(apimBicep).not.toContain('synthesisQuotaBandwidthKilobytes');
  });

  it('states a ceiling that matches calls times the worst case cost per call', async () => {
    const apimBicep = await read(APIM_MODULE);
    const quotaCalls = Number(
      capture(apimBicep, /param synthesisQuotaCalls int = (\d+)/),
    );
    const windowSeconds = Number(
      capture(apimBicep, /param synthesisQuotaWindowSeconds int = (\d+)/),
    );

    // The only provable bound available: every call may carry the maximum text
    // length, so the ceiling is calls times that worst case. Unlike an assertion
    // about measured density, this holds for any content the caller sends.
    const usdPerCharacter =
      SPEECH_NEURAL_TTS_USD_PER_MILLION_CHARACTERS / 1_000_000;
    const worstCaseUsdPerCall = PREMIUM_TTS_MAX_TEXT_LENGTH * usdPerCharacter;

    expect(windowSeconds).toBe(SECONDS_PER_DAY);
    expect(quotaCalls * worstCaseUsdPerCall).toBeCloseTo(
      SYNTHESIS_QUOTA_STATED_CEILING_USD,
      2,
    );

    // The comment must carry the same figure it commits to, so a parameter change
    // without a comment change fails here.
    expect(apimBicep).toContain(
      `${SYNTHESIS_QUOTA_STATED_CEILING_USD.toFixed(2)} USD a day`,
    );
  });

  it('leaves the preflight operation unthrottled and voices untouched', async () => {
    const apimBicep = await read(APIM_MODULE);

    // A preflight synthesises nothing, so throttling it would break the browser
    // handshake for a caller still inside budget. /api/voices is static and
    // non-billable, so it carries no quota either.
    expect(apimBicep).not.toMatch(/premiumTtsOptionsPolicy/);
    expect(apimBicep).not.toMatch(/voicesPolicy/);
  });

  it('keeps speech usage billed, because a quota caps a ceiling and not a floor', () => {
    // A quota bounds the worst case. It commits no monthly spend, so speech must
    // stay in the usage billed bucket rather than acquiring a fixed figure.
    expect(ESTIMATED_MONTHLY_USD.speech).toBeNull();
  });
});
