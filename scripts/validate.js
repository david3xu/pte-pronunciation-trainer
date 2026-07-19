#!/usr/bin/env node

/**
 * Data Validation Script for the PTE Pronunciation Trainer
 *
 * Validates the generated datasets in data/processed for structural integrity.
 * This script is self-contained: it discovers datasets by scanning the
 * processed directory, so it needs no external config and no hardcoded
 * dataset path map. Directory locations mirror the pipeline output layout in
 * scripts/pte-data-pipeline.js.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROCESSED_DIR = path.join(__dirname, '..', 'data', 'processed');
const REPORTS_DIR = path.join(__dirname, '..', 'data', 'reports');
const VALID_DIFFICULTIES = ['easy', 'normal', 'hard'];

class DataValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      files: 0,
      vocabularyTerms: 0,
      practiceItems: 0,
      shadowingAnswers: 0,
    };
  }

  run() {
    console.log('🔍 Starting data validation...\n');

    if (!fs.existsSync(PROCESSED_DIR)) {
      console.error(`❌ Processed data directory not found: ${PROCESSED_DIR}`);
      console.error('   Run "npm run data:pte" or restore the committed datasets.');
      process.exit(1);
    }

    const files = fs
      .readdirSync(PROCESSED_DIR)
      .filter((file) => file.endsWith('.json'))
      .sort();

    if (files.length === 0) {
      console.error(`❌ No JSON datasets found in ${PROCESSED_DIR}`);
      process.exit(1);
    }

    for (const file of files) {
      this.validateFile(path.join(PROCESSED_DIR, file), file);
    }

    this.generateReport(files.length);
  }

  validateFile(fullPath, file) {
    this.stats.files++;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (error) {
      this.errors.push(`${file}: invalid JSON (${error.message})`);
      return;
    }

    if (Array.isArray(data.vocabulary)) {
      this.validateVocabulary(data.vocabulary, file);
    } else if (Array.isArray(data.items)) {
      this.validatePracticeItems(data.items, file);
    } else if (Array.isArray(data.answers)) {
      this.validateShadowingAnswers(data.answers, file);
    } else {
      this.errors.push(
        `${file}: unrecognized dataset shape (expected a vocabulary, items, or answers array)`
      );
    }
  }

  validateVocabulary(vocabulary, file) {
    if (vocabulary.length === 0) {
      // Empty content is a data-quality warning, not a structural failure: the
      // loader tolerates an empty book. Genuine corruption (invalid JSON or an
      // unrecognized shape) is still treated as a hard error in validateFile.
      this.warnings.push(`${file}: vocabulary array is empty`);
      return;
    }

    const seen = new Set();
    vocabulary.forEach((term, index) => {
      if (!term || typeof term.english !== 'string' || !term.english.trim()) {
        this.warnings.push(`${file}[${index}]: missing or empty "english" field`);
        return;
      }
      const key = term.english.toLowerCase();
      if (seen.has(key)) {
        this.warnings.push(`${file}: duplicate term "${term.english}"`);
      } else {
        seen.add(key);
      }
    });

    this.stats.vocabularyTerms += vocabulary.length;
    console.log(`   ✓ ${file}: ${vocabulary.length} vocabulary terms`);
  }

  validatePracticeItems(items, file) {
    if (items.length === 0) {
      this.warnings.push(`${file}: items array is empty`);
      return;
    }

    const seenIds = new Set();
    items.forEach((item, index) => {
      if (!item || !item.id) {
        this.warnings.push(`${file}[${index}]: missing item id`);
        return;
      }
      if (seenIds.has(item.id)) {
        this.warnings.push(`${file}: duplicate item id "${item.id}"`);
      } else {
        seenIds.add(item.id);
      }
      if (!item.content) {
        this.warnings.push(`${file}[${index}]: missing content`);
      }
      const difficulty = item.metadata && item.metadata.difficulty;
      if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
        this.warnings.push(`${file}[${index}]: invalid difficulty "${difficulty}"`);
      }
    });

    this.stats.practiceItems += items.length;
    console.log(`   ✓ ${file}: ${items.length} practice items`);
  }

  validateShadowingAnswers(answers, file) {
    if (answers.length === 0) {
      this.warnings.push(`${file}: answers array is empty`);
      return;
    }
    this.stats.shadowingAnswers += answers.length;
    console.log(`   ✓ ${file}: ${answers.length} shadowing answers`);
  }

  generateReport(fileCount) {
    console.log('\n📋 Validation Report');
    console.log('='.repeat(50));
    console.log(`   Files validated:    ${fileCount}`);
    console.log(`   Vocabulary terms:   ${this.stats.vocabularyTerms}`);
    console.log(`   Practice items:     ${this.stats.practiceItems}`);
    console.log(`   Shadowing answers:  ${this.stats.shadowingAnswers}`);
    console.log(`   Warnings:           ${this.warnings.length}`);
    console.log(`   Errors:             ${this.errors.length}`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings (first 20):');
      this.warnings.slice(0, 20).forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
      if (this.warnings.length > 20) {
        console.log(`   ... and ${this.warnings.length - 20} more`);
      }
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      warnings: this.warnings,
      errors: this.errors,
      status: this.errors.length === 0 ? 'passed' : 'failed',
    };

    const reportPath = path.join(REPORTS_DIR, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(50));
    if (this.errors.length === 0) {
      console.log('✅ Validation passed!');
      console.log(`📄 Report saved to ${reportPath}`);
    } else {
      console.log(`❌ Validation failed with ${this.errors.length} errors`);
      console.log(`📄 Report saved to ${reportPath}`);
      process.exit(1);
    }
  }
}

const validator = new DataValidator();
validator.run();
