import { describe, expect, it, vi } from 'vitest';

import {
  isRecognizedPostgresTransient,
  reconcilePostgresAdministrator,
  runPostprovision,
} from './postprovision.js';
import { AZD_ENV_KEYS, DEPLOYMENT_OUTPUTS } from './deployment-contract.js';
import { CHECK_STATUS } from './lib/report.js';

const TARGET = Object.freeze({
  subscriptionId: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  resourceGroup: 'trainer-rg',
  serverName: 'trainer-postgres',
  objectId: '33333333-3333-4333-8333-333333333333',
  principalName: 'trainer-admin@example.com',
});

function server(state = 'Ready', authOverrides = {}) {
  return {
    ok: true,
    stderr: '',
    value: {
      properties: {
        state,
        authConfig: {
          activeDirectoryAuth: 'Enabled',
          passwordAuth: 'Disabled',
          tenantId: TARGET.tenantId,
          ...authOverrides,
        },
      },
    },
  };
}

function administrators(entries) {
  return {
    ok: true,
    stderr: '',
    value: { value: entries },
  };
}

function approvedAdministrator(overrides = {}) {
  return {
    name: TARGET.objectId,
    properties: {
      tenantId: TARGET.tenantId,
      principalType: 'User',
      principalName: TARGET.principalName,
      ...overrides,
    },
  };
}

function queuedRequest(responses) {
  const calls = [];
  const request = vi.fn(async (invocation) => {
    calls.push(invocation);
    const response = responses.shift();
    if (response === undefined) {
      throw new Error('test request queue exhausted');
    }
    return response;
  });
  return { request, calls };
}

function reconcileOptions(request, overrides = {}) {
  return {
    ...TARGET,
    request,
    sleep: vi.fn(async () => undefined),
    readinessAttempts: 3,
    createAttempts: 2,
    verificationAttempts: 3,
    pollIntervalMs: 1,
    ...overrides,
  };
}

describe('PostgreSQL administrator reconciliation', () => {
  it('accepts the exact existing administrator without issuing a write', async () => {
    const queue = queuedRequest([
      server(),
      administrators([approvedAdministrator()]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result).toMatchObject({ ok: true, changed: false });
    expect(queue.calls.map((call) => call.method)).toEqual(['GET', 'GET']);
  });

  it('creates an absent administrator and re-reads the exact identity', async () => {
    const queue = queuedRequest([
      server(),
      administrators([]),
      { ok: true, stderr: '', value: undefined },
      administrators([approvedAdministrator()]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result).toMatchObject({ ok: true, changed: true });
    expect(queue.calls.map((call) => call.method)).toEqual(['GET', 'GET', 'PUT', 'GET']);
    expect(queue.calls[2].url).toContain(`/administrators/${TARGET.objectId}?api-version=2024-08-01`);
    expect(queue.calls[2].body).toEqual({
      properties: {
        tenantId: TARGET.tenantId,
        principalType: 'User',
        principalName: TARGET.principalName,
      },
    });
  });

  it('waits through a recognized server readiness transition', async () => {
    const sleep = vi.fn(async () => undefined);
    const queue = queuedRequest([
      server('Updating'),
      server(),
      administrators([approvedAdministrator()]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request, { sleep }),
    );

    expect(result.ok).toBe(true);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it('refuses an unrecognized server state', async () => {
    const queue = queuedRequest([server('Stopped')]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('Stopped');
    expect(queue.calls).toHaveLength(1);
  });

  it('refuses a server whose authentication contract differs', async () => {
    const queue = queuedRequest([server('Ready', { passwordAuth: 'Enabled' })]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('password authentication');
  });

  it('refuses a different administrator rather than overwriting it', async () => {
    const queue = queuedRequest([
      server(),
      administrators([
        approvedAdministrator({ principalName: 'different@example.com' }),
      ]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('refusing to overwrite');
    expect(queue.calls.map((call) => call.method)).not.toContain('PUT');
  });

  it('refuses an additional administrator even when the approved identity exists', async () => {
    const queue = queuedRequest([
      server(),
      administrators([
        approvedAdministrator(),
        approvedAdministrator({ principalName: 'additional@example.com' }),
      ]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result.ok).toBe(false);
    expect(queue.calls.map((call) => call.method)).not.toContain('PUT');
  });

  it('accepts a transient create response only after the exact identity is observable', async () => {
    const queue = queuedRequest([
      server(),
      administrators([]),
      { ok: false, stderr: 'ServerNotReady', value: undefined },
      administrators([approvedAdministrator()]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result).toMatchObject({ ok: true, changed: true });
    expect(queue.calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
  });

  it('polls after an asynchronous accepted create until the identity appears', async () => {
    const sleep = vi.fn(async () => undefined);
    const queue = queuedRequest([
      server(),
      administrators([]),
      { ok: true, stderr: '', value: undefined },
      administrators([]),
      administrators([approvedAdministrator()]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request, { sleep }),
    );

    expect(result).toMatchObject({ ok: true, changed: true });
    expect(sleep).toHaveBeenCalledOnce();
  });

  it('does not retry an unrecognized create failure', async () => {
    const queue = queuedRequest([
      server(),
      administrators([]),
      { ok: false, stderr: 'AuthorizationFailed', value: undefined },
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('AuthorizationFailed');
    expect(queue.calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
  });

  it('fails when a successful create never becomes observable', async () => {
    const queue = queuedRequest([
      server(),
      administrators([]),
      { ok: true, stderr: '', value: undefined },
      administrators([]),
      administrators([]),
      administrators([]),
    ]);

    const result = await reconcilePostgresAdministrator(
      reconcileOptions(queue.request),
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('not observable');
  });
});

describe('PostgreSQL transient classification', () => {
  it.each([
    'ServerNotReady',
    'OperationInProgress',
    'AnotherOperationInProgress',
    'ServiceBusy',
    'TooManyRequests',
  ])('recognizes %s', (code) => {
    expect(isRecognizedPostgresTransient(`error code: ${code}`)).toBe(true);
  });

  it('does not treat a generic conflict as retryable', () => {
    expect(isRecognizedPostgresTransient('Conflict')).toBe(false);
  });
});

describe('postprovision integration', () => {
  it('keeps check mode read only while proving reconciliation inputs are present', async () => {
    const processEnvironment = {
      [AZD_ENV_KEYS.subscriptionId]: TARGET.subscriptionId,
      [AZD_ENV_KEYS.resourceGroup]: TARGET.resourceGroup,
      [AZD_ENV_KEYS.postgresEntraAdminObjectId]: TARGET.objectId,
      [AZD_ENV_KEYS.postgresEntraAdminPrincipalName]: TARGET.principalName,
    };

    for (const output of DEPLOYMENT_OUTPUTS) {
      processEnvironment[output.key] =
        output.key === 'POSTGRES_SERVER_NAME' ? TARGET.serverName : `${output.key.toLowerCase()}-value`;
    }

    const result = await runPostprovision({
      processEnvironment,
      dryRun: true,
    });
    const finding = result.report.findings.find(
      (entry) => entry.name === 'approved PostgreSQL Entra administrator',
    );

    expect(result.report.blocked).toBe(false);
    expect(finding?.status).toBe(CHECK_STATUS.skip);
  });
});
