const fs = require('fs');
const path = require('path');

/**
 * Parse pronunciation string to extract IPA and phonetic spelling
 * Format: /IPA notation/ — sounds like **PHONETIC-SPELLING**
 */
function parsePronunciationString(pronunciationStr) {
  if (!pronunciationStr) return null;

  const ipaMatch = pronunciationStr.match(/\/([^\/]+)\//);
  const phoneticMatch = pronunciationStr.match(/\*\*([^*]+)\*\*/);

  return {
    ipa: ipaMatch ? ipaMatch[1] : '',
    phonetic: phoneticMatch ? phoneticMatch[1] : '',
    full: pronunciationStr
  };
}

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

    // Parse word pairs in format: english | chinese | uk_pronunciation | us_pronunciation
    if (line.includes('|')) {
      const parts = line.split('|').map(part => part.trim());

      if (parts.length >= 2) {
        const [english, chinese, ukPronunciation, usPronunciation] = parts;

        // Parse pronunciation data if available
        let pronunciations = null;
        if (ukPronunciation && usPronunciation) {
          pronunciations = {
            uk: parsePronunciationString(ukPronunciation),
            us: parsePronunciationString(usPronunciation)
          };
        }

        wordPairs.push({
          english: english.trim(),
          chinese: chinese.trim(),
          dialogueId: currentId,
          id: `${currentId}-${wordPairs.length + 1}`, // Unique ID for each pair
          pronunciations: pronunciations,
          // Legacy fields for compatibility
          term: english.trim(),
          translation: chinese.trim()
        });
      }
    }
  }

  // Calculate pronunciation statistics
  const pronunciationStats = {
    totalPairs: wordPairs.length,
    withUKPronunciation: wordPairs.filter(pair => pair.pronunciations?.uk?.ipa).length,
    withUSPronunciation: wordPairs.filter(pair => pair.pronunciations?.us?.ipa).length,
    withBothPronunciations: wordPairs.filter(pair => pair.pronunciations?.uk?.ipa && pair.pronunciations?.us?.ipa).length,
    conversations: [...new Set(wordPairs.map(pair => pair.dialogueId))].length
  };

  const payload = {
    source: 'english-chinese-word-pairs.md',
    generatedAt: new Date().toISOString(),
    totalPairs: wordPairs.length,
    pronunciationStats: pronunciationStats,
    wordPairs
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  console.log(`✅ Generated Chinese-English dataset with pronunciation data:`);
  console.log(`   📄 ${outputPath}`);
  console.log(`   📊 Total pairs: ${wordPairs.length}`);
  console.log(`   🎧 UK pronunciations: ${pronunciationStats.withUKPronunciation}`);
  console.log(`   🎧 US pronunciations: ${pronunciationStats.withUSPronunciation}`);
  console.log(`   🎧 Both pronunciations: ${pronunciationStats.withBothPronunciations}`);
  console.log(`   💬 Conversations: ${pronunciationStats.conversations}`);
}

if (require.main === module) {
  generateChineseEnglishDataset();
}

module.exports = { generateChineseEnglishDataset };
