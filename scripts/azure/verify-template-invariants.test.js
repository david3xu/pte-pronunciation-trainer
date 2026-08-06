/**
 * Tests for the compiled template invariant analyser.
 *
 * Fixtures rather than a live compile, so the invariants are covered even where the
 * Azure CLI is unavailable. Each fixture is a mistake that would cost money or leak
 * credentials and would not be obvious in a diff.
 */

import { describe, expect, it } from 'vitest';

import {
  APPROVED_MANAGED_REDIS,
  APPROVED_SPEECH,
  FORBIDDEN_CLASSIC_REDIS_TYPE,
  collectOutputNames,
  collectResources,
  resolveApprovedName,
  verifyInvariants,
} from './verify-template-invariants.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';

function silentReport() {
  return new DeploymentReport('test', { writer: () => undefined });
}

function statusOf(report, name) {
  return report.findings.find((finding) => finding.name === name)?.status;
}

function managedRedisModule() {
  return {
    type: 'Microsoft.Resources/deployments',
    name: 'redis-module',
    properties: {
      parameters: {
        location: { value: "[parameters('redisLocation')]" },
      },
      template: {
        parameters: {
          cacheName: { type: 'string' },
          skuName: { type: 'string', allowedValues: [APPROVED_MANAGED_REDIS.skuName] },
          databaseName: {
            type: 'string',
            allowedValues: [APPROVED_MANAGED_REDIS.databaseName],
          },
          port: {
            type: 'int',
            minValue: APPROVED_MANAGED_REDIS.port,
            maxValue: APPROVED_MANAGED_REDIS.port,
          },
        },
        resources: [
          {
            type: APPROVED_MANAGED_REDIS.clusterType,
            name: "[parameters('cacheName')]",
            sku: { name: "[parameters('skuName')]" },
            properties: {
              minimumTlsVersion: APPROVED_MANAGED_REDIS.minimumTlsVersion,
              publicNetworkAccess: APPROVED_MANAGED_REDIS.publicNetworkAccess,
            },
          },
          {
            type: APPROVED_MANAGED_REDIS.databaseType,
            name: "[format('{0}/{1}', parameters('cacheName'), parameters('databaseName'))]",
            properties: {
              accessKeysAuthentication: APPROVED_MANAGED_REDIS.accessKeysAuthentication,
              clientProtocol: APPROVED_MANAGED_REDIS.clientProtocol,
              clusteringPolicy: APPROVED_MANAGED_REDIS.clusteringPolicy,
              evictionPolicy: APPROVED_MANAGED_REDIS.evictionPolicy,
              port: "[parameters('port')]",
            },
            dependsOn: [
              "[resourceId('Microsoft.Cache/redisEnterprise', parameters('cacheName'))]",
            ],
          },
        ],
      },
    },
  };
}

/** A template shaped like the real compiled output: parameterised name, nested module. */
function approvedTemplate(overrides = {}) {
  return {
    parameters: {
      speechAccountName: { type: 'string', allowedValues: [APPROVED_SPEECH.name] },
      redisLocation: { type: 'string', allowedValues: [APPROVED_MANAGED_REDIS.location] },
    },
    outputs: { SPEECH_ENDPOINT: { type: 'string' } },
    resources: [
      {
        type: 'Microsoft.Resources/deployments',
        name: 'speech-module',
        properties: {
          template: {
            outputs: { speechAccountName: { type: 'string' } },
            resources: [
              {
                type: APPROVED_SPEECH.type,
                name: "[parameters('speechAccountName')]",
                kind: APPROVED_SPEECH.kind,
              },
            ],
          },
        },
      },
      managedRedisModule(),
    ],
    ...overrides,
  };
}

describe('collectResources', () => {
  it('descends into nested deployment templates', () => {
    const resources = collectResources(approvedTemplate());

    expect(resources).toHaveLength(5);
    expect(resources.map((entry) => entry.type)).toContain(APPROVED_SPEECH.type);
    expect(resources.map((entry) => entry.type)).toContain(APPROVED_MANAGED_REDIS.databaseType);
  });

  it('handles the symbolic object form as well as the array form', () => {
    const resources = collectResources({
      resources: { speech: { type: APPROVED_SPEECH.type, name: 'a', kind: 'SpeechServices' } },
    });

    expect(resources).toHaveLength(1);
  });

  it('returns nothing for a template with no resources', () => {
    expect(collectResources({})).toEqual([]);
    expect(collectResources(null)).toEqual([]);
  });
});

