#!/usr/bin/env node

/**
 * Generate Natural DI Shadowing Data from Example Answers
 *
 * This script reads example-answers.md and extracts ALL natural answers,
 * then creates a shadowing JSON file with natural phrase chunking.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse example-answers.md to extract all image answers
 */
function parseExampleAnswers() {
  const sourceFile = path.join(__dirname, '../data/source/pte/di/example-answers.md');
  const content = fs.readFileSync(sourceFile, 'utf-8');

  const answers = [];

  // Match each image section: ## Image XX - Title
  const imageRegex = /## Image (\d+) - (.+?)\n\n\*\*Answer:\*\*\n\n"([^"]+)"/g;

  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    const imageNumber = parseInt(match[1]);
    const title = match[2].trim();
    const answer = match[3].trim();

    answers.push({
      imageNumber,
      title,
      answer
    });
  }

  console.log(`✅ Parsed ${answers.length} answers from example-answers.md`);
  return answers;
}

/**
 * Break text into natural phrase chunks for shadowing
 * Uses punctuation and natural breathing points
 */
function createNaturalChunks(text) {
  const chunks = [];
  let currentChunk = '';
  let charIndex = 0;

  // Split by sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  sentences.forEach(sentence => {
    // Try to break at clauses (commas, conjunctions, natural pauses)
    const parts = sentence.split(/(?<=,\s)|(?<=\.\s)|(?<=and\s)|(?<=but\s)|(?<=which\s)|(?<=where\s)|(?<=that\s)/);

    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;

      // Aim for chunks of 40-80 characters for natural pacing
      if (currentChunk.length + trimmed.length > 80 && currentChunk.length > 40) {
        // Save current chunk
        const startIdx = charIndex;
        const endIdx = charIndex + currentChunk.length - 1;
        chunks.push({
          index: chunks.length,
          text: currentChunk.trim(),
          startIndex: startIdx,
          endIndex: endIdx,
          estimatedDuration: Math.round((currentChunk.trim().split(' ').length / 2.5) * 1000) // ~150 words/min
        });
        charIndex = endIdx + 2; // +2 for space
        currentChunk = trimmed + ' ';
      } else {
        currentChunk += trimmed + ' ';
      }
    });
  });

  // Add the last chunk
  if (currentChunk.trim()) {
    const startIdx = charIndex;
    const endIdx = charIndex + currentChunk.trim().length - 1;
    chunks.push({
      index: chunks.length,
      text: currentChunk.trim(),
      startIndex: startIdx,
      endIndex: endIdx,
      estimatedDuration: Math.round((currentChunk.trim().split(' ').length / 2.5) * 1000)
    });
  }

  return chunks;
}

/**
 * Generate shadowing data for a single answer
 */
function generateShadowingData(data) {
  const fullText = data.answer;
  const phrases = createNaturalChunks(fullText);
  const wordCount = fullText.split(/\s+/).length;
  const duration = Math.round(wordCount / 2.5); // ~150 words/min = 2.5 words/sec

  return {
    id: `di-image-${data.imageNumber}`,
    imageNumber: data.imageNumber,
    title: data.title,
    template: "Natural", // Using natural conversational style
    fullText: fullText,
    phrases: phrases,
    wordCount: wordCount,
    duration: duration,
    category: "di-shadowing"
  };
}

/**
 * Generate JSON file for a range of images
 */
function generateJSONFile(answers, outputPath, rangeStart, rangeEnd, description) {
  const filteredAnswers = answers
    .filter(a => a.imageNumber >= rangeStart && a.imageNumber <= rangeEnd)
    .map(generateShadowingData);

  const output = {
    metadata: {
      generated: new Date().toISOString(),
      totalAnswers: filteredAnswers.length,
      source: "example-answers",
      description: description,
      version: "2.0",
      category: "di-shadowing",
      dataType: "shadowing"
    },
    answers: filteredAnswers
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ Generated: ${outputPath}`);
  console.log(`   Images: ${rangeStart}-${rangeEnd} (${filteredAnswers.length} answers)`);
}

// Generate single combined JSON file for all DI shadowing answers
const dataDir = path.join(__dirname, '../data/processed');

// Parse all answers from example-answers.md
const naturalAnswers = parseExampleAnswers();

// Generate the JSON file with all answers
const allAnswers = naturalAnswers.map(generateShadowingData);

const output = {
  metadata: {
    generated: new Date().toISOString(),
    totalAnswers: allAnswers.length,
    source: "example-answers",
    description: `DI natural answers (Images 1-${allAnswers.length}) for shadowing practice with natural phrase chunking`,
    version: "2.0",
    category: "di-shadowing",
    dataType: "shadowing"
  },
  answers: allAnswers
};

fs.writeFileSync(path.join(dataDir, 'di-shadowing-natural.json'), JSON.stringify(output, null, 2));

console.log(`✅ Generated: ${path.join(dataDir, 'di-shadowing-natural.json')}`);
console.log(`   Total: ${allAnswers.length} answers`);
console.log('\n🎉 Generated single combined file successfully!');
console.log('\n💡 Natural chunking tips for shadowing:');
console.log('   - Chunks are broken at natural breathing points (commas, clauses)');
console.log('   - Average chunk size: 40-80 characters for comfortable pacing');
console.log('   - Estimated duration based on ~150 words/minute natural speech');
console.log('   - No all-caps emphasis - read naturally with conversational tone');
