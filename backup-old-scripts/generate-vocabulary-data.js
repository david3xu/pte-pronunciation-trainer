// Script to convert vocabulary-clean.md to vocabulary-data.json
const fs = require('fs');
const path = require('path');

// Paths
const inputFile = path.join(__dirname, '../data-processing/vocabulary-clean.md');
const outputFile = path.join(__dirname, '../data/processed/vocabulary-data.json');

// Ensure output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the vocabulary-clean.md file
const content = fs.readFileSync(inputFile, 'utf-8');

// Parse the content
const lines = content.split('\n');
const entries = [];

// Skip header lines (first 10 lines)
const contentLines = lines.slice(10);

// Process each line
contentLines.forEach(line => {
  // Skip empty lines
  if (!line.trim()) return;

  // Match lines that start with a number followed by a period
  const match = line.match(/^(\d+)\.\s+(.*)/);
  if (match) {
    const number = parseInt(match[1]);
    const content = match[2].trim();

    entries.push({
      number,
      content
    });
  }
});

// Create the output JSON
const output = {
  metadata: {
    title: 'Education Vocabulary for CCL Pronunciation Trainer',
    description: 'English-Chinese word/phrase pairs for education terminology',
    totalEntries: entries.length,
    generatedAt: new Date().toISOString(),
    source: 'vocabulary-clean.md'
  },
  entries
};

// Write the output file
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

console.log(`✅ Generated vocabulary-data.json with ${entries.length} entries`);
