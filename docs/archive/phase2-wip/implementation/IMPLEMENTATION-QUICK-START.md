# Implementation Quick Start Guide

**Date**: 7 October 2025  
**Status**: ✅ **PHASE 1 COMPLETE** (7 October 2025)  
**Reference**: See DATASET-DESIGN-STRATEGY.md for full details  
**Goal**: Multi-dataset PTE Trainer (Vocabulary + RS + ASQ + WFD)

---

## ✅ Phase 1 Status: COMPLETE

**Completed**: 7 October 2025  
**Duration**: 1 day  
**Datasets Generated**: 6 total (3 vocabulary + 3 new)

### **What Was Accomplished:**
- ✅ Created PTESentenceExtractor.js (RS & WFD)
- ✅ Created PTEQuestionExtractor.js (ASQ)
- ✅ Updated pte-data-pipeline.js (dynamic extractors)
- ✅ Updated Config.js registry (6 datasets)
- ✅ Generated 620 RS sentences
- ✅ Generated 692 ASQ questions with verified answers
- ✅ Generated 1,195 WFD sentences
- ✅ Updated validate.js (supports new structures)
- ✅ All validations passing (2,507 new items validated)

**Next**: Phase 2 - Frontend Integration (DatasetManager, UI, TTS)

---

## 🚀 ~~Quick Start - Phase 1 (Data Pipeline)~~ COMPLETE

### **~~Step 1: Create Sentence Extractor~~** ✅ DONE

Create `src/js/data/extractors/PTESentenceExtractor.js`:

```javascript
class PTESentenceExtractor {
  static async extract(filePath, fs) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const sentences = [];
    
    for (const line of lines) {
      // Match pattern: "1. Sentence text here"
      const match = line.match(/^(\d+)\.\s+(.+)$/);
      if (match) {
        sentences.push({
          id: parseInt(match[1]),
          sentence: match[2].trim(),
          difficulty: this.inferDifficulty(match[2]),
          category: 'general'
        });
      }
    }
    
    return sentences;
  }
  
  static inferDifficulty(sentence) {
    const wordCount = sentence.split(' ').length;
    if (wordCount <= 8) return 'easy';      // Simple: 5-8 words
    if (wordCount <= 12) return 'normal';   // General: 9-12 words
    return 'hard';                          // Disaster: 13+ words
  }
}

module.exports = PTESentenceExtractor;
```

### **Step 2: Create Question Extractor** (30 min)

Create `src/js/data/extractors/PTEQuestionExtractor.js`:

```javascript
class PTEQuestionExtractor {
  static async extract(filePath, fs) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const questions = [];
    
    for (const line of lines) {
      // Match pattern: "1. Question?" (no answers in source file)
      // OR "1. Question? - Answer" (if answers are added later)
      const matchWithAnswer = line.match(/^(\d+)\.\s+(.+?)\s*[-–]\s*(.+)$/);
      const matchQuestionOnly = line.match(/^(\d+)\.\s+(.+)$/);
      
      if (matchWithAnswer) {
        // Format: "1. Question? - Answer"
        questions.push({
          id: parseInt(matchWithAnswer[1]),
          question: matchWithAnswer[2].trim(),
          answer: matchWithAnswer[3].trim(),
          category: 'general',
          difficulty: this.inferDifficulty(matchWithAnswer[2]),
          ipa: null,
          ttsEnabled: true
        });
      } else if (matchQuestionOnly) {
        // Format: "1. Question?" (current ASQ format)
        questions.push({
          id: parseInt(matchQuestionOnly[1]),
          question: matchQuestionOnly[2].trim(),
          answer: '', // Empty - student provides answer OR add manually later
          category: 'general',
          difficulty: this.inferDifficulty(matchQuestionOnly[2]),
          ipa: null,
          ttsEnabled: true
        });
      }
    }
    
    return questions;
  }
  
  static inferDifficulty(question) {
    const wordCount = question.split(' ').length;
    if (wordCount <= 10) return 'easy';
    if (wordCount <= 20) return 'normal';
    return 'hard';
  }
}

module.exports = PTEQuestionExtractor;
```

**Note**: Current ASQ file has questions ONLY (no answers). Extractor handles both formats:
- Without answers: Sets `answer: ''` (students answer themselves)
- With answers: Parses "Question - Answer" format

See `docs/wip/ASQ-ANSWER-TEMPLATE.md` for how to add answers manually.

### **Step 3: Update Pipeline** (15 min)

Update `Config.js` → `pipeline.registry`:

