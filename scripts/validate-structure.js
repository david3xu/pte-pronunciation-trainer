#!/usr/bin/env node

/**
 * Directory Structure Validation Script
 *
 * Enforces project directory structure per GUIDELINES.md:
 * 1. Required directories exist
 * 2. No unauthorized files/directories
 * 3. Proper file organization
 * 4. Source files in correct locations
 *
 * Exit codes:
 * - 0: Structure is valid
 * - 1: Structure violations found
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Expected directory structure (per GUIDELINES.md and README.md)
const EXPECTED_STRUCTURE = {
  'data/': {
    required: true,
    children: {
      'source/': { required: true },
      'processed/': { required: true },
      'generated/': { required: false },
      'reports/': { required: true }
    }
  },
  'src/': {
    required: true,
    children: {
      'js/': {
        required: true,
        children: {
          'core/': { required: true },
          'shared/': { required: true },
          'ui/': { required: true },
          'audio/': { required: true },
          'data/': { required: true },
          'utils/': { required: true }
        }
      },
      'css/': {
        required: true,
        files: [
          'variables.css',
          'animations.css',
          'components.css',
          'style.css',
          'practice-modes.css',
          'responsive.css'
        ]
      }
    }
  },
  'docs/': {
    required: true,
    files: [
      'README.md',
      'GUIDELINES.md',
      'ARCHITECTURE.md',
      'API-REFERENCE.md',
      'DEPLOYMENT.md',
      'TROUBLESHOOTING.md'
    ]
  },
  'scripts/': {
    required: true,
    files: [
      'pte-data-pipeline.js',
      'validate.js',
      'build.js'
    ]
  },
  'tests/': { required: false },
  'dist/': { required: false }
};

// Root-level required files
const ROOT_FILES = [
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'CLAUDE.md',
  'index.html'
];

// Files that should NOT exist (common mistakes)
const FORBIDDEN_PATTERNS = [
  /\.DS_Store$/,
  /Thumbs\.db$/,
  /\.env$/,  // Should not be committed
  /node_modules/,  // Should be in .gitignore
  /\.idea/,  // IDE configs
  /\.vscode\/(?!extensions\.json$)/  // Allow extensions.json only
];

// Allowed temporary directories
const ALLOWED_TEMP_DIRS = [
  'docs/investigations'
];

class StructureValidator {
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

  // Validation 1: Check required directories exist
  validateRequiredDirectories(structure = EXPECTED_STRUCTURE, basePath = '.') {
    for (const [name, config] of Object.entries(structure)) {
      const fullPath = path.join(basePath, name);

      if (config.required) {
        if (!fs.existsSync(fullPath)) {
          this.addError(`Missing required directory: ${fullPath}`);
        } else if (!fs.statSync(fullPath).isDirectory()) {
          this.addError(`Expected directory but found file: ${fullPath}`);
        } else {
          this.addPassed(`Found: ${fullPath}`);

          // Recursively check children
          if (config.children) {
            this.validateRequiredDirectories(config.children, fullPath);
          }
        }
      }

      // Check required files within directory
      if (config.files && fs.existsSync(basePath)) {
        config.files.forEach(file => {
          const filePath = path.join(basePath, name, file);
          if (!fs.existsSync(filePath)) {
            this.addWarning(`Missing expected file: ${filePath}`);
          } else {
            this.addPassed(`Found: ${filePath}`);
          }
        });
      }
    }
  }

  // Validation 2: Check root-level files
  validateRootFiles() {
    console.log(`\n${colors.cyan}[2/5] Validating root-level files...${colors.reset}`);

    ROOT_FILES.forEach(file => {
      if (!fs.existsSync(file)) {
        this.addError(`Missing required root file: ${file}`);
      } else {
        this.addPassed(`Found: ${file}`);
      }
    });
  }

  // Validation 3: Check for forbidden files/patterns
  validateNoForbiddenFiles(dir = '.', depth = 0) {
    if (depth === 0) {
      console.log(`\n${colors.cyan}[3/5] Checking for forbidden files...${colors.reset}`);
    }

    if (depth > 5) return; // Prevent deep recursion

    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);

      // Check against forbidden patterns
      FORBIDDEN_PATTERNS.forEach(pattern => {
        if (pattern.test(fullPath)) {
          this.addError(`Forbidden file/directory found: ${fullPath}`);
        }
      });

      // Recurse into directories (skip node_modules, .git)
      if (fs.statSync(fullPath).isDirectory() &&
          !item.startsWith('.') &&
          item !== 'node_modules' &&
          item !== 'dist') {
        this.validateNoForbiddenFiles(fullPath, depth + 1);
      }
    });

    if (depth === 0 && this.errors.filter(e => e.includes('Forbidden')).length === 0) {
      this.addPassed('No forbidden files found');
    }
  }

  // Validation 4: Check CSS file organization
  validateCSSStructure() {
    console.log(`\n${colors.cyan}[4/5] Validating CSS structure...${colors.reset}`);

    const cssDir = 'src/css';
    const requiredCSSFiles = EXPECTED_STRUCTURE['src/'].children['css/'].files;

    if (!fs.existsSync(cssDir)) {
      this.addError(`CSS directory missing: ${cssDir}`);
      return;
    }

    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

    // Check required files exist
    requiredCSSFiles.forEach(file => {
      if (cssFiles.includes(file)) {
        this.addPassed(`CSS file: ${file}`);
      } else {
        this.addError(`Missing required CSS file: ${cssDir}/${file}`);
      }
    });

    // Warn about extra CSS files
    const extraFiles = cssFiles.filter(f => !requiredCSSFiles.includes(f));
    if (extraFiles.length > 0) {
      extraFiles.forEach(file => {
        this.addWarning(`Unexpected CSS file: ${cssDir}/${file}`);
      });
    }
  }

  // Validation 5: Check JavaScript module organization
  validateJSStructure() {
    console.log(`\n${colors.cyan}[5/5] Validating JavaScript structure...${colors.reset}`);

    const jsDir = 'src/js';
    const requiredModules = EXPECTED_STRUCTURE['src/'].children['js/'].children;

    if (!fs.existsSync(jsDir)) {
      this.addError(`JavaScript directory missing: ${jsDir}`);
      return;
    }

    // Check required module directories
    for (const [module, config] of Object.entries(requiredModules)) {
      const modulePath = path.join(jsDir, module);
      if (config.required && !fs.existsSync(modulePath)) {
        this.addError(`Missing required JS module directory: ${modulePath}`);
      } else if (fs.existsSync(modulePath)) {
        this.addPassed(`Module directory: ${module}`);

        // Count files in each module
        const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.js'));
        if (files.length === 0) {
          this.addWarning(`Empty module directory: ${modulePath}`);
        }
      }
    }

    // Check for Config.js (critical file)
    const configPath = path.join(jsDir, 'shared/Config.js');
    if (!fs.existsSync(configPath)) {
      this.addError('CRITICAL: Config.js not found at src/js/shared/Config.js');
    } else {
      this.addPassed('Config.js found (critical file)');
    }
  }

  // Run all validations
  async run() {
    console.log(`${colors.blue}========================================${colors.reset}`);
    console.log(`${colors.blue}  Directory Structure Validation${colors.reset}`);
    console.log(`${colors.blue}========================================${colors.reset}`);

    console.log(`\n${colors.cyan}[1/5] Validating directory structure...${colors.reset}`);
    this.validateRequiredDirectories();
    this.validateRootFiles();
    this.validateNoForbiddenFiles();
    this.validateCSSStructure();
    this.validateJSStructure();

    // Summary
    console.log(`\n${colors.blue}========================================${colors.reset}`);
    console.log(`${colors.blue}  Validation Summary${colors.reset}`);
    console.log(`${colors.blue}========================================${colors.reset}`);

    console.log(`${colors.green}Passed: ${this.passed.length}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${this.warnings.length}${colors.reset}`);
    console.log(`${colors.red}Errors: ${this.errors.length}${colors.reset}`);

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}STRUCTURE VALIDATION FAILED${colors.reset}`);
      console.log(`\n${colors.yellow}Fix these structural issues:${colors.reset}`);
      this.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log(`\n${colors.green}STRUCTURE VALID${colors.reset} ${colors.yellow}(with warnings)${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.green}✓ STRUCTURE FULLY COMPLIANT${colors.reset}`);
      process.exit(0);
    }
  }
}

// Run validator
const validator = new StructureValidator();
validator.run().catch(error => {
  console.error(`${colors.red}Structure validation error:${colors.reset}`, error);
  process.exit(1);
});
