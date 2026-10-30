/**
 * Tests for the Redis what if change set assertion.
 *
 * The probe exists to produce evidence, so it has to refuse a change set that does not
 * support the claim. These cases are the ways a run could look like success while
 * actually predicting something unwanted.
 */

import { describe, expect, it } from 'vitest';

import {
  ALLOWED_CREATE_TYPES,
  REQUIRED_CREATE_TYPES,
  assessChangeSet,
} from './validate-redis.js';

const REQUESTED = Object.freeze({
  subscriptionId: '00000000-0000-0000-0000-000000000000',
  resourceGroup: 'ccl-pronunciation-trainer-rg',
  cacheName: 'ccl-managed-redis-whatif-probe',
  location: 'australiacentral',
  skuName: 'Balanced_B3',
  databaseName: 'default',
  port: 10000,
  minimumTlsVersion: '1.2',
  publicNetworkAccess: 'Enabled',
  accessKeysAuthentication: 'Disabled',
  clientProtocol: 'Encrypted',
  clusteringPolicy: 'OSSCluster',
  evictionPolicy: 'AllKeysLRU',
});

function clusterCreate(overrides = {}) {
  return {
    changeType: 'Create',
    before: null,
    after: {
      type: 'Microsoft.Cache/redisEnterprise',
      name: REQUESTED.cacheName,
      location: REQUESTED.location,
      sku: { name: REQUESTED.skuName },
      properties: {
        minimumTlsVersion: REQUESTED.minimumTlsVersion,
        publicNetworkAccess: REQUESTED.publicNetworkAccess,
      },
      ...overrides,
    },
  };
}

function databaseCreate(overrides = {}) {
  return {
    changeType: 'Create',
    before: null,
    after: {
      type: 'Microsoft.Cache/redisEnterprise/databases',
      id: `/subscriptions/${REQUESTED.subscriptionId}/resourceGroups/${REQUESTED.resourceGroup}/providers/Microsoft.Cache/redisEnterprise/${REQUESTED.cacheName}/databases/${REQUESTED.databaseName}`,
      name: REQUESTED.databaseName,
      properties: {
        accessKeysAuthentication: REQUESTED.accessKeysAuthentication,
        clientProtocol: REQUESTED.clientProtocol,
        clusteringPolicy: REQUESTED.clusteringPolicy,
        evictionPolicy: REQUESTED.evictionPolicy,
        port: REQUESTED.port,
      },
      ...overrides,
    },
  };
}

function diagnosticCreate() {
  return {
    changeType: 'Create',
    before: null,
    after: { type: 'Microsoft.Insights/diagnosticSettings' },
  };
}

/** The existing Speech account, which ARM reports because it is not template managed. */
function speechIgnored(changeType = 'Ignore') {
  const state = {
    type: 'Microsoft.CognitiveServices/accounts',
    kind: 'SpeechServices',
    sku: { name: 'F0' },
  };
  return { changeType, before: state, after: state };
}

describe('accepted change sets', () => {
  it('accepts the cluster, database, diagnostic setting and an ignored unrelated resource', () => {
    const assessment = assessChangeSet(
      [clusterCreate(), databaseCreate(), diagnosticCreate(), speechIgnored()],
      REQUESTED,
    );

    expect(assessment.ok).toBe(true);
    expect(assessment.created).toEqual(ALLOWED_CREATE_TYPES);
    expect(assessment.unchanged).toHaveLength(1);
  });

  it('treats NoChange on an unrelated resource as no alteration', () => {
    expect(
      assessChangeSet([clusterCreate(), databaseCreate(), speechIgnored('NoChange')], REQUESTED)
        .ok,
    ).toBe(true);
  });

  it('normalises ARM resource type casing', () => {
    const cluster = clusterCreate();
    cluster.after.type = 'microsoft.cache/redisenterprise';

    expect(assessChangeSet([cluster, databaseCreate()], REQUESTED).ok).toBe(true);
  });
});

