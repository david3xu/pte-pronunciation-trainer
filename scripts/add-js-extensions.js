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

    // Resolve the import path relative to the current file
    const currentDir = path.dirname(filePath);
    const resolvedPath = path.resolve(currentDir, importPath);

    // Check if it's an index import
    const hasIndexInPath = importPath.endsWith('/index');

    // Check if the resolved path points to a directory
    let isDirectory = false;
    try {
      if (fs.existsSync(resolvedPath)) {
        isDirectory = fs.statSync(resolvedPath).isDirectory();
      } else if (fs.existsSync(resolvedPath + '.js')) {
        isDirectory = false; // It's a file with .js extension
      } else if (fs.existsSync(resolvedPath + '.ts')) {
        isDirectory = false; // It's a file with .ts extension (source)
      } else {
        // Can't find it, assume it's a file if it has no extension
        isDirectory = !importPath.split('/').pop().includes('.');
      }
    } catch (e) {
      // If we can't stat it, assume it's a file
      isDirectory = false;
    }

    if (isDirectory && !hasIndexInPath) {
      // Directory import: add /index.js
      modified = true;
      const cleanPath = importPath.replace(/\/$/, '');
      return match.replace(importPath, cleanPath + '/index.js');
    } else if (hasIndexInPath) {
      // Already has /index, just add .js
      modified = true;
      return match.replace(importPath, importPath + '.js');
    } else {
      // File import: add .js
      modified = true;
      return match.replace(importPath, importPath + '.js');
    }
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
