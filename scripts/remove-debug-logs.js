#!/usr/bin/env node

/**
 * Remove debug console.log statements from source files
 * Keeps console.error and console.warn (important for production debugging)
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'js');
const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');

let filesProcessed = 0;
let logsRemoved = 0;
let warnsKept = 0;
let errorsKept = 0;

// Patterns to keep (important for production debugging)
const keepPatterns = [
    /console\.error/,
    /console\.warn/,
    /console\.info/,  // Keep info too - useful for status
    /console\.table/,
    /console\.dir/
];

// Process a single file
function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const newLines = [];
    let removed = 0;
    let kept = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if line contains console statement
        if (/console\.\w+/.test(line)) {
            // Check if it's a pattern we should keep
            const shouldKeep = keepPatterns.some(pattern => pattern.test(line));
            
            if (shouldKeep) {
                newLines.push(line);
                kept++;
                if (line.includes('console.warn')) warnsKept++;
                if (line.includes('console.error')) errorsKept++;
            } else {
                // It's a console.log - remove it
                if (verbose) {
                    console.log(`  Removing from ${path.basename(filePath)}:${i + 1}`);
                    console.log(`    ${line.trim()}`);
                }
                removed++;
                logsRemoved++;
                // Skip this line (don't add to newLines)
                continue;
            }
        } else {
            newLines.push(line);
        }
    }

    if (removed > 0) {
        filesProcessed++;
        console.log(`✅ ${path.basename(filePath)}: Removed ${removed} debug logs, kept ${kept} warnings/errors`);
        
        if (!dryRun) {
            fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
        }
    }
}

// Recursively process directory
function processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

// Main
console.log('🧹 Cleaning up debug console.log statements...\n');

if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

processDirectory(srcDir);

console.log('\n📊 Summary:');
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Debug logs removed: ${logsRemoved}`);
console.log(`   Warnings kept: ${warnsKept}`);
console.log(`   Errors kept: ${errorsKept}`);

if (dryRun) {
    console.log('\n💡 Run without --dry-run to actually remove the logs');
} else {
    console.log('\n✅ Cleanup complete!');
}
