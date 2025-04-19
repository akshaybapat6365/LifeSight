import { readFileSync } from 'node:fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variable
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY environment variable is required');
  process.exit(1);
}

// Configure the AI client
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Path to test image
const TEST_IMAGE_PATH = './public/uploads/test.png'; // Adjust as needed

async function testApproach1() {
  console.log('\n=== TESTING APPROACH 1: Direct inlineData ===');
  try {
    // Read test image
    const buffer = readFileSync(TEST_IMAGE_PATH);
    const base64Data = buffer.toString('base64');
    
    console.log(`Image size: ${buffer.length} bytes, Base64 length: ${base64Data.length}`);
    
    // Test direct content generation
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      },
      { text: 'Describe this test image briefly.' }
    ]);
    
    console.log('SUCCESS! Response:', result.response.text().substring(0, 100) + '...');
    return true;
  } catch (error: any) {
    console.error('FAILED:', error.message);
    return false;
  }
}

async function testApproach2() {
  console.log('\n=== TESTING APPROACH 2: With explicit size_bytes ===');
  try {
    // Read test image
    const buffer = readFileSync(TEST_IMAGE_PATH);
    const base64Data = buffer.toString('base64');
    
    // Test with explicit size_bytes
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
          size_bytes: buffer.length
        }
      },
      { text: 'Describe this test image briefly.' }
    ]);
    
    console.log('SUCCESS! Response:', result.response.text().substring(0, 100) + '...');
    return true;
  } catch (error: any) {
    console.error('FAILED:', error.message);
    return false;
  }
}

async function testApproach3() {
  console.log('\n=== TESTING APPROACH 3: Text first, then image ===');
  try {
    // Read test image
    const buffer = readFileSync(TEST_IMAGE_PATH);
    const base64Data = buffer.toString('base64');
    
    // Test with text first, then image
    const result = await model.generateContent([
      { text: 'Describe this test image briefly:' },
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      }
    ]);
    
    console.log('SUCCESS! Response:', result.response.text().substring(0, 100) + '...');
    return true;
  } catch (error: any) {
    console.error('FAILED:', error.message);
    return false;
  }
}

// Run all tests sequentially
(async () => {
  console.log('===== GEMINI API TEST SCRIPT =====');
  console.log('Testing various approaches to find working method...');
  
  const results = {
    approach1: await testApproach1(),
    approach2: await testApproach2(),
    approach3: await testApproach3()
  };
  
  console.log('\n===== TEST RESULTS SUMMARY =====');
  console.table(results);
  
  // Determine best approach
  if (results.approach1) {
    console.log('RECOMMENDATION: Use Approach 1 (standard inlineData)');
  } else if (results.approach2) {
    console.log('RECOMMENDATION: Use Approach 2 (with explicit size_bytes)');
  } else if (results.approach3) {
    console.log('RECOMMENDATION: Use Approach 3 (text first, then image)');
  } else {
    console.log('All approaches failed. Check API key permissions and Gemini model availability.');
  }
})(); 