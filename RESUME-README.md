# Professional Vocabulary Pronunciation Trainer

This specialized branch is focused exclusively on professional vocabulary pronunciation training, particularly useful for job interviews, resume preparation, technical presentations, and professional communication.

## Features

- **Professional Term Pronunciation**: IPA pronunciation guides for business and technical vocabulary
- **AI/ML Terminology**: Specialized vocabulary for artificial intelligence and machine learning
- **British and American Pronunciations**: Side-by-side comparison of UK and US pronunciation
- **Focused Data Processing**: Streamlined pipeline for resume-specific content

## Getting Started

1. **Setup and Run**:

```bash
# Install dependencies
npm install

# Process resume data and start the server
npm run start:resume
```

2. **Access the application**:

Open your browser and navigate to: http://localhost:3000

## Data Files

This branch focuses on two main data files:

1. **resume-terms.md**: Professional vocabulary with IPA pronunciation guides
   - Format: `term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**`
   - Includes both British (left) and American (right) pronunciations

2. **temp.md**: AI/ML vocabulary with definitions
   - Format: `**Term**: Definition`
   - Organized by categories (Foundation Terms, Essential Production Terms, etc.)

## Scripts

Special scripts have been optimized for this branch to focus on professional vocabulary:

- `npm run data:resume`: Process only resume & AI/ML data files
- `npm run start:resume`: Process resume data and start the server
- `npm run deploy:resume`: Build for production with only resume data
- `npm run vercel-build:resume`: Vercel-specific build with only resume data
- `npm run dev`: Start the development server (3000 port)
- `npm run build`: Build for production (after data generation)
- `npm run validate`: Validate all vocabulary data integrity
- `npm run lint`: Run ESLint and Stylelint for code quality
- `npm run test`: Run Jest tests in jsdom environment

## Pronunciation Features

- **IPA Notation**: Standard International Phonetic Alphabet
- **Phonetic Guides**: English-friendly pronunciation guides
- **Emphasis Indicators**: Visual indicators for syllable stress
- **Audio Playback**: Text-to-speech integration for pronunciation practice

## Adding New Terms

To add new professional vocabulary:

1. Edit `data-processing/resume-terms.md`
2. Follow the format: `term | /IPA/ — sounds like **PHONETIC** | /IPA/ — sounds like **PHONETIC**`
3. Run `npm run data:resume` to process changes

To add new AI/ML terms:

1. Edit `data-processing/temp.md`
2. Follow the format: `**Term**: Definition`
3. Run `npm run data:resume` to process changes