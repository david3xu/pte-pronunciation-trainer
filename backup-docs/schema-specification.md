# CCL Data Schema Specification

## Overview
This document provides detailed specifications for all data models used in the CCL Pronunciation Trainer application.

## 1. Dialogue Schema

### 1.1 Core Structure
```json
{
  "id": "string",
  "title": "string", 
  "category": "string",
  "briefing": "string",
  "sentences": "array",
  "metadata": "object"
}
```

### 1.2 Field Specifications

#### `id` (Required)
- **Type**: String
- **Format**: Numeric string (e.g., "70245", "70244")
- **Validation**: Must be a valid dialogue identifier
- **Example**: "70245"

#### `title` (Required)
- **Type**: String
- **Length**: 1-200 characters
- **Content**: Human-readable dialogue title
- **Example**: "ABN and Business Structure Questions"

#### `category` (Required)
- **Type**: String
- **Values**: Must be one of the predefined category IDs
- **Valid Options**: 
  - "business"
  - "legal" 
  - "medical"
  - "education"
  - "housing"
  - "social"
  - "social-welfare"
  - "immigration"
  - "tourism"

#### `briefing` (Optional)
- **Type**: String
- **Content**: Chinese text describing the dialogue context
- **Language**: Chinese characters only
- **Example**: "关于ABN和商业结构的问题"

#### `sentences` (Required)
- **Type**: Array of Sentence objects
- **Min Length**: 1
- **Max Length**: 50 (reasonable limit for dialogue length)

#### `metadata` (Required)
- **Type**: Object
- **Required Fields**: source_file, extraction_date, total_vocabulary_terms

### 1.3 Complete Dialogue Example
```json
{
  "id": "70245",
  "title": "ABN and Business Structure Questions",
  "category": "business",
  "briefing": "关于ABN和商业结构的问题",
  "sentences": [
    {
      "id": 1,
      "english": "Good morning. Welcome to the Government Business Cooperation Centre.",
      "chinese": "早上好。欢迎来到政府商业合作中心。",
      "vocabulary": [
        {
          "term": "Good morning",
          "difficulty": "normal",
          "phonetic": "UK /ɡʊd ˈmɔːnɪŋ/",
          "context": "Good morning. Welcome to the Government Business Cooperation Centre."
        }
      ]
    }
  ],
  "metadata": {
    "source_file": "merged-70245-70158.md",
    "extraction_date": "2025-08-28T06:25:25.713Z",
    "total_vocabulary_terms": 1
  }
}
```

## 2. Sentence Schema

### 2.1 Core Structure
```json
{
  "id": "number",
  "english": "string",
  "chinese": "string",
  "vocabulary": "array"
}
```

### 2.2 Field Specifications

#### `id` (Required)
- **Type**: Number
- **Range**: 1-999
- **Purpose**: Sequential sentence identifier within dialogue
- **Example**: 1

#### `english` (Required)
- **Type**: String
- **Length**: 1-500 characters
- **Content**: English sentence text
- **Format**: Clean text, no markdown formatting
- **Example**: "Good morning. Welcome to the Government Business Cooperation Centre."

#### `chinese` (Required)
- **Type**: String
- **Length**: 1-500 characters
- **Content**: Chinese translation
- **Language**: Chinese characters only
- **Example**: "早上好。欢迎来到政府商业合作中心。"

#### `vocabulary` (Required)
- **Type**: Array of Vocabulary objects
- **Min Length**: 0 (sentences can have no highlighted terms)
- **Max Length**: 20 (reasonable limit per sentence)

## 3. Vocabulary Schema

### 3.1 Core Structure
```json
{
  "term": "string",
  "conversation_id": "string",
  "sentence_id": "number",
  "difficulty": "string",
  "category": "string",
  "phonetic": "string",
  "example": "string",
  "example_chinese": "string"
}
```

### 3.2 Field Specifications

#### `term` (Required)
- **Type**: String
- **Length**: 1-100 characters
- **Content**: English vocabulary term/phrase
- **Format**: Clean text, no markdown formatting
- **Example**: "Good morning"

#### `conversation_id` (Required)
- **Type**: String
- **Format**: Must match dialogue ID
- **Purpose**: Link vocabulary to specific dialogue
- **Example**: "70245"

#### `sentence_id` (Required)
- **Type**: Number
- **Range**: 1-999
- **Purpose**: Link vocabulary to specific sentence
- **Example**: 1

#### `difficulty` (Required)
- **Type**: String
- **Values**: Must be one of three predefined levels
- **Valid Options**: "easy", "normal", "hard"
- **Default**: "normal"

#### `category` (Required)
- **Type**: String
- **Values**: Must match dialogue category
- **Purpose**: Inherited from dialogue for filtering
- **Example**: "business"

