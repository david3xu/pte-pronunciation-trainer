/**
 * Ordering and mutation safety tests for the preflight.
 *
 * These exist because the ordering defect they pin was real and shipped. The gate
 * was written last in the sequence, which meant a live run registered resource
 * providers and installed Azure CLI extensions before the operator was asked to
 * agree to anything. Reads may precede consent. Writes may not.
 *
 * The source is inspected rather than executed, because executing the hook performs
 * live Azure reads. That is a weaker test than injection would give, but it pins the
 * specific regression without querying anything.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REPO_PATHS } from './lib/paths.js';
import { CHECK_STATUS } from './lib/report.js';
import { confirmPaidProvisioning, confirmSpeechUpgrade } from './confirm-provisioning.js';
import { CONFIRMATION_KEYS } from './deployment-contract.js';
import { DeploymentReport } from './lib/report.js';

const SCRIPT_DIRECTORY = join(REPO_PATHS.root, 'scripts', 'azure');

async function readScript(name) {
  return readFile(join(SCRIPT_DIRECTORY, name), 'utf8');
}

function silentReport() {
  return new DeploymentReport('test', { writer: () => undefined });
}

function statusOf(report, name) {
  return report.findings.find((finding) => finding.name === name)?.status;
}

describe('preflight ordering', () => {
  it('gates paid provisioning before provider registration', async () => {
    const source = await readScript('preprovision.js');

    const gateAt = source.indexOf('confirmPaidProvisioning({');
    const registerAt = source.indexOf('await registerProviders({');
    const capacityAt = source.indexOf('await checkCapacity({');

    expect(gateAt).toBeGreaterThan(-1);
    expect(registerAt).toBeGreaterThan(-1);

    // Provider registration is a subscription level write, and the capacity stage
    // installs CLI extensions. Both must follow consent.
    expect(gateAt).toBeLessThan(registerAt);
    expect(gateAt).toBeLessThan(capacityAt);
  });

  it('halts before registration when the paid gate refuses', async () => {
    const source = await readScript('preprovision.js');

    const gateAt = source.indexOf('confirmPaidProvisioning({');
    const registerAt = source.indexOf('await registerProviders({');
    const between = source.slice(gateAt, registerAt);

    expect(between).toContain('report.blocked');
    expect(between).toContain('return finish(report, writeEvidence);');
  });

  it('runs the speech gate after the capacity read that informs it', async () => {
    const source = await readScript('preprovision.js');

    expect(source.indexOf('await checkCapacity({')).toBeLessThan(
      source.indexOf('confirmSpeechUpgrade({'),
    );
  });
});

describe('check mode performs no mutation', () => {
  it('skips provider registration in check mode', async () => {
    const source = await readScript('register-providers.js');

    // The dry run branch must return before any register call is issued.
    const dryRunAt = source.indexOf('if (dryRun) {');
    const registerAt = source.indexOf("azVoid(['provider', 'register'");

    expect(dryRunAt).toBeGreaterThan(-1);
    expect(registerAt).toBeGreaterThan(-1);
    expect(dryRunAt).toBeLessThan(registerAt);
  });

  it('skips extension installation in check mode', async () => {
    const source = await readScript('check-capacity.js');

    const dryRunAt = source.indexOf('if (dryRun) {');
    const installAt = source.indexOf('ensureAzureCliExtension(extensionName');

    expect(dryRunAt).toBeLessThan(installAt);
    expect(source).toContain('check mode does not install extensions');
  });

  it('issues no write in either confirmation gate under check mode', () => {
    const paid = confirmPaidProvisioning({ report: silentReport(), processEnvironment: {}, dryRun: true });
    const speech = confirmSpeechUpgrade({ report: silentReport(), processEnvironment: {}, dryRun: true });

    expect(paid.report.blocked).toBe(false);
    expect(speech.report.blocked).toBe(false);
    expect(statusOf(speech.report, CONFIRMATION_KEYS.speechSkuUpgrade)).toBe(CHECK_STATUS.skip);
  });
});

describe('full mode gating', () => {
  it('refuses paid provisioning when the confirmation is absent', () => {
    const { report } = confirmPaidProvisioning({
      report: silentReport(),
      processEnvironment: {},
      dryRun: false,
    });

    expect(report.blocked).toBe(true);
    expect(statusOf(report, CONFIRMATION_KEYS.paidProvisioning)).toBe(CHECK_STATUS.fail);
  });

  it('keeps the speech gate independent of the paid gate', () => {
    const { report } = confirmSpeechUpgrade({
      report: silentReport(),
      processEnvironment: { [CONFIRMATION_KEYS.paidProvisioning]: 'yes' },
      requestedSpeechSku: 'S0',
      currentSpeechSku: 'F0',
      dryRun: false,
    });

    // Agreeing to spend is not agreeing to change a live account's sku.
    expect(report.blocked).toBe(true);
    expect(statusOf(report, CONFIRMATION_KEYS.speechSkuUpgrade)).toBe(CHECK_STATUS.fail);
  });
});
