const fs = require('fs');
const path = require('path');

function generateWordsDataset() {
  const inputPath = path.resolve(__dirname, '..', 'data-processing', 'words.md');
  const outputPath = path.resolve(__dirname, '..', 'data', 'processed', 'words-dataset.json');

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const words = [];
  let currentId = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Dialogue id lines are 5-digit numbers
    if (/^\d{5}$/.test(line)) {
      currentId = parseInt(line, 10);
      continue;
    }

    words.push({ term: line, dialogueId: currentId });
  }

  const payload = {
    source: 'words.md',
    generatedAt: new Date().toISOString(),
    words
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`✅ Wrote ${words.length} words to ${outputPath}`);
}

if (require.main === module) {
  generateWordsDataset();
}

module.exports = { generateWordsDataset };




