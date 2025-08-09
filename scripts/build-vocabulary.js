#!/usr/bin/env node

/**
 * Clean Feature-Based Vocabulary Builder
 * Combines markdown vocabulary with JSON feature definitions
 * No algorithms - just clean data combination
 */

const fs = require('fs');
const path = require('path');

// Load feature definitions
function loadFeatures() {
    const featuresDir = path.join(__dirname, '..', 'data', 'features');
    
    const difficulty = JSON.parse(fs.readFileSync(path.join(featuresDir, 'difficulty.json'), 'utf8'));
    const wordTypes = JSON.parse(fs.readFileSync(path.join(featuresDir, 'word-types.json'), 'utf8'));
    
    return { difficulty, wordTypes };
}

// Simple difficulty classification based on rules and overrides
function classifyTerm(englishTerm, features) {
    const { difficulty } = features;
    
    // Check manual overrides first
    if (difficulty.manual_overrides[englishTerm]) {
        return difficulty.manual_overrides[englishTerm];
    }
    
    // Apply simple default rules
    const term = englishTerm.toLowerCase().trim();
    const wordCount = term.split(/\s+/).length;
    
    // Single common words
    if (wordCount === 1 && term.length <= 8) {
        return 'easy';
    }
    
    // Medical specialties ending in 'ist'
    if (term.includes('specialist') || term.endsWith('ist') || term.endsWith('ologist')) {
        return 'hard';
    }
    
    // Complex phrases with 4+ words
    if (wordCount >= 4) {
        return 'hard';
    }
    
    // 2-3 word phrases
    if (wordCount >= 2) {
        return 'normal';
    }
    
    // Default for single words
    return 'easy';
}

// Get word type from features
function getWordType(englishTerm, features) {
    const { wordTypes } = features;
    
    for (const [type, data] of Object.entries(wordTypes.types)) {
        if (data.terms.includes(englishTerm)) {
            return type;
        }
    }
    
    // Simple defaults
    const wordCount = englishTerm.split(/\s+/).length;
    if (wordCount === 1) return 'common';
    if (wordCount >= 2) return 'phrase';
    
    return 'common';
}

// Process vocabulary files 
function processVocabularyFiles() {
    const features = loadFeatures();
    const dataDir = path.join(__dirname, '..', 'data', 'vocabulary');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));
    
    console.log('🔧 Building vocabulary with features...\n');
    
    const results = {};
    const stats = { easy: 0, normal: 0, hard: 0, total: 0 };
    
    files.forEach(file => {
        const filePath = path.join(dataDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract category name
        const category = file.replace('ccl-', '').replace('-vocabulary.md', '');
        results[category] = [];
        
        // Parse markdown table
        const lines = content.split('\n');
        let inTable = false;
        
        lines.forEach(line => {
            if (line.startsWith('| English')) {
                inTable = true;
                return;
            }
            if (line.startsWith('|---')) return;
            
            if (inTable && line.startsWith('| ') && !line.startsWith('| English')) {
                const match = line.match(/\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
                if (match) {
                    const english = match[1].trim();
                    const chinese = match[2].trim();
                    
                    // Skip separator rows (lines with dashes)
                    if (english.startsWith('-') || chinese.startsWith('-')) {
                        return;
                    }
                    
                    if (english && chinese && english !== 'English') {
                        const difficulty = classifyTerm(english, features);
                        const type = getWordType(english, features);
                        
                        results[category].push({
                            english,
                            chinese,
                            difficulty,
                            type
                        });
                        
                        stats[difficulty]++;
                        stats.total++;
                    }
                }
            }
        });
        
        console.log(`📚 ${category}: ${results[category].length} terms processed`);
    });
    
    console.log(`\n📊 Distribution:`);
    console.log(`🟢 Easy: ${stats.easy} (${Math.round(stats.easy/stats.total*100)}%)`);
    console.log(`🟡 Normal: ${stats.normal} (${Math.round(stats.normal/stats.total*100)}%)`);
    console.log(`🔴 Hard: ${stats.hard} (${Math.round(stats.hard/stats.total*100)}%)`);
    console.log(`📋 Total: ${stats.total} terms`);
    
    return results;
}

// Generate vocabulary data file
function generateVocabularyData() {
    const results = processVocabularyFiles();
    const outputDir = path.join(__dirname, '..', 'data', 'generated');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    let jsContent = '// Feature-Based CCL Vocabulary Data\n';
    jsContent += '// Generated on: ' + new Date().toISOString() + '\n\n';
    jsContent += 'const vocabularyData = {\n';
    
    Object.keys(results).forEach((category, index) => {
        jsContent += `  "${category}": [\n`;
        
        results[category].forEach((term, i) => {
            // Properly escape strings for JSON compatibility
            const escapedEnglish = term.english.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
            const escapedChinese = term.chinese.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
            
            jsContent += `    { english: "${escapedEnglish}", chinese: "${escapedChinese}", difficulty: "${term.difficulty}", type: "${term.type}" }`;
            jsContent += i < results[category].length - 1 ? ',\n' : '\n';
        });
        
        jsContent += '  ]';
        jsContent += index < Object.keys(results).length - 1 ? ',\n' : '\n';
    });
    
    jsContent += '};\n\n';
    jsContent += '// Export for browser use\n';
    jsContent += 'if (typeof window !== "undefined") {\n';
    jsContent += '  window.vocabularyData = vocabularyData;\n';
    jsContent += '}\n\n';
    jsContent += '// Export for Node.js use\n';
    jsContent += 'if (typeof module !== "undefined" && module.exports) {\n';
    jsContent += '  module.exports = vocabularyData;\n';
    jsContent += '}\n';
    
    const outputPath = path.join(outputDir, 'vocabulary-data.js');
    fs.writeFileSync(outputPath, jsContent);
    
    console.log(`\n✅ Generated ${outputPath}`);
    console.log('🚀 Clean feature-based vocabulary ready!');
}

// Run the script
if (require.main === module) {
    generateVocabularyData();
}

module.exports = { generateVocabularyData };