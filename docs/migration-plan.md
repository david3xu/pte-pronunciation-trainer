# CCL Data Migration Plan

## Overview
This document outlines the step-by-step migration plan from the current markdown-based data system to the new structured JSON data system.

## Current State Analysis

### What We Have
- **Data Source**: `data/raw/merged-70245-70158.md`
- **Generated Files**: `data/generated/conversation-vocabulary-data.js`
- **Frontend**: Uses `window.conversationVocabularyData.vocabulary`
- **Progress Tracking**: Complex dialogue ID to progress number mapping

### Current Problems
1. **Progress Display**: Shows "Dialogue 70245 (1/56)" but doesn't update correctly
2. **Data Parsing**: Frontend parses markdown on-the-fly
3. **Category Mapping**: Inconsistent category names and mappings
4. **Performance**: Inefficient data loading and processing

## Migration Strategy

### Phase 1: Data Processing & Validation (Week 1)
**Goal**: Create structured data from markdown source

#### 1.1 Create Data Processor
- [ ] Implement `scripts/process-dialogue-data.js`
- [ ] Add comprehensive error handling
- [ ] Implement data validation against schema
- [ ] Generate processing reports

#### 1.2 Process Current Data
- [ ] Run processor on `merged-70245-70158.md`
- [ ] Validate output against schema
- [ ] Generate sample data for testing
- [ ] Create data integrity report

#### 1.3 Data Quality Assessment
- [ ] Count total dialogues and vocabulary terms
- [ ] Verify category distribution
- [ ] Check for data inconsistencies
- [ ] Identify edge cases and errors

### Phase 2: Frontend Preparation (Week 1-2)
**Goal**: Prepare frontend for new data structure

#### 2.1 Create Data Loader
- [ ] Implement `src/js/data/DialogueDataLoader.js`
- [ ] Add data validation on load
- [ ] Implement error handling for missing/invalid data
- [ ] Add data caching mechanism

#### 2.2 Update Data Models
- [ ] Create `src/js/models/Dialogue.js`
- [ ] Create `src/js/models/Vocabulary.js`
- [ ] Create `src/js/models/Category.js`
- [ ] Implement data transformation methods

#### 2.3 Add Data Validation
- [ ] Implement schema validation
- [ ] Add runtime data integrity checks
- [ ] Create data error reporting
- [ ] Add fallback mechanisms

### Phase 3: Core System Updates (Week 2)
**Goal**: Update core application components

#### 3.1 Update VocabularyManager
- [ ] Modify to use new data structure
- [ ] Update category filtering logic
- [ ] Implement new vocabulary lookup methods
- [ ] Add data loading error handling

#### 3.2 Update ProgressTracker
- [ ] Fix dialogue progress calculation
- [ ] Implement proper dialogue-based tracking
- [ ] Add progress validation
- [ ] Update progress display format

#### 3.3 Update UIController
- [ ] Modify word display logic
- [ ] Update category switching
- [ ] Implement new data flow
- [ ] Add loading states

### Phase 4: Testing & Validation (Week 3)
**Goal**: Ensure all functionality works correctly

#### 4.1 Unit Testing
- [ ] Test data loading and validation
- [ ] Test vocabulary filtering and search
- [ ] Test progress tracking
- [ ] Test category switching

#### 4.2 Integration Testing
- [ ] Test complete user workflows
- [ ] Test data consistency across components
- [ ] Test error handling scenarios
- [ ] Test performance improvements

#### 4.3 User Acceptance Testing
- [ ] Verify progress display accuracy
- [ ] Test category filtering
- [ ] Validate vocabulary content
- [ ] Check UI responsiveness

### Phase 5: Deployment & Cleanup (Week 3-4)
**Goal**: Deploy new system and clean up old code

#### 5.1 Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Deploy to production
- [ ] Monitor for issues

#### 5.2 Cleanup
- [ ] Remove old markdown parsing code
- [ ] Delete deprecated data files
- [ ] Update documentation
- [ ] Archive old implementation

## Detailed Implementation Steps

### Step 1: Data Processor Implementation

#### 1.1 Create Base Structure
```javascript
// scripts/process-dialogue-data.js
class DialogueDataProcessor {
    constructor() {
        this.dialogues = [];
        this.vocabulary = [];
        this.errors = [];
    }
    
    processMarkdownFile(inputFile) {
        // Implementation details
    }
}
```

#### 1.2 Implement Dialogue Extraction
```javascript
extractDialogueBlocks(content) {
    const dialogueRegex = /^#(\d+)\.\s*(.+?)\s*[-–]\s*([^-–]+)$/gm;
    // Extract dialogue blocks with proper boundaries
}
```

#### 1.3 Implement Sentence Parsing
```javascript
extractSentences(content) {
    // Parse numbered sentences (1., 2., 3., etc.)
    // Extract English text and Chinese translations
    // Identify vocabulary terms (_term_)
}
```

#### 1.4 Implement Vocabulary Extraction
```javascript
extractVocabularyFromSentence(sentence, sentenceId) {
    // Find highlighted terms (_term_)
    // Assess difficulty level
    // Generate phonetic notation
    // Create vocabulary objects
}
```

### Step 2: Data Validation

