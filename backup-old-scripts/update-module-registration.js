#!/usr/bin/env node

/**
 * Batch update all modules to register with the new CCLApp namespace
 * Maintains backward compatibility with existing global references
 */

const fs = require('fs');
const path = require('path');

class ModuleRegistrationUpdater {
    constructor() {
        this.srcDir = path.join(__dirname, '../src/js');
        this.modulesToUpdate = [
            // Core modules
            'core/ProgressTracker.js',
            'core/App.js',

            // Audio modules
            'audio/TTSEngine.js',
            'audio/VoiceSelector.js',
            'audio/AudioControls.js',

            // UI modules
            'ui/UIController.js',
            'ui/SettingsPanel.js',

            // Utils modules (remaining)
            'utils/StateManager.js',
            'utils/CacheMigration.js',
            'utils/StateTest.js',

            // Data modules
            'data/DialogueDataLoader.js',
            'data/pronunciations.js',

            // Model modules
            'models/Vocabulary.js',
            'models/Category.js',
            'models/Dialogue.js'
        ];

        // Mapping of file paths to module names and global variable names
        this.moduleMap = {
            'core/ProgressTracker.js': { module: 'progressTracker', global: 'progressTracker' },
            'core/App.js': { module: 'cclApp', global: 'cclApp' },
            'audio/TTSEngine.js': { module: 'ttsEngine', global: 'ttsEngine' },
            'audio/VoiceSelector.js': { module: 'voiceSelector', global: 'voiceSelector' },
            'audio/AudioControls.js': { module: 'audioControls', global: 'audioControls' },
            'ui/UIController.js': { module: 'uiController', global: 'uiController' },
            'ui/SettingsPanel.js': { module: 'settingsPanel', global: 'settingsPanel' },
            'utils/StateManager.js': { module: 'stateManager', global: 'stateManager' },
            'utils/CacheMigration.js': { module: 'cacheMigration', global: 'cacheMigration' },
            'utils/StateTest.js': { module: 'stateTest', global: 'stateTest' },
            'data/DialogueDataLoader.js': { module: 'dialogueDataLoader', global: 'dialogueDataLoader' },
            'data/pronunciations.js': { module: 'pronunciations', global: 'pronunciations' },
            'models/Vocabulary.js': { module: 'vocabularyModel', global: 'Vocabulary' },
            'models/Category.js': { module: 'categoryModel', global: 'Category' },
            'models/Dialogue.js': { module: 'dialogueModel', global: 'Dialogue' }
        };
    }

    async updateAllModules() {
        console.log('🔄 Updating all modules to register with CCLApp namespace...\n');

        let successCount = 0;
        let errorCount = 0;

        for (const moduleFile of this.modulesToUpdate) {
            const filePath = path.join(this.srcDir, moduleFile);

            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  File not found: ${moduleFile}`);
                continue;
            }

            console.log(`📝 Updating ${moduleFile}...`);

            try {
                await this.updateModule(filePath, moduleFile);
                successCount++;
                console.log(`  ✅ Successfully updated`);
            } catch (error) {
                errorCount++;
                console.error(`  ❌ Error updating: ${error.message}`);
            }
        }

        console.log(`\n📊 Update Summary:`);
        console.log(`✅ Successfully updated: ${successCount} modules`);
        console.log(`❌ Errors: ${errorCount} modules`);

        if (errorCount === 0) {
            console.log('\n🎉 All modules successfully updated with namespace registration!');
        }
    }

    async updateModule(filePath, moduleFile) {
        const content = fs.readFileSync(filePath, 'utf8');
        const moduleInfo = this.moduleMap[moduleFile];

        // Skip if already updated
        if (content.includes('CCLApp.registerModule')) {
            console.log(`  ↪️  Already updated`);
            return;
        }

        let updatedContent = content;

        // Different patterns for different types of modules
        if (moduleFile.includes('core/App.js')) {
            updatedContent = this.updateAppModule(content);
        } else if (moduleFile.includes('models/')) {
            updatedContent = this.updateModelModule(content, moduleInfo);
        } else if (moduleFile.includes('data/pronunciations.js')) {
            updatedContent = this.updatePronunciationsModule(content, moduleInfo);
        } else {
            updatedContent = this.updateStandardModule(content, moduleInfo);
        }

        fs.writeFileSync(filePath, updatedContent);
    }

    updateAppModule(content) {
        // App.js has a different pattern - it creates CCLPronunciationTrainer
        const patterns = [
            // Pattern: window.cclApp = new CCLPronunciationTrainer();
            {
                search: /window\.cclApp = new CCLPronunciationTrainer\(\);/,
                replace: `// Create and expose global instance
const cclApp = new CCLPronunciationTrainer();

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('cclApp', cclApp);
}

// Legacy compatibility - maintain existing global reference
window.cclApp = cclApp;`
            },
            // Pattern: window.app = new CCLPronunciationTrainer();
            {
                search: /window\.app = new CCLPronunciationTrainer\(\);/,
                replace: `// Create and expose global instance
const cclApp = new CCLPronunciationTrainer();

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('cclApp', cclApp);
}

// Legacy compatibility - maintain existing global reference
window.cclApp = cclApp;`
            }
        ];

        return this.applyPatterns(content, patterns);
    }

    updateModelModule(content, moduleInfo) {
        // Model modules typically just expose classes
        const className = moduleInfo.global;

        const patterns = [
            // Add registration after class definition
            {
                search: new RegExp(`(class ${className}[\\s\\S]*?^})`, 'm'),
                replace: `$1

// Register class with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('${moduleInfo.module}', ${className});
}

// Legacy compatibility - maintain existing global reference (already exists)`
            }
        ];

        return this.applyPatterns(content, patterns);
    }

    updatePronunciationsModule(content, moduleInfo) {
        // pronunciations.js has a different pattern
        const patterns = [
            // Look for window assignment at the end
            {
                search: /window\.pronunciations\s*=/,
                replace: `// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('pronunciations', pronunciations);
}

// Legacy compatibility - maintain existing global reference
window.pronunciations =`
            }
        ];

        return this.applyPatterns(content, patterns);
    }

    updateStandardModule(content, moduleInfo) {
        const className = this.extractClassName(content);
        const globalVar = moduleInfo.global;

        if (!className) {
            throw new Error('Could not determine class name');
        }

        const patterns = [
            // Pattern: window.moduleName = new ClassName();
            {
                search: new RegExp(`window\\.${globalVar}\\s*=\\s*new\\s+${className}\\(\\);`),
                replace: `// Create and expose global instance
const ${globalVar} = new ${className}();

// Register with new namespace (if available)
if (window.CCLApp) {
    window.CCLApp.registerModule('${moduleInfo.module}', ${globalVar});
}

// Legacy compatibility - maintain existing global reference
window.${globalVar} = ${globalVar};`
            }
        ];

        return this.applyPatterns(content, patterns);
    }

    applyPatterns(content, patterns) {
        let result = content;

        for (const pattern of patterns) {
            if (pattern.search.test && pattern.search.test(result)) {
                result = result.replace(pattern.search, pattern.replace);
                break;
            } else if (result.includes(pattern.search)) {
                result = result.replace(pattern.search, pattern.replace);
                break;
            }
        }

        return result;
    }

    extractClassName(content) {
        const classMatch = content.match(/class\s+(\w+)/);
        return classMatch ? classMatch[1] : null;
    }
}

// Execute if run directly
if (require.main === module) {
    const updater = new ModuleRegistrationUpdater();
    updater.updateAllModules().catch(console.error);
}

module.exports = ModuleRegistrationUpdater;