```javascript
registry: [
  // ... existing vocabulary entries ...
  {
    id: 'pte-repeat-sentence',
    input: 'pte-repeat-sentence.md',
    output: 'pte-repeat-sentence-dataset.json',
    category: 'pte-repeat-sentence',
    description: 'PTE Repeat Sentence practice (620 sentences)',
    sourceType: 'pte-repeat-sentence',
    isDefault: false,
    // NEW FIELDS for multi-dataset support
    dataType: 'sentence',
    extractorType: 'PTESentenceExtractor',
    inputSubdir: 'rs'
  },
  {
    id: 'pte-answer-short-question',
    input: 'pte-answer-short-question.md',
    output: 'pte-answer-short-question-dataset.json',
    category: 'pte-answer-short-question',
    description: 'PTE Answer Short Question (692 questions)',
    sourceType: 'pte-answer-short-question',
    isDefault: false,
    dataType: 'question',
    extractorType: 'PTEQuestionExtractor',
    inputSubdir: 'asq'
  },
  {
    id: 'pte-write-from-dictation',
    input: 'pte-write-from-dictation.md',
    output: 'pte-write-from-dictation-dataset.json',
    category: 'pte-write-from-dictation',
    description: 'PTE Write From Dictation (1,195 sentences)',
    sourceType: 'pte-write-from-dictation',
    isDefault: false,
    dataType: 'sentence',
    extractorType: 'PTESentenceExtractor',
    inputSubdir: 'wfd'
  }
]
```

### **Step 4: Update Pipeline Script** (20 min)

In `pte-data-pipeline.js`, add support for new extractors:

```javascript
async generatePTEDatasets() {
  console.log('📦 STAGE 2: Generating Datasets from Registry');
  
  for (const entry of this.config.registry) {
    const { id, input, output, extractorType, inputSubdir } = entry;
    
    try {
      // Load appropriate extractor
      let ExtractorClass;
      if (extractorType === 'PTESentenceExtractor') {
        ExtractorClass = require('../src/js/data/extractors/PTESentenceExtractor.js');
      } else if (extractorType === 'PTEQuestionExtractor') {
        ExtractorClass = require('../src/js/data/extractors/PTEQuestionExtractor.js');
      } else {
        ExtractorClass = PTETermsExtractor; // default for vocabulary
      }
      
      // Build file path
      const subdir = inputSubdir || this.config.dataSources.subdirectory;
      const filePath = path.join(this.config.inputDir, subdir, input);
      
      // Extract and save
      const data = await ExtractorClass.extract(filePath, fs);
      
      const dataset = {
        meta: {
          id: entry.id,
          type: entry.dataType || 'vocabulary',
          version: '1.0',
          count: data.length,
          description: entry.description,
          updated: new Date().toISOString()
        },
        items: data
      };
      
      const outputPath = path.join(this.config.outputDir, 'processed', output);
      fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
      console.log(`   ✅ Generated ${output} (${data.length} items)`);
      
    } catch (error) {
      console.error(`   ❌ Error generating ${id}: ${error.message}`);
      this.stats.totalErrors++;
    }
  }
}
```

### **Step 5: Run Pipeline** (2 min)

```bash
npm run data:pte
```

**Expected Output**:
```
✅ Generated pte-repeat-sentence-dataset.json (620 items)
✅ Generated pte-answer-short-question-dataset.json (692 items)
✅ Generated pte-write-from-dictation-dataset.json (1,195 items)
```

### **Step 6: Validate** (1 min)

```bash
npm run validate
```

---

## 📝 Verification Checklist

- [ ] All 3 new JSON files created in `data/processed/`
- [ ] Each file has `meta` and `items` structure
- [ ] Item counts match source markdown files (620, 692, 1,195)
- [ ] Validation passes with no errors
- [ ] Files are valid JSON (can be opened/parsed)

---

## 🎯 What's Next

After Phase 1 completes:

1. **Phase 2**: Create `DatasetManager.js` (see DATASET-DESIGN-STRATEGY.md §2)
2. **Phase 3**: Update UI for dataset switching
3. **Phase 4**: Update service worker and build
4. **Phase 5**: Documentation and testing
5. **Phase 6**: Deploy

---

## ⏱️ Time Estimates

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Data Pipeline | 2 hours |
| Phase 2 | Core Architecture | 8 hours |
| Phase 3 | Frontend | 12 hours |
| Phase 4 | Infrastructure | 4 hours |
| Phase 5 | Testing & Docs | 8 hours |
| Phase 6 | Polish & Deploy | 6 hours |
| **Total** | | **40 hours (1 week full-time)** |

---

## 🆘 Troubleshooting

### **Problem**: Extractor can't find markdown files
**Solution**: Check `inputPath` in registry config

### **Problem**: Validation fails
**Solution**: Check JSON structure matches schema in DATASET-DESIGN-STRATEGY.md

### **Problem**: Pipeline crashes
**Solution**: Ensure all extractors are properly exported with `module.exports`

---

## 📚 Key References

- **Full Strategy**: `docs/DATASET-DESIGN-STRATEGY.md` (1,181 lines)
- **Config Reference**: `src/js/shared/Config.js`
- **Existing Extractor**: `src/js/data/extractors/PTETermsExtractor.js`
- **Pipeline Script**: `scripts/pte-data-pipeline.js`

---

**Status**: 📋 **READY TO START PHASE 1**  
**Next Action**: Create `PTESentenceExtractor.js`  
**Estimated Time**: 30 minutes
