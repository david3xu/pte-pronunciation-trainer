# CCL Pronunciation Trainer - Data Architecture Design

## Overview
This document outlines the data architecture for the CCL Pronunciation Trainer application, designed to efficiently process and serve dialogue-based vocabulary training data.

## Current Problems
1. **Frontend Performance**: Parsing markdown files on-the-fly in the browser is inefficient
2. **Data Consistency**: Inconsistent data structure between different parts of the application
3. **Maintenance**: Hard to update categories, add new dialogues, or modify data structure
4. **Scalability**: Current approach doesn't scale well with larger datasets
5. **Progress Tracking**: Progress calculation is complex and error-prone with current structure

## Proposed Solution: Structured Data Pipeline

### 1. Data Flow Architecture
```
Raw Markdown → Data Processor → Structured JSON → Frontend Consumption
     ↓              ↓              ↓              ↓
merged-*.md → process-dialogue-data.js → dialogue-data.json → VocabularyManager
```

### 2. Core Data Models

#### 2.1 Dialogue Model
```json
{
  "id": "string (e.g., '70245')",
  "title": "string (e.g., 'ABN and Business Structure Questions')",
  "category": "string (e.g., 'business')",
  "briefing": "string (Chinese briefing text)",
  "sentences": [
    {
      "id": "number (e.g., 1, 2, 3)",
      "english": "string (English sentence)",
      "chinese": "string (Chinese translation)",
      "vocabulary": [
        {
          "term": "string (highlighted term)",
          "difficulty": "string ('easy', 'normal', 'hard')",
          "phonetic": "string (UK pronunciation)",
          "context": "string (full sentence context)"
        }
      ]
    }
  ],
  "metadata": {
    "source_file": "string",
    "extraction_date": "string (ISO date)",
    "total_vocabulary_terms": "number"
  }
}
```

#### 2.2 Vocabulary Model
```json
{
  "term": "string (English term)",
  "conversation_id": "string (dialogue ID)",
  "sentence_id": "number (sentence number)",
  "difficulty": "string ('easy', 'normal', 'hard')",
  "category": "string (dialogue category)",
  "phonetic": "string (UK pronunciation)",
  "example": "string (full sentence example)",
  "example_chinese": "string (Chinese translation)"
}
```

#### 2.3 Category Model
```json
{
  "id": "string (e.g., 'business')",
  "name": "string (e.g., 'Business and Financial Matters')",
  "emoji": "string (e.g., '💼')",
  "description": "string (detailed description)",
  "color": "string (CSS color code)",
  "priority": "number (display order)"
}
```

### 3. Data Processing Pipeline

#### 3.1 Input Processing
- **Source**: `data/raw/merged-70245-70158.md`
- **Parser**: Regex-based dialogue block extraction
- **Validation**: Ensure all required fields are present
- **Error Handling**: Log parsing errors, continue processing

#### 3.2 Data Transformation
- **Category Normalization**: Map various category names to standard ones
- **Difficulty Assessment**: Algorithm-based difficulty calculation
- **Phonetic Generation**: Generate UK pronunciation patterns
- **Content Cleaning**: Remove markdown formatting, normalize whitespace

#### 3.3 Output Generation
- **Structured JSON**: Multiple output formats for different use cases
- **Validation Reports**: Ensure data integrity and completeness
- **Statistics**: Generate usage analytics and data summaries

### 4. File Structure

```
data/
├── raw/                          # Original markdown files
│   └── merged-70245-70158.md
├── processed/                    # Generated structured data
│   ├── dialogue-data.json       # Complete dialogue dataset
│   ├── vocabulary-data.json     # Flattened vocabulary list
│   ├── complete-dataset.json    # Full dataset with metadata
│   └── processing-report.md     # Human-readable summary
├── schema/                      # Data schema definitions
│   ├── dialogue-schema.json    # Dialogue data structure
│   ├── vocabulary-schema.json  # Vocabulary data structure
│   └── category-schema.json    # Category definitions
└── generated/                   # Legacy generated files (to be deprecated)
    └── conversation-vocabulary-data.js
```

### 5. Frontend Integration

#### 5.1 Data Loading
- **Initial Load**: Load complete dataset on application startup
- **Caching**: Implement browser storage for offline usage
- **Lazy Loading**: Load category-specific data as needed

#### 5.2 Progress Tracking
- **Dialogue-based**: Track progress through dialogues, not individual terms
- **Category-based**: Track completion within each category
- **Session-based**: Track current learning session progress

#### 5.3 Performance Optimizations
- **Indexed Lookups**: Create lookup tables for fast term/dialogue access
- **Pre-computed Stats**: Calculate category counts and difficulty distributions
- **Memory Management**: Implement efficient data structures

### 6. Migration Strategy

#### 6.1 Phase 1: Data Processing
- [ ] Create data processor script
- [ ] Generate structured JSON files
- [ ] Validate data integrity
- [ ] Create processing reports

#### 6.2 Phase 2: Frontend Updates
- [ ] Update VocabularyManager to use new data structure
- [ ] Modify ProgressTracker for dialogue-based progress
- [ ] Update UI components for new data format
- [ ] Implement data loading and caching

#### 6.3 Phase 3: Testing & Optimization
- [ ] Performance testing with new data structure
- [ ] User experience validation
- [ ] Error handling and edge case testing
- [ ] Performance optimization

### 7. Benefits of New Architecture

#### 7.1 Performance
- **Faster Loading**: Pre-processed data vs. runtime parsing
- **Reduced Memory**: Efficient data structures
- **Better Caching**: Structured data is easier to cache

#### 7.2 Maintainability
- **Clear Separation**: Raw data vs. processed data
- **Schema Validation**: Ensure data consistency
- **Easy Updates**: Modify data structure without code changes

#### 7.3 Scalability
- **Larger Datasets**: Handle more dialogues efficiently
- **Multiple Sources**: Support different data sources
- **Extensibility**: Easy to add new fields and features

### 8. Risk Assessment

#### 8.1 Technical Risks
- **Data Loss**: Ensure backup of original markdown files
- **Processing Errors**: Implement comprehensive error handling
- **Performance Degradation**: Test with large datasets

#### 8.2 Mitigation Strategies
- **Backup Strategy**: Version control for all data files
- **Error Handling**: Graceful degradation and user feedback
- **Performance Testing**: Benchmark before and after changes

### 9. Success Metrics

#### 9.1 Performance Metrics
- **Load Time**: Reduce initial page load time
- **Memory Usage**: Decrease memory footprint
- **Navigation Speed**: Faster term-to-term navigation

#### 9.2 User Experience Metrics
- **Progress Accuracy**: Correct dialogue counting
- **Category Filtering**: Smooth category switching
- **Error Rate**: Reduce user-facing errors

### 10. Next Steps

1. **Review Design**: Get feedback on proposed architecture
2. **Refine Schema**: Adjust data models based on requirements
3. **Create Prototype**: Build minimal working example
4. **Implement Pipeline**: Develop full data processing system
5. **Frontend Integration**: Update application to use new data
6. **Testing & Validation**: Ensure all functionality works correctly

## Questions for Discussion

1. **Data Volume**: How many dialogues do we expect to support?
2. **Update Frequency**: How often will the source data change?
3. **Offline Support**: Is offline functionality required?
4. **Performance Targets**: What are the acceptable load times?
5. **Backward Compatibility**: How should we handle existing user data?

---

*This document should be reviewed and approved before any implementation begins.*
