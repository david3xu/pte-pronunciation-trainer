#!/usr/bin/env node

/**
 * Documentation Validation Script
 *
 * Enforces GUIDELINES.md documentation rules:
 * 1. Permanent vs Temporary documentation structure
 * 2. Version consistency across all files
 * 3. No historical bug mentions in permanent docs
 * 4. Proper documentation updates
 *
 * Exit codes:
 * - 0: All validations passed
 * - 1: Validation failures found
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Configuration from GUIDELINES.md
const PERMANENT_DOCS = [
  'README.md',
  'CHANGELOG.md',
  'CLAUDE.md',
  'docs/GUIDELINES.md',
  'docs/ENFORCING-GUIDELINES.md',
  'docs/ARCHITECTURE.md',
  'docs/API-REFERENCE.md',
  'docs/DEPLOYMENT.md',
  'docs/TROUBLESHOOTING.md',
  'docs/README.md'
];

const VERSION_FILES = [
  { file: 'package.json', pattern: /"version":\s*"([^"]+)"/ },
  { file: 'README.md', pattern: /v(\d+\.\d+\.\d+)/ },
  { file: 'docs/GUIDELINES.md', pattern: /Version:\s*(\d+\.\d+\.\d+)/ },
  { file: 'docs/README.md', pattern: /Version:\s*(\d+\.\d+\.\d+)/ },
  { file: 'CLAUDE.md', pattern: /Current Version.*?v(\d+\.\d+\.\d+)/ }
];

// Historical language that should NOT appear in permanent docs
const HISTORICAL_PATTERNS = [
  /\b(fixed|solved)\s+(critical\s+)?bug/i,
  /\b(bug|issue)\s+(fixed|solved|resolved)/i,
  /\bproblem\s+solved\b/i,
  /\bcritical\s+bug\s+(fixed|resolved)/i,
  /\b\d+\s+violations?\s+fixed/i,
  /\b(was|before):\s*\d+.*?\bnow\b/i,  // "was: 15%, now: 0%"
  /\b(eliminated|removed)\s+\d+\s+duplicates?/i
];

// Maximum temporary files allowed
const MAX_TEMP_FILES = 5;

class DocumentationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const prefix = {
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      info: `${colors.blue}ℹ${colors.reset}`
    }[type];

    console.log(`${prefix} ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  addPassed(message) {
    this.passed.push(message);
    this.log(message, 'success');
  }

  // Validation 1: Check permanent documentation exists
  validatePermanentDocsExist() {
    console.log(`\n${colors.cyan}[1/5] Validating permanent documentation files...${colors.reset}`);

    PERMANENT_DOCS.forEach(filePath => {
      if (!fs.existsSync(filePath)) {
        this.addError(`Missing permanent documentation: ${filePath}`);
      } else {
        this.addPassed(`Found: ${filePath}`);
      }
    });
  }

  // Validation 2: Check version consistency
  validateVersionConsistency() {
    console.log(`\n${colors.cyan}[2/5] Validating version consistency...${colors.reset}`);

    const versions = [];

    VERSION_FILES.forEach(({ file, pattern }) => {
      if (!fs.existsSync(file)) {
        this.addWarning(`Version file not found: ${file}`);
        return;
      }

      const content = fs.readFileSync(file, 'utf-8');
      const match = content.match(pattern);

      if (match) {
        versions.push({ file, version: match[1] });
      } else {
        this.addWarning(`Could not extract version from ${file}`);
      }
    });

    // Check all versions match
    if (versions.length > 0) {
      const referenceVersion = versions[0].version;
      const allMatch = versions.every(v => v.version === referenceVersion);

      if (allMatch) {
        this.addPassed(`All versions consistent: v${referenceVersion}`);
        versions.forEach(v => {
          this.addPassed(`  ${v.file}: v${v.version}`);
        });
      } else {
        this.addError('Version mismatch detected:');
        versions.forEach(v => {
          console.log(`  ${v.file}: v${v.version}`);
        });
      }
    }
  }

  // Validation 3: Check for historical language in permanent docs
  validateNoHistoricalLanguage() {
    console.log(`\n${colors.cyan}[3/5] Checking for historical language in permanent docs...${colors.reset}`);

    PERMANENT_DOCS.forEach(filePath => {
      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      let foundHistorical = false;

      HISTORICAL_PATTERNS.forEach(pattern => {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            foundHistorical = true;
            this.addError(
              `Historical language in ${filePath}:${index + 1}\n` +
              `  "${line.trim()}"`
            );
          }
        });
      });

      if (!foundHistorical) {
        this.addPassed(`Clean: ${filePath}`);
      }
    });
  }

  // Validation 4: Check temporary documentation cleanup
  validateTemporaryDocs() {
    console.log(`\n${colors.cyan}[4/5] Checking temporary documentation cleanup...${colors.reset}`);

    const tempDir = 'docs/investigations';

    if (!fs.existsSync(tempDir)) {
      this.addPassed('No temporary documentation directory (clean)');
      return;
    }

    const tempFiles = fs.readdirSync(tempDir)
      .filter(f => f.endsWith('.md'));

    if (tempFiles.length === 0) {
      this.addPassed('Temporary documentation directory is clean');
    } else if (tempFiles.length <= MAX_TEMP_FILES) {
      this.addWarning(
        `${tempFiles.length} temporary file(s) in ${tempDir}/ (max: ${MAX_TEMP_FILES})`
      );
      tempFiles.forEach(f => {
        console.log(`    ${f}`);
      });
    } else {
      this.addError(
        `Too many temporary files in ${tempDir}/ (${tempFiles.length}, max: ${MAX_TEMP_FILES})`
      );
      tempFiles.forEach(f => {
        console.log(`    ${f}`);
      });
    }
  }

  // Validation 5: Check CHANGELOG.md is updated
  validateChangelogUpdated() {
    console.log(`\n${colors.cyan}[5/5] Validating CHANGELOG.md...${colors.reset}`);

    const changelogPath = 'CHANGELOG.md';

    if (!fs.existsSync(changelogPath)) {
      this.addError('CHANGELOG.md not found');
      return;
    }

    const content = fs.readFileSync(changelogPath, 'utf-8');

    // Check for [Unreleased] section
    if (content.includes('## [Unreleased]')) {
      this.addPassed('CHANGELOG.md has [Unreleased] section');
    } else {
      this.addWarning('CHANGELOG.md missing [Unreleased] section');
    }

    // Check if updated recently (has today's date)
    const today = new Date().toISOString().split('T')[0];
    if (content.includes(today)) {
      this.addPassed(`CHANGELOG.md updated today (${today})`);
    } else {
      this.addWarning('CHANGELOG.md may need updating (no today\'s date found)');
    }
  }

  // Run all validations
  async run() {
    console.log(`${colors.blue}========================================${colors.reset}`);
    console.log(`${colors.blue}  Documentation Validation (GUIDELINES.md)${colors.reset}`);
    console.log(`${colors.blue}========================================${colors.reset}`);

    this.validatePermanentDocsExist();
    this.validateVersionConsistency();
    this.validateNoHistoricalLanguage();
    this.validateTemporaryDocs();
    this.validateChangelogUpdated();

    // Summary
    console.log(`\n${colors.blue}========================================${colors.reset}`);
    console.log(`${colors.blue}  Validation Summary${colors.reset}`);
    console.log(`${colors.blue}========================================${colors.reset}`);

    console.log(`${colors.green}Passed: ${this.passed.length}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${this.warnings.length}${colors.reset}`);
    console.log(`${colors.red}Errors: ${this.errors.length}${colors.reset}`);

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}VALIDATION FAILED${colors.reset}`);
      console.log(`\n${colors.yellow}Fix errors before committing:${colors.reset}`);
      this.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log(`\n${colors.green}VALIDATION PASSED${colors.reset} ${colors.yellow}(with warnings)${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.green}✓ ALL VALIDATIONS PASSED${colors.reset}`);
      process.exit(0);
    }
  }
}

// Run validator
const validator = new DocumentationValidator();
validator.run().catch(error => {
  console.error(`${colors.red}Validation script error:${colors.reset}`, error);
  process.exit(1);
});
