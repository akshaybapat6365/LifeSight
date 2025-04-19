// Simple script to test the Gemini API with minimal dependencies
// Run this with: node scripts/simple-gemini-test.js YOUR_API_KEY

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Get API key from command line
const apiKey = process.argv[2];
if (!apiKey) {
  console.error('Please provide an API key as command line argument');
  console.error('Usage: node scripts/simple-gemini-test.js YOUR_API_KEY');
  process.exit(1);
}

console.log('Running simple Gemini API test...');

// Simple 1x1 pixel PNG in base64
const BASE64_PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Configure the AI client
const genAI = new GoogleGenerativeAI(apiKey);

async function runSimpleTest() {
  try {
    // Get model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    console.log('Testing direct content generation...');
    
    // Using the new content format
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: BASE64_PIXEL
            }
          },
          { 
            text: "Describe this test image briefly."
          }
        ]
      }]
    });
    
    console.log('SUCCESS! Response:', result.response.text());
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('TEST FAILED:', error.message);
    console.error('Full error details:', JSON.stringify(error, null, 2));
  }
}

// Run the test
runSimpleTest(); 