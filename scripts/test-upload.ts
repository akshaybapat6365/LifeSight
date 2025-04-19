import { readFileSync } from 'node:fs';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment or hardcode for testing only
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error('Missing API key. Run with GOOGLE_GENERATIVE_AI_API_KEY=your_key');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Test both approaches
async function testDirectUpload() {
  try {
    console.log('Testing direct file upload...');
    
    // Read a test image file
    const filePath = './public/uploads/test.png'; // Adjust path as needed
    const buffer = readFileSync(filePath);
    
    // Create file with proper size metadata
    const file = new File([buffer], 'test.png', { type: 'image/png' });
    
    console.table({
      name: file.name,
      type: file.type,
      size: file.size,
      sizeBytes: (file as any).sizeBytes, // Will be undefined if missing
      bufferLength: buffer.length
    });
    
    // Test direct content generation
    console.log('Testing content generation with image...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Convert buffer to base64
    const base64Data = buffer.toString('base64');
    
    const result = await model.generateContent([
      { 
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      },
      { text: 'Describe this test image briefly.' }
    ]);
    
    console.log('SUCCESS! Response:', result.response.text());
  } catch (error) {
    console.error('TEST FAILED:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  }
}

// Run test
(async () => {
  await testDirectUpload();
})(); 