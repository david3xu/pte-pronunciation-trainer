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
  REQUIRED_CREATE_TYPE,
  assessChangeSet,
} from './validate-redis.js';

const REQUESTED = { skuName: 'Basic', skuFamily: 'C', skuCapacity: 1 };

/** The Redis create as ARM actually returned it. */
function redisCreate(sku = { name: 'Basic', family: 'C', capacity: 1 }) {
  return {
    changeType: 'Create',
    before: null,
    after: {
      type: 'Microsoft.Cache/redis',
      location: 'australiaeast',
      properties: { sku },
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
  it('accepts the cache, its diagnostic setting and an ignored unrelated resource', () => {
    const assessment = assessChangeSet(
      [redisCreate(), diagnosticCreate(), speechIgnored()],
      REQUESTED,
    );

    expect(assessment.ok).toBe(true);
    expect(assessment.created).toEqual(ALLOWED_CREATE_TYPES);
    expect(assessment.unchanged).toHaveLength(1);
  });

  it('treats NoChange on an unrelated resource as no alteration', () => {
    expect(assessChangeSet([redisCreate(), speechIgnored('NoChange')], REQUESTED).ok).toBe(true);
  });
});

describe('refused change sets', () => {
  it('refuses a Modify on an unrelated resource', () => {
    const assessment = assessChangeSet([redisCreate(), speechIgnored('Modify')], REQUESTED);

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('Modify');
  });

  it('refuses a Delete on an unrelated resource', () => {
    const assessment = assessChangeSet([redisCreate(), speechIgnored('Delete')], REQUESTED);

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('Delete');
  });

  it('refuses a Create of any other resource type', () => {
    const assessment = assessChangeSet(
      [
        redisCreate(),
        { changeType: 'Create', after: { type: 'Microsoft.Web/serverfarms' } },
      ],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('unexpected Create');
  });

  it('refuses a change set that never predicts the cache', () => {
    const assessment = assessChangeSet([diagnosticCreate(), speechIgnored()], REQUESTED);

    expect(assessment.ok).toBe(false);
    expect(assessment.violations.join(' ')).toContain(REQUIRED_CREATE_TYPE);
  });

  it('refuses a predicted sku that differs from the request', () => {
    // A silently substituted tier would otherwise read as success and prove the wrong
    // thing, which is the failure this probe exists to prevent.
    const assessment = assessChangeSet(
      [redisCreate({ name: 'Standard', family: 'C', capacity: 1 })],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('Standard');
  });

  it('refuses a differing capacity', () => {
    const assessment = assessChangeSet(
      [redisCreate({ name: 'Basic', family: 'C', capacity: 2 })],
      REQUESTED,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.violations[0]).toContain('capacity 2');
  });

  it('refuses a response with no change array rather than reporting success', () => {
    expect(assessChangeSet(undefined, REQUESTED).ok).toBe(false);
    expect(assessChangeSet({}, REQUESTED).ok).toBe(false);
  });

  it('refuses a malformed change entry', () => {
    const assessment = assessChangeSet([redisCreate(), null], REQUESTED);

    expect(assessment.ok).toBe(false);
  });

  it('refuses an unrecognised change type', () => {
    const assessment = assessChangeSet([redisCreate(), speechIgnored('Deploy')], REQUESTED);

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
