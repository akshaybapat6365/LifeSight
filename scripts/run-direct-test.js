const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure the AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "YOUR_API_KEY");

// Test the Gemini API with inline data
async function testInlineData() {
  try {
    console.log('Testing direct content generation with inlineData...');
    
    // Create a minimal test image as base64
    // This is a 1x1 transparent pixel in PNG format
    const transparentPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    
    // Get model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Log the test parameters
    console.log('Base64 image length:', transparentPixelBase64.length);
    
    // Approach 1: Standard format
    try {
      console.log('\nTrying standard inlineData approach...');
      const result1 = await model.generateContent([
        { 
          inlineData: {
            mimeType: 'image/png',
            data: transparentPixelBase64
          }
        },
        { text: 'Describe this image briefly.' }
      ]);
      console.log('SUCCESS with standard approach! Response:', result1.response.text().substring(0, 50) + '...');
    } catch (err) {
      console.error('FAILED with standard approach:', err.message);
    }
    
    // Approach 2: With size_bytes
    try {
      console.log('\nTrying with explicit size_bytes...');
      const requestData = [
        {
          inlineData: {
            mimeType: 'image/png',
            data: transparentPixelBase64,
            size_bytes: Buffer.from(transparentPixelBase64, 'base64').length
          }
        },
        { text: 'Describe this image briefly.' }
      ];
      const result2 = await model.generateContent(requestData);
      console.log('SUCCESS with size_bytes approach! Response:', result2.response.text().substring(0, 50) + '...');
    } catch (err) {
      console.error('FAILED with size_bytes approach:', err.message);
    }
    
    // Approach 3: Text first, then image
    try {
      console.log('\nTrying text first, then image...');
      const result3 = await model.generateContent([
        { text: 'Describe this image briefly:' },
        { 
          inlineData: {
            mimeType: 'image/png',
            data: transparentPixelBase64
          }
        }
      ]);
      console.log('SUCCESS with text-first approach! Response:', result3.response.text().substring(0, 50) + '...');
    } catch (err) {
      console.error('FAILED with text-first approach:', err.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testInlineData(); 