describe('refused change sets', () => {
  it('refuses a Modify on an unrelated resource', () => {
    const assessment = assessChangeSet(
      [clusterCreate(), databaseCreate(), speechIgnored('Modify')],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('Modify');
  });

  it('refuses a Delete on an unrelated resource', () => {
    const assessment = assessChangeSet(
      [clusterCreate(), databaseCreate(), speechIgnored('Delete')],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('Delete');
  });

  it('refuses a Create of any other resource type', () => {
    const assessment = assessChangeSet(
      [
        clusterCreate(),
        databaseCreate(),
        { changeType: 'Create', after: { type: 'Microsoft.Web/serverfarms' } },
      ],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('unexpected Create');
  });

  it.each(REQUIRED_CREATE_TYPES)('refuses a change set missing %s', (missingType) => {
    const changes = [clusterCreate(), databaseCreate()].filter(
      (entry) => entry.after.type !== missingType,
    );
    const assessment = assessChangeSet(changes, REQUESTED);

    expect(assessment.ok).toBe(false);
    expect(assessment.violations.join(' ')).toContain(missingType);
  });

  it('refuses a duplicate cluster prediction', () => {
    const assessment = assessChangeSet(
      [clusterCreate(), clusterCreate(), databaseCreate()],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations.join(' ')).toContain('exactly once');
  });

  it.each([
    ['sku', clusterCreate({ sku: { name: 'MemoryOptimized_M10' } }), 'MemoryOptimized_M10'],
    ['region', clusterCreate({ location: 'australiaeast' }), 'australiaeast'],
    [
      'tls',
      clusterCreate({
        properties: { minimumTlsVersion: '1.0', publicNetworkAccess: 'Enabled' },
      }),
      '1.0',
    ],
    [
      'public network',
      clusterCreate({
        properties: { minimumTlsVersion: '1.2', publicNetworkAccess: 'Disabled' },
      }),
      'Disabled',
    ],
  ])('refuses a differing cluster %s', (_label, cluster, expectedDetail) => {
    const assessment = assessChangeSet(
      [cluster, databaseCreate()],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations.join(' ')).toContain(expectedDetail);
  });

  it.each([
    [
      'access key authentication',
      { accessKeysAuthentication: 'Enabled' },
      'accessKeysAuthentication',
    ],
    ['client protocol', { clientProtocol: 'Plaintext' }, 'clientProtocol'],
    ['clustering', { clusteringPolicy: 'EnterpriseCluster' }, 'clusteringPolicy'],
    ['eviction', { evictionPolicy: 'NoEviction' }, 'evictionPolicy'],
    ['port', { port: 6380 }, '6380'],
  ])('refuses a differing database %s', (_label, propertyOverride, expectedDetail) => {
    const database = databaseCreate({
      properties: {
        ...databaseCreate().after.properties,
        ...propertyOverride,
      },
    });
    const assessment = assessChangeSet([clusterCreate(), database], REQUESTED);

    expect(assessment.ok).toBe(false);
    expect(assessment.violations.join(' ')).toContain(expectedDetail);
  });

  it('refuses a database attached under a different cluster name', () => {
    const assessment = assessChangeSet(
      [
        clusterCreate(),
        databaseCreate({
          id: `/subscriptions/${REQUESTED.subscriptionId}/resourceGroups/${REQUESTED.resourceGroup}/providers/Microsoft.Cache/redisEnterprise/other/databases/${REQUESTED.databaseName}`,
        }),
      ],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations.join(' ')).toContain(
      'redisEnterprise/other/databases/default',
    );
  });

  it('refuses a database with a different leaf name', () => {
    const assessment = assessChangeSet(
      [clusterCreate(), databaseCreate({ name: 'other' })],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations.join(' ')).toContain('name is other rather than default');
  });

  it('refuses a response with no change array rather than reporting success', () => {
    expect(assessChangeSet(undefined, REQUESTED).ok).toBe(false);
    expect(assessChangeSet({}, REQUESTED).ok).toBe(false);
  });

  it('refuses a malformed change entry', () => {
    const assessment = assessChangeSet([clusterCreate(), databaseCreate(), null], REQUESTED);

    expect(assessment.ok).toBe(false);
  });

  it('refuses an unrecognised change type', () => {
    const assessment = assessChangeSet(
      [clusterCreate(), databaseCreate(), speechIgnored('Deploy')],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
  });
});

describe('probe safety', () => {
  it('never references a deployment command', async () => {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { REPO_PATHS } = await import('./lib/paths.js');

    const source = await readFile(
      join(REPO_PATHS.root, 'scripts', 'azure', 'validate-redis.js'),
      'utf8',
    );

    // Only validate and what-if are permitted. Assert on the argument arrays actually
    // passed to the process runner rather than on prose, because the file legitimately
    // mentions the azd environment in comments and reads it through a helper.
    expect(source).toContain("'deployment', 'group', 'validate'");
    expect(source).toContain("'deployment', 'group', 'what-if'");
    expect(source).not.toContain("'deployment', 'group', 'create'");
    expect(source).not.toContain("'deployment', 'sub', 'create'");

    // The only executable this probe spawns is the Azure CLI.
    const spawned = [...source.matchAll(/runCommand\(\s*([A-Za-z_$][\w$]*)/g)].map(
      (match) => match[1],
    );
    expect(new Set(spawned)).toEqual(new Set(['AZ']));
  });

  it('redacts the subscription identifier from output', async () => {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { REPO_PATHS } = await import('./lib/paths.js');

    const source = await readFile(
      join(REPO_PATHS.root, 'scripts', 'azure', 'validate-redis.js'),
      'utf8',
    );

    expect(source).toContain('<subscription-id>');
  });
});
