#!/usr/bin/env node

/**
 * Production Build Script for CCL Pronunciation Trainer
 * Bundles, minifies, and optimizes files for production deployment
 */

const fs = require('fs');
const path = require('path');

// Simple minification functions (for basic build without external dependencies)
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
        .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
        .replace(/}\s*/g, '}') // Remove spaces after closing brace
        .replace(/;\s*/g, ';') // Remove spaces after semicolons
        .replace(/:\s*/g, ':') // Remove spaces after colons
        .trim();
}

function minifyJS(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/;\s*}/g, '}') // Clean up before closing braces
        .replace(/\s*{\s*/g, '{') // Clean up around opening braces
        .trim();
}

function minifyHTML(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/>\s+</g, '><') // Remove spaces between tags
        .trim();
}

async function build() {
    console.log('🏗️  Starting production build...\n');
    
    const distDir = 'dist';
    const srcDir = 'src';
    const dataDir = 'data';
    
    try {
        // Create dist directory
        if (fs.existsSync(distDir)) {
            console.log('🧹 Cleaning existing dist directory...');
            fs.rmSync(distDir, { recursive: true });
        }
        
        fs.mkdirSync(distDir);
        fs.mkdirSync(path.join(distDir, 'js'));
        fs.mkdirSync(path.join(distDir, 'css'));
        fs.mkdirSync(path.join(distDir, 'data'));
        
        console.log('✅ Created dist directory structure\n');
        
        // Build CSS
        console.log('🎨 Building CSS files...');
        const cssFiles = [
            path.join(srcDir, 'css', 'style.css'),
            path.join(srcDir, 'css', 'components.css'),
            path.join(srcDir, 'css', 'responsive.css')
        ];
        
        let combinedCSS = '';
        for (const cssFile of cssFiles) {
            if (fs.existsSync(cssFile)) {
                const content = fs.readFileSync(cssFile, 'utf8');
                combinedCSS += `/* === ${path.basename(cssFile)} === */\n${content}\n\n`;
                console.log(`   ✓ Included ${path.basename(cssFile)}`);
            }
        }
        
        const minifiedCSS = minifyCSS(combinedCSS);
        fs.writeFileSync(path.join(distDir, 'css', 'app.min.css'), minifiedCSS);
        console.log(`   ✅ Created app.min.css (${Math.round(minifiedCSS.length / 1024)}KB)\n`);
        
        // Build JavaScript - Refactored modular structure
        console.log('📦 Building JavaScript files...');
        const jsFiles = [
            // Utility modules first
            path.join(srcDir, 'js', 'utils', 'EventBus.js'),
            path.join(srcDir, 'js', 'utils', 'Storage.js'),
            // Data modules
            path.join(srcDir, 'js', 'data', 'pronunciations.js'),
            // Core modules
            path.join(srcDir, 'js', 'core', 'VocabularyManager.js'),
            path.join(srcDir, 'js', 'core', 'ProgressTracker.js'),
            // Audio modules
            path.join(srcDir, 'js', 'audio', 'TTSEngine.js'),
            path.join(srcDir, 'js', 'audio', 'VoiceSelector.js'),
            path.join(srcDir, 'js', 'audio', 'AudioControls.js'),
            // UI modules
            path.join(srcDir, 'js', 'ui', 'UIController.js'),
            path.join(srcDir, 'js', 'ui', 'SettingsPanel.js'),
            // Main app coordinator last
            path.join(srcDir, 'js', 'core', 'App.js')
        ];
        
        let combinedJS = '';
        for (const jsFile of jsFiles) {
            if (fs.existsSync(jsFile)) {
                const content = fs.readFileSync(jsFile, 'utf8');
                combinedJS += `/* === ${path.basename(jsFile)} === */\n${content}\n\n`;
                console.log(`   ✓ Included ${path.basename(jsFile)}`);
            }
        }
        
        const minifiedJS = minifyJS(combinedJS);
        fs.writeFileSync(path.join(distDir, 'js', 'app.min.js'), minifiedJS);
        console.log(`   ✅ Created app.min.js (${Math.round(minifiedJS.length / 1024)}KB)\n`);
        
        // Copy and optimize vocabulary data
        console.log('📚 Copying vocabulary data...');
        const vocabDataFile = path.join(dataDir, 'generated', 'vocabulary-data.js');
        const conversationDataFile = path.join(dataDir, 'generated', 'conversation-vocabulary-data.js');
        
        if (fs.existsSync(vocabDataFile)) {
            const vocabContent = fs.readFileSync(vocabDataFile, 'utf8');
            const minifiedVocab = minifyJS(vocabContent);
            fs.writeFileSync(path.join(distDir, 'data', 'vocabulary-data.min.js'), minifiedVocab);
            console.log(`   ✅ Created vocabulary-data.min.js (${Math.round(minifiedVocab.length / 1024)}KB)`);
        } else {
            console.warn('   ⚠️  Vocabulary data not found. Run "npm run convert" first.');
        }
        
        if (fs.existsSync(conversationDataFile)) {
            const conversationContent = fs.readFileSync(conversationDataFile, 'utf8');
            const minifiedConversation = minifyJS(conversationContent);
            fs.writeFileSync(path.join(distDir, 'data', 'conversation-vocabulary-data.min.js'), minifiedConversation);
            console.log(`   ✅ Created conversation-vocabulary-data.min.js (${Math.round(minifiedConversation.length / 1024)}KB)`);
        } else {
            console.warn('   ⚠️  Conversation vocabulary data not found. Run "npm run extract-conversations" first.');
        }
        console.log();
        
        // Build HTML
        console.log('🔧 Building HTML...');
        const htmlContent = fs.readFileSync('index.html', 'utf8');
        
        // Update HTML to use minified files
        const optimizedHTML = htmlContent
            .replace('src/css/style.css', 'css/app.min.css')
            .replace(/data\/generated\/vocabulary-data\.js\?v=\d+(&t=\d+)?/g, 'data/vocabulary-data.min.js')
            .replace(/data\/generated\/conversation-vocabulary-data\.js\?v=\d+(&t=\d+)?/g, 'data/conversation-vocabulary-data.min.js')
            // Remove all individual module script tags and replace with single bundled file
            .replace(/<!-- Utility Modules -->[\s\S]*?<!-- Main App Coordinator -->\s*<script src="src\/js\/core\/App\.js\?v=\d+"><\/script>/g, 
                     '<!-- Bundled JavaScript -->\n    <script src="js/app.min.js"></script>')
            // Add meta tags for production
            .replace('<head>', `<head>
    <meta name="description" content="CCL Pronunciation Trainer - NAATI CCL exam preparation with 2,180 conversation vocabulary terms">
    <meta name="keywords" content="CCL, NAATI, pronunciation, vocabulary, Chinese, English, exam preparation">
    <meta name="author" content="CCL Pronunciation Trainer">
    <meta name="robots" content="index, follow">`);
        
        const minifiedHTML = minifyHTML(optimizedHTML);
        fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHTML);
        console.log('   ✅ Created optimized index.html\n');
        
        // Copy assets if they exist
        const assetsDir = 'assets';
        if (fs.existsSync(assetsDir)) {
            console.log('📁 Copying assets...');
            copyDirectory(assetsDir, path.join(distDir, 'assets'));
            console.log('   ✅ Assets copied\n');
        }
        
        // Generate build info
        const buildInfo = {
            buildTime: new Date().toISOString(),
            version: '1.0.0',
            files: {
                'css/app.min.css': fs.statSync(path.join(distDir, 'css', 'app.min.css')).size,
                'js/app.min.js': fs.statSync(path.join(distDir, 'js', 'app.min.js')).size,
                'index.html': fs.statSync(path.join(distDir, 'index.html')).size
            }
        };
        
        if (fs.existsSync(path.join(distDir, 'data', 'vocabulary-data.min.js'))) {
            buildInfo.files['data/vocabulary-data.min.js'] = fs.statSync(path.join(distDir, 'data', 'vocabulary-data.min.js')).size;
        }
        
        if (fs.existsSync(path.join(distDir, 'data', 'conversation-vocabulary-data.min.js'))) {
            buildInfo.files['data/conversation-vocabulary-data.min.js'] = fs.statSync(path.join(distDir, 'data', 'conversation-vocabulary-data.min.js')).size;
        }
        
        fs.writeFileSync(
            path.join(distDir, 'build-info.json'), 
            JSON.stringify(buildInfo, null, 2)
        );
        
        // Calculate total size
        const totalSize = Object.values(buildInfo.files).reduce((a, b) => a + b, 0);
        
        console.log('🎉 Build completed successfully!\n');
        console.log('📊 Build Summary:');
        console.log(`   Total size: ${Math.round(totalSize / 1024)}KB`);
        console.log(`   Files created: ${Object.keys(buildInfo.files).length}`);
        console.log(`   Output directory: ${distDir}/`);
        console.log('\n✨ Ready for deployment!');
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        
        if (fs.statSync(srcPath).isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Run build if called directly
if (require.main === module) {
    build().catch(error => {
        console.error('❌ Build failed:', error);
        process.exit(1);
    });
}

module.exports = { build };