// Node.js built-ins
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

// External packages
import { GoogleGenerativeAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Local imports
import { auth } from '@/app/(auth)/auth';

// Configure the AI client
const configureAI = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Ensure upload directory exists
const createUploadDir = async () => {
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
  return uploadDir;
};

// Test version of the analyze endpoint that doesn't require auth
export async function POST(request: Request) {
  try {
    // Parse JSON request
    let image, filename, filetype;
    try {
      const jsonData = await request.json();
      image = jsonData.image;
      filename = jsonData.filename;
      filetype = jsonData.filetype;
    } catch (error) {
      console.error('Error parsing JSON request:', error);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    if (!filename || !filetype) {
      return NextResponse.json({ error: 'Missing filename or file type' }, { status: 400 });
    }

    // Check if it's an image file
    if (!filetype.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are supported' },
        { status: 400 }
      );
    }

    // Decode base64 to get file size
    const buffer = Buffer.from(image, 'base64');
    
    // Check file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 5MB limit' },
        { status: 400 }
      );
    }

    // Save the file locally for preview
    const fileExt = filename.split('.').pop()?.toLowerCase();
    const uniqueFilename = `${randomUUID()}.${fileExt}`;
    const uploadDir = await createUploadDir();
    const filePath = join(uploadDir, uniqueFilename);
    await fs.writeFile(filePath, buffer);
    
    // Generate URL for the public path
    const publicPath = `/uploads/${uniqueFilename}`;

    try {
      console.log(`Processing file: ${filename}, size: ${buffer.length} bytes, type: ${filetype}`);
      
      // Detailed logging before API call
      console.table({
        filename,
        filetype,
        bufferLength: buffer.length,
        base64Length: image.length,
      });
      
      // Configure the AI client
      const genAI = configureAI();
      
      console.log("Sending image to Gemini API for analysis...");
      
      // Use the getGenerativeModel method with the correct model name
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Use the same direct approach from the main endpoint
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            {
              text: "You are BloodInsight AI, specialized in analyzing blood test reports. Please extract metrics, identify abnormal values, explain their significance, and provide health insights. Always clarify this is for educational purposes only and not medical advice."
            }
          ]
        }, {
          role: "model",
          parts: [
            {
              text: "I am BloodInsight AI, an assistant specialized in analyzing blood test reports. I will help you understand your lab results by extracting key metrics, identifying which values are normal or abnormal, explaining what each measurement means, and providing helpful health insights based on the data. I'll present the information in a clear, structured format using plain language that's easy to understand.\n\nPlease note that my analysis is for educational purposes only and should not be considered medical advice. Always consult with your healthcare provider to properly interpret your test results and make health decisions."
            }
          ]
        }, {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: filetype,
                data: image
              }
            },
            { 
              text: "This is a blood test report. Please analyze it and extract all key metrics, indicating which values are within normal range and which are outside the normal range. Provide a clear explanation of what each metric means and its significance."
            }
          ]
        }]
      });
      
      console.log("Successfully received analysis from Gemini API");
      
      const text = result.response.text();
      
      // Return the analysis and the URL for the saved image
      return NextResponse.json({
        analysis: text,
        imageUrl: publicPath
      });
      
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to analyze the image';
      let statusCode = 500;
      
      if (error.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message?.includes('permission') || error.message?.includes('access')) {
        errorMessage = 'API access permission error. Please check your API key.';
        statusCode = 403;
      } else if (error.message?.includes('format') || error.message?.includes('parse')) {
        errorMessage = 'The image format is not supported or is corrupted.';
        statusCode = 400;
      } else if (error.message?.includes('size_bytes')) {
        // This is the error we're fixing with our changes
        errorMessage = 'API configuration issue with image size. Please try a smaller image.';
        statusCode = 400;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 