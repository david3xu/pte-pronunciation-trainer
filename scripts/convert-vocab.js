const fs = require('fs');

function parseVocabularyFile(filename, categoryKey) {
    try {
        const content = fs.readFileSync(filename, 'utf8');
        const lines = content.split('\n');
        const vocabulary = [];
        
        for (let line of lines) {
            // Skip headers, empty lines, and separator lines
            if (line.startsWith('#') || line.startsWith('|---') || line.trim() === '' || 
                line.includes('English') && line.includes('Chinese')) {
                continue;
            }
            
            // Parse table rows
            if (line.startsWith('|') && line.includes('|')) {
                const parts = line.split('|');
                if (parts.length >= 3) {
                    const english = parts[1].trim();
                    const chinese = parts[2].trim();
                    
                    // Skip if empty, header row, separator lines, or invalid content
                    if (english && chinese && 
                        english !== 'English' && chinese !== 'Chinese' &&
                        !english.includes('---') && !chinese.includes('---') &&
                        english !== '---------------------------------------------------------' &&
                        chinese !== '--------------------------') {
                        vocabulary.push({
                            english: english,
                            chinese: chinese
                        });
                    }
                }
            }
        }
        
        console.log(`Parsed ${vocabulary.length} words from ${filename}`);
        return vocabulary;
    } catch (error) {
        console.error(`Error reading ${filename}:`, error.message);
        return [];
    }
}

// Parse all vocabulary files
const vocabularyData = {};

// Check which files exist and parse them
const files = [
    { file: 'data/vocabulary/ccl-social-welfare-vocabulary.md', key: 'social-welfare' },
    { file: 'data/vocabulary/ccl-education-vocabulary.md', key: 'education' },
    { file: 'data/vocabulary/ccl-legal-government-vocabulary.md', key: 'legal-government' },
    { file: 'data/vocabulary/ccl-business-finance-vocabulary.md', key: 'business-finance' },
    { file: 'data/vocabulary/ccl-medical-healthcare-vocabulary.md', key: 'medical-healthcare' },
    { file: 'data/vocabulary/ccl-travel-immigration-vocabulary.md', key: 'travel-immigration' }
];

for (let fileInfo of files) {
    if (fs.existsSync(fileInfo.file)) {
        vocabularyData[fileInfo.key] = parseVocabularyFile(fileInfo.file, fileInfo.key);
    }
}

// Generate JavaScript file
const jsContent = `const vocabularyData = ${JSON.stringify(vocabularyData, null, 2)};

// Export for use in the app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = vocabularyData;
}`;

// Ensure data/generated directory exists
const path = require('path');
const outputDir = 'data/generated';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'vocabulary-data.js'), jsContent);
console.log('Created data/generated/vocabulary-data.js successfully!');
console.log('\nVocabulary counts:');
for (let [key, words] of Object.entries(vocabularyData)) {
    console.log(`${key}: ${words.length} words`);
}