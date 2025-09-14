const fs = require('fs');
const path = require('path');

function generateChineseEnglishDataset() {
  const inputPath = path.resolve(__dirname, '..', 'data-processing', 'english-chinese-word-pairs.md');
  const outputPath = path.resolve(__dirname, '..', 'data', 'processed', 'chinese-english-dataset.json');

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const wordPairs = [];
  let currentId = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Skip header lines
    if (line.startsWith('#') || line.startsWith('**') || line.startsWith('---')) {
      continue;
    }

    // Dialogue id lines are 5-digit numbers
    if (/^\d{5}$/.test(line)) {
      currentId = parseInt(line, 10);
      continue;
    }

    // Parse word pairs in format: english | chinese
    if (line.includes('|')) {
      const [english, chinese] = line.split('|', 2);
      if (english && chinese) {
        wordPairs.push({
          english: english.trim(),
          chinese: chinese.trim(),
          dialogueId: currentId,
          id: `${currentId}-${wordPairs.length + 1}` // Unique ID for each pair
        });
      }
    }
  }

  const payload = {
    source: 'english-chinese-word-pairs.md',
    generatedAt: new Date().toISOString(),
    totalPairs: wordPairs.length,
    wordPairs
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`✅ Wrote ${wordPairs.length} word pairs to ${outputPath}`);
}

if (require.main === module) {
  generateChineseEnglishDataset();
}

module.exports = { generateChineseEnglishDataset };