describe('collectOutputNames', () => {
  it('collects outputs from nested templates too', () => {
    expect(collectOutputNames(approvedTemplate())).toEqual([
      'SPEECH_ENDPOINT',
      'speechAccountName',
    ]);
  });
});

describe('resolveApprovedName', () => {
  it('approves a parameter constrained to exactly the approved name', () => {
    const outcome = resolveApprovedName(approvedTemplate(), "[parameters('speechAccountName')]");

    expect(outcome.approved).toBe(true);
  });

  it('refuses a parameter with no allowed values, because any name could be deployed', () => {
    const template = approvedTemplate({
      parameters: { speechAccountName: { type: 'string' } },
    });

    expect(resolveApprovedName(template, "[parameters('speechAccountName')]").approved).toBe(false);
  });

  it('refuses a parameter that allows more than the approved name', () => {
    const template = approvedTemplate({
      parameters: {
        speechAccountName: { type: 'string', allowedValues: [APPROVED_SPEECH.name, 'other'] },
      },
    });

    expect(resolveApprovedName(template, "[parameters('speechAccountName')]").approved).toBe(false);
  });

  it('approves the literal approved name', () => {
    expect(resolveApprovedName({}, APPROVED_SPEECH.name).approved).toBe(true);
  });

  it('refuses a generated name expression', () => {
    expect(resolveApprovedName({}, "[format('speech-{0}', 'x')]").approved).toBe(false);
  });
});

describe('verifyInvariants', () => {
  it('passes the approved template', () => {
    const report = silentReport();
    verifyInvariants(approvedTemplate(), report);

    expect(report.blocked).toBe(false);
  });

  it('refuses a second cognitive services account', () => {
    const template = approvedTemplate();
    template.resources.push({
      type: APPROVED_SPEECH.type,
      name: 'a-second-speech-account',
      kind: 'SpeechServices',
    });

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'exactly one cognitive services account')).toBe(CHECK_STATUS.fail);
  });

  it('refuses Classic Redis even when the approved Managed Redis pair exists', () => {
    const template = approvedTemplate();
    template.resources.push({
      type: FORBIDDEN_CLASSIC_REDIS_TYPE,
      name: 'classic-cache',
    });

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'no classic azure cache for redis')).toBe(CHECK_STATUS.fail);
  });

  it('refuses a missing Managed Redis database child', () => {
    const template = approvedTemplate();
    template.resources[1].properties.template.resources.pop();

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'approved managed redis cluster and database')).toBe(
      CHECK_STATUS.fail,
    );
  });

  it('refuses a Managed Redis tier other than the approved tier', () => {
    const template = approvedTemplate();
    template.resources[1].properties.template.parameters.skuName.allowedValues = [
      'MemoryOptimized_M10',
    ];

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'approved managed redis cluster and database')).toBe(
      CHECK_STATUS.fail,
    );
  });

  it('refuses weaker Managed Redis database security settings', () => {
    const template = approvedTemplate();
    template.resources[1].properties.template.resources[1].properties.clientProtocol =
      'Plaintext';

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'approved managed redis cluster and database')).toBe(
      CHECK_STATUS.fail,
    );
  });

  it('refuses an openai account kind', () => {
    const template = approvedTemplate();
    template.resources[0].properties.template.resources[0].kind = 'OpenAI';

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'no inference account kind')).toBe(CHECK_STATUS.fail);
  });

  it('refuses a model deployment declared inside a nested module', () => {
    const template = approvedTemplate();
    template.resources[0].properties.template.resources.push({
      type: 'Microsoft.CognitiveServices/accounts/deployments',
      name: 'gpt-deployment',
    });

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'no model deployment or machine learning resource')).toBe(
      CHECK_STATUS.fail,
    );
  });

  it('refuses a machine learning workspace', () => {
    const template = approvedTemplate();
    template.resources.push({
      type: 'Microsoft.MachineLearningServices/workspaces',
      name: 'foundry-hub',
    });

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'no model deployment or machine learning resource')).toBe(
      CHECK_STATUS.fail,
    );
  });

  it('refuses a secret output at the top level', () => {
    const template = approvedTemplate({
      outputs: { APP_INSIGHTS_CONNECTIONSTRING: { type: 'string' } },
    });

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'no secret in the output set')).toBe(CHECK_STATUS.fail);
  });

  it('refuses a secret output hidden in a nested module', () => {
    const template = approvedTemplate();
    template.resources[0].properties.template.outputs.primaryKey = { type: 'string' };

    const report = silentReport();
    verifyInvariants(template, report);

    expect(statusOf(report, 'no secret in the output set')).toBe(CHECK_STATUS.fail);
  });
});
