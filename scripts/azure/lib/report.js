/**
 * Console reporting and evidence collection for the Azure deployment hooks.
 *
 * Two consumers read hook output. A human watching azd up needs a readable
 * stream, and .azure/deployment-plan.md needs a copyable evidence block. Both
 * are produced from the same recorded findings so they cannot disagree.
 */

/** Outcome of a single check. */
export const CHECK_STATUS = Object.freeze({
  pass: 'PASS',
  fail: 'FAIL',
  warn: 'WARN',
  skip: 'SKIP',
  /**
   * The probe ran but cannot establish capacity. Used where an Azure surface
   * reports no numeric limit, which is not the same statement as unlimited
   * capacity and must never be recorded as a pass.
   */
  inconclusive: 'INCONCLUSIVE',
});

/** Statuses that must stop the deployment before any paid resource is created. */
const BLOCKING_STATUSES = new Set([CHECK_STATUS.fail]);

const STATUS_WIDTH = 13;

export class DeploymentReport {
  /**
   * @param {string} title
   * @param {{ writer?: (line: string) => void }} [options]
   */
  constructor(title, options = {}) {
    this.title = title;
    this.writeLine = options.writer ?? ((line) => process.stdout.write(`${line}\n`));
    /** @type {Array<{ stage: string, name: string, status: string, detail: string, evidence: string[] }>} */
    this.findings = [];
    this.currentStage = title;
  }

  /**
   * Begin a labelled group of checks.
   *
   * @param {string} stage
   */
  beginStage(stage) {
    this.currentStage = stage;
    this.writeLine('');
    this.writeLine(`[${stage}]`);
  }

  /**
   * Record one check outcome.
   *
   * @param {{ name: string, status: string, detail: string, evidence?: string[] }} finding
   */
  record(finding) {
    const entry = {
      stage: this.currentStage,
      name: finding.name,
      status: finding.status,
      detail: finding.detail,
      evidence: finding.evidence ?? [],
    };
    this.findings.push(entry);
    this.writeLine(`  ${entry.status.padEnd(STATUS_WIDTH)}${entry.name}: ${entry.detail}`);
  }

  /**
   * Emit a plain informational line that is not itself a check.
   *
   * @param {string} message
   */
  note(message) {
    this.writeLine(`  ${''.padEnd(STATUS_WIDTH)}${message}`);
  }

  /** @returns {boolean} */
  get blocked() {
    return this.findings.some((finding) => BLOCKING_STATUSES.has(finding.status));
  }

  /** @returns {Array<{ stage: string, name: string, status: string, detail: string }>} */
  get blockingFindings() {
    return this.findings.filter((finding) => BLOCKING_STATUSES.has(finding.status));
  }

  /** @returns {Record<string, number>} */
  get statusCounts() {
    /** @type {Record<string, number>} */
    const counts = {};
    for (const finding of this.findings) {
      counts[finding.status] = (counts[finding.status] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Render the findings as a markdown section suitable for pasting into
   * .azure/deployment-plan.md. Tables and numbered lists are used rather than
   * bulleted lists so the block stays readable in both markdown and plain text.
   *
   * @param {{ generatedAt?: string }} [options]
   * @returns {string}
   */
  toMarkdown(options = {}) {
    const generatedAt = options.generatedAt ?? new Date().toISOString();
    const lines = [];

    lines.push(`### ${this.title}`);
    lines.push('');
    lines.push(`Recorded at ${generatedAt}`);
    lines.push('');
    lines.push('| Stage | Check | Status | Detail |');
    lines.push('| --- | --- | --- | --- |');

    for (const finding of this.findings) {
      lines.push(
        `| ${escapeCell(finding.stage)} | ${escapeCell(finding.name)} | ${finding.status} | ${escapeCell(finding.detail)} |`,
      );
    }

    const withEvidence = this.findings.filter((finding) => finding.evidence.length > 0);
    if (withEvidence.length > 0) {
      lines.push('');
      lines.push('Reproduction commands:');
      lines.push('');
      lines.push('```');
      for (const finding of withEvidence) {
        for (const command of finding.evidence) {
          lines.push(command);
        }
      }
      lines.push('```');
    }

    return `${lines.join('\n')}\n`;
  }

  /** Write a closing summary line for the console stream. */
  writeSummary() {
    const counts = this.statusCounts;
    const rendered = Object.entries(counts)
      .map(([status, count]) => `${status} ${count}`)
      .join(', ');
    this.writeLine('');
    this.writeLine(`${this.title} summary: ${rendered === '' ? 'no checks ran' : rendered}`);
  }
}

/**
 * Escape a value for safe inclusion in a markdown table cell.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeCell(value) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}
