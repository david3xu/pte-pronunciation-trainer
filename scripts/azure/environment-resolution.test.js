/**
 * Regression tests for environment resolution.
 *
 * Both cases here failed a correctly configured environment.
 *
 * Direct invocation: azd exports its values into the process only when azd itself
 * invokes the hook. Run through a package script, process.env carries none of them,
 * so validating identity from process.env alone refused an environment that azd had
 * configured correctly.
 *
 * Optional origins: the browser and native origin lists were provision gated in the
 * contract while the parameter file defaulted them to empty and the plan recorded
 * them as deferred. Three places, two of them changed.
 */

import { describe, expect, it } from 'vitest';

import {
  AZD_ENV_KEYS,
  REQUIRED_ENVIRONMENT_VALUES,
  REQUIREMENT_GATE,
} from './deployment-contract.js';
import { findEnvironmentMismatches } from './lib/azd-env.js';

function requirementFor(key) {
  return REQUIRED_ENVIRONMENT_VALUES.find((entry) => entry.key === key);
}

describe('optional origin lists are deferred consistently', () => {
  it('does not gate provisioning on the browser origin list', () => {
    expect(requirementFor(AZD_ENV_KEYS.webAllowedOrigins)?.gate).toBe(REQUIREMENT_GATE.deploy);
  });

  it('does not gate provisioning on the native origin list', () => {
    expect(requirementFor(AZD_ENV_KEYS.capacitorAllowedOrigins)?.gate).toBe(
      REQUIREMENT_GATE.deploy,
    );
  });

  it('keeps the values that genuinely block provisioning gated', () => {
    const provisionGated = REQUIRED_ENVIRONMENT_VALUES.filter(
      (entry) => entry.gate === REQUIREMENT_GATE.provision,
    ).map((entry) => entry.key);

    // Loosening the origin lists must not have loosened anything else.
    expect(provisionGated).toContain(AZD_ENV_KEYS.apimPublisherEmail);
    expect(provisionGated).toContain(AZD_ENV_KEYS.apimPublisherName);
    expect(provisionGated).toContain(AZD_ENV_KEYS.postgresEntraAdminObjectId);
    expect(provisionGated).toContain(AZD_ENV_KEYS.postgresEntraAdminPrincipalName);
    expect(provisionGated).toContain(AZD_ENV_KEYS.subscriptionId);
    expect(provisionGated).toContain(AZD_ENV_KEYS.location);
  });

  it('leaves the foundry values deferred', () => {
    for (const key of [
      AZD_ENV_KEYS.foundryResourceId,
      AZD_ENV_KEYS.foundryEndpoint,
      AZD_ENV_KEYS.foundryDeploymentName,
    ]) {
      expect(requirementFor(key)?.gate).toBe(REQUIREMENT_GATE.deploy);
    }
  });
});

describe('mismatch detection survives merging', () => {
  it('reports nothing when only the stored source defines a value', () => {
    // The direct invocation case. A value azd holds and the process does not is not a
    // disagreement, so merging it must stay silent.
    const mismatches = findEnvironmentMismatches(
      {},
      { [AZD_ENV_KEYS.subscriptionId]: 'stored-value' },
      [AZD_ENV_KEYS.subscriptionId],
    );

    expect(mismatches).toEqual([]);
  });

  it('reports nothing when only the process source defines a value', () => {
    const mismatches = findEnvironmentMismatches(
      { [AZD_ENV_KEYS.location]: 'australiaeast' },
      {},
      [AZD_ENV_KEYS.location],
    );

    expect(mismatches).toEqual([]);
  });

  it('still reports a disagreement when both sources define different values', () => {
    const mismatches = findEnvironmentMismatches(
      { [AZD_ENV_KEYS.location]: 'australiaeast' },
      { [AZD_ENV_KEYS.location]: 'australiasoutheast' },
      [AZD_ENV_KEYS.location],
    );

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.key).toBe(AZD_ENV_KEYS.location);
  });

  it('ignores whitespace differences rather than reporting a false disagreement', () => {
    const mismatches = findEnvironmentMismatches(
      { [AZD_ENV_KEYS.location]: ' australiaeast ' },
      { [AZD_ENV_KEYS.location]: 'australiaeast' },
      [AZD_ENV_KEYS.location],
    );

    expect(mismatches).toEqual([]);
  });
});

describe('identity resolution reads the stored environment', () => {
  it('validates identity after the stored read rather than before it', async () => {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { REPO_PATHS } = await import('./lib/paths.js');

    const source = await readFile(
      join(REPO_PATHS.root, 'scripts', 'azure', 'validate-environment.js'),
      'utf8',
    );

    const storedReadAt = source.indexOf('await readAzdEnvironment(');
    const identityStageAt = source.indexOf('report.beginStage(STAGE_LABELS.identity)');

    expect(storedReadAt).toBeGreaterThan(-1);
    expect(identityStageAt).toBeGreaterThan(storedReadAt);

    // Identity must consult the merged view, not process.env alone.
    expect(source).toContain('resolved[AZD_ENV_KEYS.subscriptionId]');
    expect(source).toContain('resolved[AZD_ENV_KEYS.location]');
  });
});
