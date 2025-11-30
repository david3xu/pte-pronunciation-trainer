import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const packageJsonPath = path.join(__dirname, '../package.json');
const appConfigPath = path.join(__dirname, '../src/config/AppConfig.ts');

// Read package.json
const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonContent);
const currentVersion = packageJson.version;

// Parse version
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('Updated package.json');

// Update AppConfig.ts
let appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
// Regex to find version: '3.0.0' inside the app object
// We look for: version: 'X.Y.Z'
const versionRegex = /version:\s*'(\d+\.\d+\.\d+)'/;

if (versionRegex.test(appConfigContent)) {
  appConfigContent = appConfigContent.replace(versionRegex, `version: '${newVersion}'`);
  fs.writeFileSync(appConfigPath, appConfigContent);
  console.log('Updated src/config/AppConfig.ts');
} else {
  console.error('Could not find version string in AppConfig.ts');
  process.exit(1);
}

// Update README.md
const readmePath = path.join(__dirname, '../README.md');
let readmeContent = fs.readFileSync(readmePath, 'utf8');
// Replace "v3.0.0" or "3.0.0" with new version
// Look for specific patterns to avoid replacing dependencies
readmeContent = readmeContent.replace(/v\d+\.\d+\.\d+/g, `v${newVersion}`);
readmeContent = readmeContent.replace(/Version\*\*: \d+\.\d+\.\d+/g, `Version**: ${newVersion}`);
fs.writeFileSync(readmePath, readmeContent);
console.log('Updated README.md');

// Update CLAUDE.md
const claudePath = path.join(__dirname, '../CLAUDE.md');
let claudeContent = fs.readFileSync(claudePath, 'utf8');
claudeContent = claudeContent.replace(/v\d+\.\d+\.\d+/g, `v${newVersion}`);
claudeContent = claudeContent.replace(/Version\*\*: \d+\.\d+\.\d+/g, `Version**: ${newVersion}`);
fs.writeFileSync(claudePath, claudeContent);
console.log('Updated CLAUDE.md');

// Update CHANGELOG.md
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
let changelogContent = fs.readFileSync(changelogPath, 'utf8');
const date = new Date().toISOString().split('T')[0];
const newChangelogEntry = `## [${newVersion}] - ${date}

### Automated
- Version bump to ${newVersion}

`;
// Insert after [Unreleased]
changelogContent = changelogContent.replace(/## \[Unreleased\]\s+/, `## [Unreleased]\n\n${newChangelogEntry}`);
fs.writeFileSync(changelogPath, changelogContent);
console.log('Updated CHANGELOG.md');

// Output new version for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
} else {
  console.log(`::set-output name=new_version::${newVersion}`);
}
