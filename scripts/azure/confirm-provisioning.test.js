/**
 * Regression tests for the provisioning confirmation gate.
 *
 * The gate exists so an unattended run cannot create billable resources or move a
 * production Speech account off its free tier by omission. Every test here pins a
 * way that could silently stop being true.
 */

import { describe, expect, it } from 'vitest';

import {
  confirmProvisioning,
  isConfirmed,
  summariseEstimatedCost,
} from './confirm-provisioning.js';
import { CHECK_STATUS, DeploymentReport } from './lib/report.js';
import { CONFIRMATION_KEYS, CONFIRMATION_VALUE } from './deployment-contract.js';

/** A report that does not write to stdout, so the suite output stays readable. */
function silentReport() {
  return new DeploymentReport('test', { writer: () => undefined });
}

function findFinding(report, name) {
  return report.findings.find((finding) => finding.name === name);
}

describe('isConfirmed', () => {
  it('accepts only the exact confirmation value', () => {
    expect(isConfirmed(CONFIRMATION_VALUE)).toBe(true);
    expect(isConfirmed(' YES ')).toBe(true);
  });

  it('treats anything else as absent, including other truthy strings', () => {
    expect(isConfirmed(undefined)).toBe(false);
    expect(isConfirmed('')).toBe(false);
    expect(isConfirmed('true')).toBe(false);
    expect(isConfirmed('1')).toBe(false);
    expect(isConfirmed('y')).toBe(false);
  });
});

describe('summariseEstimatedCost', () => {
  it('totals only the fixed cost resources', () => {
    const summary = summariseEstimatedCost();

    expect(summary.fixedTotalUsd).toBeGreaterThan(0);
    expect(summary.fixedResources.length).toBeGreaterThan(0);
  });

  it('reports usage billed resources separately rather than counting them as zero', () => {
    const summary = summariseEstimatedCost();

    expect(summary.usageBilled).toContain('Azure AI Speech account');
    expect(summary.usageBilled).toContain('Log Analytics workspace');
  });
});

describe('paid provisioning gate', () => {
  it('refuses when the confirmation is absent', () => {
    const { report } = confirmProvisioning({
      report: silentReport(),
      processEnvironment: {},
      requestedSpeechSku: 'S0',
      currentSpeechSku: 'S0',
    });

    expect(report.blocked).toBe(true);
    expect(findFinding(report, CONFIRMATION_KEYS.paidProvisioning)?.status).toBe(
      CHECK_STATUS.fail,
    );
  });

  it('passes when the confirmation is present and the sku is unchanged', () => {
    const { report } = confirmProvisioning({
      processEnvironment: { [CONFIRMATION_KEYS.paidProvisioning]: CONFIRMATION_VALUE },
      requestedSpeechSku: 'S0',
      currentSpeechSku: 'S0',
    });

    expect(report.blocked).toBe(false);
    expect(findFinding(report, CONFIRMATION_KEYS.speechSkuUpgrade)?.status).toBe(
      CHECK_STATUS.skip,
    );
  });

  it('does not gate in check mode, because check mode provisions nothing', () => {
    const { report } = confirmProvisioning({ processEnvironment: {}, dryRun: true });

    expect(report.blocked).toBe(false);
  });
});

describe('speech sku upgrade gate', () => {
  it('refuses an unconfirmed move off the free tier', () => {
    const { report } = confirmProvisioning({
      processEnvironment: { [CONFIRMATION_KEYS.paidProvisioning]: CONFIRMATION_VALUE },
      requestedSpeechSku: 'S0',
      currentSpeechSku: 'F0',
    });

    const finding = findFinding(report, CONFIRMATION_KEYS.speechSkuUpgrade);

    expect(report.blocked).toBe(true);
    expect(finding?.status).toBe(CHECK_STATUS.fail);
    expect(finding?.detail).toContain('production traffic');
  });

  it('accepts a confirmed move off the free tier', () => {
    const { report } = confirmProvisioning({
      processEnvironment: {
        [CONFIRMATION_KEYS.paidProvisioning]: CONFIRMATION_VALUE,
        [CONFIRMATION_KEYS.speechSkuUpgrade]: CONFIRMATION_VALUE,
      },
      requestedSpeechSku: 'S0',
      currentSpeechSku: 'F0',
    });

    expect(report.blocked).toBe(false);
  });

  it('requires the paid confirmation independently of the speech confirmation', () => {
    const { report } = confirmProvisioning({
      processEnvironment: { [CONFIRMATION_KEYS.speechSkuUpgrade]: CONFIRMATION_VALUE },
      requestedSpeechSku: 'S0',
      currentSpeechSku: 'F0',
    });

    expect(report.blocked).toBe(true);
    expect(findFinding(report, CONFIRMATION_KEYS.paidProvisioning)?.status).toBe(
      CHECK_STATUS.fail,
    );
  });

  it('warns rather than passing when the requested sku cannot be determined', () => {
    const { report } = confirmProvisioning({
      processEnvironment: { [CONFIRMATION_KEYS.paidProvisioning]: CONFIRMATION_VALUE },
      requestedSpeechSku: undefined,
      currentSpeechSku: 'F0',
    });

    expect(findFinding(report, CONFIRMATION_KEYS.speechSkuUpgrade)?.status).toBe(
      CHECK_STATUS.warn,
    );
  });
});
