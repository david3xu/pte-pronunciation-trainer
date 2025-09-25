const fs = require('fs');
const path = require('path');

function generateResumeTermsDataset() {
  const inputPath = path.resolve(__dirname, '..', 'data-processing', 'resume-terms.md');
  const outputPath = path.resolve(__dirname, '..', 'data', 'processed', 'resume-terms-dataset.json');

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const terms = [];
  let currentSection = null;
  let termId = 1;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Check for section headers
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim();
      continue;
    }

    // Skip the main title
    if (line.startsWith('# ')) continue;

    // Process terms with pronunciation guides
    // Format: term | /IPA transcription/ — sounds like **PHONETIC GUIDE** | /IPA transcription/ — sounds like **PHONETIC GUIDE**
    const termMatch = line.match(/^([^|]+)\s*\|\s*(.+)$/);
    if (termMatch) {
      const term = termMatch[1].trim();
      const pronunciationData = termMatch[2].trim();
      
      // Parse pronunciation data
      const pronunciationParts = pronunciationData.split('|');
      let britishIPA = '';
      let britishPhonetic = '';
      let americanIPA = '';
      let americanPhonetic = '';

      if (pronunciationParts.length >= 2) {
        // Parse British pronunciation
        const britishMatch = pronunciationParts[0].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
        if (britishMatch) {
          britishIPA = britishMatch[1];
          britishPhonetic = britishMatch[2];
        }

        // Parse American pronunciation
        const americanMatch = pronunciationParts[1].match(/\/([^/]+)\/\s*—\s*sounds like \*\*([^*]+)\*\*/);
        if (americanMatch) {
          americanIPA = americanMatch[1];
          americanPhonetic = americanMatch[2];
        }
      }

      terms.push({
        id: termId++,
        term: term,
        section: currentSection || 'General',
        britishIPA: britishIPA,
        britishPhonetic: britishPhonetic,
        americanIPA: americanIPA,
        americanPhonetic: americanPhonetic,
        pronunciationData: pronunciationData
      });
    }
  }

  const payload = {
    metadata: {
      title: 'Resume Terms Pronunciation Practice',
      description: 'Technical terms from resume, job descriptions, and interview preparation with pronunciation guides',
      totalTerms: terms.length,
      generatedAt: new Date().toISOString(),
      source: 'resume-terms.md'
    },
    terms: terms
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`✅ Generated resume-terms-dataset.json with ${terms.length} terms`);
}

if (require.main === module) {
  generateResumeTermsDataset();
}

module.exports = { generateResumeTermsDataset };
