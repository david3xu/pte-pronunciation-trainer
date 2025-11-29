import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.resolve(__dirname, '../src');
const OUTPUT_FILE = path.resolve(__dirname, '../docs/CODE_INTERACTIONS.md');
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const FILE_EXTENSIONS = ['.ts', '.tsx'];

// Regex for finding exported functions/consts
// Matches: export function foo, export const foo =, export const foo: Type =
const EXPORT_REGEX = /export\s+(?:async\s+)?(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*(?::[^=]+)?\s*=\s*(?:async\s*)?(?:function|\(|[a-zA-Z0-9_]+))/g;

// Store results
const functions = [];
const allFileContents = [];

/**
 * Recursively walk directory to find files
 */
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        walkDir(filePath);
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(file))) {
      const content = fs.readFileSync(filePath, 'utf-8');
      allFileContents.push({ path: filePath, content });
      findExports(filePath, content);
    }
  });
}

/**
 * Find exported functions in a file
 */
function findExports(filePath, content) {
  let match;
  while ((match = EXPORT_REGEX.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (name) {
      functions.push({
        name,
        file: path.relative(path.resolve(__dirname, '..'), filePath),
        usageCount: 0
      });
    }
  }
}

/**
 * Count usages of each function across all files
 */
function countUsages() {
  functions.forEach(func => {
    // Simple regex to find the function name.
    // We use \b to ensure whole word match.
    // We subtract 1 to account for the definition itself.
    const regex = new RegExp(`\\b${func.name}\\b`, 'g');

    let count = 0;
    allFileContents.forEach(file => {
      const matches = file.content.match(regex);
      if (matches) {
        count += matches.length;
      }
    });

    // Adjust count: definition is counted once.
    // If usageCount < 0, it means regex matched something else or logic is slightly off, clamp to 0.
    func.usageCount = Math.max(0, count - 1);
  });
}

/**
 * Generate Markdown Report
 */
function generateReport() {
  // Sort by usage count (descending)
  functions.sort((a, b) => b.usageCount - a.usageCount);

  const totalFunctions = functions.length;
  const totalUsages = functions.reduce((sum, f) => sum + f.usageCount, 0);
  const avgUsage = (totalUsages / totalFunctions).toFixed(1);

  const heavy = functions.filter(f => f.usageCount > 20);
  const reasonable = functions.filter(f => f.usageCount >= 5 && f.usageCount <= 20);
  const low = functions.filter(f => f.usageCount > 0 && f.usageCount < 5);
  const unused = functions.filter(f => f.usageCount === 0);

  let md = `# Codebase Interaction & Usage Analysis

**Generated on:** ${new Date().toISOString()}

## 📊 Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Exported Functions** | ${totalFunctions} |
| **Total Usages Detected** | ${totalUsages} |
| **Average Usage per Function** | ${avgUsage} |

### Distribution
- **🔥 Heavy Usage (>20)**: ${heavy.length} (${((heavy.length / totalFunctions) * 100).toFixed(1)}%)
- **✅ Reasonable Usage (5-20)**: ${reasonable.length} (${((reasonable.length / totalFunctions) * 100).toFixed(1)}%)
- **⚠️ Low Usage (1-4)**: ${low.length} (${((low.length / totalFunctions) * 100).toFixed(1)}%)
- **👻 Unused (0)**: ${unused.length} (${((unused.length / totalFunctions) * 100).toFixed(1)}%)

---

## 🔥 Top 20 Heavily Used Functions
These are the core building blocks of the application.

| Function | Usages | Defined In |
| :--- | :--- | :--- |
${heavy.slice(0, 20).map(f => `| \`${f.name}\` | **${f.usageCount}** | \`${f.file}\` |`).join('\n')}

---

## 👻 Potential Unused / Dead Code
*Note: These might be used dynamically or by external tools, but no direct static references were found.*

<details>
<summary>Click to view ${unused.length} unused functions</summary>

| Function | Defined In |
| :--- | :--- |
${unused.map(f => `| \`${f.name}\` | \`${f.file}\` |`).join('\n')}

</details>

---

## 📂 Detailed Breakdown by Module

`;

  // Group by directory
  const byDir = {};
  functions.forEach(f => {
    const dir = path.dirname(f.file);
    if (!byDir[dir]) byDir[dir] = [];
    byDir[dir].push(f);
  });

  Object.keys(byDir).sort().forEach(dir => {
    md += `### 📁 \`${dir}\`\n\n`;
    md += `| Function | Usages | Status |\n| :--- | :--- | :--- |\n`;
    byDir[dir].forEach(f => {
      let status = '⚠️ Low';
      if (f.usageCount > 20) status = '🔥 Heavy';
      else if (f.usageCount >= 5) status = '✅ Reasonable';
      else if (f.usageCount === 0) status = '👻 Unused';

      md += `| \`${f.name}\` | ${f.usageCount} | ${status} |\n`;
    });
    md += '\n';
  });

  fs.writeFileSync(OUTPUT_FILE, md);
  console.log(`Report generated at ${OUTPUT_FILE}`);
}

// Run
console.log('Scanning codebase...');
walkDir(SRC_DIR);
console.log(`Found ${functions.length} exported functions.`);
console.log('Counting usages...');
countUsages();
console.log('Generating report...');
generateReport();
