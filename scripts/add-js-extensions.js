#!/usr/bin/env node

/**
 * Add .js extensions to relative imports in compiled JavaScript
 *
 * Browsers require .js extensions for ES module imports.
 * TypeScript doesn't add them automatically with bundler moduleResolution.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src', 'js');

function addJsExtensions(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match: import ... from '../path' or import ... from './path'
  // But NOT: import ... from 'package-name' (bare imports)
  // And NOT already: import ... from '../path.js'
  const importRegex = /from\s+['"](\.\.?\/[^'"]+?)(?<!\.js)['"]/g;

  const newContent = content.replace(importRegex, (match, importPath) => {
    // Skip if already has .js extension
    if (importPath.endsWith('.js')) {
      return match;
    }

    // Skip if it's a directory import (no extension)
    // Browser will try to load index.js automatically
    if (importPath.includes('/index')) {
      return match.replace(importPath, importPath + '.js');
    }

    modified = true;
    return match.replace(importPath, importPath + '.js');
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Fixed: ${path.relative(srcDir, filePath)}`);
    return true;
  }

  return false;
}

function processDirectory(dir) {
  let fixedCount = 0;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixedCount += processDirectory(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.map.js') && !file.endsWith('.js.map')) {
      if (addJsExtensions(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

console.log('🔧 Adding .js extensions to relative imports...\n');
const fixedCount = processDirectory(srcDir);
console.log(`\n✅ Fixed ${fixedCount} files`);