#### `phonetic` (Required)
- **Type**: String
- **Format**: UK pronunciation notation
- **Length**: 1-200 characters
- **Example**: "UK /ɡʊd ˈmɔːnɪŋ/"

#### `example` (Required)
- **Type**: String
- **Content**: Full English sentence containing the term
- **Purpose**: Provide context for the vocabulary term
- **Example**: "Good morning. Welcome to the Government Business Cooperation Centre."

#### `example_chinese` (Required)
- **Type**: String
- **Content**: Chinese translation of the example sentence
- **Language**: Chinese characters only
- **Example**: "早上好。欢迎来到政府商业合作中心。"

## 4. Category Schema

### 4.1 Core Structure
```json
{
  "id": "string",
  "name": "string",
  "emoji": "string",
  "description": "string",
  "color": "string",
  "priority": "number"
}
```

### 4.2 Field Specifications

#### `id` (Required)
- **Type**: String
- **Format**: kebab-case identifier
- **Values**: Must match category values used in dialogues
- **Example**: "business"

#### `name` (Required)
- **Type**: String
- **Length**: 1-100 characters
- **Content**: Human-readable category name
- **Example**: "Business and Financial Matters"

#### `emoji` (Required)
- **Type**: String
- **Content**: Unicode emoji character
- **Purpose**: Visual representation in UI
- **Example**: "💼"

#### `description` (Required)
- **Type**: String
- **Length**: 1-500 characters
- **Content**: Detailed description of category scope
- **Example**: "Topics related to business registration, financial matters, and commercial activities"

#### `color` (Required)
- **Type**: String
- **Format**: CSS color value (hex, rgb, or named color)
- **Purpose**: UI theming and visual consistency
- **Example**: "#3B82F6"

#### `priority` (Required)
- **Type**: Number
- **Range**: 1-100
- **Purpose**: Display order in UI
- **Lower numbers**: Higher priority
- **Example**: 1

### 4.3 Complete Category Example
```json
{
  "id": "business",
  "name": "Business and Financial Matters",
  "emoji": "💼",
  "description": "Topics related to business registration, financial matters, and commercial activities",
  "color": "#3B82F6",
  "priority": 1
}
```

## 5. Metadata Schema

### 5.1 Core Structure
```json
{
  "source_file": "string",
  "extraction_date": "string",
  "total_vocabulary_terms": "number"
}
```

### 5.2 Field Specifications

#### `source_file` (Required)
- **Type**: String
- **Content**: Original markdown file name
- **Example**: "merged-70245-70158.md"

#### `extraction_date` (Required)
- **Type**: String
- **Format**: ISO 8601 date-time string
- **Example**: "2025-08-28T06:25:25.713Z"

#### `total_vocabulary_terms` (Required)
- **Type**: Number
- **Range**: 0-99999
- **Purpose**: Count of vocabulary terms in dialogue
- **Example**: 15

## 6. Validation Rules

### 6.1 Required Fields
All required fields must be present and non-empty.

### 6.2 Data Types
All fields must match their specified data types exactly.

### 6.3 Value Constraints
- Category values must be from predefined list
- Difficulty values must be from predefined list
- IDs must be unique within their scope
- Numeric ranges must be respected

### 6.4 Cross-References
- Vocabulary `conversation_id` must exist in dialogues
- Vocabulary `category` must match dialogue category
- Sentence `id` must be unique within dialogue

### 6.5 Content Validation
- English text must contain only English characters and punctuation
- Chinese text must contain only Chinese characters and punctuation
- Phonetic text must follow UK pronunciation format
- No markdown formatting in content fields

## 7. Error Handling

### 7.1 Validation Errors
- **Missing Required Field**: Log error, skip record
- **Invalid Data Type**: Log error, attempt conversion, skip if failed
- **Invalid Value**: Log error, use default value if available
- **Cross-Reference Error**: Log error, skip record

### 7.2 Processing Errors
- **File Read Error**: Log error, exit with error code
- **Parse Error**: Log error, continue with next record
- **Write Error**: Log error, retry once, exit if failed

## 8. Performance Considerations

### 8.1 File Sizes
- **Dialogue Data**: ~50KB for 56 dialogues
- **Vocabulary Data**: ~200KB for 4000 terms
- **Complete Dataset**: ~250KB total

### 8.2 Memory Usage
- **Frontend Load**: ~1MB in memory
- **Processing**: ~5MB temporary memory
- **Caching**: ~2MB persistent storage

### 8.3 Processing Time
- **Markdown Parse**: ~100ms for 56 dialogues
- **JSON Generation**: ~50ms
- **Validation**: ~25ms
- **Total**: ~175ms

---

*This schema specification should be used as the authoritative reference for all data processing and validation.*
