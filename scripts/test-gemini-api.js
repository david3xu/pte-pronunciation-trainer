#!/usr/bin/env node

/**
 * Test script for Gemini API
 * Tests different models to find which one works
 */

import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';

config();

const apiKey = process.env.GEMINI_API || process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ No API key found. Set GEMINI_API or VITE_GEMINI_API_KEY in .env');
  process.exit(1);
}

console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');

const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

async function testModel(modelName) {
  try {
    console.log(`\n📝 Testing model: ${modelName}`);
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Say "Hello, I am working!" in exactly 5 words.',
    });

    console.log(`✅ SUCCESS with ${modelName}`);
    console.log(`   Response: ${response.text}`);
    return { model: modelName, success: true, response: response.text };
  } catch (error) {
    console.log(`❌ FAILED with ${modelName}`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Details:`, error.response.data);
    }
    return { model: modelName, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Gemini API Test\n');
  console.log('Testing models:', modelsToTest.join(', '));

  const results = [];

  for (const model of modelsToTest) {
    const result = await testModel(model);
    results.push(result);

    // Wait 2 seconds between tests to avoid rate limiting
    if (model !== modelsToTest[modelsToTest.length - 1]) {
      console.log('   ⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));

  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (working.length > 0) {
    console.log('\n✅ Working models:');
    working.forEach(r => console.log(`   - ${r.model}`));
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed models:');
    failed.forEach(r => console.log(`   - ${r.model}: ${r.error}`));
  }

  if (working.length > 0) {
    console.log('\n💡 Recommendation: Use', working[0].model);
  } else {
    console.log('\n⚠️ No models are working! Check:');
    console.log('   1. API key is valid');
    console.log('   2. API quota not exceeded');
    console.log('   3. Network connection');
  }

  console.log('\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
