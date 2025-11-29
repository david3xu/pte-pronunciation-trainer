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

// Output new version for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
} else {
  console.log(`::set-output name=new_version::${newVersion}`);
}
