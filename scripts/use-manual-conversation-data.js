#!/usr/bin/env node

/**
 * Use Manual Conversation Data Script
 * Copies the manually curated conversation vocabulary data to the active files
 */

const fs = require('fs');

console.log('📋 Using manual conversation vocabulary data...');

try {
    // Copy the manual JSON file to the active JSON file
    fs.copyFileSync(
        'data/generated/conversation-vocabulary-data-manual.json', 
        'data/generated/conversation-vocabulary-data.json'
    );
    console.log('   ✅ Copied manual JSON to active JSON file');
    
    // Read the manual data and create the JS file
    const data = JSON.parse(fs.readFileSync('data/generated/conversation-vocabulary-data-manual.json', 'utf8'));
    
    const jsContent = `// Conversation-Based CCL Vocabulary Data (Manually Curated)
// Generated on: ${data.generatedAt}
// Source: ${data.totalConversations} CCL conversations
// Total terms: ${data.totalTerms}
// Processing: Highest ID → Lowest ID (maintaining conversation order)
// Method: Manual curation for improved term quality

window.conversationVocabularyData = ${JSON.stringify(data, null, 2)};
`;
    
    fs.writeFileSync('data/generated/conversation-vocabulary-data.js', jsContent);
    console.log('   ✅ Generated JS file from manual data');
    
    console.log(`📊 Using ${data.totalTerms} manually curated terms from ${data.totalConversations} conversations\n`);
    
} catch (error) {
    console.error('❌ Error using manual conversation data:', error.message);
    process.exit(1);
}