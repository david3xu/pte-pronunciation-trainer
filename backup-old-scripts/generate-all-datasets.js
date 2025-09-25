#!/usr/bin/env node

/**
 * Generate all datasets for CCL Pronunciation Trainer
 * Runs all data generation scripts in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Generating all datasets for CCL Pronunciation Trainer...\n');

const scripts = [
  { name: 'Vocabulary Clean Dataset', script: 'generate-vocabulary-data.js' },
  { name: 'Words Dataset', script: 'generate-words-dataset.js' },
  { name: 'Chinese-English Dataset', script: 'generate-chinese-english-dataset.js' },
  { name: 'Resume Terms Dataset', script: 'generate-resume-terms-dataset.js' }
];

try {
  for (const { name, script } of scripts) {
    console.log(`📊 Generating ${name}...`);
    const scriptPath = path.join(__dirname, script);
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log(`✅ ${name} generated successfully\n`);
  }

  console.log('🎉 All datasets generated successfully!');
  console.log('\n📁 Generated files:');
  console.log('   - data/processed/vocabulary-data.json');
  console.log('   - data/processed/words-dataset.json');
  console.log('   - data/processed/chinese-english-dataset.json');
  console.log('   - data/processed/resume-terms-dataset.json');

} catch (error) {
  console.error('❌ Dataset generation failed:', error.message);
  process.exit(1);
}