#### 2.1 Schema Validation
```javascript
validateDialogue(dialogue) {
    const required = ['id', 'title', 'category', 'sentences'];
    for (const field of required) {
        if (!dialogue[field]) {
            this.errors.push(`Missing required field: ${field}`);
            return false;
        }
    }
    return true;
}
```

#### 2.2 Cross-Reference Validation
```javascript
validateCrossReferences() {
    // Ensure vocabulary conversation_id exists in dialogues
    // Verify category consistency
    // Check sentence ID uniqueness
}
```

#### 2.3 Content Validation
```javascript
validateContent() {
    // Check for markdown formatting in content
    // Validate language-specific content
    // Ensure proper phonetic format
}
```

### Step 3: Frontend Data Loading

#### 3.1 Data Loader Implementation
```javascript
// src/js/data/DialogueDataLoader.js
class DialogueDataLoader {
    async loadData() {
        try {
            const response = await fetch('/data/processed/complete-dataset.json');
            const data = await response.json();
            return this.validateAndTransform(data);
        } catch (error) {
            console.error('Failed to load dialogue data:', error);
            throw error;
        }
    }
}
```

#### 3.2 Data Transformation
```javascript
transformData(rawData) {
    return {
        dialogues: rawData.dialogues.map(d => new Dialogue(d)),
        vocabulary: rawData.vocabulary.map(v => new Vocabulary(v)),
        categories: rawData.categories.map(c => new Category(c))
    };
}
```

### Step 4: Component Updates

#### 4.1 VocabularyManager Updates
```javascript
// src/js/core/VocabularyManager.js
class VocabularyManager {
    constructor() {
        this.dialogueData = null;
        this.vocabularyData = null;
        this.categoryData = null;
    }
    
    async initialize() {
        const loader = new DialogueDataLoader();
        const data = await loader.loadData();
        this.setData(data);
    }
    
    setData(data) {
        this.dialogueData = data.dialogues;
        this.vocabularyData = data.vocabulary;
        this.categoryData = data.categories;
        this.buildIndexes();
    }
}
```

#### 4.2 ProgressTracker Updates
```javascript
// src/js/core/ProgressTracker.js
updateProgress(currentIndex, totalWords, currentWord = null) {
    if (currentWord && currentWord.conversation_id) {
        const dialogue = this.findDialogue(currentWord.conversation_id);
        const progress = this.calculateDialogueProgress(dialogue);
        this.displayDialogueProgress(progress);
    }
}

calculateDialogueProgress(dialogue) {
    const allDialogues = this.getAllDialoguesSorted();
    const dialogueIndex = allDialogues.findIndex(d => d.id === dialogue.id);
    return {
        dialogueId: dialogue.id,
        position: dialogueIndex + 1,
        total: allDialogues.length
    };
}
```

## Risk Mitigation

### Technical Risks
1. **Data Loss**: Maintain backup of original markdown files
2. **Processing Errors**: Implement comprehensive error handling and logging
3. **Performance Issues**: Test with large datasets before deployment
4. **Browser Compatibility**: Test across different browsers and devices

### Mitigation Strategies
1. **Incremental Deployment**: Deploy changes in small, testable increments
2. **Rollback Plan**: Maintain ability to revert to previous version
3. **Monitoring**: Implement comprehensive logging and error tracking
4. **User Communication**: Inform users of changes and provide feedback channels

## Success Criteria

### Performance Metrics
- [ ] Page load time reduced by 50%
- [ ] Memory usage reduced by 30%
- [ ] Navigation between terms improved by 40%

### Functionality Metrics
- [ ] Progress display accuracy: 100%
- [ ] Category filtering: 100% success rate
- [ ] Data consistency: 100% validation pass rate
- [ ] Error rate: <1% of user interactions

### User Experience Metrics
- [ ] User satisfaction with progress tracking
- [ ] Ease of category navigation
- [ ] Overall application responsiveness
- [ ] Reduction in user-reported bugs

## Timeline

### Week 1: Foundation
- **Days 1-2**: Data processor implementation
- **Days 3-4**: Data validation and testing
- **Day 5**: Generate initial structured data

### Week 2: Frontend Updates
- **Days 1-2**: Data loader and models
- **Days 3-4**: Core component updates
- **Day 5**: Integration testing

### Week 3: Testing & Deployment
- **Days 1-2**: Comprehensive testing
- **Days 3-4**: Staging deployment and validation
- **Day 5**: Production deployment

### Week 4: Cleanup & Monitoring
- **Days 1-2**: Monitor production performance
- **Days 3-4**: Clean up old code and files
- **Day 5**: Documentation updates and lessons learned

## Dependencies

### External Dependencies
- Node.js runtime environment
- Modern browser support for ES6+ features
- Sufficient storage for processed data files

### Internal Dependencies
- Access to original markdown source files
- Frontend development environment
- Testing framework and tools
- Deployment pipeline access

## Communication Plan

### Stakeholder Updates
- **Daily**: Development progress updates
- **Weekly**: Milestone reviews and risk assessments
- **Bi-weekly**: User feedback collection and analysis

### User Communication
- **Pre-deployment**: Announce upcoming changes
- **During deployment**: Provide status updates
- **Post-deployment**: Collect feedback and address issues

---

*This migration plan should be reviewed and approved by all stakeholders before implementation begins.*
